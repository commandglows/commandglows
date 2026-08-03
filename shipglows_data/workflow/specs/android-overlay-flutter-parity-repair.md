---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-10"
created_at: "2026-05-10 09:52:03 UTC"
updated: "2026-05-10"
updated_at: "2026-05-10 11:49:25 UTC"
status: active
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "android-overlay-bugfix"
owner: "Diane"
confidence: high
user_story: "En tant qu'utilisateur Android de WinGlows, je veux retrouver l'overlay flottant fonctionnel de la version Expo dans l'application Flutter, afin de dicter, arreter, annuler et livrer du texte depuis n'importe quelle app sans ouvrir WinGlows."
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Flutter app"
  - "Android MethodChannel winglowz_app/overlay"
  - "Android foreground service"
  - "Android WindowManager TYPE_APPLICATION_OVERLAY"
  - "Android accessibility service"
  - "Clipboard fallback"
  - "Voice recording pipeline"
  - "WinGlows keyboard IME"
  - "Firebase/backend-agnostic stores"
depends_on:
  - artifact: "docs/OVERLAY_ANDROID.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "docs/PLATFORM_BEHAVIOR.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/workflow/specs/android-ime-winglowz_app-keyboard.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md"
    artifact_version: "0.1.0"
    required_status: "ready"
supersedes: []
evidence:
  - "docs/OVERLAY_ANDROID.md defines the Android overlay contract but not an executable parity repair plan."
  - "android/app/src/main/kotlin/com/winglowz_app/winglowz_app/OverlayForegroundService.kt only starts a foreground notification and tracks running state."
  - "android/app/src/main/kotlin/com/winglowz_app/winglowz_app/OverlayAccessibilityService.kt does not retain a service instance or implement text injection."
  - "android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt exposes permission/status/start/stop/cancel but no native event stream from overlay bubble actions back to Flutter."
  - "modules/floating-overlay/android/src/main/java/expo/modules/floatingoverlay/FloatingOverlayService.kt contains the legacy working WindowManager bubble, drag, hold-to-record, notification, state, meter, and callback behavior."
  - "modules/floating-overlay/android/src/main/java/expo/modules/floatingoverlay/OverlayView.kt contains the legacy collapsed/recording/processing/result UI states."
  - "modules/floating-overlay/android/src/main/java/expo/modules/floatingoverlay/TextInjectionHelper.kt contains the legacy accessibility injection plus clipboard fallback."
  - "winglowz_app_snapshots/winglowz_app-pre-flutter-migration-20260427-081046.tar.gz contains the pre-Flutter Expo source and must be kept until overlay parity is verified."
  - "Android Developers: WindowManager.LayoutParams TYPE_APPLICATION_OVERLAY documentation checked 2026-05-10."
  - "Android Developers: Android 14 foreground service type requirements checked 2026-05-10."
next_step: "/sf-ready shipglows_data/workflow/specs/android-overlay-flutter-parity-repair.md"
---

# Title

Android Overlay Flutter Parity Repair

# Status

Draft spec created after comparing the current Flutter Android implementation with the legacy Expo overlay kept in `modules/floating-overlay/` and the pre-Flutter snapshot. Existing docs are useful, but no existing spec fully describes the repair needed to make the Flutter overlay work like the old Expo overlay.

# User Story

En tant qu'utilisateur Android de WinGlows, je veux retrouver l'overlay flottant fonctionnel de la version Expo dans l'application Flutter, afin de dicter, arreter, annuler et livrer du texte depuis n'importe quelle app sans ouvrir WinGlows.

Acteur principal: utilisateur Android de WinGlows, connecte ou en fallback local.

Declencheurs principaux:

- L'utilisateur active l'overlay dans Settings.
- L'utilisateur appuie sur la bulle flottante, maintient la bulle pour dicter, ou utilise les actions stop/cancel.
- L'utilisateur termine une dictee et attend une livraison dans le champ actif ou le presse-papiers.

Resultat observable attendu: une vraie bulle flottante apparait au-dessus des autres apps, l'utilisateur peut demarrer/arreter/annuler une dictee depuis cette bulle, l'etat visuel suit la session, la notification foreground reste conforme Android, et le texte final est injecte quand c'est autorise ou copie en fallback.

# Minimal Behavior Contract

