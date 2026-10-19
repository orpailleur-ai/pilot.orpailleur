'use client'

import { ChevronDown } from 'lucide-react'

interface SelectFieldProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  /** Placeholder shown when value is empty */
  placeholder?: string
  isRequired?: boolean
  isDisabled?: boolean
  error?: string
  width?: string
  id?: string
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  isRequired,
  isDisabled,
  error,
  width = '100%',
  id,
}: SelectFieldProps) {
  const inputId = id ?? `select-${label?.toLowerCase().replace(/\s+/g, '-')}`
  const hasError = Boolean(error)

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {label}
          {isRequired && (
            <span aria-hidden="true" style={{ color: 'var(--color-danger)' }}> *</span>
          )}
        </label>
      )}
      <div className="relative">
        <select
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isDisabled}
          aria-required={isRequired}
          aria-invalid={hasError}
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
      {error && (
        <div
          role="alert"
          className="flex items-center gap-1.5 text-sm"
          style={{ color: 'var(--color-danger-text)' }}
        >
          <span aria-hidden="true" style={{ color: 'var(--color-danger)' }}>●</span>
          {error}
        </div>
      )}
    </div>
  )
}
