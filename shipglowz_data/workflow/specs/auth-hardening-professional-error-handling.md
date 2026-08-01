---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-14"
created_at: "2026-05-14 17:27:52 UTC"
updated: "2026-05-14"
updated_at: "2026-05-14 21:05:16 UTC"
status: ready
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "auth-hardening-professional-error-handling"
owner: "Diane"
confidence: medium
user_story: "En tant que builder de WinGlows, je veux une authentification Firebase/Google robuste, observable et sûre, afin de pouvoir vendre un produit Android professionnel sans fuite de secrets, sans accès non autorisé et sans erreurs auth silencieuses."
risk_level: high
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Flutter app"
  - "Riverpod auth providers"
  - "go_router"
  - "Firebase Auth"
  - "Google Sign-In"
  - "Local auth mode"
  - "Sentry Flutter"
  - "App diagnostics"
  - "Android Firebase configuration"
  - "Blacksmith Android build"
depends_on:
  - artifact: "shipglowz_data/workflow/specs/firebase-backend-agnostic-migration.md"
    artifact_version: "1.0.0"
    required_status: "ready"
  - artifact: "shipglowz_data/technical/architecture.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglowz_data/technical/guidelines.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "docs/DECISIONS.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "docs/technical/flutter-app.md"
    artifact_version: "0.1.0"
    required_status: "draft"
  - artifact: "docs/technical/firebase-cli-foundation.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "docs/VERIFICATION.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
supersedes: []
evidence:
  - "User request 2026-05-14: product must be professional, sellable, and max-security."
  - "Current TASKS.md still tracks route-level auth guards and Google Sign-In credential error mapping as todo."
  - "lib/features/auth/data/firebase_auth_session_store.dart builds a Google credential directly from a nullable idToken without a domain error boundary."
  - "lib/core/router/app_router.dart exposes direct feature routes without route-level auth redirect."
  - "lib/features/auth/presentation/sign_in_screen.dart now has friendly errors and copyable detail, but Google canceled/configuration ambiguity and route security remain unresolved."
  - "Official Firebase Auth Flutter error docs checked 2026-05-14."
  - "Official google_sign_in 7.2.0 and google_sign_in_android docs checked 2026-05-14."
  - "Official Sentry Flutter docs checked 2026-05-14."
next_step: "/sf-start shipglowz_data/workflow/specs/auth-hardening-professional-error-handling.md"
---

# Title

Auth Hardening and Professional Error Handling

# Status

Ready for implementation. This spec intentionally expands beyond a one-screen error-copy patch because authentication is a security boundary for a sellable Android product.

# User Story

En tant que builder de WinGlows, je veux une authentification Firebase/Google robuste, observable et sûre, afin de pouvoir vendre un produit Android professionnel sans fuite de secrets, sans accès non autorisé et sans erreurs auth silencieuses.

Acteur principal: builder WinGlows.

Acteurs secondaires:

- utilisateur Android non connecté;
- utilisateur en mode local;
- utilisateur connecté email/password;
- utilisateur connecté Google;
- opérateur support qui reçoit un détail technique copiable;
- Sentry/AppDiagnostics comme observabilité sans données sensibles.

Déclencheurs:

- l'utilisateur ouvre l'app ou une route profonde;
- l'utilisateur tente email/password, création de compte, Google Sign-In ou mode local;
- Firebase/Google est absent, mal configuré, réseau indisponible, rate-limité, ou retourne une erreur;
- une route protégée est ouverte directement sans session valide;
- un opérateur doit diagnostiquer une panne auth sans voir de secret, token, payload OAuth ou texte utilisateur.

Résultat observable attendu: l'app laisse accéder aux surfaces autorisées seulement quand le mode auth le permet, affiche des erreurs auth compréhensibles et récupérables, journalise uniquement des diagnostics redigés, et fournit une preuve de validation Android/Firebase avant de prétendre que l'auth est vendable.

# Minimal Behavior Contract

WinGlows accepte trois chemins d'entrée: mode local explicite, session Firebase email/password, et session Firebase Google. Une tentative réussie met l'utilisateur dans l'état d'accès correspondant et rend l'app utilisable; une tentative échouée affiche une erreur claire, récupérable et sans secret, tout en enregistrant un diagnostic redigé pour support/Sentry. Les routes produit ne doivent pas être accessibles par deep link ou navigation directe quand aucune session valide ou aucun mode local explicite n'est actif. L'edge case facile à rater est Google Sign-In Android: certaines erreurs de configuration peuvent remonter comme `canceled`, donc l'app ne doit pas traiter toutes les annulations apparentes comme un simple abandon utilisateur sans signal diagnostic exploitable.

