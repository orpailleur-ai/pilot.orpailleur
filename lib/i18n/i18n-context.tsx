'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { fr } from './messages.fr'
import { en } from './messages.en'
import type { ClePerimetre } from './scopes'

export type Locale = 'fr' | 'en'
/**
 * Contrat des dictionnaires.
 *
 * `Record<ClePerimetre, string>` IMPOSE les libellés de périmètre dans les
 * DEUX langues : en supprimer un devient une erreur de type, donc une
 * construction en échec.
 *
 * `Record<string, string>` complète sans figer les VALEURS sur des littéraux.
 * `typeof fr` faisait ce figeage, et `en` ne pouvait alors pas lui être
 * affecté — chaque dictionnaire a ses propres mots. La parité importe ; pas
 * l'égalité des chaînes.
 */
export type Messages = Record<ClePerimetre, string> & Record<string, string>

const messages: Record<Locale, Messages> = { fr, en }

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, fallback?: string | Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'fr',
  setLocale: () => {},
  t: (key) => key,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr')

  useEffect(() => {
    const stored = localStorage.getItem('orpailleur_locale') as Locale | null
    if (stored === 'fr' || stored === 'en') setLocaleState(stored)
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    localStorage.setItem('orpailleur_locale', l)
  }, [])

  const t = useCallback(
    (key: string, fallback?: string | Record<string, string | number>): string => {
      const dict = messages[locale] as Record<string, string | undefined>
      const template = dict[key] ?? (fr as Record<string, string | undefined>)[key] ?? key
      // Un REPLI explicite doit être rendu quand la clé manque — c'est le
      // contrat de `t('cle', 'Texte')`.
      //
      // La version d'ici renvoyait `template`, c'est-à-dire la CLÉ : le
      // repli n'était jamais utilisé, et l'écran affichait « danger_zone »,
      // « tenant_users », « all_statuses » ou « invoice_paid » en toutes
      // lettres. Le repli n'était qu'un décor.
      if (typeof fallback === 'string') {
        return dict[key] ?? (fr as Record<string, string | undefined>)[key] ?? fallback
      }
      if (!fallback) return template
      return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in fallback ? String(fallback[name]) : match,
      )
    },
    [locale],
  )

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}

export function useT() {
  const { t } = useI18n()
  return t
}
