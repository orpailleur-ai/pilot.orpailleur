/**
 * Construction du prompt « copié vers un agent IA ».
 *
 * Même principe que `pdf-template-prompt.ts`, adapté au gabarit d'email :
 * l'utilisateur veut pouvoir discuter avec un assistant (ChatGPT, Claude,
 * Copilot…) pour faire évoluer un gabarit d'email.
 *
 * Pour que l'assistant ne fasse pas n'importe quoi, il lui faut trois
 * choses : le gabarit actuel, la liste EXACTE des variables disponibles, et
 * la syntaxe du moteur.
 *
 * Le prompt contient ces trois choses, et rien d'autre : PAS de valeurs
 * d'exemple, PAS de données de démonstration. Un assistant qui recopierait
 * « Commande CMD-2026-001 » produirait un email qui l'affiche sur TOUTES
 * les commandes.
 *
 * ── Pourquoi les variables viennent de l'API ────────────────────────────────
 *
 * Pour les documents PDF, la liste vit dans un catalogue côté client
 * (`lib/pdf-template-parameters.ts`), dupliqué depuis l'API.
 *
 * Pour les emails, la liste vient DIRECTEMENT de l'API : le registre des
 * scopes (`EMAIL_SCOPES`) est la seule source de verite, et l'ecran
 * d'edition le recoit deja dans `scopeDef.variables`. Dupliquer cette liste
 * ici serait creer un second endroit a maintenir — et c'est exactement le
 * piege que le catalogue PDF a deja pose.
 */

import type { EmailTemplateVariable } from './email-client'

/** Libelles des scopes, en francais. */
const SCOPE_LABELS: Record<string, string> = {
  commande_envoyee: 'Commande envoyée au fournisseur',
  facture_impayee: 'Alerte facture impayée',
  reception_validated: 'Réception validée',
  stock_bas: 'Alerte stock bas',
  abonnement_renouvele: 'Abonnement renouvelé',
  notif_generic: 'Notification générique',
}

/**
 * Libelles des groupes de variables.
 *
 * Le groupe est le PREMIER segment du nom de la variable
 * (`facture.numero` -> « facture »). Ce n'est pas la nomenclature du
 * document PDF : celle-ci existe parce que le catalogue PDF declare un champ
 * `group`. Ici, la convention est deduite du nom — et c'est le nom qui fait
 * foi, puisque c'est lui que le moteur resout.
 */
const GROUP_LABELS: Record<string, string> = {
  commande: 'Commande',
  facture: 'Facture',
  fournisseur: 'Fournisseur',
  tenant: 'Boulangerie',
  boulangerie: 'Boulangerie',
  matiere: 'Article / matière',
  plan: 'Formule d’abonnement',
  lien_pdf: 'Lien vers le document',
  body: 'Contenu',
  link: 'Lien',
  title: 'Titre',
  ecarts_montant: 'Écarts de montant',
  jours_retard: 'Retard',
  nb_factures_impayees: 'Nombre de factures impayées',
  date_prochaine_facturation: 'Prochaine facturation',
}

/**
 * Helpers Handlebars enregistres par le moteur d'email.
 *
 * Le moteur d'email enregistre `formatCurrency`, `formatDate` et
 * `formatDateShort` (`api.orpailleur/src/email/templates/email-helpers.ts`).
 * Le moteur PDF en enregistre d'autres (`statusLabel`, `tvaRate`, `Devise`) :
 * ils ne sont PAS disponibles ici, et les citer ferait ecrire un gabarit
 * qui echoue au rendu.
 */
const EMAIL_HELPERS: Array<{ signature: string; description: string }> = [
  { signature: 'formatCurrency(montant)', description: 'Montant en centimes → « 85,00 € »' },
  { signature: 'formatDate(date)', description: 'Date → « 15 janvier 2026 »' },
  { signature: 'formatDateShort(date)', description: 'Date → « 15 janv. 2026 »' },
]

/** Largeur maximale d'une ligne de variable dans le prompt. */
const NAME_WIDTH = 46

/**
 * Regroupe les variables par leur premier segment.
 *
 * L'ordre des groupes suit celui des variables, pas celui des cles : un
 * agent lit la liste dans l'ordre du gabarit, pas par ordre alphabetique.
 */
