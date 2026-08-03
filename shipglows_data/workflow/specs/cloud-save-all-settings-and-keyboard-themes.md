---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-06-11"
created_at: "2026-06-11 07:15:42 UTC"
updated: "2026-06-11"
updated_at: "2026-06-11 09:15:00 UTC"
status: ready
source_skill: 100-sf-spec
source_model: "GPT-5 Codex"
scope: "cloud-save-all-settings-and-keyboard-themes"
owner: "Diane"
confidence: high
user_story: "En tant qu'utilisatrice WinGlows connectée, je veux que tous mes réglages, y compris les personnalisations complètes de thèmes clavier, soient sauvegardés dans mon compte cloud, afin de retrouver mon environnement après connexion, changement d'appareil ou réinstallation."
risk_level: high
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "winglowz_app"
  - "Flutter app"
  - "Android IME"
  - "Firebase Auth"
  - "Cloud Firestore"
  - "Cloud Storage for Firebase"
  - "Firestore Security Rules"
  - "Storage Security Rules"
  - "Suite identity / entitlements"
  - "LocalCloudSyncController"
  - "KeyboardSyncController"
  - "Keyboard Theme Studio"
  - "Settings > Compte & cloud"
depends_on:
  - artifact: "shipglows_data/workflow/specs/app-local-to-cloud-data-promotion-merge.md"
    artifact_version: "1.0.0"
    required_status: "ready"
  - artifact: "shipglows_data/workflow/specs/account-backed-keyboard-sync-and-recovery.md"
    artifact_version: "1.0.0"
    required_status: "ready"
  - artifact: "shipglows_data/workflow/specs/keyboard-theme-studio.md"
    artifact_version: "0.1.0"
    required_status: "ready"
  - artifact: "docs/technical/firebase-cli-foundation.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "docs/technical/android-native.md"
    artifact_version: "0.1.0"
    required_status: "draft"
supersedes:
  - "The V1 local-only theme-image exclusion in account-backed-keyboard-sync-and-recovery.md for the specific product goal of complete keyboard-theme recovery."
evidence:
  - "User request 2026-06-11: verifier le flow de sauvegarde cloud des données; tous les réglages, y compris les customizations des thèmes claviers, doivent être conservés."
  - "Audit 2026-06-11: LocalCloudSyncDomain.settings exists, but localCloudSyncControllerProvider has no visible app entrypoint in lib/ to promote local settings before remote store switching."
  - "Audit 2026-06-11: KeyboardSyncController, FirebaseKeyboardConfigStore, DurableKeyboardSyncQueue, Firestore rules and tests already cover account-backed keyboard profile sync."
  - "Audit 2026-06-11: KeyboardSyncPolicyV1 and native KeyboardStateStore intentionally remove backgroundImagePath, local image paths, image bytes and force useImage=false for cloud/export payloads."
  - "Audit 2026-06-11: firestore.rules protects users/{uid}/keyboardConfigs/default with owner + suiteAccess checks and schema validation."
  - "Local tests 2026-06-11: flutter test test/local_cloud_sync_controller_test.dart test/keyboard_sync_controller_test.dart test/keyboard_sync_security_test.dart test/keyboard_sync_models_test.dart test/android_keyboard_bridge_sync_profile_test.dart test/cloud_sync_overview_test.dart passed."
  - "Official Firebase docs checked 2026-06-11: Cloud Storage for Flutter uses the firebase_storage plugin and requires a configured Cloud Storage bucket; new default bucket names use PROJECT_ID.firebasestorage.app."
  - "Official Firebase docs checked 2026-06-11: Cloud Storage Flutter uploads require a child reference and use putFile, putString, or putData."
  - "Official Firebase docs checked 2026-06-11: Cloud Storage Security Rules can use request.auth.uid for per-user access control."
  - "Official Firebase docs checked 2026-06-11: Cloud Storage Security Rules can use firestore.get() and firestore.exists() to evaluate Firestore documents, with a two-document access limit and default-database limitation."
next_step: "/102-sf-start cloud-save-all-settings-and-keyboard-themes"
---

# Title

Cloud Save for All Settings and Keyboard Theme Customizations

# Status

Ready. This spec formalizes Diane's 2026-06-11 product requirement: WinGlows account cloud backup must preserve all user settings and complete keyboard theme customizations, including custom theme images, without weakening the existing local-first, tenant-boundary, and sensitive-data protections.

The current implementation has strong building blocks, but it does not yet satisfy the promise. General settings are modelled in local-cloud sync but the controller is not visibly invoked as an app flow before remote store switching. Keyboard profile sync exists, but theme images are deliberately excluded from the cloud payload. This spec turns those gaps into an implementation contract.

# User Story

En tant qu'utilisatrice WinGlows connectée, je veux que tous mes réglages, y compris les personnalisations complètes de thèmes clavier, soient sauvegardés dans mon compte cloud, afin de retrouver mon environnement après connexion, changement d'appareil ou réinstallation.

Acteur principal: utilisatrice WinGlows qui configure l'app et personnalise le clavier Android avant ou après connexion.

Acteurs secondaires:

