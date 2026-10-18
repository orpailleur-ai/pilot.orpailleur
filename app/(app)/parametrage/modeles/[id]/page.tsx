'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Check, History, TrendingUp } from 'lucide-react'
import { Button, Spinner, useToast } from '@astryxdesign/core'
import { apiClient } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'
import { libelleDetail } from '@/lib/i18n/scopes'
import { InlineError } from '@/components/ui/inline-error'
import { CopyButton } from '@/components/ui/copy-button'
import { PageHeader } from '@/components/layout/page-header'

/** Résultat d'un test de clé. Même forme que sur la page liste. */
interface EtatTest {
  enCours: boolean
  resultat: { ok: boolean; code: string; message: string; duree_ms?: number } | null
}

/** Reprend la forme de `Modele` dans la page liste — les deux doivent évoluer ensemble. */
interface Modele {
  id: string
  scope: string
  provider: string
  model: string
  /** `env` : la clé vient d'une variable d'environnement. `db` : chiffrée. */
  key_source: 'env' | 'db'
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
  /** Présent sur une entrée de test : durée de l'appel, en ms. */
  duree_ms?: number
}

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const nombre = new Intl.NumberFormat('fr-FR')

export default function ModeleDetailPage() {
  const { t } = useI18n()
  const toast = useToast()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [modele, setModele] = useState<Modele | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [historique, setHistorique] = useState<Entree[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [etatTest, setEtatTest] = useState<EtatTest>({ enCours: false, resultat: null })

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

  /**
   * Teste la clé auprès du fournisseur, sans rien enregistrer.
   *
   * Même contrat que le bouton de la page liste : la clé est vérifiée, rien
   * n'est écrit. Un test d'OCR dure une seconde et demie — l'utilisateur a le
   * temps de scroller ailleurs, et un simple changement de couleur passerait
   * inaperçu. Le toast est donc l'accusé de réception, et l'icône de la carte
   * l'état durable.
   */
  const testerCle = useCallback(async () => {
    if (!modele) return
    setEtatTest({ enCours: true, resultat: null })
    try {
      const r = await apiClient.post<{
        ok: boolean; code: string; message: string; duree_ms?: number
      }>(`/admin/ai-modeles/${modele.id}/tester`)
      setEtatTest({ enCours: false, resultat: r })
      toast({
        body: r.ok ? t('ai_models_test_ok', { ms: r.duree_ms ?? 0 }) : r.message,
        type: r.ok ? 'info' : 'error',
      })
    } catch (e: unknown) {
      setEtatTest({
        enCours: false,
        resultat: {
          ok: false, code: 'erreur', message: e instanceof Error ? e.message : t('error'),
        },
      })
      toast({ body: e instanceof Error ? e.message : t('error'), type: 'error' })
    }
  }, [modele, t, toast])

  const scopeBadge = modele ? (
    <span className="font-mono text-xs rounded px-1.5 py-0.5" style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 8%, transparent)', color: 'var(--color-accent)' }}>
      {modele.scope}
    </span>
  ) : undefined

  if (chargement) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title={t('ai_models_detail')} backHref="/parametrage/modeles" />
        <div className="flex justify-center py-12">
          <Spinner size="md" aria-label={t('loading')} />
        </div>
      </div>
    )
  }

  if (!modele) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title={t('ai_models_detail')} backHref="/parametrage/modeles" />
        <InlineError message={erreur || t('ai_models_detail_notfound')} />
      </div>
    )
  }

  const title = libelleDetail(modele.scope, t)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={title} backHref="/parametrage/modeles" badge={scopeBadge} />

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
            libelle={t('ai_models_updated_at')}
            valeur={new Date(modele.updated_at).toLocaleDateString('fr-FR')}
          />
        </dl>
      </section>

      {/* ── Clé d'API : son propre encart ───────────────────────────────────
          La clé était une ligne parmi d'autres dans une <dl> mélangeant
          modèle, fournisseur, date. Elle est le SECRET de la fiche : elle
          mérite son titre, sa source lisible, son masque copiable, son test et
          son journal — pas une ligne dans un tableau. */}
      <CleCard modele={modele} historique={historique} onTest={testerCle} test={etatTest} />

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

/**
 * Ancienneté relative, en français.
 *
 * Volontairement simple et LOCALE plutôt qu'une librairie : deux granularités
 * suffisent — « il y a 2 h », « il y a 3 j ». Au-delà de quelques semaines,
 * la date absolue est plus parlante qu'un « il y a 47 j » qu'il faut
 * recompter. On bascule donc sur la date complète au-delà de 30 jours.
 */
