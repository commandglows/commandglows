---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-30"
created_at: "2026-05-30 07:06:27 UTC"
updated: "2026-05-30"
updated_at: "2026-05-30 17:09:14 UTC"
status: ready
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "flutter-app-home-feed-global-actions-search-sync-status"
owner: "Diane"
confidence: high
user_story: "En tant qu'utilisatrice WinGlows, je veux une page d'accueil avec mes dernières entrées, une recherche globale, un composant partagé de recherche, et un composant séparé de rafraîchissement/synchronisation/sauvegarde, afin de retrouver mes contenus et savoir clairement si mes changements sont bien enregistrés."
risk_level: "medium"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "winglowz_app"
  - "Flutter AppShellScreen"
  - "GoRouter"
  - "Voice transcriptions"
  - "Clipboard history"
  - "Snippets"
  - "Dictionary"
  - "Shared AppComponents"
  - "Shared sync/save status indicator"
  - "Settings save flow"
  - "Cloud sync overview"
  - "Widget tests"
depends_on:
  - artifact: "shipglows_data/business/winglowz_app/product.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/business/winglowz_app/branding.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/winglowz_app/context.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/workflow/specs/winglowz-app-ui-coherence-localization-cleanup.md"
    artifact_version: "1.0.0"
    required_status: "ready"
supersedes: []
evidence:
  - "User request 2026-05-30: centralize search and refresh controls so the same buttons appear on all pages."
  - "User request 2026-05-30: add a home page with a mixed feed of latest voice, clipboard, snippets, dictionary, and recently used entries."
  - "User request 2026-05-30: provide global search on the first page and page-scoped search once inside Voice, Clipboard, Snippets, or Dictionary."
  - "User request 2026-05-30: shared refresh component must also show loading, saved/synced, and error states for settings saves and app changes; clicking it relaunches sync/refresh."
  - "User clarification 2026-05-30: shared search component and shared sync/save component must be clearly separate components, not one monolithic component."
  - "Current shell routes instantiate AppShellScreen with tab indices in lib/core/router/app_router.dart."
  - "Current AppShellScreen owns tab navigation and pages in lib/features/shell/presentation/app_shell_screen.dart."
  - "Current Clipboard screen already has a local search field in lib/features/clipboard/presentation/clipboard_screen.dart."
  - "Current AppFormActions defines a default refresh label in lib/core/widgets/app_components.dart."
  - "Current SyncStatus and CloudSyncOverview already model localOnly, pending, syncing, synced, failed, conflict and unavailable states."
next_step: "None"
---

# Title

WinGlows App Home Feed, Global Search, and Shared Page Actions

## Status

Implementation complete, shipped, deployed and smoke-verified after `sf-start`. Created from Diane's 2026-05-30 product direction, updated the same day to expand the shared refresh control into a save/sync/status action component, passed readiness review once, then returned to draft on 2026-05-30 to clarify that search and sync/save are separate shared components. Readiness was rerun on 2026-05-30. Implementation includes shared search/status/toolbar components, Accueil feed provider/screen, `/home` routing, shell tab insertion, page-scoped searches across Voice/Clipboard/Snippets/Dictionary, Settings save/sync status feedback, focused tests, local validation, Vercel production deployment, and Flutter web smoke proof on `https://app.winglowz.com`.

## User Story

En tant qu'utilisatrice WinGlows, je veux une page d'accueil avec mes dernières entrées, une recherche globale, un composant partagé de recherche, et un composant séparé de rafraîchissement/synchronisation/sauvegarde, afin de retrouver mes contenus et savoir clairement si mes changements sont bien enregistrés.

## Minimal Behavior Contract

Quand l'utilisatrice ouvre WinGlows après connexion ou mode local, l'app affiche une page d'accueil qui agrège les dernières transcriptions vocales, éléments de presse-papiers, snippets et termes du dictionnaire à partir des stores existants. La recherche globale est portée par un composant partagé dédié à la saisie, au clear et aux états de recherche. Le rafraîchissement, la synchronisation, la sauvegarde et leurs états sont portés par un deuxième composant partagé séparé, dédié aux actions récupérables et au feedback de statut. Un conteneur de toolbar peut composer ces deux composants sur une même ligne, mais ils doivent rester indépendants, testables et réutilisables séparément. Depuis l'accueil, l'utilisatrice peut filtrer par texte ou type, ouvrir l'entrée dans sa page source, copier ou réutiliser les entrées compatibles sans modifier les règles de confidentialité existantes. Sur chaque page métier, la recherche reste limitée au type de contenu de la page; le composant sync/save expose l'état courant utile: chargement, modification en attente, sauvegardé/synchronisé, local uniquement, conflit ou erreur. Au clic, il relance l'action récupérable la plus pertinente pour la page ou le contexte Settings. Si un store, une sauvegarde ou une sync échoue, la page affiche un état partiel récupérable et ne duplique pas, ne supprime pas, ni n'expose de contenu sensible hors des politiques existantes. L'edge case facile à rater est le champ sensible ou l'historique clipboard: la recherche globale et la relance sync ne doivent pas contourner les règles de filtrage, confirmation et private mode déjà appliquées par les stores et importers.

## Success Behavior

