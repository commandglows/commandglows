---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-29"
created_at: "2026-05-29 12:58:30 UTC"
updated: "2026-05-29"
updated_at: "2026-05-29 14:44:54 UTC"
status: ready
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "feature / audit-fix"
owner: "Diane"
user_story: "En tant qu'utilisateur WinGlows, je veux être guidé après connexion cloud et voir l'état réel de synchronisation de chaque type de donnée, afin de savoir ce qui est local, en attente, synchronisé ou en erreur sans confondre compte connecté et données synchronisées."
confidence: high
risk_level: high
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "winglowz_app"
  - "WinGlows Flutter settings"
  - "Firebase Auth"
  - "Firestore"
  - "Suite identity / entitlements"
  - "Android keyboard IME"
  - "SocialGlowz reference UX"
depends_on:
  - artifact: "winglowz_app/docs/DECISIONS.md"
    artifact_version: "1.0.1"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/architecture.md"
    artifact_version: "1.0.1"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/guidelines.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/business/product.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/workflow/specs/unified-suite-authentication.md"
    artifact_version: "1.0.25"
    required_status: "active"
  - artifact: "shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md"
    artifact_version: "1.0.0"
    required_status: "ready"
supersedes: []
evidence:
  - "User request 2026-05-29: s'inspirer de SocialGlowz pour l'UX de sync compte cloud et guider l'utilisateur de la meme maniere."
  - "Audit 2026-05-29: WinGlows expose Compte & cloud, mais le vrai panneau de sync clavier est dans Maintenance et diagnostics."
  - "winglowz_app/lib/features/settings/presentation/settings_screen_sections.dart:53: copy vague sur les donnees compatibles cloud."
  - "winglowz_app/lib/features/settings/presentation/settings_screen.dart:1342: KeyboardSyncPanel place dans Maintenance et diagnostics."
  - "winglowz_app/lib/features/keyboard/presentation/keyboard_sync_panel.dart:253: etats clavier synced/pending/failed/conflict deja disponibles."
  - "winglowz_app/lib/features/clipboard/application/clipboard_store_provider.dart:19: routage local/Firebase selon session + entitlement sans statut UX global."
  - "/home/claude/socialglowz/src/ui/setup/pages/SocialGlowz/components/MobileSettingsSheet.vue:34: compte, statut, infos sync, auth et backup sont regroupes dans le meme flux."
  - "/home/claude/socialglowz/src/lib/postAuthSyncFeedback.ts:3: etapes post-auth waitingServer/dataReceived/dataApplied/restarting/ready."
  - "/home/claude/socialglowz/src/lib/cloudSync.ts:509: hydration cloud avec application/seed explicite avant retour utilisateur."
  - "Firebase official docs checked 2026-05-29: Firestore supports offline persistence, local writes, realtime listeners, and metadata fromCache for cache/server state."
next_step: "/sf-start shipglows_data/workflow/specs/guidage-compte-cloud-winglowz-socialglowz-parity.md"
---

# Title

Guidage compte cloud WinGlows et parité UX SocialGlowz

# Status

Ready for `/sf-start`. Le périmètre est limité à l'app Flutter et à l'UX de vérité de synchronisation; aucune migration fournisseur, règle Firestore ou refonte complète des stores n'est incluse sans nouvelle spec.

# User Story

En tant qu'utilisateur WinGlows, je veux être guidé après connexion cloud et voir l'état réel de synchronisation de chaque type de donnée, afin de savoir ce qui est local, en attente, synchronisé ou en erreur sans confondre compte connecté et données synchronisées.

Acteur principal: utilisateur WinGlows Android/Flutter qui utilise le mode local puis connecte un compte cloud.

Acteurs secondaires:

- utilisateur déjà connecté qui revient dans les réglages;
- utilisateur sans entitlement WinGlows App;
- utilisateur hors ligne ou avec Firebase indisponible;
- opérateur support qui lit un diagnostic redigé;
- Diane qui valide l'expérience sur web/Vercel et APK physique quand nécessaire.

Déclencheurs:

