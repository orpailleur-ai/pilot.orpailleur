import { expect, test } from '@playwright/test'

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
    await page.goto('/login')

    await expect(page.locator('input[type="email"]').first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /connexion|login/i }).first()).toBeVisible()
  })

  test('refuse un mauvais mot de passe, sans ouvrir de session', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[type="email"]').first().fill('e2e@orpailleur.com')
    await page.locator('input[type="password"]').first().fill('mauvais-mot-de-passe')
    await page.getByRole('button', { name: /connexion|login/i }).first().click()

    // Un message d'erreur, ou un champ qui signale le refus.
    const refus = page
      .locator('text=/identifiants invalides|invalid|incorrect|échec|erreur/i')
      .first()
    await refus.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => undefined)
    expect(await refus.count()).toBeGreaterThan(0)

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

    await page.goto('/login')
    await page.locator('input[type="email"]').first().fill(email as string)
    await page.locator('input[type="password"]').first().fill(password as string)
    await page.getByRole('button', { name: /connexion|login/i }).first().click()

    // Le jeton est pose, et l'application quitte /login.
    await page.waitForFunction(
      () => Boolean(window.localStorage.getItem('pilot_token')),
      undefined,
      { timeout: 30_000 },
    )
    await expect(page).not.toHaveURL(/\/login(\?|$)/, { timeout: 15_000 })
  })
})
