'use client'

import { useTenantDetail } from '@/components/composite/tenant-detail-context'
import { EmptyDetail } from '@/components/composite/empty-detail'

export default function TenantInvoicesPage() {
  const { tenant } = useTenantDetail()

  return (
    <EmptyDetail
      title="Module Factures"
      description={
        tenant
          ? `Historique des factures du tenant « ${tenant.nom} ». `
            + 'Le module de facturation sera disponible en Phase 3.'
          : 'Module en cours de construction.'
      }
    />
  )
}
