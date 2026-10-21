'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button, CheckboxInput, NumberInput, TextInput } from '@astryxdesign/core'
import { Modal, ModalSection, FieldGrid } from '@/components/ui/modal'
import { SelectField } from '@/components/ui/select-field'
import { useT } from '@/lib/i18n'
import { libelleScope } from '@/lib/i18n/scopes'
import type { Modele, ModeleInput, ScopeInfo } from '@/lib/modeles-client'

const FOURNISSEURS = ['mistral', 'openai', 'anthropic', 'litellm', 'ollama']

/**
 * Formulaire de configuration d'un modèle IA, dans une modale.
 *
 * Il était formerly inline dans la page liste : le formulaire s'affichait
 * au-dessus du tableau, en pleine largeur, et la page ne pouvait plus être
 * lue comme une liste. Ici, la liste reste une liste, et la modale porte
 * le formulaire.
 *
 * ── La clé va TOUJOURS en base, chiffrée ─────────────────────────────────────
 *
 * Pas de sélecteur de source : deux emplacements possibles pour le même
 * secret n'ont pas de « valeur par défaut » lisible, et l'administrateur
 * devait deviner lequel faisait foi. Une source, un état à lire, et le
 * chiffrement imposé par le serveur — jamais un choix de l'interface.
 */
