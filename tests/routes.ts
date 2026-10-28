import type { APIRequestContext } from '@playwright/test'

/**
 * Le CATALOGUE DES PAGES du pilot.
 *
 * Trente-six écrans, dont une dizaine à identifiant. Pour tester « la page
 * de détail d'un tenant », il faut un VRAI tenant : on va le chercher dans
 * l'API plutôt que d'écrire son id en dur (il change à chaque installation,
 * et le test échouerait sans dire pourquoi).
 *
 * Chaque entrée porte donc, au besoin, la façon de RESOUDRE son URL.
 */
export interface Route {
  /** Le chemin affiché, avec ses crochets. */
  chemin: string
  /**
   * Résout l'URL réelle. Renvoie `null` si la donnée n'existe pas.
   *
   * Le jeton est passé à part : la requête de l'API est porteuse du
   * `Authorization: Bearer`, sans quoi elle revient 401 et la page est
   * ignorée au lieu d'être testée.
   */
  resoudre?: (api: APIRequestContext, jeton: string) => Promise<string | null>
  /** Pourquoi la page est ignorée, s'il y a lieu. */
  ignore?: string
}

/** Le premier élément d'une liste, ou `null`. */
async function premierId(
  api: APIRequestContext,
  chemin: string,
  extraction: (corps: unknown) => string | null,
  jeton: string,
): Promise<string | null> {
  const reponse = await api.get(`/api/v1${chemin}`, { headers: { Authorization: `Bearer ${jeton}` } })
  if (!reponse.ok()) return null
  const corps = await reponse.json()
  try {
    return extraction(corps)
  } catch {
    return null
  }
}

const liste = (corps: unknown): unknown[] =>
  Array.isArray(corps)
    ? corps
    : ((corps as { modeles?: unknown[]; tenants?: unknown[] })?.modeles ??
       (corps as { tenants?: unknown[] })?.tenants ??
       (corps as { data?: unknown[] })?.data ??
       [])

