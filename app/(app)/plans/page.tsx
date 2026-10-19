'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Check, CreditCard } from 'lucide-react'
import { Button, useToast } from '@astryxdesign/core'
import { Spinner } from '@/components/ui/spinner'
import { InlineError } from '@/components/ui/inline-error'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { PermissionGate } from '@/components/composite/permission-gate'
import { plans, type Plan } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'

function formatPrice(cents: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}

export default function PlansPage() {
  const router = useRouter()
  const toast = useToast()
  const { t } = useI18n()
  const [planList, setPlanList] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    plans.list()
      .then(setPlanList)
      .catch((err) => setFetchError(err instanceof Error ? err.message : t('error')))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={8} />
      </div>
    )
  }

  const action = (
    <PermissionGate permission="BILLING_WRITE">
      <Button
        variant="primary"
        icon={<Plus size={14} />}
        label={t('plans_new', 'Nouveau plan')}
        onClick={() => router.push('/plans/new')}
      />
    </PermissionGate>
  )

  return (
    <>
      <PageHeader
        title={t('plans_title', 'Plans')}
        subtitle={t('plans_count', { n: planList.length })}
        icon={<CreditCard size={20} style={{ color: 'var(--color-text-primary)' }} />}
        action={action}
      />

      {fetchError && <InlineError message={fetchError} />}

      {planList.length === 0 ? (
        <EmptyState
          title={t('plans_empty', 'Aucun plan')}
          description={t('plans_empty_hint', 'Créez un plan pour commencer.')}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {planList.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </>
  )
}

function PlanCard({ plan }: { plan: Plan }) {
  const router = useRouter()

  return (
    <div
      className="rounded-lg border p-5 flex flex-col gap-4 cursor-pointer transition-colors"
      style={{
        backgroundColor: 'var(--color-background-surface)',
        borderColor: 'var(--color-border)',
      }}
      onClick={() => router.push(`/plans/${plan.id}`)}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3
            className="text-base font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {plan.nom}
          </h3>
          <span
            className="font-mono text-xs rounded px-1.5 py-0.5"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
              color: 'var(--color-accent)',
            }}
          >
            {plan.code}
          </span>
        </div>
        {!plan.actif && (
          <span
            className="text-xs rounded px-1.5 py-0.5"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-danger) 12%, transparent)',
              color: 'var(--color-danger)',
            }}
          >
            Inactif
          </span>
        )}
      </div>

      {plan.description && (
        <p className="text-sm flex-1" style={{ color: 'var(--color-text-secondary)' }}>
          {plan.description}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {formatPrice(plan.prixMensuelCents)}
          </span>
          <span style={{ color: 'var(--color-text-secondary)' }}>/mois</span>
        </div>
        <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {formatPrice(plan.prixAnnuelCents)} / an ({(100 - Math.round((plan.prixAnnuelCents / (plan.prixMensuelCents * 12)) * 100))}% d'économie)
        </div>
      </div>

      <div className="flex flex-wrap gap-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        <span>{plan.nbSitesMax === 999 ? '∞' : plan.nbSitesMax} sites</span>
        <span>·</span>
        <span>{plan.nbUsersMax === 999 ? '∞' : plan.nbUsersMax} utilisateurs</span>
      </div>

      <ul className="flex flex-col gap-1.5">
        {(plan.features ?? []).map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <Check size={13} style={{ color: 'var(--color-success)' }} />
            {f}
          </li>
        ))}
      </ul>
    </div>
  )
}
