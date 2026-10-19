'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Globe, Edit2, Trash2 } from 'lucide-react'
import { Button, useToast } from '@astryxdesign/core'
import { TextInput } from '@astryxdesign/core'
import { Modal, ModalSection, FieldGrid } from '@/components/ui/modal'
import { PageHeader } from '@/components/layout/page-header'
import { Spinner } from '@/components/ui/spinner'
import { InlineError } from '@/components/ui/inline-error'
import { FieldError } from '@/components/ui/form-field'
import { useFormErrors } from '@/components/ui/form-field'
import { ConfirmDialog } from '@/components/composite/confirm-dialog'
import { StatusPill } from '@/components/composite/status-pill'
import { PermissionGate } from '@/components/composite/permission-gate'
import { sites, type Site, type CreateSiteDto } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export default function SiteDetailPage() {
  const params = useParams()
  const tenantId = params.id as string
  const siteId = params.siteId as string
  const router = useRouter()
  const { t } = useI18n()
  const toast = useToast()
  const formErrors = useFormErrors()

  const [site, setSite] = useState<Site | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [editingSite, setEditingSite] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [form, setForm] = useState<CreateSiteDto>({
    nom: '',
    adresse: '',
    ville: '',
    code_postal: '',
    telephone: '',
    jour_ouverture: 7,
    jour_fermeture: 19,
    actif: true,
  })

  useEffect(() => {
    load()
  }, [siteId])

  async function load() {
    setLoading(true)
    setFetchError(null)
    try {
      const data = await sites.get(siteId)
      setSite(data)
      setForm({
        nom: data.nom,
        adresse: data.adresse ?? '',
        ville: data.ville ?? '',
        code_postal: data.code_postal ?? '',
        telephone: data.telephone ?? '',
        jour_ouverture: data.jour_ouverture,
        jour_fermeture: data.jour_fermeture,
        actif: data.actif,
      })
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : t('error'))
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nom.trim()) {
      formErrors.setError('nom', t('required'))
      return
    }
    formErrors.clearError('nom')
    setSaving(true)
    try {
      const updated = await sites.update(siteId, form)
      setSite(updated)
      setEditingSite(false)
      toast({ body: t('site_updated'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await sites.delete(siteId)
      router.push(`/tenants/${tenantId}/sites`)
      toast({ body: t('site_deleted'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size={8} /></div>
  }

  if (fetchError) {
    return <InlineError message={fetchError} />
  }

  if (!site) return null

  const openDay = JOURS[(site.jour_ouverture - 1) % 7] ?? String(site.jour_ouverture)
  const closeDay = JOURS[(site.jour_fermeture - 1) % 7] ?? String(site.jour_fermeture)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={site.nom}
        backHref={`/tenants/${tenantId}/sites`}
        icon={<Globe size={20} style={{ color: 'var(--color-text-primary)' }} />}
        action={
          <PermissionGate permission="TENANT_WRITE">
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Edit2 size={14} />}
                label={t('edit')}
                onClick={() => setEditingSite(true)}
              />
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 size={14} />}
                label={t('delete')}
                onClick={() => setShowDelete(true)}
              />
            </div>
          </PermissionGate>
        }
      />

      {/* Status badge */}
      <div className="flex items-center gap-2">
        <StatusPill status={site.actif ? 'active' : 'inactive'} size="md" />
      </div>

      {/* Info cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div
          className="rounded-lg border p-5 space-y-3"
          style={{ backgroundColor: 'var(--color-background-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {t('site_info', 'Informations')}
          </h2>
          <div className="space-y-2">
            {site.adresse && (
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-text-secondary)' }}>{t('site_address')}</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{site.adresse}</span>
              </div>
            )}
            {(site.code_postal || site.ville) && (
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-text-secondary)' }}>{t('site_postal')}</span>
                <span style={{ color: 'var(--color-text-primary)' }}>
                  {[site.code_postal, site.ville].filter(Boolean).join(' ')}
                </span>
              </div>
            )}
            {site.telephone && (
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-text-secondary)' }}>{t('site_phone')}</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{site.telephone}</span>
              </div>
            )}
          </div>
        </div>

        <div
          className="rounded-lg border p-5 space-y-3"
          style={{ backgroundColor: 'var(--color-background-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {t('site_hours', 'Horaires')}
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--color-text-secondary)' }}>{t('site_open_day')}</span>
              <span style={{ color: 'var(--color-text-primary)' }}>{openDay}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--color-text-secondary)' }}>{t('site_close_day')}</span>
              <span style={{ color: 'var(--color-text-primary)' }}>{closeDay}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {t('created_at', 'Créé le')} {new Date(site.createdAt).toLocaleDateString('fr-FR')}
        {' · '}
        {t('updated_at', 'Modifié le')} {new Date(site.updatedAt).toLocaleDateString('fr-FR')}
      </div>

      {/* Edit modal */}
      <Modal
        isOpen={editingSite}
        onOpenChange={(open) => { if (!open) { setEditingSite(false); formErrors.clearAll() } }}
        title={t('site_edit')}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-5">
          <ModalSection title={t('site_info')}>
            <FieldGrid columns={1}>
              <div className="flex flex-col gap-1">
                <TextInput
                  label={t('site_name')}
                  value={form.nom}
                  onChange={(v) => { setForm((f) => ({ ...f, nom: v })); formErrors.clearError('nom') }}
                  isRequired
                  width="100%"
                />
                <FieldError message={formErrors.errors.nom} />
              </div>
              <TextInput
                label={t('site_address')}
                value={form.adresse ?? ''}
                onChange={(v) => setForm((f) => ({ ...f, adresse: v }))}
                width="100%"
              />
            </FieldGrid>
            <FieldGrid columns={2}>
              <TextInput
                label={t('site_postal')}
                value={form.code_postal ?? ''}
                onChange={(v) => setForm((f) => ({ ...f, code_postal: v }))}
                width="100%"
              />
              <TextInput
                label={t('site_city')}
                value={form.ville ?? ''}
                onChange={(v) => setForm((f) => ({ ...f, ville: v }))}
                width="100%"
              />
            </FieldGrid>
            <TextInput
              label={t('site_phone')}
              value={form.telephone ?? ''}
              onChange={(v) => setForm((f) => ({ ...f, telephone: v }))}
              width="100%"
            />
            {/* Toggle actif / inactif */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {t('site_active', 'Actif')}
              </span>
              <button
                type="button"
                aria-pressed={form.actif}
                onClick={() => setForm((f) => ({ ...f, actif: !f.actif }))}
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  backgroundColor: form.actif
                    ? 'color-mix(in srgb, var(--color-success) 80%, transparent)'
                    : 'color-mix(in srgb, var(--color-text-secondary) 30%, transparent)',
                  outline: 'none',
                }}
              >
                <span
                  className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ease-in-out"
                  style={{
                    transform: form.actif ? 'translateX(20px)' : 'translateX(0)',
                  }}
                />
              </button>
              <span className="text-sm" style={{ color: form.actif ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
                {form.actif ? t('active') : t('inactive')}
              </span>
            </div>
          </ModalSection>

          <ModalSection title={t('site_hours')}>
            <FieldGrid columns={2}>
              <TextInput
                label={t('site_open_day')}
                value={String(form.jour_ouverture)}
                onChange={(v) => setForm((f) => ({ ...f, jour_ouverture: parseInt(v) || 1 }))}
                width="100%"
              />
              <TextInput
                label={t('site_close_day')}
                value={String(form.jour_fermeture)}
                onChange={(v) => setForm((f) => ({ ...f, jour_fermeture: parseInt(v) || 19 }))}
                width="100%"
              />
            </FieldGrid>
          </ModalSection>

          <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <Button
              label={t('cancel')}
              variant="secondary"
              onClick={() => setEditingSite(false)}
              className="flex-1"
            />
            <Button
              label={saving ? t('saving') : t('save')}
              variant="primary"
              type="submit"
              isLoading={saving}
              className="flex-1"
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={showDelete}
        onOpenChange={setShowDelete}
        title={t('site_delete_confirm')}
        description={t('site_delete_description')}
        confirmLabel={t('delete')}
        confirmVariant="destructive"
        onConfirm={handleDelete}
        isLoading={deleting}
      />
    </div>
  )
}
