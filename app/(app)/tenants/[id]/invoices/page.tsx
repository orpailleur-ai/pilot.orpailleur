'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { FileText } from 'lucide-react'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { Spinner } from '@/components/ui/spinner'
import { StatusPill } from '@/components/composite/status-pill'
import { useTenantDetail } from '@/components/composite/tenant-detail-context'
import { invoices, type Invoice, type InvoiceStatut } from '@/lib/api-client'
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

export default function TenantInvoicesPage() {
  const params = useParams()
  const tenantId = params.id as string
  const { tenant } = useTenantDetail()
  const { t } = useI18n()
  const [list, setList] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    invoices.list(tenantId)
      .then(setList)
      .catch((err) => setFetchError(err instanceof Error ? err.message : t('error')))
      .finally(() => setLoading(false))
  }, [tenantId, t])

  const columns: Column<Invoice>[] = [
    {
      key: 'numero',
      header: 'Numéro',
      mobile: 'primary',
      render: (row) => (
        <div className="flex items-center gap-2">
          <FileText size={14} style={{ color: 'var(--color-accent)' }} />
          <span className="font-mono text-sm" style={{ color: 'var(--color-accent)' }}>
            {row.numero}
          </span>
        </div>
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
      header: t('status'),
      mobile: 'inline',
      render: (row) => {
        const map: Record<InvoiceStatut, 'active' | 'inactive' | 'past_due' | 'canceled' | 'expired'> = {
          draft: 'inactive', open: 'active', paid: 'active', past_due: 'past_due', void: 'canceled', uncollectible: 'canceled',
        }
        return (
          <div className="flex items-center gap-2">
            <StatusPill status={map[row.statut]} />
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
    {
      key: 'datePaiement',
      header: 'Payée le',
      mobile: 'hidden',
      align: 'end',
      render: (row) => (
        <span style={{ color: row.datePaiement ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
          {row.datePaiement
            ? new Date(row.datePaiement).toLocaleDateString('fr-FR')
            : '—'}
        </span>
      ),
    },
  ]

  if (loading) return <div className="flex justify-center py-16"><Spinner size={8} /></div>

  return (
    <div className="flex flex-col gap-4">
      {fetchError ? <InlineError message={fetchError} /> :
       list.length === 0 ? (
         <EmptyState
           icon={<FileText size={24} />}
           title="Aucune facture"
           description={`Aucune facture pour ${tenant?.nom}.`}
         />
       ) : (
         <DataTable columns={columns} rows={list} rowKey={(row) => row.id} />
       )}
    </div>
  )
}
