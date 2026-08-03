---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.26"
project: "WinGlows Suite"
created: "2026-05-17"
created_at: "2026-05-17 08:05:27 UTC"
updated: "2026-06-10"
updated_at: "2026-06-10 09:37:22 UTC"
status: active
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "unified-suite-authentication"
owner: "Diane"
user_story: "En tant que builder de la suite WinGlows, je veux une identité client unique avec des droits séparés par produit, afin qu'un utilisateur puisse réutiliser le même compte partout sans recevoir automatiquement accès à tous les produits."
confidence: medium
risk_level: high
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "winflows.com / WinGlows Formation"
  - "WinGlows Flutter app"
  - "ReplayGlowz / YouTube product"
  - "VoiceFlowz historical tracker, now legacy naming for WinGlows app"
  - "Firebase Auth"
  - "Google Cloud Identity Platform"
  - "Firestore Security Rules"
  - "Clerk"
  - "Convex"
  - "Polar"
  - "Google Play / App Store future purchases"
depends_on:
  - artifact: "docs/explorations/2026-05-16-unified-suite-auth.md"
    artifact_version: "1.0.2"
    required_status: "draft"
  - artifact: "docs/DECISIONS.md"
    artifact_version: "1.0.3"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/architecture.md"
    artifact_version: "1.0.1"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/guidelines.md"
    artifact_version: "1.0.1"
    required_status: "reviewed"
  - artifact: "shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md"
    artifact_version: "1.0.0"
    required_status: "ready"
  - artifact: "/home/claude/shipglows_data/specs/master-auth-playbook.md"
    artifact_version: "0.1.0"
    required_status: "draft"
  - artifact: "/home/claude/shipglows_data/projects/winglowz/docs/technical/suite-authentication.md"
    artifact_version: "1.0.9"
    required_status: "reviewed"
supersedes: []
evidence:
  - "User request 2026-05-17: one account across winflows.com, WinGlows app, and YouTube product, with access or no access per product."
  - "docs/explorations/2026-05-16-unified-suite-auth.md found no binding decision requiring separate auth per product."
  - "docs/explorations/2026-05-16-unified-suite-auth.md found VoiceFlowz historical task 'Configure Clerk for auth (shared with WinGlows)'. User later clarified VoiceFlowz / VoiceFlows is the old name of the WinGlows app, not a separate product."
  - "docs/DECISIONS.md targets Firebase Auth + Firestore as first hosted adapter for the WinGlows Android app, not as a suite-wide identity decision."
  - "shipglows_data/technical/architecture.md requires user ownership from backend auth context, not client-provided ids."
  - "firestore.rules currently scopes WinGlows app data under users/{uid} and denies cross-user access."
  - "Official Firebase, Google Identity Platform, Auth0, and Clerk docs checked 2026-05-17 for shared app resources, custom claims limits, tenant boundaries, SSO, and cross-origin session token behavior."
  - "Canonical decision documented 2026-05-17 in /home/claude/shipglows_data/projects/winglowz/docs/technical/suite-authentication.md: Clerk central identity, Firebase Android bridge, server-owned entitlements."
  - "Canonical support runbook added 2026-05-21 in the main WinGlows docs and linked from the app docs."
  - "Task 10 smoke-readiness log added 2026-05-21 in shipglows_data/workflow/TEST_LOG.md; final proof remains blocked until deployed Firebase/Convex/Firestore evidence exists."
  - "Production endpoint preflight 2026-05-22: winglowz-app and www.winglowz.com are reachable, but deployed Formation bridge endpoints `/api/bridge/firebase` and `/api/bridge/sync` return 404, so the real suite-auth smoke is blocked until deploy."
  - "Production env verification 2026-05-22: both Vercel deployments are Ready, but `winglowz` lacks Clerk/suite-auth runtime env and `winglowz-app` has no production env variables."
  - "Endpoint middleware fix 2026-05-22: Formation bridge/webhook/newsletter endpoints now bypass Clerk middleware and CORS is allowlist-based with `SUITE_API_ALLOWED_ORIGINS`; production still requires push/redeploy and env configuration."
  - "Android device auth debug 2026-05-23: Google Sign-In failed with `clientConfigurationError` because the APK did not receive a Google OAuth Web client ID as Android `serverClientId`."
  - "Android device auth debug 2026-05-23: email account creation failed with Firebase `CONFIGURATION_NOT_FOUND`; CLI evidence shows `identitytoolkit.googleapis.com` is enabled on `winglowz-dev` but not on prod project `winglowz`."
  - "Android device auth debug 2026-05-23: password manager detected the password field but not email; the sign-in form now groups autofill fields and exposes email as both `username` and `email`."
  - "Hosted Flutter web auth debug 2026-05-23: `app.winglowz.com` renders the official Google Identity Services button, but Google rejects the current origin for the configured OAuth client ID."
  - "Firebase CI/rules migration 2026-05-23: GitHub Actions WIF, deploy service account, Firestore database, rules/index deploy, auth-config validation and debug APK build now pass against `winglowz-suite`."
  - "Legacy Google Cloud project `winglowz` deletion requested 2026-05-23 after migration to `winglowz-suite`."
  - "User correction 2026-05-23: ReplayGlowz is the canonical YouTube product and `product_id=replayglowz`; the old YouTube product naming is legacy only."
  - "User decision 2026-06-10: Diane prefers one central ledger across her operated products because she is the sole operator and has no current plan to sell separate businesses."
next_step: "ship the Flutter web init/id-token error handling patch, redeploy `winglowz-app`, then rerun Google web and email/password auth smoke"
---

# Title

Unified WinGlows Suite Authentication

# Status

Ready for `/sf-start` after the 2026-05-19 readiness gate. The product direction and provider gate are explicit: Clerk is the long-term suite identity provider, Firebase Auth remains the WinGlows Android app adapter for now, and a server-owned bridge maps Firebase users to `global_user_id`. The first proof pair is WinGlows Formation plus the WinGlows Android app. The bridge writes a server-owned Firestore `suiteAccess/{uid}` mirror for `winglowz_app`, app product stores require suite entitlement before using Firestore, Formation Polar grant/refund/revoke paths now call an internal sync endpoint that recomputes that mirror from Convex outside the login bridge path, and the Firebase bridge rejects revoked/disabled Firebase sessions through Firebase Admin revocation checks. The WinGlows Formation repository is available at `/home/claude/winglowz`, and active app docs now distinguish legacy direct app-stack Clerk from Clerk as suite identity provider.

# User Story

En tant que builder de la suite WinGlows, je veux une identité client unique avec des droits séparés par produit, afin qu'un utilisateur puisse réutiliser le même compte partout sans recevoir automatiquement accès à tous les produits.

Acteur principal: builder WinGlows Suite.

Acteurs secondaires:

- utilisateur qui s'inscrit sur un produit puis essaie un autre produit;
- utilisateur existant sur le site WinGlows Formation;
- utilisateur existant ou futur de l'app WinGlows Android;
- utilisateur existant ou futur de ReplayGlowz;
- opérateur support;
- systèmes de paiement et d'entitlement: Polar, stores mobiles, grants manuels;
- backends produit: Firebase/Firestore, Clerk/Convex, futurs backends.

Déclencheurs:

- un utilisateur crée ou utilise un compte dans un produit de la suite;
- ce même utilisateur essaie de se connecter à un autre produit;
- un paiement, remboursement, grant manuel ou achat store mobile modifie un droit produit;
- un backend produit doit autoriser une lecture ou écriture user-scoped;
- un compte existant apparaît dans plusieurs providers avec la même adresse email.

