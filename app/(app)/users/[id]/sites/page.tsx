'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Globe, Plus, Trash2 } from 'lucide-react'
import { Button, useToast } from '@astryxdesign/core'
import { Modal, ModalSection, FieldGrid } from '@/components/ui/modal'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { PageHeader } from '@/components/layout/page-header'
import { Spinner } from '@/components/ui/spinner'
import { ConfirmDialog } from '@/components/composite/confirm-dialog'
import { PermissionGate } from '@/components/composite/permission-gate'
import {
  adminUsers,
  adminTenants,
  type AdminUser,
  type Tenant,
  type Site,
  apiClient,
} from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'

export default function UserSitesPage() {
  const params = useParams()
  const userId = params.id as string
  const { t } = useI18n()
  const toast = useToast()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [allSites, setAllSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<string | null>(null)

  const [form, setForm] = useState({ siteId: '' })

  useEffect(() => {
    load()
  }, [userId])

  async function load() {
    setLoading(true)
    setFetchError(null)
    try {
      const [userData, tenantsData, userSites] = await Promise.all([
        adminUsers.get(userId),
        adminTenants.list(),
        adminUsers.getUserSites(userId),
      ])
      setUser(userData)
      setTenants(tenantsData)
      setAllSites(userSites)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : t('error'))
    } finally {
      setLoading(false)
    }
  }

  async function handleAddSite(e: React.FormEvent) {
    e.preventDefault()
    if (!form.siteId) return
    setSaving(true)
    try {
      const currentSiteIds = user!.sites
      await apiClient.put(`/admin/users/${userId}/sites`, {
        site_ids: [...currentSiteIds, form.siteId],
      })
      setShowAdd(false)
      setForm({ siteId: '' })
      load()
      toast({ body: t('site_assigned'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveSite() {
    if (!removeTarget) return
    setRemoving(removeTarget)
    try {
      const remaining = user!.sites.filter((sid) => sid !== removeTarget)
      await apiClient.put(`/admin/users/${userId}/sites`, {
        site_ids: remaining,
      })
      setRemoveTarget(null)
      load()
      toast({ body: t('site_removed'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setRemoving(null)
    }
  }

  const availableSites = allSites.filter((s) => !user?.sites.includes(s.id))

  interface SiteRow {
    id: string
    nom: string
    ville: string | null
    tenant_nom: string
  }

  const rows: SiteRow[] = allSites
    .filter((s) => user?.sites.includes(s.id))
    .map((s) => {
      const tenant = tenants.find((ten) => ten.id === s.tenant_id)
      return {
        id: s.id,
        nom: s.nom,
        ville: s.ville,
        tenant_nom: tenant?.nom ?? s.tenant_id.slice(0, 8),
      }
    })

  const columns: Column<SiteRow>[] = [
    {
      key: 'nom',
      header: t('user_site_column', 'Site'),
      mobile: 'primary',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Globe size={14} style={{ color: 'var(--color-accent)' }} />
          <span style={{ color: 'var(--color-text-primary)' }}>{row.nom}</span>
        </div>
      ),
    },
    {
      key: 'ville',
      header: t('user_city_column', 'Ville'),
      mobile: 'inline',
      render: (row) => row.ville ?? '—',
    },
    {
      key: 'tenant_nom',
      header: t('tenants'),
      mobile: 'hidden',
      render: (row) => (
        <span
          className="rounded px-1.5 py-0.5 text-xs"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
            color: 'var(--color-accent)',
          }}
        >
          {row.tenant_nom}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      mobile: 'hidden',
      render: (row) => (
        <PermissionGate permission="USER_WRITE">
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            label={t('user_remove')}
            icon={<Trash2 size={13} />}
            isDisabled={removing === row.id}
            onClick={() => setRemoveTarget(row.id)}
          />
        </PermissionGate>
      ),
    },
  ]

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size={8} /></div>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('user_sites')}
        action={
          <PermissionGate permission="USER_WRITE">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              label={t('user_sites_assign')}
              onClick={() => setShowAdd(true)}
              isDisabled={availableSites.length === 0}
            />
          </PermissionGate>
        }
      />

      {fetchError && <InlineError message={fetchError} />}

      {rows.length === 0 ? (
        <EmptyState
          icon={<Globe size={24} />}
          title={t('user_sites_empty')}
          description={t('user_sites_empty_hint')}
        />
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />
      )}

      <Modal
        isOpen={showAdd}
        onOpenChange={(open) => { if (!open) setShowAdd(false) }}
        title={t('user_sites_assign')}
        size="sm"
      >
        <form onSubmit={handleAddSite} className="space-y-5">
          <ModalSection title={t('user_sites_assign')}>
            <FieldGrid columns={1}>
              <div>
                <label
                  className="mb-1 block text-xs font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('user_site_column', 'Site')}
                </label>
                <select
                  className="h-9 w-full rounded-md border px-2 text-sm"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-background-surface)',
                    color: 'var(--color-text-primary)',
                  }}
                  value={form.siteId}
                  onChange={(e) => setForm((f) => ({ ...f, siteId: e.target.value }))}
                  required
                >
                  <option value="">{t('user_site_select')}</option>
                  {availableSites.map((s) => {
                    const tenant = tenants.find((ten) => ten.id === s.tenant_id)
                    return (
                      <option key={s.id} value={s.id}>
                        {s.nom} — {tenant?.nom ?? s.tenant_id.slice(0, 8)}
                      </option>
                    )
                  })}
                </select>
              </div>
            </FieldGrid>
          </ModalSection>

          <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <Button
              label={t('cancel')}
              variant="secondary"
              onClick={() => setShowAdd(false)}
              className="flex-1"
            />
            <Button
              label={saving ? t('saving') : t('user_assign')}
              variant="primary"
              type="submit"
              isLoading={saving}
              className="flex-1"
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={removeTarget !== null}
        onOpenChange={(open) => { if (!open) setRemoveTarget(null) }}
        title={t('user_site_remove_confirm')}
        description={t('user_site_remove_description')}
        confirmLabel={t('delete')}
        confirmVariant="destructive"
        onConfirm={handleRemoveSite}
        isLoading={removing !== null}
      />
    </div>
  )
}
