---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-04-29"
created_at: "2026-04-29 16:48:07 UTC"
updated: "2026-05-09"
updated_at: "2026-05-09 21:50:00 UTC"
status: reviewed
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "android-ime-keyboard"
owner: "Diane"
confidence: high
user_story: "En tant qu'utilisateur Android de WinGlows, je veux remplacer ou completer mon clavier par un IME WinGlows keyboard avec dictee, presse-papiers synchronise et controles media, afin de produire, reutiliser et piloter du texte sans quitter l'application active."
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Flutter app"
  - "Android InputMethodService"
  - "Android ClipboardManager"
  - "Android AudioManager media keys"
  - "Android MediaSessionManager optional active sessions"
  - "Android overlay/accessibility services"
  - "ClipboardHistoryApi"
  - "ClipboardHistoryStore"
  - "Backend-agnostic stores"
  - "Firebase first adapter"
  - "speech_to_text"
  - "record"
depends_on:
  - artifact: "shipglows_data/business/business.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/business/product.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/business/branding.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/guidelines.md"
    artifact_version: "0.1.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md"
    artifact_version: "0.1.0"
    required_status: "ready"
  - artifact: "docs/OVERLAY_ANDROID.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "docs/PLATFORM_BEHAVIOR.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
supersedes: []
evidence:
  - "No current Android IME declaration found in android/app/src/main/AndroidManifest.xml: no InputMethodService, BIND_INPUT_METHOD, or input_method metadata."
  - "Existing Android bridge covers overlay permission/status/start/stop/cancel in lib/core/platform/android_overlay_bridge.dart and android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt."
  - "Existing Android service is overlay foreground recording state only in android/app/src/main/kotlin/com/winglowz_app/winglowz_app/OverlayForegroundService.kt."
  - "Legacy Expo overlay contains reusable concepts for bubble UI, waveform, accessibility injection, and clipboard fallback in modules/floating-overlay/android/src/main/java/expo/modules/floatingoverlay/."
  - "Supabase already has user-scoped transcriptions, clipboard_items, snippets, dictionary_terms, user_settings, client_events with RLS and realtime in supabase/migrations/20260427084000_init_winglowz_app.sql."
  - "shipglows_data/workflow/specs/clipboard-backend-agnostic-api.md records the 2026-05-08 decision that clipboard behavior must go through ClipboardHistoryApi/ClipboardHistoryStore and keep Supabase as a replaceable adapter."
  - "Android Developers: Create an input method, https://developer.android.com/develop/ui/views/touch-and-input/creating-input-method"
  - "Android Developers: Copy and paste, https://developer.android.com/guide/topics/text/copy-paste"
  - "Android Developers: MediaSessionManager, https://developer.android.com/reference/android/media/session/MediaSessionManager"
  - "Android Developers: AudioManager dispatchMediaKeyEvent, https://developer.android.com/reference/android/media/AudioManager"
next_step: "/sf-ready shipglows_data/workflow/specs/proprietary-swipe-corner-android-keyboard.md"
---

# Title

Android IME WinGlows keyboard

# Status

Legacy-ready for the already implemented IME foundation. New keyboard work should continue from `shipglows_data/workflow/specs/proprietary-swipe-corner-android-keyboard.md` and the Firebase/backend-agnostic migration spec. Clipboard work defers to `shipglows_data/workflow/specs/clipboard-backend-agnostic-api.md`; Firebase is the first planned cloud adapter, and neither the IME nor UI should couple directly to a backend provider.

# User Story

En tant qu'utilisateur Android de WinGlows, je veux remplacer ou completer mon clavier par un IME WinGlows keyboard avec dictee, presse-papiers synchronise et controles media, afin de produire, reutiliser et piloter du texte sans quitter l'application active.

Acteur principal: utilisateur Android authentifie ou en mode local degrade.

Declencheurs principaux:

- L'utilisateur choisit WinGlows comme clavier Android actif.
- L'utilisateur tape, dicte, colle, copie une selection, insere un snippet ou lance une action depuis la barre d'outils du clavier.
- L'utilisateur appuie sur play/pause media depuis le clavier.

Resultat observable attendu: le champ actif recoit le texte demande, l'utilisateur voit l'etat exact de dictee/sync/permissions, les elements clipboard autorises sont conserves localement puis synchronises par compte quand un backend configure est disponible, et les controles media agissent sur la session media courante sans lire de contenu inutile.

# Minimal Behavior Contract

Quand WinGlows est selectionne comme clavier Android, il affiche un clavier utilisable dans tout champ texte compatible avec une barre d'actions WinGlows; l'utilisateur peut saisir du texte, lancer/arreter/annuler une dictee, inserer le resultat dans le champ actif, enregistrer ce resultat dans l'historique et le clipboard synchronise si l'option est activee, ouvrir un panneau clipboard/snippets, et envoyer play/pause au media courant. Si une permission, un backend de sync, le micro, le presse-papiers, la session media ou le champ actif n'est pas disponible, le clavier doit afficher une action de recuperation ou tomber sur un mode degrade sans perte du texte deja produit. L'edge case facile a rater est que l'IME fonctionne dans des champs sensibles ou limites: il ne doit jamais capturer, synchroniser, journaliser ou injecter silencieusement du texte dans un champ password/OTP/sensible detecte ou dans un contexte ou Android refuse l'acces.

# Success Behavior

