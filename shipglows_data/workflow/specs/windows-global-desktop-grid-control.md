---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.1"
project: "CommandGlows"
created: "2026-09-26"
updated: "2026-09-26"
status: active
source_skill: sg-development
scope: "windows-global-desktop-grid-control"
owner: Diane
confidence: high
user_story: "En tant qu'utilisateur Windows de CommandGlows, je veux piloter le pointeur dans toute application du bureau au clavier grâce à une grille récursive visible, afin de viser, cliquer, faire défiler ou glisser sans utiliser la souris."
risk_level: high
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "commandglows_app Windows runner"
  - "commandglows_app Flutter settings"
  - "Windows desktop input"
depends_on:
  - "shipglows_data/technical/commandglows_app/architecture.md"
  - "shipglows_data/workflow/specs/windows-desktop-overlay-hotkeys-parity.md"
supersedes: []
evidence:
  - "Diane 2026-09-17: CommandGlows hosts keyboard control of the entire desktop with a full-screen grid; recursive grid is the priority."
  - "Diane 2026-09-17: hints and a coordinate grid remain candidates, with at most one key to select a coordinate cell."
  - "Diane 2026-09-26: prepare a spec, delegate verification and implementation, and complete the work without micromanagement."
next_step: "Verify authenticated interactive Windows pointer control in another application."
---

# Windows global desktop grid control

## Outcome and boundary

CommandGlows on Windows lets a person place and operate the pointer in **any ordinary desktop application** using the keyboard. The grid is a topmost transparent overlay over the selected monitor, independent of the main Flutter window and of the existing text overlay. It must work when another application has focus. The primary interaction is a recursive 3×3 grid. No website, app-local widget tree, network service, OCR, or installed copy of Neru is required.

Windows is the implementation target for this chantier. The host must leave a portable Flutter-facing capability boundary; macOS and Linux parity are separate work. A secure desktop, locked session, and elevated applications are outside the supported control promise because of Windows integrity boundaries.

## Interaction contract

1. In Windows settings the person enables desktop control. Disabled is the initial state on first launch; the local opt-in persists across app restarts and is restored when the app starts. CommandGlows registers a distinct global shortcut (default Ctrl+Alt+G); a collision produces a visible error and never silently enables the feature. The existing Ctrl+Alt+Space text overlay remains independent.
2. The shortcut starts on the monitor containing the cursor. The overlay covers that monitor, stays visible above ordinary windows, accepts no mouse hits and does not steal keyboard focus. A temporary keyboard hook consumes the assigned keydown **and matching keyup**, including repeat, only for the active session; all other keys are forwarded. The main `RegisterHotKey` stays independent of this hook so a second shortcut invocation can dismiss the session.
3. Nine labelled cells cover the current region. One physical key chooses one cell; the region becomes that cell and the pointer goes to its centre. The next nine cells subdivide it. Resolve physical scan codes against the foreground keyboard layout at activation for displayed labels, including AZERTY; keep selection positions spatially stable. The layout remains fixed for this session and the on-screen guide says so; closing and reopening the grid refreshes it after a language switch. Five 3×3 levels produce cells of at most 8×5 physical pixels on a 1920×1080 screen, modulo integer rounding. Prevent zero-sized cells and clamp pointer coordinates inside monitor bounds.
4. Backspace returns one level, Space resets to the whole monitor, Escape cancels and removes the overlay and keyboard hook. A selection history makes backtracking deterministic. A visible indicator shows the selected region and current pointer centre. Activation while active must dismiss the session.
5. The user can click left, right and middle, press and release left button for drag, wheel up/down, and nudge the pointer by arrow keys. Click actions end the session; drag keeps it active until explicit release or cancellation. Movement while dragging must emit intermediate pointer motion that target applications recognize, rather than only teleporting the cursor. On cancellation, shutdown, display change, or detected hook failure, release any held button. Escape exits while the hook is active; the separately registered global shortcut remains the independent exit if the hook stops receiving keys.
6. Tab switches to a coarse coordinate view on the current monitor. Its cells each have one visible key label and exactly one keypress selects a cell; the selected area becomes the recursive grid region for further precision. There may be no more cells than available single keys. Coarse selection alone is never described as pixel-level precision. Backspace returns to the full coordinate view, while Escape and Space retain their global cancellation/reset semantics.
7. Hints are a **separate follow-up** pending a timed Windows UI Automation probe and a deliberate selection of label, timeout and fallback behaviour. They are recorded here for architecture compatibility, but are not part of this delivery's acceptance or any completion claim. The grid remains usable without UIA and works in canvas/remote surfaces.
8. PageUp/PageDown changes to the previous/next connected monitor from the keyboard, resets the grid to that monitor and moves the pointer to its centre. Re-entering after a click starts on the current pointer monitor. Never divide the entire virtual desktop into one rectangle spanning gaps between displays. Selection and pointer movement use physical coordinates even with negative monitor origins and mixed DPI.

## Native architecture

