---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-09"
created_at: "2026-05-09 15:19:23 UTC"
updated: "2026-06-09"
updated_at: "2026-06-09 21:05:11 UTC"
status: active
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "design-system-settings"
owner: "Diane"
confidence: medium
user_story: "En tant qu'utilisateur WinGlows, je veux que mes préférences d'apparence et les réglages visuels restent cohérents sur mes appareils, afin de travailler dans une interface lisible, stable et alignée avec la famille Flowz."
risk_level: "medium"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Flutter app"
  - "Riverpod"
  - "SettingsScreen"
  - "AppTheme"
  - "Backend-agnostic SettingsStore"
  - "Firebase first adapter"
  - "ContentFlow Site design playground"
depends_on:
  - artifact: "shipglows_data/business/business.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/business/branding.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/guidelines.md"
    artifact_version: "0.1.0"
    required_status: "reviewed"
  - artifact: "docs/technical/flutter-app.md"
    artifact_version: "0.1.0"
    required_status: "draft"
  - artifact: "docs/DECISIONS.md"
    artifact_version: "0.1.0"
    required_status: "reviewed"
supersedes: []
evidence:
  - "2026-05-09 design audit adopted ContentFlow family colors, spacing, radii, motion names and component defaults in lib/core/theme/app_theme.dart."
  - "2026-05-09 design audit added a transient Settings Appearance selector in lib/features/settings/presentation/settings_screen.dart."
  - "2026-05-14 component audit scored C overall; it requires an active chantier attached to this design-system spec, not closure."
  - "2026-05-14 Firebase settings gate verified: appThemeModeProvider hydrates from SettingsStore, persists locally, and syncs account settings through FirebaseSettingsStore at users/{uid}/settings/profile."
  - "2026-05-14 theme persistence was hardened to preserve existing onboarding/sync fields when writing themeMode; covered by test/app_theme_mode_controller_test.dart."
  - "User decision 2026-05-09: settings and backend data must be backend-agnostic; Firebase is the first adapter."
  - "User decision 2026-05-09: Supabase is no longer the target backend."
next_step: "Manual visual review and docs cleanup before final closure"
---

# Title

Settings-Driven Design System Completion

# Status

Implementation active. The Settings architecture decision is implemented for Appearance: preferences go through a backend-agnostic `SettingsStore`, with local persistence as fallback and Firebase as the first remote adapter. The Firebase settings gate is no longer blocking this chantier; remaining closure work is visual validation, docs cleanup, and any explicitly deferred design playground work.

# User Story

En tant qu'utilisateur WinGlows, je veux que mes préférences d'apparence et les réglages visuels restent cohérents sur mes appareils, afin de travailler dans une interface lisible, stable et alignée avec la famille Flowz.

Acteur principal: utilisateur WinGlows connecté ou en mode local.

Acteurs secondaires: builder WinGlows, futur backend/settings provider, surfaces Android IME/overlay.

Déclencheurs:

- L'utilisateur choisit `System`, `Light` ou `Dark` dans Settings.
- L'application redémarre.
- L'utilisateur se connecte, se déconnecte ou change d'appareil.
- La session auth bascule entre local fallback et compte Firebase.
- Les écrans WinGlows migrent vers les tokens partagés.

Résultat observable attendu: le mode d'apparence choisi s'applique sans flash incohérent, persiste localement, se synchronise par compte si un settings backend est disponible, et tous les écrans utilisent le même système de tokens plutôt que des valeurs visuelles dispersées.

# Minimal Behavior Contract

WinGlows expose un contrat de settings d'apparence qui accepte uniquement `system`, `light` et `dark`, normalise toute valeur inconnue vers `system`, applique le mode avant ou au plus tôt dans le bootstrap Flutter, persiste le choix localement, et synchronise le choix vers les settings utilisateur authentifiés via un `SettingsStore` backend-agnostique. Si le store local, le backend ou la session auth est indisponible, l'app continue en `system` ou avec la dernière valeur locale valide, affiche un état récupérable dans Settings, et ne bloque jamais l'utilisation du produit. L'edge case facile à rater est le changement de compte: la préférence visuelle locale ne doit pas exposer ni écraser silencieusement les settings serveur d'un autre utilisateur.

