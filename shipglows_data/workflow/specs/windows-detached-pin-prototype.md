---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: CommandGlows
created: "2026-09-25"
created_at: "2026-09-25 15:17:00 UTC"
updated: "2026-09-26"
updated_at: "2026-09-26 02:55:47 UTC"
status: active
source_skill: 100-sg-spec
source_model: "GPT-5 Codex"
scope: "windows-detached-pin-prototype"
owner: Diane
confidence: high
user_story: "As a CommandGlows user, I can keep a draggable demo pin above other windows without that interaction changing the main application window."
risk_level: medium
security_impact: yes
docs_impact: yes
linked_systems:
  - CommandGlows Flutter Windows runner
  - reusable pin domain and host contract
  - Windows input and window activation behavior
depends_on:
  - shipglows_data/workflow/specs/reusable-pin-core-and-independent-window-contract.md
supersedes: []
evidence:
  - "Operator approved a narrow Windows prototype: one fake snippet in a real detached native window, draggable and independent from the main window."
  - "The existing Windows Flutter runner owns one primary FlutterWindow; its overlay bridge mutates that primary window."
  - "Microsoft Win32 documentation confirms unowned top-level window creation, WS_EX_NOACTIVATE, and MA_NOACTIVATE behavior for non-activating mouse interaction."
  - "UX authority uses the user requirement and Windows-native interaction guidance; no external visual pattern or new visual direction is introduced."
  - "Operator's live screenshot showed a separate note with broken accented text; switching to another window covered it. Operator clarified that staying above other windows is the feature's core value."
next_step: "Collect direct Windows UI proof of drag, primary-window isolation, minimize/restore, and close/reopen."
---

# Title

Windows Detached Pin Prototype

# Status

In progress. The operator confirmed that the post-repair note stays above ordinary windows and its French accents display correctly. Drag, primary-window isolation, minimize/restore, and close/reopen remain unverified. This prototype validates one read-only fake snippet in an independent native Windows top-level window; it is not production pin persistence, content integration, or a finished post-it feature.

# User Story

As a CommandGlows user, I want to keep a fake snippet visible above ordinary Windows windows and drag it without changing the main app window, so we can validate the native window boundary before integrating real resources.

Actor: a developer running the Windows debug app.

Trigger: the developer selects a debug-only action from the sign-in or home screen.

Observable result: one native window shows a legible fixed demo snippet; it stays above ordinary windows and can be moved and closed while the main app window retains its prior visibility, minimized/restored state, route, and activation state. No auth session is needed to exercise the fake content.

# Minimal Behavior Contract

On Windows debug builds, the developer-only action opens one unowned native top-level window for a stable demo pin ID. The note displays one hard-coded, read-only fake snippet with correct French accents and can be dragged by its title bar. It stays in the Windows topmost group above ordinary windows, without activating itself on display or mouse interaction or mutating the main window. Minimize/restore of the main window leaves the independent note visible. Closing the note closes only that native window; closing the app process also closes the note. On unsupported hosts or native creation failure, the caller receives a typed failure and the main window is left unchanged. Reopening after close creates the same demo note again. The easiest missed edge case is a click/drag on the note activating or restoring the primary Flutter window.

# Success Behavior

- The Windows debug-only demo action opens one visible, draggable native window with the fake snippet content.
- The note remains above ordinary non-topmost windows after switching focus, with its accented title and text rendered correctly.
- Native mouse interaction and window movement do not activate, show, hide, minimize, restore, resize, navigate, or otherwise mutate the primary app window.
- Minimize/restore of the primary window does not minimize or hide the unowned note.
- Closing the note leaves the app running and at the same route/state; opening it again succeeds.
- Automated static proof passes; interactive proof records the visible note and main-window state before and after open, drag, close, minimize, and restore.

# Error Behavior

- Non-Windows and non-debug builds expose no demo UI and do not attempt a native call.
- A malformed pin ID, malformed position, or native window creation failure returns an explicit failure without changing primary-window state.
- A stale close or move for an unknown ID returns a not-found/failure result and does not affect the demo or primary window.
- The note contains no live source resource; no clipboard access, external request, persistence, or auth operation occurs.

# Problem

The reusable Dart pin contract exists, but the existing Windows overlay applies visibility/topmost behavior to the primary Flutter window. It does not prove an independent draggable post-it window.

# Solution

