import type { Page } from '@playwright/test'

/**
 * Ouvrir une page, en réessayant quand le réseau flanche.
 *
 * ── Pourquoi ──────────────────────────────────────────────────────────────
 *
 * Le réseau de la machine de test saute parfois : la navigation échoue alors
 * sur `net::ERR_NETWORK_CHANGED` ou sur un délai dépassé. Ce n'est pas un
 * défaut du produit — l'écran n'a pas eu sa chance d'exister — et le rapport
 * s'en.findrait de « la page X ne marche pas » pour une coupure de connexion.
 *
 * On réessaie donc trois fois, et seule la DERNIÈRE tentative est celle qui
 * compte. Si la page est vraiment en faute, elle le restera trois fois de
 * suite : le défaut ressort quand même.
 *
 * Le sondeur n'écoute qu'APRÈS la navigation réussie : une navigation
 * avortée ne doit pas laisser de traces d'anomalies.
 */
export async function aller(page: Page, url: string): Promise<void> {
  let dernierEchec: unknown = null

  for (let essai = 1; essai <= 3; essai++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      return
    } catch (erreur) {
      dernierEchec = erreur
      // On RÉessaie la même navigation, sans passer par `about:blank` : une
      // page `about:blank` a une origine opaque, et le Javascript encore
      // vivant de l'application y levait « Access is denied » sur
      // `sessionStorage` — une exception inventée par le test lui-même.
      await page.waitForTimeout(500 * essai)
    }
  }

  throw dernierEchec
}
