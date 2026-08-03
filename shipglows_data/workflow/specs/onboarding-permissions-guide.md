---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-11"
created_at: "2026-05-11 00:00:00 UTC"
updated: "2026-05-13"
updated_at: "2026-05-13 17:29:40 UTC"
status: ready
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "feature"
owner: "WinGlows Team"
confidence: medium
user_story: "En tant qu'utilisateur Android, je veux être guidé pour activer les permissions nécessaires afin de configurer WinGlowz sans erreur."
risk_level: "medium"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Flutter app shell / settings"
  - "Android permissions"
  - "Android overlay service"
  - "Android input method service"
  - "Speech/microphone pipeline"
  - "Settings / intent bridge"
depends_on:
  - artifact: "shipglows_data/technical/guidelines.md"
    artifact_version: "0.1.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/context.md"
    artifact_version: "1.1.0"
    required_status: "reviewed"
  - artifact: "docs/OVERLAY_ANDROID.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "docs/PLATFORM_BEHAVIOR.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "lib/features/shell/presentation/app_shell_screen.dart"
    artifact_version: "worktree"
    required_status: "active"
  - artifact: "lib/features/settings/presentation/settings_screen.dart"
    artifact_version: "worktree"
    required_status: "active"
  - artifact: "lib/core/platform/android_overlay_bridge.dart"
    artifact_version: "worktree"
    required_status: "active"
  - artifact: "android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt"
    artifact_version: "worktree"
    required_status: "active"
  - artifact: "lib/core/platform/android_keyboard_bridge.dart"
    artifact_version: "worktree"
    required_status: "active"
supersedes: []
evidence:
  - "Onboarding existing UX is static 3-step overlay text in `lib/features/shell/presentation/app_shell_screen.dart` and does not enforce per-permission completion."
  - "Permission and deep-link actions already exist in Android native bridge (overlay/input method/accessibility intents) via `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt` and are called from Flutter through `lib/core/platform/android_overlay_bridge.dart` and `lib/core/platform/android_keyboard_bridge.dart`."
  - "Settings currently exposes individual actions (open overlay/accessibility/input method settings, mic, enable/disable toggles) but no guided step-by-step state machine in `lib/features/settings/presentation/settings_screen.dart`."
  - "Keyboard and overlay status are already read from bridges (active/enabled/permission flags), so onboarding can be driven by live system state."
next_step: "/sf-start shipglows_data/workflow/specs/onboarding-permissions-guide.md"
permission_policy:
  mandatory:
    - overlay
    - keyboard_ime_active
  recommended:
    - accessibility
    - microphone_for_dictation
---

# Title

Guidage onboarding permissions Android pas-à-pas (overlay, accessibilité, clavier, microphone)

# Status

Spécification active: créer un onboarding guidé en 1 parcours linéaire et vérifiable, avec classification claire des permissions **obligatoires** vs **recommandées**, des explications métiers, et des liens directs vers Android.

# User Story

En tant qu'utilisateur Android, je veux un onboarding qui m'explique, étape par étape, quelles permissions activer, pourquoi elles sont nécessaires et où les trouver dans les réglages Android, afin de configurer WinGlows sans erreurs et d'utiliser l'application dans un mode prévisible.
Cet onboarding doit s'appliquer aux nouveaux comptes comme aux comptes déjà existants sur le même téléphone.

# Minimal Behavior Contract

