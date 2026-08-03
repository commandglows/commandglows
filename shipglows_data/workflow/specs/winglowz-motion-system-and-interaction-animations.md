---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-06-10"
created_at: "2026-06-10 20:12:43 UTC"
updated: "2026-06-10"
updated_at: "2026-06-10 20:18:30 UTC"
status: ready
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "motion-system-and-interaction-animations"
owner: "Diane"
confidence: medium
user_story: "En tant qu'utilisatrice WinGlows Android et web, je veux que les animations des pages, composants et surfaces clavier rendent les interactions plus lisibles, physiques et professionnelles, afin de comprendre immédiatement ce qui change sans avoir l'impression que des effets sont simplement collés par-dessus l'interface."
risk_level: "medium"
security_impact: "none"
docs_impact: "yes"
linked_systems:
  - "WinGlows Flutter app"
  - "Flutter Material shared widgets"
  - "App shell bottom navigation"
  - "Product pages"
  - "Keyboard Preview"
  - "Keyboard Theme Studio"
  - "Settings"
  - "Onboarding permissions"
  - "Vercel Flutter web app"
  - "Android physical-device QA"
depends_on:
  - artifact: "AGENTS.md"
    artifact_version: "0.1.0"
    required_status: "draft"
  - artifact: "shipglows_data/workflow/specs/winglowz-product-pages-ux-remaster.md"
    artifact_version: "1.0.0"
    required_status: "ready"
  - artifact: "shipglows_data/workflow/specs/keyboard-physical-key-relief.md"
    artifact_version: "0.1.0"
    required_status: "ready"
  - artifact: "shipglows_data/workflow/specs/keyboard-theme-studio.md"
    artifact_version: "0.1.0"
    required_status: "ready"
  - artifact: "shipglows_data/workflow/specs/onboarding-permissions-guide.md"
    artifact_version: "0.1.0"
    required_status: "ready"
supersedes: []
evidence:
  - "User feedback 2026-06-10: bottom bar icons should animate on click while staying pretty and professional."
  - "User feedback 2026-06-10: keyboard effects should feel integrated into the 2D or 3D key surface, not overlaid independently."
  - "User feedback 2026-06-10: key press in 3D relief must move the whole physical key consistently."
  - "Existing code includes AppSyncStatusAction, ProductSummaryStrip, AppMetricPill, AppEmptyStateCard, KeyboardPreviewScreen, KeyboardThemeStudioScreen, and app-shell bottom navigation."
  - "Local implementation already introduced bottom navigation micro-animations in lib/features/shell/presentation/app_shell_screen.dart; this spec formalizes the broader animation language and rollout."
next_step: "/sf-start shipglows_data/workflow/specs/winglowz-motion-system-and-interaction-animations.md"
---

# Spec: WinGlows Motion System and Interaction Animations

🟢 [WinGlowsApp] spec: WinGlows Motion System and Interaction Animations | status: ready | path: shipglows_data/workflow/specs/winglowz-motion-system-and-interaction-animations.md | next: /sf-start shipglows_data/workflow/specs/winglowz-motion-system-and-interaction-animations.md | id: wfz-motion-system

## Title

WinGlows Motion System and Interaction Animations

## Status

Ready for implementation. Created on 2026-06-10 after the product-pages remaster discussion and the first bottom-bar animated icon implementation. `sf-ready` on 2026-06-10 resolved the motion-priority questions, tightened proof gates, and confirmed the scope is limited to Flutter shared UI, Flutter web smoke, and documentation unless native IME parity is explicitly split into a separate CI/device track.

## User Story

En tant qu'utilisatrice WinGlows Android et web, je veux que les animations des pages, composants et surfaces clavier rendent les interactions plus lisibles, physiques et professionnelles, afin de comprendre immédiatement ce qui change sans avoir l'impression que des effets sont simplement collés par-dessus l'interface.

## Minimal Behavior Contract

