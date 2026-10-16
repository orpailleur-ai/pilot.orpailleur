'use client'

import { useState, useEffect } from 'react'
import { FileText, CheckCircle, Clock, AlertTriangle, Ban, Download, Loader2 } from 'lucide-react'
import { Button, SegmentedControl, SegmentedControlItem, useToast } from '@astryxdesign/core'
import { invoices, adminTenants, type Invoice, type InvoiceStatut } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'
import { Spinner } from '@/components/ui/spinner'
import { InlineError } from '@/components/ui/inline-error'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal, ModalSection } from '@/components/ui/modal'

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

const STATUS_ICONS: Record<InvoiceStatut, React.ReactNode> = {
  draft: <Clock size={12} />,
  open: <Clock size={12} />,
  paid: <CheckCircle size={12} />,
  past_due: <AlertTriangle size={12} />,
  void: <Ban size={12} />,
  uncollectible: <AlertTriangle size={12} />,
}

const STATUS_COLORS: Record<InvoiceStatut, string> = {
  draft: 'var(--color-text-secondary)',
  open: 'var(--color-accent)',
  paid: 'var(--color-success)',
  past_due: 'var(--color-danger)',
  void: 'var(--color-text-secondary)',
  uncollectible: 'var(--color-danger)',
}

type FilterValue = 'all' | InvoiceStatut

export default function InvoicesPage() {
  const { t } = useI18n()
  const toast = useToast()
  const [list, setList] = useState<Invoice[]>([])
  const [tenants, setTenants] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterValue>('all')
  const [search, setSearch] = useState('')
  const [paying, setPaying] = useState<string | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [paymentDate, setPaymentDate] = useState('')
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([invoices.list(), adminTenants.list()])
      .then(([inv, tens]) => {
        setList(inv)
        const tensMap: Record<string, string> = {}
        for (const ten of tens) tensMap[ten.id] = ten.nom
        setTenants(tensMap)
      })
      .catch((err) => setFetchError(err instanceof Error ? err.message : t('error')))
      .finally(() => setLoading(false))
  }, [t])

  async function handleMarkPaid(invoice: Invoice) {
    setSelectedInvoice(invoice)
    setPaymentDate(new Date().toISOString().split('T')[0])
  }

  async function confirmMarkPaid() {
    if (!selectedInvoice || !paymentDate) return
    setPaying(selectedInvoice.id)
    try {
      const updated = await invoices.updateStatus(selectedInvoice.id, 'paid', paymentDate)
      setList((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)))
      setSelectedInvoice(null)
      toast({ body: `Facture ${updated.numero} marquée payée`, type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setPaying(null)
    }
  }

  async function handleViewPdf(invoice: Invoice) {
    if (!invoice.pdfUrl) {
      toast({ body: t('pdf_pending'), type: 'info' })
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
      toast({ body: t('pdf_retry'), type: 'info' })
      // Refresh the invoice list after a short delay to pick up the new pdfUrl
      setTimeout(async () => {
        const updated = await invoices.list()
        setList(updated)
      }, 3000)
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : 'Erreur de génération', type: 'error' })
    } finally {
      setGeneratingId(null)
    }
  }

  const filtered = list.filter((inv) => {
    if (filter !== 'all' && inv.statut !== filter) return false
    if (!search) return true
    const tenant = tenants[inv.tenant_id] ?? ''
    return (
      tenant.toLowerCase().includes(search.toLowerCase()) ||
      inv.numero.toLowerCase().includes(search.toLowerCase())
    )
  })

  if (loading) return <div className="flex justify-center py-16"><Spinner size={8} /></div>

  return (
    <div className="flex flex-col gap-5">
      {/* Header + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <input
            type="text"
            placeholder="Rechercher par tenant ou numéro…"
            className="h-9 rounded-md border px-3 text-sm sm:w-64"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <SegmentedControl
            value={filter}
            onChange={(v) => setFilter(v as FilterValue)}
            label="Filtre statut"
            size="sm"
          >
            <SegmentedControlItem value="all" label="Toutes" />
            <SegmentedControlItem value="open" label="Ouvertes" />
            <SegmentedControlItem value="paid" label="Payées" />
            <SegmentedControlItem value="past_due" label="En retard" />
          </SegmentedControl>
        </div>
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {filtered.length} facture{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {fetchError ? (
        <InlineError message={fetchError} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText size={24} />}
          title="Aucune facture"
          description="Les factures apparaîtront ici une fois les abonnements créés."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((inv) => {
            const tenant = tenants[inv.tenant_id] ?? inv.tenant_id.slice(0, 8)
            const isPaid = inv.statut === 'paid'
            const isPastDue = inv.statut === 'past_due'
            return (
              <div
                key={inv.id}
                className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                style={{
                  borderColor: isPastDue ? 'var(--color-danger)' : 'var(--color-border)',
                  backgroundColor: 'var(--color-card)',
                }}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <FileText size={14} style={{ color: 'var(--color-accent)' }} />
                    <span className="font-mono text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
                      {inv.numero}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 text-xs"
                      style={{ color: STATUS_COLORS[inv.statut] }}
                    >
                      {STATUS_ICONS[inv.statut]}
                      {STATUT_LABELS[inv.statut]}
                    </span>
                  </div>
                  <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {tenant}
                  </div>
                  <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    <span>Émise {new Date(inv.dateEmission).toLocaleDateString('fr-FR')}</span>
                    <span>Éch. {new Date(inv.dateEcheance).toLocaleDateString('fr-FR')}</span>
                    {inv.datePaiement && (
                      <span style={{ color: 'var(--color-success)' }}>
                        Payée {new Date(inv.datePaiement).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {formatPrice(inv.montantCents)}
                  </span>

                  <div className="flex items-center gap-1">
                    {inv.pdfUrl ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        isIconOnly
                        icon={<Download size={14} />}
                        label="Télécharger PDF"
                        onClick={() => handleViewPdf(inv)}
                      />
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        isIconOnly
                        icon={generatingId === inv.id ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                        label="Générer PDF"
                        onClick={() => handleGeneratePdf(inv)}
                        isLoading={generatingId === inv.id}
                      />
                    )}
                    {!isPaid && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<CheckCircle size={14} />}
                        label="Marquer payée"
                        onClick={() => handleMarkPaid(inv)}
                        isLoading={paying === inv.id}
                      />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
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
                isLoading={!!paying}
                className="flex-1"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
