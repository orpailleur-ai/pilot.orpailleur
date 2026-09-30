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
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
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

export const adminTenants = {
  list: () => request<Tenant[]>("GET", "/admin/tenants"),
  get: (id: string) => request<Tenant>("GET", `/admin/tenants/${id}`),
  create: (dto: CreateTenantDto) =>
    request<Tenant>("POST", "/admin/tenants", dto),
  update: (id: string, dto: Partial<CreateTenantDto>) =>
    request<Tenant>("PATCH", `/admin/tenants/${id}`, dto),
  delete: (id: string) =>
    request<void>("DELETE", `/admin/tenants/${id}`),
};

// ── Audit Logs ────────────────────────────────────────────────────────────────

export const auditLogs = {
  list: (params?: { limit?: number; offset?: number; action?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    if (params?.action) qs.set("action", params.action);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request<{ logs: AuditLog[]; total: number }>(
      "GET",
      `/admin/audit${query}`,
    );
  },
};

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
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
