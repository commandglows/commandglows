---
artifact: verification_checklist
metadata_schema_version: "1.0"
artifact_version: "0.1.0"
project: "CommandGlows"
created: "2026-08-07"
updated: "2026-08-07"
status: draft
source_skill: 107-sg-test
scope: "chrome-extension-platform-parity-and-windows-coexistence"
owner: "Diane"
confidence: medium
risk_level: high
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "ext"
  - "commandglows_app/windows"
depends_on:
  - artifact: "shipglows_data/workflow/specs/chrome-extension-platform-parity-and-windows-coexistence.md"
    artifact_version: "1.0.0"
    required_status: reviewed
supersedes: []
evidence:
  - "Standalone extension automated checks passed on 2026-08-07."
next_step: "Run unpacked Chrome QA in local-only mode, then dual-install Windows QA after native handoff implementation."
---

# Chrome Extension Parity And Windows Coexistence Checklist

## Automated baseline

- [x] Manifest V3 and required source files validated.
- [x] No permanent host permissions declared.
- [x] Ownership, single-registrar and sensitive-field tests pass.
- [x] Snippet, deterministic transform and sync-envelope tests pass.
- [x] Dictionary and bounded insertion-history tests pass.
- [x] Custom-action and validated backup/restore tests pass.

## Extension-only Chrome QA

- [ ] Load `ext/` unpacked without manifest errors.
- [ ] Focus a normal text input and press the preferred shortcut.
- [ ] Insert text exactly once and retain focus in the original field.
- [ ] Repeat in a textarea and a contenteditable field.
- [ ] Confirm password and OTP fields do not open sensitive actions.
- [ ] Confirm `chrome://extensions` and Chrome Web Store fail recoverably.
- [ ] Confirm popup and context-menu entry points use the same request flow.
- [ ] Create and delete a local snippet from the popup, then insert it once.
- [ ] Clean spacing and apply sentence case without losing the source before insertion.
- [ ] Start dictation, deny or interrupt it, and confirm existing text remains.
- [ ] Confirm Settings copy says account sync is not connected rather than implying Chrome-local parity.
- [ ] Confirm the extension works without login and keeps snippets after browser restart.
- [ ] Apply a personal dictionary replacement and verify whole-term matching.
- [ ] Insert text and confirm one bounded local history item is recorded.
- [ ] Create an insert-text custom action and run it from the active-field palette.
- [ ] Confirm unsupported desktop/media action kinds cannot be imported.
- [ ] Export local data, clear/reload the extension, restore it, and confirm all supported records return.

## Dual-install Windows QA

- [ ] Confirm Windows is the only global shortcut registrar.
- [ ] In Chrome with the extension ready, confirm Windows delegates one request.
- [ ] Confirm the extension acknowledges ownership before processing.
- [ ] Confirm one trigger causes at most one processing request and insertion.
- [ ] Outside Chrome, confirm Windows handles the same preferred shortcut.
- [ ] On extension rejection or timeout, confirm Windows fallback is explicit and bounded.
- [ ] With the extension disabled, confirm Windows remains functional.

## Status

Automated extension logic and manifest checks pass. A bundled headless Chromium
session was attempted on 2026-08-07, but it did not expose the unpacked
extension target, so it is not accepted as Chrome interaction proof. Normal
Chrome unpacked testing remains required. Windows scenarios are not run in
this environment.
