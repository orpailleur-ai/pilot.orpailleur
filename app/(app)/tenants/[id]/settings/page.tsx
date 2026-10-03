'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTenantDetail } from '@/components/composite/tenant-detail-context'
import { InlineError } from '@/components/ui/inline-error'
import { Spinner } from '@/components/ui/spinner'
import { TextInput } from '@astryxdesign/core'
import { Button, useToast } from '@astryxdesign/core'
import { ModalSection, FieldGrid } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/composite/confirm-dialog'
import { adminTenants, type CreateTenantDto } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'

export default function TenantSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const tenantId = params.id as string
  const { tenant, isLoading, error, refresh } = useTenantDetail()
  const { t } = useI18n()
  const toast = useToast()

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
    if (!form.nom?.trim()) return
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
      {/* Identity */}
      <div
        className="rounded-lg border p-5 space-y-4"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Identité
        </h2>
        <FieldGrid columns={2}>
          <TextInput
            label="Nom du tenant"
            value={form.nom ?? ''}
            onChange={(v) => setForm((f) => ({ ...f, nom: v }))}
            isRequired
            width="100%"
          />
          <TextInput
            label="SIRET"
            value={form.siret ?? ''}
            onChange={(v) => setForm((f) => ({ ...f, siret: v }))}
            width="100%"
          />
          <TextInput
            label="SIREN"
            value={form.siren ?? ''}
            onChange={(v) => setForm((f) => ({ ...f, siren: v }))}
            width="100%"
          />
        </FieldGrid>
      </div>

      {/* Contact */}
      <div
        className="rounded-lg border p-5 space-y-4"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Contact
        </h2>
        <FieldGrid columns={2}>
          <TextInput
            label="Email"
            type="email"
            value={form.email ?? ''}
            onChange={(v) => setForm((f) => ({ ...f, email: v }))}
            width="100%"
          />
          <TextInput
            label="Téléphone"
            value={form.telephone ?? ''}
            onChange={(v) => setForm((f) => ({ ...f, telephone: v }))}
            width="100%"
          />
          <TextInput
            label="Adresse"
            value={form.adresse ?? ''}
            onChange={(v) => setForm((f) => ({ ...f, adresse: v }))}
            width="100%"
          />
          <TextInput
            label="Code postal"
            value={form.code_postal ?? ''}
            onChange={(v) => setForm((f) => ({ ...f, code_postal: v }))}
            width="100%"
          />
          <TextInput
            label="Ville"
            value={form.ville ?? ''}
            onChange={(v) => setForm((f) => ({ ...f, ville: v }))}
            width="100%"
          />
        </FieldGrid>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <Button
            variant="secondary"
            label={tenant.actif ? t('deactivate') : t('activate')}
            onClick={handleDeactivate}
            isLoading={saving}
          />
        </div>
        <div className="flex gap-3">
          <Button
            variant="destructive"
            label={t('delete')}
            onClick={() => setShowDelete(true)}
          />
          <Button
            variant="primary"
            label={t('save')}
            type="submit"
            isLoading={saving}
          />
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
