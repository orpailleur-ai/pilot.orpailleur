/**
 * Couleurs de marque : dérivation d'échelle et texte contrasté.
 *
 * Contexte : la console ne lit jamais `--color-primary-500` directement pour
 * les surfaces de marque. Tout lit `--color-accent` et `--color-on-accent`,
 * que le ThemeProvider écrit sur `<html>`. Ces deux variables sont donc le
 * point de contact unique entre le tenant et l'interface : il suffit de les
 * écrire correctement pour que sidebar, header, boutons, liens et pastilles
 * suivent la couleur choisie.
 *
 * Fonctions pures, sans dépendance ni accès au DOM, donc testables isolément.
 */

export interface Rgb {
  r: number
  g: number
  b: number
}

/** '#C9A84C', 'C9A84C' ou '#f97316' → { r, g, b }. Renvoie null si invalide. */
export function parseHex(hex: string | null | undefined): Rgb | null {
  if (!hex) return null
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('')
  if (h.length === 8) h = h.slice(0, 6)
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null
  const n = parseInt(h, 16)
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff }
}

/** Canal alpha d'un hex `#rrggbbaa`, ou 1 si la couleur est opaque. */
function alphaOf(hex: string): number {
  const h = hex.trim().replace(/^#/, '')
  if (h.length === 4) return parseInt(h[3] + h[3], 16) / 255
  if (h.length === 8) return parseInt(h.slice(6, 8), 16) / 255
  return 1
}

/** Compose une couleur semi-transparente sur un fond opaque → couleur opaque. */
export function flatten(hex: string, background: string): string | null {
  const fg = parseHex(hex)
  const bg = parseHex(background)
  if (!fg) return null
  if (!bg) return hex
  const a = alphaOf(hex)
  if (a >= 1) return toHex(fg)
  return toHex({
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
  })
}

export function toHex({ r, g, b }: Rgb): string {
  const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)))
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  )
}

// ── WCAG ─────────────────────────────────────────────────────────────────────

