---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-08"
created_at: "2026-05-08 17:48:07 UTC"
updated: "2026-05-24"
updated_at: "2026-05-24 19:29:37 UTC"
status: ready
source_skill: sf-build
source_model: "GPT-5 Codex"
scope: "clipboard-backend-agnostic-api"
owner: "Diane"
confidence: high
user_story: "En tant que builder de WinGlows, je veux que l'historique clipboard et les captures Android/IME passent par une API produit indépendante du backend, afin de pouvoir garder l'app local-first et remplacer Supabase sans réécrire l'UI, le natif Android ou la logique de sécurité."
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Flutter app"
  - "ClipboardHistoryApi"
  - "ClipboardHistoryStore"
  - "Android InputMethodService"
  - "Android ClipboardManager"
  - "SupabaseClipboardStore"
  - "Future local/offline store"
  - "Future backend provider"
  - "shipglows_data/workflow/specs/android-ime-winglowz_app-keyboard.md"
depends_on:
  - artifact: "docs/technical/flutter-app.md"
    artifact_version: "0.1.0"
    required_status: "draft"
  - artifact: "docs/technical/code-docs-map.md"
    artifact_version: "0.1.0"
    required_status: "draft"
  - artifact: "docs/explorations/2026-05-05-backend-provider-pause-risk.md"
    artifact_version: "1.0.0"
    required_status: "draft"
  - artifact: "shipglows_data/workflow/specs/android-ime-winglowz_app-keyboard.md"
    artifact_version: "1.0.0"
    required_status: "ready"
supersedes: []
evidence:
  - "User decision 2026-05-08: Supabase validation is deferred and Supabase should remain replaceable because provider pauses and project splitting are not acceptable as a core product dependency."
  - "Current code adds ClipboardHistoryApi, ClipboardHistoryStore, backend-neutral clipboard domain models, and SupabaseClipboardStore as an adapter."
  - "docs/explorations/2026-05-05-backend-provider-pause-risk.md recommends freezing deeper Supabase-specific work until backend choice is explicit."
  - "shipglows_data/workflow/specs/android-ime-winglowz_app-keyboard.md still contains Supabase-specific assumptions that must be routed through the backend-agnostic API before more Android/IME work."
next_step: "/sf-test Android IME clipboard bridge on Android SDK/device"
---

# Title

Clipboard Backend-Agnostic API

# Status

Ready as of 2026-05-08. The spec captures the current architectural decision: clipboard behavior is a product/domain contract, while Supabase is only one replaceable adapter. Readiness passed because the user story, behavior contract, security constraints, implementation tasks, acceptance criteria, tests, docs impact and stop conditions are explicit.

# User Story

En tant que builder de WinGlows, je veux que l'historique clipboard et les captures Android/IME passent par une API produit indépendante du backend, afin de pouvoir garder l'app local-first et remplacer Supabase sans réécrire l'UI, le natif Android ou la logique de sécurité.

Acteur principal: builder de WinGlows.

Acteurs secondaires: utilisateur Android, utilisateur non connecté, futur backend provider, adaptateur local/offline.

Déclencheurs principaux:

- L'utilisateur ajoute manuellement un item clipboard dans l'app.
- Le clavier Android/IME capture ou insère un contenu clipboard.
- Un backend sync est disponible, indisponible, remplacé ou désactivé.
- Une donnée ressemble à un secret ou à un contenu risqué.

Résultat observable attendu: l'UI et Android/IME appellent une API produit stable; le comportement local, la déduplication, les sources `keyboard_*`, la confirmation de contenu sensible et les états de sync restent identiques même si l'implémentation backend change.

# Minimal Behavior Contract

WinGlows expose une API clipboard produit qui accepte des actions métier explicites: lister, ajouter manuellement, capturer automatiquement, mettre à jour, pin/unpin, supprimer, marquer un état de sync et demander une confirmation quand un contenu semble risqué. L'API produit délègue la persistance à un `ClipboardHistoryStore` interchangeable et ne connaît ni table Supabase, ni schéma SQL, ni provider concret. Si aucun store n'est disponible, l'utilisateur voit un état récupérable et aucune donnée sensible n'est envoyée. L'edge case facile à rater est Android/IME: le natif ne doit jamais appeler directement Supabase ni contourner la confirmation/sensibilité; il doit produire des événements ou appels qui passent par l'API produit ou par un store local compatible avec le même contrat.