- Après auth ou mode local, `AuthGateScreen` affiche `AppShellScreen` sur un nouvel onglet Accueil par défaut.
- La navigation principale contient Accueil, Voix, Presse-papiers, Snippets, Dictionnaire, Réglages sur rail et bottom navigation, avec indices et routes cohérents.
- L'accueil affiche un feed chronologique plafonné, composé des dernières entrées disponibles dans les stores Voice, Clipboard, Snippets et Dictionary.
- Chaque entrée du feed indique son type, un titre lisible, un extrait, une date locale courte, son statut utile si disponible, et une action pour ouvrir la page source.
- La recherche globale filtre le feed sur texte, source/type, trigger snippet, remplacement dictionnaire, transcription nettoyée/brute admissible et contenu clipboard admissible.
- La recherche page-scoped réutilise le composant partagé de recherche mais filtre uniquement la page courante.
- Le rafraîchissement/sauvegarde/synchronisation utilise un composant d'état/action distinct du champ de recherche: il utilise une icône, un tooltip, un état busy, un état sauvegardé/synchronisé, un état pending/local-only, et un état erreur cohérents partout.
- Quand un setting est modifié, le composant peut passer par `saving/syncing`, puis afficher une confirmation courte `sauvegardé` ou `synchronisé`, ou un état erreur récupérable.
- Au clic, le composant sync/save relance le reload/sync/save-check approprié à la page courante ou au contexte Settings.
- Les pages sans recherche utile peuvent afficher uniquement le composant sync/save; les pages sans sync utile peuvent afficher uniquement le composant de recherche.
- Les états vides expliquent si aucune donnée existe ou si la recherche ne renvoie rien.
- Les tests widget prouvent la navigation vers Accueil, la recherche globale, la recherche scoped, les états saved/syncing/error/local-only du composant, le refresh disabled/busy, et le fallback partiel.

## Error Behavior

- Si un store du feed échoue, le feed charge les autres sources et affiche une bannière partielle nommant la source indisponible, sans bloquer toute la page.
- Si tous les stores échouent, l'accueil affiche une erreur récupérable avec bouton rafraîchir.
- Si un refresh global est déjà en cours, le bouton reste désactivé et aucun refresh concurrent n'est lancé.
- Si une sauvegarde de setting échoue, le composant affiche une erreur récupérable et le détail user-safe reste dans la zone de message existante ou un panneau associé; aucun état "sauvegardé" ne doit être affiché.
- Si une sync cloud est indisponible mais que l'écriture locale réussit, le composant affiche un état `local uniquement` ou `en attente de sync`, pas un succès cloud trompeur.
- Si une relance sync/refresh échoue après clic, le composant revient vers l'état d'erreur récupérable sans perdre la dernière donnée locale chargée.
- Si une entrée n'existe plus au moment de l'ouverture de sa page source, l'app ouvre la page source avec son état courant et affiche un message récupérable plutôt qu'un écran cassé.
- Si la recherche est vide, l'accueil retourne au feed récent; si elle ne correspond à rien, un état "aucun résultat" propose d'effacer la recherche.
- Aucun contenu supprimé, sensible rejeté, secret, diagnostic brut ou clé locale ne doit apparaître dans le feed ou la recherche.
- Les imports clavier Voice/Clipboard restent déclenchés par les hooks existants et ne doivent pas produire de doublons quand l'accueil rafraîchit.

## Problem

WinGlows a plusieurs pages métier qui exposent chacune des listes, parfois une recherche, et souvent un bouton de rafraîchissement. Ces contrôles ne forment pas encore un contrat partagé: le placement, le libellé, les états et la portée varient selon la page. L'utilisateur doit aussi savoir d'avance si une information est dans Voix, Presse-papiers, Snippets ou Dictionnaire, alors que le besoin réel est souvent "retrouver le dernier texte utile". Enfin, les changements de settings et de synchronisation produisent aujourd'hui des messages dispersés plutôt qu'un feedback central, immédiat et actionnable. Cette fragmentation ralentit les workflows cœur du produit: capturer, retrouver, copier, configurer, sauvegarder et réutiliser.

## Solution

Ajouter une page Accueil dans le shell Flutter, alimentée par un provider de feed local qui compose les stores existants sans nouvelle persistance. Créer deux composants partagés séparés: un composant de recherche pour la saisie/clear/scope, et un composant de statut/action pour refresh, sauvegarde, synchronisation et erreurs récupérables. Ajouter seulement si utile un conteneur de toolbar qui compose ces deux composants sans fusionner leurs responsabilités, puis migrer les pages métier et les settings vers ce contrat avec une portée claire par contexte.

## Scope In

- Nouvel onglet Accueil dans `AppShellScreen`.
- Nouvelle route protégée `/home` ou équivalent local cohérent avec les routes existantes.
- Default post-auth vers Accueil via `AuthGateScreen` / `AppShellScreen`.
- Provider/application service pour composer le feed depuis:
  - `TranscriptionStore.list()`
  - `ClipboardHistoryApi.listItems()`
  - `SnippetStore.list()`
  - `DictionaryStore.list()`
