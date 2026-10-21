/**
 * Composant d'overview des queues avec auto-refresh.
 *
 * Affiche une carte par queue avec métriques en temps réel.
 */

'use client'

import { useState, useEffect } from 'react'
import {
  Mail,
  FileText,
  Brain,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Clock,
  Activity,
  XCircle,
} from 'lucide-react'

interface QueueStats {
  name: string
  waiting: number
  active: number
  delayed: number
  failed: number
  completed24h?: number
  avgProcessingTime?: number
  failureRate?: number
}

const QUEUE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'email-send': Mail,
  'ai-ingest': Brain,
  'ai-ocr': FileText,
  'ai-task': Brain,
  'pdf-generation': FileText,
}

const QUEUE_LABELS: Record<string, string> = {
  'email-send': 'Envoi Email',
  'ai-ingest': 'Ingestion AI',
  'ai-ocr': 'OCR AI',
  'ai-task': 'Tâches AI',
  'pdf-generation': 'Génération PDF',
}

export function QueuesOverview() {
  const [queues, setQueues] = useState<QueueStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    loadQueues()
    const interval = setInterval(loadQueues, 5000) // Refresh toutes les 5s
    return () => clearInterval(interval)
  }, [])

  const loadQueues = async () => {
    try {
      // En production, fetcher depuis l'API health check
      // const response = await fetch('/api/health')
      // const data = await response.json()

      // Mock data pour démonstration
      const mockQueues: QueueStats[] = [
        {
          name: 'email-send',
          waiting: 12,
          active: 3,
          delayed: 0,
          failed: 2,
          completed24h: 1547,
          avgProcessingTime: 245,
          failureRate: 0.12,
        },
        {
          name: 'ai-ocr',
          waiting: 5,
          active: 2,
          delayed: 1,
          failed: 0,
          completed24h: 89,
          avgProcessingTime: 3200,
          failureRate: 0.0,
        },
        {
          name: 'pdf-generation',
          waiting: 0,
          active: 0,
          delayed: 0,
          failed: 1,
          completed24h: 234,
          avgProcessingTime: 1800,
          failureRate: 0.42,
        },
      ]

      setQueues(mockQueues)
      setLastUpdate(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="h-5 w-5" />
          <span>Erreur : {error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header avec timestamp */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <span>Mise à jour automatique toutes les 5 secondes</span>
        </div>
        <div>
          Dernière mise à jour :{' '}
          {lastUpdate.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </div>
      </div>

      {/* Cartes queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {queues.map((queue) => (
          <QueueCard key={queue.name} queue={queue} />
        ))}
      </div>
    </div>
  )
}

function QueueCard({ queue }: { queue: QueueStats }) {
  const Icon = QUEUE_ICONS[queue.name] || Activity
  const label = QUEUE_LABELS[queue.name] || queue.name
  const total = queue.waiting + queue.active + queue.delayed

  // Déterminer l'état de santé
  const isHealthy = queue.failed === 0 && total < 100
  const isWarning = queue.failed > 0 && queue.failed < 10 || total >= 100 && total < 1000
  const isCritical = queue.failed >= 10 || total >= 1000

  const statusColor = isCritical
    ? 'border-red-500 bg-red-50'
    : isWarning
    ? 'border-yellow-500 bg-yellow-50'
    : 'border-green-500 bg-green-50'

  const statusIcon = isCritical ? (
    <XCircle className="h-5 w-5 text-red-600" />
  ) : isWarning ? (
    <AlertTriangle className="h-5 w-5 text-yellow-600" />
  ) : (
    <Activity className="h-5 w-5 text-green-600" />
  )

  return (
    <div className={`rounded-lg border-2 ${statusColor} bg-white p-4 shadow-sm`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <Icon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">{label}</div>
            <div className="text-xs text-gray-500">{queue.name}</div>
          </div>
        </div>
        {statusIcon}
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Metric
          label="En attente"
          value={queue.waiting}
          icon={Clock}
          color={queue.waiting > 50 ? 'yellow' : 'gray'}
        />
        <Metric
          label="En traitement"
          value={queue.active}
          icon={Loader2}
          color="blue"
          spin={queue.active > 0}
        />
        <Metric
          label="Différés"
          value={queue.delayed}
          icon={Clock}
          color="purple"
        />
        <Metric
          label="Échecs"
          value={queue.failed}
          icon={XCircle}
          color={queue.failed > 0 ? 'red' : 'gray'}
        />
      </div>

      {/* Métriques secondaires */}
      <div className="border-t border-gray-200 pt-3 space-y-2 text-sm">
        {queue.avgProcessingTime !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Temps moyen</span>
            <span className="font-medium text-gray-900">
              {formatDuration(queue.avgProcessingTime)}
            </span>
          </div>
        )}

        {queue.failureRate !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Taux d'échec</span>
            <span
              className={`font-medium ${
                queue.failureRate > 0.1 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {(queue.failureRate * 100).toFixed(1)}%
            </span>
          </div>
        )}

        {queue.completed24h !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Complétés (24h)</span>
            <span className="font-medium text-gray-900">
              {queue.completed24h.toLocaleString('fr-FR')}
            </span>
          </div>
        )}
      </div>

      {/* Alerte si critique */}
      {isCritical && (
        <div className="mt-3 rounded bg-red-100 border border-red-300 px-3 py-2 text-xs text-red-800">
          <strong>⚠️ Attention :</strong> Cette queue nécessite une intervention.
        </div>
      )}
    </div>
  )
}

interface MetricProps {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'
  spin?: boolean
}

function Metric({ label, value, icon: Icon, color, spin }: MetricProps) {
  const colorClasses = {
    gray: 'text-gray-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    purple: 'text-purple-600',
  }

  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${colorClasses[color]} ${spin ? 'animate-spin' : ''}`} />
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-lg font-bold text-gray-900">{value}</div>
      </div>
    </div>
  )
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}min`
}