Résultat observable attendu: l'utilisateur peut se reconnaître avec le même compte sur les produits WinGlows, mais chaque produit vérifie ses propres droits avant d'afficher ou de muter des données. Un compte sans entitlement voit un état professionnel "même compte, accès non actif" au lieu d'un faux accès, d'un crash ou d'une inscription dupliquée.

# Minimal Behavior Contract

La suite accepte une identité client globale et associe cette identité à des entitlements par produit. Une authentification réussie prouve qui est la personne; elle ne donne accès qu'aux produits dont l'entitlement est actif. Quand l'utilisateur arrive sur un produit sans droit actif, le produit reconnaît son compte, explique que l'accès n'est pas activé et propose le chemin approprié sans créer un second compte. En cas d'échec provider, token, paiement, migration ou backend, aucun droit n'est élargi, aucune donnée produit n'est exposée, et le diagnostic reste redigé. L'edge case facile à rater est le doublon email: deux comptes historiques avec la même adresse ne doivent jamais être fusionnés silencieusement.

# Success Behavior

- Given un utilisateur crée un compte sur un produit, when il tente de se connecter à un autre produit de la suite avec le même identifiant, then le système reconnaît la même identité globale ou propose un linking explicite sans duplicat silencieux.
- Given un utilisateur a un compte global mais aucun droit ReplayGlowz, when il ouvre ReplayGlowz, then il voit un état connecté sans accès produit, avec un CTA achat/waitlist/support selon le produit, et aucune donnée ReplayGlowz privée n'est lue.
- Given un utilisateur a un entitlement actif `winglowz_app`, when il se connecte à l'app WinGlows, then l'app peut utiliser son identité globale et ses données restent sous un namespace produit protégé.
- Given un webhook Polar ou store mobile confirme un achat, when l'événement est vérifié, then une ligne entitlement idempotente est créée ou mise à jour pour le bon `global_user_id`, le bon `product_id`, le bon plan et le bon statut.
- Given un remboursement, expiration ou révocation arrive, when le backend entitlements le traite, then l'accès produit est retiré sans supprimer l'identité globale ni les données conservées selon la policy produit.
- Given un backend reçoit une requête produit, when il valide le token de session, then il vérifie aussi l'entitlement et le namespace produit côté serveur avant toute donnée sensible.
- Preuve de succès attendue: matrice provider décidée, contrat `Global Identity / Entitlements / Product Data` documenté, règles ou checks backend écrits, tests d'accès autorisé/refusé, test webhook idempotent, smoke inter-produit sur au moins deux produits.

# Error Behavior

- Provider indisponible ou mal configuré: le produit affiche une erreur récupérable et journalise provider, environnement et code redigés; il ne bascule pas vers un accès produit implicite.
- Compte non reconnu dans le provider central: le produit propose création de compte ou migration/linking explicite selon le statut historique; il ne crée pas automatiquement plusieurs identités pour le même utilisateur.
- Doublon email historique: le système bloque la fusion automatique et crée un dossier de linking explicite avec preuve de possession des deux sessions ou intervention support.
- Entitlement absent: le produit affiche "compte reconnu, accès non actif" et refuse les lectures/mutations produit côté backend.
- Entitlement expiré, remboursé ou révoqué: le produit garde l'identité globale, désactive les capacités premium et expose un état clair; il ne supprime pas brutalement les données sans policy écrite.
- Token valide mais audience/issuer/app incorrect: le backend refuse avec 401/403 et ne tente pas de faire confiance à un email, user id client ou header non signé.
- Webhook paiement invalide, rejoué ou partiel: l'événement est rejeté ou gardé en état `pending_review`, sans grant produit.
- Cross-origin session manquante: l'app web/API demande un bearer token ou redirige vers l'auth centrale; elle ne dépend pas d'un cookie tiers implicite.
- Ce qui ne doit jamais arriver: accès produit accordé par simple existence d'un compte, fusion silencieuse sur email seul, stockage durable d'entitlements seulement dans des custom claims, user id fourni par le client utilisé pour l'autorisation, token/session secret loggué, cross-product data leak, tenant produit traité comme identité commune alors qu'il isole des utilisateurs.

# Problem

Les produits WinGlows ont grandi avec des stacks d'auth différentes: WinGlows app cible Firebase Auth/Firestore, le site WinGlows Formation a des traces Clerk/Convex/Polar, ReplayGlowz a des traces Clerk/Convex/YouTube OAuth issues de l'ancien nom produit, et le playbook auth workspace recommande surtout un propriétaire de session par runtime. Rien dans les documents locaux ne justifie une séparation durable des comptes par produit. À l'inverse, une séparation produit créerait des doublons de comptes, plus de support, plus de reset password, plus de surface de configuration auth et une expérience moins professionnelle.

Le risque opposé est de confondre "un compte" et "accès à tout". Une identité globale mal modélisée peut élargir les permissions, mélanger des données produit, casser les paiements, ou fusionner des utilisateurs historiques à tort.

# Solution

Adopter un modèle suite en trois couches: identité globale, entitlements par produit, et données produit namespacées. La cible produit est un seul compte client réutilisable sur les produits first-party WinGlows. L'accès reste contrôlé par des entitlements serveur, stockés dans une source de vérité durable, et vérifiés par chaque backend avant toute donnée produit.

L'implémentation doit être progressive. La première tranche ne migre pas tous les produits en une passe: elle applique la décision canonique `Clerk central + Firebase Android bridge`, écrit le contrat d'identité, crée le registre d'entitlements, puis prouve le flux sur WinGlows Formation et l'app WinGlows Android avant d'élargir.

# Scope In

- Décision d'architecture sur le modèle d'identité suite:
  - une identité globale;
  - entitlements séparés par produit;
  - données produit namespacées et gardées côté backend;
  - environnements local/preview/staging/prod séparés.
- Provider et bridge de première tranche:
  - Clerk est le provider central long terme de l'identité suite;
  - Firebase Auth reste l'adaptateur auth de l'app WinGlows Android;
  - un bridge serveur mappe Firebase `uid` et Clerk user id vers `global_user_id`;
  - Auth0 reste un fallback enterprise futur, pas le choix de première tranche;
  - Firebase/Identity Platform tenants par produit restent rejetés pour l'identité consumer suite.
- Modèle de données:
  - `global_users`;
  - `identity_accounts`;
  - `product_entitlements`;
  - `product_access_events`;
  - namespaces produit.
- Canon initial `product_id`:
  - `winglowz_formation`;
  - `winglowz_app`;
  - `replayglowz`.
  - l'ancien product id YouTube n'est plus accepté au runtime; les migrations doivent normaliser les historiques vers `replayglowz`.
  - Legacy VoiceFlowz / VoiceFlows references map to `winglowz_app`, not to a separate product id.
- Contrats de token et backend:
  - issuer/audience/app id vérifiés;
  - user id global non fourni par le client;
  - entitlement vérifié serveur avant accès produit;
  - custom claims limitées aux flags courts/cache, pas source de vérité.
- Migration des comptes existants:
  - inventaire Clerk/Firebase/Convex/Polar;
  - linking explicite;
  - politique doublon email;
  - rollback par produit.
- UX produit:
  - connecté sans accès;
  - accès expiré/remboursé;
  - compte déjà existant;
  - linking requis;
  - support diagnostic redigé.
- Tests et vérification:
  - accès accordé/refusé;
  - webhook idempotent;
  - cross-product sign-in;
  - session restore;
  - sign-out;
  - data isolation.
- Documentation:
  - décision provider;
  - contrat d'identité suite;
  - setup env/provider;
  - runbook migration/support.

# Scope Out

