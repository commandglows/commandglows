---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-26"
created_at: "2026-05-26 19:12:08 UTC"
updated: "2026-05-26"
updated_at: "2026-05-26 19:59:34 UTC"
status: reviewed
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "android-ime-keyboard-performance"
owner: "Diane"
confidence: high
user_story: "En tant qu'utilisatrice Android qui tape tres vite avec le clavier WinGlows, je veux que les touches restent prises en compte meme quand deux doigts se chevauchent, afin que le clavier soit aussi reactif et fiable que Samsung Keyboard ou Unexpected Keyboard."
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "winglowz_app/android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt"
  - "winglowz_app/android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzInputMethodService.kt"
  - "winglowz_app/android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardGestureClassifier.kt"
  - "winglowz_app/android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardPressEffects.kt"
  - "winglowz_app/android/app/src/test/kotlin/com/winglowz_app/winglowz_app/ime/"
  - "winglowz_app/docs/technical/android-native.md"
  - "winglowz_app/docs/VERIFICATION.md"
  - "/home/claude/keyboard/srcs/juloo.keyboard2/Keyboard2View.java"
  - "/home/claude/keyboard/srcs/juloo.keyboard2/Pointers.java"
depends_on:
  - artifact: "winglowz_app/AGENTS.md"
    artifact_version: "0.1.0"
    required_status: "draft"
  - artifact: "winglowz_app/CLAUDE.md"
    artifact_version: "1.2.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/workflow/specs/keyboard-stable-grid-touch-geometry.md"
    artifact_version: "0.1.0"
    required_status: "implemented-pending-android-qa"
  - artifact: "winglowz_app/docs/technical/android-native.md"
    artifact_version: "unknown"
    required_status: "unknown"
supersedes: []
evidence:
  - "User report 2026-05-26: Samsung Keyboard and Unexpected Keyboard remain stable during very fast typing, while WinGlows freezes or behaves strangely when many keys/fingers overlap."
  - "sf-perf audit 2026-05-26: WinGlowzKeyboardView currently stores one activePointerId and explicitly ignores ACTION_POINTER_DOWN while a pointer is active."
  - "Local code: winglowz_app/android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt handles ACTION_POINTER_DOWN by setting debugGestureText='multi-touch ignored active=...'."
  - "Local comparison: /home/claude/keyboard/srcs/juloo.keyboard2/Keyboard2View.java accepts ACTION_POINTER_DOWN and sends ACTION_MOVE for every active pointer to Pointers."
  - "Local comparison: /home/claude/keyboard/srcs/juloo.keyboard2/Pointers.java stores per-pointer state and handles touch down, move, up, long press and sliding by pointerId."
  - "Official Android MotionEvent docs checked 2026-05-26: multi-touch events contain all active pointers; pointer ids stay stable while pointer indexes can change, so code should track ids and resolve indexes per event."
  - "Official Android IME docs checked 2026-05-26: an IME is an InputMethodService that provides UI, handles user input, and delivers text/key events through InputConnection."
next_step: "/sf-verify android-ime-multi-pointer-rapid-typing-rollover.md"
---

# Spec: Android IME Multi-Pointer Rapid Typing Rollover

🟡 [WinGlowsApp] spec: Android IME Multi-Pointer Rapid Typing Rollover | status: implemented_pending_verify | path: shipglows_data/workflow/specs/android-ime-multi-pointer-rapid-typing-rollover.md | next: /sf-verify android-ime-multi-pointer-rapid-typing-rollover.md | id: wfz-ime-multipointer-rollover

## Title

Android IME Multi-Pointer Rapid Typing Rollover

## Status

Implemented pending verification. This chantier formalizes the remaining issue from the 2026-05-26 `sf-perf` audit: the quick performance patch reduced unnecessary layout rebuilds, and the follow-up implementation replaced the mono-pointer touch model with pointerId-based rollover. The next lifecycle step is `/sf-verify`.

## User Story

En tant qu'utilisatrice Android qui tape tres vite avec le clavier WinGlows, je veux que les touches restent prises en compte meme quand deux doigts se chevauchent, afin que le clavier soit aussi reactif et fiable que Samsung Keyboard ou Unexpected Keyboard.

