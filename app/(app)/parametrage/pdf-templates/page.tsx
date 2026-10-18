'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { FileText, Globe, Loader2, Pencil, Trash2, Eye } from 'lucide-react'
import { ConfirmDialog } from '@/components/composite/confirm-dialog'
import { PageHeader } from '@/components/layout/page-header'
import { InlineError } from '@/components/ui/inline-error'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@astryxdesign/core'
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

export default function PdfTemplatesPage() {
  const { t } = useI18n()
  const toast = useToast()
  const [scopes, setScopes] = useState<PdfScope[]>([])
  const [instances, setInstances] = useState<PdfTemplateInstance[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

  const [modal, setModal] = useState<{
    mode: 'create' | 'edit'
    instance?: PdfTemplateInstance
  } | null>(null)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<PdfTemplateInstance | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [preview, setPreview] = useState<{ url: string; key: string } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const charger = useCallback(async () => {
    setChargement(true)
    setErreur('')
    try {
      const [s, i] = await Promise.all([listScopesAdmin(), listInstancesAdmin()])
      setScopes(s)
      setInstances(i)
    } catch (e: unknown) {
      setErreur(e instanceof Error ? e.message : t('error'))
    } finally {
      setChargement(false)
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
    setPreviewLoading(true)
    try {
      const result = await previewTemplateAdmin(inst.id)
      setPreview(result)
    } catch {
      toast({ body: t('pdf_templates_preview_err'), type: 'error' })
    } finally {
      setPreviewLoading(false)
    }
  }

  return (
    <>
      <PageHeader title={t('pdf_templates_title')} />

      {erreur && <InlineError message={erreur} />}

      <div className="mb-4">
        <button
          type="button"
          onClick={() => setModal({ mode: 'create' })}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium"
          style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
        >
          <FileText size={15} />
          {t('pdf_templates_new')}
        </button>
      </div>

      {chargement ? (
        <TableSkeleton rows={4} />
      ) : (
        <div className="flex flex-col gap-6">
          {scopes.map((scope) => {
            const scopeInstances = instances.filter((i) => i.scope === scope.scope)
            const globalInstance = scopeInstances.find((i) => i.tenantId === null)
            const tenantInstances = scopeInstances.filter((i) => i.tenantId !== null)

            return (
              <section key={scope.scope}>
                <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <h2
                    className="text-sm font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {t(SCOPE_LABELS[scope.scope] ?? scope.scope)}
                  </h2>
                  <code
                    className="rounded px-1 py-0.5 text-[11px]"
                    style={{
                      backgroundColor: 'var(--color-background-muted)',
                      color: 'var(--color-text-secondary)',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    {scope.scope}
                  </code>
                </div>

                {globalInstance ? (
                  <TemplateRow
                    instance={globalInstance}
                    onEdit={() => setModal({ mode: 'edit', instance: globalInstance })}
                    onDelete={() => setDeleteTarget(globalInstance)}
                    onPreview={() => handlePreview(globalInstance)}
                    previewLoading={previewLoading}
                  />
                ) : (
                  <p
                    className="rounded-lg border px-3 py-2 text-xs italic"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    {t('pdf_templates_empty')}
                  </p>
                )}

                {tenantInstances.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    <p
                      className="text-[11px] font-medium uppercase tracking-wide"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {t('pdf_templates_tenant')}
                    </p>
                    {tenantInstances.map((inst) => (
                      <TemplateRow
                        key={inst.id}
                        instance={inst}
                        readOnly
                        previewLoading={previewLoading}
                      />
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

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

      {preview && (
        <Dialog
          isOpen={true}
          onOpenChange={(open) => { if (!open) setPreview(null) }}
        >
          <Layout
            header={
              <DialogHeader
                title={t('pdf_templates_preview')}
                onOpenChange={(open) => { if (!open) setPreview(null) }}
              />
            }
            content={
              <LayoutContent padding={0}>
                <iframe
                  src={preview.url}
                  style={{ width: '100%', height: '80vh', border: 'none', display: 'block' }}
                  title={t('pdf_templates_preview')}
                />
              </LayoutContent>
            }
          />
        </Dialog>
      )}
    </>
  )
}

function TemplateRow({
  instance,
  readOnly = false,
  previewLoading = false,
  onEdit,
  onDelete,
  onPreview,
}: {
  instance: PdfTemplateInstance
  readOnly?: boolean
  previewLoading?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onPreview?: () => void
}) {
  const { t } = useI18n()
  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2.5 text-sm"
      style={{
        borderColor: instance.actif
          ? 'color-mix(in srgb, var(--color-success) 45%, transparent)'
          : 'var(--color-border)',
        backgroundColor: instance.actif
          ? 'color-mix(in srgb, var(--color-success) 6%, transparent)'
          : 'var(--color-card)',
      }}
    >
      <span
        className="flex items-center gap-1.5 font-medium"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {instance.tenantId === null ? <Globe size={13} /> : null}
        {instance.name}
      </span>

      {instance.tenantId === null && (
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
            color: 'var(--color-accent)',
          }}
        >
          {t('pdf_templates_global')}
        </span>
      )}

      <span
        className="ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium"
        style={{
          backgroundColor: instance.actif
            ? 'color-mix(in srgb, var(--color-success) 15%, transparent)'
            : 'var(--color-background-muted)',
          color: instance.actif ? 'var(--color-success)' : 'var(--color-text-secondary)',
        }}
      >
        {instance.actif ? t('pdf_templates_active') : t('pdf_templates_inactive')}
      </span>

      {!readOnly && instance.tenantId === null && (
        <span className="flex items-center gap-1">
          {onPreview && (
            <button
              type="button"
              onClick={onPreview}
              disabled={previewLoading}
              className="rounded p-1 transition-colors hover:bg-[var(--color-background-muted)]"
              style={{ color: 'var(--color-text-secondary)' }}
              title={t('pdf_templates_preview')}
            >
              {previewLoading ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded p-1 transition-colors hover:bg-[var(--color-background-muted)]"
              style={{ color: 'var(--color-text-secondary)' }}
              title={t('pdf_templates_edit')}
            >
              <Pencil size={14} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded p-1 transition-colors hover:bg-[var(--color-background-muted)]"
              style={{ color: 'var(--color-danger)' }}
              title={t('pdf_templates_delete')}
            >
              <Trash2 size={14} />
            </button>
          )}
        </span>
      )}
    </div>
  )
}

function EditModal({
  mode,
  instance,
  scopes,
  saving,
  onSave,
  onClose,
}: {
  mode: 'create' | 'edit'
  instance?: PdfTemplateInstance
  scopes: PdfScope[]
  saving: boolean
  onSave: (v: { name: string; scope: string; body: string; actif: boolean }) => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const formRef = useRef<HTMLFormElement>(null)
  const [name, setName] = useState(instance?.name ?? '')
  const [scope, setScope] = useState(instance?.scope ?? scopes[0]?.scope ?? 'commande')
  const [body, setBody] = useState(instance?.body ?? '')
  const [actif, setActif] = useState(instance?.actif ?? false)

  useEffect(() => {
    setName(instance?.name ?? '')
    setScope(instance?.scope ?? scopes[0]?.scope ?? 'commande')
    setBody(instance?.body ?? '')
    setActif(instance?.actif ?? false)
  }, [instance, scopes])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({ name, scope, body, actif })
  }

  return (
    <Dialog isOpen={true} onOpenChange={(open) => { if (!open) onClose() }}>
      <Layout
        header={
          <DialogHeader
            title={mode === 'create' ? t('pdf_templates_new') : t('pdf_templates_edit')}
            onOpenChange={(open) => { if (!open) onClose() }}
          />
        }
        content={
          <LayoutContent>
            <form
              ref={formRef}
              id="edit-form"
              className="flex flex-col gap-4"
              onSubmit={handleSubmit}
            >
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('pdf_templates_form_name')}
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="rounded border px-3 py-2 text-sm"
                  style={inputStyle()}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('pdf_templates_form_scope')}
                </span>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  disabled={mode === 'edit'}
                  className="rounded border px-3 py-2 text-sm"
                  style={inputStyle()}
                >
                  {scopes.map((s) => (
                    <option key={s.scope} value={s.scope}>
                      {t(SCOPE_LABELS[s.scope] ?? s.scope)} ({s.scope})
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('pdf_templates_form_body')}
                </span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  className="rounded border px-3 py-2 text-sm font-mono"
                  style={{ ...inputStyle(), resize: 'vertical' }}
                />
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={actif}
                  onChange={(e) => setActif(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {t('pdf_templates_form_active')}
                </span>
              </label>
            </form>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border px-3 py-1.5 text-sm"
                style={inputStyle()}
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                form="edit-form"
                disabled={saving}
                className="rounded-lg px-3 py-1.5 text-sm font-medium"
                style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : t('save')}
              </button>
            </div>
          </LayoutFooter>
        }
      />
    </Dialog>
  )
}

function inputStyle() {
  return {
    backgroundColor: 'var(--color-card)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  } as React.CSSProperties
}
