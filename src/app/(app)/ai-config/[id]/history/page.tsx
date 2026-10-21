/**
 * Page d'historique des configurations AI.
 *
 * Affiche la timeline complète des modifications d'une config AI avec :
 *  - Masquage automatique des secrets (API keys)
 *  - Diff field-by-field
 *  - Session grouping (modifications en batch)
 *  - Bouton de rollback (recréer une config depuis un snapshot)
 *
 * Route: /ai-config/[id]/history
 */

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, History as HistoryIcon } from 'lucide-react'
import { AIConfigHistoryTimeline } from './ai-config-history-timeline'

interface PageProps {
  params: {
    id: string
  }
}

async function getAIConfig(id: string) {
  // En production, fetcher depuis l'API
  // const response = await fetch(`${process.env.API_URL}/admin/ai-modeles/${id}`)
  // if (!response.ok) return null
  // return response.json()

  // Pour l'instant, retourner mock data
  return {
    id,
    nom: 'Configuration Mistral OCR',
    provider: 'mistral',
    scope: 'tenant',
  }
}

export default async function AIConfigHistoryPage({ params }: PageProps) {
  const config = await getAIConfig(params.id)

  if (!config) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* En-tête */}
      <div className="mb-6">
        <Link
          href={`/ai-config/${params.id}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la configuration
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
            <HistoryIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Historique des modifications</h1>
            <p className="text-gray-600">{config.nom}</p>
          </div>
        </div>
      </div>

      {/* Note sécurité */}
      <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <div className="flex gap-3">
          <div className="text-yellow-600">🔒</div>
          <div className="text-sm text-yellow-800">
            <strong>Sécurité :</strong> Les clés API et autres secrets sont masqués dans
            l'historique. Seule l'information qu'ils ont changé est conservée.
          </div>
        </div>
      </div>

      {/* Timeline */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Chargement de l'historique...</div>
          </div>
        }
      >
        <AIConfigHistoryTimeline configId={params.id} />
      </Suspense>
    </div>
  )
}

export async function generateMetadata({ params }: PageProps) {
  const config = await getAIConfig(params.id)

  return {
    title: config ? `Historique - ${config.nom}` : 'Historique',
  }
}