- ouverture de `Settings > Compte & cloud`;
- connexion ou création de compte cloud depuis le mode local;
- changement de session, entitlement ou `global_user_id`;
- modification locale d'une donnée éligible à la synchronisation;
- échec Firebase/Firestore, conflit de profil clavier ou file de sync en attente.

Résultat observable attendu: l'écran Compte & cloud devient l'autoroute principale de synchronisation. Il explique ce qui est synchronisé, ce qui ne l'est pas, l'état réel par catégorie, et guide l'utilisateur après auth jusqu'à un état clair: prêt, local uniquement, en attente, erreur ou conflit.

# Minimal Behavior Contract

WinGlows accepte une session locale ou cloud, puis affiche séparément l'état du compte, l'accès suite et la synchronisation des données. Une connexion cloud réussie ne suffit jamais à afficher "données synchronisées"; l'app doit calculer et présenter l'état par catégorie. Quand la synchronisation est disponible, l'utilisateur voit les étapes post-auth et les données concernées avant que l'app affirme que le cloud est prêt. Quand une catégorie reste locale, en attente, non disponible, en erreur ou en conflit, l'UI le dit explicitement et propose l'action récupérable appropriée. L'edge case facile à rater est le profil clavier: il a déjà sa logique de conflit, mais il ne doit pas être traité comme le statut global de toutes les données cloud.

# Success Behavior

- Given un utilisateur est en mode local, when il ouvre Compte & cloud, then il voit "Mode local" avec une explication des données qui restent locales et le CTA de connexion cloud.
- Given un utilisateur se connecte au cloud, when l'auth réussit, then WinGlows affiche un feedback post-auth inspiré de SocialGlowz: vérification du compte, récupération cloud, application/queue des données, prêt ou action requise.
- Given Firebase, entitlement et suite identity sont valides, when les stores distants sont actifs, then la carte de rendement affiche chaque catégorie compatible cloud comme synchronisée, en attente ou en erreur selon l'état réel disponible.
- Given une catégorie n'a pas encore de statut instrumenté, when elle apparaît dans le rendement, then elle ne peut pas être marquée "synchronisée"; elle doit être "statut non encore mesuré" ou rester hors scope de la première tranche.
- Given le profil clavier diverge entre téléphone et cloud, when l'utilisateur consulte Compte & cloud, then le conflit est visible dans l'autoroute principale et les actions "Garder ce téléphone", "Utiliser le cloud" et "Exporter avant remplacement" restent disponibles.
- Given un utilisateur n'a pas l'entitlement WinGlows App, when il est authentifié, then l'écran indique compte reconnu mais sync WinGlows inactive, sans promettre de sauvegarde cloud.
- Given Firestore est indisponible ou hors ligne, when une mutation locale est enregistrée, then l'UI indique en attente/retry ou local uniquement sans perte de texte ni faux succès.

# Error Behavior

- Auth distante non configurée: afficher une section cloud indisponible, désactiver le CTA de connexion, garder le mode local explicite.
- Session Firebase présente mais suite identity absente ou sans entitlement: afficher compte connecté, accès WinGlows non actif, sync distante inactive.
- Firestore ou store distant indisponible: afficher "Synchronisation indisponible" avec retry et diagnostic redigé; ne pas remplacer des données locales par un état vide.
- Queue locale non vide: afficher "En attente d'envoi" avec le type de donnée concerné; ne pas afficher "Tout est synchronisé".
- Conflit clavier: bloquer l'écrasement silencieux et conserver les actions existantes.
- Changement de compte: purger/ignorer les queues de l'ancien compte selon les contrats existants et afficher que la sync est recalculée pour le nouveau compte.
- Web/non-Android: ne pas promettre l'IME ou le profil clavier Android; afficher non disponible par plateforme.

# Problem

WinGlows a déjà des briques techniques de synchronisation, mais elles sont dispersées. `Compte & cloud` expose surtout l'état de connexion, tandis que le panneau de sync clavier est relégué dans `Maintenance et diagnostics`. Les stores basculent entre local et Firebase selon session + entitlement, mais il n'existe pas de synthèse utilisateur qui transforme ce routage en vérité produit.

