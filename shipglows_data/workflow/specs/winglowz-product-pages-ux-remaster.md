---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-06-10"
created_at: "2026-06-10 15:32:15 UTC"
updated: "2026-06-10"
updated_at: "2026-06-10 19:18:02 UTC"
status: ready
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "product-pages-ux-remaster"
owner: "Diane"
confidence: medium
user_story: "En tant qu'utilisatrice WinGlows Android et web, je veux que les pages Voix, Papier, Snippets et Dico utilisent une structure compacte, cohérente et fiable, afin de comprendre immédiatement l'état de mes contenus, l'état de synchronisation, et l'action utile suivante sans bruit ni répétition."
risk_level: "medium"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "WinGlows Flutter app"
  - "Flutter Material shared widgets"
  - "Voice page"
  - "Clipboard/Papier page"
  - "Snippets page"
  - "Dictionary/Dico page"
  - "App shell navigation"
  - "Local/cloud sync display"
  - "Vercel Flutter web app"
  - "Android physical-device QA"
depends_on:
  - artifact: "AGENTS.md"
    artifact_version: "0.1.0"
    required_status: "draft"
  - artifact: "CLAUDE.md"
    artifact_version: "1.2.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/business/winglowz_app/product.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/business/winglowz_app/branding.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/winglowz_app/context.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "docs/explorations/2026-06-10-product-pages-ux-remaster.md"
    artifact_version: "1.0.0"
    required_status: "draft"
  - artifact: "shipglows_data/workflow/specs/app-home-feed-global-actions-search.md"
    artifact_version: "1.0.0"
    required_status: "ready"
  - artifact: "shipglows_data/workflow/specs/app-local-to-cloud-data-promotion-merge.md"
    artifact_version: "1.0.0"
    required_status: "ready"
  - artifact: "shipglows_data/workflow/specs/winglowz-app-ui-coherence-localization-cleanup.md"
    artifact_version: "1.0.0"
    required_status: "ready"
supersedes: []
evidence:
  - "User feedback 2026-06-10: main pages feel noisy, repetitive, sometimes truncated, and not compact enough."
  - "Exploration report docs/explorations/2026-06-10-product-pages-ux-remaster.md recommends a shared product page skeleton, compact summary strip, consistent list toolbar, and sync display adapter."
  - "Component audit 2026-06-10 found repeated private metric pill implementations in voice_screen.dart, clipboard_screen.dart, snippets_screen.dart, and dictionary_screen.dart."
  - "Component audit 2026-06-10 found large page widgets and no shared product-page frame beyond AppSectionCard, AppPageToolbar, AppSyncStatusAction, AppEntityCard, and AppEmptyStateCard."
  - "Code search 2026-06-10 confirmed duplicated metric/status primitives and parallel sync display concepts: AppSyncStatus, CloudSyncOverview, and LocalCloudSyncState."
next_step: "Diane product-feel review on https://app.winglowz.com/ for page density, labels, and sync/status clarity"
---

# Spec: WinGlows Product Pages UX Remaster

🟢 [WinGlowsApp] spec: WinGlows Product Pages UX Remaster | status: shipped-prod-browser-smoke-partial | path: shipglows_data/workflow/specs/winglowz-product-pages-ux-remaster.md | next: Diane product-feel review on https://app.winglowz.com/ | id: wfz-product-pages-ux-remaster

## Title

WinGlows Product Pages UX Remaster

## Status

Shipped and deployed to the active Flutter web URL. Created on 2026-06-10 from user feedback, the product-pages exploration report, and the component-system audit. Passed readiness review on 2026-06-10 after tightening the proof contract and resolving non-blocking implementation choices. Implemented through `sf-start` on 2026-06-10 with local Flutter checks passing. `sf-verify` on 2026-06-10 confirmed local implementation, tests, docs, and status-source coherence. `sf-ship` on 2026-06-10 confirmed the remaster is included in pushed commit `134ee64` on `origin/main`. The operator clarified on 2026-06-10 that `https://app.winglowz.com/` is the active Flutter web validation URL for the monorepo. `sf-prod` on 2026-06-10 confirmed Vercel project `winglowz-app` production deployment `dpl_59sAwj2FnFsJPoGjAg1qX9VJpdEn` is Ready, aliased to `https://app.winglowz.com/`, and served with `last-modified: Wed, 10 Jun 2026 19:15:06 GMT`. `sf-browser` on 2026-06-10 used Chromium/CDP at `390x844`, entered local mode, and visually checked Accueil, Voix, Papier, Snippets, Dico, and Réglages without runtime exceptions or failed network loads. Final acceptance still needs Diane's product-feel review for density, wording, and sync/status clarity.