## Minimal Behavior Contract

Quand l'utilisateur tape rapidement sur le clavier Android WinGlows avec plusieurs doigts, chaque pression texte normale doit etre suivie par son propre etat tactile jusqu'au relachement, puis produire au plus une insertion correspondant a la touche visee, meme si un autre doigt est encore pose. Les gestes qui ne peuvent pas etre partages sans ambiguite, comme spacebar slider, scroll horizontal de row, scroll vertical de panel, long-press repeat ou action systeme destructive, doivent prendre un verrou d'interaction clair et annuler ou ignorer seulement les pointeurs incompatibles sans bloquer les prochains taps. En cas de pointeur perdu, cancel Android, champ indisponible ou exception IME, le clavier doit nettoyer tous les etats actifs, arreter les callbacks retardes, afficher ou journaliser un etat recuperable sans texte sensible, et rester utilisable. L'edge case facile a rater est le relachement dans un ordre different de l'appui: deux touches texte posees quasi simultanement doivent etre traitees par `pointerId`, pas par l'index courant ni par une variable globale.

## Success Behavior

- Precondition: WinGlows keyboard is active in a normal text field with ABC layout and no protected gesture in progress.
- Action: Diane taps two or more letter keys with overlapping fingers and releases them in any order.
- Visible result: the keyboard does not freeze, the pressed highlights remain tied to the correct keys, and each completed tap inserts exactly one expected character.
- System effect: each active pointer owns its start key, latest coordinates, gesture distance, long-press token and optional protected mode; no secondary text tap overwrites another pointer's gesture state.
- Proof of success: native unit tests cover pointer down/move/up ordering; `flutter analyze` passes; hosted Android/Blacksmith build passes; Diane physical-device QA confirms rapid multi-finger typing does not drop or corrupt normal taps.

- Precondition: one protected interaction is active, such as space slider, panel scroll, action row scroll, or long-press repeat.
- Action: another finger touches a normal key before the protected interaction ends.
- Visible result: the protected interaction continues predictably or ends cleanly; the extra pointer does not dispatch a wrong key, start a second repeat, or leave the keyboard stuck.
- System effect: a bounded interaction lock records why the secondary pointer is suppressed or canceled, and all callbacks are removed on release/cancel.
- Proof of success: tests assert protected singleton behavior and cleanup; debug overlay can show active/canceled pointers without typed content.

## Error Behavior

- If `ACTION_CANCEL` is received, every active pointer state is cleared, all long-press/repeat callbacks are removed, scroll/slide locks are released, and no text is inserted because cancel is not a completed tap.
- If `ACTION_POINTER_UP` references an unknown pointer id, the event is ignored as recoverable telemetry/debug state; existing active pointers remain valid.
- If `findPointerIndex(pointerId)` fails during move handling, that pointer is canceled without canceling unrelated pointers.
- If `InputConnection` rejects text or key events, the existing callback failure statuses remain recoverable and must not leave a pointer or repeat runnable active.
- If a runtime exception occurs in touch handling, `runKeyboardSafely` and keyboard recovery must clear all pointer state before falling back. Diagnostics must never store typed text, clipboard content, snippets, dictation content, credentials, prompts, cookies, JWTs or provider payloads.

## Problem

WinGlows currently behaves like a single-finger keyboard at the touch-state level. `WinGlowzKeyboardView` stores one `activePointerId`, one `gestureStartFrame`, one `gestureStartX/Y`, one `longPressTriggered`, one `slidingSpace`, and one repeat action. When Android sends `ACTION_POINTER_DOWN` while a first finger is active, the code sets a debug message and returns without tracking the second pointer. During very fast typing, real users naturally overlap fingers; dropping secondary pointers can feel like lag, missed keys, freezes, or strange behavior.

Unexpected Keyboard demonstrates the professional model to emulate: `Keyboard2View` accepts `ACTION_POINTER_DOWN`, stores each pointer in `Pointers`, handles movement for every active pointer on `ACTION_MOVE`, and resolves final behavior by pointer id. Android's own `MotionEvent` contract also requires pointer ids to be tracked across events because pointer indexes may change.

The 2026-05-26 performance patch reduced unnecessary layout rebuilds after simple key dispatch, but it does not solve the rollover issue. A durable fix needs a real per-pointer state model.

