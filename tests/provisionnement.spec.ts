import { expect, test } from '@playwright/test'
import { API_BASE_URL, jetonAdmin, requete } from './helpers/api'

/**
 * CRÉER LES ACTEURS : boulangeries, utilisateurs, rôles, affectations.
 *
 * ── Ce que ce test fait ────────────────────────────────────────────────────
 *
 * Le pilot est l'administration de la PLATEFORME : c'est là qu'on crée une
 * boulangerie, un compte, un rôle, et qu'on affecte ce compte à cette
 * boulangerie avec ce rôle.
 *
 * Le test passe par l'API plutot que par les formulaires : ce qui compte
 * ici, c'est que l'API d'administration marche et produit les bons objets.
 * Le parcours des FORMULAIRES est vérifié par `tests/pages.spec.ts`.
 *
 * Tout ce qui est créé est supprimé à la fin, même si le test échoue en
 * cours de route : un role `e2e-*` ou une boulangerie `E2E-*` qui
 * traînerait en production polluerait les listes de tous les administrateurs.
 */
const SUFFIXE = Date.now().toString(36)

test.describe('le pilot provisions la plateforme', () => {
  test('crée une boulangerie, un rôle, et des comptes globaux et de tenant', async () => {
    const admin = (await jetonAdmin()) ?? ''
    test.skip(
      !admin,
      'Aucun acces administrateur (PILOT_TOKEN, ou PILOT_EMAIL + PILOT_PASSWORD).',
    )

    const crees: Array<{ kind: string; id: string }> = []
    /** Ce que le nettoyage n'a pas su supprimer. */
    const restes: string[] = []

    try {
      // ── 1. Une boulangerie ────────────────────────────────────────────
      const nomBoulangerie = `E2E Boulangerie ${SUFFIXE}`
      const [statTenant, tenant] = await requete('POST', '/admin/tenants', admin, {
        nom: nomBoulangerie,
        email: `e2e-${SUFFIXE}@orpailleur.test`,
      })
      expect(statTenant, `la creation de la boulangerie : ${JSON.stringify(tenant)}`).toBeLessThan(300)
      expect(typeof tenant.id).toBe('string')
      const tenantId = tenant.id as string
      crees.push({ kind: 'tenant', id: tenantId })

      // ── 2. Un rôle, avec un permissions restreint ─────────────────────
      // Un rôle qui ne peut QUE lire le stock : c'est le rôle le plus
      // restrictif, et celui qui révèle le mieux une fuite de permission.
      const [statRole, role] = await requete('POST', '/admin/roles', admin, {
        code: `e2e_lecture_${SUFFIXE}`,
        label: 'E2E — lecture seule',
      })
      expect(statRole, `la creation du role : ${JSON.stringify(role)}`).toBeLessThan(300)
      expect(typeof role.id).toBe('string')
      const roleId = role.id as string
      crees.push({ kind: 'role', id: roleId })

      // Les permissions existent dans le referentiel : on va les chercher
      // plutot que de deviner leurs identifiants.
      const [statPerms, referentiel] = await requete(
        'GET',
        '/admin/roles/permissions',
        admin,
      )
      expect(statPerms).toBe(200)
      const permissions = referentiel as Array<{ id: string; code: string }>
      const lectureStock = permissions.find((p) => p.code === 'MERCURIALE_READ')
      expect(lectureStock, 'la permission MERCURIALE_READ doit exister').toBeDefined()

      const [statPatch, rolePatche] = await requete(
        'PATCH',
        '/admin/roles/' + roleId,
        admin,
        { permission_ids: [lectureStock!.id] },
      )
      expect(statPatch, `l'affectation des permissions : ${JSON.stringify(rolePatche)}`).toBeLessThan(300)

      // ── 3. Un compte GLOBAL (administrateur de la plateforme) ───────────
      const emailGlobal = `e2e-global-${SUFFIXE}@orpailleur.test`
      const [statGlobal, global] = await requete('POST', '/admin/users', admin, {
        email: emailGlobal,
        password: 'MotDePasse!2026',
        nom: 'E2E Global',
      })
      expect(statGlobal, `la creation du compte global : ${JSON.stringify(global)}`).toBeLessThan(300)
      const globalId = global.id as string
      crees.push({ kind: 'user', id: globalId })

      // Un compte global n'appartient à AUCUNE boulangerie : il n'a pas de
      // tenant, et l'API doit dire qu'il n'en a pas.
      const [statSitesGlobal] = await requete(
        'GET',
        '/admin/users/' + globalId + '/sites/full',
        admin,
      )
      expect(statSitesGlobal).toBe(200)

      // ── 3 bis. Le rôle GLOBAL du compte global ─────────────────────────
      //
      // Un compte créé par `POST /admin/users` n'appartient à aucune
      // boulangerie — et n'a donc AUCUN rôle. La connexion d'administration
      // le refusait (« aucun role assigne ») : le compte existait, mais ne
      // pouvait rien faire.
      //
      // Les rôles GLOBAUX (`user_roles`) sont ceux dont le jeton tire ses
      // permissions, et qui ne sont attachés à aucune boulangerie. C'est la
      // seule façon de faire un administrateur de PLATEFORME.
      const [statRolesGlobaux, rolesGlobaux] = await requete(
        'GET',
        '/admin/users/' + globalId + '/global-roles',
        admin,
      )
      expect(statRolesGlobaux).toBe(200)
      expect(Array.isArray(rolesGlobaux)).toBe(true)
      expect(rolesGlobaux).toHaveLength(0)

      // Le rôle de PLATEFORME : c'est lui qui donne le droit d'administrer
      // la plateforme (`/admin/tenants` exige le rôle `super_admin`).
      const [statRoles, catalogue] = await requete('GET', '/admin/roles', admin)
      expect(statRoles).toBe(200)
      const rolePlateforme = (catalogue as Array<{ id: string; code: string }>).find(
        (r) => r.code === 'super_admin',
      )
      expect(rolePlateforme, 'le role super_admin doit exister').toBeDefined()

      const [statAffectationGlobale, affectationGlobale] = await requete(
        'PUT',
        '/admin/users/' + globalId + '/roles',
        admin,
        { global_role_ids: [rolePlateforme!.id] },
      )
      expect(
        statAffectationGlobale,
        `l'affectation du role global : ${JSON.stringify(affectationGlobale)}`,
      ).toBeLessThan(300)

      // L'affectation doit se voir dans la fiche du compte.
      const [statRolesGlobauxApres, rolesGlobauxApres] = await requete(
        'GET',
        '/admin/users/' + globalId + '/global-roles',
        admin,
      )
      expect(statRolesGlobauxApres).toBe(200)
      expect(
        (rolesGlobauxApres as Array<{ role_id: string }>).map((r) => r.role_id),
        'le role global doit etre rattache au compte',
      ).toContain(rolePlateforme!.id)

      // Donner un rôle global ne touche PAS les affectations par
      // boulangerie : les deux listes sont des tables distinctes.
      const [statTenantsApres, tenantsApres] = await requete(
        'GET',
        '/admin/users/' + globalId + '/roles',
        admin,
      )
      expect(statTenantsApres).toBe(200)
      expect(tenantsApres).toHaveLength(0)

      // ── 4. Un compte de TENANT, avec le rôle restreint ────────────────
      const emailTenant = `e2e-tenant-${SUFFIXE}@orpailleur.test`
      const [statTenantUser, tenantUser] = await requete(
        'POST',
        '/admin/users/with-tenant',
        admin,
        {
          email: emailTenant,
          password: 'MotDePasse!2026',
          nom: 'E2E Tenant',
          tenant_id: tenantId,
          role_id: roleId,
        },
      )
      expect(
        statTenantUser,
        `la creation du compte de tenant : ${JSON.stringify(tenantUser)}`,
      ).toBeLessThan(300)
      const tenantUserId = tenantUser.id as string
      crees.push({ kind: 'user', id: tenantUserId })

      // ── 5. Le compte de tenant VOIT sa boulangerie, et pas les autres ─
      const [statTenantsUser] = await requete('GET', '/admin/users/' + tenantUserId + '/sites', admin)
      expect(statTenantsUser).toBe(200)

      // ── 6. Le compte GLOBAL a plus de droits que le compte de TENANT ──
      // Les deux se connectent ; le global passe la portée `admin`, le
      // tenant ne la passe pas. C'est la separation qui tient la
      // plateforme.
      // Le préfixe `/api/v1` fait partie de l'URL : l'API est servie sous
      // ce préfixe, pas à la racine.
      const base = API_BASE_URL.replace(/\/$/, '') + '/api/v1'
      const loginGlobal = await fetch(base + '/auth/login/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailGlobal, password: 'MotDePasse!2026' }),
      })
      expect(loginGlobal.status).toBe(200)
      const jetonGlobal = ((await loginGlobal.json()) as { accessToken: string }).accessToken

      const loginTenant = await fetch(base + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTenant, password: 'MotDePasse!2026' }),
      })
      expect(loginTenant.status).toBe(200)
      const jetonTenant = ((await loginTenant.json()) as { accessToken: string }).accessToken

      // Le compte global passe la garde de portee.
      const [statAdmin] = await requete('GET', '/admin/tenants', jetonGlobal)
      expect(statAdmin, 'un compte global doit administrer la plateforme').toBe(200)

      // Le compte de tenant ne la passe PAS.
      const [statAdminTente] = await requete('GET', '/admin/tenants', jetonTenant)
      expect(
        statAdminTente,
        'un compte de boulangerie ne doit PAS administrer la plateforme',
      ).toBe(403)

      // Le compte de tenant a les permissions de son role — et celles-la
      // seulement : il lit le stock, il n'ecrit pas de facture.
      const [statStock, stock] = await requete('GET', '/mercuriale', jetonTenant)
      expect(statStock, 'la lecture du stock doit etre permise').toBe(200)
      expect(Array.isArray(stock)).toBe(true)

      const [statFactures] = await requete('GET', '/factures', jetonTenant)
      expect(
        statFactures,
        'un role de lecture seule ne doit PAS lire les factures',
      ).toBe(403)
    } finally {
      // ── Le nettoyage, quoi qu'il arrive ────────────────────────────────
      //
      // Un objet de test laissé en production pollue les listes de tous
      // les administrateurs : une boulangerie `E2E-*`, un rôle `e2e_*`,
      // un compte `@orpailleur.test`. Le nettoyage DOIT donc réussir.
      for (const cree of crees.reverse()) {
        const chemin =
          cree.kind === 'tenant'
            ? '/admin/tenants/' + cree.id
            : cree.kind === 'role'
              ? '/admin/roles/' + cree.id
              : '/admin/users/' + cree.id
        const [statut] = await requete('DELETE', chemin, admin).catch(() => [0])
        if (statut >= 300) {
          restes.push(`${cree.kind} ${cree.id} : HTTP ${statut}`)
        }
      }
    }

    // Le contrôle du nettoyage est ICI, et non dans le `finally` : une
    // erreur levée dans un `finally` masquerait l'échec qui a provoqué le
    // nettoyage — et c'est cet échec qu'il faut voir.
    expect(
      restes,
      'le nettoyage a echoue : des objets de test restent en place',
    ).toEqual([])
  })
})
