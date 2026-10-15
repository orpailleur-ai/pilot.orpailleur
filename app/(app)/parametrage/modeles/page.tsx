'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Check, Key, Pencil, Plus, Trash2 } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'
import { PageHeader } from '@/components/layout/page-header'
import { InlineError } from '@/components/ui/inline-error'
import { TableSkeleton } from '@/components/ui/table-skeleton'

/**
 * Configuration des modèles IA.
 *
 * ── Ce que cet écran ne montre jamais ───────────────────────────────────────
 *
 * Une clé API, ni en clair ni « début masqué ». Les quatre derniers
 * caractères seraient tentants, mais ils ne sont pas fiables : l'API ne les
 * calcule pas, et afficher un début qui n'existe pas ferait croire à une clé
 * vérifiable. Le masque `••••` suffit à distinguer deux configurations du
 * même fournisseur — à l'administrateur de reconnaître la sienne.
 *
 * ── Pourquoi « plusieurs modèles par périmètre » ────────────────────────────
 *
 * Basculer ne doit pas coûter la configuration précédente. Un administrateur
 * doit pouvoir passer à un modèle plus cher le temps d'un pic de factures,
 * puis revenir sans ressaisir le barème. D'où plusieurs lignes par périmètre,
 * une seule active.
 *
 * ── Pourquoi l'écran annonce l'absence de chiffrement ──────────────────────
 *
 * Sans `AI_CONFIG_MASTER_KEY`, l'API REFUSE d'enregistrer une clé en base —
 * elle ne dégrade pas en texte clair. C'est le bon comportement, mais un
 * administrateur qui l'ignore saisit une clé, clique, et découvre l'échec.
 * Le bandeau l'annonce avant la saisie, pas après.
 */

interface ScopeInfo {
  /** L'API ne renvoie QUE le code. Le libellé vit dans le dictionnaire du
   *  client : une description rédigée côté API resterait en français après
   *  bascule de langue, alors que les 49 autres libellés de l'écran suivent. */
  code: string
}

interface Modele {
  id: string
  scope: string
  provider: string
  model: string
  key_source: 'env' | 'db'
  env_var: string | null
  cle: string | null
  prix_entree_eur_par_m: number | null
  prix_sortie_eur_par_m: number | null
  actif: boolean
  updated_at: string
}

const FOURNISSEURS = ['mistral', 'openai', 'anthropic', 'litellm', 'ollama']