# Success Behavior

- Given aucun choix utilisateur n'existe, when l'app démarre, then le mode `system` est utilisé et suit l'OS.
- Given l'utilisateur choisit `Dark`, when il quitte puis rouvre l'app, then l'app démarre en dark sans revenir à `system`.
- Given l'utilisateur est connecté et le settings backend est disponible, when il change Appearance, then la valeur locale est appliquée immédiatement et une mutation settings compte est effectuée.
- Given l'utilisateur se connecte sur un deuxième appareil, when les settings compte sont chargés, then le mode distant valide devient la préférence appliquée selon la règle de résolution décidée.
- Given le backend settings est indisponible, when l'utilisateur modifie Appearance, then le choix local reste appliqué et un état pending/error visible ou journalisable existe selon le contrat Settings choisi.
- Given une valeur inconnue arrive du stockage local, d'une migration ou du backend, when elle est lue, then elle est normalisée vers `system` sans crash.
- Given un écran utilise cards, buttons, fields, navigation or status surfaces, when il est rendu en light/dark, then il reprend les tokens `AppTheme` et ne réintroduit pas de couleurs/espacements arbitraires.

# Error Behavior

- Si le store local échoue, utiliser `system`, afficher un message non bloquant dans Settings si l'utilisateur interagit avec Appearance, et ne pas perdre les autres settings.
- Si la sync distante échoue, conserver la valeur locale, marquer l'état comme non synchronisé ou réessayer selon le contrat Settings final.
- Si le logout arrive pendant une sync, annuler ou isoler la mutation de l'ancien compte; ne jamais appliquer les settings d'un compte à un autre.
- Si le backend renvoie une valeur invalide, ignorer la valeur, revenir à `system`, et ne pas propager l'invalide.
- Si un écran ne supporte pas encore les tokens, la migration doit être incrémentale; ne pas bloquer le thème global sur un écran secondaire.
- Si Firebase est l'adaptateur courant, toute mutation settings doit passer par l'utilisateur authentifié et Firestore Security Rules, jamais par un `user_id` client de confiance.

# Problem

Le design audit du 2026-05-09 a ajouté une première base visuelle partagée avec ContentFlow: palette Flowz, spacing 4px, radii, motion names, Material component defaults et sélecteur Appearance. Le choix Appearance n'est plus seulement en mémoire: il est hydraté depuis le store local au bootstrap, écrit dans `SettingsStore`, et synchronisé via Firebase quand la session distante est disponible. La base visuelle reste incomplète: plusieurs écrans viennent d'être migrés vers des composants/tokens partagés, mais la validation visuelle finale et la documentation de fermeture restent à faire.

# Solution

Transformer l'Appearance selector en préférence produit complète: module Settings centralisé, persistence locale, sync authentifiée via `SettingsStore`, résolution des conflits local/distant, tests, et migration progressive des écrans vers les tokens `AppTheme`. La base ContentFlow reste la référence familiale, mais WinGlows conserve son identité produit orientée dictée, contrôle et état système.

# Scope In

- Définir le contrat Settings pour `themeMode`: enum, normalisation, valeur par défaut, résolution local/distant.
- Persister localement Appearance selon la décision Settings.
- Synchroniser `themeMode` dans les settings utilisateur authentifiés si le backend retenu le supporte.
- Ajouter ou adapter un repository/store Settings, idéalement backend-agnostic si la décision va dans ce sens.
- Intégrer le chargement Settings au bootstrap Flutter sans flash visuel excessif.
- Migrer les écrans principaux vers `AppTheme`, `AppSpacing`, `AppRadii` et composants Material thémés.
- Ajouter un écran ou mode de playground Flutter pour inspecter les tokens light/dark.
- Ajouter tests unitaires/widget pour normalisation, persistence, sync failure, changement de compte et selector UI.
- Mettre à jour docs techniques et API settings.

