'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Eye, EyeOff, Sparkles } from 'lucide-react'
import { Button, TextInput } from '@astryxdesign/core'
import { Modal, ModalSection, FieldGrid } from '@/components/ui/modal'
import { InlineError } from '@/components/ui/inline-error'
import { Spinner } from '@/components/ui/spinner'
import { adminTenants, plans as plansApi, type Plan } from '@/lib/api-client'
import { useT } from '@/lib/i18n'
import {
  FORMULAIRE_VIDE,
  erreurs,
  genererMotDePasse,
  versCharge,
  type ChampErreur,
  type CodeErreur,
  type OnboardingForm,
} from '@/lib/onboarding-form'

const prix = (cents: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)

/**
 * « Nouvelle boulangerie » : UN formulaire, UN bouton.
 *
 * Il remplace deux chemins qui échouaient tous deux (une modale et un assistant
 * en quatre étapes) : tout ce qu'il faut pour qu'une boulangerie soit utilisable
 * se saisit ici, et part en un seul appel serveur, en une seule transaction.
 *
 *   1. la boulangerie  — nom d'abord ; SIRET, adresse et code postal repliés ;
 *   2. l'abonnement    — des cartes de plan (jamais de texte libre), mensuel/annuel ;
 *   3. le premier compte — avec la première boutique, nommée comme la boulangerie
 *      tant qu'on n'en décide pas autrement.
 *
 * Le rôle du compte n'est pas demandé : le serveur prend celui d'un responsable.
 */