Quand l'overlay est active sur Android avec la permission systeme, WinGlows doit afficher une bulle native draggable, visible hors de l'application. Une action explicite sur la bulle lance une session voix unique; stop produit le texte final, cancel jette la session, et chaque etat est reflechi dans la bulle et la notification. Si l'overlay, le micro, l'accessibilite, le champ cible, le backend ou le recorder n'est pas disponible, l'app doit refuser proprement ou tomber sur clipboard/local fallback sans session fantome. L'edge case facile a rater est que l'ancienne version Expo avait deux pieces indispensables que Flutter n'a pas encore: la vue `WindowManager` interactive et le canal d'evenements natif vers la logique voix.

# Success Behavior

- Given l'utilisateur active l'overlay et `Settings.canDrawOverlays` est vrai, when il quitte l'app, then une bulle WinGlows native reste visible au-dessus des autres apps.
- Given la bulle est visible et l'utilisateur appuie dessus, when aucune session voix n'est active, then WinGlows demarre une session overlay et passe la bulle en etat `recording`.
- Given l'utilisateur maintient la bulle, when il relache apres le delai hold-to-record, then la session s'arrete et le traitement commence.
- Given l'utilisateur appuie sur stop dans l'etat recording, when le recorder retourne du texte, then le texte est enregistre comme transcription source `overlay`, copie au clipboard, et injecte dans le champ actif si l'accessibilite le permet.
- Given l'utilisateur appuie sur cancel, when une session est active, then l'audio/resultat partiel est abandonne, aucun item vide n'est cree, et la bulle revient en collapsed.
- Given l'accessibilite est desactivee ou aucun champ editable n'est cible, when un texte final existe, then le texte est copie au clipboard et l'utilisateur voit un feedback recuperable.
- Given l'utilisateur revoke l'overlay permission ou desactive l'overlay dans Settings, when le statut est rafraichi, then la vue overlay et le service foreground sont arretes.
- Given WinGlows keyboard est en train d'enregistrer, when l'overlay tente de demarrer, then la nouvelle session est refusee ou attend une arbitration explicite; aucun double micro ne demarre.

# Error Behavior

- Si la permission overlay manque, `setOverlayEnabled(true)` doit echouer avec un code recuperable et Settings doit proposer le lien systeme.
- Si `RECORD_AUDIO` ou la permission foreground microphone manque, le recorder ne demarre pas et la bulle revient a l'etat stable.
- Si Android refuse le foreground service depuis l'arriere-plan, l'app doit afficher/logguer une erreur claire et ne pas marquer `running=true`.
- Si `WindowManager.addView` echoue, l'overlay est considere non disponible et le service se nettoie.
- Si l'accessibility service n'a pas de `rootInActiveWindow`, de focus input, ou de node editable, l'injection est ignoree et le clipboard fallback reste obligatoire.
- Si le champ est password/OTP/sensible quand detectable, l'injection et la sync enrichie sont bloquees.
- Si Flutter n'est pas attache au moment ou la bulle emet une action, l'action doit etre queuee ou refusee sans crash; aucune action overlay ne doit disparaitre silencieusement pendant une session active.
- Si l'app logout pendant recording/processing, la session overlay s'arrete, les donnees compte sont separees, et le fallback local reste possible seulement pour l'UI dev si necessaire.

# Problem

L'overlay ne fonctionne pas dans l'application Flutter parce que le port actuel a garde le contrat de surface mais pas la mecanique de l'ancien module Expo. Le code Flutter expose bien un MethodChannel `winglowz_app/overlay`, des permissions et un `OverlayForegroundService`, mais ce service ne cree aucune bulle `WindowManager`, ne remonte aucun evenement de bulle vers Dart, ne met pas a jour un etat visuel, et l'accessibility service actuel ne sait pas injecter de texte.

La version Expo qui fonctionnait est encore disponible dans `modules/floating-overlay/` et dans `winglowz_app_snapshots/winglowz_app-pre-flutter-migration-20260427-081046.tar.gz`. Ces sources sont des references a conserver jusqu'a validation Android reelle.

# Solution

Porter la logique utile du module Expo vers l'app Android Flutter native en gardant une frontiere propre: le natif Android possede la bulle `WindowManager`, les gestes, l'etat visuel, la notification foreground et l'injection accessibility; Flutter possede la logique produit, les permissions UI, le pipeline voix/transcription, les stores backend-agnostic et les ecrans Settings. Ajouter un canal d'evenements natif -> Flutter pour `bubbleTap`, `recordStop`, `recordCancel`, `longPress`, `serviceError`, et des methodes Flutter -> natif pour `setOverlayState`, `updateMeterLevel`, `setResultText`, `deliverText`.