- app Flutter;
- IME Android natif;
- Firebase Auth;
- Cloud Firestore;
- Cloud Storage for Firebase;
- suite identity / entitlement `winglowz_app`;
- composant Settings > Compte & cloud;
- support qui lit des diagnostics sans payload privé;
- nouvel appareil ou installation propre.

Déclencheurs:

- création de compte depuis un usage local;
- connexion à un compte existant;
- changement d'un réglage général;
- sauvegarde d'un thème clavier;
- import d'une image de thème clavier;
- retour online après modifications locales;
- refresh manuel depuis Compte & cloud;
- réinstallation puis reconnexion au même compte.

Résultat observable attendu: WinGlows sauvegarde les réglages et le thème clavier complet dans le compte autorisé, affiche un statut honnête par domaine, exclut explicitement les secrets et contenus sensibles, puis restaure les réglages et assets de thème sur un appareil propre après authentification et entitlement valides.

# Minimal Behavior Contract

Quand une utilisatrice connectée et autorisée modifie un réglage WinGlows ou sauvegarde un thème clavier, l'app doit persister d'abord l'état local durable, puis synchroniser vers le compte cloud avec une décision par domaine. Les réglages généraux et le profil clavier JSON sont écrits dans Firestore; les assets lourds et non textuels de thème, notamment l'image de fond clavier importée, sont stockés comme objets privés user-scoped dans Cloud Storage, référencés par un manifest Firestore validé. En cas d'échec réseau, conflit de compte, entitlement absent, payload invalide, asset trop gros ou règle provider refusée, WinGlows garde le local comme source utilisable, marque la sync `pending`, `blocked`, `conflict` ou `failed`, et ne prétend jamais que la récupération cloud est prête. L'edge case facile à rater est l'image de thème: elle ne doit plus être perdue à la réinstallation, mais elle ne doit pas non plus être envoyée en Firestore sous forme de bytes, chemin local privé, URI externe ou payload non borné.

# Success Behavior

- Given des réglages locaux existent avant création de compte, when l'utilisatrice crée un compte avec entitlement `winglowz_app`, then WinGlows lance la promotion locale-cloud avant de basculer durablement vers les stores distants et affiche le statut réel par domaine.
- Given l'utilisatrice modifie `themeMode`, retention, toggles de sync, onboarding notices ou préférences non sensibles, when la session cloud est active, then les changements sont sauvegardés localement puis synchronisés vers `users/{uid}/settings/profile`.
- Given le profil clavier contient couleurs, gradients, effets, relief, status bar, corners, gaps et autres paramètres non sensibles, when la sync clavier s'exécute, then le profil JSON validé est sauvegardé dans `users/{uid}/keyboardConfigs/default`.
- Given le thème clavier utilise une image locale importée, when la sauvegarde cloud est active, then l'app copie/downsample déjà l'image en stockage privé local, calcule un checksum, téléverse un asset borné vers un chemin Cloud Storage user-scoped, écrit un manifest Firestore contenant seulement metadata sûre et référence cloud, puis marque le thème comme récupérable.
- Given l'utilisatrice se reconnecte sur un appareil propre, when l'entitlement est valide, then WinGlows hydrate les réglages, télécharge les assets de thème autorisés, les copie dans le stockage privé app attendu par l'IME, applique le profil clavier, et affiche `Clavier synchronisé`.
- Given Cloud Storage upload réussit mais Firestore manifest échoue, when la transaction de finalisation ne confirme pas, then l'app garde l'opération pending ou nettoie l'objet orphelin selon la stratégie documentée; elle ne marque pas la sync comme complète.
- Given Firestore manifest existe mais l'asset Storage manque ou échoue au téléchargement, when la restauration s'exécute, then le thème applique les couleurs/effets et signale que l'image est à récupérer ou tombée en fallback, sans crash ni perte du profil JSON.
- Given deux appareils modifient le profil clavier, when les revisions divergent, then le controller bloque l'écrasement silencieux et propose les décisions existantes `Garder ce téléphone` / `Utiliser le cloud`, en incluant l'état des assets.
- Given un compte différent se connecte sur le même appareil, when des réglages ou assets locaux sont associés à l'ancien compte, then aucune queue ni asset n'est rejoué vers le nouveau compte sans décision explicite.
- Given l'utilisatrice exporte/import manuellement un profil clavier, when l'export inclut une image, then l'export indique clairement si l'image est incluse, local-only ou cloud-restaurable selon le canal autorisé; aucun chemin privé brut n'est exposé.

# Error Behavior

- Firebase non configuré, session locale fallback, utilisateur non connecté ou entitlement inactif: rester local-only; aucune lecture/écriture Firestore ou Storage.
- Upload Storage refusé ou indisponible: conserver l'image locale et marquer le thème `sync pending` ou `sync failed`; ne pas supprimer l'image locale.
- Asset trop volumineux, type MIME non autorisé, dimensions excessives ou décodage image impossible: refuser la sync de l'asset avec message utilisateur sobre; conserver un fallback de thème sans image.
- Firestore rules ou Storage rules refusent l'accès: afficher une erreur récupérable, enregistrer un code redigé, et ne pas tenter de contourner côté client.
- Échec partiel profil JSON / asset image: ne pas annoncer la récupération complète; garder l'opération pending ou conflict avec idempotency key.
- Changement de compte: purger ou isoler les queues associées à l'ancien compte; ne jamais envoyer ancien profil ou asset vers le nouveau compte.
- Donnée sensible, secret, token, clé API, contenu clipboard, dictation raw, recents ou diagnostics: exclure de la sync; aucune valeur brute en log, Sentry, Firestore, Storage metadata, export non confirmé ou diagnostic copiable.
- Reinstallation sans preuve de remote write: ne pas prétendre que la donnée est récupérable; afficher seulement ce qui a été confirmé comme cloud-backed.

