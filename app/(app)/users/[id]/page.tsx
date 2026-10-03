'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useToast } from '@astryxdesign/core'
import { TextInput } from '@astryxdesign/core'
import { Button } from '@astryxdesign/core'
import { FieldGrid } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { adminUsers, type AdminUser } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'

export default function UserProfilePage() {
  const params = useParams()
  const userId = params.id as string
  const { t } = useI18n()
  const toast = useToast()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ email: '', prenom: '', nom: '', password: '' })

  useEffect(() => {
    adminUsers.get(userId)
      .then((u) => {
        setUser(u)
        setForm({ email: u.email, prenom: u.prenom ?? '', nom: u.nom ?? '', password: '' })
      })
      .finally(() => setLoading(false))
  }, [userId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const update: Partial<{ email: string; prenom: string | null; nom: string | null; password: string }> = {}
      if (form.email !== user?.email) update.email = form.email
      if (form.prenom !== (user?.prenom ?? '')) update.prenom = form.prenom || null
      if (form.nom !== (user?.nom ?? '')) update.nom = form.nom || null
      if (form.password) update.password = form.password
      if (Object.keys(update).length === 0) { setSaving(false); return }
      const updated = await adminUsers.update(userId, update as any)
      setUser(updated)
      setForm((f) => ({ ...f, password: '' }))
      toast({ body: t('tenant_updated'), type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-8"><Spinner size={6} /></div>
  }

  if (!user) return null

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5">
      <div
        className="rounded-lg border p-5 space-y-4"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Informations du compte
        </h2>
        <FieldGrid columns={1}>
          <TextInput
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => setForm((f) => ({ ...f, email: v }))}
            isRequired
            width="100%"
          />
        </FieldGrid>
        <FieldGrid columns={2}>
          <TextInput
            label="Prénom"
            value={form.prenom}
            onChange={(v) => setForm((f) => ({ ...f, prenom: v }))}
            width="100%"
          />
          <TextInput
            label="Nom"
            value={form.nom}
            onChange={(v) => setForm((f) => ({ ...f, nom: v }))}
            width="100%"
          />
        </FieldGrid>
      </div>

      <div
        className="rounded-lg border p-5 space-y-4"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Changer le mot de passe
        </h2>
        <FieldGrid columns={1}>
          <TextInput
            label="Nouveau mot de passe"
            type="password"
            value={form.password}
            onChange={(v) => setForm((f) => ({ ...f, password: v }))}
            width="100%"
            placeholder="Laisser vide pour ne pas changer"
          />
        </FieldGrid>
      </div>

      <div className="flex justify-end">
        <Button
          variant="primary"
          label={t('save')}
          type="submit"
          isLoading={saving}
        />
      </div>
    </form>
  )
}
