---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-25"
created_at: "2026-05-25 15:14:26 UTC"
updated: "2026-05-25"
updated_at: "2026-05-25 19:55:49 UTC"
status: ready
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "account-backed-keyboard-sync-and-recovery"
owner: "Diane"
confidence: high
user_story: "En tant qu'utilisatrice connectée de WinGlows, je veux retrouver mes réglages clavier et mes données de travail après connexion, changement d'appareil ou réinstallation, afin de ne plus perdre mon clavier personnalisé ni recommencer ma configuration."
risk_level: high
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "WinGlows Flutter app"
  - "WinGlows Android IME"
  - "WinGlows suite authentication"
  - "Firebase Auth"
  - "Cloud Firestore"
  - "Firestore Security Rules"
  - "Suite identity bridge"
  - "KeyboardStateStore"
  - "AndroidKeyboardBridge"
  - "SettingsStore"
  - "SocialGlowz reference sync"
depends_on:
  - artifact: "shipglows_data/technical/winglowz_app/architecture.md"
    artifact_version: "1.0.1"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/winglowz_app/guidelines.md"
    artifact_version: "1.0.1"
    required_status: "reviewed"
  - artifact: "shipglows_data/workflow/specs/unified-suite-authentication.md"
    artifact_version: "1.0.25"
    required_status: "active"
  - artifact: "shipglows_data/workflow/specs/local-first-user-owned-sync-strategy.md"
    artifact_version: "0.1.0"
    required_status: "draft"
  - artifact: "shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md"
    artifact_version: "1.0.0"
    required_status: "ready"
  - artifact: "shipglows_data/workflow/specs/keyboard-theme-studio.md"
    artifact_version: "0.1.0"
    required_status: "ready"
  - artifact: "shipglows_data/workflow/specs/keyboard-swipe-corner-settings-editor.md"
    artifact_version: "0.1.0"
    required_status: "ready"
supersedes: []
evidence:
  - "User request 2026-05-25: start user accounts and data synchronization because reconfiguring the keyboard each time and losing work is unacceptable."
  - "User instruction 2026-05-25: use the WinGlows suite authentication specs already present in the repo."
  - "User suggested SocialGlowz as a strong reference for authentication, synchronization, export, and reimport."
  - "Local code 2026-05-25: `suiteIdentityProvider` resolves Firebase sessions through the suite bridge and stays fail-closed when the bridge is unavailable."
  - "Local code 2026-05-25: `settingsStoreProvider` only selects `FirebaseSettingsStore` when Firebase is configured, a non-local session exists, and suite identity grants `winglowz_app`."
  - "Local code 2026-05-25: `KeyboardStateStore` persists native IME preferences, theme JSON, corner config JSON, status bar config, action row state, recents, voice runtime metadata, and bounded clipboard/text rules in Android SharedPreferences."
  - "Local code 2026-05-25: `KeyboardThemeConfig` and `AndroidKeyboardCornerConfig` already round-trip as bounded JSON from Flutter to native Android."
  - "SocialGlowz reference 2026-05-25: `src/lib/cloudSync.ts` hydrates after auth, seeds cloud from local only when safe, clears stale queues on user change, and applies cloud snapshots deliberately."
  - "SocialGlowz reference 2026-05-25: `src/lib/cloudSyncQueue.ts` persists a durable local mutation queue, deduplicates by operation key, flushes on online/focus/interval, and retries failures."
  - "SocialGlowz reference 2026-05-25: `src/lib/postAuthSyncFeedback.ts` exposes blocking post-auth stages so the user is not dropped into a half-synced app."
  - "SocialGlowz reference 2026-05-25: `src-tauri/src/backup.rs` uses a versioned encrypted backup container for export/reimport."
  - "Official Firebase docs checked 2026-05-25: Firestore offline persistence on Android/Apple is enabled by default; local writes sync when online; multiple writes to the same document resolve last-write-wins."
  - "Official Firebase docs checked 2026-05-25: Firestore Security Rules use `request.auth`, can check owner paths and other documents with `get()` / `exists()`, and rules are not query filters."
  - "Official Firebase docs checked 2026-05-25: custom backends should receive Firebase ID tokens over HTTPS and verify them server-side with the Admin SDK; revocation checks are not implicit."
next_step: "/sf-prod winglowz_app"
---

# Title

Account-Backed Keyboard Sync and Recovery

# Status

Ready. This spec defines the first practical account-backed sync slice for the WinGlows app: keep the suite-auth contract, protect local-first behavior, and make the Android keyboard configuration recoverable after sign-in, reinstall, or a second device.

This spec intentionally does not replace the broader `local-first-user-owned-sync-strategy.md`. It creates a near-term implementation contract for the data Diane is most likely to lose today: native IME preferences, theme JSON, corner shortcuts, status bar config, and safe keyboard profile metadata.

# User Story

En tant qu'utilisatrice connectée de WinGlows, je veux retrouver mes réglages clavier et mes données de travail après connexion, changement d'appareil ou réinstallation, afin de ne plus perdre mon clavier personnalisé ni recommencer ma configuration.

Acteur principal: utilisatrice WinGlows qui personnalise le clavier Android et se connecte avec son compte WinGlows.

Acteurs secondaires: app Flutter, IME Android natif, Firebase Auth, suite identity bridge, Firestore, opérateur support, futur appareil du même compte.

Déclencheurs:

- L'utilisatrice se connecte après avoir configuré le clavier en local.
- L'utilisatrice réinstalle l'app, change de téléphone ou ouvre WinGlows sur un deuxième appareil.
- L'utilisatrice modifie un thème, un preset de coins, des préférences IME ou une option clavier.
- L'app passe offline puis revient online.
- L'utilisatrice change de compte sur le même appareil.
- L'utilisatrice veut exporter ou réimporter un profil clavier avant une manipulation risquée.