When the user taps, saves, syncs, changes page, edits content, opens a panel, presses a keyboard key, or completes an onboarding step, WinGlows should use short, purposeful motion that visually belongs to the affected surface. The animation must communicate state, feedback, continuity, or physicality without changing the underlying data behavior, blocking the user, causing layout shifts, creating infinite motion, or hiding errors. If animation is disabled or not supported, the same state changes must remain understandable through static layout, labels, color, and status. The easy edge case to miss is the keyboard: glow, shake, relief, and special effects must transform the actual key surface/cube, not a detached decorative layer above it.

## Success Behavior

- Bottom navigation icons animate on selection or repeated tap with fixed-size, non-jittering micro-motion.
- Product-page summary cards animate metric changes and status transitions without making dense information slower to scan.
- Primary actions show realistic pressed/loading/success/error feedback in the button itself.
- Sync and local/cloud status animations clearly distinguish loading, pending, local-only, synced, conflict, and error states.
- Empty states and list insert/remove/pin actions use restrained transitions that clarify what changed.
- Keyboard Preview and Keyboard Theme Studio render key effects as part of the key surface: a pressed 3D key moves as one object, glow follows the surface, shake moves the key body, and decorative effects remain physically attached.
- Onboarding permission progress uses motion to show step changes, granted/skipped/error states, and resume focus without adding noise.
- Page transitions are short and consistent, with no large decorative slide that makes repeated tab use feel slow.
- Animations stop quickly, are deterministic enough for widget tests, and do not break `pumpAndSettle`.
- The app remains usable and understandable if motion is reduced or unavailable.

## Error Behavior

- Animation failure must never prevent navigation, saving, sync, search, editing, or keyboard input.
- Loading animations must not imply success; they stop into a truthful status state.
- Error states must not be softened into ambiguous success-looking motion.
- Disabled or unavailable actions must not animate like successful actions.
- Reduced-motion mode must shorten or remove non-essential animation while preserving essential state feedback.
- The keyboard must not animate layers independently in a way that makes a glow ray, shadow, or relief face drift away from the key body.
- Infinite or repeating animations are allowed only for active progress states and must stop when the state resolves.
- If an animation causes overflow, clipped text, layout shift, lost focus, test flakiness, or measurable frame jank, the implementation is invalid until corrected.

## Problem

WinGlows is gaining more visual polish, but the animations are not yet organized as a product language. Some surfaces now have motion, others are static, and keyboard effects risk feeling like low-quality overlays when the animated effect is not integrated into the surface that users interact with. The app needs a shared motion contract so future animations support clarity, physicality, and trust instead of becoming scattered decoration.

## Solution

Create a lightweight motion system for the Flutter app: shared timing/easing tokens, reusable motion primitives, and surface-specific rollout rules. Implement animations in prioritized batches: navigation, product-page feedback, sync/status, lists/empty states, onboarding, and keyboard physical effects. The keyboard gets a stricter physical model: effects are attached to the key geometry, and 3D relief press moves the whole cube consistently.

## Scope In

- Define shared app motion tokens for duration, curve, scale, offset, opacity, and reduced-motion behavior.
- Add reusable Flutter motion primitives for icon pulses, press feedback, status transitions, metric value changes, list item entrance/removal, panel transitions, and reduced-motion gating.
- Formalize and refine bottom-navigation icon animations already started in `lib/features/shell/presentation/app_shell_screen.dart`.
- Animate product-page summary metrics and status pills in `ProductSummaryStrip`, `AppMetricPill`, and `AppSyncStatusAction`.
- Animate primary action buttons and save/import/sync actions where busy/success/error states already exist.
- Animate search/filter opening, empty/search-empty states, list insertion/removal, and pinned-state feedback on Voix, Papiers, Snippets, and Dico.
- Animate local/cloud sync states without confusing integration status with proven data sync.
- Animate onboarding permission step changes, skipped/granted/error statuses, and resume focus.
- Upgrade Keyboard Preview and Keyboard Theme Studio effects so key press, glow, shake, relief, and optional electric/spark effects are integrated into the key surface.
- Add tests and visual smoke validation for animation determinism, layout stability, narrow mobile rendering, and reduced-motion behavior.
- Update component documentation when motion primitives become part of the shared UI vocabulary.

## Scope Out