# Success Behavior

- Given l'app clipboard est ouverte, when l'utilisateur ajoute un contenu manuel normal, then l'écran appelle `ClipboardHistoryApi.addManualItem`, le store courant persiste l'item, et l'utilisateur voit l'item dans l'historique.
- Given un contenu manuel ressemble à un secret, when l'utilisateur tente de le sauvegarder, then l'UI demande confirmation avant d'appeler l'API, et le store refuse également l'insert si `sensitiveConfirmed` reste faux.
- Given Android/IME capture un contenu éligible, when le raccord est implémenté, then l'appel passe par `captureAutomaticItem` ou un store local respectant `ClipboardAutomaticUpsertDraft`, avec source `keyboard_clipboard` ou `keyboard_voice`, `deviceId`, timestamps UTC, hash normalisé et fenêtre de déduplication.
- Given Supabase est indisponible ou remplacé, when l'utilisateur utilise le clipboard local, then l'API produit reste stable et seul le provider du store change.
- Given une future migration backend est décidée, when un nouvel adaptateur implémente `ClipboardHistoryStore`, then l'UI et Android/IME n'ont pas besoin de connaître le nouveau provider.

# Error Behavior

- Si aucun store n'est configuré, l'UI affiche un message de backend/sync indisponible sans planter et sans prétendre que la sync cloud fonctionne.
- Si le contenu est vide, trop long ou sensible sans confirmation, le store rejette l'action avec une erreur récupérable; aucun item vide ou secret non confirmé n'est persisté.
- Si une capture automatique arrive sans `deviceId`, source automatique valide ou timestamp exploitable, l'action est refusée ou gardée localement dans un état d'erreur explicite selon le store local.
- Si le store distant échoue après une capture locale, l'item doit rester local/pending/error sans duplication silencieuse ni perte de contenu déjà accepté.
- Si un utilisateur se déconnecte ou change de compte, les files locales et états pending ne doivent jamais exposer les items d'un autre compte.
- Si le backend provider change, aucun code d'UI ou Android natif ne doit être modifié pour lire/écrire directement le provider.

# Problem

Le repo a avancé sur Flutter + Supabase puis sur Android IME. Cette direction crée un risque de couplage prématuré: l'UI clipboard, la logique de déduplication et les futures captures Android pourraient dépendre des tables Supabase alors que le backend final n'est pas décidé. L'exploration backend a aussi montré que les plans gratuits de certains providers peuvent mettre les projets en pause, ce qui n'est pas acceptable comme invariant produit pendant une phase de développement lente ou pré-traction.

# Solution

Faire du clipboard une API produit local-first et backend-agnostic. Le cœur est `ClipboardHistoryApi` + `ClipboardHistoryStore` + modèles de domaine; chaque provider devient un adaptateur. Supabase reste disponible comme adaptateur temporaire, mais le prochain travail Android/IME doit se raccorder à cette API ou à un store local compatible, pas à Supabase.

# Scope In

- Stabiliser le contrat `ClipboardHistoryApi` comme façade consommée par l'UI et les futurs ponts Android.
- Stabiliser `ClipboardHistoryStore` comme interface de persistance interchangeable.
- Garder `SupabaseClipboardStore` comme adaptateur isolé, sans logique UI ou Android dedans.
- Définir les règles produit: sources `manual`, `voice`, `overlay`, `system`, `keyboard`, `keyboard_voice`, `keyboard_clipboard`; hash normalisé; fenêtre de déduplication; `capture_count`; `sync_state`; confirmation de contenu sensible.
- Préparer un store local/offline futur pour Android/IME sans choisir encore le backend cloud final.
- Mettre à jour la spec Android IME ou les tâches associées pour remplacer les hypothèses Supabase directes par l'API backend-agnostic.
- Ajouter tests de domaine, tests d'API avec fake store, tests d'adaptateur provider.

# Scope Out

- Choisir le backend cloud final.
- Migrer hors Supabase.
- Implémenter un serveur maison, Firebase, PocketBase, Neon ou autre provider.
- Appliquer ou valider les migrations Supabase sur une vraie base.
- Réécrire snippets, dictionnaire, transcriptions et auth dans cette phase.
- Implémenter toute la UI Android/IME clipboard panel en une seule passe.
- Synchroniser automatiquement le presse-papiers Android en arrière-plan.

