---
artifact: technical_module_context
metadata_schema_version: "1.0"
artifact_version: "0.1.0"
project: "CommandGlows"
created: "2026-05-04"
updated: "2026-06-11"
status: draft
source_skill: sf-docs
scope: "android-native"
owner: "Diane"
confidence: medium
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - "Android InputMethodService"
  - "Android ClipboardManager"
  - "Android AudioManager"
  - "Android overlay/accessibility services"
  - "Flutter MethodChannel"
depends_on:
  - "CLAUDE.md@1.2.0"
  - "shipglows_data/technical/guidelines.md@0.1.0"
  - "docs/OVERLAY_ANDROID.md@0.1.0"
supersedes: []
evidence:
  - "Mapped before Android IME native implementation."
  - "Updated for stable grid/touch geometry implementation."
  - "Updated for account-backed keyboard sync profile export/import V1 contract."
  - "Updated for materialized IME press effects with relief-aware rendering."
next_review: "2026-06-04"
next_step: "/sf-docs technical audit"
---

# Technical Module Context: Android Native

## Purpose

Android native code owns system-level capabilities that Flutter cannot provide
directly: overlay foreground service, accessibility fallback, and the CommandGlows
IME. The IME must stay lightweight, native, and privacy-aware because it runs
inside other apps' input fields.

## Owned Files

| Path | Role | Edit notes |
| --- | --- | --- |
| `android/app/src/main/AndroidManifest.xml` | Android service, activity, and permission declarations | Keep IME and overlay declarations explicit; avoid broad permissions before use. |
| `android/app/src/main/kotlin/com/commandglows/app/MainActivity.kt` | Flutter MethodChannel owner | Keep `commandglows_app/overlay` and `commandglows_app/keyboard` contracts separate. |
| `android/app/src/main/kotlin/com/commandglows/app/Overlay*.kt` | Overlay runtime | Do not allow concurrent overlay and keyboard recording without coordinator logic. |
| `android/app/src/main/kotlin/com/commandglows/app/ime/**` | Native IME services/controllers | No raw text logging; sensitive fields disable capture/sync/enriched insertion by default; an explicit advanced opt-in may allow clipboard history only. Clipboard bridge events persist only as a bounded local drain queue for Flutter import. |
| `android/app/src/main/res/xml/**` | Android service metadata | IME metadata must match manifest service declarations. |

## Entrypoints

- `CommandGlowsInputMethodService.onCreateInputView`: creates the native keyboard.
- `CommandGlowsInputMethodService.onStartInput`: evaluates the focused field policy and field context (`text`, `email`, `url`, `phone`, `search`).
- `MainActivity.configureFlutterEngine`: registers platform channels used by Settings.

## Control Flow

```text
Android input field
  -> CommandGlowsInputMethodService
  -> KeyboardInputContextResolver + KeyboardSecurityPolicy
  -> CommandGlowsKeyboardView (Canvas)
  -> KeyboardLayoutBuilder + KeyboardKeyValueEngine + KeyboardGestureClassifier
  -> InputConnection / ClipboardManager / AudioManager

Keyboard clipboard action
  -> KeyboardClipboardEventQueue bounded local drain queue
  -> commandglows_app/keyboard MethodChannel drain
  -> ClipboardHistoryApi / ClipboardHistoryStore
```

## Invariants

- The IME uses `InputConnection` for insertion, never accessibility injection.
- Backspace deletes one Unicode code point when no selection exists (`deleteSurroundingTextInCodePoints` fallback to legacy delete).
- Navigation panel uses `InputConnection` + key events for: char left/right, word left/right, line start/end, and word deletion before cursor with graceful fallback.
- Emoji panel provides local categories and local recents; private mode does not persist new emoji recents.
- Basic typing corrections are local and opt-in:
  - double-space to `. `
  - punctuation auto-spacing
  - both disabled automatically for private/email/url/phone contexts.