- No new third-party animation package unless `sf-ready` or implementation proves Flutter built-ins cannot meet the quality bar.
- No local Android build, APK packaging, Gradle task, or Android install validation on this VM.
- No backend sync algorithm changes, auth changes, data migration, pricing, or entitlement behavior.
- No marketing-site animation work in `winglowz_site`.
- No animated illustration library, Lottie asset pipeline, or downloaded icon pack as the default path.
- No full redesign of the pages already covered by `winglowz-product-pages-ux-remaster.md`.
- No native Android IME rendering change unless the Keyboard Preview/Theme Studio implementation proves a required parity issue; native IME behavior remains a separate physical-device/CI validation track.

## Constraints

- Follow WinGlows guardrails: local validation is limited to `flutter analyze`, `flutter test`, and targeted `flutter test ...`.
- Use Flutter built-ins first: `AnimatedSwitcher`, `AnimatedContainer`, `TweenAnimationBuilder`, `AnimationController`, `AnimatedBuilder`, `AnimatedOpacity`, `AnimatedScale`, and `AnimatedSlide` where appropriate.
- Keep all animated containers at stable dimensions when they live in toolbars, bottom bars, summary strips, keyboard rows, or fixed grids.
- Animations must be short by default: navigation and tap feedback under 300ms, state transitions generally under 400ms, active progress loops only while a real progress state is active.
- Motion must respect accessibility expectations: reduced-motion support, no excessive flashing, no reliance on color-only feedback, and no focus stealing.
- Preserve existing data actions, sync truthfulness, local/cloud boundaries, and privacy-sensitive clipboard behavior.
- Keep user-facing French natural and concise; avoid in-app explanatory text about the animation system.
- Do not introduce decorative orbs, heavy gradients, or motion that competes with the task UI.
- Prefer a small set of primitives over one over-configured motion component.

## Test Contract

- Surface: Flutter shared UI, Material components, keyboard preview/studio, Vercel Flutter web smoke, no native Android local build.
- Proof profile: automated widget/static proof first, Vercel Flutter web visual smoke for polish and clipping, human product-feel review before final acceptance.
- Proof order:
  1. Static and focused automated proof after the shared primitives: `flutter analyze` plus targeted motion primitive tests.
  2. Batch proof after each migrated surface: shell, product-page components, onboarding, and keyboard preview/studio tests listed below.
  3. Broad automated proof: `flutter test` after the rollout is complete.
  4. Web smoke proof: deployed Vercel Flutter web app at `https://app.winglowz.com/` on mobile common `390x844` plus desktop/narrow width.
  5. Manual proof: Diane validates professional feel, keyboard surface attachment, and absence of motion noise.
- Checklist path: no separate checklist artifact is required for this ready gate. If implementation touches native Android IME rendering, create `shipglows_data/workflow/test-checklists/winglowz-motion-system-and-interaction-animations.md` before device QA.
- Required automated proof:
  - `flutter analyze`
  - targeted tests for shared motion primitives
  - `flutter test test/widget_test.dart`
  - `flutter test test/app_page_action_bar_test.dart`
  - `flutter test test/page_scoped_search_test.dart`
  - `flutter test test/keyboard_theme_studio_screen_test.dart`
  - targeted Keyboard Preview tests already covering key press/panels when the keyboard surface changes
- Broad proof before handoff: `flutter test` after motion primitives and app surfaces are migrated.
- Browser proof required before asking Diane for product-feel QA: Vercel Flutter web smoke on `https://app.winglowz.com/` at mobile common `390x844` and desktop/narrow web width.
- Manual proof required:
  - Diane verifies that motion feels professional and not decorative.
  - Diane verifies keyboard effects feel attached to the key surface/cube.
  - Diane verifies no page becomes slower or noisier to use.