# Constraints

- `ClipboardHistoryApi` ne doit pas importer `supabase_flutter`, SQL, `SupabaseClient` ou des noms de tables.
- `lib/features/clipboard/presentation/**` ne doit pas importer `lib/data/supabase/**`.
- Le natif Android ne doit pas contenir de credentials backend ni appeler un provider distant directement.
- Les contenus sensibles doivent demander confirmation avant toute sauvegarde manuelle cloud ou locale persistante.
- Les captures automatiques sensibles doivent être refusées ou rester locales sans sync tant qu'une confirmation explicite n'est pas possible.
- Les captures clipboard IME depuis des champs sensibles restent refusées par défaut; seule une préférence avancée explicite peut les autoriser pour l'historique clipboard, sans réactiver voix, snippets, apprentissage ou mode strict.
- Les items sont bornés à `kClipboardMaxContentLength`.
- Les sources et états de sync doivent être des enums de domaine, pas des strings dispersées.
- Les erreurs doivent être récupérables et observables par l'utilisateur ou par un état de queue.
- Les tests de domaine ne doivent pas dépendre d'un backend.

# Dependencies

- Code local existant:
  - `lib/features/clipboard/application/clipboard_history_api.dart`
  - `lib/features/clipboard/application/clipboard_store_provider.dart`
  - `lib/features/clipboard/domain/clipboard_capture_event.dart`
  - `lib/features/clipboard/domain/clipboard_normalizer.dart`
  - `lib/features/clipboard/domain/clipboard_store.dart`
  - `lib/data/supabase/clipboard_repository.dart`
  - `lib/features/clipboard/presentation/clipboard_screen.dart`
- Specs/docs:
  - `shipglows_data/workflow/specs/android-ime-winglowz_app-keyboard.md` doit être alignée avant la prochaine vague Android/IME.
  - `docs/explorations/2026-05-05-backend-provider-pause-risk.md` explique pourquoi éviter de renforcer le couplage Supabase.
  - `docs/technical/flutter-app.md` et `docs/technical/code-docs-map.md` documentent les surfaces Flutter à maintenir.
- Fresh external docs verdict: fresh-docs not needed for this spec because the contract is internal Flutter/Dart architecture and does not introduce a new framework/API behavior. Android and Supabase official-doc checks remain covered by the existing IME spec and are rechecked only when touching native Android or Supabase runtime behavior.

# Invariants

- Le domaine clipboard reste utilisable sans backend distant.
- La source de vérité produit est l'API clipboard, pas une table ou un provider.
- Supabase est remplaçable sans modifier l'UI clipboard.
- La déduplication ne traverse jamais les comptes.
- Les secrets probables ne sont jamais sauvegardés sans décision utilisateur explicite.
- Une suppression ou tombstone doit gagner contre les updates stale quand le store le supporte.
- Les états `pending`, `synced`, `error`, `local`, `deleted` sont sémantiques et non spécifiques à Supabase.
- L'IME Android reste une source d'événements/actions, pas un client backend direct.

# Links & Consequences

- `lib/features/clipboard/presentation/clipboard_screen.dart`: consomme `clipboardHistoryApiProvider`, pas Supabase.
- `lib/features/clipboard/application/clipboard_history_api.dart`: devient la façade stable pour UI et futurs raccords.
- `lib/features/clipboard/domain/clipboard_store.dart`: définit le contrat que les stores provider/local doivent implémenter.
- `lib/data/supabase/clipboard_repository.dart`: reste un adaptateur et ne doit pas redevenir le contrat produit.
- `android/app/src/main/kotlin/**`: futur raccord IME doit produire des événements compatibles avec l'API/store; aucun appel backend direct.
- `shipglows_data/workflow/specs/android-ime-winglowz_app-keyboard.md`: contient des tâches Supabase directes à requalifier vers backend-agnostic avant reprise.
- `docs/technical/flutter-app.md`: doit mentionner que clipboard suit une architecture API/store backend-agnostic.
- `docs/technical/supabase-data.md`: doit clarifier que Supabase est un adaptateur actuel, pas une contrainte produit définitive.

