---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "winglowz_app"
confidence: "high"
created: "2026-05-17"
created_at: "2026-05-17 08:10:37 UTC"
updated: "2026-05-17"
updated_at: "2026-05-17 09:22:32 UTC"
status: ready
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "feature"
owner: "Diane"
user_story: "En tant qu'utilisateur Android de WinGlows keyboard, je veux pouvoir afficher, masquer et personnaliser la barre d'information au-dessus du clavier, afin de recevoir des informations utiles et des conseils contextuels sans rendre le clavier intrusif."
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Android InputMethodService"
  - "WinGlowzKeyboardView"
  - "KeyboardStateStore"
  - "KeyboardActionBarController"
  - "Flutter Settings"
  - "AndroidKeyboardBridge"
  - "SettingsStore"
  - "AuthSessionSnapshot"
  - "AppShell onboarding"
  - "AppDiagnostics"
depends_on:
  - artifact: "shipglows_data/business/product.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/business/branding.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "docs/technical/android-native.md"
    artifact_version: "0.1.0"
    required_status: "draft"
  - artifact: "docs/PLATFORM_BEHAVIOR.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "docs/COMPONENTS.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
supersedes: []
evidence:
  - "User request 2026-05-17: make the keyboard top bar optional and customizable, with date, time, email/account label, install tips, and progressive product guidance."
  - "android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt already renders a status area through statusText, drawStatus(), statusHeightFor(), and setStatus()."
  - "WinGlowzKeyboardView.toggleSystemModifier() already writes transient modifier messages such as Ctrl on/off and Alt on/off into the status area."
  - "KeyboardActionBarController already persists action bar state and local adaptive usage counts through KeyboardActionBarState.adaptiveUsageScoreById."
  - "KeyboardStateStore already persists non-sensitive IME preferences, theme config, corner config, clipboard recents, action bar state and diagnostics in SharedPreferences."
  - "lib/features/settings/domain/onboarding_permission_contract.dart already defines step-based onboarding for keyboard, clipboard, microphone, media, brightness and overlay."
  - "lib/features/settings/domain/settings_store.dart already stores onboarding progress and skip flags locally or in the authenticated Firebase settings document."
  - "AuthSessionSnapshot exposes a displayable email field when the user is signed in."
  - "AppDiagnostics is local, bounded, redacted, and already used for onboarding/status breadcrumbs."
  - "firestore.rules contains a clientEvents collection contract, but v1 of this feature intentionally does not add remote analytics or behavior collection."
next_step: "/sf-start Keyboard status bar progressive disclosure"
---

## Title

Keyboard status bar progressive disclosure

## Status

Ready spec. This is intentionally a full spec because the feature spans native IME rendering, Flutter Settings, local user-progress data, product onboarding, privacy policy, diagnostics, and documentation.

## User Story

En tant qu'utilisateur Android de WinGlows keyboard, je veux pouvoir afficher, masquer et personnaliser la barre d'information au-dessus du clavier, afin de recevoir des informations utiles et des conseils contextuels sans rendre le clavier intrusif.

Acteur principal: utilisateur Android qui a active ou essaye d'activer WinGlows keyboard.

Declencheurs principaux:

- L'utilisateur ouvre le clavier dans un champ texte.
- L'utilisateur change les preferences de barre dans Settings.
- Une action clavier produit un message transitoire: modifier on/off, action pinnee, dictation, clipboard, theme, media, erreur.
- Le moteur d'onboarding local detecte une action realisee ou une fonctionnalite utile non essayee.

Resultat observable attendu: la barre peut etre absente, utilitaire ou educative selon le choix utilisateur; elle affiche des infos selectionnees comme la date, l'heure ou le compte; elle garde les messages systeme importants; elle propose des conseils courts et rares sans collecter de contenu saisi ni envoyer d'analytics distant en v1.

## Minimal Behavior Contract

L'utilisateur configure la barre superieure du clavier depuis Settings: off, compacte ou intelligente, avec des modules tels que label WinGlows, date, heure, compte/email masque et conseils contextuels. Quand le clavier s'ouvre, la barre rend les modules autorises et peut temporairement les remplacer par un message d'etat ou un nudge local lie a une action recente ou a une fonctionnalite non encore essayee. Si la barre est desactivee, le clavier recupere la hauteur et seuls les feedbacks critiques passent par les mecanismes existants comme Toast ou diagnostics. L'edge case facile a rater est la confidentialite: la barre ne doit jamais afficher ni persister de texte tape, clipboard, transcription, app hote sensible, email complet en champ prive, ou message educatif qui revele l'activite de l'utilisateur dans un contexte password/OTP/noPersonalizedLearning.