Add a dedicated Windows desktop-control host owned by the Windows runner. It owns `RegisterHotKey`, one click-through `WS_POPUP`/tool window per active monitor, physical-pixel region geometry, drawing, scoped `WH_KEYBOARD_LL`, and pointer actions. The hook callback must do only filtering and message posting; session decisions and painting run on the normal message loop. An overlay HWND cannot replace the existing main Flutter HWND. Keep the feature behind a separate MethodChannel for enable/status/activate/cancel and actionable error codes. Flutter owns opt-in settings and explanatory copy. No text, captured image or target-window title is logged or sent to a backend.

Use the process's existing PerMonitorV2 manifest; obtain monitor bounds at activation and react to `WM_DISPLAYCHANGE`/DPI changes by cancelling cleanly or recomputing without stale coordinates. Use `SendInput` for click, drag and wheel; check inserted event counts. Do not elevate CommandGlows to bypass UIPI. All native resources, hotkeys, windows, hooks and held buttons must be released on disable and process exit.

Native overlay drawing uses a small named palette of high-contrast semantic colours and sizes in one owner, with translucent region fill and clearly readable key labels. Reuse the project's settings theme for Flutter controls. Respect high contrast and avoid motion as a functional requirement.

## Execution batches

- **Batch A — native host:** new runner-owned host files, runner CMake entry, and only the minimum `flutter_window` integration. Owns global activation, overlay, key capture, geometry and mouse actions. No Flutter UI or governance edits.
- **Batch B — Flutter contract and UI:** new Windows bridge/controller and the Windows settings entry, with focused Dart tests. Do not edit runner files or governance. The native channel contract is frozen below before parallel writes.
- **Integration owner — primary agent:** this spec, documentation, build/run proof, cross-batch corrections and final review. Parallel writes may begin only after this ready spec and disjoint ownership are communicated.

Channel `commandglows_app/desktop_control` methods: `getStatus` returns `{supported, enabled, active, hotkeyRegistered, errorCode}`; `setEnabled({enabled})`, `activate`, `cancel` return the same status. Native errors use stable codes `HOTKEY_UNAVAILABLE`, `HOOK_UNAVAILABLE`, `OVERLAY_UNAVAILABLE`, `INPUT_UNAVAILABLE`; Flutter maps them to clear French recovery text. If hints are delivered in this chantier, add their capability fields without changing the basic contract.

## Acceptance and proof

- Pure geometry tests cover subdivision, backtracking, non-zero cell sizes, negative monitor origins, edges, reset, the one-key coordinate layout and monitor switching. Hook key mapping is checked for QWERTY and AZERTY, including visible labels, physical keys, repeat and paired keyup suppression.
- `flutter analyze` and focused Flutter tests pass. A configured Doppler-backed `flutter run -d windows` compiles and attaches the live Windows app; if a managed session is used, its declared recipe and live registry state are checked first.
- Live Windows proof starts from another app: invoke shortcut, see a monitor-sized transparent grid, choose several cells by single keys, click a visible target, then verify Escape, Backspace, reset, coordinate Tab, successful movement/selection by drag, reliable drag release, scrolling and disable. Verify PageUp/PageDown on two monitors when available and mixed DPI if the display arrangement supports it. Capture the observable result without sensitive desktop content.
- Failure proof includes shortcut collision, app exit during an active session, display change and input-injection refusal. A failed global pointer action shows a visible message in the native overlay while the session remains available for retry or cancellation. Windows does not reliably identify UIPI as the cause of a `SendInput` refusal, so error copy says input could not be sent without inventing a cause. Distinguish static/build proof from live desktop and external-app proof; an unexecuted manual scenario remains open rather than being labelled successful.

## Sources informing the design

- Neru modes and Windows capability: https://github.com/y3owk1n/neru/blob/main/README.md and https://github.com/y3owk1n/neru/blob/main/docs/CROSS_PLATFORM.md
- Neru recursive behaviour: https://github.com/y3owk1n/neru/blob/main/docs/CONFIGURATION.md
- Mousemaster Windows interaction and keyboard layouts: https://github.com/petoncle/mousemaster/blob/main/README.md and https://github.com/petoncle/mousemaster/blob/main/docs/configuration-reference.md
- Microsoft: https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-registerhotkey , https://learn.microsoft.com/en-us/windows/win32/winmsg/lowlevelkeyboardproc , https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-sendinput

## Skill Run History

- 2026-09-26: sg-development — research and repository inspection; ready implementation contract recorded. Implementation and live proof pending.
- 2026-09-26: GPT-6 Luna native and Flutter batches — Windows host, persisted local opt-in, settings and focused tests implemented. C++17 geometry/keymap harness, seven Flutter tests and Flutter analyzer passed through Doppler; managed Windows runner recompiled and launched. Independent static review found and prompted hook teardown, button-release, drag-motion and fine-grid readability fixes. Live external-app proof awaits an authenticated CommandGlows Dev session.

## Current Chantier Flow

- Native and Flutter batches integrated; static/build checks pass. Authenticated Windows interaction proof and any resulting correction remain open. Hints stay a separate research candidate.
