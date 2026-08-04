## 2026-05-16 - Keyboard Theme Studio (preview web import JSON)

- Scope: feature keyboard-theme-studio
- Environment: local
- Tester: user
- Source: sf-test
- Status: fail
- Confidence: high
- Result summary: Steps 2, 3, 4 pass; step 5 fails because JSON import does not work on web preview flow.
- Bug pointer: BUG-2026-05-16-001 -> bugs/BUG-2026-05-16-001.md
- Evidence pointer: user report in session ("2 oui, 3 oui, 4 oui, 5 non l'import marche en rien")
- Follow-up: /sf-fix BUG-2026-05-16-001

## 2026-05-17 - Keyboard voice dictation history

- Scope: feature keyboard-action-bar-voice-recording
- Environment: android-physical-device
- Tester: user
- Source: sf-test
- Status: fail
- Confidence: high
- Result summary: Enter finalization now ends with `no speech detected`, inserts no text, and does not add the dictation to Voice history; Clipboard exclusion passed.
- Bug pointer: BUG-2026-05-17-001 -> bugs/BUG-2026-05-17-001.md
- Evidence pointer: user report in session ("4 le texte nest plus entrer dans le champs... 'no speech detected'; 7 fail; 8 pass")
- Follow-up: /sf-fix BUG-2026-05-17-001

## 2026-05-17 - App keyboard test page removal

- Scope: feature app-shell-keyboard-preview-removal
- Environment: local
- Tester: user
- Source: sf-test
- Status: pass
- Confidence: high
- Result summary: Keyboard preview tab/page is gone; remaining navigation and Settings keyboard section were confirmed working.
- Bug pointer: none
- Evidence pointer: user report in session ("1 pass", "5 pass", then "pass")
- Follow-up: /sf-verify app-shell-keyboard-preview-removal

## 2026-05-17 - Keyboard action bars and preview badges

- Scope: feature keyboard-action-bars-preview-badges
- Environment: android-physical-device + local settings preview
- Tester: user
- Source: sf-test
- Status: fail
- Confidence: high
- Result summary: Real keyboard action-row width/Media scroll and theme badges passed; settings preview still has a bottom empty row, starts at QWERTY without action bar, and Theme Studio pin badge is only a generic dot.
- Bug pointer: BUG-2026-05-17-002 -> bugs/BUG-2026-05-17-002.md
- Evidence pointer: user report in session ("2 pass", "3 pass", "barre vide en bas... toujours presente", "je ne vois pas de barre d'action dans la preview", "sur le vrai clavier, oui, tout est fonctionnel")
- Follow-up: /sf-fix BUG-2026-05-17-002

## 2026-05-26 - AZERTY S/Z directional gesture shortcuts

- Scope: spec keyboard-directional-gesture-shortcuts
- Environment: android-physical-device
- Tester: user
- Source: sf-test
- Status: pass
- Confidence: high
- Result summary: User confirmed all requested S/Z directional swipe checks passed on device.
- Bug pointer: none
- Evidence pointer: user report in session ("all PASS")
- Follow-up: /sf-verify keyboard-directional-gesture-shortcuts --android-ci-device-proof

## 2026-05-30 - Windows desktop overlay and hotkeys parity

- Scope: spec windows-desktop-overlay-hotkeys-parity
- Environment: windows-desktop
- Tester: user
- Source: sf-test
- Status: not run
- Confidence: medium
- Result summary: Manual Windows checklist prepared for build, launch, hotkey, topmost overlay, clipboard fallback, paste delivery, focus recovery, multi-monitor/DPI, event queue, and diagnostic redaction.
- Bug pointer: none
- Evidence pointer: shipglows_data/workflow/verification/windows-desktop-overlay-hotkeys-parity-checklist.md
- Follow-up: /sf-test --local shipglows_data/workflow/verification/windows-desktop-overlay-hotkeys-parity-checklist.md

## 2026-05-31 - macOS and Linux desktop overlay and hotkeys parity

- Scope: spec macos-linux-desktop-overlay-hotkeys-parity
- Environment: macos-desktop + linux-desktop
- Tester: user
- Source: sf-test
- Status: not run
- Confidence: medium
- Result summary: Manual macOS/Linux checklist prepared for native launch, quick action/hotkey behavior, floating/keep-above overlay, clipboard fallback, best-effort paste delivery where available, permissions, Wayland/X11, multi-monitor/DPI, and diagnostic redaction.
- Bug pointer: none
- Evidence pointer: shipglows_data/workflow/verification/macos-linux-desktop-overlay-hotkeys-parity-checklist.md
- Follow-up: /sf-test --local shipglows_data/workflow/verification/macos-linux-desktop-overlay-hotkeys-parity-checklist.md