## Solution

Introduce a multi-pointer touch controller for the native WinGlows keyboard. Normal text taps become independent per-pointer gestures that can overlap safely. Protected interactions remain exclusive through an explicit interaction lock so complex gestures do not mix with rollover typing. The implementation should keep the existing layout, dispatch, privacy, InputConnection, gesture classifier and recovery contracts, while replacing the global active-pointer variables with pointer-owned state.

## Scope In

- Native Android IME touch handling in `WinGlowzKeyboardView.kt`.
- A new or extracted Kotlin model/controller for active keyboard pointers, if it makes the implementation safer and testable.
- Per-pointer tap lifecycle for normal text/key-value keys: down, move, up, cancel.
- Per-pointer gesture classification using existing `KeyboardGestureClassifier`, `GestureSample`, `GestureSelection`, hit frames and thresholds.
- Protected singleton behavior for space slider, horizontal row scroll, vertical panel scroll, long-press repeat, destructive/navigation repeat and action descriptor long press.
- Press visual state for multiple concurrently pressed keys without ambiguous highlights.
- Cleanup on `ACTION_CANCEL`, missing pointer indexes, view detach, recovery fallback and input finish where relevant.
- Native unit tests for pointer-state lifecycle and protected-lock behavior.
- Documentation updates for Android native behavior and manual verification steps.

## Scope Out

- Rewriting the visual keyboard layout or stable grid geometry already covered by `keyboard-stable-grid-touch-geometry.md`.
- Adding full multi-finger modifier chords, selection handles, chorded shortcuts, or desktop-style N-key rollover beyond overlapping normal taps.
- Changing clipboard, snippets, dictionary, voice, media, auth, sync or backend behavior.
- Changing public marketing copy or making performance claims before physical-device QA.
- Running local Android builds, Gradle tasks, APK installs or device automation on this VM.

## Constraints

- Local validation is limited by repository guardrails to `flutter analyze`, `flutter test`, targeted `flutter test ...`, and non-Gradle static checks.
- Android APK/IME validation must go through GitHub Actions/Blacksmith plus Diane's physical-device QA.
- The implementation must keep typed text and sensitive content out of diagnostics, debug overlays and logs.
- The keyboard must remain responsive on the UI thread; no heavy work, disk/network access, or broad preference reload should be added to touch move/down/up paths.
- Existing protected gesture priorities must remain: space slider, horizontal row scroll, vertical panel scroll, long press/repeat, and return-to-center cancellation outrank configured corner shortcuts.
- The current 2026-05-26 layout-refresh optimization must not be undone by rebuilding layout on every pointer event.
- The implementation should prefer a small testable state object over spreading more mutable pointer globals through the view.

## Dependencies

- Android `MotionEvent` API. Fresh docs checked 2026-05-26: multi-touch events can include multiple active pointers; pointer ids remain stable for the life of the pointer while pointer indexes can change, so implementations should use `getPointerId()` and `findPointerIndex()` rather than assuming index stability. Source: https://developer.android.com/reference/android/view/MotionEvent
- Android `InputMethodService` / IME API. Fresh docs checked 2026-05-26: IMEs are services that provide UI, handle user input, and communicate text/key events to focused fields through `InputConnection`. Source: https://developer.android.com/develop/ui/views/touch-and-input/creating-input-method
- Existing WinGlows native IME files: `WinGlowzKeyboardView.kt`, `WinGlowzInputMethodService.kt`, `KeyboardGestureClassifier.kt`, `KeyboardLayoutModels.kt`, `KeyboardPressEffects.kt`, `KeyboardCrashReporter.kt`.
- Reference keyboard comparison: `/home/claude/keyboard/srcs/juloo.keyboard2/Keyboard2View.java` and `/home/claude/keyboard/srcs/juloo.keyboard2/Pointers.java`.
- Existing docs: `winglowz_app/docs/technical/android-native.md` and `winglowz_app/docs/VERIFICATION.md`.

## Invariants

