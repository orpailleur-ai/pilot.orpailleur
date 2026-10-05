'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ToastViewport } from '@astryxdesign/core/Toast'
import { useAuth } from '@/components/providers/auth-context'
import { SidebarLayout } from '@/components/layouts/sidebar-layout'
import { Spinner } from '@/components/ui/spinner'
import { CommandPaletteProvider } from '@/components/ui/command-palette/command-palette-context'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="flex flex-col items-center gap-3">
          <Spinner size={8} />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <CommandPaletteProvider>
      <SidebarLayout>{children}</SidebarLayout>
      <ToastViewport position="bottomEnd" maxVisible={3} />
    </CommandPaletteProvider>
  )
}