- Pas de grant automatique à tous les produits parce qu'un compte existe.
- Pas de migration simultanée de tous les produits en une seule release.
- Pas de refonte pricing ou packaging produit hors entitlements nécessaires.
- Pas d'enterprise SSO/SAML, organisations/team admin ou multi-tenant B2B tant qu'un produit B2B ne l'exige pas.
- Pas de suppression de Firebase Auth dans l'app WinGlows avant qu'un bridge ou provider central prouvé existe.
- Pas de suppression de Clerk/Convex/Polar côté site sans spec de migration propre.
- Pas d'Auth0, SAML, enterprise orgs ou provider alternatif dans la première tranche.
- Pas de merge automatique de comptes historiques sur email seul.
- Pas de stockage de secrets, tokens, payload OAuth ou clés provider dans docs, logs, analytics, Firestore client-readable ou support copy.

# Constraints

- Authentification et autorisation sont séparées: identité globale ne vaut pas entitlement.
- Chaque runtime garde un seul propriétaire de session documenté.
- Les environnements local, preview, staging et production restent séparés dans les providers, callbacks et secrets.
- Les données produit restent namespacées par `product_id` et `global_user_id` ou par chemins équivalents protégés.
- Les backends valident issuer, audience, expiration, signature et subject avant de mapper une session.
- Les produits ne font jamais confiance à un `user_id`, `global_user_id`, `product_id` ou `entitlement` fourni par le client.
- Les custom claims peuvent accélérer l'UI ou porter un rôle court, mais la source de vérité des entitlements est serveur.
- Les tenants Identity Platform ne sont pas le modèle par défaut des produits: un tenant isole des utilisateurs, ce qui contredit l'objectif d'un compte unique.
- Toute migration de compte historique doit être réversible ou au minimum auditable.
- Le premier proof doit couvrir WinGlows Formation et l'app WinGlows Android, sinon on n'a pas prouvé la promesse suite.
- Les `product_id` internes sont une allowlist stable. Les IDs externes Polar, Clerk Billing, Google Play, App Store ou Stripe restent des références de source (`source_ref`) et ne remplacent pas `product_id`.
- Un seul ledger d'entitlements est le défaut pour les produits opérés par Diane. Un produit ne crée pas son propre ledger durable tant qu'il peut s'intégrer au ledger suite avec un `product_id`.
- Un ledger séparé exige une spec dédiée et une raison explicite: vente/spin-out, entité juridique ou opérateur séparé, contrainte réglementaire/app-store/offline/tenant-isolation, ou adaptateur de migration temporaire avec plan de retrait.

# Dependencies

## Local Dependencies

- `docs/explorations/2026-05-16-unified-suite-auth.md`: exploration source, aucune décision solide trouvée contre l'identité partagée.
- `docs/DECISIONS.md`: WinGlows app cible Firebase Auth + Firestore comme premier adaptateur Android.
- `shipglows_data/technical/architecture.md`: l'identité distante vient du backend auth context, pas du client.
- `shipglows_data/technical/guidelines.md`: ne pas ajouter de nouveau couplage Convex/Clerk/Supabase dans l'app WinGlows cible.
- `firestore.rules`: isolation actuelle sous `users/{uid}` pour l'app WinGlows.
- `/home/claude/shipglows_data/specs/master-auth-playbook.md`: standard transverse d'un propriétaire de session par runtime.
- `/home/claude/shipglows_data/projects/VoiceFlowz/TASKS.md`: legacy tracker for the app now known as WinGlows app; trace historique "Configure Clerk for auth (shared with WinGlows)".
- `/home/claude/shipglows_data/projects/winglowz/docs/technical/suite-authentication.md`: décision canonique du projet principal WinGlows.
- `/home/claude/winglowz`: WinGlows Formation repo; Astro 6 with Clerk, Polar, Convex, checkout and entitlement surfaces.

## Fresh External Docs Checked

- Firebase project docs, checked 2026-05-17: apps in the same Firebase project share backends including Authentication and Firestore. Source: https://firebase.google.com/docs/projects/learn-more
- Firebase custom claims docs, checked 2026-05-17: custom claims are for access-control data, are included in ID tokens, and are limited to 1000 bytes. Source: https://firebase.google.com/docs/auth/admin/custom-claims
- Google Cloud Identity Platform multi-tenancy docs, checked 2026-05-17: tenants create user/configuration silos and are most common for B2B isolation. Source: https://cloud.google.com/identity-platform/docs/multi-tenancy
- Auth0 SSO docs, checked 2026-05-17: SSO centralizes authentication across applications and domains through a central auth domain/session model. Source: https://auth0.com/docs/authenticate/single-sign-on
- Auth0 B2B auth guidance, checked 2026-05-17: with more than one application, best practice is a centralized authentication location; native apps should use system browser/OIDC-style flows. Source: https://auth0.com/docs/get-started/architecture-scenarios/business-to-business/authentication
- Clerk authenticated requests docs, checked 2026-05-17: same-origin requests can include session automatically; cross-origin requests require bearer token forwarding. Source: https://clerk.com/docs/guides/development/making-requests

Fresh-docs verdict: `fresh-docs checked`. The docs support the architecture direction, and the provider direction is now documented canonically as Clerk central identity plus a Firebase Android bridge.

# Invariants

- One person can have one global suite identity.
- One global identity can have zero, one, or many product entitlements.
- Product access is denied by default.
- Entitlement state is server-owned and auditable.
- Product data is private by default and scoped to product plus user.
- Product sites can remain separate websites while sharing identity.
- A shared identity does not require shared product database tables for all data.
- Existing users are not silently merged.
- Support diagnostics identify provider/environment/failure layer without exposing secrets.
- The suite auth layer must make future MFA/passkeys possible without rewriting every product.

# Links & Consequences

- `docs/DECISIONS.md`: now clarifies that Firebase remains the app's current adapter while Clerk is the suite identity target.
- `shipglows_data/technical/architecture.md`: now separates direct Android app auth from suite identity bridge.
- `shipglows_data/technical/guidelines.md`: now allows Clerk as suite identity without reviving the old app stack.
- `firestore.rules`: may need product namespace and entitlement checks if WinGlows app begins using shared suite IDs or shared entitlement docs.
- `lib/features/auth/domain/auth_session_store.dart`: may need `globalUserId`, `suiteAccountStatus`, and provider metadata separate from Firebase `uid`.
- `lib/features/auth/application/auth_session_provider.dart`: may need a `SuiteIdentitySession` adapter or bridge.
- `lib/features/*/application/*_store_provider.dart`: must continue selecting stores from auth state without trusting client-provided IDs.
- WinGlows Formation site: Clerk/Convex/Polar user and entitlement model must be audited before linking to suite identity.
- ReplayGlowz: Clerk/Convex/YouTube OAuth must remain separate from suite login; YouTube OAuth grants product permissions, not suite identity. Former YouTube product names are legacy aliases only.
- Support/docs: account help must explain "same account, access depends on product" without advertising unrelated products prematurely.

# Documentation Coherence

Update or create:

- `/home/claude/shipglows_data/projects/winglowz/docs/technical/suite-authentication.md`: canonical suite identity, entitlement, migration and support contract.
- `docs/technical/suite-authentication.md`: local app pointer to the canonical decision.
- `docs/DECISIONS.md`: reviewed pointer for shared suite identity principle and selected provider/bridge.
- `shipglows_data/technical/architecture.md`: linked suite identity architecture and data boundaries.
- `shipglows_data/technical/guidelines.md`: coding rules for global identity, entitlement checks, provider boundaries and redaction.
- Product docs for WinGlows app, WinGlows Formation and ReplayGlowz: login/access copy, setup env, smoke steps.
- `.env.example` or equivalent per product: auth domain, audience, issuer, callback, webhook secret names, without real secrets.
- Support runbook: duplicate email, account linking, entitlement missing, refund/revoke, provider outage.
- Changelog entry only after an implementation tranche is actually shipped.

