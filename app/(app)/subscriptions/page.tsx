'use client'

import { useState, useEffect } from 'react'
import { CreditCard } from 'lucide-react'
import { subscriptions, adminTenants, plans as plansApi, type Subscription } from '@/lib/api-client'
import { Spinner } from '@/components/ui/spinner'
import { InlineError } from '@/components/ui/inline-error'
import { EmptyState } from '@/components/ui/empty-state'
import { DataTable, type Column } from '@/components/ui/data-table'
import { PageHeader } from '@/components/layout/page-header'
import { StatusPill } from '@/components/composite/status-pill'
import { useI18n } from '@/lib/i18n'

function formatPrice(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export default function SubscriptionsPage() {
  const { t } = useI18n()
  const [list, setList] = useState<Subscription[]>([])
  const [tenants, setTenants] = useState<Record<string, string>>({})
  const [planNames, setPlanNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    setFetchError(null)
    try {
      const [subs, tens, pls] = await Promise.all([
        subscriptions.list(),
        adminTenants.list(),
        plansApi.list(),
      ])
      setList(subs)
      const tensMap: Record<string, string> = {}
      for (const ten of tens) tensMap[ten.id] = ten.nom
      setTenants(tensMap)
      const plansMap: Record<string, string> = {}
      for (const p of pls) plansMap[p.id] = p.nom
      setPlanNames(plansMap)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : t('error'))
    } finally {
      setLoading(false)
    }
  }

  const activeCount = list.filter((s) => s.statut === 'active').length

  const columns: Column<Subscription>[] = [
    {
      key: 'tenant',
      header: t('subscriptions_tenant'),
      mobile: 'primary',
      render: (row) => (
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
          {tenants[row.tenant_id] ?? row.tenant_id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'plan',
      header: t('subscriptions_plan'),
      mobile: 'inline',
      render: (row) => (
        <span style={{ color: 'var(--color-accent)' }}>
          {planNames[row.plan_id] ?? row.plan?.nom ?? row.plan_id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'periode',
      header: t('subscriptions_periode'),
      mobile: 'hidden',
      render: (row) => (
        <span style={{ color: 'var(--color-text-secondary)' }}>
          {row.periode === 'yearly' ? t('subscriptions_annuel') : t('subscriptions_mensuel')}
        </span>
      ),
    },
    {
      key: 'prix',
      header: t('subscriptions_prix'),
      mobile: 'hidden',
      align: 'end',
      render: (row) => (
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
          {formatPrice(row.prixCents)}
        </span>
      ),
    },
    {
      key: 'statut',
      header: t('subscriptions_statut'),
      mobile: 'inline',
      render: (row) => (
        <StatusPill
          status={
            row.statut === 'active'
              ? 'active'
              : row.statut === 'canceled'
              ? 'canceled'
              : row.statut === 'expired'
              ? 'expired'
              : 'past_due'
          }
        />
      ),
    },
    {
      key: 'dateFin',
      header: t('subscriptions_date_fin'),
      mobile: 'hidden',
      align: 'end',
      render: (row) => (
        <span style={{ color: 'var(--color-text-secondary)' }}>
          {new Date(row.dateFin).toLocaleDateString('fr-FR')}
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
    <>
      <PageHeader
        title={t('subscriptions_title')}
        icon={<CreditCard size={20} style={{ color: 'var(--color-text-primary)' }} />}
      />

      {fetchError ? (
        <InlineError message={fetchError} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<CreditCard size={24} />}
          title={t('subscriptions_empty')}
          description={t('subscriptions_empty_hint')}
        />
      ) : (
        <>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {t('subscriptions_count', { n: activeCount })}
          </p>
          <DataTable columns={columns} rows={list} rowKey={(row) => row.id} />
        </>
      )}
    </>
  )
}
