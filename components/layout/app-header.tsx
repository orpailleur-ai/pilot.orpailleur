'use client'

import { useMemo, useRef } from 'react'
import Link from 'next/link'
import { Avatar, DropdownMenu, type DropdownMenuOption } from '@astryxdesign/core'
import {
  Sun,
  Moon,
  Monitor,
  Globe,
  LogOut,
  Menu,
  Check,
  Search,
  type LucideIcon,
} from 'lucide-react'
import { TenantSwitcher } from '@/components/layout/tenant-switcher'
import { KioskSwitcher } from '@/components/layout/kiosk-switcher'
import { useAuth } from '@/components/providers/auth-context'
import { useThemeMode, type ThemeMode } from '@/components/providers/theme-mode-provider'
import { useI18n } from '@/lib/i18n'
import { useCommandPalette } from '@/components/ui/command-palette/command-palette-context'

const THEME_ICONS: Record<ThemeMode, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

const THEME_LABEL_KEYS: Record<ThemeMode, 'light' | 'dark' | 'system'> = {
  light: 'light',
  dark: 'dark',
  system: 'system',
}

interface AppHeaderProps {
  onMenuToggle?: () => void
  extra?: React.ReactNode
  menuButtonRef?: React.RefObject<HTMLButtonElement | null>
}

export function AppHeader({ onMenuToggle, extra, menuButtonRef }: AppHeaderProps) {
  const { user, logout } = useAuth()
  const { mode, setMode } = useThemeMode()
  const { locale, setLocale, t } = useI18n()
  const { open: openPalette } = useCommandPalette()

  const logoUrl: string | null = null
  const orgName = 'Orpailleur'

  const ThemeIcon = THEME_ICONS[mode]

  const themeItems: DropdownMenuOption[] = useMemo(
    () =>
      (['light', 'dark', 'system'] as ThemeMode[]).map((m) => {
        const Icon = THEME_ICONS[m]
        return {
          id: m,
          label: t(THEME_LABEL_KEYS[m]),
          icon: <Icon size={16} />,
          onClick: () => setMode(m),
          endContent:
            mode === m ? <Check size={16} aria-hidden /> : undefined,
        }
      }),
    [mode, setMode, t],
  )

  const langItems: DropdownMenuOption[] = useMemo(
    () => [
      {
        id: 'fr',
        label: 'Français',
        onClick: () => setLocale('fr'),
        endContent: locale === 'fr' ? <Check size={16} aria-hidden /> : undefined,
      },
      {
        id: 'en',
        label: 'English',
        onClick: () => setLocale('en'),
        endContent: locale === 'en' ? <Check size={16} aria-hidden /> : undefined,
      },
    ],
    [locale, setLocale],
  )

  const userItems: DropdownMenuOption[] = useMemo(
    () => [
      ...(user?.email
        ? [{ type: 'section' as const, id: 'identity', title: user.email, items: [] }]
        : []),
      { type: 'divider' as const },
      {
        id: 'logout',
        label: t('logout'),
        icon: <LogOut size={16} />,
        variant: 'destructive' as const,
        onClick: logout,
      },
    ],
    [user?.email, t, logout],
  )

  return (
    <header
      className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b px-3 sm:px-4"
      style={{
        backgroundColor: 'var(--color-card)',
        borderColor: 'var(--color-border-emphasized)',
      }}
    >
      {/* ── Left ── */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          type="button"
          ref={menuButtonRef}
          onClick={onMenuToggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-background-muted)] md:hidden"
          aria-label={t('menu')}
        >
          <Menu size={19} style={{ color: 'var(--color-text-primary)' }} />
        </button>

        {/* Marque — mobile uniquement */}
        <Link
          href="/"
          className="flex min-w-0 shrink items-center gap-2 rounded-md md:hidden"
          aria-label={orgName}
        >
          {logoUrl && logoUrl !== '' ? (
            <img src={logoUrl} alt="" className="h-7 w-7 shrink-0 rounded-lg object-contain" />
          ) : (
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-on-accent)',
              }}
            >
              {orgName.charAt(0).toUpperCase()}
            </span>
          )}
          <span
            className="max-w-32 truncate text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {orgName}
          </span>
        </Link>

        {/* Logo + nom — visible sur bureau */}
        {extra && (
          <div
            className="hidden items-center gap-2 md:flex"
            aria-label={orgName}
          >
            {logoUrl && logoUrl !== '' ? (
              <img src={logoUrl} alt="" className="h-7 w-7 shrink-0 rounded-lg object-contain" />
            ) : (
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-on-accent)',
                }}
              >
                {orgName.charAt(0).toUpperCase()}
              </span>
            )}
            <span
              className="max-w-40 truncate text-sm font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {orgName}
            </span>
          </div>
        )}

        {extra}
      </div>

      {/* ── Right : site, kiosk, langue, thème, profil ── */}
      <div className="flex shrink-0 items-center gap-0.5">
        <TenantSwitcher />
        <KioskSwitcher />

        {/* Search shortcut */}
        <button
          type="button"
          onClick={openPalette}
          aria-label="Rechercher (⌘K)"
          className="hidden sm:flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors hover:bg-[var(--color-background-muted)]"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <Search size={13} />
          <span>⌘K</span>
        </button>

        <DropdownMenu
          button={{
            label: locale === 'fr' ? 'Français' : 'English',
            icon: <Globe size={18} />,
            variant: 'ghost',
            size: 'sm',
            isIconOnly: true,
          }}
          items={langItems}
          placement="below"
          alignment="end"
          presentation="adaptive"
        />

        <DropdownMenu
          button={{
            label: t('appearance'),
            icon: <ThemeIcon size={18} />,
            variant: 'ghost',
            size: 'sm',
            isIconOnly: true,
          }}
          items={themeItems}
          placement="below"
          alignment="end"
          presentation="adaptive"
        />

        <DropdownMenu
          button={{
            label: user?.email ?? t('profile'),
            icon: <Avatar name={user?.email ?? 'O'} size="sm" shape="circle" />,
            variant: 'ghost',
            size: 'sm',
            isIconOnly: true,
          }}
          items={userItems}
          placement="below"
          alignment="end"
          presentation="adaptive"
        />
      </div>
    </header>
  )
}
