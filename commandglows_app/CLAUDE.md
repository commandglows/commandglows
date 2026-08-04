---
artifact: documentation
metadata_schema_version: "1.0"
artifact_version: "1.2.0"
project: "CommandGlows"
created: "2026-03-18"
updated: "2026-05-04"
status: "reviewed"
source_skill: "sf-docs"
scope: "runtime-baseline"
owner: "Diane"
confidence: "medium"
risk_level: "medium"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Flutter"
  - "Supabase Auth"
  - "Supabase Postgres + RLS"
  - "Android Overlay Bridge"
  - "Windows Desktop Overlay Host"
evidence: []
depends_on:
  - "shipglows_data/business/business.md@0.1.0"
  - "shipglows_data/business/product.md@0.1.0"
  - "shipglows_data/technical/architecture.md@0.1.0"
  - "shipglows_data/technical/guidelines.md@0.1.0"
supersedes:
  - "CLAUDE.md@1.0.0"
next_review: "2026-05-26"
next_step: "$sf-docs update"
---

# CLAUDE.md — CommandGlows

## Project Overview

CommandGlows is now a Flutter application using backend-agnostic product stores
with Firebase as the first active Android adapter and Supabase retained as
legacy/migration reference where still present.

The app targets multi-platform delivery with a shared Flutter product/UI layer.
System-level entry points are native hosts behind that shared layer: Android has
IME plus Android overlay, and Windows now has a dedicated desktop
overlay/hotkeys parity chantier.

Product parity is the default planning posture. Treat Android-only,
desktop-only, web-limited, or unavailable status as an exception that must be
caused by OS/browser/security/store constraints and documented explicitly.
Platform order after Windows is macOS, Linux, iOS, then web. Platform-adapted
experiences are acceptable only when they produce a better result; if the result
is equivalent, keep the shared interaction model.

Current migration baseline includes:
- Supabase auth gate and email/password login flow
- User-scoped RLS tables for transcriptions, clipboard, snippets, dictionary, and settings
- Flutter UI with CRUD foundations for transcriptions, clipboard, snippets, and dictionary
- Android overlay permission bridge (permission status + toggle + settings deep-link)

## Stack

- Framework: Flutter 3.x / Dart 3.x
- State management: flutter_riverpod
- Navigation: go_router
- Backend: Supabase (Auth + Postgres + RLS)
- Secure storage: flutter_secure_storage
- Audio/voice primitives: record + speech_to_text
- Android native: Kotlin `MethodChannel` bridge for overlay permission, bridge state, and IME status
- Windows native target: desktop overlay host for global hotkeys, always-on-top window behavior, focus, clipboard, and delivery

## Commands

```bash
flutter pub get
flutter analyze
flutter test
```

For Supabase:

```bash
supabase db push
```

## ShipGlows Development Mode

- development_mode: hybrid
- validation_surface: mixed
- ship_before_preview_test: conditional
- post_ship_verification: sf-prod for web; manual Android QA by Diane for APK/IME behavior
- deployment_provider: vercel for web; GitHub Actions/Blacksmith for Android builds
- preview_source: existing Vercel Flutter host (legacy hostname retained pending external cutover)
- production_url: https://www.commandglows.com
- notes: Hosted Flutter preview hostname remains an external-provider exception until the CommandGlows Vercel project/domain is provisioned. Pure Flutter surfaces are considered shared across web, Android, and desktop for QA purposes: onboarding UI, Settings UI, clipboard manual CRUD, snippets, dictionary, dialogs, form validation, navigation, overlay panel UI, and other widget-tree behavior must be covered by targeted widget tests first. Native host behavior is platform-specific: Android IME/overlay/native permissions/media/session lifecycle must be validated through GitHub Actions/Blacksmith APKs and Diane's device QA; Windows overlay hotkeys/window/focus/clipboard/delivery require a Windows runner or Windows manual QA. Manual APK QA should not be used as the first line of detection for testable Flutter widget regressions.
- last_reviewed: 2026-05-24

### Pre-APK QA Gate

Before asking Diane to install or retest an Android APK, run the strongest local gate that matches the changed surface:

