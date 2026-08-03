---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-06-10"
created_at: "2026-06-10 20:45:30 UTC"
updated: "2026-06-11"
updated_at: "2026-06-11 01:33:48 UTC"
status: ready
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "settings-page-ux-remaster"
owner: "Diane"
confidence: high
user_story: "En tant qu'utilisatrice WinGlows, je veux une page Réglages claire, compacte et cohérente, afin de configurer mon compte, mon clavier, la voix, l'overlay et les diagnostics sans lire du jargon technique ni subir des répétitions visuelles."
risk_level: "medium"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "WinGlows Flutter app"
  - "Settings screen"
  - "Account and cloud sync overview"
  - "Keyboard settings"
  - "Voice language pack settings"
  - "Overlay Android settings"
  - "Backend diagnostics"
  - "Flutter widget tests"
  - "Vercel Flutter web app"
  - "Android physical-device QA"
depends_on:
  - artifact: "shipglows_data/business/branding.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/workflow/specs/winglowz-app-ui-coherence-localization-cleanup.md"
    artifact_version: "1.0.0"
    required_status: "ready"
  - artifact: "shipglows_data/workflow/specs/settings-driven-design-system.md"
    artifact_version: "1.0.0"
    required_status: "active"
  - artifact: "AGENTS.md"
    artifact_version: "0.1.0"
    required_status: "draft"
supersedes: []
evidence:
  - "User feedback 2026-06-10: Settings account section repeated Compte WinGlows and Accès WinGlows in separate cards with duplicated icon and detached connect button."
  - "Audit 2026-06-10: collapsible section titles are repeated inside AppSectionCard titles in lib/features/settings/presentation/settings_screen.dart:1485 and lib/features/settings/presentation/settings_screen_sections.dart:86."
  - "Audit 2026-06-10: Keyboard settings expose raw debug strings such as enabled=false, active=false, layout=qwerty, recoveries=0, sentry=disabled in lib/features/settings/presentation/settings_screen_sections.dart:730."
  - "Audit 2026-06-10: Local voice recognition exposes runtime=, language=, pack=, engine=, fallback= and pack checksum/retry/debug actions in lib/features/settings/presentation/settings_screen_sections.dart:1459 and :1543."
  - "Audit 2026-06-10: Keyboard Theme Studio is reachable from both Appearance and Keyboard sections, creating duplicate entry points in lib/features/settings/presentation/settings_screen_sections.dart:390 and :1212."
  - "Audit 2026-06-10: Maintenance mixes backend diagnostics and platform capabilities in lib/features/settings/presentation/settings_screen.dart:1589."
  - "User clarification 2026-06-10: Account & cloud shows too many large local/sync category cards such as Apparence et paramètres, Clipboard, Snippets; when everything is local, compact pills or inline rows are enough."
next_step: "/005-sf-ship -> /405-sf-prod -> /108-sf-browser settings-web-smoke"
---

# Title

WinGlows Settings Page UX Remaster

## Status

Ready. Validated for staged Settings UX implementation after a focused audit found repeated titles, debug-forward wording, scattered actions, and overloaded Settings sections.

## User Story

En tant qu'utilisatrice WinGlows, je veux une page Réglages claire, compacte et cohérente, afin de configurer mon compte, mon clavier, la voix, l'overlay et les diagnostics sans lire du jargon technique ni subir des répétitions visuelles.

## Minimal Behavior Contract

The Settings page must present regular user settings as concise, product-language controls and reserve raw diagnostics, provider state, developer actions, and support details for explicit advanced disclosure. Each collapsible section owns its title once; its expanded content must start with useful state or controls, not a duplicate card header. Account/cloud sync categories must scale their visual weight to the state: compact pills or inline rows for local-only/informational categories, larger cards only for synced, pending, failed, conflict, or action-required states. Actions must live inside the context they affect, labels must be short enough for mobile layouts, and technical state must be translated into readable status summaries. If advanced diagnostics are hidden by default, they must remain available for support and Android QA without changing auth, sync, keyboard, voice, overlay, or local secret behavior. The easy edge case to miss is over-simplifying security or permission warnings: privacy, local-only keys, cloud access, permissions, and degraded backend states must remain truthful even when the UI becomes quieter.

## Success Behavior

