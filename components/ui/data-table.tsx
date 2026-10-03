'use client'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  align?: 'start' | 'end'
  /** Sur mobile, la colonne devient une ligne « libellé : valeur » */
  mobile?: 'primary' | 'inline' | 'hidden'
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
 * < md  : les mêmes données en cartes empilées, libellé + valeur.
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
                onClick={onRowClick ? () => onRowClick(row) : undefined}
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
            <div
              className="font-medium"
              style={{ color: 'var(--color-text-primary)' }}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {cardTitle?.render(row)}
            </div>

            {cardInline.map((c) => (
              <div
                key={c.key}
                className="mt-1.5 flex items-baseline justify-between gap-3 text-sm"
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

            {cardRest.length > 0 && (
              <div className="mt-2 flex items-center justify-end gap-1 border-t pt-2">
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
