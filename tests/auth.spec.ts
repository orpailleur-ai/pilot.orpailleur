import { expect, test } from '@playwright/test'
import { aller } from './helpers/navigation'
import { connecterParLeFormulaire } from './helpers/connexion'

/**
 * LA CONNEXION.
 *
 * C'est le parcours le plus court et le plus critique : si la connexion
 * échoue, plus rien n'est accessible. Trois cas :
 *
 *  1. le formulaire s'affiche ;
 *  2. un MAUVAIS mot de passe est refusé, avec un message — et surtout
 *     sans laisser une session ouverte derrière ;
 *  3. un bon mot de passe ouvre la session.
 *
 * Le cas 2 est celui qu'on oublie de tester : une connexion qui « réussit »
 * à moitié — l'erreur s'affiche mais la session reste ouverte — est une
 * faille.
 */
test.describe('la connexion', () => {
  test('affiche le formulaire', async ({ page }) => {
    await aller(page, '/login')

    await expect(page.locator('input[type="email"]').first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /connexion|login/i }).first()).toBeVisible()
  })

  test('refuse un mauvais mot de passe, sans ouvrir de session', async ({ page }) => {
    // Un message d'erreur. On ne dépend pas du texte EXACT : l'API peut
    // répondre « Identifiants invalides », mais aussi « Trop de requêtes »
    // si le limiteur de débit s'en mêle — et le refus reste un refus.
    const refuse = await connecterParLeFormulaire(page, 'e2e@orpailleur.com', 'mauvais-mot-de-passe', {
      attendreRefus: true,
    })
    expect(refuse, 'un mauvais mot de passe ne doit PAS ouvrir de session').toBe(false)

    const message = page
      .locator(
        'text=/identifiants invalides|invalid|incorrect|échec|erreur|trop de requêtes|too many/i',
      )
      .first()
    await expect(message).toBeVisible({ timeout: 10_000 })

    // ET surtout : aucune session ouverte.
    const jeton = await page.evaluate(() => window.localStorage.getItem('pilot_token'))
    expect(jeton).toBeNull()
    await expect(page).toHaveURL(/\/login(\?|$)/)
  })

  test('ouvre la session avec les bons identifiants', async ({ page }) => {
    const email = process.env.PILOT_EMAIL
    const password = process.env.PILOT_PASSWORD
    test.skip(
      !email || !password,
      'Identifiants absents : définissez PILOT_EMAIL et PILOT_PASSWORD.',
    )

    const connecte = await connecterParLeFormulaire(page, email as string, password as string)
    expect(connecte, 'la connexion doit ouvrir la session').toBe(true)

    // Le jeton est posé, et l'application quitte /login.
    await expect(page).not.toHaveURL(/\/login(\?|$)/, { timeout: 15_000 })
  })
})
