/**
 * Pilot API Client — calls api.orpailleur with admin scope JWT.
 * Token stored in sessionStorage under 'pilot_token'.
 */

const BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3000/api/v1";

/**
 * Le couple de tokens est stocké dans localStorage (et mirrored dans
 * sessionStorage) et NON dans sessionStorage seul.
 *
 * Raison : sessionStorage est cloisonné par onglet. Avec plusieurs onglets du
 * pilot ouverts, chacun conserve son propre token ; un onglet connecté avant un
 * déploiement garde un access token périmé et surtout aucun refresh token, donc
 * incapable de se renouveler. Résultat observé : un 401 sur /admin/tenants qui
 * éjecte vers /login, en boucle, alors que les autres onglets fonctionnent.
 *
 * En shared storage, un refresh effectué dans un onglet est immédiatement lu
 * par les autres : plus de divergence, plus de boucle de déconnexion.
 */
export const ACCESS_TOKEN_KEY = "pilot_token";
export const REFRESH_TOKEN_KEY = "pilot_refresh_token";

function readToken(key: string): string | null {
  if (typeof window === "undefined") return null;
  const shared = window.localStorage.getItem(key);
  if (shared) return shared;
  // Migration : une session ouverte avant le passage en shared storage.
  const legacy = window.sessionStorage.getItem(key);
  if (legacy) {
    window.localStorage.setItem(key, legacy);
    return legacy;
  }
  return null;
}

function writeToken(key: string, value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
  window.sessionStorage.setItem(key, value);
}

function dropToken(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
  window.sessionStorage.removeItem(key);
}

function getToken(): string | null {
  return readToken(ACCESS_TOKEN_KEY);
}

export function setToken(token: string) {
  writeToken(ACCESS_TOKEN_KEY, token);
}

/** Enregistre le couple access/refresh token. */
export function setTokens(accessToken: string, refreshToken?: string) {
  if (typeof window === "undefined") return;
  writeToken(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) writeToken(REFRESH_TOKEN_KEY, refreshToken);
}

function getRefreshToken(): string | null {
  return readToken(REFRESH_TOKEN_KEY);
}

export function clearToken() {
  dropToken(ACCESS_TOKEN_KEY);
  dropToken(REFRESH_TOKEN_KEY);
}

/** Lecture du token courant, partagée avec AuthProvider. */
export function getTokenValue(): string | null {
  return getToken();
}

/**
 * Timeout par requête. Sans cela, une requête bloquée en amont (le reverse proxy
 * tient les connexions jusqu'à 3600 s) laisse le `Promise.all` des pages en
 * attente indéfiniment : l'écran reste figé sur le squelette de chargement.
 */
const DEFAULT_TIMEOUT_MS = 20_000;