## Success Behavior

- Given la barre est activee en mode standard, when le clavier s'ouvre dans un champ texte normal, then la zone actuelle `statusText` affiche une ligne composee selon les modules choisis, par exemple `WinGlows | 17 May | 10:12 | diane@example.com` ou un email masque selon le niveau privacy.
- Given la barre est desactivee, when le clavier s'ouvre, then `WinGlowzKeyboardView` ne reserve plus la hauteur de status persistante et les touches remontent sans chevauchement.
- Given le module heure est actif, when la minute change pendant que le clavier est visible, then l'heure se met a jour sans boucle de redraw continue ni fuite de callbacks apres destruction de l'IME.
- Given le module date est actif, when le jour change ou le clavier se recree, then la date affichee suit la locale Android et reste courte.
- Given l'utilisateur est connecte et a active le module compte, when l'app transmet un account label non sensible au natif, then le clavier affiche un libelle court; en mode prive ou strict, il masque ou remplace ce libelle par `Compte connecté`.
- Given un message transitoire arrive, for example `Ctrl on` ou `Action pinned`, when la barre est visible, then ce message prend la priorite pendant une duree courte puis la barre revient a son contenu compose.
- Given l'utilisateur vient de pinner une action row, when les conseils sont actifs et le cooldown le permet, then la barre peut afficher un nudge court du type `Action épinglée. Essaie un appui long sur Media.` sans spammer la meme suggestion.
- Given l'utilisateur vient d'installer ou d'activer le clavier et n'a pas essaye la dictee, when il ouvre un champ texte standard, then un tip peut proposer d'essayer le micro si la dictation est autorisee et non privee.
- Given l'utilisateur desactive les conseils, when il utilise le clavier, then aucun nudge educatif n'est affiche; seuls les modules fixes et les messages d'etat restent possibles selon la configuration.
- Given l'app Flutter est ouverte, when l'utilisateur va dans Settings, then il peut regler la barre, les modules, le niveau de conseils, l'affichage du compte, et reinitialiser les conseils deja vus.
- Given l'app est en local mode, when le module compte est actif, then la barre affiche un libelle local non trompeur comme `Mode local`, pas un faux email.

## Error Behavior

- Si une config native de barre est invalide, trop grande, inconnue ou d'une version non supportee, Android la refuse ou retombe sur un preset safe sans crasher le clavier.
- Si la barre est desactivee, les erreurs d'IME restent recuperables via Toast, diagnostics et Settings; aucun message permanent ne doit forcer le retour de la barre sans choix utilisateur.
- Si le clavier est dans un champ prive ou sensible, les modules compte, tips comportementaux, clipboard, voice et contenu contextuel sont masques; les messages systeme autorises restent generiques.
- Si un evenement d'adoption ou de conseil arrive pendant un champ prive ou sensible, le store local le rejette au lieu de l'utiliser pour les compteurs, les diagnostics ou les nudges futurs.
- Si l'account label transmis depuis Flutter contient une valeur suspecte, trop longue, vide ou non textuelle, Android le tronque ou l'ignore.
- Si l'horloge systeme change, si la locale change ou si l'IME est detruit, les timers de date/heure doivent etre recalcules ou annules proprement.
- Si le moteur de conseils ne trouve aucun message eligible, la barre affiche le contenu utilitaire configure ou rien selon le mode; elle ne doit pas inventer un conseil vague.
- Si la persistence locale echoue, la barre garde les defaults safe et l'app affiche une erreur recuperable en Settings.
- Si l'utilisateur se deconnecte ou change de compte, le label de compte natif est efface avant qu'une autre session ne puisse l'afficher.
- Aucune erreur ne doit logger le texte tape, le contenu clipboard, le texte dicte, un email complet dans un diagnostic non redige, ou une liste exhaustive d'actions qui pourrait reconstituer une activite sensible.

## Problem

Le clavier WinGlows devient une surface riche: dictation, clipboard, snippets, media, themes, actions pinnees, gestures, corrections, onboarding permissions. La barre superieure existe deja et sert aux messages de statut, mais elle n'a pas de contrat produit: elle peut afficher `WinGlows`, `Ctrl on`, `Action pinned` ou des erreurs, sans preference utilisateur ni strategie d'onboarding. En meme temps, l'application grossit et risque de devenir difficile a approcher pour un nouvel utilisateur. Il faut donc transformer cette zone en surface optionnelle, utile et respectueuse: information personnelle choisie, feedback de systeme, et progressive disclosure locale pour favoriser l'adoption sans bruit ni collecte invasive.

