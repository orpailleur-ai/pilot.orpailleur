'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Mail, Pencil, CheckCircle, Lock } from 'lucide-react'
import { Button, Spinner, TextArea, useToast } from '@astryxdesign/core'
import { PageHeader } from '@/components/layout/page-header'
import { ActiveTogglePill } from '@/components/composite/active-toggle-pill'
import { EmailPreviewPanel } from '@/components/email/email-preview-panel'
import { InlineError } from '@/components/ui/inline-error'
import { CopyButton } from '@/components/ui/copy-button'
import { Section } from '@/components/ui/section'
import { useI18n } from '@/lib/i18n'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { buildEmailTemplatePrompt } from '@/lib/email-template-prompt'
import {
  getEmailTemplateAdmin,
  previewEmailTemplateAdmin,
  upsertEmailTemplateAdmin,
  type EmailTemplateDetail,
  type EmailTemplatePreview,
} from '@/lib/email-client'

const SCOPE_LABELS: Record<string, string> = {
  commande_envoyee: 'email_scope_commande_envoyee',
  facture_impayee: 'email_scope_facture_impayee',
  reception_validated: 'email_scope_reception_validated',
  stock_bas: 'email_scope_stock_bas',
  abonnement_renouvele: 'email_scope_abonnement_renouvele',
  notif_generic: 'email_scope_notif_generic',
}

/** Délai avant de redemander un rendu. */
const PREVIEW_DEBOUNCE_MS = 500

