'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { useTenantDetail } from '@/components/composite/tenant-detail-context'
import { ConfirmDialog } from '@/components/composite/confirm-dialog'
import { PermissionGate } from '@/components/composite/permission-gate'
import { Button, useToast } from '@astryxdesign/core'
import { adminTenants } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'

export default function TenantDangerPage() {
  const { tenant, refresh } = useTenantDetail()
  const router = useRouter()
  const { t } = useI18n()
  const toast = useToast()
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeactivate, setShowDeactivate] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [showReactivate, setShowReactivate] = useState(false)
  const [reactivating, setReactivating] = useState(false)

  async function handleDeactivate() {
    setDeactivating(true)
    try {
      await adminTenants.update(tenant!.id, { actif: false } as any)
      refresh()
      toast({ body: t('tenant_deactivated'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setDeactivating(false)
    }
  }

  async function handleReactivate() {
    setReactivating(true)
    try {
      await adminTenants.update(tenant!.id, { actif: true } as any)
      refresh()
      toast({ body: t('tenant_reactivated'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setReactivating(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await adminTenants.delete(tenant!.id)
      router.push('/tenants')
      toast({ body: t('tenant_deleted'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  if (!tenant) return null

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('danger_zone', 'Zone danger')}
        icon={<AlertTriangle size={20} style={{ color: 'var(--color-danger)' }} />}
      />

      <div
        className="rounded-lg border p-6 flex flex-col gap-5"
        style={{
          backgroundColor: 'var(--color-background-surface)',
          borderColor: 'color-mix(in srgb, var(--color-danger) 30%, var(--color-border))',
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
              width: 44,
              height: 44,
            }}
          >
            <AlertTriangle size={20} style={{ color: 'var(--color-danger)' }} />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {t('danger_zone', 'Zone danger')}
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {t('danger_zone_hint', 'Ces actions sont irréversibles. Assurez-vous dʼavoir une sauvegarde des données.')}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
          {tenant.actif && (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {t('tenant_deactivate_label', 'Désactiver le tenant')}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('tenant_deactivate_hint', 'Le tenant ne pourra plus se connecter, mais les données seront conservées.')}
                </p>
              </div>
              <PermissionGate permission="TENANT_WRITE">
                <Button
                  variant="secondary"
                  label={t('deactivate')}
                  onClick={() => setShowDeactivate(true)}
                />
              </PermissionGate>
            </div>
          )}

          {!tenant.actif && (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {t('tenant_reactivate', 'Réactiver le tenant')}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('tenant_activate_description', 'Le tenant pourra à nouveau se connecter.')}
                </p>
              </div>
              <PermissionGate permission="TENANT_WRITE">
                <Button
                  variant="primary"
                  label={t('tenant_reactivate')}
                  onClick={() => setShowReactivate(true)}
                />
              </PermissionGate>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                {t('tenant_delete_label', 'Supprimer le tenant')}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('tenant_delete_hint', 'Suppression définitive : toutes les données seront perdues.')}
              </p>
            </div>
            <PermissionGate permission="TENANT_WRITE">
              <Button
                variant="destructive"
                label={t('delete')}
                onClick={() => setShowDelete(true)}
              />
            </PermissionGate>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeactivate}
        onOpenChange={setShowDeactivate}
        title={t('tenant_deactivate_confirm')}
        description={`${tenant.nom} ? ${t('tenant_deactivate_hint', 'Il ne pourra plus se connecter.')}`}
        confirmLabel={t('deactivate')}
        confirmVariant="primary"
        onConfirm={handleDeactivate}
        isLoading={deactivating}
      />

      <ConfirmDialog
        isOpen={showReactivate}
        onOpenChange={setShowReactivate}
        title={t('tenant_activate_confirm')}
        description={t('tenant_activate_description')}
        confirmLabel={t('tenant_reactivate')}
        confirmVariant="primary"
        onConfirm={handleReactivate}
        isLoading={reactivating}
      />

      <ConfirmDialog
        isOpen={showDelete}
        onOpenChange={setShowDelete}
        title={t('delete_tenant')}
        description={t('delete_tenant_hint', { nom: tenant.nom })}
        confirmLabel={t('delete')}
        confirmVariant="destructive"
        onConfirm={handleDelete}
        isLoading={deleting}
      />
    </div>
  )
}