# Edge Cases

- User has Firebase account in WinGlows app and Clerk account on WinGlows Formation with same email.
- User uses Google provider in one product and email/password in another.
- User changes email in the provider after buying a product.
- User signs in to a product where they have no entitlement.
- User buys while signed out, then signs in with an email that already exists in another provider.
- Payment webhook arrives before provider user creation finishes.
- Payment webhook is retried or arrives out of order after refund.
- User deletes account in one product but has entitlements/data in another product.
- User signs out from one product while another has an active central session.
- A cross-origin app fails to forward the bearer token.
- A mobile app cannot use browser SSO cookies and needs token/session exchange.
- Product id is misspelled or omitted in entitlement checks.
- Custom claims are stale after entitlement update.
- Nouveau produit Diane-operated, par exemple Temu Shopping Lists, tente d'ajouter billing, sync cloud, activation codes ou premium gates sans s'inscrire dans le ledger suite.
- Firestore rules or Convex functions check identity but forget product entitlement.
- Support manually grants access to the wrong product or environment.

# Implementation Tasks

- [ ] Tâche 1 : Aligner les docs locales WinGlows app sur la décision canonique
  - Fichiers : `docs/DECISIONS.md`, `shipglows_data/technical/architecture.md`, `shipglows_data/technical/guidelines.md`, `docs/technical/suite-authentication.md`
  - Action : préciser que Clerk est l'identité suite long terme, Firebase Auth reste l'adaptateur Android, et le bridge Firebase `uid` -> `global_user_id` est obligatoire avant accès suite.
  - User story link : évite que l'app Android recrée un domaine d'auth séparé ou migre prématurément vers Clerk Flutter/native.
  - Depends on : none.
  - Validate with : `rg -n "Clerk|Firebase Auth|global_user_id|suite identity|entitlement" docs/DECISIONS.md shipglows_data/technical docs/technical/suite-authentication.md`.
  - Notes : ne pas présenter Clerk Flutter/native comme chemin Android production tant qu'un smoke device dédié ne le prouve pas.

- [ ] Tâche 2 : Écrire le contrat canonique Global Identity / Entitlements / Product Data
  - Fichiers : `/home/claude/shipglows_data/projects/winglowz/docs/technical/suite-authentication.md`, `docs/technical/suite-authentication.md`, futurs docs API/backend du registre d'entitlements.
  - Action : définir ou confirmer `global_user_id`, `identity_accounts`, `product_entitlements`, `product_access_events`, `product_id`, `plan`, `status`, `source`, `source_ref`, `environment`, timestamps, idempotency keys et audit events.
  - User story link : permet même compte sans accès automatique.
  - Depends on : Tâche 1.
  - Validate with : contrat relu contre WinGlows app et WinGlows Formation; aucun champ `user_id`, `global_user_id`, `product_id` ou entitlement client-trusted.
  - Notes : les entitlements longs restent en DB; token claims seulement cache court ou flags non source de vérité.

- [x] Tâche 3 : Ajouter les contrats domaine côté app pour identité suite et entitlement
  - Fichiers : `lib/features/auth/domain/suite_identity.dart`, `lib/features/auth/domain/product_entitlement.dart`, `lib/features/auth/domain/suite_identity_store.dart`, tests associés sous `test/`
  - Action : créer des modèles typés pour `globalUserId`, provider accounts, `productId`, plan/status/source, et une interface de lecture d'identité suite sans exposer de provider SDK à l'UI.
  - User story link : permet à l'app d'afficher "compte reconnu, accès produit actif/non actif" sans confondre auth Firebase et droit produit.
  - Depends on : Tâche 1, Tâche 2.
  - Validate with : `dart format --set-exit-if-changed .`, `flutter analyze`, `flutter test test/*suite* test/*entitlement*`.
  - Notes : utiliser `ProductId` allowlist, pas une string libre venue du client.

- [ ] Tâche 4 : Auditer les comptes et IDs existants avant linking
  - Fichiers : `/home/claude/shipglows_data/projects/winglowz/docs/technical/suite-authentication.md`, `/home/claude/winglowz/convex/schema.ts`, `/home/claude/winglowz/convex/users.ts`, `/home/claude/winglowz/convex/http.ts`, `/home/claude/winglowz/src/pages/api/clerk/webhook.ts`, `/home/claude/winglowz/src/pages/api/polar/checkout.ts`
  - Action : lister sources utilisateurs et paiements: Firebase Auth, Clerk users, Convex users/course entitlements, Polar customer/subscription/order ids, ReplayGlowz users, legacy YouTube product aliases et YouTube OAuth grants.
  - User story link : empêche merge silencieux et perte d'accès.
  - Depends on : Tâche 2.
  - Validate with : inventaire documenté par produit; cas doublon email catégorisés; aucun secret exporté dans le repo.
  - Notes : utiliser des comptes de test ou métriques agrégées; ne pas commit de PII.

- [ ] Tâche 5 : Implémenter ou spécifier le registre d'entitlements serveur
  - Fichiers : `/home/claude/winglowz/convex/schema.ts`, `/home/claude/winglowz/convex/http.ts`, `/home/claude/winglowz/convex/polar.ts`, `/home/claude/winglowz/convex/users.ts`, `/home/claude/shipglows_data/projects/winglowz/docs/technical/suite-authentication.md`, docs API/backend du registre.
  - Action : créer ou spécifier la source de vérité `product_entitlements` avec writes idempotents depuis Polar/Clerk Billing futur/app stores/grants manuels et reads contrôlés côté serveur.
  - User story link : un compte peut exister sans accès produit.
  - Depends on : Tâche 2, Tâche 4.
  - Validate with : tests create/update/revoke/idempotency; cross-product deny; webhook replay deny.
  - Notes : les règles doivent refuser par défaut et ne jamais accorder depuis payload client.
  - Progress 2026-05-21 : registre Convex initial implémenté pour Formation avec grant, refund/revoke, event log, idempotence, query d'accès et bridge Firebase -> suite identity protégé par Firebase Admin + `SUITE_BRIDGE_CONVEX_SECRET`; tests de payload webhook réels et smoke bridge avec vrai token restent à faire.
  - Progress 2026-05-21 : snapshot Convex protégé par `globalUserId` ajouté pour recomposer les entitlements autorisés et les Firebase UIDs liés; le sync Firestore ne reçoit pas de payload d'entitlement client.

- [x] Tâche 6 : Adapter WinGlows app au contrat suite sans casser Firebase local-first
  - Fichiers : `lib/features/auth/domain/auth_session_store.dart`, `lib/features/auth/application/auth_session_provider.dart`, `lib/features/auth/data/firebase_auth_session_store.dart`, `lib/features/settings/presentation/settings_screen.dart`, `firestore.rules`, nouveaux fichiers de la Tâche 3.
  - Action : exposer l'identité suite ou mapping bridge quand disponible, afficher accès `winglowz_app` selon entitlement, conserver fallback local explicite, et garder données app sous namespace protégé.
  - User story link : l'app WinGlows participe au compte unique sans perdre sa sécurité Android/Firebase.
  - Depends on : Tâche 3, Tâche 5.
  - Validate with : `dart format --set-exit-if-changed .`, `flutter analyze`, `flutter test`, smoke Android auth + entitlement.
  - Notes : ne pas remplacer Firebase Auth dans cette première tranche; adapter derrière contrat backend-agnostic.
  - Progress 2026-05-21 : app raccordée au bridge via `SUITE_IDENTITY_BRIDGE_URL`; URL absente, token absent, HTTP non-200, JSON invalide, schéma inattendu et produit inconnu restent fail-closed avec diagnostics redigés.
  - Progress 2026-05-21 : Firestore rules exigent maintenant un miroir serveur `suiteAccess/{uid}` avec `products.winglowz_app.active == true` avant les lectures/écritures sous `users/{uid}`; les providers de stores Flutter restent locaux tant que `suiteIdentityProvider` ne voit pas d'entitlement `winglowz_app`.

