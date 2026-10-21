/**
 * Timeline d'historique spécifique aux configs AI.
 *
 * Différences avec la timeline générique :
 *  - Détection automatique des secrets masqués
 *  - Affichage des sessions (grouping de modifications)
 *  - Bouton de rollback pour restaurer une version
 *  - Highlights pour les champs critiques (model, apiKey)
 */

'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Clock,
  User,
  Key,
  Settings,
  AlertCircle,
  RotateCcw,
  CheckCircle,
  Edit,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface HistoryEntry {
  id: string
  changed_fields: Record<string, { old: any; new: any; changed?: boolean }>
  snapshot: Record<string, any>
  changed_by?: string
  changed_by_name?: string
  changed_by_email?: string
  changed_at: string
  session_id?: string
  action: string
}

interface AIConfigHistoryTimelineProps {
  configId: string
}

export function AIConfigHistoryTimeline({ configId }: AIConfigHistoryTimelineProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadHistory()
  }, [configId])

  const loadHistory = async () => {
    try {
      setLoading(true)
      setError(null)

      // En production, fetcher depuis l'API
      // const response = await fetch(`/api/admin/ai-modeles/${configId}/history`)
      // const data = await response.json()

      // Mock data pour démonstration
      const mockData: HistoryEntry[] = [
        {
          id: '1',
          action: 'updated',
          changed_fields: {
            model: { old: 'mistral-small', new: 'mistral-medium' },
            apiKey: { old: '***MASKED***', new: '***MASKED***', changed: true },
            maxTokens: { old: 1000, new: 2000 },
          },
          snapshot: {},
          changed_by_name: 'Admin User',
          changed_by_email: 'admin@orpailleur.com',
          changed_at: new Date().toISOString(),
          session_id: 'session-1',
        },
        {
          id: '2',
          action: 'created',
          changed_fields: {},
          snapshot: {},
          changed_by_name: 'System',
          changed_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ]

      setEntries(mockData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const toggleSession = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions)
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId)
    } else {
      newExpanded.add(sessionId)
    }
    setExpandedSessions(newExpanded)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Clock className="h-6 w-6 animate-spin text-gray-400 mr-2" />
        <span className="text-gray-600">Chargement de l'historique...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Aucun historique disponible pour cette configuration.
      </div>
    )
  }

  // Grouper par session
  const groupedEntries = groupBySession(entries)

  return (
    <div className="space-y-6">
      {groupedEntries.map((group, groupIndex) => (
        <SessionGroup
          key={group.sessionId || groupIndex}
          group={group}
          isExpanded={expandedSessions.has(group.sessionId || '')}
          onToggle={() => toggleSession(group.sessionId || '')}
        />
      ))}
    </div>
  )
}

interface SessionGroupProps {
  group: {
    sessionId?: string
    entries: HistoryEntry[]
  }
  isExpanded: boolean
  onToggle: () => void
}

