'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, CreditCard, Users, CheckCircle2 } from 'lucide-react'
import { Button, useToast } from '@astryxdesign/core'
import { TextInput } from '@astryxdesign/core'
import { ModalWizard, type WizardStep } from '@/components/ui/modal/modal-wizard'
import { FieldGrid } from '@/components/ui/modal/modal'
import {
  adminTenants,
  plans,
  roles,
  subscriptions,
  adminUsers,
  type Plan,
  type Role,
  type CreateUserWithTenantDto,
} from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'
import { Spinner } from '@/components/ui/spinner'
import { InlineError } from '@/components/ui/inline-error'

// ── Types ────────────────────────────────────────────────────────────────────

interface IdentityStep {
  nom: string
  siret: string
  email: string
  adresse: string
  ville: string
  code_postal: string
}

interface PlanStep {
  planId: string
  periode: 'monthly' | 'yearly'
}

interface UserStep {
  email: string
  nom: string
  password: string
  roleId: string
}

const STEP_IDS = ['identity', 'plan', 'user', 'summary'] as const

const DEFAULT_IDENTITY: IdentityStep = {
  nom: '',
  siret: '',
  email: '',
  adresse: '',
  ville: '',
  code_postal: '',
}

const DEFAULT_PLAN: PlanStep = {
  planId: '',
  periode: 'monthly',
}

const DEFAULT_USER: UserStep = {
  email: '',
  nom: '',
  password: '',
  roleId: '',
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}

// ── Orchestration avec rollback ─────────────────────────────────────────────

async function onboardTenant(
  identity: IdentityStep,
  plan: PlanStep,
  user: UserStep,
): Promise<{ tenantId: string }> {
  // 1. Créer le tenant
  const tenant = await adminTenants.create({
    nom: identity.nom,
    siret: identity.siret || undefined,
    email: identity.email || undefined,
    adresse: identity.adresse || undefined,
    ville: identity.ville || undefined,
    code_postal: identity.code_postal || undefined,
    plan: 'starter', // plan sera set par la subscription
    nb_sites_max: 5,
    nb_users_max: 20,
    actif: true,
  })

  let subscriptionId: string | null = null
  let userId: string | null = null

  try {
    // 2. Créer la subscription
    const sub = await subscriptions.create({
      tenantId: tenant.id,
      planId: plan.planId,
      periode: plan.periode,
    })
    subscriptionId = sub.id

    // 3. Créer l'utilisateur avec affectation au tenant
    const newUser: CreateUserWithTenantDto = {
      email: user.email,
      password: user.password,
      nom: user.nom || undefined,
      tenant_id: tenant.id,
      role_id: user.roleId,
    }
    const createdUser = await adminUsers.createWithTenant(newUser)
    userId = createdUser.id

    return { tenantId: tenant.id }
  } catch (err) {
    // Rollback best-effort
    if (userId) {
      await adminUsers.delete(userId).catch(() => {})
    }
    if (subscriptionId) {
      await subscriptions.cancel(subscriptionId).catch(() => {})
    }
    await adminTenants.delete(tenant.id).catch(() => {})
    throw err
  }
}

// ── Step components ─────────────────────────────────────────────────────────

function IdentityStepForm({
  data,
  onChange,
}: {
  data: IdentityStep
  onChange: (d: IdentityStep) => void
}) {
  const { t } = useI18n()
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
          {t('tenant_info')}
        </h3>
        <FieldGrid columns={2}>
          <TextInput
            label={t('bakery_name')}
            value={data.nom}
            onChange={(v) => onChange({ ...data, nom: v })}
            placeholder="La Mie Câline — Toulouse"
            width="100%"
            isRequired
          />
          <TextInput
            label={t('tenant_siret')}
            value={data.siret}
            onChange={(v) => onChange({ ...data, siret: v })}
            placeholder="123 456 789 00012"
            width="100%"
          />
          <TextInput
            label={t('contact_email')}
            type="email"
            value={data.email}
            onChange={(v) => onChange({ ...data, email: v })}
            placeholder="contact@lamiecacaline.fr"
            width="100%"
          />
          <TextInput
            label={t('city')}
            value={data.ville}
            onChange={(v) => onChange({ ...data, ville: v })}
            placeholder="Toulouse"
            width="100%"
          />
          <TextInput
            label={t('postal_code')}
            value={data.code_postal}
            onChange={(v) => onChange({ ...data, code_postal: v })}
            placeholder="31000"
            width="100%"
          />
          <TextInput
            label={t('address')}
            value={data.adresse}
            onChange={(v) => onChange({ ...data, adresse: v })}
            placeholder="12 rue du Pain"
            width="100%"
          />
        </FieldGrid>
      </div>
    </div>
  )
}

