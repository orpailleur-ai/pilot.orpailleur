'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { FileText, CheckCircle, Download, Loader2 } from 'lucide-react'
import { Button, useToast } from '@astryxdesign/core'
import { invoices, type Invoice, type InvoiceStatut } from '@/lib/api-client'
import { useTenantDetail } from '@/components/composite/tenant-detail-context'
import { useI18n } from '@/lib/i18n'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { Spinner } from '@/components/ui/spinner'
import { Modal } from '@/components/ui/modal'

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
  const toast = useToast()
  const [list, setList] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [paymentDate, setPaymentDate] = useState('')
  const [paying, setPaying] = useState(false)
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  useEffect(() => {
    invoices.list(tenantId)
      .then(setList)
      .catch((err) => setFetchError(err instanceof Error ? err.message : t('error')))
      .finally(() => setLoading(false))
  }, [tenantId, t])

  async function handleViewPdf(invoice: Invoice) {
    if (!invoice.pdfUrl) {
      toast({ body: 'PDF non disponible — en cours de génération', type: 'info' })
      return
    }
    try {
      const url = await invoices.downloadUrl(invoice.id)
      const link = document.createElement('a')
      link.href = url
      link.download = `${invoice.numero}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : 'Erreur de téléchargement', type: 'error' })
    }
  }

  async function handleGeneratePdf(invoice: Invoice) {
    setGeneratingId(invoice.id)
    try {
      await invoices.generatePdf(invoice.id)
      toast({ body: 'PDF en cours de génération — actualisez dans quelques secondes', type: 'info' })
      setTimeout(async () => {
        const updated = await invoices.list(tenantId)
        setList(updated)
      }, 3000)
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : 'Erreur de génération', type: 'error' })
    } finally {
      setGeneratingId(null)
    }
  }

  async function handleMarkPaid(invoice: Invoice) {
    setSelectedInvoice(invoice)
    setPaymentDate(new Date().toISOString().split('T')[0])
  }

  async function confirmMarkPaid() {
    if (!selectedInvoice || !paymentDate) return
    setPaying(true)
    try {
      const updated = await invoices.updateStatus(selectedInvoice.id, 'paid', paymentDate)
      setList((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)))
      setSelectedInvoice(null)
      toast({ body: `Facture ${updated.numero} marquée payée`, type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setPaying(false)
    }
  }

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
      render: (row) => (
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
          style={{
            backgroundColor:
              row.statut === 'paid' ? 'color-mix(in srgb, var(--color-success) 12%, transparent)' :
              row.statut === 'past_due' ? 'color-mix(in srgb, var(--color-danger) 12%, transparent)' :
              'color-mix(in srgb, var(--color-accent) 12%, transparent)',
            color:
              row.statut === 'paid' ? 'var(--color-success)' :
              row.statut === 'past_due' ? 'var(--color-danger)' :
              'var(--color-accent)',
          }}
        >
          {STATUT_LABELS[row.statut]}
        </span>
      ),
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
      header: 'Échéance',
      mobile: 'hidden',
      align: 'end',
      render: (row) => (
        <span
          style={{
            color: row.statut === 'past_due' ? 'var(--color-danger)' : 'var(--color-text-secondary)',
          }}
        >
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
    {
      key: 'actions',
      header: '',
      align: 'end',
      mobile: 'hidden',
      noRowClick: true,
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.pdfUrl ? (
            <Button
              size="sm"
              variant="ghost"
              isIconOnly
              icon={<Download size={14} />}
              label="Télécharger PDF"
              onClick={() => handleViewPdf(row)}
            />
          ) : (
            <Button
              size="sm"
              variant="secondary"
              isIconOnly
              icon={generatingId === row.id ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              label="Générer PDF"
              onClick={() => handleGeneratePdf(row)}
              isLoading={generatingId === row.id}
            />
          )}
          {row.statut !== 'paid' && (
            <Button
              size="sm"
              variant="ghost"
              isIconOnly
              icon={<CheckCircle size={14} />}
              label="Marquer payée"
              onClick={() => handleMarkPaid(row)}
            />
          )}
        </div>
      ),
    },
  ]

  if (loading) return <div className="flex justify-center py-16"><Spinner size={8} /></div>

  return (
    <div className="flex flex-col gap-4">
      {fetchError ? (
        <InlineError message={fetchError} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<FileText size={24} />}
          title="Aucune facture"
          description={`Aucune facture pour ${tenant?.nom ?? 'ce tenant'}.`}
        />
      ) : (
        <DataTable columns={columns} rows={list} rowKey={(row) => row.id} />
      )}

      {/* Mark paid modal */}
      <Modal
        isOpen={!!selectedInvoice}
        onOpenChange={(open) => { if (!open) setSelectedInvoice(null) }}
        title="Marquer comme payée"
        size="sm"
      >
        {selectedInvoice && (
          <div className="flex flex-col gap-4">
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Facture <strong>{selectedInvoice.numero}</strong> —{' '}
              <strong>{formatPrice(selectedInvoice.montantCents)}</strong>
            </p>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Date de paiement
              </label>
              <input
                type="date"
                className="h-9 rounded-md border px-3 text-sm"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="flex gap-3 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
              <Button
                label="Annuler"
                variant="secondary"
                onClick={() => setSelectedInvoice(null)}
                className="flex-1"
              />
              <Button
                label="Confirmer"
                variant="primary"
                onClick={confirmMarkPaid}
                isLoading={paying}
                className="flex-1"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