- Always run `flutter analyze` and the targeted `flutter test ...` covering the changed workflow.
- For any screen or flow change in a shared Flutter surface, add or extend widget tests for the actual user path, including open/close dialogs, `Annuler`, no-op `Sauvegarder`, real save, delete/cancel, search/filter, and empty/error states when relevant.
- Run `flutter test test/widget_test.dart` or the relevant screen test file when the change touches central UI.
- Run full `flutter test` before handing off a broad UI, onboarding, clipboard, settings, keyboard-preview, snippets, or dictionary change.
- Use the Vercel Flutter web app as the fast manual smoke surface for shared Flutter UI before APK handoff when the behavior does not depend on Android-native APIs.
- Ask Diane for physical-device APK QA only for Android-native behavior or as the final confirmation after automated and web-smoke coverage have already reduced widget-regression risk.

## ARM64 Android Release Guardrail

Do not run Android builds, packaging, installs, or Gradle tasks locally from this VM. This includes `flutter build apk`, `flutter build appbundle`, `flutter run -d android`, `./gradlew ...`, `assemble*`, `bundle*`, `compile*`, and `testDebugUnitTest`, even for debug builds. The VM has previously been destabilized by local Android/AAPT2 work. Route APK/AAB/IME validation to GitHub Actions/Blacksmith and Diane's physical-device QA. Local agent checks are limited to `flutter analyze`, `flutter test` or targeted `flutter test ...`, and web-only checks/builds when explicitly needed.

Sentry can be used for runtime crash/error evidence from installed app sessions, but it does not replace Blacksmith CI for Android build validation.

## Git Commit Guardrail

Do not create commits unless Diane explicitly asks for a commit, or unless an invoked ShipGlows chip/skill explicitly requires committing as part of its workflow. By default, leave changes in the working tree and report what changed. Diane handles commits herself. For small visual tweaks, quick copy changes, icons, spacing, or exploratory fixes, edit the files and report the diff/checks without committing.

## Architecture

```text
lib/
├── core/
│   ├── bootstrap/supabase_bootstrap.dart
│   ├── platform/android_overlay_bridge.dart
│   └── router/app_router.dart
├── data/supabase/
│   ├── supabase_client_provider.dart
│   ├── transcription_repository.dart
│   ├── clipboard_repository.dart
│   ├── snippet_repository.dart
│   └── dictionary_repository.dart
├── features/
│   ├── auth/presentation/
│   ├── shell/presentation/app_shell_screen.dart
│   ├── voice/presentation/voice_screen.dart
│   ├── clipboard/presentation/clipboard_screen.dart
│   ├── snippets/presentation/snippets_screen.dart
│   ├── dictionary/presentation/dictionary_screen.dart
│   └── settings/presentation/settings_screen.dart
└── main.dart

android/
└── app/src/main/kotlin/com/commandglows_app/commandglows_app/MainActivity.kt

supabase/
├── migrations/
└── tests/
```

## Runtime Rules

- Supabase URL and publishable key must be injected via `--dart-define`.
- No service-role key is allowed in Flutter client code.
- Data access is controlled by Supabase RLS policies; client code must never bypass tenant/user filters.
- Clipboard, snippets, dictionary, and transcriptions are user-scoped CRUD resources.
- Android overlay controls are Android-only and must remain disabled on non-Android platforms.
- Overlay as a product capability is multi-platform. Windows owns the next host:
  desktop overlay window, global hotkeys, clipboard, focus, and best-effort text
  delivery. The first Windows wave should try the full path, including automatic
  best-effort delivery with clipboard fallback. Do not promise a Windows IME.
- Most CommandGlows concepts should target parity across Android, iOS, macOS,
  Windows, Linux and web. Do not classify a feature as Android-only unless the
  OS mechanism itself is Android-specific, such as the IME.

## Known Gaps

- Windows desktop overlay/hotkeys parity is a draft chantier; do not claim it is
  implemented until a Windows runner or manual QA proves hotkey, overlay window,
  clipboard, and delivery behavior.
- Full Android overlay foreground-service flow and accessibility injection still
  require Android device QA for final parity claims.
- Voice recording and AI cleanup pipelines are not fully wired end-to-end.
- Legacy JS/TS artifacts may remain in non-Flutter directories until final purge is completed.

## Related Docs

- `docs/SPEC_FLUTTER_SUPABASE_MIGRATION.md`
- `docs/ARCHITECTURE_FLUTTER.md`
- `docs/API_SUPABASE.md`
- `docs/OVERLAY_ANDROID.md`
- `docs/VERIFICATION.md`
