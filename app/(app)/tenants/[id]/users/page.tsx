'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Users, CheckCircle, XCircle } from 'lucide-react'
import { Button, useToast } from '@astryxdesign/core'
import { TextInput } from '@astryxdesign/core'
import { Modal, ModalSection, FieldGrid } from '@/components/ui/modal'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { Spinner } from '@/components/ui/spinner'
import { PermissionGate } from '@/components/composite/permission-gate'
import {
  adminUsers,
  adminTenants,
  roles,
  apiClient,
  type AdminUser,
  type Role,
} from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'

export default function TenantUsersPage() {
  const params = useParams()
  const tenantId = params.id as string
  const { t } = useI18n()
  const toast = useToast()
  const [tenantUsers, setTenantUsers] = useState<AdminUser[]>([])
  const [roleList, setRoleList] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    email: '',
    password: '',
    prenom: '',
    nom: '',
  })

  useEffect(() => {
    load()
  }, [tenantId])

  async function load() {
    setLoading(true)
    setFetchError(null)
    try {
      const [users, rolesData] = await Promise.all([
        adminTenants.getTenantUsers(tenantId),
        roles.list(),
      ])
      setTenantUsers(users)
      setRoleList(rolesData)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : t('error'))
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email.trim() || !form.password.trim()) return
    setSaving(true)
    try {
      const newUser = await adminUsers.create({
        email: form.email,
        password: form.password,
        prenom: form.prenom || undefined,
        nom: form.nom || undefined,
      })
      // Assign to tenant with default role
      const defaultRole = roleList.find((r) => r.code === 'user') ?? roleList[0]
      if (defaultRole) {
        await apiClient.post(`/admin/users/${newUser.id}/roles`, {
          assignments: [{ tenant_id: tenantId, role_id: defaultRole.id }],
        })
      }
      setShowCreate(false)
      setForm({ email: '', password: '', prenom: '', nom: '' })
      load()
      toast({ body: t('user_created'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const columns: Column<AdminUser>[] = [
    {
      key: 'email',
      header: 'Email',
      mobile: 'primary',
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span style={{ color: 'var(--color-text-primary)' }}>{row.email}</span>
          {[row.prenom, row.nom].filter(Boolean).length > 0 && (
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {row.prenom} {row.nom}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'tenant_role',
      header: 'Rôle',
      mobile: 'inline',
      render: (row) => {
        const assignment = row.tenants.find((t) => t.tenant_id === tenantId)
        return assignment ? (
          <span
            className="rounded px-1.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
              color: 'var(--color-accent)',
            }}
          >
            {assignment.role_label}
          </span>
        ) : (
          <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
        )
      },
    },
    {
      key: 'actif',
      header: t('status'),
      mobile: 'inline',
      render: (row) =>
        row.actif ? (
          <span className="flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
            <CheckCircle size={12} /> {t('active')}
          </span>
        ) : (
          <span className="flex items-center gap-1" style={{ color: 'var(--color-danger)' }}>
            <XCircle size={12} /> {t('inactive')}
          </span>
        ),
    },
  ]

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={8} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <PermissionGate permission="USER_WRITE">
          <Button
            variant="primary"
            size="sm"
            icon={<Users size={14} />}
            label={t('user_create')}
            onClick={() => setShowCreate(true)}
          />
        </PermissionGate>
      </div>

      {fetchError && <InlineError message={fetchError} />}

      {tenantUsers.length === 0 ? (
        <EmptyState
          icon={<Users size={24} />}
          title={t('no_users')}
          description={t('no_users_hint')}
        />
      ) : (
        <DataTable columns={columns} rows={tenantUsers} rowKey={(row) => row.id} />
      )}

      {/* Create user modal */}
      <Modal
        isOpen={showCreate}
        onOpenChange={(open) => { if (!open) setShowCreate(false) }}
        title={t('user_create')}
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-5">
          <ModalSection title="Compte">
            <FieldGrid columns={1}>
              <TextInput
                label="Email"
                type="email"
                value={form.email}
                onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                isRequired
                width="100%"
                placeholder="paul.dupont@example.fr"
              />
              <TextInput
                label="Mot de passe"
                type="password"
                value={form.password}
                onChange={(v) => setForm((f) => ({ ...f, password: v }))}
                isRequired
                width="100%"
                placeholder="Min. 8 caractères"
              />
            </FieldGrid>
          </ModalSection>

          <ModalSection title="Identité">
            <FieldGrid columns={2}>
              <TextInput
                label="Prénom"
                value={form.prenom}
                onChange={(v) => setForm((f) => ({ ...f, prenom: v }))}
                width="100%"
              />
              <TextInput
                label="Nom"
                value={form.nom}
                onChange={(v) => setForm((f) => ({ ...f, nom: v }))}
                width="100%"
              />
            </FieldGrid>
          </ModalSection>

          <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <Button
              label={t('cancel')}
              variant="secondary"
              onClick={() => setShowCreate(false)}
              className="flex-1"
            />
            <Button
              label={saving ? t('saving') : t('add')}
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
