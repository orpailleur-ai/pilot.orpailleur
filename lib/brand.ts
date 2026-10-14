/**
 * brand.ts — charte graphique Orpailleur (v2.1)
 *
 * Source unique des couleurs et du logotype. Ce fichier ne contient QUE des
 * constantes et de la géométrie : aucune dépendance, aucun import React, donc
 * importable depuis un composant serveur, un script de build ou un test.
 *
 * ── Provenance ─────────────────────────────────────────────────────────────
 *
 * Toutes les valeurs proviennent de `Orpailleur-Branding-v2-1.pdf`, relevéées
 * par lecture des opérateurs de couleur du document — et non par capture
 * d'écran, qui aurait introduit des écarts d'anticrénelage sur les aplats.
 *
 * Les teintes intermédiaires du PDF (#BFCBD7, #9FB0C2, #5E7590) sont
 * reproduites VERBATIM : ce sont les couleurs réellement imprimées, à une
 * unité près d'un mélange théorique. Une couleur alive vaut mieux qu'une
 * couleur exacte.
 *
 * ── Ce que le PDF ne donne qu'en partie ────────────────────────────────────
 *
 * L'échelle 50→900 n'est donnée que par quatre points : les trois teintes
 * ci-dessus, plus le bleu nuit en 500. Les extrémités — 50 et 100, très clairs,
 * et 600→900 pour les états survolés et actifs — sont donc dérivées par le
 * MÊME mélange (vers le blanc en montant, vers le noir en descendant), ce qui
 * garde une teinte constante sur toute l'échelle. Un déploiement ne s'arrête
 * pas à 400 : il lui faut 600 et 700 pour un bouton pressé.
 *
 * ── Ce que le PDF ne dit pas, et que l'on n'invente pas ───────────────────
 *
 * Aucune couleur d'erreur, de succès ou d'avertissement. Ce sont des couleurs
 * fonctionnelles, pas des couleurs de marque : les mélanger au bleu nuit
 * rendrait un échec indistinguable d'un élément normal. Elles restent ce
 * qu'elles sont.
 *
 * ── Un piège à connaître : l'or ne supporte pas le blanc ───────────────────
 *
 *     blanc sur or    = 2,23:1  → ÉCHEC AA
 *     bleu nuit sur or = 5,26:1  → AA
 *
 * L'or est donc une couleur d'ACCENT — texte, filets, marque — et jamais un
 * fond de bouton supportant du texte blanc. C'est le genre de détail qui se
 * découvre en production, sur un bouton jaune illisible ; d'où la règle
 * écrite ici plutôt que dans un commentaire de CSS.
 */

/** Les quatre couleurs nommées par le document. */
export const BRAND = {
  /** « Bleu nuit » — couleur dominante, base de toute l'échelle. */
  navy: '#143A5C',
  /** « Or » — accent. Jamais un fond supportant du texte blanc. */
  gold: '#D8A629',
  /** « Blanc cassé » — fond de page. */
  cream: '#F6F6F3',
  /** « Anthracite » — texte principal. */
  anthracite: '#434343',
  /** Blanc pur — surface des cartes, pour garder l'élévation. */
  white: '#FFFFFF',
} as const

/**
 * Teintes du bleu nuit relevées dans le PDF.
 *
 * Conservées telles quelles : ce sont les aplats réellement imprimés, pas des
 * mélanges reconstruits. La teinte « 350 » n'appartient à aucune échelle
 * Tailwind classique ; elle est conservée ici parce qu'elle existe dans le
 * document, pas parce qu'un composant l'utiliserait.
 */
export const BRAND_BLUE_TINTS = {
  /** 74 % vers le blanc. */
  '200': '#BFCBD7',
  /** 59 % vers le blanc. */
  '300': '#9FB0C2',
  /** 52 % vers le blanc — entre 300 et 400, hors échelle Tailwind. */
  '350': '#8DA0B5',
  /** 31 % vers le blanc. */
  '400': '#5E7590',
} as const

