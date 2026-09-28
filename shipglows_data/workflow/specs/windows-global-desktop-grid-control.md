---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.4.1"
project: "CommandGlows"
created: "2026-09-26"
updated: "2026-09-28"
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
  - "Diane 2026-09-27: on an ultra-wide display, add an active-window grid scope, a setting, and an immediate return to the full-screen grid."
  - "Diane 2026-09-27: physical browser testing succeeds; prefer Space for left click and formalize customizable keys for the main desktop-control actions before choosing further grid options."
  - "Diane 2026-09-27: implement the configurable Windows desktop-control keys."
  - "Diane 2026-09-27: pressing 1 instead of F3 leaves the old label; reserved keys and failed assignments need immediate, visible feedback."
next_step: "Confirm Shift+1 and reserved-key feedback with a physical AZERTY keyboard in the running Windows app; keep grid layout choices separate."
---

# Windows global desktop grid control

## Outcome and boundary

CommandGlows on Windows lets a person place and operate the pointer in **any ordinary desktop application** using the keyboard. The grid is a topmost transparent overlay over the selected monitor, independent of the main Flutter window and of the existing text overlay. It must work when another application has focus. The primary interaction is a recursive 3×3 grid. No website, app-local widget tree, network service, OCR, or installed copy of Neru is required.

Windows is the implementation target for this chantier. The host must leave a portable Flutter-facing capability boundary; macOS and Linux parity are separate work. A secure desktop, locked session, and elevated applications are outside the supported control promise because of Windows integrity boundaries.

## Interaction contract

1. In Windows settings the person enables desktop control. Disabled is the initial state on first launch; the local opt-in persists across app restarts and is restored when the app starts. CommandGlows registers a distinct global shortcut (default Ctrl+Alt+G); a collision produces a visible error and never silently enables the feature. The existing Ctrl+Alt+Space text overlay remains independent.
2. The locally persisted scope preference is **screen** by default for existing users, with **active window** selectable in Windows settings. Screen scope starts on the monitor containing the cursor. Window scope snapshots the visible foreground-window bounds at activation, chooses the monitor with the largest visible intersection, and clips the grid to that intersection. The overlay still covers only that monitor, stays visible above ordinary windows, accepts no mouse hits and does not steal keyboard focus. Missing, minimized, cloaked, desktop, or non-intersecting target windows fall back to the monitor grid. A temporary keyboard hook consumes the assigned keydown **and matching keyup**, including repeat, only for the active session; all other keys are forwarded. The main `RegisterHotKey` stays independent of this hook so a second shortcut invocation can dismiss the session.
3. Nine labelled cells cover the current region. One physical key chooses one cell; the region becomes that cell and the pointer goes to its centre. The next nine cells subdivide it. Resolve physical scan codes against the foreground keyboard layout at activation for displayed labels, including AZERTY; keep selection positions spatially stable. The layout remains fixed for this session and the on-screen guide says so; closing and reopening the grid refreshes it after a language switch. Five 3×3 levels produce cells of at most 8×5 physical pixels on a 1920×1080 screen, modulo integer rounding. Prevent zero-sized cells and clamp pointer coordinates inside monitor bounds.
4. Backspace returns one level, F9 resets to the current scope, Escape cancels and removes the overlay and keyboard hook. F8 switches between the captured active window and the full monitor in one keypress, resetting the refinement history. The requested session scope remains selected while changing monitors; a monitor without a window intersection uses the monitor region until returning to a monitor containing the window. The captured window rectangle is fixed for the session; close and reopen after moving or resizing the window. A selection history makes backtracking deterministic. A visible indicator shows the selected region and current pointer centre. Activation while active must dismiss the session.
5. The user can click left, right and middle, press and release left button for drag, wheel up/down, and nudge the pointer by arrow keys. Click actions end the session; drag keeps it active until explicit release or cancellation. Movement while dragging must emit intermediate pointer motion that target applications recognize, rather than only teleporting the cursor. On cancellation, shutdown, display change, or detected hook failure, release any held button. Escape exits while the hook is active; the separately registered global shortcut remains the independent exit if the hook stops receiving keys.
6. Tab switches to a coarse coordinate view in the current scope. Its cells each have one visible key label and exactly one keypress selects a cell; the selected area becomes the recursive grid region for further precision. There may be no more cells than available single keys. Coarse selection alone is never described as pixel-level precision. Backspace returns to the full coordinate view, while Escape and F9 retain their cancellation/reset semantics. Space remains left click in both views.
7. Hints are a **separate follow-up** pending a timed Windows UI Automation probe and a deliberate selection of label, timeout and fallback behaviour. They are recorded here for architecture compatibility, but are not part of this delivery's acceptance or any completion claim. The grid remains usable without UIA and works in canvas/remote surfaces.
8. PageUp/PageDown changes to the previous/next connected monitor from the keyboard, resets the grid to that monitor and moves the pointer to its centre. Re-entering after a click starts on the current pointer monitor. Never divide the entire virtual desktop into one rectangle spanning gaps between displays. Selection and pointer movement use physical coordinates even with negative monitor origins and mixed DPI.