- A completed normal text pointer dispatches at most once.
- A canceled pointer dispatches no text.
- A pointer id owns its start frame until release/cancel; another pointer cannot overwrite it.
- Pointer index is treated as event-local only and never as durable identity.
- Secondary normal taps may overlap primary normal taps.
- Protected gestures are exclusive when mixing them would create ambiguity.
- Repeat runnables stop immediately when their owning pointer is released, canceled, missing, or superseded by recovery.
- Spacebar sliding continues to insert no spaces while sliding.
- Row/panel scroll gestures do not dispatch the key that started the scroll.
- Debug overlay and diagnostics never expose typed text.

## Links & Consequences

- `WinGlowzKeyboardView.kt`: main implementation surface; replacing active-pointer globals affects touch, long press, repeat, dispatch, press effects, scroll state and recovery.
- `WinGlowzInputMethodService.kt`: dispatch callbacks should stay unchanged unless pointer cleanup needs a lifecycle hook; InputConnection behavior should remain centralized here.
- `KeyboardGestureClassifier.kt`: should remain the source of tap/swipe/cancel classification; avoid duplicating gesture math inside the new pointer tracker.
- `KeyboardPressEffects.kt`: may need multiple active highlights or effect triggers from pointer-owned frames.
- `docs/technical/android-native.md`: currently states secondary pointers are ignored; must be updated when multi-pointer rollover ships.
- `docs/VERIFICATION.md`: manual QA row for second finger currently expects no second key; it must be changed to test overlapping normal-key insertion and protected-gesture suppression separately.
- `shipglows_data/workflow/specs/keyboard-stable-grid-touch-geometry.md`: dependency because reliable pointer tracking assumes hit rectangles remain stable and non-overlapping.

## Documentation Coherence

- Update `winglowz_app/docs/technical/android-native.md` to describe the new multi-pointer typing model, protected singleton gestures, cleanup rules and privacy constraints.
- Update `winglowz_app/docs/VERIFICATION.md` to replace the old "secondary pointer does not emit a second key" expectation with separate manual cases for rapid text rollover and protected gestures.
- Optionally update `winglowz_app/docs/COMPONENTS.md` only if a new named pointer tracker/controller becomes a documented native component.
- No public marketing claim should be added until Blacksmith/APK proof and Diane physical QA confirm responsiveness.

## Edge Cases

- Two text keys pressed almost simultaneously, released in reverse order.
- One text key moves slightly but remains a tap while another key is pressed and released.
- One pointer starts a corner gesture while another normal tap is active.
- One pointer starts space slider while another touches a letter.
- One pointer starts horizontal action-row scroll while another touches an action key.
- One pointer long-presses Backspace while another touches a text key.
- Android sends `ACTION_POINTER_UP` for a pointer whose durable state was already canceled.
- Android sends `ACTION_CANCEL` after several pointers are active.
- Pointer index changes between move events.
- Host app rejects InputConnection calls while pointers remain active.
- View detaches or IME finishes input while delayed long-press/repeat callbacks are pending.
- Private field suppresses clipboard/snippet/voice actions while normal text rollover remains allowed.

## Implementation Tasks

- [ ] Task 1: Extract pointer-owned touch state.
  - File: `winglowz_app/android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt` or new `KeyboardPointerTracker.kt`
  - Action: Replace global gesture state for normal taps with a pointer-owned model keyed by Android `pointerId`: start frame, start/latest coordinates, max distance, long-press token, active key id, protected-mode marker and canceled state.
  - User story link: overlapping fingers must not overwrite each other's active touch state.
  - Depends on: none.
  - Validate with: targeted JVM unit tests for two pointer ids pressed/released in different orders.
  - Notes: Keep `pointerId` durable and pointer index event-local.

