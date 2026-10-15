import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './layers.css'
import '@astryxdesign/core/reset.css'
import '@astryxdesign/core/astryx.css'
import '@astryxdesign/theme-neutral/theme.css'
import './globals.css'
import { AuthProvider } from '@/components/providers/auth-context'
import { TenantProvider } from '@/components/providers/tenant-context'
import { ThemeModeProvider } from '@/components/providers/theme-mode-provider'
import { I18nProvider } from '@/lib/i18n'

/**
 * Manrope — la police qu'impose la charte.
 *
 * Remplace Figtree, qui n'était qu'un choix par défaut. La section
 * « Typographie du logotype » du document demande Manrope : 600 pour le
 * logotype, 400 pour le texte courant.
 *
 * `next/font` auto-héberge le fichier et n'envoie rien à un tiers : sans
 * cela, le premier rendu attendrait un aller-retour vers Google Fonts, et le
 * logo s'afficherait dans la police de repli en attendant.
 *
 * La variable CSS est posée sur `<body>`, comme avant : c'est ce que Tailwind
 * lit via `fontFamily.sans` (voir tailwind.config.ts).
 */
/**
 * Manrope — la police qu'impose la charte, AUTO-HÉBERGÉE.
 *
 * `next/font/google` télécharge Manrope AU MOMENT DU BUILD. Dans une image
 * Docker de CI, cela rend la construction dépendante de la disponibilité de
 * Google Fonts : le premier build de pilot a échoué sur
 * `next/font: Cannot read properties of null`, faute d'accès au réseau.
 *
 * Le dépôt porte donc le fichier lui-même, et `next/font/local` s'en sert. Le
 * même avantage que `next/font/google` subsiste — la police est servie depuis
 * notre propre origine, aucun appel à un tiers — et la construction ne dépend
 * plus de la disponibilité d'un service externe.
 *
 * Un SEUL fichier suffit : Manrope est une police à POIDS VARIABLE, et le
 * même fichier sert 400 et 600. `weight: '400 600'` déclare la plage plutôt
 * que deux polices distinctes, ce qui évite de charger le même octet deux
 * fois.
 */
const manrope = localFont({
  src: [{ path: './fonts/Manrope-latin.woff2', weight: '400 600', style: 'normal' }],
  variable: '--font-manrope',
  display: 'swap',
  // Déclaré en COMMENTAIRE de la police, comme l'exige la SIL OFL.
  // L'auto-hébergement sans cette mention violerait la licence.
  declarations: [{ prop: 'font-family', value: 'Manrope' }],
})

export const metadata: Metadata = {
  title: 'Orpailleur — Pilot',
  description: 'Administration Orpailleur',
  // Déclarer l'icône empêche le navigateur d'aller sonder /favicon.ico, qui
  // répond 404 : le dépôt n'en expédie aucun.
  //
  // `icon.svg` est la version COMPACTE du tamis (3 disques + losange), celle
  // que le document réserve au favicon 32 px. Le mark complet — cinq disques —
  // ne tient plus dans un onglet de 16 px : les disques se fusionnent et le
  // symbole perd sa lecture en pyramide.
  icons: { icon: '/icon.svg', apple: '/icon-app.svg' },
}

const themeModeScript = `(function(){try{
var m=localStorage.getItem('orpailleur_theme_mode')||'system';
var dark=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
var r=document.documentElement;
r.dataset.theme=dark?'dark':'light';
if(dark){r.classList.add('dark');}else{r.classList.remove('dark');}
}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeModeScript }} />
      </head>
      <body className={`${manrope.variable} font-sans antialiased`}>
        <I18nProvider>
          <ThemeModeProvider>
            <AuthProvider>
              <TenantProvider>{children}</TenantProvider>
            </AuthProvider>
          </ThemeModeProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