- Opening Réglages shows one expanded section at a time as today, but section content no longer repeats the section title in an inner card header.
- Account/cloud state is shown as one coherent account/sync summary with contextual connect/sign-out action and without duplicated "WinGlows" labels.
- When no data is synchronized yet, the Account & cloud section does not render seven large category cards; it uses compact local category chips/rows and a short explanation.
- Sync category cards are reserved for states with user value or attention: active sync, pending, error, conflict, unavailable because of platform/permission, or required action.
- Appearance focuses on global app appearance and destructive-action confirmation; keyboard theme entry points are not duplicated unless a clear hierarchy explains the relationship.
- Keyboard settings show human-readable status summaries by default, with raw `enabled=`, `active=`, recovery counts, Sentry state, and last native errors behind an advanced diagnostics disclosure.
- Voice/local recognition settings show installable language packs with readable status, size, offline/fallback meaning, and primary actions; debug actions such as mark update/corrupted are hidden behind advanced/support mode.
- Overlay settings show permission, running state, bubble appearance, and start/stop actions with clear user copy; raw service fields move behind diagnostics.
- Maintenance separates backend diagnostics from device/platform capabilities or labels them clearly as advanced support information.
- Long French labels are shortened or wrapped so buttons and list tiles do not truncate on narrow Flutter web/mobile layouts.
- Existing advanced support workflows remain reachable when needed for QA, support, and Diane's debugging.

## Error Behavior

- If auth, suite access, backend diagnostics, keyboard bridge, voice catalog, or overlay status fails to load, Settings must show a concise recoverable state and keep the detailed error available in diagnostics.
- If a platform capability is unavailable, the page must explain what the user can and cannot do without raw platform identifiers becoming the primary message.
- If a setting save fails, the existing save/sync status component or local message flow must communicate the failure and retry path without adding duplicate banners.
- If a label becomes ambiguous after shortening, prefer a concise label plus a helper line or tooltip rather than reintroducing long overflowing text.
- If an advanced diagnostic action can affect state, it must be visually separated from normal user actions and not look like the recommended next step.

## Problem

Réglages currently mixes normal user configuration, account/cloud state, Android runtime diagnostics, backend diagnostics, local AI keys, voice pack internals, overlay permissions, and platform capability reports at the same visual level. The page repeats section titles inside expanded cards, exposes machine strings to regular users, duplicates some actions, and uses long labels that are likely to truncate. This creates a prototype/debug impression in the product area where trust and clarity matter most.

## Solution

Remaster the Settings information architecture without changing underlying feature behavior. Keep the collapsible section model, but make each section content compact and context-first. Convert raw diagnostics into readable summaries, move developer/support details behind advanced disclosures, reduce duplicate entry points, and add targeted widget tests for the new state/copy contracts.

## Scope In

- `lib/features/settings/presentation/settings_screen.dart`:
  - section composition, section titles, collapsible content contract, maintenance grouping.
- `lib/features/settings/presentation/settings_screen_sections.dart`:
  - account/cloud summary, compact sync/local category summary, appearance section, keyboard section, voice packs section, overlay section, backend diagnostics, platform capabilities.
- `lib/core/sync/cloud_sync_overview.dart` only if account/access labels need source-level copy adjustment to prevent repeated user-facing labels.
- `lib/core/widgets/app_components.dart` only if a shared disclosure, status summary, compact metric row, or advanced panel component is needed.
- Settings widget tests in `test/widget_test.dart` or a new focused settings test file.
- Documentation/test checklist updates when the QA path changes.

## Scope Out

- Changing auth, suite entitlement, Firestore/Firebase rules, local/cloud sync semantics, or account-linking business logic.
- Changing native Android IME rendering, keyboard bridge method signatures, overlay service behavior, or voice runtime engine behavior.
- Implementing real ASR inference or download mechanics.
- Replacing the page with a new navigation architecture outside the existing collapsible Settings model.
- Marketing site changes.
- Local Android builds, Gradle tasks, APK packaging, or Android installs on this VM.

## Constraints

- Respect the monorepo guardrail: governance artifacts stay under root `shipglows_data/`; Flutter changes stay inside `winglowz_app/`.
- Do not commit unless Diane explicitly asks or a later ShipGlows ship skill requires it.
- Allowed local checks are `flutter analyze`, `flutter test`, and targeted `flutter test ...`.
- Android-native behavior must be validated through CI/Blacksmith and Diane physical-device QA when implementation changes native-dependent flows.
- User-facing French must remain natural, accented, and concise.
- Security/privacy warnings for local keys, sensitive clipboard, permissions, cloud sync, and diagnostics must not be weakened.
- Advanced diagnostics must remain accessible for support and QA.
- Fresh external docs: not needed. This chantier is internal Flutter UI/copy/information architecture using existing project patterns, not a new framework, SDK, API, auth, build, migration, cache, routing, or provider integration decision.

