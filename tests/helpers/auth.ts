import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium, type BrowserContext } from '@playwright/test'

/**
 * L'état de session, tel que Playwright l'attend.
 *
 * Le type est écrit ici plutôt qu'importé : `@playwright/test` n'exporte pas
 * `StorageState`, et dépendre d'un type interne de `playwright-core` serait
 * plus fragile que dix lignes de définition.
 */
export interface EtatSession {
  cookies: Array<{
    name: string
    value: string
    domain: string
    path: string
    expires: number
    httpOnly: boolean
    secure: boolean
    sameSite: 'Strict' | 'Lax' | 'None'
  }>
  origins: Array<{
    origin: string
    localStorage: Array<{ name: string; value: string }>
  }>
}

/**
 * L'accès au pilot.
 *
 * Deux chemins, et un seul raisonnable en CI :
 *
 * 1. `PILOT_EMAIL` + `PILOT_PASSWORD` → un login par le FORMULAIRE, comme un
 *    utilisateur. C'est le parcours qu'on veut vérifier : le formulaire
 *    lui-même, son message d'erreur, la redirection.
 *
 * 2. `PILOT_TOKEN` → le jeton est injecté dans le stockage du navigateur. Le
 *    jeton se trouve dans `localStorage` (et `sessionStorage`) sous
 *    `pilot_token` — voir `lib/api-client.ts`. En CI, faire circuler un mot
 *    de passe dans les logs n'a pas lieu d'être.
 *
 * Le storageState produit ici est réutilisé par tous les tests : un seul
 * login pour toute la suite, et les tests ne se marchent pas dessus.
 */
/**
 * Construit l'etat de session a partir de la page connectee.
 *
 * Le pilot ne demande qu'une chose : le jeton, dans `localStorage` ET dans un
 * cookie (voir `lib/api-client.ts` et `setAuthCookie`). On lit les deux et on
 * rend l'objet attendu par Playwright — plus fiable que de demander l'etat
 * au navigateur, qui echoue sur certaines versions headless.
 */
async function etatDepuisLaPage(page: import('@playwright/test').Page): Promise<EtatSession> {
  const origine = new URL(page.url()).origin
  const jetons = await page.evaluate(() => ({
    access: window.localStorage.getItem('pilot_token'),
    refresh: window.localStorage.getItem('pilot_refresh_token'),
  }))
  const cookies = await page.context().cookies()

  const localStorage = [
    { name: 'pilot_token', value: jetons.access ?? '' },
    ...(jetons.refresh ? [{ name: 'pilot_refresh_token', value: jetons.refresh }] : []),
  ]

  return { cookies, origins: [{ origin: origine, localStorage }] }
}

export interface Credentials {
  email?: string
  password?: string
  token?: string
}

export function credentials(): Credentials {
  return {
    email: process.env.PILOT_EMAIL,
    password: process.env.PILOT_PASSWORD,
    token: process.env.PILOT_TOKEN,
  }
}

/** Vrai si la suite peut se connecter. Sinon, les tests sont SAUTÉS. */
export function peutSeConnecter(): boolean {
  const c = credentials()
  return Boolean((c.email && c.password) || c.token)
}

/** L'état de session à réutiliser : `pilot_token` dans le stockage partagé. */
/**
 * Le fichier ou l'etat de session est conserve.
 *
 * Un jeton d'acces expire en une heure : le conserver evite un login a chaque
 * execution. `test-results/` est ignore par git ✓ — le jeton ne part jamais
 * au depot.
 */
const FICHIER_ETAT = 'test-results/.auth-state.json'
/** Duree de validite du cache : 30 minutes, largement moins que le jeton. */
const DUREE_ETAT_MS = 30 * 60 * 1000

function lireEtatCache(): EtatSession | null {
  try {
    const brut = readFileSync(FICHIER_ETAT, 'utf-8')
    const { moment, etat } = JSON.parse(brut) as { moment: number; etat: EtatSession }
    if (Date.now() - moment > DUREE_ETAT_MS) return null
    return etat
  } catch {
    return null
  }
}

function ecrireEtatCache(etat: EtatSession): void {
  try {
    mkdirSync('test-results', { recursive: true })
    writeFileSync(
      FICHIER_ETAT,
      JSON.stringify({ moment: Date.now(), etat }),
      { encoding: 'utf-8', mode: 0o600 },
    )
  } catch {
    // Pas de cache : on se connectera a chaque execution.
  }
}

export async function storageState(): Promise<EtatSession> {
  const c = credentials()
  const baseURL = process.env.PILOT_BASE_URL ?? 'https://pilot.orpailleur-software.fr'

  // Un login par execution, pas un par test.
  //
  // Trente-cinq logins d'affilee, c'est trente-cinq appels au meme point
  // d'entree : le limiteur de debit de l'API finit par les refuser, et les
  // tests echouent sur une erreur de connexion — un defaut de l'outillage,
  // pas du pilot.
  const cache = lireEtatCache()
  if (cache) return cache

  const browser = await chromium.launch()
  try {
    const context = await browser.newContext({ baseURL })
    const page = await context.newPage()

    if (c.token) {
      // Le jeton d'abord : la page charge, et les requêtes partent avec.
      await page.addInitScript(
        ([token]) => {
          window.localStorage.setItem('pilot_token', token as string)
          window.sessionStorage.setItem('pilot_token', token as string)
        },
        [c.token],
      )
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      const etat = await etatDepuisLaPage(page)
      ecrireEtatCache(etat)
      return etat
    }

    if (!c.email || !c.password) {
      throw new Error(
        'Aucun accès configuré : définissez PILOT_EMAIL et PILOT_PASSWORD, ' +
          'ou PILOT_TOKEN.',
      )
    }

    // Le parcours réel : le formulaire de connexion.
    await page.goto('/login')
    await page.locator('input[type="email"], input[name="email"]').first().fill(c.email)
    await page
      .locator('input[type="password"], input[name="password"]')
      .first()
      .fill(c.password)
    await page.locator('button[type="submit"]').first().click()

    // La connexion réussie quitte /login : l'application redirige vers la
    // première page autorisée. On attend le token, pas l'URL : c'est le
    // signe que la session EST ouverte.
    await page.waitForFunction(
      () => Boolean(window.localStorage.getItem('pilot_token')),
      undefined,
      { timeout: 30_000 },
    )
    await page.waitForLoadState('networkidle')
    const etat = await etatDepuisLaPage(page)
    ecrireEtatCache(etat)
    return etat
  } finally {
    await browser.close()
  }
}

/** Ouvre un contexte déjà connecté, sans repasser par le login. */
export async function contextConnecte(
  browser: import('@playwright/test').Browser,
  state: EtatSession,
): Promise<BrowserContext> {
  return browser.newContext({
    baseURL: process.env.PILOT_BASE_URL ?? 'https://pilot.orpailleur-software.fr',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    storageState: state,
  })
}
