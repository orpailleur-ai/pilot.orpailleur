'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Check, Eye, Key, Loader2, Pencil, PlugZap, Plus, Trash2 } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@astryxdesign/core'
import { libelleDetail, libelleScope } from '@/lib/i18n/scopes'
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

/**
 * Résultat d'un test de connexion, par configuration.
 *
 * Clé par `id` et non un état global : tester deux modèles en parallèle ne
 * doit pas faire clignoter le bouton des autres. Et le RÉSULTAT est conservé —
 * l'administrateur doit pouvoir relire le message d'un échec après avoir
 * fermé la page.
 */
interface EtatTest {
  enCours: boolean
  resultat: { ok: boolean; code: string; message: string; duree_ms?: number } | null
}

interface Modele {
  id: string
  scope: string
  provider: string
  model: string
  env_var: string | null
  cle: string | null
  prix_entree_eur_par_m: number | null
  prix_sortie_eur_par_m: number | null
  tarif_base: 'jetons' | 'pages'
  prix_page_eur: number | null
  taux_usd_eur: number | null
  tarif_maj_le: string | null
  actif: boolean
  updated_at: string
}

const FOURNISSEURS = ['mistral', 'openai', 'anthropic', 'litellm', 'ollama']

export default function ModelesPage() {
  const { t } = useI18n()
  const toast = useToast()
  const [scopes, setScopes] = useState<ScopeInfo[]>([])
  const [modeles, setModeles] = useState<Modele[]>([])
  const [chiffrement, setChiffrement] = useState(true)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [edition, setEdition] = useState<Partial<Modele> | null>(null)
  const [tests, setTests] = useState<Record<string, EtatTest>>({})
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
      // Sans ce toast, un enregistrement reussi ne se distinguait d'un clic
      // perdu : le formulaire se fermait, c'etait tout. Une action qui ne dit
      // rien avoir fait laisse l'utilisateur wonder s'il a SAVE ou non.
      toast({ body: t('ai_models_saved'), type: 'info' })
    } catch (e: unknown) {
      setErreur(e instanceof Error ? e.message : t('error'))
      toast({ body: e instanceof Error ? e.message : t('error'), type: 'error' })
    } finally {
      setEnregistrement(false)
    }
  }

  /**
   * Teste une configuration contre le fournisseur.
   *
   * Le secret ne quitte JAMAIS le serveur : la clé est déchiffrée côté API,
   * l'appel part de là, et la réponse ne contient ni la clé ni son début.
   */
  async function tester(m: Modele) {
    setTests((p) => ({ ...p, [m.id]: { enCours: true, resultat: null } }))
    try {
      const r = await apiClient.post<{
        ok: boolean; code: string; message: string; duree_ms?: number
      }>(`/admin/ai-modeles/${m.id}/tester`)
      setTests((p) => ({ ...p, [m.id]: { enCours: false, resultat: r } }))
      // L'icone reste l'etat durable de la ligne ; le toast est
      // l'ACCUSE DE RECEPTION. Un test d'OCR dure une seconde et demie :
      // l'utilisateur a le temps de scroller ailleurs, et un simple changement
      // de couleur passe inaperçu. Le message d'echec, lui, se lit d'un coup —
      // c'est la raison d'etre du bouton.
      toast({
        body: r.ok
          ? t('ai_models_test_ok', { ms: r.duree_ms ?? 0 })
          : r.message,
        type: r.ok ? 'info' : 'error',
      })
    } catch (e: unknown) {
      setTests((p) => ({
        ...p,
        [m.id]: {
          enCours: false,
          resultat: {
            ok: false,
            code: 'appel',
            message: e instanceof Error ? e.message : t('error'),
          },
        },
      }))
      toast({
        body: e instanceof Error ? e.message : t('error'),
        type: 'error',
      })
    }
  }

  async function basculer(m: Modele) {
    setErreur('')
    try {
      await apiClient.patch(`/admin/ai-modeles/${m.id}`, { actif: !m.actif })
      await charger()
      // Dire QUOI a change. « Actif » seul laisse l'utilisateur deviner
      // lequel des deux il vient de basculer.
      toast({
        body: m.actif ? t('ai_models_deactivated') : t('ai_models_activated'),
        type: 'info',
      })
    } catch (e: unknown) {
      setErreur(e instanceof Error ? e.message : t('error'))
      toast({ body: e instanceof Error ? e.message : t('error'), type: 'error' })
    }
  }

  async function supprimer(m: Modele) {
    setErreur('')
    try {
      await apiClient.delete(`/admin/ai-modeles/${m.id}`)
      await charger()
      toast({ body: t('ai_models_deleted', { model: m.model }), type: 'info' })
    } catch (e: unknown) {
      setErreur(e instanceof Error ? e.message : t('error'))
      toast({ body: e instanceof Error ? e.message : t('error'), type: 'error' })
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
          onClick={() => setEdition({ provider: 'mistral' })}
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
                {/* Le nom traduit porte le titre ; le code n'est plus qu'un
                    badge. L'inverse — un `ocr_vision` en titre et la
                    traduction en petit gris — obligeait l'administrateur à
                    connaître l'identifiant technique pour comprendre la
                    section. */}
                <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {libelleScope(scope.code, t)}
                  </h2>
                  <code
                    className="rounded px-1 py-0.5 text-[11px]"
                    style={{
                      backgroundColor: 'var(--color-background-muted)',
                      color: 'var(--color-text-secondary)',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    {scope.code}
                  </code>
                </div>
                <p className="mb-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {libelleDetail(scope.code, t)}
                </p>
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
                        onTester={() => tester(m)}
                        test={tests[m.id] ?? null}
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
  onTester,
  test,
}: {
  m: Modele
  onTester: () => void
  test: EtatTest | null
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
        {m.cle ?? t('ai_models_key_db')}
      </span>
      <span className="text-xs tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
        {/* `null` s'affiche « non tarifé » : un prix nul afficherait 0,00 € sur
            une période réellement facturée. */}
        {/* Le barème n'est pas le même partout : l'OCR est facturé à la
            PAGE, pas au jeton. Afficher « €/M » dessus donnerait un prix par
            million de jetons pour un modèle qui ne compte pas de jetons. */}
        {m.tarif_base === 'pages'
          ? m.prix_page_eur == null
            ? t('ai_models_unpriced')
            : `${num.format(m.prix_page_eur * 1000)} € / 1000 pages`
          : m.prix_entree_eur_par_m == null
            ? t('ai_models_unpriced')
            : `${num.format(m.prix_entree_eur_par_m)} / ${
                m.prix_sortie_eur_par_m == null ? '—' : num.format(m.prix_sortie_eur_par_m)
              } € / M`}
      </span>
      <span className="ml-auto flex items-center gap-1">
        {/* Tester avant d'activer : une configuration inactive ne part
            JAMAIS en production, et c'est justement celle qu'on veut
            vérifier. Le test part sur l'endpoint du fournisseur
            CORRESPONDANT au modèle — l'OCR n'existe pas sur
            /v1/chat/completions et y répondrait « Invalid model » alors que
            la clé est bonne.

            Ce bouton était imbriqué dans celui d'activation. `<button>`
            dans `<button>` est du HTML invalide : le parseur referme
            automatiquement le parent au premier `<button>` rencontré, le DOM
            est reconstruit, et les gestionnaires React ne tombent plus sur
            les nœuds visés — les boutons s'affichent, plus rien ne se passe.
            D'où « aucune action ne fonctionne » sur cette page. */}
        <button
          type="button"
          onClick={onTester}
          disabled={test?.enCours === true}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium disabled:opacity-60"
          style={{
            color: test?.resultat?.ok ? 'var(--color-success)'
              : test?.resultat ? 'var(--color-danger)' : 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
          }}
          title={test?.resultat?.message ?? t('ai_models_test_hint')}
        >
          {test?.enCours ? (
            <Loader2 size={12} className="animate-spin" />
          ) : test?.resultat?.ok ? (
            <Check size={12} />
          ) : (
            <PlugZap size={12} />
          )}
          {test?.enCours
            ? t('ai_models_testing')
            : test?.resultat
              ? t('ai_models_retest')
              : t('ai_models_test')}
        </button>

        {/* Activation : bouton FRÈRE du précédent, jamais son parent. */}
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
        <Link
          href={`/parametrage/modeles/${m.id}`}
          aria-label={t('ai_models_view')}
          className="rounded p-1 transition-colors hover:bg-[var(--color-background-muted)]"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <Eye size={14} />
        </Link>
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
          // La clé va TOUJOURS en base, chiffrée. L'option « variable
          // d'environnement » a été retirée : elle exposait deux emplacements
          // possibles pour le même secret, et rien n'indiquait lequel faisait
          // foi. Une seule source, un seul état à lire.
          key_source: 'db',
          env_var: null,
          // Une clé vide ne doit PAS être envoyée : elle viderait une clé
          // déjà enregistrée au lieu de la laisser en place.
          api_key: v['api_key'] ? v['api_key'] : undefined,
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
                {libelleScope(s.code, t)} ({s.code})
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

        {/* La clé va TOUJOURS en base, chiffrée. Pas de sélecteur de source :
            deux emplacements possibles pour le même secret n'ont pas de
            « valeur par défaut » lisible, et l'administrateur devait
            deviner lequel faisait foi. Une source, un état à lire, et le
            chiffrement imposé par le serveur — jamais un choix de
            l'interface.

            Le champ reste désactivé sans clé maîtresse : l'API refuserait
            l'enregistrement, et un bouton actif qui échoue est pire qu'un
            formulaire qui explique pourquoi il est fermé. */}
          <Champ label={t('ai_models_api_key')}>
            <input
              type="password"
              autoComplete="new-password"
              value={String(v['api_key'] ?? '')}
              onChange={(e) => set('api_key', e.target.value)}
              disabled={!chiffrement}
              required={!initial.id}
              placeholder={
                !chiffrement
                  ? t('ai_models_key_locked')
                  : initial.id
                    ? t('ai_models_key_unchanged')
                    : 'sk-…'
              }
              className="w-full rounded border px-2 py-1.5 text-sm disabled:opacity-50"
              style={champStyle()}
            />
          </Champ>

      </div>

      {/* Les tarifs sortent de la grille à trois colonnes.
          Dedans, ils tombaient sur UNE colonne puis étaient scindés en deux :
          chaque champ tenait un sixième de la largeur du formulaire, et les
          molettes de `type="number"` mangeaient encore la place. Un barème mal
          saisi — 2,0000 au lieu de 2,00 — passe inapercçu dans un champ de
          quelques pixels.

          Leur propre rangée pleine largeur leur laisse une moitié de formulaire
          chacun, sur petit écran seulement si la place manque. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Champ label={t('ai_models_price_in')}>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={String(v['prix_entree_eur_par_m'] ?? '')}
            onChange={(e) => set('prix_entree_eur_par_m', e.target.value)}
            placeholder={t('ai_models_unpriced')}
            className="w-full rounded border px-3 py-2 text-sm tabular-nums"
            style={champStyle()}
          />
        </Champ>
        <Champ label={t('ai_models_price_out')}>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={String(v['prix_sortie_eur_par_m'] ?? '')}
            onChange={(e) => set('prix_sortie_eur_par_m', e.target.value)}
            placeholder={t('ai_models_unpriced')}
            className="w-full rounded border px-3 py-2 text-sm tabular-nums"
            style={champStyle()}
          />
        </Champ>
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