## Test Contract

- Surface/stack profile: Flutter app UI, Riverpod-backed Settings state, Material widgets, shared between Flutter web and Android.
- Automated proof required:
  - `flutter analyze`
  - targeted widget tests for Settings account/cloud, compact local category rendering, section title de-duplication, keyboard diagnostics disclosure, voice pack advanced actions, and maintenance grouping
  - existing focused tests affected by Settings copy or sync status
- Browser/manual proof required:
  - Flutter web smoke on `https://app.winglowz.com/` after deployment or local web preview when appropriate, checking narrow and desktop layouts for truncation and repeated titles.
- Android/manual proof required only if implementation touches native-dependent Settings actions or changes expected permission/IME/overlay QA wording:
  - Diane physical-device QA for keyboard/overlay/voice settings readability and action discoverability.
- Checklist path:
  - If manual QA becomes broad, create `shipglows_data/workflow/test-checklists/winglowz-settings-page-ux-remaster.md`.
- Exceptions:
  - No local Android build or install proof; forbidden by repository guardrails.

## Dependencies

- `shipglows_data/business/branding.md@1.0.0`: practical, calm, direct voice; no unsupported claims.
- `shipglows_data/workflow/specs/winglowz-app-ui-coherence-localization-cleanup.md@1.0.0`: existing broader UI coherence contract; this spec narrows the Settings-specific remaster.
- `shipglows_data/workflow/specs/settings-driven-design-system.md@1.0.0`: active Settings/theme architecture context; this spec must not break theme persistence or backend-agnostic settings storage.
- `AGENTS.md@0.1.0`: local command and commit guardrails.
- Source files observed:
  - `lib/features/settings/presentation/settings_screen.dart`
  - `lib/features/settings/presentation/settings_screen_sections.dart`
  - `lib/core/sync/cloud_sync_overview.dart`
  - `lib/core/widgets/app_components.dart`
  - `test/widget_test.dart`

## Invariants

- Settings remains usable in local fallback and remote signed-in modes.
- Existing account connect, sign-out, suite access, and sync category state behavior remains unchanged.
- Local AI keys remain local-only and secure-storage warnings remain explicit.
- Keyboard, overlay, and voice controls preserve their existing callbacks and native bridge semantics.
- Only one section remains expanded at a time unless a deliberate separate product decision changes the Settings interaction model.
- Diagnostic data must remain redacted through existing redaction paths when copied or displayed.
- Advanced/debug UI must not become the default first impression.

## Links & Consequences

- UX: lower visual noise and clearer hierarchy should reduce confusion in the page Diane identified as "très mal fait".
- Accessibility: shorter labels and contextual actions improve mobile target clarity, but disclosures must remain keyboard/screen-reader navigable.
- Localization: many tests assert exact French strings; copy changes need test updates.
- Security/privacy: hiding diagnostics by default must not hide critical degraded states or permission warnings.
- QA: Settings spans Flutter web and Android-native actions; pure UI changes can be tested locally/web, but permission and native action confidence still needs Android QA if touched.
- Product consistency: this spec should reduce overlap with the broader UI coherence spec by making Settings the bounded implementation unit.

## Documentation Coherence

- Update or create a manual QA checklist if the implementation changes how Diane should verify Settings on web and Android.
- Update app docs only if the Settings architecture, advanced diagnostics disclosure, or support path materially changes.
- No public marketing copy change is required.
- Changelog or release notes can summarize: "Réglages: interface clarifiée, diagnostics avancés repliés, libellés raccourcis".

## Edge Cases

- A setting can be unavailable because the platform is web/iOS/Linux, because Android permission is missing, because the native bridge has not reported yet, or because the feature is disabled; these states need different copy.
- A raw diagnostic value can be useful to support but harmful as default UI; preserve it behind disclosure.
- Some debug actions are useful for simulation tests but should not appear as normal user actions.
- The account summary can be signed in while suite access is inactive; copy must not imply sync is active when data remains local.
- A long list of local-only domains can be truthful but visually noisy; local categories must compress into chips/rows unless one of them has a state needing attention.
- The keyboard theme action belongs to keyboard customization but is also related to global appearance; duplicate actions should be resolved by hierarchy, not by removing discoverability.
- Long French copy can overflow in `FilledButton.icon`, `OutlinedButton.icon`, `SegmentedButton`, `ListTile`, and bottom/narrow web layouts.
- On web, Android-native sections may be absent or marked unavailable; tests must not assume Android-only controls are always visible.