# Scope In

- Android uniquement.
- Reparaison de l'overlay Flutter actuel, pas retour Expo/React Native.
- Port natif Kotlin de la bulle legacy: `WindowManager`, `TYPE_APPLICATION_OVERLAY`, drag, snap-to-edge, collapsed/recording/processing/result.
- Bridge d'evenements natif vers Flutter pour demarrer, stopper, annuler et reporter les erreurs.
- Methodes Flutter vers natif pour synchroniser l'etat overlay, le niveau audio, le texte resultat et la livraison.
- Reglages Settings pour ajuster la taille et l'opacite de l'unique bulle overlay Android.
- Foreground service conforme Android 14+ avec `foregroundServiceType="microphone"` et permissions deja declarees.
- Injection accessibility best-effort avec clipboard fallback obligatoire.
- Arbitration avec l'IME WinGlows keyboard et toute session voix app/overlay existante.
- Settings/Voice UI pour afficher les statuts reels overlay, accessibilite, notification/micro et erreurs recuperables.
- Logs techniques non sensibles pour diagnostiquer permissions, lifecycle service, evenements overlay et delivery mode.
- Tests unitaires Dart pour le bridge/status et tests manuels Android reels pour la bulle.

# Scope Out

- iOS, web, desktop.
- Nouveau design visuel ambitieux de l'overlay; la premiere cible est la parite fonctionnelle Expo.
- Refonte du pipeline voix complet.
- Capture clipboard en arriere-plan.
- Injection dans champs password/OTP/sensibles.
- Suppression de `modules/floating-overlay/` ou de `winglowz_app_snapshots/` avant validation de parite.
- Rich media controls et features IME hors arbitration recording.

# Constraints

- Le backend reste agnostique; l'overlay ne doit pas dependre directement de Firebase ou d'un provider precis.
- Supabase/Expo/Convex ne reviennent pas dans le runtime Flutter.
- Le texte utilisateur et l'audio ne doivent pas etre loggues.
- Toutes les actions de recording sont explicites.
- Clipboard fallback est obligatoire pour tout texte final.
- Android non-overlay/non-accessibility doit rester utilisable en mode degrade.
- Les assets et couleurs natives overlay peuvent rester simples pendant la reparation, mais les ecrans Flutter doivent continuer a utiliser le theme global.
- Les docs Android officielles ont ete verifiees le 2026-05-10 pour `TYPE_APPLICATION_OVERLAY` et les foreground service types Android 14+; le code doit garder manifest + startForeground coherents avec ces exigences.

# Dependencies

- Flutter `MethodChannel` existant dans `lib/core/platform/android_overlay_bridge.dart`.
- Android Kotlin dans `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/`.
- Legacy reference dans `modules/floating-overlay/android/src/main/java/expo/modules/floatingoverlay/`.
- `docs/OVERLAY_ANDROID.md` pour le contrat permission/runtime.
- `shipglows_data/workflow/specs/android-ime-winglowz_app-keyboard.md` pour la coexistence avec l'IME.
- Android official docs checked 2026-05-10:
  - `WindowManager.LayoutParams`: `TYPE_APPLICATION_OVERLAY` est le type attendu pour une fenetre overlay d'application moderne.
  - Android 14 foreground service requirements: un foreground service qui utilise le micro doit declarer le type et les permissions appropries.
- Fresh docs verdict: `fresh-docs checked` for Android overlay window type and foreground microphone service constraints.

# Invariants

- Une seule session voix active a la fois entre app, overlay et IME.
- `running=true` signifie qu'un service/vie overlay reel est actif, pas seulement une preference utilisateur.
- `requestedEnabled=true` ne suffit pas: l'overlay est disponible seulement si permission overlay et service OK.
- Le texte final est toujours disponible via clipboard quand il existe.
- L'injection accessibility n'est jamais le seul chemin de livraison.
- Logout, permission revoke et app shutdown doivent nettoyer service et vue overlay.
- Les logs overlay ne contiennent ni audio, ni texte dicte, ni contenu clipboard.
- Les erreurs natives sont remontees en codes stables pour l'UI Flutter.

# Links & Consequences

- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/OverlayForegroundService.kt`: doit redevenir le service qui gere aussi la vue overlay, pas seulement la notification.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`: doit exposer les nouvelles methodes et brancher un canal d'evenements vers Flutter.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/OverlayAccessibilityService.kt`: doit conserver une instance active et permettre l'injection best-effort.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/`: peut gagner `OverlayView.kt`, `WaveformView.kt`, `OverlayTextInjectionHelper.kt`, `OverlayEventQueue.kt`, `OverlayState.kt`.
- `lib/core/platform/android_overlay_bridge.dart`: doit supporter status, commands et event stream.
- `lib/features/voice/presentation/voice_screen.dart` ou le store voix: doit consommer les evenements overlay.
- `lib/features/settings/presentation/settings_screen.dart`: doit afficher les etats reels et actions de recovery.
- `lib/features/settings/presentation/settings_screen.dart`: expose la taille et l'opacite persistantes de la bulle.
- `docs/OVERLAY_ANDROID.md`: doit etre mis a jour apres implementation avec le contrat effectif.
- `docs/VERIFICATION.md` si present, ou nouveau guide QA: doit contenir la matrice appareil Android.
- `modules/floating-overlay/` et `winglowz_app_snapshots/`: restent references legacy jusqu'a validation, puis nettoyage possible dans un chantier separe.

# Documentation Coherence

Mettre a jour apres implementation:

- `docs/OVERLAY_ANDROID.md`: methods finales, event names, lifecycle, fallback, tests.
- `docs/PLATFORM_BEHAVIOR.md`: statut overlay Android et limites.
- `README.md`: prerequis manuel Android pour overlay/accessibility/micro si le README mentionne les features Android.
- `shipglows_data/workflow/TASKS.md` seulement via skill de tracking appropriee, pas depuis cette spec.

# Edge Cases

- Permission overlay accordee puis revoke pendant que la bulle est visible.
- Accessibility accordee puis revoke avant injection.
- Foreground service lance depuis background sur Android 12+ ou Android 14+ avec micro.
- Notification permission refusee sur Android 13+.
- App process tue pendant que l'overlay est visible.
- Flutter engine pas attache au moment du tap overlay.
- Rotation, multi-window, split-screen, foldables, densites faibles.
- OEMs agressifs: Samsung, Xiaomi, Oppo, Pixel.
- Drag juste apres tap: ne doit pas demarrer une dictee involontaire.
- Rapid taps start/stop/cancel.
- Stop retourne texte vide.
- No focused editable field.
- Champ password/OTP.
- Keyboard IME recording deja actif.
- Logout/auth switch pendant recording.
- Backend indisponible: resultat doit rester local/clipboard sans crash.

# Implementation Tasks

- [x] Tache 1 : Diagnostiquer et figer le comportement actuel
  - Fichiers : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/OverlayForegroundService.kt`, `lib/core/platform/android_overlay_bridge.dart`
  - Action : Ajouter ou verifier des logs non sensibles pour start/stop/status, reproduire sur appareil/emulateur Android, confirmer que la bulle n'est pas creee aujourd'hui.
  - Validate with : logcat + capture manuelle; `running` ne doit plus etre considere suffisant sans vue overlay.

