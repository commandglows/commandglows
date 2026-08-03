---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-28"
created_at: "2026-05-28 19:36:12 UTC"
updated: "2026-06-09"
updated_at: "2026-06-09 14:54:38 UTC"
status: ready
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "ui-coherence-localization-audit-fix"
owner: "Diane"
confidence: high
user_story: "En tant qu'utilisatrice WinGlows Android et web, je veux une interface cohérente, lisible, tactilement fiable et naturellement localisée, afin de configurer mon clavier, mes snippets, mon clipboard et mes réglages sans friction ni impression de prototype."
risk_level: "medium"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "WinGlows Flutter app"
  - "Flutter Material theme"
  - "Shared AppTheme/AppComponents"
  - "Clipboard screen"
  - "Snippets screen"
  - "Dictionary screen"
  - "Settings screen"
  - "Keyboard Theme Studio"
  - "Vercel Flutter web app"
  - "Android physical-device QA"
depends_on:
  - artifact: "shipglows_data/business/branding.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/business/product.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "CLAUDE.md"
    artifact_version: "1.2.0"
    required_status: "reviewed"
  - artifact: "AGENTS.md"
    artifact_version: "0.1.0"
    required_status: "draft"
  - artifact: "shipglows_data/workflow/specs/settings-driven-design-system.md"
    artifact_version: "0.1.0"
    required_status: "implementation"
supersedes: []
evidence:
  - "sf-audit-design 2026-05-28 found touch targets below mobile accessibility norms in lib/core/theme/app_theme.dart:215 and lib/core/theme/app_theme.dart:220."
  - "sf-audit-design 2026-05-28 found mixed French and English UI labels in lib/features/clipboard/presentation/clipboard_screen.dart:345, lib/features/snippets/presentation/snippets_screen.dart:259, and lib/features/dictionary/presentation/dictionary_screen.dart:266."
  - "sf-audit-design 2026-05-28 found token provenance drift from legacy video-app references in lib/core/theme/winglowz_theme_tokens.dart:3 and Settings copy claiming WinGlows/Flowz tokens in lib/features/settings/presentation/settings_screen_sections.dart:127."
  - "sf-audit-design 2026-05-28 found Settings IA overload across account, appearance, backend diagnostics, local AI keys, platform status, keyboard, overlay, and voice packs."
  - "sf-audit-design 2026-05-28 found bare empty states in shared AppEmptyStateCard and CRUD screens."
next_step: "/sf-end shipglows_data/workflow/specs/winglowz-app-ui-coherence-localization-cleanup.md"
---

# Title

WinGlows App UI Coherence and Localization Cleanup

## Status

Ready. Created from the `sf-audit-design` P2 chantier potential on 2026-05-28 and passed readiness review on 2026-05-28.

## User Story

En tant qu'utilisatrice WinGlows Android et web, je veux une interface cohérente, lisible, tactilement fiable et naturellement localisée, afin de configurer mon clavier, mes snippets, mon clipboard et mes réglages sans friction ni impression de prototype.

## Minimal Behavior Contract

The Flutter app must present the main shared UI surfaces with a coherent WinGlows-owned design system, minimum safe touch geometry, consistent French-facing copy where the surrounding flow is French, clearer Settings progressive disclosure, and useful first-run empty states. When a control is disabled, unavailable on the current platform, or delegated to Android-native behavior, the UI must explain the state without exposing raw debug wording to regular users. The easy edge case to miss is preserving advanced diagnostics and Android-native controls for power users while keeping the default Settings experience understandable for non-technical users.

## Success Behavior

- Primary touch controls in shared app UI meet a safe mobile target baseline, with compact exceptions documented and visually intentional.
- Clipboard, Snippets, Dictionary, Settings, auth-adjacent messages, destructive dialogs, and empty states use natural French on French-facing surfaces.
- English labels remain only where they are product names, technical identifiers, provider names, or intentionally developer-facing diagnostics.
- Design token naming and comments clearly identify WinGlows/Flowz ownership while preserving any imported lineage needed for traceability.
- Settings separates normal user controls from advanced/backend/debug areas through progressive disclosure, section naming, and explanatory copy.
- Empty states teach the next useful action, include concrete examples where helpful, and avoid dead-end placeholder copy.
- Shared Flutter web smoke and targeted widget tests cover the changed shared UI paths before any APK handoff.

