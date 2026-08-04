---
artifact: documentation
metadata_schema_version: "1.0"
artifact_version: "0.1.1"
project: "CommandGlows"
created: "2026-03-18"
updated: "2026-05-30"
status: "draft"
source_skill: "sf-docs"
scope: "update"
owner: "unknown"
confidence: "medium"
risk_level: "medium"
security_impact: "unknown"
docs_impact: "yes"
linked_systems: []
depends_on: []
supersedes: []
evidence:
  - "git history"
next_step: "$sf-changelog"
---

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed
- Renamed active ShipGlowz governance references and documentation links to the canonical ShipGlows identity and `shipglows_data` path.

### Added
- Added the first macOS and Linux desktop overlay host versions with a shared
  Dart `DesktopOverlayBridge`, native macOS/Linux channels, clipboard fallback,
  macOS best-effort paste delivery, Linux degraded hotkey/delivery status, and
  manual QA checklists.
- Added cross-surface `Envoyer vers` actions so Voice transcriptions can become Snippets or Clipboard WinGlowz items, Clipboard entries can become Snippets, and sensitive Voice-to-Clipboard content requires confirmation.
- Added the WinGlowz app Accueil feed with global search, shared page search controls, shared refresh/sync/save status actions, page-scoped searches, and Settings save status feedback.
- Added persistent local clipboard history for local/offline mode, including reload-safe deduplication, search, direct copy back to the system clipboard, and corruption-tolerant recovery tests.
- Wired the Android IME key-value engine into the live keyboard layout and dispatch path, including parsed text keys, Ctrl/Alt/Fn modifier keys, key-event dispatch, macro dispatch support and an Fn navigation modmap.
- Added Android IME key-value engine foundations inspired by the reference keyboard: typed key values, parser support for text/keyevent/action/modifier/macro payloads, Shift/Ctrl modifier handling, modmap overrides, and native unit-test coverage.
- Added Android IME touch foundations for pointer-id tracking, secondary pointer suppression, long-press repeat on destructive/navigation keys, and horizontal spacebar sliding for cursor movement.
- Added Android IME typing assistance foundations: automatic capitalization, current-word suggestions, shortcut expansion, and app-to-native sync for Snippets/Dictionary text-expander rules.
- Added Android IME reference editing actions inspired by the functional keyboard: forward delete, delete-word-forward, cut, select all, paste as plain text, undo, redo and selection cancel, mirrored in the FlutterWeb keyboard preview.
- Added a FlutterWeb `Keyboard preview` screen for Vercel/browser review of the WinGlowz keyboard layouts, field contexts, panels and private/corner/debug states.
- Added Android IME reference-parity foundations: FR/EN subtypes, next-keyboard switching metadata, defensive lifecycle hooks, numeric/date field context handling and centralized `InputConnectionEditor` editing/navigation results.
- Added Android overlay appearance controls in Settings for floating bubble size and opacity.
- Added native Android overlay bridge support for persisted bubble appearance preferences.
- Added first-run onboarding that explains the startup path, Android keyboard setup, microphone, overlay, accessibility and cloud sync permissions.
- Added a Settings backend-provider diagnostic card with a copyable Supabase/local-mode error.
- Added the Android WinGlowz keyboard IME foundation with a custom swipe-corner keyboard surface, native input service declaration, Settings bridge, Android speech recognition trigger, explicit clipboard actions, emoji/navigation panels, touch-debug overlay and generic media play/pause.
- Added keyboard-origin Supabase schema fields, source allowlists, clipboard hash dedupe metadata, RLS smoke coverage and Dart model/bridge tests.
- Added project technical governance docs and a content map for future ShipGlows code/doc update gates.
- Added `docs/technical/firebase-oidc-ci-playbook.md` with a reusable GitHub OIDC/WIF Firestore deploy runbook and troubleshooting matrix.

