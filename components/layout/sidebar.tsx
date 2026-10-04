'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react'
import { APPS, findApp, type AppDefinition } from '@/lib/apps'
import { useT } from '@/lib/i18n'
import clsx from 'clsx'

const COLLAPSE_KEY = 'orpailleur_sidebar_collapsed'

interface SidebarProps {
  logoUrl?: string | null
  orgName?: string
}

export function Sidebar({ logoUrl, orgName = 'Orpailleur' }: SidebarProps) {
  const pathname = usePathname()
  const t = useT()

  const [collapsed, setCollapsed] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(() => {
    const app = findApp(pathname)
    return app?.id ?? null
  })

  useEffect(() => {
    if (localStorage.getItem(COLLAPSE_KEY) === 'true') setCollapsed(true)
  }, [])

  useEffect(() => {
    const app = findApp(pathname)
    if (!app) return
    setExpanded(app.id)
  }, [pathname])

  function toggleCollapsed() {
    setCollapsed((prev) => {
      localStorage.setItem(COLLAPSE_KEY, String(!prev))
      return !prev
    })
  }

  function toggleApp(appId: string) {
    setExpanded((prev) => (prev === appId ? null : appId))
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <nav
      aria-label={t('navigation')}
      className={clsx(
        'relative flex h-dvh shrink-0 flex-col border-e transition-[width] duration-200 ease-out',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Marque / organisation */}
      <div
        className={clsx(
          'flex h-14 shrink-0 items-center border-b',
          collapsed ? 'justify-center gap-1 px-2' : 'gap-2 px-3',
        )}
      >
        {logoUrl && logoUrl !== '' ? (
          <img
            src={logoUrl}
            alt=""
            className="h-7 w-7 shrink-0 rounded-lg object-contain"
          />
        ) : (
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-on-accent)',
            }}
          >
            {orgName.charAt(0).toUpperCase()}
          </span>
        )}

        {!collapsed && (
          <span
            className="min-w-0 flex-1 truncate text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
            title={orgName}
          >
            {orgName}
          </span>
        )}

        <button
          type="button"
          onClick={toggleCollapsed}
          className={clsx(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
            collapsed && 'absolute right-1 top-[0.6875rem] z-10',
          )}
          style={{ color: 'var(--color-text-secondary)' }}
          aria-label={collapsed ? t('expand') : t('collapse')}
          aria-expanded={!collapsed}
          title={collapsed ? t('expand') : t('collapse')}
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>

      {/* Applications */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-3">
        {APPS.map((app) => (
          <AppGroup
            key={app.id}
            app={app}
            collapsed={collapsed}
            isOpen={expanded === app.id}
            onToggle={() => toggleApp(app.id)}
            isActive={isActive}
            t={t}
          />
        ))}
      </div>
    </nav>
  )
}

interface AppGroupProps {
  app: AppDefinition
  collapsed: boolean
  isOpen: boolean
  onToggle: () => void
  isActive: (href: string) => boolean
  t: (key: string) => string
}

function AppGroup({ app, collapsed, isOpen, onToggle, isActive, t }: AppGroupProps) {
  const AppIcon = app.icon
  const hasActivePage = app.pages.some((p) => isActive(p.href))

  if (collapsed) {
    return (
      <div className="px-2 py-0.5">
        <Link
          href={app.pages[0].href}
          title={t(app.labelKey)}
          aria-current={hasActivePage ? 'page' : undefined}
          className={clsx(
            'flex h-10 w-full items-center justify-center rounded-lg transition-colors',
            hasActivePage && 'font-semibold',
          )}
          style={
            hasActivePage
              ? {
                  backgroundColor: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                  color: 'var(--color-accent)',
                }
              : { color: 'var(--color-text-secondary)' }
          }
        >
          <AppIcon size={18} className="shrink-0" />
        </Link>
      </div>
    )
  }

  return (
    <div className="px-2 py-0.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-semibold transition-colors"
        style={{ color: 'var(--color-text-primary)' }}
      >
        <AppIcon size={16} className="shrink-0" style={{ color: app.color }} />
        <span className="flex-1 truncate text-left">{t(app.labelKey)}</span>
        <Chevron
          open={isOpen}
          hasActivePage={hasActivePage}
        />
      </button>

      {isOpen && (
        <ul className="mt-0.5 space-y-0.5 border-l ps-2.5 ms-2.5">
          {app.pages.map((page) => {
            const PageIcon: LucideIcon = page.icon
            const active = isActive(page.href)
            return (
              <li key={page.href}>
                <Link
                  href={page.href}
                  aria-current={active ? 'page' : undefined}
                  title={t(page.labelKey)}
                  className={clsx(
                    'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                    active ? 'font-semibold' : 'hover:bg-[var(--color-background-muted)]',
                  )}
                  style={{
                    color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    backgroundColor: active
                      ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)'
                      : undefined,
                  }}
                >
                  <PageIcon size={14} className="shrink-0" />
                  <span className="truncate">{t(page.labelKey)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Chevron({ open, hasActivePage }: { open: boolean; hasActivePage: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden
      className="shrink-0 transition-transform duration-150"
      style={{
        transform: open ? 'rotate(90deg)' : 'none',
        color: hasActivePage
          ? 'var(--color-accent)'
          : 'var(--color-text-secondary)',
      }}
    >
      <path
        d="M6 3.5 10.5 8 6 12.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