# Success Behavior

- Given Firebase est configuré et l'utilisateur saisit un email/password valides, when il se connecte ou crée un compte, then `AuthSessionSnapshot` devient signé, l'app quitte l'écran Connexion, et les stores distants user-scoped peuvent s'appuyer sur le `uid` Firebase.
- Given Firebase est configuré et Google Sign-In retourne un compte avec un token exploitable, when l'utilisateur confirme le compte Google, then Firebase Auth reçoit un credential valide, la session devient `AuthProviderKind.google`, et l'utilisateur atteint l'app sans duplication d'action.
- Given Firebase n'est pas configuré ou l'utilisateur choisit explicitement le mode local, when il continue en local, then `localAuthModeProvider` active le store local, l'app devient utilisable localement, et aucune tentative distante n'est lancée.
- Given l'utilisateur ouvre `/voice`, `/clipboard`, `/snippets`, `/dictionary`, `/settings` ou `/keyboard` sans session valide ni mode local, when le routeur évalue l'accès, then il redirige vers l'auth gate ou l'écran Connexion sans construire la surface protégée.
- Given une erreur auth est capturée, when Sentry est initialisé, then l'événement envoyé contient catégorie/code/contexte redigés, pas de token, API key, mot de passe, payload OAuth, email privé complet ou contenu utilisateur.
- Preuve de succès attendue: tests unitaires/widget pour mapping auth, route guard et UI; `dart format --set-exit-if-changed .`; `flutter analyze`; `flutter test`; smoke Android/Firebase avec email/password, Google, mauvais provider/config, mode local, et route profonde.

# Error Behavior

- Entrée invalide: email vide ou mal formé et mot de passe vide/trop court bloquent l'appel au store et affichent les erreurs de formulaire existantes.
- Firebase Auth error: `FirebaseAuthException` est convertie en erreur domaine typée avec message utilisateur stable, détail support redigé, catégorie diagnostic et comportement de récupération.
- Google Sign-In canceled: une annulation avant sélection ou clairement utilisateur affiche "Connexion Google annulée" sans créer d'erreur Sentry de sévérité élevée.
- Google Sign-In configuration failure: `clientConfigurationError`, `serverClientId must be provided`, `idToken` absent, package/SHA incorrect ou `canceled` après sélection de compte produit une erreur utilisateur qui signale une configuration Google indisponible, enregistre un diagnostic redigé, et ne prétend pas que l'utilisateur a simplement annulé.
- Network/timeout/quota: l'utilisateur voit un message récupérable, aucun état signé partiel n'est publié, et l'opération peut être retentée.
- Account conflict: `account-exists-with-different-credential` affiche un message professionnel indiquant qu'un compte existe déjà avec une autre méthode; la liaison de comptes n'est pas faite automatiquement dans ce chantier.
- Route non autorisée: aucune surface produit sensible ne doit se construire avant auth/local-mode; l'app redirige au lieu de charger des stores distants ou locaux sans décision explicite.
- Observability failure: si Sentry est absent ou non initialisé, AppDiagnostics garde un événement local redigé; l'absence de Sentry ne doit pas casser l'auth.
- Ce qui ne doit jamais arriver: token, API key, mot de passe, payload OAuth, identifiant sensible complet, raw exception non redigée ou contenu clipboard/voice/snippet dans l'UI copiable, logs, diagnostics ou Sentry; accès route profonde à des données utilisateur sans session; mutation distante sous un `uid` client-provided; session signée partielle après échec Google.

# Problem

Le patch courant améliore l'écran de connexion, mais le produit n'a pas encore un contrat auth vendable. Les erreurs Firebase/Google restent dispersées dans la présentation, le credential Google est construit sans garde métier autour du token nullable, certaines erreurs Android Google peuvent être mal classées comme annulation utilisateur, et les routes produit restent directement accessibles sans redirect auth au niveau `go_router`. Pour un produit professionnel, l'auth doit être une frontière explicite, testable, observable et documentée.

# Solution

Créer une couche d'erreurs auth typées dans le domaine/application, durcir `FirebaseAuthSessionStore` autour de Google Sign-In et Firebase Auth, déplacer le mapping UI vers un présentateur/mapper testable, ajouter des guards `go_router`, renforcer la redaction diagnostics/Sentry, puis documenter et tester les chemins Firebase/Google/local sur Android avant ship.