### Changed
- Changed the app shell navigation to use a responsive rail on wider screens so the added keyboard review surface does not crowd the bottom navigation.
- Changed first-run onboarding into a dismissible overlay so tab content remains visible while setup guidance is shown.
- Changed the onboarding completion screen to group granted permissions inside the matching feature cards instead of stacking them as separate cards.
- Moved the Settings onboarding card to the bottom once setup is fully configured, with `Tout est configuré` and a `Revisiter` action.
- Changed Android/system Back handling inside the shell so Back returns to the previous app tab before exiting.
- Migrated canonical project documentation from root files (`ARCHITECTURE.md`, `BRANDING.md`, `BUSINESS.md`, `GTM.md`, `GUIDELINES.md`, `PRODUCT.md`, `CONTENT_MAP.md`) to `shipglows_data` and updated documentation/spec path references accordingly.
- Moved the missing Supabase configuration diagnostic out of the global shell banner and into Settings so local-mode screens are not crowded while the backend provider remains undecided.
- Repaired the local Flox Flutter environment and pinned it to an executable Flutter SDK variant.
- Protected direct app routes behind Supabase auth state instead of allowing private screens to load before sign-in.
- Updated `.env.example` to document Supabase runtime defines instead of legacy Convex/Clerk variables.
- Renamed Supabase runtime configuration to `SUPABASE_PUBLISHABLE_KEY` in app bootstrap and docs, while keeping the old key name as an internal compatibility fallback.
- Updated README, platform, overlay, component, API and verification docs to describe Android IME scope and proof gaps.
- Updated Android keyboard docs and spec trace to distinguish the implemented MVP from pending double-tap, long-press, drawable gesture, Android compile and device QA work.
- Switched Firestore CI deploy from interactive Firebase CLI auth to GitHub OIDC/WIF in `.github/workflows/android-build.yml`.
- Updated Firebase CI documentation to require `GCP_WIF_PROVIDER` and `GCP_WIF_SERVICE_ACCOUNT` instead of long-lived service account JSON secrets.
- Archived Supabase migration target docs as legacy-only references and pointed execution to `shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md`.
- Removed unnecessary Firestore indexes that caused hosted deploy errors on `settings` and `transcriptions` collection groups.
- Moved active task tracking to `shipglows_data/workflow/TASKS.md` and synced tracker naming to WinGlowz.

### Fixed
- Fixed a Flutter crash when closing the clipboard item edit dialog with `Annuler` or `Sauvegarder` without changing content.
- Replaced the `Plus tard` action on already validated onboarding rows with a non-actionable `Activé` state.

### Security
- Removed the hardcoded sample snippet insertion path from the Android IME; snippet actions now open the app instead of inserting placeholder text.
- Converted the RLS smoke script into a pgTAP-style test covering own-user access, forged user denial, anonymous denial, tombstone preservation and sensitive client-event metadata keys.
- Added database guardrails for tombstone preservation, client event metadata size, sensitive metadata keys and user-scoped query indexes.
- Added IME private-field gating for password, OTP, no-personalized-learning and host-marked sensitive fields so dictation, snippets and clipboard capture are disabled there.
- Hardened Android IME private mode so emoji recents are neither loaded into the keyboard panel nor written after emoji insertion in sensitive fields.

## [2026-04-26]

### Added
- Added Node/npm runtime metadata and Dependabot coverage for npm and GitHub Actions updates.

### Changed
- Refreshed compatible npm dependencies within the current Expo SDK 55 / React Native 0.83 constraints.

### Security
- Updated transitive packages to remove known critical and high npm audit findings, including the Clerk shared SDK advisory.
- Documented remaining moderate Expo toolchain audit findings that require a separate migration path rather than `npm audit fix --force`.

## [0.1.0] — 2026-03-18

### Added
- Initial project setup with Expo SDK 55 + React Native 0.83
- Dual-mode voice transcription: free on-device (expo-speech-recognition) + advanced (Whisper API)
- AI text cleanup via Claude Haiku + local regex cleanup (filler words FR/EN)
- "Enhance with AI" button for per-transcription upgrade from free to advanced
- `useVoiceRecording` hook — reusable recording state machine with metering
- Audio waveform visualization component (animated bars from recorder metering)
- Clipboard sync via Convex (real-time polling, dedup, cross-device)
- In-app floating action button (FAB) — draggable, snap-to-edge, expand/collapse with waveform + cancel/done controls
- Native Android overlay module (Kotlin) — FloatingOverlayService, OverlayView, WaveformView
- System overlay via TYPE_APPLICATION_OVERLAY with foreground service
- Text injection: AccessibilityService (opt-in) + clipboard fallback (default)
- Overlay permissions hook (`useOverlayPermissions`) with guided setup in Settings
- Expo config plugin (`withFloatingOverlay`) for AndroidManifest permissions and service declarations
- Settings screen: API keys (SecureStore), language selector (10 languages), overlay permissions
- Convex schema: clipboardItems, transcriptions, snippets, dictionary tables
- Transcriptions auto-saved to Convex after every successful recording
- GitHub Actions CI: Android APK debug build on every push
- EAS Build config (development, preview, production profiles)
- CLAUDE.md with full project documentation
