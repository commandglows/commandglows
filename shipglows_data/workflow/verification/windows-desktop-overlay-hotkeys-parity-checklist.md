---
artifact: manual_test_checklist
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-30"
updated: "2026-05-30"
status: "active"
source_skill: sf-test
scope: "windows-desktop-overlay-hotkeys-parity"
target_scope: "windows-desktop-overlay-hotkeys-parity"
proof_profile: "manual_windows_native_qa"
stack_profile: "flutter_windows_desktop"
owner: "Diane"
confidence: "medium"
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "winglowz_app"
  - "Windows runner"
  - "WindowsOverlayBridge"
  - "Global hotkeys"
  - "Clipboard"
  - "Text delivery"
depends_on:
  - "shipglows_data/workflow/specs/windows-desktop-overlay-hotkeys-parity.md@1.0.0"
supersedes: []
evidence:
  - "First Windows overlay host slice implemented locally on 2026-05-30."
next_step: "/sf-test --local shipglows_data/workflow/verification/windows-desktop-overlay-hotkeys-parity-checklist.md"
---

# Windows Desktop Overlay And Hotkeys Parity Checklist

Environment: Windows desktop machine or Windows CI/runner with interactive
desktop session.

Build under test: latest pushed commit containing `winglowz_app/windows/runner`
and `lib/core/platform/windows_overlay_bridge.dart`.

Status values: `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, `N/A`.

| ID | Required | Scenario | Steps | Expected Result | Status | Observed | Evidence pointer | Bug Link |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| WIN-OVERLAY-001 | yes | Windows build | From repo root, run `cd winglowz_app` then `flutter build windows`. | Build completes without C++/Flutter errors. | NOT_RUN | Not run yet. | none | none |
| WIN-OVERLAY-002 | yes | Desktop launch | Launch the built Windows app normally. | App opens, no startup crash, primary window appears. | NOT_RUN | Not run yet. | none | none |
| WIN-OVERLAY-003 | yes | Hotkey registration | In a normal user session, enable Windows overlay if exposed by UI or call the bridge path, then press `Ctrl+Alt+Space`. | Hotkey registers without collision and triggers WinGlows overlay behavior. | NOT_RUN | Not run yet. | none | none |
| WIN-OVERLAY-004 | yes | Hotkey collision recovery | Reserve `Ctrl+Alt+Space` in another app if practical, then retry registration. | WinGlows reports a recoverable hotkey registration failure instead of crashing. | NOT_RUN | Not run yet. | none | none |
| WIN-OVERLAY-005 | yes | Always-on-top overlay | With Notepad focused, press the hotkey. | WinGlows window is shown above Notepad and remains usable. | NOT_RUN | Not run yet. | none | none |
| WIN-OVERLAY-006 | yes | Clipboard fallback | Trigger delivery of a short text result. | Text is copied to the Windows clipboard even if paste delivery fails. | NOT_RUN | Not run yet. | none | none |
| WIN-OVERLAY-007 | yes | Best-effort paste delivery | Focus Notepad, trigger overlay, deliver `Bonjour Windows`. | Result is pasted into Notepad or clipboard fallback is clearly available. | NOT_RUN | Not run yet. | none | none |
| WIN-OVERLAY-008 | yes | Browser field delivery | Focus a browser text field, trigger overlay, deliver test text. | Result is pasted into the field or clipboard fallback is clearly available. | NOT_RUN | Not run yet. | none | none |
| WIN-OVERLAY-009 | yes | Focus recovery failure | Test an elevated/admin app or a target that rejects focus/paste. | WinGlows does not loop or lose the result; clipboard fallback remains recoverable. | NOT_RUN | Not run yet. | none | none |
| WIN-OVERLAY-010 | yes | Multi-monitor and DPI | Move the app between monitors or scaling modes, then trigger overlay. | Overlay remains visible and reasonably positioned; no DPI sizing crash. | NOT_RUN | Not run yet. | none | none |
| WIN-OVERLAY-011 | yes | Event queue | Press hotkey twice, then drain Windows overlay events if a debug path is available. | Events report trigger `hotkey` with valid timestamps and no private text. | NOT_RUN | Not run yet. | none | none |
| WIN-OVERLAY-012 | yes | Sensitive data logging check | Deliver text containing private sample content, then inspect app-visible diagnostics/log output. | Logs and diagnostics do not contain the delivered raw text or clipboard content. | NOT_RUN | Not run yet. | none | none |

## Result Reporting

When Diane runs the campaign, report:

- Overall status: `PASS`, `FAIL`, or `BLOCKED`.
- Windows version and architecture.
- Flutter command/build source used.
- For each failed row: ID, expected result, observed result, visible error.
- Evidence pointers: screenshot path, copied error text, or CI job URL if any.
- Whether any raw private text appeared in logs or diagnostics.
