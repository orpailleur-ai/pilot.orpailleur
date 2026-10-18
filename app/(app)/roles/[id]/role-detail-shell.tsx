'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Shield, Lock } from 'lucide-react'
import { Button } from '@astryxdesign/core'
import { Spinner } from '@/components/ui/spinner'
import { InlineError } from '@/components/ui/inline-error'
import { useI18n } from '@/lib/i18n'
import { roles, type Role } from '@/lib/api-client'
import { TabsNav, type TabItem } from '@/components/composite/tabs-nav'
import { EntityDetailHeader } from '@/components/composite/entity-detail-header'

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
    { key: 'permissions', label: t('permissions_tab'), href: `/roles/${roleId}` },
  ]

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner size={8} /></div>
  }

  if (error || !role) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <InlineError message={error ?? t('role_not_found')} />
        <Button variant="secondary" label={t('back')} onClick={() => router.push('/roles')} />
      </div>
    )
  }

  const statusBadge = role.isSystem ? (
    <span
      className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-text-secondary) 10%, transparent)',
        color: 'var(--color-text-secondary)',
      }}
    >
      <Lock size={10} />
      {t('system_badge')}
    </span>
  ) : undefined

  return (
    <div className="flex flex-col gap-5">
      <EntityDetailHeader
        icon={<Shield size={20} style={{ color: 'var(--color-accent)' }} />}
        title={role.label}
        subtitle={
          <span className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {role.code}
          </span>
        }
        statusBadge={statusBadge}
        backHref="/roles"
      />

      <TabsNav tabs={tabs} />
      {children}
    </div>
  )
}
