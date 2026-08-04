---
artifact: technical_module_context
metadata_schema_version: "1.0"
artifact_version: "0.1.2"
project: "CommandGlows"
created: "2026-05-04"
updated: "2026-06-11"
status: draft
source_skill: sf-docs
scope: "flutter-app"
owner: "Diane"
confidence: medium
risk_level: medium
security_impact: yes
docs_impact: yes
linked_systems:
  - "Flutter"
  - "Riverpod"
  - "ClipboardHistoryApi"
  - "ClipboardHistoryStore"
  - "Backend-agnostic stores"
  - "Firebase first adapter"
  - "Android MethodChannel"
  - "Windows desktop overlay host"
  - "Send to actions"
  - "Custom action buttons"
depends_on:
  - "CLAUDE.md@1.2.0"
  - "shipglows_data/technical/guidelines.md@0.1.0"
supersedes: []
evidence:
  - "Mapped before Android IME Settings bridge work."
  - "Updated for account-backed keyboard sync panel, backup service, and sync change notifier wiring."
  - "Updated for shared Voice/Clipboard Send to actions."
  - "Updated for Windows desktop overlay bridge and runner host version."
  - "Updated for custom action buttons, action-bar rows, typed desktop key-sequence delivery, clipboard commands, and snippets library split."
next_review: "2026-06-04"
next_step: "/sf-docs technical audit"
---

# Technical Module Context: Flutter App

## Purpose

The Flutter app owns the user-facing screens, backend-agnostic feature APIs and
stores, platform capability gates, shared overlay/action UI, and native bridge
wrappers.
Provider-specific repositories such as Supabase legacy or Firebase are adapters,
not product contracts. OS-specific capabilities must be represented as platform
hosts behind shared contracts: Android IME remains Android-only, Android overlay
controls remain Android-only, and Windows/macOS/Linux desktop overlay/hotkeys
must be native hosts for the shared overlay product concept. Product parity is the
default: a feature should be planned as cross-platform unless an OS, browser,
security, store policy, or runtime limitation makes that unsafe or impossible.

## Owned Files

| Path | Role | Edit notes |
| --- | --- | --- |
| `lib/core/platform/**` | Platform capability and native bridge wrappers | Keep native channel names stable and return typed models instead of raw maps. |
| `windows/**` | Windows desktop host | Own global hotkeys, overlay window behavior, focus, clipboard and text delivery; do not duplicate product stores here. |
| `macos/**` | macOS desktop host | Own floating window behavior, quick action monitoring, focus, clipboard and text delivery; do not duplicate product stores here. |
| `linux/**` | Linux desktop host | Own GTK keep-above behavior, clipboard fallback and desktop-environment-specific limits; do not duplicate product stores here. |
| `lib/core/router/app_router.dart` | App route table and auth/local-mode guard | Protected product routes must pass through the app shell and must not build without signed-in or explicit local fallback state. |
| `lib/core/diagnostics/**` | Local diagnostics and redaction helpers | Redact secrets/tokens/password-like fields before support copy, breadcrumbs, or event details. |
| `lib/features/auth/**` | Auth contracts, Firebase/Google adapters, auth gate, and sign-in UI | Keep SDK errors behind typed domain failures; UI should not parse raw Firebase/Google exceptions directly. |
| `lib/features/settings/**` | Runtime Settings UI | Surface permission/setup recovery paths honestly; do not show Android-only controls elsewhere. |
| `lib/features/**/domain/**` | Feature models | Keep validation allowlists aligned with SQL constraints. |
| `lib/features/clipboard/application/**` | Clipboard product API and provider composition | Keep UI and future Android bridges pointed at `ClipboardHistoryApi`, not provider repositories. |
| `lib/features/clipboard/domain/**` | Backend-neutral clipboard sources, sync state, sensitivity and dedupe contracts | Keep provider names, SQL columns and native Android details out of the domain. |
| `lib/features/clipboard/data/**` | Local/offline clipboard stores | Local fallback history is persisted through secure storage; keep provider adapters outside this module. |
| `lib/features/send_to/**` | Shared cross-surface text transformation actions | Keep Voice/Clipboard send-to behavior behind common UI/dialog primitives and write through feature stores. |
| `lib/features/custom_action_buttons/**` | Reusable action-bar button models, stores and runner | Keep buttons separate from actions: a button has label/icon/row/order, while the action is typed (`insert text`, `desktop key sequence`, `keyboard expression`, `clipboard command`, `media command`, or `macro`). Never expose arbitrary shell commands. |
| `lib/data/supabase/**` | Legacy Supabase adapter implementations | Keep compiling until Firebase parity exists; do not add new target behavior here. |
| `lib/data/firebase/**` | Firebase adapter implementations | Keep Firebase behind backend-agnostic stores and Firestore Security Rules. |
| `test/**` | Dart/widget tests | Cover model validation and bridge parsing when native contracts change. |