## User Story

En tant qu'utilisatrice WinGlows Android et web, je veux que les pages Voix, Papier, Snippets et Dico utilisent une structure compacte, cohérente et fiable, afin de comprendre immédiatement l'état de mes contenus, l'état de synchronisation, et l'action utile suivante sans bruit ni répétition.

## Minimal Behavior Contract

When the user opens Voix, Papier, Snippets, or Dico, the page must show the same compact structure in the same order: a summary/status strip, a page-specific primary action area, a list-control area, and the results. The UI must preserve every existing create, edit, delete, search, refresh, sync, send-to, and privacy-sensitive behavior while making status and sync meaning consistent across pages. If a page cannot load, sync, refresh, or perform an action, the failure must be visible, recoverable, and must not imply that local-only, pending, or errored data is safely synchronized. The easy edge case to miss is the privacy/sync boundary: summaries and status pills must orient the user without exposing sensitive clipboard content or labeling unsynced local data as cloud-synced.

## Success Behavior

- Opening each target page shows a compact first viewport that answers: what is here, whether it is local/synced/pending/errored, and what the next useful action is.
- Page names are not repeated as large in-page titles when navigation already identifies the page.
- Voix, Papier, Snippets, and Dico share the same page grammar while keeping domain-specific controls: voice capture and overlay, clipboard add/private state, snippet creation and labels, dictionary corrections, and local keyboard-rule bridge status where it is actually observable.
- Metrics use a shared component vocabulary with consistent density, typography, icon treatment, and empty values.
- Sync and refresh states use one display grammar, including loading, pending, local-only, disabled/offline/account-required, success, and error states.
- Search, filter/sort when present, refresh, and sync actions appear in the same relative zone across pages.
- Empty states and search-empty states are compact, useful, and action-oriented without competing visually with the primary action area.
- Narrow mobile widths avoid clipped buttons, overflowing labels, and duplicate vertical gaps.
- Existing widget tests are updated rather than deleted, and new page-level tests prove the shared layout contract.

## Error Behavior

- Loading or refresh failures show a concise inline status with a retry or recovery action where one exists.
- A sync error must remain visibly distinct from "à jour"; local-only and pending states must never be presented as fully synchronized.
- If the account/cloud state is unavailable, the page must fall back to an honest local/status state instead of hiding sync meaning.
- Clipboard summaries must not reveal private or sensitive clipboard item content; counts and non-sensitive status are acceptable.
- Destructive actions keep their existing confirmation and error behavior.
- If a shared component cannot represent a page-specific state cleanly, implementation must add a small slot or adapter rather than forcing misleading generic copy.
- If a refactor causes focus loss, form reset, disabled actions, or changed persistence semantics, the implementation is invalid even if the visual layout looks better.

## Problem

The main product pages now have similar jobs but different local layouts. Each page decides independently how to present summary metrics, sync status, creation controls, list headings, search, refresh, messages, empty states, and item actions. This makes the product feel noisy and inconsistent, and it creates duplicated private widgets that will drift again.

The component audit also shows a structural issue: large page widgets carry too much UI grammar themselves, while shared components stop at generic cards, toolbars, entity cards, and sync actions. The result is four separate interpretations of the same product pattern rather than one reliable page system.

## Solution

Introduce a shared product-page composition layer for Voix, Papier, Snippets, and Dico. The layer should define the page skeleton, compact summary/status strip, list-control zone, results area, and shared metric/status primitives. Each page keeps domain-specific content through slots and small adapters, especially for voice overlay and local/cloud sync.

This is not a visual-only cleanup. It is a bounded UX and component remaster that makes the interface compact, repeatable, testable, and harder to regress.

## Scope In

