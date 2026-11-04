import type { Locator } from '@playwright/test'

/** Une anomalie de mise en page trouvée dans une fenêtre. */
export interface Anomalie {
  type: 'chevauchement' | 'debordement' | 'champ-etroit' | 'label-orphelin'
  detail: string
}

/**
 * Cherche, DANS le navigateur, ce qu'une fenêtre de formulaire ne doit jamais montrer :
 *
 *  · chevauchement — un texte (libellé, description, unité, message, valeur) dont la boîte en coupe une autre ou
 *    celle d'un champ, sans que l'une contienne l'autre ;
 *  · debordement — un élément qui dépasse le bord de la fenêtre, ou un bloc de texte plus large que lui qui ne défile
 *    ni ne tronque (« … ») ;
 *
 * Ne comptent pas comme conflits : un pied collé (sticky/fixed) qui recouvre ce qui défile dessous — c'est son rôle.
 *  · champ-etroit — un champ de saisie plus étroit que 80 px : on n'y lit plus ce qu'on tape ;
 *  · label-orphelin — un <label> relié à aucun champ.
 *
 * Les boîtes sont mesurées (`getBoundingClientRect`), pas déduites des classes : c'est ce que voit l'utilisateur.
 */
export async function anomaliesDeMiseEnPage(fenetre: Locator): Promise<Anomalie[]> {
  return fenetre.evaluate((racine) => {
    const sortie: Array<{ type: Anomalie['type']; detail: string }> = []
    const nom = (el: Element) => {
      const t = (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)
      const id = (el as HTMLElement).id ? `#${(el as HTMLElement).id}` : ''
      return `<${el.tagName.toLowerCase()}${id}>${t ? ` « ${t} »` : ''}`
    }
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) return false // sr-only, display:contents…
      const s = getComputedStyle(el)
      if (s.visibility === 'hidden' || s.display === 'none' || s.opacity === '0') return false
      // Un texte réservé aux lecteurs d'écran (boîte de 1 px qui rogne) a des enfants que le navigateur mesure
      // encore pleins : ils ne sont pourtant pas vus.
      for (let e = el.parentElement; e && e !== racine; e = e.parentElement) {
        const b = e.getBoundingClientRect()
        const st = getComputedStyle(e)
        if ((b.width <= 2 || b.height <= 2) && (st.overflow !== 'visible' || st.clipPath !== 'none' || st.clip !== 'auto')) return false
      }
      return true
    }

    // 1. Les champs de saisie et les textes « feuilles » (le plus petit élément qui porte du texte).
    const champs = [...racine.querySelectorAll('input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio]), textarea, select, [role=combobox], [role=spinbutton]')]
      .filter(visible)
    const textes = [...racine.querySelectorAll('*')].filter((el) => {
      if (!visible(el)) return false
      if (['SCRIPT', 'STYLE', 'OPTION', 'SVG', 'PATH'].includes(el.tagName.toUpperCase())) return false
      return [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '')
    })
    const coupe = (a: DOMRect, b: DOMRect) => {
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left)
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
      return w > 2 && h > 2
    }
    const lies = (a: Element, b: Element) => a.contains(b) || b.contains(a)
    // Un pied collé (position: sticky/fixed) recouvre, PAR CONCEPTION, ce qui défile dessous : ce n'est pas un conflit.
    const collant = (el: Element) => {
      for (let e: Element | null = el; e && e !== racine; e = e.parentElement) {
        const p = getComputedStyle(e).position
        if (p === 'sticky' || p === 'fixed') return true
      }
      return false
    }

    for (let i = 0; i < textes.length; i++) {
      const a = textes[i]
      const ra = a.getBoundingClientRect()
      for (const c of champs) {
        if (lies(a, c) || c.contains(a) || a.closest('label')?.contains(c)) continue
        if (collant(a) !== collant(c)) continue
        // un texte rangé DANS le contrôle qui le porte (valeur d'un select, bouton) n'est pas un conflit
        if (c.closest('[role=combobox], button, [data-size]')?.contains(a)) continue
        if (coupe(ra, c.getBoundingClientRect())) sortie.push({ type: 'chevauchement', detail: `${nom(a)} coupe le champ ${nom(c)}` })
      }
      for (let j = i + 1; j < textes.length; j++) {
        const b = textes[j]
        if (lies(a, b)) continue
        if (collant(a) !== collant(b)) continue
        if (a.closest('button, [role=combobox]')?.contains(b) || b.closest('button, [role=combobox]')?.contains(a)) continue
        if (coupe(ra, b.getBoundingClientRect())) sortie.push({ type: 'chevauchement', detail: `${nom(a)} coupe ${nom(b)}` })
      }
    }

    // 2. Débordements.
    const cadre = racine.getBoundingClientRect()
    for (const el of racine.querySelectorAll('*')) {
      if (!visible(el)) continue
      const r = el.getBoundingClientRect()
      if (r.right > cadre.right + 1 || r.left < cadre.left - 1) {
        const s = getComputedStyle(el)
        if (s.position === 'fixed') continue
        sortie.push({ type: 'debordement', detail: `${nom(el)} sort de la fenêtre (${Math.round(r.left - cadre.left)}…${Math.round(r.right - cadre.right)} px)` })
        continue
      }
      const s = getComputedStyle(el)
      const defile = ['auto', 'scroll', 'hidden', 'clip'].includes(s.overflowX)
      const tronque = s.textOverflow === 'ellipsis'
      const porteDuTexte = [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '')
      if (porteDuTexte && el.scrollWidth > el.clientWidth + 2 && !defile && !tronque && el.clientWidth > 0 && !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
        sortie.push({ type: 'debordement', detail: `${nom(el)} : contenu de ${el.scrollWidth} px dans ${el.clientWidth} px` })
      }
    }

    // 3. Champs trop étroits.
    for (const c of champs) {
      const w = c.getBoundingClientRect().width
      if (w < 80) sortie.push({ type: 'champ-etroit', detail: `${nom(c)} ne fait que ${Math.round(w)} px` })
    }

    // 4. Libellés orphelins.
    for (const l of racine.querySelectorAll('label')) {
      if (!visible(l)) continue
      const pour = l.getAttribute('for')
      const relie = (pour && racine.ownerDocument.getElementById(pour)) || l.querySelector('input, select, textarea, [role=combobox], button')
      if (!relie) sortie.push({ type: 'label-orphelin', detail: `${nom(l)} n'est relié à aucun champ` })
    }

    // Dédoublonnage.
    const vus = new Set<string>()
    return sortie.filter((a) => { const k = a.type + a.detail; if (vus.has(k)) return false; vus.add(k); return true })
  }) as Promise<Anomalie[]>
}