Résultat observable attendu: WinGlows reconnaît le compte, hydrate un profil clavier sûr, synchronise les changements éligibles, protège les données locales en cas de conflit, et fournit un export/import manuel pour récupérer le travail sans dépendre d'une réussite immédiate du cloud.

# Minimal Behavior Contract

WinGlows accepte une session Firebase reconnue par la suite et un entitlement `winglowz_app` actif, lit la configuration clavier native locale, puis la compare au profil clavier cloud du même compte. Si le cloud est vide et que le profil local peut être assaini selon la policy V1, l'app sauvegarde automatiquement les champs éligibles comme première version du compte et signale les champs restés local-only; si le profil local ne peut pas être assaini sans ambiguïté, l'app bloque le seed et propose l'export manuel. Si le cloud contient déjà un profil du même compte, l'app l'applique seulement après une décision sûre de conflit, une preuve de même appareil/même compte, ou une transaction qui confirme que la révision cloud attendue n'a pas changé; si la sync échoue, le clavier local continue de fonctionner et une file locale retente l'envoi sans perdre le brouillon. L'edge case facile à rater est le changement de compte: WinGlows ne doit jamais écraser silencieusement le clavier local d'un compte A avec le profil du compte B, ni rejouer une file locale ancienne dans le mauvais compte.

# Success Behavior

- Given l'utilisatrice est en mode local et a personnalisé thème, coins et préférences clavier, when elle se connecte à un compte WinGlows avec accès `winglowz_app`, then l'app détecte que le cloud clavier est vide, assainit le profil local, sauvegarde automatiquement les champs éligibles, et affiche les champs exclus comme local-only.
- Given le même compte a déjà un profil clavier cloud, when l'utilisatrice se connecte sur un nouvel appareil propre, then l'app applique ce profil au clavier natif et affiche un état "clavier synchronisé".
- Given l'appareil a déjà été utilisé par le même compte et possède une file locale pending, when la connexion revient, then l'app relit la révision cloud courante, flush la file seulement si `baseCloudRevision` correspond encore, et bascule en conflit récupérable si le cloud a changé entre-temps.
- Given l'appareil local contient un profil différent et le compte cloud contient déjà un profil, when l'utilisateur se connecte, then WinGlows bloque l'écrasement silencieux et propose `Garder ce téléphone`, `Utiliser le cloud`, ou `Exporter avant remplacement`.
- Given l'utilisatrice sauvegarde un thème ou une config de coins depuis l'UI, when la sauvegarde native réussit, then un snapshot clavier versionné est exporté, validé, mis en file locale puis synchronisé sous `users/{uid}/keyboardConfigs/default`.
- Given Firestore est temporairement indisponible, when une modification clavier est sauvegardée, then le clavier natif reste modifié, la file locale marque l'opération `pending`, et l'UI indique que la sync retentera.
- Given l'utilisatrice réinstalle l'app et se reconnecte avec le même compte, when le bridge d'entitlement confirme `winglowz_app`, then l'app restaure les réglages éligibles sans demander de recréer le clavier.
- Given l'utilisatrice exporte son profil clavier, when l'export est créé, then elle obtient un fichier versionné contenant le manifeste et les JSON clavier éligibles, sans tokens, secrets, image bytes, historique de saisie ni clipboard.
- Given l'utilisatrice importe un profil, when le fichier est valide et compatible, then l'app montre un résumé des changements, valide le profil côté Flutter et côté Android, puis applique tout ou rien.
- Given une image de fond clavier existe localement, when le profil est synchronisé ou exporté, then le JSON n'envoie pas l'image ni le chemin privé; l'autre appareil retombe sur un fond sûr avec un avertissement discret.
- Given une config de coins contient des shortcuts marqués `sensitive`, when la sync V1 est exécutée, then ces shortcuts restent local-only par défaut ou sont remplacés par des entrées redigées selon la politique d'export choisie; ils ne sont pas envoyés silencieusement au cloud.
- Given l'utilisateur se déconnecte, when une autre personne se connecte au même téléphone, then la file de sync de l'ancien compte est isolée ou purgée et aucun profil clavier ancien n'est envoyé vers le nouveau compte.

# Error Behavior

- Si Firebase n'est pas configuré, l'app reste en local mode et indique que la sync compte est indisponible.
- Si la session Firebase existe mais que la suite identity bridge est manquante, inaccessible ou renvoie un payload invalide, l'app reste fail-closed: pas de Firestore-backed sync.
- Si l'entitlement `winglowz_app` est absent, révoqué ou expiré, le compte peut être reconnu mais aucune donnée clavier cloud n'est lue ou écrite.
- Si Firestore rules refusent une lecture/écriture, l'app affiche une erreur récupérable redigée et conserve la version locale.
- Si le profil cloud est invalide, trop volumineux, inconnu ou d'une version incompatible, il est mis en quarantaine locale et n'est pas appliqué au clavier natif.
- Si l'import manuel est corrompu, d'un mauvais type, trop gros, ou échoue à la validation native, aucun changement n'est appliqué.
- Si une application de snapshot échoue au milieu du bridge natif, le contrôleur restaure le snapshot précédent ou marque l'état comme `restore_needed`; il ne doit pas laisser une config partielle sans message.
- Si deux appareils modifient le même profil hors ligne, la V1 utilise une révision de profil et bloque les conflits ambigus; elle n'utilise pas un last-write-wins silencieux pour les configs clavier complètes.
- Ce qui ne doit jamais arriver: token Firebase, JWT, clé API, contenu clipboard, texte dicté, image de fond, chemin privé complet, raw exception provider, ou profil d'un autre compte dans logs, diagnostics, Sentry, export non confirmé ou Firestore client-readable hors scope utilisateur.

