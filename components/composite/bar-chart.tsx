'use client'

import { useMemo, useState } from 'react'

/**
 * Bar chart SVG inline — sans bibliotheque de graphiques.
 *
 * Ecrit a la main pour le tableau de bord admin : la serie temporelle
 * (`DashboardStats.series`) est sparse en production (quelques tenants),
 * et une dependance de charting serait disproportionnee. Le composant
 * rend TOUTES les valeurs, y compris les zeros : un jour sans activité
 * reste une barre vide, pas une absence.
 *
 * Sizing par viewBox : la largeur s'adapte au conteneur via CSS, la
 * hauteur est fixe. Les couleurs passent par les variables CSS du theme.
 */

export interface BarChartSerie {
  /**
   * Etiquette du point (date ISO 'YYYY-MM-DD' ou 'YYYY-MM' pour un pas
   * mensuel). Le composant l'abrege pour l'axe.
   */
  label: string
  /** Valeurs empilees, dans l'ordre de la legende. */
  values: number[]
}

interface BarChartProps {
  series: BarChartSerie[]
  /** Une couleur CSS par valeur empilee. */
  colors: string[]
  formatValue?: (n: number) => string
  height?: number
}

/** Abrege une etiquette ISO : '2026-10-22' -> '22/10', '2026-10' -> '10/26'. */
function abreger(label: string): string {
  const parts = label.split('-')
  const [annee, mois, jour] = parts
  if (jour) return `${jour}/${mois}`
  return `${mois}/${annee.slice(2)}`
}

export function BarChart({ series, colors, formatValue, height = 180 }: BarChartProps) {
  const [survol, setSurvol] = useState<number | null>(null)

  const n = series.length
  const totalMax = useMemo(() => {
    let max = 0
    for (const s of series) {
      const t = s.values.reduce((a, b) => a + b, 0)
      if (t > max) max = t
    }
    return max
  }, [series])

  if (n === 0 || totalMax === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs rounded-lg"
        style={{ height, color: 'var(--color-text-secondary)' }}
      >
        Aucune donnée sur la période
      </div>
    )
  }

  const W = 1000
  const H = height
  const pad = { top: 8, bottom: 18, left: 4, right: 4 }
  const plotH = H - pad.top - pad.bottom
  const pas = (W - pad.left - pad.right) / n
  const gap = Math.min(3, pas * 0.25)
  const barW = Math.max(1, pas - gap)

  const pasLabel = Math.ceil(n / (W / 60)) // ~1 etiquette tous les 60px
  const pxLabel = n <= 16 || pasLabel === 1 ? 0 : pasLabel

  return (
    <div style={{ width: '100%' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height }}
        preserveAspectRatio="none"
        role="img"
        aria-label="Série temporelle"
      >
        {/* Ligne de base */}
        <line
          x1={pad.left}
          y1={H - pad.bottom}
          x2={W - pad.right}
          y2={H - pad.bottom}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        {series.map((s, i) => {
          const total = s.values.reduce((a, b) => a + b, 0)
          let y = H - pad.bottom
          const x = pad.left + i * pas + gap / 2
          return (
            <g
              key={`${s.label}-${i}`}
              onMouseEnter={() => setSurvol(i)}
              onMouseLeave={() => setSurvol(null)}
            >
              {/* Zone de survol invisible, pleine hauteur */}
              <rect
                x={pad.left + i * pas}
                y={0}
                width={pas}
                height={H}
                fill="transparent"
              />
              {survol === i && (
                <rect
                  x={pad.left + i * pas}
                  y={0}
                  width={pas}
                  height={plotH + pad.top}
                  fill="var(--color-border)"
                  opacity={0.3}
                />
              )}
              {s.values.map((v, k) => {
                const h = totalMax > 0 ? (v / totalMax) * plotH : 0
                y -= h
                return (
                  <rect
                    key={k}
                    x={x}
                    y={y}
                    width={barW}
                    height={h}
                    fill={colors[k % colors.length]}
                    opacity={survol === null || survol === i ? 1 : 0.35}
                  />
                )
              })}
              {(pxLabel === 0 || i % pxLabel === 0) && (
                <text
                  x={x + barW / 2}
                  y={H - 4}
                  textAnchor="middle"
                  fontSize={11}
                  fill="var(--color-text-secondary)"
                >
                  {abreger(s.label)}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Info-bulle : valeurs exactes du point survole */}
      {survol !== null && series[survol] && (
        <div
          className="mt-1 text-xs flex items-center gap-3"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {series[survol].label}
          </span>
          <span>
            Total :{' '}
            {formatValue
              ? formatValue(series[survol].values.reduce((a, b) => a + b, 0))
              : series[survol].values.reduce((a, b) => a + b, 0)}
          </span>
        </div>
      )}
    </div>
  )
}
