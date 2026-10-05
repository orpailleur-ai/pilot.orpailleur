'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

interface ThemeModeContextValue {
  mode: ThemeMode
  resolvedTheme: 'light' | 'dark'
  setMode: (mode: ThemeMode) => void
}

const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: 'system',
  resolvedTheme: 'light',
  setMode: () => {},
})

export function useThemeMode() {
  return useContext(ThemeModeContext)
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const stored = localStorage.getItem('orpailleur_theme_mode') as ThemeMode | null
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setModeState(stored)
    }
  }, [])

  useEffect(() => {
    const effective = mode === 'system' ? getSystemTheme() : mode
    setResolvedTheme(effective)

    const root = document.documentElement
    root.dataset.theme = effective
    if (effective === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [mode])

  useEffect(() => {
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const effective = e.matches ? 'dark' : 'light'
      setResolvedTheme(effective)
      const root = document.documentElement
      root.dataset.theme = effective
      root.classList.toggle('dark', e.matches)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    localStorage.setItem('orpailleur_theme_mode', m)
  }, [])

  return (
    <ThemeModeContext.Provider value={{ mode, resolvedTheme, setMode }}>
      {children}
    </ThemeModeContext.Provider>
  )
}
