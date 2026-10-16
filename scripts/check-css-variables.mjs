#!/usr/bin/env node
/**
 * check-css-variables — aucune référence `var(--*)` ne doit rester sans définition.
 *
 * ── Pourquoi ce contrôle existe ─────────────────────────────────────────────
 *
 * `--color-surface` a été utilisé 49 fois dans pilot alors que la variable
 * n'a jamais été déclarée. Le vrai nom, publié par Astryx, est
 * `--color-background-surface`. Même défaut pour `--radius-sm|md|lg|xl` :
 * `tailwind.config.ts` les mappe depuis le début, aucune feuille ne les
 * déclarait, et chaque `rounded-lg` revenait à un angle droit.
 *
 * Ce type de faute ne se voit NI au typecheck (une variable CSS est une
 * chaîne : toujours valide pour TypeScript) NI au build, NI en CI. Le
 * navigateur, lui, ignore en silence une substitution non résolue : la
 * déclaration ne s'applique pas et la valeur se déduit de l'héritage. Un fond
 * devenu transparent se confond avec un choix graphique, c'est ce qui rend la
 * faute invisible.
 *
 * Le pire aggravant est `color-mix(in srgb, var(--x) 60%, transparent)` : un
 * `color-mix` dont un opérande ne résout pas est invalide dans son ensemble,
 * si bien que la déclaration disparaît entièrement.
 *
 * ── Pourquoi une analyse de source plutôt qu'un test de rendu ───────────────
 *
 * Un test DOM ne verrait le défaut que sur les pages visitées, et un
 * `--color-*` cassé passe inaperçu partout ailleurs. La vérification porte donc
 * sur les RÉFÉRENCES, pas sur les rendus : si une variable n'est déclarée
 * nulle part, ce contrôle échoue, quelle que soit la page.
 *
 * Console fait la même vérification sous vitest (`src/lib/css-variables.test.ts`).
 * Ce script en est l'équivalent pour pilot, qui n'a pas de runner de tests :
 * un script node, plutôt qu'une dépendance de développement de plus.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SELF = fileURLToPath(import.meta.url)
const SCANNED = ['.ts', '.tsx', '.js', '.jsx', '.css']

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (SCANNED.some((ext) => entry.endsWith(ext))) out.push(full)
  }
  return out
}

/**
 * Tous les fichiers source, hors dépendances, artifacts de build et ce
 * script-ci : un analyseur ne doit pas se scanner lui-même, ses motifs
 * contiendraient les chaînes qu'il traque.
 */
function sourceFiles() {
  return walk(REPO).filter(
    (f) => !f.includes('/.next/') && !f.endsWith('.d.ts') && f !== SELF,
  )
}

/** Les variables `--color-surface` n'existent pas : la faute à ne pas refaire. */
const KNOWN_TRAPS = {
  '--color-surface': '--color-background-surface',
  '--color-text-muted': '--color-text-secondary',
  '--color-text-tertiary': '--color-text-secondary',
  '--color-border-default': '--color-border',
  '--color-accent-subtle': '--color-accent-muted',
}

function declaredVariables() {
  const declared = new Set()
  const collect = (css) => {
    for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:/gi)) declared.add(m[1])
  }

  for (const sheet of ['app/globals.css', 'app/layers.css']) {
    collect(readFileSync(join(REPO, sheet), 'utf8'))
  }

  for (const candidate of [
    'node_modules/@astryxdesign/core/dist/astryx.css',
    'node_modules/@astryxdesign/core/dist/index.css',
    'node_modules/@astryxdesign/core/astryx.css',
  ]) {
    try {
      collect(readFileSync(join(REPO, candidate), 'utf8'))
      break
    } catch {
      // Feuille absente à cet emplacement : on essaie le suivant.
    }
  }

  return declared
}

/**
 * Retirer les commentaires avant analyse : une syntaxe CSS citée en commentaire
 * décrit ce qu'on a fait ou ce qu'on aurait pu faire, pas ce que la page rend.
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
}

/** Variables que `next/font` publie via son option `variable`. */
function nextFontVariables() {
  const injected = new Set()
  for (const file of sourceFiles()) {
    const css = stripComments(readFileSync(file, 'utf8'))
    for (const m of css.matchAll(/variable\s*:\s*['"](--[a-z0-9-]+)['"]/g)) injected.add(m[1])
  }
  return injected
}

/**
 * Les variables RÉELLEMENT référencées.
 *
 * `var(--x, repli)` est ignoré : le repli résout à lui seul. Le motif exige
 * une `)` et refuse la virgule — c'est tout ce qui sépare un vrai orphelin
 * d'une référence volontairement défensive.
 */
function referencedVariables() {
  const injected = nextFontVariables()
  const refs = new Map()

  for (const file of sourceFiles()) {
    const css = stripComments(readFileSync(file, 'utf8'))
    for (const m of css.matchAll(/var\(\s*(--[a-z0-9-]+)\s*\)/gi)) {
      const name = m[1]
      if (injected.has(name)) continue
      if (!refs.has(name)) refs.set(name, [])
      refs.get(name).push(relative(REPO, file))
    }
  }
  return refs
}

const declared = declaredVariables()
const refs = referencedVariables()

if (refs.size === 0) {
  console.error('ÉCHEC — l’analyse n’a trouvé aucune référence à vérifier.')
  console.error('Un analyseur cassé ferait passer ce contrôle pour une fausse raison.')
  process.exit(1)
}

const orphans = []
for (const [name, files] of refs) {
  if (declared.has(name)) continue
  const hint = KNOWN_TRAPS[name]
  const where = [...new Set(files)]
  orphans.push(
    `  ${name}` +
      (hint ? `\n    nom réel probable : ${hint}` : '') +
      `\n    ${files.length} usage(s) : ${where.slice(0, 3).join(', ')}` +
      (where.length > 3 ? ` (+${where.length - 3} autres)` : ''),
  )
}

if (orphans.length > 0) {
  console.error(`ÉCHEC — ${orphans.length} variable(s) CSS référencée(s) sans définition :\n`)
  console.error(orphans.join('\n') + '\n')
  console.error('Une substitution non résolue est ignorée par le navigateur : la')
  console.error('déclaration ne s’applique pas, silencieusement. Ni le typecheck ni le')
  console.error('build ne la verront — seul ce contrôle le fait.')
  process.exit(1)
}

console.log(`OK — ${refs.size} variables CSS référencées, toutes définies.`)