- Agrégation strictement limitée aux providers/stores déjà scoppés par la session active ou le mode local courant; aucune lecture cross-account, cross-device non autorisée, ni contournement de règles backend.
- Modèle de feed en lecture seule avec type, id source, titre, extrait, date, statut et action cible.
- Composant partagé de recherche: valeur/query, placeholder, clear search, disabled state, scope label, semantics et callbacks de changement.
- Composant partagé de synchronisation/sauvegarde: refresh/sync/save retry, busy/disabled, saved/synced, pending/local-only, error, conflict, tooltip, semantics et callbacks d'action.
- Conteneur optionnel de toolbar: compose le composant recherche et le composant sync/save sur une même ligne sans posséder leur logique métier.
- Modèle de statut partagé pour afficher les états `idle`, `loading`, `saving`, `syncing`, `saved`, `synced`, `pending`, `localOnly`, `error`, `conflict` ou équivalent.
- Migration des écrans Voice, Clipboard, Snippets et Dictionary vers la barre d'actions partagée quand ils ont une liste.
- Intégration du composant dans Settings pour les sauvegardes de préférences, les changements de thème, les clés locales si elles restent dans le scope UI, et les sync/refresh récupérables.
- Recherche globale sur Accueil.
- Recherche scoped sur Voice, Clipboard, Snippets et Dictionary.
- Widget tests ciblés pour navigation, feed, search, refresh, erreurs partielles et empty states.
- Documentation de cohérence UX si une doc composants ou map technique doit être alignée.

## Scope Out

- Nouvelle base de données, index distant, moteur de recherche externe ou migration de schéma.
- Feed temps réel multi-device ou push live.
- Classement intelligent par fréquence d'usage au-delà d'un tri simple par date.
- Historique "récemment utilisé" persistant si l'entrée n'a pas déjà un timestamp exploitable.
- Modification des règles de sync cloud, de queue durable, de conflit cloud ou des Firebase/Supabase adapters.
- Garantie de synchronisation cloud immédiate quand le backend est local-only, indisponible ou non configuré.
- Recherche dans secrets locaux, diagnostics, logs backend, clés OpenAI/Anthropic ou contenus rejetés comme sensibles.
- Refonte complète des écrans Voice, Clipboard, Snippets, Dictionary ou Settings.
- Validation APK locale, Gradle, build Android ou installation device depuis cette VM.

## Constraints

- Respecter les guardrails locaux: `flutter analyze`, `flutter test`, tests ciblés; pas de build Android, Gradle, install ou `flutter run -d android`.
- Préserver le modèle local-first et backend-agnostic existant.
- Ne pas ajouter de dépendance search/indexing pour ce périmètre; la recherche est in-memory sur les listes déjà chargées.
- Préserver les labels français naturels et les décisions de vocabulaire existantes, notamment `snippet` comme terme produit.
- Le feed doit rester performant avec un volume raisonnable: limiter les entrées affichées et ne pas rebuild tout le shell à chaque frappe au-delà du nécessaire.
- Les actions d'une entrée feed ne doivent pas contourner les confirmations destructives, private mode, ou restrictions de contenu sensible.
- Le feed et la recherche globale doivent utiliser uniquement les providers déjà résolus pour l'utilisateur/session courante; aucune API ou cache partagé ne doit élargir le périmètre de lecture.
- Le composant de statut ne doit jamais afficher `synchronisé` si seule une sauvegarde locale a réussi.
- Le feedback de succès doit être bref et non intrusif; les erreurs doivent rester récupérables et visibles assez longtemps pour être comprises.
- Les routes existantes `/voice`, `/clipboard`, `/snippets`, `/dictionary`, `/settings` doivent rester valides.

## Test Contract

Surface/stack profile: Flutter app, Riverpod providers, GoRouter routes, Material navigation rail/bottom navigation, local and Firebase-backed stores.

Automated proof required:
- `flutter analyze`
- Targeted widget tests for `AppShellScreen`, home feed, shared page action bar, and migrated page searches.
- Targeted widget tests for the shared search component, shared sync/save status component, and optional toolbar composition.
- Targeted widget tests for the shared sync/save status control, including saving/loading/synced/local-only/error states and click-to-retry behavior.
- Existing relevant widget tests in `test/widget_test.dart` must be updated for the new tab order and labels.

Manual/non-automated proof required:
- Flutter web smoke on the deployed or local web surface when implementation is ready: authenticated/local session opens Accueil, global search filters mixed data, page-scoped search remains scoped, refresh does not duplicate entries.
- Android physical-device QA is not required for the pure Flutter shell/feed unless a later implementation changes native IME/overlay behavior. If refresh behavior touches keyboard import timing, Diane's device QA should verify that keyboard Voice/Clipboard imports still appear once.

Proof order:
1. Unit/provider tests for feed aggregation and filtering.
2. Widget tests for shared search component, shared sync/save component, optional toolbar composition, and shell navigation.
3. Widget tests for page-scoped search and Settings save/sync feedback.
4. `flutter analyze`.
5. `flutter test`.
6. Flutter web smoke.
7. Android device QA only if native import timing changes.

Manual checklist path if needed: `shipglows_data/workflow/test-checklists/app-home-feed-global-actions-search.md`.

## Dependencies

