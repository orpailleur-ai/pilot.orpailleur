'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Building2, Search, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { TextInput, Button, useToast } from '@astryxdesign/core'
import { adminTenants, clearToken, type Tenant } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'
import { PageHeader } from '@/components/layout/page-header'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { Spinner } from '@/components/ui/spinner'
import { ConfirmDialog } from '@/components/composite/confirm-dialog'
import { useAuth } from '@/components/providers/auth-context'
import { NouvelleBoulangerieModal } from '@/components/tenants/nouvelle-boulangerie-modal'

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
  sites_count: number | null
  users_count: number | null
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
    sites_count: t.sites_count ?? null,
    users_count: t.users_count ?? null,
  }
}

export default function TenantsPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { t } = useI18n()
  const toast = useToast()
  const { isLoading: authLoading } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  // `?nouvelle=1` : l'ancien lien « Onboarding » ouvre directement le formulaire.
  const [showCreate, setShowCreate] = useState(params.get('nouvelle') === '1')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nom: string } | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

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

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(deleteTarget.id)
    try {
      await adminTenants.delete(deleteTarget.id)
      setDeleteTarget(null)
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
        <div className="flex flex-col gap-0.5">
          <span
            className="font-medium cursor-pointer"
            style={{ color: 'var(--color-accent)' }}
            onClick={() => router.push(`/tenants/${row.id}`)}
          >
            {row.nom}
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {row.email ?? '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'plan',
      header: t('tenants_plan'),
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
      key: 'usage',
      header: t('tenants_usage'),
      mobile: 'hidden',
      align: 'end',
      // Ce que la boulangerie A, sur ce que son plan PERMET : « 2 / 3 · 5 / 20 ».
      render: (row) => (
        <span className="tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
          {row.sites_count ?? '—'} / {row.nb_sites_max} · {row.users_count ?? '—'} / {row.nb_users_max}
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
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            label={t('view')}
            variant="ghost"
            size="sm"
            isIconOnly
            icon={<Building2 size={14} />}
            onClick={() => router.push(`/tenants/${row.id}`)}
          />
          <Button
            label={t('tenant_delete_action')}
            variant="ghost"
            size="sm"
            isIconOnly
            icon={<Trash2 size={14} />}
            isDisabled={deleting === row.id}
            onClick={() => setDeleteTarget({ id: row.id, nom: row.nom })}
          />
        </div>
      ),
    },
  ]

  // UN seul point d'entrée : la création d'une boulangerie, prête à servir.
  const action = (
    <Button
      label={t('new_tenant')}
      variant="primary"
      icon={<Plus size={15} />}
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
      <PageHeader
        title={t('tenants')}
        subtitle={t('tenants_count', { n: tenants.length })}
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
          onRowClick={(row) => router.push(`/tenants/${row.id}`)}
        />
      )}

      {/* Monté seulement à l'ouverture : fermée, sa surface mobile (une feuille
          plein écran) restait au-dessus de la page et interceptait les touchers. */}
      {showCreate && (
        <NouvelleBoulangerieModal
          isOpen
          onOpenChange={setShowCreate}
          onCreated={(id) => {
            toast({ body: t('tenant_created'), type: 'info' })
            router.push(`/tenants/${id}`)
          }}
        />
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title={t('delete_tenant')}
        description={deleteTarget ? t('delete_tenant_hint', { nom: deleteTarget.nom }) : ''}
        confirmLabel={t('delete')}
        confirmVariant="destructive"
        onConfirm={handleDelete}
        isLoading={deleting !== null}
      />
    </>
  )
}