# Scope In

- Auth domain/application:
  - erreurs auth typées et sérialisables pour UI/diagnostics;
  - mapping Firebase/Google/Unsupported/Error inattendu vers messages utilisateur et détails support redigés;
  - différenciation entre annulation utilisateur, configuration Google, token absent, réseau, quota, provider désactivé, mauvais credential et conflit de compte.
- Firebase/Google adapter:
  - garde explicite autour de `GoogleSignIn.initialize`, `supportsAuthenticate`, `authenticate`, `GoogleSignInException`, `idToken`, et `FirebaseAuth.signInWithCredential`;
  - aucun credential Firebase construit avec token nul ou invalide;
  - pas de fuite de token ou payload dans les erreurs.
- Presentation:
  - `SignInScreen` consomme un contrat d'erreur stable au lieu d'interpréter directement tous les SDK errors;
  - messages français clairs, action de copie de détail uniquement pour diagnostics redigés;
  - busy/error state stable sans double soumission.
- Routing:
  - route-level guard dans `app_router.dart` pour les routes produit;
  - deep links non autorisés redirigés vers `/` ou l'écran Connexion;
  - local mode explicitement autorisé comme mode produit local.
- Observability:
  - AppDiagnostics/Sentry ne reçoivent que code/catégorie/détail redigés;
  - Sentry conserve `sendDefaultPii=false`, screenshots off, breadcrumbs redigés.
- Tests:
  - unit tests pour mapper auth et redaction;
  - widget tests SignInScreen pour cas email, Google, config, local;
  - router tests pour accès direct sans session;
  - smoke Android/Firebase manuel ou CI/device loggué dans `docs/VERIFICATION.md` ou `shipglowz_data/workflow/TEST_LOG.md`.
- Documentation:
  - README/docs Firebase auth setup, Google SHA/server client ID, limites local mode, verification auth, route guard.

# Scope Out

- Pas de migration complète vers un autre backend.
- Pas de suppression des adaptateurs Supabase legacy.
- Pas de multi-factor auth, passkeys, magic links ou email verification obligatoire dans ce chantier.
- Pas de liaison automatique des comptes anonymes vers email/Google. Le chantier doit empêcher la perte ou la confusion, mais la stratégie de merge/link durable mérite une spec dédiée.
- Pas d'implémentation de chiffrement cloud, App Check enforcement, ou rules Firestore supplémentaires sauf si les tests auth prouvent un blocage direct.
- Pas de refonte visuelle complète de l'écran Connexion.
- Pas de promesse production sur web/iOS/desktop; le runtime visé est Android.

# Constraints

- Firebase reste un adaptateur derrière `AuthSessionStore`; l'UI ne doit pas importer d'adaptateur Firebase directement hors tests/fakes.
- Les données distantes user-scoped doivent dépendre du `uid` Firebase côté adapter/Security Rules, jamais d'un identifiant client arbitraire.
- Le mode local doit être choisi explicitement ou résulter d'une configuration Firebase absente; il ne doit pas être confondu avec une session cloud.
- Les messages utilisateur restent en français naturel.
- Les détails support copiables doivent être redigés, courts, et utiles à l'opérateur sans exposer de secret.
- Sentry ne remplace pas l'UI d'erreur; l'utilisateur doit toujours voir un état récupérable.
- Android est la surface de validation auth réelle. Web preview ou tests widget ne suffisent pas pour Google Sign-In Android.
- Sur ce runner ARM64, ne pas lancer de release Android local; utiliser Blacksmith/x64 ou un appareil Android configuré pour le smoke.

# Dependencies

- Flutter/Dart:
  - local SDK: Dart `^3.11.3`, Flutter project.
  - `flutter_riverpod` declared `^3.0.3`, locked `3.3.1`.
  - `go_router` declared `^16.2.5`, locked `16.3.0`.
- Firebase:
  - `firebase_core` declared `^4.7.0`, locked `4.7.0`.
  - `firebase_auth` declared `^6.4.0`, locked `6.4.0`.
  - Official docs checked 2026-05-14: Firebase Flutter Auth error handling says Flutter auth errors are exposed as `FirebaseAuthException`; error details include at least code/message and some provider flows can include email/credential. It also calls out `too-many-requests`, `operation-not-allowed`, and `account-exists-with-different-credential`.
  - Source: https://firebase.google.com/docs/auth/flutter/errors