- Local `go_router` version: `^16.2.5` in `winglowz_app/pubspec.yaml`.
- Official docs checked: pub.dev `go_router` package and API docs on 2026-05-30. Relevant confirmed contract: GoRouter uses declarative routes and supports ShellRoute/shared layout patterns; current local implementation already uses simple `GoRoute` entries and can add a `/home` route without new dependency or migration.
- Fresh docs verdict: `fresh-docs checked` for routing surface; implementation should still prefer the existing local `GoRoute` pattern unless a later shell refactor intentionally adopts `ShellRoute`.
- Product dependency: `shipglows_data/business/winglowz_app/product.md@1.0.0`, especially workflows "Dictée rapide" and "Clipboard + snippets + dictionnaire".
- Brand dependency: `shipglows_data/business/winglowz_app/branding.md@1.0.0`, especially "Direct, productif, sans jargon" and control/privacy values.
- Technical dependency: `shipglows_data/technical/winglowz_app/context.md@1.0.0`, especially Flutter/Android/Firebase/Supabase boundaries.
- Local code dependency: `lib/core/sync/sync_status.dart` and `lib/core/sync/cloud_sync_overview.dart` already define several sync health/category states that should inform the shared status vocabulary.
- Related spec: `winglowz-app-ui-coherence-localization-cleanup.md@1.0.0`; this spec should reuse its language/coherence direction without blocking on full completion.

## Invariants

- Auth guard remains unchanged: unauthenticated users see sign-in; signed-in or local fallback users can access app pages.
- Data scope remains unchanged: every feed source is read through the existing current-user/local-mode store provider, never through a new global cache, service-role client, shared Firestore collection scan, or unscoped repository.
- Existing feature routes remain addressable and protected.
- Store writes, deletes, updates, pinning and sensitive-content confirmation remain owned by existing feature screens/stores.
- The feed is read-only except for safe actions already supported elsewhere, such as copying admissible content or navigating to a source page.
- Settings saves remain owned by `SettingsStore` and platform controllers; the shared component observes/retries/report states but does not become the persistence layer.
- A successful local save and a successful cloud sync are distinct visible states.
- Clipboard sensitive rejection and private-field behavior remain enforced by existing importer/store logic.
- Local AI keys and diagnostics never appear in global search.
- Onboarding overlay and welcome guide remain visible and usable above the current shell.
- Navigation history/back behavior still works when moving between tabs.

## Links & Consequences

- `AppShellScreen` tab indices shift when Accueil is inserted. Router builders, tests, onboarding redirects, and any hardcoded index must be updated together.
- AppBar title changes from feature-only pages to include Accueil.
- `VoiceScreen`, `ClipboardScreen`, `SnippetsScreen`, and `DictionaryScreen` should expose or adopt search filtering in a consistent way.
- Existing tests that expect `AppShellScreen(initialIndex: 0)` to mean Voice must be updated because index 0 becomes Accueil.
- Feed aggregation touches all stores in read-only mode, so failing providers must be isolated to avoid cross-feature outage.
- Settings feedback touches existing `_saving`, `_message`, `SettingsStore.save`, keyboard preference saves and cloud overview states; implementation must avoid creating competing status messages that contradict each other.
- The shared search component and the shared sync/save component become cross-screen UX primitives; their contracts must stay separate so pages can use either one independently.
- Performance risk is bounded by list caps and in-memory filtering; do not introduce remote fan-out or background polling for this spec.
- Documentation impact is internal/app QA, not public marketing, unless the home page becomes part of public screenshots later.

## Documentation Coherence

- Update `shipglows_data/technical/code-docs-map.md` if it maps feature screens or shell routes and would become stale after adding Accueil.
- Update `docs/VERIFICATION.md` or the active app verification doc if it lists smoke paths or tab names.
- Add `shipglows_data/workflow/test-checklists/app-home-feed-global-actions-search.md` only if manual QA needs a durable checklist during `/sf-start` or `/sf-verify`.
- No marketing-site copy update is required for the initial internal app UX feature.

## Edge Cases

- Empty app: Accueil shows a useful empty state and direct shortcuts to Voix, Presse-papiers, Snippets and Dictionnaire.
- Partial app: one source has entries while others are empty; feed shows available entries and does not warn for normal empty sources.
- Partial failure: one store throws; feed shows available entries plus a compact warning.
- Duplicate-looking content: the feed may show separate entries from different source types; do not dedupe across sources in the MVP because source context matters.
- Edited transcription or clipboard item: feed should use the latest available `updatedAt` or equivalent for sort where available, with a documented fallback to `createdAt`.
- Snippet/dictionary records only expose `createdAt`; sorting uses that until a future spec adds usage/modified tracking.
- Search with accents/case: matching should be case-insensitive and trim whitespace; accent folding is optional only if implemented with standard Dart/local helpers and tested.
- Route deep link to a source page: source pages may not support selecting a specific item yet; opening the page source is sufficient for this spec.
- Onboarding visible: bottom navigation remains hidden as today; Accueil must not break overlay stacking.
- Large histories: feed caps results before rendering, and search filters from loaded lists without expensive rebuild loops.
- Rapid settings changes: the status component may remain in `saving/syncing` until the latest operation finishes; older completions must not overwrite a newer error or pending state.
- Local-only mode: the component should confirm "enregistré localement" rather than imply cloud synchronization.
- Conflict/error state: the component click retries the relevant refresh/sync action; destructive resolution or conflict merge UI remains out of scope.

## Implementation Tasks

- [x] Task 1: Define shared action status model
  - File: `lib/core/widgets/app_components.dart`
  - Action: Add a small status value object or enum for `idle`, `loading`, `saving`, `syncing`, `saved`, `synced`, `pending`, `localOnly`, `error`, `conflict` or equivalent, with icon/label/semantic mapping.
  - User story link: the user can see whether changes are saved, syncing, local-only or failing.
  - Depends on: none.
  - Validate with: widget/model tests for status-to-icon/label mapping.
  - Notes: Reuse meanings from `SyncStatus` and `CloudSyncOverview` without coupling the UI component to every provider type.

