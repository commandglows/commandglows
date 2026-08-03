---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-09"
created_at: "2026-05-09 21:45:00 UTC"
updated: "2026-05-09"
updated_at: "2026-05-10 16:18:01 UTC"
status: ready
source_skill: sf-build
source_model: "GPT-5 Codex"
scope: "firebase-backend-agnostic-migration"
owner: "Diane"
confidence: high
user_story: "En tant que builder de WinGlows, je veux remplacer la cible Supabase par des contrats backend-agnostiques avec Firebase comme premier adaptateur Android, afin de garder l'app gratuite au départ, pilotable en CLI et remplaçable plus tard."
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Flutter app"
  - "Firebase Auth"
  - "Cloud Firestore"
  - "Firestore Security Rules"
  - "Firebase CLI"
  - "FlutterFire CLI"
  - "GitHub Actions"
  - "Blacksmith Android build"
  - "SettingsStore"
  - "ClipboardHistoryStore"
  - "Supabase legacy adapter"
depends_on:
  - artifact: "docs/DECISIONS.md"
    artifact_version: "0.1.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/architecture.md"
    artifact_version: "0.1.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/guidelines.md"
    artifact_version: "0.1.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/workflow/specs/clipboard-backend-agnostic-api.md"
    artifact_version: "0.1.0"
    required_status: "ready"
supersedes:
  - "docs/SPEC_FLUTTER_SUPABASE_MIGRATION.md"
  - "docs/API_SUPABASE.md"
  - "docs/MIGRATION_FLUTTER.md"
evidence:
  - "User decision 2026-05-09: backend must be backend-agnostic and Supabase is no longer the target."
  - "User decision 2026-05-09: Firebase is accepted as first adapter for Android MVP."
  - "User decision 2026-05-09: use GitHub Secrets and Blacksmith for APK build configuration."
  - "User decision 2026-05-09: web is ignored for now; Android is the current implementation focus."
  - "Firebase official docs checked 2026-05-09: Flutter apps should be configured with FlutterFire CLI."
  - "Firebase official docs checked 2026-05-09: Firebase CLI deploys Firestore rules and indexes from firebase.json."
  - "Firebase official docs checked 2026-05-09: Firestore Security Rules use request.auth and can enforce per-user access; rules are not query filters."
next_step: "/sf-start shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md"
---

# Title

Firebase Backend-Agnostic Migration

# Status

Ready for staged implementation. This spec replaces the old Supabase-target migration as the active backend chantier. Supabase code and SQL may remain temporarily as legacy adapters/reference while Firebase contracts are introduced, but new product work must not deepen Supabase coupling.

# User Story

En tant que builder de WinGlows, je veux remplacer la cible Supabase par des contrats backend-agnostiques avec Firebase comme premier adaptateur Android, afin de garder l'app gratuite au départ, pilotable en CLI et remplaçable plus tard.

Acteur principal: builder WinGlows.

Acteurs secondaires: utilisateur Android, futur utilisateur connecté, GitHub Actions/Blacksmith, futur backend provider.

Déclencheurs:

- Une fonctionnalité a besoin de lire/écrire des données utilisateur distantes.
- Un écran existant dépend encore directement de Supabase.
- Une préférence settings doit survivre au redémarrage et éventuellement se synchroniser.
- Le build Android doit recevoir une configuration backend via GitHub Secrets.

Résultat observable attendu: l'app garde ses workflows Android actuels, mais les nouvelles écritures passent par des interfaces produit (`SettingsStore`, `ClipboardHistoryStore`, futurs stores transcriptions/snippets/dictionary/auth) et Firebase devient un adaptateur remplaçable, configuré par CLI, règles et indexes versionnés.

# Minimal Behavior Contract

WinGlows expose des contrats backend-agnostiques pour les données utilisateur et les settings. Les widgets et services Android ne connaissent pas Firebase, Supabase, Firestore, SQL ou règles provider; ils consomment des stores/domain APIs. Firebase Auth fournit l'identité distante du premier MVP Android, Cloud Firestore porte les documents utilisateur, et Firestore Security Rules imposent que chaque utilisateur ne lise/écrive que ses propres documents. Si Firebase n'est pas configuré, l'app reste utilisable en mode local ou affiche un état de sync indisponible sans crash ni fausse promesse. L'edge case facile à rater est la migration progressive: Supabase legacy peut rester présent pour compiler, mais ne doit pas redevenir le contrat produit ni apparaître comme cible active dans l'UI ou les docs.

