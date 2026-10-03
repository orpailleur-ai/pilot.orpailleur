'use client'

import { Building2, Users, Globe, ShoppingCart, Clock } from 'lucide-react'
import { useTenantDetail } from '@/components/composite/tenant-detail-context'
import { KpiCard } from '@/components/composite/kpi-card'
import { InlineError } from '@/components/ui/inline-error'
import { Spinner } from '@/components/ui/spinner'
import { DataTable, type Column } from '@/components/ui/data-table'
import { useI18n } from '@/lib/i18n'

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  scale: 'Scale',
}

export default function TenantOverviewPage() {
  const { t } = useI18n()
  const { tenant, stats, isLoading, error } = useTenantDetail()

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={8} />
      </div>
    )
  }

  if (error) {
    return <InlineError message={error} />
  }

  if (!tenant || !stats) return null

  const usageSitesPct = Math.min(stats.usage.sites_pct, 100)
  const usageUsersPct = Math.min(stats.usage.users_pct, 100)

  return (
    <div className="flex flex-col gap-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Sites actifs"
          value={`${stats.counts.sites_actifs} / ${tenant.nb_sites_max}`}
          icon={<Globe size={16} />}
        />
        <KpiCard
          label="Utilisateurs"
          value={`${stats.counts.users_actifs} / ${tenant.nb_users_max}`}
          icon={<Users size={16} />}
        />
        <KpiCard
          label="Postes"
          value={stats.counts.postes}
          icon={<ShoppingCart size={16} />}
        />
        <KpiCard
          label="Créé le"
          value={new Date(tenant.createdAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
          icon={<Clock size={16} />}
        />
      </div>

      {/* Usage bars */}
      <div
        className="rounded-lg border p-5 space-y-4"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <h2
          className="text-sm font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Utilisation du plan {PLAN_LABELS[tenant.plan] ?? tenant.plan}
        </h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: 'var(--color-text-secondary)' }}>
              Sites ({stats.counts.sites} / {tenant.nb_sites_max})
            </span>
            <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {usageSitesPct}%
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--color-border)' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${usageSitesPct}%`,
                backgroundColor:
                  usageSitesPct >= 90
                    ? 'var(--color-danger)'
                    : usageSitesPct >= 70
                    ? 'var(--color-warning)'
                    : 'var(--color-accent)',
              }}
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span style={{ color: 'var(--color-text-secondary)' }}>
              Utilisateurs ({stats.counts.users} / {tenant.nb_users_max})
            </span>
            <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {usageUsersPct}%
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--color-border)' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${usageUsersPct}%`,
                backgroundColor:
                  usageUsersPct >= 90
                    ? 'var(--color-danger)'
                    : usageUsersPct >= 70
                    ? 'var(--color-warning)'
                    : 'var(--color-accent)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div
        className="rounded-lg border p-5"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <h2
          className="text-sm font-semibold mb-4"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Activité récente
        </h2>

        {stats.recent_activity.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Aucune activité récente.
          </p>
        ) : (
          <DataTable
            columns={activityColumns(t)}
            rows={stats.recent_activity}
            rowKey={(row) => row.id}
          />
        )}
      </div>
    </div>
  )
}

function activityColumns(t: ReturnType<typeof useI18n>['t']) {
  return [
    {
      key: 'action',
      header: 'Action',
      render: (row: { action: string }) => (
        <span
          className="font-mono text-xs rounded px-1.5 py-0.5"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
            color: 'var(--color-accent)',
          }}
        >
          {row.action}
        </span>
      ),
    },
    {
      key: 'user_id',
      header: 'User ID',
      mobile: 'inline',
      render: (row: { user_id: string }) => (
        <span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>
          {row.user_id.slice(0, 8)}…
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Date',
      align: 'end' as const,
      render: (row: { created_at: string }) => (
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {new Date(row.created_at).toLocaleString('fr-FR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
  ] satisfies Column<{ id: string; action: string; user_id: string; created_at: string }>[]
}
