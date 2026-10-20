'use client'

import { Badge, Button, Spinner } from '@astryxdesign/core'
import { ExternalLink, FileText, RefreshCw, TriangleAlert, X } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { useT } from '@/lib/i18n'
import type { PdfPreviewStatus } from '@/lib/hooks/use-pdf-preview'

/**
 * Panneau d'aperçu d'un modèle de document.
 *
 * Il ne porte QUE l'affichage : l'état du rendu (chargement, PDF, erreur) et
 * la décision de le lancer appartiennent à la page, via `usePdfPreview`.
 *
 * Le PDF est servi par le lecteur natif du navigateur, dans un `iframe`.
 * L'URL est présignée et expire : un panneau laissé ouvert toute la nuit
 * finit par afficher un cadre vide. C'est le bouton « Actualiser » qui
 * relance le rendu — d'où sa présence permanente dans l'en-tête.
 *
 * Deux règles de continuité, parce qu'un aperçu qui clignote est un aperçu
 * qu'on ne regarde plus :
 *
 *  — un RAFRAÎCHISSEMENT ne remplace jamais le PDF affiché par un
 *    chargement à blanc. Le PDF reste sous un voile, et c'est lui qui est
 *    remplacé quand le nouveau arrive ;
 *  — un rendu en ÉCHEC ne jette pas le PDF précédent : l'erreur s'affiche
 *    au-dessus, le document reste lisible.
 */
export function PdfPreviewPanel({
  status,
  url,
  error,
  stale,
  onRefresh,
  onClose,
}: {
  status: PdfPreviewStatus
  url: string | null
  error: string
  /** Le PDF affiché ne correspond plus au modèle affiché. */
  stale: boolean
  onRefresh: () => void
  onClose: () => void
}) {
  const t = useT()
  const loading = status === 'loading'
  const failed = status === 'error'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── En-tête ── */}
      <div
        className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <FileText size={15} aria-hidden="true" style={{ color: 'var(--color-text-secondary)' }} />
          <span
            className="truncate text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {t('pdf_templates_preview')}
          </span>
          {stale && (
            <Badge
              variant="warning"
              icon={<TriangleAlert size={12} aria-hidden="true" />}
              label={t('pdf_templates_preview_stale')}
            />
          )}
          {status === 'ready' && !stale && (
            <Badge variant="success" label={t('pdf_templates_preview_up_to_date')} />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            label={t('pdf_templates_preview_refresh')}
            icon={<RefreshCw size={14} aria-hidden="true" />}
            variant="ghost"
            size="sm"
            isIconOnly
            isLoading={loading}
            onClick={onRefresh}
          />
          {url && (
            <Button
              label={t('pdf_templates_preview_open_tab')}
              icon={<ExternalLink size={14} aria-hidden="true" />}
              variant="ghost"
              size="sm"
              isIconOnly
              onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
            />
          )}
          <Button
            label={t('pdf_templates_preview_close')}
            icon={<X size={15} aria-hidden="true" />}
            variant="ghost"
            size="sm"
            isIconOnly
            onClick={onClose}
          />
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {status === 'idle' && (
          <div className="p-4">
            <EmptyState
              icon={<FileText size={22} aria-hidden="true" />}
              title={t('pdf_templates_preview_idle')}
              description={t('pdf_templates_preview_idle_hint')}
              action={
                <Button
                  label={t('pdf_templates_preview_generate')}
                  variant="primary"
                  onClick={onRefresh}
                />
              }
            />
          </div>
        )}

        {/* Un PDF existe (ou vient d'exister) : on l'affiche, et les états
            intermédiaires se posent PAR-DESSUS plutôt que de le remplacer. */}
        {(loading || status === 'ready' || (failed && url)) && (
          <div className="flex h-full min-h-0 flex-col">
            {failed && url && (
              <div className="shrink-0 p-3 pb-0">
                <InlineError message={error || t('pdf_templates_preview_err')} />
              </div>
            )}

            {url ? (
              <div className="relative min-h-0 flex-1">
                <iframe
                  key={url}
                  src={url}
                  title={t('pdf_templates_preview')}
                  className="h-full w-full border-0"
                  style={{ display: 'block' }}
                />
                {loading && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      backgroundColor:
                        'color-mix(in srgb, var(--color-card) 72%, transparent)',
                    }}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Spinner size="md" />
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('pdf_templates_preview_rendering')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <Spinner size="md" />
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('pdf_templates_preview_rendering')}
                </p>
                <p className="max-w-xs text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('pdf_templates_preview_rendering_hint')}
                </p>
              </div>
            )}
          </div>
        )}

        {failed && !url && (
          <div className="flex flex-col gap-4 p-4">
            <InlineError message={error || t('pdf_templates_preview_err')} />
            <Button
              label={t('pdf_templates_preview_retry')}
              variant="secondary"
              icon={<RefreshCw size={14} aria-hidden="true" />}
              onClick={onRefresh}
            />
          </div>
        )}
      </div>
    </div>
  )
}
