'use client'

import { AlertTriangle, Mail, TriangleAlert } from 'lucide-react'
import { Badge } from '@astryxdesign/core'
import { useT } from '@/lib/i18n'
import type { EmailTemplatePreview } from '@/lib/email-client'

/**
 * Panneau d'aperçu d'un gabarit d'email.
 *
 * L'email est un DOCUMENT : on le lit dans un cadre qui ressemble à un
 * client de messagerie, pas dans un bloc de texte. Le corps rendu est donc
 * isolationné dans une `iframe` `srcdoc` — un `<div>` ne rendrait pas le
 * HTML de l'email comme un navigateur le ferait (tableaux de mise en page,
 * styles en ligne, images distantes).
 *
 * L'iframe est SANDBOXÉE, sans `allow-scripts` : le corps est écrit par un
 * administrateur, mais un gabarit qui exécuterait du JavaScript n'a rien à
 * faire dans un aperçu d'email, et le bac à sable évite qu'il touche la
 * page qui le montre.
 */
export function EmailPreviewPanel({
  preview,
  enCours,
  error,
}: {
  /** Dernier rendu reçu. `null` tant qu'aucun rendu n'est arrivé. */
  preview: EmailTemplatePreview | null
  /** Un rendu est en cours. */
  enCours: boolean
  /** Erreur réseau ou serveur du dernier appel. */
  error: string
}) {
  const t = useT()

  const erreurs = preview?.errors ?? []
  const avertissements = preview?.warnings ?? []
  const aDesProblemes = erreurs.length > 0 || avertissements.length > 0

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── En-tête ── */}
      <div
        className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Mail size={15} aria-hidden="true" style={{ color: 'var(--color-text-secondary)' }} />
          <span className="truncate text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {t('email_templates_preview')}
          </span>
          {enCours && (
            <Badge variant="info" label={t('email_templates_preview_rendering')} />
          )}
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="min-h-0 flex-1 overflow-auto">
        {/* Erreurs et avertissements : ils passent AVANT le rendu, parce
            qu'un gabarit cassé ne se diagnose pas en regardant le PDF. */}
        {error && (
          <div
            className="mx-3 mt-3 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-danger) 35%, transparent)',
              color: 'var(--color-danger-text)',
            }}
            role="alert"
          >
            <AlertTriangle size={14} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        {erreurs.map((e) => (
          <div
            key={e}
            className="mx-3 mt-3 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-danger) 35%, transparent)',
              color: 'var(--color-danger-text)',
            }}
            role="alert"
          >
            <AlertTriangle size={14} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{e}</span>
          </div>
        ))}

        {avertissements.map((w) => (
          <div
            key={w}
            className="mx-3 mt-3 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-warning) 35%, transparent)',
              color: 'var(--color-warning-text)',
            }}
            role="status"
          >
            <TriangleAlert size={14} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{w}</span>
          </div>
        ))}

        {!preview && !enCours && !error && (
          <p className="p-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {t('email_templates_preview_idle')}
          </p>
        )}

        {preview && (
          <>
            {/* Sujet rendu — c'est ce que le destinataire lit en premier. */}
            <div className="px-4 pt-4">
              <p
                className="text-xs font-medium uppercase tracking-wide"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t('email_templates_preview_subject')}
              </p>
              <p className="mt-1 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {preview.renderedSubject || <span style={{ color: 'var(--color-text-secondary)' }}>—</span>}
              </p>
            </div>

            {/* Corps rendu, encadré comme un client de messagerie. */}
            <div className="p-4">
              <div
                className="mx-auto overflow-hidden rounded-lg border"
                style={{
                  maxWidth: 600,
                  borderColor: 'var(--color-border)',
                  backgroundColor: '#ffffff',
                }}
              >
                <iframe
                  title={t('email_templates_preview')}
                  srcDoc={preview.renderedBody}
                  sandbox=""
                  className="block w-full"
                  style={{ height: 520, border: 0, backgroundColor: '#ffffff' }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