## Configurable command keys

The current settings route **Mon espace → Contrôle du bureau** already owns the Windows opt-in and grid scope. It is the home for a new **Touches et raccourcis** editor. The existing **Raccourcis de gestes** editor belongs to the Android IME: its per-key swipe slots, presets and native Kotlin persistence do not control Windows desktop input. Reuse its visible draft/validation/reset interaction pattern where helpful, not its data model or storage. The Windows text overlay's `Ctrl+Alt+Space` shortcut is a separate host and must remain distinct.

The default in-session action map is: Space and legacy F1 = left click; F2 = right click; F3 = middle click; F4 = hold left button; F5 = release; F6/F7 = wheel up/down; Backspace = previous region; F9 = reset to the chosen scope; Tab = coordinate view; F8 = window/screen scope; PageUp/PageDown = previous/next monitor; arrows = pointer nudge; Escape = close. The global activation shortcut defaults to Ctrl+Alt+G. This slice provides editable fields for these commands and retains the separate grid-cell letters and geometry.

- **Product surface:** group bindings by Activation, Pointer actions, Navigation and Scope in the existing desktop-control settings page. Show the effective key beside each action, capture a replacement by pressing it (including modifiers for the global shortcut), show conflicts before saving, and offer per-action and all-defaults restoration. The overlay guide must render the effective map, rather than fixed F-key prose. A Windows-only profile must persist locally and restore at startup; account sync is not implied.
- **Command overview:** the “Autres commandes” section uses responsive action cards and individual key pills derived from the effective binding map, including aliases. Clicking a pill expands the editor, scrolls to the corresponding action and starts replacement capture for that specific binding. Successful replacement immediately updates both the editor and the overview; failed capture retains the previous binding. Narrow windows wrap editor controls without clipping.
- **Native authority:** use stable action identifiers and physical scan code, extended-key state and Ctrl/Alt/Shift modifier state for in-session bindings. This allows an AZERTY top-row `1` (Shift plus its physical key) to be assigned and invoked consistently. Version 2 of the local map migrates version 1 entries with zero modifiers without losing preferences. Keep displayed labels derived from the foreground keyboard layout at activation. The global shortcut uses a separate modifiers + virtual-key representation suitable for `RegisterHotKey`. Flutter sends one versioned candidate map to the native host; native validation is authoritative and activation uses one immutable snapshot. Apply changes only between sessions. Do not partially replace a registered global shortcut: register the candidate, swap, then release the old one; on collision keep the old working shortcut and show a clear error.
- **Validation:** one physical key/chord may trigger at most one action. The deliberate Space/F1 left-click aliases are the migration default and may be removed individually. Reject an unmodified binding that overlaps a 3×3/5×5 cell-selection key, any action chord with Win, a reserved Windows/global chord, or the separately registered text-overlay shortcut. Modifier keys alone, inaccessible scan codes and duplicate physical-plus-modifier assignments are invalid. Keep Escape as a non-removable emergency close fallback even if a different close key is chosen; the global activation shortcut must also dismiss an active grid. Show the exact rejection beside the binding being edited and preserve its previous label/value. The hook consumes both down and up for mapped keys and still forwards unrelated typing. On invalid saved data, recover to documented defaults with a visible explanation.
- **Proof:** focused Dart/native tests cover persistence, migration from existing preferences, AZERTY/QWERTY labels, duplicate and reserved-key rejection, atomic global-hotkey rollback, alias removal, paired keyup, repeat, activation/escape while active, and updated overlay hints. A managed Doppler-backed Windows run plus physical-key checks in an ordinary browser and a desktop app prove the customized map; simulated input alone cannot close that proof.