# Scope In

- Définir les interfaces backend-agnostiques manquantes: auth/session, settings, transcriptions, snippets, dictionary, et sync status.
- Garder `ClipboardHistoryApi`/`ClipboardHistoryStore` comme modèle pour les autres domaines.
- Ajouter Firebase comme premier adaptateur distant Android: Auth + Firestore + rules + indexes.
- Ajouter `firebase.json`, `firestore.rules`, `firestore.indexes.json` et le workflow CLI attendu.
- Configurer FlutterFire via CLI pour Android quand le projet Firebase existe.
- Utiliser GitHub Secrets pour injecter la configuration nécessaire au build Blacksmith.
- Marquer les documents Supabase comme legacy/superseded.
- Mettre à jour README, docs techniques, platform behavior, verification et TASKS.
- Garder les secrets OpenAI/Anthropic locaux uniquement; ils ne vont jamais dans Firebase.

# Scope Out

- Réécrire toute l'app en une seule passe.
- Supprimer Supabase runtime avant qu'un adaptateur Firebase équivalent compile et passe les tests.
- Implémenter web, iOS, desktop ou AI web proxy.
- Ajouter billing, quotas payants ou entitlements.
- Ajouter Cloud Functions tant qu'un client Flutter + Security Rules suffit.
- Stocker des clés admin/service Firebase dans le client.

# Constraints

- Android est la plateforme prioritaire.
- Firebase est un adaptateur, pas le domaine produit.
- Les règles Firestore doivent refuser les accès non authentifiés aux données utilisateur distantes.
- Les writes doivent être user-scoped par auth uid, pas par un user id de confiance fourni par le client.
- Les requêtes client doivent être compatibles avec les Security Rules; les rules ne sont pas des filtres.
- Les fichiers rules/indexes doivent être versionnés et déployables via CLI.
- GitHub Secrets est la source CI pour les valeurs de build; ne pas introduire Doppler.
- Supabase legacy ne peut recevoir que des corrections de compatibilité, pas de nouvelles fonctionnalités cible.

# Proposed Data Shape

Premier schéma Firestore recommandé, à affiner pendant l'implémentation:

- `users/{uid}/settings/profile`: préférences syncables non secrètes, dont `themeMode`, langues, préférences clavier/overlay syncables.
- `users/{uid}/transcriptions/{transcriptionId}`: textes, source, timestamps, sync state, limites de longueur.
- `users/{uid}/clipboardItems/{itemId}`: contenu accepté, hash, source, pin, deletedAt, origin device, sync state.
- `users/{uid}/snippets/{snippetId}`: trigger, label, content, deletedAt.
- `users/{uid}/dictionaryTerms/{termId}`: term, replacement, caseSensitive, deletedAt.
- `users/{uid}/clientEvents/{eventId}`: metadata redacted uniquement, jamais audio, texte brut sensible ou clés.

Les noms exacts peuvent changer si l'implémentation prouve une meilleure convention, mais l'isolation sous `users/{uid}` reste l'option par défaut.

# Confirmed Technical Decisions

- Firebase project is configured through CLI.
- Dev-only Firebase project ID: `winglowz-dev`. Display name may be `WinGlows Dev`; Google Cloud project IDs cannot contain underscores.
- Auth providers for MVP: anonymous, email/password, Google Sign-In.
- App must keep a local fallback when Firebase is missing or unavailable.
- First remote sync scope targets settings, clipboard, and transcriptions when unblocked.
- Clipboard sync is automatic, with private-field gating and user-visible sync/error state required before production confidence.
- Retention choices are constrained to `1h`, `12h`, `24h`, `3d`, and `7d` maximum.
- Client-side encryption is deferred and tracked as an explicit privacy/security decision before cloud sync is production-default.
- Supabase remains legacy while it compiles; new runtime/product contracts must not depend on it.
- User data is private by default under `users/{uid}`.

