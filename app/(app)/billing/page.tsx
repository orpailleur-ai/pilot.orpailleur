import { redirect } from 'next/navigation'

/**
 * Ancienne page « Tableau de bord facturation ».
 *
 * Fusionnee dans /dashboard : un seul tableau de bord regroupe desormais
 * le cortege des tenants ET la facturation (MRR, sante des abonnements,
 * impayees) avec fenetre de temps et filtres. Les liens enregistres
 * en favoris continuent d'aboutir.
 */
export default function BillingPage() {
  redirect('/dashboard')
}