- Given WinGlows est active comme clavier, when l'utilisateur ouvre un champ texte standard, then le clavier apparait avec les touches essentielles, la barre WinGlows, un bouton dictee, un bouton clipboard, un bouton snippets/settings, et un bouton play/pause.
- Given un champ texte standard est focalise, when l'utilisateur tape, then le texte est insere via `InputConnection.commitText` et les actions retour/arriere/espace/entree suivent le comportement attendu du champ.
- Given le micro est autorise et aucun enregistrement n'est actif, when l'utilisateur appuie sur dictee, then le clavier affiche un etat recording, une action stop, une action cancel, et une notification foreground si Android l'exige.
- Given une dictee se termine avec du texte, when le resultat est accepte, then le texte est insere dans le champ actif, cree une transcription source `keyboard`, et cree un item clipboard source `keyboard_voice` seulement si la sync clipboard clavier est activee.
- Given clipboard sync clavier est activee et l'utilisateur colle depuis le panneau WinGlows, when le contenu est insere, then l'item est marque avec son origine, dedupe par hash normalise, borne en taille, et remis a `ClipboardHistoryApi`/`ClipboardHistoryStore` pour stockage local puis sync provider.
- Given un media joue dans une autre app, when l'utilisateur appuie sur play/pause, then WinGlows envoie un media key event au consommateur media courant et affiche un etat bref de succes ou d'indisponibilite.
- Given l'utilisateur n'est pas connecte, when il utilise le clavier, then la saisie, la dictee locale et le clipboard local restent utilisables; les sync cloud sont en etat pending ou disabled avec une explication visible dans Settings.
- Given l'app principale est ouverte, when l'utilisateur consulte Settings, then il voit les statuts: IME actif/inactif, micro, clipboard sync, media controls, overlay, accessibility, backend sync et sync pending/error.

# Error Behavior

- Si WinGlows n'est pas active comme clavier systeme, Settings doit proposer un lien vers les reglages Android d'input method et ne pas pretendre que le clavier est disponible.
- Si le champ actif est password, OTP, noPersonalizedLearning, non-editable, absent ou limite par l'app hote, l'IME doit desactiver capture/sync/injection enrichie et afficher un mode "saisie privee" ou "champ limite".
- Si le micro est refuse ou revoke, la dictee ne demarre pas, aucun enregistrement fantome ne tourne, et l'utilisateur voit une action vers les permissions.
- Si la dictee echoue, timeout, retourne vide ou est annulee, aucun item transcription/clipboard vide n'est cree; le texte partiel reste localement visible seulement si l'utilisateur choisit de le conserver.
- Si le backend de sync est indisponible, les items eligibles restent dans un store/queue local borne et visible; les retries sont bornes; aucune mutation partielle ne peut creer de donnees cross-user.
- Si la session auth change ou logout arrive pendant que l'IME est ouvert, la sync cloud se coupe immediatement, la queue de l'ancien compte n'est pas exposee au nouveau compte, et le clavier continue en mode local.
- Si play/pause n'a aucun media consumer, WinGlows affiche un feedback bref "Aucun media actif" et ne demande pas de permission invasive.
- Si les permissions notification listener/media session enrichie sont absentes, seul le play/pause generique par media key est disponible; les metadonnees media restent masquees.
- Si le texte depasse les limites, il est tronque uniquement apres confirmation utilisateur ou rejete avec un message recuperable; aucun secret, audio brut, texte brut sensible ou provider payload n'est loggue dans `client_events`.

# Problem

WinGlows a deja une base Flutter + Supabase et un debut de pont Android overlay, mais le vrai point d'entree systeme souhaite pour Android est le clavier. L'overlay reste utile, mais il depend de permissions fragiles et d'un modele hors-IME. Un IME donne une surface plus naturelle pour dicter, inserer, reutiliser des snippets, gerer un clipboard WinGlows et controler le media en cours pendant que l'utilisateur ecrit dans n'importe quelle app. Depuis le 2026-05-08, le clipboard doit rester backend-agnostic: l'IME emet des actions vers `ClipboardHistoryApi`/`ClipboardHistoryStore`, et Supabase n'est qu'un adaptateur de sync possible.

# Solution

Ajouter un IME Android natif Kotlin `WinGlowzInputMethodService` avec une UI clavier native et une barre d'actions WinGlows. Le clavier s'integre avec les fondations Flutter via des ponts limites: Settings et historique restent dans Flutter, les operations clavier temps reel restent natives, et les donnees clipboard synchronisables passent par l'API/store backend-agnostic avant tout adaptateur provider. Les capacites sensibles sont progressives: saisie de base sans compte, dictee avec micro, clipboard sync opt-in avec auth/backend configure, play/pause media sans metadata par defaut, metadata/media sessions uniquement apres permission utilisateur explicite.

# Scope In

- Android uniquement pour l'IME initial.
- Declaration systeme IME: service, permission `android.permission.BIND_INPUT_METHOD`, intent `android.view.InputMethod`, metadata XML input method, label et settings activity.
- UI clavier native Kotlin pour layout texte minimal, backspace, enter, space, shift/case, punctuation de base, action row WinGlows.
- Barre d'actions: dictee, clipboard WinGlows, snippets, settings, play/pause media.
- Dictee depuis le clavier avec etats idle/recording/processing/result/error/canceled.
- Insertion directe via `InputConnection` dans le champ actif quand autorise.
- Detection et mode degrade pour champs sensibles ou limites a partir de `EditorInfo.inputType`, `imeOptions`, `privateImeOptions` quand disponibles, et contraintes `InputConnection`.
- Clipboard WinGlows: copier la selection via action explicite, coller depuis clipboard systeme via action explicite, inserer un item WinGlows, afficher recents, pin/delete, dedupe, queue/store local, sync backend opt-in via `ClipboardHistoryApi`/`ClipboardHistoryStore`.
- Adapter/schema evolution pour distinguer origines clavier, hashes de dedupe, device id, sync state et preferences clavier; Supabase reste l'adaptateur cloud actuel.
- Settings Flutter pour activer/configurer: clavier, dictee, clipboard sync clavier, media controls, privacy mode, queue sync.
- Controle media initial: play/pause generique via media key event; feedback utilisateur.
- Controle media enrichi optionnel: verifier permission notification listener/media session avant lecture active sessions; pas de metadata par defaut.
- Coexistence avec Android overlay: le clavier devient la surface prioritaire; overlay reste fallback ou mode complementaire.
- Tests automatiques Dart/SQL/Kotlin lorsque possible et pass manuel Android reel.
- Documentation produit, plateforme, securite, verification et README.

