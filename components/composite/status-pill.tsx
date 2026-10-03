'use client'

import type { ReactNode } from 'react'

type Status = 'active' | 'inactive' | 'suspended' | 'past_due' | 'canceled' | 'expired'

interface StatusPillProps {
  status: Status
  label?: string
  size?: 'sm' | 'md'
}

const STYLES: Record<Status, { bg: string; color: string; label: string }> = {
  active: {
    bg: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
    color: 'var(--color-success)',
    label: 'Actif',
  },
  inactive: {
    bg: 'color-mix(in srgb, var(--color-text-secondary) 12%, transparent)',
    color: 'var(--color-text-secondary)',
    label: 'Inactif',
  },
  suspended: {
    bg: 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
    color: 'var(--color-warning)',
    label: 'Suspendu',
  },
  past_due: {
    bg: 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
    color: 'var(--color-warning)',
    label: 'En retard',
  },
  canceled: {
    bg: 'color-mix(in srgb, var(--color-danger) 12%, transparent)',
    color: 'var(--color-danger)',
    label: 'Annulé',
  },
  expired: {
    bg: 'color-mix(in srgb, var(--color-text-secondary) 12%, transparent)',
    color: 'var(--color-text-secondary)',
    label: 'Expiré',
  },
}

export function StatusPill({ status, label, size = 'md' }: StatusPillProps) {
  const style = STYLES[status] ?? STYLES.inactive
  return (
    <span
      className="inline-flex items-center rounded-full font-medium"
      style={{
        backgroundColor: style.bg,
        color: style.color,
        fontSize: size === 'sm' ? '11px' : '12px',
        padding: size === 'sm' ? '1px 6px' : '2px 8px',
      }}
    >
      {label ?? style.label}
    </span>
  )
}