function PlanStepForm({
  data,
  onChange,
  plans,
  loading,
}: {
  data: PlanStep
  onChange: (d: PlanStep) => void
  plans: Plan[]
  loading: boolean
}) {
  const { t } = useI18n()

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size={6} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
          {t('plan_selection')}
        </h3>
        <div className="space-y-3">
          {plans.map((plan) => {
            const price = data.periode === 'monthly'
              ? plan.prixMensuelCents
              : plan.prixAnnuelCents
            const isSelected = data.planId === plan.id
            const periodLabel = data.periode === 'monthly' ? t('per_month') : t('per_year')
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => onChange({ ...data, planId: plan.id })}
                className="w-full flex items-start gap-4 rounded-xl border p-4 text-left transition-all"
                style={{
                  borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                  backgroundColor: isSelected
                    ? 'color-mix(in srgb, var(--color-accent) 6%, var(--color-card))'
                    : 'var(--color-card)',
                  boxShadow: isSelected ? '0 0 0 2px var(--color-accent)' : 'none',
                }}
              >
                <div
                  className="w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center"
                  style={{
                    borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                    backgroundColor: isSelected ? 'var(--color-accent)' : 'transparent',
                  }}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="font-semibold text-sm"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {plan.nom}
                    </span>
                    <span
                      className="text-sm font-bold flex-shrink-0"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      {formatPrice(price)}{periodLabel}
                    </span>
                  </div>
                  {plan.description && (
                    <p
                      className="text-xs mt-1"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {plan.description}
                    </p>
                  )}
                  <div className="flex gap-3 mt-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    <span>{t('sites_count', { n: plan.nbSitesMax })}</span>
                    <span>·</span>
                    <span>{t('users_count', { n: plan.nbUsersMax })}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
          {t('billing_period')}
        </h3>
        <div className="flex gap-3">
          {(['monthly', 'yearly'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange({ ...data, periode: p })}
              className="flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all"
              style={{
                borderColor: data.periode === p ? 'var(--color-accent)' : 'var(--color-border)',
                backgroundColor: data.periode === p
                  ? 'color-mix(in srgb, var(--color-accent) 8%, var(--color-card))'
                  : 'var(--color-card)',
                color: data.periode === p ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              }}
            >
              {p === 'monthly' ? t('monthly') : t('yearly')}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function UserStepForm({
  data,
  onChange,
  roles,
  loading,
}: {
  data: UserStep
  onChange: (d: UserStep) => void
  roles: Role[]
  loading: boolean
}) {
  const { t } = useI18n()
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
          {t('admin_initial_title')}
        </h3>
        <FieldGrid columns={2}>
          <TextInput
            label={t('full_name')}
            value={data.nom}
            onChange={(v) => onChange({ ...data, nom: v })}
            placeholder="Marie Dupont"
            width="100%"
          />
          <TextInput
            label={t('email_required')}
            type="email"
            value={data.email}
            onChange={(v) => onChange({ ...data, email: v })}
            placeholder="marie@example.com"
            width="100%"
            isRequired
          />
          <TextInput
            label={t('password_required')}
            type="password"
            value={data.password}
            onChange={(v) => onChange({ ...data, password: v })}
            placeholder={t('password_min')}
            width="100%"
            isRequired
          />
          {loading ? (
            <div className="col-span-2 flex items-center gap-2 py-2">
              <Spinner size={4} />
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {t('roles_loading')}
              </span>
            </div>
          ) : (
            <div className="col-span-2">
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t('role_label')}
              </label>
              <select
                value={data.roleId}
                onChange={(e) => onChange({ ...data, roleId: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{
                  backgroundColor: 'var(--color-background-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <option value="">{t('role_select')}</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label ?? r.code}
                  </option>
                ))}
              </select>
            </div>
          )}
        </FieldGrid>
      </div>

      <div
        className="rounded-lg border p-4 text-xs"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-accent) 6%, transparent)',
          borderColor: 'color-mix(in srgb, var(--color-accent) 20%, transparent)',
          color: 'var(--color-text-secondary)',
        }}
      >
        {t('admin_warning')}
      </div>
    </div>
  )
}

