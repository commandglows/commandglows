---
artifact: documentation
metadata_schema_version: "1.0"
artifact_version: "1.0.1"
project: "WinGlowz"
created: "2026-04-27"
updated: "2026-05-30"
status: "reviewed"
source_skill: "sf-spec"
scope: "platform_behavior"
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
  - "lib/core/platform/platform_capabilities.dart"
  - "android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzInputMethodService.kt"
  - "shipglows_data/workflow/specs/keyboard-stable-grid-touch-geometry.md"
  - "shipglows_data/workflow/specs/windows-desktop-overlay-hotkeys-parity.md"
next_step: "/sf-start shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md"
---

# Platform Behavior — WinGlowz

## Shared Rules

- Remote data sync requires a valid authenticated session through the active backend adapter. Firebase Auth is the first adapter for the Android MVP.
- OpenAI and Anthropic keys are BYOK local secrets and are never synced to a remote backend.
- If secure local storage is unavailable or materially degraded, cloud AI features must be disabled or clearly marked degraded until the user accepts the risk.
- Clipboard sync is opt-in and visibly controllable.
- Platform limitations must be visible in Settings and docs.
- Flutter is the shared product and UI layer. System-level surfaces such as
  IME, overlay windows, global hotkeys, focus handling, accessibility, and text
  delivery are platform hosts behind the shared product contract, not one
  portable OS mechanism.
- Product parity is the default. Voice, overlay/quick actions, clipboard,
  snippets, dictionary, history, settings, local-first behavior, sync and AI
  workflows should be planned for every supported platform unless an OS,
  browser, security, or store policy makes a capability impossible or unsafe.
  Exceptions must be visible in Settings and docs.
- Priority order after Windows is macOS, Linux, iOS, then web. Platform-adapted
  experiences are acceptable only when they improve the result; if the result is
  equivalent, keep the shared interaction model to avoid perturbing users.

## Capability Matrix

| Platform | Local speech | Advanced recording + Whisper | Secure key storage | Clipboard sync | Overlay / quick actions | WinGlowz keyboard IME |
|---|---|---|---|---|---|---|
| Android | supported when `speech_to_text` or Android speech recognition supports locale/device | supported | Android keystore via `flutter_secure_storage` | opt-in; respect background limits | supported | supported as native Kotlin IME |
| iOS | supported when permission and locale allow | supported | Keychain via `flutter_secure_storage` | opt-in; no Android-style overlay | target parity; native host/recovery model still to spec | unavailable |
| macOS | supported when package/platform allows | supported | keychain-backed where available | opt-in | first desktop host version implemented locally: floating window + quick action + clipboard/delivery | unavailable |
| Windows | supported when package/platform allows | supported | platform secure storage where available | opt-in | target chantier: desktop overlay window + global hotkeys + clipboard/delivery | unavailable |
| Linux | local speech unavailable unless package support changes | supported via recording + Whisper | may be degraded; require explicit UI state | opt-in | first desktop host version implemented locally with GTK keep-above + clipboard fallback; global hotkey scope still degraded | unavailable |
| Web | browser-limited; target explicit degraded parity where safe | browser-limited unless a secure proxy/direct contract is specified | degraded compared with native keychain/keystore | target explicit degraded parity where safe | browser-limited quick actions; no OS overlay | unavailable |

## Android Keyboard IME

