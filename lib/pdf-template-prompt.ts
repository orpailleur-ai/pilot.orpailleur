/**
 * Construction du prompt « copie vers un agent IA ».
 *
 * L'utilisateur veut pouvoir établir un dialogue avec un assistant pour
 * faire évoluer un gabarit de document. Pour que l'assistant ne fasse
 * pas n'importe quoi, il lui faut trois choses : le gabarit actuel, la
 * liste EXACTE des variables disponibles, et la syntaxe du moteur.
 *
 * Le prompt contient ces trois choses, et rien d'autre : pas de valeurs
 * d'exemple, pas de données de démonstration. Un assistant qui recopie
 * « Farine T55 » dans le gabarit produirait un document qui affiche
 * « Farine T55 » sur toutes les commandes.
 */
import {
  PARAMETER_GROUP_LABELS,
  TEMPLATE_HELPERS,
  parametersForScope,
  type TemplateParameter,
} from '@/lib/pdf-template-parameters'

/** Libellé d'un type, tel qu'il apparaît dans l'interface. */
const SCOPE_LABELS: Record<string, string> = {
  commande: 'Bon de commande',
  facture: 'Facture fournisseur',
  reception: 'Bon de réception',
  inventaire: "État d'inventaire",
}

/** Longueur maximale d'une ligne de paramètre dans le prompt. */
const NAME_WIDTH = 62

function groupParameters(parameters: TemplateParameter[]): Array<[string, TemplateParameter[]]> {
  const groups = new Map<string, TemplateParameter[]>()
  for (const p of parameters) {
    const list = groups.get(p.group)
    if (list) list.push(p)
    else groups.set(p.group, [p])
  }
  // L'ordre des groupes suit celui du catalogue, pas celui des clés.
  return [...groups.entries()]
}

/**
 * Compose le prompt à copier.
 *
 * @param scope    Type de document ('commande', 'facture'…).
 * @param name     Nom du modèle, pour que l'assistant sache de quoi on parle.
 * @param body     Le gabarit HTML/Handlebars actuel.
 */
export function buildTemplatePrompt(scope: string, name: string, body: string): string {
  const parameters = parametersForScope(scope)
  const scopeLabel = SCOPE_LABELS[scope] ?? scope

  const lines: string[] = []

  lines.push(
    `Tu m'aides à écrire le gabarit HTML d'un document « ${scopeLabel} » pour Orpailleur.`,
    '',
    `Le gabarit est un template Handlebars : le moteur le rend en PDF.`,
    `Mon modèle s'appelle « ${name} ».`,
    '',
    'Voici le gabarit actuel :',
    '',
    '--- DÉBUT DU GABARIT ---',
    body,
    '--- FIN DU GABARIT ---',
    '',
  )

  if (parameters.length > 0) {
    lines.push('Voici les variables disponibles, et RIEN D’AUTRE :', '')
    for (const [group, list] of groupParameters(parameters)) {
      lines.push(`${PARAMETER_GROUP_LABELS[group] ?? group} :`)
      for (const p of list) {
        const padded = p.name.padEnd(NAME_WIDTH, ' ')
        lines.push(`  ${padded} ${p.type} — ${p.label}`)
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
      'Ce type de document n’a pas encore de variables publiées : demande-moi',
      'ce que tu as besoin de savoir avant d’écrire quoi que ce soit.',
      '',
    )
  }

  lines.push('Helpers Handlebars disponibles (appelle-les directement) :', '')
  for (const h of TEMPLATE_HELPERS) {
    lines.push(`  ${h.signature.padEnd(NAME_WIDTH, ' ')} ${h.description}`)
  }
  lines.push('')

  lines.push(
    'Pour afficher un logo, utilise une balise HTML classique — il n’y a pas de',
    'helper pour ça :',
    '',
    '  {{#if fournisseur.logo_url}}',
    '    <img src="{{ fournisseur.logo_url }}" style="max-height:48px" />',
    '  {{/if}}',
    '',
    'Le logo de la boulangerie est `tenant.logo_url`, celui du fournisseur est',
    '`fournisseur.logo_url`. Les deux sont des URL d’images : mets-les dans un',
    '`<img>` et n’ajoute pas de texte autour.',
    '',
    'Pour une ligne, itère sur `lignes` :',
    '',
    '  {{#each lignes}}',
    '    <tr>',
    '      <td>{{ matiere_premiere_fournisseur.matiere_premiere.nom }}</td>',
    '      <td>{{ quantite_commandee }} {{ unite }}</td>',
    '      <td>{{ formatCurrency prix_unitaire_ht }}</td>',
    '    </tr>',
    '  {{/each}}',
    '',
    'Les montants sont stockés en CENTIMES : utilise `formatCurrency` pour les',
    'afficher, ne les divise pas toi-même.',
    '',
    'Règles :',
    '  - ne renvoie que le gabarit HTML, sans explication ni bloc de code ;',
    '  - conserve le style CSS déjà présent ;',
    '  - n’utilise que les variables listées ci-dessus.',
    '',
    'Ma demande :',
    '',
  )

  return lines.join('\n')
}