# Problem

WinGlows a déjà une stratégie local-first et une première sync clavier. Mais la promesse utilisateur demandée maintenant est plus forte: tous les réglages doivent survivre au compte, au changement d'appareil et à la réinstallation. Le code actuel ne tient pas encore cette promesse pour deux raisons.

Premièrement, les réglages app sont représentés dans `LocalCloudSyncDomain.settings`, mais le controller transverse de promotion locale-cloud n'est pas exposé comme flow d'app visible. Un provider peut sélectionner `FirebaseSettingsStore` quand le compte devient actif alors que le local n'a pas encore été promu.

Deuxièmement, la sync clavier V1 protège bien la sécurité en supprimant les images et chemins locaux du profil cloud. Cette décision était correcte pour une V1 sûre, mais elle contredit désormais la demande "toutes les customizations des thèmes claviers". Restaurer une image de thème nécessite un vrai stockage d'asset privé, pas l'ajout du chemin local dans Firestore.

# Solution

Étendre la sync locale-cloud existante avec un domaine explicite `keyboardThemeAssets` ou une sous-partie du domaine clavier, et faire de Compte & cloud le déclencheur visible de promotion/hydratation pour les réglages et le profil clavier. Les réglages et les profils JSON restent dans Firestore. Les images de thème sont stockées dans Cloud Storage for Firebase sous un chemin privé contrôlé par UID et asset ID, avec manifest Firestore, checksum, taille, MIME, dimensions, revision et tombstone/cleanup.

Le flux doit rester local-first: l'IME continue d'utiliser son image privée locale. Cloud Storage est un backup/restoration channel. À l'hydratation, l'app télécharge l'asset autorisé, le valide, le place dans le stockage privé app attendu par `KeyboardStateStore`, puis applique le profil clavier. Les secrets restent exclus.

# Scope In

- Déclencher réellement `LocalCloudSyncController` depuis le flow auth/settings pour les domaines existants, avec statut UI fiable.
- Couvrir tous les champs actuels de `UserSettingsSnapshot` non secrets dans le snapshot settings.
- Ajouter la conservation cloud des personnalisations clavier complètes:
  - preset;
  - couleurs;
  - gradients;
  - radius/border/shadow/relief;
  - press effects/easing/intensity;
  - status bar config;
  - corner config safe/redacted;
  - layout/privacy/preferences non sensibles;
  - image de fond clavier via asset cloud privé.
- Ajouter un modèle de manifest d'asset thème: assetId, owner uid/global user, profileRevision, checksum, byte size, MIME, dimensions, storagePath, createdAt/updatedAt, tombstonedAt, sanitization policy.
- Ajouter un adapter Cloud Storage côté Flutter pour upload/download/delete des images de thème avec chemins user-scoped.
- Ajouter règles Storage et tests de règles pour owner-only access et contraintes metadata/taille/type quand testable.
- Ajouter queue durable/idempotente pour opérations asset: upload, finalize manifest, download, delete/tombstone, retry.
- Mettre à jour `KeyboardSyncPolicyV1` vers une politique V2 ou extension compatible qui autorise une référence cloud sûre, jamais un chemin local brut ni des bytes en Firestore.
- Mettre à jour `KeyboardSyncController` pour traiter la complétude JSON + assets, conflits et fallback.
- Mettre à jour Settings > Compte & cloud pour montrer réglages app, profil clavier, image thème et exclusions local-only.
- Ajouter preuves de restauration: appareil propre ou équivalent test contrôlé.
- Mettre à jour docs techniques, support/onboarding et claims internes sur ce qui est récupérable.

# Scope Out

- Sync cloud des clés OpenAI, Anthropic, tokens OAuth, JWT, secrets, credentials ou recovery material.
- Sync du contenu clipboard brut qui est détecté sensible ou issu de champs privés.
- Sync des recents emoji/symboles, diagnostics, raw voice artifacts, prompts, provider payloads ou logs privés.
- Marketplace de thèmes, partage public de thème, profils communautaires ou collaboration multi-utilisateur.
- Chiffrement end-to-end utilisateur pour assets ou secrets; si requis, créer une spec coffre chiffré séparée.
- Builds Android, Gradle, APK ou installs locaux sur cette VM.
- Migration provider hors Firebase.
- Garantie de restauration d'une donnée qui n'a pas eu de write remote confirmé.

# Constraints

