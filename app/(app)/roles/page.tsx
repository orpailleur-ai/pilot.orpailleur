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
import { Spinner } from '@/components/ui/spinner'
import { roles, type Role } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'

export default function RolesPage() {
  const router = useRouter()
  const { t } = useI18n()
  const toast = useToast()
  const [roleList, setRoleList] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ code: '', label: '' })

  useEffect(() => {
    load()
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
    if (!form.code.trim() || !form.label.trim()) return
    setSaving(true)
    try {
      await roles.create(form as any)
      setShowCreate(false)
      setForm({ code: '', label: '' })
      load()
      toast({ body: 'Rôle créé', type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const columns: Column<Role>[] = [
    {
      key: 'label',
      header: 'Nom',
      mobile: 'primary',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Shield size={14} style={{ color: 'var(--color-accent)' }} />
          <span
            className="font-medium cursor-pointer"
            style={{ color: 'var(--color-accent)' }}
            onClick={() => router.push(`/roles/${row.id}`)}
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
              <Lock size={10} /> Système
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'code',
      header: 'Code',
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
      header: 'Type',
      mobile: 'hidden',
      render: (row) =>
        row.isSystem ? (
          <span style={{ color: 'var(--color-text-secondary)' }}>Système</span>
        ) : (
          <span style={{ color: 'var(--color-accent)' }}>Custom</span>
        ),
    },
    {
      key: 'permissions',
      header: 'Permissions',
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
      label="Nouveau rôle"
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
    <div className="space-y-5">
      <div className="flex justify-end">{action}</div>

      {fetchError && <InlineError message={fetchError} />}

      {roleList.length === 0 ? (
        <EmptyState
          icon={<Shield size={24} />}
          title="Aucun rôle"
          description="Créez un rôle custom pour gérer les permissions."
        />
      ) : (
        <DataTable columns={columns} rows={roleList} rowKey={(row) => row.id} />
      )}

      {/* Create modal */}
      <Modal
        isOpen={showCreate}
        onOpenChange={(open) => { if (!open) setShowCreate(false) }}
        title="Nouveau rôle custom"
        size="sm"
      >
        <form onSubmit={handleCreate} className="space-y-5">
          <ModalSection title="Identité du rôle">
            <FieldGrid columns={1}>
              <TextInput
                label="Code (identifiant technique, sans espaces)"
                value={form.code}
                onChange={(v) => setForm((f) => ({ ...f, code: v.toLowerCase().replace(/\s+/g, '_') }))}
                isRequired
                width="100%"
                placeholder="chef_boulanger"
              />
              <TextInput
                label="Nom affiché"
                value={form.label}
                onChange={(v) => setForm((f) => ({ ...f, label: v }))}
                isRequired
                width="100%"
                placeholder="Chef boulanger"
              />
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
              label={saving ? t('saving') : t('add')}
              variant="primary"
              type="submit"
              isLoading={saving}
              className="flex-1"
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
