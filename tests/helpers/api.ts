import type { APIRequestContext } from '@playwright/test'

/**
 * Un client HTTP pour l'API d'administration.
 *
 * ── Pourquoi `request` et non le navigateur ────────────────────────────────
 *
 * Le provisionnement (créer une boulangerie, un rôle, un compte) est une
 * opération d'ADMINISTRATION : elle se fait par l'API, et c'est l'API qu'il
 * faut vérifier. Le parcours des FORMULAIRES a son propre test, côté
 * interface.
 *
 * ── Pourquoi une fonction à part ──────────────────────────────────────────
 *
 * Chaque appel doit porter le jeton, et les erreurs doivent dire ce qui
 * a échoué : un test qui se contente de comparer des codes HTTP ne dit pas
 * POURQUOI la creation a echoue.
 */

/** L'origine de l'API — sans le `/api/v1`, qui est ajoute par `chemin()`. */
export const API_BASE_URL =
  process.env.API_BASE_URL ?? 'https://console.orpailleur-software.fr'

export interface ReponseApi {
  status: number
  corps: unknown
}

/**
 * Appelle l'API d'administration.
 *
 * Renvoie le statut ET le corps : un 400 sans son message ne sert à rien
 * dans un rapport de test.
 */
export async function requete(
  methode: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  chemin: string,
  jeton: string,
  corps?: unknown,
): Promise<[number, any]> {
  const base = API_BASE_URL.replace(/\/$/, '')
  const reponse = await fetch(`${base}/api/v1${chemin}`, {
    method: methode,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jeton}`,
    },
    ...(corps !== undefined ? { body: JSON.stringify(corps) } : {}),
  })

  const texte = await reponse.text()
  let analyse: unknown = null
  try {
    analyse = texte ? JSON.parse(texte) : null
  } catch {
    analyse = texte
  }
  return [reponse.status, analyse]
}

/** L'API d'administration, avec le jeton du pilot. */
export function headersPilot(jeton: string): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` }
}

/** Un identifiant unique pour un objet de test. */
export function suffixeUnique(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

/**
 * Le jeton d'administration.
 *
 * `PILOT_TOKEN` s'il est fourni ; sinon, une connexion avec
 * `PILOT_EMAIL` / `PILOT_PASSWORD`. Retourne `null` si aucune des deux
 * n'est disponible — l'appelant saute alors son test.
 */
export async function jetonAdmin(): Promise<string | null> {
  if (process.env.PILOT_TOKEN) return process.env.PILOT_TOKEN

  const email = process.env.PILOT_EMAIL
  const password = process.env.PILOT_PASSWORD
  if (!email || !password) return null

  const base = API_BASE_URL.replace(/\/$/, '')
  const reponse = await fetch(`${base}/api/v1/auth/login/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!reponse.ok) return null
  const corps = (await reponse.json()) as { accessToken?: string }
  return corps.accessToken ?? null
}
