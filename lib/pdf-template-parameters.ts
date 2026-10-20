/**
 * Catalogue des paramètres Handlebars d'un type de document.
 *
 * Ce catalogue est la VERSION LISIBLE du contrat exposé par l'API
 * (`commandes-template.sample.ts` côté api.orpailleur). Il sert à deux
 * choses : la liste des variables affichées à l'utilisateur, et le prompt
 * copié vers un agent IA.
 *
 * Il est VOLONTAIREMENT dupliqué plutôt que récupéré de l'API : l'API
 * expose déjà les variables (`/admin/pdf-templates/scopes`), mais le
 * prompt doit aussi expliquer les helpers, la syntaxe Handlebars et la
 * façon d'afficher un logo — autant de choses qui n'ont pas leur place
 * dans une liste de noms de champs. Dupliquer une liste de 40 lignes
 * coûte moins cher qu'un aller-retour réseau sur une page qui doit
 * rester instantanée.
 *
 * Toute variable annoncée ici DOIT exister dans le payload de rendu.
 */

export interface TemplateParameter {
  /** Chemin Handlebars, tel qu'il s'écrit dans le gabarit. */
  name: string
  /** Libellé français. */
  label: string
  /** Type de la valeur, pour que l'utilisateur sache ce qu'il attend. */
  type: 'string' | 'number' | 'date' | 'boolean' | 'url'
  /** Regroupement, pour la présentation. */
  group: string
}

/**
 * Helpers Handlebars enregistrés par le moteur PDF.
 *
 * Le moteur les déclare au démarrage du service documents : un gabarit
 * peut donc les appeler sans aucune déclaration préalable.
 */
export const TEMPLATE_HELPERS: Array<{ signature: string; description: string }> = [
  { signature: 'formatCurrency(montant)', description: 'Montant en centimes → « 85,00 € »' },
  { signature: 'formatDate(date)', description: 'Date → « 15 janvier 2026 »' },
  { signature: 'formatDateShort(date)', description: 'Date → « 15 janv. 2026 »' },
  { signature: 'statusLabel(statut)', description: 'Statut → libellé français (« Brouillon », « Payée »…)' },
  { signature: 'tvaRate(taux)', description: 'Taux → « 20% »' },
  { signature: 'Devise(code)', description: 'Code devise → « EUR »' },
  // Le helper est enregistre sous le nom `ifDevis` (et non `ifDevise`) :
  // le recopier tel quel produirait « Missing helper » au rendu, et le
  // document entier echouerait.
  { signature: 'ifDevis(code)', description: 'Bloc exécuté si la devise est l’EUR' },
]

/**
 * Paramètres par type de document.
 *
 * `commande` est le seul type enregistré côté API pour l'instant ; les
 * autres scopes existent dans le catalogue de l'API mais n'ont pas de
 * kind, donc pas de payload — et pas d'aperçu possible.
 */
