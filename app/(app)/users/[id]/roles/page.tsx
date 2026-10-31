'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Shield, Plus, Trash2, Globe } from 'lucide-react'
import { Button, useToast } from '@astryxdesign/core'
import { Modal, ModalSection, FieldGrid } from '@/components/ui/modal'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { InlineError } from '@/components/ui/inline-error'
import { FieldError } from '@/components/ui/form-field'
import { useFormErrors } from '@/components/ui/form-field'
import { SelectField } from '@/components/ui/select-field'
import { Spinner } from '@/components/ui/spinner'
import { ConfirmDialog } from '@/components/composite/confirm-dialog'
import { PermissionGate } from '@/components/composite/permission-gate'
import {
  adminUsers,
  adminTenants,
  roles,
  type AdminUser,
  type Tenant,
  type Role,
} from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'

/**
 * LES RÔLES D'UN COMPTE.
 *
 * Deux listes, parce que ce sont deux choses :
 *
 *  · les rôles PAR BOULANGERIE — « ce compte est caissier dans CETTE
 *    boulangerie » ;
 *  · les rôles GLOBAUX — les rôles dont le jeton tire ses permissions, et
 *    qui ne sont attachés à aucune boulangerie. C'est ce qui fait un
 *    administrateur de PLATEFORME : un compte sans boulangerie, mais avec
 *    un rôle global.
 *
 * L'API les range dans deux tables : `user_tenants` et `user_roles`. Les
 * deux listes sont envoyées séparément, pour qu'un retrait de rôle global
 * ne vide pas les affectations par boulangerie, et réciproquement.
 */
