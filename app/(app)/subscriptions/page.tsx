'use client'

import { useState, useEffect } from 'react'
import { subscriptions, adminTenants, plans as plansApi, type Subscription } from '@/lib/api-client'
import { Spinner } from '@/components/ui/spinner'
import { InlineError } from '@/components/ui/inline-error'
import { EmptyState } from '@/components/ui/empty-state'
import { DataTable, type Column } from '@/components/ui/data-table'
import { StatusPill } from '@/components/composite/status-pill'

function formatPrice(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export default function SubscriptionsPage() {
  const [list, setList] = useState<Subscription[]>([])
  const [tenants, setTenants] = useState<Record<string, string>>({})
  const [planNames, setPlanNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      subscriptions.list(),
      adminTenants.list(),
      plansApi.list(),
    ])
      .then(([subs, tens, pls]) => {
        setList(subs)
        const tensMap: Record<string, string> = {}
        for (const t of tens) tensMap[t.id] = t.nom
        setTenants(tensMap)
        const plansMap: Record<string, string> = {}
        for (const p of pls) plansMap[p.id] = p.nom
        setPlanNames(plansMap)
      })
      .catch((err) => setFetchError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [])

  const columns: Column<Subscription>[] = [
    {
      key: 'tenant',
      header: 'Tenant',
      mobile: 'primary',
      render: (row) => (
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
          {tenants[row.tenant_id] ?? row.tenant_id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      mobile: 'inline',
      render: (row) => (
        <span style={{ color: 'var(--color-accent)' }}>
          {planNames[row.plan_id] ?? row.plan?.nom ?? row.plan_id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'periode',
      header: 'Période',
      mobile: 'hidden',
      render: (row) => (
        <span style={{ color: 'var(--color-text-secondary)' }}>
          {row.periode === 'yearly' ? 'Annuel' : 'Mensuel'}
        </span>
      ),
    },
    {
      key: 'prix',
      header: 'Prix',
      mobile: 'hidden',
      align: 'end',
      render: (row) => (
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
          {formatPrice(row.prixCents)}
        </span>
      ),
    },
    {
      key: 'statut',
      header: 'Statut',
      mobile: 'inline',
      render: (row) => (
        <StatusPill
          status={row.statut === 'active' ? 'active' : row.statut === 'canceled' ? 'canceled' : row.statut === 'expired' ? 'expired' : 'past_due'}
        />
      ),
    },
    {
      key: 'dateFin',
      header: "Date d'échéance",
      mobile: 'hidden',
      align: 'end',
      render: (row) => (
        <span style={{ color: 'var(--color-text-secondary)' }}>
          {new Date(row.dateFin).toLocaleDateString('fr-FR')}
        </span>
      ),
    },
  ]

  if (loading) return <div className="flex justify-center py-16"><Spinner size={8} /></div>

  return (
    <div className="space-y-5">
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {list.length} subscription(s) active(s)
      </p>
      {fetchError ? <InlineError message={fetchError} /> :
       list.length === 0 ? <EmptyState title="Aucune subscription" description="Les subscriptions apparaîtront ici une fois créées." /> :
       <DataTable columns={columns} rows={list} rowKey={(row) => row.id} />}
    </div>
  )
}
