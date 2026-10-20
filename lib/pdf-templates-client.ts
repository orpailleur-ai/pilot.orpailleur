/**
 * Client API pour les templates PDF admin (pilot scope).
 * Routes /admin/pdf-templates/* avec JWT super_admin/platform_admin.
 */

import { apiClient } from '@/lib/api-client'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PdfScope {
  scope: string
  label: string
  total: number
  hasActive: boolean
}

export interface PdfScopeMeta {
  scope: string
  label: string
  variables: Array<{ name: string; label: string; group?: string }>
  defaultBody: string
}

export interface TenantRef {
  id: string
  nom: string
}

export interface PdfTemplateInstance {
  id: string
  tenantId: string | null
  tenant?: TenantRef | null
  scope: string
  name: string
  body: string
  actif: boolean
  createdBy?: string | null
  updatedBy?: string | null
  createdAt: string
  updatedAt: string
}

// ── Scopes ───────────────────────────────────────────────────────────────────

export async function listScopesAdmin(): Promise<PdfScope[]> {
  return apiClient.get<PdfScope[]>('/admin/pdf-templates/scopes')
}

// ── Instances ────────────────────────────────────────────────────────────────

/**
 * Liste toutes les instances (globaux + par tenant).
 * Filtres optionnels : scope, tenantId, globalOnly.
 */
export async function listInstancesAdmin(opts?: {
  scope?: string
  tenantId?: string
  globalOnly?: boolean
}): Promise<PdfTemplateInstance[]> {
  const params = new URLSearchParams()
  if (opts?.scope) params.set('scope', opts.scope)
  if (opts?.tenantId) params.set('tenantId', opts.tenantId)
  if (opts?.globalOnly) params.set('globalOnly', 'true')
  const qs = params.toString()
  return apiClient.get<PdfTemplateInstance[]>(`/admin/pdf-templates/instances${qs ? `?${qs}` : ''}`)
}

export async function getInstanceAdmin(id: string): Promise<PdfTemplateInstance> {
  return apiClient.get<PdfTemplateInstance>(`/admin/pdf-templates/instances/${id}`)
}

export async function createGlobalTemplate(data: {
  scope: string
  name: string
  body?: string
  actif?: boolean
}): Promise<PdfTemplateInstance> {
  return apiClient.post<PdfTemplateInstance>('/admin/pdf-templates/instances', data)
}

export async function updateGlobalTemplate(
  id: string,
  data: { name?: string; body?: string; actif?: boolean },
): Promise<PdfTemplateInstance> {
  return apiClient.patch<PdfTemplateInstance>(`/admin/pdf-templates/instances/${id}`, data)
}

export async function deleteGlobalTemplate(id: string): Promise<void> {
  return apiClient.delete(`/admin/pdf-templates/instances/${id}`)
}

export async function previewTemplateAdmin(
  id: string,
  body?: string,
  tenantId?: string | null,
): Promise<{ url: string; key: string }> {
  // `tenantId` : le tenant dont les donnees REELLES (nom, adresse, logo)
  // doivent apparaitre dans l'apercu. Sans lui, l'apercu montre une
  // boulangerie fictive.
  return apiClient.post<{ url: string; key: string }>(
    `/admin/pdf-templates/instances/${id}/preview`,
    {
      ...(body !== undefined ? { body } : {}),
      ...(tenantId ? { tenantId } : {}),
    },
  )
}