- [ ] Tâche 7 : Adapter WinGlows Formation checkout/account au contrat suite
  - Fichiers : `/home/claude/winglowz/src/pages/api/polar/checkout.ts`, `/home/claude/winglowz/src/pages/api/polar/webhook.ts`, `/home/claude/winglowz/src/pages/api/clerk/webhook.ts`, `/home/claude/winglowz/convex/http.ts`, `/home/claude/winglowz/convex/users.ts`, `/home/claude/winglowz/src/utils/courseGating.ts`, `/home/claude/winglowz/shipglows_data/technical/architecture.md`.
  - Action : mapper Clerk/Convex/Polar ou provider choisi vers `global_user_id`, créer/mettre à jour entitlement formation, et afficher état compte/access.
  - User story link : un acheteur formation devient compte suite sans accès automatique aux apps.
  - Depends on : Tâche 5.
  - Validate with : test public lesson -> login -> checkout -> webhook -> lesson privée; refund/revoke; duplicate email.
  - Notes : Polar webhook signature et idempotency obligatoires.
  - Progress 2026-05-21 : checkout envoie le product id canonique et Clerk id; course gating préfère le ledger d'entitlements et garde un fallback legacy.
  - Progress 2026-05-21 : endpoint serveur `POST /api/bridge/firebase` ajouté pour l'app; il vérifie le Firebase ID token côté serveur, refuse issuer/audience invalides, et n'écrit Convex qu'avec le secret bridge configuré.
  - Progress 2026-05-21 : `POST /api/bridge/firebase` vérifie maintenant les Firebase ID tokens avec contrôle de révocation activé (`checkRevoked=true`); les sessions Firebase révoquées ou désactivées sont refusées avant linking Convex ou écriture Firestore.
  - Progress 2026-05-21 : le bridge écrit aussi le miroir Firestore `suiteAccess/{firebaseUid}` après lookup Convex; ce miroir reste server-owned et inaccessible au client selon les rules.
  - Progress 2026-05-21 : endpoint interne `POST /api/bridge/sync` ajouté; il accepte seulement `{ globalUserId }` avec secret serveur, relit Convex, résout les Firebase UIDs liés et réécrit `suiteAccess/{firebaseUid}` avec Firebase Admin.
  - Progress 2026-05-21 : les chemins Polar grant/refund/revoke appellent maintenant le sync après mutation d'entitlement; un échec de sync retourne une erreur retryable au webhook au lieu de laisser un miroir stale en silence.

- [ ] Tâche 8 : Adapter ReplayGlowz sans confondre YouTube OAuth et suite identity
  - Fichiers : repo ReplayGlowz concerné; auth/session docs; YouTube OAuth routes.
  - Action : connecter la session suite au produit ReplayGlowz, mais garder les tokens YouTube comme grants produit séparés et révocables.
  - User story link : même compte pour entrer dans ReplayGlowz, mais YouTube reste une permission externe spécifique.
  - Depends on : Tâche 5, Tâche 7.
  - Validate with : login suite; no entitlement deny; entitlement allow; YouTube connect/disconnect; sign-out.
  - Notes : ne jamais utiliser un refresh token YouTube comme identité suite; cette tâche peut attendre la preuve WinGlows Formation + app Android.

- [ ] Tâche 9 : Écrire le flow UX/support "compte reconnu, accès non actif"
  - Fichiers : produits concernés; `/home/claude/shipglows_data/projects/winglowz/docs/technical/suite-authentication.md`; support runbook.
  - Action : standardiser messages pour accès absent, expiré, refund, linking requis, doublon email, provider outage.
  - User story link : facilite l'accès à tes produits sans forcer l'utilisateur à connaître toute la suite.
  - Depends on : Tâche 2, Tâche 5.
  - Validate with : snapshots/widget/browser checks selon produit; messages sans promesse d'accès automatique.
  - Notes : ne pas faire de cross-sell agressif dans les produits où l'utilisateur n'a rien demandé.

- [ ] Tâche 10 : Vérifier la première tranche inter-produit avant ship
  - Fichiers : `docs/VERIFICATION.md`, `shipglows_data/workflow/TEST_LOG.md`, docs produit concernées.
  - Action : consigner smoke réel WinGlows Formation + WinGlows Android app: signup/signin, entitlement allow, entitlement deny, session restore, sign-out, webhook grant/revoke, backend data deny.
  - User story link : prouve que le compte unique est vendable et sécurisé.
  - Depends on : Tâches 6 et 7.
  - Validate with : logs de test redigés; aucune PII/token; checks automatisés passés.
  - Notes : sans ce proof, ne pas annoncer l'auth suite comme shipped.
  - Progress 2026-05-21 : smoke-readiness log ajouté dans `shipglows_data/workflow/TEST_LOG.md`; le smoke est défini comme preuve minimale end-to-end WinGlows Formation + WinGlows app, et la checklist sépare preuves locales, environnement déployé et actions manuelles Diane.
  - Progress 2026-05-22 : preflight production non-secret effectué; `winglowz-app.vercel.app` et `www.winglowz.com` répondent, mais les endpoints Formation `/api/bridge/firebase` et `/api/bridge/sync` retournent 404. Le smoke réel reste bloqué par déploiement.
  - Progress 2026-05-22 : après push, les endpoints Formation répondent 500 et les logs Vercel montrent `Publishable key is missing` côté Clerk. Les variables Vercel production requises pour `winglowz` et `winglowz-app` ne sont pas configurées.
  - Progress 2026-05-22 : fix local ajouté dans `/home/claude/winglowz` pour que `/api/bridge/*`, les webhooks et les APIs newsletter bypassent Clerk; `/api/polar/checkout` reste Clerk-authentifié. Preuve locale: le bridge répond maintenant par erreur JSON contrôlée sans secrets Clerk, et le CORS reflète seulement les origines autorisées.

# Acceptance Criteria

- [ ] CA 1 : Given la spec est relue, when on cherche la décision produit, then elle dit clairement "identité suite unique, entitlements séparés, accès refusé par défaut".
- [ ] CA 2 : Given un agent frais lit la spec et la décision canonique WinGlows, when il cherche le provider de première tranche, then il voit Clerk central identity + Firebase Android bridge sans option concurrente active.
- [ ] CA 3 : Given un utilisateur possède un compte global sans entitlement produit, when il ouvre ce produit, then il est reconnu mais l'accès produit est refusé côté UI et backend.
- [ ] CA 4 : Given un utilisateur possède un entitlement actif, when il ouvre le produit correspondant, then le backend autorise seulement les données de ce produit et de cet utilisateur.
- [ ] CA 5 : Given un utilisateur possède des comptes historiques avec la même adresse email dans deux providers, when la migration détecte ce cas, then aucune fusion automatique n'a lieu sans linking explicite ou support review.
- [ ] CA 6 : Given un webhook paiement valide est reçu deux fois, when il est traité, then l'entitlement final est correct et aucun double grant incohérent n'est créé.
- [ ] CA 7 : Given un webhook invalide, expiré ou signé avec le mauvais secret est reçu, when il est traité, then aucun entitlement n'est créé ou élargi.
- [ ] CA 8 : Given un token session a le mauvais issuer/audience/environment, when un backend produit le reçoit, then la requête est refusée.
- [ ] CA 9 : Given custom claims existent, when un entitlement change, then le backend continue de lire la source de vérité serveur et ne dépend pas d'un token stale pour autoriser une mutation sensible.
- [ ] CA 10 : Given un utilisateur se déconnecte d'un produit, when il revient sur une route protégée, then la session locale produit et l'accès backend sont invalidés selon le provider choisi.
- [ ] CA 11 : Given un utilisateur ReplayGlowz connecte YouTube, when il se déconnecte de YouTube, then son identité suite reste intacte mais les permissions YouTube produit sont retirées.
- [ ] CA 12 : Given la première tranche est proposée au ship, when `sf-verify` relit les preuves, then WinGlows Formation et WinGlows Android app prouvent compte, entitlement allow/deny, backend deny et sign-out.

