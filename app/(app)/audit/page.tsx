'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { auditLogs, clearToken, type AuditLog } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'
import { PageHeader } from '@/components/layout/page-header'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/components/providers/auth-context'

const ACTION_LABELS: Record<string, string> = {
  // Tenant
  'tenant.create': 'Création tenant',
  'tenant.update': 'Modification tenant',
  'tenant.delete': 'Suppression tenant',
  'tenant.activate': 'Activation tenant',
  'tenant.deactivate': 'Désactivation tenant',
  // User
  'user.create': 'Création utilisateur',
  'user.update': 'Modification utilisateur',
  'user.delete': 'Suppression utilisateur',
  'user.assign_role': 'Affectation rôle',
  'user.remove_role': 'Retrait rôle',
  // Subscription
  'subscription.create': 'Nouvel abonnement',
  'subscription.update': 'Modification abonnement',
  'subscription.cancel': 'Annulation abonnement',
  'subscription.expire': 'Expiration abonnement',
  // Plan
  'plan.create': 'Création plan',
  'plan.update': 'Modification plan',
  'plan.delete': 'Suppression plan',
  // Invoice
  'invoice.create': 'Création facture',
  'invoice.paid': 'Paiement facture',
  'invoice.overdue': 'Facture en retard',
  // Auth
  'auth.login': 'Connexion admin',
  'auth.logout': 'Déconnexion admin',
  'auth_impersonate': 'Emprunt d\'identité',
}

const KNOWN_ACTIONS = Object.keys(ACTION_LABELS).sort()

function formatMeta(meta: Record<string, unknown>): string {
  const entries = Object.entries(meta)
  if (entries.length === 0) return '—'

  const parts: string[] = []
  for (const [k, v] of entries) {
    if (v === null || v === undefined || v === '') continue
    if (k === 'tenant_id' || k === 'user_id' || k === 'subscription_id' || k === 'plan_id' || k === 'invoice_id') {
      parts.push(`${k}: ${String(v).slice(0, 8)}…`)
    } else if (typeof v === 'string') {
      parts.push(`${k}: ${v.slice(0, 30)}`)
    } else {
      parts.push(`${k}: ${JSON.stringify(v).slice(0, 30)}`)
    }
  }
  return parts.join(' · ') || '—'
}

const fmt = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const PAGE_SIZE = 25

interface AuditRow {
  id: string
  action: string
  actionLabel: string
  metadata: Record<string, unknown>
  metaHuman: string
  created_at: string
}

function toRow(log: AuditLog): AuditRow {
  return {
    id: log.id,
    action: log.action,
    actionLabel: ACTION_LABELS[log.action] ?? log.action,
    metadata: log.metadata ?? {},
    metaHuman: formatMeta(log.metadata ?? {}),
    created_at: log.created_at,
  }
}

export default function AuditPage() {
  const router = useRouter()
  const { t } = useI18n()
  const { isLoading: authLoading } = useAuth()

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [actionFilter, setActionFilter] = useState('')
  const [userIdFilter, setUserIdFilter] = useState('')
  const [page, setPage] = useState(0)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await auditLogs.list({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        action: actionFilter || undefined,
        userId: userIdFilter || undefined,
      })
      setLogs(data.logs)
      setTotal(data.total)
    } catch (err) {
      if (err instanceof Error && err.message.includes('401')) {
        clearToken()
        router.push('/login')
      } else {
        setError(err instanceof Error ? err.message : t('error'))
      }
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, actionFilter, userIdFilter])

  useEffect(() => {
    if (!authLoading) fetchLogs()
  }, [authLoading, fetchLogs])

  // Reset page when filter changes
  useEffect(() => {
    setPage(0)
  }, [actionFilter, userIdFilter])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const columns: Column<AuditRow>[] = [
    {
      key: 'action',
      header: t('action'),
      mobile: 'primary',
      render: (row) => (
        <div className="flex items-center gap-2">
          <ClipboardList size={14} style={{ color: 'var(--color-text-secondary)' }} />
          <span style={{ color: 'var(--color-text-primary)' }}>{row.actionLabel}</span>
        </div>
      ),
    },
    {
      key: 'metadata',
      header: t('detail'),
      mobile: 'hidden',
      render: (row) => (
        <span
          className="text-xs max-w-xs truncate block"
          style={{ color: 'var(--color-text-secondary)' }}
          title={JSON.stringify(row.metadata)}
        >
          {row.metaHuman}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: t('date'),
      mobile: 'inline',
      align: 'end',
      render: (row) => (
        <span style={{ color: 'var(--color-text-secondary)' }}>
          {fmt.format(new Date(row.created_at))}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('audit')}
        subtitle={t('audit_log_count', { n: total })}
        icon={<ClipboardList size={22} style={{ color: 'var(--color-accent)' }} />}
      />

      {error && <InlineError message={error} />}

      {/* Filter bar */}
      <div
        className="flex flex-wrap items-center gap-3 rounded-xl border p-4"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex items-center gap-2">
          <Filter size={14} style={{ color: 'var(--color-text-secondary)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Filtres
          </span>
        </div>

        {/* Action filter */}
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border px-3 py-1.5 text-sm"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        >
          <option value="">{t('all_actions')}</option>
          {KNOWN_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABELS[a]}
            </option>
          ))}
        </select>

        {/* User ID filter */}
        <input
          type="text"
          value={userIdFilter}
          onChange={(e) => setUserIdFilter(e.target.value)}
          placeholder={t('filter_by_user')}
          className="rounded-lg border px-3 py-1.5 text-sm flex-1 min-w-[180px]"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        />

        {(actionFilter || userIdFilter) && (
          <button
            onClick={() => { setActionFilter(''); setUserIdFilter('') }}
            className="text-xs underline"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('clear_filters', 'Réinitialiser')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size={8} />
        </div>
      ) : logs.length === 0 ? (
        <EmptyState icon={<ClipboardList size={24} />} title={t('no_audit_logs')} />
      ) : (
        <>
          <DataTable columns={columns} rows={logs.map(toRow)} rowKey={(row) => row.id} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {t('page')} {page + 1} {t('of')} {totalPages} · {total} résultat(s)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  style={{
                    backgroundColor: 'var(--color-card)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <ChevronLeft size={14} />
                  {t('previous')}
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  style={{
                    backgroundColor: 'var(--color-card)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {t('next')}
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
