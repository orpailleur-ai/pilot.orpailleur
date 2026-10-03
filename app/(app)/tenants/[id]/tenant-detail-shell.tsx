'use client'

import { useParams } from 'next/navigation'
import { useTenantDetail } from '@/components/composite/tenant-detail-context'
import { TenantDetailHeader } from '@/components/composite/tenant-detail-header'
import { TabsNav, type TabItem } from '@/components/composite/tabs-nav'
import { Spinner } from '@/components/ui/spinner'

export function TenantDetailShell({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const tenantId = params.id as string
  const { tenant, isLoading, error } = useTenantDetail()

  const tabs: TabItem[] = [
    { key: 'overview', label: 'Vue d\'ensemble', href: `/tenants/${tenantId}` },
    { key: 'sites', label: 'Sites', href: `/tenants/${tenantId}/sites` },
    { key: 'users', label: 'Utilisateurs', href: `/tenants/${tenantId}/users` },
    { key: 'subscription', label: 'Abonnement', href: `/tenants/${tenantId}/subscription` },
    { key: 'invoices', label: 'Factures', href: `/tenants/${tenantId}/invoices` },
    { key: 'settings', label: 'Réglages', href: `/tenants/${tenantId}/settings` },
  ]

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={8} />
      </div>
    )
  }

  if (error || !tenant) {
    return (
      <div className="flex justify-center py-16">
        <p style={{ color: 'var(--color-danger)' }}>{error ?? 'Tenant introuvable'}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <TenantDetailHeader tenant={tenant} />
      <TabsNav tabs={tabs} />
      {children}
    </div>
  )
}
