'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { adminTenants, type Tenant } from '@/lib/api-client'

interface TenantContextValue {
  tenants: Tenant[]
  currentTenantId: string | null
  switchTenant: (id: string | null) => Promise<void>
  isLoading: boolean
  error: string | null
}

const TenantContext = createContext<TenantContextValue>({
  tenants: [],
  currentTenantId: null,
  switchTenant: async () => {},
  isLoading: false,
  error: null,
})

export function useTenant() {
  return useContext(TenantContext)
}

const STORAGE_KEY = 'orpailleur_pilot_tenant_id'

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Restore persisted tenant on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored === 'all') {
      setCurrentTenantId(null)
    } else if (stored) {
      setCurrentTenantId(stored)
    }
  }, [])

  // Load tenants once on mount
  useEffect(() => {
    adminTenants.list()
      .then(setTenants)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setIsLoading(false))
  }, [])

  const switchTenant = useCallback(async (id: string | null) => {
    setCurrentTenantId(id)
    sessionStorage.setItem(STORAGE_KEY, id ?? 'all')
  }, [])

  return (
    <TenantContext.Provider
      value={{
        tenants,
        currentTenantId,
        switchTenant,
        isLoading,
        error,
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}