- Required scenario IDs:
  - `WFZ-MOTION-001`: bottom bar icons animate on tab selection and repeated active-tab tap without layout shift.
  - `WFZ-MOTION-002`: product summary metric changes animate without wrapping, overflow, or losing one-row density.
  - `WFZ-MOTION-003`: sync/status animations stop in the correct truthful final state.
  - `WFZ-MOTION-004`: primary buttons show pressed/loading/success/error feedback without truncating labels.
  - `WFZ-MOTION-005`: list insert/remove/pin transitions preserve focus and do not reorder unrelated content.
  - `WFZ-MOTION-006`: onboarding step transitions remain understandable with motion reduced.
  - `WFZ-MOTION-007`: Keyboard Preview press moves the whole 3D key body as one object.
  - `WFZ-MOTION-008`: Keyboard Preview glow and shake are attached to the key surface, not a floating overlay.
  - `WFZ-MOTION-009`: no animation introduces an infinite ticker that blocks widget tests.
  - `WFZ-MOTION-010`: Vercel web smoke shows no clipped bottom-bar labels, no broken page transitions, and no console runtime exception.
- Exception with proof: external documentation freshness is not required for the ready gate because the spec uses local Flutter animation APIs and existing app architecture. If implementation adds a third-party animation package, `sf-ready`/`sf-start` must consult official docs before adoption.
- Exception without proof: local Android APK validation is forbidden by repository guardrails and must stay on CI/physical-device channels if native behavior enters scope.

## Readiness Decisions

- Reduced motion v1 relies on platform/media accessibility state and app-level motion gating in the shared primitives. Do not add a new user-facing WinGlows reduced-motion setting in this chantier.
- Keyboard electric/spark effects are optional implementation details, not a required user-selectable Keyboard Studio feature in this chantier. If included, they must be finite, restrained, physically attached to the key body, and covered by keyboard preview tests.
- Bottom-tab page transitions should stay instant or extremely short. Prefer component-local transitions and feedback over a global decorative tab-slide system.
- Fresh external docs verdict: `fresh-docs not needed` for the ready gate because this spec uses local Flutter built-ins and existing app architecture. If a third-party animation package, native Android API change, or platform-specific accessibility API is introduced, the implementation must stop and run the Documentation Freshness Gate before adoption.

## Dependencies

- `lib/core/theme/app_theme.dart`: existing theme metrics and a likely home for app-level motion metrics.
- `lib/core/theme/winglowz_theme_tokens.dart`: existing token layer with animation-related values.
- `lib/core/widgets/app_components.dart`: shared product-page components, summary strip, metric pills, status actions, empty states, action bars.
- `lib/features/shell/presentation/app_shell_screen.dart`: app shell and bottom navigation animated icons.
- `lib/features/voice/presentation/voice_screen.dart`: voice page status, summary, capture controls, and existing voice waveform-style animations.
- `lib/features/clipboard/presentation/clipboard_screen.dart`: Papiers page summaries, clipboard item list, private/sensitive state, add/pin/delete actions.
- `lib/features/snippets/presentation/snippets_screen.dart`: Snippets page form, search, list, and keyboard-rule bridge actions.
- `lib/features/dictionary/presentation/dictionary_screen.dart`: Dico page form, search, list, and keyboard-rule bridge actions.
- `lib/features/settings/presentation/settings_screen.dart`: settings navigation, theme studio entry, onboarding resume.
- `lib/features/settings/presentation/settings_screen_sections.dart`: settings sections and action rows.
- `lib/features/keyboard/presentation/keyboard_preview_screen.dart`: keyboard simulator state and key press handling.
- `lib/features/keyboard/presentation/keyboard_preview_widgets.dart`: keyboard key geometry and visual effects.
- `lib/features/keyboard/presentation/keyboard_theme_studio_screen.dart`: theme studio controls and preview integration.
- `test/widget_test.dart`, `test/app_page_action_bar_test.dart`, `test/page_scoped_search_test.dart`, `test/keyboard_theme_studio_screen_test.dart`: core test surfaces.
- `docs/COMPONENTS.md`: documentation target if shared motion primitives are added.

## Invariants

- Motion is feedback, not decoration.
- Animated UI must preserve the same semantic state and action result as static UI.
- A component with a fixed role in navigation, toolbar, summary, or keyboard grid must keep stable size during animation.
- Sync motion must never claim data is synced unless the status source proves that exact data scope is synced.
- Clipboard motion must not reveal private clipboard content.
- Keyboard effects must be geometrically attached to the key body.
- Repeated taps may replay feedback, but they must not enqueue long animation chains.
- Reduced-motion behavior must remain understandable.

