import { redirect } from 'next/navigation'

/**
 * L'historique d'une configuration IA : la VRAIE page est ailleurs.
 *
 * Cette route a été écrite comme un prototype — configuration factice,
 * timeline factice, et un lien « Retour » vers `/ai-config/<id>`, route qui
 * n'a jamais existé (404 à chaque visite).
 *
 * L'historique réel, lui, est sur la fiche du modèle : elle charge
 * `/admin/ai-modeles/<id>/historique` et affiche les modifications. Deux
 * écrans pour la même chose, dont un factice, c'est l'un des deux qu'on
 * supprime.
 *
 * On garde la route, mais elle RENVOIE vers la fiche : une URL déjà
 * diffusée (un lien dans un e-mail, un signet) continue de fonctionner, et
 * l'utilisateur atterrit sur l'écran qui montre la vérité.
 */
export default async function AIConfigHistoryRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/parametrage/modeles/${id}`)
}