- WinGlowz keyboard is declared as an Android `InputMethodService` and is configurable from Settings through the `winglowz_app/keyboard` MethodChannel.
- The keyboard provides a native Canvas layout engine with QWERTY/AZERTY profiles, defaulting to AZERTY with swipe gestures enabled, explicit clipboard copy/paste actions, Android speech recognition, and media keys (previous/play-pause/next).
- Main keyboard rows use a stable logical grid: standard keys occupy one cell, deliberate exceptions occupy whole-cell spans, and visual gaps/radius/shadows are separated from the tactile hit area so gaps do not become dead zones.
- Tap and swipe gesture classification is local and deterministic: tap emits the primary glyph; directional (`up/down/left/right`) and corner (`topLeft/topRight/bottomLeft/bottomRight`) swipes dispatch typed `KeyboardKeyValue` actions when swipe gestures are enabled; return-to-center cancels the gesture.
- Gesture shortcuts are configured per stable key id and gesture slot through local Android preferences. Legacy JSON slot names (`topLeft/topRight/bottomLeft/bottomRight`) remain valid; directional slots (`up/down/left/right`) are additive. Kotlin native owns the functional preset tables and runtime resolution. Flutter carries preset ids/names, DTOs, settings drafts, import/export, and a light visual editor, but it must not recreate native preset defaults.
- User gesture overrides can insert text, key events, actions, modifiers, or macros through the native parser. Private fields still suppress sensitive actions such as clipboard, snippets, voice, and sensitive macros.
- Keyboard field context adapts controls for email/URL/phone/search: email and URL expose `@`/`/` plus `.com`, phone forces number layer, search sets enter action to search.
- The Flutter Settings gesture editor is a product configuration surface, not an IME runtime. It can stage drafts, search guided actions/snippets, preview text-like outputs, import/export JSON, and save through the Android keyboard bridge only when Android IME support is available.
- A minimal Navigation panel is available for cursor/edit actions: char left/right, word left/right, line start/end, delete char, and delete word-left with fallback feedback when host context is insufficient.
- A lightweight Emoji panel is available with local categories and local recents; recents are not updated in private/sensitive fields.
- Basic input corrections are available as toggles: double-space-to-period and punctuation auto-spacing, with exclusions for private/email/url/phone fields.
- Optional touch-debug overlay can show tactile and visual key bounds, gesture direction/threshold/action diagnostics, and never includes typed content.
- Password, OTP, `noPersonalizedLearning`, and host-marked private fields force private mode: dictation, clipboard capture, snippets, sync intent, and learning are disabled while basic typing remains available.
- Minimal panels are available directly in the keyboard: clipboard (copy/paste/pins), media (prev/play-pause/next), snippets (single quick insert + app handoff), and settings (gesture toggle + layout toggle + app handoff).
- The custom action bar is configured from the app `Actions` page and can be enabled from `Actions` or `Settings > Keyboard`. The native IME receives only compatible typed actions, renders them as one horizontal scrollable row, and suppresses sensitive actions in private fields.
- FlutterWeb keyboard preview and the visual gesture editor can display explicit override shortcuts and simple text/snippet-style insertions for visual review. They do not simulate native preset defaults and are not proof of native Android key events, IME field policy, native persistence, or system-level dispatch.
- Clipboard sync from the keyboard is opt-in and represented as intent/status. Real cloud sync and cross-account queue flushing require the backend-agnostic Firebase adapter before production claims.
- Non-Android platforms must not show IME activation controls.

## Custom Action Buttons

- Custom action buttons are configured from the dedicated `Actions` page, not from the keyboard corner editor.
- A snippet is a piece of reusable text (`trigger` + `content`) that can be inserted through actions; it is not itself a toolbar control.
- A custom button owns UI placement (`rowIndex`/`order`), icon, title, and one typed action (`insert text`, `desktop key sequence`, `keyboard expression`, `clipboard command`, `media command`, or `macro`).
- The in-app action bar preview and execution are available in the `Actions` page through `CustomActionButtonsPanel`; execution attempts are constrained to supported host capabilities.
- Android IME exposure is opt-in and filtered. Desktop key sequences such as `Ctrl+W, N` remain configurable as buttons for desktop hosts but are marked incompatible for Android IME.
- Custom action buttons are not automatically exposed inside corner shortcuts; reuse is by model intent only (typed action contract), and each surface owns its own runtime constraints.

## Android Overlay

- The Android overlay is implemented as a native foreground service with a draggable `WindowManager` bubble.
- The bubble can emit queued events to Flutter for tap, long press, stop, cancel, and native service errors.
- Accessibility delivery is optional and best-effort; clipboard fallback remains mandatory for final text.
- The overlay and IME must not run concurrent voice sessions. Until full arbitration is implemented, UI and logs must treat this as a high-risk QA case.
- Non-Android platforms must not show Android overlay activation controls.

