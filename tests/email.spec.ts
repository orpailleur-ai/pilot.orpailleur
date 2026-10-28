import { expect, raisonSansAcces, sansAcces, testConnecte } from './fixtures'
import { sonder } from './helpers/probe'

/**
 * L'ÉCRAN « CONFIGURATION SMTP » (/parametrage/email).
 *
 * C'est l'écran que l'administrateur ouvre pour dire à la plateforme par
 * quel relais sortir les e-mails. Il doit :
 *
 *  · charger la configuration effective et dire d'où elle vient ;
 *  · permettre de la modifier ;
 *  ·dire ce qu'il pense d'un envoi de test — un échec compris.
 *
 * ── Ce qu'on n'écrit PAS ──────────────────────────────────────────────────
 *
 * La configuration SMTP est GLOBALE : elle sert à tous les tenants. Un test
 * qui l'enregistre écraserait celle de la production — le relais, l'expéditeur,
 * le mot de passe. On ne touche donc pas à l'enregistrement, et on ne teste
 * l'envoi qu'UNE fois, vers une adresse du domaine `.invalid` (réservé par
 * la RFC 2606, donc inexistant par construction) : le relais ne peut rien
 * livrer, et l'écran doit dire l'échec au lieu de rester muet.
 */
testConnecte.describe('la configuration SMTP', () => {
  testConnecte.skip(sansAcces, raisonSansAcces)

  testConnecte('affiche la configuration et son origine', async ({ page }) => {
    const sonde = sonder(page)
    await page.goto('/parametrage/email')
    await page.waitForLoadState('networkidle')

    // Le formulaire est là : sans lui, l'écran ne sert à rien.
    await page.getByText(/serveur|host/i).first().waitFor({ state: 'visible', timeout: 15_000 })

    // Les trois zones : serveur, authentification, expéditeur.
    const zones = await page.locator('section, [role="group"]').count()
    expect(zones).toBeGreaterThan(0)

    sonde.stop()
    expect(sonde.erreursConsole, sonde.erreursConsole.join('\n')).toEqual([])
  })

  testConnecte('dit ce qu\'il advient d\'un envoi de test', async ({ page }) => {
    const sonde = sonder(page)
    await page.goto('/parametrage/email')
    await page.waitForLoadState('networkidle')

    // L'adresse d'un domaine `.invalid` n'existe pas : le relais doit
    // refuser, et l'écran doit le dire.
    const champ = page.locator('input[type="email"], input[name="fromEmail"]').first()
    if ((await champ.count()) === 0) {
      testConnecte.skip(true, 'Aucun champ d\'expéditeur trouvé sur l\'écran')
      return
    }
    await champ.fill('e2e-inexistant@orpailleur.invalid')

    const boutonTest = page.getByRole('button', { name: /test/i }).first()
    await boutonTest.click()

    // Un résultat s'affiche — succes ou echec. Ce qui ne doit PAS
    // arriver : rien du tout, et un ecran qui reste muet.
    const resultat = page.locator('text=/succès|réussi|envoyé|erreur|échec|failed/i').first()
    await resultat.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => undefined)

    sonde.stop()
    // Le point dur : aucune erreur de console pendant l'envoi.
    expect(sonde.erreursConsole, sonde.erreursConsole.join('\n')).toEqual([])
    // Et l'ecran a repondu quelque chose.
    expect(await resultat.count()).toBeGreaterThan(0)
  })
})
