import { expect, test, type Page } from '@playwright/test'
import { anomaliesDeMiseEnPage } from './helpers/layout'

/**
 * Aucune fenêtre de formulaire ne doit avoir de texte qui en recouvre un autre, de champ écrasé ni de contenu qui
 * déborde — au poste de travail comme sur téléphone.
 *
 * Ce test ne touche PAS à la production : il tourne contre un serveur local (`npm run dev -- -p 3119`, ou
 * LAYOUT_BASE_URL) dont l'API est entièrement simulée. Le détecteur est celui de la console (tests/helpers/layout.ts).
 */
const BASE = process.env.LAYOUT_BASE_URL ?? 'http://localhost:3119'
test.use({ baseURL: BASE })

const J = (o: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(o) })
const jwt = 'x.' + Buffer.from(JSON.stringify({ sub: 'u1', exp: 4102444800 })).toString('base64') + '.x'

const TENANT = { id: 't1', nom: 'Chez Sefferie', slug: 'chez-sefferie', actif: true, plan: 'starter' }
const PLAN = { id: 'p1', nom: 'Starter', code: 'starter', prixMensuelCents: 4900, prixAnnuelCents: 49000, nbSitesMax: 1, nbUsersMax: 5, description: 'Pour démarrer', actif: true }

async function simuler(page: Page) {
  await page.context().addInitScript((t) => {
    window.localStorage.setItem('pilot_token', t)
    window.localStorage.setItem('pilot_refresh_token', t)
    window.sessionStorage.setItem('pilot_token', t)
  }, jwt)
  await page.context().addCookies([{ name: 'pilot_token', value: jwt, url: BASE }])
  await page.route(/\/api\/v1\//, (r) => {
    const u = r.request().url().split('?')[0]
    if (u.includes('/auth/me')) return r.fulfill(J({ id: 'u1', email: 'a@b.fr', roles: ['super_admin'], permissions: ['*'] }))
    if (/\/tenants$/.test(u)) return r.fulfill(J([TENANT]))
    if (/\/tenants\/t1$/.test(u)) return r.fulfill(J(TENANT))
    if (/\/plans$/.test(u)) return r.fulfill(J([PLAN]))
    if (/\/admin\/roles$/.test(u)) return r.fulfill(J([]))
    if (/\/admin\/email\/templates$/.test(u)) return r.fulfill(J([{ scope: 'facture_envoyee', label: 'Facture envoyée', labelEn: 'Invoice sent', exists: false, name: '', subject: '', actif: false, updatedAt: null }]))
    if (/\/admin\/email\/templates\/[^/]+$/.test(u)) return r.fulfill(J({ exists: false, scope: 'facture_envoyee', definition: { scope: 'facture_envoyee', label: 'Facture envoyée', labelEn: 'Invoice sent', variables: [] } }))
    return r.fulfill(J([]))
  })
}

/** Chaque entrée : la page, et le geste qui ouvre la fenêtre à contrôler. */
const FENETRES: Array<{ nom: string; page: string; ouvrir: (p: Page) => Promise<unknown> }> = [
  { nom: 'nouvelle boulangerie (onboarding)', page: '/tenants', ouvrir: (p) => p.getByRole('button', { name: 'Nouvelle boulangerie' }).first().click() },
  { nom: 'nouvel utilisateur', page: '/users', ouvrir: (p) => p.getByRole('button', { name: 'Nouvel utilisateur' }).first().click() },
  { nom: 'nouveau rôle', page: '/roles', ouvrir: (p) => p.getByRole('button', { name: /Nouveau rôle/ }).first().click() },
  { nom: 'nouveau site d\'une boulangerie', page: '/tenants/t1/sites', ouvrir: (p) => p.getByRole('button', { name: 'Nouveau site' }).first().click() },
  { nom: 'nouveau modèle IA', page: '/parametrage/modeles', ouvrir: (p) => p.getByRole('button', { name: 'Ajouter un modèle' }).first().click() },
  { nom: 'nouveau template d\'e-mail', page: '/parametrage/email-templates', ouvrir: (p) => p.getByRole('button', { name: 'Ajouter un template' }).first().click() },
]

for (const f of FENETRES) {
  test(`${f.nom} : aucun texte ne recouvre un champ, rien ne déborde`, async ({ page }, info) => {
    await simuler(page)
    await page.goto(f.page, { waitUntil: 'domcontentloaded', timeout: 90_000 })
    // Sur téléphone, le menu est un tiroir (un <dialog>) : on le referme pour ne contrôler que la fenêtre testée.
    await page.waitForTimeout(800)
    if (await page.getByRole('dialog').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(400) }
    await f.ouvrir(page)
    const fenetre = page.getByRole('dialog').last()
    await expect(fenetre).toBeVisible()
    await page.waitForTimeout(600) // l'animation d'ouverture
    await page.screenshot({ path: info.outputPath(`${f.nom.replace(/\W+/g, '-')}.png`) })

    const anomalies = await anomaliesDeMiseEnPage(fenetre)
    expect(anomalies, anomalies.map((a) => `[${a.type}] ${a.detail}`).join('\n')).toEqual([])
  })
}

test('une fenêtre fermée ne se dessine pas et ne bloque pas la page ; ouvrir puis fermer fonctionne', async ({ page }) => {
  await simuler(page)
  await page.goto('/users', { waitUntil: 'domcontentloaded', timeout: 90_000 })
  await page.waitForTimeout(1500)
  const fermees = await page.evaluate(() => [...document.querySelectorAll('dialog.orp-modal:not([open])')].map((d) => getComputedStyle(d).display))
  expect(fermees.every((d) => d === 'none'), `fenêtres fermées encore dessinées : ${fermees.join(',')}`).toBe(true)
  // le bouton d'action de la page reçoit les appuis, ouvre la fenêtre, et Échap la referme
  await page.getByRole('button', { name: 'Nouvel utilisateur' }).first().click()
  await expect(page.getByRole('dialog').last()).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog.orp-modal[open]')).toHaveCount(0)
  const apres = await page.evaluate(() => [...document.querySelectorAll('dialog.orp-modal:not([open])')].map((d) => getComputedStyle(d).display))
  expect(apres.every((d) => d === 'none')).toBe(true)
})
