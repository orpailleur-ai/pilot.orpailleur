'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Building2,
  Users,
  Globe,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
} from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { PageHeader } from '@/components/layout/page-header'
import { InlineError } from '@/components/ui/inline-error'
import { KpiCard } from '@/components/composite/kpi-card'
import { BarChart } from '@/components/composite/bar-chart'
import { adminTenants, type DashboardStats } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'

function formatMRR(cents: number) {
  if (cents >= 10000_00) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(cents / 100)
  }
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

type Preset = '7' | '30' | '90' | '365'

const PRESETS: Array<{ value: Preset; label: string }> = [
  { value: '7', label: '7 j' },
  { value: '30', label: '30 j' },
  { value: '90', label: '90 j' },
  { value: '365', label: '12 mois' },
]

type Filtres = {
  preset: Preset | null
  from: string
  to: string
  plan: string
  statut: string
}

const FILTRES_INITIAUX: Filtres = {
  preset: '30',
  from: '',
  to: '',
  plan: '',
  statut: '',
}

function statsParams(f: Filtres) {
  // Les dates explicites priment sur le preset (l'API applique le même
  // ordre de priorité, mais on n'envoie les deux familles jamais melangé :
  // un preset retire les dates, une date retire le preset).
  const params: Parameters<typeof adminTenants.getDashboardStats>[0] = {
    plan: f.plan || undefined,
    statut: f.statut || undefined,
  }
  if (f.from && f.to) {
    params.from = f.from
    params.to = f.to
  } else if (f.preset) {
    params.days = Number(f.preset)
  }
  return params
}