/** Nombre de nouvel essais pour les requêtes idempotentes (GET/HEAD). */
const MAX_RETRIES = 2;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchOnce(
  method: string,
  path: string,
  body: unknown,
  timeoutMs: number,
): Promise<Response> {
  const token = getToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const opts: RequestInit = {
    method,
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  try {
    return await fetch(`${BASE}${path}`, opts);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Rafraîchit l'access token à partir du refresh token.
 *
 * Volontairement « single-flight » : au chargement d'une page, une dizaine de
 * composants (dont deux providers) appellent l'API en parallèle. Sans ce garde,
 * un access token expiré déclencherait une dizaine de POST /auth/refresh
 * simultanés — amplifiant la charge et Station sur un 429, ce qui se traduit
 * par une déconnexion alors que le refresh était valide.
 */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });
      if (!res.ok) return false;
      const tokens = (await res.json()) as {
        accessToken: string;
        refreshToken?: string;
      };
      if (!tokens?.accessToken) return false;
      setTokens(tokens.accessToken, tokens.refreshToken ?? refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  // Un POST n'est pas rejouable : le rejouer pourrait dupliquer une écriture.
  const canRetry = method === "GET" || method === "HEAD";
  let lastError: unknown;
  // Un seul passage par le refresh par requête, pour éviter une boucle.
  let refreshed = false;

  for (let attempt = 0; attempt <= (canRetry ? MAX_RETRIES : 0); attempt++) {
    if (attempt > 0) await sleep(300 * 2 ** (attempt - 1));

    let res: Response;
    try {
      res = await fetchOnce(method, path, body, DEFAULT_TIMEOUT_MS);
    } catch (err) {
      lastError =
        err instanceof Error && err.name === "AbortError"
          ? new Error(`Délai dépassé (${DEFAULT_TIMEOUT_MS / 1000}s) — ${method} ${path}`)
          : err;
      // Coupure réseau ou timeout : rejouable si la requête est idempotente.
      if (attempt < MAX_RETRIES && canRetry) continue;
      throw lastError;
    }

    if (res.status === 401) {
      // Un 401 isolé ne doit pas fermer la session : c'est ce comportement qui
      // causait la boucle logout/relogin. On tente un refresh, puis on rejoue.
      if (!refreshed && (await refreshAccessToken())) {
        refreshed = true;
        if (canRetry) {
          // On rend une tentative au budget : le refresh a résolu le problème.
          // `continue` va réincrémenter `attempt`, d'où le décrément.
          attempt -= 1
          continue
        }
      }
      if (!refreshed) {
        // Session réellement morte : on ne purge que si aucun refresh n'était
        // disponible, sinon on aurait laissé un onglet valide se déconnecter.
        clearToken()
        throw new Error("Session expirée — reconnectez-vous.")
      }
      throw new Error("Non authentifié")
    }

    if (res.status === 204) return undefined as T;

    if (!res.ok) {
      // 429 / 408 / 5xx : transitoires, on rejoue. Les autres sont définitives.
      const transient = res.status === 429 || res.status === 408 || res.status >= 500;
      if (!transient || !canRetry) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(
          (err as { message?: string }).message ?? `HTTP ${res.status}`,
        );
      }
      lastError = new Error(`HTTP ${res.status}`);
      continue;
    }

    return res.json() as Promise<T>;
  }

  throw lastError instanceof Error ? lastError : new Error("Échec de la requête");
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; refreshToken: string }>("POST", "/auth/login/admin", {
      email,
      password,
    }),
  me: () =>
    request<{
      id: string;
      email: string;
      roles: string[];
      permissions: string[];
    }>("GET", "/auth/me"),
};

// ── Admin Tenants ─────────────────────────────────────────────────────────────

export interface TenantStats {
  tenant: Tenant
  counts: {
    sites: number
    sites_actifs: number
    users: number
    users_actifs: number
    postes: number
  }
  usage: {
    sites_pct: number
    users_pct: number
  }
  recent_activity: AuditLog[]
}

export interface DashboardStats {
  tenants_total: number
  tenants_actifs: number
  tenants_par_plan: Record<string, number>
  users_total: number
  sites_total: number
  mrr_estime_cents: number
  nouveaux_tenants_30j: number
  recent_signups: Tenant[]
  recent_audit: AuditLog[]
  alerts: {
    tenant_inactive: number
  }
}

export const adminTenants = {
  list: () => request<Tenant[]>("GET", "/admin/tenants"),
  get: (id: string) => request<Tenant>("GET", `/admin/tenants/${id}`),
  create: (dto: CreateTenantDto) =>
    request<Tenant>("POST", "/admin/tenants", dto),
  update: (id: string, dto: Partial<CreateTenantDto>) =>
    request<Tenant>("PATCH", `/admin/tenants/${id}`, dto),
  delete: (id: string) =>
    request<void>("DELETE", `/admin/tenants/${id}`),
  getStats: (id: string) =>
    request<TenantStats>(`GET`, `/admin/tenants/${id}/stats`),
  getDashboardStats: () =>
    request<DashboardStats>("GET", "/admin/dashboard/stats"),
  getTenantUsers: (tenantId: string) =>
    request<AdminUser[]>("GET", `/admin/tenants/${tenantId}/users`),
}

// ── Sites ─────────────────────────────────────────────────────────────────────

export interface Site {
  id: string
  tenant_id: string
  nom: string
  adresse: string | null
  ville: string | null
  code_postal: string | null
  telephone: string | null
  jour_ouverture: number
  jour_fermeture: number
  actif: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateSiteDto {
  nom: string
  adresse?: string
  ville?: string
  code_postal?: string
  telephone?: string
  jour_ouverture?: number
  jour_fermeture?: number
}

export const sites = {
  list: (tenantId: string) =>
    request<Site[]>("GET", `/admin/tenants/${tenantId}/sites`),
  get: (id: string) => request<Site>("GET", `/sites/${id}`),
  create: (tenantId: string, dto: CreateSiteDto) =>
    request<Site>("POST", `/admin/tenants/${tenantId}/sites`, dto),
  update: (id: string, dto: Partial<CreateSiteDto>) =>
    request<Site>("PATCH", `/sites/${id}`, dto),
  delete: (id: string) =>
    request<void>("DELETE", `/sites/${id}`),
}

// ── Users (admin) ─────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string
  email: string
  prenom: string | null
  nom: string | null
  avatar_url: string | null
  actif: boolean
  createdAt: string
  updatedAt: string
  tenants: Array<{
    tenant_id: string
    role_id: string
    role_code: string
    role_label: string
  }>
  sites: string[]
}