Implement a small Windows host adapter for the existing `PinWindowHost` contract. Use a separate unowned topmost Win32 window with standard Windows chrome and a native read-only text control for the fake snippet; do not add a second Flutter engine or package dependency in this prototype. Show the window without activation and handle mouse activation so its title-bar drag does not alter the main window's activation state. Route open/move/close and moved/closed events by pin ID. Use encoding-safe wide string literals for French text. Add Windows-debug-only actions to the existing sign-in and home surfaces so the prototype is reachable both before sign-in and from an active session. Use the existing Flutter theme and maintained button pattern for those actions; native Windows chrome/control styling remains system-owned for this behavior-only prototype.

# Scope In

- Windows native adapter implementing open, move, close, and per-pin moved/closed event behavior for one demo pin.
- Unowned topmost HWND, non-activating display and pointer interaction, standard native title bar, draggable title bar, native close button.
- Hard-coded read-only fake snippet content with no source payload lookup.
- Debug-only Windows actions on sign-in and home surfaces, no sign-in needed.
- Architecture and code map documentation for the real Windows host boundary and prototype limits.
- Managed Windows debug session and manual interaction proof.

# Scope Out

- Clipboard, snippet, image, audio, dictionary, or voice source integrations.
- Persistent pin storage, saved coordinates, Firebase/Firestore, sync, or account ownership.
- Editing/copying note content, multiple simultaneous pins, or cross-device behavior.
- Production UI/route, release behavior, packaging, deployment, or public capability claims.
- Any modification to the existing primary-window overlay behavior or hotkey ownership.

# Constraints

- Keep shared product meaning in Dart and OS window creation in the Windows runner.
- Never pass the primary HWND as the pin window owner/parent; do not create a child window.
- Use the existing pin ID to scope host operations and events.
- Do not call primary-window show/hide/minimize/restore/activation methods from the pin host.
- Do not activate the demo window on open or mouse interaction; native system close and title-bar drag must remain usable.
- No real clipboard content, source payload, credentials, or account identifiers enter the native host.
- The sign-in and home actions are gated by both Windows platform and debug mode so release builds expose no prototype affordance.

# Test Contract

Surface: Flutter UI entry point, Dart Windows host bridge, Win32 top-level window lifecycle, and main-window non-interference.

Automated checks: `flutter analyze`; Windows runner build and C++ compilation through the managed Windows debug session. Do not add automated tests in this prototype tranche.

Interactive proof order: start the managed Windows debug session with the project's declared Doppler recipe; open the debug demo; check the accented title and text; drag the title bar; switch to an ordinary browser or editor window and verify the note remains above it without changing the primary app state; minimize and restore the main app from the taskbar while the note remains visible; close the note; confirm the app stays at its same route; reopen and close again. Observe the primary window's visibility, activation, minimized/restored state, and route at each step.

Limit: source review and compilation do not prove OS interaction. If the managed runtime cannot be launched, report that boundary and do not claim the independent-window behavior is verified.

# Dependencies

- `shipglows_data/workflow/specs/reusable-pin-core-and-independent-window-contract.md` — provider-neutral pin identity and host contract.
- `commandglows_app/lib/features/pinning/domain/pin_window_contract.dart` — shared Dart host API.
- `commandglows_app/windows/runner/flutter_window.cpp` — existing primary Flutter host and method-channel lifecycle.
- `commandglows_app/windows/runner/win32_window.cpp` — existing runner window implementation; preserve its primary-window behavior.
- Microsoft Learn Win32 `CreateWindowEx`, window input/activation, and window-features references.

# Invariants

- The demo note is a separate unowned top-level HWND, not a Flutter child or primary-window overlay.
- Opening, dragging, closing, or reopening the note cannot issue a main-window lifecycle command.
- A demo note can be closed without quitting the app; app process exit cleans up its native window.
- Fake snippet content is fixed, read-only, local, and clearly identified as a prototype.
- Release builds and non-Windows platforms contain no reachable prototype action.

# Security Gate

No data source, network endpoint, auth operation, or persistent write is introduced. The only content is a literal fake snippet. The developer-only entry point is excluded from release UI. The native method channel validates pin IDs and positions, reports typed failures, and does not log content or secrets. Source authorization is not applicable because no source resource is read.

# Links & Consequences