Grid shape, cell-selection letters, drawing density and other grid options are a separate product decision after command-key customization.

## Native architecture

Add a dedicated Windows desktop-control host owned by the Windows runner. It owns `RegisterHotKey`, one click-through `WS_POPUP`/tool window per active monitor, physical-pixel region geometry, drawing, scoped `WH_KEYBOARD_LL`, and pointer actions. The hook callback must do only filtering and message posting; session decisions and painting run on the normal message loop. An overlay HWND cannot replace the existing main Flutter HWND. Keep the feature behind a separate MethodChannel for enable/status/activate/cancel and actionable error codes. Flutter owns opt-in settings and explanatory copy. No text, captured image or target-window title is logged or sent to a backend.

Use the process's existing PerMonitorV2 manifest; obtain monitor bounds at activation and react to `WM_DISPLAYCHANGE`/DPI changes by cancelling cleanly or recomputing without stale coordinates. Use `SendInput` for click, drag and wheel; check inserted event counts. Do not elevate CommandGlows to bypass UIPI. All native resources, hotkeys, windows, hooks and held buttons must be released on disable and process exit.

Native overlay drawing uses a small named palette of high-contrast semantic colours and sizes in one owner, with a transparent region interior and clearly readable key labels. Reuse the project's settings theme for Flutter controls. Respect high contrast and avoid motion as a functional requirement.

## Execution batches

- **Batch A — native host:** new runner-owned host files, runner CMake entry, and only the minimum `flutter_window` integration. Owns global activation, overlay, key capture, geometry and mouse actions. No Flutter UI or governance edits.
- **Batch B — Flutter contract and UI:** new Windows bridge/controller and the Windows settings entry, with focused Dart tests. Do not edit runner files or governance. The native channel contract is frozen below before parallel writes.
- **Integration owner — primary agent:** this spec, documentation, build/run proof, cross-batch corrections and final review. Parallel writes may begin only after this ready spec and disjoint ownership are communicated.

Channel `commandglows_app/desktop_control` methods: `getStatus` returns `{supported, enabled, active, hotkeyRegistered, preferredScope, activeScope, errorCode}`; `setEnabled({enabled})`, `setPreferredScope({scope: monitor|window})`, `activate`, `cancel` return the same status. Native errors use stable codes `HOTKEY_UNAVAILABLE`, `HOOK_UNAVAILABLE`, `OVERLAY_UNAVAILABLE`, `INPUT_UNAVAILABLE`; Flutter maps them to clear French recovery text. If hints are delivered in this chantier, add their capability fields without changing the basic contract.

## Acceptance and proof

- Pure geometry tests cover subdivision, backtracking, non-zero cell sizes, negative monitor origins, edges, reset, the one-key coordinate layout and monitor switching. Hook key mapping is checked for QWERTY and AZERTY, including visible labels, physical keys, repeat and paired keyup suppression.
- `flutter analyze` and focused Flutter tests pass. A configured Doppler-backed `flutter run -d windows` compiles and attaches the live Windows app; if a managed session is used, its declared recipe and live registry state are checked first.
- Live Windows proof starts from another app: invoke shortcut, see a monitor-sized transparent grid, choose several cells by single keys, click a visible target, then verify Escape, Backspace, reset, coordinate Tab, successful movement/selection by drag, reliable drag release, scrolling and disable. Verify PageUp/PageDown on two monitors when available and mixed DPI if the display arrangement supports it. Capture the observable result without sensitive desktop content.
- Failure proof includes shortcut collision, app exit during an active session, display change and input-injection refusal. A failed global pointer action shows a visible message in the native overlay while the session remains available for retry or cancellation. Windows does not reliably identify UIPI as the cause of a `SendInput` refusal, so error copy says input could not be sent without inventing a cause. Distinguish static/build proof from live desktop and external-app proof; an unexecuted manual scenario remains open rather than being labelled successful.
- Window-scope proof includes a narrow app on an ultra-wide monitor, a modal foreground window, a missing/desktop foreground window fallback, F8 switching in both directions, Space and Backspace after the switch, a window spanning monitors, and preference restoration. Static geometry and build results do not substitute for visible external-app proof.

## Sources informing the design

