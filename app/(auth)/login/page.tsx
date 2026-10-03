'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TextInput, Button, useToast } from '@astryxdesign/core'
import { auth, setToken } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'
import { InlineError } from '@/components/ui/inline-error'

export default function LoginPage() {
  const router = useRouter()
  const { t } = useI18n()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const tokens = await auth.login(email, password)
      setToken(tokens.accessToken)
      router.push('/tenants')
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('error')
      setError(msg)
      toast({ body: msg, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--color-background-body)' }}
    >
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl mb-3"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
          >
            <span className="text-xl font-bold">O</span>
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Orpailleur
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Pilot — Administration
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-8"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border-emphasized)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <h2
            className="text-base font-semibold mb-6"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {t('login')}
          </h2>

          {error && <div className="mb-4"><InlineError message={error} /></div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <TextInput
              label={t('email')}
              type="email"
              value={email}
              onChange={(v) => setEmail(v)}
              placeholder="admin@orpailleur.com"
              width="100%"
              isRequired
            />

            <TextInput
              label={t('password')}
              type="password"
              value={password}
              onChange={(v) => setPassword(v)}
              placeholder="••••••••"
              width="100%"
              isRequired
            />

            <Button
              label={loading ? t('loading') : t('login')}
              variant="primary"
              isLoading={loading}
              width="100%"
              className="mt-2"
              type="submit"
            />
          </form>
        </div>

        <p
          className="text-center text-xs mt-6"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Accès réservé aux administrateurs Orpailleur
        </p>
      </div>
    </div>
  )
}