- Add or extend shared Flutter widgets for product pages, likely in `lib/core/widgets/app_components.dart` or a focused new file such as `lib/core/widgets/product_page_components.dart`.
- Define a page-level composition primitive, for example `ProductPageScaffold`, with slots for summary/status, primary action, list toolbar, results, and inline messages.
- Define shared compact primitives for metrics and statuses, replacing private page-local metric pill classes.
- Define a domain page status display model or adapter that normalizes page busy/error/pending/local/cloud/synced states for display.
- Migrate `lib/features/voice/presentation/voice_screen.dart` to the shared page grammar while preserving capture, overlay, language pack, and transcription behavior.
- Migrate `lib/features/clipboard/presentation/clipboard_screen.dart` to the shared page grammar while preserving add form, pinned state, pending sync count, private/sensitive safeguards, and item actions.
- Migrate `lib/features/snippets/presentation/snippets_screen.dart` to the shared page grammar while preserving snippet creation, editing, labels, local keyboard-rule bridge push behavior, search, and item actions.
- Migrate `lib/features/dictionary/presentation/dictionary_screen.dart` to the shared page grammar while preserving dictionary entry creation, case-sensitive status, local keyboard-rule bridge push behavior, search, and item actions.
- Align empty states, search-empty states, list headers, loading messages, and refresh/sync action placement across the four pages.
- Update shared component documentation, especially `docs/COMPONENTS.md`, when new product-page primitives are introduced.
- Add or update widget tests for page rendering, narrow layouts, sync/status states, and preserved actions.

## Scope Out

- Native Android IME rendering, Kotlin keyboard relief, APK build, Gradle tasks, and Android install validation.
- Backend sync algorithms, conflict-resolution rules, cloud merge behavior, or account entitlement changes.
- Full Settings redesign, Keyboard Theme Studio refactor, or broader navigation redesign.
- Marketing site changes in `winglowz_site`.
- New localization infrastructure or translation pipeline.
- Replacing Flutter Material or adding a new UI framework.
- A full rewrite of large page files beyond what is necessary to extract the shared page contract safely.

## Constraints

- Follow the repository guardrails: allowed local checks are `flutter analyze`, `flutter test`, and targeted `flutter test ...`; do not run local Android builds, installs, packaging, Gradle tasks, or `flutter run -d android`.
- Use existing Flutter Material patterns, WinGlows theme tokens, and shared app components unless a new primitive is justified by repeated page structure.
- Preserve all current user-facing capabilities and data semantics.
- Keep user-facing French natural, accented, and concise.
- Preserve accessibility fundamentals: labels, semantics where present, keyboard/focus behavior, contrast intent, and practical mobile touch targets.
- Do not expose secrets, private clipboard content, diagnostic payloads, or sensitive sync details in summaries, tests, logs, screenshots, or docs.
- Avoid a single over-configured "god component"; prefer a small page scaffold plus composable slots and page-specific adapters.
- Keep page-specific affordances when they carry real product value; consistency must not erase the differences between voice capture, clipboard management, snippets, and dictionary corrections.

## Test Contract

- Surface: Flutter shared UI, product pages, local/cloud status display, privacy-sensitive clipboard summaries, no native Android build path.
- Proof profile: automated widget/static proof first, Flutter web smoke for visual review, human product-feel review before final acceptance.
- Proof order:
  1. Static and focused automated proof: `flutter analyze`, shared component widget tests, and page-specific widget tests.
  2. Broad automated proof: `flutter test` after the shared component migration is complete.
  3. Web smoke proof: Vercel Flutter web app once implementation is ready for visual review.
  4. Manual proof: Diane validates first viewport density, French copy, and sync/status understandability.
  5. Device proof: Android physical-device QA only if native Android behavior or keyboard integration is touched despite this spec's scope boundary.
- Checklist path: no separate manual checklist artifact is required for the ready gate. If implementation touches native Android behavior, create `shipglows_data/workflow/test-checklists/winglowz-product-pages-ux-remaster.md` before device QA.
- Required scenario IDs:
  - `WFZ-PAGES-001`: each target page renders the same compact skeleton.
  - `WFZ-PAGES-002`: page-local metric pills are replaced by the shared primitive.
  - `WFZ-PAGES-003`: local-only, pending, synced, disabled/account-required, loading, and error sync states display truthfully.
  - `WFZ-PAGES-004`: Papier summaries protect private and sensitive clipboard content.
  - `WFZ-PAGES-005`: narrow mobile viewport has no clipped critical buttons or duplicate empty gaps.
  - `WFZ-PAGES-006`: existing create, edit, delete, search, refresh, sync, and send-to actions preserve behavior.
  - `WFZ-PAGES-007`: Snippets and Dico do not label Android keyboard-rule bridge pushes as cloud sync.
- Required viewports:
  - Mobile compact: `360x740`.
  - Mobile common: `390x844`.
  - Tablet/web narrow: `768x1024`.
