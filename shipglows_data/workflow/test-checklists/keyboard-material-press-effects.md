---
artifact: test_checklist
metadata_schema_version: "1.0"
artifact_version: "0.1.0"
project: "WinGlows"
created: "2026-06-11"
updated: "2026-06-11"
status: draft
source_skill: sf-start
scope: "winglowz_app/android-ime"
owner: "Diane"
confidence: medium
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - "winglowz_app"
  - "Android InputMethodService"
  - "Flutter Keyboard Theme Studio"
depends_on:
  - "shipglows_data/workflow/specs/keyboard-material-press-effects.md"
  - "winglowz_app/docs/technical/android-native.md"
supersedes: []
evidence:
  - "Manual checklist created for materialized press effects and relief mode."
next_step: "/103-sf-verify shipglows_data/workflow/specs/keyboard-material-press-effects.md"
---

# Keyboard Material Press Effects QA

## Scope

Validate that IME key press effects behave as part of the physical key surface in flat and relief modes. Effects must not float above the key, drift independently from shake/scale/tilt, or leak private typed content through diagnostics.

## Local Automated Checks

- KMP-001: Run `flutter analyze` from `winglowz_app`.
- KMP-002: Run `flutter test test/keyboard_theme_studio_screen_test.dart`.
- KMP-003: Run `flutter test test/keyboard_theme_validation_test.dart` when theme serialization or validation changes.

## Flutter Web / Studio Checks

- KMP-004: Open the Keyboard Theme Studio preview and enable relief with a visible depth.
- KMP-005: Press preview keys with `scale`, `pulse`, `shake`, `glow`, `electricArc`, `specularSweep`, `inkPress`, `keycapTilt`, `edgeCompression`, `ripple`, `confettiLite`, and `fireworksLite`.
- KMP-006: Verify the whole key body moves together for scale, shake, and keycap tilt: surface, relief faces, border, label, and pinned badge.
- KMP-007: Verify glow, ripple, electric arc, specular sweep, confetti, and fireworks are clipped or anchored to the key surface rather than rendered as detached overlays.
- KMP-008: Recheck high border radius and relief depth combinations for corner gaps.

## Android Device Checks

- KMP-009: On a physical Android device, enable WinGlows IME, select a custom theme, enable relief, and repeat KMP-005 through KMP-008 in at least one normal text field.
- KMP-010: In a password or other private field, verify custom image/gradient/effect surfaces are suppressed and typing still works.
- KMP-011: Press keys quickly across multiple rows and verify effects remain attached to their own keys, with no delayed floating particles crossing unrelated keys.
- KMP-012: Verify the top relief face is hidden or minimized when pressed, and the complete key body sinks as one object.
- KMP-013: Copy diagnostics after the test and verify only allowlisted theme/effect status appears. Typed text, clipboard text, snippets, dictation content, tokens, prompts, emails, and provider payloads must not appear.

## CI / Release Checks

- KMP-014: Route Android native compile/package proof through GitHub Actions/Blacksmith, not the shared Codex VM.
- KMP-015: Attach Diane physical-device QA notes before treating the native IME behavior as release-ready.