SocialGlowz donne un meilleur modèle UX: compte, statut, explication des données synchronisées, limites, formulaire d'auth et backup sont dans un même flux. Il possède aussi un feedback post-auth en étapes (`waitingServer`, `dataReceived`, `dataApplied`, `ready`) qui évite de rendre la main avant que l'utilisateur comprenne l'état de ses données.

Le risque produit est élevé: si WinGlows dit "compte connecté" sans montrer le rendement réel, l'utilisateur peut croire que son clipboard, ses snippets, son dictionnaire, ses transcriptions, ses réglages et son profil clavier sont synchronisés alors que certains restent locaux, en attente, non instrumentés ou en erreur.

# Solution

Créer une autoroute "Compte & synchronisation" dans les réglages Flutter. Cette surface regroupe la connexion cloud, le feedback post-auth, l'explication des données synchronisées/non synchronisées, le rendement par catégorie et les actions de récupération.

La première tranche doit rester backend-agnostic côté UI: elle lit les providers et contrats existants, ajoute un modèle de statut cloud agrégé, réutilise `KeyboardSyncPanel` ou ses états dans la section Compte & cloud, et évite de promettre une synchronisation non mesurée.

# Scope In

- Renommer ou renforcer la section `Compte & cloud` en surface de guidage principale.
- Ajouter un modèle Flutter de rendement cloud, par exemple `CloudSyncOverview` / `CloudSyncCategoryStatus`, couvrant au minimum:
  - Compte;
  - Accès suite;
  - Réglages/Apparence;
  - Clipboard;
  - Snippets;
  - Dictionnaire;
  - Transcriptions;
  - Profil clavier Android.
- Afficher les états UX:
  - local uniquement;
  - non configuré;
  - compte connecté;
  - accès inactif;
  - vérification en cours;
  - en attente;
  - synchronisation en cours;
  - synchronisé;
  - erreur récupérable;
  - conflit/action requise;
  - non disponible sur cette plateforme.
- Ajouter un feedback post-auth dans le flux `SignInScreen(remoteOnly: true)` ou dans le retour settings:
  - compte vérifié;
  - accès suite vérifié;
  - données cloud inspectées;
  - données appliquées/queue en attente;
  - prêt ou action requise.
- Déplacer ou refléter le profil clavier depuis Maintenance vers Compte & cloud pour que le conflit soit visible sur l'autoroute principale.
- Ajouter une zone "Ce qui est synchronisé" / "Ce qui reste local" inspirée de SocialGlowz:
  - synchronisé: catégories réellement supportées par les stores distants actifs;
  - local-only: clés IA locales, secrets, données non supportées ou plateforme non compatible;
  - limites: le profil clavier est Android-only; les secrets BYOK ne sont jamais envoyés au cloud.
- Garder les diagnostics backend dans Maintenance, mais ne pas dépendre du diagnostic brut pour l'UX principale.
- Ajouter des tests widget ciblés sur les états de guidage et de rendement.

# Scope Out

- Pas de migration fournisseur ou remplacement Firebase.
- Pas de changement des règles Firestore sauf si `/sf-ready` découvre qu'un statut requis ne peut pas être prouvé sans règle/index supplémentaire.
- Pas de refonte complète des stores clipboard/snippets/dictionary/transcription.
- Pas de promesse de synchronisation web/non-Android pour l'IME.
- Pas de synchronisation des clés OpenAI/Anthropic, tokens, cookies, secrets ou contenu explicitement local-only.
- Pas de validation APK locale: les builds Android restent interdits sur cette VM; la validation native passe par Blacksmith/GitHub Actions et Diane.

# Constraints

- Respecter `docs/DECISIONS.md`: Firebase Auth + Firestore restent l'adaptateur remote de l'app, Clerk reste seulement identité suite via bridge.
- Respecter les guardrails locaux: pas de build Android, pas de Gradle local.
- La vérité UX doit venir de l'état réel ou d'un statut explicitement "non mesuré"; jamais d'un wording optimiste.
- Le statut compte, entitlement et données sont séparés.
- Les secrets BYOK restent local-only et ne doivent pas être listés comme synchronisés.
- Les données sensibles ne doivent pas apparaître dans les diagnostics copiables, screenshots ou textes de support.
- Les textes utilisateur restent en français naturel et accentué.
- Les composants doivent rester cohérents avec le design Flutter existant (`AppSectionCard`, `AppStatusCard`, `AppBannerCard`, Material icons).

