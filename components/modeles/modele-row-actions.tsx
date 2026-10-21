'use client'

import { Check, Loader2, Pencil, PlugZap, Trash2 } from 'lucide-react'
import { Button } from '@astryxdesign/core'
import { useT } from '@/lib/i18n'
import type { Modele, TestResultat } from '@/lib/modeles-client'

/**
 * Actions d'une ligne de configuration IA.
 *
 * Extraites de la page liste dans leur propre fichier : la ligne est
 * désormais une ligne de `DataTable`, et non plus un `<li>` de liste — les
 * deux contextes n'ont rien en commun, et le composant habille les deux
 * (couleur de la bordure, fond, taille).
 *
 * Le résultat d'un test est porté par la LIGNE, pas par un état global :
 * tester deux modèles en parallèle ne doit pas faire clignoter le bouton
 * des autres. Et le RÉSULTAT est conservé — l'administrateur doit pouvoir
 * relire le message d'un échec après avoir fermé la page.
 */
export interface ModeleRowActionsProps {
  m: Modele
  test: TestResultat | null
  enCours: boolean
  onTester: () => void
  onBasculer: () => void
  onEditer: () => void
  onSupprimer: () => void
}

export function ModeleRowActions({
  m,
  test,
  enCours,
  onTester,
  onBasculer,
  onEditer,
  onSupprimer,
}: ModeleRowActionsProps) {
  const t = useT()

  return (
    <div className="flex items-center gap-1">
      {/*
        Tester avant d'activer : une configuration inactive ne part JAMAIS
        en production, et c'est justement celle qu'on veut vérifier. Le test
        part sur l'endpoint du fournisseur CORRESPONDANT au modèle — l'OCR
        n'existe pas sur /v1/chat/completions et y répondrait « Invalid
        model » alors que la clé est bonne.

        Ce bouton est un FRÈRE de celui d'activation, jamais son parent.
        `<button>` dans `<button>` est du HTML invalide : le parseur referme
        automatiquement le parent au premier `<button>` rencontré, le DOM est
        reconstruit, et les gestionnaires React ne tombent plus sur les
        nœuds visés — les boutons s'affichent, plus rien ne se passe.
      */}
      <Button
        label={
          enCours
            ? t('ai_models_testing')
            : test
              ? t('ai_models_retest')
              : t('ai_models_test')
        }
        variant="ghost"
        size="sm"
        isIconOnly
        isLoading={enCours}
        icon={
          enCours ? (
            <Loader2 size={13} className="animate-spin" />
          ) : test?.ok ? (
            <Check size={13} />
          ) : (
            <PlugZap size={13} />
          )
        }
        tooltip={test?.message ?? t('ai_models_test_hint')}
        onClick={onTester}
      />

      {/*
        Activation : bouton FRÈRE du précédent, jamais son parent — même
        raison, même conséquence si on les emboîte.
      */}
      <Button
        label={m.actif ? t('ai_models_active') : t('ai_models_activate')}
        variant="ghost"
        size="sm"
        isIconOnly
        icon={m.actif ? <Check size={13} /> : undefined}
        tooltip={m.actif ? t('ai_models_active') : t('ai_models_activate')}
        onClick={onBasculer}
        style={m.actif ? { color: 'var(--color-success-text)' } : undefined}
      />

      <Button
        label={t('edit')}
        variant="ghost"
        size="sm"
        isIconOnly
        icon={<Pencil size={13} />}
        onClick={onEditer}
      />

      <Button
        label={t('delete')}
        variant="ghost"
        size="sm"
        isIconOnly
        icon={<Trash2 size={13} />}
        onClick={onSupprimer}
      />
    </div>
  )
}
