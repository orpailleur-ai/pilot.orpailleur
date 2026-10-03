'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, User, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@astryxdesign/core'
import { Spinner } from '@/components/ui/spinner'
import { InlineError } from '@/components/ui/inline-error'
import { useI18n } from '@/lib/i18n'
import { TabsNav, type TabItem } from '@/components/composite/tabs-nav'
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
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setIsLoading(false))
  }, [userId])

  const tabs: TabItem[] = [
    { key: 'profile', label: 'Profil', href: `/users/${userId}` },
    { key: 'roles', label: 'Rôles', href: `/users/${userId}/roles` },
    { key: 'sites', label: 'Sites', href: `/users/${userId}/sites` },
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
        <InlineError message={error ?? 'Utilisateur introuvable'} />
        <Button variant="secondary" label={t('back')} onClick={() => router.push('/users')} />
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
            onClick={() => router.push('/users')}
          />
          <div
            className="flex items-center justify-center rounded-lg"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
              width: 44,
              height: 44,
            }}
          >
            <User size={20} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {[user.prenom, user.nom].filter(Boolean).join(' ') || user.email}
              </h1>
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
            </div>
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {user.email}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            label={user.actif ? t('deactivate') : t('activate')}
            onClick={async () => {
              await adminUsers.update(userId, { actif: !user.actif })
              setUser({ ...user, actif: !user.actif })
            }}
          />
        </div>
      </div>

      <TabsNav tabs={tabs} />
      {children}
    </div>
  )
}