- Google Sign-In:
  - `google_sign_in` declared `^7.2.0`, locked `7.2.0`.
  - `google_sign_in_android` locked `7.2.10`.
  - Official docs checked 2026-05-14: `google_sign_in` 7 uses `GoogleSignIn.instance.initialize`, `authenticationEvents`, `supportsAuthenticate`, and `authenticate` for user-initiated sign-in. Android integration requires `google-services.json` with a web OAuth client or an explicit `serverClientId`; troubleshooting lists missing/incorrect SHA, package name, and server client ID, and notes some configuration failures can surface as `GoogleSignInExceptionCode.canceled` after account selection.
  - Sources: https://pub.dev/packages/google_sign_in/versions/7.2.0 and https://pub.dev/packages/google_sign_in_android
- Sentry:
  - `sentry_flutter` declared `^9.20.0`, locked `9.20.0`.
  - Official docs checked 2026-05-14: Sentry Flutter uses `SentryFlutter.init` and `Sentry.captureException`; privacy options must remain conservative for this app. Local project already sets `sendDefaultPii=false` and `attachScreenshot=false`.
  - Source: https://docs.sentry.io/platforms/flutter/
- Project docs:
  - `docs/technical/firebase-cli-foundation.md` records provider setup and states Android Google Sign-In needs app signing SHA fingerprints in Firebase.
  - `docs/VERIFICATION.md` is the canonical Android verification surface.

Fresh external docs verdict: `fresh-docs checked`. No conflict found, but current code does not yet implement the Google Android ambiguity and nullable-token guard required by the official docs.

# Invariants

- Auth state is the only authority for remote user identity.
- Local mode is a local-only product mode, not a cloud-auth bypass.
- A route guard must prevent protected feature construction before auth/local-mode decision.
- Firebase and Google SDK errors must cross into app code as typed, redacted domain errors.
- No logs, diagnostics, Sentry breadcrumbs, support copy text, or UI should contain raw secrets, tokens, OAuth payloads, passwords, raw provider messages with keys, clipboard content, transcripts, prompts, or private URLs.
- The app must remain usable in local mode if Firebase config is missing.
- A failed auth attempt must not mutate remote product stores.
- A Google configuration failure must be observable to the operator even if Android reports it as `canceled`.

# Links & Consequences

- `lib/features/auth/data/firebase_auth_session_store.dart`: must be hardened first because it owns SDK calls.
- `lib/features/auth/domain/auth_session_store.dart`: may need auth error classes or a sibling `auth_error.dart`.
- `lib/features/auth/application/auth_session_provider.dart`: may need provider-level local mode/session helpers and fakes.
- `lib/features/auth/presentation/sign_in_screen.dart`: should shrink to UI and presentation of typed errors.
- `lib/features/auth/presentation/auth_gate_screen.dart`: should present auth state errors safely and rediged.
- `lib/core/router/app_router.dart`: must gain route-level redirect/guard.
- `lib/core/diagnostics/app_diagnostics.dart` and `lib/core/bootstrap/sentry_bootstrap.dart`: redaction must be reused or centralized enough that auth details cannot bypass it.
- `lib/features/settings/presentation/settings_screen.dart`: support export should show Sentry/auth state without leaking secrets.
- Feature stores (`clipboard`, `voice`, `snippets`, `dictionary`, `settings`) depend on correct auth/local-mode selection; route guards reduce accidental direct initialization.
- Android/Firebase configuration touches GitHub Secrets, Firebase console provider enablement, package name, SHA fingerprints, and possibly `google-services.json` vs Dart `serverClientId` strategy.
- Documentation drift remains a risk: `CLAUDE.md`, `docs/ARCHITECTURE_FLUTTER.md`, `docs/API.md`, and some legacy Supabase docs still include stale wording. This chantier should update only the active auth/Firebase docs it touches, and file or note broader stale-doc cleanup separately if not completed.

# Documentation Coherence

Docs to align during implementation:

- `README.md`: summarize auth runtime modes, Firebase defines, Google Sign-In Android setup, and local mode limits.
- `docs/technical/firebase-cli-foundation.md`: add explicit verification checklist for Google provider enablement, SHA fingerprints, package name, and server client ID/web OAuth client.
- `docs/VERIFICATION.md`: add Android auth smoke matrix covering email/password, Google success, Google config failure, no Firebase config/local mode, route deep links, Sentry/AppDiagnostics redaction.
- `docs/technical/flutter-app.md`: add auth route guard and typed auth error ownership to Owned Files / Invariants / Failure Modes.
- `shipglowz_data/workflow/TASKS.md`: not edited by `sf-spec`; after implementation, `/sf-tasks` or `/sf-end` should reconcile the existing auth guard and Google error mapping todo rows.
- Changelog: add an auth hardening entry only during `/sf-end` or `/sf-ship`, not during this spec.

# Edge Cases

- Google Android returns `canceled` after account selection due to SHA/package/server client ID misconfiguration.
- `GoogleSignInAccount.authentication.idToken` is null or unusable.
- `GoogleSignIn.instance.supportsAuthenticate()` is false on a platform where app-rendered auth button is not valid.
- Firebase Auth provider disabled returns `operation-not-allowed`.
- API key/project/app mismatch returns `invalid-api-key` or `app-not-authorized`.
- Password/email methods return generic `invalid-credential` instead of older `user-not-found`/`wrong-password`.
- Account exists with different credential.
- Rate limit / quota: `too-many-requests`.
- Network unavailable: `network-request-failed`.
- User disabled or deleted while session cached.
- Deep link arrives before `authSessionProvider` resolves.
- Sentry DSN absent, Sentry init fails, or AppDiagnostics buffer is the only evidence.
- Existing local mode active while a later Firebase config becomes available.
- Sign-out in local mode should not leave remote providers signed in or feature routes accessible under a stale remote session.

# Implementation Tasks

- [x] Tâche 1 : Introduce typed auth failure model
  - Fichier : `lib/features/auth/domain/auth_failure.dart`
  - Action : Create `AuthFailureKind`, `AuthFailure`, sanitized support-detail fields, user-message mapping hooks, and redaction helpers or reuse a shared redactor.
  - User story link : gives every auth failure a stable, safe product contract.
  - Depends on : none.
  - Validate with : new `test/auth_failure_test.dart` covering user messages, support detail, and redaction of API keys/tokens/password-like strings.
  - Notes : keep SDK-specific imports out of this domain file if possible.

- [x] Tâche 2 : Harden FirebaseAuthSessionStore around Google and Firebase errors
  - Fichier : `lib/features/auth/data/firebase_auth_session_store.dart`
  - Action : Wrap Firebase/Google SDK calls, check `supportsAuthenticate`, handle `GoogleSignInException` codes, guard nullable/missing `idToken`, map SDK errors to typed auth failures, and never build a credential with a null token.
  - User story link : prevents unsafe or misleading Google/Firebase auth states.
  - Depends on : Tâche 1.
  - Validate with : new unit tests using fakes/mocks or adapter seams for Google/Firebase success, canceled, config error, null token, FirebaseAuthException, and unexpected error.
  - Notes : if `GoogleSignIn` is hard to fake directly, introduce a narrow `GoogleAuthClient` wrapper owned by auth data layer.

- [x] Tâche 3 : Keep auth provider composition explicit and local-mode safe
  - Fichier : `lib/features/auth/application/auth_session_provider.dart`
  - Action : Ensure local mode is an explicit state, provider selection cannot silently switch remote/local mid-flow, and auth/session errors surface as typed states where needed.
  - User story link : protects local mode as a real product path without cloud-auth ambiguity.
  - Depends on : Tâche 1.
  - Validate with : provider tests for Firebase configured, Firebase missing, local mode enabled, sign-out/reset expectations.
  - Notes : avoid broad state-management rewrites; keep Riverpod patterns already present.

- [x] Tâche 4 : Refactor SignInScreen to consume typed auth failures
  - Fichier : `lib/features/auth/presentation/sign_in_screen.dart`
  - Action : Remove direct SDK-specific mapping from widget where practical, render typed user messages, support detail copy, busy state, and retry actions consistently.
  - User story link : gives users professional, recoverable auth feedback.
  - Depends on : Tâches 1-3.
  - Validate with : extend `test/sign_in_screen_test.dart` for invalid form, Firebase config error, Google canceled, Google config error, null token support detail, local mode, no secret visible.
  - Notes : keep French copy natural and concise.

