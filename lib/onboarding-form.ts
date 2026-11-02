import type { OnboardTenantInput } from '@/lib/api-client'

/**
 * Le formulaire « Nouvelle boulangerie » : valeurs, règles, charge envoyée.
 *
 * Toute la logique vit ici, hors de l'écran : les règles sont celles de l'API
 * (`OnboardTenantDto`) — un écran plus permissif laissait partir une charge que
 * le serveur refusait, et un écran plus strict empêchait de saisir ce que le
 * serveur accepte.
 */
export interface OnboardingForm {
  nom: string
  ville: string
  email: string
  siret: string
  adresse: string
  code_postal: string
  planId: string
  periode: 'monthly' | 'yearly'
  adminNom: string
  adminEmail: string
  adminPassword: string
  boutiqueNom: string
}

export const FORMULAIRE_VIDE: OnboardingForm = {
  nom: '', ville: '', email: '', siret: '', adresse: '', code_postal: '',
  planId: '', periode: 'monthly', adminNom: '', adminEmail: '', adminPassword: '', boutiqueNom: '',
}

export type ChampErreur = 'nom' | 'email' | 'siret' | 'code_postal' | 'planId' | 'adminEmail' | 'adminPassword'
export type CodeErreur = 'required' | 'email' | 'siret' | 'postal' | 'password'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** « 123 456 789 00012 » → « 12345678900012 » (ce que range l'API). */
export const chiffresDuSiret = (s: string): string => s.replace(/\s+/g, '')

/** Les erreurs du formulaire. Un champ facultatif VIDE n'en produit jamais. */
export function erreurs(f: OnboardingForm): Partial<Record<ChampErreur, CodeErreur>> {
  const e: Partial<Record<ChampErreur, CodeErreur>> = {}
  if (!f.nom.trim()) e.nom = 'required'
  if (f.email.trim() && !EMAIL.test(f.email.trim())) e.email = 'email'
  if (f.siret.trim() && !/^\d{14}$/.test(chiffresDuSiret(f.siret))) e.siret = 'siret'
  if (f.code_postal.trim() && !/^\d{5}$/.test(f.code_postal.trim())) e.code_postal = 'postal'
  if (!f.planId) e.planId = 'required'
  if (!f.adminEmail.trim()) e.adminEmail = 'required'
  else if (!EMAIL.test(f.adminEmail.trim())) e.adminEmail = 'email'
  if (!f.adminPassword) e.adminPassword = 'required'
  else if (f.adminPassword.length < 8) e.adminPassword = 'password'
  return e
}

export const estValide = (f: OnboardingForm): boolean => Object.keys(erreurs(f)).length === 0

/** Sépare « Marie Dupont » en prénom et nom ; un seul mot reste le nom. */
export function separerNom(complet: string): { prenom?: string; nom?: string } {
  const mots = complet.trim().split(/\s+/).filter(Boolean)
  if (mots.length === 0) return {}
  if (mots.length === 1) return { nom: mots[0] }
  return { prenom: mots[0], nom: mots.slice(1).join(' ') }
}

const ou = (s: string): string | undefined => (s.trim() === '' ? undefined : s.trim())

/** La charge de `POST /admin/tenants/onboard` : les champs vides sont OMIS. */
export function versCharge(f: OnboardingForm): OnboardTenantInput {
  return {
    boulangerie: {
      nom: f.nom.trim(),
      ...(ou(f.siret) && { siret: chiffresDuSiret(f.siret) }),
      ...(ou(f.email) && { email: ou(f.email) }),
      ...(ou(f.adresse) && { adresse: ou(f.adresse) }),
      ...(ou(f.ville) && { ville: ou(f.ville) }),
      ...(ou(f.code_postal) && { code_postal: ou(f.code_postal) }),
    },
    planId: f.planId,
    periode: f.periode,
    admin: {
      email: f.adminEmail.trim(),
      password: f.adminPassword,
      ...separerNom(f.adminNom),
    },
    ...(ou(f.boutiqueNom) && { boutique_nom: ou(f.boutiqueNom) }),
  }
}

const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Un mot de passe lisible de 12 caractères (sans 0/O/1/l/I, qui se confondent). */
export function genererMotDePasse(alea: (n: number) => Uint32Array = (n) => crypto.getRandomValues(new Uint32Array(n))): string {
  const r = alea(12)
  return Array.from(r, (x) => ALPHABET[x % ALPHABET.length]).join('')
}