function SummaryStep({
  identity,
  plan,
  user,
  plans,
}: {
  identity: IdentityStep
  plan: PlanStep
  user: UserStep
  plans: Plan[]
}) {
  const { t } = useI18n()
  const selectedPlan = plans.find((p) => p.id === plan.planId)
  const price = selectedPlan
    ? plan.periode === 'monthly'
      ? selectedPlan.prixMensuelCents
      : selectedPlan.prixAnnuelCents
    : 0
  const periodLabel = plan.periode === 'monthly' ? t('per_month') : t('per_year')

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
          {t('onboarding_summary')}
        </h3>
        <div className="space-y-3">
          <SummaryRow icon={<Building2 size={14} />} label={t('bakery_name').replace(' *', '')} value={identity.nom || '—'} />
          {identity.siret && <SummaryRow icon={<Building2 size={14} />} label={t('tenant_siret')} value={identity.siret} />}
          {identity.ville && <SummaryRow icon={<Building2 size={14} />} label={t('city')} value={identity.ville} />}
          <div className="border-t" style={{ borderColor: 'var(--color-border)' }} />
          <SummaryRow
            icon={<CreditCard size={14} />}
            label={t('plan')}
            value={selectedPlan ? `${selectedPlan.nom} — ${formatPrice(price)}${periodLabel}` : '—'}
          />
          <div className="border-t" style={{ borderColor: 'var(--color-border)' }} />
          <SummaryRow icon={<Users size={14} />} label={t('admin_initial')} value={user.nom || user.email} />
          <SummaryRow icon={<Users size={14} />} label={t('contact_email')} value={user.email} />
        </div>
      </div>

      <div
        className="rounded-lg border border-border p-4 text-xs"
        style={{
          backgroundColor: 'var(--color-background-surface)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <p>{t('tenant_irreversible')}</p>
      </div>
    </div>
  )
}

function SummaryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span style={{ color: 'var(--color-text-secondary)' }}>{icon}</span>
      <span className="text-xs w-24 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </span>
      <span className="text-sm font-medium flex-1" style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </span>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function NewTenantPage() {
  const router = useRouter()
  const toast = useToast()
  const { t } = useI18n()

  const steps: WizardStep[] = [
    { id: 'identity', label: t('identity') },
    { id: 'plan',     label: t('plan') },
    { id: 'user',     label: t('admin_initial') },
    { id: 'summary',  label: t('summary') },
  ]

  const [currentStep, setCurrentStep] = useState(0)
  const [identity, setIdentity] = useState<IdentityStep>(DEFAULT_IDENTITY)
  const [planStep, setPlanStep] = useState<PlanStep>(DEFAULT_PLAN)
  const [userStep, setUserStep] = useState<UserStep>(DEFAULT_USER)

  const [plansList, setPlansList] = useState<Plan[]>([])
  const [rolesList, setRolesList] = useState<Role[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([plans.list(), roles.list()])
      .then(([p, r]) => {
        setPlansList(p)
        // Exclure super_admin (rôle platform, pas tenant)
        const tenantRoles = r.filter((role) => role.code !== 'super_admin')
        setRolesList(tenantRoles)
        // Auto-sélectionner le premier plan
        if (p.length > 0) {
          setPlanStep((prev) => ({ ...prev, planId: p[0].id }))
        }
        // Auto-sélectionner le premier rôle (le plus privilégié)
        if (tenantRoles.length > 0) {
          setUserStep((prev) => ({ ...prev, roleId: tenantRoles[0].id }))
        }
      })
      .catch((err) => toast({ body: err instanceof Error ? err.message : t('error'), type: 'error' }))
      .finally(() => setLoadingMeta(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canAdvance = (() => {
    if (currentStep === 0) return !!identity.nom.trim()
    if (currentStep === 1) return !!planStep.planId
    if (currentStep === 2) return !!userStep.email.trim() && !!userStep.password && userStep.password.length >= 8 && !!userStep.roleId
    return true
  })()

  async function handleFinish() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const { tenantId } = await onboardTenant(identity, planStep, userStep)
      toast({ body: t('tenant_created'), type: 'info' })
      router.push(`/tenants/${tenantId}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('error')
      setSubmitError(msg)
      toast({ body: msg, type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <ModalWizard
        steps={steps}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        onFinish={handleFinish}
        isLoading={submitting}
        canAdvance={canAdvance}
        finishLabel={t('create_tenant')}
        nextLabel={t('next')}
        backLabel={t('back')}
      >
        {currentStep === 0 && (
          <IdentityStepForm data={identity} onChange={setIdentity} />
        )}
        {currentStep === 1 && (
          <PlanStepForm
            data={planStep}
            onChange={setPlanStep}
            plans={plansList}
            loading={loadingMeta}
          />
        )}
        {currentStep === 2 && (
          <UserStepForm
            data={userStep}
            onChange={setUserStep}
            roles={rolesList}
            loading={loadingMeta}
          />
        )}
        {currentStep === 3 && (
          <>
            {submitError && (
              <div className="mb-4">
                <InlineError message={submitError} />
              </div>
            )}
            <SummaryStep
              identity={identity}
              plan={planStep}
              user={userStep}
              plans={plansList}
            />
          </>
        )}
      </ModalWizard>
    </div>
  )
}