- [x] Tache 2 : Porter la vue overlay legacy en Kotlin Flutter
  - Fichiers : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/OverlayView.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/WaveformView.kt`, `OverlayForegroundService.kt`
  - Action : Reprendre la logique utile de `modules/floating-overlay/.../OverlayView.kt` et `FloatingOverlayService.kt`: collapsed, recording, processing, result, drag, snap-to-edge, hold-to-record, stop, cancel.
  - Validate with : la bulle apparait hors app, se deplace, snap, et change d'etat.

- [x] Tache 3 : Ajouter un event bridge natif -> Flutter
  - Fichiers : `MainActivity.kt`, `OverlayForegroundService.kt`, `lib/core/platform/android_overlay_bridge.dart`
  - Action : Ajouter un EventChannel ou une queue MethodChannel drainable pour `bubbleTap`, `recordStop`, `recordCancel`, `longPress`, `serviceError`, `permissionRevoked`.
  - Validate with : test Dart du parsing d'evenements + logcat montrant un tap overlay consomme par Flutter.

- [ ] Tache 4 : Brancher les evenements overlay au pipeline voix Flutter
  - Fichiers : `lib/features/voice/`, `lib/core/platform/android_overlay_bridge.dart`
  - Action : Demarrer/stopper/cancel la session voix source `overlay`, synchroniser `setOverlayState`, `updateMeterLevel`, `setResultText`.
  - Validate with : une dictee overlay produit la meme transcription qu'un flow app, source `overlay`, sans double session.
  - Status 2026-05-10 : bridge Dart expose les evenements/commandes; branchement a un vrai recorder Flutter reste a faire car le pipeline voix actuel est encore manuel.

- [x] Tache 5 : Restaurer injection accessibility + clipboard fallback
  - Fichiers : `OverlayAccessibilityService.kt`, `OverlayTextInjectionHelper.kt`, `MainActivity.kt`, `lib/core/platform/android_overlay_bridge.dart`
  - Action : Porter `TextInjectionHelper` en package Flutter, garder une instance de service, tenter `ACTION_SET_TEXT` sur node editable, bloquer champs sensibles si detectable, copier au clipboard dans tous les cas utiles.
  - Validate with : champ standard injecte; champ absent/non-editable/password tombe en clipboard fallback.

- [x] Tache 6 : Mettre a jour Settings et Voice UI
  - Fichiers : `lib/features/settings/presentation/settings_screen.dart`, `lib/features/voice/presentation/voice_screen.dart`
  - Action : Afficher permission overlay, accessibility, running reel, delivery mode, derniere erreur, actions recovery; ne pas promettre l'injection quand accessibility est off.
  - Validate with : UI theme global conserve; pas de style inline ni hardcode hors tokens Flutter.

- [ ] Tache 7 : Ajouter l'arbitration app/overlay/IME
  - Fichiers : `lib/features/voice/`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/`, `OverlayForegroundService.kt`
  - Action : Centraliser l'etat "voice session active" pour refuser ou arreter proprement les sessions concurrentes.
  - Validate with : overlay et IME ne peuvent pas enregistrer simultanement.
  - Status 2026-05-10 : non termine; a verifier sur appareil avec IME actif.

- [x] Tache 8 : Nettoyer seulement apres parite
  - Fichiers : `modules/floating-overlay/`, `winglowz_app_snapshots/`, docs de migration
  - Action : Garder ces sources tant que la QA overlay Flutter n'est pas passee. Ouvrir un chantier de nettoyage separe apres validation.
  - Validate with : aucun nettoyage destructif avant preuve appareil.

# Test Plan

- `flutter analyze`
- `flutter test`
- `./gradlew :app:compileDebugKotlin` ou `flutter build apk --debug` avec Android SDK disponible.
- Appareil/emulateur Android:
  - Permission overlay refusee/acceptee.
  - Permission micro refusee/acceptee.
  - Permission accessibility refusee/acceptee.
  - Bulle visible hors app.
  - Tap start, hold-to-record, drag, stop, cancel.
  - Injection dans champ texte standard.
  - Clipboard fallback sans champ cible.
  - Champ password/OTP.
  - Logout pendant session.
  - IME actif pendant tentative overlay.
  - Android 13/14 notification/foreground service behavior.

# Rollout Plan

1. Implementer derriere le toggle overlay existant; ne pas activer automatiquement pour les utilisateurs sans permission.
2. Valider en dev local avec fallback local et logs non sensibles.
3. Faire un APK debug via Blacksmith/GitHub Actions si Android SDK local reste indisponible.
4. Tester sur au moins un appareil Android reel avant suppression de tout legacy.
5. Mettre a jour docs et seulement ensuite planifier le nettoyage `modules/floating-overlay/` et `winglowz_app_snapshots/`.

# Risks

- Android impose des restrictions strictes sur foreground services et overlays; certains OEMs peuvent avoir des comportements differents.
- Un event bridge mal concu peut perdre des taps si Flutter n'est pas attache.
- Accessibility injection est sensible: il faut eviter tout comportement qui ressemble a de l'automation silencieuse.
- La bulle native peut diverger du theme global Flutter; acceptable temporairement pour parite fonctionnelle, a revisiter ensuite.
- Sans appareil Android local, la validation finale doit passer par CI/APK + test manuel.

# Open Questions

