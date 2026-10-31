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

Et, pour le provisionnement :

| variable | effet |
|---|---|
| `API_BASE_URL` | l'origine de l'API d'administration (`https://console.orpailleur-software.fr`) |

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
  milieu, l'objet disparaît ;
- une boulangerie, un rôle, un compte global et un compte de tenant
  (`tests/provisionnement.spec.ts`) ;
- un compte de test (`tests/roles.spec.ts`).

Le nettoyage est **contrôlé** : si un objet n'a pas pu être supprimé, le
test le dit. Un test qui laisse des traces en production est un test qui a
réussi à moitié — et une boulangerie `E2E-*` qui traîne dans les listes
pollue le travail de tous les administrateurs.

Elle **n'écrit pas** sur la configuration SMTP : elle est globale, elle
sert à tous les tenants, et le test d'envoi vise une adresse du domaine
`.invalid` — inexistant par construction (RFC 2606).

## Le provisionnement de la plateforme

`tests/provisionnement.spec.ts` est le test le plus long de la suite, et
le plus important : il vérifie que le pilot sait faire ce pour quoi il
existe.

Il crée une **boulangerie**, un **rôle** restreint (lecture du stock
seulement), un compte **GLOBAL** (administrateur de la plateforme, sans
boulangerie) et un compte de **TENANT**. Puis il vérifie trois choses :

- le compte global **administre la plateforme** (`/admin/tenants` répond
  200) ;
- le compte de tenant **ne la passe pas** (403) ;
- le compte de tenant a **exactement** les permissions de son rôle : il lit
  le stock, il ne lit pas les factures.

C'est ce qui fait tenir la séparation entre la plateforme et les
boulangeries. Un test qui vérifie seulement « la route répond 200 » ne la
verrait pas.

## Les rôles globaux

Un compte créé par le pilot n'appartient à aucune boulangerie — et n'a donc
aucun rôle. La connexion d'administration le refusait : le compte existait,
mais ne pouvait rien faire.

Les rôles **globaux** (`user_roles`) sont ceux dont le jeton tire ses
permissions, et qui ne sont attachés à aucune boulangerie. C'est la seule
façon de faire un administrateur de plateforme. `tests/roles.spec.ts` les
affecte depuis l'interface — la page des rôles d'un compte — et vérifie
que l'API les voit aussi.

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
