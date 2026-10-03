'use client'

import { useState, useEffect } from 'react'
import { Building2, Users, Globe, TrendingUp, AlertTriangle, Clock } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { InlineError } from '@/components/ui/inline-error'
import { KpiCard } from '@/components/composite/kpi-card'
import { adminTenants, type DashboardStats } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'

function formatMRR(cents: number) {
  if (cents >= 10000_00) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(cents / 100)
  }
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export default function DashboardPage() {
  const { t } = useI18n()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminTenants.getDashboardStats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-16"><Spinner size={8} /></div>
  if (error) return <InlineError message={error} />
  if (!stats) return null

  const mrr = stats.mrr_estime_cents ?? 0
  const arpu = stats.tenants_actifs > 0 ? Math.round(mrr / stats.tenants_actifs) : 0

  return (
    <div className="flex flex-col gap-6">
      {/* Alerts banner */}
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
            {' '}tenant(s) inactif(s) — vérifiez leur statut.
          </span>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Tenants actifs"
          value={String(stats.tenants_actifs)}
          icon={<Building2 size={16} />}
        />
        <KpiCard
          label="Utilisateurs"
          value={String(stats.users_total)}
          icon={<Users size={16} />}
        />
        <KpiCard
          label="Sites"
          value={String(stats.sites_total)}
          icon={<Globe size={16} />}
        />
        <KpiCard
          label="MRR estimé"
          value={formatMRR(mrr)}
          icon={<TrendingUp size={16} />}
        />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KpiCard
          label="ARPU"
          value={formatMRR(arpu)}
          deltaLabel="par tenant actif"
        />
        <KpiCard
          label="Nouveaux (30j)"
          value={String(stats.nouveaux_tenants_30j)}
          icon={<Clock size={16} />}
        />
        <KpiCard
          label="Total tenants"
          value={String(stats.tenants_total)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Plan distribution */}
        <div
          className="rounded-lg border p-5 space-y-4"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Répartition par plan
          </h2>
          <PlanDistribution data={stats.tenants_par_plan} />
        </div>

        {/* Recent audit */}
        <div
          className="rounded-lg border p-5 space-y-4"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Activité récente
          </h2>
          <AuditFeed logs={stats.recent_audit} />
        </div>
      </div>

      {/* Recent signups */}
      <div
        className="rounded-lg border p-5 space-y-4"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Dernières inscriptions
        </h2>
        <RecentSignups tenants={stats.recent_signups} />
      </div>
    </div>
  )
}

function PlanDistribution({ data }: { data: Record<string, number> }) {
  const total = Object.values(data).reduce((s, n) => s + n, 0)
  if (total === 0) {
    return <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Aucune donnée.</p>
  }

  const PLAN_COLORS: Record<string, string> = {
    starter: 'var(--color-accent)',
    pro: '#6366f1',
    scale: '#ec4899',
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
