'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Check } from 'lucide-react'
import { Button, useToast } from '@astryxdesign/core'
import { Modal, ModalSection, FieldGrid } from '@/components/ui/modal'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { Spinner } from '@/components/ui/spinner'
import { StatusPill } from '@/components/composite/status-pill'
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
  const [subs, setSubs] = useState<Subscription[]>([])
  const [planList, setPlanList] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [saving, setSaving] = useState(false)
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

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!form.planId) return
    setSaving(true)
    try {
      await subscriptions.create({
        tenantId,
        planId: form.planId,
        periode: form.periode,
      })
      setShowUpgrade(false)
      setForm({ planId: '', periode: 'monthly' })
      load()
      toast({ body: t('subscription_updated'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel(subId: string) {
    try {
      await subscriptions.cancel(subId)
      load()
      toast({ body: t('subscription_canceled'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    }
  }

  const columns: Column<Subscription>[] = [
    {
      key: 'plan',
      header: 'Plan',
      mobile: 'primary',
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
            {row.plan?.nom ?? planList.find((p) => p.id === row.plan_id)?.nom ?? '—'}
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {row.periode === 'yearly' ? 'Annuel' : 'Mensuel'}
          </span>
        </div>
      ),
    },
    {
      key: 'prix',
      header: 'Prix',
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
      header: "Échéance",
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
          <Button
            variant="ghost"
            size="sm"
            label="Annuler"
            onClick={() => handleCancel(row.id)}
          />
        ) : null,
    },
  ]

  if (loading) return <div className="flex justify-center py-16"><Spinner size={8} /></div>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          variant="primary"
          size="sm"
          label="Changer de plan"
          onClick={() => setShowUpgrade(true)}
        />
      </div>

      {fetchError && <InlineError message={fetchError} />}

      {subs.length === 0 ? (
        <EmptyState
          title="Aucun abonnement"
          description={`Aucun abonnement actif pour ${tenant?.nom}. Souscrivez à un plan.`}
        />
      ) : (
        <DataTable columns={columns} rows={subs} rowKey={(row) => row.id} />
      )}

      {/* Upgrade/subscribe modal */}
      <Modal
        isOpen={showUpgrade}
        onOpenChange={(open) => { if (!open) setShowUpgrade(false) }}
        title="Changer de plan"
        size="sm"
      >
        <form onSubmit={handleSubscribe} className="space-y-5">
          <ModalSection title="Sélection du plan">
            <FieldGrid columns={1}>
              <div>
                <label
                  className="mb-1 block text-xs font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Plan
                </label>
                <select
                  className="h-9 w-full rounded-md border px-2 text-sm"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
                  value={form.planId}
                  onChange={(e) => setForm((f) => ({ ...f, planId: e.target.value }))}
                  required
                >
                  <option value="">Sélectionner un plan…</option>
                  {planList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom} — {formatPrice(p.prixMensuelCents)}/mois
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="mb-1 block text-xs font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Période
                </label>
                <select
                  className="h-9 w-full rounded-md border px-2 text-sm"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
                  value={form.periode}
                  onChange={(e) => setForm((f) => ({ ...f, periode: e.target.value as 'monthly' | 'yearly' }))}
                >
                  <option value="monthly">Mensuel</option>
                  <option value="yearly">Annuel</option>
                </select>
              </div>
            </FieldGrid>
          </ModalSection>

          <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <Button label="Annuler" variant="secondary" onClick={() => setShowUpgrade(false)} className="flex-1" />
            <Button label={saving ? t('saving') : 'Souscrire'} variant="primary" type="submit" isLoading={saving} className="flex-1" />
          </div>
        </form>
      </Modal>
    </div>
  )
}
