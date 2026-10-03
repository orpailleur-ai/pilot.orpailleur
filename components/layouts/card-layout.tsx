'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home } from 'lucide-react'
import { AppHeader } from '@/components/layout/app-header'
import { MobileDrawer } from '@/components/layout/mobile-drawer'
import { APPS, findApp, type AppDefinition } from '@/lib/apps'
import { useI18n } from '@/lib/i18n'
import clsx from 'clsx'

export function CardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { t } = useI18n()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  const currentApp = findApp(pathname)

  return (
    <div className="flex h-dvh flex-col">
      <AppHeader
        onMenuToggle={() => setDrawerOpen(true)}
        menuButtonRef={menuButtonRef}
        extra={
          <div className="flex min-w-0 items-center gap-1">
            {currentApp && currentApp.id !== 'pilotage' && (
              <Link
                href="/"
                title={t('home')}
                aria-label={t('home')}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-background-muted)]"
              >
                <Home size={16} style={{ color: 'var(--color-text-secondary)' }} />
              </Link>
            )}
            <AppTabBar app={currentApp!} pathname={pathname} />
          </div>
        }
      />

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        logoUrl={null}
        orgName="Orpailleur"
        finalFocusRef={menuButtonRef}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
          {children}
        </div>
      </main>
    </div>
  )
}

function AppTabBar({ app, pathname }: { app: AppDefinition; pathname: string }) {
  const { t } = useI18n()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <nav
      aria-label={t(app.labelKey)}
      className="hidden min-w-0 items-center gap-1 overflow-x-auto md:flex"
    >
      {app.pages.map((page) => {
        const PageIcon = page.icon
        const active = isActive(page.href)
        return (
          <Link
            key={page.href}
            href={page.href}
            aria-current={active ? 'page' : undefined}
            title={t(page.labelKey)}
            className={clsx(
              'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors',
              !active && 'hover:bg-[var(--color-background-muted)]',
              active && 'shadow-[var(--shadow-card)]',
            )}
            style={{
              color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              backgroundColor: active
                ? 'color-mix(in srgb, var(--color-accent) 18%, transparent)'
                : undefined,
              fontWeight: active ? 600 : 400,
            }}
          >
            <PageIcon size={14} className="shrink-0" />
            <span className="max-w-32 truncate">{t(page.labelKey)}</span>
          </Link>
        )
      })}
    </nav>
  )
}
