import type { Metadata } from 'next'
import { Figtree } from 'next/font/google'
import './layers.css'
import '@astryxdesign/core/reset.css'
import '@astryxdesign/core/astryx.css'
import '@astryxdesign/theme-neutral/theme.css'
import './globals.css'
import { AuthProvider } from '@/components/providers/auth-context'
import { SiteProvider } from '@/components/providers/site-context'
import { ThemeModeProvider } from '@/components/providers/theme-mode-provider'
import { I18nProvider } from '@/lib/i18n'

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
})

export const metadata: Metadata = {
  title: 'Orpailleur — Pilot',
  description: 'Administration Orpailleur',
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
    <html lang="fr" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeModeScript }} />
      </head>
      <body className={`${figtree.variable} font-sans antialiased`}>
        <I18nProvider>
          <ThemeModeProvider>
            <AuthProvider>
              <SiteProvider>{children}</SiteProvider>
            </AuthProvider>
          </ThemeModeProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
