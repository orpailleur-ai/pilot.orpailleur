/**
 * Les types d'activité d'une entreprise cliente (miroir de l'API :
 * `api.orpailleur/src/tenants/types-activite.ts`, et de la contrainte de la
 * migration 072). Les libellés sont les clés `activity_<type>`.
 */
export const TYPES_ACTIVITE = ['boulangerie', 'patisserie', 'restaurant', 'snack', 'traiteur', 'epicerie', 'autre'] as const
export type TypeActivite = (typeof TYPES_ACTIVITE)[number]
export const TYPE_ACTIVITE_DEFAUT: TypeActivite = 'boulangerie'
