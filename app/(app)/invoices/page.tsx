'use client'

import { useState, useEffect } from 'react'
import { invoices, adminTenants, type Invoice, type InvoiceStatut } from '@/lib/api-client'
import { Spinner } from '@/components/ui/spinner'
import { InlineError } from '@/components/ui/inline-error'
import { EmptyState } from '@/components/ui/empty-state'
import { DataTable, type Column } from '@/components/ui/data-table'
import { StatusPill } from '@/components/composite/status-pill'
import { useI18n } from '@/lib/i18n'

function formatPrice(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

const STATUT_LABELS: Record<InvoiceStatut, string> = {
  draft: 'Brouillon',
  open: 'Ouverte',
  paid: 'Payée',
  past_due: 'En retard',
  void: 'Annulée',
  uncollectible: 'Impayée',
}

export default function InvoicesPage() {
  const { t } = useI18n()
  const [list, setList] = useState<Invoice[]>([])
  const [tenants, setTenants] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    Promise.all([
      invoices.list(),
      adminTenants.list(),
    ])
      .then(([inv, tens]) => {
        setList(inv)
        const tensMap: Record<string, string> = {}
        for (const t of tens) tensMap[t.id] = t.nom
        setTenants(tensMap)
      })
      .catch((err) => setFetchError(err instanceof Error ? err.message : t('error')))
      .finally(() => setLoading(false))
  }, [])

  const filtered = list.filter((inv) => {
    if (!filter) return true
    if (tenants[inv.tenant_id]?.toLowerCase().includes(filter.toLowerCase())) return true
    if (inv.numero.toLowerCase().includes(filter.toLowerCase())) return true
    return false
  })

  const columns: Column<Invoice>[] = [
    {
      key: 'numero',
      header: 'Numéro',
      mobile: 'primary',
      render: (row) => (
        <span
          className="font-mono text-sm"
          style={{ color: 'var(--color-accent)' }}
        >
          {row.numero}
        </span>
      ),
    },
    {
      key: 'tenant',
      header: 'Tenant',
      mobile: 'inline',
      render: (row) => (
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
          {tenants[row.tenant_id] ?? row.tenant_id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'montant',
      header: 'Montant',
      mobile: 'hidden',
      align: 'end',
      render: (row) => (
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
          {formatPrice(row.montantCents)}
        </span>
      ),
    },
    {
      key: 'statut',
      header: 'Statut',
      mobile: 'inline',
      render: (row) => {
        const statusMap: Record<InvoiceStatut, 'active' | 'inactive' | 'past_due' | 'canceled' | 'expired'> = {
          draft: 'inactive',
          open: 'active',
          paid: 'active',
          past_due: 'past_due',
          void: 'canceled',
          uncollectible: 'canceled',
        }
        return (
          <div className="flex items-center gap-2">
            <StatusPill status={statusMap[row.statut]} />
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {STATUT_LABELS[row.statut]}
            </span>
          </div>
        )
      },
    },
    {
      key: 'dateEmission',
      header: 'Émise le',
      mobile: 'hidden',
      render: (row) => (
        <span style={{ color: 'var(--color-text-secondary)' }}>
          {new Date(row.dateEmission).toLocaleDateString('fr-FR')}
        </span>
      ),
    },
    {
      key: 'dateEcheance',
      header: "Échéance",
      mobile: 'hidden',
      align: 'end',
      render: (row) => (
        <span style={{ color: 'var(--color-text-secondary)' }}>
          {new Date(row.dateEcheance).toLocaleDateString('fr-FR')}
        </span>
      ),
    },
  ]

  if (loading) return <div className="flex justify-center py-16"><Spinner size={8} /></div>

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Rechercher par tenant ou numéro…"
          className="h-9 rounded-md border px-3 text-sm"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      {fetchError ? <InlineError message={fetchError} /> :
       filtered.length === 0 ? <EmptyState title="Aucune facture" description="Les factures apparaîtront ici." /> :
       <DataTable columns={columns} rows={filtered} rowKey={(row) => row.id} />}
    </div>
  )
}