# Scope Out

- Coupler les écrans directement à Firebase ou Supabase.
- Migrer tout le backend dans cette spec.
- Ajouter billing, entitlements, quotas ou segmentation premium.
- Refaire entièrement l'UI WinGlows.
- Créer un design system multi-produit versionné publiquement.
- Implémenter des thèmes personnalisés utilisateur, palettes marketplace ou thème par organisation.
- Changer les flows Android IME/overlay hors impact visuel/settings.

# Constraints

- La sync distante doit rester derrière `SettingsStore` et ne pas coupler les widgets directement à Firebase.
- `themeMode` accepte seulement `system`, `light`, `dark`.
- La valeur par défaut est `system`.
- Les valeurs inconnues doivent revenir à `system`.
- Le choix utilisateur ne doit pas bloquer auth, dictée, clipboard, clavier ou overlay.
- Les settings compte sont user-scoped; aucune mutation ne doit contourner les règles de sécurité du backend actif.
- Les clés OpenAI/Anthropic restent dans secure local storage et ne doivent pas être mélangées avec les préférences syncables.
- Les tokens ContentFlow sont une base familiale, pas une copie aveugle: WinGlows peut garder des ajustements de contraste, état audio et surfaces utilitaires.
- Les changements visuels doivent rester testables sans appareil Android réel, sauf statut IME/overlay qui demande QA manuelle.

# Dependencies

- Décision prise et implémentée pour Appearance: architecture Settings backend-agnostique.
  - Contrat actif: `SettingsStore` avec `LocalSettingsStore` et `FirebaseSettingsStore` comme premier adaptateur remote.
  - Firestore path: `users/{uid}/settings/profile`.
  - Firestore rules: `themeMode` allowlist `system`, `light`, `dark`; settings user-scoped.
  - Secrets/preferences restent séparés: BYOK reste en secure local storage.
- Code existant:
  - `lib/core/theme/app_theme.dart`
  - `lib/app/winglowz_app.dart`
  - `lib/features/settings/presentation/settings_screen.dart`
  - `lib/features/settings/data/secure_secret_store.dart`
  - `lib/data/**`
- Docs existantes:
  - `docs/technical/flutter-app.md`
  - `docs/DECISIONS.md`
  - `shipglows_data/business/branding.md`
  - `shipglows_data/technical/guidelines.md`
- External docs verdict: recheck official Flutter/Riverpod/Firebase docs when choosing persistence/sync APIs, rules or indexes.

# Invariants

- Settings visuels ne sont pas des secrets.
- API keys restent locales et sécurisées; elles ne vont jamais dans `user_settings`.
- Les préférences syncables sont séparées des états runtime et des diagnostics.
- Le thème global est une décision d'app, pas une branche couleur dispersée dans les widgets métier.
- La UI ne promet pas de sync cross-device tant que le backend Settings n'est pas réellement branché.
- Les surfaces Android-only restent conditionnées par `PlatformCapabilities`.
- Le design system doit servir la promesse produit: états clairs pour dictée, traitement, résultat, erreur, permission et sync.

# Links & Consequences

- `lib/app/winglowz_app.dart`: le provider Appearance est hydraté depuis `SettingsStore`, applique la valeur immédiatement, et préserve les champs settings existants lors d'une sauvegarde thème.
- `lib/core/theme/app_theme.dart`: reste la source de tokens; ajouter éventuellement extensions de thème au lieu de valeurs dispersées.
- `lib/features/settings/presentation/settings_screen.dart`: Appearance doit afficher état local/sync si pertinent.
- `lib/features/settings/data/**`: peut recevoir un `SettingsStore` ou `UserPreferencesStore`.
- `lib/data/**`: peut recevoir un adaptateur Firebase settings.
- `firebase.json`, `firestore.rules`, `firestore.indexes.json`: à créer ou mettre à jour si Firebase porte cette préférence.
- `docs/technical/flutter-app.md`: documenter le flux Settings -> Theme.
- `shipglows_data/workflow/TASKS.md`: les tâches d'audit design ouvertes pourront être fermées après implémentation.

