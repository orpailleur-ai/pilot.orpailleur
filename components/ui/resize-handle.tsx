'use client'

import { useCallback, useRef } from 'react'

/**
 * Poignée de redimensionnement d'un panneau latéral.
 *
 * Le séparateur est focusable et expose `aria-valuenow` : c'est le motif
 * « window splitter » du WAI-ARIA, qui autorise le clavier (flèches, Home,
 * End) là où un simple `div` glisser-déposer exclutrait la saisie au clavier.
 *
 * La poignée se place sur le bord GAUCHE du panneau : tirer vers la gauche
 * élargit le panneau, donc `largeur - (déplacement du pointeur)`.
 */
export function ResizeHandle({
  width,
  min,
  max,
  onWidthChange,
  label,
  className = '',
}: {
  /** Largeur actuelle du panneau, en pixels. */
  width: number
  /** Largeur minimale, en pixels. */
  min: number
  /** Largeur maximale, en pixels. */
  max: number
  /** Notifiée à chaque changement de largeur (déjà borné). */
  onWidthChange: (width: number) => void
  /** Libellé accessible du séparateur. */
  label: string
  /** Classes additionnelles — pour masquer la poignée sous un point de rupture. */
  className?: string
}) {
  const drag = useRef<{ startX: number; startWidth: number } | null>(null)

  const clamp = useCallback(
    (value: number) => Math.min(max, Math.max(min, Math.round(value))),
    [min, max],
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Bouton principal seulement : un clic droit ouvrirait un menu
      // contextuel au lieu de redimensionner.
      if (e.button !== 0) return
      // Le geste ne doit pas sélectionner le texte du document autour.
      e.preventDefault()
      drag.current = { startX: e.clientX, startWidth: width }
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // Sans capture, le suivi s'arrête dès que le pointeur quitte la
        // poignée — le redimensionnement reste possible, il s'interrompt.
      }
    },
    [width],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const start = drag.current
      if (!start) return
      onWidthChange(clamp(start.startWidth - (e.clientX - start.startX)))
    },
    [clamp, onWidthChange],
  )

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    drag.current = null
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch {
      // La capture peut déjà avoir été relâchée par le navigateur.
    }
  }, [])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Maj : pas de 64 px, sinon on traverse toute la plage d'un coup.
      const step = e.shiftKey ? 64 : 16
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onWidthChange(clamp(width + step))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        onWidthChange(clamp(width - step))
      } else if (e.key === 'Home') {
        e.preventDefault()
        onWidthChange(min)
      } else if (e.key === 'End') {
        e.preventDefault()
        onWidthChange(max)
      }
    },
    [clamp, max, min, onWidthChange, width],
  )

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      className={`group absolute inset-y-0 left-0 z-10 -ml-1 w-2 cursor-col-resize touch-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}
    >
      {/* Trait de préhension : visible au survol et au focus clavier. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-[width] group-hover:w-0.5 group-focus-visible:w-0.5"
        style={{ backgroundColor: 'var(--color-border)' }}
      />
    </div>
  )
}
