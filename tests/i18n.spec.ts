import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

/**
 * Toute clé UTILISÉE doit EXISTER dans les messages.
 *
 * Le helper `t()` ne lève pas d'erreur quand une clé manque : il renvoie la
 * clé ELLE-MÊME. L'écran affiche donc « required » ou « view » au lieu d'un
 * libellé — un défaut SILENCIEUX, que rien ne signale.
 *
 * Constaté sur le pilot, page par page, par le passage de la suite :
 * « all_statuses » sur la liste des utilisateurs, « invoice_paid » sur les
 * factures, « tenant_users » sur les utilisateurs d'une boulangerie,
 * « danger_zone » sur la zone sensible.
 *
 * Ce test ferme la porte : il parcourt les écrans, relève chaque `t('…')` et
 * vérifie que la clé existe dans les DEUX langues.
 */
function clesDeMessages(fichier: string): Set<string> {
  const source = readFileSync(fichier, 'utf-8')
  const cles = new Set<string>()
  for (const m of source.matchAll(/^ {2}([a-zA-Z0-9_]+):/gm)) cles.add(m[1])
  return cles
}

function clesUtilisees(): Map<string, string[]> {
  const usages = new Map<string, string[]>()
  const parcourir = (dossier: string): void => {
    for (const entree of readdirSync(dossier)) {
      if (entree === 'node_modules' || entree === '.next' || entree === '.git') continue
      const chemin = join(dossier, entree)
      if (statSync(chemin).isDirectory()) {
        parcourir(chemin)
        continue
      }
      if (!/\.(tsx|ts)$/.test(entree) || /\.spec\.ts$/.test(entree)) continue
      const source = readFileSync(chemin, 'utf-8')
      source.split('\n').forEach((ligne, index) => {
        for (const m of ligne.matchAll(/\bt\(\s*'([a-zA-Z0-9_]+)'/g)) {
          const cle = m[1]
          const liste = usages.get(cle) ?? []
          liste.push(`${chemin}:${index + 1}`)
          usages.set(cle, liste)
        }
      })
    }
  }
  parcourir('app')
  parcourir('components')
  return usages
}

test.describe('les clés i18n du pilot', () => {
  const fr = clesDeMessages('lib/i18n/messages.fr.ts')
  const en = clesDeMessages('lib/i18n/messages.en.ts')

  test('toute clé utilisée existe dans les deux langues', () => {
    const manquantes: string[] = []
    for (const [cle, ou] of clesUtilisees()) {
      if (!fr.has(cle)) manquantes.push(`${cle} (absent du FR) — ${ou[0]}`)
      if (!en.has(cle)) manquantes.push(`${cle} (absent de EN) — ${ou[0]}`)
    }
    expect(manquantes).toEqual([])
  })

  test('les deux langues ont le même nombre de clés', () => {
    // Un décalage signale une clé ajoutee d'un seul cote : l'autre langue
    // afficherait alors le code plutot qu'un libelle.
    expect(en.size).toBe(fr.size)
  })
})
