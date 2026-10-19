'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Globe, Trash2, Edit2, CheckCircle, XCircle } from 'lucide-react'
import { Button, useToast } from '@astryxdesign/core'
import { TextInput } from '@astryxdesign/core'
import { Modal, ModalSection, FieldGrid } from '@/components/ui/modal'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { PageHeader } from '@/components/layout/page-header'
import { Spinner } from '@/components/ui/spinner'
import { ConfirmDialog } from '@/components/composite/confirm-dialog'
import { PermissionGate } from '@/components/composite/permission-gate'
import { sites, type Site, type CreateSiteDto } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'

export default function TenantSitesPage() {
  const params = useParams()
  const router = useRouter()
  const tenantId = params.id as string
  const { t } = useI18n()
  const toast = useToast()
  const [sitesList, setSitesList] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nom: string } | null>(null)

  const [form, setForm] = useState<CreateSiteDto>({
    nom: '',
    adresse: '',
    ville: '',
    code_postal: '',
    telephone: '',
    jour_ouverture: 7,
    jour_fermeture: 19,
  })

  useEffect(() => {
    fetchSites()
  }, [tenantId])

  async function fetchSites() {
    setLoading(true)
    setFetchError(null)
    try {
      const data = await sites.list(tenantId)
      setSitesList(data)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : t('error'))
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nom.trim()) return
    setSaving(true)
    try {
      await sites.create(tenantId, form)
      setShowCreate(false)
      setForm({ nom: '', adresse: '', ville: '', code_postal: '', telephone: '', jour_ouverture: 7, jour_fermeture: 19 })
      fetchSites()
      toast({ body: t('site_created'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editingSite) return
    setSaving(true)
    try {
      await sites.update(editingSite.id, form)
      setEditingSite(null)
      setForm({ nom: '', adresse: '', ville: '', code_postal: '', telephone: '', jour_ouverture: 7, jour_fermeture: 19 })
      fetchSites()
      toast({ body: t('site_updated'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(deleteTarget.id)
    try {
      await sites.delete(deleteTarget.id)
      setDeleteTarget(null)
      fetchSites()
      toast({ body: t('site_deleted'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setDeleting(null)
    }
  }

  function openEdit(site: Site) {
    setEditingSite(site)
    setForm({
      nom: site.nom,
      adresse: site.adresse ?? '',
      ville: site.ville ?? '',
      code_postal: site.code_postal ?? '',
      telephone: site.telephone ?? '',
      jour_ouverture: site.jour_ouverture,
      jour_fermeture: site.jour_fermeture,
    })
  }

  function closeEdit() {
    setEditingSite(null)
    setForm({ nom: '', adresse: '', ville: '', code_postal: '', telephone: '', jour_ouverture: 7, jour_fermeture: 19 })
  }

  const columns: Column<Site>[] = [
    {
      key: 'nom',
      header: t('site_name', 'Nom'),
      mobile: 'primary',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Globe size={14} style={{ color: 'var(--color-accent)' }} />
          <span style={{ color: 'var(--color-text-primary)' }}>{row.nom}</span>
        </div>
      ),
    },
    {
      key: 'adresse',
      header: t('site_address', 'Adresse'),
      mobile: 'inline',
      render: (row) => row.adresse ?? '—',
    },
    {
      key: 'ville',
      header: t('site_city', 'Ville'),
      mobile: 'hidden',
      render: (row) => [row.code_postal, row.ville].filter(Boolean).join(' ') || '—',
    },
    {
      key: 'actif',
      header: t('status'),
      mobile: 'inline',
      render: (row) =>
        row.actif ? (
          <span className="flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
            <CheckCircle size={12} /> {t('active')}
          </span>
        ) : (
          <span className="flex items-center gap-1" style={{ color: 'var(--color-danger)' }}>
            <XCircle size={12} /> {t('inactive')}
          </span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      mobile: 'hidden',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            label="Modifier"
            icon={<Edit2 size={13} />}
            onClick={() => openEdit(row)}
          />
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            label="Supprimer"
            icon={<Trash2 size={13} />}
            isDisabled={deleting === row.id}
            onClick={() => setDeleteTarget({ id: row.id, nom: row.nom })}
          />
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={8} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('tenant_sites', 'Sites')}
        action={
          <PermissionGate permission="TENANT_WRITE">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              label={t('site_create')}
              onClick={() => setShowCreate(true)}
            />
          </PermissionGate>
        }
      />

      {fetchError && <InlineError message={fetchError} />}

      {sitesList.length === 0 ? (
        <EmptyState
          icon={<Globe size={24} />}
          title={t('no_sites')}
          description={t('no_sites_hint')}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={sitesList}
          rowKey={(row) => row.id}
          onRowClick={(row) => router.push(`/tenants/${tenantId}/sites/${row.id}`)}
        />
      )}

      {/* Create modal */}
      <Modal
        isOpen={showCreate}
        onOpenChange={(open) => { if (!open) setShowCreate(false) }}
        title={t('site_create')}
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-5">
          <ModalSection title={t('site_info')}>
            <FieldGrid columns={1}>
              <TextInput
                label={t('site_name')}
                value={form.nom}
                onChange={(v) => setForm((f) => ({ ...f, nom: v }))}
                isRequired
                width="100%"
                placeholder="Toulouse Centre"
              />
              <TextInput
                label={t('site_address')}
                value={form.adresse ?? ''}
                onChange={(v) => setForm((f) => ({ ...f, adresse: v }))}
                width="100%"
                placeholder="12 rue des Boulangers"
              />
            </FieldGrid>
            <FieldGrid columns={2}>
              <TextInput
                label={t('site_postal')}
                value={form.code_postal ?? ''}
                onChange={(v) => setForm((f) => ({ ...f, code_postal: v }))}
                width="100%"
                placeholder="31000"
              />
              <TextInput
                label={t('site_city')}
                value={form.ville ?? ''}
                onChange={(v) => setForm((f) => ({ ...f, ville: v }))}
                width="100%"
                placeholder="Toulouse"
              />
            </FieldGrid>
            <TextInput
              label={t('site_phone')}
              value={form.telephone ?? ''}
              onChange={(v) => setForm((f) => ({ ...f, telephone: v }))}
              width="100%"
              placeholder="05 61 00 00 00"
            />
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
              onClick={() => setShowCreate(false)}
              className="flex-1"
            />
            <Button
              label={saving ? t('saving') : t('add')}
              variant="primary"
              type="submit"
              isLoading={saving}
              className="flex-1"
            />
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        isOpen={!!editingSite}
        onOpenChange={(open) => { if (!open) closeEdit() }}
        title={t('site_edit')}
        size="md"
      >
        <form onSubmit={handleUpdate} className="space-y-5">
          <ModalSection title={t('site_info')}>
            <FieldGrid columns={1}>
              <TextInput
                label={t('site_name')}
                value={form.nom}
                onChange={(v) => setForm((f) => ({ ...f, nom: v }))}
                isRequired
                width="100%"
              />
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
              onClick={closeEdit}
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
        isOpen={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title={t('site_delete_confirm')}
        description={deleteTarget ? t('site_delete_description') : ''}
        confirmLabel={t('delete')}
        confirmVariant="destructive"
        onConfirm={handleDelete}
        isLoading={deleting !== null}
      />
    </div>
  )
}