## Error Behavior

- Platform-unavailable controls should remain visible only when useful, disabled with explanatory copy, or moved to an advanced/platform section.
- If changing shared token sizes creates layout overflow, the implementation must adjust the affected shared components rather than lowering touch targets globally.
- If a translated string risks changing a technical meaning, prefer a clear French explanation plus the stable technical term in parentheses.
- Diagnostics and secure-storage warnings must remain accurate; the cleanup must not hide real security, privacy, permission, or backend degradation states.

## Problem

The app has a functional component vocabulary and token layer, but the product experience still reads as uneven: some frequent controls are below mobile touch-target norms, several CRUD flows mix English labels inside French UI, Settings exposes too much backend/debug vocabulary at the same level as normal user preferences, token comments still reference legacy video app while the UI claims WinGlows/Flowz coherence, and first-run empty states are too bare to guide users. This creates a prototype impression on flows that are central to the Android keyboard and productivity promise.

## Solution

Implement a bounded design cleanup across shared Flutter UI foundations and the high-frequency screens identified by the audit. Treat this as a product-coherence pass, not a full redesign: fix token ownership, minimum touch metrics, localization consistency, Settings information architecture, and empty-state guidance while preserving existing app structure and Android-native validation boundaries.

## Scope In

- Shared design tokens and metrics in `lib/core/theme/app_theme.dart`.
- Theme provenance and naming/comments around `lib/core/theme/winglowz_theme_tokens.dart`.
- Shared UI building blocks in `lib/core/widgets/app_components.dart`.
- French-facing labels, helper copy, messages, dialogs, and empty states in:
  - `lib/features/clipboard/presentation/clipboard_screen.dart`
  - `lib/features/snippets/presentation/snippets_screen.dart`
  - `lib/features/dictionary/presentation/dictionary_screen.dart`
  - `lib/features/settings/presentation/settings_screen.dart`
  - `lib/features/settings/presentation/settings_screen_sections.dart`
  - `lib/features/auth/presentation/sign_in_screen.dart` when touched by copy consistency
- Settings section ordering, labels, and progressive disclosure for default vs advanced/debug controls.
- Keyboard Theme Studio entry-point copy and state messaging where it affects Settings coherence.
- Targeted widget tests for changed shared Flutter surfaces.
- Documentation updates only when naming/token provenance or QA expectations change.

## Scope Out

- Full visual redesign of WinGlows.
- Native Android IME Canvas rendering changes unless a Flutter setting/copy change requires a bridge label update.
- New settings persistence schema unless unavoidable for section disclosure state.
- Replacing Flutter Material components.
- Marketing site redesign or `winglowz_site` content changes.
- Broad accessibility audit beyond the touched UI paths.
- Android APK build, local Gradle tasks, or local Android install validation.

## Constraints

- Preserve the Android build guardrail: do not run Android builds, Gradle tasks, installs, packaging, or `flutter run -d android` locally.
- Use local checks only: `flutter analyze`, targeted `flutter test ...`, and broader `flutter test` when the implementation changes central shared UI.
- Treat pure Flutter UI as shared between web and Android; validate with widget tests first, then Vercel Flutter web smoke when requested.
- Keep user-facing French natural and accented.
- Do not add secrets or expose sensitive diagnostic details in screenshots, docs, tests, or examples.
- Preserve power-user access to backend diagnostics, local keys, keyboard sync, overlay, voice pack, and platform capability surfaces.
- Avoid weakening error, warning, security, or privacy copy just to make the interface feel simpler.

## Dependencies

- `shipglows_data/business/branding.md@1.0.0`: brand voice is practical, calm, direct, Windows-first, bilingual; no hype or unsupported claims.
- `shipglows_data/business/product.md@1.0.0`: target users need coherent workflow support, not fragmented tool tips.
- `CLAUDE.md@1.2.0`: validation/deployment guardrails for Flutter web, Android-native QA, and local command limits. Note: `next_review: 2026-05-26` is stale and should be refreshed separately.
- `AGENTS.md@0.1.0`: local command and commit guardrails.
- `settings-driven-design-system.md@0.1.0`: overlapping implementation context for settings-driven appearance coherence.
- Fresh external docs: not needed. The work is internal Flutter UI/copy/token cleanup using existing project patterns, not a framework, SDK, auth, routing, build, migration, or external integration decision.