export function NouvelleBoulangerieModal({
  isOpen,
  onOpenChange,
  onCreated,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  /** Appelé avec l'identifiant de la boulangerie créée. */
  onCreated: (tenantId: string) => void
}) {
  const t = useT()
  const [f, setF] = useState<OnboardingForm>(FORMULAIRE_VIDE)
  const [plans, setPlans] = useState<Plan[] | null>(null)
  const [erreurPlans, setErreurPlans] = useState('')
  const [details, setDetails] = useState(false)
  const [voir, setVoir] = useState(false)
  const [touches, setTouches] = useState<Set<ChampErreur>>(new Set())
  const [tentative, setTentative] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreurServeur, setErreurServeur] = useState('')

  const set = <K extends keyof OnboardingForm>(k: K, v: OnboardingForm[K]) => setF((p) => ({ ...p, [k]: v }))
  const toucher = (c: ChampErreur) => setTouches((p) => new Set(p).add(c))

  // À chaque ouverture : un formulaire neuf, et les plans à jour.
  useEffect(() => {
    if (!isOpen) return
    setF(FORMULAIRE_VIDE)
    setDetails(false); setVoir(false); setTouches(new Set()); setTentative(false); setErreurServeur(''); setErreurPlans('')
    let annule = false
    plansApi.list()
      .then((l) => {
        if (annule) return
        // Seuls les plans en vente, du moins cher au plus cher : le premier est le choix par défaut.
        const ouverts = l.filter((p) => p.actif).sort((a, b) => a.prixMensuelCents - b.prixMensuelCents)
        setPlans(ouverts)
        if (ouverts[0]) setF((p) => ({ ...p, planId: ouverts[0].id }))
      })
      .catch((e: unknown) => { if (!annule) { setPlans([]); setErreurPlans(e instanceof Error ? e.message : t('error')) } })
    return () => { annule = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const errs = useMemo(() => erreurs(f), [f])
  const message = (c: ChampErreur): string | undefined => {
    const code: CodeErreur | undefined = errs[c]
    if (!code || !(tentative || touches.has(c))) return undefined
    return t(`onb_err_${code}` as 'onb_err_required')
  }
  const statut = (c: ChampErreur) => {
    const m = message(c)
    return m ? ({ type: 'error', message: m } as const) : undefined
  }

  async function soumettre(e: React.FormEvent) {
    e.preventDefault()
    setTentative(true)
    if (Object.keys(errs).length > 0) {
      // Un champ en erreur dans la partie repliée doit se voir.
      if (errs.siret || errs.code_postal) setDetails(true)
      return
    }
    setEnvoi(true)
    setErreurServeur('')
    try {
      const r = await adminTenants.onboard(versCharge(f))
      onOpenChange(false)
      onCreated(r.tenant_id)
    } catch (err) {
      setErreurServeur(err instanceof Error ? err.message : t('error'))
    } finally {
      setEnvoi(false)
    }
  }

  const planChoisi = plans?.find((p) => p.id === f.planId)

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} title={t('new_tenant')} size="lg" preventClose={envoi}>
      <form onSubmit={soumettre} className="space-y-6" noValidate>
        {erreurServeur && <InlineError message={erreurServeur} />}

        {/* ── 1. La boulangerie ── */}
        <ModalSection title={t('onb_section_bakery')}>
          <TextInput
            label={t('bakery_name')}
            value={f.nom}
            onChange={(v) => set('nom', v)}
            onBlur={() => toucher('nom')}
            isRequired
            width="100%"
            placeholder="La Mie Câline — Toulouse"
            status={statut('nom')}
          />
          <FieldGrid columns={2}>
            <TextInput label={t('city')} value={f.ville} onChange={(v) => set('ville', v)} width="100%" placeholder="Toulouse" />
            <TextInput
              label={t('contact_email')}
              type="email"
              value={f.email}
              onChange={(v) => set('email', v)}
              onBlur={() => toucher('email')}
              width="100%"
              placeholder="contact@lamiecaline.fr"
              status={statut('email')}
            />
          </FieldGrid>

          <button
            type="button"
            onClick={() => setDetails((d) => !d)}
            aria-expanded={details}
            className="flex items-center gap-1.5 text-sm font-medium"
            style={{ color: 'var(--color-accent)' }}
          >
            {details ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            {t('onb_more_details')}
          </button>
          {details && (
            <FieldGrid columns={2}>
              <TextInput
                label={t('tenant_siret')}
                value={f.siret}
                onChange={(v) => set('siret', v)}
                onBlur={() => toucher('siret')}
                width="100%"
                placeholder="123 456 789 00012"
                status={statut('siret')}
              />
              <TextInput
                label={t('postal_code')}
                value={f.code_postal}
                onChange={(v) => set('code_postal', v)}
                onBlur={() => toucher('code_postal')}
                width="100%"
                placeholder="31000"
                status={statut('code_postal')}
              />
              <div className="sm:col-span-2">
                <TextInput label={t('address')} value={f.adresse} onChange={(v) => set('adresse', v)} width="100%" placeholder="12 rue du Pain" />
              </div>
            </FieldGrid>
          )}
        </ModalSection>

        {/* ── 2. L'abonnement ── */}
        <ModalSection title={t('onb_section_plan')}>
          {plans === null ? (
            <div className="flex justify-center py-6"><Spinner size={5} /></div>
          ) : plans.length === 0 ? (
            <InlineError message={erreurPlans || t('onb_no_plans')} />
          ) : (
            <>
              <div role="radiogroup" aria-label={t('plan')} className="grid gap-2 sm:grid-cols-2">
                {plans.map((p) => {
                  const choisi = f.planId === p.id
                  const montant = f.periode === 'monthly' ? p.prixMensuelCents : p.prixAnnuelCents
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={choisi}
                      onClick={() => set('planId', p.id)}
                      className="flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors"
                      style={{
                        borderColor: choisi ? 'var(--color-accent)' : 'var(--color-border)',
                        backgroundColor: choisi ? 'color-mix(in srgb, var(--color-accent) 7%, var(--color-card))' : 'var(--color-card)',
                        boxShadow: choisi ? '0 0 0 1px var(--color-accent)' : 'none',
                      }}
                    >
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{p.nom}</span>
                        <span className="text-sm font-bold" style={{ color: 'var(--color-accent)' }}>
                          {prix(montant)}{f.periode === 'monthly' ? t('per_month') : t('per_year')}
                        </span>
                      </span>
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('onb_limits', { sites: p.nbSitesMax, users: p.nbUsersMax })}
                      </span>
                      {p.description && <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{p.description}</span>}
                    </button>
                  )
                })}
              </div>
              <div role="radiogroup" aria-label={t('billing_period')} className="inline-flex rounded-lg border p-0.5" style={{ borderColor: 'var(--color-border)' }}>
                {(['monthly', 'yearly'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={f.periode === p}
                    onClick={() => set('periode', p)}
                    className="rounded-md px-4 py-1.5 text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: f.periode === p ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'transparent',
                      color: f.periode === p ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    }}
                  >
                    {p === 'monthly' ? t('monthly') : t('yearly')}
                  </button>
                ))}
              </div>
            </>
          )}
        </ModalSection>

        {/* ── 3. Le premier compte ── */}
        <ModalSection title={t('onb_section_admin')} description={t('onb_admin_hint')}>
          <FieldGrid columns={2}>
            <TextInput label={t('full_name')} value={f.adminNom} onChange={(v) => set('adminNom', v)} width="100%" placeholder="Marie Dupont" />
            <TextInput
              label={t('email_required')}
              type="email"
              value={f.adminEmail}
              onChange={(v) => set('adminEmail', v)}
              onBlur={() => toucher('adminEmail')}
              width="100%"
              placeholder="marie@lamiecaline.fr"
              status={statut('adminEmail')}
            />
          </FieldGrid>
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <TextInput
                label={t('password_required')}
                type={voir ? 'text' : 'password'}
                value={f.adminPassword}
                onChange={(v) => set('adminPassword', v)}
                onBlur={() => toucher('adminPassword')}
                autoComplete="new-password"
                width="100%"
                placeholder={t('password_min')}
                status={statut('adminPassword')}
              />
            </div>
            <Button
              label={voir ? t('onb_hide_password') : t('onb_show_password')}
              icon={voir ? <EyeOff size={15} /> : <Eye size={15} />}
              variant="secondary"
              isIconOnly
              onClick={() => setVoir((v) => !v)}
            />
            <Button
              label={t('onb_generate')}
              icon={<Sparkles size={15} />}
              variant="secondary"
              onClick={() => { set('adminPassword', genererMotDePasse()); setVoir(true); toucher('adminPassword') }}
            />
          </div>
          <TextInput
            label={t('onb_boutique_name')}
            value={f.boutiqueNom}
            onChange={(v) => set('boutiqueNom', v)}
            width="100%"
            placeholder={f.nom.trim() || t('onb_boutique_placeholder')}
            description={t('onb_boutique_hint')}
          />
        </ModalSection>

        <div className="flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {planChoisi ? t('onb_recap', { plan: planChoisi.nom }) : ''}
          </span>
          <div className="flex gap-3">
            <Button label={t('cancel')} variant="secondary" onClick={() => onOpenChange(false)} isDisabled={envoi} />
            <Button label={envoi ? t('saving') : t('create_tenant')} variant="primary" type="submit" isLoading={envoi} isDisabled={envoi || plans === null} />
          </div>
        </div>
      </form>
    </Modal>
  )
}
