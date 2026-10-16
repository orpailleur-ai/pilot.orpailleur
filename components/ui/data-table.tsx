'use client'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  align?: 'start' | 'end'
  /** Sur mobile, la colonne devient une ligne « libellé : valeur » */
  mobile?: 'primary' | 'inline' | 'hidden'
  /** Désactive onRowClick quand l'utilisateur clique dans cette colonne */
  noRowClick?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  empty?: React.ReactNode
  onRowClick?: (row: T) => void
}

/**
 * Tableau de données responsive.
 *
 * ≥ md  : vraie table, entête alignée sur les colonnes.
 * < md  : les mêmes données en cartes empilées, libellé + valeur, pour éviter
 *         le défilement horizontal sur téléphone.
 *
 * Le comportement est piloté par les mêmes `columns` — pas de doublon à
 * maintenir entre les deux rendus.
 */
export function DataTable<T>({ columns, rows, rowKey, empty, onRowClick }: DataTableProps<T>) {
  if (rows.length === 0) {
    return <>{empty}</>
  }

  const primary = columns.filter((c) => c.mobile === 'primary')
  const inline = columns.filter((c) => c.mobile === 'inline')
  const rest = columns.filter((c) => !c.mobile || c.mobile === 'hidden')
  const cardTitle = primary[0] ?? columns[0]
  const cardRest = rest.length > 0 ? rest : columns.slice(1)
  const cardInline = cardTitle ? inline : [...inline, ...cardRest]

  const alignClass = (align?: 'start' | 'end') =>
    align === 'end' ? 'text-right' : 'text-left'

  const handleRowClick = (e: React.MouseEvent, row: T) => {
    if (!onRowClick) return
    // Don't navigate if the click came from inside a button, anchor, or a column marked noRowClick
    const target = e.target as HTMLElement
    const isInteractive = target.closest('button, a, input, select, textarea, [role="button"]')
    if (isInteractive) return
    onRowClick(row)
  }

  return (
    <>
      {/* ── Bureau ── */}
      <div
        className="hidden overflow-hidden rounded-xl border md:block"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <table className="w-full text-sm">
          <thead
            style={{
              backgroundColor: 'var(--color-background-muted)',
              borderColor: 'var(--color-border)',
            }}
          >
            <tr className="border-b">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide ${alignClass(c.align)}`}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={(e) => handleRowClick(e, row)}
                className="border-b last:border-0 transition-colors"
                style={{
                  borderColor: 'var(--color-border)',
                  cursor: onRowClick ? 'pointer' : undefined,
                }}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-4 py-3 align-middle ${alignClass(c.align)}`}
                    style={{ color: 'var(--color-text-primary)' }}
                    onClick={c.noRowClick ? (e) => e.stopPropagation() : undefined}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile ── */}
      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((row) => (
          <li
            key={rowKey(row)}
            className="rounded-xl border p-3.5"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {/* Titre */}
            <div
              className="font-medium"
              style={{ color: 'var(--color-text-primary)' }}
              onClick={(e) => handleRowClick(e, row)}
            >
              {cardTitle?.render(row)}
            </div>

            {/* Lignes libellé / valeur */}
            {cardInline.map((c) => (
              <div
                key={c.key}
                className="mt-1.5 flex items-baseline justify-between gap-3 text-sm"
                onClick={c.noRowClick ? (e) => e.stopPropagation() : undefined}
              >
                <span
                  className="shrink-0 text-xs"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {c.header}
                </span>
                <span
                  className="min-w-0 text-right"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {c.render(row)}
                </span>
              </div>
            ))}

            {/* Actions */}
            {cardRest.length > 0 && (
              <div
                className="mt-2 flex items-center justify-end gap-1 border-t pt-2"
                onClick={(e) => e.stopPropagation()}
              >
                {cardRest.map((c) => (
                  <span key={c.key}>{c.render(row)}</span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
