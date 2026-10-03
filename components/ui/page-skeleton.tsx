'use client'

/**
 * Squelette de page pour les formulaires : reproduit des lignes de champ
 * de largeurs variées, plus un pied de page d'actions.
 */
export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  const widths = ['100%', '100%', '48%', '48%', '100%', '48%', '100%', '48%']

  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div
        className="rounded-xl border p-5 sm:p-6"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div
          className="mb-5 h-4 w-40 animate-pulse rounded"
          style={{ backgroundColor: 'var(--color-border)' }}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{ gridColumn: widths[i] === '48%' ? undefined : '1 / -1' }}
            >
              <div
                className="mb-1.5 h-3 w-24 rounded"
                style={{ backgroundColor: 'var(--color-border)' }}
              />
              <div
                className="h-9 rounded-lg"
                style={{ backgroundColor: 'var(--color-background-muted)' }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <div
          className="h-8 w-24 animate-pulse rounded-lg"
          style={{ backgroundColor: 'var(--color-border)' }}
        />
        <div
          className="h-8 w-32 animate-pulse rounded-lg"
          style={{ backgroundColor: 'var(--color-border)' }}
        />
      </div>
    </div>
  )
}