- [x] Task 2: Define shared search component contract
  - File: `lib/core/widgets/app_components.dart`
  - Action: Add a reusable `AppSearchField` or equivalent with query value/controller support, placeholder, clear action, disabled state, optional scope label, semantics and onChanged callback.
  - User story link: consistent global and page-scoped search across pages.
  - Depends on: Task 1.
  - Validate with: targeted widget test for search typing, clear button, disabled rendering, accessible label and narrow-width layout.
  - Notes: This component must not own refresh, save, sync or status semantics.

- [x] Task 2.1: Define shared sync/save status action component contract
  - File: `lib/core/widgets/app_components.dart`
  - Action: Add a reusable `AppSyncStatusAction` or equivalent with refresh/sync/save retry callback, busy state, saved/synced/local-only/error/conflict states, labels, tooltips and semantics.
  - User story link: trustworthy refresh, sync and save feedback across pages and Settings.
  - Depends on: Task 1.
  - Validate with: targeted widget test for refresh callback, disabled/busy rendering, success icon, local-only state, error retry state and accessible labels.
  - Notes: This component must not own search query or filtering semantics.

- [x] Task 2.2: Define optional toolbar composition
  - File: `lib/core/widgets/app_components.dart`
  - Action: Add a lightweight `AppPageToolbar` or equivalent that can compose `AppSearchField` and `AppSyncStatusAction` side by side when a page needs both.
  - User story link: consistent layout without coupling search to sync/save state.
  - Depends on: Tasks 2 and 2.1.
  - Validate with: widget tests for search-only, sync-only and combined toolbar rendering.
  - Notes: The toolbar is layout-only; business logic remains owned by page state/providers.

- [x] Task 3: Add home feed domain/application model
  - File: `lib/features/home/application/home_feed_provider.dart`
  - Action: Create a Riverpod provider/service that loads Voice, Clipboard, Snippets and Dictionary read-only, maps records into a shared feed item model, applies sorting/capping/filtering, and returns partial failure metadata.
  - User story link: global feed and global search across recent entries.
  - Depends on: Tasks 2 and 2.1 only for UI contract awareness.
  - Validate with: provider/unit tests using in-memory stores and simulated store failures.
  - Notes: Do not add persistence or new remote reads beyond existing current-user/local-mode store list calls.

- [x] Task 4: Add home feed presentation
  - File: `lib/features/home/presentation/home_screen.dart`
  - Action: Render the shared search component and shared sync/save component, composed by the optional toolbar if useful, plus feed summary, type filters if useful, mixed feed entries, partial-error banner, empty state, and source navigation actions.
  - User story link: default entry point with latest useful content.
  - Depends on: Tasks 2 and 3.
  - Validate with: widget tests for empty feed, mixed feed, global search, partial failure, and source navigation callbacks.
  - Notes: The first implementation opens source pages, not item-detail deep links.

- [x] Task 5: Insert Accueil into shell navigation
  - File: `lib/features/shell/presentation/app_shell_screen.dart`
  - Action: Add Home as tab index 0, shift existing feature indices, update titles, rail destinations, bottom navigation, tab history, refresh/import behavior conditions, onboarding settings redirect, and page list.
  - User story link: home page is the first app screen and has access to all major workflows.
  - Depends on: Task 4.
  - Validate with: AppShell widget tests for default tab, tab switching, back through tab history, onboarding overlay stack.
  - Notes: Voice and Clipboard import refresh hooks should still run when their tabs are selected; global home refresh can explicitly call the aggregator.

- [x] Task 6: Update protected routes for home and shifted indices
  - File: `lib/core/router/app_router.dart`
  - Action: Add a protected `/home` route to `AppShellScreen(initialIndex: 0)` and shift `/voice`, `/clipboard`, `/snippets`, `/dictionary`, `/settings` initial indices to match the new shell order.
  - User story link: direct navigation remains coherent after adding Accueil.
  - Depends on: Task 5.
  - Validate with: existing `app_router_auth_guard_test.dart` plus new route assertions for `/home` and shifted routes.
  - Notes: Keep `/` as auth gate unless implementation intentionally changes root redirect after sign-in via `AuthGateScreen`.

- [x] Task 7: Make AuthGate default to Accueil
  - File: `lib/features/auth/presentation/auth_gate_screen.dart`
  - Action: Ensure signed-in/local fallback users land on `AppShellScreen(initialIndex: 0)` where index 0 is Accueil.
  - User story link: first screen exposes global feed and search.
  - Depends on: Task 5.
  - Validate with: widget test for authenticated/local fallback auth gate rendering the Accueil title or content.
  - Notes: This may remain `const AppShellScreen()` if Task 4 changes default index semantics.

- [x] Task 8: Migrate Clipboard search/refresh to shared action bar
  - File: `lib/features/clipboard/presentation/clipboard_screen.dart`
  - Action: Replace the local standalone search field with the shared search component and the refresh action with the shared sync/save component while preserving current filtering logic, sensitive notice, pinned/sync metrics and import behavior.
  - User story link: page-scoped search with consistent controls.
  - Depends on: Task 2.
  - Validate with: clipboard widget tests for scoped search, refresh/import message, empty search state.
  - Notes: Clipboard has the most mature current search; use it as the page-scoped behavior reference.

