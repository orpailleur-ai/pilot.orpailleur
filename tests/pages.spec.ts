import { expect } from '@playwright/test'
import { raisonSansAcces, sansAcces, testConnecte } from './fixtures'
import { ROUTES } from './routes'
import { releverClesBrutes, sonder } from './helpers/probe'

/**
 * LE PASSAGE SUR CHAQUE PAGE.
 *
 * Pour les trente-six écrans du pilot, la même question : cette page
 * fonctionne-t-elle ? Elle se charge, elle ne plante pas, elle ne demande
 * rien à l'API qui échoue, et elle n'affiche pas une clé de traduction
 * brute.
 *
 * Ce test est la SOURCE DE VRAIE du « ça marche ? » : il ne teste pas des
 * détails d'interface, il teste que la page est utilisable. Un défaut
 * fonctionnel — une route d'API qui n'existe pas, un 500, une exception dans
 * un effet, une clé absente — s'y voit immédiatement.
 */
testConnecte.describe('chaque page du pilot', () => {
  testConnecte.skip(sansAcces, raisonSansAcces)

  for (const route of ROUTES) {
    testConnecte(`la page ${route.chemin} fonctionne`, async ({ page, request, session }) => {
      // L'URL réelle : les pages à identifiant vont la chercher dans l'API.
      let url = route.chemin
      if (route.resoudre) {
        // Le jeton, tire de l'etat de session : les appels de l'API doivent
        // etre authentifies, sinon ils reviennent 401 et la page passe pour
        // « sans donnee » — un test qui ne teste rien.
        const jeton =
          session.origins
            .flatMap((o) => o.localStorage)
            .find((e) => e.name === 'pilot_token')?.value ?? ''
        const resolue = await route.resoudre(request, jeton)
        if (!resolue) {
          testConnecte.skip(true, `Aucune donnée pour ${route.chemin} : page ignorée`)
          return
        }
        url = resolue
      }

      const sonde = sonder(page)
      await page.goto(url, { waitUntil: 'domcontentloaded' })

      // On attend la fin des requêtes : une page qui charge encore son
      // squelette ne peut pas être jugée.
      await page
        .waitForLoadState('networkidle', { timeout: 8_000 })
        .catch(() => undefined)

      // Le squelette de chargement doit disparaître : un écran figé sur un
      // spinner est un écran qui ne marche pas.
      const spinner = page.locator('[aria-label*="Chargement" i], [aria-busy="true"]')
      await expect(spinner.first()).toBeHidden({ timeout: 6_000 }).catch(() => undefined)

      // La page ne doit pas avoir éjecté vers la connexion : une session
      // ouverte qui retombe sur /login est une session cassée.
      await expect(page).not.toHaveURL(/\/login(\?|$)/, { timeout: 5_000 })

      const clesBrutes = await releverClesBrutes(page)
      sonde.stop()

      // Le bilan, annoté : le message d'échec dit ce qui ne va pas, pas
      // seulement « attendu, reçu ».
      const anomalies = [
        ...sonde.erreursConsole.map((m) => `erreur console : ${m}`),
        ...sonde.exceptions.map((m) => `exception : ${m}`),
        ...sonde.requetesEnErreur.map((r) => `requête ${r.status} : ${r.url}`),
        ...clesBrutes.map((k) => `clé de traduction brute affichée : « ${k} »`),
      ]

      expect(
        anomalies,
        `Page ${route.chemin} (${url})\n${anomalies.join('\n')}`,
      ).toEqual([])
    })
  }
})
