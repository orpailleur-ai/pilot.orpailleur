'use client'

import { useRef, useState } from 'react'
import { AppHeader } from '@/components/layout/app-header'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileDrawer } from '@/components/layout/mobile-drawer'

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  const logoUrl = null
  const orgName = 'Orpailleur'

  return (
    <div className="flex h-dvh overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar logoUrl={logoUrl} orgName={orgName} />
      </div>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        logoUrl={logoUrl}
        orgName={orgName}
        finalFocusRef={menuButtonRef}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          onMenuToggle={() => setDrawerOpen(true)}
          menuButtonRef={menuButtonRef}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