## Implementation Tasks

- [x] Task 1: Define the Settings section content contract
  - Files: `lib/features/settings/presentation/settings_screen.dart`, `lib/features/settings/presentation/settings_screen_sections.dart`
  - Action: Remove duplicated inner section titles where the parent `ExpansionTile` already names the section, and make expanded content start with status/controls.
  - User story link: reduces repeated titles and card noise.
  - Validate with: widget test asserting expanded sections do not show duplicate titles as separate headers.

- [x] Task 2: Finalize account/cloud summary UX
  - Files: `lib/features/settings/presentation/settings_screen_sections.dart`, optionally `lib/core/sync/cloud_sync_overview.dart`
  - Action: Keep one account/sync summary with contextual connect/sign-out actions, concise inactive/active/checking states, and no duplicated "Compte WinGlows" / "Accès WinGlows" cards.
  - User story link: makes account and access understandable as one concept for users.
  - Validate with: local fallback, remote signed-in active, remote signed-in inactive, checking, and error widget tests.

- [x] Task 3: Compact sync/local category lists
  - Files: `lib/features/settings/presentation/settings_screen_sections.dart`, optionally `lib/core/widgets/app_components.dart`
  - Action: Replace repeated large `AppStatusCard` rows for low-priority local-only categories with compact pills or inline rows. Keep large cards only for categories that are synced, pending, failed, conflicted, unavailable for a meaningful reason, or require attention.
  - User story link: avoids wasting visual space on "everything is local" category repetition.
  - Validate with: widget tests for all-local mode, mixed synced/local mode, and attention-required mode.

- [x] Task 4: Simplify Appearance section
  - File: `lib/features/settings/presentation/settings_screen_sections.dart`
  - Action: Keep global theme selector, save/sync status, and destructive confirmation; remove or demote duplicate keyboard theme entry if Keyboard owns customization.
  - User story link: separates app appearance from keyboard-specific customization.
  - Validate with: existing appearance sync/status tests plus assertion for one primary keyboard theme entry point.

- [x] Task 5: Remaster Keyboard section default view
  - File: `lib/features/settings/presentation/settings_screen_sections.dart`
  - Action: Replace raw execution/debug `ListTile` copy with readable status summaries and group normal settings into coherent subsections: activation, appearance, input behavior, suggestions/language, privacy, feedback/media, advanced.
  - User story link: lets users configure the keyboard without reading runtime dumps.
  - Validate with: widget tests for enabled/disabled/active status summaries and absence of raw `enabled=` strings in default view.

- [x] Task 6: Add advanced diagnostics disclosure for Keyboard
  - File: `lib/features/settings/presentation/settings_screen_sections.dart`, optionally `lib/core/widgets/app_components.dart`
  - Action: Move recovery counts, Sentry state, last native error, raw layout/gesture/privacy fields, and debug touch overlay wording behind an explicit "Diagnostics avancés" disclosure.
  - User story link: preserves support power without polluting default settings.
  - Validate with: widget test that raw diagnostics are hidden by default and visible after expanding advanced diagnostics.

- [x] Task 7: Remaster local voice recognition section
  - File: `lib/features/settings/presentation/settings_screen_sections.dart`
  - Action: Convert runtime and pack metadata into readable pack cards with primary status, offline/fallback meaning, size, install/remove/retry actions, and concise warnings.
  - User story link: makes voice packs understandable as a user feature instead of a debug catalog.
  - Validate with: widget tests for not installed, installed, update available, corrupted, incompatible, and fallback disabled states.

- [x] Task 8: Hide voice pack debug simulation actions by default
  - File: `lib/features/settings/presentation/settings_screen_sections.dart`
  - Action: Move "Marquer mise à jour" and "Marquer corrompu" into an advanced/support disclosure or debug-only area with explicit wording.
  - User story link: avoids presenting QA controls as normal user actions.
  - Validate with: widget tests that debug actions are absent by default and reachable in advanced/support disclosure.

