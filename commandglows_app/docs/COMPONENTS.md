---
artifact: documentation
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "CommandGlows"
created: "2026-04-26"
updated: "2026-06-01"
status: "reviewed"
source_skill: "sf-docs"
scope: "components"
owner: "Diane"
confidence: "high"
risk_level: "medium"
security_impact: "low"
docs_impact: "yes"
linked_systems:
  - "Flutter"
  - "Android native overlay"
  - "Android native IME"
depends_on:
  - "../shipglows_data/technical/architecture.md@0.1.0"
  - "../docs/MIGRATION_FLUTTER.md@0.1.0"
supersedes: []
evidence:
  - "../components/OverlayBridge.tsx"
  - "../components/AudioWaveform.tsx"
  - "../components/RecordingControls.tsx"
  - "../modules/floating-overlay/android/src/main/java/expo/modules/floatingoverlay/FloatingOverlayModule.kt"
  - "../android/app/src/main/kotlin/com/commandglows/app/ime/CommandGlowsInputMethodService.kt"
next_step: "$sf-docs components"
---

# Components — CommandGlows

## Scope

This inventory separates:

- target Flutter component contracts (implementation target),
- legacy React Native components (reference-only parity map).

## Target component contracts (Flutter)

### Shared UI foundation

- `AppTheme`:
  shared color, typography, spacing, radius, motion, and interaction metrics.
  Token naming and semantic mapping in Flutter are owned by CommandGlows.
  Common touch targets should stay at a 48dp baseline for frequent actions;
  visual density should be improved through layout, spacing, and grouping
  before shrinking interactive targets.
- `AppActionRail`:
  responsive action layout used by forms and compact action groups. It keeps
  actions on the same row when width allows, then wraps predictably instead of
  forcing large stacked button blocks on mobile.
- `AppSectionCard`, `AppStatusCard`, `AppEmptyStateCard`, and `AppEntityCard`:
  shared content containers for section framing, status rows, guided empty
  states, and entity lists. Prefer compact padding and avoid wrapping an entire
  page in a card when child cards or status blocks already provide structure.
- `ProductPageScaffold`, `ProductSummaryStrip`, `AppMetricPill`,
  `AppStatusPill`, and `AppLocalModeStatusPill`:
  shared grammar for product pages such as Voix, Papier, Snippets, and Dico.
  Product pages should render compact summary/status first, primary action
  second, list controls third, then results. Local-only state belongs in the
  summary strip as natural French copy, not in a large standalone English
  notice. `AppStatusPill` must not label a page `Synchronisé` unless the page
  has a concrete sync source proving that data scope is synced.

### Voice flow

- `VoiceScreen`:
  primary dictation workflow, state visibility, copy/edit/share actions.
- `RecordingControls`:
  start/stop/cancel controls with explicit mode state.
- `AudioMeter`:
  visual feedback for recording activity.

### Clipboard flow

- `ClipboardScreen`:
  list, copy, pin/unpin, delete, sync status.
- `ClipboardListItem`:
  dense row actions and timestamp metadata.

### Settings flow

- `SettingsScreen`:
  language, permissions, key management status, auth session visibility,
  Android overlay status, and Android keyboard IME status/preferences.
  The Compte & cloud area must distinguish measured states such as
  `Synchronisé`, `En attente`, `Restauration partielle`, `Conflit`, and
  `Local uniquement`; it must not imply full backup readiness when a keyboard
  theme image is still local-only or pending.
- `KeyboardCornerShortcutsScreen`:
  visual Android keyboard corner editor with selectable keyboard preview,
  draft-before-save state, guided accent/punctuation/snippet/action choices,
  private-field warnings, per-corner/per-key reset, and JSON import/export. It
  reads and writes the native `commandglows_app/keyboard` corner config when
  Android IME is available, and clearly stays in simulation mode on unsupported
  platforms.
- `KeyboardThemeStudioScreen`:
  dedicated keyboard theme editor with draft/save/discard/reset, live draft
  preview, collapsible sections, the full v1 preset catalog, JSON import/export,
  contrast/performance validation, border/radius/shadow controls,
  linear/radial gradients, press-effect/easing controls, and Android-native
  persistence through `AndroidKeyboardBridge`.
- `PermissionCards`:
  platform-specific permission status + recovery actions.

### Snippets and dictionary

- `SnippetsScreen` + editor sheet/dialog for CRUD and trigger uniqueness errors.
- `SnippetsScreen` keeps snippets as the primary text shortcut surface and redirects button management to `Actions`.
- `CustomActionsScreen` is the dedicated product page for custom action buttons, IME enablement, and Android keyboard sync.
- `CustomActionButtonsPanel`:
  - Preview the current action bar by rows.
  - Create action buttons with icon, row index, order, and typed command.
  - Execute a button from the panel or from its preview row surface.
  - Return explicit unsupported/host-limited status for actions not supported on the current platform.
  - Report Android IME compatibility and keep incompatible desktop-only actions out of the native keyboard projection.
- `DictionaryScreen` + editor sheet/dialog for CRUD and replacement validation.

### Overlay integration (Android)

- `OverlayController` (service/controller layer):
  bridge to native plugin for show/hide/state/event operations.
- `OverlayStatusBanner` (UI):
  user-visible status of overlay/accessibility readiness.

### Keyboard integration (Android)

- `CommandGlowsInputMethodService`:
  native Android `InputMethodService` for system keyboard entry.
- `CommandGlowsKeyboardView`:
  native minimal QWERTY keyboard with action row for dictation, clipboard,
  snippets entry point, Settings, and media play/pause.
- `KeyboardSecurityPolicy`:
  detects password, OTP, no-personalized-learning and host private fields to
  force private mode.
- `AndroidKeyboardBridge`:
  Dart MethodChannel wrapper for IME enabled/active status, input-method
  settings, keyboard picker, non-sensitive preferences, and configurable
  corner shortcut config. The bridge also owns keyboard sync export/apply and
  restored theme-image installation into app-private native storage.
- `KeyboardPreviewScreen`:
  Flutter preview/sandbox for keyboard review, including simulated input,
  panels, numeric grid, scrollable snippets/clipboard rows, media status,
  settings panel, and configurable corner preset rendering.
- `KeyboardCornerSelectablePreview`:
  reusable preview surface for the corner editor. It renders stable key ids,
  four selectable corner targets, draft labels, private-mode filtering, and
  special-key corner gating without claiming native Android dispatch proof.

Native event contract to preserve from Kotlin module:

- `onBubbleTap`
- `onRecordStop`
- `onRecordCancel`
- `onBubbleLongPress`

Native command contract to preserve:

- `showBubble`
- `hideBubble`
- `startRecordingService`
- `stopRecordingService`
- `setOverlayState`
- `updateMeterLevel`
- `setResultText`
- `injectText`

## Legacy component reference (non-target)

Legacy components remain useful only for parity checks:

- `components/AudioWaveform.tsx`
- `components/RecordingControls.tsx`
- `components/OverlayFAB.tsx`
- `components/OverlayBridge.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/clipboard.tsx`
- `app/(tabs)/settings.tsx`

They do not define target implementation technology choices.
