'use client'

import { useEffect } from 'react'
import { Button } from '@astryxdesign/core'
import { RotateCcw, AlertTriangle } from 'lucide-react'

/**
 * Capture les erreurs de rendu des pages (route segment) et affiche un écran
 * récupérable au lieu d'une page blanche.
 *
 * Les erreurs réseau sont déjà gérées par `request()` dans lib/api-client.ts
 * (timeout + retry) ; ce boundary couvre le cas restant : une exception levée
 * pendant le rendu, qui sans lui laisserait l'utilisateur face à une page
 * vide sans aucun moyen de sortie.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Conservé volontairement : en prod, la console du navigateur est le seul
    // moyen de voir le digest renvoyé par Next.js.
    console.error('Erreur de rendu (route segment):', error)
  }, [error])

  const message =
    process.env.NODE_ENV === 'development' && error.message
      ? error.message
      : 'Une erreur inattendue est survenue sur cette page.'

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--color-background-body)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-8 text-center"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border-emphasized)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div
          className="inline-flex h-12 w-12 items-center justify-center rounded-xl mb-4"
          style={{
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <AlertTriangle size={22} aria-hidden />
        </div>

        <h1
          className="text-base font-semibold mb-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Cette page n&apos;a pas pu s&apos;afficher
        </h1>

        <p
          className="text-sm mb-6"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {message}
        </p>

        {error.digest && (
          <p
            className="text-xs mb-6 font-mono"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            référence : {error.digest}
          </p>
        )}

        <div className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            icon={<RotateCcw size={14} />}
            label="Réessayer"
            onClick={reset}
          />
          <Button
            variant="ghost"
            label="Accueil"
            onClick={() => {
              window.location.href = '/'
            }}
          />
        </div>
      </div>
    </div>
  )
}