## Windows Desktop Overlay

- Windows overlay is now implemented as a first native host version, with Windows
  runner proof still required before any public parity claim.
- The Windows implementation must share Flutter UI, actions, stores, status
  states, and Settings patterns where possible, but use a Windows-native host
  for global hotkeys, always-on-top window behavior, focus, clipboard, and text
  delivery.
- The first Windows channel is `winglowz_app/windows_overlay`. It exposes
  typed Flutter status/events/delivery results and a native runner host for
  `Ctrl+Alt+Space`, topmost show/hide, clipboard copy, and `Ctrl+V` paste
  delivery back to the last foreground window.
- Windows must not promise an IME. The expected equivalent is desktop quick
  actions: hotkey -> overlay -> correction/dictation/snippet/clipboard action ->
  clipboard or best-effort delivery into the active app.
- The first Windows implementation should attempt the complete path: global
  hotkey, overlay, selection/clipboard/manual input, shared WinGlowz action,
  clipboard fallback, and automatic best-effort delivery.
- Clipboard fallback is mandatory. Automatic paste/injection is a best-effort
  enhancement and must be visibly recoverable when the target app blocks it.
- macOS, Linux, iOS and web should follow in that order, each with its own host
  or degraded-parity proof. Browser/store limits are documented product
  constraints rather than silent omissions.

## macOS Desktop Overlay

- macOS overlay is implemented as a first native host version, with runner/manual
  proof still required before any public parity claim.
- The channel is `winglowz_app/macos_overlay`. It exposes the shared typed
  desktop status/events/delivery contract for floating-window show/hide,
  Control+Option+Space quick action monitoring, clipboard copy, and best-effort
  Command+V delivery back to the last active app.
- macOS must not promise an IME. The expected equivalent is desktop quick
  actions: hotkey -> overlay -> correction/dictation/snippet/clipboard action ->
  clipboard or best-effort delivery into the active app.
- Accessibility/input-monitoring prompts may affect global hotkey and synthetic
  paste delivery. When macOS blocks either path, WinGlowz must keep the final
  text recoverable in the clipboard.

## Linux Desktop Overlay

- Linux overlay is implemented as a first native host version, with runner/manual
  proof still required before any public parity claim.
- The channel is `winglowz_app/linux_overlay`. It exposes the shared typed
  desktop status/events/delivery contract for GTK keep-above show/hide,
  clipboard copy, appearance state, and event draining.
- Linux must not promise an IME. The expected equivalent is desktop quick
  actions where the desktop environment permits them, with explicit degraded
  states otherwise.
- Linux global hotkeys and synthetic paste are compositor/window-manager
  dependent. The current host reports the Ctrl+Alt+Space accelerator as scoped
  to the GTK app and uses clipboard-only delivery until a portal, desktop
  environment integration, or distro packaging decision is made.

## Direct AI Calls

Native platforms may call OpenAI/Anthropic directly with user-provided keys
where secure local storage and provider behavior allow. Web remains disabled for
advanced cloud AI until a secure direct/proxy contract is specified; this is a
documented degraded-parity constraint, not a reason to ignore web product
behavior.

## Apple Microphone And Speech Permissions

iOS and macOS must declare microphone and speech recognition usage descriptions before any dictation or recording prompt is tested. macOS also requires sandbox audio input entitlement for microphone capture. These declarations support the broader parity target; they do not imply an IME outside Android.

## Limits

- Max audio duration: 10 minutes for advanced mode unless a reviewed product decision changes it.
- Max audio upload size: 25 MB or the current provider limit, whichever is lower.
- Max synced text payload: 100,000 characters per transcription and 50,000 characters per clipboard item.
- Retries: bounded to 2 automatic retries for network/transient failures; user action required after that.
- Timeouts: AI and remote sync operations must surface recoverable errors.
