'use client'

import { CheckCircle2, XCircle } from 'lucide-react'

/**
 * Pastille d'état cliquable : active/inactive.
 *
 * Elle REMPLACE le bouton « Activer / Désactiver » de l'en-tête. Un
 * bouton qui change de libellé selon l'état ne dit pas l'état : il
 * propose une action, et il faut déjà connaître l'état pour savoir ce
 * que le bouton va faire. La pastille, elle, montre l'état ET permet
 * de le changer — un seul élément au lieu de deux, et l'information
 * visible sans effort.
 *
 * Les couleurs reprennent celles de `StatusPill` (vert = actif, gris =
 * inactif) : même lecture d'un bout à l'autre de l'application.
 */
export function ActiveTogglePill({
  actif,
  labelActif,
  labelInactif,
  onToggle,
  isDisabled,
}: {
  /** État courant. */
  actif: boolean
  /** Libellé de l'état actif. */
  labelActif: string
  /** Libellé de l'état inactif. */
  labelInactif: string
  /** Appelé au clic : bascule l'état. */
  onToggle: () => void
  isDisabled?: boolean
}) {
  const Icon = actif ? CheckCircle2 : XCircle
  const color = actif ? 'var(--color-success)' : 'var(--color-text-secondary)'

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isDisabled}
      aria-pressed={actif}
      title={actif ? labelActif : labelInactif}
      className="inline-flex items-center gap-1.5 rounded-full font-medium transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
        color: 'var(--color-text-primary)',
        fontSize: '13px',
        padding: '3px 9px',
      }}
    >
      <Icon size={13} color={color} aria-hidden="true" />
      <span>{actif ? labelActif : labelInactif}</span>
    </button>
  )
}
