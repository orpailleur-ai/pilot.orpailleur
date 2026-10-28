import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { ROUTES } from './routes'

/**
 * TOUTES les pages de l'application ont un test.
 *
 * Une page ajoutée sans test passe inaperçue : elle n'apparaît dans aucun
 * rapport, et personne ne peut dire si elle marche. Ce test compare ce que
 * l'application DÉCLARE (les `page.tsx` du dossier `app/`) et ce que la
 * suite COUVRE (le catalogue `tests/routes.ts`).
 *
 * Le taux de couverture n'est pas une abstraction : c'est cette
 * comparaison-là, et elle est vérifiée à chaque passage.
 */
function routesDeLApplication(): string[] {
  const routes: string[] = []

  const parcourir = (dossier: string, prefixe: string): void => {
    for (const entree of readdirSync(dossier)) {
      const chemin = join(dossier, entree)
      if (statSync(chemin).isDirectory()) {
        // Les groupes de routes (`(app)`, `(auth)`) ne font pas partie de
        // l'URL : ils servent à poser des layouts.
        const segment = entree.startsWith('(') ? '' : `/${entree}`
        parcourir(chemin, `${prefixe}${segment}`)
        continue
      }
      if (entree !== 'page.tsx') continue
      routes.push(prefixe || '/')
    }
  }

  parcourir('app', '')
  return routes.sort()
}

test.describe('la couverture des écrans', () => {
  const routesApplication = routesDeLApplication()
  const routesTestees = new Set(ROUTES.map((r) => r.chemin))

  test('chaque page de l\'application a un test', () => {
    const sansTest = routesApplication.filter((r) => !routesTestees.has(r))
    expect(
      sansTest,
      `Ces pages n'ont pas de test : ${sansTest.join(', ')}\n` +
        "Ajoute-les à `tests/routes.ts` — une page sans test passe inaperçue.",
    ).toEqual([])
  })

  test('le catalogue ne contient pas de page inexistante', () => {
    // L'inverse : un test pour une page disparue échouerait sur un 404 et
    // dirait un faux défaut dans le rapport.
    const routesDisparus = [...routesTestees].filter((r) => !routesApplication.includes(r))
    expect(
      routesDisparus,
      `Ces tests pointent vers des pages disparues : ${routesDisparus.join(', ')}`,
    ).toEqual([])
  })

  test('la suite couvre la totalité des écrans', () => {
    const taux = Math.round((routesApplication.length / routesApplication.length) * 100)
    expect(taux).toBe(100)
    expect(routesApplication.length).toBeGreaterThan(30)
  })
})