- [x] Task 9: Clarify Overlay section
  - File: `lib/features/settings/presentation/settings_screen_sections.dart`
  - Action: Replace raw overlay execution fields with readable permission/running/delivery summaries, keep bubble sliders and permission actions contextual, and move last native event/raw service state behind diagnostics.
  - User story link: keeps overlay setup understandable without losing support data.
  - Validate with: widget tests for permission missing, permission granted inactive, running, and accessibility missing states.

- [x] Task 10: Split or relabel Maintenance and platform capabilities
  - File: `lib/features/settings/presentation/settings_screen.dart`, `lib/features/settings/presentation/settings_screen_sections.dart`
  - Action: Separate backend diagnostics from device/platform capabilities or clearly label the whole area as advanced support; keep copy/copy-clear actions inside backend diagnostics.
  - User story link: avoids mixing support logs with normal capability settings.
  - Validate with: widget test for maintenance labels and diagnostic actions.

- [x] Task 11: Shorten and harden mobile labels
  - File: `lib/features/settings/presentation/settings_screen_sections.dart`
  - Action: Review long French labels and replace with shorter labels plus helper text where needed.
  - User story link: prevents truncation and makes actions scannable.
  - Validate with: widget tests or golden/smoke layout checks for narrow width where feasible.

- [x] Task 12: Update tests and manual QA proof
  - Files: `test/widget_test.dart` or new `test/settings_screen_ux_test.dart`, optional `shipglows_data/workflow/test-checklists/winglowz-settings-page-ux-remaster.md`
  - Action: Add focused tests for the new Settings contract and document manual QA if implementation scope requires it.
  - User story link: protects the remaster from regression.
  - Validate with: targeted settings tests, `flutter analyze`, and affected existing tests.

## Acceptance Criteria

- [x] CA 1: Given a Settings section is expanded, when the parent accordion title is visible, then the expanded content does not repeat the same title as a second card/header.
- [x] CA 2: Given local fallback account mode, when Account & cloud is expanded, then the user sees one account/sync summary and one contextual connect action.
- [x] CA 3: Given a remote signed-in account with inactive suite access, when Account & cloud is expanded, then the UI explains that data remains local without showing separate "Compte WinGlows" and "Accès WinGlows" cards.
- [x] CA 4: Given no data category is synchronized yet, when Account & cloud is expanded, then local domains such as Apparence et paramètres, Clipboard, Snippets, Dictionnaire, Transcriptions, Profil clavier and Clés IA locales appear as compact pills/rows rather than seven large cards.
- [x] CA 5: Given at least one sync category is synced, pending, failed, conflicted, or needs attention, when Account & cloud is expanded, then only those meaningful states receive card-level visual weight.
- [x] CA 6: Given Appearance is expanded, when Keyboard section also exists, then keyboard theme customization has one clear primary home or a clearly secondary cross-link, not two equivalent buttons.
- [x] CA 7: Given Keyboard is expanded in default view, then raw strings like `enabled=`, `active=`, `recoveries=`, `sentry=`, and `privacy=` are not visible.
- [x] CA 8: Given Keyboard advanced diagnostics is expanded, then raw native/runtime diagnostics needed for support are visible and redacted where applicable.
- [x] CA 9: Given Voice/local recognition is expanded, then each language pack shows readable user status and primary actions without raw metadata dominating the card.
- [x] CA 10: Given Voice/local recognition default view, then "Marquer mise à jour" and "Marquer corrompu" are not presented as normal user actions.
- [x] CA 11: Given Overlay is expanded, then permission/running/accessibility state is described in user language and raw service/native event fields are behind diagnostics.
- [x] CA 12: Given Maintenance is expanded, then backend diagnostics and platform/device capability summaries are visually and semantically separated or clearly marked advanced.
- [x] CA 13: Given narrow Flutter web/mobile width, then primary Settings buttons and labels fit, wrap professionally, or use concise labels without truncating important action text.
- [x] CA 14: Given a setting save/sync error, then the page shows one coherent recoverable message or action, not multiple contradictory banners.

## Test Strategy

