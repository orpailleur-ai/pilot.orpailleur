'use client'

import { useEffect, useState } from 'react'

/**
 * Suit une media query et renvoie son résultat.
 *
 * La première valeur est `false` : le rendu serveur ne connaît pas la
 * largeur de la fenêtre, et une valeur différente selon le serveur et le
 * client ferait diverger l'hydratation. Le résultat réel arrive à l'effet
 * suivant.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(query)
    const update = () => setMatches(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [query])

  return matches
}
