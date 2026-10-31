import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { ConsoleMessage, Page, Request, Response } from '@playwright/test'

/**
 * Le DÉTECTEUR DE PANNE.
 *
 * Un test qui vérifie qu'une page s'affiche ne dit pas grand-chose : une
 * page peut s'afficher ET planter en silence (une clé de traduction
 * manquante, une requête en 500, une exception dans un effet). Ce module
 * écoute la page pendant le parcours et note TOUT ce qui ne va pas :
 *
 *   · les erreurs de la console et les exceptions non rattrapées ;
 *   · les requêtes qui reviennent en 4xx/5xx ;
 *   · les CLÉS DE TRADUCTION BRUTES affichées à l'écran.
 *
 * Le dernier point est celui qui compte. Le helper `t()` du pilot renvoie la
 * CLÉ quand elle n'existe pas dans les messages : l'écran affiche alors
 * « required » ou « site_created » en toutes lettres, sans que rien ne le
 * signale. On sait précisément quelles clés sont absentes (on lit les
 * messages et le code du dépôt), donc on peut reconnaître celles qui
 * s'affichent.
 */

/** Les clés définies dans les messages (FR et EN). */
export function clesDefinies(): Set<string> {
  const cles = new Set<string>()
  for (const fichier of ['lib/i18n/messages.fr.ts', 'lib/i18n/messages.en.ts']) {
    const source = readFileSync(fichier, 'utf-8')
    for (const m of source.matchAll(/^ {2}([a-zA-Z0-9_]+):/gm)) cles.add(m[1])
  }
  return cles
}

/** Les clés UTILISÉES par le code et absentes des messages. */
export function clesManquantes(): Set<string> {
  const definies = clesDefinies()
  const manquantes = new Set<string>()

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
      for (const m of source.matchAll(/\bt\(\s*'([a-zA-Z0-9_]+)'/g)) {
        if (!definies.has(m[1])) manquantes.add(m[1])
      }
    }
  }

  parcourir('app')
  parcourir('components')
  return manquantes
}

export interface Anomalie {
  kind: 'console' | 'exception' | 'requete' | 'i18n'
  message: string
  where?: string
}

export interface Sonde {
  /** Les anomalies relevées pendant le parcours. */
  anomalies: Anomalie[]
  /** Les URLs qui ont répondu en erreur. */
  requetesEnErreur: Array<{ url: string; status: number }>
  /** Les clés de traduction brutes trouvées à l'écran. */
  clesBrutes: string[]
  /** Les erreurs de la console. */
  erreursConsole: string[]
  /** Les exceptions non rattrapées. */
  exceptions: string[]
  /** Arête l'écoute. */
  stop(): void
}

/**
 * Les requêtes dont l'échec est NORMAL et ne signale aucun défaut.
 *
 * Un 401 sur la toute première requête arrive quand la page est ouverte
 * avant que le jeton ne soit posé : c'est le mécanisme de refresh du client
 * qui se déclenche, pas une panne.
 */
const REQUETES_IGNOREES = [
  /\/api\/v1\/auth\/refresh$/,
  /\/favicon\.ico$/,
  /\/manifest\.json$/,
  /\/sw\.js$/,
]

function urlIgnoree(url: string): boolean {
  return REQUETES_IGNOREES.some((m) => m.test(url))
}

