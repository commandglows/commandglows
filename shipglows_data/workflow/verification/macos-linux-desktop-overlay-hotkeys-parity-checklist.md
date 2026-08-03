---
artifact: manual_test_checklist
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-31"
updated: "2026-05-31"
status: active
source_skill: sf-test
scope: "macos-linux-desktop-overlay-hotkeys-parity"
owner: "Diane"
confidence: medium
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
target_scope: "macos-linux-desktop-overlay-hotkeys-parity"
proof_profile: "manual_desktop_native_qa"
stack_profile: "flutter_macos_linux_desktop"
linked_systems:
  - "winglowz_app"
  - "macOS runner"
  - "Linux runner"
  - "Desktop overlay bridge"
depends_on:
  - artifact: "shipglows_data/workflow/specs/macos-linux-desktop-overlay-hotkeys-parity.md"
    artifact_version: "1.0.0"
    required_status: "active"
supersedes: []
evidence: []
next_step: "/sf-test --local shipglows_data/workflow/verification/macos-linux-desktop-overlay-hotkeys-parity-checklist.md"
---

# macOS And Linux Desktop Overlay/Hotkeys Manual QA

Status terms: `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, `N/A`.

| ID | Platform | Required | Scenario | Steps | Expected | Status | Observed | Evidence pointer | Bug Link |
|---|---|---:|---|---|---|---|---|---|---|
| MAC-01 | macOS | yes | Build and launch | Build/run the Flutter macOS app on a macOS machine. | App launches without native crash; no IME promise is shown. | NOT_RUN |  |  |  |
| MAC-02 | macOS | yes | Quick action monitor | Enable desktop overlay, focus another app, press Control+Option+Space. | WinGlows overlay appears as floating window or a permission limitation is explicit and recoverable. | NOT_RUN |  |  |  |
| MAC-03 | macOS | yes | Floating behavior | Trigger overlay above normal window, fullscreen/Space, and second monitor when available. | Overlay is visible or limitation is explicit; app does not lose text. | NOT_RUN |  |  |  |
| MAC-04 | macOS | yes | Clipboard fallback | Deliver generated text to a target app with paste delivery disabled/blocked. | Text is copied to clipboard and remains visible/recoverable. | NOT_RUN |  |  |  |
| MAC-05 | macOS | yes | Best-effort delivery | Focus TextEdit/Notes/browser field, trigger overlay, deliver text. | Clipboard is copied and Command+V delivery succeeds when macOS permits it. | NOT_RUN |  |  |  |
| MAC-06 | macOS | yes | Permission/security prompt | Run on a clean macOS user profile if possible. | Any accessibility/input monitoring requirement is clear; no raw text is logged. | NOT_RUN |  |  |  |
| LNX-01 | Linux | yes | Build and launch | Build/run the Flutter Linux app on a Linux machine. | App launches without native crash; no IME promise is shown. | NOT_RUN |  |  |  |
| LNX-02 | Linux | yes | Overlay show/hide | Enable desktop overlay and show/hide from app controls or bridge harness. | GTK window becomes keep-above when shown and hides without losing app state. | NOT_RUN |  |  |  |
| LNX-03 | Linux | yes | Accelerator scope | Press Ctrl+Alt+Space with WinGlows focused and with another app focused. | Scoped behavior is honest: app-focused accelerator may work; global behavior is not falsely claimed. | NOT_RUN |  |  |  |
| LNX-04 | Linux | yes | Clipboard fallback | Deliver generated text to a target app. | Text is copied to clipboard; paste can be performed manually. | NOT_RUN |  |  |  |
| LNX-05 | Linux | yes | Wayland/X11 behavior | Test on available session type and record Wayland or X11. | No crash; limitations are explicit; clipboard fallback works. | NOT_RUN |  |  |  |
| LNX-06 | Linux | no | Multi-monitor/DPI | Test with external monitor or fractional scaling when available. | Overlay remains usable; text and controls do not overlap. | NOT_RUN |  |  |  |
