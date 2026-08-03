---
artifact: verification_plan
metadata_schema_version: "1.0"
artifact_version: "1.0.1"
project: "WinGlowz"
created: "2026-04-27"
updated: "2026-05-30"
status: "reviewed"
source_skill: "sf-spec"
scope: "android_firebase_backend_agnostic_migration"
owner: "Diane"
confidence: "medium"
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
depends_on:
  - "shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md@0.1.0"
supersedes: []
evidence:
  - "shipglows_data/workflow/specs/android-ime-winglowz_app-keyboard.md"
  - "test/widget_test.dart"
  - "shipglows_data/workflow/specs/clipboard-backend-agnostic-api.md"
  - "shipglows_data/workflow/specs/windows-desktop-overlay-hotkeys-parity.md"
next_step: "/sf-start shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md"
---

# Verification — WinGlowz Android Firebase Backend-Agnostic Migration

## Required Automated Checks

- `dart format --set-exit-if-changed .`
- `git diff --check`
- `flutter analyze`
- `flutter test`
- `flutter test test/widget_test.dart`
- `./gradlew :app:compileDebugKotlin -x :app:processDebugResources -x :app:processDebugManifest -x :app:compileFlutterBuildDebug`
- Android build on a machine with Android toolchain.
- Android IME build/resource proof on an x64 Android runner when the local host is ARM64 and AAPT2 is unavailable.
- Android overlay sanity (without full build when toolchain is heavy): verify `flutter analyze`, then run on Android and check start/stop/cancel/status from Settings and Voice screens.
- Firebase configuration/rules/indexes validation when Firebase adapter is implemented.
- Firestore Security Rules tests or emulator smoke proving user-scoped isolation.

## Keyboard Sync Slice Verification — 2026-05-25

Executed locally (no Android/Gradle tasks on this VM):

- `dart format lib/features/keyboard/application/keyboard_sync_providers.dart lib/features/keyboard/application/keyboard_profile_backup_service.dart lib/features/keyboard/presentation/keyboard_sync_panel.dart lib/features/settings/presentation/settings_screen.dart lib/features/keyboard/presentation/keyboard_theme_studio_screen.dart lib/features/keyboard/presentation/keyboard_corner_shortcuts_screen.dart test/keyboard_profile_backup_service_test.dart test/keyboard_sync_panel_test.dart test/keyboard_theme_studio_screen_test.dart test/keyboard_corner_shortcuts_screen_test.dart`
- `flutter test test/keyboard_profile_backup_service_test.dart`
- `flutter test test/keyboard_sync_panel_test.dart`
- `flutter test test/keyboard_theme_studio_screen_test.dart`
- `flutter test test/keyboard_corner_shortcuts_screen_test.dart`
- `flutter analyze`

Result: passed.

Still required outside local VM:

- Blacksmith/GitHub Actions Android build proof for IME sync bridge behavior.
- Diane physical-device QA for IME-native restore/apply flows.

## Required Manual Checks

- Android: local speech, advanced recording, WinGlowz keyboard enable/switch/type/private-field behavior, keyboard dictation permission denied/allowed, keyboard clipboard actions, keyboard media play/pause, overlay permission, accessibility fallback, clipboard fallback.
- iOS/web: parity target, but native/browser overlay/quick-action hosts are not
  implemented in the current runtime. Keep platform limits documented and do
  not treat those builds as required proof for the Android MVP.
- macOS/Linux desktop overlay/hotkeys are now separate parity workstreams. They are
  not required proof for Android MVP closure, but they do require native
  runner/manual QA before any macOS/Linux parity claim.
- Windows desktop overlay/hotkeys is now a separate chantier. It is not required
  proof for Android MVP closure, but it does require Windows runner/manual QA
  before any Windows parity claim.

## Manual Platform Pass — 2026-05-10