export default function ModelesPage() {
  const { t } = useI18n()
  const [scopes, setScopes] = useState<ScopeInfo[]>([])
  const [modeles, setModeles] = useState<Modele[]>([])
  const [chiffrement, setChiffrement] = useState(true)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [edition, setEdition] = useState<Partial<Modele> | null>(null)
  const [enregistrement, setEnregistrement] = useState(false)

  const charger = useCallback(async () => {
    setChargement(true)
    setErreur('')
    try {
      const s = await apiClient.get<{ scopes: ScopeInfo[]; chiffrement_disponible: boolean }>(
        '/admin/ai-modeles/scopes',
      )
      setScopes(s.scopes ?? [])
      setChiffrement(s.chiffrement_disponible)
      const m = await apiClient.get<{ modeles: Modele[] }>('/admin/ai-modeles')
      setModeles(m.modeles ?? [])
    } catch (e: unknown) {
      setErreur(e instanceof Error ? e.message : t('error'))
    } finally {
      setChargement(false)
    }
  }, [t])

  useEffect(() => {
    void charger()
  }, [charger])

  async function enregistrer(valeurs: Partial<Modele> & { api_key?: string }) {
    setEnregistrement(true)
    setErreur('')
    try {
      if (valeurs.id) {
        await apiClient.patch(`/admin/ai-modeles/${valeurs.id}`, valeurs)
      } else {
        await apiClient.post('/admin/ai-modeles', valeurs)
      }
      setEdition(null)
      await charger()
    } catch (e: unknown) {
      setErreur(e instanceof Error ? e.message : t('error'))
    } finally {
      setEnregistrement(false)
    }
  }

  async function basculer(m: Modele) {
    setErreur('')
    try {
      await apiClient.patch(`/admin/ai-modeles/${m.id}`, { actif: !m.actif })
      await charger()
    } catch (e: unknown) {
      setErreur(e instanceof Error ? e.message : t('error'))
    }
  }

  async function supprimer(m: Modele) {
    setErreur('')
    try {
      await apiClient.delete(`/admin/ai-modeles/${m.id}`)
      await charger()
    } catch (e: unknown) {
      setErreur(e instanceof Error ? e.message : t('error'))
    }
  }

  return (
    <>
      <PageHeader title={t('ai_models_title')} subtitle={t('ai_models_subtitle')} />

      {erreur && <InlineError message={erreur} />}

      {!chiffrement && (
        <div
          className="mb-4 flex items-start gap-3 rounded-lg border px-4 py-3"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
            borderColor: 'color-mix(in srgb, var(--color-warning) 35%, transparent)',
          }}
        >
          <AlertTriangle size={17} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: 2 }} />
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('ai_models_no_key')}
          </p>
        </div>
      )}

      {/* Formulaire de création / édition */}
      {edition ? (
        <Formulaire
          initial={edition}
          scopes={scopes}
          chiffrement={chiffrement}
          enregistrement={enregistrement}
          onCancel={() => setEdition(null)}
          onSubmit={enregistrer}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEdition({ key_source: 'env', provider: 'mistral' })}
          className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium"
          style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
        >
          <Plus size={15} />
          {t('ai_models_add')}
        </button>
      )}

      {chargement && modeles.length === 0 ? (
        <TableSkeleton rows={4} />
      ) : (
        <div className="flex flex-col gap-5">
          {scopes.map((scope) => {
            const lignes = modeles.filter((m) => m.scope === scope.code)
            const actif = lignes.find((m) => m.actif)
            return (
              <section key={scope.code}>
                <div className="mb-2 flex items-baseline gap-2">
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {scope.code}
                  </h2>
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {libellePerimetre(scope.code, t)}
                  </span>
                </div>
                {lignes.length === 0 ? (
                  <p
                    className="rounded-lg border px-3 py-2 text-xs"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    {(() => {
                      const defaut = defautDe(scope.code)
                      return defaut
                        ? t('ai_models_default_used', { model: defaut })
                        : t('ai_models_no_default')
                    })()}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {lignes.map((m) => (
                      <Ligne
                        key={m.id}
                        m={m}
                        onBasculer={() => basculer(m)}
                        onEditer={() => setEdition(m)}
                        onSupprimer={() => supprimer(m)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}

/**
 * Libellé d'un périmètre, traduit, avec repli sur le CODE.
 *
 * `t()` rend la CLE quand elle est absente du dictionnaire — le message
 *critique pour distinguer « pas encore traduit » de « traduit ». Un
 * périmètre ajouté à l'API sans libellé client affiche donc son code, technique
 * et lisible, plutôt que `ai_scope_foo` à l'écran ou une phrase française
 * dans une interface anglaise.
 */
function libellePerimetre(code: string, t: (k: string) => string): string {
  const cle = `ai_scope_${code}`
  const libelle = t(cle)
  return libelle === cle ? code : libelle
}

/**
 * Modèle employé quand rien n'est configuré.
 *
 * `null` pour les périmètres qui n'ont PAS de modèle par défaut. Ces modules
 * n'appellent aujourd'hui aucun modèle : afficher « utilisation de
 * mistral-small » affirmerait un comportement qui n'existe pas, et un
 * administrateur pourrait croire que le module est couvert alors qu'il ne
 * l'est pas.
 */
function defautDe(scope: string): string | null {
  const defauts: Record<string, string> = {
    ocr_vision: 'mistral-ocr-latest',
    ocr_reasoning: 'mistral-large',
    ocr_agent: 'mistral-small',
    import_recette: 'mistral-small',
    bot: 'mistral-small',
  }
  return defauts[scope] ?? null
}

function Ligne({
  m,
  onBasculer,
  onEditer,
  onSupprimer,
}: {
  m: Modele
  onBasculer: () => void
  onEditer: () => void
  onSupprimer: () => void
}) {
  const { t } = useI18n()
  const num = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 4 })
  return (
    <li
      className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5 text-sm"
      style={{
        borderColor: m.actif
          ? 'color-mix(in srgb, var(--color-success) 45%, transparent)'
          : 'var(--color-border)',
        backgroundColor: m.actif
          ? 'color-mix(in srgb, var(--color-success) 6%, transparent)'
          : 'var(--color-card)',
      }}
    >
      <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
        {m.model}
      </span>
      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {m.provider}
      </span>
      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        <Key size={12} />
        {m.key_source === 'db' ? m.cle ?? '••••' : m.env_var ?? '—'}
      </span>
      <span className="text-xs tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
        {/* `null` s'affiche « non tarifé » : un prix nul afficherait 0,00 € sur
            une période réellement facturée. */}
        {m.prix_entree_eur_par_m == null
          ? t('ai_models_unpriced')
          : `${num.format(m.prix_entree_eur_par_m ?? 0)} / ${
              m.prix_sortie_eur_par_m == null ? '—' : num.format(m.prix_sortie_eur_par_m)
            } € / M`}
      </span>
      <span className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={onBasculer}
          className="rounded px-2 py-1 text-xs font-medium"
          style={{
            color: m.actif ? 'var(--color-success)' : 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          {m.actif ? (
            <span className="inline-flex items-center gap-1">
              <Check size={12} />
              {t('ai_models_active')}
            </span>
          ) : (
            t('ai_models_activate')
          )}
        </button>
        <button
          type="button"
          onClick={onEditer}
          aria-label={t('edit')}
          className="rounded p-1"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={onSupprimer}
          aria-label={t('delete')}
          className="rounded p-1"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <Trash2 size={14} />
        </button>
      </span>
    </li>
  )
}

function Formulaire({
  initial,
  scopes,
  chiffrement,
  enregistrement,
  onCancel,
  onSubmit,
}: {
  initial: Partial<Modele>
  scopes: ScopeInfo[]
  chiffrement: boolean
  enregistrement: boolean
  onCancel: () => void
  onSubmit: (v: Record<string, unknown>) => void
}) {
  const { t } = useI18n()
  const [v, setV] = useState<Record<string, unknown>>({
    scope: initial.scope ?? scopes[0]?.code ?? '',
    provider: initial.provider ?? 'mistral',
    model: initial.model ?? '',
    key_source: initial.key_source ?? 'env',
    env_var: initial.env_var ?? 'MISTRAL_API_KEY',
    api_key: '',
    prix_entree_eur_par_m: initial.prix_entree_eur_par_m ?? '',
    prix_sortie_eur_par_m: initial.prix_sortie_eur_par_m ?? '',
    actif: initial.actif ?? true,
  })
  const set = (k: string, val: unknown) => setV((p) => ({ ...p, [k]: val }))

  const prix = (x: unknown) => (x === '' || x == null ? null : Number(x))

  return (
    <form
      className="mb-4 flex flex-col gap-3 rounded-lg border p-4"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          id: initial.id,
          scope: v['scope'],
          provider: v['provider'],
          model: v['model'],
          key_source: v['key_source'],
          env_var: v['key_source'] === 'env' ? v['env_var'] : null,
          // Une clé vide ne doit pas être envoyée : elle viderait une clé
          // déjà enregistrée au lieu de la laisser en place.
          api_key: v['key_source'] === 'db' && v['api_key'] ? v['api_key'] : undefined,
          prix_entree_eur_par_m: prix(v['prix_entree_eur_par_m']),
          prix_sortie_eur_par_m: prix(v['prix_sortie_eur_par_m']),
          actif: v['actif'],
        })
      }}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Champ label={t('ai_models_scope')}>
          <select
            value={String(v['scope'])}
            disabled={Boolean(initial.id)}
            onChange={(e) => set('scope', e.target.value)}
            className="w-full rounded border px-2 py-1.5 text-sm"
            style={champStyle()}
          >
            {scopes.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} — {libellePerimetre(s.code, t)}
              </option>
            ))}
          </select>
        </Champ>

        <Champ label={t('ai_models_provider')}>
          <select
            value={String(v['provider'])}
            onChange={(e) => set('provider', e.target.value)}
            className="w-full rounded border px-2 py-1.5 text-sm"
            style={champStyle()}
          >
            {FOURNISSEURS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Champ>

        <Champ label={t('ai_models_model')}>
          <input
            value={String(v['model'])}
            onChange={(e) => set('model', e.target.value)}
            required
            placeholder="mistral-large"
            className="w-full rounded border px-2 py-1.5 text-sm"
            style={champStyle()}
          />
        </Champ>

        <Champ label={t('ai_models_key_source')}>
          <select
            value={String(v['key_source'])}
            onChange={(e) => set('key_source', e.target.value)}
            className="w-full rounded border px-2 py-1.5 text-sm"
            style={champStyle()}
          >
            <option value="env">{t('ai_models_key_env')}</option>
            <option value="db" disabled={!chiffrement}>
              {t('ai_models_key_db')}
            </option>
          </select>
        </Champ>

        {v['key_source'] === 'env' ? (
          <Champ label={t('ai_models_env_var')}>
            <input
              value={String(v['env_var'] ?? '')}
              onChange={(e) => set('env_var', e.target.value)}
              required
              className="w-full rounded border px-2 py-1.5 text-sm"
              style={champStyle()}
            />
          </Champ>
        ) : (
          <Champ label={t('ai_models_api_key')}>
            <input
              type="password"
              autoComplete="new-password"
              value={String(v['api_key'] ?? '')}
              onChange={(e) => set('api_key', e.target.value)}
              required={!initial.id}
              placeholder={initial.id ? t('ai_models_key_unchanged') : 'sk-…'}
              className="w-full rounded border px-2 py-1.5 text-sm"
              style={champStyle()}
            />
          </Champ>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Champ label={t('ai_models_price_in')}>
            <input
              type="number"
              step="0.01"
              min="0"
              value={String(v['prix_entree_eur_par_m'] ?? '')}
              onChange={(e) => set('prix_entree_eur_par_m', e.target.value)}
              placeholder={t('ai_models_unpriced')}
              className="w-full rounded border px-2 py-1.5 text-sm"
              style={champStyle()}
            />
          </Champ>
          <Champ label={t('ai_models_price_out')}>
            <input
              type="number"
              step="0.01"
              min="0"
              value={String(v['prix_sortie_eur_par_m'] ?? '')}
              onChange={(e) => set('prix_sortie_eur_par_m', e.target.value)}
              placeholder={t('ai_models_unpriced')}
              className="w-full rounded border px-2 py-1.5 text-sm"
              style={champStyle()}
            />
          </Champ>
        </div>
      </div>

      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {t('ai_models_price_hint')}
      </p>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border px-3 py-1.5 text-sm"
          style={champStyle()}
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={enregistrement}
          className="rounded-lg px-3 py-1.5 text-sm font-medium"
          style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
        >
          {enregistrement ? t('loading') : t('save')}
        </button>
      </div>
    </form>
  )
}

function champStyle() {
  return {
    backgroundColor: 'var(--color-card)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  } as React.CSSProperties
}

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </span>
      {children}
    </label>
  )
}