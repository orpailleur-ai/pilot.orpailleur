'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTenantDetail } from '@/components/composite/tenant-detail-context'
import { Settings } from 'lucide-react'
import { InlineError } from '@/components/ui/inline-error'
import { FieldError } from '@/components/ui/form-field'
import { useFormErrors } from '@/components/ui/form-field'
import { PageHeader } from '@/components/layout/page-header'
import { Spinner } from '@/components/ui/spinner'
import { TextInput } from '@astryxdesign/core'
import { Button, useToast } from '@astryxdesign/core'
import { ModalSection, FieldGrid } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/composite/confirm-dialog'
import { PermissionGate } from '@/components/composite/permission-gate'
import { adminTenants, type CreateTenantDto } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'

export default function TenantSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const tenantId = params.id as string
  const { tenant, isLoading, error, refresh } = useTenantDetail()
  const { t } = useI18n()
  const toast = useToast()
  const formErrors = useFormErrors()

  const [form, setForm] = useState<Partial<CreateTenantDto> & { telephone?: string }>({})
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (tenant) {
      setForm({
        nom: tenant.nom,
        email: tenant.email ?? '',
        siret: tenant.siret ?? '',
        siren: tenant.siren ?? '',
        adresse: tenant.adresse ?? '',
        ville: tenant.ville ?? '',
        code_postal: tenant.code_postal ?? '',
        telephone: tenant.telephone ?? '',
      })
    }
  }, [tenant])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nom?.trim()) { formErrors.setError('nom', t('required')); return }
    formErrors.clearError('nom')
    setSaving(true)
    try {
      await adminTenants.update(tenantId, form)
      refresh()
      toast({ body: t('tenant_updated'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate() {
    setSaving(true)
    try {
      await adminTenants.update(tenantId, { actif: false } as Partial<CreateTenantDto>)
      refresh()
      toast({ body: t('tenant_deactivated'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await adminTenants.delete(tenantId)
      router.push('/tenants')
      toast({ body: t('tenant_deleted'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={8} />
      </div>
    )
  }

  if (error) {
    return <InlineError message={error} />
  }

  if (!tenant) return null

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      <PageHeader
        title={t('tenant_settings', 'Paramètres du tenant')}
        icon={<Settings size={20} style={{ color: 'var(--color-text-primary)' }} />}
      />

      {/* Identity */}
      <div
        className="rounded-lg border p-5 space-y-4"
        style={{ backgroundColor: 'var(--color-background-surface)', borderColor: 'var(--color-border)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {t('tenant_settings_identity', 'Identité')}
        </h2>
        <FieldGrid columns={2}>
          <div className="flex flex-col gap-1">
            <TextInput
              label={t('name', 'Nom du tenant')}
              value={form.nom ?? ''}
              onChange={(v) => { setForm((f) => ({ ...f, nom: v })); formErrors.clearError('nom') }}
              isRequired
              width="100%"
            />
            <FieldError message={formErrors.errors.nom} />
          </div>
          <TextInput
            label={t('tenant_settings_siret', 'SIRET')}
            value={form.siret ?? ''}
            onChange={(v) => setForm((f) => ({ ...f, siret: v }))}
            width="100%"
          />
          <TextInput
            label={t('tenant_settings_siren', 'SIREN')}
            value={form.siren ?? ''}
            onChange={(v) => setForm((f) => ({ ...f, siren: v }))}
            width="100%"
          />
        </FieldGrid>
      </div>

      {/* Contact */}
      <div
        className="rounded-lg border p-5 space-y-4"
        style={{ backgroundColor: 'var(--color-background-surface)', borderColor: 'var(--color-border)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {t('tenant_settings_contact', 'Contact')}
        </h2>
        <FieldGrid columns={2}>
          <TextInput
            label={t('tenant_settings_email', 'Email')}
            type="email"
            value={form.email ?? ''}
            onChange={(v) => setForm((f) => ({ ...f, email: v }))}
            width="100%"
          />
          <TextInput
            label={t('tenant_settings_phone', 'Téléphone')}
            value={form.telephone ?? ''}
            onChange={(v) => setForm((f) => ({ ...f, telephone: v }))}
            width="100%"
          />
          <TextInput
            label={t('tenant_settings_address', 'Adresse')}
            value={form.adresse ?? ''}
            onChange={(v) => setForm((f) => ({ ...f, adresse: v }))}
            width="100%"
          />
          <TextInput
            label={t('tenant_settings_postal', 'Code postal')}
            value={form.code_postal ?? ''}
            onChange={(v) => setForm((f) => ({ ...f, code_postal: v }))}
            width="100%"
          />
          <TextInput
            label={t('tenant_settings_city', 'Ville')}
            value={form.ville ?? ''}
            onChange={(v) => setForm((f) => ({ ...f, ville: v }))}
            width="100%"
          />
        </FieldGrid>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <PermissionGate permission="TENANT_WRITE">
            <Button
              variant="secondary"
              label={tenant.actif ? t('deactivate') : t('tenant_reactivate')}
              onClick={handleDeactivate}
              isLoading={saving}
            />
          </PermissionGate>
        </div>
        <div className="flex gap-3">
          <PermissionGate permission="TENANT_WRITE">
            <Button
              variant="destructive"
              label={t('delete')}
              onClick={() => setShowDelete(true)}
            />
          </PermissionGate>
          <PermissionGate permission="TENANT_WRITE">
            <Button
              variant="primary"
              label={t('save')}
              type="submit"
              isLoading={saving}
            />
          </PermissionGate>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDelete}
        onOpenChange={setShowDelete}
        title={t('delete_tenant')}
        description={t('delete_tenant_hint', { nom: tenant.nom })}
        confirmLabel={t('delete')}
        confirmVariant="destructive"
        onConfirm={handleDelete}
        isLoading={deleting}
      />
    </form>
  )
}