function groupVariables(variables: EmailTemplateVariable[]): Array<[string, EmailTemplateVariable[]]> {
  const groups = new Map<string, EmailTemplateVariable[]>()
  for (const v of variables) {
    const group = v.name.split('.')[0]
    const list = groups.get(group)
    if (list) list.push(v)
    else groups.set(group, [v])
  }
  return [...groups.entries()]
}

/**
 * Compose le prompt a copier.
 *
 * @param scope      Scope du template ('facture_impayee'…).
 * @param name       Nom du template, pour que l'assistant sache de quoi on parle.
 * @param subject    Sujet actuel.
 * @param bodyHtml   Corps HTML actuel.
 * @param variables  Variables disponibles, telles que l'API les a renvoyees.
 */
export function buildEmailTemplatePrompt(
  scope: string,
  name: string,
  subject: string,
  bodyHtml: string,
  variables: EmailTemplateVariable[],
): string {
  const scopeLabel = SCOPE_LABELS[scope] ?? scope

  const lines: string[] = []

  lines.push(
    `Tu m'aides à écrire le gabarit d'un email « ${scopeLabel} » pour Orpailleur.`,
    '',
    `Le gabarit est un template Handlebars : le moteur le rend en email HTML.`,
    `Mon template s'appelle « ${name} ».`,
    '',
    'Voici le SUJET actuel :',
    '',
    '--- DÉBUT DU SUJET ---',
    subject || '(vide)',
    '--- FIN DU SUJET ---',
    '',
    'Voici le CORPS actuel :',
    '',
    '--- DÉBUT DU CORPS ---',
    bodyHtml || '(vide)',
    '--- FIN DU CORPS ---',
    '',
  )

  if (variables.length > 0) {
    lines.push('Voici les variables disponibles, et RIEN D’AUTRE :', '')
    for (const [group, list] of groupVariables(variables)) {
      lines.push(`${GROUP_LABELS[group] ?? group} :`)
      for (const v of list) {
        const padded = v.name.padEnd(NAME_WIDTH, ' ')
        const required = v.required ? ' (obligatoire)' : ''
        lines.push(`  ${padded} — ${v.label}${required}`)
      }
      lines.push('')
    }
    lines.push(
      'Une variable qui n’est pas dans cette liste rend une cellule VIDE en production.',
      'Si tu as besoin d’une information qui n’y est pas, dis-le : ne l’invente pas.',
      '',
    )
  } else {
    lines.push(
      'Ce type d’email n’a pas encore de variables publiées : demande-moi',
      'ce que tu as besoin de savoir avant d’écrire quoi que ce soit.',
      '',
    )
  }

  lines.push('Helpers Handlebars disponibles (appelle-les directement) :', '')
  for (const h of EMAIL_HELPERS) {
    lines.push(`  ${h.signature.padEnd(NAME_WIDTH, ' ')} ${h.description}`)
  }
  lines.push('')

  lines.push(
    'La syntaxe Handlebars, en bref :',
    '',
    '  {{ variable }}          → la valeur, échappée (le HTML est rendu en texte)',
    '  {{{ variable }}}        → la valeur brute, NON échappée',
    '  {{#if variable}}…{{/if}} → un bloc conditionnel',
    '  {{#each lignes}}…{{/each}} → une boucle sur une liste',
    '  {{#with commande}}…{{/with}} → change le contexte ({{ numero }} = commande.numero)',
    '',
    'Pour une ligne, itère sur `lignes` :',
    '',
    '  {{#each lignes}}',
    '    <li>{{ designation }} — {{ quantite }}</li>',
    '  {{/each}}',
    '',
    'Les montants sont stockés en CENTIMES : utilise `formatCurrency` pour les',
    'afficher, ne les divise pas toi-même.',
    '',
    'Le corps est un email : il part dans une boite mail, pas sur un écran.',
    'Privilégie une mise en page SIMPLE — des tableaux ou des styles en ligne,',
    'pas de flexbox ni de grille, et des images dont tu as l’URL (logo).',
    '',
    'Règles :',
    '  - ne renvoie que le gabarit (sujet et corps), sans explication ni bloc de code ;',
    '  - conserve le style CSS déjà présent ;',
    '  - n’utilise que les variables listées ci-dessus ;',
    '  - le SUJET se remplit aussi : {{ }} y fonctionne, et c’est la première',
    '    chose que le destinataire lit.',
    '',
    'Ma demande :',
    '',
  )

  return lines.join('\n')
}