- Debug touch overlay can render key bounds and gesture classifier diagnostics without exposing user text.
- Password, OTP, `noPersonalizedLearning`, and app-marked sensitive fields must disable voice capture, clipboard history, snippets, and learning behavior by default. The advanced `clipboardSensitiveFieldHistoryEnabled` preference may allow only IME copy/cut/paste history in those fields; strict privacy mode still disables clipboard, and the opt-in must not re-enable voice, snippets, learning, or background clipboard capture.
- Base media control sends generic play/pause key events only; it must not read metadata without explicit richer permission.
- Keyboard preferences are persisted in `KeyboardStateStore` and round-tripped through `commandglows_app/keyboard`:
  - `layoutProfile`: `QWERTY` / `AZERTY`, default `AZERTY`
  - `cornerModeEnabled`: `true` / `false`, default `true`
  - `cornerConfig`: versioned JSON with a preset id and per-key/per-slot overrides (`up/down/left/right` plus legacy `topLeft/topRight/bottomLeft/bottomRight`)
  - `themeConfig`: versioned JSON (`version`, `presetId`, colors, linear/radial gradient style, border/radius/shadow values, local image reference, press-effect/easing metadata) persisted under `KEY_THEME_CONFIG` with size cap (48 KB)
  - `privacyMode`: `auto` / `strict` / `standard`
  - `clipboardSensitiveFieldHistoryEnabled`: `true` / `false`, default `false`, advanced opt-in for clipboard history in sensitive fields under auto policy
- IME state preferences store only non-sensitive flags and counters, never typed or dictated text.
- Gesture shortcut execution uses `KeyboardCornerShortcuts`, `KeyboardCornerShortcutResolver`, and `KeyboardKeyValue` instead of a second action language. Kotlin native is the source of truth for functional preset tables and combines preset, user overrides, field policy, `cornerModeEnabled`, and `specialKeyCornersEnabled` at layout snapshot time.
- Keyboard theme authoring lives in Flutter `KeyboardThemeStudioScreen` and is pushed to native with `getKeyboardThemeConfig`, `setKeyboardThemeConfig`, and `resetKeyboardThemeConfig` on `commandglows_app/keyboard`. The studio ships the v1 preset catalog (`System`, `CommandGlows Light`, `CommandGlows Dark`, `Neon Terminal`, `Glass Mint`, `Sunset Gradient`, `Midnight Aurora`, `Paper Ink`, `Pixel Candy`, `Minimal Contrast`), collapsible editing sections, and JSON import/export without image bytes.
- Native IME `onThemeSettings()` opens Flutter route `/keyboard/theme` through `MainActivity` intent extra `openRoute`.
- Theme saves are blocked in Flutter when key/status contrast falls below the readable threshold or when image mode has no imported local image. Heavy shadows, thick borders, high effect intensity, long particle effects, and long mascot trails produce warnings.
- Native rendering supports solid, linear gradient, radial gradient, app-private image backgrounds, key border/radius/shadow values, custom key/status/corner text colors, relief key faces, and bounded press effects. Private fields suppress custom image/gradient/effect surfaces.
- Native press effects are split by rendering contract. `scale`, `pulse`, `shake`, `glow`, `electricArc`, `specularSweep`, `inkPress`, `keycapTilt`, and `edgeCompression` must render through the key surface geometry in `CommandGlowsKeyboardView`; they must move or tint the physical key body instead of drawing an independent overlay. `ripple`, `confettiLite`, `fireworksLite`, `waterSplash`, and `emberBurst` may use `KeyboardPressEffects`, but only as queue-capped emissions clipped or anchored to the pressed key. `dragonTrail` and `spiderTrail` use `KeyboardPressEffects` as bounded mascot effects with position, latest target, retargeting, and a short fading trail: dragon adds fading ember sparkles, while spider adds fine web-like cross strands. Mascots draw a small shadow and can depress relief-enabled keys with a partial hover/weight cue; this visual pressure must not change input dispatch, active key state, or pressed-key color. Effects are disabled for private fields or system animation scale `0`.
- Keyboard diagnostics expose `themePressEffectRenderingMode` and `themeKeyReliefDepth` with no typed content, clipboard content, snippets, dictation content, tokens, prompts, or private image paths.
- Theme image import uses a system image picker, decodes/downsamples to a bounded PNG in app-private storage, and rejects non-image or oversized output; no broad storage permission is required and the IME renders only the private path.
- Replacing or resetting a theme cleans up superseded app-private theme images under `filesDir/keyboard_themes` to avoid orphaned files.
- Keyboard diagnostics now expose `themePresetId`, `themePressEffect`, `themePressEffectRenderingMode`, `themeKeyReliefDepth`, `themeBackgroundSource`, `themeConfigSize`, and `themeFallbackStatus` without exposing private image paths.
- Keyboard sync/recovery bridge methods are `exportKeyboardSyncProfile` and `applyKeyboardSyncProfile`. Flutter must validate checksum/schema before apply; native apply is atomic-or-recoverable and must never claim cloud success on unsupported platforms.
- Keyboard sync stays local-first: the IME keeps working even if cloud sync fails. Cloud payload excludes image bytes/private paths, sensitive shortcuts, clipboard/history content, dictation raw content, recents, diagnostics, tokens, and secrets.
- Keyboard theme image recovery is now split cleanly:
  - cloud profile may reference a safe Cloud Storage asset manifest (`keyboard_sync_v2`)
  - cloud profile still must not contain local file paths or image bytes
  - restored images are copied back into app-private native storage before apply
