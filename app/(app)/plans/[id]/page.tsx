'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check } from 'lucide-react'
import { Button, useToast } from '@astryxdesign/core'
import { TextInput } from '@astryxdesign/core'
import { FieldGrid } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { InlineError } from '@/components/ui/inline-error'
import { plans, type Plan } from '@/lib/api-client'

function formatPrice(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export default function PlanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const planId = params.id as string
  const toast = useToast()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    nom: '',
    description: '',
    prixMensuelCents: '',
    prixAnnuelCents: '',
    nbSitesMax: '',
    nbUsersMax: '',
    features: '',
    actif: true,
  })

  useEffect(() => {
    plans.get(planId)
      .then((p) => {
        setPlan(p)
        setForm({
          nom: p.nom,
          description: p.description ?? '',
          prixMensuelCents: String(p.prixMensuelCents),
          prixAnnuelCents: String(p.prixAnnuelCents),
          nbSitesMax: String(p.nbSitesMax),
          nbUsersMax: String(p.nbUsersMax),
          features: (p.features ?? []).join('\n'),
          actif: p.actif,
        })
      })
      .catch((err) => setFetchError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [planId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await plans.update(planId, {
        nom: form.nom,
        description: form.description || null,
        prixMensuelCents: parseInt(form.prixMensuelCents) || 0,
        prixAnnuelCents: parseInt(form.prixAnnuelCents) || 0,
        nbSitesMax: parseInt(form.nbSitesMax) || 1,
        nbUsersMax: parseInt(form.nbUsersMax) || 1,
        features: form.features.split('\n').map((f) => f.trim()).filter(Boolean),
        actif: form.actif,
      })
      setPlan(updated)
      toast({ body: 'Plan mis à jour', type: 'info' })
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : 'Erreur', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer ce plan ?')) return
    setDeleting(true)
    try {
      await plans.delete(planId)
      router.push('/plans')
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : 'Erreur', type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner size={8} /></div>
  if (fetchError || !plan) return <InlineError message={fetchError ?? 'Plan introuvable'} />

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" isIconOnly label="Retour" icon={<ArrowLeft size={16} />} onClick={() => router.push('/plans')} />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{plan.nom}</h1>
          <span className="font-mono text-xs rounded px-1.5 py-0.5" style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 8%, transparent)', color: 'var(--color-accent)' }}>{plan.code}</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-5 max-w-lg">
        <div className="rounded-lg border p-5 space-y-4" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Identité</h2>
          <FieldGrid columns={2}>
            <TextInput label="Code" value={plan.code} isRequired width="100%" isDisabled />
            <TextInput label="Nom" value={form.nom} onChange={(v) => setForm((f) => ({ ...f, nom: v }))} isRequired width="100%" />
          </FieldGrid>
          <TextInput label="Description" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} width="100%" />
        </div>

        <div className="rounded-lg border p-5 space-y-4" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Tarification</h2>
          <FieldGrid columns={2}>
            <TextInput label="Prix mensuel (centimes)" type="text" value={form.prixMensuelCents} onChange={(v) => setForm((f) => ({ ...f, prixMensuelCents: v }))} width="100%" />
            <TextInput label="Prix annuel (centimes)" type="text" value={form.prixAnnuelCents} onChange={(v) => setForm((f) => ({ ...f, prixAnnuelCents: v }))} width="100%" />
          </FieldGrid>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {formatPrice(parseInt(form.prixMensuelCents) || 0)}/mois ·{' '}
            {formatPrice(parseInt(form.prixAnnuelCents) || 0)}/an
          </p>
        </div>

        <div className="rounded-lg border p-5 space-y-4" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Limites</h2>
          <FieldGrid columns={2}>
            <TextInput label="Nb sites max" type="text" value={form.nbSitesMax} onChange={(v) => setForm((f) => ({ ...f, nbSitesMax: v }))} width="100%" />
            <TextInput label="Nb utilisateurs max" type="text" value={form.nbUsersMax} onChange={(v) => setForm((f) => ({ ...f, nbUsersMax: v }))} width="100%" />
          </FieldGrid>
        </div>

        <div className="rounded-lg border p-5 space-y-4" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Fonctionnalités</h2>
          <textarea
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
            rows={5}
            value={form.features}
            onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))}
          />
        </div>

        <div className="flex items-center justify-between">
          <Button variant="destructive" label="Supprimer le plan" onClick={handleDelete} isLoading={deleting} />
          <Button variant="primary" label="Enregistrer" type="submit" isLoading={saving} />
        </div>
      </form>
    </div>
  )
}