# Problem

WinGlows a déjà une base d'auth et de données distante, mais les personnalisations les plus chères à recréer vivent aujourd'hui dans l'IME natif Android. `KeyboardStateStore` stocke beaucoup de travail utilisateur en SharedPreferences: thèmes, coins, préférences, status bar, action row, langues, comportement clipboard, voice runtime, recents et règles locales. Ces données peuvent disparaître lors d'une réinstallation ou rester coincées sur un appareil.

Le risque produit est immédiat: plus le clavier devient puissant, plus une perte de configuration donne l'impression que WinGlows n'est pas fiable. Le risque sécurité est aussi réel: un clavier peut contenir des raccourcis texte, snippets, actions clipboard, préférences de confidentialité et traces locales. La sync doit donc sauver le travail sans transformer Firestore en dépotoir de données sensibles.

SocialGlowz fournit un bon modèle comportemental: hydrater après auth, distinguer cloud vide et cloud existant, ne pas rejouer une file locale dans le mauvais compte, montrer un feedback post-auth, et fournir export/import. WinGlows doit reprendre ces patterns, pas copier la stack Convex/Tauri.

# Solution

Créer un `KeyboardSyncController` Flutter qui orchestre la sync après auth active et entitlement confirmé. Le contrôleur exporte un snapshot clavier depuis le bridge Android, le normalise avec un modèle Dart versionné, compare ce snapshot au profil Firestore du compte, puis applique une décision de seed, restore, conflit ou retry.

La source d'autorité runtime reste le clavier natif local. Firestore devient une sauvegarde/sync compte pour un profil éligible, jamais une condition pour ouvrir le clavier. La V1 synchronise les paramètres non secrets et les configs JSON bornées; elle exclut les images locales, les recents, les queues transitoires, les diagnostics, les raw clipboard entries, les chemins privés et les shortcuts marqués sensibles sauf opt-in ultérieur dédié.

Le design reprend quatre briques SocialGlowz adaptées à Flutter:

- une file durable de mutations clavier avec déduplication par clé de profil;
- une hydratation post-auth avec feedback visible;
- une politique cloud-vide/local-vide/même-compte/changement-compte;
- un export/import manuel versionné pour récupérer le travail même hors cloud.

# Scope In

- Ajouter un modèle `KeyboardSyncProfile` versionné pour représenter un profil clavier syncable.
- Exporter depuis Android un snapshot clavier atomique couvrant les préférences éligibles, `KeyboardThemeConfig`, `AndroidKeyboardCornerConfig`, `KeyboardStatusBarConfig`, et les metadata sûres.
- Appliquer vers Android un snapshot validé avec comportement tout-ou-rien ou rollback explicite.
- Ajouter un store Firestore backend-agnostique pour `users/{uid}/keyboardConfigs/default`.
- Ajouter une file locale durable `KeyboardSyncQueue` inspirée de SocialGlowz: déduplication, retry, état pending/failed, purge sur changement de compte.
- Ajouter un contrôleur post-auth: `waitingCloud`, `dataReceived`, `decisionNeeded`, `applying`, `ready`, `failed`.
- Ajouter une UI compacte dans Settings/Account ou Keyboard: statut de sync clavier, dernière sync, conflit, retry, export et import.
- Ajouter une décision de premier seed: cloud vide + local modifié -> sauvegarder le profil local dans le compte.
- Ajouter une décision de conflit: garder local, appliquer cloud, exporter local avant remplacement.
- Ajouter export/import manuel de profil clavier versionné.
- Mettre à jour Firestore rules pour limiter les chemins et valider la forme des documents clavier.
- Ajouter tests unitaires/widget pour modèles, sanitization, décisions, queue, controller, import/export et UI conflit.
- Mettre à jour docs techniques Android/Flutter et code-docs-map.

# Scope Out

- Pas de migration directe de l'app WinGlows vers Clerk Flutter/native.
- Pas de stockage cloud des clés OpenAI/Anthropic, tokens OAuth, JWT, provider payloads ou secrets locaux.
- Pas de synchronisation des images de fond clavier en V1.
- Pas de synchronisation des recents emoji/symboles, historique clipboard natif, événements vocaux, diagnostics, crash reports ou queues drainables natives.
- Pas de marketplace de thèmes, profils publics ou partage communautaire.
- Pas de collaboration multi-utilisateur.
- Pas de remplacement de la stratégie local-first par Firestore comme source unique.
- Pas de suppression ou reset cloud destructif en V1; toute action de purge distante demande une spec dédiée avec garde-fous d'audit et de récupération.
- Pas de chiffrement client général pour toutes les données produit dans ce chantier; les champs sensibles sont exclus ou local-only en V1.
- Pas de sync user-owned cloud Dropbox/Drive/WebDAV dans cette tranche; elle reste couverte par la stratégie local-first plus large.
- Pas de builds Android/Gradle locaux sur cette VM; la validation native va par Blacksmith/GitHub Actions et QA appareil.

# Constraints