- Neru modes and Windows capability: https://github.com/y3owk1n/neru/blob/main/README.md and https://github.com/y3owk1n/neru/blob/main/docs/CROSS_PLATFORM.md
- Neru recursive behaviour: https://github.com/y3owk1n/neru/blob/main/docs/CONFIGURATION.md
- Mousemaster Windows interaction and keyboard layouts: https://github.com/petoncle/mousemaster/blob/main/README.md and https://github.com/petoncle/mousemaster/blob/main/docs/configuration-reference.md
- Microsoft: https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-registerhotkey , https://learn.microsoft.com/en-us/windows/win32/winmsg/lowlevelkeyboardproc , https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-sendinput

## Skill Run History

- 2026-09-26: sg-development — research and repository inspection; ready implementation contract recorded. Implementation and live proof pending.
- 2026-09-26: GPT-6 Luna native and Flutter batches — Windows host, persisted local opt-in, settings and focused tests implemented. C++17 geometry/keymap harness, seven Flutter tests and Flutter analyzer passed through Doppler; managed Windows runner recompiled and launched. Independent static review found and prompted hook teardown, button-release, drag-motion and fine-grid readability fixes. Live external-app proof awaits an authenticated CommandGlows Dev session.
- 2026-09-27: Live Windows UI review found the settings page had no entry in the visible profile menu. Added its Windows menu route, verified the page and local opt-in in the managed app, then invoked and dismissed the grid globally over a blank Bloc-notes tab. Dense hatching obscured the target, so the region interior was made transparent and the native runner recompiled. Physical-key selection, click/drag/scroll and final visual review after the redraw remain open.
- 2026-09-27: Active-window scope approved for ultra-wide use. Added local scope preference, frozen visible-window geometry, F8 session toggle and monitor fallback. Nine focused Dart tests, native geometry test, Flutter analysis, metadata lint and managed Windows compilation passed. The setting appeared in CommandGlows local mode and persisted across restart; the grid visibly matched the foreground CommandGlows window and an external Bloc-notes window on a wider monitor. Physical F8 selection and pointer actions remain unverified because injected automation keys are intentionally ignored by the low-level hook.
- 2026-09-27: Diane confirmed physical browser tests work and requested Space for left click plus future key customization. Audited the Android gesture-shortcuts editor and Windows hardcoded hotkeys. Space became left click, F1 remains an alias, F9 became reset; Windows settings/help and this implementation contract were updated. Nine focused Dart tests, Flutter analysis, metadata lint and a managed Doppler-backed Windows recompile/restart passed. Custom editor and physical retest of the new default remain pending.
- 2026-09-27: Diane requested the configurable-key editor. Added a Windows-only, locally persisted versioned binding map; grouped Settings capture/reset UI; startup restore/recovery; native scan-code validation, atomic global-hotkey replacement, dynamic key guide and layout-sensitive labels. Independent review identified mutable active-session bindings, Escape shadowing, invalid saved maps, storage rollback and transient-error recovery; these were corrected. Fourteen integrated Flutter tests, full Flutter analysis, native CMake test, full Windows runner build, metadata lint and a managed Doppler-backed Windows launch passed. Physical customized-key proof remains open because injected keys are ignored by the low-level hook.
- 2026-09-27: sg-bug — Diane observed that assigning `1` to F3 appeared to succeed but left F3 displayed. Root cause: AZERTY `1` is Shift plus a physical digit-row key, which the v1 editor rejected, while the explanation appeared below the long editor. Added v2 modifier-aware action bindings with lossless v1 migration, immediate inline rejection, preserved prior binding on failure and native protection for grid/global chords. Nineteen targeted Flutter tests, full analysis, native C++ test, CMake Debug runner link, metadata lint and managed Windows relaunch passed. Physical AZERTY confirmation remains pending.

- 2026-09-28: sg-development — Replaced the prose command overview with responsive action cards and effective-binding pills. Clicking a pill opens the editor, scrolls to the action and captures its replacement; successful saves update the overview immediately. Narrow-window coverage exposed editor control overflow, corrected with wrapping. Twenty-two focused Flutter tests, full Flutter analysis, metadata lint and managed Doppler-backed Windows relaunch passed; the updated kernel asset was verified. Native visual inspection of this UI change remains unperformed.

## Current Chantier Flow

- Native and Flutter configurable-key batches, AZERTY capture repair and the clickable command overview are integrated. Focused tests, analysis and managed Windows relaunch pass. Physical-key proof for customized bindings and native visual inspection of the new cards remain open. Grid-layout options and hints remain separate follow-ups.
