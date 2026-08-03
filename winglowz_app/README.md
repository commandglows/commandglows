---
artifact: documentation
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlowz"
created: "2026-04-26"
updated: "2026-05-30"
status: "reviewed"
source_skill: "sf-docs"
scope: "readme"
owner: "Diane"
confidence: "medium"
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Flutter"
  - "Backend-agnostic stores"
  - "Firebase first adapter"
  - "OpenAI Whisper"
  - "Anthropic Messages API"
  - "Android overlay services"
  - "Android IME keyboard"
depends_on:
  - "docs/SPEC_FLUTTER_SUPABASE_MIGRATION.md@0.1.0"
  - "docs/API_SUPABASE.md@1.0.0"
supersedes: []
evidence:
  - "docs/SPEC_FLUTTER_SUPABASE_MIGRATION.md"
  - "../shipglows_data/workflow/specs/android-ime-winglowz_app-keyboard.md"
  - "android/app/src/main/AndroidManifest.xml"
next_step: "$sf-docs update"
---

# WinGlowz

WinGlowz is migrating to a Flutter Android-first architecture with backend-agnostic data/settings contracts. Firebase Auth + Firestore is the first planned remote adapter.

WinGlowz is positioned as a sibling product of WinGlowz in the same ecosystem, with a product focus on voice-first capture and text workflow acceleration.

This subproject now contains:
- A Flutter multi-platform project scaffold.
- Legacy Supabase SQL migrations with RLS-first contracts from the prior migration path.
- Android native overlay, first native WinGlowz keyboard IME foundation, and a
  Windows desktop overlay/hotkeys parity chantier.
- Migration docs and verification gates.
- Legacy Expo/Convex contracts preserved in docs for parity validation; no app-level JS/TS implementation remains in the repo.

## Go-to-Market Posture

- Product narrative: voice-first productivity and learning/watchflow support, not a generic all-in-one suite.
- Commercial narrative: LTD + subscription strategy is documented at business level, but runtime billing/entitlements are not yet implemented.
- Claim boundary: avoid public claims about production-grade billing, enterprise compliance, or finalized cross-device account isolation until the related runtime milestones are complete.

## Quick Start (Flutter baseline)

```bash
flutter pub get
flutter analyze
flutter test
```

## Toolchain Source Of Truth

- `winglowz_app/pubspec.yaml` is the canonical Flutter SDK source of truth.
- The app currently pins `environment.flutter: 3.41.7`.
- `.github/workflows/android-build.yml` reads that exact version through `subosito/flutter-action` `flutter-version-file`.
- `.flox/env/manifest.toml` should mirror the same Flutter version for contributors using Flox.
- If you are not using Flox, install Flutter `3.41.7` explicitly before running dependency or CI-facing checks.

## Dependency Maintenance Rules

- Use `flutter pub outdated` before changing package constraints.
- Upgrade only safe non-major direct dependencies for the active runtime and shared UI surface.
- Keep `pubspec.lock` committed and regenerate it with `flutter pub upgrade <package...>` or `flutter pub get` after manifest changes.
- Do not upgrade `go_router` or `record` across majors in routine maintenance; those need their own migration scope.
- Treat `supabase_flutter` as legacy compile-compat debt. Do not refresh or expand Supabase ownership unless a dedicated retirement or migration spec says otherwise.
- After dependency changes, run the allowed local proof path:

```bash
flutter analyze
flutter test
```

## Product Feature Notes

- `winglowz_app/docs/CUSTOM_ACTION_BUTTONS.md` documente la page `Actions`, la barre d’action personnalisable, la compatibilité IME Android et les limites desktop.
- `winglowz_app/docs/PLATFORM_BEHAVIOR.md` couvre les limites par plateforme et le contrat hôte.
- `winglowz_app/docs/COMPONENTS.md` inclut l’inventaire des composants `Actions`, `Snippets` et clavier Android.

## Firebase Runtime Defines

Firebase is now wired as the first backend adapter behind backend-agnostic stores.
If these values are missing, WinGlowz stays in local mode so UI development does
not crash.

Never use backend admin/service credentials in Flutter/web/desktop/mobile clients.

Auth has three supported runtime paths:

