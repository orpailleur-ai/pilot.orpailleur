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

const GOLD = '#C9A84C'

/** Thème de repli : l'or historique d'Orpailleur. */
export const DEFAULT_BRAND_THEME: BrandTheme = {
  colors: {
    primary: { '500': GOLD },
    danger: { '500': '#dc2626' },
    success: { '500': '#22c55e' },
    warning: { '500': '#f59e0b' },
  },
  radius: { sm: '4px', md: '8px', lg: '16px', xl: '24px' },
  fontFamily: 'Figtree',
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
  return hex ?? GOLD
}

/** Attribut porté par le <style> injecté (kept for compatibility). */
export const THEME_STYLE_ATTR = 'data-astryx-brand'
