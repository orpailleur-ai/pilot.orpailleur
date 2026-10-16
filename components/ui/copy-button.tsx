'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@astryxdesign/core'
import { useT } from '@/lib/i18n'

/**
 * Bouton qui copie une valeur, avec confirmation éphémère.
 *
 * Le retour visuel n'est pas un toast : c'est l'icône qui bascule sur une
 * coche le temps de l'opération. Un toast part, se perd derrière une autre
 * notification, et laisse l'utilisateur sans savoir si le clic est passé —
 * alors que la question est précisément « est-ce que ça a marché ? ».
 *
 * `navigator.clipboard` est refusé hors contexte sûr (HTTP, iframe sans
 * permission). On retombe alors sur l'API `execCommand`, dépréciée mais la
 * seule qui fonctionne partout. Échouer franchement vaut mieux qu'un bouton
 * qui semble marcher : le retour rouge dit ce qu'il en est.
 */
export function CopyButton({
  value,
  label,
  labelCopied,
  size = 'sm',
  variant = 'secondary',
  className,
}: {
  /** Ce qui part dans le presse-papier. */
  value: string
  /** Libellé du bouton, et son pendant après copie. */
  label?: string
  labelCopied?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  className?: string
}) {
  const t = useT()
  const [copie, setCopie] = useState(false)
  const [echec, setEchec] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Un minuteur laissé armé à la navigation effacerait sur un composant
  // déjà démonté : on le vide au démontage.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const arm = useCallback((ms: number) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setCopie(false)
      setEchec(false)
    }, ms)
  }, [])

  const copier = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        throw new Error('clipboard indisponible')
      }
      setCopie(true)
      setEchec(false)
      arm(1400)
    } catch {
      // Repli : `execCommand` fonctionne encore là où `clipboard` est refusé.
      const zone = document.createElement('textarea')
      zone.value = value
      zone.setAttribute('readonly', '')
      zone.style.position = 'fixed'
      zone.style.opacity = '0'
      document.body.appendChild(zone)
      zone.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(zone)
      setCopie(ok)
      setEchec(!ok)
      arm(ok ? 1400 : 2600)
    }
  }, [value, arm])

  return (
    <Button
      label={copie ? (labelCopied ?? t('copied')) : (label ?? t('copy'))}
      icon={echec ? undefined : copie ? <Check size={13} /> : <Copy size={13} />}
      variant={echec ? 'destructive' : variant}
      size={size}
      onClick={() => void copier()}
      className={className}
      aria-live="polite"
    />
  )
}