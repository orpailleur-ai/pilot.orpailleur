'use client'

import { useParams } from 'next/navigation'
import { useTenantDetail } from '@/components/composite/tenant-detail-context'
import { TenantDetailHeader } from '@/components/composite/tenant-detail-header'
import { TabsNav, type TabItem } from '@/components/composite/tabs-nav'
import { Spinner } from '@/components/ui/spinner'
import { useI18n } from '@/lib/i18n'

export function TenantDetailShell({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const tenantId = params.id as string
  const { tenant, isLoading, error } = useTenantDetail()
  const { t } = useI18n()

  const tabs: TabItem[] = [
    { key: 'overview',      label: t('overview_tab'),      href: `/tenants/${tenantId}` },
    { key: 'sites',         label: t('sites_tab'),         href: `/tenants/${tenantId}/sites` },
    { key: 'users',         label: t('users_tab'),         href: `/tenants/${tenantId}/users` },
    { key: 'subscription',  label: t('subscription_tab'),  href: `/tenants/${tenantId}/subscription` },
    { key: 'invoices',       label: t('invoices_tab'),       href: `/tenants/${tenantId}/invoices` },
    { key: 'settings',      label: t('settings_tab'),      href: `/tenants/${tenantId}/settings` },
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
        <p style={{ color: 'var(--color-danger)' }}>{error ?? t('tenant_not_found')}</p>
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
