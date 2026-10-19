'use client'

import { useState, useCallback } from 'react'
import { AlertCircle } from 'lucide-react'

/**
 * Hook de gestion d'erreurs de formulaire — remplace les `if (!x) return`
 * silencieux. Chaque erreur est associative : { champ → message }.
 *
 * Usage :
 *   const { errors, setError, clearError, hasErrors } = useFormErrors()
 *   <TextInput
 *     onChange={(v) => { onChange(v); clearError('nom') }}
 *     onBlur={() => { if (!value.trim()) setError('nom', t('required')) }}
 *   />
 *   {errors.nom && <FieldError message={errors.nom} />}
 */
export function useFormErrors<T extends string = string>() {
  const [errors, setErrors] = useState<Partial<Record<T, string>>>({})

  const setError = useCallback((field: T, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }))
  }, [])

  const clearError = useCallback((field: T) => {
    setErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const clearAll = useCallback(() => setErrors({}), [])

  const hasErrors = Object.keys(errors).length > 0

  return { errors, setError, clearError, clearAll, hasErrors }
}

/**
 * Affiche un message d'erreur sous un champ.
 * Vide si `message` est falsy — pas de wrapper inutile.
 */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="flex items-start gap-1.5 text-sm"
      style={{ color: 'var(--color-danger-text)' }}
    >
      <AlertCircle size={13} className="mt-0.5 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  )
}