## Invariants

- The app must keep remote/local auth behavior unchanged.
- Clipboard sensitive-content confirmation must remain visible and explicit.
- Destructive-action confirmations must remain controllable through existing settings.
- Disabled controls must still communicate why the action is unavailable.
- Advanced diagnostics must remain accessible for support/debug flows.
- Shared token changes must not silently shrink keyboard preview or other Android-relevant controls below the current usability baseline.
- Existing navigation tabs and primary feature areas remain: Voice, Clipboard, Snippets, Dictionary, Settings.

## Links & Consequences

- Accessibility: raising touch targets can affect list density, Settings layout, and small screens; update shared components rather than reverting to undersized controls.
- Localization: copy changes affect tests that assert labels, button text, and validation messages.
- Product coherence: token provenance cleanup should align app docs and comments with WinGlows/Flowz, without hiding historical imported token lineage.
- Security/privacy: Settings and local AI key copy must remain clear about secure storage limitations and local-only storage.
- QA: shared Flutter UI changes need widget tests and web smoke before Android physical-device QA is requested.
- Documentation: if token naming or Settings structure changes materially, update the relevant app docs or verification notes.

## Documentation Coherence

- Update `docs/COMPONENTS.md` if it exists and describes shared app components, touch targets, tokens, or Settings sections.
- Update `docs/VERIFICATION.md` if UI QA expectations, Vercel smoke coverage, or widget-test paths change.
- Update `CLAUDE.md` only if validation guardrails or reviewed metadata are intentionally refreshed as part of a docs pass.
- Do not update marketing/public claims unless the user explicitly asks for cross-project site alignment.

## Edge Cases

- A compact control may be visually acceptable but fail touch ergonomics on Android; prefer `48dp` for common controls and document any smaller intentional exceptions.
- Text expansion labels such as "snippet" may be product vocabulary; decide per label whether to keep the technical term or translate the surrounding phrase.
- Backend diagnostics may be English because logs and provider states are technical; wrap them in French section labels and explanations where user-visible.
- Long French labels can overflow segmented controls, list tiles, dialogs, and narrow web/mobile layouts.
- Empty states must work for both first install and authenticated-but-empty accounts.
- Platform capability copy must not imply Android-native features work on web.
- Keyboard Theme Studio can be simulation-only on web; copy must make that state explicit.
- Product vocabulary decision: keep `snippet` as the product term in French-facing UI, but introduce it with a short French explanation such as `snippet (raccourci texte)` on first-use, empty-state, and form-help surfaces. Do not rename domain models or code identifiers to `raccourci`.
- Settings disclosure decision: advanced/support sections default collapsed on every platform, including debug and local development builds, unless an existing persisted user preference explicitly opens them. Debug/development builds may expose clearer diagnostic labels inside the advanced section, but must not change the default disclosure model.

## Implementation Tasks

- [ ] Task 1: Normalize shared touch metrics
  - File: `lib/core/theme/app_theme.dart`
  - Action: Raise shared minimum interactive metrics for buttons/icons to a safe mobile baseline, add explicit compact metrics only where intentional, and adjust shared insets if needed.
  - User story link: reliable, tactilely safe configuration and CRUD actions.
  - Depends on: none.
  - Validate with: targeted widget tests for shared buttons/list actions and manual layout review on narrow Flutter web.
  - Notes: Do not reduce global targets to preserve dense layouts; fix density at component/layout level.

- [ ] Task 2: Rename or clarify token provenance
  - File: `lib/core/theme/winglowz_theme_tokens.dart`
  - Action: Update comments/class naming strategy or introduce WinGlows-facing wrappers so the active design-system language clearly belongs to WinGlows/Flowz while preserving source lineage where useful.
  - User story link: coherent product identity and maintainable design decisions.
  - Depends on: Task 1 if shared metrics move.
  - Validate with: `flutter analyze`.
  - Notes: Avoid broad import churn unless the class rename is intentionally part of the implementation.

