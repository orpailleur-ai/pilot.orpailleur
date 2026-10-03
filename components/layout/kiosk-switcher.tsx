'use client'

import { useMemo } from 'react'
import { Monitor, Check } from 'lucide-react'
import { DropdownMenu, type DropdownMenuOption } from '@astryxdesign/core'
import { useSite } from '@/components/providers/site-context'
import { useI18n } from '@/lib/i18n'

/**
 * Affiche un sélecteur de caisse (kiosk) uniquement si :
 * - currentSite est défini
 * - il y a ≥ 2 kiosks dans ce site
 */
export function KioskSwitcher() {
  const { kiosks, currentKiosk, switchKiosk, currentSite, isLoading } = useSite()
  const { t } = useI18n()

  if (!currentSite || isLoading) return null
  if (kiosks.length < 2) return null

  const items: DropdownMenuOption[] = useMemo(
    () =>
      kiosks.map((k) => ({
        id: k.id,
        label: k.nom ?? k.code,
        description: k.nom ? k.code : undefined,
        icon: <Monitor size={16} />,
        onClick: () => switchKiosk(k.id),
        endContent:
          currentKiosk?.id === k.id ? (
            <Check size={16} aria-hidden />
          ) : undefined,
      })),
    [kiosks, currentKiosk, switchKiosk],
  )

  return (
    <DropdownMenu
      button={{
        label: currentKiosk?.nom ?? currentKiosk?.code ?? t('select_kiosk'),
        icon: <Monitor size={16} />,
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