- Cloud sync active seulement si Firebase est configuré, session non-local fallback, UID Firebase présent, suite identity valide, entitlement `winglowz_app` actif.
- Firestore et Storage doivent appliquer owner boundary côté règles provider; l'UI n'est jamais la frontière de sécurité.
- Aucune image ne doit être stockée en Firestore comme base64 ou bytes.
- Aucun chemin local privé, URI externe ou full file path ne doit être stocké dans un document cloud lisible par le client comme donnée de restauration.
- Les assets doivent être bornés en taille, type et dimensions avant upload et après download.
- Le profil JSON doit rester validable sans télécharger l'image; l'image est un asset référencé et optionnellement restaurable.
- Les writes doivent être idempotents et retry-safe.
- Les deletes d'assets nécessitent tombstone/retention ou cleanup explicite; ne pas utiliser "absence du dernier manifest" comme seul signal de suppression.
- Le fallback sans image doit rester lisible et professionnel.
- Tous les diagnostics doivent être redigés.
- Les validations locales autorisées restent `flutter analyze`, `flutter test` et tests ciblés; Android/Gradle/APK passent par Blacksmith/GitHub Actions et Diane device QA.

# Test Contract

Surface/stack profile: Flutter + Riverpod + Firebase Auth + Cloud Firestore + Cloud Storage + Android IME MethodChannel + native private image storage.

Proof path: test-first for pure policy/controller/adapter logic, regression-first for the existing gap where image theme is excluded, evidence-first for provider Storage proof and Android restore.

Automated proof:

1. Pure Dart tests for settings snapshot completeness, account association, empty-cloud distinction, conflict and queue behavior.
2. Pure Dart tests for keyboard sync V2 policy: safe cloud asset reference allowed, local path/image bytes/secrets still rejected.
3. Adapter tests for theme asset upload/download manifest behavior with fakes.
4. Queue tests for upload/finalize/download retry and account partitioning.
5. Widget tests for Compte & cloud statuses and conflict/partial asset states.
6. Firestore and Storage rules tests, or a documented `exception-with-proof` only if the emulator harness cannot validate Storage cross-service rules in this repository.
7. Existing keyboard bridge tests extended for cloud-restored local image apply behavior where Flutter can mock MethodChannel.
8. `flutter analyze`.
9. Focused `flutter test` files, then broad `flutter test` if scope touches shared providers/UI.

Non-automated / provider proof:

- Firebase dev project or emulator proof that user A cannot read/write user B keyboard assets.
- Cloud Storage proof that upload uses a child path and owner-scoped rules.
- Hosted/Vercel Flutter web smoke for shared settings UI after local widget tests pass; Android IME restore itself remains device/CI proof.
- Diane physical-device QA: create/import image theme, sync, reinstall or clean-device restore, open real keyboard, verify theme image and controls restore.

Manual checklist path: `shipglows_data/workflow/test-checklists/cloud-save-all-settings-and-keyboard-themes.md`.

Required scenario IDs:

- `CSA-001`: local settings and keyboard profile promote on same-flow account creation before cloud success is claimed.
- `CSA-002`: active account saves a non-secret settings change locally and remotely with measured status.
- `CSA-003`: keyboard theme JSON sync preserves colors, gradients, effects, relief, status bar and safe corner config.
- `CSA-004`: keyboard theme image upload writes a Storage object and Firestore manifest without local paths, external URIs or image bytes in Firestore.
- `CSA-005`: clean install / clean device hydrates settings, profile JSON and theme image asset for the same account.
- `CSA-006`: missing Storage asset yields partial restore state and safe no-image fallback.
- `CSA-007`: account switch blocks or purges queued settings/profile/asset operations from the previous account.
- `CSA-008`: entitlement missing or local fallback prevents Firestore and Storage reads/writes.
- `CSA-009`: oversized or forbidden image type is rejected without deleting the local image.
- `CSA-010`: diagnostics and Sentry breadcrumbs remain redacted after upload/download/apply failures.

Required results:

- `synced` requires durable local save, remote Firestore manifest/profile success, and readable/verified Storage asset when the active theme references an image.
- `partial` is required when JSON profile restores but the image asset is unavailable.
- `pending` is required for retryable offline/upload/finalize/download states.
- `conflict` is required for revision mismatch, account mismatch, or cloud/local divergent payloads that cannot be merged deterministically.
- `local-only` is required when auth, entitlement, Firebase configuration, platform support, or sensitive-data policy blocks cloud sync.

Exception-with-proof:

- If Storage rules cannot be covered by the local rules test harness, implementation must include emulator proof, Firebase console rules simulator proof, or CI/provider proof before `103-sf-verify` can pass.
- If Android reinstall cannot be automated, Diane physical-device QA is mandatory before any release note or support claim says image themes are recoverable after reinstall.

# Dependencies

Local code and docs:

- `lib/features/sync/application/local_cloud_sync_controller.dart`
- `lib/features/sync/application/local_cloud_sync_provider.dart`
- `lib/features/sync/application/local_cloud_sync_adapters.dart`
- `lib/features/settings/domain/settings_store.dart`
- `lib/features/settings/data/firebase_settings_store.dart`
- `lib/features/keyboard/application/keyboard_sync_controller.dart`
- `lib/features/keyboard/application/keyboard_sync_queue.dart`
- `lib/features/keyboard/application/keyboard_sync_providers.dart`
- `lib/features/keyboard/data/firebase_keyboard_config_store.dart`
- `lib/features/keyboard/domain/keyboard_sync_models.dart`
- `lib/features/keyboard/domain/keyboard_sync_policy.dart`
- `lib/core/platform/android_keyboard_bridge.dart`
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`
- `firestore.rules`
- `storage.rules`
- `firebase.json`
- `pubspec.yaml`
- `docs/technical/firebase-cli-foundation.md`
- `docs/technical/android-native.md`

Provider/docs:

- Firebase Cloud Storage for Flutter official docs, checked 2026-06-11: `https://firebase.google.com/docs/storage/flutter/start`. Verdict `fresh-docs checked`: app needs the Firebase Storage plugin and a configured bucket; the doc notes Cloud Storage for Firebase requires Blaze/pay-as-you-go and default bucket naming changed for new buckets.
- Firebase Cloud Storage upload files for Flutter official docs, checked 2026-06-11: `https://firebase.google.com/docs/storage/flutter/upload-files`. Verdict `fresh-docs checked`: uploads use references to child paths and `putFile`, `putString`, or `putData`; root references are not valid upload targets.
- Firebase Storage Security Rules official docs, checked 2026-06-11: `https://firebase.google.com/docs/storage/security`. Verdict `fresh-docs checked`: Storage rules expose `request.auth.uid` for per-user access control.
- Firebase Storage Rules conditions official docs, checked 2026-06-11: `https://firebase.google.com/docs/storage/security/rules-conditions`. Verdict `fresh-docs checked`: Storage rules can use `firestore.get()` and `firestore.exists()` against fully specified default Firestore database document paths; no more than two Firestore documents may be accessed in one Storage rules evaluation, and non-default Firestore databases are not supported for this cross-service check.
- Existing Firestore docs from linked ready specs remain applicable for document manifests, transactions, merge writes, and Firestore Security Rules.

# Invariants

- Local-first remains true: a cloud outage must not make the keyboard unusable.
- Same account can restore; different account cannot silently receive local queues or assets.
- Settings save state and cloud sync state remain distinct.
- JSON profile and binary/image asset lifecycles are separate but coordinated.
- Firestore manifest is the authoritative pointer to a cloud asset; Storage object alone is not a complete sync record.
- Every cloud asset belongs to one Firebase UID and one global user context.
- Secrets are excluded by default.
- Image metadata can be logged only in redacted form: asset id, byte count, dimensions, checksum prefix, state/error code; no path, URI, image bytes, user text or tokens.
- `synced` means durable remote write and readable manifest/asset proof, not just local save.
- Reinstall recovery claims require write + hydrate proof.

# Links & Consequences

- `settingsStoreProvider` may need a pre-switch or post-auth orchestration path so local settings are not hidden by a remote store before promotion.
- `cloudSyncOverviewProvider` and `CloudSyncOverview` need measured statuses from the actual local-cloud controller, not only remote-store type checks.
- `KeyboardSyncPolicyV1` must become `keyboard_sync_v2` or a strictly versioned compatible extension; Firestore rules must allow the new safe manifest fields and continue rejecting unsafe fields.
- Cloud Storage introduces cost/quota/cleanup implications. The spec requires byte caps, retry backoff, orphan cleanup and owner rules.
- Firebase config/env/docs must include the storage bucket and deployment of Storage rules.
- Settings copy must distinguish `sauvegardé localement`, `synchronisé cloud`, `image locale seulement`, `image cloud prête`, `en attente`, `conflit` and `erreur`.
- Existing tests that assert image paths are removed must be updated to assert local paths/bytes are still removed while cloud asset references are allowed only in the safe manifest shape.

# Documentation Coherence

- Update `docs/technical/firebase-cli-foundation.md` with Cloud Storage rules/deploy/emulator commands, bucket assumptions and cost note.
- Update `docs/technical/android-native.md` to replace "keyboard sync V1 excludes image bytes/private paths" with the new V2 distinction: local paths remain excluded; cloud asset manifests are allowed.
- Update `docs/COMPONENTS.md` if the cloud status UI or KeyboardSyncPanel copy changes.
- Update `docs/PLATFORM_BEHAVIOR.md` if it describes keyboard theme images as local-only.
- Update `README.md` or support docs only if they claim backup/reinstall recovery.
- Changelog/release notes must avoid promising full recovery until provider/device proof passes.

# Edge Cases

- Cloud profile references an image asset deleted manually in Firebase console.
- Storage upload succeeds but Firestore write fails.
- Firestore write succeeds but Storage object checksum differs after download.
- User changes image twice offline before first upload completes.
- Same image is reused across two profile revisions.
- User deletes image locally after cloud backup.
- User switches account while an upload is in progress.
- Device has low storage during hydrate.
- Downloaded asset decodes locally but exceeds native render caps.
- User restores on a platform where Android IME is unavailable.
- Entitlement expires between upload and manifest finalization.
- Storage rules deploy lags behind app release.
- Legacy V1 profiles without asset manifests must still restore JSON safely.

# Implementation Tasks