export interface CreateUserDto {
  email: string
  password: string
  prenom?: string
  nom?: string
  actif?: boolean
}

export interface CreateUserWithTenantDto extends CreateUserDto {
  tenant_id: string
  role_id: string
}

export const adminUsers = {
  list: () => request<AdminUser[]>("GET", "/admin/users"),
  get: (id: string) => request<AdminUser>(`GET`, `/admin/users/${id}`),
  create: (dto: CreateUserDto) =>
    request<AdminUser>("POST", "/admin/users", dto),
  createWithTenant: (dto: CreateUserWithTenantDto) =>
    request<AdminUser>("POST", "/admin/users/with-tenant", dto),
  update: (id: string, dto: Partial<CreateUserDto>) =>
    request<AdminUser>("PATCH", `/admin/users/${id}`, dto),
  delete: (id: string) =>
    request<void>("DELETE", `/admin/users/${id}`),
  /**
   * Upload l'avatar (base64). Meme endpoint que la console :
   * POST /admin/users/:id/avatar, permission USER_WRITE.
   */
  setAvatar: (
    id: string,
    payload: { data: string; filename: string; mimeType: string },
  ) =>
    request<{ avatar_url: string }>("POST", `/admin/users/${id}/avatar`, payload),
  /** Retire l'avatar — le PATCH standard suffit, avatar_url = null. */
  removeAvatar: (id: string) =>
    request<AdminUser>("PATCH", `/admin/users/${id}`, {
      avatar_url: null,
    } as Partial<CreateUserDto>),
  getUserSites: (userId: string) =>
    request<Site[]>("GET", `/admin/users/${userId}/sites/full`),
}

// ── Roles ─────────────────────────────────────────────────────────────────────

export interface Permission {
  id: string
  code: string
  label: string
  module: string
  action: string
}

export interface Role {
  id: string
  code: string
  label: string
  isSystem: boolean
  createdAt: string
  updatedAt: string
  permissions?: Permission[]
}

export const roles = {
  list: () => request<Role[]>("GET", "/admin/roles"),
  get: (id: string) => request<Role>(`GET`, `/admin/roles/${id}`),
  getPermissions: () => request<Permission[]>("GET", "/admin/roles/permissions"),
  create: (dto: { code: string; label: string }) =>
    request<Role>("POST", "/admin/roles", dto),
  update: (id: string, dto: { label?: string; permission_ids?: string[] }) =>
    request<Role>("PATCH", `/admin/roles/${id}`, dto),
}

// ── Plans ─────────────────────────────────────────────────────────────────────

export interface Plan {
  id: string
  code: string
  nom: string
  description: string | null
  prixMensuelCents: number
  prixAnnuelCents: number
  nbSitesMax: number
  nbUsersMax: number
  features: string[]
  actif: boolean
  createdAt: string
  updatedAt: string
}

export const plans = {
  list: () => request<Plan[]>("GET", "/admin/plans"),
  get: (id: string) => request<Plan>("GET", `/admin/plans/${id}`),
  create: (dto: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>) =>
    request<Plan>("POST", "/admin/plans", dto),
  update: (id: string, dto: Partial<Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>>) =>
    request<Plan>("PATCH", `/admin/plans/${id}`, dto),
  delete: (id: string) => request<void>("DELETE", `/admin/plans/${id}`),
}

// ── Subscriptions ───────────────────────────────────────────────────────────

export type SubscriptionStatut = 'active' | 'past_due' | 'canceled' | 'expired'
export type SubscriptionPeriode = 'monthly' | 'yearly'

export interface Subscription {
  id: string
  tenant_id: string
  plan_id: string
  plan?: Plan
  tenant?: { id: string; nom: string }
  statut: SubscriptionStatut
  periode: SubscriptionPeriode
  dateDebut: string
  dateFin: string
  renouvelleAuto: boolean
  prixCents: number
  createdAt: string
  updatedAt: string
}

