'use client'

import { useThemeMode, type ThemeMode } from '@/components/providers/theme-mode-provider'
import { useI18n, type Locale } from '@/lib/i18n'
import { Languages, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'

/**
 * Theme + language controls for unauthenticated pages (login).
 *
 * Deliberately self-contained rather than reusing AppHeader: that component
 * depends on AuthProvider, TenantProvider and the command palette, none of which
 * are meaningfully available before sign-in.
 *
 * The theme cycles light -> dark -> system rather than opening a dropdown. With
 * three options on a login screen that is already mostly empty, a single button
 * is fewer clicks and no hover target to discover.
 */

const THEME_ICONS: Record<ThemeMode, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

const THEME_LABEL_KEY: Record<ThemeMode, 'light' | 'dark' | 'system'> = {
  light: 'light',
  dark: 'dark',
  system: 'system',
}

const NEXT_THEME: Record<ThemeMode, ThemeMode> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
}

const NEXT_LOCALE: Record<Locale, Locale> = { fr: 'en', en: 'fr' }

export function AuthPageControls() {
  const { mode, setMode } = useThemeMode()
  const { locale, setLocale, t } = useI18n()

  const ThemeIcon = THEME_ICONS[mode]
  const themeLabel = t(THEME_LABEL_KEY[mode])
  const nextLocale = NEXT_LOCALE[locale]
  const localeLabel = locale === 'fr' ? 'Français' : 'English'

  const buttonStyle = {
    color: 'var(--color-text-secondary)',
    borderColor: 'var(--color-border-emphasized)',
    backgroundColor: 'var(--color-card)',
  }

  return (
    <div
      className="fixed right-4 top-4 z-10 flex items-center gap-2"
      // Exposed so assistive tech announces the current value, not just the icon.
      aria-label={t('preferences', 'Préférences')}
    >
      <button
        type="button"
        onClick={() => setMode(NEXT_THEME[mode])}
        className="flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-white/10"
        style={buttonStyle}
        title={themeLabel}
        aria-label={`${t('theme')} : ${themeLabel}`}
      >
        <ThemeIcon size={16} aria-hidden />
      </button>

      <button
        type="button"
        onClick={() => setLocale(nextLocale)}
        className="flex h-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-white/10"
        style={buttonStyle}
        title={localeLabel}
        aria-label={`${t('language', 'Langue')} : ${localeLabel}`}
        lang={locale}
      >
        <Languages size={16} aria-hidden />
        <span className="text-xs font-semibold uppercase">
          {locale === 'fr' ? 'FR' : 'EN'}
        </span>
      </button>
    </div>
  )
}