## Solution

Introduire une architecture en trois couches. La premiere couche est un `KeyboardStatusBarConfig` versionne, persiste localement et reglable depuis Flutter Settings, qui decide si la barre est visible et quels modules elle affiche. La deuxieme couche est un `KeyboardStatusBarPresenter` natif dans l'IME, responsable de composer le texte final, de gerer les priorites, les messages transitoires, la date/heure et la suppression en mode prive. La troisieme couche est un `FeatureAdoptionStore` local-first qui collecte uniquement des evenements d'adoption non sensibles, puis un `KeyboardNudgeEngine` qui choisit des conseils contextuels bornes par cooldown, dismissals et privacy policy.

Le nom produit de cette logique peut etre "conseils contextuels" dans l'UI. Le vocabulaire technique accepte est: progressive disclosure, contextual onboarding, in-product education, feature adoption nudges.

## Scope In

- Rendre la barre superieure optionnelle dans le clavier Android natif.
- Modes v1: `hidden`, `compact`, `standard`, `smart`.
- Modules v1: product label, date, time, account label/email masque, field context court, active modifiers, transient status, onboarding/tips.
- Priorite d'affichage v1: critical status > private/safety status > transient action status > eligible nudge > configured utility modules > product label/fallback.
- Settings Flutter pour activer/desactiver la barre, choisir les modules, regler le niveau de conseils, masquer le compte, et reinitialiser les tips vus.
- Pont Flutter/Android pour lire/ecrire la config de barre et transmettre un `KeyboardUserContext` minimal: account label redige, local/remote mode, locale/time format preference si necessaire.
- Native SharedPreferences pour config, etat des tips, cooldowns, compteurs d'adoption non sensibles et dernier label de compte redige.
- Collecte locale d'evenements d'adoption non sensibles: keyboard opened, mic tried, clipboard panel opened, action pinned/unpinned, action row attached, theme studio opened, corner mode enabled, media panel opened, settings opened from keyboard, status bar disabled/enabled.
- Zero collecte de texte utilisateur: pas de typed content, clipboard content, dictation content, selected text, app host package label en clair dans les nudges ou remote analytics.
- Nudge engine local avec catalogue declaratif, conditions, cooldowns, caps par session/jour, dismissals, et suppression en mode prive.
- Integration avec l'onboarding existant: les tips clavier ne remplacent pas l'onboarding permission overlay Flutter; ils le completent depuis l'IME.
- Preview Flutter: le sandbox clavier doit pouvoir simuler hidden/compact/standard/smart et les modules principaux.
- Tests Dart/Kotlin pour config parsing, defaults, priority resolution, privacy suppression, cooldowns et settings.
- Documentation: Android native, components, platform behavior, verification, code-docs map, README si la surface devient user-visible.

## Scope Out

- Connecteurs externes dans la barre en v1.
- Remote analytics, A/B testing, cohort tracking, product analytics SaaS ou dashboard admin.
- Personnalisation graphique avancee de la barre au-dela de l'heritage du Keyboard Theme Studio.
- Affichage de contenu d'app tierce, notifications, calendrier, emails entrants ou donnees personnelles externes.
- Sync multi-device des nudges et compteurs d'adoption.
- LLM ou generation dynamique de conseils en v1.
- Tips qui se comportent comme des notifications push, popups ou modales dans l'IME.
- Gamification, streaks, badges ou scoring social.
- Changement des permissions Android ou ajout de permissions larges.
- iOS/desktop/web system keyboard equivalent.

## Constraints