- [ ] Task 2: Rework `handleTouchEvent` to process all active pointers correctly.
  - File: `winglowz_app/android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action: On `ACTION_DOWN`/`ACTION_POINTER_DOWN`, create state for the changed pointer when hit-testing succeeds; on `ACTION_MOVE`, iterate `event.pointerCount` and update each tracked pointer via `getPointerId(index)`; on `ACTION_UP`/`ACTION_POINTER_UP`, finish only the changed pointer; on `ACTION_CANCEL`, cancel all states.
  - User story link: multiple overlapping taps must be observed instead of ignored.
  - Depends on: Task 1.
  - Validate with: tests that mimic Android pointer index changes and mixed up order.
  - Notes: Preserve `super.onTouchEvent(event)` fallback only for unknown actions.

- [ ] Task 3: Add explicit protected interaction locking.
  - File: `winglowz_app/android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt` or new `KeyboardPointerTracker.kt`
  - Action: Define which pointer owns exclusive interactions: space slider, horizontal row scroll, vertical panel scroll, repeat, and action-descriptor long press. Suppress or cancel incompatible secondary pointers with cleanup, not global corruption.
  - User story link: rapid typing improves without making complex gestures unpredictable.
  - Depends on: Tasks 1-2.
  - Validate with: tests for text+space-slider, text+row-scroll, text+repeat and repeat release cleanup.
  - Notes: Protected gestures should be conservative; normal text tap rollover is the primary goal.

- [ ] Task 4: Make long-press and repeat pointer-owned.
  - File: `winglowz_app/android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action: Bind long-press callbacks and repeat state to the owning pointer id/key. Release/cancel/missing pointer must remove that pointer's callbacks. Only one repeat should run unless a later design explicitly approves multi-repeat.
  - User story link: fast typing must not leave delayed repeats or long-press effects running after touch overlap.
  - Depends on: Task 3.
  - Validate with: tests or instrumentation seam proving callbacks are removed on pointer up/cancel.
  - Notes: Do not create unbounded `postDelayed` callbacks per move event.

- [ ] Task 5: Update visual pressed/highlight behavior for concurrent text pointers.
  - File: `winglowz_app/android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action: Replace single `activeKeyId` usage with active key ids derived from tracked pointers plus existing lingering highlights. Draw active/pressed state without layout changes.
  - User story link: visual feedback should match the actual finger/key, preventing the "buggy" feel during overlap.
  - Depends on: Tasks 1-2.
  - Validate with: code review plus physical-device QA using touch debug overlay.
  - Notes: Keep queue caps for lingering highlights.

- [ ] Task 6: Preserve dispatch and layout-refresh performance guarantees.
  - File: `winglowz_app/android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action: Ensure pointer down/move/up paths do not call `refreshLayout()` except when a dispatched action changes layout state; normal pointer movement should use `invalidate()` or `postInvalidateOnAnimation()` only when visual state changes.
  - User story link: responsiveness requires both correct rollover and low UI-thread work.
  - Depends on: Tasks 2-5.
  - Validate with: local code inspection, `flutter analyze`, and optional debug counters if added without shipping noisy logs.
  - Notes: Do not reintroduce rebuild-per-key behavior fixed on 2026-05-26.

- [ ] Task 7: Add native tests for multi-pointer behavior.
  - File: `winglowz_app/android/app/src/test/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardPointerTrackerTest.kt` or equivalent.
  - Action: Cover two normal text pointers, reverse release order, unknown pointer up, missing pointer move, cancel all, protected singleton suppression, long-press cleanup and no duplicate dispatch.
  - User story link: a fresh implementation must be provably correct before device QA.
  - Depends on: Tasks 1-4.
  - Validate with: hosted Android unit tests in CI/Blacksmith; local Gradle is forbidden.
  - Notes: If pure JVM tests can avoid Android resource bundling, prefer them; otherwise rely on hosted CI.

- [ ] Task 8: Update docs and manual QA checklist.
  - File: `winglowz_app/docs/technical/android-native.md`, `winglowz_app/docs/VERIFICATION.md`
  - Action: Document the multi-pointer rollover contract, protected singleton exceptions, privacy-safe diagnostics, and manual QA cases.
  - User story link: Diane needs a clear physical-device validation script.
  - Depends on: Tasks 1-7.
  - Validate with: docs diff review and manual QA checklist readiness.
  - Notes: Do not claim parity with Samsung/Unexpected publicly until device proof passes.

- [ ] Task 9: Validate through the allowed gates.
  - File: `.github/workflows/android-build.yml` if CI coverage needs targeted test selection; otherwise no workflow edit.
  - Action: Run local `flutter analyze`; run any Dart tests touched by docs/settings only if relevant; route Android native tests/build/APK proof to GitHub Actions/Blacksmith; collect Diane physical-device QA for rapid typing and protected gestures.
  - User story link: the fix must be proven on the actual Android IME surface.
  - Depends on: Tasks 1-8.
  - Validate with: `flutter analyze`, hosted Android native test/build proof, and Diane device QA notes.
  - Notes: Do not run `./gradlew`, Android builds, installs or `flutter run -d android` locally.