## Entrypoints

- `lib/main.dart`: app bootstrap.
- `lib/app/commandglows_app.dart`: application shell.
- `lib/features/settings/presentation/settings_screen.dart`: Android permission and feature status surface.

## Control Flow

```text
Settings UI
  -> Dart bridge wrapper
  -> Android MethodChannel
  -> native status/settings action

Shared overlay product surface
  -> Overlay host contract
  -> Android foreground overlay service or desktop overlay host
  -> clipboard fallback and best-effort text delivery

Desktop overlay hosts
  -> DesktopOverlayBridge (`commandglows_app/windows_overlay`, `commandglows_app/macos_overlay`, `commandglows_app/linux_overlay`)
  -> native hotkey/quick-action and floating/keep-above window behavior
  -> clipboard copy plus best-effort paste delivery where the OS permits it
  -> typed status, event queue, and delivery result models

Keyboard corner editor / preview
  -> AndroidKeyboardCornerConfig + KeyboardCornerPresetCatalog
  -> KeyboardCornerDraft + guided action catalog for draft-before-save editing
  -> selectable keyboard preview for key/corner selection
  -> AndroidKeyboardBridge get/set/reset corner config on Android
  -> local simulation only on web/non-Android preview

Clipboard UI
  -> AndroidKeyboardBridge.drainKeyboardClipboardEvents
  -> ClipboardHistoryApi
  -> ClipboardHistoryStore
  -> secure local persistent store or provider adapter

Send to actions
  -> Voice/Clipboard card icon menu
  -> shared snippet creation dialog or ClipboardHistoryApi addManualItem
  -> SnippetStore / ClipboardHistoryApi provider for the current session
  -> snippets or clipboard refresh signal

Custom action buttons
  -> Snippets library split (`Snippets` / `Boutons`)
  -> CustomActionButtonStore provider
  -> action-bar layout derived from button row/order metadata
  -> typed action contract (`insert text`, `desktop key sequence`, `keyboard expression`, `clipboard command`, `media command`, `macro`)
  -> DesktopOverlayBridge text, key-sequence, or bounded clipboard command delivery when the host supports it
  -> explicit unsupported messaging when the current platform cannot execute

Keyboard sync panel
  -> authSessionProvider + suiteIdentityProvider
  -> KeyboardSyncController (local export/apply + queue + cloud store)
  -> KeyboardSyncPanel statuses (local-only/unsupported/waiting/synced/pending/failed/conflict)
  -> KeyboardProfileBackupService export/import JSON (validated before apply)
```

## Invariants

- Remote auth owns user identity; Flutter client code must not send trusted `user_id` fields.
- Firebase Auth + Firestore Security Rules are the first target adapter for the Android MVP.
- Product routes are protected by `app_router.dart`; signed-out direct links
  redirect to auth, while explicit local mode and signed-in sessions open
  through `AppShellScreen`.
- Firebase/Google SDK exceptions cross into presentation as typed
  `AuthFailure` values with redacted support details.
- Android-only controls render only when `PlatformCapabilities.isAndroid` is true.
- Windows overlay controls must render only when Windows host support exists and
  must never imply Windows IME support.
- Unsupported states must describe the missing host or platform proof, not imply
  that the product concept is permanently Android-only.
- Domain model source allowlists must match database constraints.
- Clipboard UI, application APIs and domain models must not import Supabase adapters.
- Signed-out, local fallback, and entitlement-missing sessions keep clipboard history usable through `PersistentClipboardHistoryStore`.
- Android native code emits platform actions/events; backend writes go through the Flutter product API or an equivalent store contract.
- Windows native code may emit hotkey, window, clipboard and delivery events;
  backend writes still go through Flutter product APIs or equivalent stores.
- Windows desktop overlay delivery is best-effort: every final text must remain
  recoverable through clipboard even when focus or paste delivery fails.