const PARAMETERS_BY_SCOPE: Record<string, TemplateParameter[]> = {
  commande: [
    { name: 'commande.id', label: 'ID de la commande', type: 'string', group: 'commande' },
    { name: 'commande.numero', label: 'Numéro de commande', type: 'string', group: 'commande' },
    { name: 'commande.date_commande', label: 'Date de commande', type: 'date', group: 'commande' },
    { name: 'commande.date_livraison_prevue', label: 'Date de livraison prévue', type: 'date', group: 'commande' },
    { name: 'commande.date_reception', label: 'Date de réception', type: 'date', group: 'commande' },
    { name: 'commande.statut', label: 'Statut (brouillon, envoyee, receptionnee)', type: 'string', group: 'commande' },
    { name: 'commande.montant_total_ht', label: 'Montant total HT (centimes)', type: 'number', group: 'commande' },
    { name: 'commande.frais_port_estime', label: 'Frais de port estimés (centimes)', type: 'number', group: 'commande' },
    { name: 'commande.franco_estime', label: 'Franco estimé', type: 'boolean', group: 'commande' },
    { name: 'commande.source', label: 'Source (manual, ocr…)', type: 'string', group: 'commande' },
    { name: 'commande.created_at', label: 'Date de création', type: 'date', group: 'commande' },

    { name: 'fournisseur.nom', label: 'Nom du fournisseur', type: 'string', group: 'fournisseur' },
    { name: 'fournisseur.adresse', label: 'Adresse', type: 'string', group: 'fournisseur' },
    { name: 'fournisseur.telephone', label: 'Téléphone', type: 'string', group: 'fournisseur' },
    { name: 'fournisseur.email', label: 'Email', type: 'string', group: 'fournisseur' },
    { name: 'fournisseur.siret', label: 'SIRET', type: 'string', group: 'fournisseur' },
    { name: 'fournisseur.siren', label: 'SIREN', type: 'string', group: 'fournisseur' },
    { name: 'fournisseur.delai_paiement', label: 'Délai de paiement (jours)', type: 'number', group: 'fournisseur' },
    { name: 'fournisseur.etat', label: 'État du fournisseur', type: 'string', group: 'fournisseur' },
    { name: 'fournisseur.franco_type', label: 'Type de franco', type: 'string', group: 'fournisseur' },
    { name: 'fournisseur.franco_valeur', label: 'Valeur du franco', type: 'number', group: 'fournisseur' },
    { name: 'fournisseur.frais_port_type', label: 'Type de frais de port', type: 'string', group: 'fournisseur' },
    { name: 'fournisseur.frais_port_montant', label: 'Montant des frais de port', type: 'number', group: 'fournisseur' },
    { name: 'fournisseur.frais_port_texte', label: 'Texte des frais de port', type: 'string', group: 'fournisseur' },
    { name: 'fournisseur.logo_url', label: 'Logo du fournisseur (URL)', type: 'url', group: 'fournisseur' },

    { name: 'tenant.nom', label: 'Nom de la boulangerie', type: 'string', group: 'tenant' },
    { name: 'tenant.adresse', label: 'Adresse', type: 'string', group: 'tenant' },
    { name: 'tenant.ville', label: 'Ville', type: 'string', group: 'tenant' },
    { name: 'tenant.code_postal', label: 'Code postal', type: 'string', group: 'tenant' },
    { name: 'tenant.telephone', label: 'Téléphone', type: 'string', group: 'tenant' },
    { name: 'tenant.email', label: 'Email', type: 'string', group: 'tenant' },
    { name: 'tenant.siret', label: 'SIRET', type: 'string', group: 'tenant' },
    { name: 'tenant.siren', label: 'SIREN', type: 'string', group: 'tenant' },
    { name: 'tenant.plan', label: 'Formule (starter, pro, business)', type: 'string', group: 'tenant' },
    { name: 'tenant.logo_url', label: 'Logo de la boulangerie (URL)', type: 'url', group: 'tenant' },
    { name: 'tenant.favicon_url', label: 'Favicon de la boulangerie (URL)', type: 'url', group: 'tenant' },

    { name: 'lignes[].matiere_premiere_fournisseur.matiere_premiere.nom', label: 'Nom de la matière', type: 'string', group: 'lignes' },
    { name: 'lignes[].matiere_premiere_fournisseur.matiere_premiere.designation_interne', label: 'Désignation interne de la matière', type: 'string', group: 'lignes' },
    { name: 'lignes[].matiere_premiere_fournisseur.code_fournisseur', label: 'Référence fournisseur', type: 'string', group: 'lignes' },
    { name: 'lignes[].matiere_premiere_fournisseur.unite', label: 'Unité chez le fournisseur', type: 'string', group: 'lignes' },
    { name: 'lignes[].quantite_commandee', label: 'Quantité commandée', type: 'number', group: 'lignes' },
    { name: 'lignes[].unite', label: 'Unité', type: 'string', group: 'lignes' },
    { name: 'lignes[].prix_unitaire_ht', label: 'Prix unitaire HT (centimes)', type: 'number', group: 'lignes' },
    { name: 'lignes[].montant_ht', label: 'Montant HT de la ligne (centimes)', type: 'number', group: 'lignes' },
    { name: 'lignes[].quantite_receptionnee', label: 'Quantité reçue', type: 'number', group: 'lignes' },
  ],
}

/** Paramètres d'un type de document — tableau vide si le type est inconnu. */
export function parametersForScope(scope: string): TemplateParameter[] {
  return PARAMETERS_BY_SCOPE[scope] ?? []
}

/** Libellés français des groupes, dans l'ordre d'affichage. */
export const PARAMETER_GROUP_LABELS: Record<string, string> = {
  commande: 'Commande',
  fournisseur: 'Fournisseur',
  tenant: 'Boulangerie',
  lignes: 'Lignes de commande',
}