## Acceptance Criteria

- [ ] CA 1: Given the ABC keyboard in a normal text field, when two letter keys are pressed with overlapping fingers and released in press order, then both expected characters are inserted once and the keyboard remains responsive.
- [ ] CA 2: Given the ABC keyboard in a normal text field, when two letter keys are pressed with overlapping fingers and released in reverse order, then both expected characters are inserted once according to completed pointer releases, with no pointer-state corruption.
- [ ] CA 3: Given one active normal text pointer, when `ACTION_POINTER_DOWN` occurs on another normal text key, then WinGlows tracks the new pointer instead of logging/suppressing it as ignored multi-touch.
- [ ] CA 4: Given multiple active pointers, when Android sends `ACTION_MOVE`, then each tracked pointer is resolved by `pointerId` from the current event index and updates only its own gesture state.
- [ ] CA 5: Given a pointer id is missing from a move event, when the event is handled, then only that pointer is canceled and unrelated pointers remain valid.
- [ ] CA 6: Given Android sends `ACTION_CANCEL`, when any number of pointers are active, then all pointer states and delayed callbacks are cleared and no key is dispatched.
- [ ] CA 7: Given space slider is active, when a secondary pointer touches a letter, then no wrong letter is inserted and the space slider remains predictable or ends cleanly according to the protected lock contract.
- [ ] CA 8: Given long-press Backspace repeat is active, when the owning pointer is released or canceled, then repeat stops immediately and no later repeat fires.
- [ ] CA 9: Given a normal text pointer and a corner gesture pointer overlap, when both finish, then the normal tap and gesture are resolved independently only if no protected lock forbids the mix; otherwise the forbidden pointer is canceled without wrong dispatch.
- [ ] CA 10: Given a private/password field, when normal text rollover happens, then normal text input remains allowed while private-mode restrictions on clipboard/snippets/voice still apply.
- [ ] CA 11: Given the touch debug overlay is enabled, when multiple pointers are active, then it exposes pointer/key state useful for QA without typed text or sensitive content.
- [ ] CA 12: Given hosted Android CI/Blacksmith builds the app, when native keyboard tests run, then the multi-pointer lifecycle tests pass.
- [ ] CA 13: Given Diane performs physical-device QA, when she types very rapidly with overlapping fingers for at least one representative paragraph, then there are no freezes, stuck repeats, corrupted gestures or systematic missed secondary taps.

## Test Strategy

- Unit/JVM tests: create a testable pointer-state object if possible and cover pointer lifecycle without Android UI resources.
- Existing Kotlin tests: follow patterns in `KeyboardGestureClassifierTest.kt`, `KeyboardLayoutBuilderTest.kt`, `KeyboardKeyValueEngineTest.kt` and adjacent native tests.
- Static/local checks: run `flutter analyze` after native/Kotlin changes because it is allowed locally and catches project-level Dart/Kotlin integration issues exposed to Flutter tooling.
- Hosted Android checks: run Blacksmith/GitHub Actions for Kotlin compile, Android unit tests and APK/build proof. Local Gradle and Android build commands are forbidden.
- Manual QA: Diane validates on a physical Android device with the real WinGlows IME in at least a normal text field, a private/password field, a search field and one app known to stress InputConnection behavior.
- Regression QA: verify space slider, long-press Backspace, action row scroll, vertical panel scroll, corner shortcuts, emoji insertion, suggestions, private-mode gating and keyboard recovery still work.

## Risks

- High UX/performance risk: a mono-pointer fix that only stops ignoring secondary taps but still rebuilds layout or blocks UI thread would not satisfy the user story.
- High correctness risk: pointer indexes can change; using indexes as durable ids will create wrong-key or lost-pointer bugs.
- Medium gesture risk: allowing every gesture to overlap every other gesture can create ambiguous behavior. Protected locks are required.
- Medium privacy/security risk: diagnostics for keyboard behavior must not capture typed content or sensitive text.
- Medium testing risk: local Android/Gradle validation is forbidden, so CI/Blacksmith and physical QA are mandatory before considering the chantier verified.
- Medium regression risk: refactoring touch state can break long press, repeat, space slider, scrollable action rows, panel scroll, corner gestures and recovery cleanup.