| Surface | Status | Evidence | Remaining proof |
|---|---|---|---|
| Android overlay parity | Partial | Native overlay bubble, event queue, accessibility delivery, clipboard fallback, Settings size/opacity controls, and Blacksmith Android compile proof already exist. | Real Android device QA for bubble behavior, permissions, injection, clipboard fallback, size/opacity, and overlay/IME recording arbitration. |
| Android IME | Partial | Native IME declaration, Settings bridge, private-field gating, clipboard actions, Android speech recognition, and media key controls are implemented. | Real Android device QA for enable/switch/type/private-field/dictation/media flows. |
| iOS microphone/speech | Parity target, not current proof | `Info.plist` declares microphone and speech recognition usage descriptions for future compatibility; IME remains unavailable; overlay/quick-action host still needs a platform spec. | None for Android MVP; future iOS parity QA. |
| macOS desktop overlay/hotkeys | Implemented locally, pending macOS runner proof | Flutter shared desktop bridge contract, Dart tests, and macOS runner channel cover status/events, Control+Option+Space quick action monitoring, floating show/hide, clipboard copy, and best-effort Command+V delivery. IME remains unavailable. | macOS runner/manual QA for launch, permissions, quick action monitoring, floating overlay, clipboard fallback, automatic best-effort delivery, focus recovery, Spaces/fullscreen behavior, multi-monitor/Retina. |
| Linux desktop overlay/hotkeys | Implemented locally with degraded hotkey/delivery, pending Linux runner proof | Flutter shared desktop bridge contract, Dart tests, and Linux runner channel cover status/events, GTK keep-above show/hide, clipboard copy, and explicit Linux hotkey scope limitation. IME remains unavailable. | Linux runner/manual QA for launch, desktop environment behavior, keep-above overlay, clipboard fallback, accelerator scope, Wayland/X11 differences, multi-monitor/DPI. |
| Windows desktop overlay/hotkeys | Implemented locally, pending Windows runner proof | Flutter bridge contract, Dart tests, and Windows runner channel now cover status/events, `Ctrl+Alt+Space`, always-on-top show/hide, clipboard copy, and best-effort `Ctrl+V` delivery. IME remains unavailable. | Windows runner/manual QA for launch, hotkey registration, always-on-top overlay, clipboard fallback, automatic best-effort delivery, focus recovery, multi-monitor/DPI. |
| Web permission limits | Degraded parity target | `PlatformCapabilities.localSpeechSupported` is false on web today; secure storage remains degraded; OS overlay/IME are unavailable. `flutter build web` passed on 2026-05-10. | Browser smoke when web parity scope opens; document browser-only alternatives. |

## Boutons d’action personnalisés — Manual Matrix

- Ouvrir `Snippets` → onglet `Boutons`.
- Créer un bouton `desktop key sequence` avec valeur `Ctrl+W, N`.
- Vérifier l’aperçu: le bouton apparaît dans la bonne rangée, selon `rowIndex` et `order`.
- Exécuter le bouton et vérifier que la séquence n’est pas silencieusement ignorée sur hôtes non supportés; un message explicite doit s’afficher.
- Créer un bouton `insert text` avec texte court et un bouton `clipboard command` (`paste`).
- Vérifier que les boutons refusent les commandes shell/texte arbitraire hors contrat.
- Modifier / supprimer un bouton et vérifier le rafraîchissement de la liste sans redémarrage.
- Vérifier un message clair si une action `macro` ou `media command` est enregistrée mais non encore exécutable sur la plateforme courante.

## Security Gate

- No client bundle contains a service role key.
- No client bundle contains Firebase admin credentials or any backend service/admin credential.
- OpenAI/Anthropic keys are never synced to Firebase or another remote backend.
- Logs and copyable debug output redact keys, provider payloads, audio, and raw transcripts.
- Clipboard sync is opt-in and visibly pausable.
- Firestore Security Rules deny cross-user CRUD for every user-scoped collection.
- Overlay cannot silently start recording or inject without user action.
- IME cannot silently capture, sync, log, or enrich text in password/OTP/private fields.
- AI and sync retries are bounded and time out visibly.

## Android Auth Smoke Matrix

Run before closing any auth-hardening chantier as sellable/production-ready:

| Case | Expected result |
|---|---|
| Launch with Firebase defines missing | App stays recoverable; user can explicitly continue in local mode; no remote auth call is required. |
| Invalid email/password form | Form errors display in French; auth store is not called. |
| Email/password sign-up or sign-in success | Session becomes Firebase-backed; app shell opens; remote stores use Firebase `uid`, not a client-provided user id. |
| Email/password wrong credential | User sees a generic credential error that does not reveal whether the account exists. |
| Provider disabled / invalid Firebase config | User sees a setup/configuration message; support detail is redacted and copyable. |
| Google Sign-In success | Android account selection returns an ID token; Firebase credential sign-in succeeds; session provider reports Google auth. |
| Google user cancellation before selection | User sees a cancellation message; no high-severity Sentry event is required. |
| Controlled Google config failure or documented equivalent | Missing SHA/package/server client ID/client config is reported as configuration trouble, even if the SDK labels it canceled after account selection. |
| Google missing/null ID token | No Firebase credential is built; typed auth failure is shown and logged redacted. |
| Signed-out deep link to `/home`, `/voice`, `/clipboard`, `/settings`, `/keyboard`, `/snippets`, or `/dictionary` | Router redirects to auth gate/login without building the protected product surface. |
| Local mode deep link to product route | Route opens through the app shell and remains local-only. |
| Signed-in deep link to product route | Route opens through the app shell with the matching initial tab. |
| Sentry/AppDiagnostics review | Category/code/support detail are present where useful; secrets, tokens, passwords, OAuth payloads, clipboard text, transcripts, and raw provider payloads are absent. |

