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

export type Locale = 'fr' | 'en'
export type Messages = typeof fr

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
      if (typeof fallback === 'string') return template
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
