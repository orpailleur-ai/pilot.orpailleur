/**
 * Dashboard des queues Bull en temps réel.
 *
 * Affiche pour chaque queue :
 *  - Profondeur (waiting, active, delayed, failed)
 *  - Temps de traitement moyen
 *  - Taux d'échec
 *  - Dead Letter Queue stats
 *  - Auto-refresh toutes les 5 secondes
 *
 * Route: /queues
 */

import { Suspense } from 'react'
import { Activity, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import { QueuesOverview } from './queues-overview'
import { DLQStats } from './dlq-stats'

export const metadata = {
  title: 'Queues - Monitoring',
  description: 'Monitoring temps réel des queues de traitement',
}

export default function QueuesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* En-tête */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
            <Activity className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Monitoring des Queues</h1>
            <p className="text-gray-600">Surveillance temps réel des files d'attente</p>
          </div>
        </div>

        {/* Stats rapides */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={Clock}
            label="En attente"
            value="—"
            color="blue"
            loading
          />
          <StatCard
            icon={Activity}
            label="En traitement"
            value="—"
            color="green"
            loading
          />
          <StatCard
            icon={AlertTriangle}
            label="Échecs"
            value="—"
            color="red"
            loading
          />
          <StatCard
            icon={CheckCircle}
            label="Complétés (24h)"
            value="—"
            color="purple"
            loading
          />
        </div>
      </div>

      {/* Queues individuelles */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Queues Actives</h2>
        <Suspense
          fallback={
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
              <div className="animate-pulse text-gray-400">Chargement des queues...</div>
            </div>
          }
        >
          <QueuesOverview />
        </Suspense>
      </div>

      {/* Dead Letter Queue */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Dead Letter Queue</h2>
        <Suspense
          fallback={
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
              <div className="animate-pulse text-gray-400">Chargement DLQ...</div>
            </div>
          }
        >
          <DLQStats />
        </Suspense>
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  color: 'blue' | 'green' | 'red' | 'purple'
  loading?: boolean
}

function StatCard({ icon: Icon, label, value, color, loading }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm text-gray-600">{label}</div>
          <div className="text-2xl font-bold text-gray-900">
            {loading ? (
              <div className="h-8 w-16 animate-pulse bg-gray-200 rounded" />
            ) : (
              value
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