export default function UserRolesPage() {
  const params = useParams()
  const userId = params.id as string
  const { t } = useI18n()
  const toast = useToast()
  const formErrors = useFormErrors()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [allRoles, setAllRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showAddGlobal, setShowAddGlobal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<string | null>(null)
  const [removeGlobalTarget, setRemoveGlobalTarget] = useState<string | null>(null)

  const [form, setForm] = useState({ tenantId: '', roleId: '' })
  const [formGlobal, setFormGlobal] = useState({ roleId: '' })

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
    let hasError = false
    if (!form.tenantId) { formErrors.setError('tenantId', t('required')); hasError = true }
    else formErrors.clearError('tenantId')
    if (!form.roleId) { formErrors.setError('roleId', t('required')); hasError = true }
    else formErrors.clearError('roleId')
    if (hasError) return
    setSaving(true)
    try {
      await adminUsers.assignRoles(userId, {
        assignments: [
          ...(user?.tenants ?? []).map((t) => ({ tenant_id: t.tenant_id, role_id: t.role_id })),
          { tenant_id: form.tenantId, role_id: form.roleId },
        ],
      })
      setShowAdd(false)
      setForm({ tenantId: '', roleId: '' })
      load()
      toast({ body: t('user_role_assigned'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveAssignment() {
    if (!removeTarget) return
    setRemoving(removeTarget)
    try {
      const remaining = (user?.tenants ?? [])
        .filter((t) => t.tenant_id !== removeTarget)
        .map((t) => ({ tenant_id: t.tenant_id, role_id: t.role_id }))
      await adminUsers.assignRoles(userId, { assignments: remaining })
      setRemoveTarget(null)
      load()
      toast({ body: t('user_role_removed'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setRemoving(null)
    }
  }

  async function handleAddGlobalRole(e: React.FormEvent) {
    e.preventDefault()
    let hasError = false
    if (!formGlobal.roleId) { formErrors.setError('globalRoleId', t('required')); hasError = true }
    else formErrors.clearError('globalRoleId')
    if (hasError) return
    setSaving(true)
    try {
      const ids = (user?.global_roles ?? []).map((r) => r.role_id)
      if (!ids.includes(formGlobal.roleId)) ids.push(formGlobal.roleId)
      await adminUsers.assignRoles(userId, { global_role_ids: ids })
      setShowAddGlobal(false)
      setFormGlobal({ roleId: '' })
      load()
      toast({ body: t('user_global_role_assigned'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveGlobalRole() {
    if (!removeGlobalTarget) return
    setRemoving(removeGlobalTarget)
    try {
      const remaining = (user?.global_roles ?? [])
        .filter((r) => r.role_id !== removeGlobalTarget)
        .map((r) => r.role_id)
      await adminUsers.assignRoles(userId, { global_role_ids: remaining })
      setRemoveGlobalTarget(null)
      load()
      toast({ body: t('user_global_role_removed'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setRemoving(null)
    }
  }

  const availableTenants = tenants.filter(
    (ten) => !user?.tenants.some((ut) => ut.tenant_id === ten.id),
  )

  const availableGlobalRoles = allRoles.filter(
    (r) => !user?.global_roles.some((gr) => gr.role_id === r.id),
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
      header: t('user_role_column', 'Rôle'),
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
        <PermissionGate permission="USER_WRITE">
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            label={t('user_remove')}
            icon={<Trash2 size={13} />}
            isDisabled={removing === row.tenant_id}
            onClick={() => setRemoveTarget(row.tenant_id)}
          />
        </PermissionGate>
      ),
    },
  ]

  interface GlobalRoleRow {
    role_id: string
    role_code: string
    role_label: string
  }

  const globalRows: GlobalRoleRow[] = (user?.global_roles ?? []).map((r) => ({
    role_id: r.role_id,
    role_code: r.role_code,
    role_label: r.role_label,
  }))

  const globalColumns: Column<GlobalRoleRow>[] = [
    {
      key: 'role_label',
      header: t('user_role_column', 'Rôle'),
      mobile: 'primary',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Globe size={14} style={{ color: 'var(--color-accent)' }} />
          <span style={{ color: 'var(--color-text-primary)' }}>{row.role_label}</span>
        </div>
      ),
    },
    {
      key: 'role_code',
      header: t('user_role_code', 'Code'),
      mobile: 'inline',
      render: (row) => (
        <span
          className="rounded px-1.5 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
            color: 'var(--color-accent)',
          }}
        >
          {row.role_code}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      mobile: 'hidden',
      render: (row) => (
        <PermissionGate permission="USER_WRITE">
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            label={t('user_remove')}
            icon={<Trash2 size={13} />}
            isDisabled={removing === row.role_id}
            onClick={() => setRemoveGlobalTarget(row.role_id)}
          />
        </PermissionGate>
      ),
    },
  ]

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size={8} /></div>
  }

  return (
    <>
      <PageHeader
        title={t('user_roles')}
        action={
          <PermissionGate permission="USER_WRITE">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              label={t('user_roles_assign')}
              onClick={() => setShowAdd(true)}
              isDisabled={availableTenants.length === 0}
            />
          </PermissionGate>
        }
      />

      {fetchError && <InlineError message={fetchError} />}

      {rows.length === 0 ? (
        <EmptyState
          icon={<Shield size={24} />}
          title={t('user_roles_empty')}
          description={t('user_roles_empty_hint')}
        />
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(row) => row.tenant_id} />
      )}

      {/* ── Les rôles GLOBAUX ─────────────────────────────────────────── */}
      <div className="mt-10">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2
              className="truncate text-lg font-bold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('user_global_roles')}
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {t('user_global_roles_hint')}
            </p>
          </div>
          <PermissionGate permission="USER_WRITE">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              label={t('user_global_roles_assign')}
              onClick={() => setShowAddGlobal(true)}
              isDisabled={availableGlobalRoles.length === 0}
            />
          </PermissionGate>
        </div>

        {globalRows.length === 0 ? (
          <EmptyState
            icon={<Globe size={24} />}
            title={t('user_global_roles_empty')}
            description={t('user_global_roles_empty_hint')}
          />
        ) : (
          <DataTable columns={globalColumns} rows={globalRows} rowKey={(row) => row.role_id} />
        )}
      </div>

      {/* Add assignment modal */}
      <Modal
        isOpen={showAdd}
        onOpenChange={(open) => { if (!open) { setShowAdd(false); formErrors.clearAll() } }}
        title={t('user_roles_assign')}
        size="sm"
      >
        <form onSubmit={handleAddAssignment} className="space-y-5">
          <ModalSection title={t('user_roles_assign', 'Sélection')}>
            <FieldGrid columns={1}>
              <SelectField
                label={t('tenants')}
                value={form.tenantId}
                onChange={(v) => { setForm((f) => ({ ...f, tenantId: v })); formErrors.clearError('tenantId') }}
                options={[{ value: '', label: t('user_select_tenant') }, ...availableTenants.map((ten) => ({ value: ten.id, label: ten.nom }))]}
                placeholder={t('user_select_tenant')}
              />
              <FieldError message={formErrors.errors.tenantId} />
              <SelectField
                label={t('user_role_column', 'Rôle')}
                value={form.roleId}
                onChange={(v) => { setForm((f) => ({ ...f, roleId: v })); formErrors.clearError('roleId') }}
                options={[{ value: '', label: t('user_role_select') }, ...allRoles.map((r) => ({ value: r.id, label: r.label }))]}
                placeholder={t('user_role_select')}
              />
              <FieldError message={formErrors.errors.roleId} />
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
              label={saving ? t('saving') : t('user_assign')}
              variant="primary"
              type="submit"
              isLoading={saving}
              className="flex-1"
            />
          </div>
        </form>
      </Modal>

      {/* Add global role modal */}
      <Modal
        isOpen={showAddGlobal}
        onOpenChange={(open) => { if (!open) { setShowAddGlobal(false); formErrors.clearAll() } }}
        title={t('user_global_roles_assign')}
        size="sm"
      >
        <form onSubmit={handleAddGlobalRole} className="space-y-5">
          <ModalSection title={t('user_global_roles_assign', 'Sélection')}>
            <FieldGrid columns={1}>
              <SelectField
                label={t('user_role_column', 'Rôle')}
                value={formGlobal.roleId}
                onChange={(v) => { setFormGlobal((f) => ({ ...f, roleId: v })); formErrors.clearError('globalRoleId') }}
                options={[{ value: '', label: t('user_role_select') }, ...availableGlobalRoles.map((r) => ({ value: r.id, label: r.label }))]}
                placeholder={t('user_role_select')}
              />
              <FieldError message={formErrors.errors.globalRoleId} />
            </FieldGrid>
          </ModalSection>

          <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <Button
              label={t('cancel')}
              variant="secondary"
              onClick={() => setShowAddGlobal(false)}
              className="flex-1"
            />
            <Button
              label={saving ? t('saving') : t('user_assign')}
              variant="primary"
              type="submit"
              isLoading={saving}
              className="flex-1"
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={removeTarget !== null}
        onOpenChange={(open) => { if (!open) setRemoveTarget(null) }}
        title={t('user_role_remove_confirm')}
        description={t('user_role_remove_description')}
        confirmLabel={t('delete')}
        confirmVariant="destructive"
        onConfirm={handleRemoveAssignment}
        isLoading={removing !== null}
      />

      <ConfirmDialog
        isOpen={removeGlobalTarget !== null}
        onOpenChange={(open) => { if (!open) setRemoveGlobalTarget(null) }}
        title={t('user_global_role_remove_confirm')}
        description={t('user_global_role_remove_description')}
        confirmLabel={t('delete')}
        confirmVariant="destructive"
        onConfirm={handleRemoveGlobalRole}
        isLoading={removing !== null}
      />
    </>
  )
}