function anciennete(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const secondes = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000))
  const paliers: Array<[number, string]> = [
    [60, 's'], [3600, 'min'], [86400, 'h'], [2592000, 'j'],
  ]
  let unite = 's'
  let valeur = secondes
  for (const [seuil, u] of paliers) {
    if (secondes >= seuil) { unite = u; valeur = Math.floor(secondes / seuil) }
  }
  if (unite === 's') return `il y a ${valeur} s`
  // Une seule lettre : « il y a 2 h » se lit sans effort, « il y a 2 heures »
  // alourdit la ligne sans rien ajouter.
  return `il y a ${valeur} ${unite}`
}

/**
 * Encart « Clé d'API ».
 *
 * La clé est le SECRET de la fiche : elle sort du `<dl>` général pour avoir son
 * titre, sa source lisible (variable d'environnement ou base chiffrée), son
 * masque copiable, son test et son journal. On ne montre jamais la clé en
 * clair — l'API ne la transmet pas au navigateur — mais le masque (4 derniers
 * caractères) aide à la reconnaître dans le coffre du fournisseur, et « Copier »
 * le recopie sans révéler le secret.
 */
function CleCard({
  modele,
  historique,
  test,
  onTest,
}: {
  modele: Modele
  historique: Entree[]
  test: EtatTest
  onTest: () => void
}) {
  const { t } = useI18n()

  const sourceLabel =
    modele.key_source === 'db'
      ? t('ai_models_key_source_db')
      : (modele.env_var ?? t('ai_models_key_source_env'))

  // Ce que « Copier » doit mettre dans le presse-papier : le masque, ou à
  // défaut le nom de la variable d'environnement. Jamais la clé — l'API ne
  // l'envoie pas au navigateur de toute façon.
  const aCopier = modele.cle ?? modele.env_var ?? ''

  // Dernier changement et dernier test, lus dans le journal.
  const dernierTest = historique.find((h) => h.action === 'test' || /test/i.test(h.action))
  const dernierChangement = historique.find((h) => h.action !== 'test' && !/test/i.test(h.action))
  const aChange = Boolean(dernierChangement || modele.updated_at)

  return (
    <section
      className="rounded-xl border p-5"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
    >
      <h2 className="mb-4 text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {t('ai_models_key_section')}
      </h2>

      <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
        <Ligne libelle={t('ai_models_key_source_db')} valeur={sourceLabel} />
        <Ligne
          libelle={t('ai_models_api_key')}
          valeur={aCopier || '—'}
        />
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {aCopier && (
          <CopyButton value={aCopier} label={t('ai_models_key_copy')} />
        )}
        <Button
          label={test.enCours ? t('ai_models_testing') : t('ai_models_test')}
          icon={test.enCours ? undefined : test.resultat?.ok ? <Check size={13} /> : undefined}
          variant={test.resultat && !test.resultat.ok ? 'destructive' : 'secondary'}
          size="sm"
          onClick={onTest}
          isDisabled={test.enCours}
        />
      </div>

      <dl className="mt-4 border-t pt-3 text-xs" style={{ borderColor: 'var(--color-border)' }}>
        <dt className="text-secondary" style={{ color: 'var(--color-text-secondary)' }}>
          {t('ai_models_test')}
        </dt>
        <dd className="mb-2" style={{ color: 'var(--color-text-primary)' }}>
          {test.enCours
            ? t('ai_models_testing')
            : test.resultat
              ? test.resultat.ok
                ? t('ai_models_key_tested_just_now', { ms: test.resultat.duree_ms ?? 0 })
                : t('ai_models_key_tested_ko_just_now')
              : dernierTest
                ? t('ai_models_key_tested_ok', {
                    ago: anciennete(dernierTest.created_at),
                    ms: dernierTest.duree_ms ?? 0,
                  })
                : t('ai_models_key_never_used')}
        </dd>

        <dt className="text-secondary" style={{ color: 'var(--color-text-secondary)' }}>
          {t('ai_models_history')}
        </dt>
        <dd style={{ color: 'var(--color-text-primary)' }}>
          {dernierChangement
            ? dernierChangement.changed_by
              ? t('ai_models_key_modified_by', {
                  ago: anciennete(dernierChangement.created_at),
                  auteur: dernierChangement.changed_by,
                })
              : t('ai_models_key_modified_unknown', { ago: anciennete(dernierChangement.created_at) })
            : aChange
              ? t('ai_models_key_modified_unknown', { ago: anciennete(modele.updated_at) })
              : t('ai_models_key_never_modified')}
        </dd>
      </dl>
    </section>
  )
}

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