- Required UX pass conditions:
  - On mobile common, the summary/status strip and the start of the primary action area are visible before scrolling on all four pages.
  - On mobile compact, no critical icon+text button truncates its visible label; if a label cannot fit, the component must switch to icon-only with tooltip or wrap without overflow.
  - No target page renders two consecutive empty vertical gaps of `16dp` or more between summary/status, primary action, list controls, and results.
  - Search-empty states render inside the results zone and do not add another large page-level card above list controls.
  - A status pill labelled `Synchronisé` or `À jour` appears only when the page status source proves the relevant data scope is synced; otherwise the page uses `Prêt`, `Local`, `En attente`, `Erreur`, or a more specific honest state.
- Required results:
  - `flutter analyze` passes.
  - Targeted widget tests for shared product-page primitives pass.
  - Targeted widget tests for Voix, Papier, Snippets, and Dico pass.
  - Relevant existing tests pass when their assertions intersect the changed UI, including `test/widget_test.dart`, `test/app_router_auth_guard_test.dart`, `test/page_scoped_search_test.dart`, and `test/send_to_actions_test.dart`.
  - `flutter test` passes before handoff.
  - Vercel Flutter web smoke shows the remastered pages without obvious overflow, clipped buttons, or status confusion before Diane's product-feel review.
- Exception with proof: external documentation freshness is not required because the spec uses local Flutter Material patterns already present in the codebase and does not depend on new framework, SDK, service, auth, build, migration, cache, routing, or integration behavior.
- Exception without proof: no local Android APK build, Gradle task, install, or `flutter run -d android` is allowed by repository guardrails.

## Dependencies

- `lib/core/widgets/app_components.dart`: current shared cards, page toolbar, sync action, empty state, and entity cards.
- `lib/core/widgets/local_mode_notice.dart`: current local-mode notice and spacing behavior.
- `lib/core/sync/cloud_sync_overview.dart`: global account/cloud/category sync overview.
- `lib/features/sync/domain/local_cloud_sync_models.dart`: deeper local/cloud sync domain state and pending/conflict semantics.
- `lib/features/voice/presentation/voice_screen.dart`: target page, currently includes private metric pill and voice-specific status/control structure.
- `lib/features/clipboard/presentation/clipboard_screen.dart`: target page, currently includes private metric pill and clipboard-specific privacy/sync behavior.
- `lib/features/snippets/presentation/snippets_screen.dart`: target page, currently includes private metric pill and snippet-specific form/search/list behavior.
- `lib/features/dictionary/presentation/dictionary_screen.dart`: target page, currently includes private metric pill and dictionary-specific form/search/list behavior.
- `lib/features/shell/presentation/app_shell_screen.dart`: navigation labels and page entry context.
- `shipglows_data/technical/winglowz_app/context.md`: app technical context and platform boundary governance.
- `docs/COMPONENTS.md`: shared component documentation to update when the product-page primitives become part of the app vocabulary.

## Status Source Contract

The shared status adapter must distinguish data sync status from integration status. `idle` or successful local loading means `Prêt`, not `Synchronisé`. `synced` may appear only when a concrete source proves the relevant data scope is synced. Status precedence is: blocking page error, page busy/loading, explicit pending/conflict/error sync state, local-only/account-unavailable state, proven synced state, then plain ready state.

| Page | Data/status source | Required display rule |
| --- | --- | --- |
| Voix | `_busy`, `_message`, transcription store load result, Firebase/local fallback availability, language pack availability, overlay availability. Current code does not expose per-record cloud sync for transcriptions. | Show loading/error when `_busy` or `_message` requires it. Show `Local` when backend/session state proves local-only. Otherwise show `Prêt`, not `Synchronisé`. Overlay and language pack states are separate status chips, never proof of data sync. |
| Papier | `_busy`, `_message`, `ClipboardItemRecord.syncState`, pending count, Firebase/local fallback availability, private/sensitive item metadata. | Show pending when any item is pending, error when page or item sync state is errored, local-only when the active store/session is local-only, and synced only when the visible/loaded clipboard scope is explicitly synced. Summary counts may include private/sensitive item counts but never reveal item content. |
| Snippets | `_busy`, `_message`, snippet store load result, Firebase/local fallback availability, and `AndroidKeyboardBridge.setSnippetRules` attempt result if surfaced. Current code does not expose a cloud sync state for snippets. | Show loading/error/local/ready for snippet data. Do not show `Synchronisé` for snippets unless a real store/cloud source proves it. Keyboard-rule bridge status may show `Clavier local appliqué`, `Clavier non disponible`, or `Erreur clavier`, but it is integration status, not cloud sync. |
| Dico | `_busy`, `_message`, dictionary store load result, Firebase/local fallback availability, and `AndroidKeyboardBridge.setDictionaryRules` attempt result if surfaced. Current code does not expose a cloud sync state for dictionary terms. | Show loading/error/local/ready for dictionary data. Do not show `Synchronisé` for dictionary terms unless a real store/cloud source proves it. Keyboard-rule bridge status may show `Clavier local appliqué`, `Clavier non disponible`, or `Erreur clavier`, but it is integration status, not cloud sync. |