# Scope Out

- iOS custom keyboard dans cette phase.
- Desktop/web keyboard equivalent.
- Remplacement complet de Gboard avec prediction avancee, autocorrect multilingue, glide typing, emoji/sticker complet, themes publics ou marketplace.
- Capture globale de tout le presse-papiers Android en arriere-plan. Le scope initial capture uniquement les actions explicites realisees via le clavier WinGlows ou les elements synchronises depuis le compte.
- Lecture de metadata media, pochette, file d'attente ou controle par app sans permission notification listener/media session explicite.
- Synchronisation de secrets BYOK, audio brut, contenu de champs password/OTP/sensibles.
- Accessibilite comme mecanisme principal d'injection pour le clavier. L'IME utilise `InputConnection`; accessibility reste reservee a l'overlay.
- Billing, entitlement premium et pricing runtime.

# Constraints

- Le repo cible reste Flutter avec Supabase comme adaptateur actuel; pas de retour vers Expo/Convex et pas de couplage direct IME/UI vers Supabase.
- L'IME Android doit etre natif Kotlin. Ne pas embarquer une vue Flutter complete dans le clavier tant qu'un spike n'a pas prouve latence, cycle de vie et stabilite.
- Le clavier doit rester utilisable sans reseau et sans session backend.
- Toute synchronisation clipboard est opt-in, visible et desactivable.
- Le presse-papiers et la dictee manipulent potentiellement des donnees sensibles; aucune capture silencieuse.
- Le service IME ne doit pas journaliser le texte saisi, dicte ou colle.
- Les limites existantes restent applicables: 100000 caracteres max transcription, 50000 caracteres max clipboard item, retries bornes, timeouts visibles.
- Le service role Supabase reste interdit dans tout client mobile/web/desktop, et le natif Android ne doit pas embarquer de credentials backend.
- Les policies RLS doivent utiliser `auth.uid()` comme source d'identite; le client ne doit pas envoyer un `user_id` de confiance.
- Les controles media doivent commencer par une commande generique play/pause sans permission invasive; toute session enrichie est opt-in.
- Les plateformes non Android ne doivent pas afficher de promesse IME.

# Dependencies

- Flutter 3.x / Dart 3.x, `flutter_riverpod`, `go_router`, `supabase_flutter`, `flutter_secure_storage`, `permission_handler`, `record`, `speech_to_text`.
- Android Kotlin native in `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/`.
- Android official docs checked:
  - `InputMethodService` / custom IME: official docs state an Android IME is an app service extending `InputMethodService`, declared in manifest with `BIND_INPUT_METHOD`, `android.view.InputMethod` intent, and metadata XML.
  - Clipboard: official docs define `ClipboardManager`, Android 13 clipboard UI behavior, and sensitive content flags for `ClipDescription`.
  - MediaSessionManager: active sessions require `MEDIA_CONTENT_CONTROL` or enabled `NotificationListenerService`; therefore rich media metadata/control is permission-gated.
  - AudioManager: `dispatchMediaKeyEvent` sends media key events to the current media key consumer; suitable for initial play/pause without reading metadata.
- Supabase references loaded:
  - `supabase-db.md` last reviewed 2026-04-26: RLS required on exposed tables, `auth.uid()` ownership, no service role in client.
  - `supabase-auth.md` last reviewed 2026-04-26: Auth session lifecycle and downstream RLS coupling.
- Fresh docs verdict: `fresh-docs checked` for Android IME, clipboard and media controls; `fresh-docs checked` via ShipGlows references for Supabase Auth/DB.

# Invariants

- User text ownership is per backend auth user and per local account/session boundary.
- IME operations are explicit user actions; no background recorder, no background clipboard siphon.
- Sensitive fields disable WinGlows learning/sync/capture features.
- Clipboard fallback remains available for voice output, but sync is independent and opt-in.
- Logout clears account-scoped sync state from active keyboard memory.
- Dedupe never crosses users.
- Delete/tombstone wins over stale sync events.
- IME clipboard events target the backend-agnostic clipboard contract; Supabase is only one adapter behind that contract.
- Media controls do not require reading the user's media metadata in the base implementation.
- Overlay and IME cannot start simultaneous recordings.
- UI must tell the truth about unsupported platform states.

# Links & Consequences

