'use client'

import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

export interface TabItem {
  key: string
  label: string
  href: string
  icon?: ReactNode
}

interface TabsNavProps {
  tabs: TabItem[]
}

export function TabsNav({ tabs }: TabsNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  function isActive(tab: TabItem) {
    if (tab.href === pathname) return true
    if (tab.href !== '/' && pathname.startsWith(tab.href)) return true
    return false
  }

  return (
    <nav
      className="flex gap-1 overflow-x-auto"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      {tabs.map((tab) => {
        const active = isActive(tab)
        return (
          <button
            key={tab.key}
            onClick={() => router.push(tab.href)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
            style={{
              borderBottomColor: active ? 'var(--color-accent)' : 'transparent',
              color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              backgroundColor: 'transparent',
              marginBottom: '-1px',
            }}
          >
            {tab.icon && (
              <span style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}>
                {tab.icon}
              </span>
            )}
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
