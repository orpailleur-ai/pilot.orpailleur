'use client'

import { useState, useEffect } from 'react'
import {
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
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
import { KpiCard } from '@/components/composite/kpi-card'
import { DataTable, type Column } from '@/components/ui/data-table'
import { useRouter } from 'next/navigation'

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

const STATUT_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active: { label: 'Actif', color: 'var(--color-success, #22c55e)', icon: <CheckCircle2 size={14} /> },
  past_due: { label: 'En retard', color: 'var(--color-warning, #f59e0b)', icon: <AlertTriangle size={14} /> },
  canceled: { label: 'Annulé', color: 'var(--color-destructive, #ef4444)', icon: <XCircle size={14} /> },
  expired: { label: 'Expiré', color: 'var(--color-text-secondary)', icon: <Clock size={14} /> },
}

export default function BillingPage() {
  const { t } = useI18n()
  const router = useRouter()
  const [subs, setSubs] = useState<Subscription[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [tenants, setTenants] = useState<{ id: string; nom: string }[]>([])
  const [overdueInvoices, setOverdueInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {t('billing', 'Facturation')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {t('billing_subtitle', 'MRR, santé des abonnements et facturation')}
          </p>
        </div>
        <CreditCard size={22} style={{ color: 'var(--color-accent)' }} />
      </div>

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
                  ? 'var(--color-accent)'
                  : planId === plans.find((p) => p.code === 'pro')?.id
                  ? '#6366f1'
                  : '#ec4899'
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
          icon={<CheckCircle2 size={16} style={{ color: '#22c55e' }} />}
        />
        <KpiCard
          label={t('subs_past_due', 'En retard de paiement')}
          value={String(subStats.past_due)}
          deltaLabel={t('subs_past_due_hint', 'À relancer')}
          icon={<AlertTriangle size={16} style={{ color: '#f59e0b' }} />}
        />
        <KpiCard
          label={t('subs_canceled', 'Annulés')}
          value={String(subStats.canceled)}
          deltaLabel={t('subs_canceled_hint', 'Surveillance')}
          icon={<XCircle size={16} style={{ color: '#ef4444' }} />}
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
                style={{ color: 'var(--color-destructive, #ef4444)' }}
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
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
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
                  <span
                    className="text-sm font-semibold flex-shrink-0 ms-2"
                    style={{ color: 'var(--color-destructive, #ef4444)' }}
                  >
                    {formatEUR(inv.montantCents)}
                  </span>
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
                backgroundColor: 'color-mix(in srgb, var(--color-destructive, #ef4444) 10%, transparent)',
                color: 'var(--color-destructive, #ef4444)',
              }}
            >
              <AlertTriangle size={11} />
              {churnRiskSubs.length}
            </span>
          </div>

          {churnRiskSubs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <CheckCircle2 size={24} style={{ color: '#22c55e' }} />
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
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
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
                        <ArrowDownRight size={14} style={{ color: '#f59e0b' }} />
                      ) : (
                        <ArrowUpRight size={14} style={{ color: '#ef4444' }} />
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