- [ ] Task 3: Strengthen shared empty-state and list components
  - File: `lib/core/widgets/app_components.dart`
  - Action: Extend `AppEmptyStateCard` or add a richer shared empty-state component with title, message, optional example, optional action, and accessible icon semantics where appropriate.
  - User story link: first-run guidance without dead-end screens.
  - Depends on: Task 1.
  - Validate with: widget tests for empty-state rendering and action behavior.
  - Notes: Keep the existing simple constructor or migrate call sites safely.

- [ ] Task 4: Localize Clipboard screen UX copy
  - File: `lib/features/clipboard/presentation/clipboard_screen.dart`
  - Action: Replace mixed English labels/actions/messages with natural French where the flow is French; improve sensitive-content warning, add-item action, search, list headings, empty/search-empty states, and destructive dialog copy.
  - User story link: coherent French clipboard workflow.
  - Depends on: Task 3.
  - Validate with: targeted clipboard widget tests covering add disabled/enabled state, sensitive notice, search empty state, and destructive dialog labels.
  - Notes: Keep stable enum/provider names in code; this task is UI copy, not domain renaming.

- [ ] Task 5: Localize Snippets screen UX copy
  - File: `lib/features/snippets/presentation/snippets_screen.dart`
  - Action: Localize add/edit/delete labels, field labels, empty state, success/error messages where user-facing, and destructive dialog copy.
  - User story link: coherent snippet management.
  - Depends on: Task 3.
  - Validate with: targeted snippets widget tests for empty state, add form, edit dialog, and delete dialog labels.
  - Notes: Keep `snippet` as the product term. On first-use and helper surfaces, explain it in French as `snippet (raccourci texte)`; surrounding labels and messages must be French and consistent.

- [ ] Task 6: Localize Dictionary screen UX copy
  - File: `lib/features/dictionary/presentation/dictionary_screen.dart`
  - Action: Localize add/edit/delete labels, field labels, case-sensitive wording, empty state, messages, and destructive dialog copy.
  - User story link: coherent personal dictionary management.
  - Depends on: Task 3.
  - Validate with: targeted dictionary widget tests for empty state, add form, edit dialog, and delete dialog labels.
  - Notes: Make `caseSensitive` display human-readable instead of raw camelCase debug text.

- [ ] Task 7: Rework Settings default vs advanced information architecture
  - File: `lib/features/settings/presentation/settings_screen.dart`
  - Action: Reorder and group sections so account, appearance, keyboard essentials, and onboarding are primary; backend diagnostics, local AI keys, platform status, overlay internals, and logs are advanced/support sections.
  - User story link: normal users can configure the app without parsing admin/debug surfaces.
  - Depends on: Tasks 1 and 2.
  - Validate with: targeted Settings widget tests for visible primary sections, advanced section expansion, and unchanged callbacks.
  - Notes: Preserve all existing capabilities; this is IA/progressive disclosure, not feature removal. Advanced/support sections default collapsed on all platforms, including debug/local development, unless an existing persisted user preference explicitly opens them.

- [ ] Task 8: Localize Settings section copy and advanced diagnostics framing
  - File: `lib/features/settings/presentation/settings_screen_sections.dart`
  - Action: Localize section titles, descriptions, button labels, unavailable-state copy, and diagnostics framing while keeping technical log text selectable and exact.
  - User story link: clear, trustworthy configuration in the user's language.
  - Depends on: Task 7.
  - Validate with: targeted Settings widget tests for labels and disabled/unavailable states.
  - Notes: Security and storage warnings must remain explicit.

- [ ] Task 9: Align auth and keyboard-theme entry copy where touched
  - File: `lib/features/auth/presentation/sign_in_screen.dart`
  - Action: Review only the labels/messages affected by the main localization pass and align tone with the rest of the app.
  - User story link: consistent account-entry experience.
  - Depends on: Tasks 4-8.
  - Validate with: existing or targeted auth widget tests.
  - Notes: Do not change auth behavior or error classification.