## Links & Consequences

- The current bottom-bar animated icon work becomes the first implementation slice but may need extraction into a shared primitive before broader rollout.
- `winglowz-product-pages-ux-remaster.md` remains the structural source of truth for page layout; this spec layers motion on top of that structure.
- `keyboard-physical-key-relief.md` remains the source of truth for key geometry and physical relief; this spec adds animation and effect integration requirements.
- Product-page tests may need more stable finders/keys if animations introduce transient widgets.
- Browser screenshots and manual review matter because “professional motion” cannot be fully proven by unit tests.
- Motion tokens become part of the design system and should be documented once stabilized.

## Documentation Coherence

- Update `docs/COMPONENTS.md` when shared motion primitives, timing tokens, or reduced-motion behavior become reusable contracts.
- Add or update a short section in the relevant keyboard/studio docs if keyboard effects get new named modes such as glow, shock, pulse, or electric arc.
- No marketing-site copy update is required because this is app behavior, not a public promise yet.
- No privacy/security docs update is required unless implementation changes clipboard visibility, telemetry, sync status semantics, or native Android behavior.

## Edge Cases

- Repeated tap on the active bottom-tab should replay a short pulse but not navigate, reset state, or schedule unrelated side effects beyond the existing tab-specific refresh/sync behavior.
- Long labels such as `Réglages`, `Snippets`, and `Papiers` must not be clipped by animated icon size.
- Summary cards with four metrics must remain one row where the product-pages remaster requires it.
- Progress loops must stop when a future completes, errors, or is canceled.
- Animations must not swallow gestures, break long press, or change hit target geometry.
- Widget tests using `pumpAndSettle` must not hang because of active infinite controllers.
- Reduced-motion mode must not leave widgets in a half-animated visual state.
- Keyboard 3D relief corners must not reveal gaps when radius and relief depth are both active.
- Glow, shake, electric arc, and spark effects must use the key's animated transform, not an independent overlay coordinate.
- Dark/light theme color contrast must stay readable during transitional opacity.

## Implementation Tasks

- [ ] Task 1: Define app motion tokens.
  - File: `lib/core/theme/app_theme.dart` and/or `lib/core/theme/winglowz_theme_tokens.dart`
  - Action: Add named durations, curves, scale amplitudes, and reduced-motion access pattern for app motion.
  - User story link: Gives the app a coherent motion language instead of scattered constants.
  - Depends on: None.
  - Validate with: `flutter analyze`.
  - Notes: Keep tokens small and practical; do not introduce a large design-token framework.

- [ ] Task 2: Extract shared motion primitives.
  - File: new `lib/core/widgets/app_motion.dart` or a focused section in `lib/core/widgets/app_components.dart`
  - Action: Add reusable primitives for icon pulse, press feedback, status switch, metric change, and reduced-motion gating.
  - User story link: Makes professional motion reusable across app surfaces.
  - Depends on: Task 1.
  - Validate with: targeted widget tests for finite animations and stable layout.
  - Notes: Prefer Flutter built-ins; avoid third-party packages unless formally justified.

- [ ] Task 3: Normalize bottom-bar animated icons.
  - File: `lib/features/shell/presentation/app_shell_screen.dart`
  - Action: Replace local ad hoc animation logic with the shared icon motion primitive while preserving current labels and repeated-tap replay.
  - User story link: Keeps navigation polished and consistent.
  - Depends on: Task 2.
  - Validate with: `flutter test test/widget_test.dart`.

- [ ] Task 4: Animate summary metrics and status actions.
  - File: `lib/core/widgets/app_components.dart`
  - Action: Add finite value/status transitions to `ProductSummaryStrip`, `AppMetricPill`, and `AppSyncStatusAction` without changing dimensions.
  - User story link: Makes state changes legible on product pages.
  - Depends on: Task 2 and product-pages layout invariants.
  - Validate with: `flutter test test/app_page_action_bar_test.dart` and `flutter test test/page_scoped_search_test.dart`.

