'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { apiClient, setToken, clearToken } from '@/lib/api-client'

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

  useEffect(() => {
    const token = sessionStorage.getItem('pilot_token')
    if (!token) {
      setIsLoading(false)
      return
    }

    apiClient.get<AuthUser>('/auth/me')
      .then((userData) => {
        setUser(userData)
      })
      .catch(() => {
        clearToken()
        clearAuthCookie()
        clearLoginContext()
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiClient.post<{ accessToken: string }>('/auth/login/admin', { email, password })
    const { accessToken } = response

    sessionStorage.setItem('pilot_token', accessToken)
    setToken(accessToken)
    setAuthCookie(accessToken)

    const userData = await apiClient.get<AuthUser>('/auth/me')
    setUser(userData)
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