- [x] Task 9: Add shared scoped search to Voice
  - File: `lib/features/voice/presentation/voice_screen.dart`
  - Action: Add query state and use the shared search component for search plus the shared sync/save component for refresh; filter transcription history by cleaned text, raw text, language and source labels.
  - User story link: same interaction model for voice history.
  - Depends on: Task 2.
  - Validate with: voice widget tests for search matching, no-results state, refresh button, and unchanged overlay controls.
  - Notes: Keep overlay status refresh separate where it controls overlay-specific state.

- [x] Task 10: Add shared scoped search to Snippets
  - File: `lib/features/snippets/presentation/snippets_screen.dart`
  - Action: Add query state with the shared search component and use the shared sync/save component for refresh; filter snippets by trigger, label and content.
  - User story link: same interaction model for reusable text entries.
  - Depends on: Task 2.
  - Validate with: snippets widget tests for search matching, no-results state, add/edit/delete still working.
  - Notes: Do not change snippet data model in this spec.

- [x] Task 11: Add shared scoped search to Dictionary
  - File: `lib/features/dictionary/presentation/dictionary_screen.dart`
  - Action: Add query state with the shared search component and use the shared sync/save component for refresh; filter terms by term, replacement and case-sensitivity label.
  - User story link: same interaction model for correction entries.
  - Depends on: Task 2.
  - Validate with: dictionary widget tests for search matching, no-results state, add/edit/delete still working.
  - Notes: Do not add usage tracking in this spec.

- [x] Task 12: Integrate shared save/sync status in Settings
  - File: `lib/features/settings/presentation/settings_screen.dart`
  - Action: Connect settings save operations, theme mode changes, keyboard preference saves, overlay preference changes, secrets save state where appropriate, and cloud overview refresh to the shared action/status component.
  - User story link: settings changes visibly move through saving/synced/local-only/error states.
  - Depends on: Tasks 1 and 2.
  - Validate with: Settings widget tests for saving spinner, saved confirmation, local-only label, error state, and click-to-retry/refresh callback.
  - Notes: Do not hide existing detailed `_message` feedback; the shared component should summarize state while detailed copy remains available when needed.

- [x] Task 13: Map cloud/sync overview states to the shared status vocabulary
  - File: `lib/core/sync/cloud_sync_overview.dart`
  - Action: Add a helper or adapter if needed so `CloudSyncCategoryState` and `SyncStatus` can drive the shared status control without duplicating string/icon decisions in each screen.
  - User story link: sync feedback is consistent and trustworthy.
  - Depends on: Task 1.
  - Validate with: focused unit tests for mapping `syncing`, `pending`, `synced`, `localOnly`, `failed`, `conflict`, `unavailable`.
  - Notes: Keep domain enums stable; prefer adapter/helper over changing persistence models.

- [x] Task 14: Update tests for new navigation and shared controls
  - File: `test/widget_test.dart`
  - Action: Update AppShell expectations for Accueil as default, shifted tab order, shared search/refresh/status text, and affected page labels.
  - User story link: regression coverage for the new primary workflow.
  - Depends on: Tasks 5-13.
  - Validate with: targeted `flutter test test/widget_test.dart`.
  - Notes: Split tests into dedicated files if `widget_test.dart` becomes too broad during implementation.

- [x] Task 15: Update router auth guard tests
  - File: `test/app_router_auth_guard_test.dart`
  - Action: Add `/home` coverage and update shifted route index assumptions if the test inspects shell behavior.
  - User story link: protected routing remains coherent.
  - Depends on: Task 6.
  - Validate with: `flutter test test/app_router_auth_guard_test.dart`.
  - Notes: Keep auth behavior unchanged.

- [x] Task 16: Add feed provider tests
  - File: `test/home_feed_provider_test.dart`
  - Action: Cover mixed aggregation, sort order, cap behavior, global filtering, partial failures, empty feed, and exclusion of deleted/unavailable records if stores expose them.
  - User story link: reliable global feed and search behavior.
  - Depends on: Task 3.
  - Validate with: `flutter test test/home_feed_provider_test.dart`.
  - Notes: Use in-memory/fake stores rather than Firebase.

- [x] Task 17: Add shared status component tests
  - File: `test/app_page_action_bar_test.dart`
  - Action: Cover shared search component, shared sync/save component, optional toolbar composition, loading/saving spinner, saved/synced check icon, pending/local-only messaging, error icon/message, disabled state, click-to-retry, and accessible labels.
  - User story link: trustworthy save/sync feedback.
  - Depends on: Tasks 1 and 2.
  - Validate with: `flutter test test/app_page_action_bar_test.dart`.
  - Notes: Include narrow-width layout coverage so status text/icons do not overflow.

- [x] Task 18: Align internal docs or checklist if needed
  - File: `shipglows_data/technical/code-docs-map.md`
  - Action: Update route/screen map if it names the shell tabs or feature entrypoints; otherwise document no docs change in the implementation report.
  - User story link: future agents can find the new home/feed architecture.
  - Depends on: Tasks 3-6.
  - Validate with: metadata lint only if governance docs change.
  - Notes: `sf-spec` does not edit TASKS/AUDIT_LOG.

## Acceptance Criteria