Quand l'utilisateur ouvre WinGlows après installation, mise à jour, réinstallation partielle ou reprise d'un compte déjà existant, le système affiche un pas actif à la fois, lit l'état natif réel, propose le bon écran Android et marque le pas terminé uniquement quand la condition réelle est confirmée.
Le flux distingue clairement:
- **obligatoire**: overlay et clavier/IME actif (si l'utilisateur veut utiliser ces fonctions dans la session),
- **recommandé**: accessibilité (injection directe), microphone (dictée).
Si l'utilisateur revient d'Android sans changement, le flux reste sur le même pas avec guidance de reprise; aucune progression implicite n'a lieu.

# Success Behavior

- Given une première utilisation Android, une réinitialisation permissions partielle, ou un utilisateur ancien sans onboarding complété, when l'onboarding démarre, then une étape ciblée sur les permissions actives est visible avec:
  - raison d'usage concise,
  - état actuel obtenu du bridge,
  - boutons directs vers les écrans Android requis,
  - passage automatique à l'étape suivante seulement si l'état technique attendu est vrai.
- Given l'étape Clavier/IME, when WinGlows n'est pas actif comme clavier système, then le flux montre les deux actions: ouvrir `INPUT_METHOD_SETTINGS` puis sélectionner le clavier si nécessaire, et vérifie les deux booléens `enabled` et `active`.
- Given l'étape Accessibilité, when le service n'est pas actif, then l'écran affiche que cette autorisation est recommandée, explique son bénéfice, et propose une reprise via `ACTION_ACCESSIBILITY_SETTINGS`.
- Given l'utilisateur active la dictée vocale (clavier ou voix), when le micro est refusé, then onboarding affiche un bloc dédié avec la conséquence fonctionnelle (dictée indisponible), ouvre Android app settings pour la permission audio et ne poursuit la voie voix que si la permission passe en `granted`.
- Given toutes les étapes définies comme obligatoires pour le mode choisi sont complétées, when l'utilisateur confirme la fin, then l'onboarding se termine sur un écran de récapitulatif, stocke `onboarding_completed=true`, et affiche les recommandations restantes (micro/accessibilité) avec statut et chemins.
- Given un utilisateur ouvre `Settings` plus tard, when il appuie sur "Reprendre l'onboarding", then le flux reprend à la première étape non complétée et reste cohérent avec l'état actuel.

# Error Behavior

- If une permission reste refusée, then onboarding garde le focus sur cette étape, montre un message d'erreur sans wording technique ambigu, propose une action de secours (ouvrir le bon écran Android) et une option "plus tard" explicite.
- If une permission est marquée "granted" localement mais le bridge renvoie false, then l'UI affiche la contradiction, bloque la progression pour cette étape, et lance une relecture immédiate de l'état système.
- If l'utilisateur change de version Android/ OEM qui ne permet pas une permission ciblée, then le step affiche le statut "non supporté sur ce terminal" avec une alternative fonctionnelle minimale et continue sans demander d'autorisation impossible.
- If aucun chemin de réglage est disponible depuis le contexte OEM (intent rejeté), then le système logue un message non sensible, affiche une copie manuelle simple de navigation Android et propose une ré-attempt.
- If la fonction de retour automatique depuis les réglages échoue (pas de changement détecté), then le système n'applique pas de changement implicite, conserve l'étape et propose un timer d'actualisation.

# Problem

Le flux actuel d'onboarding est informatif mais trop statique: le même mini-overlay mélange activation clavier, superposition et accessibilité sans expliquer le but, sans expliciter les liens directs dans Réglages, et sans vérifier la complétion réelle avant de continuer.
Cela provoque des incompréhensions (permissions activées dans le mauvais écran), une activation incomplète de l'expérience et une réinstallation/reprise manuelle répétée, surtout chez les nouveaux utilisateurs Android.

# Solution

Mettre en place un assistant onboarding Android dédié, piloté par un état machine local (in-progress / step-complete / done / blocked), qui orchestre les permissions en ordre logique et affiche pour chacune:
- la justification métier,
- la preuve d'activation en temps réel depuis les bridges,
- le lien exact vers la page Android correspondante.

# Scope In

- Android uniquement pour la première version de ce chantier.
- Nouveau flux d'onboarding pas-à-pas dans l'UI shell et accessible depuis Settings.
- Étapes supportées par défaut:
  - superposition (overlay),
  - accessibilité,
  - clavier/IME (actif + actif par défaut si nécessaire),
  - microphone (optionnel: activé quand l'utilisateur demande la dictée).
- Onboarding déclenchable au premier démarrage après install/upgrade, à chaque création/liaison de compte, et relançable depuis Settings pour les profils existants.
- Ajout d'un modèle d'états d'onboarding (en mémoire + persisté localement) pour reprendre à la dernière étape non terminée.
- CTA direct par étape vers le bon écran Android avec libellés explicites.
- Affichage statut + “Pourquoi?” (impact réel: dictée, saisie assistée, boutons overlay, etc.).
- Étape finale de vérification + résumé + possibilité de sauter les actions optionnelles.
- Mise à jour copy/UI en cohérence onboarding + settings (français par défaut).
- Ajustements docs support et vérification (README + guides Android).

# Scope Out

- iOS/onboarding permissions pour iOS (aucune promesse d'écran équivalent).
- Gestion générale de toutes les permissions système non liées à l'existant (notifications, caméra, contacts, stockage).
- Refactoring architecture global: pas de changement de state management général.
- Changement de sécurité sous-jacent en dehors de l'orchestration d'onboarding.

# Constraints

- Le flux doit rester non bloquant: il doit expliquer et reprendre sans enfermer l'utilisateur s'il refuse une permission optionnelle.
- Toute copie doit être honnête: une permission refusée doit conserver une fonction partielle utilisable quand possible.
- L'onboarding ne doit pas stocker ni logger le contenu sensible ni l'état de la dictée.
- Ne pas supposer les permissions après retour d'intent; chaque validation doit re-querir l'état natif.
- Le parcours doit rester visible sur téléphone uniquement; sur autres plateformes, afficher un message de neutralité "pas de permissions Android requises".

# Dependencies

- Flutter 3.x / Dart 3.x / go_router / Riverpod stack existante.
- Bridges Android existants pour ouvrir les écrans système (`ACTION_MANAGE_OVERLAY_PERMISSION`, `ACTION_ACCESSIBILITY_SETTINGS`, `ACTION_INPUT_METHOD_SETTINGS`) + écran d'app Android (`ACTION_APPLICATION_DETAILS_SETTINGS`) pour l'autorisation microphone.
- Permissions runtime Android déjà utilisées (microphone si pipeline voix est actif), plus états clavier/overlay/ accessibilité exposés par bridges.
- Fresh external docs verdict: `fresh-docs not needed` pour cette version (comportement piloté par code existant dans la base et interfaces déjà implémentées).

# Invariants

- Une étape ne peut être marquée "terminée" que si l'état réel du système la confirme.
- Les étapes obligatoires par mode d'usage (overlay et clavier actif selon besoin) empêchent la dégradation complète des fonctions associées jusqu'à activation.
- Les options d'accessibilité et de micro sont recommandées: elles améliorent l'expérience, mais ne bloquent pas l'acheminement du flux si refusées.
- La sortie d'onboarding n'empêche jamais la navigation de l'application.
- Les changements de statut système sont polled/refetchés au retour des réglages et après chaque action.

# Links & Consequences

- `lib/features/shell/presentation/app_shell_screen.dart`: remplacer le mini-overlay actuel par un assistant stateful avec stepper et deep links.
- `lib/features/settings/presentation/settings_screen.dart`: ajouter un panneau "Reprendre l'onboarding" + résumés permission + badges d'état.
- `lib/features/settings/application/settings_store_provider.dart` et `lib/features/settings/domain/settings_store.dart`: persister la progression, le statut de première fois, et la source locale de complétion.
- `lib/core/platform/platform_capabilities.dart`: enrichir le modèle de capabilities pour `onboardingReadiness` et les raisons de blocage.
- `lib/core/platform/android_overlay_bridge.dart` + `lib/core/platform/android_keyboard_bridge.dart`: garantir des APIs de lecture fine de l'état permission + openSetting actions idempotentes.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`: exposer clairement le statut overlay/input method/accessibility et état `RECORD_AUDIO` dans un statut uniforme.
- `docs/OVERLAY_ANDROID.md`, `docs/PLATFORM_BEHAVIOR.md`, `README.md`: expliciter le parcours, les prérequis Android, et les parcours alternatifs partiels.
- `shipglows_data/workflow/specs/android-ime-winglowz_app-keyboard.md`: risque d'alignement entre onboarding clavier/overlay + permissions.

# Documentation Coherence

- `README.md` : aligner la section onboarding Android permissions avec le flux étape par étape, les actions de reprise et les cas de refus.
- `docs/OVERLAY_ANDROID.md` : ajouter les CTA exacts Android et la logique de vérification réelle par étape.
- `docs/PLATFORM_BEHAVIOR.md` : confirmer la portée Android-only et l'effet d'une permission manquante.
- `docs/VERIFICATION.md` : synchroniser la matrice QA avec les cas de reprise, de retour sans changement, et de révocation post-completion.
- `shipglows_data/workflow/specs/android-ime-winglowz_app-keyboard.md` : vérifier cohérence onboarding-clavier + modèle IME.
- Réviser les éventuelles captures/vidéos d'onboarding si elles restent utilisées comme source de support.

# Edge Cases

- Utilisateur saute l'onboarding, puis réouvre plus tard: reprise à l'étape non complétée.
- Retour d'un écran de réglages sans aucune modification: pas de passage forcé.
- Permission refusée définitivement (Don't ask again): offrir message "comment faire manuellement".
- OEM/ROM qui cache l'entrée service accessibility: afficher fallback de navigation.
- État incohérent entre permissions Flutter et bridge natif: prioriser bridge.
- Changement de langue locale pendant le flux: labels cohérents.
- Utilisateur en mode non connecté (no-auth): permissions fondamentales restent visibles mais texte d'usage adapté.
- Clavier déjà actif au premier lancement: l'étape clavier peut être précochée sans action additionnelle.
- Permissions désactivées après onboarding (révocation): proposer relance ciblée dans Settings.

# Implementation Tasks

- [ ] Tâche 1 : Définir le modèle de flow onboarding
  - Fichier : `lib/features/settings/domain/onboarding_permission_contract.dart`
  - Action : créer types d'étapes, transitions, raisons utilisateur et conditions de complétion basées sur des booléens de statut.
  - User story link : garantit une logique étape par étape compréhensible et testable.
  - Depends on : aucune.
  - Validate with : revue d'architecture locale.
  - Notes : conserver les libellés clés en français + clés de traduction futures.

- [ ] Tâche 2 : Ajouter persistance de progression d'onboarding
  - Fichier : `lib/features/settings/domain/settings_store.dart`, `lib/features/settings/application/settings_store_provider.dart`
  - Action : stocker `onboardingCompleted`, `onboardingCurrentStep`, `lastSeenStepAt`, et drapeaux d'activation par étape.
  - User story link : reprendre sans perdre le parcours.
  - Depends on : Tâche 1.
  - Validate with : test unitaire de migration local state.

- [ ] Tâche 3 : Construire l'assistant stepper dans `AppShell`
  - Fichier : `lib/features/shell/presentation/app_shell_screen.dart`
  - Action : remplacer l'overlay statique par un flux : titre, objectif, raison métier, bouton d'action settings, statut live, contrôle suivant/retry.
  - User story link : guide pas à pas et empêche la progression sans validation réelle.
  - Depends on : Tâche 1, Tâche 2.
  - Validate with : interaction manuelle Android + retour de permissions.
  - Notes : conserver l'accès rapide et prévoir fermeture partielle.

- [ ] Tâche 4 : Synchroniser l'état permissions avec les bridges existants
  - Fichier : `lib/core/platform/platform_capabilities.dart`, `lib/core/platform/android_overlay_bridge.dart`, `lib/core/platform/android_keyboard_bridge.dart`
  - Action : exposer une structure unifiée de permission states + méthodes `refreshOnboardingCapabilities()` et `isPermissionSatisfied(step)`.
  - User story link : évite les faux positifs de complétion.
  - Depends on : Tâche 3.
  - Validate with : test de parsing contract.

- [ ] Tâche 5 : Exposer les actions précises de réglages Android
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`
  - Action : garantir les intents pour chaque étape (`overlay`, `accessibility`, `input method`) et l'ouverture `ACTION_APPLICATION_DETAILS_SETTINGS`; exposer un statut booléen microphone (`recordAudioGranted`) dans le contrat natif.
  - User story link : réduit la friction de navigation pour l'utilisateur.
  - Depends on : Tâche 4.
  - Validate with : retour d'intent et détection de statut réel.

- [ ] Tâche 6 : Intégrer l'entrée manuelle depuis Settings
  - Fichier : `lib/features/settings/presentation/settings_screen.dart`
  - Action : ajouter un panneau "Terminer la configuration" avec status badges + progression + reprise d'étape actuelle.
  - User story link : utilisateur peut reprendre et valider les prérequis après usage initial.
  - Depends on : Tâche 2, Tâche 3.
  - Validate with : smoke navigation + vérification états.

- [ ] Tâche 7 : UX, copypaste et docs
  - Fichier : `README.md`, `docs/OVERLAY_ANDROID.md`, `docs/PLATFORM_BEHAVIOR.md`
  - Action : expliciter le chemin exact Android, le rôle de chaque permission et les fonctionnalités disponibles sans celle-ci.
  - User story link : réduit la confusion et supporte la première activation.
  - Depends on : Tâche 3, Tâche 6.
  - Validate with : revue de wording.

- [ ] Tâche 8 : Ajouter les scénarios de validation
  - Fichier : `docs/VERIFICATION.md`
  - Action : documenter une matrice manuelle: overlay, accessibilité, clavier, micro + revocation/redo.
  - User story link : vérifie que la promesse d'onboarding est vraiment observable.
  - Depends on : toutes les tâches techniques.
  - Validate with : checklist QA.

# Acceptance Criteria

- [ ] CA 1 : Given l'application est lancée sur Android pour la première fois, when l'écran principal s'ouvre, then l'onboarding démarre au premier écran d'autorisation requis et ne propose pas la configuration en mode silencieux.
- [ ] CA 2 : Given l'étape overlay, when l'utilisateur n'a pas la permission, then l'UI indique explicitement le besoin, un bouton ouvre les réglages overlay, et la step avance uniquement si overlay est bien accordé.
- [ ] CA 3 : Given l'étape accessibilité, when WinGlows n'est pas actif, then la solution de navigation mène directement aux réglages accessibilité et l'état se met à jour après retour.
- [ ] CA 4 : Given l'étape clavier, when le clavier WinGlows n'est pas activé, then l'interface propose les étapes exactes d'activation (services entrée + sélection clavier), et l'étape ne termine pas tant que le service n'est pas actif.
- [ ] CA 5 : Given l'utilisateur active la voix, when la permission microphone est refusée, then onboarding affiche la raison, propose l'écran Android requis, puis continue uniquement après acceptation.
- [ ] CA 6 : Given l'utilisateur retourne à l'application après un changement dans réglages, when il reste une étape bloquée, then l'onboarding repositionne le step courant sur cette étape.
- [ ] CA 7 : Given toutes les étapes critiques validées et l'utilisateur finalise, when il confirme, then le flag `onboarding_completed` est persistant et l'overlay ne bloque plus l'usage principal.
- [ ] CA 8 : Given l'onboarding est terminé, when une permission critique est révoquée plus tard, then la Settings propose une relance ciblée à cette étape.
- [ ] CA 9 : Given un terminal non compatible avec une étape (Android variant/OEM), when une action deep link échoue, then onboarding affiche un message utile et permet un guidage manuel sans crash.
- [ ] CA 10 : Given l'utilisateur choisit "plus tard", when il ferme l'app, then l'onboarding reprend à la même étape au redémarrage.

# Test Strategy

- Unit tests:
  - machine d'étapes (état + transitions + blocage)
  - fonctions de détermination de complétion et d'affichage
  - persistance onboarding settings locale
- Widget tests:
  - rendu stepper Android/non-Android
  - deep-link buttons + disabled states
  - reprise d'onboarding depuis Settings
- Manual QA:
  - Pixel + 1 OEM (si possible): validation des 4 catégories d'étapes
  - Révocation permission après completion puis reprise
  - Retour système sans changement d'autorisation
- Smoke commands (si incluses au flux projet) : format/analyze/build sans modifier plus de surfaces.

# Risks

- Risque de confiance: les écrans Android varient selon version/OEM; une mauvaise route pourrait casser l'onboarding.
- Risque de UX: afficher trop d'étapes ou bloquer le flux si une permission optionnelle reste refusée.
- Risque de privacy: libellé trop vague sur l'utilité des permissions pouvant induire en erreur.
- Risque d'état: désynchronisation entre status Flutter cache et status natif.
- Risque de régression: les chemins de réglage existants (settings screen) peuvent être dupliqués incohérents avec les nouveaux messages.

# Execution Notes

- Fichiers à lire d'abord:
  - `lib/features/shell/presentation/app_shell_screen.dart`
  - `lib/features/settings/presentation/settings_screen.dart`
  - `lib/core/platform/android_overlay_bridge.dart`
  - `lib/core/platform/android_keyboard_bridge.dart`
  - `lib/core/platform/platform_capabilities.dart`
  - `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`
- Ordre recommandé:
  1) Modèle + capacités (`platform_capabilities`, domain/store)
  2) Bridge contract unifié + API statut/action Android
  3) Stepper AppShell avec logique de progression
  4) Entrée Settings + reprise manuelle
  5) Docs + vérification
- Constraints:
  - éviter de demander des permissions inutiles
  - pas d'ajout de permissions Android non prévues dans ce scope
  - conserver la logique Android-only dans des chemins guardés par plateforme
- Stop conditions:
  - si l'intent d'accès accessibilité/overlay ne répond pas sur un OEM, créer un fallback manuel avant implémentation du reste.
  - si la complétion est ambiguë (État natif vs Flutter), figer une source d'arbitrage unique et ne pas avancer le flux.

# Open Questions
- Aucune: permissions classées `mandatory` (overlay + clavier selon usage) et `recommandées` (accessibilité, micro en mode dictée), et onboarding applicables aux comptes existants comme aux nouveaux.

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-11 00:00:00 UTC | sf-spec | GPT-5 Codex | Created guided onboarding permissions spec from user request and codebase scan. | Draft saved in `shipglows_data/workflow/specs/onboarding-permissions-guide.md`. | `/sf-ready shipglows_data/workflow/specs/onboarding-permissions-guide.md` |
| 2026-05-11 21:24:00 UTC | sf-spec | GPT-5 Codex | Reclassé les permissions en mandatory/recommandées et confirmé portée aux utilisateurs existants; aligné la spec avec les comportements Android observés (micro/IME/overlay/accessibilité). | Draft updated in `shipglows_data/workflow/specs/onboarding-permissions-guide.md`. | `/sf-ready shipglows_data/workflow/specs/onboarding-permissions-guide.md` |
| 2026-05-11 21:21:34 UTC | sf-ready | GPT-5 Codex | Review of readiness criteria and traceability gates. | Not ready: missing required `Documentation Coherence` section and unresolved `Open Questions` (blocking onboarding scope + optionality). | `/sf-spec onboarding-permissions-guide.md` |
| 2026-05-11 21:38:00 UTC | sf-ready | GPT-5 Codex | Readiness gate of the spec for user-story fit, completeness, adversarial and security adequacy, and traceability before implementation. | Ready. | `/sf-start shipglows_data/workflow/specs/onboarding-permissions-guide.md` |
| 2026-05-11 22:01:00 UTC | sf-start | GPT-5 Codex | Activated implementation for guided onboarding: stepper rewrite in app shell and onboarding tile in settings planned. | In_progress. | `/sf-spec onboarding-permissions-guide.md` |
| 2026-05-13 17:29:40 UTC | sf-verify | GPT-5 Codex | Verified implementation against spec: stepper + resume flows are present; platform contracts and persistence wired; docs proof and dependency/version drift still pending; open fix-attempted high-severity overlay bug remains. | Partial. | `/sf-end shipglows_data/workflow/specs/onboarding-permissions-guide.md` |

# Current Chantier Flow

- sf-spec: done
- sf-ready: done
- sf-start: done
- sf-verify: partial
- sf-end: not launched
- sf-ship: not launched

Next lifecycle command: `/sf-end shipglows_data/workflow/specs/onboarding-permissions-guide.md`
