'use client'

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react'

export interface Site {
  id: string
  nom: string
  ville: string | null
  adresse: string | null
}

export interface Kiosk {
  id: string
  code: string
  nom: string | null
  type: string
}

interface SiteContextValue {
  sites: Site[]
  currentSite: Site | null
  kiosks: Kiosk[]
  currentKiosk: Kiosk | null
  switchSite: (siteId: string) => Promise<void>
  switchKiosk: (kioskId: string | null) => Promise<void>
  isLoading: boolean
  error: string | null
}

const SiteContext = createContext<SiteContextValue>({
  sites: [],
  currentSite: null,
  kiosks: [],
  currentKiosk: null,
  switchSite: async () => {},
  switchKiosk: async () => {},
  isLoading: false,
  error: null,
})

export function useSite() {
  return useContext(SiteContext)
}

/**
 * Pilot does not use multi-site management.
 * This provider returns empty state for all values.
 */
export function SiteProvider({ children }: { children: ReactNode }) {
  return (
    <SiteContext.Provider
      value={{
        sites: [],
        currentSite: null,
        kiosks: [],
        currentKiosk: null,
        switchSite: async () => {},
        switchKiosk: async () => {},
        isLoading: false,
        error: null,
      }}
    >
      {children}
    </SiteContext.Provider>
  )
}