- Firebase email/password session for cloud-backed product usage.
- Firebase Google session for cloud-backed product usage.
- Explicit local mode when Firebase is absent or the user chooses local-only use.

Local mode is not a cloud-auth bypass. It keeps the app usable locally, while
remote sync stays unavailable until a Firebase session exists.

Google Sign-In on Android requires the Firebase Android app package name,
enabled Google provider, `FIREBASE_WEB_CLIENT_ID` passed as the Google Sign-In
`serverClientId`, and the debug/release SHA fingerprints for the signing key
used by the APK. `FIREBASE_WEB_CLIENT_ID` is the OAuth 2.0 **Web client ID**
ending in `.apps.googleusercontent.com`; it is not the Firebase Android app id.
Missing or mismatched SHA/client configuration can surface as a canceled Google
flow, so treat those cases as setup failures during QA.

## Sentry Runtime Defines

Sentry is optional. If `SENTRY_DSN` is missing, WinGlowz does not initialize
Sentry and keeps diagnostics local-only.

Use Dart defines for builds that should report Flutter/native crashes:

```bash
flutter run \
  --dart-define=SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0 \
  --dart-define=SENTRY_ENVIRONMENT=debug
```

WinGlowz configures Sentry with `sendDefaultPii=false`, screenshots disabled,
view hierarchy disabled, and build tags from `WINGLOWZ_APP_BUILD_*` defines.

## GitHub Actions / Blacksmith APK

The Android CI workflow runs on Blacksmith and uses GitHub Secrets for build-time configuration.
It also validates that the target Firebase project has Firebase Auth services and
project auth config enabled before producing an APK.

Add these repository secrets in GitHub: **Settings -> Secrets and variables -> Actions -> Repository secrets**.

The app now reads neutral runtime defines. GitHub Actions maps branch-specific
secrets into those names:

- branch `dev` => dev Firebase/GCP secrets
- branch `main` => prod Firebase/GCP secrets

Store these repository secrets in GitHub Actions:

- `DEV_FIREBASE_PROJECT_ID`
- `DEV_FIREBASE_API_KEY`
- `DEV_FIREBASE_APP_ID`
- `DEV_FIREBASE_MESSAGING_SENDER_ID`
- `DEV_FIREBASE_AUTH_DOMAIN`
- `DEV_FIREBASE_STORAGE_BUCKET`
- `DEV_FIREBASE_WEB_CLIENT_ID`
- `DEV_GCP_WIF_PROVIDER`
- `DEV_GCP_WIF_SERVICE_ACCOUNT`
- `PROD_FIREBASE_PROJECT_ID`
- `PROD_FIREBASE_API_KEY`
- `PROD_FIREBASE_APP_ID`
- `PROD_FIREBASE_MESSAGING_SENDER_ID`
- `PROD_FIREBASE_AUTH_DOMAIN`
- `PROD_FIREBASE_STORAGE_BUCKET`
- `PROD_FIREBASE_WEB_CLIENT_ID`
- `PROD_GCP_WIF_PROVIDER`
- `PROD_GCP_WIF_SERVICE_ACCOUNT`
- `SENTRY_DSN` (optional crash reporting)
- `SENTRY_ENVIRONMENT` (optional, for example `debug`, `staging`, `production`)

Use `docs/technical/firebase-cli-foundation.md` for exact Firebase CLI commands:

- `firebase use winglowz-dev`
- `firebase deploy --only firestore`
- `firebase emulators:start --only firestore,auth`

The prior Supabase secrets are legacy and should not be expanded for new target work.
The Firestore CI deploy now uses GitHub OIDC + Google Workload Identity Federation
instead of a long-lived service account JSON key.

## Current Migration Scope

- Auth/data: backend-agnostic contracts replace direct Convex/Supabase coupling; Firebase Auth + Firestore adapters are wired with local fallback.
- UI: Flutter shell + auth gate + settings key storage baseline is in place.
- Security: Firestore rules and indexes are versioned; emulator and real Firebase validation still require `firebase-tools`.
- Platform direction: near-complete functional parity is the default target
  across Android, iOS, macOS, Windows, Linux and web. Platform-specific native
  hosts are implementation details behind shared Flutter UI and product logic.
  Exceptions must be caused by OS/browser/security/store limits and documented
  explicitly. After Windows, the platform order is macOS, Linux, iOS, then web.
  Adapted UX is acceptable only when it improves the result; equivalent results
  should keep the shared interaction model.