- Account-backed keyboard sync/recovery requires Blacksmith/GitHub Actions Android build proof plus Diane device QA for IME-native behavior (restore while keyboard is active, permissions, lifecycle). Do not validate this slice with local Android/Gradle builds on the shared VM.
- Keyboard crash recovery records only allowlisted native diagnostics: action id, panel, mode, layout profile, compact flag, height scale, theme preset/source, private-mode flag, exception class/message redigés, short stack, UTC timestamp, and recovery counter. It must never persist typed text, clipboard contents, snippets, dictation, emails, tokens, JWTs, prompts, or provider payloads.
- `CommandGlowsKeyboardView` wraps draw/touch/dispatch/layout refresh paths. A recoverable exception stops repeat runnables, clears the active gesture, stores the diagnostic through `KeyboardCrashReporter`, and switches to a neutral `KeyboardLayoutBuilder.safeFallback()` snapshot without deleting user preferences.
- `CommandGlowsInputMethodService` wraps lifecycle preference refresh and system actions such as settings/theme launch and keyboard picker. Service-level failures are reported through the same redigé diagnostic store and shown as `Keyboard recovered`.
- Flutter Settings can call `getKeyboardStatus` and `clearKeyboardDiagnostics` on `commandglows_app/keyboard`. `Clear logs` clears both `AppDiagnostics` and native keyboard diagnostics; `Copy diagnostic` includes the last native incident when present.
- Sentry is expected to be initialized through `sentry_flutter` when a DSN is configured. This module does not add a standalone Android Sentry dependency; native keyboard diagnostics remain local and copyable when Sentry is absent, offline, or not initialized.
- The built-in `Smart French` gesture preset keeps useful French accents, common punctuation, `$`/`€`, numeric up-gestures on the letter grid, and layout-aware directional navigation gestures on `W`/`Z` plus `S` while avoiding low-value defaults such as German `ß`, `ñ`, `ä`, and `ö`. Additional presets are punctuation + navigation, French accents plus punctuation, developer symbols, and no shortcuts. Flutter may expose these preset ids/names for settings and DTO fallback, but it must not duplicate or simulate their functional shortcut tables.
- Gesture shortcut values may dispatch text, key events, actions, modifiers, and macros. Private fields suppress sensitive actions such as clipboard, snippets, voice, and sensitive macros while keeping normal text accents available; clipboard history in sensitive fields is allowed only through the explicit advanced opt-in above and never in strict privacy mode.
- IME clipboard history events must not call Supabase or any backend directly; Flutter drains them into the backend-agnostic clipboard API.
- The native clipboard event queue persists a bounded local drain list so keyboard copy/cut/paste actions can reach the Flutter clipboard history even if the app opens after the IME event. This is a transient import queue, not the product history store.
- Text keys carry a `KeyboardKeyValue` model in addition to display glyphs. `KeyboardKeyValueParser`, `KeyboardKeyModifier`, and `KeyboardModMap` are the local foundation for parsed layouts, macros, Ctrl/Alt/Fn/Shift behavior and user modmaps; the live layout dispatches parsed text keys, key events, action values and macros through existing callbacks.
- Ctrl, Alt and Fn are exposed as modifier keys in the control row. They latch for the next key-value dispatch, then clear; Fn currently ships with a conservative built-in navigation modmap for `h/j/k/l`.
- Touch handling tracks per-pointer gesture state by Android `pointerId`, allows overlapping normal text/key taps to complete independently, and keeps protected interactions explicitly exclusive (space slider, horizontal row scroll, vertical panel scroll, long-press repeat, and action-descriptor long press). Pointer cleanup on `ACTION_CANCEL`, missing pointer indexes, detach, and finish-input removes delayed callbacks and avoids duplicate dispatch. It still does not implement full multi-finger modifier chords or selection sliders.
- Protected gestures keep priority over shortcuts: space slider, horizontal scroll rows, long press/repeat, and return-to-center cancellation must not dispatch a configured direction/corner slot.
- Keyboard geometry separates stable grid slots, visual key rectangles, and tactile hit rectangles. Main modes should use whole-cell spans for deliberate exceptions such as Space, Enter, Shift, or Delete; theme gaps, radius, shadows, and width scaling affect the visual rectangle, not the tactile grid cell.
- The touch-debug overlay distinguishes tactile bounds from visual key bounds so fast-typing misses, covered gaps, and scroll/panel clipping can be inspected without logging typed content.

