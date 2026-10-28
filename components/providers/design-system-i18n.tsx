'use client'

import type { ReactNode } from 'react'
import { InternationalizationProvider } from '@astryxdesign/core'
import frFR from '@astryxdesign/core/locales/fr-FR.generated.js'
import { useI18n } from '@/lib/i18n'

/**
 * Les messages du DESIGN SYSTEM dans la langue de l'utilisateur.
 *
 * Le design system embarque ses propres textes (« Required », « Cancel »,
 * « Next »…). Sans ce provider, il utilise son catalogue anglais — et
 * l'interface du pilot, qui est par ailleurs en français, affiche « Required »
 * sous un champ obligatoire.
 *
 * Le provider suit la locale du pilot : le bouton de langue change les deux.
 */
export function DesignSystemI18n({ children }: { children: ReactNode }) {
  const { locale } = useI18n()

  return (
    <InternationalizationProvider
      locale={locale === 'fr' ? 'fr-FR' : 'en'}
      messages={{ 'fr-FR': frFR }}
    >
      {children}
    </InternationalizationProvider>
  )
}