- Le design visuel natif de la bulle doit-il rester strictement identique au legacy Expo pour la premiere version, ou peut-on simplifier tant que le comportement est identique ?
- Sur erreur recorder apres tap overlay, prefere-t-on garder la bulle en etat error quelques secondes ou revenir directement en collapsed avec notification/toast ?
- Le canal natif -> Flutter doit-il etre un `EventChannel` streaming ou une queue drainable comme le clavier actuel ? Recommandation technique: queue drainable si on veut survivre aux moments ou Flutter n'est pas attache.

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-10 09:52:03 | sf-spec | GPT-5 Codex | Created overlay parity repair spec from current Flutter code, legacy Expo module, and existing overlay docs. | Draft spec created. | `/sf-ready shipglows_data/workflow/specs/android-overlay-flutter-parity-repair.md` |
| 2026-05-10 10:20:00 | sf-build | GPT-5 Codex + gpt-5.3-codex-spark worker | Implemented native overlay bubble core, Dart bridge methods, docs, and parser tests. | Partial: Flutter checks pass; Android Kotlin compile blocked by missing SDK; real-device QA still required. | Install/configure Android SDK or run Blacksmith APK build, then verify on Android device. |
| 2026-05-10 10:32:36 | sf-fix | GPT-5 Codex | Diagnosed Blacksmith `:app:compileDebugKotlin` failure from `BUG-2026-05-10-001` and replaced the invalid `AccessibilityNodeInfo.EXTRA_INPUT_TYPE` reference with `node.inputType`. | Fix attempted: `flutter analyze`, `flutter test`, and `git diff --check` pass locally; Android compile still requires Blacksmith or a configured Android SDK. | Run Blacksmith Android CI and close `BUG-2026-05-10-001` when `Analyze, Test, Build APK` passes. |
| 2026-05-10 11:39:12 | sf-prod | GPT-5 Codex | Pushed commit `0780a2f`, followed Blacksmith run `25627619426`, collected full GitHub/Blacksmith logs, and checked artifact upload. | Android CI passed: `Analyze, Test, Build APK` in 4m55s and `Supabase Migration Tests` in 1m10s. Separate Vercel status still fails on `vite build` for a `socialflow` deployment. | Android device QA for overlay behavior; decide whether Vercel should be disabled or configured for this Flutter repo. |
| 2026-05-10 11:49:25 | sf-ship | GPT-5 Codex | Added Settings controls for the unique Android overlay bubble size/opacity and prepared full ship bookkeeping. | Pending ship: local Flutter checks pass; Android local compile still blocked by missing SDK; device QA remains required. | Commit and push iteration; follow with Android device QA. |
| 2026-05-11 19:16:45 | sf-audit-code | GPT-5 Codex | Audited Flutter/Dart code against product, auth flow, security, and reliability criteria. | 1 high and 2 medium risks identified; no code fix applied in this run. | Track and decide if remediation requires dedicated `/sf-spec` (notably auth route guard consistency in local vs sync modes). |
| 2026-05-20 10:05:48 | sf-build | GPT-5 Codex | Added long-press-to-drag behavior for the collapsed Android overlay mic button, persisted position on release, and updated accessibility copy. | Implemented locally: `flutter analyze` and `flutter test` pass; Android build/device validation remains external per repo guardrails. | Run Blacksmith Android build and Diane physical-device QA for the overlay drag gesture. |
| 2026-05-20 15:28:35 | sf-build | GPT-5 Codex | Added native recording feedback for the Android overlay: animated recording chrome, pulsing active border, and autonomous waveform animation. | Implemented locally: `flutter analyze`, `flutter test`, and `git diff --check` pass; Android build/device validation remains external per repo guardrails. | Run Blacksmith Android build and Diane physical-device QA for tap-to-record plus recording animation. |
| 2026-05-22 09:58:47 | sf-build | GPT-5 Codex | Added Android overlay pause/resume controls, native `paused` visual state, pause/resume MethodChannel commands, and Dart event parsing. | Implemented locally: `flutter analyze`, `flutter test`, and `git diff --check` pass; actual audio-size reduction depends on the recorder consuming `recordPause`/`recordResume`; Android build/device validation remains external per repo guardrails. | Run Blacksmith Android build and Diane physical-device QA for pause/resume overlay controls, then wire recorder pause semantics if the overlay recorder is enabled in Flutter. |

# Current Chantier Flow

sf-spec: done  
sf-ready: accepted with implementation risk  
sf-start: partial; CI compile fix attempted; long-press drag, recording animation, and pause/resume overlay iterations implemented locally
sf-verify: local Flutter checks pass; Android CI/device proof still pending for overlay gesture/animation/pause updates
sf-end: partial; implementation iteration documented, Android device QA remains
sf-ship: pending commit/push for partial iteration