export function ModeleModal({
  isOpen,
  onOpenChange,
  initial,
  scopes,
  chiffrement,
  enregistrement,
  onSubmit,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  /** Configuration éditée, ou `null` pour une création. */
  initial: Modele | null
  scopes: ScopeInfo[]
  /** Faux = l'API refuse d'enregistrer une clé en base. */
  chiffrement: boolean
  enregistrement: boolean
  onSubmit: (v: ModeleInput & { id?: string }) => void
}) {
  const t = useT()
  const [v, setV] = useState<Record<string, unknown>>({})

  // Le formulaire est réinitialisé à chaque ouverture : sans cela, rouvrir
  // la modale après une édition enchaînée Afficherait les valeurs de la
  // précédente.
  useEffect(() => {
    if (!isOpen) return
    setV({
      scope: initial?.scope ?? scopes[0]?.code ?? '',
      provider: initial?.provider ?? 'mistral',
      model: initial?.model ?? '',
      api_key: '',
      prix_entree_eur_par_m: initial?.prix_entree_eur_par_m ?? '',
      prix_sortie_eur_par_m: initial?.prix_sortie_eur_par_m ?? '',
      actif: initial?.actif ?? true,
    })
  }, [isOpen, initial, scopes])

  const set = (k: string, val: unknown) => setV((p) => ({ ...p, [k]: val }))

  /** `''` → `null` : une chaîne vide ferait planter `Number()`. */
  const prix = (x: unknown): number | null => {
    if (x === '' || x == null) return null
    const n = Number(x)
    return Number.isNaN(n) ? null : n
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={initial ? t('ai_models_edit') : t('ai_models_add')}
      size="lg"
      preventClose={enregistrement}
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit({
            id: initial?.id,
            scope: String(v['scope']),
            provider: String(v['provider']),
            model: String(v['model']),
            // Une clé vide ne doit PAS être envoyée : elle viderait une clé
            // déjà enregistrée au lieu de la laisser en place.
            api_key: v['api_key'] ? String(v['api_key']) : undefined,
            prix_entree_eur_par_m: prix(v['prix_entree_eur_par_m']),
            prix_sortie_eur_par_m: prix(v['prix_sortie_eur_par_m']),
            actif: Boolean(v['actif']),
          })
        }}
      >
        {!chiffrement && (
          <div
            className="flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-warning) 35%, transparent)',
            }}
          >
            <AlertTriangle
              size={16}
              aria-hidden="true"
              style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: 2 }}
            />
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {t('ai_models_no_key')}
            </p>
          </div>
        )}

        <ModalSection title={t('ai_models_model')}>
          <FieldGrid columns={1}>
            <SelectFieldScope
              value={String(v['scope'])}
              onChange={(val) => set('scope', val)}
              scopes={scopes}
              isDisabled={Boolean(initial)}
            />
            <FieldGrid columns={2}>
              <SelectFieldProvider
                value={String(v['provider'])}
                onChange={(val) => set('provider', val)}
              />
              <TextInput
                label={t('ai_models_model')}
                isLabelHidden
                value={String(v['model'])}
                onChange={(val) => set('model', val)}
                isRequired
                placeholder="mistral-large"
                width="100%"
              />
            </FieldGrid>
          </FieldGrid>
        </ModalSection>

        <ModalSection title={t('ai_models_api_key')}>
          <TextInput
            label={t('ai_models_api_key')}
            isLabelHidden
            value={String(v['api_key'] ?? '')}
            onChange={(val) => set('api_key', val)}
            isDisabled={!chiffrement}
            isRequired={!initial}
            placeholder={
              !chiffrement
                ? t('ai_models_key_locked')
                : initial
                  ? t('ai_models_key_unchanged')
                  : 'sk-…'
            }
            type="password"
            autoComplete="new-password"
            width="100%"
          />
        </ModalSection>

        <ModalSection title={t('ai_models_pricing')}>
          {/*
            Les tarifs sortent de la grille à trois colonnes.
            Dedans, ils tombaient sur UNE colonne puis étaient scindés en deux :
            chaque champ tenait un sixième de la largeur du formulaire, et les
            molettes de `type="number"` mangeaient encore la place. Un barème
            mal saisi — 2,0000 au lieu de 2,00 — passe inapercçu dans un
            champ de quelques pixels.

            Leur propre rangée pleine largeur leur laisse une moitié de
            formulaire chacun, sur petit écran seulement si la place manque.
          */}
          <FieldGrid columns={2}>
            <NumberInput
              label={t('ai_models_price_in')}
              value={v['prix_entree_eur_par_m'] === '' || v['prix_entree_eur_par_m'] == null ? undefined : Number(v['prix_entree_eur_par_m'])}
              onChange={(val) => set('prix_entree_eur_par_m', val)}
              min={0}
              step={0.01}
              units="€ / M"
              placeholder={t('ai_models_unpriced')}
              width="100%"
            />
            <NumberInput
              label={t('ai_models_price_out')}
              value={v['prix_sortie_eur_par_m'] === '' || v['prix_sortie_eur_par_m'] == null ? undefined : Number(v['prix_sortie_eur_par_m'])}
              onChange={(val) => set('prix_sortie_eur_par_m', val)}
              min={0}
              step={0.01}
              units="€ / M"
              placeholder={t('ai_models_unpriced')}
              width="100%"
            />
          </FieldGrid>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('ai_models_price_hint')}
          </p>
        </ModalSection>

        <ModalSection title={t('ai_models_form_active')}>
          <CheckboxInput
            label={t('ai_models_form_active')}
            isLabelHidden
            value={Boolean(v['actif'])}
            onChange={(checked) => set('actif', checked)}
          />
        </ModalSection>

        <div
          className="flex gap-3 border-t pt-3"
          style={{ borderColor: 'var(--color-border)', justifyContent: 'flex-end' }}
        >
          <Button
            label={t('cancel')}
            variant="secondary"
            onClick={() => onOpenChange(false)}
            isDisabled={enregistrement}
          />
          <Button
            label={enregistrement ? t('loading') : t('save')}
            variant="primary"
            type="submit"
            isLoading={enregistrement}
            isDisabled={!chiffrement}
          />
        </div>
      </form>
    </Modal>
  )
}

/**
 * Sélecteur de périmètre.
 *
 * Le libellé vient du dictionnaire du client : un libellé écrit côté API
 * resterait en français après bascule de langue, alors que les autres
 * libellés de l'écran suivent.
 */
function SelectFieldScope({
  value,
  onChange,
  scopes,
  isDisabled,
}: {
  value: string
  onChange: (value: string) => void
  scopes: ScopeInfo[]
  isDisabled: boolean
}) {
  const t = useT()
  return (
    <SelectField
      label={t('ai_models_scope')}
      value={value}
      onChange={onChange}
      isDisabled={isDisabled}
      options={scopes.map((s) => ({
        value: s.code,
        label: `${libelleScope(s.code, t)} (${s.code})`,
      }))}
    />
  )
}

function SelectFieldProvider({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const t = useT()
  return (
    <SelectField
      label={t('ai_models_provider')}
      value={value}
      onChange={onChange}
      options={FOURNISSEURS.map((p) => ({ value: p, label: p }))}
    />
  )
}
