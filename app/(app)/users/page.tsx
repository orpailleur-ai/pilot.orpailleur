'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Plus, Search } from 'lucide-react'
import { Button, useToast } from '@astryxdesign/core'
import { TextInput } from '@astryxdesign/core'
import { Modal, ModalSection, FieldGrid } from '@/components/ui/modal'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { FieldError } from '@/components/ui/form-field'
import { useFormErrors } from '@/components/ui/form-field'
import { SelectField } from '@/components/ui/select-field'
import { StatusPill } from '@/components/composite/status-pill'
import { Spinner } from '@/components/ui/spinner'
import { PageHeader } from '@/components/layout/page-header'
import {
  adminUsers,
  adminTenants,
  roles,
  type AdminUser,
  type Role,
  type Tenant,
} from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'

export default function UsersPage() {
  const router = useRouter()
  const { t } = useI18n()
  const toast = useToast()
  const formErrors = useFormErrors()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [allRoles, setAllRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterTenant, setFilterTenant] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    email: '',
    password: '',
    prenom: '',
    nom: '',
  })

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    setFetchError(null)
    try {
      const [usersData, tenantsData, rolesData] = await Promise.all([
        adminUsers.list(),
        adminTenants.list(),
        roles.list(),
      ])
      setUsers(usersData)
      setTenants(tenantsData)
      setAllRoles(rolesData)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : t('error'))
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    let hasError = false
    if (!form.email.trim()) { formErrors.setError('email', t('required')); hasError = true }
    else formErrors.clearError('email')
    if (!form.password.trim()) { formErrors.setError('password', t('required')); hasError = true }
    else formErrors.clearError('password')
    if (hasError) return
    setSaving(true)
    try {
      const newUser = await adminUsers.create({
        email: form.email,
        password: form.password,
        prenom: form.prenom || undefined,
        nom: form.nom || undefined,
      })
      setShowCreate(false)
      setForm({ email: '', password: '', prenom: '', nom: '' })
      formErrors.clearAll()
      load()
      toast({ body: t('user_created'), type: 'info' })
      router.push(`/users/${newUser.id}`)
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const filtered = users.filter((u) => {
    if (search) {
      const s = search.toLowerCase()
      if (
        !u.email.toLowerCase().includes(s) &&
        !(u.prenom ?? '').toLowerCase().includes(s) &&
        !(u.nom ?? '').toLowerCase().includes(s)
      ) {
        return false
      }
    }
    if (filterTenant && !u.tenants.some((t) => t.tenant_id === filterTenant)) return false
    if (filterStatus === 'active' && !u.actif) return false
    if (filterStatus === 'inactive' && u.actif) return false
    return true
  })

  const columns: Column<AdminUser>[] = [
    {
      key: 'email',
      header: t('users_email'),
      mobile: 'primary',
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium" style={{ color: 'var(--color-accent)' }}>
            {row.email}
          </span>
          {[row.prenom, row.nom].filter(Boolean).length > 0 && (
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {row.prenom} {row.nom}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'tenants',
      header: t('tenants'),
      mobile: 'hidden',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.tenants.length === 0 ? (
            <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
          ) : (
            row.tenants.map((t) => {
              const tenant = tenants.find((ten) => ten.id === t.tenant_id)
              return (
                <span
                  key={t.tenant_id}
                  className="inline-flex items-center rounded px-1.5 py-0.5 text-xs"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
                    color: 'var(--color-accent)',
                  }}
                >
                  {tenant?.nom ?? t.tenant_id.slice(0, 8)}
                </span>
              )
            })
          )}
        </div>
      ),
    },
    {
      key: 'roles',
      header: 'Rôle principal',
      mobile: 'hidden',
      render: (row) => {
        const first = row.tenants[0]
        return first ? (
          <span
            className="rounded px-1.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
              color: 'var(--color-accent)',
            }}
          >
            {first.role_label}
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
      render: (row) => <StatusPill status={row.actif ? 'active' : 'inactive'} size="sm" />,
    },
  ]

  const action = (
    <Button
      variant="primary"
      icon={<Plus size={14} />}
      label={t('user_create')}
      onClick={() => setShowCreate(true)}
    />
  )

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={8} />
      </div>
    )
  }

  return (
    <>
      <PageHeader title={t('users')} action={action} />

      {fetchError && <InlineError message={fetchError} />}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <TextInput
          label={t('users_search')}
          value={search}
          onChange={(v) => setSearch(v)}
          placeholder="Email, nom, prénom…"
          startIcon={<Search size={14} />}
          width="220px"
        />
        <SelectField
          label={t('users_filter_tenant')}
          value={filterTenant}
          onChange={(v) => setFilterTenant(v)}
          options={[{ value: '', label: t('all_tenants', 'Tous les tenants') }, ...tenants.map((t) => ({ value: t.id, label: t.nom }))]}
        />
        <SelectField
          label={t('users_filter_status')}
          value={filterStatus}
          onChange={(v) => setFilterStatus(v)}
          options={[
            { value: '', label: t('all_statuses', 'Tous') },
            { value: 'active', label: t('users_filter_active') },
            { value: 'inactive', label: t('users_filter_inactive') },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={24} />}
          title={search || filterTenant || filterStatus ? t('noResults') : t('no_users')}
          description={search || filterTenant || filterStatus ? undefined : t('no_users_hint')}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(row) => row.id}
          onRowClick={(row) => router.push(`/users/${row.id}`)}
        />
      )}

      {/* Create modal */}
      <Modal
        isOpen={showCreate}
        onOpenChange={(open) => { if (!open) { setShowCreate(false); formErrors.clearAll() } }}
        title={t('user_create')}
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-5">
          <ModalSection title={t('users_account')}>
            <FieldGrid columns={1}>
              <div className="flex flex-col gap-1">
                <TextInput
                  label={t('users_email')}
                  type="email"
                  value={form.email}
                  onChange={(v) => { setForm((f) => ({ ...f, email: v })); formErrors.clearError('email') }}
                  isRequired
                  width="100%"
                  placeholder="paul.dupont@example.fr"
                />
                <FieldError message={formErrors.errors.email} />
              </div>
              <div className="flex flex-col gap-1">
                <TextInput
                  label={t('users_password')}
                  type="password"
                  value={form.password}
                  onChange={(v) => { setForm((f) => ({ ...f, password: v })); formErrors.clearError('password') }}
                  isRequired
                  width="100%"
                  placeholder="Min. 8 caractères"
                />
                <FieldError message={formErrors.errors.password} />
              </div>
            </FieldGrid>
          </ModalSection>

          <ModalSection title={t('users_identity')}>
            <FieldGrid columns={2}>
              <TextInput
                label={t('users_prenom')}
                value={form.prenom}
                onChange={(v) => setForm((f) => ({ ...f, prenom: v }))}
                width="100%"
              />
              <TextInput
                label={t('users_nom')}
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
              label={saving ? t('loading') : t('add')}
              variant="primary"
              type="submit"
              isLoading={saving}
              className="flex-1"
            />
          </div>
        </form>
      </Modal>
    </>
  )
}
