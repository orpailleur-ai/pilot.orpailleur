'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, Button, TextInput, TextArea, useToast } from '@astryxdesign/core'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import { FileText, Globe, Plus, Pencil, Trash2, Eye, Search, X } from 'lucide-react'
import { ConfirmDialog } from '@/components/composite/confirm-dialog'
import { PageHeader } from '@/components/layout/page-header'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { Spinner } from '@/components/ui/spinner'
import { Modal, ModalSection, FieldGrid } from '@/components/ui/modal'
import { useI18n } from '@/lib/i18n'
import {
  listScopesAdmin,
  listInstancesAdmin,
  createGlobalTemplate,
  updateGlobalTemplate,
  deleteGlobalTemplate,
  previewTemplateAdmin,
  type PdfScope,
  type PdfTemplateInstance,
} from '@/lib/pdf-templates-client'

const SCOPE_LABELS: Record<string, string> = {
  commande: 'pdf_templates_scope_commande',
  facture: 'pdf_templates_scope_facture',
  reception: 'pdf_templates_scope_reception',
  inventaire: 'pdf_templates_scope_inventaire',
}

const STATUS_BADGE: Record<string, 'success' | 'neutral' | 'error' | 'warning' | 'info'> = {
  true: 'success',
  false: 'neutral',
}