/**
 * Échelle primaire 50→900.
 *
 * 200, 300, 400 et 500 viennent du PDF ; les autres en sont dérivés par
 * mélange vers le blanc (sous 500) ou vers le noir (au-dessus). La teinte
 * reste donc constante de bout en bout.
 *
 * Attention aux usages : `300` sur fond blanc ne fait que 2,27:1. Il convient
 * à une bordure, à un aplat ou à un fond de sélecteur — PAS à du texte.
 */
export const BRAND_PRIMARY = {
  '50': '#ECEFF2',
  '100': '#D9DFE5',
  '200': '#BFCBD7',
  '300': '#9FB0C2',
  '400': '#5E7590',
  '500': '#143A5C',
  '600': '#11314D',
  '700': '#0E283F',
  '800': '#0B2033',
  '900': '#081827',
} as const

/**
 * Sur fond bleu nuit, l'or et les bleus clairs passent ; le bleu 600 et au-delà
 * disparaît. Sert aux textes posés sur un aplat marine.
 */
export const BRAND_ON_NAVY = {
  text: '#F6F6F3',
  muted: '#9FB0C2',
  accent: '#D8A629',
} as const

/**
 * Géométrie du logotype.
 *
 * Le logotype n'est pas une image : c'est un TAMIS. Cinq, quatre, trois, deux
 * grains — puis un, l'or. C'est l'orpailleur qui garde ce qui vaut d'être
 * gardé, et c'est aussi le nom du produit.
 *
 * Les cotes viennent du PDF (grille de 72 unités, disques de 44, losange de
 * 96) reprises telles quelles. Le losange est séparé de la dernière rangée par
 * 96 unités et non 72 : c'est mesuré, et c'est ce qui donne au symbole son
 * souffle.
 */

/** Rangées du tamis complet : rangée → abscisses des disques. */
export const SIEVE_ROWS: ReadonlyArray<readonly number[]> = [
  [0, 72, 144, 216, 288], // 5
  [36, 108, 180, 252], // 4
  [72, 144, 216], // 3
  [108, 180], // 2
]

/** Abscisse des rangées, dans l'ordre. */
export const SIEVE_ROW_Y = [22, 94, 166, 238] as const

/** Rayon d'un disque du tamis complet. */
export const SIEVE_DOT_RADIUS = 22

/** Centre du losange d'or et demi-diagonale. */
export const SIEVE_GOLD_CENTER = { x: 144, y: 334 } as const
export const SIEVE_GOLD_HALF = 48

/**
 * Cadre du tamis complet : 360 × 430.
 *
 * Les disques couvrent 22→310 en abscisse et 22→260 en ordonnée, le losange
 * 286→382. La marge vaut 22 partout, soit exactement un rayon de disque — la
 * marge est le plus petit module de la grille.
 */
export const SIEVE_VIEWBOX = { width: 360, height: 430 } as const

/**
 * Géométrie de la version compacte (favicon 32 px).
 *
 * Le PDF réduit la gerbe à 3 puis 2 disques, plus le losange. C'est un choix
 * graphique et non une dégradation : à 32 px, cinq disques deviennent cinq
 * taches indiscernables et le symbole perd sa lecture en pyramide. En dessous,
 * on tombe encore à 2 disques.
 */
export const SIEVE_COMPACT_ROWS: ReadonlyArray<readonly number[]> = [
  [0, 48, 96], // 3
  [24, 72], // 2
]
export const SIEVE_COMPACT_ROW_Y = [17, 60] as const
export const SIEVE_COMPACT_DOT_RADIUS = 17
export const SIEVE_COMPACT_GOLD_CENTER = { x: 48, y: 148 } as const
export const SIEVE_COMPACT_GOLD_HALF = 35
export const SIEVE_COMPACT_VIEWBOX = { width: 144, height: 200 } as const

/**
 * Familles de police.
 *
 * Le PDF est composé en Calibri — c'est le document QUI DÉCRIT la marque, pas
 * la marque elle-même. Sa section « Typographie du logotype » impose Manrope :
 * 600 pour le logotype, 400 pour le texte courant.
 */
export const BRAND_FONTS = {
  logotype: { family: 'Manrope', weight: 600 },
  text: { family: 'Manrope', weight: 400 },
} as const