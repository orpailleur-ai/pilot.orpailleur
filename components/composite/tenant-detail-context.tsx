'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import type { Tenant, TenantStats } from '@/lib/api-client'
import { adminTenants } from '@/lib/api-client'
import { useRouter } from 'next/navigation'

interface TenantDetailContextValue {
  tenant: Tenant | null
  stats: TenantStats | null
  isLoading: boolean
  error: string | null
  refresh: () => void
}

const TenantDetailContext = createContext<TenantDetailContextValue>({
  tenant: null,
  stats: null,
  isLoading: true,
  error: null,
  refresh: () => {},
})

export function TenantDetailProvider({
  tenantId,
  children,
}: {
  tenantId: string
  children: ReactNode
}) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [stats, setStats] = useState<TenantStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function load() {
    setIsLoading(true)
    setError(null)
    try {
      const [tenantData, statsData] = await Promise.all([
        adminTenants.get(tenantId),
        adminTenants.getStats(tenantId),
      ])
      setTenant(tenantData)
      setStats(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [tenantId])

  return (
    <TenantDetailContext.Provider
      value={{ tenant, stats, isLoading, error, refresh: load }}
    >
      {children}
    </TenantDetailContext.Provider>
  )
}

export function useTenantDetail() {
  return useContext(TenantDetailContext)
}
