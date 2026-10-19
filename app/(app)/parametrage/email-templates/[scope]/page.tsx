'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Mail, Pencil, CheckCircle } from 'lucide-react'
import { Button, Spinner, TextArea, useToast } from '@astryxdesign/core'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import { PageHeader } from '@/components/layout/page-header'
import { InlineError } from '@/components/ui/inline-error'
import { CopyButton } from '@/components/ui/copy-button'
import { Section } from '@/components/ui/section'
import { useI18n } from '@/lib/i18n'
import {
  getEmailTemplateAdmin,
  upsertEmailTemplateAdmin,
  type EmailTemplate,
} from '@/lib/email-client'

const SCOPE_LABELS: Record<string, string> = {
  commande_envoyee: 'email_scope_commande_envoyee',
  facture_impayee: 'email_scope_facture_impayee',
  reception_validated: 'email_scope_reception_validated',
  stock_bas: 'email_scope_stock_bas',
  abonnement_renouvele: 'email_scope_abonnement_renouvele',
  notif_generic: 'email_scope_notif_generic',
}

export default function EmailTemplateEditorPage() {
  const { t } = useI18n()
  const toast = useToast()
  const params = useParams<{ scope: string }>()
  const scope = params.scope

  const [template, setTemplate] = useState<{
    exists: boolean
    name?: string
    subject?: string
    bodyHtml?: string
    actif?: boolean
    variables?: Array<{ name: string; label: string; labelEn: string; required?: boolean; type?: string }>
    updatedAt?: string
    updatedBy?: string | null
  } | null>(null)
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

  useEffect(() => {
    if (!scope) return
    setLoadingData(true)
    setDataError('')
    getEmailTemplateAdmin(scope)
      .then((tpl) => {
        setTemplate(tpl)
        if (tpl.exists) {
          setName(tpl.name ?? '')
          setSubject(tpl.subject ?? '')
          setBodyHtml(tpl.bodyHtml ?? '')
          setActif(tpl.actif ?? false)
        }
      })
      .catch((e: unknown) => {
        setDataError(e instanceof Error ? e.message : t('error'))
      })
      .finally(() => {
        setLoadingData(false)
      })
  }, [scope, t])

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

  const variables = template.variables ?? []

  return (
    <>
      <PageHeader
        title={name || t(SCOPE_LABELS[scope] ?? scope) || scope}
        backHref="/parametrage/email-templates"
        icon={<Mail size={20} style={{ color: 'var(--color-text-primary)' }} />}
        action={
          <div className="flex items-center gap-2">
            {saved && (
              <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--color-success, green)' }}>
                <CheckCircle size={14} />
                {t('saved')}
              </span>
            )}
            <Button
              label={saving ? t('loading') : t('save')}
              variant="primary"
              isLoading={saving}
              isDisabled={!isDirty}
              onClick={handleSave}
            />
          </div>
        }
      />

      {saveError && <InlineError message={saveError} />}

      <div className="flex flex-col gap-6">
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
            className="w-full rounded border px-3 py-2 text-sm"
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
            className="w-full rounded border px-3 py-2 text-sm"
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
          action={<CopyButton value={bodyHtml} label={t('copy')} labelCopied={t('copied')} />}
        >
          <TextArea
            label={t('email_templates_body')}
            value={bodyHtml}
            onChange={(v) => { setBodyHtml(v); setIsDirty(true) }}
            rows={28}
            style={{ fontFamily: 'Menlo, ui-monospace, monospace', fontSize: 13 }}
          />
        </Section>

        {/* Actif */}
        <Section title="">
          <CheckboxInput
            label={t('email_templates_active')}
            value={actif}
            onChange={(checked) => { setActif(checked); setIsDirty(true) }}
          />
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
    </>
  )
}
