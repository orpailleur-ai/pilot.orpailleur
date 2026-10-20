'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { previewTemplateAdmin } from '@/lib/pdf-templates-client'

/**
 * États du rendu d'aperçu d'un modèle PDF.
 *
 * `idle`    — aucun rendu demandé ;
 * `loading` — rendu en cours (Puppeteer, 1 à 3 s) ;
 * `ready`   — un PDF est disponible ;
 * `error`   — le rendu a échoué.
 */
export type PdfPreviewStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface PdfPreviewState {
  status: PdfPreviewStatus
  /** URL présignée du PDF rendu. */
  url: string | null
  /** Message d'erreur du dernier rendu. */
  error: string
  /**
   * Corps du modèle ayant servi au dernier rendu réussi.
   *
   * C'est la référence de comparaison qui permet de dire « l'aperçu ne
   * correspond plus à ce que j'édite » : le rendu envoie le corps COURANT
   * (sauvegardé ou non), mais l'utilisateur peut modifier le modèle depuis.
   */
  renderedFrom: string | null
}

const INITIAL: PdfPreviewState = {
  status: 'idle',
  url: null,
  error: '',
  renderedFrom: null,
}

/**
 * Pilote le rendu d'aperçu d'un modèle de document.
 *
 * Le rendu passe par Puppeteer côté `document.orpailleur` : chaque appel
 * coûte un vrai navigateur. Il n'y a donc PAS d'auto-refresh sur la frappe —
 * l'utilisateur déclenche, et l'aperçu signale quand il a pris du retard.
 *
 * Les rendus sont numérotés : un rendu lent qui se termine après un rendu plus
 * récent ne doit pas écraser le résultat le plus frais. Chaque appel incrémente
 * un compteur, et seule la réponse portant le bon numéro est appliquée.
 */
export function usePdfPreview(id: string | null, body: string) {
  const [state, setState] = useState<PdfPreviewState>(INITIAL)

  /** Numéro du dernier rendu demandé — sert à écarter les réponses obsolètes. */
  const requestId = useRef(0)
  /** Évite d'écrire dans l'état d'un composant démonté. */
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const generate = useCallback(async () => {
    if (!id) return
    const current = ++requestId.current

    setState((s) => ({ ...s, status: 'loading', error: '' }))

    try {
      const result = await previewTemplateAdmin(id, body)
      if (!mounted.current || current !== requestId.current) return
      setState({
        status: 'ready',
        url: result.url,
        error: '',
        renderedFrom: body,
      })
    } catch (e: unknown) {
      if (!mounted.current || current !== requestId.current) return
      // L'URL précédente est CONSERVÉE : un rendu qui échoue ne doit pas
      // laisser un cadre vide à la place d'un document encore lisible. Le
      // panneau affiche l'erreur par-dessus le PDF.
      setState((s) => ({
        status: 'error',
        url: s.url,
        error: e instanceof Error ? e.message : String(e),
        renderedFrom: s.renderedFrom,
      }))
    }
  }, [id, body])

  /**
   * L'aperçu est-il en retard sur le modèle affiché ?
   *
   * Vrai seulement si un PDF existe ET que le corps a bougé depuis le rendu.
   * Un aperçu en cours n'est pas « obsolète » : il est en train de se faire.
   */
  const stale = state.status === 'ready' && state.renderedFrom !== body

  return { ...state, stale, generate }
}
