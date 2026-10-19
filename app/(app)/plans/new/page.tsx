'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, useToast } from '@astryxdesign/core'
import { TextInput, TextArea } from '@astryxdesign/core'
import { FieldError } from '@/components/ui/form-field'
import { useFormErrors } from '@/components/ui/form-field'
import { FieldGrid } from '@/components/ui/modal'
import { PageHeader } from '@/components/layout/page-header'
import { PermissionGate } from '@/components/composite/permission-gate'
import { plans, type Plan } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'

export default function PlanNewPage() {
  const router = useRouter()
  const toast = useToast()
  const { t } = useI18n()
  const formErrors = useFormErrors()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    code: '',
    nom: '',
    description: '',
    prixMensuelCents: '4900',
    prixAnnuelCents: '47040',
    nbSitesMax: '1',
    nbUsersMax: '5',
    features: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    let hasError = false
    if (!form.code.trim()) { formErrors.setError('code', t('required')); hasError = true }
    else formErrors.clearError('code')
    if (!form.nom.trim()) { formErrors.setError('nom', t('required')); hasError = true }
    else formErrors.clearError('nom')
    if (hasError) return
    setSaving(true)
    try {
      const dto: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'> = {
        code: form.code.toLowerCase().replace(/\s+/g, '_'),
        nom: form.nom,
        description: form.description || null,
        prixMensuelCents: parseInt(form.prixMensuelCents) || 0,
        prixAnnuelCents: parseInt(form.prixAnnuelCents) || 0,
        nbSitesMax: parseInt(form.nbSitesMax) || 1,
        nbUsersMax: parseInt(form.nbUsersMax) || 1,
        features: form.features.split('\n').map((f) => f.trim()).filter(Boolean),
        actif: true,
      }
      await plans.create(dto)
      toast({ body: t('plan_created'), type: 'info' })
      router.push('/plans')
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('plan_new')} backHref="/plans" />

      <PermissionGate permission="BILLING_WRITE">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-lg">
          {/* Identity */}
          <div
            className="rounded-lg border p-5 space-y-4"
            style={{ backgroundColor: 'var(--color-background-surface)', borderColor: 'var(--color-border)' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {t('plan_identity')}
            </h2>
            <FieldGrid columns={2}>
              <div className="flex flex-col gap-1">
                <TextInput
                  label={t('plan_code')}
                  value={form.code}
                  onChange={(v) => { setForm((f) => ({ ...f, code: v })); formErrors.clearError('code') }}
                  isRequired
                  width="100%"
                  placeholder={t('plan_code_hint')}
                />
                <FieldError message={formErrors.errors.code} />
              </div>
              <div className="flex flex-col gap-1">
                <TextInput
                  label={t('plan_name')}
                  value={form.nom}
                  onChange={(v) => { setForm((f) => ({ ...f, nom: v })); formErrors.clearError('nom') }}
                  isRequired
                  width="100%"
                  placeholder={t('plan_name_hint')}
                />
                <FieldError message={formErrors.errors.nom} />
              </div>
            </FieldGrid>
            <TextInput
              label={t('plan_description')}
              value={form.description}
              onChange={(v) => setForm((f) => ({ ...f, description: v }))}
              width="100%"
              placeholder="Pour les artisans indépendants…"
            />
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
                placeholder="4900"
              />
              <TextInput
                label={t('plan_price_yearly')}
                type="text"
                value={form.prixAnnuelCents}
                onChange={(v) => setForm((f) => ({ ...f, prixAnnuelCents: v }))}
                width="100%"
                placeholder="47040"
              />
            </FieldGrid>
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
              placeholder={t('plan_features_placeholder')}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" label={t('plan_cancel')} onClick={() => router.push('/plans')} />
            <Button variant="primary" label={t('plan_create')} type="submit" isLoading={saving} />
          </div>
        </form>
      </PermissionGate>
    </div>
  )
}
