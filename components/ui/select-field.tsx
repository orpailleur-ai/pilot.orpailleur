'use client'

import { ChevronDown } from 'lucide-react'
import { Champ } from '@/components/ui/champ'

interface SelectFieldProps {
  label?: string
  /** Précision sous le libellé. */
  description?: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  /** Placeholder shown when value is empty */
  placeholder?: string
  isRequired?: boolean
  /** Affiche « Facultatif ». */
  isOptional?: boolean
  isDisabled?: boolean
  error?: string
  width?: string
  id?: string
}

/**
 * Un sélecteur natif, dans un champ complet (`Champ`) : libellé relié, étiquette obligatoire/facultatif,
 * description et erreur de même typographie que les champs Astryx voisins.
 */
export function SelectField({
  label,
  description,
  value,
  onChange,
  options,
  placeholder,
  isRequired,
  isOptional,
  isDisabled,
  error,
  width = '100%',
  id,
}: SelectFieldProps) {
  const hasError = Boolean(error)

  const controle = (idControle: string | undefined, idDescription?: string) => (
    <div className="relative">
      <select
        id={idControle}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isDisabled}
        aria-required={isRequired}
        aria-invalid={hasError}
        aria-describedby={idDescription}
        aria-label={label ? undefined : placeholder}
        className="w-full appearance-none rounded-lg border px-3 py-2 pr-8 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          width,
          backgroundColor: 'var(--color-background-surface)',
          borderColor: hasError ? 'var(--color-danger)' : 'var(--color-border)',
          color: value ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
          outline: 'none',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.55 : 1,
        }}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: 'var(--color-text-secondary)' }}
        aria-hidden
      />
    </div>
  )

  if (!label) return controle(id)
  return (
    <Champ label={label} description={description} isRequired={isRequired} isOptional={isOptional} error={error}>
      {(idChamp, idDescription) => controle(id ?? idChamp, idDescription)}
    </Champ>
  )
}