- Keyboard clipboard bridge events are imported by Flutter before listing clipboard items; sensitive automatic content can be rejected by the store without user confirmation.
- Cross-surface `Envoyer vers` actions must reuse existing feature stores and preserve sensitive clipboard confirmation before writing private text.
- Custom action buttons must remain a separate executable resource from snippets. A snippet is only an `insertText` action payload; the button itself owns visual placement, icon, label, and action binding.
- Action-bar layout state must stay explicit through button row/order metadata so future keyboard rows, reordering, and drag/drop can evolve without reclassifying snippets as buttons.
- Desktop key-sequence delivery is intentionally bounded: typed keys and modifiers only, no arbitrary process launch, shell execution, or hidden script payload.
- Clipboard actions are first-class typed commands (`copy`, `cut`, `paste`) and may be translated to bounded desktop key sequences. Media and macro actions can be stored before their execution host exists, but must report unsupported execution clearly.
- Keyboard corner config models in `lib/features/keyboard/domain/keyboard_models.dart` mirror the native preset/override wire shape. Kotlin native owns functional preset tables; Flutter keeps preset ids/names as DTO/UI fallback and resolves only explicit overrides.
- `KeyboardCornerShortcutsScreen` edits corner shortcuts as a draft. It must not call the native save bridge until the user explicitly saves, and unsupported platforms must remain simulation-only.
- `KeyboardThemeStudioScreen` and `KeyboardCornerShortcutsScreen` notify `keyboardSyncChangeNotifierProvider` only after successful native saves; these screens must not call Firestore directly.
- `KeyboardSyncPanel` must show explicit unsupported/local-only messaging on web/non-Android and must not simulate native success.
- V1 keyboard cloud sync excludes sensitive shortcuts, image payloads/paths, clipboard content/history, recents, diagnostics, and secrets. Manual export/import follows the same validation policy.
- `KeyboardPreviewScreen` and `KeyboardCornerSelectablePreview` can render explicit override shortcuts and simulate simple text-like override outputs. They do not recreate native preset defaults; Android key events, field policy enforcement, persistence, preset resolution, and system dispatch still require Android IME validation.

## Failure Modes

- Native channel unavailable: show a recoverable Settings message instead of crashing.
- Windows hotkey, always-on-top window, focus, clipboard or delivery unavailable:
  keep the shared overlay UI recoverable and preserve final text through visible
  clipboard/manual-copy fallback.
- Remote backend not configured: keep local UI usable with the secure persistent clipboard store and display configuration state for cloud sync.
- Auth provider unavailable or misconfigured: show a recoverable French auth
  message, keep support detail redacted/copyable only when useful, and do not
  publish a partial signed-in state.
- Google Sign-In canceled after account selection can indicate Android
  configuration trouble; treat configuration hints as setup failures instead of
  pure user cancellation.
- Native corner config validation failure: keep the current editor state visible, show the bridge error, and do not pretend the shortcut was saved.

## Security Notes

Secrets stay in local secure storage. Text, clipboard content, audio, provider
payloads, and tokens must not be logged into `client_events`.

Auth support detail, AppDiagnostics, and Sentry events must not contain raw API
keys, OAuth/JWT tokens, password-like values, raw provider payloads, clipboard
content, transcripts, or private user text.

## Validation

```bash
flutter analyze
flutter test
```

## Reader Checklist

- `lib/core/platform/**` changed -> verify native channel contract and Settings UI.
- `windows/**` changed -> verify Windows runner/manual QA for hotkey, overlay
  window, focus, clipboard, delivery, multi-monitor and DPI behavior.
- `macos/**` changed -> verify macOS runner/manual QA for quick action
  monitoring, floating window, focus, clipboard, delivery, Spaces/fullscreen and
  Retina behavior.
- `linux/**` changed -> verify Linux runner/manual QA for GTK keep-above,
  clipboard fallback, accelerator scope, Wayland/X11, multi-monitor and DPI
  behavior.
- `lib/core/platform/desktop_overlay_bridge.dart` changed -> run
  `flutter test test/desktop_overlay_bridge_test.dart` and `flutter analyze`;
  native runner proof is still required for OS behavior.
- `lib/core/platform/windows_overlay_bridge.dart` changed -> run
  `flutter test test/windows_overlay_bridge_test.dart` and `flutter analyze`;
  Windows runner proof is still required for native behavior.
- `lib/features/keyboard/domain/keyboard_models.dart` or keyboard preview changed -> verify preset id parsing, explicit override precedence, private-mode filtering, and widget tests for preview rendering.
- `lib/features/keyboard/presentation/keyboard_corner_shortcuts_screen.dart` changed -> verify draft/save separation, private-mode warnings, snippet search, import/export safety, and unsupported-platform copy.
- Domain model source allowlist changed -> verify SQL constraints and tests.
- Repository metadata changed -> verify backend adapter docs and security rules/tests.
- Clipboard API/store changed -> verify no feature UI imports `lib/data/supabase`, run clipboard tests including persistent local history, and update provider docs.
- `lib/features/send_to/**`, Voice send-to, Clipboard send-to, or Snippet refresh changed -> run `flutter test test/send_to_actions_test.dart` and `flutter test test/page_scoped_search_test.dart`.
- `lib/features/custom_action_buttons/**`, `lib/features/snippets/presentation/custom_action_buttons_panel.dart`, or `lib/core/platform/desktop_overlay_bridge.dart` changed -> run `flutter test test/custom_action_button_store_test.dart test/custom_action_button_runner_test.dart test/custom_action_buttons_screen_test.dart test/desktop_overlay_bridge_test.dart test/windows_overlay_bridge_test.dart`.
- Auth adapter/router/sign-in changed -> run auth failure, sign-in, router guard,
  full Flutter tests, and the Android auth smoke before claiming ship readiness.

## Maintenance Rule

Update this doc when Flutter bridge contracts, Settings capabilities, repository
contracts, or validation commands change.