`LocalModeNotice` must not remain a large English standalone block on these pages after migration. Its meaning should be folded into the compact summary/status strip or replaced with a compact French status: `Mode local`, `Compte non configuré`, or an equivalent natural label with a short tooltip/detail.

## Invariants

- No user data is deleted, hidden permanently, or reclassified by a visual remaster.
- Existing route access and auth guard behavior remain unchanged.
- Existing local-first behavior remains supported when cloud sync is unavailable.
- Existing create/edit/delete/search/send-to actions remain available.
- Sensitive clipboard content remains protected in summaries and tests.
- Sync display must be truthful: "à jour" means actually up to date for the relevant scope, not merely no local error visible.
- Android keyboard-rule bridge status is not cloud sync and must not be used as proof that Snippets or Dico data is synchronized.
- The shell can keep `Papier` and `Dico` bottom labels; this spec does not reopen that naming decision.

## Links & Consequences

- Shared components will become the source of truth for product-page density, spacing, and status grammar.
- Page tests that assert exact text or widget hierarchy may need updates because repeated headings and page-local metric widgets should disappear.
- The sync display adapter may expose inconsistencies between `AppSyncStatus`, `CloudSyncOverview`, and `LocalCloudSyncState`; implementation must resolve them at the display model level without changing backend semantics.
- Reducing first-viewport noise can affect form discoverability. Primary actions must remain easy to find, especially for Snippets and Dico where creation is a core flow.
- Voice is the most likely special case because overlay, language packs, capture, and transcription status do not map perfectly to CRUD pages.

## Documentation Coherence

- Update `docs/COMPONENTS.md` with the new product-page scaffold, metric/status primitives, and intended usage rules.
- Link this spec from any future implementation note or changelog entry if the user-facing page structure changes significantly.
- The exploration report remains provenance, not implementation documentation.
- No marketing, pricing, SEO, or public docs need updates for the ready spec itself.

## Edge Cases

- Empty local dataset with cloud sync connected.
- Local-only mode with existing local data.
- Pending sync operations with otherwise successful local CRUD.
- Sync error while local data is still readable.
- Account/cloud overview unavailable while page-local data loads.
- Clipboard contains private or sensitive items; summary shows counts/status only, never content.
- Search returns no results while the page has data.
- Narrow mobile width with long French labels and icon buttons.
- Voice page without required language pack or overlay permission.
- Form validation errors inside the primary action area.
- Refresh tapped repeatedly while loading.
- Page-level status changes while a form is dirty.

## Implementation Tasks

- [ ] Task 1: Confirm the current page contracts and tests.
  - File: `lib/features/voice/presentation/voice_screen.dart`, `lib/features/clipboard/presentation/clipboard_screen.dart`, `lib/features/snippets/presentation/snippets_screen.dart`, `lib/features/dictionary/presentation/dictionary_screen.dart`, and relevant `test/*.dart`.
  - Action: Read current summary, action, list, sync, and empty-state behavior before editing.
  - User story link: prevents loss of existing page-specific value.
  - Depends on: none.
  - Validate with: notes in implementation PR/report and no functional removal during tests.

- [ ] Task 2: Create the shared product-page primitives.
  - File: `lib/core/widgets/app_components.dart` or `lib/core/widgets/product_page_components.dart`.
  - Action: Add a composable product page scaffold, compact summary/status strip, shared metric pill, shared status pill, and list-control composition using slots rather than a heavy configuration object.
  - User story link: establishes the same compact structure across pages.
  - Depends on: Task 1.
  - Validate with: focused widget tests for the shared primitives.

- [ ] Task 3: Add a display-level domain page status adapter.
  - File: `lib/core/widgets/product_page_status.dart` and exported through `lib/core/widgets/app_components.dart` if the app keeps a single component barrel.
  - Action: Convert page busy/error/pending/local/cloud states into display labels, icons, colors, details, and primary actions without changing sync storage semantics.
  - User story link: makes sync meaning consistent and truthful.
  - Depends on: Task 2.
  - Validate with: tests for loading, local-only, pending, synced, disabled/account-required, and error states.

