import { useCallback } from 'react'
import { useToast } from '@astryxdesign/core'
import { useI18n } from '@/lib/i18n'

/**
 * Hook utilitaire pour gérer les erreurs d'appel API de manière centralisée.
 * Affiche un toast d'erreur localisé et retourne le message.
 *
 * Usage :
 *   const handleError = useApiError()
 *   // dans un catch :
 *   handleError(err)
 *   // ou avec un fallback key :
 *   handleError(err, 'save_failed')
 */
export function useApiError() {
  const toast = useToast()
  const { t } = useI18n()

  return useCallback(
    (err: unknown, fallbackKey = 'error') => {
      const message =
        err instanceof Error ? err.message : t(fallbackKey)
      toast({ body: message, type: 'error' })
      return message
    },
    [t, toast],
  )
}
