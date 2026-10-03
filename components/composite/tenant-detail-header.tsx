'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Building2, Settings, Trash2 } from 'lucide-react'
import { Button } from '@astryxdesign/core/Button'
import type { Tenant } from '@/lib/api-client'
import { StatusPill } from './status-pill'
import { useI18n } from '@/lib/i18n'

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  scale: 'Scale',
}

interface TenantDetailHeaderProps {
  tenant: Tenant
  actions?: React.ReactNode
}

export function TenantDetailHeader({ tenant, actions }: TenantDetailHeaderProps) {
  const router = useRouter()
  const { t } = useI18n()

  return (
    <div
      className="flex flex-col gap-4 rounded-lg border p-5"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
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
            onClick={() => router.push('/tenants')}
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
              <Building2 size={20} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h1
                  className="text-lg font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {tenant.nom}
                </h1>
                <StatusPill status={tenant.actif ? 'active' : 'inactive'} />
              </div>
              <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <span className="flex items-center gap-1">
                  <Building2 size={12} />
                  {PLAN_LABELS[tenant.plan] ?? tenant.plan}
                </span>
                {tenant.email && <span>{tenant.email}</span>}
                {tenant.ville && <span>· {tenant.ville}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {actions}
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            label={t('settings')}
            icon={<Settings size={15} />}
            onClick={() => router.push(`/tenants/${tenant.id}/settings`)}
          />
        </div>
      </div>

      {/* Bottom meta row */}
      <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {tenant.siret && <span>SIRET {tenant.siret}</span>}
        {tenant.siren && <span>SIREN {tenant.siren}</span>}
        {tenant.adresse && <span>{tenant.adresse}</span>}
        {tenant.code_postal && tenant.ville && (
          <span>{tenant.code_postal} {tenant.ville}</span>
        )}
        <span>
          Créé le {new Date(tenant.createdAt).toLocaleDateString('fr-FR')}
        </span>
      </div>
    </div>
  )
}
