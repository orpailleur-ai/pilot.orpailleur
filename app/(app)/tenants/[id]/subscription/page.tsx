'use client'

import { useTenantDetail } from '@/components/composite/tenant-detail-context'
import { EmptyDetail } from '@/components/composite/empty-detail'

export default function TenantSubscriptionPage() {
  const { tenant } = useTenantDetail()

  return (
    <EmptyDetail
      title="Module Abonnement"
      description={
        tenant
          ? `Ce tenant est actuellement sur le plan « ${tenant.plan} ». `
            + 'Le module de gestion des abonnements (plans, renouvellements, upgrades) '
            + 'sera disponible en Phase 3.'
          : 'Module en cours de construction.'
      }
    />
  )
}