# Implementation Tasks

- [x] Tâche 1 : Créer le contrat backend commun
  - Fichiers : `lib/data/`, `lib/features/*/domain/`, docs techniques.
  - Action : définir les stores/interfaces que l'UI consomme, en partant du modèle clipboard existant. Fait pour auth/session, settings, sync status, rétention, transcriptions, snippets, dictionary et clipboard.
  - Validate with : tests fake stores, `flutter analyze`, `flutter test` OK.

- [x] Tâche 2 : Ajouter le socle Firebase CLI
  - Fichiers : `firebase.json`, `firestore.rules`, `firestore.indexes.json`, docs setup.
  - Action : versionner rules/indexes et commandes `firebase deploy --only firestore`. Fait avec doc `docs/technical/firebase-cli-foundation.md`.
  - Validate with : JSON lint OK, `git diff --check` OK; Firebase CLI 15.17.0 installé; `firebase emulators:exec --project demo-winglowz-dev --only firestore,auth "true"` OK.

- [x] Tâche 3 : Configurer FlutterFire Android
  - Fichiers : `lib/firebase_options.dart`, `android/**`, `pubspec.yaml`.
  - Action : ajouter dépendances FlutterFire et initialisation conditionnelle. Fait via `FirebaseBootstrap` et `--dart-define` sans forcer `google-services.json` local.
  - Validate with : `flutter analyze`, `flutter test` OK; Android build local bloqué car Android SDK absent (`ANDROID_HOME` non défini).

- [x] Tâche 4 : Implémenter Firebase Auth adapter
  - Fichiers : `lib/features/auth/**`, `lib/data/firebase/**`.
  - Action : remplacer l'auth gate cible par Firebase Auth derrière interface. Fait avec `AuthSessionStore`, local fallback, Firebase Auth et Supabase legacy adapter.
  - Validate with : `flutter analyze`, `flutter test` OK; smoke manuel Android restant.

- [x] Tâche 5 : Implémenter Firebase SettingsStore
  - Fichiers : `lib/features/settings/**`, `lib/data/firebase/**`, `firestore.rules`.
  - Action : local-first `themeMode` puis sync compte non secrète. Fait avec `LocalSettingsStore`, `FirebaseSettingsStore`, provider fallback.
  - Validate with : `flutter analyze`, `flutter test` OK; emulator/rules user-scoped restant.

- [x] Tâche 6 : Implémenter Firebase stores domaine par domaine
  - Fichiers : `lib/data/firebase/**`, `lib/features/voice|clipboard|snippets|dictionary/**`.
  - Action : transcriptions, clipboard, snippets, dictionary via interfaces. Fait avec adapters Firestore et fallback local/legacy.
  - Validate with : fake store tests OK; Firebase emulator/rules tests restants faute de `firebase-tools`.

- [x] Tâche 7 : Débrancher Supabase du runtime cible
  - Fichiers : `pubspec.yaml`, `lib/core/bootstrap/supabase_bootstrap.dart`, `lib/data/supabase/**`, tests Supabase.
  - Action : retirer Supabase du bootstrap/runtime providers/diagnostics actifs tout en gardant les adapters/tests legacy pour compatibilité compile.
  - Validate with : `rg Supabase lib test pubspec.yaml`, `flutter analyze`, `flutter test`.

- [x] Tâche 8 : Mettre à jour CI/Blacksmith
  - Fichiers : `.github/workflows/**`, README.
  - Action : GitHub Secrets Firebase, build APK, artifact proof. Fait avec secrets Firebase runtime, `GCP_WIF_PROVIDER` + `GCP_WIF_SERVICE_ACCOUNT` (OIDC Workload Identity Federation), build APK Blacksmith et job deploy Firestore conditionné à `main`/`master`/manuel.
  - Validate with : workflow syntax locale OK; hosted build/deploy restant à prouver après ajout des secrets GitHub.

