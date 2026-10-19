'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Plus, Lock } from 'lucide-react'
import { Button, useToast } from '@astryxdesign/core'
import { Modal, ModalSection, FieldGrid } from '@/components/ui/modal'
import { TextInput } from '@astryxdesign/core'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { FieldError } from '@/components/ui/form-field'
import { useFormErrors } from '@/components/ui/form-field'
import { Spinner } from '@/components/ui/spinner'
import { PageHeader } from '@/components/layout/page-header'
import { roles, type Role } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'

export default function RolesPage() {
  const router = useRouter()
  const { t } = useI18n()
  const toast = useToast()
  const formErrors = useFormErrors()
  const [roleList, setRoleList] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ code: '', label: '' })

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    setFetchError(null)
    try {
      const data = await roles.list()
      setRoleList(data)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : t('error'))
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    let hasError = false
    if (!form.code.trim()) { formErrors.setError('code', t('required')); hasError = true }
    else formErrors.clearError('code')
    if (!form.label.trim()) { formErrors.setError('label', t('required')); hasError = true }
    else formErrors.clearError('label')
    if (hasError) return
    setSaving(true)
    try {
      const created = await roles.create({ code: form.code, label: form.label })
      setShowCreate(false)
      setForm({ code: '', label: '' })
      load()
      toast({ body: t('role_created'), type: 'info' })
      router.push(`/roles/${created.id}`)
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const columns: Column<Role>[] = [
    {
      key: 'label',
      header: t('name'),
      mobile: 'primary',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Shield size={14} style={{ color: 'var(--color-accent)' }} />
          <span
            className="font-medium"
            style={{ color: 'var(--color-accent)' }}
          >
            {row.label}
          </span>
          {row.isSystem && (
            <span
              className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-text-secondary) 10%, transparent)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <Lock size={10} /> {t('roles_system')}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'code',
      header: t('roles_code'),
      mobile: 'inline',
      render: (row) => (
        <span
          className="font-mono text-xs rounded px-1.5 py-0.5"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-accent) 6%, transparent)',
            color: 'var(--color-accent)',
          }}
        >
          {row.code}
        </span>
      ),
    },
    {
      key: 'isSystem',
      header: t('roles_type'),
      mobile: 'hidden',
      render: (row) =>
        row.isSystem ? (
          <span style={{ color: 'var(--color-text-secondary)' }}>{t('roles_system')}</span>
        ) : (
          <span style={{ color: 'var(--color-accent)' }}>{t('roles_custom')}</span>
        ),
    },
    {
      key: 'permissions',
      header: t('roles_permissions'),
      mobile: 'hidden',
      render: (row) => (
        <span style={{ color: 'var(--color-text-secondary)' }}>
          {row.permissions?.length ?? 0} permission(s)
        </span>
      ),
    },
  ]

  const action = (
    <Button
      variant="primary"
      icon={<Plus size={14} />}
      label={t('roles_new')}
      onClick={() => setShowCreate(true)}
    />
  )

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={8} />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title={t('roles_title')}
        icon={<Shield size={20} style={{ color: 'var(--color-text-primary)' }} />}
        action={action}
      />

      {fetchError && <InlineError message={fetchError} />}

      {roleList.length === 0 ? (
        <EmptyState
          icon={<Shield size={24} />}
          title={t('roles_empty')}
          description={t('roles_empty_hint')}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={roleList}
          rowKey={(row) => row.id}
          onRowClick={(row) => router.push(`/roles/${row.id}`)}
        />
      )}

      {/* Create modal */}
      <Modal
        isOpen={showCreate}
        onOpenChange={(open) => { if (!open) { setShowCreate(false); formErrors.clearAll() } }}
        title={t('roles_modal_title')}
        size="sm"
      >
        <form onSubmit={handleCreate} className="space-y-5">
          <ModalSection title={t('roles_modal_title')}>
            <FieldGrid columns={1}>
              <div className="flex flex-col gap-1">
                <TextInput
                  label={t('roles_code_label')}
                  value={form.code}
                  onChange={(v) => { setForm((f) => ({ ...f, code: v.toLowerCase().replace(/\s+/g, '_') })); formErrors.clearError('code') }}
                  isRequired
                  width="100%"
                  placeholder="chef_boulanger"
                />
                <FieldError message={formErrors.errors.code} />
              </div>
              <div className="flex flex-col gap-1">
                <TextInput
                  label={t('roles_label_label')}
                  value={form.label}
                  onChange={(v) => { setForm((f) => ({ ...f, label: v })); formErrors.clearError('label') }}
                  isRequired
                  width="100%"
                  placeholder="Chef boulanger"
                />
                <FieldError message={formErrors.errors.label} />
              </div>
            </FieldGrid>
          </ModalSection>

          <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <Button
              label={t('cancel')}
              variant="secondary"
              onClick={() => setShowCreate(false)}
              className="flex-1"
            />
            <Button
              label={saving ? t('loading') : t('add')}
              variant="primary"
              type="submit"
              isLoading={saving}
              className="flex-1"
            />
          </div>
        </form>
      </Modal>
    </>
  )
}
