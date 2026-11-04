'use client'

import { useId, type ReactNode } from 'react'

export interface ChampProps {
  label: string
  description?: string
  /** Affiche « Obligatoire ». */
  isRequired?: boolean
  /** Affiche « Facultatif ». */
  isOptional?: boolean
  error?: string
  /** Sous le contrôle : précisions, suggestions… Dans le champ, pour que toutes les cellules d'une rangée aient la même structure. */
  footer?: ReactNode
  /** Le contrôle ; une fonction reçoit l'id à poser dessus (le libellé y est relié). */
  children: ReactNode | ((id: string, descriptionId: string | undefined) => ReactNode)
  /** Plusieurs contrôles forment UN champ : le libellé nomme le GROUPE (`role="group"`). */
  isGroup?: boolean
  className?: string
}

/**
 * Un champ de formulaire (« Champ ») pour tout ce qui n'est pas un champ Astryx (sélecteur natif, groupe de choix, saisie
 * composée) : libellé relié au contrôle, étiquette obligatoire/facultatif, description et erreur — avec la
 * typographie des champs Astryx, pour que tous les champs d'une fenêtre s'alignent. Le style vit dans
 * `globals.css` (`.orp-field*`).
 */
export function Champ({ label, description, isRequired, isOptional, error, footer, children, isGroup, className }: ChampProps) {
  const id = useId()
  const descriptionId = description ? `${id}-desc` : undefined
  const etiquette = (isRequired || isOptional) && (
    <span className="orp-field-tag">∙ {isRequired ? 'Obligatoire' : 'Facultatif'}</span>
  )
  const contenu = typeof children === 'function' ? children(id, descriptionId) : children
  return (
    <div className={`orp-field${className ? ` ${className}` : ''}`}>
      {isGroup ? (
        <span id={`${id}-label`} className="orp-field-label">
          <span>{label}</span>
          {etiquette}
        </span>
      ) : (
        <label htmlFor={id} className="orp-field-label">
          <span>{label}</span>
          {etiquette}
        </label>
      )}
      {description && <span id={descriptionId} className="orp-field-desc">{description}</span>}
      {isGroup ? <div role="group" aria-labelledby={`${id}-label`} aria-describedby={descriptionId}>{contenu}</div> : contenu}
      {error && <p role="alert" className="orp-field-error">{error}</p>}
      {footer}
    </div>
  )
}