- [ ] Task 4: Replace duplicated metric/status widgets.
  - File: `voice_screen.dart`, `clipboard_screen.dart`, `snippets_screen.dart`, `dictionary_screen.dart`.
  - Action: Remove `_MetricPill`, `_ClipboardMetricPill`, `_SnippetMetricPill`, and `_DictionaryMetricPill` in favor of the shared primitive.
  - User story link: prevents visual drift and makes metrics comparable.
  - Depends on: Task 2.
  - Validate with: `rg "_MetricPill|_ClipboardMetricPill|_SnippetMetricPill|_DictionaryMetricPill" lib/features` returns no page-local metric pill classes.

- [ ] Task 5: Migrate Voix to the product page grammar.
  - File: `lib/features/voice/presentation/voice_screen.dart`.
  - Action: Put transcription metrics, latest capture, overlay state, pack warning, capture action, search, refresh, and transcription results into the shared structure.
  - User story link: removes top noise while preserving voice-specific controls.
  - Depends on: Tasks 2 and 3.
  - Validate with: targeted voice widget tests and no regression in overlay/capture action availability.

- [ ] Task 6: Migrate Papier to the product page grammar.
  - File: `lib/features/clipboard/presentation/clipboard_screen.dart`.
  - Action: Put item count, pinned count, pending/local sync state, add form, search, refresh, and clipboard results into the shared structure.
  - User story link: makes clipboard status compact and protects sensitive content.
  - Depends on: Tasks 2 and 3.
  - Validate with: targeted clipboard widget tests, including private/sensitive summary behavior.

- [ ] Task 7: Migrate Snippets to the product page grammar.
  - File: `lib/features/snippets/presentation/snippets_screen.dart`.
  - Action: Put snippet metrics, label/latest-add status, form, search, refresh, result list, and optional keyboard-rule bridge status into the shared structure. Do not label keyboard-rule bridge status as cloud sync.
  - User story link: makes snippet creation and browsing consistent with other pages.
  - Depends on: Tasks 2 and 3.
  - Validate with: targeted snippet widget tests and existing send/search tests where applicable.

- [ ] Task 8: Migrate Dico to the product page grammar.
  - File: `lib/features/dictionary/presentation/dictionary_screen.dart`.
  - Action: Put term metrics, case-sensitive/latest-add status, form, search, refresh, result list, and optional keyboard-rule bridge status into the shared structure. Do not label keyboard-rule bridge status as cloud sync.
  - User story link: makes dictionary correction management consistent with snippets.
  - Depends on: Tasks 2 and 3.
  - Validate with: targeted dictionary widget tests and search/form validation tests.

- [ ] Task 9: Normalize empty states, search-empty states, messages, and list headers.
  - File: target page files and shared empty/list components.
  - Action: Remove redundant page titles, avoid large non-actionable status blocks, and use compact guidance that matches the shared grammar.
  - User story link: reduces repeated noise.
  - Depends on: Tasks 5-8.
  - Validate with: widget tests for empty data and search-empty states on all four pages.

- [ ] Task 10: Update documentation and proof.
  - File: `docs/COMPONENTS.md`, relevant tests, and implementation report.
  - Action: Document the product-page primitives and run the validation path.
  - User story link: keeps the component system durable after this remaster.
  - Depends on: Tasks 2-9.
  - Validate with: `flutter analyze`, targeted tests, and `flutter test`.

## Acceptance Criteria