- Android IME reste natif Kotlin et doit continuer a fonctionner sans Flutter actif.
- La barre doit pouvoir disparaitre sans casser `desiredKeyboardHeight()`, `drawKeyboard()`, rows scrollables, compact mode ou keyboard height scale.
- Les messages critiques ne doivent pas etre silencieux: si la barre est masquee, utiliser Toast/diagnostics existants.
- Tous les evenements d'adoption v1 sont local-only. Toute collecte distante doit faire l'objet d'une spec separee avec consentement, retention, droit a suppression, et contrat Firestore/clientEvents.
- Aucun contenu utilisateur ne peut alimenter les tips, diagnostics ou compteurs d'adoption.
- Le mode prive doit supprimer les modules personnels, les nudges comportementaux et les evenements d'adoption lies a l'ouverture ou a l'usage du clavier dans ce contexte.
- Le label de compte doit etre fourni par Flutter deja redige; Android ne doit pas appeler Firebase/Auth directement depuis l'IME.
- Date/heure doivent respecter locale et format systeme quand possible, avec refresh a frequence minimale.
- Les conseils doivent etre rares: cap v1 recommande de 1 nudge educatif par ouverture clavier et 3 par jour, avec cooldown par message.
- La barre ne doit pas devenir une surface de copy marketing permanente; elle doit rester utilitaire et actionnable.
- Les libelles et conseils visibles par l'utilisateur doivent passer par un catalogue localisable; les exemples francais doivent rester naturels et accentues, tandis que les ids, modules et ancres machine restent en anglais stable.
- Les plateformes non Android ne doivent pas exposer de promesse IME native, seulement la preview/configuration simulee si utile.

## Dependencies

- Flutter/Dart: `flutter_riverpod`, `SettingsScreen`, `SettingsStore`, `AuthSessionSnapshot`, `KeyboardPreviewScreen`, `AndroidKeyboardBridge`.
- Android/Kotlin: `WinGlowzInputMethodService`, `WinGlowzKeyboardView`, `KeyboardStateStore`, `KeyboardActionBarController`, SharedPreferences.
- Existing local diagnostics: `AppDiagnostics` for redacted app-side breadcrumbs only.
- Existing onboarding: `evaluateOnboardingReadiness()` remains the permission/setup flow of record.
- Existing Firebase settings store is relevant only for app Settings. It must not be used for remote analytics in v1.
- Fresh external docs verdict: fresh-docs not needed. The spec uses already implemented Android IME, MethodChannel and SharedPreferences patterns in this repo, and deliberately avoids new platform APIs, new Firebase rules, external analytics SDKs, or new auth/session behavior.

## Invariants

- The keyboard remains usable with no account, no network, no Flutter process and no remote backend.
- User choice wins: if the status bar is hidden, it stays hidden until the user changes it.
- Private/sensitive field policy wins over all personal modules and nudges.
- Critical operational feedback remains observable through existing feedback channels.
- The status bar never displays raw typed text, clipboard content, dictation content, selected text, secrets, tokens, API keys, provider payloads, or host app names from sensitive contexts.
- Local adoption events are product events, not content events.
- Nudge eligibility is deterministic and testable.
- Dismissed tips stay dismissed unless the user resets tips.
- Logout/session switch clears or replaces account display context before the next keyboard render.
- Existing action bar pinning, attached rows, adaptive order, theme rendering, corner shortcuts, private mode, media controls, voice and clipboard behavior must not regress.

## Links & Consequences

- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStatusBarModels.kt`: new native config, user context, module ids, nudge models and validation.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStatusBarPresenter.kt`: new native composer/priority/timer/cooldown owner.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`: add status bar config, user context, adoption counters and nudge state.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`: replace direct `statusText` ownership with presenter output; support zero-height status bar; keep transient status API.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzInputMethodService.kt`: record non-sensitive adoption events from callbacks, apply presenter state, clear account context on lifecycle/session updates.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`: add MethodChannel handlers for status bar config and user context.
- `lib/features/keyboard/domain/keyboard_models.dart`: add Dart status bar config and validation models.
- `lib/core/platform/android_keyboard_bridge.dart`: add get/set/reset status bar config and set keyboard user context.
- `lib/features/settings/domain/settings_store.dart`: add app-side status bar settings only if they need Flutter/local/Firebase storage; otherwise keep as native keyboard preference.
- `lib/features/settings/presentation/settings_screen_sections.dart`: add controls to `WinGlows keyboard` section.
- `lib/features/shell/presentation/app_shell_screen.dart`: push redacted account context to native keyboard after auth/session changes if needed.
- `lib/features/keyboard/presentation/keyboard_preview_screen.dart` and widgets: simulate status bar modes/modules.
- `test/settings_platform_controllers_test.dart`, `test/widget_test.dart`, `test/onboarding_permission_contract_test.dart`: expand coverage for bridge/settings/preview behaviors.
- `firestore.rules`: no change in v1 unless a later spec chooses remote analytics or synced adoption state.

## Documentation Coherence

Update:

