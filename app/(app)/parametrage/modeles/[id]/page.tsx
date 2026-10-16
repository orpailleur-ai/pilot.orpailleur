'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check, History, TrendingUp } from 'lucide-react'
import { Button, Spinner } from '@astryxdesign/core'
import { apiClient } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'
import { libelleDetail, libelleScope } from '@/lib/i18n/scopes'
import { InlineError } from '@/components/ui/inline-error'

/** Reprend la forme de `Modele` dans la page liste — les deux doivent évoluer ensemble. */
interface Modele {
  id: string
  scope: string
  provider: string
  model: string
  env_var: string | null
  cle: string | null
  prix_entree_eur_par_m: number | null
  prix_sortie_eur_par_m: number | null
  tarif_base: 'jetons' | 'pages' | null
  prix_page_eur: number | null
  taux_usd_eur: number | null
  tarif_maj_le: string | null
  actif: boolean
  updated_at: string
}

interface Stats {
  total: { appels: number; jetons_entree: number; jetons_sortie: number; cout_eur: number }
  recent_30j: { appels: number; jetons_entree: number; jetons_sortie: number; cout_eur: number }
  serie_30j: Array<{
    jour: string
    appels: number
    jetons_entree: number
    jetons_sortie: number
    cout_eur: number
  }>
}

interface Entree {
  id: string
  action: string
  champ: string | null
  ancienne_valeur: string | null
  nouvelle_valeur: string | null
  changed_by: string | null
  created_at: string
}

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const nombre = new Intl.NumberFormat('fr-FR')

