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
          {/*
            Aligné sur console : meme plafond et meme gouttiere, pour que les
            deux applications aient le meme prix de ligne. 1280 px (max-w-7xl)
            ouvrait de la marge de chaque côté dès 1281 px, ce que console
            n'a pas.

            Le plafond reste, malgre la demande de retrait des marges : sans
            lui, les tableaux deviennent des lignes interminable sur un tres
            large écran. Console porte la meme borne pour la meme raison.

            Le commentaire est HORS de l'attribut : écrit dans la chaîne
            `className="…"`, il en faisait partie littéralement, et chaque
            page servait ce texte en classes.
          */}
          <div className="mx-auto w-full max-w-[1800px] px-4 py-4 sm:px-6 sm:px-5 flex flex-col gap-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
