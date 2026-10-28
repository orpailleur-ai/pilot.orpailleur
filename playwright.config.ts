import { readFileSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

/**
 * Tests d'interface du PILOT (console d'administration).
 *
 * ── Contre quoi ils s'exécutent ───────────────────────────────────────────
 *
 * Par défaut : le PILOT DÉPLOYÉ (`PILOT_BASE_URL`). C'est là que les vrais
 * défauts se voient : une page qui charge une route inexistante, une clé de
 * traduction absente, un appel API qui renvoie 500 — rien de tout cela
 * n'apparaît dans une maquette.
 *
 * Pour viser un autre déploiement (un preview, un poste local), il suffit de
 * changer la variable :
 *
 *     PILOT_BASE_URL=http://127.0.0.1:3002 npm run test:e2e
 *
 * ── Pourquoi un compte de test à part ─────────────────────────────────────
 *
 * Les tests écrivent : ils créent un modèle IA, un gabarit d'e-mail, puis les
 * suppriment. Un compte dédié (`e2e@orpailleur.com`, rôle `super_admin`)
 * s'occupe de cela. Les identifiants viennent de l'environnement :
 * jamais dans le dépôt, jamais dans le code.
 *
 * ── Le compte, ou un jeton ────────────────────────────────────────────────
 *
 * `PILOT_EMAIL` + `PILOT_PASSWORD` → la suite se connecte par le FORMULAIRE
 * (le vrai parcours, celui que vit l'utilisateur).
 *
 * `PILOT_TOKEN` → la suite l'injecte directement (utile en CI, où le mot de
 * passe ne doit pas circuler).
 */
/**
 * Les identifiants de test ne sont JAMAIS dans le dépôt.
 *
 * `.env.e2e` est ignoré par git (`.env*`) ; on le lit ici pour que la
 * commande soit `npm run test:e2e` et rien d'autre. Les variables déjà
 * présentes dans l'environnement gagnent : la CI passe les siennes.
 */
function chargerEnvE2e(): void {
  if (typeof process === 'undefined') return
  try {
    const contenu = readFileSync('.env.e2e', 'utf-8')
    for (const ligne of contenu.split('\n')) {
      const propre = ligne.trim()
      if (!propre || propre.startsWith('#')) continue
      const egal = propre.indexOf('=')
      if (egal < 0) continue
      const cle = propre.slice(0, egal).trim()
      const valeur = propre.slice(egal + 1).trim().replace(/^["']|["']$/g, '')
      if (process.env[cle] === undefined) process.env[cle] = valeur
    }
  } catch {
    // Pas de `.env.e2e` : les variables d'environnement suffisent (CI).
  }
}

chargerEnvE2e()

const BASE_URL = process.env.PILOT_BASE_URL ?? 'https://pilot.orpailleur-software.fr'

export default defineConfig({
  testDir: './tests',
  // Les pages du pilot attendent l'API : une requête peut prendre quelques
  // secondes, et le pairage d'un tenant mobilise plusieurs requêtes.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Une seule exécution à la fois : les tests écrivent en base (création puis
  // suppression d'objets de test), et deux exécutions parallèles pourraient
  // se marcher dessus.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: BASE_URL,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    // La trace n'est conservée que sur les échecs : un_trace par défaut sur
    // toutes les executionsignerait chaque page de 2 Mo.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