Record device/emulator, build source, Firebase project, provider/SHA setup
status, and redaction evidence in this doc or `shipglows_data/workflow/TEST_LOG.md`.

## Android IME Manual Matrix

Run on at least one emulator or real Android device before closing the IME chantier:

| Case | Expected result |
|---|---|
| Enable WinGlowz in Android input method settings | WinGlowz keyboard appears as an available keyboard. |
| Switch to WinGlowz from a normal text field | Native keyboard opens without launching a Flutter view inside the IME. |
| Type letters, space, backspace, enter | Focused field receives expected `InputConnection` updates; backspace deletes one code point including emoji/surrogate pairs. |
| Tap Ctrl/Alt/Fn then a text key | Modifier is visible as active, applies to the next key-value dispatch, then clears. |
| Tap Fn then `h/j/k/l` | Built-in modmap sends left/down/up/right key events instead of inserting letters. |
| Toggle QWERTY/AZERTY in Settings then reopen IME | Letter rows match selected layout profile and persist between sessions. |
| Enable swipe-corner mode then swipe key corners | Default Smart French accent, punctuation, currency, and navigation corner shortcuts are visible and dispatch; center-return gesture cancels insertion. |
| Open Settings > Keyboard > Corner shortcuts | Preset, key, corner slot, expression, label, sensitive flag, save, clear override, and reset defaults are available. |
| Use the visual corner editor preview | Tapping a key selects it; tapping one of its four corner targets selects that corner without saving immediately. |
| Search the action picker for an accent, punctuation mark, action, or snippet | Matching guided actions/snippets are shown; selecting one updates the draft preview and marks the state dirty. |
| Toggle Private preview in the corner editor | Sensitive snippets/clipboard/action shortcuts show a private-field blocked warning instead of pretending they will run. |
| Use Preview action in the corner editor | Text/snippet-like actions append to the preview buffer; native-only actions report that Android device QA is required. |
| Reset a corner, reset a key, then discard draft | Only the targeted overrides are staged for reset; discard restores the previously saved config without a native save. |
| Export corner JSON | The exported payload contains only version, preset id, overrides, labels, and sensitive flags. It must not include clipboard history, typed text, or secrets. |
| Import invalid or oversize corner JSON | The editor rejects the import and does not call the native save bridge. |
| Save a valid visual-editor draft on Android | The editor calls `setKeyboardCornerConfig` once and reports a saved state after the native bridge responds. |
| Change corner preset to punctuation or developer symbols | Keyboard status returns the new preset; native keys and Flutter preview render the selected preset. |
| Save `letter-a/topLeft -> à` override | Swipe top-left on `a` inserts `à`; normal tap still inserts `a`. |
| Save a text-expander corner expression such as `JA:'j\\'arrive'` | Swipe on the configured corner inserts the full replacement text in a standard field. |
| Save a key event/action/macro corner expression | Swipe dispatches through `KeyboardKeyValue`; invalid expressions are rejected by native validation. |
| Configure a special-key corner with special-key corners disabled | The label is hidden and the corner action is not dispatched. |
| Enable special-key corners and configure Ctrl/Enter/Backspace corner | The configured corner dispatches unless a protected gesture or field policy blocks it. |
| Use a configured corner in password/OTP/no-personalized-learning field | Normal text accents remain allowed; sensitive snippets/clipboard/voice/action shortcuts are suppressed. |
| Corrupt or oversize stored corner JSON | Keyboard falls back to the default Smart French corners, keeps primary typing usable, and reset defaults recovers the state. |
| Swipe horizontally from space with a configured space corner | Cursor slider wins once the threshold is reached; no corner action fires. |
| Scroll snippets or clipboard rows horizontally | Horizontal scroll wins; no item or corner shortcut is inserted accidentally. |
| Disable swipe-corner mode | Same gestures fallback to primary tap behavior only. |
| Open Navigation panel and run cursor/edit actions | Char left/right works; word left/right and line start/end work when host supports context; unavailable cases show recoverable feedback. |
| Trigger delete word-left in Navigation panel | Deletes the previous word boundary or shows unavailable feedback when cursor context is absent. |
| Open Emoji panel and insert from categories | Emoji is inserted via `InputConnection` into active field. |
| Insert emoji in normal field then reopen Emoji panel | Recent emoji appears in local recents list. |
| Insert emoji in private/sensitive field | Emoji insertion works, but recent emoji list does not update. |
| Enable double-space to period and type in standard text field | Double-space converts to `. ` after word characters. |
| Enable punctuation auto-spacing and type `: ; ! ? . ,` in standard text field | Keyboard applies basic spacing rules around punctuation. |
| Try the same corrections in private/email/url/phone fields | Corrections are suppressed; raw input is kept. |
| Enable keyboard touch debug overlay | Key bounds + gesture classifier diagnostics appear without exposing typed text. |
| Long-press Backspace / forward delete / word delete / navigation keys | Action repeats at a controlled cadence and stops immediately on release/cancel. |
| Slide horizontally from the space bar | Cursor moves left/right by character steps without inserting a space. |
| Type very fast with two overlapping fingers on normal text keys | Each completed pointer release inserts at most one expected character; highlights stay on the correct keys and no pointer freezes. |
| Start a protected gesture (space slider/row scroll/panel scroll/long-press repeat) then touch another key | Protected owner stays predictable and secondary incompatible pointers are suppressed/canceled without wrong dispatch or stuck repeat. |
| Focus password/OTP/no-personalized-learning field | Private mode is visible; dictation, clipboard capture, snippets and learning/sync are disabled. |
| Tap Mic without microphone permission | No recording starts; keyboard shows recoverable permission state. |
| Tap Mic with permission and speech recognition available | Recognized text is inserted into the active field. |
| Clipboard copy/paste actions | Copy is explicit from selected text; paste uses current system clipboard text only. |
| Toggle clipboard/media/snippets/settings mini-panels | Each panel opens/closes in-place and preserves base typing workflow. |
| Focus email, URL, phone, and search fields | Keyboard adapts symbols/enter action to the field context. |
| Tap Media while a media app is active | Android receives a play/pause media key; no metadata permission is requested. |
| Use Settings keyboard card | Input settings, switch keyboard, voice, clipboard sync intent, media controls, layout profile, corner mode, and privacy mode round-trip through `winglowz_app/keyboard`. |
| Use FlutterWeb keyboard preview corner controls | Presets and simple text-like corner actions render and simulate locally; status copy does not claim native Android proof. |