## Execution Notes

- Read first: `WinGlowzKeyboardView.kt`, `KeyboardGestureClassifier.kt`, `KeyboardPressEffects.kt`, `WinGlowzInputMethodService.kt`, `docs/technical/android-native.md`, `docs/VERIFICATION.md`.
- Use `/home/claude/keyboard/srcs/juloo.keyboard2/Keyboard2View.java` and `/home/claude/keyboard/srcs/juloo.keyboard2/Pointers.java` as a reference model, not as code to copy blindly.
- Keep dispatch callbacks in `WinGlowzInputMethodService` stable unless a lifecycle cleanup hook is required.
- Prefer introducing a testable `KeyboardPointerTracker` or small state class if it prevents `WinGlowzKeyboardView.kt` from growing more global mutable state.
- Avoid broad architecture changes, new dependencies, network calls, storage writes, or preference reloads in touch event paths.
- Fresh-docs verdict: `fresh-docs checked` using official Android MotionEvent and Create an input method documentation on 2026-05-26.
- Stop and reroute to `/sf-spec` or user decision if implementation requires product approval for multi-finger modifier chords, selection sliders, or public claims of Samsung/Unexpected parity.

## Open Questions

None for the first implementation contract. The conservative default is: support overlapping normal text taps; keep protected gestures exclusive; defer chorded shortcuts and advanced multi-finger gestures.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-26 19:12:08 UTC | sf-spec | GPT-5 Codex | Created spec from sf-perf chantier potential for Android IME multi-pointer rapid typing rollover. | Draft spec saved with behavior contract, tasks, acceptance criteria, docs freshness evidence and validation path. | `/sf-ready android-ime-multi-pointer-rapid-typing-rollover.md` |
| 2026-05-26 19:15:33 UTC | sf-ready | GPT-5 Codex | Reviewed readiness against user story, structure, behavior contract, task order, documentation, external docs, adversarial cases and security/privacy constraints. | ready | `/sf-start Android IME Multi-Pointer Rapid Typing Rollover` |
| 2026-05-26 19:29:11 UTC | sf-start | gpt-5.3-codex | Implemented pointerId-based multi-pointer rollover in native IME touch handling with protected interaction exclusivity, pointer-owned long-press/repeat ownership, docs updates, and tracker unit tests. | implemented | `/sf-verify android-ime-multi-pointer-rapid-typing-rollover.md` |
| 2026-05-26 19:55:57 UTC | sf-perf | GPT-5 Codex | Audited the implemented Android IME multi-pointer touch path for hot-path layout rebuilds, pointer move overhead, and cleanup risks. | no new blocking performance issue; local static checks passed; verification remains Android-hosted/device-bound | `/sf-verify android-ime-multi-pointer-rapid-typing-rollover.md` |
| 2026-05-26 19:59:34 UTC | sf-verify | GPT-5 Codex | Verified local implementation coherence, docs, metadata, allowed static checks, Flutter tests, and Android-native proof gaps. | partial | Hosted Android/Blacksmith native proof and Diane physical-device QA remain required. |

## Current Chantier Flow

| Stage | Status | Notes |
|-------|--------|-------|
| sf-spec | done | Draft spec created on 2026-05-26. |
| sf-ready | ready | Readiness gate passed on 2026-05-26. |
| sf-start | implemented | Native IME multi-pointer rollover implementation completed with local allowed checks (`git diff --check`, `flutter analyze`) and docs/test updates on 2026-05-26. |
| sf-verify | partial | Local allowed checks pass (`flutter analyze`, `flutter test`, `git diff --check`, spec metadata lint) and implementation/docs are coherent, but hosted Android native compile/unit proof plus Diane physical-device QA are still missing. |
| sf-end | not_started | Close after evidence and docs alignment. |
| sf-ship | not_started | Ship only when repo/release policy allows and Diane requests or workflow requires. |