- [x] Tâche 5 : Add route-level auth/local-mode guards
  - Fichier : `lib/core/router/app_router.dart`
  - Action : Add redirect logic or route guard using auth/local mode state so protected routes cannot build without signed-in or local fallback state.
  - User story link : blocks direct access to product routes before an auth decision.
  - Depends on : Tâche 3.
  - Validate with : router/widget tests for `/voice`, `/clipboard`, `/settings`, `/keyboard`, `/snippets`, `/dictionary` from signed-out, local, and signed-in states.
  - Notes : handle loading state without redirect loops. If `go_router` refresh integration needs a Listenable/stream bridge, implement the smallest local helper.

- [x] Tâche 6 : Harden diagnostics and Sentry capture for auth
  - Fichier : `lib/core/diagnostics/app_diagnostics.dart`, `lib/core/bootstrap/sentry_bootstrap.dart`, `lib/features/auth/presentation/sign_in_screen.dart`
  - Action : Ensure auth errors use one redaction path before AppDiagnostics, copied support detail, and Sentry capture; add category/code tags without sensitive payloads.
  - User story link : keeps failures observable without privacy/security leaks.
  - Depends on : Tâches 1, 4.
  - Validate with : unit tests for redaction and widget tests asserting raw API-key/token/password-like strings are absent from UI.
  - Notes : do not enable screenshots, session replay, or default PII.

- [x] Tâche 7 : Add auth setup and verification documentation
  - Fichier : `README.md`, `docs/technical/firebase-cli-foundation.md`, `docs/VERIFICATION.md`, `docs/technical/flutter-app.md`
  - Action : Document Firebase/Google Android setup, SHA fingerprint requirement, provider enablement, local mode limits, route guard expectation, and auth smoke matrix.
  - User story link : makes professional auth validation repeatable before selling.
  - Depends on : Tâches 2-6.
  - Validate with : `rg` checks for stale/auth setup wording and manual doc review.
  - Notes : do not rewrite all legacy Supabase docs in this chantier unless touched lines directly mislead current auth setup.

- [x] Tâche 8 : Run local technical checks
  - Fichier : project root
  - Action : Run `dart format --set-exit-if-changed .`, `git diff --check`, `flutter analyze`, and `flutter test`.
  - User story link : proves local regression safety.
  - Depends on : Tâches 1-7.
  - Validate with : command outputs pass.
  - Notes : do not run Android release builds on ARM64 local runner.

- [ ] Tâche 9 : Perform Android/Firebase auth smoke
  - Fichier : `docs/VERIFICATION.md` or `shipglowz_data/workflow/TEST_LOG.md`
  - Action : Record Android smoke evidence for email/password success/failure, Google success, Google misconfig or controlled config-error path, mode local, sign-out, and protected route deep link.
  - User story link : proves the sellable Android auth flow, not just unit tests.
  - Depends on : Tâches 1-8 and valid Firebase Android config.
  - Validate with : real device/emulator evidence, CI/Blacksmith artifact or operator-confirmed run, no secrets in logs.
  - Notes : blocked in this local run because no configured Android device/emulator Firebase/Google smoke evidence was available. If Google provider/SHA config is missing, stop before ship and mark verification blocked, not ready.

# Acceptance Criteria

