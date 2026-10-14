import {
  BRAND,
  SIEVE_COMPACT_DOT_RADIUS,
  SIEVE_COMPACT_GOLD_CENTER,
  SIEVE_COMPACT_GOLD_HALF,
  SIEVE_COMPACT_ROW_Y,
  SIEVE_COMPACT_ROWS,
  SIEVE_COMPACT_VIEWBOX,
  SIEVE_DOT_RADIUS,
  SIEVE_GOLD_CENTER,
  SIEVE_GOLD_HALF,
  SIEVE_ROW_Y,
  SIEVE_ROWS,
  SIEVE_VIEWBOX,
} from '@/lib/brand'

/**
 * Logo Orpailleur — le tamis.
 *
 * Composant, et non image : le logotype est une grille de disques dont la
 * position compte autant que la couleur. En SVG il reste net à toutes les
 * densités d'écran, il se recolore au survol, et il n'encombre pas le dépôt
 * d'un fichier binaire à maintenir.
 *
 * La géométrie vient de `lib/brand.ts`, qui est la source unique. Ce fichier
 * ne dessine que.
 */

interface MarkProps {
  /** Hauteur en pixels. La largeur en découle du rapport du cadre. */
  size?: number
  /**
   * Couleur des disques. Par défaut le bleu nuit.
   *
   * Surchargeable parce que le logo doit fonctionner sur fond marine ET sur
   * fond clair : sur aplat marine, le bleu nuit sur bleu nuit ne se voit pas.
   */
  diskColor?: string
  /** Couleur du losange. Par défaut l'or. */
  goldColor?: string
  /** Classe CSS additionnelle. */
  className?: string
  /**
   * Version compacte (3-2-losange) au lieu de la gerbe complète (5-4-3-2).
   *
   * Par défaut, la bascule se fait AUTOMATIQUEMENT sous 48 px — la règle
   * que le document applique déjà pour ses favicons (32 px → 3-2, 16 px →
   * 1-2). En dessous, un disque fait quelques pixels et la gerbe se réduit
   * à une grappe de points : le symbole perd sa lecture en pyramide, qui
   * est justement ce qu'il faut communicate.
   *
   * Forcer `compact` à `true` au-dessus du seuil fonctionne aussi, pour un
   * contexte où la sobriété prime sur la lisibilité.
   */
  compact?: boolean
}

/** Un disque du tamis. */
function Dot({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  return <circle cx={cx} cy={cy} r={r} fill={fill} />
}

/**
 * Losange : un carré tourné de 45°.
 *
 * Écrit en points et non en `<rect transform="rotate(45)">` : la rotation se
 * fait autour de l'origine, il faudrait donc recentrer, et le résultat dépend
 * du `transform-origin` du navigateur. Le calcul des quatre sommets est
 * banal et sans surprise.
 */
function Diamond({
  cx,
  cy,
  half,
  fill,
}: {
  cx: number
  cy: number
  half: number
  fill: string
}) {
  return <polygon points={`${cx},${cy - half} ${cx + half},${cy} ${cx},${cy + half} ${cx - half},${cy}`} fill={fill} />
}

/**
 * Seuil sous lequel la gerbe complète n'est plus lisible.
 *
 * Mesuré, pas estimé : à 44 px de haut, un disque du tamis complet fait
 * 4,5 px — la gerbe devient une grappe de points. Le document bascule sur la
 * version 3-2 dès 32 px ; on s'arrête à 48 pour garder de la marge, la
 * barre latérale étant à 26 px.
 */
const SEUIL_COMPACT = 48

export function OrpailleurMark({
  size = 28,
  diskColor = BRAND.navy,
  goldColor = BRAND.gold,
  className,
  compact,
}: MarkProps) {
  const compactFinal = compact ?? size < SEUIL_COMPACT
  const rows = compactFinal ? SIEVE_COMPACT_ROWS : SIEVE_ROWS
  const rowY = compactFinal ? SIEVE_COMPACT_ROW_Y : SIEVE_ROW_Y
  const radius = compactFinal ? SIEVE_COMPACT_DOT_RADIUS : SIEVE_DOT_RADIUS
  const gold = compactFinal ? SIEVE_COMPACT_GOLD_CENTER : SIEVE_GOLD_CENTER
  const goldHalf = compactFinal ? SIEVE_COMPACT_GOLD_HALF : SIEVE_GOLD_HALF
  const box = compactFinal ? SIEVE_COMPACT_VIEWBOX : SIEVE_VIEWBOX

  const width = (size * box.width) / box.height

  return (
    <svg
      width={width}
      height={size}
      viewBox={`0 0 ${box.width} ${box.height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Orpailleur"
    >
      {rows.map((xs, rowIndex) =>
        xs.map((x) => (
          <Dot key={`${rowIndex}-${x}`} cx={x + radius} cy={rowY[rowIndex]} r={radius} fill={diskColor} />
        )),
      )}
      <Diamond cx={gold.x} cy={gold.y} half={goldHalf} fill={goldColor} />
    </svg>
  )
}

/**
 * Icône applicative : le tamis sur aplat marine.
 *
 * Le PDF y applique un dégradé de blanc — les disques vont du gris au blanc en
 * descendant, puis c'est le losange d'or. Le motif se lit alors par la
 * luminance et non par la teinte, ce qui reste juste sur un fond coloré.
 *
 * Le dégradé est repris rangée par rangée, avec les quatre teintes exactes du
 * document, plutôt que par un vrai dégradé SVG : ces quatre valeurs sont
 * celles imprimées, et un interpolateur en obtiendrait d'autres entre elles.
 */
export function OrpailleurAppIcon({ size = 32 }: { size?: number }) {
  // Teintes par rangée, du haut vers le bas, relevées dans le PDF.
  const rowFill = ['#5E7590', '#8DA0B5', '#BFCBD7', '#F6F6F3']
  const radius = 8
  const rows = [
    [24, 64, 104, 144, 184],
    [44, 84, 124, 164],
    [64, 104, 144],
    [84, 124],
  ]

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 208 208"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Orpailleur"
    >
      <rect width="208" height="208" rx="46" fill={BRAND.navy} />
      {rows.map((xs, rowIndex) =>
        xs.map((x) => (
          <Dot
            key={`${rowIndex}-${x}`}
            cx={x}
            cy={56 + rowIndex * 28}
            r={radius}
            fill={rowFill[rowIndex]}
          />
        )),
      )}
      <Diamond cx={104} cy={168} half={17} fill={BRAND.gold} />
    </svg>
  )
}

/**
 * Lockup horizontal : marque + logotype.
 *
 * « ORPAILLEUR » est rendu en texte, pas tracé en contours. Un logotype
 * vectorisé ne tient pas au zoom sans se déformer ; ici le texte reste du texte,
 * se recolore, et suit la police du site.
 *
 * Le poids 600 est imposé par le document pour le logotype — distinct du 400
 * du texte courant, qui est la seule autre règle typographique qu'il donne.
 */
export function OrpailleurLockup({
  height = 26,
  diskColor = BRAND.navy,
  goldColor = BRAND.gold,
  className,
}: Omit<MarkProps, 'size' | 'compact'> & { height?: number }) {
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <OrpailleurMark size={height} diskColor={diskColor} goldColor={goldColor} />
      <span
        style={{
          fontFamily: 'var(--font-manrope), Manrope, system-ui, sans-serif',
          fontWeight: 600,
          fontSize: height * 0.58,
          letterSpacing: '0.02em',
          color: diskColor,
          lineHeight: 1,
        }}
      >
        ORPAILLEUR
      </span>
    </span>
  )
}