- `docs/technical/android-native.md`: status bar architecture, SharedPreferences keys, privacy invariants, lifecycle/timer behavior.
- `docs/COMPONENTS.md`: add `KeyboardStatusBarPresenter`, Settings controls and preview responsibilities.
- `docs/PLATFORM_BEHAVIOR.md`: status bar optionality, Android-only behavior, privacy suppression.
- `docs/VERIFICATION.md`: manual QA matrix for hidden/compact/standard/smart, date/time, account label, private fields and tips.
- `shipglows_data/technical/code-docs-map.md`: add status bar model/presenter docs ownership.
- `README.md`: only if the packaged onboarding or keyboard feature summary mentions the status bar.
- `CHANGELOG.md`: add user-facing entry once implemented.

No pricing, SEO or public GTM doc change is required for v1 unless the bar becomes a public positioning claim.

## Edge Cases

- Keyboard first opened before the user ever opens the Flutter app.
- User enables the keyboard, then immediately enters a password field.
- User switches from signed-in mode to local mode while the IME process remains alive.
- User disables status bar while a transient message is active.
- User enables time module, leaves keyboard open across minute/day boundary, then hides keyboard.
- Locale or 12/24-hour system setting changes while app is alive.
- Account email is too long for the bar.
- Account email contains unusual Unicode, whitespace or casing.
- Multiple actions happen rapidly: Ctrl on, action pinned, mic start, clipboard open.
- User pins/unpins the same action repeatedly.
- Nudge catalog condition becomes true in private mode.
- Nudge appears, then user disables tips before the cooldown expires.
- Settings save succeeds in Flutter but native MethodChannel is unavailable because platform is not Android.
- Corrupt SharedPreferences value for config or nudge state.
- Keyboard theme creates low contrast status text.
- Compact keyboard mode plus hidden status bar changes measured height enough to affect row layout.
- Device rotates, enters split screen, or uses large font accessibility settings.
- App process killed after writing account context but before writing config.

## Implementation Tasks

- [ ] Tache 1 : Definir le modele Dart de barre clavier
  - Fichier : `lib/features/keyboard/domain/keyboard_models.dart`
  - Action : Ajouter `KeyboardStatusBarConfig`, `KeyboardStatusBarMode`, `KeyboardStatusBarModule`, `KeyboardTipLevel`, defaults, `fromMap`, `toMap`, validation, `copyWith`.
  - User story link : Permettre a l'utilisateur de choisir ce que la barre affiche.
  - Depends on : Aucun.
  - Validate with : tests unitaires Dart pour defaults, parsing de valeurs inconnues, modules invalides, et limites de longueur.
  - Notes : Garder le schema non sensible et extensible.

- [ ] Tache 2 : Etendre le bridge clavier Flutter
  - Fichier : `lib/core/platform/android_keyboard_bridge.dart`
  - Action : Ajouter `getKeyboardStatusBarConfig`, `setKeyboardStatusBarConfig`, `resetKeyboardStatusBarConfig`, `setKeyboardUserContext`, et parsing des champs status bar dans `AndroidKeyboardStatus`.
  - User story link : Relier Settings Flutter au clavier natif.
  - Depends on : Tache 1.
  - Validate with : `test/settings_platform_controllers_test.dart` et MethodChannel mock.
  - Notes : Hors Android, retourner defaults et ne pas echouer la preview.

- [ ] Tache 3 : Definir les modeles Kotlin status bar
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStatusBarModels.kt`
  - Action : Creer data classes/enums pour config, modules, user context redige, event d'adoption, nudge state, validation et JSON map.
  - User story link : Donner au natif un contrat stable sans dependre de Flutter au runtime.
  - Depends on : Tache 1.
  - Validate with : tests Kotlin si harness disponible; sinon parser review + compile CI Blacksmith.
  - Notes : Limiter tailles: account label 64 chars, nudge id 80 chars, config JSON 16 KB max.

- [ ] Tache 4 : Persister config, contexte et adoption locale
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`
  - Action : Ajouter cles SharedPreferences pour status bar config, user context, counters d'adoption, last seen/dismissed nudge ids, daily cap et reset tips.
  - User story link : Garder les preferences et conseils disponibles meme sans app Flutter ouverte.
  - Depends on : Tache 3.
  - Validate with : tests parser/store ou inspection compile; verifier que `buildStatusMap()` expose seulement des champs non sensibles.
  - Notes : Ne pas stocker typed text, clipboard content, dictation text ou host package sensible.

