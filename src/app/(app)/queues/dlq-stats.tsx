/**
 * Statistiques et gestion de la Dead Letter Queue.
 *
 * Affiche les jobs en échec permanent avec option de replay.
 */

'use client'

import { useState, useEffect } from 'react'
import { Trash2, RotateCcw, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface DLQStat {
  queueName: string
  count: number
  oldestJobAge: number | null
}

interface DLQJob {
  jobId: string
  queueName: string
  name: string
  failedReason: string
  attemptsMade: number
  movedToDLQAt: number
}

export function DLQStats() {
  const [stats, setStats] = useState<DLQStat[]>([])
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null)
  const [jobs, setJobs] = useState<DLQJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  useEffect(() => {
    if (selectedQueue) {
      loadJobs(selectedQueue)
    }
  }, [selectedQueue])

  const loadStats = async () => {
    try {
      // En production : const response = await fetch('/api/admin/queues/dlq')
      const mockStats: DLQStat[] = [
        {
          queueName: 'email-send',
          count: 5,
          oldestJobAge: 2 * 24 * 60 * 60 * 1000, // 2 jours
        },
        {
          queueName: 'pdf-generation',
          count: 2,
          oldestJobAge: 5 * 60 * 60 * 1000, // 5 heures
        },
      ]

      setStats(mockStats)
    } catch (err) {
      console.error('Failed to load DLQ stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadJobs = async (queueName: string) => {
    try {
      // En production : const response = await fetch(`/api/admin/queues/dlq/${queueName}`)
      const mockJobs: DLQJob[] = [
        {
          jobId: '123',
          queueName,
          name: 'send',
          failedReason: 'SMTP connection timeout',
          attemptsMade: 5,
          movedToDLQAt: Date.now() - 2 * 60 * 60 * 1000,
        },
      ]

      setJobs(mockJobs)
    } catch (err) {
      console.error('Failed to load DLQ jobs:', err)
    }
  }

  const handleReplay = async (queueName: string, jobId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir relancer ce job ?')) return

    try {
      // await fetch(`/api/admin/queues/dlq/${queueName}/${jobId}/replay`, { method: 'POST' })
      alert('Job relancé avec succès')
      loadStats()
      if (selectedQueue) loadJobs(selectedQueue)
    } catch (err) {
      alert('Erreur lors du replay')
    }
  }

  const totalJobs = stats.reduce((sum, s) => sum + s.count, 0)

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <div className="animate-pulse text-gray-400">Chargement DLQ...</div>
      </div>
    )
  }

  if (totalJobs === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">Dead Letter Queue vide</h3>
        <p className="text-gray-600">Aucun job en échec permanent.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Vue d'ensemble */}
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-yellow-600" />
          <div>
            <div className="font-semibold text-yellow-900">
              {totalJobs} job{totalJobs > 1 ? 's' : ''} en échec permanent
            </div>
            <div className="text-sm text-yellow-800">
              Ces jobs ont échoué après tous les retries et nécessitent une intervention manuelle.
            </div>
          </div>
        </div>
      </div>

      {/* Liste par queue */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <button
            key={stat.queueName}
            onClick={() => setSelectedQueue(stat.queueName)}
            className={`rounded-lg border-2 p-4 text-left transition-all ${
              selectedQueue === stat.queueName
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-gray-900">{stat.queueName}</div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold text-sm">
                {stat.count}
              </div>
            </div>

            {stat.oldestJobAge && (
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <Clock className="h-3 w-3" />
                <span>
                  Plus vieux :{' '}
                  {formatDistanceToNow(Date.now() - stat.oldestJobAge, {
                    locale: fr,
                    addSuffix: true,
                  })}
                </span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Détail des jobs */}
      {selectedQueue && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="font-semibold text-gray-900 mb-4">
            Jobs en échec - {selectedQueue}
          </h3>

          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.jobId}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Job #{job.jobId}</div>
                    <div className="text-sm text-red-600 mt-1">{job.failedReason}</div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                      <span>{job.attemptsMade} tentatives</span>
                      <span>•</span>
                      <span>
                        Échoué{' '}
                        {formatDistanceToNow(job.movedToDLQAt, {
                          locale: fr,
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleReplay(job.queueName, job.jobId)}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Relancer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
