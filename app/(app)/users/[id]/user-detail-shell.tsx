'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { User, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@astryxdesign/core'
import { Spinner } from '@/components/ui/spinner'
import { InlineError } from '@/components/ui/inline-error'
import { useI18n } from '@/lib/i18n'
import { TabsNav, type TabItem } from '@/components/composite/tabs-nav'
import { EntityDetailHeader } from '@/components/composite/entity-detail-header'
import { adminUsers, type AdminUser } from '@/lib/api-client'

export function UserDetailShell({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  const { t } = useI18n()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminUsers.get(userId)
      .then(setUser)
      .catch((err) => setError(err instanceof Error ? err.message : t('error')))
      .finally(() => setIsLoading(false))
  }, [userId])

  const tabs: TabItem[] = [
    { key: 'profile', label: t('profile_tab'), href: `/users/${userId}` },
    { key: 'roles',   label: t('roles_tab'),   href: `/users/${userId}/roles` },
    { key: 'sites',   label: t('sites_tab'),   href: `/users/${userId}/sites` },
  ]

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={8} />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <InlineError message={error ?? t('user_not_found')} />
        <Button variant="secondary" label={t('back')} onClick={() => router.push('/users')} />
      </div>
    )
  }

  const statusBadge = (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={
        user.actif
          ? { backgroundColor: 'color-mix(in srgb, var(--color-success) 12%, transparent)', color: 'var(--color-success)' }
          : { backgroundColor: 'color-mix(in srgb, var(--color-text-secondary) 12%, transparent)', color: 'var(--color-text-secondary)' }
      }
    >
      {user.actif ? <CheckCircle size={10} /> : <XCircle size={10} />}
      {user.actif ? t('active') : t('inactive')}
    </span>
  )

  return (
    <div className="flex flex-col gap-5">
      <EntityDetailHeader
        icon={<User size={20} style={{ color: 'var(--color-accent)' }} />}
        title={[user.prenom, user.nom].filter(Boolean).join(' ') || user.email}
        subtitle={user.email}
        statusBadge={statusBadge}
        backHref="/users"
        actions={
          <Button
            variant="secondary"
            size="sm"
            label={user.actif ? t('deactivate') : t('activate')}
            onClick={async () => {
              await adminUsers.update(userId, { actif: !user.actif })
              setUser({ ...user, actif: !user.actif })
            }}
          />
        }
      />

      <TabsNav tabs={tabs} />
      {children}
    </div>
  )
}
