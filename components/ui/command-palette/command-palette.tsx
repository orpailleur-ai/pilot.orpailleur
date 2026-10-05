'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Users,
  LayoutDashboard,
  ClipboardList,
  CreditCard,
  FileText,
  Receipt,
  Search,
  CornerDownLeft,
} from 'lucide-react'
import { adminTenants, adminUsers } from '@/lib/api-client'

interface SearchResult {
  id: string
  type: 'tenant' | 'user' | 'page'
  label: string
  description?: string
  href: string
  icon: React.ReactNode
}

const PAGE_SHORTCUTS: SearchResult[] = [
  {
    id: 'page-dashboard',
    type: 'page',
    label: 'Tableau de bord',
    description: 'Vue d\'ensemble',
    href: '/dashboard',
    icon: <LayoutDashboard size={16} />,
  },
  {
    id: 'page-tenants',
    type: 'tenant',
    label: 'Tenants',
    description: 'Tous les tenants',
    href: '/tenants',
    icon: <Building2 size={16} />,
  },
  {
    id: 'page-users',
    type: 'user',
    label: 'Utilisateurs',
    description: 'Tous les utilisateurs',
    href: '/users',
    icon: <Users size={16} />,
  },
  {
    id: 'page-subscriptions',
    type: 'page',
    label: 'Abonnements',
    description: 'Gestion des abonnements',
    href: '/subscriptions',
    icon: <FileText size={16} />,
  },
  {
    id: 'page-billing',
    type: 'page',
    label: 'Facturation',
    description: 'MRR et santé des abonnements',
    href: '/billing',
    icon: <Receipt size={16} />,
  },
  {
    id: 'page-audit',
    type: 'page',
    label: 'Journal d\'audit',
    description: 'Historique des actions admin',
    href: '/audit',
    icon: <ClipboardList size={16} />,
  },
]

let searchController: AbortController | null = null