- `android/app/src/main/AndroidManifest.xml`: gains IME service declaration and possibly notification listener declaration if rich media controls are enabled in a later task.
- `android/app/src/main/res/xml/`: gains input method metadata XML.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/`: gains native IME services/controllers and may refactor shared overlay recording state to prevent concurrent sessions.
- `lib/core/platform/`: gains Android keyboard bridge/capabilities parallel to overlay bridge.
- `lib/features/settings/`: gains keyboard settings/status and permission recovery flows.
- `lib/features/clipboard/`: exposes source-aware keyboard clipboard history and sync state through `ClipboardHistoryApi`/`ClipboardHistoryStore`.
- `lib/features/voice/`: must treat source `keyboard` as first-class alongside free/advanced/overlay.
- `supabase/migrations/`: gains adapter migration for keyboard-related settings and clipboard/transcription origin metadata while Supabase is enabled.
- `supabase/tests/rls_smoke.sql`: expands RLS and constraint tests for keyboard rows.
- `docs/OVERLAY_ANDROID.md`: must clarify overlay is complementary, not the primary Android entrypoint.
- `docs/PLATFORM_BEHAVIOR.md`: must add Android IME capability row/column.
- Security consequence: keyboard access is high trust; spec requires privacy mode, sensitive field gating, explicit opt-in sync, and minimal logs.
- Performance consequence: IME cold start and key latency are user-critical; native UI avoids Flutter engine cold-start inside the keyboard.
- Accessibility consequence: IME must support large text, touch targets, hardware keyboard compatibility where feasible, and screen reader labels.

# Documentation Coherence

Update or create:

- `README.md`: current scope and Android IME setup command/manual steps.
- `docs/PLATFORM_BEHAVIOR.md`: Android IME capability, non-Android exclusion, clipboard/media permission matrix.
- `docs/OVERLAY_ANDROID.md`: relationship between overlay and IME.
- `docs/VERIFICATION.md`: Android IME manual QA matrix.
- `docs/API_SUPABASE.md`: provider fields, constraints, realtime behavior and RLS tests while Supabase remains enabled.
- `docs/COMPONENTS.md`: keyboard settings, clipboard panel, voice controls.
- `shipglows_data/business/product.md` and `shipglows_data/business/business.md`: if the IME becomes primary positioning rather than overlay.
- Support/onboarding copy: Android enable keyboard, switch keyboard, privacy warning for custom keyboards, clipboard sync opt-in.

# Edge Cases

- WinGlows IME selected before user ever opens the app.
- User opens IME while logged out or after session expiry.
- Device offline during dictation result save.
- User switches to another keyboard mid-recording.
- App process killed while IME service is open.
- Rotation, split screen, external keyboard, foldable screen, floating keyboard mode.
- Password, OTP, credit card, private browser or app-defined sensitive fields.
- Host app denies `InputConnection` reads or selected text access.
- Very long selected text or paste payload.
- Clipboard system returns null, stale item, non-text content or sensitive flag.
- Android 13+ clipboard preview reveals content unless sensitive flag is set for WinGlows-origin sensitive copies.
- Multiple devices sync same clipboard content in different order.
- User A logs out and User B logs in on same device before local queue syncs.
- Supabase realtime delivers stale update after local delete.
- Rapid tap on mic/start/stop/cancel starts duplicate recording.
- Overlay recording already active when IME mic is pressed.
- Active media app ignores play/pause media key.
- Notification listener permission revoked after rich media controls were enabled.
- OEM keyboard/IME restrictions differ on Samsung, Pixel, Xiaomi, Oppo.

# Implementation Tasks

- [x] Tache 1 : Creer le contrat technique IME local
  - Fichier : `docs/PLATFORM_BEHAVIOR.md`
  - Action : Ajouter la capacite Android IME, ses permissions, ses limites et son rapport avec overlay/clipboard/media.
  - User story link : clarifie ce que l'utilisateur peut attendre du clavier.
  - Depends on : cette spec.
  - Validate with : revue documentaire, absence de promesse IME hors Android.
  - Notes : garder les autres plateformes explicitement hors scope.

- [x] Tache 2 : Ajouter la declaration Android IME
  - Fichier : `android/app/src/main/AndroidManifest.xml`
  - Action : Declarer `WinGlowzInputMethodService` avec `android.permission.BIND_INPUT_METHOD`, intent `android.view.InputMethod`, exported true selon contrat Android IME, et metadata `@xml/winglowz_app_input_method`.
  - User story link : rendre WinGlows selectable comme clavier Android.
  - Depends on : Tache 1.
  - Validate with : build Android et verification que WinGlows apparait dans les reglages clavier.
  - Notes : ne pas casser les declarations overlay/accessibility existantes.

- [x] Tache 3 : Ajouter metadata et libelles IME
  - Fichier : `android/app/src/main/res/xml/winglowz_app_input_method.xml`, `android/app/src/main/res/values/strings.xml`
  - Action : Definir le label, settings activity, subtype(s) initiales et description utilisateur.
  - User story link : permettre a Android d'exposer proprement le clavier.
  - Depends on : Tache 2.
  - Validate with : inspection APK/manifest merger et test appareil.
  - Notes : commencer avec une subtype generique multilangue plutot que promettre des layouts complets.

- [x] Tache 4 : Creer le service IME natif
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzInputMethodService.kt`
  - Action : Etendre `InputMethodService`, gerer lifecycle, `onCreateInputView`, `onStartInputView`, `onFinishInputView`, et exposer un `InputConnection` controller.
  - User story link : afficher le clavier dans les apps.
  - Depends on : Tache 3.
  - Validate with : Android build + test manuel dans Messages/Notes/browser.
  - Notes : ne pas demarrer Flutter depuis l'IME pour le rendu initial.

- [x] Tache 5 : Implementer UI clavier minimale native
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Construire layout QWERTY minimal, espace, entree, backspace, shift/case, ponctuation de base, action row WinGlows.
  - User story link : permettre la saisie de base sans dependance IA.
  - Depends on : Tache 4.
  - Validate with : saisie dans plusieurs champs, latence acceptable, touches accessibles.
  - Notes : garder les dimensions stables et eviter une UI marketing.