- [ ] CA 1: Given the user opens Voix, Papier, Snippets, or Dico, when the page renders with data, then the first visible structure follows the same order: compact summary/status, primary action, list controls, results.
- [ ] CA 2: Given navigation already names the page, when the page renders, then large repeated in-page titles such as "Voix", "Presse-papier", "Snippet", or "Dictionnaire" are not reintroduced above the summary/status strip.
- [ ] CA 3: Given the app is in local-only mode, when any target page renders, then the status clearly says the page is local/local-only and does not imply cloud sync success.
- [ ] CA 4: Given a page has pending sync operations, when the summary/status strip renders, then the pending state is visible and distinguishable from both error and synced states.
- [ ] CA 5: Given a page sync or refresh fails, when the error is present, then the page shows a recoverable inline status and does not hide readable local data.
- [ ] CA 6: Given the clipboard contains private or sensitive entries, when the Papier summary renders, then it shows safe counts/status only and does not reveal sensitive item content.
- [ ] CA 7: Given a `360x740` or `390x844` viewport, when each target page renders, then critical buttons do not overflow or truncate unreadably, the first viewport shows summary/status plus the start of the primary action area, and there are no two consecutive empty vertical gaps of `16dp` or more between page zones.
- [ ] CA 8: Given a search query with no matching result, when the result area renders, then the search-empty state appears inside the results zone below list controls and does not add a large page-level card above search.
- [ ] CA 9: Given the user creates, edits, deletes, searches, refreshes, or sends an item from a migrated page, when the action completes or fails, then existing behavior and recovery semantics are preserved.
- [ ] CA 10: Given implementation is complete, when `rg "_MetricPill|_ClipboardMetricPill|_SnippetMetricPill|_DictionaryMetricPill" lib/features` runs, then no duplicated private metric pill class remains.
- [ ] CA 11: Given implementation is complete, when `flutter analyze` and relevant widget tests run, then they pass without local Android builds or Gradle tasks.
- [ ] CA 12: Given implementation is ready for product review, when Diane opens the Flutter web or app surface, then Voix, Papier, Snippets, and Dico all present the same four-zone order and no target page reintroduces a standalone English local-mode notice.

## Test Strategy

- Add or update shared widget tests for `ProductPageScaffold`, summary/status strip, metric pills, status pills, list toolbar, and narrow width layout.
- Add or update page tests for Voix, Papier, Snippets, and Dico to assert the shared skeleton, primary action visibility, compact empty/search states, and preserved controls.
- Add status adapter tests for local-only, pending, loading, synced, disabled/account-required, and error states.
- Keep existing route/auth/shell tests passing because page title removal and compact summaries can affect app-level rendering assertions.
- Run checks in this order:
  - `flutter analyze`
  - targeted tests for the changed shared component and page files
  - `flutter test`
- Do not run Android-native build/install commands locally. Use CI/device QA only if native behavior becomes affected despite the scope boundary.

## Risks

- A shared scaffold can become too abstract if it tries to encode every page detail as configuration. Mitigation: use slots and small display models.
- Voice may not fit the CRUD rhythm perfectly. Mitigation: allow voice-specific status and action slots while keeping the overall page order.
- Sync concepts are currently split. Mitigation: create a display adapter that is explicit about source and meaning, and do not change backend sync behavior in this chantier.
- Collapsing or visually reducing forms can hurt discoverability. Mitigation: primary actions remain visible and page-specific defaults are tested.
- Large page files can make the migration risky. Mitigation: migrate page by page with targeted tests and avoid unrelated refactors.
- Exact-text widget tests may fail. Mitigation: update tests to assert behavior and shared structure, not stale repeated headings.

## Execution Notes

- Start by reading `docs/explorations/2026-06-10-product-pages-ux-remaster.md`, `docs/COMPONENTS.md`, and the four target page files.
- Preserve the app's existing token/theme vocabulary and avoid new packages unless a later readiness review explicitly justifies one.
- Implement shared primitives first, then migrate one page at a time.
- Prefer small extraction steps over a full rewrite of each page file.
- Stop and reroute to a new spec if implementation reveals that sync semantics, backend merge rules, account entitlements, or native Android keyboard behavior must change.
- Fresh external docs verdict: fresh-docs not needed for the ready spec because the scope is local Flutter UI composition using existing app patterns.

## Open Questions

None.