# Documentation Coherence

À mettre à jour pendant l'implémentation:

- `docs/technical/flutter-app.md`: architecture Settings, bootstrap theme et règles UI.
- docs backend/Firebase à créer: contrat Settings, rules, indexes et limites.
- `docs/VERIFICATION.md`: ajouter scénarios Appearance persistence/sync.
- `shipglows_data/business/branding.md`: mentionner que la famille Flowz partage une base visuelle si ce choix devient contractuel.
- `CHANGELOG.md`: noter l'amélioration design system/settings au ship.

# Edge Cases

- Premier lancement sans settings local ni distant.
- Valeur locale invalide après downgrade/migration.
- Valeur distante invalide ou absente.
- Offline au moment du changement de préférence.
- Auth change pendant une mutation settings.
- Logout puis login avec autre compte sur le même appareil.
- Firebase non configuré.
- Android IME/overlay lit des préférences pendant que Flutter app n'est pas ouverte.
- Mode dark avec champs, cards et banners de permission à contraste insuffisant.
- Tests web/desktop où secure storage peut être dégradé.

# Implementation Tasks

- [x] Tâche 1 : Formaliser la décision Settings
  - Fichiers : `docs/DECISIONS.md`, cette spec
  - Action : choisir `SettingsStore` backend-agnostic avec Firebase premier adaptateur; séparer secrets locaux et préférences syncables.
  - User story link : évite d'implémenter un thème persistant sur une fondation Settings instable.
  - Depends on : décision utilisateur.
  - Validate with : décision confirmée le 2026-05-09.

- [x] Tâche 2 : Créer le modèle de préférence Appearance
  - Fichiers : `lib/core/theme/app_theme.dart`, possiblement `lib/features/settings/domain/user_preferences.dart`
  - Action : centraliser enum, parsing et fallback `system` via `AppThemeMode` et `ThemeMode.name`.
  - User story link : garantit des valeurs stables entre UI, local store et backend.
  - Depends on : Tâche 1.
  - Validate with : `test/widget_test.dart` couvre le mapping `ThemeMode`; stores local/Firebase normalisent les valeurs inconnues vers `system`.

- [x] Tâche 3 : Implémenter le store local Settings
  - Fichiers : `lib/features/settings/data/local_settings_store.dart`
  - Action : lire/écrire `themeMode` localement, sans toucher aux secrets BYOK.
  - User story link : conserve le choix après redémarrage.
  - Depends on : Tâches 1-2.
  - Validate with : bootstrap local dans `lib/main.dart` et test fake store dans `test/app_theme_mode_controller_test.dart`.

- [x] Tâche 4 : Hydrater le thème au bootstrap
  - Fichiers : `lib/app/winglowz_app.dart`, `lib/main.dart` si nécessaire
  - Action : remplacer le provider in-memory par un controller hydraté, appliquer `ThemeMode` depuis le store et gérer fallback sans bloquer le produit.
  - User story link : évite que Settings soit purement temporaire.
  - Depends on : Tâche 3.
  - Validate with : `test/app_theme_mode_controller_test.dart`.

- [x] Tâche 5 : Ajouter la sync compte si retenue
  - Fichiers : `lib/features/settings/data/firebase_settings_store.dart`, `lib/features/settings/application/settings_store_provider.dart`, `firestore.rules`
  - Action : ajouter `themeMode` côté settings compte via `SettingsStore`, Firestore Security Rules/allowlist, upsert user-scoped et lecture initiale.
  - User story link : rend la préférence cohérente cross-device.
  - Depends on : Tâche 1.
  - Validate with : `test/app_theme_mode_controller_test.dart`, `flutter analyze`, `flutter test`; Firestore rules contain the allowlist gate.

