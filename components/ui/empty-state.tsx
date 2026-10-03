'use client'

/**
 * État vide : icône, titre, explication, action facultative.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div
      className="flex flex-col items-center gap-4 rounded-2xl border px-6 py-14 text-center"
      style={{
        backgroundColor: 'var(--color-card)',
        borderColor: 'var(--color-border-emphasized)',
      }}
    >
      {icon && (
        <span
          className="flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-accent) 18%, transparent)',
            color: 'var(--color-accent)',
          }}
        >
          {icon}
        </span>
      )}
      <div className="space-y-1">
        <p
          className="font-semibold text-base"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {title}
        </p>
        {description && (
          <p
            className="mx-auto max-w-md text-sm leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}