- [x] Tâche 9 : Archiver les docs Supabase
  - Fichiers : `docs/SPEC_FLUTTER_SUPABASE_MIGRATION.md`, `docs/API_SUPABASE.md`, `docs/MIGRATION_FLUTTER.md`, `docs/technical/supabase-data.md`.
  - Action : marquer legacy/superseded et pointer vers cette spec. Fait avec marquage explicite `Archived`/`Legacy` dans les quatre documents.
  - Validate with : `rg` montrant que les docs cible pointent vers Firebase/backend-agnostic; revue manuelle OK.

# Acceptance Criteria

- Aucun nouvel écran Flutter n'importe directement un adaptateur Firebase ou Supabase.
- Les stores Firebase implémentent des interfaces produit.
- Les rules Firestore refusent les non-authentifiés et isolent `users/{uid}`.
- Les secrets BYOK restent locaux.
- Les commandes Firebase CLI sont documentées.
- GitHub Secrets + Blacksmith restent le chemin build APK.
- Les docs Supabase ne se présentent plus comme cible active.
- `flutter analyze` passe.
- `flutter test` passe.

# Test Plan

- Unit tests sur parsing/settings/domain models.
- Fake store tests pour chaque interface.
- Firebase rules tests ou emulator smoke pour user A/user B.
- Android smoke: auth, settings, clipboard, transcription save, snippets, dictionary.
- CI: Blacksmith APK avec secrets Firebase quand disponibles.
- Search checks:
  - `rg "Supabase.*target|Flutter \\+ Supabase" README.md shipglows_data/business/product.md shipglows_data/business/business.md shipglows_data/technical/architecture.md shipglows_data/technical/guidelines.md docs specs`
  - `rg "Supabase" lib test pubspec.yaml` doit rester uniquement dans legacy/adapters jusqu'à suppression.

# Stop Conditions

- Firebase project absent et impossible à créer/configurer via CLI.
- Security Rules ne peuvent pas prouver l'isolation user-scoped.
- FlutterFire configuration force des secrets admin dans le client.
- Firebase adapter casse les workflows Android actuels sans fallback local.
- Suppression Supabase envisagée avant parité fonctionnelle.

# Rollback Plan

- Garder Supabase legacy intact jusqu'à validation Firebase.
- Les interfaces backend-agnostiques restent utiles même si Firebase est remplacé.
- Si Firebase setup bloque, continuer en local/fake stores et garder la spec comme contrat.

# Open Questions

