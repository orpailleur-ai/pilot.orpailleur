'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button, useToast } from '@astryxdesign/core'
import { TextInput } from '@astryxdesign/core'
import { ModalSection, FieldGrid } from '@/components/ui/modal'
import { plans, type Plan } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'

export default function PlanNewPage() {
  const router = useRouter()
  const toast = useToast()
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    code: '',
    nom: '',
    description: '',
    prixMensuelCents: '4900',
    prixAnnuelCents: '47040',
    nbSitesMax: '1',
    nbUsersMax: '5',
    features: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code.trim() || !form.nom.trim()) return
    setSaving(true)
    try {
      const dto: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'> = {
        code: form.code.toLowerCase().replace(/\s+/g, '_'),
        nom: form.nom,
        description: form.description || null,
        prixMensuelCents: parseInt(form.prixMensuelCents) || 0,
        prixAnnuelCents: parseInt(form.prixAnnuelCents) || 0,
        nbSitesMax: parseInt(form.nbSitesMax) || 1,
        nbUsersMax: parseInt(form.nbUsersMax) || 1,
        features: form.features.split('\n').map((f) => f.trim()).filter(Boolean),
        actif: true,
      }
      await plans.create(dto)
      toast({ body: t('plan_created'), type: 'info' })
      router.push('/plans')
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          label="Retour"
          icon={<ArrowLeft size={16} />}
          onClick={() => router.push('/plans')}
        />
        <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Nouveau plan
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-lg">
        <div
          className="rounded-lg border p-5 space-y-4"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Identité
          </h2>
          <FieldGrid columns={2}>
            <TextInput
              label="Code (identifiant, ex: starter)"
              value={form.code}
              onChange={(v) => setForm((f) => ({ ...f, code: v }))}
              isRequired
              width="100%"
              placeholder="starter"
            />
            <TextInput
              label="Nom affiché"
              value={form.nom}
              onChange={(v) => setForm((f) => ({ ...f, nom: v }))}
              isRequired
              width="100%"
              placeholder="Starter"
            />
          </FieldGrid>
          <TextInput
            label="Description"
            value={form.description}
            onChange={(v) => setForm((f) => ({ ...f, description: v }))}
            width="100%"
            placeholder="Pour les artisans indépendants…"
          />
        </div>

        <div
          className="rounded-lg border p-5 space-y-4"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Tarification
          </h2>
          <FieldGrid columns={2}>
            <TextInput
              label="Prix mensuel (centimes)"
              type="text"
              value={form.prixMensuelCents}
              onChange={(v) => setForm((f) => ({ ...f, prixMensuelCents: v }))}
              width="100%"
              placeholder="4900"
            />
            <TextInput
              label="Prix annuel (centimes)"
              type="text"
              value={form.prixAnnuelCents}
              onChange={(v) => setForm((f) => ({ ...f, prixAnnuelCents: v }))}
              width="100%"
              placeholder="47040"
            />
          </FieldGrid>
        </div>

        <div
          className="rounded-lg border p-5 space-y-4"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Limites
          </h2>
          <FieldGrid columns={2}>
            <TextInput
              label="Nb sites max (999 = illimité)"
              type="text"
              value={form.nbSitesMax}
              onChange={(v) => setForm((f) => ({ ...f, nbSitesMax: v }))}
              width="100%"
            />
            <TextInput
              label="Nb utilisateurs max (999 = illimité)"
              type="text"
              value={form.nbUsersMax}
              onChange={(v) => setForm((f) => ({ ...f, nbUsersMax: v }))}
              width="100%"
            />
          </FieldGrid>
        </div>

        <div
          className="rounded-lg border p-5 space-y-4"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Fonctionnalités incluses
          </h2>
          <textarea
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
            }}
            rows={5}
            value={form.features}
            onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))}
            placeholder="Une fonctionnalité par ligne&#10;Gestion des fournisseurs&#10;Mercuriale"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" label="Annuler" onClick={() => router.push('/plans')} />
          <Button variant="primary" label="Créer le plan" type="submit" isLoading={saving} />
        </div>
      </form>
    </div>
  )
}