- [ ] Tache 5 : Implementer le presenter natif
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStatusBarPresenter.kt`
  - Action : Composer les lignes finales selon mode/modules/priorites, gerer transient TTL, date/time refresh, private suppression, nudge eligibility, cooldowns et caps.
  - User story link : Transformer la barre en surface utile et non intrusive.
  - Depends on : Taches 3 et 4.
  - Validate with : tests de resolution de priorite, private mode, hidden mode, date/time, cooldowns.
  - Notes : Presenter pur autant que possible; isoler les timers dans la view/service.

- [ ] Tache 6 : Brancher le presenter dans la view clavier
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Remplacer l'usage direct de `statusText` par un etat presenter; faire retourner 0 par `statusHeightFor()` en hidden mode; garder `setStatus()` comme message transitoire.
  - User story link : Afficher ou masquer reellement la barre sans casser le clavier.
  - Depends on : Tache 5.
  - Validate with : tests/compile; QA manuel hidden/compact/standard; verifier pas de chevauchement et pas de boucle redraw.
  - Notes : Conserver `Keyboard recovered` et private input comme messages de haute priorite.

- [ ] Tache 7 : Enregistrer les evenements d'adoption non sensibles
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzInputMethodService.kt`
  - Action : Ajouter appels `recordKeyboardAdoptionEvent()` sur ouverture clavier, mic, clipboard, snippets, media, action pin/unpin, theme, corner mode, settings; propager au state store.
  - User story link : Permettre des conseils pertinents sans tracking de contenu.
  - Depends on : Taches 4 et 5.
  - Validate with : tests de counters ou diagnostics; verifier private mode supprime les evenements sensibles.
  - Notes : Ne jamais inclure contenu, selected text ou package hote dans l'event.