# Test Contract

surface: Flutter app, Riverpod providers, Firebase Auth/Firestore adapters, Android IME bridge, shared web/Android UI.

proof_profile: automated widget/unit coverage first, then Flutter static/test checks, then web smoke, then Android device proof only if native IME/bridge behavior changes.

proof_order:

1. Unit tests for `CloudSyncOverview` / `CloudSyncCategoryStatus` mapping.
2. Widget tests du flux local -> connexion cloud -> feedback post-auth -> retour Compte & synchronisation.
3. Widget tests des états signed out, local fallback, signed in sans entitlement, signed in avec entitlement, erreur, pending, conflit clavier.
4. `flutter analyze`.
5. `flutter test`.
6. Smoke Vercel web for text wrapping and non-Android states.
7. Blacksmith/GitHub Actions and Diane physical-device QA only if native Android behavior changes.

checklist_path: `shipglows_data/workflow/test-checklists/guidage-compte-cloud-winglowz-socialglowz-parity.md`.

required_scenario_ids:

- `cloud-sync-local-mode`
- `cloud-sync-remote-not-configured`
- `cloud-sync-post-auth-feedback`
- `cloud-sync-no-entitlement`
- `cloud-sync-entitled-active`
- `cloud-sync-pending-queue`
- `cloud-sync-error-retry`
- `cloud-sync-keyboard-conflict`
- `cloud-sync-non-android`
- `cloud-sync-local-only-secrets`

required_results:

- chaque scénario montre un état utilisateur observable;
- aucune catégorie non mesurée ne peut afficher `synchronisé`;
- les erreurs restent récupérables et redigées;
- les conflits clavier restent non destructifs;
- les secrets BYOK restent local-only;
- aucun build Android/Gradle local n'est exécuté.

exception_with_proof:

- `Blacksmith/GitHub Actions` et QA appareil peuvent être marqués non requis seulement si l'implémentation ne touche ni `AndroidKeyboardBridge`, ni Kotlin IME, ni capture clipboard clavier, et si les widget tests prouvent les états non-Android.

exception_without_proof:

- aucune exception sans preuve n'est acceptée pour `flutter analyze`, `flutter test`, ou l'absence de faux état `synchronisé`.

Preuve automatisée disponible:

- widget tests pour `SettingsScreen`, `SignInScreen(remoteOnly: true)` et la nouvelle surface de rendement cloud;
- tests unitaires du modèle de statut agrégé;
- tests existants `keyboard_sync_panel_test.dart`, `keyboard_sync_controller_test.dart`, `keyboard_sync_queue_test.dart`;
- `flutter analyze`;
- `flutter test`.

Preuve non automatisée requise:

- smoke Vercel Flutter web pour vérifier que les textes, wrapping et états non-Android restent lisibles;
- QA APK physique par Diane uniquement si l'implémentation touche le profil clavier natif, le bridge Android ou la capture clipboard clavier.

# Dependencies

- `flutter_riverpod` pour agréger les providers de session, suite identity, settings, stores et clavier.
- `firebase_auth` et `cloud_firestore` via les adapters existants.
- `FirebaseBootstrap` et `remoteAuthConfiguredProvider` pour l'état provider.
- `KeyboardSyncController`, `KeyboardSyncAuthContext`, `KeyboardSyncPanel` et queue clavier existants.
- Stores existants:
  - `settingsStoreProvider`;
  - `clipboardStoreProvider`;
  - `snippetStoreProvider`;
  - `dictionaryStoreProvider`;
  - `transcriptionStoreProvider`.
- Documentation fraîche:
  - Firebase Auth Flutter docs: https://firebase.google.com/docs/auth/flutter/start and https://firebase.google.com/docs/auth/flutter/manage-users.
  - Cloud Firestore docs: https://firebase.google.com/docs/firestore and https://firebase.google.com/docs/firestore/manage-data/enable-offline.
  - Local versions checked 2026-05-29: `firebase_auth` 6.4.0, `cloud_firestore` 6.3.0, `flutter_riverpod` 3.3.1.
  - Verdict 2026-05-29: `fresh-docs checked` for the spec direction. Firebase Auth documents `userChanges()` and token refresh behavior; Firestore documents offline cache, local writes/listeners, later backend sync, and `SnapshotMetadata.fromCache` for cache/server visibility. Implementation must still re-check official docs if it changes adapter behavior, offline cache configuration, or security rules.

