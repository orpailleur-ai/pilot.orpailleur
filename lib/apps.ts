import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react'

export interface AppPage {
  href: string
  labelKey: string
  icon: LucideIcon
}

export interface AppDefinition {
  id: string
  labelKey: string
  icon: LucideIcon
  /**
   * Teinte d'identification de l'application.
   * Lecture depuis l'échelle de marque, déjà dérivée du `primary.500`
   * du tenant par le ThemeProvider et résolue par `light-dark()`.
   */
  color: string
  pages: AppPage[]
}

export const APPS: AppDefinition[] = [
  {
    id: 'pilotage',
    labelKey: 'app_pilotage',
    icon: LayoutDashboard,
    color: 'var(--color-accent)',
    pages: [
      { href: '/tenants', labelKey: 'tenants', icon: Building2 },
    ],
  },
  {
    id: 'audit',
    labelKey: 'app_audit',
    icon: ClipboardList,
    color: 'var(--color-text-secondary)',
    pages: [
      { href: '/audit', labelKey: 'audit', icon: ClipboardList },
    ],
  },
]

/** Flat list of all pages */
export const ALL_PAGES: AppPage[] = APPS.flatMap((app) => app.pages)

/** Find which app a given pathname belongs to */
export function findApp(pathname: string): AppDefinition | undefined {
  return APPS.find((app) =>
    app.pages.some((p) => (p.href === '/' ? pathname === '/' : pathname.startsWith(p.href))),
  )
}
