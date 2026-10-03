'use client'

import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@astryxdesign/core/Button'

interface EmptyDetailProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyDetail({
  icon,
  title,
  description,
  action,
}: EmptyDetailProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
          width: 56,
          height: 56,
        }}
      >
        {icon ?? <AlertTriangle size={24} style={{ color: 'var(--color-warning)' }} />}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h3>
        {description && (
          <p className="text-sm max-w-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {description}
          </p>
        )}
      </div>
      {action && (
        <Button
          variant="secondary"
          label={action.label}
          onClick={action.onClick}
        />
      )}
    </div>
  )
}
