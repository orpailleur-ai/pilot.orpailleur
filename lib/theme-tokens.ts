/**
 * theme-tokens.ts — Pilot version
 *
 * Partial copy of console's theme-tokens.ts.
 * Pilot does NOT use ThemeProvider (no runtime injection).
 * We keep only the constants and types needed for static CSS.
 */

export interface BrandTheme {
  nom?: string
  colors: {
    primary?: Record<string, string>
    danger?: Record<string, string>
    success?: Record<string, string>
    warning?: Record<string, string>
    background?: string
    card?: string
    border?: string
    muted?: string
  }
  radius?: Record<string, string>
  fontFamily?: string
}

export interface BrandSettings {
  theme_json: BrandTheme
  logo_url: string | null
  favicon_url: string | null
  layout_variant: 'sidebar' | 'card'
  nom_boulangerie: string | null
}

const ACCENT = '#143A5C'

/** Thème de repli : la charte Orpailleur v2.1 (voir lib/brand.ts). */
export const DEFAULT_BRAND_THEME: BrandTheme = {
  colors: {
    primary: { '500': ACCENT },
    // Fonctionnelles, pas de marque : le document ne les définit pas, et
    // les mélanger au bleu nuit rendrait un échec indistinguable d'un
    // élément normal. Mêmes valeurs que les jetons d'Astryx, pour que le
    // repli et le rendu réel ne divergent pas.
    danger: { '500': '#76000C' },
    success: { '500': '#00490B' },
    warning: { '500': '#4B3900' },
  },
  radius: { sm: '4px', md: '8px', lg: '16px', xl: '24px' },
  fontFamily: 'Manrope',
}

/**
 * Lit une couleur sémantique depuis le thème du tenant.
 */
function semanticColor(
  family: Record<string, string> | undefined,
  fallback: string,
): string {
  if (!family) return fallback
  const value = family['500'] ?? family.DEFAULT ?? family['default']
  return value ?? fallback
}

/** Couleur de marque affichée dans l'éditeur de thème, ou l'or par défaut. */
export function primaryOf(brand: BrandTheme): string {
  const hex = brand.colors?.primary?.['500']
  return hex ?? ACCENT
}

/** Attribut porté par le <style> injecté (kept for compatibility). */
export const THEME_STYLE_ATTR = 'data-astryx-brand'