- [x] CA 1: Given a signed-in or local fallback user, when the app shell opens with default settings, then Accueil is selected and shows the global feed surface.
- [x] CA 2: Given the stores contain at least one transcription, clipboard item, snippet and dictionary term, when Accueil loads, then entries from all four sources appear in a single date-ordered feed with visible type labels.
- [x] CA 3: Given the global search query matches only a snippet trigger, when the user types the query on Accueil, then the feed shows that snippet and hides non-matching voice, clipboard and dictionary entries.
- [x] CA 4: Given the global search query matches nothing, when the user types it, then Accueil shows a no-results state with an affordance to clear the query.
- [x] CA 5: Given one feed source throws during refresh, when Accueil refreshes, then available sources still render and a partial warning identifies the unavailable source.
- [x] CA 6: Given all feed sources throw during refresh, when Accueil refreshes, then the page shows a recoverable error and a refresh action.
- [x] CA 7: Given the user taps a feed entry source action, when the source is Voice, Clipboard, Snippets or Dictionary, then the shell selects the corresponding page without losing navigation state.
- [x] CA 8: Given the user is on Clipboard, when they search, then results are restricted to clipboard entries and do not include voice/snippet/dictionary data.
- [x] CA 9: Given the user is on Voice, Snippets or Dictionary, when they search, then results are restricted to that page's data type and the shared search component visuals remain consistent.
- [x] CA 9.1: Given a page uses only search, only sync/save, or both, when it renders, then search and sync/save remain separate components and the optional toolbar only composes layout.
- [x] CA 10: Given a refresh is in progress on any page using the shared sync/save component, when the user taps refresh again, then no concurrent refresh starts and the component communicates busy/disabled state.
- [x] CA 10.1: Given a setting change is being saved, when the operation is in flight, then the shared component shows a loading/saving state and disables duplicate save/refresh actions.
- [x] CA 10.2: Given a setting change saved locally but cloud sync is unavailable, when the operation completes, then the shared component says local-only or pending instead of synced.
- [x] CA 10.3: Given a setting change or sync fails, when the operation returns an error, then the shared component shows an error state and clicking it retries the configured refresh/sync action.
- [x] CA 10.4: Given a setting change saves and syncs successfully, when the operation completes, then the shared component briefly shows a saved/synced confirmation with an accessible label.
- [x] CA 11: Given existing direct routes `/voice`, `/clipboard`, `/snippets`, `/dictionary`, `/settings`, when authenticated, then each still opens the correct tab after the Accueil index insertion.
- [x] CA 12: Given unauthenticated access to `/home`, when the auth guard runs, then the user is redirected to sign-in just like other protected routes.
- [x] CA 13: Given no data exists in any source, when Accueil loads, then it shows an empty state with shortcuts to the main data-creation pages.
- [x] CA 14: Given clipboard sensitive captures were rejected by existing importer logic, when global search runs, then rejected sensitive payloads do not appear.
- [x] CA 15: Given implementation completes, when local validation runs, then `flutter analyze` and relevant `flutter test` targets pass or any accepted exceptions are documented with proof.

## Test Strategy

- Add pure/provider tests for feed item mapping and filtering.
- Add widget tests for shared search component, shared sync/save component and optional toolbar composition.
- Add widget tests for shared save/sync status states and click-to-retry.
- Add widget tests for `HomeScreen` using provider overrides/fake stores.
- Update AppShell tests for default Accueil and shifted navigation.
- Update Clipboard tests to assert the shared search component still filters correctly.
- Add focused Voice/Snippets/Dictionary search tests.
- Add focused Settings tests for save/sync status feedback.
- Run:
  - `flutter analyze`
  - `flutter test test/home_feed_provider_test.dart`
  - `flutter test test/app_page_action_bar_test.dart`
  - `flutter test test/app_router_auth_guard_test.dart`
  - `flutter test test/widget_test.dart`
  - `flutter test` if shared widgets or shell behavior changed broadly.
- Manual web smoke after automated checks: local/sign-in fallback, Accueil feed, global search, page search, refresh, no-results, partial failure if easy to simulate.

## Risks

- Medium UX/navigation risk: inserting Accueil shifts indices and can break routes/tests/onboarding if any hardcoded index is missed.
- Medium privacy risk: global search can accidentally broaden visibility; mitigate by reading only existing public-to-app stores and never diagnostics/secrets/rejected sensitive payloads.
- Medium performance risk: global search across multiple lists can rebuild too much; mitigate with caps, simple filtering, and provider-level aggregation.
- Low data risk: read-only feed should not mutate stores, but refresh can trigger existing Voice/Clipboard import paths if implemented carelessly.
- Medium trust risk: showing a check mark for a local save when the user expects cloud sync can be misleading; mitigate with distinct labels/icons for saved locally vs synced.
- Medium concurrency risk: rapid settings changes can complete out of order; mitigate by tying status to latest operation or using a monotonic operation token.
- Medium test maintenance risk: existing broad widget tests may need careful updates for new labels and tab order.

## Execution Notes

- Read first:
  - `lib/features/shell/presentation/app_shell_screen.dart`
  - `lib/core/router/app_router.dart`
  - `lib/core/widgets/app_components.dart`
  - `lib/features/clipboard/presentation/clipboard_screen.dart`
  - `lib/features/voice/presentation/voice_screen.dart`
  - `test/widget_test.dart`