# Documentation Coherence

- `docs/technical/flutter-app.md`: update requis pour nommer `ClipboardHistoryApi`, `ClipboardHistoryStore`, provider et règle anti-couplage UI -> Supabase.
- `docs/technical/supabase-data.md`: update requis pour qualifier `SupabaseClipboardStore` comme adaptateur transitoire.
- `docs/technical/code-docs-map.md`: review requis si les triggers docs restent trop Supabase-centric.
- `shipglows_data/workflow/specs/android-ime-winglowz_app-keyboard.md`: update requis avant nouvelles tâches IME touchant clipboard/sync.
- README/public copy: no impact immédiat tant que le comportement visible ne change pas.
- Changelog: à préparer au ship, car c'est une refonte d'architecture interne.

# Edge Cases

- Store absent ou backend désactivé.
- Utilisateur offline avant, pendant ou après une capture.
- Contenu sensible détecté en ajout manuel.
- Contenu sensible capturé automatiquement depuis Android/IME alors qu'aucune confirmation UI n'est possible.
- Même contenu capturé plusieurs fois dans la fenêtre de 10 minutes avec espaces différents.
- Changement de compte pendant qu'une queue locale contient des items pending.
- Provider Supabase supprimé/remplacé pendant que l'UI existe encore.
- Android/IME ouvert alors que l'app Flutter principale n'est pas initialisée.
- Future migration backend qui ne supporte pas SQL/RLS/tombstone de la même façon.
- Erreur store après insertion partielle.

# Implementation Tasks

- [x] Tâche 1 : Extraire le domaine clipboard backend-agnostic
  - Fichiers : `lib/features/clipboard/domain/clipboard_capture_event.dart`, `lib/features/clipboard/domain/clipboard_normalizer.dart`, `lib/features/clipboard/domain/clipboard_store.dart`
  - Action : Déplacer sources, états, modèles, normalisation, hash, classification sensible et contrat store hors de `lib/data/supabase`.
  - User story link : rend les règles produit indépendantes du provider.
  - Depends on : décision utilisateur 2026-05-08.
  - Validate with : `flutter test test/clipboard_domain_test.dart`

- [x] Tâche 2 : Créer la façade produit clipboard
  - Fichiers : `lib/features/clipboard/application/clipboard_history_api.dart`, `lib/features/clipboard/application/clipboard_store_provider.dart`
  - Action : Exposer les opérations métier à l'UI et aux futurs raccords Android via `ClipboardHistoryApi`.
  - User story link : évite que UI et natif dépendent d'un backend.
  - Depends on : Tâche 1.
  - Validate with : `flutter test test/clipboard_history_api_test.dart`

- [x] Tâche 3 : Isoler Supabase comme adaptateur
  - Fichier : `lib/data/supabase/clipboard_repository.dart`
  - Action : Renommer mentalement le repository en `SupabaseClipboardStore`, implémenter `ClipboardHistoryStore`, garder payload SQL dans l'adaptateur.
  - User story link : rend Supabase remplaçable.
  - Depends on : Tâches 1-2.
  - Validate with : `flutter test test/supabase_clipboard_store_test.dart`

- [x] Tâche 4 : Découpler l'écran clipboard
  - Fichier : `lib/features/clipboard/presentation/clipboard_screen.dart`
  - Action : Utiliser `clipboardHistoryApiProvider`, enum de sources domaine, confirmation sensible, message backend générique.
  - User story link : l'UI ne connaît plus le backend concret.
  - Depends on : Tâche 2.
  - Validate with : `flutter analyze`, `flutter test`

- [x] Tâche 5 : Ajouter un store local/offline minimal
  - Fichiers : `lib/features/clipboard/data/in_memory_clipboard_history_store.dart`, `test/in_memory_clipboard_history_store_test.dart`
  - Action : Implémenter un store en mémoire avec list/insert/update/pin/delete et upsert automatique par fenêtre.
  - User story link : l'app reste utilisable si backend absent.
  - Depends on : Tâches 1-2.
  - Validate with : tests unitaires sans Supabase.
  - Notes : in-memory volontaire pour preuve courte; persistance locale durable reste une décision séparée.

