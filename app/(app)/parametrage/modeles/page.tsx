'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Cpu, Eye, Plus } from 'lucide-react'
import { Badge, Button, useToast } from '@astryxdesign/core'
import { ConfirmDialog } from '@/components/composite/confirm-dialog'
import { PageHeader } from '@/components/layout/page-header'
import { ModeleModal } from '@/components/modeles/modele-modal'
import { ModeleRowActions } from '@/components/modeles/modele-row-actions'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { Spinner } from '@/components/ui/spinner'
import { useI18n } from '@/lib/i18n'
import { libelleScope } from '@/lib/i18n/scopes'
import {
  createModeleAdmin,
  defautDe,
  deleteModeleAdmin,
  listModelesAdmin,
  listScopesAdmin,
  testerModeleAdmin,
  updateModeleAdmin,
  type Modele,
  type ModeleInput,
  type ScopeInfo,
  type TestResultat,
} from '@/lib/modeles-client'

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

const num = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 4 })

export default function ModelesPage() {
  const router = useRouter()
  const { t } = useI18n()
  const toast = useToast()

  const [scopes, setScopes] = useState<ScopeInfo[]>([])
  const [modeles, setModeles] = useState<Modele[]>([])
  const [chiffrement, setChiffrement] = useState(true)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

  const [edition, setEdition] = useState<Modele | null>(null)
  const [creation, setCreation] = useState(false)
  const [tests, setTests] = useState<Record<string, { enCours: boolean; resultat: TestResultat | null }>>({})
  const [enregistrement, setEnregistrement] = useState(false)

  const [suppression, setSuppression] = useState<Modele | null>(null)
  const [suppressionEnCours, setSuppressionEnCours] = useState(false)

  const charger = useCallback(async () => {
    setChargement(true)
    setErreur('')
    try {
      const s = await listScopesAdmin()
      setScopes(s.scopes ?? [])
      setChiffrement(s.chiffrement_disponible)
      setModeles(await listModelesAdmin())
    } catch (e: unknown) {
      setErreur(e instanceof Error ? e.message : t('error'))
    } finally {
      setChargement(false)
    }
  }, [t])

  useEffect(() => {
    void charger()
  }, [charger])

  async function enregistrer(valeurs: ModeleInput & { id?: string }) {
    setEnregistrement(true)
    setErreur('')
    try {
      if (valeurs.id) {
        await updateModeleAdmin(valeurs.id, valeurs)
      } else {
        await createModeleAdmin(valeurs)
      }
      setEdition(null)
      setCreation(false)
      await charger()
      // Sans ce toast, un enregistrement reussi ne se distinguait d'un clic
      // perdu : le formulaire se fermait, c'etait tout. Une action qui ne dit
      // rien avoir fait laisse l'utilisateur se demander s'il a SAVE ou non.
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
      const r = await testerModeleAdmin(m.id)
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
      await updateModeleAdmin(m.id, { actif: !m.actif })
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

  async function supprimer() {
    if (!suppression) return
    setSuppressionEnCours(true)
    try {
      await deleteModeleAdmin(suppression.id)
      setSuppression(null)
      await charger()
      toast({ body: t('ai_models_deleted', { model: suppression.model }), type: 'info' })
    } catch (e: unknown) {
      setErreur(e instanceof Error ? e.message : t('error'))
      toast({ body: e instanceof Error ? e.message : t('error'), type: 'error' })
    } finally {
      setSuppressionEnCours(false)
    }
  }

  const columns: Column<Modele>[] = useMemo(
    () => [
      {
        key: 'model',
        header: t('ai_models_model'),
        mobile: 'primary',
        render: (m) => (
          <span className="flex items-center gap-2 min-w-0">
            <span className="truncate font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {m.model}
            </span>
            {m.cle && (
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                ••••
              </span>
            )}
          </span>
        ),
      },
      {
        key: 'scope',
        header: t('ai_models_scope'),
        mobile: 'inline',
        render: (m) => (
          <span className="flex items-center gap-1.5">
            <span style={{ color: 'var(--color-text-primary)' }}>
              {libelleScope(m.scope, t)}
            </span>
            <code
              className="rounded px-1 py-0.5 text-[11px]"
              style={{
                backgroundColor: 'var(--color-background-muted)',
                color: 'var(--color-text-secondary)',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {m.scope}
            </code>
          </span>
        ),
      },
      {
        key: 'provider',
        header: t('ai_models_provider'),
        mobile: 'inline',
        render: (m) => (
          <span style={{ color: 'var(--color-text-secondary)' }}>{m.provider}</span>
        ),
      },
      {
        key: 'prix',
        header: t('ai_models_pricing'),
        align: 'end',
        mobile: 'hidden',
        render: (m) => (
          <span className="text-xs tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
            {/* `null` s'affiche « non tarifé » : un prix nul afficherait 0,00 € sur
                une période réellement facturée. */}
            {m.prix_entree_eur_par_m == null
              ? t('ai_models_unpriced')
              : `${num.format(m.prix_entree_eur_par_m)} / ${
                  m.prix_sortie_eur_par_m == null ? '—' : num.format(m.prix_sortie_eur_par_m)
                } € / M`}
          </span>
        ),
      },
      {
        key: 'etat',
        header: t('ai_models_form_active'),
        align: 'end',
        mobile: 'inline',
        render: (m) => (
          <Badge
            variant={m.actif ? 'success' : 'neutral'}
            label={m.actif ? t('ai_models_active') : t('ai_models_activate')}
          />
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'end',
        mobile: 'hidden',
        noRowClick: true,
        render: (m) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              label={t('ai_models_view')}
              variant="ghost"
              size="sm"
              isIconOnly
              icon={<Eye size={13} />}
              onClick={() => router.push(`/parametrage/modeles/${m.id}`)}
            />
            <ModeleRowActions
              m={m}
              test={tests[m.id]?.resultat ?? null}
              enCours={tests[m.id]?.enCours === true}
              onTester={() => void tester(m)}
              onBasculer={() => void basculer(m)}
              onEditer={() => setEdition(m)}
              onSupprimer={() => setSuppression(m)}
            />
          </div>
        ),
      },
    ],
    [t, tests, router],
  )

  /**
   * Périmètres pour lesquels AUCUNE configuration n'existe.
   *
   * `null` si le périmètre n'a pas de modèle par défaut : ces modules
   * n'appellent aujourd'hui aucun modèle, et afficher « utilisation de
   * mistral-small » affirmerait un comportement qui n'existe pas.
   */
  const scopesSansConfiguration = useMemo(
    () =>
      scopes.filter(
        (s) => !modeles.some((m) => m.scope === s.code) && defautDe(s.code) !== null,
      ),
    [scopes, modeles],
  )

  if (chargement && modeles.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={16} />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title={t('ai_models_title')}
        subtitle={t('ai_models_subtitle')}
        icon={<Cpu size={20} style={{ color: 'var(--color-text-primary)' }} />}
        action={
          <Button
            label={t('ai_models_add')}
            variant="primary"
            icon={<Plus size={15} />}
            onClick={() => setCreation(true)}
          />
        }
      />

      {erreur && <InlineError message={erreur} />}

      <DataTable
        columns={columns}
        rows={modeles}
        rowKey={(m) => m.id}
        empty={
          <EmptyState
            icon={<Cpu size={24} />}
            title={t('ai_models_empty')}
            description={t('ai_models_empty_hint')}
            action={
              <Button
                label={t('ai_models_add')}
                variant="primary"
                icon={<Plus size={15} />}
                onClick={() => setCreation(true)}
              />
            }
          />
        }
      />

      {/*
        Périmètres sans configuration : ce que l'API utilise RÉELLEMENT.

        Le tableau ne montre que ce qui est configuré ; un périmètre sans
        configuration n'y a pas de ligne, et l'administrateur ne verrait
        pas que le module tourne sur son modèle par défaut. La liste
        ci-dessous comble ce trou — et elle est vérifiable : le défaut
        est ce que l'API appelle quand aucune ligne n'est active.
      */}
      {scopesSansConfiguration.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {scopesSansConfiguration.map((scope) => (
            <p
              key={scope.code}
              className="rounded-lg border px-3 py-2 text-xs"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              <span style={{ color: 'var(--color-text-primary)' }}>
                {libelleScope(scope.code, t)}
              </span>
              {' — '}
              {t('ai_models_default_used', { model: defautDe(scope.code) ?? '—' })}
            </p>
          ))}
        </div>
      )}

      {/* Création / édition */}
      <ModeleModal
        isOpen={creation || edition !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreation(false)
            setEdition(null)
          }
        }}
        initial={edition}
        scopes={scopes}
        chiffrement={chiffrement}
        enregistrement={enregistrement}
        onSubmit={enregistrer}
      />

      {/* Confirmation de suppression */}
      <ConfirmDialog
        isOpen={suppression !== null}
        onOpenChange={(open) => { if (!open) setSuppression(null) }}
        title={t('ai_models_delete')}
        description={
          suppression
            ? t('ai_models_delete_confirm', { model: suppression.model })
            : ''
        }
        confirmLabel={t('delete')}
        confirmVariant="destructive"
        onConfirm={() => void supprimer()}
        isLoading={suppressionEnCours}
      />
    </>
  )
}
