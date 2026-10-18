'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@astryxdesign/core'
import { useI18n } from '@/lib/i18n'

const surfaceStyle = {
  backgroundColor: 'var(--color-background-surface)',
  borderColor: 'var(--color-border)',
} as const

interface MetaItem {
  label: string
  value?: string | null
  icon?: React.ReactNode
}

export interface EntityDetailHeaderProps {
  /** Icône React affichée dans la tuile 44×44 à gauche du titre. */
  icon: React.ReactNode
  /** Nom principal de l'entité (h1). */
  title: string
  /** Ligne secondaire sous le titre (email, code, ville…). */
  subtitle?: React.ReactNode
  /** NOEUDS de statut affichés à droite du titre (StatusPill, span badge…). */
  statusBadge?: React.ReactNode
  /** URL de retour du bouton ArrowLeft. */
  backHref: string
  /** Boutons d'action à droite du header (null si aucun). */
  actions?: React.ReactNode
  /** Liste d'items meta affichés en ligne sous le header. */
  meta?: MetaItem[]
}

/**
 * Header générique pour les pages de détail (tenant / user / role …).
 * Structure identique à tous les shells : bouton retour + tuile icône +
 * titre + badge(s) + actions + ligne meta.
 */
export function EntityDetailHeader({
  icon,
  title,
  subtitle,
  statusBadge,
  backHref,
  actions,
  meta,
}: EntityDetailHeaderProps) {
  const router = useRouter()
  const { t } = useI18n()

  return (
    <div
      className="flex flex-col gap-4 rounded-lg border p-5"
      style={surfaceStyle}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            label={t('back')}
            icon={<ArrowLeft size={16} />}
            onClick={() => router.push(backHref)}
          />
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-lg"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                width: 44,
                height: 44,
              }}
            >
              {icon}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h1
                  className="text-lg font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {title}
                </h1>
                {statusBadge}
              </div>
              {subtitle && (
                <span
                  className="text-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {subtitle}
                </span>
              )}
            </div>
          </div>
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Meta row */}
      {meta && meta.length > 0 && (
        <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {meta.map((item, i) => (
            <span key={i} className="flex items-center gap-1">
              {item.icon}
              {item.label}
              {item.value && <span>{item.value}</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