# Invariants

- "Compte cloud connecté" ne signifie pas "données synchronisées".
- Une catégorie n'est "synchronisée" que si son store distant est actif, son dernier état est connu et aucune queue/erreur pertinente n'est visible.
- Une catégorie sans preuve de statut ne peut pas être affichée comme OK.
- Les conflits clavier restent non destructifs jusqu'à décision utilisateur.
- Une session locale de secours conserve l'expérience locale sans envoyer de données.
- Les diagnostics restent redigés.
- Les secrets utilisateur ne sont jamais synchronisés.

# Links & Consequences

- `winglowz_app/lib/features/settings/presentation/settings_screen.dart`: réordonner ou enrichir les sections; Compte & cloud devient l'autoroute principale.
- `winglowz_app/lib/features/settings/presentation/settings_screen_sections.dart`: ajouter la surface de rendement et la copie "ce qui sync / ce qui reste local".
- `winglowz_app/lib/features/auth/presentation/sign_in_screen.dart`: ajouter ou exposer un feedback post-auth pour `remoteOnly`.
- `winglowz_app/lib/features/keyboard/presentation/keyboard_sync_panel.dart`: réutiliser/déplacer l'état clavier sans casser les tests existants.
- `winglowz_app/lib/core/sync/sync_status.dart`: étendre ou compléter le vocabulaire si nécessaire.
- `winglowz_app/test/widget_test.dart`, `test/sign_in_screen_test.dart`, `test/keyboard_sync_panel_test.dart`: mettre à jour les assertions UX.
- Risque support réduit: l'utilisateur voit les limites sans copier un diagnostic backend.
- Risque produit: toute fausse promesse de sync détruit la confiance; les statuts doivent être conservateurs.

# Documentation Coherence

- Mettre à jour `docs/DECISIONS.md` seulement si une nouvelle décision provider/scope est prise; cette spec ne demande pas ce changement.
- Mettre à jour `docs/PLATFORM_BEHAVIOR.md` si la liste "cloud/local-only" devient contractuelle pour clipboard, clavier ou web.
- Mettre à jour `docs/VERIFICATION.md` ou un checklist sous `shipglows_data/workflow/test-checklists/` si une QA manuelle de l'autoroute cloud devient récurrente.
- Ajouter une entrée changelog quand l'implémentation shippe.
- Ne pas mettre de secrets ou d'exemples d'identifiants réels dans les docs.

# Edge Cases

- Firebase configuré mais session encore en chargement.
- Session Firebase signée mais `suiteIdentityProvider` en erreur.
- Entitlement absent, expiré ou inconnu.
- Firestore offline avec cache local.
- Queue locale prête mais flush échoue.
- Profil clavier local propre + profil cloud existant.
- Profil clavier local personnalisé + profil cloud divergent.
- Changement de compte avec queue précédente.
- Non-Android/web: clavier indisponible.
- Auth remote réussie mais retour settings sans refresh de providers.
- Texte long en français dans boutons/cartes sur petit écran.
- Erreur provider avec détail technique redigé.

# Implementation Tasks

