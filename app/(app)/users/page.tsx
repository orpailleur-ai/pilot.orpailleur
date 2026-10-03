'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Plus, Search, CheckCircle, XCircle } from 'lucide-react'
import { Button, useToast } from '@astryxdesign/core'
import { TextInput } from '@astryxdesign/core'
import { Modal, ModalSection, FieldGrid } from '@/components/ui/modal'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { Spinner } from '@/components/ui/spinner'
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
    load()
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
    if (!form.email.trim() || !form.password.trim()) return
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
      header: 'Email',
      mobile: 'primary',
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span
            className="font-medium cursor-pointer"
            style={{ color: 'var(--color-accent)' }}
            onClick={() => router.push(`/users/${row.id}`)}
          >
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          {/* Title is in PageHeader via layout */}
        </div>
        {action}
      </div>

      {fetchError && <InlineError message={fetchError} />}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <TextInput
          label="Rechercher"
          isLabelHidden
          value={search}
          onChange={(v) => setSearch(v)}
          placeholder="Email, nom, prénom…"
          startIcon={<Search size={14} />}
          width="200px"
        />
        <select
          className="h-8 rounded-md border px-2 text-sm"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
          }}
          value={filterTenant}
          onChange={(e) => setFilterTenant(e.target.value)}
        >
          <option value="">Tous les tenants</option>
          {tenants.map((ten) => (
            <option key={ten.id} value={ten.id}>{ten.nom}</option>
          ))}
        </select>
        <select
          className="h-8 rounded-md border px-2 text-sm"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
          }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="inactive">Inactif</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={24} />}
          title={search || filterTenant || filterStatus ? t('noResults') : t('no_users')}
          description={search || filterTenant || filterStatus ? undefined : t('no_users_hint')}
        />
      ) : (
        <DataTable columns={columns} rows={filtered} rowKey={(row) => row.id} />
      )}

      {/* Create modal */}
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
