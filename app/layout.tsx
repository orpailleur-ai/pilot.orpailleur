import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
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
const manrope = Manrope({
  subsets: ['latin'],
  // 400 et 600 seulement : ce sont les deux graisses que le document impose.
  // Charger toute la famille alourdirait le chargement pour des graisses que
  // l'interface n'utilise pas.
  weight: ['400', '600'],
  variable: '--font-manrope',
  display: 'swap',
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
