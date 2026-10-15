/**
 * Les périmètres d'usage des modèles IA, et leurs clés de traduction.
 *
 * Ce module n'IMPORTE RIEN. C'est délibéré : les dictionnaires l'importent
 * pour se faire TYPER, et il ne peut donc pas les importer lui — la
 * dépendance serait circulaire. Rien d'autre n'y vit, pour que le contrat
 * reste lisible en un coup d'œil.
 *
 * ── Pourquoi un contrôle par le TYPAGE, et pas à l'exécution ──────────────
 *
 * Les périmètres vivent en base : un administrateur peut en ajouter un sans
 * redéploiement. Aucun test statique ne peut les connaître, et une
 * vérification à l'exécution se paie deux fois.
 *
 * D'abord, une vérification à l'import — `if (!dico[cle]) throw` — ne
 * s'exécute qu'au moment où le MODULE EST CHARGÉ. La page étant un composant
 * client, cela arrive dans le NAVIGATEUR : le contrôle ne fait donc pas
 * échouer la construction, et pire, il cassait la page au premier
 * rechargement. C'est une mine, pas un garde-fou.
 *
 * Ensuite, l'exécution coûte à chaque chargement ce que le typage prouve
 * une fois, à la compilation.
 *
 * Le bon outil est donc le système de types : `messages.fr.ts` déclare
 * `satisfies Record<ClePerimetre, string>`. Une clé de périmètre supprimée
 * devient une ERREUR DE TYPE — attrapée par `tsc`, donc par la CI, sans
 * ajouter de runner de test à un projet qui n'en a pas.
 *
 * Le contrôle de parité entre les deux langues, lui, existait déjà :
 * `Messages = typeof fr` impose à `en` les mêmes clés.
 */

/**
 * Les périmètres tarifs par la migration 046.
 *
 * Liste volontairement DUPLIQUÉE de la base : c'est un instantané, pas la
 * source de vérité. Un périmètre ajouté en base sans être ici n'échoue pas ce
 * contrôle — il est traité à l'affichage — mais un périmètre listé ici dont la
 * traduction disparaît fait échouer la construction, ce qui est le but.
 */
export const PERIMETRES_CONNUS = [
  'ocr_vision',
  'ocr_reasoning',
  'ocr_agent',
  'import_recette',
  'bot',
  'categorisation',
  'regroupement',
] as const

export type Perimetre = (typeof PERIMETRES_CONNUS)[number]

/**
 * Clés de traduction EXIGEES par les dictionnaires.
 *
 * `ai_scope_${Perimetre}` : le type se construit à partir de la liste, donc
 * ajouter un périmètre ci-dessus rend sa clé obligatoire dans les deux
 * dictionnaires — sans qu'on ait à penser à la mettre à part.
 */
export type ClePerimetre = `ai_scope_${Perimetre}`

/**
 * Constructeur de la clé d'un périmètre.
 *
 * Typé en `string` et non en `ClePerimetre` : la valeur vient du SERVEUR, à
 * l'exécution, et peut être n'importe quoi — un périmètre ajouté en base,
 * donc absent de `PERIMETRES_CONNUS`. LeContraire, `libelleScope` le
 * signale et rend le code.
 */
export function clePerimetre(code: string): ClePerimetre {
  return `ai_scope_${code}` as ClePerimetre
}

/**
 * Libellé d'un périmètre, traduit, avec repli sur son CODE.
 *
 * `t()` rend la CLE quand elle est absente : sans comparaison, un
 * périmètre sans traduction afficherait `ai_scope_ocr_vision` à l'écran.
 *
 * Le repli sur le code — technique et lisible — est préféré à toute autre
 * valeur. Afficher une phrase dans la mauvaise langue ferait croire à une
 * panne d'interface alors que c'en est une de traduction ; le code, lui, se
 * comprend.
 *
 * Aucun `throw` ici : cette fonction est appelée au RENDU, et une exception
 * ferait tomber la page entière. Le contrôle de l'EXISTENCE des sept libellés
 * connus est fait par le TYPAGE — voir `Record<ClePerimetre, string>` dans
 * `messages.fr.ts`, qui échoue la construction sans rien casser à
 * l'exécution.
 */
export function libelleScope(
  code: string,
  t: (cle: string) => string,
): string {
  const cle = clePerimetre(code)
  const libelle = t(cle)

  if (libelle === cle) {
    // Périmètre ajouté EN BASE sans libellé client. Ni le typage ni la
    // compilation ne peuvent le voir : ils ne connaissent pas la base. Le
    // signaler ici est le seul endroit qui le peut.
    if (typeof console !== 'undefined') {
      console.warn(
        `[i18n] le périmètre « ${code} » n'a pas de libellé ` +
          `(${cle} absent des dictionnaires). Ajoutez-le en FR et en EN.`,
      )
    }
    return code
  }

  return libelle
}