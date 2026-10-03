'use client'

import { AlertCircle } from 'lucide-react'

/**
 * Bandeau d'erreur en ligne. Utilisé pour les échecs de chargement
 * ou de validation.
 */
export function InlineError({ message }: { message: string }) {
  if (!message) return null

  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
        borderColor: 'color-mix(in srgb, var(--color-danger) 40%, transparent)',
        color: 'var(--color-danger)',
      }}
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">{message}</span>
    </div>
  )
}