export const subscriptions = {
  list: () => request<Subscription[]>("GET", "/admin/subscriptions"),
  listByTenant: (tenantId: string) =>
    request<Subscription[]>("GET", `/admin/subscriptions?tenantId=${tenantId}`),
  get: (id: string) => request<Subscription>("GET", `/admin/subscriptions/${id}`),
  create: (dto: { tenantId: string; planId: string; periode?: SubscriptionPeriode }) =>
    request<Subscription>("POST", "/admin/subscriptions", dto),
  cancel: (id: string) =>
    request<Subscription>("POST", `/admin/subscriptions/${id}/cancel`),
}

// ── Invoices ───────────────────────────────────────────────────────────────

export type InvoiceStatut = 'draft' | 'open' | 'paid' | 'past_due' | 'void' | 'uncollectible'

export interface Invoice {
  id: string
  tenant_id: string
  subscription_id: string | null
  tenant?: { id: string; nom: string }
  numero: string
  statut: InvoiceStatut
  montantCents: number
  devise: string
  dateEmission: string
  dateEcheance: string
  datePaiement: string | null
  pdfUrl: string | null
  createdAt: string
}

export const invoices = {
  list: (tenantId?: string, statut?: string) => {
    const params = new URLSearchParams()
    if (tenantId) params.set('tenantId', tenantId)
    if (statut) params.set('statut', statut)
    const qs = params.toString()
    return request<Invoice[]>("GET", `/admin/invoices${qs ? `?${qs}` : ''}`)
  },
  get: (id: string) => request<Invoice>("GET", `/admin/invoices/${id}`),
  updateStatus: (id: string, statut: string, datePaiement?: string) =>
    request<Invoice>("PATCH", `/admin/invoices/${id}`, { statut, datePaiement }),
  /**
   * Trigger async PDF generation for an invoice via Bull queue.
   */
  generatePdf: (id: string) =>
    request<{ message: string; invoiceId: string }>("POST", `/admin/invoices/${id}/generate-pdf`),
  /**
   * Get a time-limited presigned download URL for an invoice PDF.
   * Resolves the S3 key from the invoice's pdfUrl field.
   */
  downloadUrl: async (invoiceId: string): Promise<string> => {
    const inv = await request<Invoice>("GET", `/admin/invoices/${invoiceId}`)
    if (!inv.pdfUrl) throw new Error('PDF non disponible')
    // pdfUrl format: http://host/bucket/{key}
    const bucket = 'orpailleur-documents'
    const idx = inv.pdfUrl.indexOf(`/${bucket}/`)
    if (idx === -1) throw new Error('Format de lien PDF invalide')
    const key = inv.pdfUrl.slice(idx + bucket.length + 2)
    const result = await request<{ url: string }>("GET", `/admin/documents/presigned/${encodeURIComponent(key)}`)
    return result.url
  },
}

// ── Audit Logs ────────────────────────────────────────────────────────────────

export const auditLogs = {
  list: (params?: { limit?: number; offset?: number; action?: string; userId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    if (params?.action) qs.set("action", params.action);
    if (params?.userId) qs.set("userId", params.userId);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request<{ logs: AuditLog[]; total: number }>(
      "GET",
      `/admin/audit${query}`,
    );
  },
};

// ── Generic API client (used by AuthContext) ──────────────────────────────────

export const apiClient = {
  get:    <T>(path: string)                        => request<T>('GET',    path),
  post:   <T>(path: string, body?: unknown)        => request<T>('POST',   path, body),
  put:    <T>(path: string, body?: unknown)        => request<T>('PUT',    path, body),
  patch:  <T>(path: string, body?: unknown)        => request<T>('PATCH',  path, body),
  delete: <T>(path: string)                        => request<T>('DELETE', path),
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  nom: string;
  siret: string | null;
  siren: string | null;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  telephone: string | null;
  email: string | null;
  plan: string;
  nb_sites_max: number;
  nb_users_max: number;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantDto {
  nom: string;
  siret?: string;
  siren?: string;
  adresse?: string;
  ville?: string;
  code_postal?: string;
  email?: string;
  plan?: string;
  nb_sites_max?: number;
  nb_users_max?: number;
  actif?: boolean;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
