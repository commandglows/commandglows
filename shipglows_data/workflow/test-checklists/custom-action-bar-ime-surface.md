---
artifact: test_checklist
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-06-12"
updated: "2026-06-12"
status: "draft"
source_skill: "103-sf-verify"
scope: "custom-action-bar-ime-surface"
owner: "Diane"
confidence: "high"
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "winglowz_app"
  - "Android IME"
  - "Custom action buttons"
  - "Keyboard settings"
depends_on:
  - artifact: "shipglows_data/workflow/specs/custom-action-bar-ime-surface.md"
    artifact_version: "1.0.0"
    required_status: "active"
supersedes: []
evidence:
  - "Local Flutter proof passed on 2026-06-12: flutter analyze + full flutter test."
  - "Android native runtime proof is still pending Blacksmith CI and Diane physical-device QA."
next_step: "/005-sf-ship winglowz_app for Blacksmith Android proof, then /405-sf-prod for build/artifact discovery"
---

# Custom Action Bar IME Checklist

| Scenario ID | Surface | Scenario | Required | Expected | Status | Observed | Evidence pointer | Notes | Bug Link |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CAB-IME-001 | Flutter app | Actions page creates and manages buttons outside Snippets. | yes | Buttons are created from `Actions`, and `Snippets > Boutons` no longer acts as the primary management surface. | PASS | Local widget proof and route changes confirm dedicated Actions flow plus Snippets redirect. | `test/custom_action_buttons_screen_test.dart`, `test/app_router_auth_guard_test.dart`, `lib/features/snippets/presentation/snippets_screen.dart` | Shared Flutter surface proved locally. | |
| CAB-IME-002 | Flutter app + bridge | App-side enable/disable sync updates the same IME custom action bar preference. | yes | Enabling/disabling from the app produces typed native sync payloads and status parsing. | PASS | Bridge serialization and status parsing passed locally. | `test/android_keyboard_bridge_sync_profile_test.dart`, `test/widget_test.dart` | Proves the local Flutter/MethodChannel side, not IME rendering. | |
| CAB-IME-003 | Settings > Keyboard | Keyboard preferences expose the same bar toggle. | yes | Settings screen exposes the same enable/disable control for the custom action bar. | NOT_RUN | No dedicated settings-screen assertion or manual proof captured yet. | `lib/features/settings/presentation/settings_screen_sections.dart` | Needs widget or manual proof of the visible Settings toggle. | |
| CAB-IME-004 | Android IME runtime | Compatible text/expression/clipboard/media actions execute via typed native callbacks. | yes | Native IME dispatches supported actions correctly and safely. | NOT_RUN | Kotlin path implemented, but no Blacksmith compile/test evidence or device execution proof captured. | `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt` | Requires CI-native proof, then Diane device QA. | |
| CAB-IME-005 | Flutter app | Desktop-only key sequence such as `Ctrl+W, N` is marked incompatible for Android IME. | yes | Incompatible desktop action stays visible in app with explicit compatibility limit and is not projected to IME. | PASS | Local model/widget tests prove IME incompatibility messaging. | `test/custom_action_button_store_test.dart`, `test/custom_action_buttons_screen_test.dart` | Local proof is sufficient for the app-side compatibility contract. | |
| CAB-IME-006 | Android IME runtime | Private/password/OTP/no-personalized-learning fields suppress sensitive actions. | yes | Sensitive actions are hidden or blocked in protected fields without leaking content. | NOT_RUN | Native filtering code exists, but no CI/device proof captured for real protected-field behavior. | `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt` | Device proof required. | |
| CAB-IME-007 | Android IME runtime | Overflowing custom buttons scroll horizontally without accidental dispatch. | yes | Single custom row scrolls safely and remains stable under touch. | NOT_RUN | Paging/row wiring implemented, but no CI/device proof captured. | `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/actions/KeyboardActionBarController.kt` | Device proof required. | |
| CAB-IME-008 | Android IME runtime | Corrupt or oversized native config falls back safely. | yes | Invalid config is rejected or ignored without crashing primary typing. | NOT_RUN | Native sanitization exists, but no Kotlin CI test evidence was captured in this repository run. | `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt` | Blacksmith/Kotlin proof required. | |
| CAB-IME-009 | Runtime diagnostics | Diagnostics copy includes build identity and Paris/UTC timestamps while redacting private payloads. | yes | Copied diagnostics stay redacted and include build header after feature exercise or failure. | BLOCKED | Generic diagnostic surface exists with build header, but no feature-specific copied diagnostic proof after IME custom-action exercise was captured. | `lib/features/settings/presentation/settings_screen.dart`, `lib/core/bootstrap/app_build_info.dart` | Needs Android/runtime reproduction proof through CI/device workflow. | |

## Remaining Proof Route

- First route: `/005-sf-ship winglowz_app for Blacksmith Android proof`
- Then: `/405-sf-prod` to identify the exact Android CI run/artifact and collect provider proof
- Then: `/107-sf-test` with Diane device QA for CAB-IME-004, `006`, `007`, and `009`