1. `lib/core/sync/sync_status.dart` ou nouveau `lib/core/sync/cloud_sync_overview.dart`: définir les enums et DTOs du rendement cloud global, avec catégorie, état, titre, détail, sévérité, action suggérée et timestamp optionnel.
2. `lib/features/settings/application/` nouveau provider: agréger `authSessionProvider`, `suiteIdentityProvider`, `remoteAuthConfiguredProvider`, `FirebaseBootstrap`, les providers de stores et le statut clavier en `CloudSyncOverview`.
3. `lib/features/keyboard/presentation/keyboard_sync_panel.dart`: extraire si nécessaire une carte/presenter réutilisable pour afficher l'état clavier dans Compte & cloud sans dupliquer la logique de conflit.
4. `lib/features/settings/presentation/settings_screen_sections.dart`: remplacer `_AccountCloudSection` par une section Compte & synchronisation avec statut compte, CTA auth/sign-out, rendement par catégorie, et bloc "ce qui est synchronisé / ce qui reste local".
5. `lib/features/settings/presentation/settings_screen.dart`: déplacer ou refléter le panneau clavier hors de Maintenance pour qu'il apparaisse dans l'autoroute compte; garder BackendProvider dans Maintenance.
6. `lib/features/auth/presentation/sign_in_screen.dart`: ajouter le feedback post-auth pour `remoteOnly` ou fournir un état transitoire dans Settings après retour auth.
7. Tests widget: couvrir local-only, remote non configuré, signed in avec entitlement, signed in sans entitlement, post-auth feedback, pending queue, failed sync, conflit clavier, plateforme non Android.
8. Tests unitaires: valider le mapping provider/store -> statut UX, notamment qu'un statut inconnu ne peut pas devenir `synced`.
9. `shipglows_data/workflow/test-checklists/guidage-compte-cloud-winglowz-socialglowz-parity.md`: créer la checklist manuelle si un smoke web ou une QA appareil est nécessaire dans l'implémentation.
10. Docs/changelog: documenter la nouvelle vérité UX et les limites local-only.

# Acceptance Criteria

- [ ] Given mode local, when Compte & synchronisation s'ouvre, then l'utilisateur voit clairement que les données restent locales et comment connecter le cloud.
- [ ] Given auth remote réussie, when l'utilisateur revient aux settings, then un feedback indique au moins vérification compte, vérification accès, inspection sync et résultat final.
- [ ] Given compte connecté sans entitlement, then l'écran ne promet aucune sauvegarde WinGlows cloud et affiche l'accès inactif.
- [ ] Given stores distants actifs, then les catégories réellement supportées peuvent afficher synchronisé.
- [ ] Given catégorie non instrumentée, then elle n'affiche jamais synchronisé.
- [ ] Given queue ou erreur de sync, then l'écran affiche en attente/erreur avec action de retry ou diagnostic redigé.
- [ ] Given conflit clavier, then il est visible dans Compte & synchronisation et aucune donnée n'est écrasée sans choix utilisateur.
- [ ] Given plateforme non Android, then le profil clavier indique non disponible sans casser le reste du rendement.
- [ ] Given clés IA locales, then elles sont listées comme local-only/exclues du cloud.
- [ ] `flutter analyze` passe.
- [ ] `flutter test` passe.
- [ ] Aucun build Android/Gradle local n'est exécuté.

# Test Strategy

- Ajouter des fakes/providers Riverpod pour simuler session, suite identity, Firebase configured, stores distants et clavier.
- Tester les textes utilisateur principaux avec assertions exactes pour éviter les promesses vagues.
- Tester les états longs en widget pour vérifier que les boutons/cartes restent lisibles.
- Réutiliser les tests clavier existants pour éviter une régression de conflit.
- Exécuter `flutter analyze` et `flutter test`.
- Smoke web sur Vercel après implémentation si l'UI est déployée.
- QA appareil Android uniquement si les tâches touchent `AndroidKeyboardBridge`, Kotlin IME ou comportements natifs.

# Risks

- High: fausse promesse de synchronisation si le statut global est trop optimiste.
- High: confusion sécurité si compte connecté, entitlement et data sync sont fusionnés visuellement.
- Medium: duplication de logique clavier si `KeyboardSyncPanel` n'est pas factorisé proprement.
- Medium: tests fragiles si les providers Firebase réels sont appelés dans les widget tests.
- Medium: dette UX si la première tranche affiche trop de catégories "non mesuré"; mieux vaut conservateur que trompeur.
- Low: copy trop longue sur mobile; prévoir wrapping et textes compacts.

# Execution Notes

- Inspiration SocialGlowz à conserver:
  - une seule zone compte + sync;
  - statut connecté/non connecté visible;
  - bouton "plus d'infos" ou équivalent pour expliquer les données concernées;
  - limites explicites;
  - feedback post-auth avant état prêt.
- Différence WinGlows:
  - Flutter/Riverpod au lieu de Vue/Convex;
  - Firebase + suite identity + entitlement;
  - profil clavier Android natif avec conflits.