- [x] Tâche 6 : Raccorder Android/IME au contrat backend-agnostic
  - Fichiers : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardClipboardEventQueue.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardClipboardController.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzInputMethodService.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`, `lib/core/platform/android_keyboard_bridge.dart`, `lib/features/clipboard/application/keyboard_clipboard_event_importer.dart`, `lib/features/clipboard/presentation/clipboard_screen.dart`
  - Action : Faire transiter les événements IME clipboard par une queue native drainée par `winglowz_app/keyboard`, puis importée via `ClipboardHistoryApi`; interdire l'appel direct Supabase depuis Android.
  - User story link : le clavier devient une source d'événements produit, pas un client backend.
  - Depends on : Tâche 5 ou décision explicite de rester in-memory pour la première preuve.
  - Validate with : tests Dart passés; build Android/Kotlin bloqué localement par Android SDK absent; QA manuel ultérieur requis.
  - Notes : la queue native est une file locale bornée de transit vers Flutter, pas le store produit final.

- [x] Tâche 7 : Aligner la spec Android IME et les docs techniques
  - Fichiers : `shipglows_data/workflow/specs/android-ime-winglowz_app-keyboard.md`, `docs/technical/flutter-app.md`, `docs/technical/supabase-data.md`, `docs/technical/code-docs-map.md`
  - Action : Remplacer les formulations "sync Supabase" comme cœur par "API/store clipboard backend-agnostic; Supabase adapter actuel".
  - User story link : empêche les prochaines implémentations de réintroduire le couplage.
  - Depends on : Tâches 1-4.
  - Validate with : revue Markdown + `rg` ciblé sur formulations Supabase.

- [x] Tâche 8 : Rendre l'historique local persistant et ergonomique
  - Fichiers : `lib/features/clipboard/data/persistent_clipboard_history_store.dart`, `lib/features/clipboard/data/in_memory_clipboard_history_store.dart`, `lib/features/clipboard/application/clipboard_store_provider.dart`, `lib/features/clipboard/presentation/clipboard_screen.dart`, `test/persistent_clipboard_history_store_test.dart`, `test/local_mode_store_provider_test.dart`
  - Action : Remplacer le fallback clipboard volatil par un store local persistant via secure storage, préserver la déduplication automatique après reload, ajouter recherche et recopie directe vers le presse-papiers système.
  - User story link : l'historique clipboard reste utilisable sans backend distant et devient exploitable au quotidien.
  - Depends on : Tâches 1-6.
  - Validate with : `flutter analyze`, `flutter test`, tests ciblés clipboard/local mode.

- [x] Tâche 9 : Synchroniser toutes les actions copier/coller IME autorisées vers l'app
  - Fichiers : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardClipboardController.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardClipboardEventQueue.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzInputMethodService.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`, `docs/technical/android-native.md`
  - Action : Supprimer la dépendance au toggle `clipboardSyncDesired` pour l'historique local app, enregistrer les actions copy/cut/paste clavier autorisées dans la queue native bornée et la drainer vers `ClipboardHistoryApi`.
  - User story link : tout copier/coller réalisé via le clavier doit apparaître dans l'application, sauf champs privés ou clips marqués sensibles.
  - Depends on : Tâches 6-8.
  - Validate with : `flutter analyze`, `flutter test`; validation Android/Kotlin et appareil physique hors VM.