- [x] Tâche 6 : Rendre Settings honnête sur état local/sync
  - Fichier : `lib/features/settings/presentation/settings_screen.dart`
  - Action : afficher le selector, la valeur appliquée et le diagnostic backend/settings store actif.
  - User story link : l'utilisateur comprend si sa préférence suit ou non son compte.
  - Depends on : Tâches 3-5.
  - Validate with : Settings UI reads `appThemeModeProvider` and backend diagnostics expose `settingsStoreProvider.runtimeType`.

- [x] Tâche 7 : Migrer les écrans principaux vers tokens
  - Fichiers : `lib/features/voice/presentation/voice_screen.dart`, `lib/features/clipboard/presentation/clipboard_screen.dart`, `lib/features/snippets/presentation/snippets_screen.dart`, `lib/features/dictionary/presentation/dictionary_screen.dart`, `lib/features/settings/presentation/settings_screen.dart`, `lib/features/shell/presentation/app_shell_screen.dart`
  - Action : remplacer espacements/styles locaux récurrents par tokens ou composants thémés, sans refonte fonctionnelle.
  - User story link : stabilise la cohérence visuelle Flowz.
  - Depends on : thème source existant.
  - Validate with : `flutter analyze`, targeted widget/auth tests, `flutter test`, and screen-level migration across Voice, Clipboard, Keyboard, Snippets, Dictionary, Settings, Shell, and Auth surfaces.

- [ ] Tâche 8 : Ajouter un playground design Flutter
  - Fichiers : à créer sous `lib/features/settings/` ou route debug dédiée selon décision produit
  - Action : montrer palette, typographie Material, spacing, cards, buttons, text fields, banners et états light/dark.
  - User story link : accélère les décisions visuelles sans ouvrir chaque écran.
  - Depends on : tokens stables.
  - Validate with : widget test route/render.

- [ ] Tâche 9 : Mettre à jour docs et vérification
  - Fichiers : `docs/technical/flutter-app.md`, `docs/VERIFICATION.md`, docs Firebase/backend à créer, `CHANGELOG.md`
  - Action : documenter contrat, store, sync, commandes de vérification et limites.
  - User story link : empêche le drift entre UI, docs et settings réels.
  - Depends on : implémentation.
  - Validate with : revue docs + `flutter analyze`/`flutter test`.

# Acceptance Criteria

- Le mode Appearance a une valeur par défaut `system`.
- Les seules valeurs acceptées sont `system`, `light`, `dark`.
- Une valeur inconnue locale ou distante ne plante pas et revient à `system`.
- Le choix Appearance survit au redémarrage.
- Si la sync compte est retenue, le choix se synchronise avec les settings utilisateur et respecte Firestore Security Rules ou le contrat provider équivalent.
- Le logout/account switch ne mélange pas les préférences de deux utilisateurs.
- Settings indique honnêtement si l'app est en mode local fallback ou connectée à un store settings distant.
- Les écrans principaux n'introduisent plus de nouvelles couleurs/espacements arbitraires pour les patterns communs.
- Le design playground rend light et dark sans dépendance réseau.
- `flutter analyze` passe.
- `flutter test` passe, avec tests dédiés aux préférences thème.

# Test Plan

- Unit tests:
  - parsing `AppThemeMode` depuis string.
  - fallback invalid -> `system`.
  - serialization stable.
  - conflict resolution local/distant selon décision Settings.
- Widget tests:
  - `WinGlows` applique le mode choisi.
  - Settings selector change le controller.
  - Settings affiche le diagnostic local/remote du store actif.
- Adapter tests:
  - local store read/write.
  - Firebase or fake backend store rejects invalid values.
  - account switch isolation.
- Firebase rules/emulator tests:
  - `themeMode` allowlist.
  - user A ne lit/modifie pas settings user B.
  - upsert own settings works.