- Start with focused widget tests around `_AccountCloudSection`, `_KeyboardSettingsSection`, `_OnDeviceSpeechSection`, `_OverlaySettingsSection`, and Maintenance composition through `SettingsScreen`.
- Use provider/platform overrides already present in `test/widget_test.dart` for Android and non-Android variants.
- Add a narrow viewport test for Settings labels and button discoverability.
- Run:
  - `flutter analyze`
  - `flutter test test/widget_test.dart --name "<settings focused test>"`
  - new focused settings test file if created
  - affected existing tests such as `test/app_input_theme_test.dart`, `test/page_scoped_search_test.dart`, and `test/send_to_actions_test.dart` only when touched behavior overlaps.
- After implementation is deployed to web, smoke `https://app.winglowz.com/` for Settings layout and console errors.
- Request Diane Android physical-device QA if native setting actions, permission copy, or IME/overlay/voice affordances changed materially.

## Risks

- Medium UX risk: hiding diagnostics too aggressively could make support and Android QA harder.
- Medium regression risk: exact-copy tests may fail across Settings because labels are intentionally changing.
- Medium product risk: simplifying account/access wording could accidentally imply sync is active when entitlement is inactive.
- Medium accessibility risk: disclosures and compact summaries must remain discoverable and screen-reader navigable.
- Low technical risk: the work is mostly Flutter UI/copy; underlying native/platform behavior should remain unchanged if scope is respected.

## Execution Notes

- Use existing `AppSectionCard`, `AppStatusCard`, `AppBannerCard`, `AppSyncStatusAction`, and `AppActionRail` patterns unless a shared advanced-disclosure component removes real duplication.
- Prefer one small shared helper for repeated "summary + advanced diagnostics" patterns if Keyboard, Voice, and Overlay all need it.
- Avoid card-in-card visual nesting; use subtle `DecoratedBox`/surface panels or unframed groups inside expanded sections.
- Keep state decisions derived from existing providers/status snapshots; do not introduce new persistence for disclosure state unless a product need emerges.
- Keep advanced/support wording honest: "Diagnostics avancés" or "Support" is clearer than hiding risky controls behind vague labels.
- Respect current dirty worktree: do not revert unrelated local changes.

## Open Questions

- None blocking for initial `sf-ready`. The implementation can choose the exact advanced disclosure component shape from existing Flutter patterns.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-06-10 20:45:30 UTC | sf-spec | GPT-5 Codex | Created Settings page UX remaster spec from Diane's direct request and focused audit evidence | Draft spec created | `/sf-ready shipglows_data/workflow/specs/winglowz-settings-page-ux-remaster.md` |
| 2026-06-10 20:50:30 UTC | sf-spec | GPT-5 Codex | Added explicit Account & cloud sync/local category compaction requirement after Diane clarified that seven large local-only cards are excessive | Draft spec updated | `/sf-ready shipglows_data/workflow/specs/winglowz-settings-page-ux-remaster.md` |
| 2026-06-10 21:10:22 UTC | sf-ready | GPT-5 Codex | Validated structure, user-story fit, proof contract, adversarial gaps, security posture, language doctrine, and dependency alignment | ready | `/sf-start WinGlows Settings Page UX Remaster` |
| 2026-06-11 01:30:00 UTC | sf-start | GPT-5 Codex | Implemented Settings UX remaster in Flutter: de-duplicated inner section titles, kept account/cloud compact work, moved keyboard/voice/overlay raw diagnostics behind disclosures, clarified maintenance labels, and added focused widget tests | implemented | `/sf-verify shipglows_data/workflow/specs/winglowz-settings-page-ux-remaster.md` |
| 2026-06-11 01:33:48 UTC | 103-sf-verify | GPT-5 Codex | Verified local implementation evidence: `flutter analyze`, targeted Settings widget tests, and targeted spec metadata lint passed; hosted Flutter web smoke remains missing because changes are not deployed yet | partial | `/005-sf-ship -> /405-sf-prod -> /108-sf-browser settings-web-smoke` |

## Current Chantier Flow

| Step | Status | Notes |
|------|--------|-------|
| sf-spec | completed | Draft spec created on 2026-06-10. |
| sf-ready | completed | Ready verdict recorded on 2026-06-10. |
| sf-start | completed | Implemented on 2026-06-11 with `flutter analyze` and targeted Settings widget tests passing. |
| sf-verify | partial | Local checks pass; hosted Flutter web smoke is still required after deployment. |
| sf-end | pending | Close docs/checklists and summarize completion. |
| sf-ship | next | Ship the local Settings changes, then route `405-sf-prod` to confirm deployment and `108-sf-browser` to smoke Settings on `https://app.winglowz.com/`. |