- [ ] CA 1 : Given Firebase is not configured, when the user opens the app, then the UI remains usable through explicit local mode and no remote auth call is made.
- [ ] CA 2 : Given invalid email/password inputs, when the user submits, then no auth store method is called and field-level French errors are shown.
- [ ] CA 3 : Given Firebase returns `invalid-api-key` or `app-not-authorized`, when email/password auth is attempted, then the user sees a Firebase configuration message and the support detail is redacted/copyable.
- [ ] CA 4 : Given Firebase returns `invalid-credential`, `user-not-found`, or `wrong-password`, when sign-in fails, then the user sees a generic credential message that does not reveal whether an account exists.
- [ ] CA 5 : Given Firebase returns `too-many-requests`, when auth is attempted, then the user sees a temporary retry-later message and no session state is published.
- [ ] CA 6 : Given Google Sign-In is supported and returns an account with a valid ID token, when the user authenticates, then Firebase receives a valid Google credential and the app enters a signed-in Google session.
- [ ] CA 7 : Given Google Sign-In returns a clear user cancellation before account selection, when the flow exits, then the user sees a cancellation message and no high-severity Sentry event is emitted.
- [ ] CA 8 : Given Google Sign-In returns `clientConfigurationError`, missing server client ID, missing ID token, or Android canceled-after-selection configuration ambiguity, when the flow exits, then the user sees a setup/configuration error and AppDiagnostics/Sentry receive only redacted category/code context.
- [ ] CA 9 : Given `GoogleSignInAccount.authentication.idToken` is null, when the app handles Google auth, then it does not construct a Firebase credential and emits a typed recoverable auth failure.
- [ ] CA 10 : Given `account-exists-with-different-credential`, when Google auth fails, then the user is told that an account exists with another method and no automatic account linking or merge happens.
- [ ] CA 11 : Given a signed-out user opens `/voice`, `/clipboard`, `/settings`, `/keyboard`, `/snippets`, or `/dictionary`, when router redirect runs, then the route returns to the auth gate/login surface and does not build the protected screen.
- [ ] CA 12 : Given local mode is active, when the same product routes are opened, then the app allows local product usage and remote sync remains unavailable/local-only.
- [ ] CA 13 : Given a signed-in Firebase user opens protected routes, when router redirect runs, then the route is allowed and feature stores use the remote session identity where configured.
- [ ] CA 14 : Given any auth error contains an API key, token-like value, password-like field, newline stack or provider payload text, when it appears in UI, copied support detail, AppDiagnostics, or Sentry breadcrumb, then sensitive values are replaced with `<redacted>` or omitted.
- [ ] CA 15 : Given Sentry DSN is missing or Sentry init fails, when auth errors occur, then the app still shows a recoverable UI and stores local diagnostics without crashing.
- [ ] CA 16 : Given the Android Firebase project is configured with provider enablement and SHA fingerprints, when the smoke test runs, then email/password and Google auth pass on Android.
- [ ] CA 17 : Given Android Google provider config is intentionally missing or invalid in a controlled test/build, when the user selects a Google account and the SDK reports a canceled/config error, then the app records it as a possible configuration failure, not only as user cancellation.

# Test Strategy

Automated local checks:

```bash
dart format --set-exit-if-changed .
git diff --check
flutter analyze
flutter test
flutter test test/sign_in_screen_test.dart
```

Unit tests:

- `test/auth_failure_test.dart`: maps and redacts typed auth failures.
- `test/firebase_auth_session_store_test.dart` or equivalent: faked Google/Firebase paths, null token, cancellation, config error, FirebaseAuthException mapping.
- Provider tests for local vs Firebase session selection.

Widget/router tests:

- `test/sign_in_screen_test.dart`: visible messages, copy detail, no raw secret, no store call on invalid input, local mode bypass.
- `test/app_router_auth_guard_test.dart`: protected routes signed-out/local/signed-in and redirect loop prevention.

Manual/Android smoke:

- Android app with Firebase defines and provider setup.
- Email/password sign-in success and failure.
- Account creation success and weak-password/failure.
- Google Sign-In success on configured debug/release SHA.
- Controlled Google misconfiguration path or documented operator evidence that configuration errors are represented safely.
- Deep link to protected route signed-out.
- Local mode route access.
- Sentry/AppDiagnostics support export review for redaction.

CI/Blacksmith:

- Android debug build with Firebase/Sentry defines when available.
- No release build required on ARM64 local host.

# Risks

- Security: route guard bugs could expose product screens or initialize stores before session validation. Mitigation: router tests and signed-out deep-link smoke.
- Security: raw provider errors may include sensitive identifiers or token-like text. Mitigation: central redaction tests and no raw exception UI.
- Security: Google `canceled` ambiguity could hide configuration failures until production. Mitigation: special handling and Android setup smoke.
- Data: local mode and Firebase mode can diverge. Mitigation: local mode explicit and no automatic account merge in this chantier.
- Product: account linking/anonymous upgrade is not resolved. Mitigation: show account conflict safely and defer merge/link to a dedicated spec.
- Observability: Sentry dashboard evidence may be unavailable to agents. Mitigation: rely on app diagnostics/support copy plus operator-supplied Sentry event if available.
- Documentation: stale Supabase docs can mislead implementation. Mitigation: update touched active docs and keep broader stale-doc cleanup separate.

# Execution Notes

Read first:

1. `lib/features/auth/domain/auth_session_store.dart`
2. `lib/features/auth/data/firebase_auth_session_store.dart`
3. `lib/features/auth/application/auth_session_provider.dart`
4. `lib/features/auth/presentation/sign_in_screen.dart`
5. `lib/core/router/app_router.dart`
6. `lib/core/bootstrap/sentry_bootstrap.dart`
7. `docs/technical/firebase-cli-foundation.md`

Implementation approach:

1. Add the typed failure model and tests before editing UI.
2. Harden `FirebaseAuthSessionStore` or introduce a tiny Google wrapper seam so SDK edge cases are testable.
3. Refactor presentation mapping only after store errors are typed.
4. Add router guard with tests, keeping redirect logic small and observable.
5. Update diagnostics/redaction and docs.
6. Run local checks, then Android/Firebase smoke before `/sf-verify`.

Packages:

- Use existing packages only: `firebase_auth`, `google_sign_in`, `flutter_riverpod`, `go_router`, `sentry_flutter`.
- Do not add a new auth package, logging package, router package, or dependency injection framework in this chantier.

Stop conditions:

- If Google Sign-In cannot be made testable without a broad architecture change, stop and introduce a minimal wrapper seam in this spec before continuing.
- If Android Firebase provider/SHA setup is unavailable, implementation may pass local checks but `/sf-verify` must stay partial or blocked until smoke evidence exists.
- If account linking is required for the product decision, stop and create a follow-up spec; do not silently merge local/anonymous data.
- If current official docs contradict local package APIs during implementation, stop and rerun `/sf-spec` or update this spec before coding past the conflict.

# Open Questions

None blocking for this chantier. Conservative decisions are fixed:

- Account linking and anonymous-to-Google/email merge are out of scope.
- Android is the required real auth validation surface.
- Local mode remains explicitly local-only and does not imply cloud sync.
- Google configuration ambiguity is treated as a recoverable setup failure with diagnostics, not as a pure user cancellation.

# Implementation Closure

Local implementation is complete through code, docs, redaction, route guards, and automated checks. Ship readiness remains partial because the Android/Firebase auth smoke is not recorded yet.

Local verification passed on 2026-05-14 21:05 UTC:

- `dart format --set-exit-if-changed .`
- `git diff --check`
- `flutter analyze`
- `flutter test`

Pending before ship:

- Android/Firebase smoke for email/password success/failure, Google success, controlled Google configuration failure or equivalent evidence, local mode, sign-out, protected deep links, and diagnostics/Sentry redaction.

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-14 17:27:52 UTC | sf-spec | GPT-5 Codex | Created full auth hardening spec from auth verification gaps and user requirement for sellable max-security product | draft saved | `/sf-ready shipglowz_data/workflow/specs/auth-hardening-professional-error-handling.md` |
| 2026-05-14 17:45:00 UTC | sf-ready | GPT-5 Codex | Reviewed structure, metadata, user story alignment, behavior contracts, task ordering, docs/freshness evidence, adversarial cases, and security posture | ready | `/sf-start shipglowz_data/workflow/specs/auth-hardening-professional-error-handling.md` |
| 2026-05-14 18:09:53 UTC | sf-verify | GPT-5 Codex | Verified current login error-handling patch against local checks, widget tests, Firebase/Google docs, and auth-hardening draft scope | partial | `/sf-ready shipglowz_data/workflow/specs/auth-hardening-professional-error-handling.md` |
| 2026-05-14 21:05:16 UTC | sf-build | GPT-5 Codex | Implemented typed auth failures, Google/Firebase auth hardening, shared redaction, auth-safe UI, route guards through app shell, auth docs, and tests | partial: local checks pass; Android/Firebase smoke pending | Run Android/Firebase smoke before `/sf-end` or `/sf-ship` |

# Current Chantier Flow

| Step | Status | Evidence | Next step |
|------|--------|----------|-----------|
| sf-spec | done | This spec defines the auth hardening contract, external-doc evidence, implementation tasks, acceptance criteria, tests, risks, and stop conditions. | sf-ready |
| sf-ready | done | Structure, metadata, behavior contract, docs freshness, auth/security posture, tasks, acceptance criteria, and stop conditions are sufficient for implementation. | sf-start |
| sf-start | done | Auth hardening was implemented across typed domain failures, Firebase/Google adapter seams, UI handling, diagnostics redaction, and route guard. | sf-build |
| sf-build | partial | Local code/docs/checks are complete and green; Android/Firebase auth smoke evidence is still missing. | Run Android/Firebase smoke |
| sf-verify | blocked | Cannot fully verify sellable auth without Android/Firebase email/password + Google + redaction smoke evidence. | Record smoke evidence, then rerun verify |
| sf-end | not launched | Not closable until Android/Firebase smoke is verified. | Wait for sf-verify |
| sf-ship | not launched | Not shippable until end/verify and Android auth evidence. | Wait for sf-end |
