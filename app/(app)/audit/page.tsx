'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import { auditLogs, clearToken, type AuditLog } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'
import { PageHeader } from '@/components/layout/page-header'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/components/providers/auth-context'

const ACTION_LABELS: Record<string, string> = {
  'tenant.create': 'Création tenant',
  'tenant.update': 'Modification tenant',
  'tenant.delete': 'Suppression tenant',
}

const fmt = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

interface AuditRow {
  id: string
  action: string
  actionLabel: string
  metadata: Record<string, unknown>
  created_at: string
}

function toRow(log: AuditLog): AuditRow {
  return {
    id: log.id,
    action: log.action,
    actionLabel: ACTION_LABELS[log.action] ?? log.action,
    metadata: log.metadata,
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

  useEffect(() => {
    if (!authLoading) fetchLogs()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading])

  async function fetchLogs() {
    setLoading(true)
    setError(null)
    try {
      const data = await auditLogs.list({ limit: 50 })
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
  }

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
          className="font-mono text-xs max-w-xs truncate block"
          style={{ color: 'var(--color-text-secondary)' }}
          title={JSON.stringify(row.metadata)}
        >
          {JSON.stringify(row.metadata)}
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

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={8} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('audit')}
        subtitle={t('audit_log_count', { n: total })}
        icon={<ClipboardList size={22} style={{ color: 'var(--color-accent)' }} />}
      />

      {error && <InlineError message={error} />}

      {logs.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={24} />}
          title={t('no_audit_logs')}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={logs.map(toRow)}
          rowKey={(row) => row.id}
        />
      )}
    </div>
  )
}