function channelLuminance(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

/** Luminance relative WCAG, 0 (noir) → 1 (blanc). */
export function relativeLuminance(hex: string): number | null {
  const rgb = parseHex(hex)
  if (!rgb) return null
  return (
    0.2126 * channelLuminance(rgb.r) +
    0.7152 * channelLuminance(rgb.g) +
    0.0722 * channelLuminance(rgb.b)
  )
}

/** Rapport de contraste WCAG entre deux couleurs. null si l'une est invalide. */
export function contrastRatio(a: string, b: string): number | null {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  if (la === null || lb === null) return null
  const [hi, lo]: [number, number] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Rapport de contraste tel qu'il est réellement peint à l'écran.
 *
 * `contrastRatio` compare deux aplats. Or nos jetons de bordure et de fond
 * survolé portent une opacité : le contraste affiché est celui de la couleur
 * composée sur son parent, pas celui de la couleur brute. Comparer la teinte
 * semi-transparente à un aplat sous-estime son écart, parce que la luminance
 * relative d'une couleur transparente est calculée comme si elle était
 * opaque — un blanc à 10 % se lit comme du blanc pur.
 *
 * `background` doit être la surface opaque immédiatement derrière.
 */
export function contrastWithAlpha(
  foreground: string,
  background: string,
): number | null {
  const painted = flatten(foreground, background)
  if (!painted) return null
  return contrastRatio(painted, background)
}

/**
 * Texte lisible par-dessus `hex` : noir ou blanc, selon le fond.
 *
 * Se base sur le contraste réel des deux candidats plutôt que sur un seuil de
 * clarté approximatif : on retient noir/blanc si le rapport atteint 4.5:1
 * (WCAG AA), sinon celui qui est le meilleur des deux. Le seuil historique de
 * 0.55 sur la luminance échouait par exemple sur un orange moyen.
 */
export function contrastingTextColor(hex: string): string {
  const black = contrastRatio(hex, '#000000')
  const white = contrastRatio(hex, '#ffffff')
  if (black === null || white === null) return '#ffffff'
  return black >= white ? '#000000' : '#ffffff'
}

// ── Échelle de marque ─────────────────────────────────────────────────────────

/** Ramène une couleur dans le domaine HSL. */
function toHsl(rgb: Rgb) {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min

  if (d === 0) return { h: 0, s: 0, l }

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6

  return { h: h * 360, s, l }
}

function fromHsl(h: number, s: number, l: number): Rgb {
  const hue = ((h % 360) + 360) % 360 / 360
  if (s === 0) {
    const v = l * 255
    return { r: v, g: v, b: v }
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t: number) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  return {
    r: channel(hue + 1 / 3) * 255,
    g: channel(hue) * 255,
    b: channel(hue - 1 / 3) * 255,
  }
}

/**
 * Palettes dérivées d'une seule couleur de marque (le `500`).
 *
 * `primary.500` est la seule valeur canonique : le tenant peut en choisir
 * une seule et le reste de l'échelle est calculé ici. La teinte est
 * conservée partout ; seule la clarté bouge, ce qui garde les boutons
 * pressés et le mode sombre cohérents avec la couleur choisie.
 *
 * Clartés ciblées par palier (mode clair) :
 *   100 très pâle · 200 pâle · 400 légèrement plus clair que 500
 *   500 la couleur choisie · 600 plus foncée · 700 · 800 · 900 très foncée
 *
 * Le palier `400` sert de teinte d'accent en mode sombre : sur fond sombre,
 * une couleur d'accent légèrement éclaircie reste lisible, alors que la
 * version 500 peut se fondre.
 */
export function buildPrimaryScale(hex: string): Record<string, string> {
  const rgb = parseHex(hex)
  if (!rgb) return {}

  const { h, s } = toHsl(rgb)

  const at = (l: number) => toHex(fromHsl(h, s, Math.min(0.94, Math.max(0.04, l))))

  return {
    '50':  at(0.97),
    '100': at(0.93),
    '200': at(0.85),
    '300': at(0.72),
    '400': at(0.58),
    '500': toHex(rgb),
    '600': at(lum(rgb) - 0.09),
    '700': at(lum(rgb) - 0.18),
    '800': at(lum(rgb) - 0.27),
    '900': at(lum(rgb) - 0.36),
  }
}

/** Clarté HSL d'une couleur, bornée pour rester lisible sur fond sombre. */
function lum(rgb: Rgb): number {
  return toHsl(rgb).l
}

/** Accent à utiliser selon le mode : le 400 en sombre, le 500 en clair. */
export function accentFor(scale: Record<string, string>, isDark: boolean): string {
  return (isDark ? scale['400'] ?? scale['500'] : scale['500']) ?? '#C9A84C'
}

/** Ramène une couleur à une clarté HSL donnée, teinte et saturation intactes. */
export function withLightness(hex: string, lightness: number): string | null {
  const rgb = parseHex(hex)
  if (!rgb) return null
  const { h, s } = toHsl(rgb)
  return toHex(fromHsl(h, s, Math.min(0.98, Math.max(0.02, lightness))))
}

/** Ajoute un canal alpha à une couleur hex → `#rrggbbaa`. */
export function withAlpha(hex: string, alpha: number): string | null {
  const rgb = parseHex(hex)
  if (!rgb) return null
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0')
  return `${toHex(rgb)}${a}`
}

/**
 * Rend une couleur de bordure visible sur un fond donné.
 *
 * Une bordure n'a pas à atteindre 3:1 — elle n'est pas porteuse
 * d'information, elle découpe. Mais elle doit être *visible* : on vise
 * ~1.3:1, le seuil en deçà duquel deux surfaces se confondent à l'œil.
 */
export function borderColor(
  hex: string,
  background: string,
  targetRatio = 1.3,
): string {
  if (!parseHex(hex) || !parseHex(background)) return hex

  for (let a = 0.2; a <= 0.9; a += 0.05) {
    const candidate = withAlpha(hex, a)
    if (candidate && (contrastWithAlpha(candidate, background) ?? 0) >= targetRatio) {
      return candidate
    }
  }

  const l = lum(parseHex(hex)!)
  for (let lightness = l - 0.05; lightness >= 0.02; lightness -= 0.03) {
    const darker = withLightness(hex, lightness)
    if (darker && (contrastRatio(darker, background) ?? 0) >= targetRatio) {
      return withAlpha(darker, 0.9) ?? darker
    }
  }
  return withAlpha(hex, 0.9) ?? hex
}

/**
 * Variante « sombre » d'une couleur de surface choisie pour le mode clair.
 */
export function darkSurface(hex: string, depth: 'body' | 'card' | 'popover'): string | null {
  const rgb = parseHex(hex)
  if (!rgb) return null
  const l = lum(rgb)
  if (l < 0.3) return hex
  return withLightness(hex, depth === 'body' ? 0.07 : depth === 'card' ? 0.12 : 0.16)
}

/**
 * Texte lisible sur une surface donnée, par variation de contraste.
 */
export function readableOn(hex: string, background: string, minRatio = 4.5): string {
  const bg = parseHex(background)
  if (!bg) return hex
  const fg = parseHex(hex)
  if (!fg) return hex

  if (contrastRatio(hex, background)! >= minRatio) return hex

  for (let l = lum(fg) + 0.1; l <= 1; l += 0.05) {
    const candidate = withLightness(hex, l)
    if (candidate && contrastRatio(candidate, background)! >= minRatio) return candidate
  }
  for (let l = lum(fg) - 0.1; l >= 0; l -= 0.05) {
    const candidate = withLightness(hex, l)
    if (candidate && contrastRatio(candidate, background)! >= minRatio) return candidate
  }
  return contrastingTextColor(background)
}
