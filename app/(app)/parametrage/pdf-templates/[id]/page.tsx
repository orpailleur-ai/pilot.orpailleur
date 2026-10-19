'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FileText, Pencil, Trash2, Eye } from 'lucide-react'
import { Button, Spinner, TextArea, useToast } from '@astryxdesign/core'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import { ConfirmDialog } from '@/components/composite/confirm-dialog'
import { PageHeader } from '@/components/layout/page-header'
import { InlineError } from '@/components/ui/inline-error'
import { CopyButton } from '@/components/ui/copy-button'
import { Modal } from '@/components/ui/modal'
import { Section } from '@/components/ui/section'
import { useI18n } from '@/lib/i18n'
import {
  getInstanceAdmin,
  updateGlobalTemplate,
  deleteGlobalTemplate,
  previewTemplateAdmin,
  type PdfTemplateInstance,
} from '@/lib/pdf-templates-client'

const SCOPE_LABELS: Record<string, string> = {
  commande: 'pdf_templates_scope_commande',
  facture: 'pdf_templates_scope_facture',
  reception: 'pdf_templates_scope_reception',
  inventaire: 'pdf_templates_scope_inventaire',
}

export default function PdfTemplateDetailPage() {
  const router = useRouter()
  const { t } = useI18n()
  const toast = useToast()
  const params = useParams<{ id: string }>()
  const id = params.id

  const [instance, setInstance] = useState<PdfTemplateInstance | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [dataError, setDataError] = useState('')

  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [actif, setActif] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Load instance
  useEffect(() => {
    if (!id) return
    setLoadingData(true)
    setDataError('')
    getInstanceAdmin(id)
      .then((inst) => {
        setInstance(inst)
        setName(inst.name)
        setBody(inst.body ?? '')
        setActif(inst.actif)
      })
      .catch((e: unknown) => {
        setDataError(e instanceof Error ? e.message : t('error'))
      })
      .finally(() => {
        setLoadingData(false)
      })
  }, [id, t])

  const handleSave = useCallback(async () => {
    if (!id) return
    setSaving(true)
    setSaveError('')
    try {
      const updated = await updateGlobalTemplate(id, { name: name.trim(), body, actif })
      setInstance(updated)
      setIsDirty(false)
      toast({ body: t('pdf_templates_saved'), type: 'info' })
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : t('error'))
    } finally {
      setSaving(false)
    }
  }, [id, name, body, actif, t, toast])

  const handlePreview = useCallback(async () => {
    if (!id) return
    setPreviewLoading(true)
    try {
      const r = await previewTemplateAdmin(id, body)
      setPreviewUrl(r.url)
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('pdf_templates_preview_err'), type: 'error' })
    } finally {
      setPreviewLoading(false)
    }
  }, [id, body, t, toast])

  const handleDelete = useCallback(async () => {
    if (!id) return
    setDeleting(true)
    try {
      await deleteGlobalTemplate(id)
      toast({ body: t('pdf_templates_deleted'), type: 'info' })
      router.push('/parametrage/pdf-templates')
    } catch (e: unknown) {
      toast({ body: e instanceof Error ? e.message : t('error'), type: 'error' })
    } finally {
      setDeleting(false)
    }
  }, [id, t, toast, router])

  if (loadingData) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="md" />
      </div>
    )
  }

  if (dataError || !instance) {
    return (
      <>
        <PageHeader
          title={t('pdf_templates_title')}
          backHref="/parametrage/pdf-templates"
        />
        <InlineError message={dataError || t('error')} />
      </>
    )
  }

  const isGlobal = instance.tenantId === null

  return (
    <>
      <PageHeader
        title={name || t('pdf_templates_title')}
        backHref="/parametrage/pdf-templates"
        icon={<FileText size={20} style={{ color: 'var(--color-text-primary)' }} />}
        action={
          isGlobal && (
            <div className="flex items-center gap-2">
              <Button
                label={previewLoading ? t('loading') : t('pdf_templates_preview')}
                variant="secondary"
                icon={previewLoading ? <Spinner size="sm" /> : <Eye size={15} />}
                isLoading={previewLoading}
                onClick={handlePreview}
              />
              <Button
                label={actif ? t('pdf_templates_deactivate') : t('pdf_templates_activate')}
                variant={actif ? 'secondary' : 'primary'}
                onClick={() => {
                  const next = !actif
                  setActif(next)
                  setIsDirty(true)
                }}
              />
              <Button
                label={saving ? t('loading') : t('save')}
                variant="primary"
                isLoading={saving}
                isDisabled={!isDirty}
                onClick={handleSave}
              />
              <Button
                label={t('delete')}
                variant="secondary"
                icon={<Trash2 size={15} />}
                onClick={() => setDeleteTarget(true)}
              />
            </div>
          )
        }
      />

      {saveError && <InlineError message={saveError} />}

      {/* Read-only display for tenant templates */}
      {!isGlobal ? (
        <div className="flex flex-col gap-6">
          <div
            className="rounded-lg border px-4 py-3 text-sm"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-card)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {t('pdf_templates_tenant_readonly')}
          </div>
          <Section title={t('pdf_templates_form_name')}>
            <p style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{instance.name}</p>
          </Section>
          <Section title={t('pdf_templates_form_scope')}>
            <p style={{ color: 'var(--color-text-primary)' }}>
              {t(SCOPE_LABELS[instance.scope] ?? instance.scope)}
            </p>
          </Section>
          <Section title={t('pdf_templates_form_active')}>
            <p style={{ color: 'var(--color-text-primary)' }}>
              {instance.actif ? t('pdf_templates_active') : t('pdf_templates_inactive')}
            </p>
          </Section>
          <Section title={t('pdf_templates_form_body')}>
            <pre
              className="overflow-auto rounded border p-3 text-xs"
              style={{
                fontFamily: 'Menlo, ui-monospace, monospace',
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
                maxHeight: '40vh',
              }}
            >
              {instance.body}
            </pre>
          </Section>
        </div>
      ) : (
        /* Editable form for global templates */
        <div className="flex flex-col gap-6">
          <Section title={t('pdf_templates_form_name')}>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setIsDirty(true) }}
              className="w-full rounded border px-3 py-2 text-sm"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </Section>

          <Section
            title={t('pdf_templates_form_body')}
            action={<CopyButton value={body} label={t('copy')} labelCopied={t('copied')} />}
          >
            <TextArea
              label={t('pdf_templates_form_body')}
              value={body}
              onChange={(v) => { setBody(v); setIsDirty(true) }}
              rows={24}
              style={{ fontFamily: 'Menlo, ui-monospace, monospace', fontSize: 13 }}
            />
          </Section>

          <Section title={t('pdf_templates_metadata')}>
            <div className="flex flex-col gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <p>{t('pdf_templates_created_at')}: {new Date(instance.createdAt).toLocaleString('fr-FR')}</p>
              <p>{t('pdf_templates_updated_at')}: {new Date(instance.updatedAt).toLocaleString('fr-FR')}</p>
              {instance.createdBy && <p>{t('pdf_templates_created_by')}: {instance.createdBy}</p>}
              {instance.updatedBy && <p>{t('pdf_templates_updated_by')}: {instance.updatedBy}</p>}
            </div>
          </Section>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(false) }}
        title={t('pdf_templates_delete')}
        description={t('pdf_templates_delete_confirm')}
        confirmLabel={t('delete')}
        confirmVariant="destructive"
        onConfirm={handleDelete}
        isLoading={deleting}
      />

      {/* Preview modal */}
      {previewUrl && (
        <Modal
          isOpen={true}
          onOpenChange={(open) => { if (!open) setPreviewUrl(null) }}
          title={t('pdf_templates_preview')}
          size="full"
        >
          <iframe
            src={previewUrl}
            style={{ width: '100%', height: '80vh', border: 'none', display: 'block' }}
            title={t('pdf_templates_preview')}
          />
        </Modal>
      )}
    </>
  )
}