export const ROUTES: Route[] = [
  { chemin: '/' },
  { chemin: '/dashboard' },
  { chemin: '/tenants' },
  { chemin: '/tenants/new' },
  {
    chemin: '/tenants/[id]',
    resoudre: async (api, jeton) => {
      const id = await premierId(api, '/admin/tenants', (c) => (liste(c)[0] as { id?: string })?.id ?? null, jeton)
      return id ? `/tenants/${id}` : null
    },
  },
  {
    chemin: '/tenants/[id]/invoices',
    resoudre: async (api, jeton) => {
      const id = await premierId(api, '/admin/tenants', (c) => (liste(c)[0] as { id?: string })?.id ?? null, jeton)
      return id ? `/tenants/${id}/invoices` : null
    },
  },
  {
    chemin: '/tenants/[id]/settings',
    resoudre: async (api, jeton) => {
      const id = await premierId(api, '/admin/tenants', (c) => (liste(c)[0] as { id?: string })?.id ?? null, jeton)
      return id ? `/tenants/${id}/settings` : null
    },
  },
  {
    chemin: '/tenants/[id]/settings/danger',
    resoudre: async (api, jeton) => {
      const id = await premierId(api, '/admin/tenants', (c) => (liste(c)[0] as { id?: string })?.id ?? null, jeton)
      return id ? `/tenants/${id}/settings/danger` : null
    },
  },
  {
    chemin: '/tenants/[id]/sites',
    resoudre: async (api, jeton) => {
      const id = await premierId(api, '/admin/tenants', (c) => (liste(c)[0] as { id?: string })?.id ?? null, jeton)
      return id ? `/tenants/${id}/sites` : null
    },
  },
  {
    chemin: '/tenants/[id]/sites/[siteId]',
    resoudre: async (api, jeton) => {
      const id = await premierId(api, '/admin/tenants', (c) => (liste(c)[0] as { id?: string })?.id ?? null, jeton)
      if (!id) return null
      const siteId = await premierId(
        api,
        `/admin/tenants/${id}/sites`,
        (c) => (liste(c)[0] as { id?: string })?.id ?? null,
        jeton,
      )
      return siteId ? `/tenants/${id}/sites/${siteId}` : null
    },
  },
  {
    chemin: '/tenants/[id]/subscription',
    resoudre: async (api, jeton) => {
      const id = await premierId(api, '/admin/tenants', (c) => (liste(c)[0] as { id?: string })?.id ?? null, jeton)
      return id ? `/tenants/${id}/subscription` : null
    },
  },
  {
    chemin: '/tenants/[id]/users',
    resoudre: async (api, jeton) => {
      const id = await premierId(api, '/admin/tenants', (c) => (liste(c)[0] as { id?: string })?.id ?? null, jeton)
      return id ? `/tenants/${id}/users` : null
    },
  },
  { chemin: '/users' },
  {
    chemin: '/users/[id]',
    resoudre: async (api, jeton) => {
      const id = await premierId(api, '/admin/users', (c) => (liste(c)[0] as { id?: string })?.id ?? null, jeton)
      return id ? `/users/${id}` : null
    },
  },
  {
    chemin: '/users/[id]/roles',
    resoudre: async (api, jeton) => {
      const id = await premierId(api, '/admin/users', (c) => (liste(c)[0] as { id?: string })?.id ?? null, jeton)
      return id ? `/users/${id}/roles` : null
    },
  },
  {
    chemin: '/users/[id]/sites',
    resoudre: async (api, jeton) => {
      const id = await premierId(api, '/admin/users', (c) => (liste(c)[0] as { id?: string })?.id ?? null, jeton)
      return id ? `/users/${id}/sites` : null
    },
  },
  { chemin: '/roles' },
  {
    chemin: '/roles/[id]',
    resoudre: async (api, jeton) => {
      const id = await premierId(api, '/admin/roles', (c) => (liste(c)[0] as { id?: string })?.id ?? null, jeton)
      return id ? `/roles/${id}` : null
    },
  },
  { chemin: '/plans' },
  { chemin: '/plans/new' },
  {
    chemin: '/plans/[id]',
    resoudre: async (api, jeton) => {
      const id = await premierId(api, '/admin/plans', (c) => (liste(c)[0] as { id?: string })?.id ?? null, jeton)
      return id ? `/plans/${id}` : null
    },
  },
  { chemin: '/subscriptions' },
  { chemin: '/invoices' },
  { chemin: '/queues' },
  { chemin: '/audit' },
  { chemin: '/billing' },
  { chemin: '/email/stats' },
  { chemin: '/parametrage/modeles' },
  {
    chemin: '/parametrage/modeles/[id]',
    resoudre: async (api, jeton) => {
      const id = await premierId(api, '/admin/ai-modeles', (c) => (liste(c)[0] as { id?: string })?.id ?? null, jeton)
      return id ? `/parametrage/modeles/${id}` : null
    },
  },
  {
    chemin: '/ai-config/[id]/history',
    resoudre: async (api, jeton) => {
      const id = await premierId(api, '/admin/ai-modeles', (c) => (liste(c)[0] as { id?: string })?.id ?? null, jeton)
      return id ? `/ai-config/${id}/history` : null
    },
  },
  { chemin: '/parametrage/pdf-templates' },
  {
    chemin: '/parametrage/pdf-templates/[id]',
    resoudre: async (api, jeton) => {
      const id = await premierId(
        api,
        '/admin/pdf-templates/instances',
        (c) => (liste(c)[0] as { id?: string })?.id ?? null,
        jeton,
      )
      return id ? `/parametrage/pdf-templates/${id}` : null
    },
  },
  { chemin: '/parametrage/email' },
  { chemin: '/parametrage/email-templates' },
  {
    chemin: '/parametrage/email-templates/[scope]',
    resoudre: async (api, jeton) => {
      const scope = await premierId(
        api,
        '/admin/email/templates',
        (c) => (liste(c)[0] as { scope?: string })?.scope ?? null,
        jeton,
      )
      return scope ? `/parametrage/email-templates/${scope}` : null
    },
  },
]