- [ ] Task 10: Update relevant docs if the implementation changes public development contracts
  - File: `docs/COMPONENTS.md`
  - Action: Document touch-target baseline, empty-state component, and Settings IA if this doc exists and covers app UI.
  - User story link: durable design-system maintenance.
  - Depends on: Tasks 1-8.
  - Validate with: docs review; no runtime check required.
  - Notes: Skip if the file does not exist or is unrelated, and record that in the implementation report.

- [ ] Task 11: Add or update widget tests for shared UI paths
  - File: `test/`
  - Action: Add targeted tests for updated labels, empty states, Settings section disclosure, and disabled/unavailable states on changed screens.
  - User story link: prevent regressions in the UI coherence pass.
  - Depends on: Tasks 3-9.
  - Validate with: targeted `flutter test ...` paths for changed screens; run broader `flutter test` before APK handoff or broad UI release.
  - Notes: Prefer focused widget tests over brittle golden tests unless existing project practice already uses goldens.

## Acceptance Criteria

- Shared app UI no longer defines common button/icon targets below the agreed safe mobile baseline except documented compact exceptions.
- Clipboard, Snippets, Dictionary, and Settings no longer expose mixed English labels in normal French-facing flows, excluding intentional product/provider/technical terms.
- Settings has a clear default path for normal users and a separate advanced/support path for diagnostics and risky technical controls.
- Empty states on Clipboard, Snippets, and Dictionary include useful guidance and a next action or example.
- Token comments/names no longer imply legacy video app is the active app brand system.
- Security/privacy/degraded-storage copy remains explicit and accurate.
- Targeted widget tests pass for every changed primary screen.
- `flutter analyze` passes.
- No Android build, Gradle, install, or local APK validation is required or run locally.
- The UI keeps `snippet` as the product term and uses `snippet (raccourci texte)` where first-use explanation is needed.
- Settings advanced/support sections are collapsed by default on every platform while preserving access to diagnostics and power-user controls.

## Test Strategy

- Run `flutter analyze` after implementation.
- Run targeted widget tests for:
  - Clipboard add/search/empty/sensitive-warning/destructive-dialog UI.
  - Snippets add/edit/delete/empty UI.
  - Dictionary add/edit/delete/empty UI.
  - Settings primary sections, advanced disclosure, theme selector, secure-storage warning, and disabled platform controls.
  - Any changed auth copy path if touched.
- Run full `flutter test` before handing off a broad UI release or asking for Android APK QA.
- Use Vercel Flutter web smoke for shared Flutter UI when requested and before physical-device APK QA.
- Reserve Diane's physical-device Android QA for Android-native confirmation only after shared Flutter UI checks are complete.

## Risks

- Increasing shared touch targets can cause layout overflow in dense cards, dialogs, and bottom navigation.
- French labels may become longer than current layouts support.
- Over-simplifying Settings could hide support-critical diagnostics.
- Token rename/import cleanup could produce noisy diffs if not bounded.
- Tests may be brittle if they assert exact copy across too many unrelated widgets.
- The stale `CLAUDE.md` review date may reduce metadata confidence until refreshed.

## Execution Notes

- This chantier came from `sf-audit-design` with `Chantier potentiel: oui`, severity `P2`, and recommended spec `/sf-spec WinGlows app UI coherence and localization cleanup`.
- Keep the implementation bounded: fix coherence and usability debt, not the entire product visual language.
- Use existing app patterns first: `AppTheme`, `AppComponents`, `AppSectionCard`, Riverpod providers, and existing screen structure.
- Prefer small, reviewable changes per surface, but do not accept undersized touch targets or mixed-language UI for convenience.
- Fresh external documentation was not consulted because the spec does not depend on changed external framework/API behavior.
- First files to read before coding: `lib/core/theme/app_theme.dart`, `lib/core/theme/winglowz_theme_tokens.dart`, `lib/core/widgets/app_components.dart`, then the target screen files listed in `Scope In`.
- Validation commands for implementation: `flutter analyze`; targeted `flutter test ...` for each changed screen/component; full `flutter test` before broad UI handoff or APK QA request.
- Stop conditions before code: stop if implementation would require a new settings persistence schema, auth/session behavior changes, Android-native IME Canvas changes, local Gradle/Android build validation, or removal of diagnostics/power-user controls.
- Do not add new localization infrastructure in this chantier unless existing string placement makes the copy pass impossible; prefer direct copy cleanup in the touched widgets for this bounded pass.

