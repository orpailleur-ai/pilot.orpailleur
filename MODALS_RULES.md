# Fenêtres de formulaire — les règles

Ce fichier remplace l'ancien plan. Il dit **comment on construit une fenêtre**, pour que du texte ne recouvre plus
jamais un champ. Le contrôle est automatique : `tests/modals-layout.spec.ts` (voir plus bas).

## Les règles

1. **Les champs se rangent dans `FieldGrid`**, jamais dans un `grid grid-cols-N` écrit à la main.
   - Le nombre de colonnes suit la largeur *réelle* de la fenêtre (container query), pas celle de l'écran : une colonne
     ne descend jamais sous 13 rem (9,5 rem avec `compact`, pour un nombre + une unité).
   - `columns` est un **maximum**. `FieldGridFull` donne toute la largeur à un champ (adresse, texte long).
2. **Un champ Astryx** (`TextInput`, `NumberInput`, `TextArea`) se met tel quel dans la grille, avec `width="100%"`.
   Libellé, description, « Obligatoire/Facultatif » et unité sont déjà gérés.
3. **Tout le reste a un libellé via `Champ`** : sélecteur, groupe de choix, saisie composée (quantité + unité).
   - `SelectField` (sélecteur natif) est bâti sur `Champ` : `label`, `description`, `isOptional`, `error`.
   - Plusieurs contrôles pour un seul champ → `Champ isGroup`.
   - **Jamais** de `<label>` écrit à la main : au moins cinq styles différents existaient, certains sans `htmlFor`.
4. **Un message d'état** sur un champ Astryx : `statusVariant="detached"` dans une fenêtre (la variante par défaut
   chevauche volontairement le champ du dessous).
5. **Ce qui accompagne un champ** (suggestions, précisions) va dans le champ (`footer`), pas à côté : toutes les
   cellules d'une rangée gardent la même structure.
6. **Le pied** passe par la propriété `footer` de `Modal` : il est collé en bas de la zone qui défile.
7. **Une fenêtre fermée ne se dessine pas** (`.orp-modal:not([open]) { display:none }`). Sans cela, elle restait une
   feuille invisible qui avalait les appuis sur téléphone.

## Le contrôle automatique

(Même détecteur que la console : `tests/helpers/layout.ts`.)

`tests/modals-layout.spec.ts` ouvre une dizaine de fenêtres **au poste (1280 px) et sur téléphone (390 px)** et
refuse : un texte (libellé, description, unité, message) qui en coupe un autre ou un champ, un contenu qui dépasse la
fenêtre, un champ de moins de 80 px, un `<label>` relié à aucun champ. Deux tests montrent que le détecteur voit les
défauts qu'on lui présente, et qu'il laisse passer un pied collé.

Il tourne contre un serveur **local** dont l'API est simulée (jamais la production) :

    npm run dev -- -p 3119
    npx playwright test tests/modals-layout.spec.ts --project=mise-en-page-poste --project=mise-en-page-telephone

**Une nouvelle fenêtre ?** Ajouter une ligne à `FENETRES` (la page, le geste qui l'ouvre).