- [x] Tâche 10 : Ajouter une option avancée pour l'historique clipboard en champs sensibles
  - Fichiers : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardSecurityPolicy.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardClipboardController.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzInputMethodService.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`, `lib/features/keyboard/domain/keyboard_models.dart`, `lib/core/platform/android_keyboard_bridge.dart`, `lib/features/settings/**`, `docs/technical/android-native.md`
  - Action : Exposer une préférence désactivée par défaut qui autorise uniquement l'historique clipboard IME dans les champs sensibles sous policy auto, tout en gardant voix, snippets, learning et strict privacy bloqués.
  - User story link : les utilisateurs avancés peuvent choisir de conserver leurs copier/coller sensibles dans l'historique tout en assumant explicitement le risque.
  - Depends on : Tâches 8-9.
  - Validate with : `flutter analyze`, `flutter test`; validation Android/Kotlin et appareil physique hors VM.

# Acceptance Criteria

- [x] AC 1 : Given l'écran clipboard Flutter, when il liste/ajoute/pin/supprime, then il appelle `ClipboardHistoryApi` et n'importe pas `lib/data/supabase`.
- [x] AC 2 : Given un contenu sensible manuel, when l'utilisateur refuse la confirmation, then aucun appel de persistance n'est effectué.
- [x] AC 3 : Given `SupabaseClipboardStore`, when il construit un payload, then les colonnes Supabase restent confinées à l'adaptateur.
- [x] AC 4 : Given un fake store, when `ClipboardHistoryApi` ajoute/capture, then les appels sont exprimés en modèles de domaine.
- [x] AC 5 : Given aucun backend distant n'est disponible, when l'utilisateur ouvre le clipboard, then un store local ou un message backend-generic permet un état récupérable sans dépendance Supabase visible.
- [x] AC 6 : Given Android/IME capture un item, when le raccord est fait, then l'événement ne référence pas Supabase et respecte source, device, hash, sensibilité et sync state du domaine.
- [x] AC 7 : Given la spec Android IME est relue, when elle mentionne sync clipboard, then elle passe par l'API/store backend-agnostic ou nomme Supabase comme adaptateur seulement.
- [x] AC 8 : Given l'utilisateur est en local mode ou sans accès cloud, when il redémarre l'app ou recrée le store local, then les items clipboard locaux, pins, edits et déduplications automatiques restent disponibles.
- [x] AC 9 : Given un historique long, when l'utilisateur cherche ou veut réutiliser un item, then l'écran permet de filtrer l'historique et de recopier l'item vers le presse-papiers système.
- [x] AC 10 : Given l'utilisateur copie, coupe ou colle via les actions clavier IME dans un champ autorisé, when il ouvre l'écran Clipboard, then l'événement est drainé dans `ClipboardHistoryApi` sans dépendre de `clipboardSyncDesired`.
- [x] AC 11 : Given l'option avancée d'historique clipboard sensible est désactivée, when l'utilisateur copie/coupe/colle dans un champ password/OTP/private sous privacy auto, then aucun item sensible n'est ajouté à l'historique app ou aux récents locaux clavier; when l'option est activée, then seuls les événements clipboard IME sont autorisés et le mode strict reste bloqué.

# Test Strategy

- `flutter analyze`
- `flutter test`
- Tests domaine purs:
  - `test/clipboard_domain_test.dart`
- Tests API avec fake store:
  - `test/clipboard_history_api_test.dart`
- Tests adaptateur provider:
  - `test/supabase_clipboard_store_test.dart`
- Tests futurs store local:
  - list/insert/update/pin/delete
  - upsert automatique dans/hors fenêtre de déduplication
  - contenu sensible sans confirmation
  - séparation par compte/device si le store local ajoute le user scope
- Tests store local persistant:
  - restauration après recréation du store
  - persistance pin/edit/delete
  - déduplication automatique durable
  - récupération après payload corrompu
- Tests futurs Android/IME:
  - MethodChannel ou bridge event sans import Supabase
  - private field/sensitive content gating
  - offline/backend absent
  - build Android/Kotlin et appareil réel quand Android SDK est disponible

# Risks

- Risque architecture: réintroduire Supabase dans l'UI ou le natif par facilité.
  - Mitigation: tests/import scan et provider unique.
- Risque sécurité: stocker des secrets probables localement sans confirmation.
  - Mitigation: classification sensible dans le domaine et refus store si confirmation absente.
- Risque données: le store local futur peut perdre des items si on choisit in-memory.
  - Mitigation: accepter in-memory uniquement pour preuve courte; persistance locale nécessite décision séparée.
- Risque spec existante: la spec Android IME est déjà ready mais contient des hypothèses Supabase directes.
  - Mitigation: tâche dédiée d'alignement avant reprise Android/IME.
- Risque docs: docs techniques sont en statut draft.
  - Mitigation: update ciblé pendant ce chantier, audit complet plus tard.

# Execution Notes

Lire d'abord:

- `lib/features/clipboard/application/clipboard_history_api.dart`
- `lib/features/clipboard/domain/clipboard_store.dart`
- `lib/features/clipboard/domain/clipboard_capture_event.dart`
- `lib/features/clipboard/domain/clipboard_normalizer.dart`
- `lib/data/supabase/clipboard_repository.dart`
- `lib/features/clipboard/presentation/clipboard_screen.dart`
- `shipglows_data/workflow/specs/android-ime-winglowz_app-keyboard.md`
- `docs/explorations/2026-05-05-backend-provider-pause-risk.md`

Approche:

1. Garder les opérations métier dans `ClipboardHistoryApi`.
2. Garder les modèles et règles de sécurité dans `domain`.
3. Ajouter les stores dans `features/clipboard/data` ou `data/<provider>` selon leur nature.
4. Garder les providers Riverpod comme composition root, pas comme logique métier.
5. Avant Android/IME, choisir si la première queue locale est in-memory ou persistante.
6. Ne pas ajouter de package local DB sans décision explicite.
7. Ne pas appliquer de migration Supabase réelle dans ce chantier.

Stop conditions:

- Besoin d'une persistance locale durable sans choix de technologie.
- Besoin de choisir le backend cloud final.
- Tentation d'ajouter un import Supabase dans UI, API ou natif Android.
- Sensibilité/secret sans confirmation ou sans comportement d'erreur.
- Raccord Android qui dépend d'un cycle de vie Flutter non prouvé depuis l'IME.

# Open Questions

None.

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-08 17:48:07 UTC | sf-build | GPT-5 Codex | Created backend-agnostic clipboard API chantier from user decision and current reconciliation work | reviewed | /sf-ready shipglows_data/workflow/specs/clipboard-backend-agnostic-api.md |
| 2026-05-08 17:48:07 UTC | sf-ready | GPT-5 Codex | Checked required sections, user-story fit, security/data constraints, docs impact, tasks and acceptance criteria | ready | /sf-start shipglows_data/workflow/specs/clipboard-backend-agnostic-api.md |
| 2026-05-08 17:57:25 UTC | sf-start | GPT-5 Codex | Added in-memory clipboard store fallback and aligned technical docs plus Android IME spec around backend-agnostic API/store ownership | partial | /sf-start shipglows_data/workflow/specs/clipboard-backend-agnostic-api.md task 6 |
| 2026-05-08 17:57:25 UTC | sf-verify | GPT-5 Codex | Ran Dart format, Flutter analyze, Flutter tests and diff whitespace check for the backend-agnostic clipboard API/store work | partial: local checks pass; Android/IME bridge and live Supabase validation remain pending | /sf-start shipglows_data/workflow/specs/clipboard-backend-agnostic-api.md task 6 |
| 2026-05-08 19:22:40 UTC | sf-start | GPT-5 Codex | Implemented native in-memory keyboard clipboard event queue, MethodChannel drain, Flutter importer, clipboard screen drain, and tests for backend-agnostic IME clipboard events | implemented | /sf-verify shipglows_data/workflow/specs/clipboard-backend-agnostic-api.md |
| 2026-05-08 19:22:40 UTC | sf-verify | GPT-5 Codex | Ran Dart format, Flutter analyze, Flutter tests, Android debug build attempt and diff whitespace check | partial: Flutter checks pass; Android build blocked by missing Android SDK/ANDROID_HOME and device QA remains pending | /sf-test Android IME clipboard bridge on Android SDK/device |
| 2026-05-24 11:20:01 UTC | sf-build | GPT-5 Codex | Added secure persistent local clipboard history, search, copy action, docs alignment and tests for local fallback durability | implemented: Flutter checks pass; Android physical-device QA still pending | /sf-test Android IME clipboard bridge on Android SDK/device |
| 2026-05-24 19:14:50 UTC | sf-build | GPT-5 Codex | Removed clipboardSyncDesired gating from IME history capture and persisted the native drain queue for authorized keyboard copy/cut/paste events | implemented: Flutter checks pass; Android CI/device validation still pending | /sf-test Android IME clipboard bridge on Android SDK/device |
| 2026-05-24 19:29:37 UTC | sf-build | GPT-5 Codex | Added default-off advanced opt-in for IME clipboard history in sensitive fields while keeping strict privacy, voice, snippets and learning blocked | implemented: Flutter checks pass; Android CI/device validation still pending | /sf-test Android IME clipboard bridge on Android SDK/device |

# Current Chantier Flow

sf-spec ✅ -> sf-ready ✅ -> sf-start ✅ -> sf-verify ✅ -> sf-end partial -> sf-ship ⏳