- La sync cloud requiert: Firebase configuré, session non locale, suite identity bridge valide, entitlement `winglowz_app` actif.
- L'app ne fait jamais confiance à un `uid`, `globalUserId`, entitlement ou owner id fourni par le client.
- Firestore paths restent sous `users/{uid}` et protégés par `suiteAccess/{uid}` comme le reste des stores produit.
- Le profil clavier cloud ne contient pas de texte saisi, contenu clipboard, dictation, raw audio, secret, image bytes, chemin privé complet ou diagnostic brut.
- Les configs JSON sont bornées par les limites natives existantes: corner config 24 KB, theme config 48 KB, profil complet sous une limite de sécurité plus basse que la limite Firestore.
- Le profil syncable porte `schemaVersion`, `profileRevision`, `baseCloudRevision`, `updatedAt`, `updatedByDeviceId`, `sourcePlatform`, `sanitizationPolicy`, et `checksum`.
- Les writes sont idempotents: rejouer deux fois la même révision ne doit pas créer de doublon ni régresser l'état.
- Toute écriture cloud issue d'une file locale doit utiliser une transaction ou précondition équivalente: si la révision cloud observée ne correspond plus à `baseCloudRevision`, l'opération devient un conflit utilisateur au lieu d'écraser le document.
- Le changement de compte purge ou isole la file locale avant toute nouvelle écriture distante.
- Une erreur de sync n'empêche jamais le clavier local de fonctionner.
- Les données sensibles local-only restent récupérables par export manuel confirmé, mais ne sont pas envoyées au cloud par défaut.

# Dependencies

## Local Dependencies

- `lib/features/auth/application/auth_session_provider.dart`: session Firebase vs local fallback.
- `lib/features/auth/application/suite_identity_provider.dart`: entitlement `winglowz_app` et état fail-closed.
- `lib/features/auth/data/suite_identity_bridge_client.dart`: résolution Firebase ID token vers suite snapshot.
- `lib/features/settings/application/settings_store_provider.dart`: pattern de sélection remote uniquement avec entitlement actif.
- `lib/core/sync/sync_status.dart`: état de sync existant à étendre ou réutiliser.
- `lib/core/platform/android_keyboard_bridge.dart`: bridge Flutter vers IME natif.
- `lib/features/keyboard/domain/keyboard_models.dart`: configs Dart thème, coins, status bar et préférences.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`: source native des préférences IME.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`: handlers MethodChannel.
- `firestore.rules`: règles d'accès user-scoped + entitlement.
- `docs/technical/android-native.md`: contrat natif clavier.
- `shipglows_data/technical/winglowz_app/code-docs-map.md`: docs impact et validations.

## SocialGlowz Reference Patterns

- `/home/claude/socialglowz/src/lib/cloudSync.ts`: hydrate, cloud snapshot validation, local seed if cloud empty, clear local cloud state on user change.
- `/home/claude/socialglowz/src/lib/cloudSyncQueue.ts`: queue durable, retry, flush on online/focus/visibility/interval, operation-key dedupe.
- `/home/claude/socialglowz/src/lib/cloudSyncDecisions.ts`: small pure functions for reuse-local and cloud-empty decisions.
- `/home/claude/socialglowz/src/lib/postAuthSyncFeedback.ts`: blocking post-auth stages.
- `/home/claude/socialglowz/src-tauri/src/backup.rs`: versioned encrypted backup container reference.

## Fresh External Docs Checked

- Firebase Firestore offline data, checked 2026-05-25: https://firebase.google.com/docs/firestore/manage-data/enable-offline. Verdict `fresh-docs checked`: Android persistence is enabled by default, local writes sync when online, and same-document conflicts are last-write-wins, so WinGlows must add its own revision/conflict gate for full keyboard profiles.
- Firebase Firestore Security Rules conditions, checked 2026-05-25: https://firebase.google.com/docs/firestore/security/rules-conditions. Verdict `fresh-docs checked`: rules can use `request.auth`, validate `request.resource`, and use `get()` / `exists()` for access mirror documents, with access-call limits.
- Firebase Firestore rules/query interaction, checked 2026-05-25: https://firebase.google.com/docs/firestore/security/rules-query. Verdict `fresh-docs checked`: rules are not filters, so any query added for keyboard profiles must match the rules constraints rather than relying on rules to filter unsafe results.
- Firebase Auth ID token verification, checked 2026-05-25: https://firebase.google.com/docs/auth/admin/verify-id-tokens. Verdict `fresh-docs checked`: the suite bridge must keep receiving ID tokens over HTTPS and verifying them server-side; revocation checks must stay explicit.

# Invariants

- Local keyboard state remains usable without cloud.
- Suite auth recognition is not enough; product entitlement gates remote sync.
- Native Android remains the authority for IME runtime preferences.
- Flutter owns sync orchestration, validation, queueing, conflict UI and Firestore adapter selection.
- A cloud profile is a recovery copy, not an active IME runtime dependency.
- Same account can restore; different account cannot silently overwrite or receive old local queues.
- Export/import applies the same validation and sanitization rules as cloud sync.
- Firestore rules and Flutter validators must both reject unsafe payloads; client validation is not the security boundary.
- Sensitive shortcuts and local image paths stay local-only in V1 unless a future explicit opt-in spec changes the contract.
- Cloud restore, queue flush and manual import are mutually exclusive state transitions: if one is applying, the others must wait or surface a recoverable busy/conflict state.

# Links & Consequences

- `KeyboardStateStore.kt`: needs export/import snapshot methods; avoid leaking private paths or diagnostics.
- `MainActivity.kt`: needs MethodChannel handlers for `exportKeyboardSyncProfile`, `applyKeyboardSyncProfile`, maybe `validateKeyboardSyncProfile`.
- `AndroidKeyboardBridge`: needs typed Dart methods and platform fallbacks.
- `keyboard_models.dart`: may be split to avoid further growth; sync profile models can live in `keyboard_sync_models.dart`.
- `settings_screen.dart` / sections: account sync status should be visible but not buried.
- `firestore.rules`: current rules do not include `keyboardConfigs`; adding a path requires validation and CI/deploy proof.
- `FirebaseSettingsStore`: should not become the dump for all keyboard data; keep keyboard profile separate from generic app settings.
- `suite_identity_provider`: status changes must trigger sync controller reset or hydration.
- `docs/technical/android-native.md`: update MethodChannel and profile sync constraints.
- `README.md` / setup docs: only update if user-facing account sync behavior or QA requirements change.