- Implementation order should follow the task order: status model, shared search component, shared sync/save component, optional toolbar composition, feed provider, home screen, shell/router insertion, page migrations, tests/docs.
- Implement the status vocabulary before migrating pages, so every screen uses the same icon/label semantics.
- Prefer existing Riverpod provider patterns; do not introduce a new state-management library.
- Prefer simple local filtering helpers with tests over adding a fuzzy-search package.
- Keep source pages responsible for edits/deletes and confirmations.
- If implementation discovers that a source store cannot expose enough data for feed mapping without a write or migration, stop and re-scope before changing the data model.
- If global search needs persisted "recently used" ranking beyond existing timestamps, split that into a future spec.
- If true cloud sync retry requires queue, conflict resolution or backend adapter changes, split that into a future sync spec; this chantier may only invoke existing refresh/save/sync entrypoints.
- Official docs source used for routing decision: pub.dev `go_router` package/API docs, checked 2026-05-30. The local app remains on `go_router ^16.2.5`; the spec does not require adopting latest 17.x behavior.

## Open Questions

None blocking for the initial spec. Additional ideas are welcome before `/sf-ready`, but they should be added only if they change one of these decisions: feed ranking, privacy visibility, item-level deep links, persisted recently-used tracking, save/sync semantics, or cross-device sync.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-30 07:06:27 UTC | sf-spec | GPT-5 Codex | Created spec for app home feed, global search, and shared search/refresh actions | Draft saved | `/sf-ready shipglows_data/workflow/specs/app-home-feed-global-actions-search.md` |
| 2026-05-30 07:15:09 UTC | sf-spec | GPT-5 Codex | Updated shared refresh component into search/refresh/save/sync status contract with Settings feedback and retry behavior | Draft updated | `/sf-ready shipglows_data/workflow/specs/app-home-feed-global-actions-search.md` |
| 2026-05-30 07:19:10 UTC | sf-ready | GPT-5 Codex | Reviewed readiness, tightened user/session data-scope invariant, reordered status component tasks, and marked spec ready | ready | `/sf-start shipglows_data/workflow/specs/app-home-feed-global-actions-search.md` |
| 2026-05-30 07:28:22 UTC | sf-spec | GPT-5 Codex | Clarified that shared search and shared sync/save status are two separate components with an optional layout toolbar; returned spec to draft for readiness rerun | draft updated | `/sf-ready shipglows_data/workflow/specs/app-home-feed-global-actions-search.md` |
| 2026-05-30 07:31:17 UTC | sf-ready | GPT-5 Codex | Reran readiness after component-separation clarification and confirmed the search, sync/save, and optional toolbar contracts are unambiguous | ready | `/sf-start shipglows_data/workflow/specs/app-home-feed-global-actions-search.md` |
| 2026-05-30 15:30:49 UTC | sf-start | GPT-5 Codex with attempted GPT-5.3 Codex Spark worker | Added shared search/status/toolbar components, Accueil feed provider/screen, `/home` route, shifted shell navigation, and focused tests; scoped page search and Settings sync/save integration remain | partial | `/sf-start shipglows_data/workflow/specs/app-home-feed-global-actions-search.md` |
| 2026-05-30 15:34:00 UTC | sf-verify | GPT-5 Codex | Verified current implementation slice and checks; full spec is not ship-ready because scoped page search migration and Settings sync/save integration remain incomplete | not verified | `/sf-start shipglows_data/workflow/specs/app-home-feed-global-actions-search.md` |
| 2026-05-30 16:34:31 UTC | sf-start | GPT-5 Codex + GPT-5.3 Codex Spark worker | Completed page-scoped search migration, shared refresh/status controls, Settings save/sync status, docs alignment, and local checks | implemented | `/sf-verify shipglows_data/workflow/specs/app-home-feed-global-actions-search.md` |
| 2026-05-30 16:34:31 UTC | sf-verify | GPT-5 Codex | Verified local implementation with `flutter analyze`, `flutter test`, focused page/settings tests, and metadata lint; Flutter web smoke remains required before clean ship readiness | partial | `/sf-ship shipglows_data/workflow/specs/app-home-feed-global-actions-search.md` |
| 2026-05-30 16:40:37 UTC | sf-ship | GPT-5 Codex | Prepared targeted ship for the WinGlows app home feed and shared action/status chantier, excluding unrelated site changes | shipped | `/sf-prod winglowz-app` |
| 2026-05-30 17:07:36 UTC | sf-prod | GPT-5 Codex | Verified Vercel production deployment `dpl_AsApHLHxFidUgmi7wRt8aDb5oLS5`, `https://app.winglowz.com` health 200, and Flutter web smoke for local mode, Accueil feed, refresh, global search, and Clipboard scoped search | verified | `/sf-end shipglows_data/workflow/specs/app-home-feed-global-actions-search.md` |
| 2026-05-30 17:07:36 UTC | sf-verify | GPT-5 Codex + GPT-5.3 Codex Spark explorer | Closed the remaining deployed web smoke gate and reviewed spec-to-implementation coherence; no blocking issue remains | verified | `/sf-end shipglows_data/workflow/specs/app-home-feed-global-actions-search.md` |
| 2026-05-30 17:07:36 UTC | sf-end | GPT-5 Codex | Closed the app home feed, global/page search, and shared sync/save status chantier after ship, production deploy and smoke verification | closed | `None` |
| 2026-05-30 17:09:14 UTC | sf-ship | GPT-5 Codex | Shipped final chantier closure trace and app changelog entry, excluding unrelated dirty files | shipped | `None` |

## Current Chantier Flow

sf-spec: done
sf-ready: ready
sf-start: implemented
sf-verify: verified
sf-end: closed
sf-ship: shipped

Next command: None