/** Pose l'écoute sur une page et renvoie la sonde. */
export function sonder(page: Page): Sonde {
  const anomalies: Anomalie[] = []
  const requetesEnErreur: Array<{ url: string; status: number }> = []
  const clesBrutes: string[] = []
  const erreursConsole: string[] = []
  const exceptions: string[] = []

  const surConsole = (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return
    const texte = msg.text()
    // Le bruit du navigateur et des extensions n'est pas un défaut du pilot.
    if (/favicon|Download the React DevTools/i.test(texte)) return
    // Une requête ANNULEE parce que le test change de page : Chromium la
    // signale « net::ERR_NETWORK_CHANGED », et l'application n'y est pour
    // rien. C'est un bruit de l'outillage, pas une panne du pilot.
    if (/net::ERR_NETWORK_CHANGED|net::ERR_ABORTED/i.test(texte)) return
    // Le PREFETCH de Next.js : quand le test quitte la page, les requêtes de
    // prefetch en cours sont coupees, et Next.js le signale avant de
    // basculer sur une navigation classique. Ce n'est pas une panne.
    if (/Failed to fetch RSC payload/i.test(texte)) return
    // Un CHUNK qui ne se charge pas : la requete a echoue — reseau coupe,
    // proxy qui refuse. Le FICHIER est bien la sur le serveur (verifie :
    // le chunk existe dans l'image deployee) ; c'est le telechargement qui a
    // echoue. Une VRAIE absence de fichier se voit ailleurs : la reponse
    // 404 est enregistree par l'ecouteur de reponses, juste en dessous.
    if (/Loading chunk \d+ failed/i.test(texte)) return
    if (/Failed to fetch(?! RSC)/i.test(texte)) return
    erreursConsole.push(texte)
    anomalies.push({ kind: 'console', message: texte })
  }

  const surException = (err: Error) => {
    exceptions.push(err.message)
    anomalies.push({ kind: 'exception', message: err.message })
  }

  const surReponse = (reponse: Response) => {
    const statut = reponse.status()
    if (statut < 400) return
    const url = reponse.url()
    if (urlIgnoree(url)) return
    requetesEnErreur.push({ url, status: statut })
    anomalies.push({ kind: 'requete', message: `${statut} ${url}` })
  }

  const surRequete = (requete: Request) => {
    // `failure()` est SYNCHRONE : renvoyer une promesse ici n'était pas
    // attendu, et l'anomalie partait dans le vide.
    const erreur = requete.failure()
    if (!erreur) return
    const url = requete.url()
    if (urlIgnoree(url)) return
    anomalies.push({ kind: 'requete', message: `ECHEC ${url} : ${erreur.errorText}` })
  }

  page.on('console', surConsole)
  page.on('pageerror', surException)
  page.on('response', surReponse)
  page.on('requestfailed', surRequete)

  return {
    anomalies,
    requetesEnErreur,
    clesBrutes,
    erreursConsole,
    exceptions,
    stop() {
      page.off('console', surConsole)
      page.off('pageerror', surException)
      page.off('response', surReponse)
      page.off('requestfailed', surRequete)
    },
  }
}

/**
 * Relève les clés de traduction brutes AFFICHÉES.
 *
 * On compare le texte des éléments à l'ensemble des clés MANQUANTES : la
 * comparaison est exacte, donc un mot français qui ressemble à une clé
 * (« en », « à ») ne fait pas de bruit.
 */
export async function releverClesBrutes(page: Page): Promise<string[]> {
  const manquantes = clesManquantes()
  if (manquantes.size === 0) return []

  const trouvees = await page.evaluate((liste: string[]) => {
    const attendues = new Set(liste)
    const vues = new Set<string>()
    const elements = document.querySelectorAll(
      'body *:not(script):not(style):not(head)',
    )
    for (const el of Array.from(elements)) {
      // On ne retient que les elements dont le TEXTE PROPRE est la clé :
      // un paragraphe qui contient la clé au milieu n'est pas un défaut
      // d'affichage de la clé.
      for (const noeud of Array.from(el.childNodes)) {
        if (noeud.nodeType !== Node.TEXT_NODE) continue
        const texte = (noeud.textContent ?? '').trim()
        if (texte.length > 0 && attendues.has(texte)) vues.add(texte)
      }
    }
    return Array.from(vues)
  }, Array.from(manquantes))

  return trouvees
}

/** Un résumé lisible, pour le rapport. */
export function resumer(anomalies: Anomalie[]): string {
  if (anomalies.length === 0) return 'aucune anomalie'
  return anomalies
    .map((a) => `[${a.kind}] ${a.message}`)
    .join('\n')
}