- [x] Tache 6 : Ajouter policy de champ sensible
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardSecurityPolicy.kt`
  - Action : Detecter password/visible password/web password/number password/OTP-like/noPersonalizedLearning/private flags quand disponibles et desactiver capture, sync, suggestions et dictee persistante.
  - User story link : proteger l'utilisateur dans les champs sensibles.
  - Depends on : Tache 4.
  - Validate with : tests unitaires Kotlin + test manuel password/OTP.
  - Notes : preferer faux negatif securise: si doute fort, mode prive.

- [x] Tache 7 : Centraliser l'etat clavier local
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`
  - Action : Stocker preferences locales non sensibles: enable voice row, clipboard sync desired, media controls enabled, pending queue counters, last error.
  - User story link : garder le clavier coherent entre sessions.
  - Depends on : Tache 4.
  - Validate with : restart app/process, settings visibles.
  - Notes : ne pas stocker texte sensible dans SharedPreferences non chiffrees.

- [x] Tache 8 : Creer pont Flutter pour statut IME
  - Fichier : `lib/core/platform/android_keyboard_bridge.dart`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`
  - Action : Ajouter un `MethodChannel` `winglowz_app/keyboard` pour lire statut IME, ouvrir settings input method, lire/ecrire preferences clavier.
  - User story link : permettre a Settings d'accompagner l'activation.
  - Depends on : Tache 7.
  - Validate with : tests Dart de parsing + test manuel Settings.
  - Notes : separer clairement overlay bridge et keyboard bridge.

- [x] Tache 9 : Ajouter Settings clavier
  - Fichier : `lib/features/settings/presentation/settings_screen.dart`
  - Action : Afficher statut clavier actif, boutons ouvrir reglages Android, toggles dictee, clipboard sync clavier, media controls, privacy mode, queue sync.
  - User story link : rendre les permissions et limites recuperables.
  - Depends on : Tache 8.
  - Validate with : widget tests + manuel Android.
  - Notes : ne pas afficher ces controles comme disponibles hors Android.

- [x] Tache 10 : Ajouter controle media play/pause de base
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardMediaController.kt`
  - Action : Envoyer `KEYCODE_MEDIA_PLAY_PAUSE` press/release via `AudioManager.dispatchMediaKeyEvent` depuis le bouton clavier.
  - User story link : permettre play/pause depuis le clavier.
  - Depends on : Tache 5.
  - Validate with : Spotify/YouTube Music/podcast app active; feedback si aucun consumer.
  - Notes : ne pas lire metadata media dans cette tache.

