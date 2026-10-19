'use client'

/**
 * Section card: title + optional action slot + children.
 * Used as the primary grouping pattern inside detail/edit pages.
 */
export function Section({
  title,
  children,
  action,
}: {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  )
}
