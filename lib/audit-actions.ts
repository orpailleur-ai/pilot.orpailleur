/**
 * Les actions du JOURNAL, et leur libellé.
 *
 * ── Pourquoi un module à part ──────────────────────────────────────────────
 *
 * Deux écrans montrent le journal : la page `/audit`, qui en fait son
 * sujet, et le tableau de bord, qui en montre les dernières lignes. Les
 * deux doivent dire la MÊME chose — sinon le même acte s'appelle
 * « Création boulangerie » d'un côté et « tenant.create » de l'autre.
 *
 * Et le code brut n'a rien à faire dans une interface : `tenant.create`
 * parle à un developpeur, pas à un administrateur de plateforme. Le code
 * reste la CLE (il vient de l'API, il ne se traduit pas) ; le libellé, lui,
 * se traduit.
 */
export const ACTION_LABELS: Record<string, string> = {
  // Boulangerie
  'tenant.create': 'Création boulangerie',
  'tenant.update': 'Modification boulangerie',
  'tenant.delete': 'Suppression boulangerie',
  'tenant.activate': 'Activation boulangerie',
  'tenant.deactivate': 'Désactivation boulangerie',
  // User
  'user.create': 'Création utilisateur',
  'user.update': 'Modification utilisateur',
  'user.delete': 'Suppression utilisateur',
  'user.assign_role': 'Affectation rôle',
  'user.remove_role': 'Retrait rôle',
  // Subscription
  'subscription.create': 'Nouvel abonnement',
  'subscription.update': 'Modification abonnement',
  'subscription.cancel': 'Annulation abonnement',
  'subscription.expire': 'Expiration abonnement',
  // Plan
  'plan.create': 'Création plan',
  'plan.update': 'Modification plan',
  'plan.delete': 'Suppression plan',
  // Invoice
  'invoice.create': 'Création facture',
  'invoice.paid': 'Paiement facture',
  'invoice.overdue': 'Facture en retard',
  // Auth
  'auth.login': 'Connexion admin',
  'auth.logout': 'Déconnexion admin',
  'auth_impersonate': "Emprunt d'identité",
}

/** Les actions connues, triées — pour le filtre de la page `/audit`. */
export const KNOWN_ACTIONS = Object.keys(ACTION_LABELS).sort()

/**
 * Le libellé d'une action.
 *
 * Une action INCONNUE — venue d'une version plus récente de l'API, ou
 * d'une source qu'on n'a pas prévue — garde son code : mieux vaut un code
 * que rien du tout.
 */
export function libelleAction(action: string): string {
  return ACTION_LABELS[action] ?? action
}