# Documentation Coherence

- Update `docs/technical/android-native.md` with the export/import snapshot contract, excluded fields, and rollback behavior.
- Update `docs/technical/flutter-app.md` or create it if missing enough coverage for account sync controllers and stores.
- Update `shipglows_data/technical/winglowz_app/code-docs-map.md` to map keyboard sync files and tests.
- Update `docs/VERIFICATION.md` or `shipglows_data/workflow/TEST_LOG.md` with manual QA for first sign-in seed, reinstall restore, conflict, offline retry, export/import, and account switch.
- Update README only after behavior exists, with conservative claims: account-backed keyboard sync, local-first fallback, and V1 exclusions.
- No public pricing/marketing copy change in this chantier unless the feature is promoted externally.

# Edge Cases

- Cloud profile exists but belongs to a disabled/revoked entitlement mirror.
- User signs in, bridge succeeds, then entitlement is revoked before sync flush.
- Local profile was created while offline and cloud changed on another device.
- Local profile contains a sensitive shortcut label or literal text.
- Theme JSON references a missing local image path.
- Corner config references a key id no longer available after a layout migration.
- Native SharedPreferences contain corrupt JSON but the keyboard currently falls back safely.
- Firestore returns cached data while offline; UI must mark stale/offline and avoid claiming "current".
- App process dies after native save but before queue write.
- Queue contains operation for old Firebase uid after logout/login.
- Two devices generate the same revision counter.
- User imports a profile while a cloud conflict is visible.
- User chooses `Use cloud` and then immediately regrets replacing the local profile.
- The profile doc approaches Firestore or app-defined size limits.
- Profile restore happens while the IME is open in another app.
- Web/Vercel Flutter preview cannot access native IME; it must simulate without fake native success.

# Implementation Tasks

- [ ] Tâche 1 : Définir le modèle de profil clavier syncable
  - Fichier : `lib/features/keyboard/domain/keyboard_sync_models.dart`
  - Action : créer `KeyboardSyncProfile`, `KeyboardSyncMetadata`, `KeyboardSyncSanitizationPolicy`, parse/serialize/validate/checksum, `profileRevision`, `baseCloudRevision`, et enum de verdict validation.
  - User story link : rendre le travail clavier exportable et restaurable sous contrat versionné.
  - Depends on : aucune.
  - Validate with : `flutter test test/keyboard_sync_models_test.dart`.
  - Notes : garder le modèle séparé de `keyboard_models.dart` si ce fichier devient trop dense.

- [ ] Tâche 2 : Classifier les champs IME syncables
  - Fichier : `lib/features/keyboard/domain/keyboard_sync_policy.dart`
  - Action : définir allowlist V1: préférences non secrètes, thème sans image bytes/path privé, coins non sensibles, status bar sans label compte calculé, voice language/pack id sans model path, exclusions explicites.
  - User story link : sauver le clavier sans fuite de données sensibles.
  - Depends on : Tâche 1.
  - Validate with : tests de sanitization incluant image path, sensitive shortcuts, recents, clipboard, diagnostics et voice artifact path.
  - Notes : la politique doit être lisible dans les tests, pas enfouie dans des `if` dispersés.