# Test Strategy

- Unit tests:
  - product id allowlist validation for `winglowz_formation`, `winglowz_app`, and `replayglowz`, with old YouTube product ids rejected at runtime;
  - legacy VoiceFlowz / VoiceFlows references map to `winglowz_app` and cannot create a separate entitlement namespace;
  - entitlement model validation;
  - duplicate email/linking policy;
  - token claims parsing without trusting client input;
  - webhook idempotency and invalid signature behavior;
  - provider mapping from Firebase/Clerk IDs to `global_user_id`.
- Backend/security tests:
  - unauthenticated deny;
  - authenticated no-entitlement deny;
  - wrong product deny;
  - wrong user deny;
  - expired/refunded entitlement deny;
  - valid entitlement allow.
- App/web tests:
  - connected without access state;
  - access active state;
  - route guard restore;
  - sign-out cleanup;
  - account already exists/linking required copy.
- Manual smoke:
  - create test user through WinGlows Formation / Clerk;
  - open WinGlows Android app with no `winglowz_app` entitlement;
  - grant `winglowz_app` entitlement via test webhook/manual admin;
  - retry WinGlows Android app access;
  - revoke entitlement;
  - verify backend denies after revoke.
- Documentation checks:
  - `rg -n "global_user_id|product_entitlements|suite identity|entitlement|tenant|custom claims" docs shipglows_data`;
  - redaction review for logs and support examples.

# Risks

- High: the Clerk central + Firebase Android bridge can create account-linking complexity if mapping and duplicate-email rules are not server-owned and auditable.
- High: silent account merge by email can hand data or purchases to the wrong person.
- High: entitlement bugs can grant paid products incorrectly or deny paying users.
- High: storing too much authorization state in token custom claims creates stale access and size/performance problems.
- High: tenants per product would reintroduce separate user silos and defeat the user story.
- Medium: shared identity increases auth incident blast radius; MFA, rate limits, audit logs and provider monitoring become more important.
- Medium: product UX may accidentally advertise all products to users who only wanted one; copy must stay contextual.
- Medium: multiple providers during bridge phase add operational complexity and support burden.
- Medium: mobile app SSO differs from web SSO; native flows may need system browser/OIDC rather than cookie sharing.

# Execution Notes

- Read first:
  - `docs/explorations/2026-05-16-unified-suite-auth.md`;
  - `docs/DECISIONS.md`;
  - `shipglows_data/technical/architecture.md`;
  - `/home/claude/shipglows_data/specs/master-auth-playbook.md`;
  - `/home/claude/shipglows_data/projects/winglowz/docs/technical/suite-authentication.md`;
  - `/home/claude/winglowz/AGENT.md`;
  - `/home/claude/winglowz/shipglows_data/technical/architecture.md`;
  - `/home/claude/winglowz/shipglows_data/technical/context-function-tree.md`;
  - current Clerk, Firebase, Convex and billing docs relevant to the implementation slice.
- Start with docs/contract alignment, then code the smallest bridge/entitlement slice.
- Keep the first implementation slice narrow: WinGlows Formation plus WinGlows Android app.
- Prefer provider-neutral domain contracts in WinGlows app; do not make Flutter UI depend directly on a new provider SDK unless Task 1 selects that provider.
- Treat product IDs as an allowlist, not free-form user input.
- Store entitlements in a server-controlled database with audit trail; custom claims can mirror compact status only after source-of-truth checks.
- Use separate dev/staging/prod providers, callbacks, webhook secrets and test users.
- Stop conditions:
  - provider verdict diverges from the canonical WinGlows decision;
  - WinGlows Formation repo or backend path becomes unavailable for the first proof pair;
  - account linking requires real user PII export without a redaction plan;
  - a backend can only enforce entitlements client-side;
  - webhook signature verification is unavailable;
  - a product would ship "same account" before deny/allow tests pass.

# Open Questions

None.

Resolved decisions:

- Provider gate: Clerk central identity + Firebase Android bridge.
- First proof pair: WinGlows Formation + WinGlows Android app.
- Product ID canon: internal allowlist `winglowz_formation`, `winglowz_app`, `replayglowz`; old YouTube product ids are migration input only and must be normalized before runtime entitlement checks; historical VoiceFlowz / VoiceFlows references map to `winglowz_app`; external billing IDs are stored as `source_ref`, not used as canonical `product_id`.
- Ledger ownership: one suite-owned entitlement ledger is the default for Diane-operated products; future apps such as Temu Shopping Lists should add a `product_id` and product gates instead of creating a second durable ledger, unless a spec documents a sale, separate operator/legal boundary, hard platform/regulatory isolation, or temporary migration adapter.

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-17 08:05:27 UTC | sf-spec | GPT-5 Codex | Created unified suite authentication chantier spec from user request, local exploration, project docs, and fresh official auth docs | Draft spec created; provider gate explicitly blocks ready implementation | `/sf-ready shipglows_data/workflow/specs/unified-suite-authentication.md` after Task 1 decision context is accepted |
| 2026-05-17 08:14:57 UTC | sf-ready | GPT-5 Codex | Evaluated Definition of Ready, adversarial risks, security posture, language doctrine, and fresh-docs evidence | Not ready: provider gate, first proof pair, and product ID canon remain open and materially change architecture/security execution | `/sf-spec unified-suite-authentication provider decision` |
| 2026-05-17 09:20:15 UTC | sf-docs | GPT-5 Codex | Documented the canonical suite auth decision in the main WinGlows project and added short project pointers | Decision captured: Clerk central identity, Firebase Android bridge, server-owned entitlements; spec still needs lifecycle update for readiness | `/sf-spec unified-suite-authentication provider decision` |
| 2026-05-17 11:52:48 UTC | sf-spec | GPT-5 Codex | Updated spec from canonical WinGlows suite auth decision | Provider gate, first proof pair and product ID canon resolved; spec moved to reviewed for readiness gate | `/sf-ready shipglows_data/workflow/specs/unified-suite-authentication.md` |
| 2026-05-17 13:09:59 UTC | sf-docs | GPT-5 Codex | Corrected VoiceFlowz / VoiceFlows naming across suite auth docs | VoiceFlowz is now documented as legacy naming for WinGlows app; separate `voiceflowz` product id removed from the auth spec | `/sf-ready shipglows_data/workflow/specs/unified-suite-authentication.md` |
| 2026-05-17 13:13:31 UTC | sf-ready | GPT-5 Codex | Re-evaluated readiness after provider and VoiceFlowz corrections | Not ready: WinGlows Formation repo/backend path is unavailable locally, active app docs still conflict with Clerk suite identity, and dependency versions need refresh | `/sf-spec unified-suite-authentication readiness fixes` |
| 2026-05-17 21:14:55 UTC | sf-backlog | GPT-5 Codex | Recorded OpenAuth as a future identity-provider review item | Deferred to 2028; current Clerk central identity + Firebase Android bridge decision remains unchanged | `/sf-spec unified-suite-authentication readiness fixes` |
| 2026-05-19 18:56:43 UTC | sf-ready | GPT-5 Codex | Re-evaluated readiness after `/home/claude/winglowz` became available and app docs were reconciled | Ready: first proof pair paths exist, Clerk legacy wording is scoped to old app stack, and dependency versions are refreshed | `/sf-start unified-suite-authentication` |
| 2026-05-20 16:05:55 UTC | sf-build | GPT-5 Codex + delegated agents | Started sequential implementation with read-only Formation/app exploration, then a bounded Formation backend worker and app-domain contracts | Partial: Formation has first Convex identity/entitlement/event registry; Polar checkout now sends canonical product/account metadata; app has suite identity/domain entitlement contracts and tests; full bridge/UX/rules/verification remain open | `/sf-build unified-suite-authentication continue` |
| 2026-05-21 13:44:27 UTC | sf-build | GPT-5 Codex + delegated agents | Continued sequential implementation with Formation refund/revoke/gating worker and app suite identity provider worker | Partial: Formation now handles grant/refund/revoke idempotently and gates course access through the ledger; app exposes conservative suite identity diagnostics; bridge API, Firestore entitlement enforcement, real payload proof and support runbook remain open | `/sf-build unified-suite-authentication bridge-api` |
| 2026-05-21 14:19:33 UTC | sf-build | GPT-5 Codex + delegated agents | Implemented bridge-api tranche with server Firebase Admin verification, Convex bridge-secret guard, Flutter bridge client, production-payload parser test, docs and validation | Partial: bridge code is implemented and fail-closed; real Firebase token smoke, Firestore entitlement enforcement, revoked-token policy and support runbook remain open before ship | `/sf-build unified-suite-authentication firestore-entitlement-enforcement` |
| 2026-05-21 14:31:23 UTC | sf-build | GPT-5 Codex + delegated agents | Implemented Firestore entitlement enforcement with server-owned `suiteAccess` mirror, Firestore rules gating, Flutter store-selection gate, docs and validation | Partial: Firestore no longer trusts account existence alone; remaining gaps are real Firebase/Convex smoke, entitlement revocation mirror sync outside login bridge path, revoked-token policy and support runbook | `/sf-build unified-suite-authentication revocation-mirror-sync` |
| 2026-05-21 16:15:30 UTC | sf-build | GPT-5 Codex + delegated agents | Implemented revocation mirror sync with protected Convex snapshot query, internal Formation sync endpoint, Polar grant/refund/revoke sync triggers, docs and validation | Partial: entitlement changes can now refresh Firestore outside the login bridge path; remaining gaps are real Firebase/Convex/Firestore smoke, deployed sync env proof, revoked-token policy and support runbook | `/sf-build unified-suite-authentication revoked-token-policy` |
| 2026-05-21 16:28:18 UTC | sf-build | GPT-5 Codex + delegated agent | Implemented revoked-token policy on the Formation Firebase bridge with Firebase Admin revocation checks, centralized Firebase claim validation, redacted token-verification logging, docs and validation | Partial: revoked or disabled Firebase sessions are now rejected before suite identity linking; remaining gaps are real Firebase/Convex/Firestore deployed smoke, deployed sync env proof and support runbook | `/sf-build unified-suite-authentication support-runbook` |
| 2026-05-21 16:53:06 UTC | sf-build | GPT-5 Codex + delegated agent | Added the canonical support runbook, linked it from the main suite auth decision and app pointer, and kept the operator copy redacted. | Partial: support triage is documented; remaining gaps are real Firebase/Convex/Firestore deployed smoke, deployed sync env proof and final suite auth verification | `/sf-build unified-suite-authentication continue` |
| 2026-05-21 19:30:41 UTC | sf-build | GPT-5 Codex + delegated agent | Added the redacted Task 10 smoke-readiness log and linked it from the app suite-auth pointer | Partial: local docs/proof checklist exists; final verification is blocked until deployed Firebase/Convex/Firestore smoke and manual redacted evidence exist | manual deployed smoke, then `/sf-build unified-suite-authentication continue` |
| 2026-05-22 09:14:16 UTC | sf-test + sf-auth-debug | GPT-5 Codex | Ran non-secret deployed endpoint preflight for the first suite-auth smoke pair | Blocked: app and Formation roots respond, but deployed Formation bridge endpoints return 404, so real auth/session smoke cannot start until the bridge scope is shipped/deployed | `/sf-ship unified-suite-authentication bridge scope`, then `/sf-prod winglowz`, then `/sf-test unified-suite-authentication --prod` |
| 2026-05-22 11:56:37 UTC | sf-prod | GPT-5 Codex | Rechecked production deployments and redacted env/runtime signals after push | Blocked: deployments are Ready, but `winglowz` lacks Clerk publishable key and suite-auth env vars, and `winglowz-app` has no production env vars | configure Vercel env vars for `winglowz` and `winglowz-app`, redeploy, then `/sf-prod winglowz` |
| 2026-05-22 13:17:05 UTC | sf-auth-debug | GPT-5 Codex | Investigated bridge endpoint 500s and patched Formation middleware/CORS | Partial fixed locally: bridge/webhook/newsletter endpoints bypass Clerk and local bridge requests now return controlled JSON config errors instead of Clerk middleware crashes; production still needs push/redeploy and env vars | push/redeploy Formation fix, configure env vars, then `/sf-prod winglowz` |
| 2026-05-22 21:09:18 UTC | sf-ship | GPT-5 Codex | Prepared quick ship for Android CI suite bridge env propagation and Formation deployment support after env setup | Partial: local checks passed, but hosted proof still requires push, GitHub Actions Android CI, Vercel redeploy, and manual Android/device smoke | `/sf-prod winglowz`, GitHub Actions Android retest, then suite-auth smoke |
| 2026-05-22 21:25:12 UTC | sf-prod | GPT-5 Codex | Verified latest Android CI run after suite-auth build-env push | Partial: Flutter analyze, Flutter tests and debug APK artifact succeeded; Firestore rules/index deploy failed with Service Usage IAM 403 before deploy | grant `roles/serviceusage.serviceUsageConsumer` to the GitHub Firebase deploy service account, rerun CI, then Android smoke |
| 2026-05-23 08:52:14 UTC | sf-prod | GPT-5 Codex | Reran the failed Firestore deploy job after WIF/service-account setup | Still blocked: WIF authentication succeeds, but Firebase CLI still receives Service Usage IAM 403 when checking `firestore.googleapis.com` | add `roles/serviceusage.serviceUsageConsumer` on the `winglowz` project IAM for `github-actions-firebase-deploy@winglowz.iam.gserviceaccount.com`, then rerun failed jobs |
| 2026-05-23 08:57:59 UTC | sf-prod | GPT-5 Codex | Fixed production Firebase CI via CLI and reran Android CI | Passed: repo-level WIF secrets now point to prod, Firestore API is enabled, Firestore rules/indexes deploy passed, and Android debug APK artifact remains available | Android physical-device suite-auth smoke |
| 2026-05-23 10:14:48 UTC | sf-auth-debug | GPT-5 Codex | Investigated Android Google Sign-In `clientConfigurationError` from physical-device smoke and patched runtime/CI config | Fixed locally: Google Sign-In now receives `FIREBASE_WEB_CLIENT_ID` as Android `serverClientId`; Android APK CI now fails fast if that value is missing; docs/tests updated | add `FIREBASE_WEB_CLIENT_ID` to GitHub Actions, push/rebuild APK, then rerun Android physical-device Google smoke |
| 2026-05-23 10:20:19 UTC | sf-auth-debug | GPT-5 Codex | Investigated Firebase Auth signup `CONFIGURATION_NOT_FOUND` and tightened APK config validation | Fixed locally: app now maps `CONFIGURATION_NOT_FOUND` to Firebase configuration failure, and Android CI validates Firebase Auth services/config before building an APK | enable Firebase Authentication on prod `winglowz`, add `FIREBASE_WEB_CLIENT_ID`, push/rebuild APK, then rerun Android physical-device auth smoke |
| 2026-05-23 10:31:17 UTC | sf-auth-debug | GPT-5 Codex | Investigated password-manager email-field detection during Android auth smoke | Fixed locally: sign-in form now uses an `AutofillGroup`, email field exposes `username` + `email` hints with email keyboard/no capitalization, password field keeps password autofill, and widget coverage asserts the metadata | enable Firebase Authentication on prod `winglowz`, add `FIREBASE_WEB_CLIENT_ID`, push/rebuild APK, then rerun Android physical-device auth smoke |
| 2026-05-23 11:52:06 UTC | sf-auth-debug + sf-prod | GPT-5 Codex | Retested hosted WinGlows Clerk custom domain and Flutter web app auth readiness after Vercel DNS cleanup | Partial: `www.winglowz.com/signin` now renders Clerk sign-in in Playwright with email/password/Google controls and no console/request failures; `app.winglowz.com` still runs in local mode because Vercel `winglowz-app` is missing `FIREBASE_DEV_APP_ID` and `FIREBASE_WEB_CLIENT_ID` in production and preview | add missing `winglowz-app` Vercel env vars, redeploy Flutter web, then rerun deployed Firebase auth + suite bridge smoke |
| 2026-05-23 12:28:51 UTC | sf-prod + sf-auth-debug | GPT-5 Codex | Verified `winglowz-app` Vercel env completion, redeployed production, and ran hosted Flutter web auth smoke | Partial: production deployment `dpl_43qBcWKhhWJqzLstWDvML7CRum2j` is Ready and aliased to `app.winglowz.com`; Flutter web now initializes Firebase Auth/Firestore and shows the Firebase auth screen; email/password smoke reaches Firebase but provider is disabled, and Google web needs the official GIS rendered-button flow instead of app-owned `authenticate()` UI | enable Email/Password in Firebase Authentication, then patch Flutter web Google sign-in to use `google_sign_in_web` `renderButton` + authentication events |
| 2026-05-23 13:07:16 UTC | sf-auth-debug | GPT-5 Codex | Patched Flutter web Google Sign-In after hosted `authenticate-unsupported` repro | Fixed locally: Flutter web now renders the official GIS button, listens to `google_sign_in_web` authentication events, and exchanges the returned Google ID token with Firebase Auth; Android keeps the native `authenticate()` path | push/redeploy `winglowz-app`, then retest Google web sign-in on `app.winglowz.com` |
| 2026-05-23 13:09:13 UTC | sf-auth-debug | GPT-5 Codex | Retested hosted Flutter web email/password after Firebase provider activation | Passed preflight: `app.winglowz.com` now reaches Firebase Email/Password auth and returns controlled invalid-credential UX for a fake account instead of provider-disabled copy | push/redeploy `winglowz-app`, then retest Google web sign-in and a real email/password account smoke |
| 2026-05-23 13:35:40 UTC | sf-auth-debug | GPT-5 Codex | Continued hosted Flutter web auth debug after deploy and Firebase Email/Password activation | Partial: live `app.winglowz.com` now renders the official GIS button, but Google returns `origin is not allowed for the given client ID`; local patch also prevents repeated Google Sign-In singleton init from masking email/password errors and maps Firebase REST invalid-login credentials to the proper UX | add `https://app.winglowz.com` to the Google OAuth Web client authorized JavaScript origins, push/redeploy `winglowz-app`, then rerun Google web and email/password smoke |
| 2026-05-23 14:30:13 UTC | sf-auth-debug | GPT-5 Codex | Migrated Firebase CI/rules ownership from legacy `winglowz` project to `winglowz-suite` and retested GitHub Actions | Passed: created `winglowz-suite` WIF pool/provider, deploy service account, Firestore `(default)` in `nam5`, GitHub secrets/variable; workflow run `26335153138` passed auth config, Firestore rules/indexes deploy, analyze, tests and debug APK upload; legacy `winglowz` deletion requested | ship/redeploy local Flutter web auth patch, then rerun deployed Google web and email/password account smoke |
| 2026-05-23 19:33:42 UTC | sf-auth-debug | GPT-5 Codex | Read-only verification of the current WinGlows Flutter web auth path after ReplayGlowz ClerkJS bridge discussion. | Confirmed: `winglowz_app` web currently uses Firebase Auth plus `google_sign_in_web` rendered GIS button, then maps the Firebase uid/id token through the suite identity bridge; no ClerkJS bridge exists in `web/index.html`, `auth_session_provider.dart`, or auth data code. | keep current Firebase web smoke path for WinGlows app unless a new spec explicitly migrates Flutter web to ClerkJS |
| 2026-05-24 14:08:24 UTC | sf-auth-debug | GPT-5 Codex | Verified hosted WinGlows Formation + Flutter web auth flows after env/DNS setup | Partial and patched locally: `app.winglowz.com` initializes Firebase, Email/Password reaches Firebase with controlled invalid-credential UX, Google GIS button renders and opens Google, and focused email/password fields expose browser autofill metadata; production `www.winglowz.com/fr/signin` is blocked by CSP for Clerk custom-domain scripts and `/api/bridge/firebase` still returns `firebase_admin_not_configured`. Local Formation patch now allows Clerk custom-domain CSP and reads bridge secrets through server runtime env. | push/redeploy `/home/claude/winglowz`, run `/sf-prod winglowz`, then rerun real account suite-auth smoke |
| 2026-06-10 09:37:22 UTC | sf-spec | GPT-5 Codex | Formalized the operator decision for entitlement ledger ownership after Temu Shopping Lists entitlement planning | Updated the active suite-auth spec: one suite-owned ledger is the default across Diane-operated products, with second ledgers allowed only for documented separation or migration exceptions | `/sf-ready Entitlements and access model for Temu Shopping Lists`, then map `temu_shopping_lists` into the suite ledger before protected sync or monetization |

