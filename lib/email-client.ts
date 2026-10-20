/**
 * Client API pour les emails admin (pilot scope).
 * Routes /admin/email/* avec JWT super_admin.
 */

import { apiClient } from '@/lib/api-client'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SmtpConfig {
  exists: boolean
  host?: string
  port?: number
  secure?: boolean
  username?: string | null
  fromEmail?: string
  fromName?: string | null
  replyTo?: string | null
  timeoutMs?: number
  actif?: boolean
  updatedAt?: string
  /** Mot de passe jamais exposé par l'API */
  password?: never
}

/**
 * Un scope de template, tel que renvoye par la liste admin.
 *
 * La liste ne depend PAS des lignes enregistrees : elle contient un entree
 * par scope du registre, configure ou non. `exists` dit si un template a
 * deja ete enregistre pour ce scope.
 *
 * `bodyHtml` n'y figure pas : la liste ne l'affiche pas, et le corps peut
 * peser plusieurs kilo-octets.
 */
export interface EmailTemplate {
  scope: string
  /** Libelle du scope, depuis le registre. */
  label: string
  labelEn: string
  /** Un template existe deja pour ce scope. */
  exists: boolean
  name: string
  subject: string
  actif: boolean
  updatedAt: string | null
}

/** Detail d'un scope : le template enregistre, ou la definition du registre. */
export interface EmailTemplateDetail {
  exists: boolean
  scope: string
  /** Definition du scope : variables Handlebars, libelles. Toujours presente. */
  scopeDef: {
    scope: string
    label: string
    labelEn: string
    variables: EmailTemplateVariable[]
  }
  name: string
  subject: string
  bodyHtml: string
  actif: boolean
  updatedAt: string | null
  updatedBy: string | null
}

export interface EmailTemplateVariable {
  name: string
  label: string
  labelEn: string
  required?: boolean
  type?: 'string' | 'array' | 'date' | 'eur' | 'html'
}

export interface EmailStatsRow {
  tenant_id: string
  scope: string
  jour: string
  sent_count: number
  failed_count: number
  pending_count: number
  total_count: number
  avg_smtp_ms: number | null
  last_sent_at: string | null
}

export interface TenantRef {
  id: string
  nom: string
}

// ── SMTP Config ───────────────────────────────────────────────────────────────

export async function getSmtpConfigAdmin(): Promise<{ exists: boolean; host?: string; port?: number; secure?: boolean; username?: string | null; fromEmail?: string; fromName?: string | null; replyTo?: string | null; timeoutMs?: number; actif?: boolean; updatedAt?: string }> {
  return apiClient.get('/admin/email/smtp/config')
}

export async function upsertSmtpConfigAdmin(data: {
  host: string
  port: number
  secure: boolean
  username?: string | null
  password?: string
  fromEmail: string
  fromName?: string | null
  replyTo?: string | null
  timeoutMs?: number
}): Promise<{ ok: boolean; host: string; port: number; fromEmail: string }> {
  return apiClient.put('/admin/email/smtp/config', data)
}

export async function testSmtpConfig(toEmail: string): Promise<{ ok: boolean; messageId: string; error?: string }> {
  return apiClient.post('/admin/email/smtp/test', { to: toEmail })
}

// ── Email Templates ──────────────────────────────────────────────────────────

export async function listEmailTemplatesAdmin(): Promise<EmailTemplate[]> {
  return apiClient.get<EmailTemplate[]>('/admin/email/templates')
}

export async function getEmailTemplateAdmin(scope: string): Promise<EmailTemplateDetail> {
  return apiClient.get<EmailTemplateDetail>(`/admin/email/templates/${scope}`)
}

export async function upsertEmailTemplateAdmin(
  scope: string,
  data: { name: string; subject: string; bodyHtml: string; actif?: boolean },
): Promise<{ ok: boolean; scope: string }> {
  return apiClient.put(`/admin/email/templates/${scope}`, data)
}

// ── Stats ───────────────────────────────────────────────────────────────────

export async function getEmailStatsAdmin(opts?: {
  days?: number
  tenantId?: string
}): Promise<EmailStatsRow[]> {
  const params = new URLSearchParams()
  if (opts?.days) params.set('days', String(opts.days))
  if (opts?.tenantId) params.set('tenantId', opts.tenantId)
  const qs = params.toString()
  return apiClient.get(`/admin/email/stats${qs ? `?${qs}` : ''}`)
}

export async function refreshEmailStats(): Promise<{ ok: boolean }> {
  return apiClient.post('/admin/email/stats/refresh', {})
}

// ── Tenants (for stats filter) ───────────────────────────────────────────────

export async function listTenantsForStats(): Promise<TenantRef[]> {
  const { adminTenants } = await import('@/lib/api-client')
  const tenants = await adminTenants.list()
  return tenants.map((t) => ({ id: t.id, nom: t.nom }))
}
