# Les tests d'interface du pilot

Trente-cinq écrans, un test par écran, plus les tests fonctionnels des
écrans à risque. Le tout avec **Playwright**, qui embarque son propre
Chromium : rien à installer sur la machine, rien à configurer.

```bash
npm run test:e2e          # la suite complète
npm run test:e2e:ui       # le mode interactif (on voit le navigateur)
npm run test:e2e:report   # le rapport du dernier passage
```

## Ce que la suite vérifie

Pour chaque écran, la même question — **cette page fonctionne-t-elle ?**

- elle se charge, et son squelette de chargement disparaît ;
- **aucune erreur de console**, **aucune exception** non rattrapée ;
- **aucune requête en échec** (4xx/5xx) vers l'API ;
- **aucune clé de traduction brute** affichée à l'écran.

Le dernier point est le plus utile. Le helper `t()` ne lève pas d'erreur
quand une clé manque dans les messages : il renvoie **la clé elle-même**.
L'écran affiche alors « required » ou « view » en toutes lettres, et rien ne
le signale. Le passage complet en a trouvé douze d'un coup.

## L'accès

Les identifiants ne sont **jamais** dans le dépôt. Deux chemins :

| variable | effet |
|---|---|
| `PILOT_EMAIL` + `PILOT_PASSWORD` | la suite se connecte par le **formulaire**, comme un utilisateur |
| `PILOT_TOKEN` | le jeton est injecté dans le navigateur (pratique en CI) |

Les lire depuis un fichier local :

```bash
cp .env.e2e.example .env.e2e   # puis complétez
npm run test:e2e
```

`.env.e2e` est ignoré par git (`.env*`). Sans aucun de ces accès, les tests
sont **sautés** — et le disent — au lieu d'échouer sur une connexion
impossible.

### En CI

Le job `e2e` du workflow lit deux secrets du dépôt :

| secret | contenu |
|---|---|
| `E2E_PILOT_EMAIL` | l'adresse du compte de test (`e2e@orpailleur.com`) |
| `E2E_PILOT_PASSWORD` | son mot de passe |

Tant qu'ils ne sont pas posés, **seuls les tests qui n'ont pas besoin d'accès
s'exécutent** (le garde-fou des traductions, la connexion refusée) ; les
autres sont sautés, et le job reste vert. Ce n'est pas unrani : un job rouge
pour « pas de secret » MASQUERAIT un vrai défaut.

La variable `PILOT_BASE_URL` est prise dans les variables du dépôt
(`vars.PILOT_BASE_URL`), avec le prod par défaut.

## Contre quoi tester

Par défaut : le pilot **déployé** (`https://pilot.orpailleur-software.fr`).
C'est là que les vrais défauts se voient.

```bash
PILOT_BASE_URL=http://127.0.0.1:3002 npm run test:e2e   # un poste local
```

## Ce qui écrit en base

La suite **écrit**, sur des objets qu'elle crée pour l'occasion :

- un modèle IA déclaré puis supprimé (`tests/modeles.spec.ts`) — le
  nettoyage est fait dans un `finally`, donc même si le test échoue au
  milieu, l'objet disparaît.

Elle **n'écrit pas** sur la configuration SMTP : elle est globale, elle
sert à tous les tenants, et le test d'envoi vise une adresse du domaine
`.invalid` — inexistant par construction (RFC 2606).

## L'état de session

Un seul login par exécution : l'état est mis en cache dans
`test-results/.auth-state.json` (ignoré par git, invalidé au bout de
trente minutes). Sans ce cache, la suite se connecterait trente-cinq fois
d'affilée — et le limiteur de débit de l'API finirait par refuser, faisant
échouer des tests pour une raison qui n'a rien à voir avec le pilot.

## Le rapport

`playwright-report/` (HTML) et `test-results/` (captures, traces). Les deux
sont ignorés par git.

## Ce que le premier passage a trouvé

| écran | défaut |
|---|---|
| `/users` | la clé `all_statuses` affichée en clair |
| `/invoices` | la clé `invoice_paid` affichée en clair |
| `/tenants/[id]/users` | la clé `tenant_users` |
| `/tenants/[id]/settings/danger` | la clé `danger_zone` |
| `/users/[id]` | une image servie en **HTTP** sur une page HTTPS : le navigateur la bloquait |
| `/ai-config/[id]/history` | un lien « Retour » vers une route inexistante (404) |
| toutes | `t('clé', 'repli')` ignorait le repli : le fallback n'était qu'un décor |

Le garde-fou `tests/i18n.spec.ts` verrouille le premier, le sixième et le
septième point : il vérifie que toute clé utilisée existe dans les **deux**
langues, et que les deux en ont le même nombre.
