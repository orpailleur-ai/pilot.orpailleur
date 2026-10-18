'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@astryxdesign/core'

/**
 * En-tête de page : titre, sous-titre, actions, bouton retour et badge optionnels.
 */
export function PageHeader({
  title,
  subtitle,
  action,
  icon,
  backHref,
  badge,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  icon?: React.ReactNode
  /** URL vers laquelle pointe le bouton de retour (affiché à gauche du titre). */
  backHref?: string
  /** Noeud de statut/badge affiché à droite du titre. */
  badge?: React.ReactNode
}) {
  const router = useRouter()

  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-center gap-3 min-w-0">
        {backHref && (
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            label="Retour"
            icon={<ArrowLeft size={16} />}
            onClick={() => router.push(backHref)}
          />
        )}
        {icon && <span className="shrink-0">{icon}</span>}
        <div className="flex items-center gap-2 min-w-0">
          <h1
            className="truncate text-xl font-bold sm:text-2xl"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p
            className="mt-0.5 text-sm w-full sm:hidden"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {subtitle && (
          <p
            className="hidden text-sm sm:block"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {subtitle}
          </p>
        )}
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
    </header>
  )
}
