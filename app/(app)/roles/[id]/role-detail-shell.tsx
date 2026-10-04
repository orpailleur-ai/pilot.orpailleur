'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Shield, ArrowLeft, Lock } from 'lucide-react'
import { Button } from '@astryxdesign/core'
import { Spinner } from '@/components/ui/spinner'
import { InlineError } from '@/components/ui/inline-error'
import { useI18n } from '@/lib/i18n'
import { roles, type Role } from '@/lib/api-client'
import { TabsNav, type TabItem } from '@/components/composite/tabs-nav'

export function RoleDetailShell({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const router = useRouter()
  const roleId = params.id as string
  const { t } = useI18n()
  const [role, setRole] = useState<Role | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    roles.get(roleId)
      .then(setRole)
      .catch((err) => setError(err instanceof Error ? err.message : t('error')))
      .finally(() => setIsLoading(false))
  }, [roleId])

  const tabs: TabItem[] = [
    { key: 'permissions', label: 'Permissions', href: `/roles/${roleId}` },
  ]

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner size={8} /></div>
  }

  if (error || !role) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <InlineError message={error ?? 'Rôle introuvable'} />
        <Button variant="secondary" label={t('back')} onClick={() => router.push('/roles')} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div
        className="flex items-center justify-between rounded-lg border p-5"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            label={t('back')}
            icon={<ArrowLeft size={16} />}
            onClick={() => router.push('/roles')}
          />
          <div
            className="flex items-center justify-center rounded-lg"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
              width: 44,
              height: 44,
            }}
          >
            <Shield size={20} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {role.label}
              </h1>
              {role.isSystem && (
                <span
                  className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-text-secondary) 10%, transparent)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <Lock size={10} /> Système
                </span>
              )}
            </div>
            <span
              className="font-mono text-xs"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {role.code}
            </span>
          </div>
        </div>
      </div>

      <TabsNav tabs={tabs} />
      {children}
    </div>
  )
}