## Failure Modes

- IME not enabled: Settings must open Android input method settings.
- InputConnection unavailable or host app blocks access: show recoverable keyboard feedback.
- IME draw/layout/touch/action exception: store a redigé diagnostic, stop repeat gestures, show `Keyboard recovered`, and render a minimal safe fallback keyboard. If the fallback canvas draw also fails, Android may still terminate the IME; the stored diagnostic is the recovery source of truth.
- ANR or process kill: runtime wrappers may not run after the freeze. Breadcrumbs/diagnostics before the freeze are best effort only.
- Microphone permission unavailable: do not start recording.
- No media consumer: play/pause action may be ignored by Android; show best-effort feedback.
- Android unit tests that require resource bundling can be blocked on ARM64 hosts when AAPT2 is unavailable; `:app:compileDebugKotlin` is the local native compile proof, while full test/package proof belongs on x86_64 CI or device.

## Security Notes

The keyboard is a high-trust surface. Do not log user text, selected text,
clipboard text, dictated text, raw audio, tokens, or provider payloads.

## Validation

```bash
./gradlew :app:compileDebugKotlin
flutter build apk --debug
```

Do not run the Android/Gradle/build commands above on the shared Codex VM.
For this environment, use allowed local checks such as `flutter analyze` and
route native Android compile/package proof through Blacksmith/GitHub Actions.

Manual Android validation is still required for IME visibility, typing,
clipboard, dictation, media keys, and OEM behavior.

### Keyboard Crash Recovery QA

1. In Settings > Backend provider, press `Clear logs`.
2. Enable/switch to CommandGlows in a real Android text field.
3. Exercise sensitive IME actions: `#+=`, `Prefs`, `Clip`, `Media`, long-press `123`, long-press delete/navigation, compact mode, theme with image/gradient, and clipboard/settings scroll.
4. Return to Settings > Backend provider and press `Copy diagnostic`.
5. Verify the copied diagnostic includes only post-clear events, `keyboard_status`, `recovery_count`, and `keyboard_last_error` when a native failure occurred.
6. Verify copied diagnostics do not contain typed text, clipboard text, snippets, dictation content, raw emails, API keys, tokens, JWTs, prompts, or provider payloads.
7. If `SENTRY_DSN` is configured in a test build, correlate the run from app-visible Sentry state only; this skill does not have direct Sentry dashboard access.

## Reader Checklist

- Manifest or `res/xml` changed -> verify CommandGlows appears in Android keyboard settings.
- `KeyboardSecurityPolicy` changed -> recheck password/OTP/no-personalized-learning behavior.
- Clipboard controller changed -> recheck sensitive clipboard flags and no background clipboard capture.
- Clipboard event queue changed -> recheck no provider credentials/imports in native code and that sensitive clips are not enqueued.
- Media controller changed -> recheck no metadata permission is introduced silently.
- `KeyboardCornerShortcuts.kt`, `KeyboardLayoutModels.kt`, `CommandGlowsKeyboardView.kt`, or `KeyboardStateStore.kt` changed -> recheck Smart French defaults, override precedence, private-field suppression, special-key toggle, directional/corner rendering, space slider priority, scroll row priority, and corrupt JSON fallback.
- `KeyboardPressEffects.kt`, `CommandGlowsKeyboardView.kt` material effect geometry, or theme validation changed -> recheck fast typing, private/password fields, relief mode, system reduce-motion, and unreadable theme rejection.

## Maintenance Rule

Update this doc when Android service declarations, IME lifecycle, platform
channel contracts, permissions, or security invariants change.
