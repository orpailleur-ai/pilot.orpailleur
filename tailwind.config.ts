import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  // Pilot vit à la racine (app/, components/, lib/) là où console vit
  // sous src/. Sans cette adaptation, Tailwind ne verrait AUCUN fichier et
  // purgegerait toutes les classes utilitaires du build.
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand primary — lit via CSS vars (runtime override)
        primary: {
          /**
           * Le rôle `primary` — 291 usages, tous sans numéro — pointe sur le
           * jeton d'ACCENT, pas sur `--color-primary-500`.
           *
           * C'est une correction de mode sombre. La palette est fixe : le 500
           * est le bleu nuit, dans les deux modes. Posé tel quel sur un fond
           * sombre, il ne fait que 1,47:1 — un titre bleu nuit sur une carte
           * sombre devient illisible, alors que l'ancien bleu générique
           * #3b82f6 passait dans les deux.
           *
           * `--color-accent` est, lui, déjà un couple `light-dark()` écrit par
           * le ThemeProvider : bleu nuit en clair, bleu 200 en sombre. Il suit
           * aussi le thème du tenant, ce qu'un jeton de palette ne fait pas —
           * il n'a pas à être corrigé à chaque changement de couleur.
           *
           * La paire est écrite ICI, en `light-dark()`, et non déléguée à
           * `--color-accent` : ce jeton n'existe qu'une fois le <style> du
           * ThemeProvider injecté. Avant ce moment la déclaration est invalide
           * et la couleur retombe sur la valeur héritée — un titre qui vire au
           * gris du texte. Les jetons `--color-primary-*`, eux, sont dans
           * globals.css et toujours présents.
           *
           * La numérotation reste disponible pour qui veut une teinte fixe :
           * aucun composant ne l'utilise aujourd'hui.
           */
          DEFAULT: 'light-dark(var(--color-primary-500), var(--color-primary-200))',

          /**
           * La couleur de texte À poser sur un aplat `primary`.
           *
           * Elle ne peut pas être `text-white` : en mode sombre l'accent est le
           * bleu 200 du document, et le blanc dessus ne fait que 1,65:1 — un
           * bouton dont on ne lit plus le libellé. Le bleu nuit donne 7,12:1
           * sur ce même bleu 200.
           *
           * On ne se contente donc pas d'inverser les deux : le texte doit
           * être lisible SUR l'accent, et l'accent est choisi par le tenant.
           * D'où un jeton dédié, écrit en `light-dark()` comme le fond.
           */
          contrast: 'light-dark(#ffffff, var(--color-primary-500))',
          50:  'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
        },
        background: 'var(--color-background)',
        card: 'var(--color-card)',
        border: 'var(--color-border)',
        muted: 'var(--color-muted)',
        danger: 'var(--color-danger)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
      },
      /**
       * Rend la couleur de bordure par défaut pilotée par le thème.
       *
       * Sans ça, le preflight de Tailwind fige `border: 0 solid #e5e7eb` :
       * toute classe de largeur seule (`border-b`, `border-e`, `border-t`,
       * `border-l`) hérite d'un gris clair codé en dur. C'est invisible en
       * mode clair et très éblouissant en mode sombre — c'était le défaut
       * sur les bordures du header et de la sidebar.
       *
       * Les classes explicites (`border-border`, `border-primary`, …)
       * continuent de primer sur ce défaut.
       */
      borderColor: {
        DEFAULT: 'var(--color-border)',
      },
      divideColor: {
        DEFAULT: 'var(--color-border)',
      },
      ringColor: {
        DEFAULT: 'var(--color-accent)',
      },
      fontFamily: {
        // Manrope d'abord, puis la variable posée par next/font (voir
        // src/app/layout.tsx), puis les replis système. La variable passe en
        // premier : sans elle, un navigateur privé du webfont retomberait
        // directement sur system-ui au lieu d'utiliser le nom local.
        sans: ['var(--font-manrope)', 'Manrope', 'system-ui', 'sans-serif'],
      },
    },
  },
  corePlugins: {
    /**
     * Preflight désactivé — Astryx fournit son propre reset
     * (`@astryxdesign/core/reset.css`, dans `@layer reset`).
     *
     * Le preflight de Tailwind est écrit HORS de toute couche CSS. Or une
     * déclaration non-empaquetée l'emporte sur toutes les couches, quelle que
     * soit sa spécificité. Il écrasait donc systématiquement Astryx :
     *
     *   button, input[type=button]… { background-color: transparent }
     *   button, input, select, textarea { color: inherit }
     *
     * Théoriquement neutralisé — Astryx ne cible pas `input[type=button]` —
     * mais en pratique les boutons perdaient leur fond et leur couleur de
     * texte dans les deux modes, et la puce sélectionnée du SegmentedControl
     * devenait transparente. Deux resets qui se battent : on n'en garde qu'un.
     */
    preflight: false,
  },
  plugins: [],
}

export default config
