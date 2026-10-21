/**
 * Client API pour les modèles IA (pilot scope).
 * Routes /admin/ai-modeles/* avec JWT super_admin.
 *
 * ── Pourquoi ce fichier existe ───────────────────────────────────────────────
 *
 * La page `/parametrage/modeles` appelait `apiClient.get/post/patch/delete`
 * en direct, avec les chemins d'URL écrits au fil de l'eau. Chaque autre page
 * de liste du pilot passe par un client dédié (`email-client.ts`,
 * `pdf-templates-client.ts`, `roles` dans `api-client.ts`) : les chemins, les
 * types et les formes de réponse se trouvent à un seul endroit, et la page ne
 * fait plus que de l'UI.
 *
 * La forme de `Modele` était DUPLIQUÉE entre la page liste et la page
 * détail, avec un commentaire qui l'avouait (« les deux doivent évoluer
 * ensemble »). Ici, une seule définition, importée par les deux.
 */

import { apiClient } from '@/lib/api-client'

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Un périmètre d'usage de modèle.
 *
 * L'API ne renvoie QUE le code : le libellé vit dans le dictionnaire du
 * client (`lib/i18n/scopes.ts`), sinon il resterait en français après
 * bascule de langue.
 */
export interface ScopeInfo {
  code: string
}

/**
 * Une configuration de modèle, telle que renvoyée par `/admin/ai-modeles`.
 *
 * La forme suit EXACTEMENT ce que l'API renvoie — pas ce qu'elle pourrait
 * renvoyer. Le type précédent annonçait `tarif_base` et `prix_page_eur` :
 * l'API ne les envoie pas, la branche « facturé à la page » du tableau
 * était donc du code mort, et la ligne affichait toujours le barème
 * €/M. Un type qui promet des champs absents fait écrire du code qui ne
 * s'exécute jamais.
 */
export interface Modele {
  id: string
  scope: string
  provider: string
  model: string
  /** `env` : la base ne retient que le nom de la variable. `db` : chiffrée. */
  key_source: 'env' | 'db'
  env_var: string | null
  /** Masque de la clé chiffrée — jamais la clé elle-même. */
  cle: string | null
  /** Euros par MILLION de jetons. `null` = non tarifé, jamais 0. */
  prix_entree_eur_par_m: number | null
  prix_sortie_eur_par_m: number | null
  actif: boolean
  updated_at: string
}

/** Ce que renvoie `/admin/ai-modeles/scopes`. */
export interface ScopesAdmin {
  scopes: ScopeInfo[]
  /** Faux = l'API refuse d'enregistrer une clé en base (pas de clé maîtresse). */
  chiffrement_disponible: boolean
}

/** Champs acceptés à la création d'une configuration. */
export interface ModeleInput {
  scope: string
  provider: string
  model: string
  /** Clé en clair : elle part une fois, chiffrée côté serveur, jamais relue. */
  api_key?: string
  prix_entree_eur_par_m: number | null
  prix_sortie_eur_par_m: number | null
  actif: boolean
}

/** Résultat d'un test de connexion, par configuration. */
export interface TestResultat {
  ok: boolean
  code: string
  message: string
  duree_ms?: number
}

// ── Appels ────────────────────────────────────────────────────────────────────

export async function listScopesAdmin(): Promise<ScopesAdmin> {
  return apiClient.get<ScopesAdmin>('/admin/ai-modeles/scopes')
}

export async function listModelesAdmin(): Promise<Modele[]> {
  const r = await apiClient.get<{ modeles: Modele[] }>('/admin/ai-modeles')
  return r.modeles ?? []
}

export async function createModeleAdmin(data: ModeleInput): Promise<Modele> {
  return apiClient.post<Modele>('/admin/ai-modeles', data)
}

export async function updateModeleAdmin(
  id: string,
  data: Partial<ModeleInput> & { actif?: boolean },
): Promise<Modele> {
  return apiClient.patch<Modele>(`/admin/ai-modeles/${id}`, data)
}

export async function deleteModeleAdmin(id: string): Promise<void> {
  return apiClient.delete(`/admin/ai-modeles/${id}`)
}

/**
 * Teste une configuration contre le fournisseur.
 *
 * Le secret ne quitte JAMAIS le serveur : la clé est déchiffrée côté API,
 * l'appel part de là, et la réponse ne contient ni la clé ni son début.
 */
export async function testerModeleAdmin(id: string): Promise<TestResultat> {
  return apiClient.post<TestResultat>(`/admin/ai-modeles/${id}/tester`)
}

// ── Aides ─────────────────────────────────────────────────────────────────────

/**
 * Modèle employé quand rien n'est configuré, par périmètre.
 *
 * `null` pour les périmètres qui n'ont PAS de modèle par défaut : ces
 * modules n'appellent aujourd'hui aucun modèle, et afficher « utilisation de
 * mistral-small » affirmerait un comportement qui n'existe pas.
 */
export const MODELES_PAR_DEFAUT: Record<string, string> = {
  ocr_vision: 'mistral-ocr-latest',
  ocr_reasoning: 'mistral-large',
  ocr_agent: 'mistral-small',
  import_recette: 'mistral-small',
  bot: 'mistral-small',
}

export function defautDe(scope: string): string | null {
  return MODELES_PAR_DEFAUT[scope] ?? null
}