function SessionGroup({ group, isExpanded, onToggle }: SessionGroupProps) {
  const firstEntry = group.entries[0]
  const hasMultiple = group.entries.length > 1

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />

      {/* Session header (si multiple) */}
      {hasMultiple && (
        <button
          onClick={onToggle}
          className="relative pl-12 w-full text-left mb-2 hover:bg-gray-50 rounded p-2 -ml-2"
        >
          <div className="absolute left-0 top-3 flex h-8 w-8 items-center justify-center rounded-full border-2 border-blue-200 bg-blue-50">
            <Settings className="h-4 w-4 text-blue-600" />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">
                Session de modifications ({group.entries.length} changements)
              </div>
              <div className="text-sm text-gray-500">
                {format(new Date(firstEntry.changed_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </div>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </button>
      )}

      {/* Entries */}
      {(isExpanded || !hasMultiple) && (
        <div className="space-y-4">
          {group.entries.map((entry) => (
            <HistoryEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}

function HistoryEntryCard({ entry }: { entry: HistoryEntry }) {
  const [showRollback, setShowRollback] = useState(false)

  const ActionIcon = entry.action === 'created' ? CheckCircle : Edit
  const actionColor = entry.action === 'created' ? 'text-green-600' : 'text-blue-600'

  const hasChanges = Object.keys(entry.changed_fields).length > 0

  return (
    <div className="relative pl-12">
      {/* Icon */}
      <div className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-200 bg-white">
        <ActionIcon className={`h-4 w-4 ${actionColor}`} />
      </div>

      {/* Card */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="font-medium text-gray-900">
              {entry.action === 'created' ? 'Configuration créée' : 'Configuration modifiée'}
            </div>

            <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
              <User className="h-3.5 w-3.5" />
              <span>{entry.changed_by_name || entry.changed_by_email || 'Inconnu'}</span>
              <span className="text-gray-400">•</span>
              <time dateTime={entry.changed_at}>
                {format(new Date(entry.changed_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </time>
            </div>
          </div>

          {/* Rollback button */}
          {entry.action !== 'created' && (
            <button
              onClick={() => setShowRollback(!showRollback)}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              <RotateCcw className="h-4 w-4" />
              Restaurer
            </button>
          )}
        </div>

        {/* Changed fields */}
        {hasChanges && (
          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            {Object.entries(entry.changed_fields).map(([field, change]) => (
              <AIFieldChange key={field} field={field} change={change} />
            ))}
          </div>
        )}

        {/* Rollback confirmation */}
        {showRollback && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
              <div className="text-sm text-yellow-800">
                <strong>Attention :</strong> Cette action créera une nouvelle configuration avec
                les paramètres de cette version.
              </div>
              <div className="mt-3 flex gap-2">
                <button className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700">
                  Confirmer la restauration
                </button>
                <button
                  onClick={() => setShowRollback(false)}
                  className="px-3 py-1.5 bg-white text-gray-700 text-sm rounded border border-gray-300 hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AIFieldChange({
  field,
  change,
}: {
  field: string
  change: { old: any; new: any; changed?: boolean }
}) {
  const isSensitive = field === 'apiKey' || field.toLowerCase().includes('secret')
  const fieldLabel = formatFieldName(field)

  // Si c'est un champ sensible et qu'il a changé, afficher juste l'icône
  if (isSensitive && change.changed) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Key className="h-4 w-4 text-yellow-600" />
        <span className="font-medium text-gray-700">{fieldLabel}</span>
        <span className="text-gray-600">modifié</span>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          (valeur masquée)
        </span>
      </div>
    )
  }

  const oldValue = formatValue(change.old)
  const newValue = formatValue(change.new)

  return (
    <div className="text-sm">
      <div className="font-medium text-gray-700 mb-2">{fieldLabel}</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded bg-red-50 border border-red-200 p-2">
          <div className="text-xs text-red-600 font-medium mb-1">Avant</div>
          <div className="text-red-900 font-mono text-xs break-all">{oldValue}</div>
        </div>
        <div className="rounded bg-green-50 border border-green-200 p-2">
          <div className="text-xs text-green-600 font-medium mb-1">Après</div>
          <div className="text-green-900 font-mono text-xs break-all">{newValue}</div>
        </div>
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function groupBySession(entries: HistoryEntry[]): Array<{
  sessionId?: string
  entries: HistoryEntry[]
}> {
  const groups: Array<{ sessionId?: string; entries: HistoryEntry[] }> = []
  const sessionMap = new Map<string, HistoryEntry[]>()

  for (const entry of entries) {
    if (entry.session_id) {
      if (!sessionMap.has(entry.session_id)) {
        sessionMap.set(entry.session_id, [])
      }
      sessionMap.get(entry.session_id)!.push(entry)
    } else {
      groups.push({ entries: [entry] })
    }
  }

  // Ajouter les sessions groupées
  sessionMap.forEach((entries, sessionId) => {
    groups.push({ sessionId, entries })
  })

  // Trier par date (plus récent d'abord)
  return groups.sort((a, b) => {
    const aDate = new Date(a.entries[0].changed_at).getTime()
    const bDate = new Date(b.entries[0].changed_at).getTime()
    return bDate - aDate
  })
}

function formatFieldName(field: string): string {
  const fields: Record<string, string> = {
    nom: 'Nom',
    provider: 'Fournisseur',
    model: 'Modèle',
    apiKey: 'Clé API',
    baseUrl: 'URL de base',
    maxTokens: 'Tokens maximum',
    temperature: 'Température',
    topP: 'Top P',
    scope: 'Portée',
    siteId: 'Site',
  }
  return fields[field] || field.replace(/([A-Z])/g, ' $1').trim()
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '—'
  if (value === '***MASKED***') return '🔒'
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}
