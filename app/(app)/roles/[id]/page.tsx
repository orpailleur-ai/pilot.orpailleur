'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Lock } from 'lucide-react'
import { Button, useToast } from '@astryxdesign/core'
import { Spinner } from '@/components/ui/spinner'
import { InlineError } from '@/components/ui/inline-error'
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
      toast({ body: 'Permissions mises à jour', type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setSaving(false)
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
    return <InlineError message={fetchError ?? 'Erreur'} />
  }

  return (
    <div className="flex flex-col gap-5">
      {role.isSystem && (
        <div
          className="flex items-center gap-3 rounded-lg border p-4 text-sm"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-warning) 8%, transparent)',
            borderColor: 'color-mix(in srgb, var(--color-warning) 25%, var(--color-border))',
            color: 'var(--color-text-secondary)',
          }}
        >
          <Lock size={14} style={{ color: 'var(--color-warning)' }} />
          Les rôles système ne peuvent pas être modifiés.
        </div>
      )}

      <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--color-surface)' }}>
              <th
                className="border-b px-4 py-3 text-left font-semibold"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                Module
              </th>
              <th
                className="border-b px-4 py-3 text-left font-semibold"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                Permission
              </th>
              <th
                className="border-b px-4 py-3 text-center font-semibold"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                Accordée
              </th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(([module, perms]) => (
              <>
                <tr key={`header-${module}`}>
                  <td
                    colSpan={3}
                    className="border-b px-4 py-2 font-semibold text-xs uppercase tracking-wide"
                    style={{
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'color-mix(in srgb, var(--color-surface) 60%, transparent)',
                      color: 'var(--color-accent)',
                    }}
                  >
                    {module.replace(/_/g, ' ')}
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
                          className="h-4 w-4 rounded"
                          style={{ accentColor: 'var(--color-accent)' }}
                        />
                      </td>
                    </tr>
                  )
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {!role.isSystem && dirty && (
        <div className="flex justify-end">
          <Button
            variant="primary"
            label={saving ? 'Enregistrement…' : 'Enregistrer les permissions'}
            onClick={handleSave}
            isLoading={saving}
          />
        </div>
      )}
    </div>
  )
}
