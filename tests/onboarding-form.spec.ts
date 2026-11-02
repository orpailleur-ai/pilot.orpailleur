import { expect, test } from '@playwright/test'
import { FORMULAIRE_VIDE, chiffresDuSiret, erreurs, estValide, genererMotDePasse, separerNom, versCharge } from '../lib/onboarding-form'

/**
 * Le formulaire « Nouvelle boulangerie » — sa logique, sans navigateur.
 * Les règles doivent rester celles de l'API (`OnboardTenantDto`).
 */
const complet = { ...FORMULAIRE_VIDE, nom: 'Soleil', planId: 'p1', adminEmail: 'marie@soleil.fr', adminPassword: 'huit-car!' }

test.describe('règles', () => {
  test('le minimum : un nom, un plan, un compte', () => {
    expect(estValide(complet)).toBe(true)
  })
  test('un formulaire vide demande le nom, le plan, l\'email et le mot de passe — et rien d\'autre', () => {
    expect(Object.keys(erreurs(FORMULAIRE_VIDE)).sort()).toEqual(['adminEmail', 'adminPassword', 'nom', 'planId'])
  })
  test('les champs facultatifs vides ne produisent aucune erreur', () => {
    expect(erreurs({ ...complet, email: '', siret: '  ', code_postal: '', ville: '' })).toEqual({})
  })
  test('email, SIRET, code postal et mot de passe invalides', () => {
    expect(erreurs({ ...complet, email: 'x' }).email).toBe('email')
    expect(erreurs({ ...complet, siret: '123' }).siret).toBe('siret')
    expect(erreurs({ ...complet, code_postal: '3100' }).code_postal).toBe('postal')
    expect(erreurs({ ...complet, adminEmail: 'pas-un-email' }).adminEmail).toBe('email')
    expect(erreurs({ ...complet, adminPassword: 'court' }).adminPassword).toBe('password')
  })
  test('le SIRET se saisit avec des espaces', () => {
    expect(erreurs({ ...complet, siret: '123 456 789 00012' })).toEqual({})
    expect(chiffresDuSiret('123 456 789 00012')).toBe('12345678900012')
  })
})

test.describe('charge envoyée', () => {
  test('omet tous les champs facultatifs vides', () => {
    const c = versCharge(complet)
    expect(c.boulangerie).toEqual({ nom: 'Soleil' })
    expect(c).not.toHaveProperty('boutique_nom')
    expect(c.admin).toEqual({ email: 'marie@soleil.fr', password: 'huit-car!' })
  })
  test('range le SIRET en chiffres, rogne les valeurs, sépare le nom du compte', () => {
    const c = versCharge({ ...complet, nom: '  Soleil ', siret: '123 456 789 00012', ville: ' Toulouse ', adminNom: 'Marie Dupont', boutiqueNom: 'Capitole' })
    expect(c.boulangerie).toMatchObject({ nom: 'Soleil', siret: '12345678900012', ville: 'Toulouse' })
    expect(c.admin).toMatchObject({ prenom: 'Marie', nom: 'Dupont' })
    expect(c.boutique_nom).toBe('Capitole')
  })
  test('ne contient AUCUN des champs que l\'API refuse (plan en texte, limites, actif)', () => {
    const c = JSON.stringify(versCharge(complet))
    for (const interdit of ['"plan"', 'nb_sites_max', 'nb_users_max', 'actif']) expect(c).not.toContain(interdit)
  })
  test('un nom de compte d\'un seul mot reste le nom', () => {
    expect(separerNom('Dupont')).toEqual({ nom: 'Dupont' })
    expect(separerNom('  ')).toEqual({})
    expect(separerNom('Jean de la Fontaine')).toEqual({ prenom: 'Jean', nom: 'de la Fontaine' })
  })
})

test.describe('mot de passe généré', () => {
  test('12 caractères lisibles, qui passent la règle de l\'API', () => {
    for (let i = 0; i < 50; i++) {
      const p = genererMotDePasse()
      expect(p).toHaveLength(12)
      expect(p).not.toMatch(/[01OlI]/)
      expect(erreurs({ ...complet, adminPassword: p }).adminPassword).toBeUndefined()
    }
  })
  test('deux mots de passe consécutifs diffèrent', () => {
    expect(genererMotDePasse()).not.toBe(genererMotDePasse())
  })
})
