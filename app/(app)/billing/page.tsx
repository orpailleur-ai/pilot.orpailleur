'use client'

import { useState, useEffect } from 'react'
import {
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Loader2,
  FileText,
} from 'lucide-react'
import {
  adminTenants,
  subscriptions,
  plans as plansApi,
  invoices,
  type Subscription,
  type Plan,
  type Invoice,
} from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'
import { Spinner } from '@/components/ui/spinner'
import { InlineError } from '@/components/ui/inline-error'
import { PageHeader } from '@/components/layout/page-header'
import { KpiCard } from '@/components/composite/kpi-card'
import { DataTable, type Column } from '@/components/ui/data-table'
import { useToast } from '@astryxdesign/core'

function formatEUR(cents: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

export default function BillingPage() {
  const { t } = useI18n()
  const toast = useToast()

  const STATUT_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    active: { label: t('active'), color: 'var(--color-success)', icon: <CheckCircle2 size={14} /> },
    past_due: { label: t('subs_past_due_short', 'En retard'), color: 'var(--color-warning)', icon: <AlertTriangle size={14} /> },
    canceled: { label: t('subs_canceled_short', 'Annulé'), color: 'var(--color-danger)', icon: <XCircle size={14} /> },
    expired: { label: t('subs_expired_short', 'Expiré'), color: 'var(--color-text-secondary)', icon: <Clock size={14} /> },
  }

  const [subs, setSubs] = useState<Subscription[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [tenants, setTenants] = useState<{ id: string; nom: string }[]>([])
  const [overdueInvoices, setOverdueInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  async function handleDownload(inv: Invoice) {
    if (!inv.pdfUrl) {
      toast({ body: t('pdf_pending'), type: 'info' })
      return
    }
    try {
      const url = await invoices.downloadUrl(inv.id)
      const link = document.createElement('a')
      link.href = url
      link.download = `${inv.numero}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      toast({ body: t('pdf_download_error'), type: 'error' })
    }
  }

  async function handleGeneratePdf(inv: Invoice) {
    setGeneratingId(inv.id)
    try {
      await invoices.generatePdf(inv.id)
      toast({ body: t('pdf_retry'), type: 'info' })
      setTimeout(async () => {
        const updated = await invoices.list(undefined, 'past_due')
        setOverdueInvoices(updated)
      }, 3000)
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('pdf_generate_error'), type: 'error' })
    } finally {
      setGeneratingId(null)
    }
  }

  useEffect(() => {
    Promise.all([
      subscriptions.list(),
      plansApi.list(),
      adminTenants.list(),
      invoices.list(undefined, 'past_due'),
    ])
      .then(([s, p, t, inv]) => {
        setSubs(s)
        setPlans(p)
        setTenants(t.map((ten) => ({ id: ten.id, nom: ten.nom })))
        setOverdueInvoices(inv)
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('error')))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── MRR breakdown ──────────────────────────────────────────────────
  const mrrByPlan: Record<string, number> = {}
  let totalMRR = 0
  for (const s of subs) {
    if (s.statut !== 'active') continue
    const price = s.prixCents ?? 0
    totalMRR += price
    const key = s.plan_id
    mrrByPlan[key] = (mrrByPlan[key] ?? 0) + price
  }

  // ── Subscription health ────────────────────────────────────────────
  const subStats = {
    active: subs.filter((s) => s.statut === 'active').length,
    past_due: subs.filter((s) => s.statut === 'past_due').length,
    canceled: subs.filter((s) => s.statut === 'canceled').length,
    expired: subs.filter((s) => s.statut === 'expired').length,
  }

  const planNames: Record<string, string> = {}
  for (const p of plans) planNames[p.id] = p.nom

  const tenantNames: Record<string, string> = {}
  for (const ten of tenants) tenantNames[ten.id] = ten.nom

  // ── Churn risk tenants ──────────────────────────────────────────────
  const churnRiskSubs = subs.filter(
    (s) => s.statut === 'past_due' || s.statut === 'canceled',
  )

  // ── Overdue invoice total ──────────────────────────────────────────
  const overdueTotal = overdueInvoices.reduce((s, inv) => s + (inv.montantCents ?? 0), 0)

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={8} />
      </div>
    )
  }

  if (error) return <InlineError message={error} />

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <PageHeader
        title={t('billing', 'Facturation')}
        subtitle={t('billing_subtitle', 'MRR, santé des abonnements et facturation')}
        icon={<CreditCard size={20} style={{ color: 'var(--color-text-primary)' }} />}
      />

      {/* MRR hero */}
      <div
        className="rounded-xl border p-6"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
              {t('mrr_reel', 'MRR réel')}
            </p>
            <p className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {formatEUR(totalMRR)}
              <span className="text-base font-normal text-muted-foreground">/{t('month', 'mois')}</span>
            </p>
          </div>
          <TrendingUp size={28} style={{ color: 'var(--color-accent)' }} />
        </div>

        {/* Breakdown by plan */}
        <div className="flex flex-col gap-2">
          {Object.entries(mrrByPlan)
            .sort(([, a], [, b]) => b - a)
            .map(([planId, amount]) => {
              const pct = totalMRR > 0 ? Math.round((amount / totalMRR) * 100) : 0
              const color =
                planId === plans.find((p) => p.code === 'starter')?.id
                  ? 'var(--color-plan-starter)'
                  : planId === plans.find((p) => p.code === 'pro')?.id
                  ? 'var(--color-plan-pro)'
                  : 'var(--color-plan-scale)'
              return (
                <div key={planId} className="flex items-center gap-3">
                  <div className="min-w-[100px] text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {planNames[planId] ?? planId.slice(0, 8)}
                  </div>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                  <div className="min-w-[60px] text-right text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {formatEUR(amount)}
                  </div>
                  <div className="min-w-[40px] text-right text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {pct}%
                  </div>
                </div>
              )
            })}
          {Object.keys(mrrByPlan).length === 0 && (
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {t('no_active_subs', 'Aucun abonnement actif')}
            </p>
          )}
        </div>
      </div>

      {/* Subscription health cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label={t('subs_active', 'Abonnements actifs')}
          value={String(subStats.active)}
          deltaLabel={t('subs_active_hint', 'Aucun problème de paiement')}
          icon={<CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />}
        />
        <KpiCard
          label={t('subs_past_due', 'En retard de paiement')}
          value={String(subStats.past_due)}
          deltaLabel={t('subs_past_due_hint', 'À relancer')}
          icon={<AlertTriangle size={16} style={{ color: 'var(--color-warning)' }} />}
        />
        <KpiCard
          label={t('subs_canceled', 'Annulés')}
          value={String(subStats.canceled)}
          deltaLabel={t('subs_canceled_hint', 'Surveillance')}
          icon={<XCircle size={16} style={{ color: 'var(--color-danger)' }} />}
        />
        <KpiCard
          label={t('subs_expired', 'Expirés')}
          value={String(subStats.expired)}
          icon={<Clock size={16} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Overdue invoices */}
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {t('overdue_invoices', 'Factures impayées')}
            </h2>
            {overdueTotal > 0 && (
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--color-danger)' }}
              >
                {formatEUR(overdueTotal)}
              </span>
            )}
          </div>

          {overdueInvoices.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {t('no_overdue', 'Aucune facture en retard')}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {overdueInvoices.slice(0, 8).map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background-surface)' }}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span
                      className="text-sm font-medium truncate"
                      style={{ color: 'var(--color-text-primary)' }}
                      title={tenantNames[inv.tenant_id] ?? inv.tenant_id}
                    >
                      {tenantNames[inv.tenant_id] ?? inv.tenant_id.slice(0, 8)}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {inv.numero} · {formatDate(inv.dateEcheance)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      {formatEUR(inv.montantCents)}
                    </span>
                    {inv.pdfUrl ? (
                      <button
                        onClick={() => handleDownload(inv)}
                        className="flex items-center justify-center rounded p-1 transition-colors hover:bg-black/5"
                        title={t('action_download_pdf')}
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        <Download size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleGeneratePdf(inv)}
                        disabled={generatingId === inv.id}
                        className="flex items-center justify-center rounded p-1 transition-colors hover:bg-black/5 disabled:opacity-50"
                        title={t('action_generate_pdf')}
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {generatingId === inv.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <FileText size={14} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {overdueInvoices.length > 8 && (
                <p className="text-xs text-center" style={{ color: 'var(--color-text-secondary)' }}>
                  +{overdueInvoices.length - 8} {t('more', 'autres')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Churn risk */}
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {t('churn_risk', 'Risque de désabonnement')}
            </h2>
            <span
              className="flex items-center gap-1 text-xs rounded px-2 py-1"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
                color: 'var(--color-danger)',
              }}
            >
              <AlertTriangle size={11} />
              {churnRiskSubs.length}
            </span>
          </div>

          {churnRiskSubs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <CheckCircle2 size={24} style={{ color: 'var(--color-success)' }} />
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {t('no_churn_risk', 'Aucun risque détecté')}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {churnRiskSubs.slice(0, 8).map((s) => {
                const info = STATUT_LABELS[s.statut]
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background-surface)' }}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span
                        className="text-sm font-medium truncate"
                        style={{ color: 'var(--color-text-primary)' }}
                        title={tenantNames[s.tenant_id] ?? s.tenant_id}
                      >
                        {tenantNames[s.tenant_id] ?? s.tenant_id.slice(0, 8)}
                      </span>
                      <div className="flex items-center gap-1">
                        <span style={{ color: info.color }}>{info.icon}</span>
                        <span className="text-xs" style={{ color: info.color }}>
                          {info.label}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          · {planNames[s.plan_id] ?? s.plan_id.slice(0, 8)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ms-2">
                      {s.statut === 'past_due' ? (
                        <ArrowDownRight size={14} style={{ color: 'var(--color-warning)' }} />
                      ) : (
                        <ArrowUpRight size={14} style={{ color: 'var(--color-danger)' }} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
