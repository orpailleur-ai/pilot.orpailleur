'use client'

/**
 * En-tête de page : titre, compteur optionnel, action principale à droite.
 */
export function PageHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-center gap-3 min-w-0">
        {icon && <span className="shrink-0">{icon}</span>}
        <div className="min-w-0">
          <h1
            className="truncate text-xl font-bold sm:text-2xl"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="mt-0.5 text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  )
}