Implementation decision: primary creation and capture actions stay visible by default on all four target pages. The remaster may reduce explanatory copy and compact the visual container, but it must not hide the primary action behind a collapsed section or secondary navigation without a separate product decision or spec update.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-06-10 15:32:15 UTC | sf-spec | GPT-5 Codex | Created draft spec from user feedback, exploration report, and component audit evidence | Draft saved | `/sf-ready shipglows_data/workflow/specs/winglowz-product-pages-ux-remaster.md` |
| 2026-06-10 15:37:08 UTC | sf-ready | GPT-5 Codex with gpt-5.4 medium explorer review | Reviewed user-story alignment, scope boundaries, security/privacy assumptions, proof contract, and implementation actionability | not ready: explorer found underspecified status sources and proof gaps | `/sf-ready shipglows_data/workflow/specs/winglowz-product-pages-ux-remaster.md` |
| 2026-06-10 15:38:54 UTC | sf-ready | GPT-5 Codex | Resolved status-source contract, local-mode handling, viewport proof rules, dependencies, and open primary-action decision | ready | `/sf-start shipglows_data/workflow/specs/winglowz-product-pages-ux-remaster.md` |
| 2026-06-10 16:30:49 UTC | sf-start | GPT-5 Codex | Implemented shared product-page scaffold, summary/status primitives, four page migrations, docs update, and focused/full Flutter tests | implemented | `/sf-verify shipglows_data/workflow/specs/winglowz-product-pages-ux-remaster.md` |
| 2026-06-10 16:39:19 UTC | sf-verify | GPT-5 Codex | Verified local code, tests, docs, status-source contract, and Flutter proof ladder through automated checks | partial: Vercel Flutter web smoke still required on deployed build | `/sf-ship shipglows_data/workflow/specs/winglowz-product-pages-ux-remaster.md` |
| 2026-06-10 18:24:57 UTC | sf-ship | GPT-5 Codex | Confirmed remaster files are included in commit `134ee64`, already pushed to `origin/main`; unrelated business-file edits left untouched | shipped: code already on remote; production/web smoke still required | `/sf-prod https://winglowz-app.vercel.app/`, then manual product-page smoke |
| 2026-06-10 18:35:00 UTC | sf-browser | GPT-5 Codex | Checked documented Flutter web URLs with Chromium/CDP, screenshots, DOM, headers, console and reversible local-mode navigation | needs-deploy: `winglowz-app.vercel.app` is 404; `app.winglowz.com` is an old cached build still showing pre-remaster pages | `/sf-prod winglowz_app`, then rerun `sf-browser` on the confirmed deployment URL |
| 2026-06-10 18:59:09 UTC | sf-prod | GPT-5 Codex | Verified Vercel/GitHub deployment status for latest commit `e0d1d53`, inspected `winglowz` deployment health and `app.winglowz.com` app health | partial: site deploy ready; active Flutter app URL `https://app.winglowz.com/` still serves the 2026-05-30 build | Deploy current monorepo Flutter app to `https://app.winglowz.com/`, then rerun `/sf-browser https://app.winglowz.com/` |
| 2026-06-10 19:07:11 UTC | operator correction | Diane | Clarified that `https://app.winglowz.com/` is the correct Flutter web URL for monorepo app verification | corrected target: use `https://app.winglowz.com/` for Flutter web checks | Deploy current app build there, then rerun `/sf-browser https://app.winglowz.com/` |
| 2026-06-10 19:15:06 UTC | sf-prod | GPT-5 Codex | Inspected `https://app.winglowz.com/` and Vercel project `winglowz-app` after the project was repointed to the monorepo root `winglowz_app` | pass: production deployment `dpl_59sAwj2FnFsJPoGjAg1qX9VJpdEn` is Ready, aliased to `app.winglowz.com`, and serving a 2026-06-10 build | `/sf-browser https://app.winglowz.com/` for product-page visual smoke |
| 2026-06-10 19:18:02 UTC | sf-browser | GPT-5 Codex | Opened `https://app.winglowz.com/` in Chromium/CDP mobile viewport, entered local mode, captured Accueil, Voix, Papier, Snippets, Dico, and Réglages | partial/pass visual smoke: pages render, bottom labels show `Papier` and `Dico`, old large repeated page titles are absent, no runtime exceptions or network loading failures observed; full product-feel and data/action scenarios remain manual | Diane product-feel review on the deployed app |

## Current Chantier Flow

- sf-spec: done, draft created.
- sf-ready: done, ready.
- sf-start: done, implemented locally.
- sf-verify: partial at local verification time; deployed web smoke was completed later through sf-prod/sf-browser.
- sf-browser: partial/pass visual smoke, `https://app.winglowz.com/` renders the remastered local-mode product pages in Chromium/CDP at `390x844`; no runtime exception or network loading failure observed.
- sf-prod: pass, Vercel project `winglowz-app` production deployment is Ready and aliased to `https://app.winglowz.com/`.
- sf-end: not required in quick ship flow.
- sf-ship: shipped, commit `134ee64` already on `origin/main`; no current chantier code changes remained dirty.

Reste a faire: Diane product-feel review on `https://app.winglowz.com/`, especially first-viewport density, French copy, sync/status clarity, and create/search/refresh action behavior with real local data.
Prochaine etape: Diane tests the deployed app; route any concrete visual or behavior regression to `/sf-fix`.
