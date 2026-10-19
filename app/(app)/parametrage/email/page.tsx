'use client'

import { useCallback, useEffect, useState } from 'react'
import { Mail, Eye, EyeOff, RefreshCw, Send, CheckCircle } from 'lucide-react'
import { Button, Spinner, TextInput, useToast } from '@astryxdesign/core'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import { PageHeader } from '@/components/layout/page-header'
import { InlineError } from '@/components/ui/inline-error'
import { Section } from '@/components/ui/section'
import { useI18n } from '@/lib/i18n'
import {
  getSmtpConfigAdmin,
  upsertSmtpConfigAdmin,
  testSmtpConfig,
  type SmtpConfig,
} from '@/lib/email-client'

export default function EmailSmtpPage() {
  const { t } = useI18n()
  const toast = useToast()

  const [config, setConfig] = useState<SmtpConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Form state
  const [host, setHost] = useState('')
  const [port, setPort] = useState(587)
  const [secure, setSecure] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fromEmail, setFromEmail] = useState('')
  const [fromName, setFromName] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [timeoutMs, setTimeoutMs] = useState(10000)
  const [actif, setActif] = useState(true)
  const [isDirty, setIsDirty] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const charger = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const cfg = await getSmtpConfigAdmin()
      setConfig(cfg)
      if (cfg.exists) {
        setHost(cfg.host ?? '')
        setPort(cfg.port ?? 587)
        setSecure(cfg.secure ?? false)
        setUsername(cfg.username ?? '')
        setPassword('')
        setFromEmail(cfg.fromEmail ?? '')
        setFromName(cfg.fromName ?? '')
        setReplyTo(cfg.replyTo ?? '')
        setTimeoutMs(cfg.timeoutMs ?? 10000)
        setActif(cfg.actif ?? true)
      }
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : t('error'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { void charger() }, [charger])

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    setTestResult(null)
    try {
      await upsertSmtpConfigAdmin({
        host: host.trim(),
        port,
        secure,
        username: username.trim() || null,
        password: password || undefined,
        fromEmail: fromEmail.trim(),
        fromName: fromName.trim() || null,
        replyTo: replyTo.trim() || null,
        timeoutMs,
      })
      setIsDirty(false)
      setPassword('')
      void charger()
      toast({ body: t('email_smtp_saved'), type: 'info' })
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : t('error'))
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testSmtpConfig(fromEmail.trim())
      if (result.ok) {
        setTestResult({ ok: true, message: t('email_smtp_test_ok') })
        toast({ body: t('email_smtp_test_sent'), type: 'info' })
      } else {
        setTestResult({ ok: false, message: result.error ?? t('error') })
        toast({ body: result.error ?? t('error'), type: 'error' })
      }
    } catch (e: unknown) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : t('error') })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="md" />
      </div>
    )
  }

  if (loadError) {
    return (
      <>
        <PageHeader title={t('email_smtp_title')} icon={<Mail size={20} />} />
        <InlineError message={loadError} />
      </>
    )
  }

  const canSave = host.trim() && fromEmail.trim() && isDirty

  return (
    <>
      <PageHeader
        title={t('email_smtp_title')}
        icon={<Mail size={20} style={{ color: 'var(--color-text-primary)' }} />}
        action={
          <div className="flex items-center gap-2">
            <Button
              label={testing ? t('loading') : t('email_smtp_test')}
              variant="secondary"
              icon={testing ? <Spinner size="sm" /> : <Send size={15} />}
              isLoading={testing}
              isDisabled={!fromEmail.trim() || testing}
              onClick={handleTest}
            />
            <Button
              label={saving ? t('loading') : t('save')}
              variant="primary"
              isLoading={saving}
              isDisabled={!canSave}
              onClick={handleSave}
            />
          </div>
        }
      />

      {saveError && <InlineError message={saveError} />}
      {testResult && (
        <div
          className="mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: testResult.ok ? 'var(--color-success, green)' : 'var(--color-error, red)',
            backgroundColor: testResult.ok ? 'color-mix(in srgb, var(--color-success, green) 10%, transparent)' : 'color-mix(in srgb, var(--color-error, red) 10%, transparent)',
            color: testResult.ok ? 'var(--color-success, green)' : 'var(--color-error, red)',
          }}
        >
          {testResult.ok ? <CheckCircle size={16} /> : null}
          <span>{testResult.message}</span>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {/* Serveur */}
        <Section title={t('email_smtp_section_server')}>
          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label={t('email_smtp_host')}
              value={host}
              onChange={(v) => { setHost(v); setIsDirty(true) }}
              placeholder="smtp.example.com"
            />
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('email_smtp_port')}
              </label>
              <input
                type="number"
                value={String(port)}
                onChange={(e) => { setPort(Number(e.target.value)); setIsDirty(true) }}
                className="rounded border px-3 py-2 text-sm"
                style={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
          </div>
          <div className="mt-3">
            <CheckboxInput
              label={t('email_smtp_secure')}
              value={secure}
              onChange={(checked) => { setSecure(checked); setIsDirty(true) }}
            />
          </div>
        </Section>

        {/* Auth */}
        <Section title={t('email_smtp_section_auth')}>
          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label={t('email_smtp_username')}
              value={username}
              onChange={(v) => { setUsername(v); setIsDirty(true) }}
              placeholder={t('email_smtp_optional')}
            />
            <div className="relative">
              <TextInput
                label={t('email_smtp_password')}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(v) => { setPassword(v); setIsDirty(true) }}
                placeholder={config?.exists ? t('email_smtp_password_unchanged') : ''}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-[2.1rem] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </Section>

        {/* Expediteur */}
        <Section title={t('email_smtp_section_sender')}>
          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label={t('email_smtp_from_email')}
              type="email"
              value={fromEmail}
              onChange={(v) => { setFromEmail(v); setIsDirty(true) }}
              placeholder="noreply@orpailleur.fr"
            />
            <TextInput
              label={t('email_smtp_from_name')}
              value={fromName}
              onChange={(v) => { setFromName(v); setIsDirty(true) }}
              placeholder="Orpailleur"
            />
          </div>
          <div className="mt-3">
            <TextInput
              label={t('email_smtp_reply_to')}
              type="email"
              value={replyTo}
              onChange={(v) => { setReplyTo(v); setIsDirty(true) }}
              placeholder={t('email_smtp_optional')}
            />
          </div>
        </Section>

        {/* Options */}
        <Section title={t('email_smtp_section_options')}>
          <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {t('email_smtp_timeout')}
            </label>
            <input
              type="number"
              value={String(timeoutMs)}
              onChange={(e) => { setTimeoutMs(Number(e.target.value)); setIsDirty(true) }}
              className="rounded border px-3 py-2 text-sm"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
          <div className="mt-3">
            <CheckboxInput
              label={t('email_smtp_actif')}
              value={actif}
              onChange={(checked) => { setActif(checked); setIsDirty(true) }}
            />
          </div>
        </Section>
      </div>
    </>
  )
}