- [ ] Task 5: Add action-button feedback.
  - File: `lib/core/widgets/app_components.dart` plus page files using primary actions.
  - Action: Add pressed/loading/success/error feedback patterns for save, import, refresh, sync, and create actions.
  - User story link: Makes interactions feel immediate and truthful.
  - Depends on: Task 2.
  - Validate with: targeted page tests covering busy/error states.

- [ ] Task 6: Animate product-page lists and empty states.
  - Files: `lib/features/voice/presentation/voice_screen.dart`, `lib/features/clipboard/presentation/clipboard_screen.dart`, `lib/features/snippets/presentation/snippets_screen.dart`, `lib/features/dictionary/presentation/dictionary_screen.dart`
  - Action: Add restrained insert/remove/pin/search-empty transitions that preserve focus, order, privacy, and page density.
  - User story link: Makes data changes understandable without page noise.
  - Depends on: Tasks 2 and 4.
  - Validate with: page-specific widget tests and `flutter test test/page_scoped_search_test.dart`.

- [ ] Task 7: Animate onboarding permission progress.
  - Files: `lib/features/shell/presentation/app_shell_screen.dart`, onboarding widgets in existing settings/shell files
  - Action: Add finite transitions for active step, granted, skipped, error, and resume focus states.
  - User story link: Clarifies setup progress and recovery.
  - Depends on: Task 2.
  - Validate with: onboarding-related cases in `flutter test test/widget_test.dart` and `flutter test test/onboarding_permission_contract_test.dart`.

- [ ] Task 8: Build keyboard-surface effect integration.
  - Files: `lib/features/keyboard/presentation/keyboard_preview_widgets.dart`, `lib/features/keyboard/presentation/keyboard_preview_screen.dart`, `lib/features/keyboard/presentation/keyboard_theme_studio_screen.dart`
  - Action: Attach press, glow, shake, spark/electric, and relief motion to the key geometry so effects move with the key body.
  - User story link: Makes keyboard effects feel excellent instead of pasted on top.
  - Depends on: Task 1 and `keyboard-physical-key-relief.md` geometry contract.
  - Validate with: `flutter test test/keyboard_theme_studio_screen_test.dart` and targeted Keyboard Preview tests.
  - Notes: If native IME parity is required later, split that into a separate Android/CI/device task.

- [ ] Task 9: Add reduced-motion behavior and test coverage.
  - Files: shared motion primitive tests and affected component tests.
  - Action: Ensure non-essential motion shortens or disables cleanly while visible state remains understandable.
  - User story link: Preserves accessibility and reliability.
  - Depends on: Tasks 1 and 2.
  - Validate with: targeted widget tests using reduced-motion media/query or app-level motion flag.

- [ ] Task 10: Document motion primitives and validation rules.
  - File: `docs/COMPONENTS.md`
  - Action: Document motion tokens, allowed primitives, when to animate, when not to animate, and keyboard surface rules.
  - User story link: Keeps future animations consistent and maintainable.
  - Depends on: Stabilized implementation.
  - Validate with: docs diff review and `flutter analyze` unaffected.

- [ ] Task 11: Run full validation and browser smoke.
  - Files: no source edits unless defects are found.
  - Action: Run required Flutter checks, then verify Vercel Flutter web at `https://app.winglowz.com/` after deployment.
  - User story link: Confirms the motion system holds up across real app surfaces.
  - Depends on: Implementation tasks.
  - Validate with: Test Contract proof list and screenshots/notes.

## Acceptance Criteria