# Current Chantier Flow

- sf-spec: done, reviewed after provider-decision update.
- sf-ready: ready.
- sf-start: partial via sf-build; bridge-api, firestore-entitlement-enforcement, revocation-mirror-sync and revoked-token-policy tranches implemented.
- sf-verify: not started.
- sf-end: not started.
- sf-ship: partial quick ship prepared on 2026-05-22; hosted Vercel/GitHub Actions proof still pending.
- support-runbook: done via sf-build delegated docs worker; canonical operator guide added in the main project docs and surfaced from the app docs.
- smoke-readiness: partial via sf-build delegated docs worker; Task 10 log exists, but real deployed proof is not captured yet.
- sf-test/sf-auth-debug: partial on 2026-05-24; `app.winglowz.com` initializes Firebase, Email/Password reaches Firebase with controlled invalid-credential UX, Google web reaches the Google identifier step, and focused email/password fields expose browser autofill metadata. `www.winglowz.com/fr/signin` currently fails the Clerk UI load because deployed CSP blocks `clerk.winglowz.com` scripts, and the deployed Firebase bridge still returns `firebase_admin_not_configured`.
- sf-prod: partial on 2026-05-24; Android CI is green against `winglowz-suite`, Firestore rules/indexes deploy to `winglowz-suite`, `winglowz-app` Vercel production is Ready, and local Formation patch now addresses the deployed CSP/runtime-env blockers. Hosted proof is pending push/redeploy.

Next command: push/redeploy `/home/claude/winglowz`, run `/sf-prod winglowz`, then rerun real account suite-auth smoke across `www.winglowz.com` and `app.winglowz.com`.
