'use client'

import { Building2, Settings } from 'lucide-react'
import { Button } from '@astryxdesign/core/Button'
import type { Tenant } from '@/lib/api-client'
import { StatusPill } from './status-pill'
import { EntityDetailHeader, type EntityDetailHeaderProps } from './entity-detail-header'
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
  const { t } = useI18n()

  return (
    <EntityDetailHeader
      icon={<Building2 size={20} style={{ color: 'var(--color-accent)' }} />}
      title={tenant.nom}
      subtitle={
        <span className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <span className="flex items-center gap-1">
            <Building2 size={12} />
            {PLAN_LABELS[tenant.plan] ?? tenant.plan}
          </span>
          {tenant.email && <span>{tenant.email}</span>}
          {tenant.ville && <span>· {tenant.ville}</span>}
        </span>
      }
      statusBadge={<StatusPill status={tenant.actif ? 'active' : 'inactive'} />}
      backHref="/tenants"
      actions={
        <>
          {actions}
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            label={t('settings')}
            icon={<Settings size={15} />}
            onClick={() => window.location.href = `/tenants/${tenant.id}/settings`}
          />
        </>
      }
      meta={[
        tenant.siret && { label: `SIRET ${tenant.siret}` },
        tenant.siren && { label: `SIREN ${tenant.siren}` },
        tenant.adresse && { label: tenant.adresse },
        tenant.code_postal && tenant.ville && { label: `${tenant.code_postal} ${tenant.ville}` },
        { label: `Créé le ${new Date(tenant.createdAt).toLocaleDateString('fr-FR')}` },
      ].filter(Boolean) as EntityDetailHeaderProps['meta']}
    />
  )
}
