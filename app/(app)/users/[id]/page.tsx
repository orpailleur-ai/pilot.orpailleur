'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useToast } from '@astryxdesign/core'
import { TextInput } from '@astryxdesign/core'
import { Button } from '@astryxdesign/core'
import { FieldGrid } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { ShieldCheck } from 'lucide-react'
import { adminUsers, roles, type AdminUser, type Role, type Permission } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'

export default function UserProfilePage() {
  const params = useParams()
  const userId = params.id as string
  const { t } = useI18n()
  const toast = useToast()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [allRoles, setAllRoles] = useState<Role[]>([])
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ email: '', prenom: '', nom: '', password: '' })
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      adminUsers.get(userId),
      roles.list(),
      roles.getPermissions(),
    ])
      .then(([u, roleList, perms]) => {
        setUser(u)
        setAllRoles(roleList)
        setAllPermissions(perms)
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

  // Compute effective permissions: union of all permissions from all roles assigned to this user
  const effectivePermissionIds = new Set<string>()
  for (const assignment of user.tenants) {
    const role = allRoles.find((r) => r.id === assignment.role_id)
    if (role?.permissions) {
      for (const p of role.permissions) {
        effectivePermissionIds.add(p.id)
      }
    }
  }
  const effectivePermissions = allPermissions.filter((p) => effectivePermissionIds.has(p.id))

  // Group by module
  const byModule: Record<string, Permission[]> = {}
  for (const p of effectivePermissions) {
    if (!byModule[p.module]) byModule[p.module] = []
    byModule[p.module].push(p)
  }
  const MODULE_LABELS: Record<string, string> = {
    ADMIN: 'Administration',
    TENANT: 'Tenant',
    USER: 'Utilisateurs',
    FOURNISSEUR: 'Fournisseurs',
    MERCURIALE: 'Mercuriale',
    RECETTE: 'Recettes',
    CMUP: 'CMUP',
    COMMANDE: 'Commandes',
    FACTURES: 'Factures',
    FACTURE: 'Factures',
    AI: 'IA',
    BILLING: 'Billing',
    SITE: 'Sites',
  }
  const MODULE_ORDER = ['ADMIN', 'TENANT', 'USER', 'SITE', 'BILLING', 'FOURNISSEUR', 'MERCURIALE', 'RECETTE', 'CMUP', 'COMMANDE', 'FACTURES', 'AI']
  const sortedModules = Object.keys(byModule).sort((a, b) => {
    const ai = MODULE_ORDER.indexOf(a)
    const bi = MODULE_ORDER.indexOf(b)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5">
      {/* ── Avatar : centré en haut du formulaire ── */}
      <div
        className="rounded-lg border p-5 flex flex-col items-center gap-3"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-background-muted, rgba(10,19,23,0.05))' }}>
          {avatarPreview || user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarPreview || (user.avatar_url as string)}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-base font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {(form.prenom?.[0] || form.nom?.[0] || '?').toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            label={t('choose_image', 'Choisir une image')}
            isDisabled={uploadingAvatar}
            isLoading={uploadingAvatar}
            onClick={() => document.getElementById('pilot-avatar-input')?.click()}
          />
          {user.avatar_url && (
            <Button
              variant="ghost"
              size="sm"
              label={t('remove_avatar', 'Retirer')}
              onClick={async () => {
                try {
                  const updated = await adminUsers.removeAvatar(userId)
                  setUser(updated)
                  setAvatarPreview(null)
                  toast({ body: t('avatar_removed', 'Avatar retiré'), type: 'info' })
                } catch (err) {
                  toast({
                    body: err instanceof Error ? err.message : t('error'),
                    type: 'error',
                  })
                }
              }}
            />
          )}
        </div>
        <p className="text-xs text-center" style={{ color: 'var(--color-text-secondary)' }}>
          JPEG, PNG, WebP, GIF · max 2 Mo
        </p>
        <input
          id="pilot-avatar-input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            if (file.size > 2 * 1024 * 1024) {
              toast({
                body: t('file_too_large', 'Fichier trop volumineux (max 2 Mo)'),
                type: 'error',
              })
              return
            }
            // Prévisualisation locale immédiate pendant l'upload
            const objectUrl = URL.createObjectURL(file)
            setAvatarPreview(objectUrl)
            setUploadingAvatar(true)
            try {
              const base64: string = await new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => {
                  const result = reader.result as string
                  const comma = result.indexOf(',')
                  resolve(comma >= 0 ? result.slice(comma + 1) : result)
                }
                reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'))
                reader.readAsDataURL(file)
              })
              const res = await adminUsers.setAvatar(userId, {
                data: base64,
                filename: file.name,
                mimeType: file.type,
              })
              setUser((u) => (u ? { ...u, avatar_url: res.avatar_url } : u))
              setAvatarPreview(null)
              toast({ body: t('avatar_uploaded', 'Avatar téléversé'), type: 'info' })
            } catch (err) {
              toast({
                body: err instanceof Error ? err.message : t('error'),
                type: 'error',
              })
            } finally {
              URL.revokeObjectURL(objectUrl)
              setAvatarPreview(null)
              setUploadingAvatar(false)
              if (e.target) e.target.value = ''
            }
          }}
        />
      </div>

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

      {/* Effective permissions */}
      {effectivePermissions.length > 0 && (
        <div
          className="rounded-lg border p-5 space-y-4"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} style={{ color: 'var(--color-accent)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Permissions effectives
            </h2>
            <span
              className="text-xs rounded px-1.5 py-0.5"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                color: 'var(--color-accent)',
              }}
            >
              {effectivePermissions.length}
            </span>
          </div>
          <div className="flex flex-col gap-4">
            {sortedModules.map((mod) => (
              <div key={mod} className="flex flex-col gap-1.5">
                <span
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {MODULE_LABELS[mod] ?? mod}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {byModule[mod].map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center rounded px-2 py-0.5 text-xs"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--color-accent) 6%, transparent)',
                        color: 'var(--color-text-primary)',
                      }}
                      title={p.label}
                    >
                      {p.action === 'READ' ? 'R' : p.action === 'WRITE' ? 'W' : p.action}
                      <span className="ml-1 opacity-60">{p.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