export default function ModeleDetailPage() {
  const { t } = useI18n()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [modele, setModele] = useState<Modele | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [historique, setHistorique] = useState<Entree[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

  const charger = useCallback(async () => {
    setChargement(true)
    setErreur('')
    try {
      // La liste d'abord : c'est la seule source du type `Modele`. La route
      // `/:id` n'existe pas côté API, et le détail ne doit pas devenir un
      // second endroit où la forme du modèle est décrite.
      const { modeles } = await apiClient.get<{ modeles: Modele[] }>('/admin/ai-modeles')
      const trouve = modeles.find((m) => m.id === id) ?? null
      if (!trouve) {
        setErreur(t('ai_models_detail_notfound'))
        return
      }
      setModele(trouve)
      // Détail informatif : un échec stats/historique ne doit pas masquer la
      // configuration, qui reste consultable.
      const [s, h] = await Promise.all([
        apiClient.get<Stats>(`/admin/ai-modeles/${id}/stats`).catch(() => null),
        apiClient
          .get<{ historique: Entree[] }>(`/admin/ai-modeles/${id}/historique`)
          .catch(() => ({ historique: [] as Entree[] })),
      ])
      setStats(s)
      setHistorique(h.historique ?? [])
    } catch (e: unknown) {
      setErreur(e instanceof Error ? e.message : t('error'))
    } finally {
      setChargement(false)
    }
  }, [id, t])

  useEffect(() => {
    void charger()
  }, [charger])

  // En-tête commun : retour + libellé du périmètre.
  const entete = (
    <div className="flex items-center gap-3">
      <Button
        variant="ghost"
        size="sm"
        isIconOnly
        label={t('back')}
        icon={<ArrowLeft size={16} />}
        onClick={() => router.push('/parametrage/modeles')}
      />
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {modele ? libelleScope(modele.scope, t) : t('ai_models_detail')}
        </h1>
        {modele && (
          <span
            className="font-mono text-xs rounded px-1.5 py-0.5"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
              color: 'var(--color-accent)',
            }}
          >
            {modele.scope}
          </span>
        )}
      </div>
    </div>
  )

  if (chargement) {
    return (
      <div className="flex flex-col gap-5">
        {entete}
        <div className="flex justify-center py-12">
          <Spinner size="md" aria-label={t('loading')} />
        </div>
      </div>
    )
  }

  if (!modele) {
    return (
      <div className="flex flex-col gap-5">
        {entete}
        <InlineError message={erreur || t('ai_models_detail_notfound')} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {entete}

      {/* ── Identité ── */}
      <section
        className="rounded-xl border p-5"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="mb-3 flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 text-xs font-medium"
            style={{ color: modele.actif ? 'var(--color-success)' : 'var(--color-text-secondary)' }}
          >
            {modele.actif && <Check size={12} />}
            {modele.actif ? t('ai_models_active') : t('ai_models_activate')}
          </span>
        </div>
        <p className="mb-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {libelleDetail(modele.scope, t)}
        </p>
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <Ligne libelle={t('ai_models_model')} valeur={modele.model} />
          <Ligne libelle={t('ai_models_provider')} valeur={modele.provider} />
          <Ligne
            libelle={t('ai_models_api_key')}
            valeur={modele.cle ?? modele.env_var ?? t('ai_models_key_db')}
          />
          <Ligne
            libelle={t('ai_models_updated_at')}
            valeur={new Date(modele.updated_at).toLocaleDateString('fr-FR')}
          />
        </dl>
      </section>

      {/* ── Tarif ── */}
      <section
        className="rounded-xl border p-5"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {t('ai_models_pricing')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {modele.tarif_base === 'pages' ? (
            <Carte
              libelle={t('ai_models_price_page')}
              valeur={modele.prix_page_eur}
              suffixe="€ / page"
            />
          ) : (
            <>
              <Carte
                libelle={t('ai_models_price_in')}
                valeur={modele.prix_entree_eur_par_m}
                suffixe="€ / M"
              />
              <Carte
                libelle={t('ai_models_price_out')}
                valeur={modele.prix_sortie_eur_par_m}
                suffixe="€ / M"
              />
            </>
          )}
        </div>
      </section>

      {/* ── Activité 30 jours ── */}
      <section
        className="rounded-xl border p-5"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp size={15} style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {t('ai_models_activity_30j')}
          </h2>
        </div>
        {stats && stats.recent_30j.appels > 0 ? (
          <>
            <Sparkline points={stats.serie_30j} />
            <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
              <Ligne libelle={t('ai_models_calls')} valeur={nombre.format(stats.recent_30j.appels)} />
              <Ligne
                libelle={t('ai_models_tokens_in')}
                valeur={nombre.format(stats.recent_30j.jetons_entree)}
              />
              <Ligne
                libelle={t('ai_models_tokens_out')}
                valeur={nombre.format(stats.recent_30j.jetons_sortie)}
              />
              <Ligne libelle={t('ai_models_cost')} valeur={eur.format(stats.recent_30j.cout_eur)} />
            </dl>
          </>
        ) : (
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {t('ai_models_no_activity')}
          </p>
        )}
      </section>

      {/* ── Depuis la création ── */}
      {stats && (
        <section
          className="rounded-xl border p-5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {t('ai_models_activity_total')}
          </h2>
          <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
            <Ligne libelle={t('ai_models_total_calls')} valeur={nombre.format(stats.total.appels)} />
            <Ligne
              libelle={t('ai_models_tokens_in')}
              valeur={nombre.format(stats.total.jetons_entree)}
            />
            <Ligne
              libelle={t('ai_models_tokens_out')}
              valeur={nombre.format(stats.total.jetons_sortie)}
            />
            <Ligne
              libelle={t('ai_models_total_cost')}
              valeur={eur.format(stats.total.cout_eur)}
              fort
            />
          </dl>
        </section>
      )}

      {/* ── Historique ── */}
      <section
        className="rounded-xl border p-5"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="mb-3 flex items-center gap-2">
          <History size={15} style={{ color: 'var(--color-text-secondary)' }} aria-hidden="true" />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {t('ai_models_history')}
          </h2>
        </div>
        {historique.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {t('ai_models_no_history')}
          </p>
        ) : (
          <ol className="flex flex-col divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {historique.map((h) => (
              <li key={h.id} className="flex flex-wrap items-baseline gap-x-2 py-2 text-sm">
                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {new Date(h.created_at).toLocaleDateString('fr-FR')}
                </span>
                <span style={{ color: 'var(--color-text-primary)' }}>{h.champ ?? h.action}</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  {h.ancienne_valeur ?? '—'} → {h.nouvelle_valeur ?? '—'}
                </span>
                <span className="ml-auto text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {h.changed_by ?? t('ai_models_history_unknown')}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

// ── Briques ──────────────────────────────────────────────────────────────────────

function Ligne({ libelle, valeur, fort }: { libelle: string; valeur: string; fort?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {libelle}
      </dt>
      <dd className={fort ? 'font-semibold' : ''} style={{ color: 'var(--color-text-primary)' }}>
        {valeur}
      </dd>
    </div>
  )
}

/**
 * `null` = non tarifé, et c'est DIFFÉRENT de 0 €. Un module gratuit se lirait
 * comme non facturé, et son coût réel cesserait d'être suivi.
 */
/**
 * Formate un montant.printé, quoi qu'il arrive.
 *
 * PostgreSQL rend ses `numeric` en CHAÎNE : `prix_entree_eur_par_m` vaut
 * « 0.1337 », pas 0.1337. Le type du DTO ment donc, et un `.toFixed()` sur une
 * chaîne lève `TypeError: s.toFixed is not a function` — ce qui cassait toute
 * la page. L'API est désormais corrigée pour renvoyer des nombres, mais un
 * garde ici évite que le même écran reparte en production à la prochaine
 * colonne `numeric` : on ne dépend plus du type déclaré par le serveur.
 */
function montant(valeur: number | string | null | undefined, decimales = 4): string | null {
  if (valeur === null || valeur === undefined || valeur === '') return null
  const n = typeof valeur === 'number' ? valeur : Number(valeur)
  if (!Number.isFinite(n)) return null
  return n.toFixed(decimales).replace('.', ',')
}

function Carte({
  libelle,
  valeur,
  suffixe,
}: {
  libelle: string
  valeur: number | string | null
  suffixe: string
}) {
  const { t } = useI18n()
  const affiche = montant(valeur)
  return (
    <div
      className="rounded-lg border p-3"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-background-muted)',
      }}
    >
      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {libelle}
      </p>
      {affiche === null ? (
        <p className="mt-1 text-sm italic" style={{ color: 'var(--color-text-secondary)' }}>
          {t('ai_models_unpriced')}
        </p>
      ) : (
        <p className="mt-1 text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {affiche} {suffixe}
        </p>
      )}
    </div>
  )
}

/** Sparkline SVG inline : pas de librairie pour 200 × 40 px. */
function Sparkline({ points }: { points: Stats['serie_30j'] }) {
  const largeur = 200
  const hauteur = 40
  if (!Array.isArray(points) || points.length === 0) return null
  const pas = points.length > 1 ? largeur / (points.length - 1) : 0
  // `Number()` en entrée : PostgreSQL rend les `numeric`/`bigint` en chaîne,
  // et une chaîne dans un calcul donne `NaN` — une courbe qui ne se trace
  // au lieu d'une page blanche, mais une courbe fausse n'est pas mieux.
  const trace = (cle: 'appels' | 'jetons_entree' | 'jetons_sortie') => {
    const valeurs = points.map((p) => Number(p[cle] ?? 0) || 0)
    const max = Math.max(...valeurs, 1)
    return points
      .map((_p, i) => {
        const x = i * pas
        const y = hauteur - (valeurs[i] / max) * (hauteur - 2) - 1
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }
  return (
    <svg
      viewBox={`0 0 ${largeur} ${hauteur}`}
      className="w-full"
      style={{ height: `${hauteur}px` }}
      role="img"
      aria-label="appels par jour"
      preserveAspectRatio="none"
    >
      <path d={trace('jetons_entree')} fill="none" stroke="var(--color-border)" strokeWidth={1.5} strokeOpacity={0.6} vectorEffect="non-scaling-stroke" />
      <path d={trace('jetons_sortie')} fill="none" stroke="var(--color-border)" strokeWidth={1.5} strokeOpacity={0.8} vectorEffect="non-scaling-stroke" />
      <path d={trace('appels')} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}