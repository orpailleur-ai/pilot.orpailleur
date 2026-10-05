'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Building2, Search, Trash2, CheckCircle, XCircle, Wand2 } from 'lucide-react'
import { TextInput, Button, useToast } from '@astryxdesign/core'
import {
  adminTenants,
  clearToken,
  type Tenant,
  type CreateTenantDto,
} from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'
import { PageHeader } from '@/components/layout/page-header'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { Spinner } from '@/components/ui/spinner'
import { Modal, ModalSection, FieldGrid } from '@/components/ui/modal'
import { useAuth } from '@/components/providers/auth-context'

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  scale: 'Scale',
}

interface TenantRow {
  id: string
  nom: string
  email: string | null
  ville: string | null
  siret: string | null
  plan: string
  nb_sites_max: number
  nb_users_max: number
  actif: boolean
  createdAt: string
}

function toRow(t: Tenant): TenantRow {
  return {
    id: t.id,
    nom: t.nom,
    email: t.email,
    ville: t.ville,
    siret: t.siret,
    plan: t.plan,
    nb_sites_max: t.nb_sites_max,
    nb_users_max: t.nb_users_max,
    actif: t.actif,
    createdAt: t.createdAt,
  }
}

export default function TenantsPage() {
  const router = useRouter()
  const { t } = useI18n()
  const toast = useToast()
  const { isLoading: authLoading } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [form, setForm] = useState<CreateTenantDto>({
    nom: '',
    email: '',
    siret: '',
    ville: '',
    plan: 'starter',
    nb_sites_max: 1,
    nb_users_max: 5,
  })

  useEffect(() => {
    if (!authLoading) fetchTenants()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading])

  async function fetchTenants() {
    setLoading(true)
    setFetchError(null)
    try {
      const data = await adminTenants.list()
      setTenants(data)
    } catch (err) {
      if (err instanceof Error && err.message.includes('401')) {
        clearToken()
        router.push('/login')
      } else {
        setFetchError(err instanceof Error ? err.message : t('error'))
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nom.trim()) return
    setSaving(true)
    try {
      await adminTenants.create(form)
      setShowCreate(false)
      setForm({ nom: '', email: '', siret: '', ville: '', plan: 'starter', nb_sites_max: 1, nb_users_max: 5 })
      fetchTenants()
      toast({ body: t('tenant_created'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, nom: string) {
    if (!confirm(t('delete_tenant_hint', { nom }))) return
    setDeleting(id)
    try {
      await adminTenants.delete(id)
      fetchTenants()
      toast({ body: t('tenant_deleted'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setDeleting(null)
    }
  }

  const filtered = tenants.filter(
    (t) =>
      !search ||
      t.nom.toLowerCase().includes(search.toLowerCase()) ||
      t.email?.toLowerCase().includes(search.toLowerCase()),
  )

  const columns: Column<TenantRow>[] = [
    {
      key: 'nom',
      header: t('name'),
      mobile: 'primary',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Building2 size={14} style={{ color: 'var(--color-text-secondary)' }} />
          <span style={{ color: 'var(--color-text-primary)' }}>{row.nom}</span>
        </div>
      ),
    },
    {
      key: 'email',
      header: t('contact'),
      mobile: 'inline',
      render: (row) => row.email ?? '—',
    },
    {
      key: 'plan',
      header: 'Plan',
      mobile: 'hidden',
      render: (row) => (
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
            color: 'var(--color-accent)',
          }}
        >
          {PLAN_LABELS[row.plan] ?? row.plan}
        </span>
      ),
    },
    {
      key: 'limits',
      header: 'Sites / Users',
      mobile: 'hidden',
      align: 'end',
      render: (row) => (
        <span style={{ color: 'var(--color-text-secondary)' }}>
          {row.nb_sites_max} sites · {row.nb_users_max} users
        </span>
      ),
    },
    {
      key: 'actif',
      header: t('status'),
      mobile: 'inline',
      render: (row) =>
        row.actif ? (
          <span className="inline-flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
            <CheckCircle size={12} /> {t('active')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1" style={{ color: 'var(--color-danger)' }}>
            <XCircle size={12} /> {t('inactive')}
          </span>
        ),
    },
    {
      key: 'createdAt',
      header: t('date'),
      mobile: 'hidden',
      align: 'end',
      render: (row) => (
        <span style={{ color: 'var(--color-text-secondary)' }}>
          {new Date(row.createdAt).toLocaleDateString('fr-FR')}
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
          label=""
          variant="ghost"
          size="sm"
          isIconOnly
          icon={<Trash2 size={14} />}
          isDisabled={deleting === row.id}
          onClick={() => handleDelete(row.id, row.nom)}
        />
      ),
    },
  ]

  const action = (
    <div className="flex gap-2">
      <Button
        label="Onboarding"
        variant="secondary"
        icon={<Wand2 size={14} />}
        onClick={() => router.push('/tenants/new')}
      />
      <Button
        label={t('new_tenant')}
        variant="primary"
        icon={<Plus size={15} />}
        onClick={() => setShowCreate(true)}
      />
    </div>
  )

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={8} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('tenants')}
        subtitle={t('audit_log_count', { n: tenants.length })}
        action={action}
        icon={<Building2 size={22} style={{ color: 'var(--color-accent)' }} />}
      />

      {fetchError && <InlineError message={fetchError} />}

      {/* Search */}
      <TextInput
        label={t('search')}
        isLabelHidden
        value={search}
        onChange={(v) => setSearch(v)}
        placeholder={t('search')}
        startIcon={<Search size={16} />}
        width="100%"
      />

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 size={24} />}
          title={search ? t('no_results') : t('no_tenants')}
          description={search ? undefined : t('no_tenants_hint')}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={filtered.map(toRow)}
          rowKey={(row) => row.id}
        />
      )}

      {/* Create modal */}
      <Modal
        isOpen={showCreate}
        onOpenChange={(open) => { if (!open) setShowCreate(false) }}
        title={t('new_tenant')}
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-5">
          <ModalSection title={t('name')}>
            <FieldGrid columns={1}>
              <TextInput
                label={t('name')}
                value={form.nom}
                onChange={(v) => setForm((f) => ({ ...f, nom: v }))}
                isRequired
                width="100%"
                placeholder="La Mie Câline — Toulouse"
              />
            </FieldGrid>
          </ModalSection>

          <ModalSection title={t('contact')}>
            <FieldGrid columns={2}>
              <TextInput
                label={t('email')}
                type="email"
                value={form.email ?? ''}
                onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                width="100%"
                placeholder="contact@lamiecacaline.fr"
              />
              <TextInput
                label="Ville"
                value={form.ville ?? ''}
                onChange={(v) => setForm((f) => ({ ...f, ville: v }))}
                width="100%"
                placeholder="Toulouse"
              />
              <TextInput
                label="SIRET"
                value={form.siret ?? ''}
                onChange={(v) => setForm((f) => ({ ...f, siret: v }))}
                width="100%"
                placeholder="123 456 789 00012"
              />
            </FieldGrid>
          </ModalSection>

          <ModalSection title="Plan">
            <FieldGrid columns={3}>
              <TextInput
                label="Plan"
                value={form.plan ?? 'starter'}
                onChange={(v) => setForm((f) => ({ ...f, plan: v }))}
                width="100%"
              />
              <TextInput
                label="Sites max"
                type="text"
                value={String(form.nb_sites_max ?? 1)}
                onChange={(v) => setForm((f) => ({ ...f, nb_sites_max: parseInt(v) || 1 }))}
                width="100%"
              />
              <TextInput
                label="Users max"
                type="text"
                value={String(form.nb_users_max ?? 5)}
                onChange={(v) => setForm((f) => ({ ...f, nb_users_max: parseInt(v) || 5 }))}
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
