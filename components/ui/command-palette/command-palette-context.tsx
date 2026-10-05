'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { CommandPalette } from './command-palette'

interface CommandPaletteValue {
  open: () => void
}

const CommandPaletteCtx = createContext<CommandPaletteValue>({ open: () => {} })

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  const handleOpen = useCallback(() => setOpen(true), [])
  const handleOpenChange = useCallback((v: boolean) => setOpen(v), [])

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <CommandPaletteCtx.Provider value={{ open: handleOpen }}>
      {children}
      <CommandPalette open={open} onOpenChange={handleOpenChange} />
    </CommandPaletteCtx.Provider>
  )
}

export function useCommandPalette() {
  return useContext(CommandPaletteCtx)
}
