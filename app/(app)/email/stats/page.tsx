'use client'

import { useCallback, useEffect, useState } from 'react'
import { Mail, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import { Badge, Button, Spinner, useToast } from '@astryxdesign/core'
import { PageHeader } from '@/components/layout/page-header'
import { DataTable, type Column } from '@/components/ui/data-table'
import { InlineError } from '@/components/ui/inline-error'
import { useI18n } from '@/lib/i18n'
import {
  getEmailStatsAdmin,
  refreshEmailStats,
  type EmailStatsRow,
} from '@/lib/email-client'

const SCOPE_LABELS: Record<string, string> = {
  commande_envoyee: 'email_scope_commande_envoyee',
  facture_impayee: 'email_scope_facture_impayee',
  reception_validated: 'email_scope_reception_validated',
  stock_bas: 'email_scope_stock_bas',
  abonnement_renouvele: 'email_scope_abonnement_renouvele',
  notif_generic: 'email_scope_notif_generic',
}

export default function EmailStatsPage() {
  const { t } = useI18n()
  const toast = useToast()

  const [stats, setStats] = useState<EmailStatsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const charger = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await getEmailStatsAdmin({ days: 30 })
      setStats(rows)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('error'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { void charger() }, [charger])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await refreshEmailStats()
      void charger()
      toast({ body: t('email_stats_refreshed'), type: 'info' })
    } catch (e: unknown) {
      toast({ body: e instanceof Error ? e.message : t('error'), type: 'error' })
    } finally {
      setRefreshing(false)
    }
  }

  const columns: Column<EmailStatsRow>[] = [
    {
      key: 'jour',
      header: t('email_stats_day'),
      render: (row) => new Date(row.jour).toLocaleDateString('fr-FR'),
    },
    {
      key: 'scope',
      header: t('email_templates_scope'),
      render: (row) => t(SCOPE_LABELS[row.scope] ?? row.scope),
    },
    {
      key: 'sent_count',
      header: t('email_stats_sent'),
      render: (row) => (
        <span className="flex items-center gap-1">
          <TrendingUp size={14} style={{ color: 'var(--color-success, green)' }} />
          {row.sent_count}
        </span>
      ),
    },
    {
      key: 'failed_count',
      header: t('email_stats_failed'),
      render: (row) =>
        row.failed_count > 0 ? (
          <span className="flex items-center gap-1">
            <TrendingDown size={14} style={{ color: 'var(--color-error, red)' }} />
            {row.failed_count}
          </span>
        ) : (
          0
        ),
    },
    {
      key: 'pending_count',
      header: t('email_stats_pending'),
      render: (row) =>
        row.pending_count > 0 ? (
          <Badge variant="warning" label={String(row.pending_count)} />
        ) : (
          0
        ),
    },
    {
      key: 'total_count',
      header: t('email_stats_total'),
      render: (row) => row.total_count,
    },
    {
      key: 'avg_smtp_ms',
      header: t('email_stats_avg_ms'),
      render: (row) =>
        row.avg_smtp_ms != null ? `${Math.round(row.avg_smtp_ms)} ms` : '—',
    },
  ]

  // Totaux
  const totals = stats.reduce(
    (acc, r) => ({
      sent: acc.sent + r.sent_count,
      failed: acc.failed + r.failed_count,
      pending: acc.pending + r.pending_count,
    }),
    { sent: 0, failed: 0, pending: 0 },
  )

  return (
    <>
      <PageHeader
        title={t('email_stats_title')}
        icon={<Mail size={20} style={{ color: 'var(--color-text-primary)' }} />}
        action={
          <Button
            label={refreshing ? t('loading') : t('email_stats_refresh')}
            variant="secondary"
            icon={refreshing ? <Spinner size="sm" /> : <RefreshCw size={15} />}
            isLoading={refreshing}
            onClick={handleRefresh}
          />
        }
      />

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: t('email_stats_sent'), value: totals.sent, color: 'var(--color-success, green)' },
          { label: t('email_stats_failed'), value: totals.failed, color: totals.failed > 0 ? 'var(--color-error, red)' : 'var(--color-text-secondary)' },
          { label: t('email_stats_pending'), value: totals.pending, color: totals.pending > 0 ? 'var(--color-warning, orange)' : 'var(--color-text-secondary)' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-lg border px-4 py-3"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
          >
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
            <p className="mt-1 text-2xl font-semibold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {error ? (
        <InlineError message={error} />
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="md" />
        </div>
      ) : stats.length === 0 ? (
        <p className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
          {t('email_stats_empty')}
        </p>
      ) : (
        <DataTable columns={columns} rows={stats} rowKey={(row) => `${row.jour}-${row.scope}`} />
      )}
    </>
  )
}
