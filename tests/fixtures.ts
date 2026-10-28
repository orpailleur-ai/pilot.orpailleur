import { test as base, expect } from '@playwright/test'
import type { EtatSession } from './helpers/auth'
import { peutSeConnecter, storageState } from './helpers/auth'

/**
 * Les fixtures de la suite.
 *
 * `session` : l'état de session (le jeton dans le stockage du navigateur),
 * partagé par tous les tests. Un seul login pour toute la suite.
 *
 * Si aucun accès n'est configuré, les tests sont SAUTÉS et non en échec :
 * une suite qui ne peut pas se connecter doit le dire clairement, pas
 * faire échouer la CI en dozen de tests rouges.
 */
export const test = base.extend<{ session: EtatSession }>({
  session: async ({}, use) => {
    const state = await storageState()
    await use(state)
  },
  storageState: async ({ session }, use) => {
    await use(session)
  },
})

/** Un test qui exige une session ouverte. */
export const testConnecte = test.extend({})

/** À appeler DANS un describe : sans accès configuré, les tests sont SAUTÉS. */
export const sansAcces = !peutSeConnecter()
export const raisonSansAcces =
  'Aucun accès configuré : définissez PILOT_EMAIL + PILOT_PASSWORD, ou PILOT_TOKEN.'

export { expect }