- Faut-il préserver et lier les données anonymes quand l'utilisateur upgrade vers email/password ou Google Sign-In?
- Quels délais de rétention par défaut appliquer par domaine parmi `1h`, `12h`, `24h`, `3d`, `7d`?
- Quand activer le chiffrement client pour clipboard/transcriptions avant sync cloud par défaut?
- Doit-on activer Firestore offline persistence explicitement ou commencer avec le comportement par défaut FlutterFire?
- Quelle règle de conflit gagne entre local pending et remote plus récent pour settings et clipboard?
- Android build/smoke local reste bloqué tant que `ANDROID_HOME`/Android SDK n'est pas disponible.

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-09 21:45:00 UTC | sf-build | GPT-5 Codex | Created Firebase/backend-agnostic migration chantier after user approved Firebase as first adapter and requested cleanup | implemented | `/sf-start shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md` |
| 2026-05-10 00:00:00 UTC | sf-start | GPT-5 Codex + gpt-5.3-codex-spark worker + gpt-5.5 low explorer | Added Firebase CLI foundation and initial backend-neutral Dart contracts after user answered technical questions | partial | Finish auth/session, snippets, dictionary contracts, then FlutterFire conditional init |
| 2026-05-10 00:00:00 UTC | continue | GPT-5 Codex + gpt-5.3-codex-spark workers | Continued implementation through backend-neutral auth/settings/domain stores and Firestore adapters with local fallback | partial | Validate with Firebase CLI/emulator and Android SDK/Blacksmith |
| 2026-05-10 00:00:00 UTC | continue | GPT-5 Codex | Installed Firebase CLI and validated local Auth/Firestore emulator startup against demo project | partial | Authenticate/deploy real Firebase project or run Blacksmith Android build |
| 2026-05-10 09:29:11 UTC | sf-ship | GPT-5 Codex | Quick ship all dirty for backend-agnostic Firebase migration, ContentFlow theme integration, icon assets and docs | shipped | Real Firebase deploy and Android/Blacksmith proof remain |
| 2026-05-10 16:18:01 UTC | sf-build | GPT-5 Codex | Re-ran verification gate after repository cleanup: `flutter analyze`, `flutter test`, Supabase target scan, Firebase emulator smoke, and real `firebase deploy --only firestore` attempt | partial | Authenticate Firebase CLI (or CI token/service account) then run real Firestore deploy and Android/Blacksmith proof |
| 2026-05-10 18:38:33 UTC | sf-verify | GPT-5 Codex | Validated GitHub OIDC/WIF deploy flow end-to-end; Firestore rules/indexes deploy succeeded in CI run `25636532417`, job `75249317806`, with APK pipeline also green | done | Move to sf-end and remaining task 7 scope decision |
| 2026-05-10 18:53:54 UTC | sf-verify | GPT-5 Codex | Re-validated Firestore deploy after IAM hardening; CI run `25636936089` kept job `Deploy Firestore Rules and Indexes` green (job `75250395805`) with strict repo-scoped principal bindings | done | Keep monitoring and finalize task 7 strategy |
| 2026-05-10 19:02:17 UTC | sf-ship | GPT-5 Codex | Full close ship: archived Supabase target docs, updated project/master tasks and changelog, and shipped Firebase OIDC/WIF Firestore CI proof with hardened IAM bindings | shipped | Continue task 7 (Supabase runtime detachment) and Android device QA tracks |
| 2026-05-10 19:28:58 UTC | sf-test | GPT-5 Codex | Targeted Firebase/backend-agnostic migration validation: rechecked `docs`/`specs` canonical paths (legacy root paths removed), legacy-compatibility scan (`rg`), and `Supabase` scan in `lib/test/pubspec.yaml` | partial | Task 7 still pending by design; keep Supabase legacy adapters + continue Android device QA for Firebase parity |
| 2026-05-10 20:31:19 UTC | sf-build | GPT-5 Codex | Finalized Android-current manual pass scope: Android overlay/IME device QA remains tracked separately, iOS/macOS microphone/speech declarations are future-compatible only, non-Android desktop/web proof is out of current runtime scope, web local speech disabled, and local analyze/test/web build passed. | partial | Keep Android real-device QA under overlay/IME tasks. |
| 2026-05-11 00:00:00 UTC | sf-start | GPT-5 Codex | Completed task 7 by removing Supabase from active runtime bootstrap/provider selection and backend diagnostics while preserving legacy Supabase adapters/tests for compile compatibility. | implemented | `/sf-verify shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md` |
| 2026-05-11 05:48:21 UTC | sf-verify | GPT-5 Codex | Verified task 7 runtime detachment and local checks; `flutter analyze`, `flutter test`, format, diff check, and Firebase emulator smoke passed, but high bug `BUG-2026-05-10-002` remains `fix-attempted` and active docs still present Supabase as reviewed runtime architecture. | partial | Close bug gate with APK/device retest and update stale Supabase-target docs before sf-end |

# Current Chantier Flow

| Step | Status | Evidence | Next step |
|------|--------|----------|-----------|
| sf-spec | done | This spec captures backend-agnostic Firebase migration contract | sf-start |
| sf-ready | done | Scope, constraints, rules, CLI, tasks, tests and stop conditions are explicit | sf-start |
| sf-start | done | Tasks 1-9 are implemented. Task 7 now detaches Supabase from active runtime bootstrap/provider selection and diagnostics while preserving legacy Supabase code for compatibility. | sf-verify |
| sf-verify | partial | Local Dart checks and Firebase emulator smoke passed; runtime detachment is visible in code, but high bug `BUG-2026-05-10-002` is still `fix-attempted` and `CLAUDE.md`/`docs/ARCHITECTURE_FLUTTER.md` still carry reviewed Supabase-target instructions. | Fix doc/bug gates, then rerun sf-verify |
| sf-end | pending | Current verification is partial after task 7 reopen. | Wait for sf-verify verified |
| sf-ship | pending | Prior Firestore OIDC/WIF CI deploy proof remains valid, but current dirty task 7 verification is not ready to close. | Run after sf-end |
