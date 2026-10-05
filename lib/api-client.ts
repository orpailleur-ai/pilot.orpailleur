/**
 * Pilot API Client — calls api.orpailleur with admin scope JWT.
 * Token stored in sessionStorage under 'pilot_token'.
 */

const BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3000/api/v1";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("pilot_token");
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("pilot_token", token);
  }
}

export function clearToken() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("pilot_token");
  }
}

export function getTokenValue() {
  return getToken();
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = getToken();
  const opts: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);

  if (res.status === 401) {
    clearToken();
    throw new Error("Non authentifié");
  }

  if (res.status === 204) return undefined as T;

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(
      (err as { message?: string }).message ?? `HTTP ${res.status}`,
    );
  }
  return res.json() as Promise<T>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  login: (email: string, password: string) =>
    request<{ accessToken: string }>("POST", "/auth/login/admin", {
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
