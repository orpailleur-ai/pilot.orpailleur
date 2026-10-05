'use client'

import { useMemo } from 'react'
import { Building2, Check, Globe } from 'lucide-react'
import { DropdownMenu, type DropdownMenuOption } from '@astryxdesign/core'
import { useTenant } from '@/components/providers/tenant-context'
import { useI18n } from '@/lib/i18n'

export function TenantSwitcher() {
  const { tenants, currentTenantId, switchTenant, isLoading } = useTenant()
  const { t } = useI18n()

  const currentTenant = useMemo(
    () => tenants.find((t) => t.id === currentTenantId) ?? null,
    [tenants, currentTenantId],
  )

  const items: DropdownMenuOption[] = useMemo(() => {
    const allEntry: DropdownMenuOption = {
      id: '__all__',
      label: t('all_tenants'),
      description: t('all_tenants_desc'),
      icon: <Globe size={16} />,
      onClick: () => switchTenant(null),
      endContent: currentTenantId === null ? <Check size={16} aria-hidden /> : undefined,
    }

    if (isLoading) {
      return [allEntry]
    }

    const tenantEntries: DropdownMenuOption[] = tenants.map((tenant) => ({
      id: tenant.id,
      label: tenant.nom,
      description: tenant.ville ?? undefined,
      icon: <Building2 size={16} />,
      onClick: () => switchTenant(tenant.id),
      endContent: currentTenantId === tenant.id ? <Check size={16} aria-hidden /> : undefined,
    }))

    return [allEntry, ...tenantEntries]
  }, [tenants, currentTenantId, switchTenant, t, isLoading])

  return (
    <DropdownMenu
      button={{
        label: currentTenant?.nom ?? t('select_tenant'),
        icon: <Building2 size={16} />,
        variant: 'ghost',
        size: 'sm',
        isIconOnly: false,
      }}
      items={items}
      placement="below"
      alignment="end"
      presentation="adaptive"
    />
  )
}
