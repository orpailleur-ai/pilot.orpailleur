'use client'

import type { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string | number
  delta?: number
  deltaLabel?: string
  icon?: ReactNode
}

export function KpiCard({ label, value, delta, deltaLabel, icon }: KpiCardProps) {
  return (
    <div
      className="rounded-lg border p-4 flex flex-col gap-2"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {label}
        </span>
        {icon && (
          <span style={{ color: 'var(--color-accent)', opacity: 0.7 }}>{icon}</span>
        )}
      </div>

      <span
        className="text-2xl font-bold"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {value}
      </span>

      {delta !== undefined && (
        <div className="flex items-center gap-1">
          {delta >= 0 ? (
            <TrendingUp size={12} style={{ color: 'var(--color-success)' }} />
          ) : (
            <TrendingDown size={12} style={{ color: 'var(--color-danger)' }} />
          )}
          <span
            className="text-xs font-medium"
            style={{ color: delta >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}
          >
            {delta >= 0 ? '+' : ''}{delta}%
          </span>
          {deltaLabel && (
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {deltaLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