- Manual QA:
  - first launch.
  - restart after mode change.
  - login/logout.
  - light/dark pass on Voice, Clipboard, Snippets, Dictionary, Settings.
  - Android Settings card still readable in dark mode.

# Stop Conditions

- Une régression contourne `SettingsStore` pour écrire directement Firebase depuis les widgets.
- Le contrat mélange secrets locaux et préférences syncables.
- Une solution nécessite de stocker des clés BYOK dans `user_settings`.
- Les settings compte ne peuvent pas être isolés par user.
- La sync distante force un couplage direct hors `SettingsStore`.
- `flutter analyze` ou `flutter test` échoue.

# Rollback Plan

- Garder `AppTheme.light`, `AppTheme.dark` et `ThemeMode.system` comme fallback.
- Si la persistence locale casse, revenir temporairement à `ThemeMode.system` et garder le selector non bloquant.
- Si la sync distante casse, désactiver uniquement l'adapter sync et conserver local-only.
- Si la migration Firebase pose problème, désactiver l'adaptateur remote avant release tant que l'UI fonctionne localement.

# Open Questions

- Faut-il ajouter un état Settings explicite `pending/error`, au-delà du diagnostic backend actuel?
- Quelle règle gagne au premier login sur un appareil qui a déjà une préférence locale différente du compte?
- Les préférences Android IME/overlay doivent-elles utiliser le même store Settings que Appearance?
- Le design playground doit-il être une route debug cachée, une section Settings visible, ou un outil dev-only?
- Doit-on versionner formellement les tokens Flowz partagés entre ContentFlow et WinGlows?

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-09 15:19:23 UTC | sf-spec | GPT-5 Codex | Created draft spec for post-settings-decision design system completion | Draft spec created; later unblocked by backend-agnostic SettingsStore decision | Continue implementation and verification |
| 2026-05-11 19:08:22 UTC | sf-ship | GPT-5.5 | Centralized theme variables using legacy site theme references across AppTheme, keyboard preview, settings slider, and shell breakpoints; copied legacy theme-reference assets | shipped | `/sf-end shipglows_data/workflow/specs/settings-driven-design-system.md` |
| 2026-05-14 22:27:20 UTC | sf-design-from-scratch | GPT-5 Codex | Reworked the Flutter visual layer toward the legacy site style: monochrome action palette, charcoal/off-white surfaces, stronger card depth, themed shell background, auth card, and card-based form panels on representative screens | passed local validation | Continue visual audit/playground before final closure |
| 2026-05-14 22:37:00 UTC | sf-audit-components | GPT-5 Codex | Audited Flutter component architecture after legacy site design pass | C overall; top-heavy screens, repeated CRUD panels, oversized Settings/Keyboard widgets | Extract shared UI primitives before final design-system closure |
| 2026-05-14 22:47:39 UTC | component-refactor | GPT-5 Codex | Added shared Flutter UI primitives, migrated representative CRUD pages, grouped keyboard preview control props, and moved initial Settings sections to shared cards | passed local validation | Continue extracting Settings keyboard/overlay/secrets sections |
| 2026-05-14 22:49:32 UTC | chantier-classification | GPT-5 Codex | Corrected the component audit classification after operator challenge | component audit `C` is an active chantier attached to this spec; no separate parallel chantier opened | Keep `sf-end` blocked until remaining component work raises the baseline |
| 2026-05-14 22:57:24 UTC | continue | GPT-5 Codex | Continued the active component chantier by splitting Settings rendering into dedicated section widgets and adding `AppStatusCard` | `flutter analyze` and `flutter test` passed | Continue accessibility/focus contracts and orchestration extraction |
| 2026-05-14 23:18:36 UTC | component-a11y | GPT-5 Codex | Added focus traversal, semantic labels, keyboard activation, and tests for keyboard corner targets; added semantic values for overlay sliders | `flutter analyze`, targeted keyboard corner tests, and full `flutter test` passed | Continue data orchestration extraction and visual/manual review |
| 2026-05-14 23:29:47 UTC | continue | GPT-5 Codex | Extracted Settings keyboard/overlay native bridge orchestration into application controllers and added merge-logic test coverage | `flutter analyze`, targeted controller test, and full `flutter test` passed | Run visual/manual review and component re-audit before closure |
| 2026-05-14 23:34:40 UTC | component-re-audit | GPT-5 Codex | Split Settings sections and keyboard preview widgets into part files, reran component checks, and rescored component baseline | component score raised from C to B; `flutter analyze`, targeted tests, full `flutter test`, and `git diff --check` passed | Continue visual/design validation; component-system blocker cleared |
| 2026-05-14 23:53:47 UTC | firebase-settings-gate | GPT-5 Codex | Verified the existing Firebase settings adapter and hardened theme persistence so changing Appearance preserves other local/remote settings fields | targeted theme controller test passed; Firebase settings gate unblocked | Run final analyze/test/diff checks, then visual/design validation before closure |
| 2026-05-14 23:56:38 UTC | verification | GPT-5 Codex | Reran static analysis, targeted settings/component tests, full Flutter test suite, and diff whitespace checks after Firebase gate hardening | `flutter analyze`, targeted tests, `flutter test`, and `git diff --check` passed | Continue visual/design validation before final closure |
| 2026-05-15 00:11:49 UTC | final-screen-migration | GPT-5 Codex | Migrated shell, keyboard corner editor, auth screens, onboarding status tile, and keyboard preview header onto shared app components and tokens | `flutter analyze`, targeted tests, full `flutter test`, and `git diff --check` passed | Manual visual review and docs cleanup before final closure |
| 2026-05-15 07:16:46 UTC | sf-audit-design | GPT-5 Codex | Re-audited the full Flutter UI after the screen/token migration and tracker cleanup | `B-` overall design score; no critical findings; `flutter analyze` clean; remaining work is sync-state honesty, language unification, target sizing, token discipline, reduced-motion handling, and design-playground/manual proof | Keep the chantier open until the remaining design follow-ups are fixed or explicitly deferred |
| 2026-05-15 08:57:21 UTC | sf-design | GPT-5 Codex | Closed the requested B- follow-ups in Settings/theme surfaces: honest appearance sync messaging, target-size baseline uplift, reduced-motion theme animation guard, and copy consistency cleanup | `dart format`, `flutter analyze`, and `flutter test test/widget_test.dart` passed; onboarding tile remains French pending full i18n migration decision | Collect visual/manual proof and finalize closure docs before `sf-end` |

# Current Chantier Flow

| Step | Status | Evidence | Next step |
|------|--------|----------|-----------|
| sf-spec | done | This spec records the SettingsStore decision and Firebase adapter implementation state | Keep spec current through final closure |
| sf-ready | unblocked | Firebase settings path, rules, local fallback, and theme persistence are implemented; theme save preservation has targeted test coverage | Continue final validation |
| sf-start | done | Theme tokens, shared CRUD primitives, Settings sections, keyboard preview extraction, shell/auth migration, keyboard corner editor migration, Firebase theme persistence hardening, and B- follow-up fixes (sync-state honesty, target sizing, reduced motion, copy cleanup) are implemented across the primary screens | Keep only manual proof/doc cleanup open |
| sf-verify | partial | Local validation passed after the B- follow-up implementation with `dart format`, `flutter analyze`, and `flutter test test/widget_test.dart` | Add visual/manual review for the design layer |
| sf-end | partial | Code migration is complete and validated locally; remaining closure work is manual visual proof and docs/closure review | Complete or explicitly defer manual visual review before final closure |
| sf-ship | partial | Previous theme-token work was shipped; current component-refactor work is validated locally but not shipped | Ship only after the active chantier follow-ups are accepted or explicitly deferred |