## Android IME Crash Recovery Matrix

Run after native keyboard resilience changes and before closing the keyboard recovery chantier:

| Case | Expected result |
|---|---|
| Press Settings > Backend provider > Clear logs, reproduce an IME issue, then Copy diagnostic | Copied text contains only post-clear `AppDiagnostics` plus native keyboard recovery fields. |
| Tap `#+=` or symbol mode | Symbol panel opens, or the IME shows `Keyboard recovered` and stays visible with a redigé diagnostic available from Settings. |
| Simulate or trigger layout rebuild failure | Fallback keyboard renders with basic letters/space/delete/enter; `keyboardRecoveryCount` increments. |
| Trigger dispatch/action failure | Repeat runnable stops, action is not retried automatically, and copied diagnostics include action id but no user content. |
| Run the same recovery check in password/OTP/private field | Diagnostic includes private-mode/status flags only; no typed text, clipboard content, suggestions, snippets, or dictation result appears. |
| Run without `SENTRY_DSN` | IME recovery and local diagnostic still work; copied diagnostic shows Sentry disabled/not configured from Flutter bootstrap state. |
| Run with test `SENTRY_DSN` | Any Sentry evidence must be correlated from app-visible status or operator-supplied issue/event id; no raw Sentry payload or PII is copied into docs. |
| Use invalid/missing theme image or risky custom theme | Theme fallback/recovery is visible, user theme config is not deleted automatically, and diagnostic only exposes theme preset/source/status. |
| Scroll Settings or Clipboard panels in the IME | Scroll succeeds, or failure recovers without blocking `Close`/typing fallback. |
| Load Settings on web/desktop | Keyboard diagnostic fields are tolerated as absent/unsupported; clear/copy diagnostics do not crash. |

## Purge Gate

Before deleting legacy JS/TS application code:

1. Snapshot rollback archive exists and includes legacy app, Convex, overlay, and docs.
2. Flutter parity checks pass for Accueil, Voice, Clipboard, Settings, Snippets, Dictionary, Auth, and Android overlay.
3. Firebase rules/indexes and user-scoped access tests pass once Firebase adapter replaces Supabase.
4. Dry-run list of files to delete is reviewed.
5. Keep rules are explicit: keep docs, assets still referenced by Flutter, legacy backend archives until parity, native platform files, Kotlin overlay code, and migration specs.
6. Post-purge search for JS/TS application code passes.