- [ ] Tache 11 : Preparer media controls enrichis optionnels
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/media/WinGlowzNotificationListenerService.kt`, `android/app/src/main/AndroidManifest.xml`
  - Action : Ajouter un service notification listener desactive par defaut pour future lecture active sessions, avec Settings recovery.
  - User story link : ouvrir la porte a boutons media plus riches sans bloquer play/pause.
  - Depends on : Tache 10.
  - Validate with : permission absente = aucune metadata lue; permission active = active sessions accessibles.
  - Notes : peut etre differe si la premiere release ne veut que play/pause.

- [x] Tache 12 : Definir modeles clavier dans le domaine Dart
  - Fichier : `lib/features/keyboard/domain/keyboard_models.dart`
  - Action : Modeliser status, privacy mode, sync mode, media controls, voice state, queue state.
  - User story link : rendre le clavier pilotable depuis app et tests.
  - Depends on : Tache 8.
  - Validate with : `flutter test`.
  - Notes : domaine Dart, pas UI.

- [x] Tache 13 : Etendre les sources transcription
  - Fichier : `lib/features/voice/domain/transcription_draft.dart`, `supabase/migrations/*`
  - Action : Ajouter source `keyboard` ou `keyboard_voice` selon convention finale et contrainte SQL correspondante.
  - User story link : distinguer la dictee lancee depuis le clavier.
  - Depends on : Tache 12.
  - Validate with : test Dart existant adapte + SQL constraint test.
  - Notes : garder `overlay` pour l'ancien flux.

- [x] Tache 14 : Etendre schema clipboard pour origine clavier et dedupe
  - Fichier : `supabase/migrations/YYYYMMDDHHMMSS_keyboard_ime.sql`
  - Action : Ajouter champs compatibles: `content_hash`, `origin_surface`, `origin_device_id`, `capture_method`, indexes uniques partiels par user/hash/source si approprie, settings clavier dans `user_settings`.
  - User story link : creer un registre fiable des copies/colles via clavier.
  - Depends on : Tache 13.
  - Validate with : migration apply + RLS smoke.
  - Notes : ne pas casser les rows existantes.

- [x] Tache 15 : Mettre a jour API Supabase docs
  - Fichier : `docs/API_SUPABASE.md`
  - Action : Documenter nouveaux champs, allowlists, limites, RLS, realtime, dedupe et delete-wins.
  - User story link : rendre la sync implementable sans ambiguite.
  - Depends on : Tache 14.
  - Validate with : coherence migration/docs.
  - Notes : inclure client mobile user-context uniquement.

- [x] Tache 16 : Implementer repository clipboard source-aware
  - Fichier : `lib/data/supabase/clipboard_repository.dart`
  - Action : Ajouter insert avec metadata clavier, hash normalise, content type, origin, dedupe et erreurs recuperables.
  - User story link : synchroniser seulement ce que l'utilisateur autorise.
  - Depends on : Tache 14.
  - Validate with : tests repository avec Supabase mock/fake ou integration.
  - Notes : aucune confiance dans `user_id` client.

- [ ] Tache 17 : Creer stockage local queue clavier
  - Fichier : `lib/features/keyboard/data/keyboard_sync_queue.dart`, Android storage associe si necessaire
  - Action : Queue bornee pour items clavier syncables quand offline/logout; separation stricte par auth user et device id.
  - User story link : ne pas perdre les textes utiles hors reseau.
  - Depends on : Tache 16.
  - Validate with : tests logout/offline/flush.
  - Notes : choisir storage avant implementation; ne pas stocker champs sensibles.

- [ ] Tache 18 : Implementer panneau clipboard clavier
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardClipboardController.kt`
  - Action : Lire items locaux recents, inserer dans champ, copier selection explicite, coller system clipboard sur action explicite, remonter events syncables.
  - User story link : avoir un registre de ce qui est copie/colle via le clavier.
  - Depends on : Tache 17.
  - Validate with : copier/coller dans apps reelles + champs sensibles.
  - Notes : pas de surveillance globale en background.

- [ ] Tache 19 : Integrer snippets dans le clavier
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardSnippetController.kt`, `lib/data/supabase/snippet_repository.dart`
  - Action : Exposer snippets recents/favoris dans action row et insertion directe.
  - User story link : reutiliser du texte structure sans quitter l'app.
  - Depends on : Tache 18.
  - Validate with : insertion snippet + RLS own-user.
  - Notes : les snippets sont user-scoped.

- [ ] Tache 20 : Brancher dictee clavier
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardVoiceController.kt`
  - Action : Demarrer/stop/cancel dictee depuis IME, partager un verrou avec overlay, produire resultat inserable, transcription et clipboard event eligible.
  - User story link : faire du clavier la porte d'entree principale de la dictee.
  - Depends on : Tache 6, Tache 13, Tache 17.
  - Validate with : manuel micro autorise/refuse, rapid tap, switch keyboard, logout.
  - Notes : reutiliser le pipeline existant quand possible; sinon isoler un service Android natif explicite.

- [ ] Tache 21 : Verrouiller concurrence IME/overlay
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/RecordingCoordinator.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/OverlayForegroundService.kt`
  - Action : Garantir une seule session recording active entre overlay, app et clavier.
  - User story link : eviter doublons et etats contradictoires.
  - Depends on : Tache 20.
  - Validate with : tests start overlay puis clavier et inversement.
  - Notes : stop/cancel idempotents.

- [ ] Tache 22 : Ajouter events client non sensibles
  - Fichier : `lib/data/supabase/client_event_repository.dart`, `supabase/migrations/*`
  - Action : Journaliser uniquement statuts non sensibles: keyboard_enabled, permission_denied, sync_error_count, media_control_unavailable.
  - User story link : diagnostiquer sans exposer le contenu utilisateur.
  - Depends on : Tache 14.
  - Validate with : SQL metadata rejects sensitive keys.
  - Notes : aucun raw text/audio/provider payload.

- [x] Tache 23 : Tests SQL/RLS clavier
  - Fichier : `supabase/tests/rls_smoke.sql`
  - Action : Ajouter tests own-user/cross-user/unauth/dedupe/source allowlist/delete-wins pour keyboard clipboard et transcription.
  - User story link : proteger le registre synchronise.
  - Depends on : Tache 14.
  - Validate with : pgTAP/local Supabase ou CI.
  - Notes : garder le test idempotent.

- [x] Tache 24 : Tests Flutter
  - Fichier : `test/keyboard_models_test.dart`, `test/widget_test.dart`
  - Action : Tester modeles, parsing bridge, settings visibility Android/non-Android, validation sources transcription.
  - User story link : eviter regressions UI/config.
  - Depends on : Tache 12, Tache 13.
  - Validate with : `flutter test`.
  - Notes : isoler platform checks.

- [ ] Tache 25 : Tests Android natifs
  - Fichier : `android/app/src/test/...`, `android/app/src/androidTest/...`
  - Action : Tester policy champs sensibles, media controller, hash/dedupe helpers, lifecycle minimal IME si l'infra le permet.
  - User story link : securiser le coeur natif.
  - Depends on : Tache 6, Tache 10, Tache 18.
  - Validate with : Gradle tests Android ou pass manuel documente si CI indisponible.
  - Notes : ajouter infra seulement si compatible avec Flutter Android project.

- [ ] Tache 26 : Pass manuel Android reel
  - Fichier : `docs/VERIFICATION.md`
  - Action : Ajouter matrice Pixel/Samsung si disponible: activation IME, switch keyboard, saisie, dictee, clipboard, media, sensitive fields, offline, logout.
  - User story link : valider les comportements systeme non couverts par tests unitaires.
  - Depends on : Tache 2 a Tache 21.
  - Validate with : rapport manuel date.
  - Notes : Android IME necessite appareil/emulateur avec input method settings.

- [ ] Tache 27 : Alignement docs et onboarding
  - Fichier : `README.md`, `shipglows_data/business/product.md`, `shipglows_data/business/business.md`, `docs/OVERLAY_ANDROID.md`, `docs/COMPONENTS.md`
  - Action : Documenter clavier comme entree Android prioritaire, overlay complementaire, permissions, confidentialite et limites.
  - User story link : installer/configurer sans mauvaise promesse.
  - Depends on : Tache 26.
  - Validate with : revue docs, pas de promesse iOS/desktop/web.
  - Notes : garder le ton direct et honnete de BRANDING.

# Acceptance Criteria

- [ ] CA 1 : Given l'app est installee sur Android, when l'utilisateur ouvre les reglages clavier Android, then WinGlows apparait comme clavier activable.
- [ ] CA 2 : Given WinGlows est le clavier actif, when un champ texte standard est focalise, then le clavier s'affiche sans ouvrir l'app principale.
- [ ] CA 3 : Given le clavier est affiche, when l'utilisateur tape lettres/espace/backspace/entree, then le champ actif recoit les modifications attendues.
- [ ] CA 4 : Given un champ password est focalise, when le clavier s'affiche, then dictee persistante, clipboard sync, snippets et apprentissage sont desactives ou en mode prive.
- [ ] CA 5 : Given le micro est refuse, when l'utilisateur appuie sur dictee, then aucun enregistrement ne demarre et une action de recuperation est affichee.
- [ ] CA 6 : Given le micro est autorise, when l'utilisateur demarre puis stoppe une dictee, then le texte final peut etre insere dans le champ actif.
- [ ] CA 7 : Given l'utilisateur annule une dictee, when le service retourne idle, then aucune transcription ni clipboard item vide n'est cree.
- [ ] CA 8 : Given overlay recording est actif, when l'utilisateur demarre la dictee clavier, then la seconde session est refusee ou l'utilisateur doit choisir une seule session.
- [ ] CA 9 : Given clipboard sync clavier est desactivee, when l'utilisateur colle via le clavier, then le texte est insere mais aucun item provider/cloud n'est cree.
- [ ] CA 10 : Given clipboard sync clavier est activee et l'utilisateur est authentifie, when il copie/colle via le clavier, then un event clipboard user-scoped est cree via `ClipboardHistoryApi`/`ClipboardHistoryStore` avec origine clavier.
- [ ] CA 11 : Given deux utilisateurs sur le meme appareil, when User B se connecte apres User A, then User B ne voit pas la queue locale ni les clipboard items de User A.
- [ ] CA 12 : Given deux devices copient le meme contenu normalise, when la sync arrive, then le dedupe evite les doublons non voulus pour le meme user.
- [ ] CA 13 : Given un item clipboard supprime, when un evenement stale arrive ensuite, then delete-wins empeche sa restauration.
- [ ] CA 14 : Given un texte depasse 50000 caracteres pour clipboard, when l'utilisateur tente de sync, then l'action est refusee ou confirmee selon UX sans mutation partielle.
- [ ] CA 15 : Given le device est offline, when un item syncable est cree via clavier, then il reste dans une queue visible et bornee.
- [ ] CA 16 : Given la session backend expire, when la queue tente de sync, then elle passe en erreur recuperable sans fuite cross-user.
- [ ] CA 17 : Given un media joue, when l'utilisateur appuie play/pause, then Android recoit un media key event et le media change d'etat si l'app media l'accepte.
- [ ] CA 18 : Given aucun media n'est actif, when l'utilisateur appuie play/pause, then le clavier affiche un feedback bref et ne demande pas de permission supplementaire.
- [ ] CA 19 : Given notification listener n'est pas autorise, when media controls sont utilises, then aucune metadata media n'est lue.
- [ ] CA 20 : Given notification listener est autorise dans une phase enrichie, when Settings affiche les sessions media, then l'utilisateur peut desactiver cette capacite et les metadata cessent d'etre lues.
- [ ] CA 21 : Given l'utilisateur logout pendant IME ouvert, when il continue a taper, then cloud sync se desactive et l'IME reste en local sans crash.
- [ ] CA 22 : Given Android tue le process app, when l'utilisateur rouvre un champ texte, then le clavier redemarre dans un etat coherent sans session recording fantome.
- [ ] CA 23 : Given une app hote refuse `InputConnection` selected text, when l'utilisateur tente copy selection, then WinGlows affiche une erreur recuperable.
- [ ] CA 24 : Given l'utilisateur est sur iOS/web/desktop, when il ouvre Settings, then aucune activation IME Android n'est promise.
- [ ] CA 25 : Given les tests RLS sont executes, when User A tente de lire/modifier les rows clavier User B, then l'acces est refuse.
- [ ] CA 26 : Given `client_events` recoit metadata avec `token`, `raw_text`, `audio` ou `transcript`, when l'insert est tente, then la contrainte SQL refuse la row.
- [ ] CA 27 : Given la spec est implementee, when `flutter analyze`, `flutter test`, SQL smoke et Android build passent, then le chantier peut passer en verification manuelle.

# Test Strategy

- Dart unit tests: keyboard models, bridge parsing, transcription source validation, clipboard repository metadata/dedupe.
- Flutter widget tests: Settings visibility and toggles by platform capability.
- Kotlin unit tests: field sensitivity policy, media key event construction, normalized hash helpers, recording coordinator.
- Android instrumented/manual tests: IME appears in system settings, keyboard lifecycle, input insertion, permission flows, media controls, OEM behavior.
- SQL/pgTAP tests: schema constraints, source allowlists, RLS own-user/cross-user/unauth, delete-wins, sensitive metadata rejection.
- Manual security tests: password/OTP field, logout during queue, offline queue, clipboard sensitive content, no text in logs.
- Regression commands:
  - `dart format --set-exit-if-changed .`
  - `flutter analyze`
  - `flutter test`
  - `flutter build web`
  - Android build/run on real device or emulator.
  - Supabase migration apply + `supabase/tests/rls_smoke.sql`.

# Risks

- Android IME lifecycle is separate from Flutter Activity; relying on Flutter rendering inside the IME would create latency and lifecycle risk.
- Custom keyboards are high-trust surfaces; privacy copy and sensitive field behavior must be excellent.
- Clipboard access is restricted and visible on modern Android; global clipboard capture is both fragile and privacy-hostile.
- MediaSession rich controls may require notification listener permission; over-requesting would hurt trust.
- Sync queue across logout is a cross-user leakage risk.
- Multiple recording surfaces can race: app voice screen, overlay and keyboard.
- OEM Android builds can treat IMEs, overlay, clipboard and battery restrictions differently.
- Supabase schema drift could break RLS if migrations are edited manually outside repo.
- Tests may require real Android devices for confidence; emulator-only validation is insufficient.

# Execution Notes

- Read first:
  - `docs/SPEC_FLUTTER_SUPABASE_MIGRATION.md`
  - `docs/OVERLAY_ANDROID.md`
  - `android/app/src/main/AndroidManifest.xml`
  - `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`
  - `supabase/migrations/20260427084000_init_winglowz_app.sql`
- Implementation order:
  1. Native IME declaration + minimal input UI.
  2. Safety policy for sensitive fields.
  3. Settings/status bridge.
  4. Media play/pause.
  5. Schema/repository updates for keyboard source and clipboard registry.
  6. Clipboard panel and queue.
  7. Dictation integration and recording coordinator.
  8. Tests and docs.
- Prefer native Kotlin for IME UI and lifecycle. Use Flutter for app Settings/history and backend-agnostic clipboard API/store orchestration.
- Do not add broad permissions before a feature needs them. Base play/pause should not require notification listener.
- Stop conditions:
  - If WinGlows does not appear as an input method after manifest/XML tasks, stop and fix platform registration before UI work.
  - If sensitive field detection is unreliable, ship a stricter privacy mode rather than broad capture.
  - If IME cannot safely share the existing Flutter voice pipeline, create a separate spec/spike for native Android dictation service before implementing advanced transcription.
  - If sync queue storage cannot guarantee account separation, do not enable cloud sync from IME.
- Fresh external docs: checked Android official docs for IME, clipboard and media controls on 2026-04-29; checked Supabase Auth/DB ShipGlows references last reviewed 2026-04-26.

# Open Questions

- Aucune question bloquante pour demarrer la spec: le clavier Android est la priorite, play/pause media est inclus, et les autres idees futures doivent passer par une barre d'actions extensible.
- Decision non bloquante a prendre apres prototype: garder seulement play/pause en V1 ou activer aussi previous/next via media key events.
- Decision non bloquante a prendre apres prototype: niveau de sophistication du layout clavier V1 au-dela du QWERTY minimal.
- Decision non bloquante a prendre apres prototype: native Android speech recognizer dedie au clavier ou reutilisation stricte du pipeline Flutter existant.

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-04-29 16:48:07 UTC | sf-spec | GPT-5 Codex | Created Android IME WinGlows keyboard chantier spec from user request and repo investigation. | Draft saved in `shipglows_data/workflow/specs/android-ime-winglowz_app-keyboard.md`. | `/sf-ready Android IME WinGlows keyboard` |
| 2026-04-30 09:12:44 UTC | sf-ready | GPT-5 Codex | Checked readiness gate for Android IME spec, including structure, metadata, user story alignment, adversarial review, security review, and documentation freshness. | Not ready: core IME dictation/media scope decisions and secure local queue/hash contract need to be fixed in spec. | `/sf-spec Android IME WinGlows keyboard` |
| 2026-05-04 00:00:00 UTC | sf-ready | GPT-5 Codex | Rechecked readiness inside sf-build after confirming the spec now contains the missing queue, hash/dedupe, media scope, privacy and implementation-order contracts. | Ready for staged implementation. | `/sf-start Android IME WinGlows keyboard` |
| 2026-05-04 21:15:11 UTC | sf-start | GPT-5 Codex | Implemented the native Android IME foundation, Flutter keyboard bridge/Settings card, keyboard schema metadata, source-aware repository hashing, docs and tests. | Partial: local Dart/web/docs checks pass; Android APK proof is blocked by ARM64 AAPT2 tooling and Supabase RLS smoke needs a running/linked database. | `/sf-test Android IME WinGlows keyboard on Android device and linked Supabase` |
| 2026-05-04 21:15:11 UTC | sf-verify | GPT-5 Codex | Verified the implemented foundation against the spec with format, analyze, Flutter tests, web build, metadata lint, diff check, Android debug build attempt and Supabase lint attempt. | Partial: Android device/IME visibility, native APK build on x64, and SQL/RLS execution remain unproven. | `/sf-test Android IME WinGlows keyboard on Android device and linked Supabase` |
| 2026-05-04 21:15:11 UTC | sf-build | GPT-5 Codex | Orchestrated readiness recovery, governance bootstrap, implementation, docs alignment and verification for the Android IME chantier. | Partial: stopped before sf-end/sf-ship because required Android/Supabase/manual proof is incomplete. | `/sf-test Android IME WinGlows keyboard on Android device and linked Supabase` |
| 2026-05-08 17:57:25 UTC | sf-build | GPT-5 Codex | Aligned clipboard sync wording with the backend-agnostic clipboard API chantier. | partial | `/sf-start shipglows_data/workflow/specs/clipboard-backend-agnostic-api.md task 6` |

# Current Chantier Flow

- sf-spec: done, readiness blockers resolved.
- sf-ready: ready on 2026-05-04.
- sf-start: partial foundation implemented on 2026-05-04.
- sf-verify: partial on 2026-05-04; local Dart/web/docs checks passed, Android/Supabase/manual proof pending.
- sf-end: not launched; blocked by partial proof.
- sf-ship: not launched; blocked by partial proof.

Next lifecycle command: `/sf-start shipglows_data/workflow/specs/clipboard-backend-agnostic-api.md task 6`, then Android device and backend adapter proof when the IME clipboard bridge is implemented.