- Overlay model: Flutter owns the shared WinGlowz product UI, actions, states,
  Settings patterns, and backend-agnostic stores. Each OS owns its system host:
  Android uses a native foreground overlay bubble; Windows now has a first
  desktop overlay/hotkeys host version with a native `winglowz_app/windows_overlay`
  channel for global hotkey, always-on-top window behavior, clipboard and
  best-effort paste delivery. macOS and Linux now follow the same desktop-host
  pattern with native `winglowz_app/macos_overlay` and
  `winglowz_app/linux_overlay` channels.
- Android overlay: Flutter now has a native foreground overlay bubble foundation with queued native events, visual states, accessibility delivery, clipboard fallback, and Settings size/opacity controls. Real-device QA is still required before deleting the legacy Expo overlay reference or snapshot archive.
- Android IME: WinGlowz can be enabled as a native Android keyboard. The current foundation provides modular Canvas rows, tap + swipe-corner character selection, QWERTY/AZERTY profiles, Smart French corner defaults, normal/corner modes, numbers/accents/symbol layers, field-context variants (email/URL/phone/search), private-field gating, minimal navigation/emoji/clipboard/media/snippets/settings panels, basic double-space + punctuation auto-spacing corrections with exclusions, optional touch-debug overlay, local Android speech recognition, media key dispatch, and Settings status/preferences. Double-tap/long-press action policies from the full keyboard spec are still pending implementation. Cloud sync from the keyboard waits for Firebase CLI/emulator and real-device QA before it should be treated as production-ready.
- Windows desktop target: no IME promise. The equivalent is a Flutter desktop
  overlay surface hosted by Windows-native hotkeys, always-on-top window
  behavior, clipboard, focus, and best-effort text delivery. The first native
  host version is implemented locally, but Windows runner/manual proof is still
  required before making a public parity claim.
- macOS desktop target: no IME promise. The equivalent is a Flutter desktop
  overlay surface hosted by macOS-native window floating behavior, a
  Control+Option+Space quick action, clipboard, focus recovery, and best-effort
  paste delivery. Native macOS runner/manual proof is still required.
- Linux desktop target: no IME promise. The equivalent is a Flutter desktop
  overlay surface with GTK keep-above behavior, clipboard fallback, and a
  documented hotkey scope limitation until a compositor/portal/global-shortcut
  integration is selected. Native Linux runner/manual proof is still required.
- Other platform limits: iOS/macOS declare microphone and speech permission prompts; Linux and web keep local speech unavailable/degraded where the current stack cannot support it today; iOS/web still need explicit parity chantiers for their native/browser/store limits; IME remains Android-only.

## Project Structure (target)

```text
lib/app/                     Flutter app shell
lib/core/                    bootstrap, router, theme, platform capability rules
lib/features/                auth, voice, clipboard, settings, shell
lib/data/                    Backend adapters and provider-neutral repositories
supabase/migrations/         Legacy SQL schema, constraints, RLS policies from prior path
docs/                        migration, API, platform, overlay, verification contracts
```

## Validation

```bash
dart format --set-exit-if-changed .
git diff --check
flutter analyze
flutter test
```

Local Android builds, APK packaging, `flutter run -d android`, and Gradle tasks are intentionally out of scope on this VM. Use GitHub Actions/Blacksmith for Android build proof.

## License Baseline

- Project license position: no app-level or monorepo-root `LICENSE` file is declared by this slice. Do not make redistribution or compliance claims beyond the package sources themselves until Diane lands the repository license decision.
- Dependency inventory baseline: keep `pubspec.lock` committed and regenerate a reviewable dependency snapshot with:

```bash
flutter pub deps --json > /tmp/winglowz_app-pub-deps.json
flutter pub outdated
```

- That baseline is an inventory input, not a legal attestation. A future legal/compliance pass still needs to review package license texts from the resolved package sources before any formal compliance claim.

Before selling or publicly claiming production auth readiness, also run the
Android/Firebase auth 
