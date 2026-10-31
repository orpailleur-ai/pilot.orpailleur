import { expect } from '@playwright/test'
import { raisonSansAcces, sansAcces, testConnecte } from './fixtures'
import { aller } from './helpers/navigation'
import { requete } from './helpers/api'

/**
 * AFFECTER UN RÔLE, DANS LE PILOT.
 *
 * ── Ce que ce test vérifie ────────────────────────────────────────────────
 *
 * Le test de provisionnement (`tests/provisionnement.spec.ts`) vérifie que
 * l'API d'administration marche. Celui-ci vérifie l'AUTRE moitié : que le
 * FORMULAIRE marche, et que le rôle qu'on lui a confié arrive bien où il
 * doit.
 *
 * ── Le cas qu'il couvre ───────────────────────────────────────────────────
 *
 * Un compte créé par le pilot n'appartient à aucune boulangerie. Sans rôle
 * GLOBAL — un rôle qui ne dépend d'aucune boulangerie — il ne peut pas se
 * connecter à l'administration : l'API refuse un compte sans rôle (« aucun
 * role assigne »).
 *
 * C'est donc le rôle global qui rend un compte utilisable, et c'est par
 * l'interface qu'on l'affecte.
 */
const SUFFIXE = Date.now().toString(36)

testConnecte.describe('les roles dans le pilot', () => {
  testConnecte.skip(sansAcces, raisonSansAcces)

  testConnecte('un administrateur affecte un role global a un compte', async ({ page, session }) => {
    const email = `e2e-role-${SUFFIXE}@orpailleur.test`
    let userId = ''

    // Le jeton d'administration, celui de la session de la suite.
    const jetonAdmin =
      session.origins[0]?.localStorage.find((l: { name: string }) => l.name === 'pilot_token')
        ?.value ?? ''
    expect(jetonAdmin, 'la session doit porter un jeton').not.toBe('')

    try {
      // ── Créer le compte, par le formulaire ──────────────────────────────
      await aller(page, '/users')
      await page.getByRole('button', { name: /nouvel utilisateur/i }).first().click()

      const champEmail = page.getByLabel(/email/i).first()
      const champMotDePasse = page.getByLabel(/mot de passe/i).first()
      await champEmail.waitFor({ state: 'visible', timeout: 15_000 })

      await champEmail.fill(email)
      await champMotDePasse.fill('MotDePasse!2026')
      await page.getByRole('button', { name: /ajouter|ajouter|valider/i }).last().click()

      await expect(
        page.locator(`text=${email}`).first(),
        'le compte cree doit apparaitre dans la liste',
      ).toBeVisible({ timeout: 20_000 })

      // ── Retrouver son identifiant ───────────────────────────────────────
      const [statut, liste] = await requete('GET', '/admin/users', jetonAdmin)
      expect(statut).toBe(200)
      const compte = (Array.isArray(liste) ? liste : []).find(
        (u: { email: string }) => u.email === email,
      )
      expect(compte, 'le compte doit exister dans l\'API').toBeDefined()
      userId = compte.id as string

      // ── La page des rôles ───────────────────────────────────────────────
      await aller(page, '/users/' + userId + '/roles')

      // Aucun rôle global : le compte ne peut rien faire.
      await expect(
        page.locator('text=/rôle global/i').first(),
        'la section des roles globaux doit etre presente',
      ).toBeVisible({ timeout: 15_000 })

      // ── En affecter un ──────────────────────────────────────────────────
      await page.getByRole('button', { name: /assigner un rôle global/i }).first().click()

      // La modale des RÔLES GLOBAUX. Les deux modales de la page sont
      // présentes dans le DOM en même temps : sans les distinguer par leur
      // titre, on attrape le sélecteur de l'autre.
      const modale = page.getByRole('dialog', { name: /assigner un rôle global/i })
      await modale.waitFor({ state: 'visible', timeout: 10_000 })

      const selectRole = modale.locator('select').first()
      await selectRole.waitFor({ state: 'visible', timeout: 10_000 })

      // On prend un rôle RÉEL de la liste — la première option est
      // l'invite « Sélectionner un rôle… », pas un rôle.
      const options = await selectRole.locator('option').allTextContents()
      const reels = options.filter((o) => o.trim() !== '' && !/sélectionner/i.test(o))
      expect(reels.length, 'la liste des roles doit etre proposee').toBeGreaterThan(0)
      const choisi = reels[reels.length - 1]
      await selectRole.selectOption({ label: choisi })

      await modale.getByRole('button', { name: 'Assigner', exact: true }).click()

      // Le rôle doit apparaître dans la table des rôles globaux.
      await expect(
        page.locator('table').filter({ hasText: choisi }).first(),
        'le role global doit apparaitre dans la liste',
      ).toBeVisible({ timeout: 20_000 })

      // ── Et l'API doit le voir aussi ─────────────────────────────────────
      const [statutRoles, roles] = await requete(
        'GET',
        '/admin/users/' + userId + '/global-roles',
        jetonAdmin,
      )
      expect(statutRoles).toBe(200)
      expect(
        (roles as Array<{ role_code: string }>).map((r) => r.role_code),
        'le role global doit etre rattache au compte',
      ).not.toHaveLength(0)
    } finally {
      // ── Le nettoyage ─────────────────────────────────────────────────────
      if (userId) {
        await requete('DELETE', '/admin/users/' + userId, jetonAdmin).catch(
          () => undefined,
        )
      }
    }
  })
})
