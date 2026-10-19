'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button, useToast } from '@astryxdesign/core'
import { Modal, ModalSection, FieldGrid } from '@/components/ui/modal'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { FieldError } from '@/components/ui/form-field'
import { useFormErrors } from '@/components/ui/form-field'
import { PageHeader } from '@/components/layout/page-header'
import { Spinner } from '@/components/ui/spinner'
import { StatusPill } from '@/components/composite/status-pill'
import { ConfirmDialog } from '@/components/composite/confirm-dialog'
import { PermissionGate } from '@/components/composite/permission-gate'
import { useTenantDetail } from '@/components/composite/tenant-detail-context'
import {
  subscriptions,
  plans,
  type Subscription,
  type Plan,
} from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'

function formatPrice(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export default function TenantSubscriptionPage() {
  const params = useParams()
  const tenantId = params.id as string
  const { tenant } = useTenantDetail()
  const { t } = useI18n()
  const toast = useToast()
  const formErrors = useFormErrors()
  const [subs, setSubs] = useState<Subscription[]>([])
  const [planList, setPlanList] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [editingSub, setEditingSub] = useState<Subscription | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<string | null>(null)
  const [form, setForm] = useState({ planId: '', periode: 'monthly' as 'monthly' | 'yearly' })

  useEffect(() => {
    load()
  }, [tenantId])

  async function load() {
    setLoading(true)
    setFetchError(null)
    try {
      const [subsData, plansData] = await Promise.all([
        subscriptions.listByTenant(tenantId),
        plans.list(),
      ])
      setSubs(subsData)
      setPlanList(plansData)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : t('error'))
    } finally {
      setLoading(false)
    }
  }

  function openNew() {
    setEditingSub(null)
    setForm({ planId: '', periode: 'monthly' })
    setShowModal(true)
  }

  function openEdit(sub: Subscription) {
    setEditingSub(sub)
    setForm({ planId: sub.plan_id, periode: sub.periode })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.planId) {
      formErrors.setError('planId', t('required'))
      return
    }
    formErrors.clearError('planId')
    setSaving(true)
    try {
      if (editingSub) {
        await subscriptions.update(editingSub.id, {
          planId: form.planId,
          periode: form.periode,
        })
        toast({ body: t('subscription_updated'), type: 'info' })
      } else {
        await subscriptions.create({
          tenantId,
          planId: form.planId,
          periode: form.periode,
        })
        toast({ body: t('subscription_updated'), type: 'info' })
      }
      setShowModal(false)
      load()
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return
    try {
      await subscriptions.cancel(cancelTarget)
      setCancelTarget(null)
      load()
      toast({ body: t('subscription_canceled'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    }
  }

  const columns: Column<Subscription>[] = [
    {
      key: 'plan',
      header: t('subscriptions_plan', 'Plan'),
      mobile: 'primary',
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
            {row.plan?.nom ?? planList.find((p) => p.id === row.plan_id)?.nom ?? '—'}
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {row.periode === 'yearly' ? t('subscriptions_annuel') : t('subscriptions_mensuel')}
          </span>
        </div>
      ),
    },
    {
      key: 'prix',
      header: t('subscriptions_prix', 'Prix'),
      mobile: 'hidden',
      align: 'end',
      render: (row) => (
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
          {formatPrice(row.prixCents)}
        </span>
      ),
    },
    {
      key: 'statut',
      header: t('status'),
      mobile: 'inline',
      render: (row) => {
        const map: Record<string, 'active' | 'inactive' | 'past_due' | 'canceled' | 'expired'> = {
          active: 'active', canceled: 'canceled', expired: 'expired', past_due: 'past_due',
        }
        return <StatusPill status={map[row.statut] ?? 'inactive'} />
      },
    },
    {
      key: 'dateFin',
      header: t('subscriptions_date_fin', 'Échéance'),
      mobile: 'hidden',
      align: 'end',
      render: (row) => (
        <span style={{ color: 'var(--color-text-secondary)' }}>
          {new Date(row.dateFin).toLocaleDateString('fr-FR')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      mobile: 'hidden',
      render: (row) =>
        row.statut === 'active' ? (
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              label={t('edit')}
              onClick={() => openEdit(row)}
            />
            <Button
              variant="ghost"
              size="sm"
              label={t('deactivate')}
              onClick={() => setCancelTarget(row.id)}
            />
          </div>
        ) : null,
    },
  ]

  if (loading) return <div className="flex justify-center py-16"><Spinner size={8} /></div>

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('subscription_tab', 'Abonnement')}
        action={
          <PermissionGate permission="BILLING_WRITE">
            <Button
              variant="primary"
              size="sm"
              label={t('subscription_change_plan')}
              onClick={openNew}
            />
          </PermissionGate>
        }
      />

      {fetchError && <InlineError message={fetchError} />}

      {subs.length === 0 ? (
        <EmptyState
          title={t('subscription_tenant_empty', 'Aucun abonnement')}
          description={t('subscription_tenant_empty_hint', `Aucun abonnement actif pour ${tenant?.nom ?? 'ce tenant'}. Souscrivez à un plan.`)}
        />
      ) : (
        <DataTable columns={columns} rows={subs} rowKey={(row) => row.id} />
      )}

      {/* Subscribe / change plan modal */}
      <Modal
        isOpen={showModal}
        onOpenChange={(open) => { if (!open) { setShowModal(false); formErrors.clearAll() } }}
        title={editingSub ? t('subscription_change_plan') : t('subscription_change_plan')}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <ModalSection title={t('subscriptions_plan', 'Plan')}>
            <FieldGrid columns={1}>
              <div>
                <label
                  className="mb-1 block text-xs font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('subscriptions_plan', 'Plan')}
                </label>
                <select
                  className="h-9 w-full rounded-md border px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-background-surface)',
                    color: 'var(--color-text-primary)',
                    outline: 'none',
                  }}
                  value={form.planId}
                  onChange={(e) => { setForm((f) => ({ ...f, planId: e.target.value })); formErrors.clearError('planId') }}
                  required
                >
                  <option value="">{t('subscription_select_plan')}</option>
                  {planList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom} — {formatPrice(p.prixMensuelCents)}{t('per_month')}
                    </option>
                  ))}
                </select>
                <FieldError message={formErrors.errors.planId} />
              </div>
              <div>
                <label
                  className="mb-1 block text-xs font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('subscription_period', 'Période')}
                </label>
                <select
                  className="h-9 w-full rounded-md border px-2 text-sm"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-background-surface)',
                    color: 'var(--color-text-primary)',
                  }}
                  value={form.periode}
                  onChange={(e) => setForm((f) => ({ ...f, periode: e.target.value as 'monthly' | 'yearly' }))}
                >
                  <option value="monthly">{t('subscriptions_mensuel')}</option>
                  <option value="yearly">{t('subscriptions_annuel')}</option>
                </select>
              </div>
            </FieldGrid>
          </ModalSection>

          <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <Button
              label={t('cancel')}
              variant="secondary"
              onClick={() => setShowModal(false)}
              className="flex-1"
            />
            <Button
              label={saving ? t('saving') : (editingSub ? t('save') : t('subscription_subscribe'))}
              variant="primary"
              type="submit"
              isLoading={saving}
              className="flex-1"
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={cancelTarget !== null}
        onOpenChange={(open) => { if (!open) setCancelTarget(null) }}
        title={t('subscription_cancel_confirm')}
        description={t('subscription_cancel_description')}
        confirmLabel={t('deactivate')}
        confirmVariant="destructive"
        onConfirm={handleCancel}
        isLoading={false}
      />
    </div>
  )
}
