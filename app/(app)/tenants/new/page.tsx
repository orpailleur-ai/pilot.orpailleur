import { redirect } from 'next/navigation'

/**
 * L'assistant en quatre étapes a disparu : la création d'une boulangerie est un
 * seul formulaire, ouvert depuis la liste. Les anciens liens y renvoient.
 */
export default function NouvelleBoulangerieRedirect() {
  redirect('/tenants?nouvelle=1')
}