- [ ] Tâche 1 : Add the cloud asset data contract
  - Fichier : `lib/features/keyboard/domain/keyboard_sync_models.dart`
  - Action : Add versioned theme asset manifest models with checksum, size, dimensions, MIME, storagePath, revision, tombstone and validation.
  - User story link : Complete recovery needs a safe representation of theme image assets.
  - Depends on : None.
  - Validate with : `flutter test test/keyboard_sync_models_test.dart`.
  - Notes : Do not include local paths, external URIs or image bytes.

- [ ] Tâche 2 : Extend keyboard sync sanitization policy
  - Fichier : `lib/features/keyboard/domain/keyboard_sync_policy.dart`
  - Action : Introduce V2 or compatible extension allowing safe cloud asset references while continuing to reject local paths, image bytes, secrets, clipboard, diagnostics and recents.
  - User story link : Allows cloud-restorable image themes without weakening privacy.
  - Depends on : Tâche 1.
  - Validate with : `flutter test test/keyboard_sync_security_test.dart test/keyboard_sync_models_test.dart`.
  - Notes : Update tests that currently expect all image-related fields to be removed.

- [ ] Tâche 3 : Add Firebase Storage dependency and configuration docs
  - Fichier : `pubspec.yaml`, `docs/technical/firebase-cli-foundation.md`
  - Action : Add `firebase_storage`, document bucket/runtime define assumptions, deploy commands and local fallback behavior.
  - User story link : Cloud asset backup needs a supported provider adapter.
  - Depends on : Tâche 1.
  - Validate with : `flutter pub get`, `flutter analyze`.
  - Notes : Do not introduce broad storage permissions.

- [ ] Tâche 4 : Add owner-scoped Storage rules
  - Fichier : `storage.rules`, `firebase.json`, `test/storage_rules_entitlement_test.dart`
  - Action : Define user-scoped paths for keyboard theme assets and ensure only the owning authenticated user with active suite access can read/write by checking `request.auth.uid` and `suiteAccess/{uid}` through Storage rules cross-service Firestore access.
  - User story link : Prevents cross-account asset access.
  - Depends on : Tâche 3.
  - Validate with : storage rules tests; if the local harness cannot execute Storage cross-service rules, capture emulator/provider proof before `103-sf-verify`.
  - Notes : Use the default Firestore database path for cross-service `firestore.get()`/`firestore.exists()` and stay under the two-document access limit.

- [ ] Tâche 5 : Implement theme asset storage adapter
  - Fichier : `lib/features/keyboard/data/firebase_keyboard_theme_asset_store.dart`
  - Action : Create upload/download/delete/tombstone adapter using Firebase Storage child references, checksum verification and redacted errors.
  - User story link : Stores and restores the custom theme image.
  - Depends on : Tâches 1-4.
  - Validate with : focused adapter tests with fakes/mocks.
  - Notes : Use bounded payloads and idempotency keys.

- [ ] Tâche 6 : Add durable queue operations for assets
  - Fichier : `lib/features/keyboard/application/keyboard_sync_queue.dart`, `lib/features/keyboard/data/local_keyboard_sync_queue_store.dart`
  - Action : Add upload/finalize/download/delete operation states or a companion queue for theme assets, partitioned by Firebase UID and global user ID.
  - User story link : Offline theme changes still become cloud-backed safely.
  - Depends on : Tâche 5.
  - Validate with : `flutter test test/keyboard_sync_queue_test.dart`.
  - Notes : Account switch must purge/isolate pending asset operations.

- [ ] Tâche 7 : Integrate asset lifecycle into KeyboardSyncController
  - Fichier : `lib/features/keyboard/application/keyboard_sync_controller.dart`
  - Action : Include asset manifest diff, upload before manifest finalization, hydrate/download before applying native profile when image asset is required, and conflict states for partial asset failures.
  - User story link : Keyboard theme sync becomes complete, not JSON-only.
  - Depends on : Tâches 1-6.
  - Validate with : `flutter test test/keyboard_sync_controller_test.dart`.
  - Notes : Keep cloud JSON profile valid even when asset hydration is pending.

- [ ] Tâche 8 : Wire local-cloud sync into app auth/settings flow
  - Fichier : `lib/features/sync/application/local_cloud_sync_provider.dart`, `lib/features/settings/application/cloud_sync_overview_provider.dart`, `lib/app/winglowz_app.dart` or auth/session owner file
  - Action : Trigger local-cloud promotion/hydration when remote auth + entitlement becomes active and expose actual domain statuses.
  - User story link : General settings must be promoted before the app claims account backup.
  - Depends on : Existing `app-local-to-cloud-data-promotion-merge.md` contract.
  - Validate with : `flutter test test/local_cloud_sync_controller_test.dart test/cloud_sync_overview_test.dart`.
  - Notes : Avoid duplicate writes on every rebuild; use guarded/idempotent controller entrypoint.

- [ ] Tâche 9 : Complete settings snapshot coverage
  - Fichier : `lib/features/sync/application/local_cloud_sync_adapters.dart`, `lib/features/settings/data/firebase_settings_store.dart`, `lib/features/settings/domain/settings_store.dart`
  - Action : Ensure all current non-secret `UserSettingsSnapshot` fields are in local/cloud records, including dismissed notices and future safe toggles.
  - User story link : "Tous mes réglages" includes the full settings snapshot, not only themeMode.
  - Depends on : Tâche 8.
  - Validate with : new focused settings sync adapter tests.
  - Notes : Secrets remain excluded.

