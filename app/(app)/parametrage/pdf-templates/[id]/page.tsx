'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FileText, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react'
import { Button, Spinner, TextArea, useToast } from '@astryxdesign/core'
import { ConfirmDialog } from '@/components/composite/confirm-dialog'
import { PageHeader } from '@/components/layout/page-header'
import { PdfPreviewPanel } from '@/components/pdf/pdf-preview-panel'
import { CopyButton } from '@/components/ui/copy-button'
import { InlineError } from '@/components/ui/inline-error'
import { ResizeHandle } from '@/components/ui/resize-handle'
import { Section } from '@/components/ui/section'
import { usePdfPreview } from '@/lib/hooks/use-pdf-preview'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { useI18n } from '@/lib/i18n'
import {
  getInstanceAdmin,
  updateGlobalTemplate,
  deleteGlobalTemplate,
  type PdfTemplateInstance,
} from '@/lib/pdf-templates-client'

const SCOPE_LABELS: Record<string, string> = {
  commande: 'pdf_templates_scope_commande',
  facture: 'pdf_templates_scope_facture',
  reception: 'pdf_templates_scope_reception',
  inventaire: 'pdf_templates_scope_inventaire',
}

/** Largeur du panneau d'aperçu, en pixels — celle retenue au dernier usage. */
const PANEL_WIDTH_KEY = 'orpailleur_pdf_preview_width'
const PANEL_MIN_WIDTH = 380
const PANEL_MAX_WIDTH = 720
const PANEL_DEFAULT_WIDTH = 520

/**
 * Permet de poser une variable CSS custom dans un style inline.
 *
 * `React.CSSProperties` n'a pas d'index signature : sans ce type, l'objet
 * `{ '--pdf-preview-width': '520px' }` est refusé par le compilateur.
 */
type CSSVars = React.CSSProperties & Record<`--${string}`, string | number | undefined>

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

  const [deleteTarget, setDeleteTarget] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // ── Panneau d'aperçu ──────────────────────────────────────────────────────
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)

  const preview = usePdfPreview(id, body)

  /** Le panneau est en plein écran sous `lg`, en colonne à côté au-delà. */
  const isWide = useMediaQuery('(min-width: 1024px)')

  // Largeur retenue d'une session à l'autre : la tragicité du redimensionnement
  // est proportionnelle au nombre de fois où on le refait.
  useEffect(() => {
    const stored = Number(localStorage.getItem(PANEL_WIDTH_KEY))
    if (Number.isFinite(stored) && stored >= PANEL_MIN_WIDTH && stored <= PANEL_MAX_WIDTH) {
      setPanelWidth(stored)
    }
  }, [])

  const handlePanelWidth = useCallback((width: number) => {
    setPanelWidth(width)
    try {
      localStorage.setItem(PANEL_WIDTH_KEY, String(width))
    } catch {
      // Stockage indisponible (mode privé) : la largeur reste valable pour
      // la session en cours, c'est tout.
    }
  }, [])

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

  const openPanel = useCallback(() => {
    setPanelOpen(true)
    // Le rendu part ici plutôt que dans un effet : l/open ne peut pas
    // afficher une fraction de seconde l'état vide avant de passer en
    // « rendu en cours ».
    if (preview.status === 'idle') void preview.generate()
  }, [preview.status, preview.generate])

  const closePanel = useCallback(() => {
    setPanelOpen(false)
    // Le focus revient sur le déclencheur : sans cela, il part à la racine
    // du document et l'utilisateur ne sait plus d'où il venait.
    toggleRef.current?.focus()
  }, [])

  const togglePanel = useCallback(() => {
    if (panelOpen) closePanel()
    else openPanel()
  }, [panelOpen, closePanel, openPanel])

  // Échap ferme le panneau. L'écoute est sur `window` : le panneau n'a pas
  // le focus en permanence (l'utilisateur continue d'écrire dans le modèle),
  // et une écoute sur le panneau ne se déclencherait jamais.
  useEffect(() => {
    if (!panelOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panelOpen, closePanel])

  // Sous `lg`, le panneau recouvre la page : le focus doit y aller. Au-delà,
  // il cohabite avec l'éditeur, et lui voler le focus interromprait la saisie.
  useEffect(() => {
    if (panelOpen && !isWide) panelRef.current?.focus()
  }, [panelOpen, isWide])

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
    <div className="flex flex-col gap-6">
      <PageHeader
        title={name || t('pdf_templates_title')}
        backHref="/parametrage/pdf-templates"
        icon={<FileText size={20} style={{ color: 'var(--color-text-primary)' }} />}
        action={
          isGlobal && (
            <div className="flex items-center gap-2">
              <Button
                ref={toggleRef}
                label={panelOpen ? t('pdf_templates_preview_hide') : t('pdf_templates_preview')}
                variant={panelOpen ? 'primary' : 'secondary'}
                icon={panelOpen ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                aria-expanded={panelOpen}
                aria-controls="pdf-preview-panel"
                onClick={togglePanel}
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
                icon={<Trash2 size={15} aria-hidden="true" />}
                onClick={() => setDeleteTarget(true)}
              />
            </div>
          )
        }
      />

      {saveError && <InlineError message={saveError} />}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-5">
        {/* ── Éditeur ── */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {!isGlobal ? (
            <>
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
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* ── Panneau d'aperçu ──
            Sous `lg` il recouvre la page (fond voilé, fermeture par le voile
            ou par Échap) ; au-delà il se place en colonne à côté de
            l'éditeur et reste collé au haut pendant le défilement.

            Il reste MONTÉ quand il est fermé, masqué par `display: none` :
            démonter l'`iframe` à chaque fermeture jetterait le PDF déjà
            rendu et le rouvrir afficherait un cadre vide le temps du
            rechargement. */}
        <div
          className={`fixed inset-0 z-40 justify-end lg:static lg:inset-auto lg:z-auto lg:shrink-0 lg:sticky lg:top-4 ${panelOpen ? 'flex' : 'hidden'}`}
        >
          {/* Voile : mobile seulement, et purement décoratif. */}
          <div
            className="absolute inset-0 bg-black/40 lg:hidden"
            onClick={closePanel}
            aria-hidden="true"
          />
          {/*
            Sous `lg`, le panneau laisse 8 % de la page visible à gauche :
            c'est ce qui rend le voile visible, donc le geste « toucher
            dehors pour fermer » lisible. Plein écran, le voile serait caché
            et le geste deviendrait invisible.
          */}
          <aside
            id="pdf-preview-panel"
            ref={panelRef}
            tabIndex={-1}
            aria-label={t('pdf_templates_preview')}
            className="relative flex h-full min-h-0 w-[92%] flex-col overflow-hidden rounded-lg border lg:h-[calc(100dvh_-_5.5rem)] lg:w-[var(--pdf-preview-width,520px)]"
            style={
              {
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-card)',
                boxShadow: 'var(--shadow-card)',
                '--pdf-preview-width': `${panelWidth}px`,
              } as CSSVars
            }
          >
            <ResizeHandle
              width={panelWidth}
              min={PANEL_MIN_WIDTH}
              max={PANEL_MAX_WIDTH}
              onWidthChange={handlePanelWidth}
              label={t('pdf_templates_preview_resize')}
              className="hidden lg:block"
            />
            <PdfPreviewPanel
              status={preview.status}
              url={preview.url}
              error={preview.error}
              stale={preview.stale}
              onRefresh={() => void preview.generate()}
              onClose={closePanel}
            />
          </aside>
        </div>
      </div>

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
    </div>
  )
}