- [ ] Tâche 3 : Exporter un snapshot depuis le bridge Android
  - Fichiers : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`
  - Action : ajouter une méthode native qui lit les préférences éligibles, thème, coins et status bar, puis renvoie un map versionné sanitized à Flutter.
  - User story link : capturer le clavier actuel avant cloud seed ou export.
  - Depends on : Tâche 2.
  - Validate with : tests Kotlin ciblés quand possible; sinon Blacksmith native compile + Flutter MethodChannel tests.
  - Notes : ne pas inclure `KEY_CLIPBOARD_ENTRIES`, recents, diagnostics, full private image path ou voice model artifact path.

- [ ] Tâche 4 : Appliquer un snapshot validé vers Android
  - Fichiers : `KeyboardStateStore.kt`, `MainActivity.kt`, `lib/core/platform/android_keyboard_bridge.dart`
  - Action : ajouter validation pré-application, sauvegarde du snapshot précédent, apply tout-ou-rien, rollback ou état récupérable en cas d'échec.
  - User story link : restaurer le clavier sans config partielle.
  - Depends on : Tâches 1 à 3.
  - Validate with : tests MethodChannel mock + QA Android device pour restore pendant clavier actif.
  - Notes : les méthodes existantes `setKeyboardThemeConfig` et `setCornerConfig` peuvent être réutilisées mais l'orchestration doit rester atomique.

- [ ] Tâche 5 : Créer le store Firestore clavier
  - Fichiers : `lib/features/keyboard/data/firebase_keyboard_config_store.dart`, `lib/features/keyboard/domain/keyboard_sync_store.dart`
  - Action : lire/écrire `users/{uid}/keyboardConfigs/default`, gérer `profileRevision`, `baseCloudRevision`, `updatedAt`, `updatedByDeviceId`, `lastSyncedAt`, erreurs redigées, et écrire via transaction/précondition quand une révision de base est fournie.
  - User story link : rendre le profil clavier récupérable par compte.
  - Depends on : Tâche 1.
  - Validate with : fake store tests + Firestore emulator/CI rules proof si disponible.
  - Notes : le store ne doit être sélectionné que derrière session Firebase + suite entitlement.

- [ ] Tâche 6 : Durcir Firestore rules pour `keyboardConfigs`
  - Fichiers : `firestore.rules`, `firestore.indexes.json` si une query l'exige
  - Action : ajouter un match limité à `users/{uid}/keyboardConfigs/{configId}`, refuser tout sauf `default` V1, valider clés, versions, tailles, booléens, strings bornées, maps autorisées, et accès via `hasWinGlowzAppAccess(uid)`.
  - User story link : empêcher qu'un client malveillant écrive un payload clavier dangereux ou cross-user.
  - Depends on : Tâche 5.
  - Validate with : rules tests/CI Firebase; `flutter test` pour validators miroir.
  - Notes : les rules ne peuvent pas tout valider finement; les champs complexes doivent être bornés et allowlistés.

- [ ] Tâche 7 : Créer la file locale durable de sync clavier
  - Fichiers : `lib/features/keyboard/data/local_keyboard_sync_queue_store.dart`, `lib/features/keyboard/application/keyboard_sync_queue.dart`
  - Action : queue persistée, déduplication par `keyboardProfile:default`, stockage `targetFirebaseUid`, `targetGlobalUserId`, `baseCloudRevision`, attempts, retry delay, flush on auth/online/resume après vérification de révision, purge sur user change.
  - User story link : ne pas perdre une sauvegarde clavier faite offline ou pendant une panne Firestore.
  - Depends on : Tâche 5.
  - Validate with : `flutter test test/keyboard_sync_queue_test.dart`.
  - Notes : prendre le modèle SocialGlowz, mais utiliser des abstractions Flutter testables au lieu de `localStorage`.

- [ ] Tâche 8 : Orchestrer l'hydratation post-auth
  - Fichier : `lib/features/keyboard/application/keyboard_sync_controller.dart`
  - Action : écouter `authSessionProvider` et `suiteIdentityProvider`, exporter local, fetch cloud, décider seed/restore/conflict/retry, drainer la file seulement sous révision compatible, exposer état UI.
  - User story link : restaurer après connexion sans état demi-synchronisé.
  - Depends on : Tâches 3, 5 et 7.
  - Validate with : tests de décision same-user, new-user, cloud-empty, cloud-existing, pending-queue avec cloud inchangé, pending-queue avec cloud modifié, bridge unavailable.
  - Notes : ne pas appliquer cloud pendant que l'entitlement est inconnu ou indisponible.

- [ ] Tâche 9 : Ajouter l'UI de statut et conflit
  - Fichiers : `lib/features/settings/presentation/settings_screen.dart`, `lib/features/settings/presentation/settings_screen_sections.dart`, ou nouveau `lib/features/keyboard/presentation/keyboard_sync_panel.dart`
  - Action : afficher statut clavier sync, dernier upload, retry, conflit avec choix `Garder ce téléphone`, `Utiliser le cloud`, `Exporter avant remplacement`, export/import manuel.
  - User story link : l'utilisatrice comprend où est son travail et peut éviter l'écrasement.
  - Depends on : Tâche 8.
  - Validate with : widget tests pour états ready/pending/failed/conflict/import/export.
  - Notes : texte utilisateur en français naturel; détails techniques redigés seulement dans diagnostic copiable.

- [ ] Tâche 10 : Ajouter export/import manuel de profil clavier
  - Fichiers : `lib/features/keyboard/application/keyboard_profile_backup_service.dart`, `lib/features/keyboard/presentation/keyboard_sync_panel.dart`
  - Action : exporter un JSON versionné ou un conteneur backup si un package crypto professionnel est choisi; importer avec preview diff et validation avant apply.
  - User story link : fournir une sortie de secours même si le compte/cloud n'est pas prêt.
  - Depends on : Tâches 1 à 4.
  - Validate with : tests invalid file, wrong version, sensitive policy, valid round-trip.
  - Notes : si chiffrement password est ajouté, utiliser une librairie maintenue; ne pas écrire de crypto maison.

- [ ] Tâche 11 : Intégrer les signaux de sync aux écrans clavier
  - Fichiers : `keyboard_theme_studio_screen.dart`, `keyboard_corner_shortcuts_screen.dart`, `settings_screen_sections.dart`
  - Action : après sauvegarde native, notifier le contrôleur de sync; afficher pending/synced dans les surfaces de personnalisation sans bloquer l'édition locale.
  - User story link : chaque modification clavier importante part en sauvegarde compte.
  - Depends on : Tâches 7 à 9.
  - Validate with : widget tests save -> queue pending -> synced.
  - Notes : éviter de coupler directement les écrans à Firestore.

- [ ] Tâche 12 : Couvrir le changement de compte et logout
  - Fichiers : `auth_session_provider.dart`, `keyboard_sync_controller.dart`, tests auth/sync
  - Action : détecter uid/globalUserId précédent, purger ou isoler la file, suspendre flush, retirer état sync cloud local au logout, conserver clavier local sans l'envoyer au prochain compte.
  - User story link : éviter le mélange de travail entre comptes.
  - Depends on : Tâche 8.
  - Validate with : tests logout/login A->B, pending queue A, bridge unavailable, local mode.
  - Notes : s'inspirer de `CLOUD_SYNC_USER_ID_KEY` SocialGlowz mais sans copier son stockage brut.

- [ ] Tâche 13 : Ajouter tests de non-régression sécurité
  - Fichiers : `test/keyboard_sync_security_test.dart`, `test/app_router_auth_guard_test.dart` si impact auth
  - Action : vérifier absence de secrets/clipboard/image paths dans exports, diagnostics et payloads Firestore; vérifier entitlement requis.
  - User story link : sync utile sans fuite.
  - Depends on : Tâches 1 à 12.
  - Validate with : `flutter test test/keyboard_sync_security_test.dart`.
  - Notes : tests orientés abuse cases, pas seulement happy path.

- [ ] Tâche 14 : Mettre à jour docs et preuve QA
  - Fichiers : `docs/technical/android-native.md`, `docs/technical/flutter-app.md`, `shipglows_data/technical/winglowz_app/code-docs-map.md`, `docs/VERIFICATION.md` ou `shipglows_data/workflow/TEST_LOG.md`
  - Action : documenter contrat, limites V1, exclusions, validation locale, Blacksmith/device QA.
  - User story link : un agent frais et Diane peuvent valider la récupération sans relire l'historique.
  - Depends on : Tâches implémentées.
  - Validate with : metadata lint si governance docs changent; `flutter analyze`; `flutter test`.
  - Notes : ne pas promettre sync cloud des images ou sensitive shortcuts tant que V1 les exclut.

# Acceptance Criteria

- [ ] CA 1 : Given un profil clavier local existe et le profil cloud est vide, when l'utilisatrice se connecte avec un entitlement actif, then les champs localement éligibles sont assainis et sauvegardés sous le compte, avec un résumé visible des champs exclus local-only.
- [ ] CA 2 : Given un profil cloud valide existe et l'appareil est nouveau, when l'utilisatrice se connecte, then le profil est appliqué au clavier natif et l'UI indique `synced`.
- [ ] CA 3 : Given local et cloud divergent sans preuve de même compte récent, when l'hydratation se lance, then l'app montre un conflit et n'écrase rien.
- [ ] CA 4 : Given une modification clavier est sauvegardée offline, when le réseau revient et que `baseCloudRevision` correspond encore, then la file locale flush la dernière révision vers Firestore; si la révision cloud a changé, then l'app affiche un conflit et n'écrase rien.
- [ ] CA 5 : Given l'utilisateur change de compte, when une ancienne file pending existe, then elle n'est pas envoyée vers le nouveau compte.
- [ ] CA 6 : Given un shortcut marqué sensitive existe, when un payload cloud est généré en politique V1, then le shortcut est exclu ou redigé et signalé comme local-only.
- [ ] CA 7 : Given un thème utilise une image locale, when le profil est uploadé, then le payload n'inclut ni image bytes ni chemin privé complet.
- [ ] CA 8 : Given Firestore rules reçoivent un write `keyboardConfigs/default` par un utilisateur sans `suiteAccess`, when le write est évalué, then il est refusé.
- [ ] CA 9 : Given Firestore rules reçoivent un payload avec clés inconnues, taille excessive ou version invalide, when le write est évalué, then il est refusé.
- [ ] CA 10 : Given un export manuel est créé, when son contenu est inspecté, then il contient un manifeste versionné et aucun token, secret, clipboard raw, dictation raw ou image bytes.
- [ ] CA 11 : Given un import manuel invalide est sélectionné, when l'utilisateur confirme, then l'app refuse avant toute application native.
- [ ] CA 12 : Given l'app web/Vercel preview ouvre la surface sync clavier, when la plateforme n'a pas d'IME Android, then elle montre une simulation/indisponibilité et pas un faux succès natif.
- [ ] CA 13 : Given `flutter analyze` et `flutter test` sont lancés après implémentation, then ils passent.
- [ ] CA 14 : Given Blacksmith/GitHub Actions produit un APK debug, when Diane teste sur appareil, then sign-in, seed, restore, conflict, retry, export et import sont vérifiés sans Android build local.
- [ ] CA 15 : Given une action de reset cloud destructif est demandée ou simulée en V1, when le contrôleur ou l'UI l'évalue, then aucune suppression distante n'est proposée ni exécutée.

# Test Strategy

- Unit tests Dart:
  - profile schema parse/serialize/checksum;
  - sanitization sensitive/image/recents/diagnostics;
  - sync decision functions;
  - queue dedupe/retry/purge;
  - base revision conflict handling;
  - Firestore store fake;
  - import/export validation.
- Widget tests:
  - sync status panel;
  - post-auth stages;
  - conflict decisions;
  - save in Theme Studio/Corner Editor triggers pending sync;
  - unsupported platform messaging.
- MethodChannel tests:
  - export snapshot happy path;
  - apply snapshot error rollback path;
  - unsupported platform returns safe local status.
- Firestore rules proof:
  - authorized `suiteAccess` user can read/write `keyboardConfigs/default`;
  - unauthenticated, no entitlement, cross-user, bad schema and oversized payload fail.
- Required local checks after implementation:
  - `flutter analyze`
  - `flutter test`
  - targeted tests for keyboard sync models, queue, controller, UI and security.
- Required non-local proof:
  - Blacksmith/GitHub Actions Android compile/package path;
  - Diane physical-device QA for actual IME application, restore while keyboard is active, and Android account switch behavior.

# Risks

- Auth/security risk: treating Firebase sign-in as access without suite entitlement would bypass product access. Mitigation: reuse `suiteIdentityProvider` gate and Firestore `suiteAccess` rules.
- Data loss risk: applying cloud over local silently. Mitigation: conflict state and export-before-replace path.
- Privacy risk: keyboard config can contain shortcuts that behave like user content. Mitigation: V1 sensitive/local-only policy and tests.
- Consistency risk: Firestore offline last-write-wins can overwrite a whole profile. Mitigation: app-level revision/conflict checks before full profile apply.
- Native reliability risk: applying multiple SharedPreferences sections can partially succeed. Mitigation: validate first, snapshot previous, rollback/restore-needed status.
- Scope risk: broader data sync could absorb all product stores. Mitigation: V1 is keyboard profile recovery; existing domain stores remain separate.
- UX risk: blocking post-auth sync too long. Mitigation: use visible stages and allow keyboard local use unless an explicit conflict decision is required.

# Execution Notes

- Read first:
  - `lib/features/auth/application/suite_identity_provider.dart`
  - `lib/features/settings/application/settings_store_provider.dart`
  - `lib/core/platform/android_keyboard_bridge.dart`
  - `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`
  - `/home/claude/socialglowz/src/lib/cloudSync.ts`
  - `/home/claude/socialglowz/src/lib/cloudSyncQueue.ts`
- Implementation order:
  1. Pure Dart models, policy and decision tests.
  2. Native export/apply bridge with conservative payload.
  3. Firestore store and rules.
  4. Queue/controller.
  5. UI status/conflict/export/import.
  6. Docs and QA proof.
- Execution strategy:
  - Run this chantier sequentially through `/sf-start`; do not split it into parallel agents or `Execution Batches`.
  - The executor should continue task-by-task through the ordered list without asking Diane to relaunch each task, unless a stop condition below is hit.
  - Small internal handoffs are allowed only as sequential implementation/verification steps with the same spec as source of truth.
- Package guidance:
  - Reuse Firebase/FlutterFire already in the app.
  - Do not add crypto unless export encryption is explicitly implemented with a maintained library.
  - Do not add direct Clerk Flutter/native auth.
  - Do not add a new backend provider in this tranche.
- Stop conditions:
  - suite identity/entitlement state cannot be proven;
  - Firestore rules cannot validate the new path safely;
  - native apply cannot be made atomic or recoverable;
  - sensitive shortcuts cannot be excluded/rediged reliably;
  - user-facing conflict path is missing.
- Fresh-docs verdict: `fresh-docs checked` for Firebase Auth token verification, Firestore offline behavior, and Firestore rules behavior. The docs support using Firestore for account-backed Android recovery, but require app-level conflict logic and rules that match query/write shapes.

# Open Questions

None blocking for this V1 spec. The conservative V1 decision is:

- account-backed sync uses existing Firebase Auth + suite bridge + Firestore entitlement gate;
- sensitive shortcuts, images, recents, diagnostics and clipboard contents are excluded from cloud sync;
- cloud/local conflict requires user choice instead of silent overwrite.

Deferred decisions for later specs:

- whether to add end-to-end client encryption for syncable keyboard profiles;
- whether to sync user-owned cloud backups through Drive/Dropbox/WebDAV;
- whether to sync background images through a storage provider;
- whether a paid tier can enable sensitive shortcut sync after explicit encryption and opt-in.

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-25 15:14:26 UTC | sf-spec | GPT-5 Codex | Created full spec for account-backed keyboard sync and recovery from user request, local WinGlows auth/sync code, existing specs, SocialGlowz reference patterns, and current Firebase docs. | Draft spec saved. | `/sf-ready shipglows_data/workflow/specs/account-backed-keyboard-sync-and-recovery.md` |
| 2026-05-25 15:37:56 UTC | sf-ready | GPT-5 Codex | Ran readiness, adversarial, security, documentation, language, and freshness gates; resolved blocking ambiguity around first seed, queue revision checks, destructive cloud reset scope, and sequential execution. | Ready. | `/sf-start Account-Backed Keyboard Sync and Recovery` |
| 2026-05-25 19:30:13 UTC | sf-start | GPT-5.5 coordination + sequential Codex workers | Implemented V1 keyboard sync models, safe policy, native Android export/apply bridge, Firestore store/rules, durable queue, controller conflict decisions, Settings sync panel, export/import fallback, save notifications, docs, and targeted/full Flutter verification. | Implemented locally; Android build/device proof still required through CI/device QA. | `/sf-verify Account-Backed Keyboard Sync and Recovery` |
| 2026-05-25 19:51:50 UTC | sf-verify | GPT-5.5 | Verified spec contract, code coherence, Firestore/Auth docs freshness, rules/data safety, queue/conflict paths, bug gate, docs, language, and local validation. Fixed a destructive delete gap in `keyboardConfigs` rules during verification. | Partial: local proof passed; Android native compile/package, Firestore deploy, Flutter Web smoke, and physical-device IME restore/apply proof still missing. | `/sf-ship Account-Backed Keyboard Sync and Recovery` |
| 2026-05-25 19:55:49 UTC | sf-ship | GPT-5.5 | Quick ship requested after partial verification; committed and pushed the scoped account-backed keyboard sync and recovery changes without TASKS/CHANGELOG closeout. | Shipped for iteration in commit `eac8bfd`; hosted/CI/device verification still required. | `/sf-prod winglowz_app` |

# Current Chantier Flow

- sf-spec: done, draft created at `shipglows_data/workflow/specs/account-backed-keyboard-sync-and-recovery.md`.
- sf-ready: ready; gate challenged security, conflict, Firestore rules, native rollback assumptions, cloud reset scope, and queue replay behavior.
- sf-start: implemented locally; `flutter analyze`, full `flutter test`, metadata lint, and `git diff --check` passed.
- sf-verify: partial; local code/rules/tests/docs verified, and destructive `keyboardConfigs` delete was closed during verification.
- sf-end: not launched.
- sf-ship: shipped quick in commit `eac8bfd`; no TASKS/CHANGELOG closeout.

Next command: `/sf-prod winglowz_app`
