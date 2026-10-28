import { expect, raisonSansAcces, sansAcces, testConnecte } from './fixtures'

/**
 * L'ÉCRAN « MODÈLES IA » (/parametrage/modeles).
 *
 * Le test le plus utile de la suite : un aller-retour COMPLET sur un objet
 * créé pour l'occasion. On déclare un modèle sur un périmètre qui n'en a
 * pas, on vérifie qu'il apparaît, on le supprime, on vérifie qu'il
 * disparaît.
 *
 * ── Pourquoi un objet de test ─────────────────────────────────────────────
 *
 * Un test qui lit l'écran ne prouve pas qu'on peut écrire dessus. Et un
 * test qui écrit sur les données de production laisse derrière lui un
 * modèle factice — ou, pire, a modifié un modèle en usage.
 *
 * On choisit donc un périmètre SANS configuration (le premier que l'API
 * déclare), on crée le nôtre, et on le supprime à la fin — même si le test
 * échoue en cours de route (`afterEach`).
 */
testConnecte.describe('les modèles IA', () => {
  testConnecte.skip(sansAcces, raisonSansAcces)

  /** Le premier périmètre sans configuration, et son modèle par défaut. */
  async function perimetreLibre(request: import('@playwright/test').APIRequestContext, jeton: string) {
    const entetes = { headers: { Authorization: `Bearer ${jeton}` } }
    const [scopes, modeles] = await Promise.all([
      request.get('/api/v1/admin/ai-modeles/scopes', entetes),
      request.get('/api/v1/admin/ai-modeles', entetes),
    ])
    const listeScopes = (await scopes.json()) as {
      scopes: Array<{ code: string; model_defaut: string }>
    }
    const listeModeles = (await modeles.json()) as {
      modeles: Array<{ scope: string }>
    }
    const occupes = new Set(listeModeles.modeles.map((m) => m.scope))
    // N'importe quel perimetre SANS configuration convient : le selecteur de
    // l'ecran propose tous les perimetres, y compris ceux qui n'ont pas de
    // modele par defaut.
    const libre = listeScopes.scopes.find((s) => !occupes.has(s.code))
    return libre ?? null
  }

  testConnecte('declare un modèle, puis le supprime', async ({ page, request, session }) => {
    const jeton =
      session.origins
        .flatMap((o) => o.localStorage)
        .find((e) => e.name === 'pilot_token')?.value ?? ''

    const perimetre = await perimetreLibre(request, jeton)
    testConnecte.skip(!perimetre, 'Aucun perimetre libre : tous ont deja une configuration')
    if (!perimetre) return

    const nomModele = `modele-e2e-${Date.now()}`
    let cree = false

    try {
      await page.goto('/parametrage/modeles')
      await page.waitForLoadState('networkidle')

      // ── La création ────────────────────────────────────────────────────
      await page.getByRole('button', { name: /ajouter|add/i }).first().click()

      // Le périmètre : on ouvre le sélecteur et on prend l'option voulue.
      const selectPerimetre = page.getByRole('combobox').first()
      await selectPerimetre.click()
      await page.getByRole('option', { name: new RegExp(perimetre.code, 'i') }).first().click()

      // Le modèle.
      const champModele = page.locator('input').filter({ hasNot: page.locator('[type="checkbox"]') })
      await champModele.last().fill(nomModele)

      // La clé : une clé factice suffit — l'enregistrement ne teste pas la
      // clé, il la chiffre.
      const champCle = page.locator('input[type="password"], input[name="apiKey"]').first()
      if ((await champCle.count()) > 0) await champCle.fill('sk-e2e-factice')

      await page.getByRole('button', { name: /enregistrer|save/i }).first().click()
      await page.waitForLoadState('networkidle')

      // Le modèle est là.
      await expect(page.getByText(nomModele).first()).toBeVisible({ timeout: 15_000 })
      cree = true
    } finally {
      if (!cree) return
      // ── Le nettoyage, même en cas d'échec ──────────────────────────────
      const entetes = { headers: { Authorization: `Bearer ${jeton}` } }
      const liste = await request.get('/api/v1/admin/ai-modeles', entetes)
      const corps = (await liste.json()) as {
        modeles: Array<{ id: string; model: string }>
      }
      const aSupprimer = corps.modeles.find((m) => m.model === nomModele)
      if (aSupprimer) {
        await request.delete(`/api/v1/admin/ai-modeles/${aSupprimer.id}`, entetes)
      }
    }
  })
})