- Upstream: `reusable-pin-core-and-independent-window-contract.md`; this is its first narrow Windows host proof, without changing its deferred production integration boundary.
- Downstream: future integration may replace the fake content with a source renderer while preserving pin-scoped lifecycle and main-window isolation.
- Preserved: clipboard's feature-specific `pinned` state and current main-window overlay implementation remain unchanged.
- Microsoft Learn evidence: [`CreateWindowEx`](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-createwindowexw), [`Mouse Input Overview`](https://learn.microsoft.com/en-us/windows/win32/inputdev/about-mouse-input), and [`Window Features`](https://learn.microsoft.com/en-us/windows/win32/winmsg/window-features).

# Documentation Coherence

Update `shipglows_data/technical/commandglows_app/architecture.md` to distinguish the independent native pin host from the current primary-window overlay. Update `code-docs-map.md` to map the new Windows runner adapter and its managed/manual proof. No public site, onboarding, or product claim update.

# Edge Cases

- Reopening the existing demo pin ID while its window is open does not create a duplicate native window.
- Reopen after native close creates a fresh window.
- Closing a stale/unknown pin ID reports failure and leaves the main window untouched.
- Main app minimized/restored while the unowned note is visible.
- An ordinary window becomes active while the note remains visible above it; reopening an existing note preserves topmost placement.
- Mouse click and title-bar drag must not activate the pin/main-window activation change; native title-bar drag still works.
- Main app closes while the pin is open; no orphan survives process exit.
- Native creation fails or method channel receives invalid ID/position.
- Non-Windows and release builds cannot surface the debug action.

# Implementation Tasks

1. Add `WindowsPinWindowHost` Dart adapter and debug-only actions on sign-in and home surfaces for the hard-coded demo pin. Keep controls tokenized and hide them outside Windows debug mode. User-story link: lets a developer invoke the native proof with or without an active app session, without source data. Dependency: shared `PinWindowHost` contract. Validate with `flutter analyze`, targeted design-system drift check, and source review of the debug gates.
2. Add the independent native `PostItWindow` host in `windows/runner`, method/event channel routing by pin ID, system chrome, topmost placement, non-activating display and mouse handling, native drag, close, and move event reporting. User-story link: demonstrates persistent above-window visibility, detached draggable behavior, and main-window isolation. Dependency: task 1 bridge shape. Validate with Windows runner compilation through managed `s.cmd` session and inspect that no primary-window lifecycle API is called.
3. Update architecture and code map. User-story link: records host ownership and prototype limit. Dependency: tasks 1–2. Validate metadata lint and documentation consistency review.
4. Run manual Windows interaction proof in the managed debug session. User-story link: proves actual OS window behavior. Dependency: tasks 1–3. Validate open, drag, main minimize/restore, close/reopen and non-interference via direct UI observation.

# Acceptance Criteria

- AC 1: In a Windows debug run, the prototype action is available from sign-in and the home screen; sign-in is not required. In release/non-Windows contexts it is not exposed.
- AC 2: Opening the demo creates one separate unowned top-level window containing only the fixed demo snippet.
- AC 2a: The note stays above ordinary windows when focus switches away from CommandGlows; the accented title and snippet remain legible.
- AC 3: The title bar can be dragged; movement events carry the demo pin ID and logical desktop position.
- AC 4: Opening, clicking, dragging, and closing the note do not change the main app's visibility, activation, minimized/restored state, route, or application state.
- AC 5: Minimizing/restoring the main window leaves the unowned note visible and independently movable.
- AC 6: Closing the note leaves the main app running; reopening the same pin ID does not duplicate an already-open window and succeeds after close.
- AC 7: Invalid/unknown pin operations and native creation failures produce explicit failure; no fallback operates on the main window.
- AC 8: Main app exit closes the note; no process/window orphan remains.
- AC 9: No clipboard, real source data, auth, persistence, network, or primary overlay implementation is changed.
- AC 10: ZOMBIES: zero invalid IDs/positions fail; one valid fake pin opens; repeated open is idempotent; close then reopen works; unknown close/move does not affect the demo/main app; native creation failure reports explicitly; release/non-Windows paths are unavailable; sensitive payloads never enter host messages/logs.

# Test Strategy

Run only `flutter analyze`, the project's design-system drift check for changed Dart UI, ShipGlows metadata lint, and the managed Windows debug runner with manual CUA interaction. No automated tests are added or run. Windows compilation is a development launch, not a release packaging claim. No auth/session or clipboard behavior is claimed.

# Risks

- Windows no-activate semantics vary with message and shell behavior; actual interaction proof is mandatory.
- A native read-only window is deliberately not the final Flutter-rendered design; user-facing styling and editable content remain future work.
- One demo pin validates host isolation for one instance only; multi-window concurrency and persistence remain unproven.
- Closing the main process also destroys the note; durable orphan-safe lifecycle is explicitly out of scope.
- Topmost status is explicit for this debug prototype; stacking relative to other topmost or secure desktop windows is controlled by Windows.

# Execution Notes

- Preserve all unrelated working-tree changes and do not stage/commit.
- Do not change clipboard stores, Windows overlay hotkey/visibility methods, primary Flutter window visibility code, Firebase, or production routes.
- Use `s.cmd start -ProjectPath "$PWD" -FlutterDevice windows` from `commandglows_app`; it supplies allowlisted dev config through Doppler.
- No direct `flutter run` or standalone Windows build may replace the managed recipe.
- Use Windows system chrome/native text as a behavior-only prototype; no new dependency.
- First-read sources: `commandglows_app/lib/features/pinning/domain/pin_window_contract.dart`, `commandglows_app/lib/features/auth/presentation/auth_gate_screen.dart`, `commandglows_app/windows/runner/flutter_window.cpp`, `commandglows_app/windows/runner/win32_window.cpp`, and the product/architecture docs.
- Stops: if runtime launch requires credentials/entitlement not present, preserve code and report the missing interactive proof; do not request or expose secrets. If no-activate breaks native title drag, stop and revise the host before claiming acceptance.

# Open Questions

None for this disposable behavior-only prototype. The operator explicitly selected topmost placement as its essential behavior. Editability, real content, persistence, multi-pin lifecycle and production presentation remain outside scope.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-09-25 21:27:00 UTC | 100-sg-spec | GPT-5 Codex | Authored and refined a bounded spec for one fake snippet in an unowned, non-activating draggable Windows window after operator approval. | Reviewed; debug entry from sign-in and home states, native host behavior, security/data boundary, main-window invariants, and live proof are explicit. | Run 101-sg-ready. |
| 2026-09-25 21:29:00 UTC | 101-sg-ready | GPT-5 Codex | Reviewed the prototype's product fit, native window boundary, security/data scope, design authority, and live proof path. | Ready; no source content, persistence, production surface, or main-overlay changes are included. Win32 non-activation and actual dragging/minimize behavior still require managed interactive proof. | Implement through the managed Windows debug session, then independently verify. |
| 2026-09-25 21:31:00 UTC | 101-sg-ready | GPT-5 Codex | Reconfirmed readiness after checking the accepted entry points, existing Flutter theme/button conventions, and current Windows interaction guidance. | The sign-in and home debug actions are explicitly scoped, tokenized, and absent from release builds; the native system chrome is a bounded platform-owned prototype. | Continue with implementation and managed interactive proof. |
| 2026-09-25 21:47:00 UTC | 102-sg-start | GPT-5 Codex | Implemented the Dart host adapter, debug-only launchers on sign-in and home, and a single unowned non-activating Win32 demo window; updated architecture and code map. Managed Windows startup completed, `flutter analyze`, design-system drift check, metadata lint, and scoped whitespace check passed. | Windows runner compiled and launched, but direct native interaction remains unverified because the available desktop UI inventory returned no app windows. No automated tests were added or run. | Obtain direct UI access and verify drag, main-window isolation, minimize/restore, and close/reopen before marking verified. |
| 2026-09-26 02:53:00 UTC | sg-bug | GPT-6 Codex | Incorporated operator's live finding that the note was covered by ordinary windows and French accents were corrupted. Updated the Windows host to request topmost placement on create/reopen and use Unicode escapes for native text; aligned this spec and architecture. | Fresh managed Windows executable and running process observed; metadata lint and scoped diff check passed. The desktop UI control still exposes no native windows, so topmost, accents, and drag remain unverified after repair. | Obtain operator or direct UI observation of the updated window above an ordinary window, with legible accents and independent dragging/close. |
| 2026-09-26 02:55:47 UTC | sg-bug | GPT-6 Codex | Recorded the operator's reply to the targeted live retest request for topmost placement and French accents. | Operator confirmed both checks work in the managed Windows app. Drag, main-window minimize/restore, and close/reopen were not separately confirmed. | Preserve the remaining interaction proof before closing the whole prototype. |

## Current Chantier Flow

- 100-sg-spec: reviewed.
- 101-sg-ready: ready; contract and proof path complete and rechecked after entry-point refinement.
- 102-sg-start: topmost and accented text verified by operator; remaining interaction proof pending.
- 103-sg-verify: not run.
- 104-sg-end: not run.
- 005-sg-ship: not run; no commit, push, or deployment requested.
