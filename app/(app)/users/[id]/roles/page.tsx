'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Shield, Plus, Trash2 } from 'lucide-react'
import { Button, useToast } from '@astryxdesign/core'
import { Modal, ModalSection, FieldGrid } from '@/components/ui/modal'
import { TextInput } from '@astryxdesign/core'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { Spinner } from '@/components/ui/spinner'
import { ConfirmDialog } from '@/components/composite/confirm-dialog'
import {
  adminUsers,
  adminTenants,
  roles,
  type AdminUser,
  type Tenant,
  type Role,
  apiClient,
} from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'

export default function UserRolesPage() {
  const params = useParams()
  const userId = params.id as string
  const { t } = useI18n()
  const toast = useToast()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [allRoles, setAllRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  const [form, setForm] = useState({ tenantId: '', roleId: '' })

  useEffect(() => {
    load()
  }, [userId])

  async function load() {
    setLoading(true)
    setFetchError(null)
    try {
      const [userData, tenantsData, rolesData] = await Promise.all([
        adminUsers.get(userId),
        adminTenants.list(),
        roles.list(),
      ])
      setUser(userData)
      setTenants(tenantsData)
      setAllRoles(rolesData)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : t('error'))
    } finally {
      setLoading(false)
    }
  }

  async function handleAddAssignment(e: React.FormEvent) {
    e.preventDefault()
    if (!form.tenantId || !form.roleId) return
    setSaving(true)
    try {
      await apiClient.post(`/admin/users/${userId}/roles`, {
        assignments: [
          ...user!.tenants.map((t) => ({ tenant_id: t.tenant_id, role_id: t.role_id })),
          { tenant_id: form.tenantId, role_id: form.roleId },
        ],
      })
      setShowAdd(false)
      setForm({ tenantId: '', roleId: '' })
      load()
      toast({ body: 'Rôle assigné', type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveAssignment(tenantId: string) {
    setRemoving(tenantId)
    try {
      const remaining = user!.tenants
        .filter((t) => t.tenant_id !== tenantId)
        .map((t) => ({ tenant_id: t.tenant_id, role_id: t.role_id }))
      await apiClient.post(`/admin/users/${userId}/roles`, {
        assignments: remaining,
      })
      load()
      toast({ body: 'Rôle retiré', type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setRemoving(null)
    }
  }

  const availableTenants = tenants.filter(
    (ten) => !user?.tenants.some((ut) => ut.tenant_id === ten.id),
  )

  interface AssignmentRow {
    tenant_id: string
    tenant_nom: string
    role_id: string
    role_label: string
  }

  const rows: AssignmentRow[] = (user?.tenants ?? []).map((t) => {
    const tenant = tenants.find((ten) => ten.id === t.tenant_id)
    const role = allRoles.find((r) => r.id === t.role_id)
    return {
      tenant_id: t.tenant_id,
      tenant_nom: tenant?.nom ?? t.tenant_id.slice(0, 8),
      role_id: t.role_id,
      role_label: role?.label ?? t.role_label,
    }
  })

  const columns: Column<AssignmentRow>[] = [
    {
      key: 'tenant_nom',
      header: t('tenants'),
      mobile: 'primary',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Shield size={14} style={{ color: 'var(--color-accent)' }} />
          <span style={{ color: 'var(--color-text-primary)' }}>{row.tenant_nom}</span>
        </div>
      ),
    },
    {
      key: 'role_label',
      header: 'Rôle',
      mobile: 'inline',
      render: (row) => (
        <span
          className="rounded px-1.5 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
            color: 'var(--color-accent)',
          }}
        >
          {row.role_label}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      mobile: 'hidden',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          label="Retirer"
          icon={<Trash2 size={13} />}
          isDisabled={removing === row.tenant_id}
          onClick={() => handleRemoveAssignment(row.tenant_id)}
        />
      ),
    },
  ]

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size={8} /></div>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          label="Assigner un rôle"
          onClick={() => setShowAdd(true)}
          isDisabled={availableTenants.length === 0}
        />
      </div>

      {fetchError && <InlineError message={fetchError} />}

      {rows.length === 0 ? (
        <EmptyState
          icon={<Shield size={24} />}
          title="Aucun rôle assigné"
          description="Assignez ce utilisateur à un tenant avec un rôle."
        />
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(row) => row.tenant_id} />
      )}

      {/* Add assignment modal */}
      <Modal
        isOpen={showAdd}
        onOpenChange={(open) => { if (!open) setShowAdd(false) }}
        title="Assigner un rôle"
        size="sm"
      >
        <form onSubmit={handleAddAssignment} className="space-y-5">
          <ModalSection title="Sélection">
            <FieldGrid columns={1}>
              <div>
                <label
                  className="mb-1 block text-xs font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Tenant
                </label>
                <select
                  className="h-9 w-full rounded-md border px-2 text-sm"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                  }}
                  value={form.tenantId}
                  onChange={(e) => setForm((f) => ({ ...f, tenantId: e.target.value }))}
                  required
                >
                  <option value="">Sélectionner un tenant…</option>
                  {availableTenants.map((ten) => (
                    <option key={ten.id} value={ten.id}>{ten.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="mb-1 block text-xs font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Rôle
                </label>
                <select
                  className="h-9 w-full rounded-md border px-2 text-sm"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                  }}
                  value={form.roleId}
                  onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}
                  required
                >
                  <option value="">Sélectionner un rôle…</option>
                  {allRoles.map((r) => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>
            </FieldGrid>
          </ModalSection>

          <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <Button
              label={t('cancel')}
              variant="secondary"
              onClick={() => setShowAdd(false)}
              className="flex-1"
            />
            <Button
              label={saving ? t('saving') : 'Assigner'}
              variant="primary"
              type="submit"
              isLoading={saving}
              className="flex-1"
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