export default function DashboardPage() {
  const { t } = useI18n()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtres, setFiltres] = useState<Filtres>(FILTRES_INITIAUX)

  const charger = useCallback((f: Filtres) => {
    setLoading(true)
    adminTenants
      .getDashboardStats(statsParams(f))
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : t('error')))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    charger(FILTRES_INITIAUX)
  }, [charger])

  function maj(partial: Partial<Filtres>) {
    const f = { ...filtres, ...partial }
    setFiltres(f)
    charger(f)
  }

  const mrr = stats?.mrr_estime_cents ?? 0
  const arpu =
    stats && stats.tenants_actifs > 0 ? Math.round(mrr / stats.tenants_actifs) : 0
  const sante = stats?.subs_sante
  const impayees = stats?.factures_impayees ?? []
  const totalImpayees = impayees.reduce((s, i) => s + (i.montant_cents ?? 0), 0)

  return (
    <>
      <PageHeader
        title={t('dashboard', 'Tableau de bord')}
        subtitle={t('billing_subtitle', 'Tenant·tes, facturation et activité de la plateforme')}
        icon={<TrendingUp size={20} style={{ color: 'var(--color-text-primary)' }} />}
      />

      {/* ── Fenêtre + filtres ────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-end gap-3 rounded-lg border p-4"
        style={{ backgroundColor: 'var(--color-background-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-1">
          {PRESETS.map((p) => {
            const dateActive = !!(filtres.from && filtres.to)
            const actif =
              !dateActive && (filtres.preset === p.value || (filtres.preset === null && p.value === '30'))
            return (
              <button
                key={p.value}
                onClick={() => maj({ preset: p.value, from: '', to: '' })}
                className="rounded px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  backgroundColor: actif ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)' : 'transparent',
                  color: actif ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  border: `1px solid ${actif ? 'color-mix(in srgb, var(--color-accent) 40%, transparent)' : 'var(--color-border)'}`,
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>

        <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {t('date_from', 'Du')}
          <input
            type="date"
            value={filtres.from}
            max={filtres.to || undefined}
            onChange={(e) => maj({ from: e.target.value, preset: null })}
            className="rounded border bg-transparent px-2 py-1.5 text-sm"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </label>
        <span className="text-xs pb-2" style={{ color: 'var(--color-text-secondary)' }}>→</span>
        <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {t('date_to', 'Au')}
          <input
            type="date"
            value={filtres.to}
            min={filtres.from || undefined}
            onChange={(e) => maj({ to: e.target.value, preset: null })}
            className="rounded border bg-transparent px-2 py-1.5 text-sm"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {t('filter_plan', 'Plan')}
          <select
            value={filtres.plan}
            onChange={(e) => maj({ plan: e.target.value })}
            className="rounded border bg-transparent px-2 py-1.5 text-sm"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <option value="">{t('filter_plan_all', 'Tous les plans')}</option>
            {(stats?.plans_disponibles ?? []).map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {t('filter_statut', 'Statut')}
          <select
            value={filtres.statut}
            onChange={(e) => maj({ statut: e.target.value })}
            className="rounded border bg-transparent px-2 py-1.5 text-sm"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <option value="">{t('all_masculine', 'Tous')}</option>
            <option value="active">{t('active', 'Actif')}</option>
            <option value="inactive">{t('inactive', 'Inactif')}</option>
          </select>
        </label>

        {filtres.plan || filtres.statut || filtres.from ? (
          <button
            onClick={() => {
              setFiltres(FILTRES_INITIAUX)
              charger(FILTRES_INITIAUX)
            }}
            className="pb-2 text-xs underline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('reset', 'Réinitialiser')}
          </button>
        ) : null}
      </div>

      {loading && !stats ? (
        <div className="flex justify-center py-16"><Spinner size={8} /></div>
      ) : error ? (
        <InlineError message={error} />
      ) : !stats ? null : (
        <>
          {/* Alertes */}
          {(stats.alerts?.tenant_inactive ?? 0) > 0 && (
            <div
              className="flex items-center gap-3 rounded-lg border p-4 text-sm"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-warning) 8%, transparent)',
                borderColor: 'color-mix(in srgb, var(--color-warning) 25%, var(--color-border))',
                color: 'var(--color-text-secondary)',
              }}
            >
              <AlertTriangle size={16} style={{ color: 'var(--color-warning)' }} />
              <span>
                <strong style={{ color: 'var(--color-warning)' }}>
                  {stats.alerts.tenant_inactive}
                </strong>
                {' '}
                {t('tenant_inactive_alert', 'tenant(s) inactif(s) — vérifiez leur statut.')}
              </span>
            </div>
          )}

          {/* KPI row 1 — vitalité */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label={t('mrr_reel', 'MRR réel')}
              value={formatMRR(mrr)}
              deltaLabel={t('active_subs_hint', 'abonnements actifs')}
              icon={<CreditCard size={16} />}
            />
            <KpiCard
              label={t('arpu', 'ARPU')}
              value={formatMRR(arpu)}
              deltaLabel={t('per_active_tenant', 'par tenant actif')}
            />
            <KpiCard
              label={t('tenants_actifs_lbl', 'Tenants actifs')}
              value={String(stats.tenants_actifs)}
              icon={<Building2 size={16} />}
            />
            <KpiCard
              label={t('new_tenants_period', `Nouveaux (${stats.periode.jours} j)`)}
              value={String(stats.nouveaux_tenants)}
              icon={<Clock size={16} />}
            />
          </div>

          {/* KPI row 2 — plate-forme + sante */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label={t('users_lbl', 'Utilisateurs')}
              value={String(stats.users_total)}
              icon={<Users size={16} />}
            />
            <KpiCard
              label={t('sites_lbl', 'Sites')}
              value={String(stats.sites_total)}
              icon={<Globe size={16} />}
            />
            <KpiCard
              label={t('subs_past_due', 'Abonnements en retard')}
              value={String(sante?.en_retard ?? 0)}
              deltaLabel={
                (sante?.en_retard ?? 0) > 0
                  ? t('chase_actions', 'À relancer')
                  : undefined
              }
              icon={<AlertTriangle size={16} style={{ color: 'var(--color-warning)' }} />}
            />
            <KpiCard
              label={t('subs_canceled', 'Abonnements annulés')}
              value={String(sante?.annules ?? 0)}
              icon={<XCircle size={16} />}
            />
          </div>

          {/* Séries temporelles */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div
              className="rounded-lg border p-5 space-y-3"
              style={{ backgroundColor: 'var(--color-background-surface)', borderColor: 'var(--color-border)' }}
            >
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {t('series_signups', 'Nouvelles inscriptions')}
              </h2>
              <BarChart
                series={(stats.series ?? []).map((r) => ({ label: r.jour, values: [r.crees] }))}
                colors={['var(--color-accent)']}
                height={160}
              />
            </div>
            <div
              className="rounded-lg border p-5 space-y-3"
              style={{ backgroundColor: 'var(--color-background-surface)', borderColor: 'var(--color-border)' }}
            >
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {t('series_revenue', 'Encaissé (factures payées)')}
              </h2>
              <BarChart
                series={(stats.series ?? []).map((r) => ({ label: r.jour, values: [r.paye_cents] }))}
                colors={['var(--color-success)']}
                formatValue={(n) => formatMRR(n)}
                height={160}
              />
            </div>
          </div>

          {/* Répartition par plan + santé abonnements */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div
              className="rounded-lg border p-5 space-y-4"
              style={{ backgroundColor: 'var(--color-background-surface)', borderColor: 'var(--color-border)' }}
            >
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {t('plan_distribution', 'Répartition par plan')}
              </h2>
              <PlanDistribution data={stats.tenants_par_plan} />
            </div>

            <div
              className="rounded-lg border p-5 space-y-4"
              style={{ backgroundColor: 'var(--color-background-surface)', borderColor: 'var(--color-border)' }}
            >
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {t('mrr_by_plan', 'MRR par plan')}
              </h2>
              <MrrParPlan
                rows={stats.mrr_par_plan}
                total={stats.mrr_estime_cents}
              />
            </div>
          </div>

          {/* Santé abonnements + impayées */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div
              className="rounded-lg border p-5 space-y-4"
              style={{ backgroundColor: 'var(--color-background-surface)', borderColor: 'var(--color-border)' }}
            >
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {t('subs_health', 'Santé des abonnements')}
              </h2>
              <div className="flex flex-col gap-3">
                <SubBar label={t('subs_active', 'Actifs')} value={sante?.actifs ?? 0} total={abonnementsTotal(sante)} color="var(--color-success)" />
                <SubBar label={t('subs_past_due', 'En retard')} value={sante?.en_retard ?? 0} total={abonnementsTotal(sante)} color="var(--color-warning)" />
                <SubBar label={t('subs_canceled', 'Annulés')} value={sante?.annules ?? 0} total={abonnementsTotal(sante)} color="var(--color-danger)" />
                <SubBar label={t('subs_expired', 'Expirés')} value={sante?.expires ?? 0} total={abonnementsTotal(sante)} color="var(--color-text-secondary)" />
              </div>
            </div>

            <div
              className="rounded-lg border p-5 space-y-4"
              style={{ backgroundColor: 'var(--color-background-surface)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {t('overdue_invoices', 'Factures impayées')}
                </h2>
                {totalImpayees > 0 && (
                  <span className="text-sm font-medium" style={{ color: 'var(--color-danger)' }}>
                    {formatMRR(totalImpayees)}
                  </span>
                )}
              </div>
              {impayees.length === 0 ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('no_overdue', 'Aucune facture en retard')}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {impayees.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background-surface)' }}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span
                          className="text-sm font-medium truncate"
                          style={{ color: 'var(--color-text-primary)' }}
                          title={inv.tenant_nom}
                        >
                          {inv.tenant_nom}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {inv.numero}
                          {inv.date_echeance
                            ? ` · ${t('due_on', 'échéance')} ${new Date(inv.date_echeance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`
                            : ''}
                        </span>
                      </div>
                      <span className="text-sm font-semibold flex-shrink-0" style={{ color: 'var(--color-danger)' }}>
                        {formatMRR(inv.montant_cents)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Act + signups */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div
              className="rounded-lg border p-5 space-y-4"
              style={{ backgroundColor: 'var(--color-background-surface)', borderColor: 'var(--color-border)' }}
            >
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {t('recent_activity', 'Activité récente')}
              </h2>
              <AuditFeed logs={stats.recent_audit} />
            </div>
            <div
              className="rounded-lg border p-5 space-y-4"
              style={{ backgroundColor: 'var(--color-background-surface)', borderColor: 'var(--color-border)' }}
            >
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {t('recent_signups', 'Dernières inscriptions')}
              </h2>
              <RecentSignups tenants={stats.recent_signups} />
            </div>
          </div>
        </>
      )}
    </>
  )
}

function abonnementsTotal(s: DashboardStats['subs_sante'] | undefined): number {
  if (!s) return 0
  return s.actifs + s.en_retard + s.annules + s.expires
}

function SubBar({
  label,
  value,
  total,
  color,
}: {
  label: string
  value: number
  total: number
  color: string
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-[110px] text-sm" style={{ color: 'var(--color-text-secondary)' }}>{label}</div>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="min-w-[52px] text-right text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </div>
    </div>
  )
}

function MrrParPlan({
  rows,
  total,
}: {
  rows: DashboardStats['mrr_par_plan']
  total: number
}) {
  if (!rows || rows.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Aucun abonnement actif.
      </p>
    )
  }
  const PLAN_COLORS: Record<string, string> = {
    starter: 'var(--color-plan-starter)',
    pro: 'var(--color-plan-pro)',
    scale: 'var(--color-plan-scale)',
  }
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => {
        const pct = total > 0 ? Math.round((r.mrr_cents / total) * 100) : 0
        return (
          <div key={r.plan} className="flex items-center gap-3">
            <div className="min-w-[100px] text-sm capitalize" style={{ color: 'var(--color-text-secondary)' }}>
              {r.plan}
            </div>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  backgroundColor: PLAN_COLORS[r.plan] ?? 'var(--color-accent)',
                }}
              />
            </div>
            <div className="min-w-[70px] text-right text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {formatMRR(r.mrr_cents)}
            </div>
            <div className="min-w-[60px] text-right text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {r.tenants} tenant{r.tenants > 1 ? 's' : ''}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PlanDistribution({ data }: { data: Record<string, number> }) {
  const total = Object.values(data).reduce((s, n) => s + n, 0)
  if (total === 0) {
    return <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Aucune donnée.</p>
  }

  const PLAN_COLORS: Record<string, string> = {
    starter: 'var(--color-plan-starter)',
    pro: 'var(--color-plan-pro)',
    scale: 'var(--color-plan-scale)',
  }

  return (
    <div className="flex flex-col gap-3">
      {Object.entries(data).map(([plan, count]) => {
        const pct = Math.round((count / total) * 100)
        const color = PLAN_COLORS[plan] ?? 'var(--color-accent)'
        return (
          <div key={plan} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>
                {plan}
              </span>
              <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                {count} ({pct}%)
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AuditFeed({ logs }: { logs: DashboardStats['recent_audit'] }) {
  if (!logs || logs.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Aucune activité récente.</p>
  }
  return (
    <ul className="flex flex-col gap-2">
      {logs.map((log) => (
        <li key={log.id} className="flex items-start justify-between gap-3 text-sm">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span
              className="font-mono text-xs rounded px-1.5 py-0.5 inline-block"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
                color: 'var(--color-accent)',
              }}
            >
              {log.action}
            </span>
            <span className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
              {log.user_id.slice(0, 8)}…
            </span>
          </div>
          <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
            {new Date(log.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </li>
      ))}
    </ul>
  )
}

function RecentSignups({ tenants }: { tenants: DashboardStats['recent_signups'] }) {
  if (!tenants || tenants.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Aucun nouveau tenant.</p>
  }
  return (
    <div className="flex flex-col gap-2">
      {tenants.map((t) => (
        <div key={t.id} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Building2 size={14} style={{ color: 'var(--color-accent)' }} />
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{t.nom}</span>
            <span
              className="text-xs rounded px-1.5 py-0.5"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
                color: 'var(--color-accent)',
              }}
            >
              {t.plan}
            </span>
          </div>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {new Date(t.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      ))}
    </div>
  )
}
