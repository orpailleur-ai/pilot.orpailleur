'use client'

import { Fragment, useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { Button, useToast } from '@astryxdesign/core'
import { Spinner } from '@/components/ui/spinner'
import { PageHeader } from '@/components/layout/page-header'
import { InlineError } from '@/components/ui/inline-error'
import { ConfirmDialog } from '@/components/composite/confirm-dialog'
import { PermissionGate } from '@/components/composite/permission-gate'
import { roles, type Role, type Permission } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'

const MODULE_ORDER = [
  'ADMIN', 'TENANT', 'USER',
  'FOURNISSEUR', 'FOURNISSEURS',
  'MERCURIALE',
  'RECETTE', 'RECETTES',
  'CMUP',
  'COMMANDE', 'COMMANDES',
  'FACTURE', 'FACTURES',
  'ATELIER', 'ALERTES', 'BAREME_ENERGIE',
  'AI',
]

export default function RolePermissionsPage() {
  const params = useParams()
  const router = useRouter()
  const roleId = params.id as string
  const { t } = useI18n()
  const toast = useToast()
  const [role, setRole] = useState<Role | null>(null)
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    load()
  }, [roleId])

  async function load() {
    setLoading(true)
    setFetchError(null)
    try {
      const [roleData, permsData] = await Promise.all([
        roles.get(roleId),
        roles.getPermissions(),
      ])
      setRole(roleData)
      setAllPermissions(permsData)
      setSelected(new Set((roleData.permissions ?? []).map((p: Permission) => p.id)))
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : t('error'))
    } finally {
      setLoading(false)
    }
  }

  function togglePermission(permId: string) {
    if (role?.isSystem) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(permId)) next.delete(permId)
      else next.add(permId)
      return next
    })
    setDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await roles.update(roleId, {
        permission_ids: Array.from(selected),
      })
      setDirty(false)
      load()
      toast({ body: t('permissions_updated'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await roles.delete(roleId)
      router.push('/roles')
      toast({ body: t('role_deleted', 'Rôle supprimé'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>()
    for (const perm of allPermissions) {
      const existing = map.get(perm.module) ?? []
      map.set(perm.module, [...existing, perm])
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      const ai = MODULE_ORDER.indexOf(a)
      const bi = MODULE_ORDER.indexOf(b)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
  }, [allPermissions])

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size={8} /></div>
  }

  if (fetchError || !role) {
    return <InlineError message={fetchError ?? t('error')} />
  }

  return (
    <>
      <PageHeader
        title={role.label}
        icon={<Lock size={20} style={{ color: 'var(--color-text-primary)' }} />}
      />

      {role.isSystem && (
        <div
          className="flex items-center gap-3 rounded-lg border p-4 text-sm"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-warning) 8%, transparent)',
            borderColor: 'color-mix(in srgb, var(--color-warning) 25%, var(--color-border))',
            color: 'var(--color-text-secondary)',
          }}
        >
          <Lock size={14} style={{ color: 'var(--color-warning-text)' }} />
          {t('role_system_locked')}
        </div>
      )}

      <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--color-background-surface)' }}>
              <th
                className="border-b px-4 py-3 text-left font-semibold"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                {t('role_permission_module', 'Module')}
              </th>
              <th
                className="border-b px-4 py-3 text-left font-semibold"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                {t('role_permission_label', 'Permission')}
              </th>
              <th
                className="border-b px-4 py-3 text-center font-semibold"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                {t('role_permission_granted', 'Accordée')}
              </th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(([module, perms]) => (
              <Fragment key={module}>
                <tr>
                  <td
                    colSpan={3}
                    className="border-b px-4 py-2 font-semibold text-xs uppercase tracking-wide"
                    style={{
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'color-mix(in srgb, var(--color-background-surface) 60%, transparent)',
                      color: 'var(--color-accent)',
                    }}
                  >
                    {t(`module_${module}` as any, module.replace(/_/g, ' '))}
                  </td>
                </tr>
                {perms.map((perm) => {
                  const granted = selected.has(perm.id)
                  return (
                    <tr
                      key={perm.id}
                      className="transition-colors"
                      style={{
                        backgroundColor: granted
                          ? 'color-mix(in srgb, var(--color-success) 4%, transparent)'
                          : 'transparent',
                      }}
                    >
                      <td className="px-4 py-2.5" />
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <span style={{ color: 'var(--color-text-primary)' }}>
                            {perm.label}
                          </span>
                          <span
                            className="font-mono text-xs"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            {perm.code}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={granted}
                          disabled={role.isSystem}
                          onChange={() => togglePermission(perm.id)}
                          className="h-4 w-4 rounded focus-visible:outline-2 focus-visible:outline-offset-2"
                          style={{ accentColor: 'var(--color-accent)', outline: 'none' }}
                        />
                      </td>
                    </tr>
                  )
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <PermissionGate permission="USER_WRITE">
          {!role.isSystem && (
            <Button
              variant="destructive"
              label={t('role_delete')}
              onClick={() => setShowDelete(true)}
            />
          )}
        </PermissionGate>
        {!role.isSystem && dirty && (
          <PermissionGate permission="USER_WRITE">
            <Button
              variant="primary"
              label={saving ? t('saving') : t('role_save_permissions')}
              onClick={handleSave}
              isLoading={saving}
            />
          </PermissionGate>
        )}
      </div>

      <ConfirmDialog
        isOpen={showDelete}
        onOpenChange={setShowDelete}
        title={t('role_delete_confirm')}
        description={t('role_delete_description')}
        confirmLabel={t('delete')}
        confirmVariant="destructive"
        onConfirm={handleDelete}
        isLoading={deleting}
      />
    </>
  )
}
