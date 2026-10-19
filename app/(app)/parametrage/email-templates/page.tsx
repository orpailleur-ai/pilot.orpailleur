'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Mail, Pencil, Plus } from 'lucide-react'
import { Badge, Button, useToast } from '@astryxdesign/core'
import { PageHeader } from '@/components/layout/page-header'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { Spinner } from '@/components/ui/spinner'
import { useI18n } from '@/lib/i18n'
import {
  listEmailTemplatesAdmin,
  type EmailTemplate,
} from '@/lib/email-client'

const SCOPE_LABELS: Record<string, string> = {
  commande_envoyee: 'email_scope_commande_envoyee',
  facture_impayee: 'email_scope_facture_impayee',
  reception_validated: 'email_scope_reception_validated',
  stock_bas: 'email_scope_stock_bas',
  abonnement_renouvele: 'email_scope_abonnement_renouvele',
  notif_generic: 'email_scope_notif_generic',
}

const STATUS_BADGE: Record<string, 'success' | 'neutral' | 'error' | 'warning' | 'info'> = {
  true: 'success',
  false: 'neutral',
}

export default function EmailTemplatesPage() {
  const { t } = useI18n()
  const toast = useToast()

  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const charger = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await listEmailTemplatesAdmin()
      setTemplates(rows)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('error'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { void charger() }, [charger])

  const columns: Column<EmailTemplate>[] = [
    {
      key: 'scope',
      header: t('email_templates_scope'),
      render: (row) => t(SCOPE_LABELS[row.scope] ?? row.scope),
    },
    {
      key: 'name',
      header: t('email_templates_name'),
      render: (row) => row.name,
    },
    {
      key: 'subject',
      header: t('email_templates_subject'),
      render: (row) => (
        <span className="truncate max-w-xs block" title={row.subject}>
          {row.subject}
        </span>
      ),
    },
    {
      key: 'actif',
      header: t('email_templates_active'),
      render: (row) => (
        <Badge variant={STATUS_BADGE[String(row.actif)]} label={row.actif ? t('active') : t('inactive')} />
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <Link href={`/parametrage/email-templates/${row.scope}`}>
          <Button
            label={t('edit')}
            variant="ghost"
            size="sm"
            icon={<Pencil size={13} />}
          />
        </Link>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title={t('email_templates_title')}
        icon={<Mail size={20} style={{ color: 'var(--color-text-primary)' }} />}
      />

      {error && <InlineError message={error} />}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size={16} />
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<Mail size={32} />}
          title={t('email_templates_empty')}
          description={t('email_templates_empty_desc')}
        />
      ) : (
        <DataTable columns={columns} rows={templates} rowKey={(row) => row.scope} />
      )}
    </>
  )
}
