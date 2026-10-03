'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BottomSheet } from '@astryxdesign/core/BottomSheet'
import { X } from 'lucide-react'
import { APPS, findApp } from '@/lib/apps'
import { useI18n } from '@/lib/i18n'
import clsx from 'clsx'

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  logoUrl?: string | null
  orgName?: string
  finalFocusRef?: React.RefObject<HTMLElement | null>
}

export function MobileDrawer({
  open,
  onClose,
  logoUrl,
  orgName = 'Orpailleur',
  finalFocusRef,
}: MobileDrawerProps) {
  const pathname = usePathname()
  const { t } = useI18n()
  const lastPathRef = useRef(pathname)

  useEffect(() => {
    if (lastPathRef.current !== pathname) {
      lastPathRef.current = pathname
      if (open) onClose()
    }
  }, [pathname, open, onClose])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

  const currentApp = findApp(pathname)

  return (
    <BottomSheet
      isOpen={open}
      onOpenChange={(isOpen) => { if (!isOpen) onClose() }}
      label={t('navigation')}
      height="capped"
      purpose="info"
      finalFocusRef={finalFocusRef}
    >
      <div className="flex items-center gap-2.5 border-b px-4 pb-3">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="h-8 w-8 rounded-lg object-contain" />
        ) : (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-on-accent)',
            }}
          >
            {orgName.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span
            className="block truncate text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {orgName}
          </span>
          {currentApp && (
            <span
              className="block truncate text-xs"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t(currentApp.labelKey)}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 transition-colors hover:bg-[var(--color-background-muted)]"
          aria-label={t('close')}
        >
          <X size={18} style={{ color: 'var(--color-text-secondary)' }} />
        </button>
      </div>

      <nav className="px-2 py-3">
        {APPS.map((app) => {
          const AppIcon = app.icon
          const appHasActive = app.pages.some((p) => isActive(p.href))

          return (
            <section key={app.id} className="mb-1">
              <h2 className="flex items-center gap-2.5 px-2 py-2 text-xs font-semibold uppercase tracking-wide">
                <AppIcon
                  size={14}
                  className="shrink-0"
                  style={{ color: appHasActive ? 'var(--color-accent)' : app.color }}
                />
                <span
                  className="truncate"
                  style={{
                    color: appHasActive
                      ? 'var(--color-accent)'
                      : 'var(--color-text-secondary)',
                  }}
                >
                  {t(app.labelKey)}
                </span>
              </h2>

              <ul className="space-y-0.5">
                {app.pages.map((page) => {
                  const PageIcon = page.icon
                  const active = isActive(page.href)
                  return (
                    <li key={page.href}>
                      <Link
                        href={page.href}
                        onClick={onClose}
                        aria-current={active ? 'page' : undefined}
                        className={clsx(
                          'flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-sm transition-colors',
                          !active && 'hover:bg-[var(--color-background-muted)]',
                        )}
                        style={{
                          color: active ? 'var(--color-accent)' : 'var(--color-text-primary)',
                          backgroundColor: active
                            ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)'
                            : undefined,
                          fontWeight: active ? 600 : 400,
                        }}
                      >
                        <PageIcon size={15} className="shrink-0" />
                        <span className="truncate">{t(page.labelKey)}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </nav>
    </BottomSheet>
  )
}