- [ ] Tache 8 : Ajouter les handlers MethodChannel natifs
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`
  - Action : Implementer get/set/reset status bar config, set/clear user context, reset tips, et status map enrichie.
  - User story link : Permettre Settings et session app de piloter la barre.
  - Depends on : Taches 3 et 4.
  - Validate with : bridge tests Dart + CI compile Android via Blacksmith.
  - Notes : Garder `winglowz_app/keyboard`; ne pas creer un deuxieme canal.

- [ ] Tache 9 : Propager le contexte compte depuis Flutter
  - Fichier : `lib/features/shell/presentation/app_shell_screen.dart`
  - Action : Observer `authSessionProvider` et envoyer un label redige au natif quand la session change; effacer le label sur logout/local mode.
  - User story link : Afficher l'email/nom uniquement quand l'utilisateur le veut.
  - Depends on : Tache 2 et Tache 8.
  - Validate with : test provider/widget ou integration mock; verifier local mode et logout.
  - Notes : Redaction cote Flutter: option afficher email complet seulement si config l'autorise, sinon masquer local-part ou afficher `Compte connecte`.

- [ ] Tache 10 : Ajouter les controls Settings
  - Fichier : `lib/features/settings/presentation/settings_screen_sections.dart`
  - Action : Ajouter UI dans `WinGlows keyboard`: mode barre, modules, tips off/minimal/standard, account label privacy, reset tips.
  - User story link : Rendre la personnalisation accessible sans surcharger l'app.
  - Depends on : Taches 1 et 2.
  - Validate with : widget tests settings, text fitting mobile/desktop, unsupported platform.
  - Notes : Garder une UI dense et utilitaire; utiliser toggles/segmented controls.

- [ ] Tache 11 : Etendre le controller Settings
  - Fichier : `lib/features/settings/application/settings_platform_controllers.dart`
  - Action : Ajouter methodes de load/save/reset status bar config et resume de statut redige.
  - User story link : Garder la logique Settings testable hors widget.
  - Depends on : Tache 2.
  - Validate with : `test/settings_platform_controllers_test.dart`.
  - Notes : Les erreurs natives doivent etre recuperables et redigees.

- [ ] Tache 12 : Mettre a jour la preview clavier Flutter
  - Fichier : `lib/features/keyboard/presentation/keyboard_preview_screen.dart`
  - Action : Ajouter controle de mode/modules status bar et simulation des messages/tips dans la preview.
  - User story link : Permettre de comprendre l'impact visuel avant device QA.
  - Depends on : Tache 1.
  - Validate with : `test/widget_test.dart` ou test dedie preview.
  - Notes : Ne pas presenter la preview web comme preuve native.

- [ ] Tache 13 : Ajuster l'onboarding app existant
  - Fichier : `lib/features/settings/domain/onboarding_permission_contract.dart`
  - Action : Ajouter, si utile, un signal de reprise vers les tips clavier sans transformer tous les tips en etapes d'onboarding permission.
  - User story link : Coordonner onboarding Flutter et conseils IME.
  - Depends on : Taches 5 et 10.
  - Validate with : `test/onboarding_permission_contract_test.dart`.
  - Notes : Les permissions restent dans l'onboarding Flutter; les nudges clavier restent contextuels.

- [ ] Tache 14 : Ajouter les tests de privacy et regression
  - Fichier : `test/widget_test.dart`
  - Action : Couvrir parsing bridge, Settings UI, preview hidden mode, private suppression et non-Android defaults.
  - User story link : Eviter que la barre devienne intrusive ou cassante.
  - Depends on : Taches 1, 2, 10, 12.
  - Validate with : `flutter test test/widget_test.dart test/settings_platform_controllers_test.dart`.
  - Notes : Tests Kotlin natifs via CI/Blacksmith si possible, pas local Android build sur cette VM.

- [ ] Tache 15 : Mettre a jour la documentation
  - Fichier : `docs/technical/android-native.md`
  - Action : Documenter status bar config, presenter, events local-only, privacy suppression, timers et QA.
  - User story link : Rendre la feature maintenable.
  - Depends on : Taches 3 a 8.
  - Validate with : revue docs + `git diff --check`.
  - Notes : Mettre aussi `docs/COMPONENTS.md`, `docs/PLATFORM_BEHAVIOR.md`, `docs/VERIFICATION.md`, `shipglows_data/technical/code-docs-map.md`.

## Acceptance Criteria

- [ ] CA 1 : Given la config par defaut, when l'utilisateur ouvre le clavier Android, then la barre affiche un contenu equivalent a l'etat actuel sans regression de hauteur ou de layout.
- [ ] CA 2 : Given `mode=hidden`, when le clavier est mesure et dessine, then aucune hauteur de status bar persistante n'est reservee.
- [ ] CA 3 : Given `mode=standard` avec date/time/account actives, when le clavier s'ouvre en champ normal, then la barre affiche les modules dans un ordre stable et tronque proprement les libelles longs.
- [ ] CA 4 : Given un champ password/OTP/noPersonalizedLearning, when la barre est active, then les modules compte et tips comportementaux sont masques.
- [ ] CA 5 : Given un message transitoire `Ctrl on`, when la barre est visible, then il remplace temporairement les modules puis expire.
- [ ] CA 6 : Given la barre est hidden et une action echoue, when l'utilisateur appuie sur une action indisponible, then un feedback recuperable existe via Toast/diagnostic sans reapparition permanente de la barre.
- [ ] CA 7 : Given le module time actif, when la minute change, then l'heure se met a jour au plus une fois par minute et le callback est annule quand l'IME est detruit.
- [ ] CA 8 : Given l'utilisateur pin une action pour la premiere fois, when les tips sont en mode standard et pas en cooldown, then un nudge eligible peut apparaitre une seule fois selon la cap journaliere.
- [ ] CA 9 : Given l'utilisateur desactive les tips, when il utilise mic/clipboard/actions, then aucun nudge educatif n'apparait.
- [ ] CA 10 : Given l'utilisateur reset les tips, when une condition redevient eligible, then les tips peuvent reapparaitre selon cooldown et cap.
- [ ] CA 11 : Given un logout ou passage en mode local, when le clavier est rouvert, then l'ancien email n'est plus affiche.
- [ ] CA 12 : Given AndroidKeyboardBridge sur plateforme non Android, when Settings charge la config, then l'app retourne des defaults et n'affiche pas de controle natif trompeur.
- [ ] CA 13 : Given une config corrompue dans SharedPreferences, when l'IME demarre, then il fallback en config safe et expose un status diagnostic redige.
- [ ] CA 14 : Given un theme custom faible contraste, when la barre rend le texte, then elle utilise les couleurs valides du theme ou un fallback lisible.
- [ ] CA 15 : Given les diagnostics sont copies depuis Settings, when ils contiennent des events status bar, then aucun contenu utilisateur, email complet non voulu, clipboard ou transcription n'est present.
- [ ] CA 16 : Given le clavier est dans un champ prive ou sensible, when un event d'adoption devient techniquement observable, then il n'est pas persiste, ne declenche pas de nudge futur et n'apparait pas dans les diagnostics.

## Test Strategy

- Dart unit tests:
  - `KeyboardStatusBarConfig.fromMap/toMap/defaults/validation`.
  - `AndroidKeyboardStatus.fromMap` with new status bar fields.
  - `SettingsKeyboardController` load/save/reset status bar preferences.
- Flutter widget tests:
  - Settings controls: hidden/compact/standard/smart, module toggles, tips off/minimal/standard, reset tips.
  - Keyboard preview renders hidden status without layout gap and standard status without overflow.
  - Non-Android unsupported fallback.
- Kotlin/native tests where project harness allows:
  - `KeyboardStatusBarModels` validation.
  - `KeyboardStatusBarPresenter` priority ordering, private suppression, transient TTL, nudge cooldown/caps.
  - `KeyboardStateStore` corrupt preference fallback.
  - Adoption event suppression for private/sensitive fields.
- Manual Android QA on physical device:
  - Enable/disable bar.
  - Test date/time/account.
  - Test private fields.
  - Test modifier messages.
  - Pin/unpin action and verify nudge behavior.
  - Rotate/split screen/large font/compact keyboard.
- Validation commands:
  - `dart format --set-exit-if-changed .`
  - `git diff --check`
  - `flutter analyze`
  - `flutter test test/settings_platform_controllers_test.dart test/widget_test.dart test/onboarding_permission_contract_test.dart`
  - Android compile/build validation must run through GitHub Actions/Blacksmith or Diane device QA per CLAUDE.md guardrail, not local Gradle/APK build on this VM.

## Risks

- High privacy risk if tips or diagnostics accidentally capture typed content or account identity.
- UX risk if the bar becomes noisy and feels like advertising inside the keyboard.
- Layout risk because hidden status changes measured keyboard height.
- Performance risk if time refresh or tips cause excessive invalidation.
- State risk because native IME can run without Flutter and must still have safe defaults.
- Product risk if remote analytics is added casually later without consent and retention design.
- Accessibility risk if status text wraps poorly or steals too much height.

## Execution Notes

- Read first:
  - `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`
  - `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/actions/KeyboardActionBarController.kt`
  - `lib/core/platform/android_keyboard_bridge.dart`
  - `lib/features/settings/presentation/settings_screen_sections.dart`
- Implement foundation before UI: shared models, native store, presenter, view wiring, bridge, settings, preview, docs.
- Keep v1 local-only. Do not touch Firestore `clientEvents` or add analytics SDKs in this chantier.
- Avoid adding a generic event bus. Use a typed, bounded adoption store with an explicit allowlist of event ids.
- Avoid putting business-copy strings deep in random callbacks. Keep nudge catalog centralized and testable.
- Keep final user-facing labels in a localizable catalog; French product-visible strings must use proper accents.
- Stop and reroute to a privacy spec before any remote behavior collection, cohorting, A/B test, external connector, or cloud sync of adoption events.
- Stop and reroute to design review if hidden mode causes serious row crowding or text overflow in large-font accessibility mode.

## Open Questions

None for v1. The spec deliberately chooses a conservative local-first approach: no remote analytics, no external connectors, no content tracking, and no sync of adoption state. Future remote product analytics or connector-driven status modules require a separate reviewed spec.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-17 08:10:37 UTC | sf-spec | GPT-5 Codex | Created full feature/architecture spec for optional keyboard status bar and local progressive disclosure. | Draft saved in chantier registry. | /sf-ready Keyboard status bar progressive disclosure |
| 2026-05-17 09:22:32 UTC | sf-ready | GPT-5 Codex | Reviewed structure, metadata, user story alignment, behavior contracts, task ordering, docs/freshness posture, adversarial cases, language doctrine, and security posture. | ready | /sf-start Keyboard status bar progressive disclosure |
| 2026-05-17 11:01:22 UTC | sf-start | GPT-5.3-Codex | Updated Android keyboard status bar model/storage/channel wiring and fixed Kotlin import/build-blocker; started implementation continuation from prior partial state. | implemented | /sf-verify Keyboard status bar progressive disclosure |
| 2026-05-17 12:18:55 UTC | sf-verify | GPT-5 Codex | Verified end-to-end wiring, checked required docs/rules, and ran Dart controller tests. | partial | /sf-end Keyboard status bar progressive disclosure |

## Current Chantier Flow

- sf-spec: done, draft saved.
- sf-ready: done, ready.
- sf-start: launched, implemented.
- sf-verify: launched, partial.
- sf-end: not launched.
- sf-ship: not launched.

Prochaine commande recommandee: `/sf-end Keyboard status bar progressive disclosure`.
