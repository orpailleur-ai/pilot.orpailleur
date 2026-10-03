'use client'

/**
 * Squelette de chargement qui reproduit la forme réelle du tableau.
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{
        backgroundColor: 'var(--color-card)',
        borderColor: 'var(--color-border)',
      }}
      aria-busy="true"
      aria-live="polite"
    >
      <div
        className="border-b px-4 py-2.5"
        style={{ backgroundColor: 'var(--color-background-muted)' }}
      >
        <div className="h-3 w-28 animate-pulse rounded" style={{ backgroundColor: 'var(--color-border)' }} />
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 border-b px-4 py-3.5 last:border-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {Array.from({ length: columns }).map((__, c) => (
            <div
              key={c}
              className="h-3 animate-pulse rounded"
              style={{
                backgroundColor: 'var(--color-border)',
                width: c === 0 ? '22%' : c === columns - 1 ? '12%' : '18%',
                marginLeft: c === 0 ? 0 : undefined,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
