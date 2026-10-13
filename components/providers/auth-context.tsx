'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import {
  apiClient,
  setTokens,
  clearToken,
  getTokenValue,
  ACCESS_TOKEN_KEY,
} from '@/lib/api-client'

interface AuthUser {
  id: string
  email: string
  roles: string[]
  permissions: string[]
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function setAuthCookie(token: string) {
  if (typeof document !== 'undefined') {
    document.cookie = `pilot_token=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
  }
}

function clearAuthCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = 'pilot_token=; path=/; max-age=0'
  }
}

function clearLoginContext() {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem('pilot_login_context')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Unique point d'entrée pour valider une session. Utilisé au montage ET par
  // `login()`, pour que l'état React et le stockage ne puissent pas diverger.
  const restore = useCallback(async () => {
    const token = getTokenValue()
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return
    }
    try {
      const userData = await apiClient.get<AuthUser>('/auth/me')
      setUser(userData)
    } catch {
      // `request()` a déjà réessayé via le refresh token et purgé la session si
      // elle était réellement morte : ici on ne fait que refléter cet état.
      clearAuthCookie()
      clearLoginContext()
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    restore()
  }, [restore])

  // Synchronisation inter-onglets : un login ou un logout dans un autre onglet
  // doit être répercuté ici, sinon l'UI reste dans un état faux.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === ACCESS_TOKEN_KEY) void restore()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [restore])

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiClient.post<{
      accessToken: string
      refreshToken: string
    }>('/auth/login/admin', { email, password })
    const { accessToken, refreshToken } = response

    // Le refresh token est indispensable : c'est lui qui permet à `request()`
    // de renouveler un access token expiré sans renvoyer l'utilisateur sur
    // /login (cf. refreshAccessToken dans lib/api-client.ts).
    setTokens(accessToken, refreshToken)
    setAuthCookie(accessToken)

    // On hydrate l'état AVANT de naviguer : sans cela `isAuthenticated` reste
    // false et (app)/layout.tsx redirige immédiatement vers /login.
    const userData = await apiClient.get<AuthUser>('/auth/me')
    setUser(userData)
    setIsLoading(false)
  }, [])

  const logout = useCallback(() => {
    clearToken()
    clearAuthCookie()
    clearLoginContext()
    setUser(null)
    window.location.href = '/login'
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