export default function EmailTemplateEditorPage() {
  const { t } = useI18n()
  const toast = useToast()
  const params = useParams<{ scope: string }>()
  const searchParams = useSearchParams()
  const scope = params.scope

  /**
   * `?mode=read` : la page est une CONSULTATION, pas un formulaire.
   *
   * C'est ce qui distingue « Voir » et « Modifier » dans la liste : les deux
   * mènent à la même page, mais l'une affiche le gabarit, l'autre permet de
   * l'éditer. Sans ce mode, les deux boutons ne voudraient rien dire.
   */
  const lectureSeule = searchParams.get('mode') === 'read'

  const [template, setTemplate] = useState<EmailTemplateDetail | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [dataError, setDataError] = useState('')

  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [actif, setActif] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  // ── Aperçu ──────────────────────────────────────────────────────────────────
  const [panelOpen, setPanelOpen] = useState(true)
  const [preview, setPreview] = useState<EmailTemplatePreview | null>(null)
  const [previewError, setPreviewError] = useState('')
  const [previewEnCours, setPreviewEnCours] = useState(false)
  const panelRef = useRef<HTMLElement>(null)

  /**
   * Le panneau s'ouvre sur grand écran et reste fermé sur téléphone.
   *
   * Sur un écran large, l'aperçu est la raison d'être de la page ; sur un
   * téléphone, il recouvrirait l'éditeur et l'écran de saisie.
   */
  const isWide = useMediaQuery('(min-width: 1024px)')
  const [largeVu, setLargeVu] = useState(false)
  useEffect(() => {
    if (!largeVu && isWide) {
      setLargeVu(true)
      setPanelOpen(true)
    }
  }, [isWide, largeVu])

  useEffect(() => {
    if (!scope) return
    setLoadingData(true)
    setDataError('')
    getEmailTemplateAdmin(scope)
      .then((tpl) => {
        setTemplate(tpl)
        // Meme pour un template qui n'existe pas encore : le nom est
        // pre-rempli avec le libelle du scope, et le corps reste vide. Sans
        // cela la page demarrait sur un formulaire totalement nu, sans meme
        // une idee de ce qu'on attendait.
        setName(tpl.name ?? tpl.scopeDef?.label ?? '')
        setSubject(tpl.subject ?? '')
        setBodyHtml(tpl.bodyHtml ?? '')
        // Un template cree sans plus est ACTIF (l'API fait `actif ?? true`) :
        // afficher « inactif » dans le formulaire alors que l'enregistrement
        // l'activait, c'etait incoherent.
        setActif(tpl.exists ? (tpl.actif ?? false) : true)
      })
      .catch((e: unknown) => {
        setDataError(e instanceof Error ? e.message : t('error'))
      })
      .finally(() => {
        setLoadingData(false)
      })
  }, [scope, t])

  /**
   * Demande un rendu à l'API.
   *
   * Le rendu d'un email ne coûte qu'une compilation Handlebars — quelques
   * millisecondes, contre plusieurs secondes pour un PDF. On peut donc
   * rafraîchir À CHAQUE PAUSE dans la frappe : l'aperçu suit la saisie.
   */
  const rafraichirApercu = useCallback(async () => {
    if (!scope) return
    setPreviewEnCours(true)
    try {
      const r = await previewEmailTemplateAdmin(scope, { subject, bodyHtml })
      setPreview(r)
      setPreviewError('')
    } catch (e: unknown) {
      setPreviewError(e instanceof Error ? e.message : t('error'))
    } finally {
      setPreviewEnCours(false)
    }
  }, [scope, subject, bodyHtml, t])

  /**
   * Le rendu est RELANCÉ à chaque modification, mais seulement après une
   * pause : une requête par frappe saturerait l'API pour rien.
   */
  const dernierRendu = useRef<string>('')
  useEffect(() => {
    if (!scope) return
    const signature = `${subject}\n${bodyHtml}`
    if (signature === dernierRendu.current) return
    const timer = setTimeout(() => {
      dernierRendu.current = signature
      void rafraichirApercu()
    }, PREVIEW_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [scope, subject, bodyHtml, rafraichirApercu])

  const handleSave = useCallback(async () => {
    if (!scope) return
    setSaving(true)
    setSaveError('')
    setSaved(false)
    try {
      await upsertEmailTemplateAdmin(scope, {
        name: name.trim() || t(SCOPE_LABELS[scope] ?? scope),
        subject: subject.trim(),
        bodyHtml: bodyHtml,
        actif,
      })
      setIsDirty(false)
      setSaved(true)
      toast({ body: t('email_templates_saved'), type: 'info' })
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : t('error'))
    } finally {
      setSaving(false)
    }
  }, [scope, name, subject, bodyHtml, actif, t, toast])

  if (loadingData) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="md" />
      </div>
    )
  }

  if (dataError || !template) {
    return (
      <>
        <PageHeader title={t('email_templates_title')} backHref="/parametrage/email-templates" />
        <InlineError message={dataError || t('error')} />
      </>
    )
  }

  // Les variables viennent du REGISTRE des scopes, pas d'une colonne stockee
  // dans la table des templates : celle-ci n'est jamais ecrite, donc elle
  // serait vide — et le serait pour toujours. Le registre, lui, suit le
  // code, et sert aussi bien a la creation qu'a l'edition.
  const variables = template.scopeDef?.variables ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={name || t(SCOPE_LABELS[scope] ?? scope) || scope}
        backHref="/parametrage/email-templates"
        icon={<Mail size={20} style={{ color: 'var(--color-text-primary)' }} />}
        action={
          <div className="flex items-center gap-2">
            {/* Mode lecture seule : l'etat est montre, pas modifie.
                Le cadenas dit pourquoi la page n'est pas un formulaire. */}
            {lectureSeule && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-text-secondary) 10%, transparent)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <Lock size={12} aria-hidden="true" />
                {t('email_templates_read_only')}
              </span>
            )}
            {/* L'etat actif/inactif est dans l'EN-TETE, pas en bas du
                formulaire : c'est l'information la plus consultee d'un
                gabarit, et un controleuble au defilement de la page
                n'aide pas. La pastille montre l'etat ET le change au clic —
                un bouton qui change de libelle selon l'etat cache l'etat. */}
            <ActiveTogglePill
              actif={actif}
              labelActif={t('email_templates_active')}
              labelInactif={t('email_templates_inactive')}
              onToggle={
                lectureSeule
                  ? undefined
                  : () => {
                      setActif((v) => !v)
                      setIsDirty(true)
                    }
              }
              isDisabled={lectureSeule}
            />
            {!lectureSeule && saved && (
              <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--color-success, green)' }}>
                <CheckCircle size={14} />
                {t('saved')}
              </span>
            )}
            <Button
              label={t('email_templates_preview_hide')}
              variant={panelOpen ? 'primary' : 'secondary'}
              aria-expanded={panelOpen}
              aria-controls="email-preview-panel"
              onClick={() => setPanelOpen((v) => !v)}
            />
            {!lectureSeule && (
              <Button
                label={saving ? t('loading') : t('save')}
                variant="primary"
                isLoading={saving}
                // Un template qui N'EXISTE PAS encore s'enregistre même
                // sans modification : le sujet et le corps sont pré-remplis
                // avec le gabarit par défaut du scope, et c'est déjà un
                // template. Sans cette exception, le bouton resterait
                // inactif et le gabarit par défaut ne pourrait jamais
                // devenir le gabarit du scope.
                isDisabled={!isDirty && template.exists}
                onClick={handleSave}
              />
            )}
          </div>
        }
      />

      {saveError && <InlineError message={saveError} />}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-5">
        {/* ── Éditeur ── */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* Template jamais enregistre : on le dit, plutot que de laisser croire
              a un template vide deja configure. */}
          {!template.exists && (
            <div
              className="rounded border px-4 py-3 text-sm"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-card)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {t('email_templates_new_hint')}
            </div>
          )}

          {/* Variables disponibles */}
          {variables.length > 0 && (
            <Section title={t('email_templates_variables')}>
              <div className="flex flex-wrap gap-2">
                {variables.map((v) => (
                  <code
                    key={v.name}
                    className="rounded border px-2 py-1 text-xs"
                    style={{
                      fontFamily: 'Menlo, ui-monospace, monospace',
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-card)',
                      color: 'var(--color-text-secondary)',
                    }}
                    title={`{{${v.name}}}`}
                  >
                    {`{{${v.name}}}`}
                  </code>
                ))}
              </div>
              <p className="mt-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('email_templates_variables_hint')}
              </p>
            </Section>
          )}

          {/* Nom */}
          <Section title={t('email_templates_name')}>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setIsDirty(true) }}
              disabled={lectureSeule}
              className="w-full rounded border px-3 py-2 text-sm disabled:opacity-60"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              placeholder={t(SCOPE_LABELS[scope] ?? scope)}
            />
          </Section>

          {/* Sujet */}
          <Section title={t('email_templates_subject')}>
            <input
              value={subject}
              onChange={(e) => { setSubject(e.target.value); setIsDirty(true) }}
              disabled={lectureSeule}
              className="w-full rounded border px-3 py-2 text-sm disabled:opacity-60"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </Section>

          {/* Body HTML */}
          <Section
            title={t('email_templates_body')}
            action={
              lectureSeule ? undefined : (
                <CopyButton value={bodyHtml} label={t('copy')} labelCopied={t('copied')} />
              )
            }
          >
            <TextArea
              label={t('email_templates_body')}
              isLabelHidden
              value={bodyHtml}
              onChange={(v) => { setBodyHtml(v); setIsDirty(true) }}
              rows={28}
              isReadOnly={lectureSeule}
              style={{ fontFamily: 'Menlo, ui-monospace, monospace', fontSize: 13 }}
            />
          </Section>

          {/* ── Assistant IA ──
              Un prompt prêt à coller dans un agent externe (ChatGPT, Claude,
              Copilot…) pour faire évoluer le gabarit. Il contient le SUJET et
              le CORPS actuels, la liste EXACTE des variables du scope, et la
              syntaxe Handlebars — rien d'autre, et surtout pas de valeurs
              d'exemple : un assistant qui recopierait « CMD-2026-001 »
              produirait un email qui l'affiche sur toutes les commandes.

              La section reste visible en lecture seule : consulter un
              gabarit et demander à un assistant de le réécrire, c'est un
              usage normal de l'écran de consultation. */}
          <Section
            title={t('email_templates_assistant')}
            action={
              <CopyButton
                value={buildEmailTemplatePrompt(scope, name, subject, bodyHtml, variables)}
                label={t('email_templates_assistant_copy')}
                labelCopied={t('copied')}
              />
            }
          >
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {t('email_templates_assistant_hint')}
            </p>
            {variables.length > 0 && (
              <details className="mt-1">
                <summary
                  className="cursor-pointer text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {t('email_templates_assistant_params', { count: variables.length })}
                </summary>
                <ul className="mt-2 flex flex-col gap-1">
                  {variables.map((v) => (
                    <li key={v.name} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                      <code
                        className="rounded border px-1.5 py-0.5 text-xs"
                        style={{
                          fontFamily: 'Menlo, ui-monospace, monospace',
                          backgroundColor: 'var(--color-background-surface)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {v.name}
                      </code>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{v.label}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Section>

          {/* Metadata */}
          {template.updatedAt && (
            <Section title={t('email_templates_updated_at')}>
              <div className="flex flex-col gap-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                <p>{t('email_templates_updated_at')}: {new Date(template.updatedAt).toLocaleString('fr-FR')}</p>
                {template.updatedBy && <p>{t('email_templates_updated_by')}: {template.updatedBy}</p>}
              </div>
            </Section>
          )}
        </div>

        {/* ── Panneau d'aperçu ──
            Même disposition que sur les modèles PDF : une colonne à côté de
            l'éditeur, collée au haut pendant le défilement. Sous `lg`, elle
            recouvre la page (voile, fermeture par le voile ou par Échap). */}
        <div
          className={`fixed inset-0 z-40 justify-end lg:static lg:inset-auto lg:z-auto lg:shrink-0 lg:sticky lg:top-4 ${panelOpen ? 'flex' : 'hidden'}`}
        >
          <div
            className="absolute inset-0 bg-black/40 lg:hidden"
            onClick={() => setPanelOpen(false)}
            aria-hidden="true"
          />
          <aside
            id="email-preview-panel"
            ref={panelRef}
            tabIndex={-1}
            aria-label={t('email_templates_preview')}
            className="relative flex h-full min-h-0 w-[92%] flex-col overflow-hidden rounded-lg border lg:h-[calc(100dvh_-_5.5rem)] lg:w-[520px]"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-card)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <EmailPreviewPanel
              preview={preview}
              enCours={previewEnCours}
              error={previewError}
            />
          </aside>
        </div>
      </div>
    </div>
  )
}