- [ ] Tâche 10 : Update Compte & cloud UI states
  - Fichier : `lib/features/keyboard/presentation/keyboard_sync_panel.dart`, `lib/core/sync/cloud_sync_overview.dart`, `lib/features/settings/presentation/settings_screen_sections.dart`
  - Action : Show measured states for settings, keyboard profile JSON and theme image asset: synced, pending, partial, conflict, local-only, failed.
  - User story link : User can trust whether recovery is ready.
  - Depends on : Tâches 7-9.
  - Validate with : widget tests for pending asset, partial restore, conflict and success.
  - Notes : Do not use vague "cloud ready" language until both manifest and asset are proven.

- [ ] Tâche 11 : Add restore/hydrate path into native image storage
  - Fichier : `lib/core/platform/android_keyboard_bridge.dart`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`
  - Action : Apply a downloaded app-private image path through the existing native theme config flow with rollback on failure.
  - User story link : Reinstalled device sees the same keyboard image theme.
  - Depends on : Tâche 7.
  - Validate with : MethodChannel tests locally; Blacksmith/device QA for native behavior.
  - Notes : No Android/Gradle local commands on this VM.

- [ ] Tâche 12 : Update provider/security tests
  - Fichier : `test/firestore_rules_entitlement_test.dart`, `test/storage_rules_entitlement_test.dart`
  - Action : Cover safe keyboard profile fields, forbidden fields, owner-only manifest access and asset path rules.
  - User story link : Tenant and privacy boundaries are part of the save promise.
  - Depends on : Tâches 2 and 4.
  - Validate with : focused Firestore and Storage rules tests; provider proof is required if local Storage rules tests are not executable.
  - Notes : Rules proof must include cross-account read, write, overwrite and delete attempts.

- [ ] Tâche 13 : Add full recovery manual checklist
  - Fichier : `../shipglows_data/workflow/test-checklists/cloud-save-all-settings-and-keyboard-themes.md`
  - Action : Create QA checklist for local settings -> account, image theme -> cloud, reinstall/clean device restore, account switch, entitlement missing, offline retry.
  - User story link : Full recovery must be proven before being promised.
  - Depends on : Tâches 1-12.
  - Validate with : checklist review and Diane device QA.
  - Notes : Use exact observable states and avoid sensitive screenshots.

- [ ] Tâche 14 : Update docs and public/support wording
  - Fichier : `docs/technical/firebase-cli-foundation.md`, `docs/technical/android-native.md`, `docs/COMPONENTS.md`, `README.md` if claims change
  - Action : Document supported backup domains, local-only exclusions, Storage requirements, restore proof and limitations.
  - User story link : Product claims must match implementation truth.
  - Depends on : Tâches 1-13.
  - Validate with : docs review and `git diff --check`.
  - Notes : Do not claim secret sync or recovery for unconfirmed local-only data.

# Acceptance Criteria

- [ ] CA 1 : Given une utilisatrice crée un compte après usage local, when auth + entitlement deviennent actifs, then réglages non secrets et profil clavier sont promus avant que l'UI annonce une sauvegarde cloud complète.
- [ ] CA 2 : Given un thème clavier avec image locale, when la sync cloud réussit, then Firestore contient un manifest sûr et Storage contient l'asset user-scoped; Firestore ne contient ni bytes, ni chemin local, ni URI externe.
- [ ] CA 3 : Given une installation propre du même compte, when la restauration s'exécute, then les réglages app, le profil clavier et l'image de thème restaurée sont appliqués localement.
- [ ] CA 4 : Given l'image cloud manque, when le profil est restauré, then le thème sans image reste lisible et l'UI signale une restauration partielle.
- [ ] CA 5 : Given un autre compte se connecte, when une queue d'ancien compte existe, then aucune opération réglage/profil/asset n'est rejouée vers ce compte.
- [ ] CA 6 : Given une image dépasse la limite ou a un type non autorisé, when l'utilisateur tente de la synchroniser, then la sync de l'asset est refusée sans supprimer le thème local.
- [ ] CA 7 : Given entitlement absent ou local fallback, when Compte & cloud est ouvert, then les domaines restent local-only et aucun accès Firestore/Storage n'est tenté.
- [ ] CA 8 : Given un conflit de revision clavier, when l'utilisateur choisit `Garder ce téléphone`, then la nouvelle revision est écrite avec asset cohérent ou reste pending si l'upload n'est pas finalisé.
- [ ] CA 9 : Given le bouton refresh/sync est utilisé, when une opération pending existe, then elle retry de façon idempotente sans doublon Storage ou Firestore.
- [ ] CA 10 : Given diagnostics copiés après échec, when ils sont inspectés, then ils ne contiennent pas image bytes, chemins privés, clipboard, dictation, tokens ou secrets.

# Test Strategy

- Start with pure Dart tests for data contracts and policy. These define the safe payload shape before touching Firebase adapters.
- Add fake adapter tests for Storage upload/download/finalize failure modes.
- Extend existing controller and queue tests rather than adding widget logic into controllers.
- Add widget tests only after controller states exist.
- Run `flutter analyze` and focused `flutter test` suites locally.
- Route Storage rules/provider proof through emulator/CI; if the local harness is unavailable, record an explicit exception-with-proof route before implementation is reported complete.
- Route Android native restore proof through Blacksmith/GitHub Actions and Diane physical-device QA.

Suggested focused local command after implementation:

```bash
flutter test test/local_cloud_sync_controller_test.dart test/cloud_sync_overview_test.dart test/keyboard_sync_controller_test.dart test/keyboard_sync_queue_test.dart test/keyboard_sync_security_test.dart test/keyboard_sync_models_test.dart test/android_keyboard_bridge_sync_profile_test.dart
flutter analyze
```

# Risks

- Security: theme images are user files; Storage rules and path design must prevent cross-account access.
- Privacy: local image paths and external URIs can expose private device structure; never sync them.
- Data loss: app must not delete local theme images before cloud proof.
- Cost/quota: Storage adds bytes, uploads, downloads and cleanup responsibilities.
- Partial failure: JSON profile and binary asset can diverge; UI must expose partial state.
- Provider setup: Cloud Storage may require project/billing setup beyond current Firestore-only deployment.
- Compatibility: legacy V1 keyboard profiles must still restore.
- Device proof: Android IME image restore cannot be fully proven by Flutter web tests.

# Execution Notes

- Read first: `lib/features/keyboard/domain/keyboard_sync_policy.dart`, `lib/features/keyboard/application/keyboard_sync_controller.dart`, `lib/features/sync/application/local_cloud_sync_controller.dart`, `firestore.rules`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`.
- Do not implement by adding image bytes or local file paths into `KeyboardSyncProfile.payload`.
- Treat Storage as an owned asset channel with a manifest, not as an arbitrary URL bucket.
- Prefer small, pure domain models and fakes for tests before adding Firebase SDK calls.
- If Storage rules cannot enforce suite access with current Firebase rules capabilities/project config, stop and route a security decision before coding.
- If billing/project Storage setup is not available, implementation may stop after local models/UI states and mark provider proof blocked; do not claim complete cloud recovery.
- Existing user-facing French copy must stay natural and explicit: "image synchronisée", "image en attente", "restauration partielle", "local uniquement".
- Runtime observability must stay redacted: Sentry breadcrumbs/events may record domain, operation type, asset id/checksum prefix, byte count, error class and retry count, but never local paths, URLs, image bytes, clipboard, dictation, tokens or secrets.
- Diagnostic copy must include app build metadata already exposed by `app_build_info.dart` and UTC/Paris timing when useful for support, without adding secrets or provider payloads.
- Stop if implementation needs a new product decision on billing/cost ownership, encrypted secret sync, public theme sharing, broad storage permissions, or non-default Firestore database support for Storage rules.

