'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { Button, useToast } from '@astryxdesign/core'
import { TextInput, TextArea } from '@astryxdesign/core'
import { FieldGrid } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { InlineError } from '@/components/ui/inline-error'
import { ConfirmDialog } from '@/components/composite/confirm-dialog'
import { PermissionGate } from '@/components/composite/permission-gate'
import { plans, type Plan } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'
import { PageHeader } from '@/components/layout/page-header'

function formatPrice(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export default function PlanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const planId = params.id as string
  const toast = useToast()
  const { t } = useI18n()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [form, setForm] = useState({
    nom: '',
    description: '',
    prixMensuelCents: '',
    prixAnnuelCents: '',
    nbSitesMax: '',
    nbUsersMax: '',
    features: '',
    actif: true,
  })

  useEffect(() => {
    plans.get(planId)
      .then((p) => {
        setPlan(p)
        setForm({
          nom: p.nom,
          description: p.description ?? '',
          prixMensuelCents: String(p.prixMensuelCents),
          prixAnnuelCents: String(p.prixAnnuelCents),
          nbSitesMax: String(p.nbSitesMax),
          nbUsersMax: String(p.nbUsersMax),
          features: (p.features ?? []).join('\n'),
          actif: p.actif,
        })
      })
      .catch((err) => setFetchError(err instanceof Error ? err.message : t('error')))
      .finally(() => setLoading(false))
  }, [planId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await plans.update(planId, {
        nom: form.nom,
        description: form.description || null,
        prixMensuelCents: parseInt(form.prixMensuelCents) || 0,
        prixAnnuelCents: parseInt(form.prixAnnuelCents) || 0,
        nbSitesMax: parseInt(form.nbSitesMax) || 1,
        nbUsersMax: parseInt(form.nbUsersMax) || 1,
        features: form.features.split('\n').map((f) => f.trim()).filter(Boolean),
        actif: form.actif,
      })
      setPlan(updated)
      toast({ body: t('plan_updated'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await plans.delete(planId)
      router.push('/plans')
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner size={8} /></div>
  if (fetchError || !plan) return <InlineError message={fetchError ?? t('plan_not_found')} />

  const codeBadge = (
    <span
      className="font-mono text-xs rounded px-1.5 py-0.5"
      style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 8%, transparent)', color: 'var(--color-accent)' }}
    >
      {plan.code}
    </span>
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={plan.nom} backHref="/plans" badge={codeBadge} />

      <form onSubmit={handleSave} className="flex flex-col gap-5 max-w-lg">
        {/* Identity */}
        <div
          className="rounded-lg border p-5 space-y-4"
          style={{ backgroundColor: 'var(--color-background-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {t('plan_identity')}
          </h2>
          <FieldGrid columns={2}>
            <TextInput label={t('plan_code')} value={plan.code} isRequired width="100%" isDisabled />
            <TextInput label={t('plan_name')} value={form.nom} onChange={(v) => setForm((f) => ({ ...f, nom: v }))} isRequired width="100%" />
          </FieldGrid>
          <TextInput label={t('plan_description')} value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} width="100%" />
        </div>

        {/* Pricing */}
        <div
          className="rounded-lg border p-5 space-y-4"
          style={{ backgroundColor: 'var(--color-background-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {t('plan_pricing')}
          </h2>
          <FieldGrid columns={2}>
            <TextInput
              label={t('plan_price_monthly')}
              type="text"
              value={form.prixMensuelCents}
              onChange={(v) => setForm((f) => ({ ...f, prixMensuelCents: v }))}
              width="100%"
            />
            <TextInput
              label={t('plan_price_yearly')}
              type="text"
              value={form.prixAnnuelCents}
              onChange={(v) => setForm((f) => ({ ...f, prixAnnuelCents: v }))}
              width="100%"
            />
          </FieldGrid>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {formatPrice(parseInt(form.prixMensuelCents) || 0)}/mois ·{' '}
            {formatPrice(parseInt(form.prixAnnuelCents) || 0)}/an
          </p>
        </div>

        {/* Limits */}
        <div
          className="rounded-lg border p-5 space-y-4"
          style={{ backgroundColor: 'var(--color-background-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {t('plan_limits')}
          </h2>
          <FieldGrid columns={2}>
            <TextInput
              label={t('plan_nb_sites_max')}
              type="text"
              value={form.nbSitesMax}
              onChange={(v) => setForm((f) => ({ ...f, nbSitesMax: v }))}
              width="100%"
            />
            <TextInput
              label={t('plan_nb_users_max')}
              type="text"
              value={form.nbUsersMax}
              onChange={(v) => setForm((f) => ({ ...f, nbUsersMax: v }))}
              width="100%"
            />
          </FieldGrid>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('plan_nb_hint')}
          </p>
        </div>

        {/* Features */}
        <div
          className="rounded-lg border p-5 space-y-4"
          style={{ backgroundColor: 'var(--color-background-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {t('plan_features')}
          </h2>
          <TextArea
            label={t('plan_features')}
            value={form.features}
            onChange={(v) => setForm((f) => ({ ...f, features: v }))}
            rows={5}
            width="100%"
          />
        </div>

        {/* Actions */}
        <PermissionGate permission="BILLING_WRITE">
          <div className="flex items-center justify-between">
            <Button
              variant="destructive"
              label={t('plan_delete')}
              onClick={() => setShowDeleteConfirm(true)}
            />
            <Button variant="primary" label={t('save')} type="submit" isLoading={saving} />
          </div>
        </PermissionGate>
      </form>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onOpenChange={(open) => { if (!open) setShowDeleteConfirm(false) }}
        title={t('plan_delete_confirm')}
        description={t('plan_delete_description')}
        confirmLabel={t('delete')}
        confirmVariant="destructive"
        onConfirm={handleDelete}
        isLoading={deleting}
      />
    </div>
  )
}