- [ ] CA 1: Given the user taps any bottom-bar destination, when the destination changes, then the icon animates briefly without shifting labels or bar height.
- [ ] CA 2: Given the user taps the active bottom-bar destination again, when existing page-specific refresh behavior runs, then the icon replays feedback without resetting unrelated page state.
- [ ] CA 3: Given a product-page metric value changes, when the page rebuilds, then the value transition is visible but the summary row keeps its layout.
- [ ] CA 4: Given a sync action is loading, pending, local-only, synced, conflict, or error, when the status changes, then animation resolves to the exact truthful final state.
- [ ] CA 5: Given a primary action starts and finishes, when it succeeds or fails, then the button shows immediate feedback and an honest final state without clipping text.
- [ ] CA 6: Given an item is added, removed, pinned, or filtered, when the list updates, then the changed item is visually traceable and focus/order are preserved.
- [ ] CA 7: Given onboarding advances or resumes, when a step changes status, then motion clarifies active/granted/skipped/error state and reduced motion remains understandable.
- [ ] CA 8: Given the keyboard preview is in 3D relief mode, when a key is pressed, then the whole key body moves consistently and the top relief face does not float independently.
- [ ] CA 9: Given glow or shake is enabled for a keyboard key, when the key is pressed, then the glow/shake follows the key surface rather than moving as a separate overlay.
- [ ] CA 10: Given reduced motion is active, when the same interactions occur, then the app remains understandable without non-essential movement.
- [ ] CA 11: Given widget tests call `pumpAndSettle`, when animated components are present, then tests complete without hanging on infinite animations.
- [ ] CA 12: Given the deployed Flutter web app is opened at mobile width, when each main page is visited, then no critical button or nav label is clipped and no console runtime exception appears.

## Test Strategy

- Start with motion primitives and deterministic widget tests before applying animations across pages.
- Use targeted tests for the shell, product-page components, page scoped search, onboarding, and keyboard studio after each affected batch.
- Run `flutter analyze` after each batch.
- Run `flutter test` before implementation handoff.
- Use Vercel Flutter web smoke for visual proof because animation quality, clipping, and perceived professional polish need browser evidence.
- Reserve Android physical-device QA for any native IME or platform behavior touched outside the Flutter preview/studio layer.

## Risks

- Medium UX risk: too much motion can make a productivity app feel slower or less serious.
- Medium test risk: repeating or uncontrolled animations can make widget tests flaky or block `pumpAndSettle`.
- Medium layout risk: animated icons or summary cards can cause clipped labels on compact mobile widths.
- Medium keyboard-quality risk: effects may still feel like overlays unless the key geometry owns the transform.
- Low security risk: no data/auth/permission behavior should change. Risk increases if implementation touches clipboard content visibility or sync semantics.
- Medium performance risk: too many simultaneous animations on lists or keyboard rows can cause frame jank on lower-end Android devices.

## Execution Notes

- Read first:
  - `lib/core/widgets/app_components.dart`
  - `lib/core/theme/app_theme.dart`
  - `lib/features/shell/presentation/app_shell_screen.dart`
  - `lib/features/keyboard/presentation/keyboard_preview_widgets.dart`
  - `lib/features/keyboard/presentation/keyboard_theme_studio_screen.dart`
- Implement in small batches. Do not animate every listed surface in one diff.
- Keep the bottom-bar animation already implemented as evidence, but extract it only when the shared primitive proves cleaner.
- For keyboard effects, start from geometry and transforms, then add glow/spark/shake as children of the transformed key body.
- Use keys/finders in tests where transient animation widgets make text/icon finders ambiguous.
- Stop and reroute if a desired keyboard animation needs native Android IME rendering changes; that requires CI/device validation outside this spec's default local proof path.
- Fresh external docs: not needed for Flutter built-ins already used locally. Required only if a new animation package or platform-specific API is introduced.

## Open Questions

None.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-06-10 20:12:43 UTC | sf-spec | GPT-5 Codex | Created motion-system spec from user request and current Flutter UI context. | Draft saved. | `/sf-ready WinGlows Motion System and Interaction Animations` |
| 2026-06-10 20:18:30 UTC | sf-ready | GPT-5 Codex | Reviewed readiness, resolved open motion-priority questions, tightened proof contract, and versioned dependent specs. | Ready. | `/sf-start shipglows_data/workflow/specs/winglowz-motion-system-and-interaction-animations.md` |

## Current Chantier Flow

- sf-spec: draft saved
- sf-ready: ready
- sf-start: not launched
- sf-verify: not launched
- sf-end: not launched
- sf-ship: not launched

Next command: `/sf-start shipglows_data/workflow/specs/winglowz-motion-system-and-interaction-animations.md`