# Open Questions

None. The spec chooses the professional default implied by Diane's request: complete keyboard theme recovery includes image assets, implemented through private Cloud Storage assets plus Firestore manifests. Secret sync remains out of scope and requires a separate encrypted-vault spec.

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-06-11 07:15:42 UTC | 100-sf-spec | GPT-5 Codex | Created spec for cloud-backed preservation of all non-secret settings and complete keyboard theme customizations, including theme image assets. | draft saved | /101-sf-ready cloud-save-all-settings-and-keyboard-themes |
| 2026-06-11 07:25:00 UTC | 101-sf-ready | GPT-5 Codex | Readiness review; tightened Storage rules proof, required scenarios/results, runtime observability and execution stop conditions. | ready | /102-sf-start cloud-save-all-settings-and-keyboard-themes |
| 2026-06-11 08:25:00 UTC | 102-sf-start | GPT-5 Codex | Implemented keyboard sync V2 payload/asset flow, Storage adapter/rules, auto-run local-cloud entrypoints, settings snapshot coverage, checklist and targeted docs; provider/device proof still pending. | partial | /103-sf-verify cloud-save-all-settings-and-keyboard-themes |
| 2026-06-11 09:05:00 UTC | 103-sf-verify | GPT-5 Codex | Re-ran `flutter analyze` and targeted sync/rules/widget tests, confirmed diagnostics surface reuse, and verified the chantier remains incomplete because provider Storage proof, hosted shared-UI smoke, and Android clean-install IME recovery proof are still missing. | partial | /005-sf-ship cloud-save-all-settings-and-keyboard-themes |
| 2026-06-11 09:15:00 UTC | 005-sf-ship | GPT-5 Codex | Quick ship for collaboration: staged the cloud-save/settings/keyboard sync chantier changes, kept the verification limits explicit, and pushed for hosted/provider follow-up. | shipped | /405-sf-prod winglowz-app |

# Current Chantier Flow

- 100-sf-spec: done
- 101-sf-ready: ready
- 102-sf-start: partial
- 103-sf-verify: partial
- 104-sf-end: not launched
- 005-sf-ship: shipped

Next step: `/405-sf-prod winglowz-app`
