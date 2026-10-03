'use client'

import { useMemo } from 'react'
import { Building2, Check } from 'lucide-react'
import { DropdownMenu, type DropdownMenuOption } from '@astryxdesign/core'
import { useSite } from '@/components/providers/site-context'
import { useI18n } from '@/lib/i18n'

export function SiteSwitcher() {
  const { sites, currentSite, switchSite, isLoading } = useSite()
  const { t } = useI18n()

  const items: DropdownMenuOption[] = useMemo(() => {
    if (!sites.length) {
      return [
        {
          id: 'no-site',
          label: t('no_site'),
          disabled: true,
          icon: <Building2 size={16} />,
        },
      ]
    }
    return sites.map((site) => ({
      id: site.id,
      label: site.nom,
      description: site.ville ?? undefined,
      icon: <Building2 size={16} />,
      onClick: () => switchSite(site.id),
      endContent:
        currentSite?.id === site.id ? (
          <Check size={16} aria-hidden />
        ) : undefined,
    }))
  }, [sites, currentSite, switchSite, t])

  return (
    <DropdownMenu
      button={{
        label: currentSite?.nom ?? t('select_site'),
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