## Open Questions

None.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-06-09 14:54:38 UTC | sf-build | GPT-5 Codex | Removed old-brand naming from active WinGlows app surfaces: renamed the active theme token file/class to `WinGlowzThemeTokens`, updated `AppTheme` imports/usages, deleted obsolete theme-reference assets, removed the legacy product id from the client allowlist, and cleaned active component/spec/exploration docs. Local proof: active app/spec `rg` scan found no old-brand matches; `dart format`, `flutter analyze`, targeted suite/theme tests, full `flutter test` (268 tests), `git diff --check`, and ShipGlows metadata lint passed. | implemented | `/sf-end shipglows_data/workflow/specs/winglowz-app-ui-coherence-localization-cleanup.md` after review. |
| 2026-06-01 22:59:07 UTC | sf-browser | GPT-5.5 Codex + Chromium/CDP fallback | Rechecked deployed Flutter web after user push. `https://winglowz-app.vercel.app/` still returned Vercel `404 DEPLOYMENT_NOT_FOUND`. `https://app.winglowz.com/` returned 200 and rendered the WinGlows sign-in screen in Chromium/CDP, but served `index/main.dart.js` from 2026-05-30 (`x-vercel-cache: HIT`) and Vercel CLI showed the new 2026-06-01 production deployment belongs to project `winglowz`, not `winglowz_app`. | partial | Redeploy or alias the Flutter app deployment, then rerun `sf-browser` on the confirmed app URL. |
| 2026-06-01 20:54:06 UTC | sf-build | gpt-5.3-codex subagent + Codex integration | Closed the remaining UI-coherence implementation slice for token provenance and density on Voice, Clipboard, Snippets, and Dictionary: clarified legacy video app seed naming as historical while mapping semantics to WinGlows, reduced excess vertical/card spacing, added responsive two-column form grouping where width allows, and reused `AppActionRail` for compact action groups. Local proof: `flutter analyze`, targeted UI/domain tests, full `flutter test`, and `git diff --check` passed. | implemented | /sf-end shipglows_data/workflow/specs/winglowz-app-ui-coherence-localization-cleanup.md |
| 2026-06-01 20:43:47 UTC | sf-verify | GPT-5 Codex | Verified the density slice against the spec contract: reviewed shared UI diff, added missing component documentation for `AppActionRail`/48dp baseline, reran `flutter analyze`, targeted toolbar/search widget tests, full `flutter test`, diff whitespace check, and metadata lint. Hosted Vercel smoke remains deferred until ship/prod because the current patch is unshipped and no APK handoff is requested. | verified | /sf-end shipglows_data/workflow/specs/winglowz-app-ui-coherence-localization-cleanup.md |
| 2026-06-01 09:34:33 UTC | sf-start | gpt-5.3-codex-spark subagent + Codex integration | Implemented a density slice: tightened shared screen/card/button spacing, raised common button targets to 48dp, added responsive `AppActionRail`, reduced Home card nesting, and compacted Settings action groups. Local proof: `flutter analyze`, `flutter test test/app_page_action_bar_test.dart test/page_scoped_search_test.dart`, and full `flutter test` passed. | implemented | /sf-verify shipglows_data/workflow/specs/winglowz-app-ui-coherence-localization-cleanup.md |
| 2026-05-29 23:58:11 UTC | sf-build | gpt-5-codex | Harmonized French-facing copy in shell navigation, voice screen, and keyboard theme studio; updated affected widget/router tests. Local proof: `flutter analyze`, `flutter test test/keyboard_theme_studio_screen_test.dart test/app_router_auth_guard_test.dart`, and targeted `test/widget_test.dart` onboarding/navigation cases passed. | implemented | Review bounded diff; ship only with an explicit clean scope because another governance spec is already dirty. |
| 2026-05-28 21:10:13 UTC | sf-start | gpt-5.4-mini | Reordered Settings IA (account/appearance/keyboard/onboarding primary first, backend/keys/platform/overlay advanced collapsed defaults kept) and prepared for Settings disclosure verification. | implemented | /sf-verify shipglows_data/workflow/specs/winglowz-app-ui-coherence-localization-cleanup.md |
| 2026-05-28 21:27:43 UTC | sf-verify | gpt-5.4-mini | Re-ran targeted widget verification and local analyze after previous wording adjustment: 2/2 tests passed; local analyze clean; Flutter test lock issue resolved by re-running from project root. | partial | /sf-verify shipglows_data/workflow/specs/winglowz-app-ui-coherence-localization-cleanup.md |
| 2026-05-28 21:12:45 UTC | sf-verify | gpt-5.4-mini | Targeted widget tests on modified Settings IA sections pass after wording adjustment in backend diagnostics test (`completed onboarding card moves...`, `settings backend diagnostics panel opens without layout error`). | partial | /sf-start shipglows_data/workflow/specs/winglowz-app-ui-coherence-localization-cleanup.md |
| 2026-05-28 20:37:59 UTC | sf-start | gpt-5.4-mini | Continued implementation pass focused on Settings localization and copy cleanup across keyboard, overlay, and speech sections. | partial | /sf-start shipglows_data/workflow/specs/winglowz-app-ui-coherence-localization-cleanup.md |
| 2026-05-28 20:01:09 UTC | sf-start | gpt-5.4-mini | Ran the implementation pass for core shared UI, touch metrics, and localization surfaces. | partial | /sf-start shipglows_data/workflow/specs/winglowz-app-ui-coherence-localization-cleanup.md |
| 2026-05-28 19:36:12 UTC | sf-spec | GPT-5 Codex | Created spec from sf-audit-design chantier potential for UI coherence, localization, touch ergonomics, Settings IA, and token provenance. | Spec drafted | /sf-ready shipglows_data/workflow/specs/winglowz-app-ui-coherence-localization-cleanup.md |
| 2026-05-28 19:50:42 UTC | sf-ready | GPT-5 Codex | Evaluated readiness against user-story alignment, ambiguity, language doctrine, security, docs, and implementation contract. | not ready | /sf-spec shipglows_data/workflow/specs/winglowz-app-ui-coherence-localization-cleanup.md |
| 2026-05-28 19:51:29 UTC | sf-spec | GPT-5 Codex | Resolved readiness blockers: product vocabulary, Settings disclosure default, French accents, execution notes, and open questions. | Spec updated | /sf-ready shipglows_data/workflow/specs/winglowz-app-ui-coherence-localization-cleanup.md |
| 2026-05-28 19:52:42 UTC | sf-ready | GPT-5 Codex | Re-evaluated repaired spec against readiness gate, adversarial review, security, docs, language doctrine, and execution notes. | ready | /sf-start shipglows_data/workflow/specs/winglowz-app-ui-coherence-localization-cleanup.md |