async function searchAll(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []

  if (searchController) {
    searchController.abort()
  }
  searchController = new AbortController()
  const sig = searchController.signal

  const q = query.toLowerCase()

  try {
    const [tenants, users] = await Promise.all([
      adminTenants.list().catch(() => []),
      adminUsers.list().catch(() => []),
    ])

    if (sig.aborted) return []

    const results: SearchResult[] = []

    for (const page of PAGE_SHORTCUTS) {
      if (
        page.label.toLowerCase().includes(q) ||
        (page.description ?? '').toLowerCase().includes(q)
      ) {
        results.push(page)
      }
    }

    for (const t of tenants) {
      if (sig.aborted) return []
      if (t.nom.toLowerCase().includes(q) || (t.siret ?? '').toLowerCase().includes(q)) {
        results.push({
          id: `tenant-${t.id}`,
          type: 'tenant',
          label: t.nom,
          description: t.siret ? `SIRET ${t.siret}` : undefined,
          href: `/tenants/${t.id}`,
          icon: <Building2 size={16} />,
        })
      }
    }

    for (const u of users) {
      if (sig.aborted) return []
      if (u.email.toLowerCase().includes(q) || (u.nom ?? '').toLowerCase().includes(q)) {
        results.push({
          id: `user-${u.id}`,
          type: 'user',
          label: u.nom ?? u.email,
          description: u.email,
          href: `/users/${u.id}`,
          icon: <Users size={16} />,
        })
      }
    }

    return results.slice(0, 15)
  } catch {
    return []
  }
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults(PAGE_SHORTCUTS)
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!query.trim()) {
      setResults(PAGE_SHORTCUTS)
      setLoading(false)
      return
    }
    setLoading(true)
    const timer = setTimeout(async () => {
      const res = await searchAll(query)
      setResults(res)
      setActiveIndex(0)
      setLoading(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  const navigate = useCallback(
    (href: string) => {
      router.push(href)
      onOpenChange(false)
    },
    [router, onOpenChange],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault()
      navigate(results[activeIndex].href)
    } else if (e.key === 'Escape') {
      onOpenChange(false)
    }
  }

  if (!open) return null

  const groups: { label: string; items: SearchResult[] }[] = []
  const pages = results.filter((r) => r.type === 'page')
  const tenants = results.filter((r) => r.type === 'tenant')
  const users = results.filter((r) => r.type === 'user')
  if (pages.length) groups.push({ label: 'Navigation', items: pages })
  if (tenants.length) groups.push({ label: 'Tenants', items: tenants })
  if (users.length) groups.push({ label: 'Utilisateurs', items: users })

  let globalIndex = -1

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      />

      <div
        className="relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--color-card, #fff)',
          borderColor: 'var(--color-border, #e5e7eb)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-border, #e5e7eb)' }}
        >
          <Search size={18} style={{ color: 'var(--color-text-secondary, #6b7280)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher tenants, utilisateurs, pages…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--color-text-primary, #111827)' }}
          />
          {loading && (
            <div
              className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--color-accent, #6366f1)', borderTopColor: 'transparent' }}
            />
          )}
          <kbd
            className="hidden sm:inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs"
            style={{
              backgroundColor: 'var(--color-surface, #f9fafb)',
              borderColor: 'var(--color-border, #e5e7eb)',
              color: 'var(--color-text-secondary, #6b7280)',
            }}
          >
            esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 && !loading && (
            <div
              className="py-8 text-center text-sm"
              style={{ color: 'var(--color-text-secondary, #6b7280)' }}
            >
              Aucun résultat pour &ldquo;{query}&rdquo;
            </div>
          )}

          {groups.map((group) => (
            <div key={group.label} className="mb-1">
              <div
                className="px-4 py-1.5 text-xs font-medium uppercase tracking-wide"
                style={{ color: 'var(--color-text-secondary, #6b7280)' }}
              >
                {group.label}
              </div>
              {group.items.map((item) => {
                globalIndex++
                const isActive = globalIndex === activeIndex
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setActiveIndex(globalIndex)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{
                      backgroundColor: isActive ? 'var(--color-accent, #6366f1)' : 'transparent',
                      color: isActive ? '#fff' : 'var(--color-text-primary, #111827)',
                    }}
                  >
                    <span style={{ color: isActive ? '#fff' : 'var(--color-text-secondary, #6b7280)' }}>
                      {item.icon}
                    </span>
                    <span className="flex-1 text-sm font-medium">{item.label}</span>
                    {item.description && (
                      <span
                        className="text-xs truncate max-w-[160px]"
                        style={{
                          color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--color-text-secondary, #6b7280)',
                        }}
                      >
                        {item.description}
                      </span>
                    )}
                    {isActive && (
                      <span
                        className="flex items-center gap-1 text-xs"
                        style={{ color: 'rgba(255,255,255,0.7)' }}
                      >
                        <CornerDownLeft size={11} />
                        enter
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-4 px-4 py-2.5 text-xs"
          style={{
            borderTop: '1px solid var(--color-border, #e5e7eb)',
            color: 'var(--color-text-secondary, #6b7280)',
          }}
        >
          <span className="flex items-center gap-1">
            <kbd
              className="rounded border px-1 py-0.5"
              style={{ borderColor: 'var(--color-border, #e5e7eb)' }}
            >
              ↑↓
            </kbd>
            naviguer
          </span>
          <span className="flex items-center gap-1">
            <kbd
              className="rounded border px-1 py-0.5"
              style={{ borderColor: 'var(--color-border, #e5e7eb)' }}
            >
              ↵
            </kbd>
            ouvrir
          </span>
          <span className="flex items-center gap-1">
            <kbd
              className="rounded border px-1 py-0.5"
              style={{ borderColor: 'var(--color-border, #e5e7eb)' }}
            >
              esc
            </kbd>
            fermer
          </span>
        </div>
      </div>
    </div>
  )
}
