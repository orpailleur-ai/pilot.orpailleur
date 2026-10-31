import type { Page } from '@playwright/test'
import { aller } from './navigation'

/**
 * SE CONNECTER PAR LE FORMULAIRE.
 *
 * ── La course qu'il faut vaincre ──────────────────────────────────────────
 *
 * La page de connexion est une page React : tant qu'elle n'est pas
 * hydratée, le formulaire n'a pas de gestionnaire. Un clic sur « Connexion »
 * déclenche alors la SOUMISSION NATIVE du formulaire : la page se
 * recharge, les champs se vident, et la connexion n'a jamais lieu.
 *
 * Pire : un remplissage fait AVANT l'hydratation est perdu. React lit la
 * valeur du champ, la compare à son état, et remet le champ à zéro.
 *
 * ── Pourquoi on réessaie ──────────────────────────────────────────────────
 *
 * Le pilot n'a pas de bouton de démonstration — pas de témoin qui prouve
 * l'hydratation. On ne peut donc que RETENTER : une page qui se recharge
 * est une page qui n'était pas prête, et la deuxième tentative tombe
 * sur une page prête.
 *
 * Si la connexion est impossible, elle le restera trois fois de suite : le
 * défaut ressort quand même.
 */
export interface OptionsConnexion {
  /**
   * Attendre un REFUS au lieu d'insister.
   *
   * Un mauvais mot de passe ne devient pas bon au deuxième essai : la
   * première réponse suffit, et trois essais ne font que consommer le
   * quota du limiteur de débit.
   */
  attendreRefus?: boolean
}

/** Le message de refus que l'API renvoie sur une connexion ratée. */
const SELECTEUR_REFUS =
  'text=/identifiants invalides|invalid|incorrect|échec|erreur|error|trop de requêtes|too many|must be/i'

/**
 * Remplit le formulaire de connexion et le soumet.
 *
 * Renvoie `true` si la session est ouverte, `false` si la connexion a été
 * refusée. Ne lève QUE si la connexion aurait dû réussir et n'a pas.
 */
export async function connecterParLeFormulaire(
  page: Page,
  email: string,
  motDePasse: string,
  options: OptionsConnexion = {},
): Promise<boolean> {
  await aller(page, '/login')

  const champEmail = page.locator('input[type="email"]').first()
  const champMotDePasse = page.locator('input[type="password"]').first()
  await champEmail.waitFor({ state: 'visible', timeout: 20_000 })

  // ── L'hydratation ────────────────────────────────────────────────────────
  //
  // Remplir un champ AVANT l'hydratation est perdu : React lit la valeur
  // du champ, la compare à son état — qui est vide — et remet le champ à
  // zéro. Le formulaire part alors avec une adresse vide, et l'API répond
  // « email must be an email ».
  //
  // On vérifie donc que la valeur SURVIT au remplissage. Si React se
  // réhydre après, il remet le champ à zéro : c'est exactement ce que le
  // contrôle détecte.
  for (let essai = 1; essai <= 10; essai++) {
    await champEmail.fill(email)
    await champMotDePasse.fill(motDePasse)
    await page.waitForTimeout(250)
    const survit =
      (await champEmail.inputValue().catch(() => '')) === email &&
      (await champMotDePasse.inputValue().catch(() => '')) === motDePasse
    if (survit) break
  }

  // ── La connexion ─────────────────────────────────────────────────────────
  for (let essai = 1; essai <= 3; essai++) {
    await champEmail.fill(email)
    await champMotDePasse.fill(motDePasse)
    await page.getByRole('button', { name: /connexion|login/i }).first().click()

    // Deux issues possibles, et il faut la PREMIERE : une session ouverte,
    // ou un refus affiché. Les attendre l'une après l'autre ferait perdre
    // dix secondes à chaque refus.
    const session = page
      .waitForFunction(() => Boolean(window.localStorage.getItem('pilot_token')), undefined, {
        timeout: 10_000,
      })
      .then(() => 'session' as const)
      .catch(() => 'rien' as const)
    const message = page
      .locator(SELECTEUR_REFUS)
      .first()
      .waitFor({ state: 'visible', timeout: 12_000 })
      .then(() => 'refus' as const)
      .catch(() => 'rien' as const)

    const issue = await Promise.race([session, message])
    if (issue === 'session') return true
    if (issue === 'refus' && options.attendreRefus) return false

    // La page s'est rechargée, ou le formulaire n'était pas prêt : on
    // attend un peu, et on recommence.
    await page.waitForLoadState('domcontentloaded').catch(() => undefined)
    await page.waitForTimeout(500)
  }

  return false
}