export default function PdfTemplatesPage() {
  const router = useRouter()
  const { t } = useI18n()
  const toast = useToast()

  const [instances, setInstances] = useState<PdfTemplateInstance[]>([])
  const [scopes, setScopes] = useState<PdfScope[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  /**
   * Id du modèle dont l'aperçu est en cours de rendu.
   *
   * Un booléen ne suffisait pas : il faisait tourner le spinner sur TOUTES
   * les lignes du tableau, alors qu'une seule est en cours.
   */
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ url: string; key: string } | null>(null)

  const [modal, setModal] = useState<{
    mode: 'create' | 'edit'
    instance?: PdfTemplateInstance
  } | null>(null)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<PdfTemplateInstance | null>(null)
  const [deleting, setDeleting] = useState(false)

  const charger = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [s, i] = await Promise.all([listScopesAdmin(), listInstancesAdmin()])
      setScopes(s)
      setInstances(i)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('error'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { void charger() }, [charger])

  async function handleSave(values: { name: string; scope: string; body: string; actif: boolean }) {
    if (!modal) return
    setSaving(true)
    try {
      if (modal.mode === 'create') {
        await createGlobalTemplate(values)
      } else if (modal.instance) {
        await updateGlobalTemplate(modal.instance.id, values)
      }
      setModal(null)
      await charger()
      toast({ body: t('pdf_templates_saved'), type: 'info' })
    } catch (e: unknown) {
      toast({ body: e instanceof Error ? e.message : t('error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteGlobalTemplate(deleteTarget.id)
      setDeleteTarget(null)
      await charger()
      toast({ body: t('pdf_templates_deleted'), type: 'info' })
    } catch (e: unknown) {
      toast({ body: e instanceof Error ? e.message : t('error'), type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  async function handlePreview(inst: PdfTemplateInstance) {
    setPreviewLoadingId(inst.id)
    try {
      const result = await previewTemplateAdmin(inst.id)
      setPreview(result)
    } catch {
      toast({ body: t('pdf_templates_preview_err'), type: 'error' })
    } finally {
      setPreviewLoadingId(null)
    }
  }

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return instances
    const q = search.toLowerCase()
    return instances.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.scope.toLowerCase().includes(q) ||
        (i.tenant?.nom ?? '').toLowerCase().includes(q),
    )
  }, [instances, search])

  // Columns
  const columns: Column<PdfTemplateInstance>[] = [
    {
      key: 'name',
      header: t('pdf_templates_form_name'),
      mobile: 'primary',
      render: (row) => (
        <span className="flex items-center gap-1.5 min-w-0">
          {row.tenantId === null && (
            <Globe size={13} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
          )}
          <span className="truncate font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {row.name}
          </span>
        </span>
      ),
    },
    {
      key: 'scope',
      header: t('pdf_templates_form_scope'),
      render: (row) => (
        <Badge
          label={t(SCOPE_LABELS[row.scope] ?? row.scope)}
          variant="neutral"
        />
      ),
    },
    {
      key: 'tenant',
      header: t('pdf_templates_tenant'),
      mobile: 'inline',
      render: (row) => {
        if (row.tenantId === null) {
          return (
            <Badge
              label={t('pdf_templates_global')}
              variant="info"
            />
          )
        }
        return (
          <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
            {row.tenant?.nom ?? row.tenantId}
          </span>
        )
      },
    },
    {
      key: 'actif',
      header: t('pdf_templates_active'),
      align: 'end',
      render: (row) => (
        <Badge
          label={row.actif ? t('pdf_templates_active') : t('pdf_templates_inactive')}
          variant={STATUS_BADGE[String(row.actif)] ?? 'neutral'}
        />
      ),
    },
    {
      key: 'updatedAt',
      header: t('date'),
      mobile: 'hidden',
      align: 'end',
      render: (row) => (
        <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
          {new Date(row.updatedAt).toLocaleDateString('fr-FR')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      mobile: 'hidden',
      noRowClick: true,
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            label={t('pdf_templates_preview')}
            variant="ghost"
            size="sm"
            isIconOnly
            icon={<Eye size={14} />}
            onClick={() => handlePreview(row)}
            isLoading={previewLoadingId === row.id}
          />
          {row.tenantId === null ? (
            <>
              <Button
                label={t('edit')}
                variant="ghost"
                size="sm"
                isIconOnly
                icon={<Pencil size={14} />}
                onClick={() => setModal({ mode: 'edit', instance: row })}
              />
              <Button
                label={t('delete')}
                variant="ghost"
                size="sm"
                isIconOnly
                icon={<Trash2 size={14} />}
                onClick={() => setDeleteTarget(row)}
              />
            </>
          ) : null}
        </div>
      ),
    },
  ]

  const action = (
    <Button
      label={t('pdf_templates_new')}
      variant="primary"
      icon={<Plus size={15} />}
      onClick={() => setModal({ mode: 'create' })}
    />
  )

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={8} />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title={t('pdf_templates_title')}
        icon={<FileText size={20} style={{ color: 'var(--color-text-primary)' }} />}
        action={action}
      />

      {error && <InlineError message={error} />}

      {/* Search */}
      <div className="mb-4">
        <TextInput
          label={t('search')}
          placeholder={t('search')}
          value={search}
          onChange={setSearch}
          startIcon={<Search size={15} />}
          width="100%"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText size={24} />}
          title={search ? t('noResults') : t('pdf_templates_empty')}
          description={
            !search ? t('pdf_templates_empty_description') : undefined
          }
          action={
            !search ? (
              <Button
                label={t('pdf_templates_new')}
                variant="primary"
                icon={<Plus size={15} />}
                onClick={() => setModal({ mode: 'create' })}
              />
            ) : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(row) => row.id}
          onRowClick={(row) => router.push(`/parametrage/pdf-templates/${row.id}`)}
        />
      )}

      {/* Create / Edit modal */}
      {modal && (
        <EditModal
          mode={modal.mode}
          instance={modal.instance}
          scopes={scopes}
          saving={saving}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title={t('pdf_templates_delete')}
        description={t('pdf_templates_delete_confirm')}
        confirmLabel={t('delete')}
        confirmVariant="destructive"
        onConfirm={handleDelete}
        isLoading={deleting}
      />

      {/* Preview modal */}
      {preview && (
        <Modal
          isOpen={true}
          onOpenChange={(open) => { if (!open) setPreview(null) }}
          title={t('pdf_templates_preview')}
          size="full"
        >
          <iframe
            src={preview.url}
            style={{ width: '100%', height: '80vh', border: 'none', display: 'block' }}
            title={t('pdf_templates_preview')}
          />
        </Modal>
      )}
    </>
  )
}

// ── Edit Modal ─────────────────────────────────────────────────────────────────

interface EditModalProps {
  mode: 'create' | 'edit'
  instance?: PdfTemplateInstance
  scopes: PdfScope[]
  saving: boolean
  onSave: (v: { name: string; scope: string; body: string; actif: boolean }) => void
  onClose: () => void
}

function EditModal({ mode, instance, scopes, saving, onSave, onClose }: EditModalProps) {
  const { t } = useI18n()
  const [name, setName] = useState(instance?.name ?? '')
  const [scope, setScope] = useState(instance?.scope ?? scopes[0]?.scope ?? 'commande')
  const [body, setBody] = useState(instance?.body ?? '')
  const [actif, setActif] = useState(instance?.actif ?? false)

  const title = mode === 'create' ? t('pdf_templates_new') : t('pdf_templates_edit')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({ name, scope, body, actif })
  }

  return (
    <Modal
      isOpen={true}
      onOpenChange={(open) => { if (!open) onClose() }}
      title={title}
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <ModalSection title={t('pdf_templates_form_name')}>
          <FieldGrid columns={1}>
            <TextInput
              label={t('pdf_templates_form_name')}
              value={name}
              onChange={setName}
              isRequired
              width="100%"
            />
          </FieldGrid>
        </ModalSection>

        <ModalSection title={t('pdf_templates_form_scope')}>
          <FieldGrid columns={1}>
            <TextInput
              label={t('pdf_templates_form_scope')}
              value={t(SCOPE_LABELS[scope] ?? scope)}
              onChange={() => {}}
              isReadOnly
              width="100%"
            />
          </FieldGrid>
          {mode === 'create' && (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
              {t('pdf_templates_form_scope_hint')}
            </p>
          )}
          <div style={{ display: 'none' }}>
            {/* Hidden select for form submission - scope is set at creation */}
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              {scopes.map((s) => (
                <option key={s.scope} value={s.scope}>
                  {t(SCOPE_LABELS[s.scope] ?? s.scope)}
                </option>
              ))}
            </select>
          </div>
        </ModalSection>

        <ModalSection title={t('pdf_templates_form_body')}>
          <FieldGrid columns={1}>
            <TextArea
              label={t('pdf_templates_form_body')}
              value={body}
              onChange={setBody}
              rows={16}
              style={{ fontFamily: 'Menlo, ui-monospace, monospace', fontSize: 13 }}
            />
          </FieldGrid>
        </ModalSection>

        <ModalSection title={t('pdf_templates_form_active')}>
          <CheckboxInput
            label={t('pdf_templates_form_active')}
            value={actif}
            onChange={(checked) => setActif(checked)}
          />
        </ModalSection>

        <div
          className="flex gap-3 pt-3 border-t"
          style={{ borderColor: 'var(--color-border)', justifyContent: 'flex-end' }}
        >
          <Button
            label={t('cancel')}
            variant="secondary"
            onClick={onClose}
          />
          <Button
            label={saving ? t('loading') : t('save')}
            variant="primary"
            type="submit"
            isLoading={saving}
          />
        </div>
      </form>
    </Modal>
  )
}