## Current Chantier Flow

| Step | Status | Evidence | Next |
|------|--------|----------|------|
| sf-spec | complete | This spec created on 2026-05-28. | Run `/sf-ready shipglows_data/workflow/specs/winglowz-app-ui-coherence-localization-cleanup.md`. |
| sf-ready | ready | Repaired spec passed readiness on 2026-05-28. | Start implementation. |
| sf-start | complete | Density and coherence slices implemented for shared spacing, action rails, Home/Settings grouping, token provenance, and Voice/Clipboard/Snippets/Dictionary density; old-brand naming cleanup was completed locally on 2026-06-09. | Run `/sf-end shipglows_data/workflow/specs/winglowz-app-ui-coherence-localization-cleanup.md` after review. |
| sf-verify | complete | Latest local verification on 2026-06-09 passed with active-scope `rg` scan, `dart format`, `flutter analyze`, targeted suite/theme tests, full `flutter test` (268 tests), `git diff --check`, and ShipGlows metadata lint. Hosted Vercel smoke was not rerun because this patch is still local and unshipped. | Run `/sf-end shipglows_data/workflow/specs/winglowz-app-ui-coherence-localization-cleanup.md`. |
| sf-end | pending | Implementation and local verification are complete; product web proof should be rerun only after this local patch is pushed and Vercel serves the matching build. | Close after review, metadata lint, and any requested deployed web smoke. |
| sf-ship | pending | No commit or push was created in this run per repository guardrails. | Commit/push only on explicit request, then rerun `sf-browser` on the confirmed app URL. |