- Ne pas importer l'architecture SocialGlowz telle quelle; reprendre le guidage et la clarté utilisateur.
- `fresh-docs checked` le 2026-05-29 pour Firebase Auth/Firestore. L'implémentation doit refaire une vérification ciblée si elle modifie le comportement d'adapter, d'offline cache ou de security rules.
- Fichiers à lire d'abord avant code: `settings_screen.dart`, `settings_screen_sections.dart`, `sign_in_screen.dart`, `keyboard_sync_panel.dart`, `keyboard_sync_controller.dart`, `keyboard_sync_providers.dart`, `sync_status.dart`, puis les providers de stores clipboard/snippets/dictionary/transcription/settings.
- Patterns à conserver: Riverpod providers testables, composants existants `AppSectionCard` / `AppStatusCard` / `AppBannerCard`, textes français naturels, états conservateurs.
- Abstractions à éviter: un singleton global mutable de sync, un statut global `synced` dérivé seulement de `isSignedIn`, une dépendance directe des widgets aux instances Firebase réelles dans les tests.
- Commandes de validation: `flutter analyze`, `flutter test`; pas de Gradle ni build Android local.
- Stop conditions: un statut de catégorie ne peut pas être calculé sans preuve; une décision de migration provider apparaît; une règle Firestore/security rule doit changer; un secret ou contenu sensible serait exposé dans l'UI ou les diagnostics.
- Security impact: yes, mitigated by separating compte, entitlement et sync data, refusing optimistic sync states, keeping BYOK secrets local-only, redacting diagnostics, and relying on existing backend/store authorization instead of UI claims.

# Open Questions

None. Décisions readiness:

- Afficher toutes les catégories importantes dans le rendement initial, mais marquer `statut en cours de mesure` ou équivalent conservateur quand la preuve manque; ne jamais afficher `synchronisé` sans preuve.
- Utiliser une bannière persistante non destructive dans Settings après retour auth, avec overlay/loader uniquement pendant l'opération immédiate de connexion.

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-29 12:58:30 UTC | sf-spec | GPT-5 Codex | Created spec from UX audit and user request for SocialGlowz-style cloud account sync guidance. | Draft spec created. | /sf-ready shipglows_data/workflow/specs/guidage-compte-cloud-winglowz-socialglowz-parity.md |
| 2026-05-29 14:44:54 UTC | sf-ready | GPT-5 Codex | Validated readiness, resolved open decisions, strengthened test contract and security/execution notes. | ready | /sf-start shipglows_data/workflow/specs/guidage-compte-cloud-winglowz-socialglowz-parity.md |
| 2026-05-29 22:19:59 UTC | sf-start | GPT-5 Codex | Implemented the Flutter settings/mainline cloud-sync UX tranche: overview provider/model, account/sync section rewrite, post-auth feedback, and targeted widget/unit tests. | implemented | /sf-verify shipglows_data/workflow/specs/guidage-compte-cloud-winglowz-socialglowz-parity.md |
| 2026-05-29 22:55:47 UTC | sf-verify | GPT-5 Codex | Verified implementation against the spec, reran local analyze/tests and metadata lint, and checked proof gaps. | partial | Vercel Flutter web smoke remains required before clean ship-readiness. |
| 2026-05-29 23:24:54 UTC | sf-browser | GPT-5 Codex | Ran local Flutter Web browser smoke on the current dirty workspace with Chromium/CDP screenshots and console capture. | pass | /sf-verify can reclassify local web proof; deployed Vercel proof still pending until ship/prod. |

# Current Chantier Flow

| Step | Status | Notes |
|------|--------|-------|
| sf-spec | done | Spec created from audit intake. |
| sf-ready | done | Ready after resolving open decisions and proof contract. |
| sf-start | done | Implemented the Flutter UX and tests for account cloud synthesis, post-auth feedback, and sync overview. |
| sf-verify | partial | Local automated verification and local Flutter Web browser smoke passed; deployed Vercel proof remains before clean ship-readiness. |
| sf-end | pending | Close tracking and changelog after implementation. |
| sf-ship | pending | Ship only after checks and required web/device proof. |
