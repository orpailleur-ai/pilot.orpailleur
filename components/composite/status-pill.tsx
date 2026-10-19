'use client'

import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

type Status = 'active' | 'inactive' | 'suspended' | 'past_due' | 'canceled' | 'expired'

interface StatusPillProps {
  status: Status
  /** Override label shown; omit to use built-in FR labels */
  label?: string
  size?: 'sm' | 'md'
}

const STYLES: Record<Status, {
  bg: string
  iconColor: string
  /** Built-in FR label — replace at call-site via `label` prop for i18n */
  label: string
  Icon: React.ComponentType<{ size: number; color: string }>
}> = {
  active: {
    bg: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
    iconColor: 'var(--color-success)',
    label: 'Actif',
    Icon: CheckCircle,
  },
  inactive: {
    bg: 'color-mix(in srgb, var(--color-text-secondary) 12%, transparent)',
    iconColor: 'var(--color-text-secondary)',
    label: 'Inactif',
    Icon: XCircle,
  },
  suspended: {
    bg: 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
    iconColor: 'var(--color-warning)',
    label: 'Suspendu',
    Icon: AlertTriangle,
  },
  past_due: {
    bg: 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
    iconColor: 'var(--color-warning)',
    label: 'En retard',
    Icon: AlertTriangle,
  },
  canceled: {
    bg: 'color-mix(in srgb, var(--color-danger) 12%, transparent)',
    iconColor: 'var(--color-danger)',
    label: 'Annulé',
    Icon: XCircle,
  },
  expired: {
    bg: 'color-mix(in srgb, var(--color-text-secondary) 12%, transparent)',
    iconColor: 'var(--color-text-secondary)',
    label: 'Expiré',
    Icon: XCircle,
  },
}

export function StatusPill({ status, label, size = 'md' }: StatusPillProps) {
  const { bg, iconColor, label: defaultLabel, Icon } = STYLES[status] ?? STYLES.inactive
  const iconSize = size === 'sm' ? 11 : 13

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-medium"
      style={{
        backgroundColor: bg,
        fontSize: size === 'sm' ? '12px' : '13px',
        padding: size === 'sm' ? '2px 7px' : '3px 9px',
        color: 'var(--color-text-primary)',
      }}
    >
      <Icon size={iconSize} color={iconColor} aria-hidden="true" />
      <span>{label ?? defaultLabel}</span>
    </span>
  )
}
