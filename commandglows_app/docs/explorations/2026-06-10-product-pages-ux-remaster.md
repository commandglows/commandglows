---
artifact: exploration_report
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlowz"
created: "2026-06-10"
updated: "2026-06-10"
status: draft
source_skill: sf-explore
scope: "product-pages-ux-remaster"
owner: "Diane"
confidence: medium
risk_level: medium
security_impact: no
docs_impact: yes
linked_systems:
  - "winglowz_app/lib/core/widgets/app_components.dart"
  - "winglowz_app/lib/features/shell/presentation/app_shell_screen.dart"
  - "winglowz_app/lib/features/voice/presentation/voice_screen.dart"
  - "winglowz_app/lib/features/clipboard/presentation/clipboard_screen.dart"
  - "winglowz_app/lib/features/snippets/presentation/snippets_screen.dart"
  - "winglowz_app/lib/features/dictionary/presentation/dictionary_screen.dart"
  - "winglowz_app/lib/core/sync/cloud_sync_overview.dart"
evidence:
  - "User feedback: pages feel noisy, repetitive, insufficiently compact, and inconsistent across voice, clipboard, snippets, dictionary."
  - "Code read: product pages independently compose summary, form, list header, search, sync action, empty state, and entity rows."
  - "Code read: AppSyncStatus and CloudSyncOverview are parallel sync concepts with different visibility and wording."
depends_on:
  - "CLAUDE.md@1.2.0"
  - "docs/COMPONENTS.md"
supersedes: []
next_step: "/sf-spec WinGlowz product pages UX remaster"
---

# Exploration Report: Product Pages UX Remaster

## Starting Question

How should WinGlowz improve the UX and interface consistency of the main product pages: voice, clipboard, snippets, dictionary, and related sync/status surfaces?

## Context Read

- `lib/core/widgets/app_components.dart` - Common cards, action rail, search field, sync action, entity cards.
- `lib/features/shell/presentation/app_shell_screen.dart` - Main navigation, app bar removal, bottom bar labels, rail/bottom navigation structure.
- `lib/features/voice/presentation/voice_screen.dart` - Voice-specific summary, capture card, overlay controls, history list.
- `lib/features/clipboard/presentation/clipboard_screen.dart` - Clipboard summary, add form, pending sync count, list.
- `lib/features/snippets/presentation/snippets_screen.dart` - Snippet form and list, recently added compact summary.
- `lib/features/dictionary/presentation/dictionary_screen.dart` - Dictionary form and list, recently added compact summary.
- `lib/core/sync/cloud_sync_overview.dart` and `lib/features/settings/application/cloud_sync_overview_provider.dart` - Global cloud sync model and category states.
- `lib/features/sync/domain/local_cloud_sync_models.dart` - Lower-level local/cloud sync domain states and decisions.

## Internet Research

Not used. This exploration was anchored in the current Flutter codebase and user feedback.

## Problem Framing

The pages are functionally close, but visually and structurally inconsistent. Each page independently decides:

- what counts as the page summary,
- where the sync state appears,
- how much explanatory text is visible,
- what the primary creation form looks like,
- how search and refresh appear,
- what empty/search states say,
- how list items expose actions.

This creates a feeling of noise because the same conceptual zones are repeated with slightly different shape and density.

Current rough structure:

```text
Voix
  Local notice
  Optional pack warning
  Capture automatique card
  Summary card
  Optional overlay control card
  Busy/message
  List title
  Search + refresh
  Empty/list

Papier
  Local notice
  Summary card
  Creation form
  Busy/message
  List title
  Search + refresh
  Empty/list

Snippets
  Local notice
  Summary card
  Creation form
  Busy/message
  List title
  Search + refresh
  Empty/list

Dico
  Local notice
  Summary card
  Creation form
  Busy/message
  List title
  Search + refresh
  Empty/list
```

The desirable target is not that every page has identical content, but that every page has the same skeleton:

```text
┌────────────────────────────────────────────┐
│ Compact page strip                         │
│ metrics + sync + critical status            │
├────────────────────────────────────────────┤
│ Primary action surface                      │
│ create/import/record depending on page      │
├────────────────────────────────────────────┤
│ List controls                               │
│ search + filter/sort + refresh/sync         │
├────────────────────────────────────────────┤
│ Results                                     │
│ same entity density, same actions grammar   │
└────────────────────────────────────────────┘
```

## Option Space

### Option A: Keep Page-Specific Widgets, Tune Them Individually

- Summary: Adjust each screen in place: compact cards, remove repeated titles, tune spacing, improve sync copy.
- Pros:
  - Fastest to apply incrementally.
  - Low architectural risk.
  - Lets each page keep domain-specific affordances.
- Cons:
  - The current drift will return.
  - Four versions of summary/status/list controls stay alive.
  - Future pages will likely copy the wrong local pattern.

### Option B: Create A Shared Product Page Frame

- Summary: Introduce a page-level composition primitive for these domain pages: compact summary strip, primary action slot, list toolbar, results slot, status/message slot.
- Pros:
  - Strong consistency across pages.
  - Makes density, spacing, sync status, and title policy centrally controllable.
  - Reduces repeated UI decisions in each screen.
  - Gives future remastering one place to work from.
- Cons:
  - Requires careful API design so voice/overlay does not become awkward.
  - More initial refactor risk.
  - Needs widget tests across all pages because layout contracts change.

### Option C: Split Pages Into Dashboard + Editor Modes

- Summary: Make each page default to a compact “dashboard/list” view and move creation/editing into a bottom sheet or dedicated editor panel.
- Pros:
  - Major reduction in first-screen noise.
  - Better mobile ergonomics: list content becomes primary.
  - Forms stop occupying top real estate when unused.
- Cons:
  - Bigger UX change.
  - Requires interaction design decisions for add/edit/cancel/save.
  - Could slow down users who add many snippets or dictionary terms in sequence unless batch entry is designed.

## Comparison

| Criterion | Option A | Option B | Option C |
| --- | --- | --- | --- |
| Consistency | Medium | High | High |
| Compactness | Medium | High | Very high |
| Implementation risk | Low | Medium | High |
| Future durability | Low | High | Medium/high |
| Works with voice overlay | Easy | Needs good slots | Needs special case |
| Sync clarity | Medium | High | High |
| Best fit for current complaint | Partial | Strong | Strong but larger |

## Emerging Recommendation

Use Option B as the main route, with a restrained piece of Option C.

Recommendation:

1. Define a shared `ProductPageScaffold` or equivalent local pattern for the four pages.
2. Put a compact summary/status strip at the top of each page.
3. Move page-specific creation actions into a consistent “primary action” area.
4. Allow the primary action area to be collapsible or visually secondary on pages where the list is usually more important.
5. Normalize sync status through one adapter layer so each page uses the same state grammar.

The key idea is: same skeleton, domain-specific content.

## UX Principles For The Remaster

- First viewport should answer: “what is here, is it synced, what can I do next?”
- Avoid duplicate labels when nav already names the page.
- Metrics should be compact and comparable across pages.
- Explanatory text should be rare and contextual, not repeated at the top of every page.
- Search/refresh/sync controls should always live in the same relative zone.
- Empty states should be calm and useful, not another large card competing with the form.
- Domain-specific controls should exist, but not break the page rhythm.

## Proposed Shared Page Grammar

```text
ProductPage
  summaryStrip:
    metric pills
    sync pill/action
    critical inline warning only when needed

  primaryAction:
    create form, record controls, import, or quick action
    can be compact/collapsed

  listToolbar:
    search
    filter/sort if available
    refresh/sync action

  resultArea:
    empty state
    search empty state
    list item cards/rows
```

Suggested per-page summaries:

| Page | Primary metrics | Secondary status | Avoid |
| --- | --- | --- | --- |
| Voix | transcriptions, latest capture | overlay state, pack warning only if actionable | extra “Capture automatique” explanation card |
| Papier | items, pinned, pending/local sync | latest capture | “Clipboard” title and long descriptive text |
| Snippets | snippets, labeled, latest add | keyboard sync state | redundant “Snippets” list title if nav already says it |
| Dico | terms, case-sensitive, latest add | keyboard sync state | verbose correction explanation on first viewport |

## Sync UX Direction

Current sync concepts are split:

- `AppSyncStatus`: page-local display model for refresh/loading/error/pending.
- `CloudSyncOverview`: global account/cloud/category model.
- `LocalCloudSyncState`: deeper sync decisions, conflicts, pending operations.

The UI would benefit from a domain adapter:

```text
Domain data + page busy/error
        │
        ▼
DomainPageStatus
        │
        ├─ display label: "À jour", "Local", "En attente", "Erreur"
        ├─ semantic color/icon
        ├─ tooltip/detail
        ├─ primary action: refresh / connect / resolve / retry
        └─ metrics: local count, pending count, last sync
```

That adapter can prevent every page from writing its own `_pageStatus()` and its own error string detection.

## Non-Decisions

- Exact visual styling of the new shared scaffold.
- Whether forms should be collapsed by default.
- Whether voice overlay controls stay in the main flow or become a compact control strip.
- Whether bottom navigation labels should stay `Papier`/`Dico` long-term or become icon-only at very narrow widths.

## Rejected Paths

- More one-off compaction only - rejected as insufficient because the inconsistency is structural.
- A full redesign without shared primitives - rejected because it would be hard to keep consistent.
- Removing all summary metrics - rejected because they can provide orientation if they are compact and placed consistently.

## Risks And Unknowns

- Form discoverability: collapsing forms reduces noise but may hide creation actions.
- Voice is structurally different because it has overlay, language packs, recording, and transcriptions.
- Sync truth source is not fully unified; page statuses may mislead if they ignore account/cloud entitlement state.
- Tests currently assert many screen labels; a remaster needs a deliberate widget-test update strategy.
- Android-native behavior remains outside local build validation; shared Flutter UI can be widget-tested, but IME/sync-to-keyboard needs CI/device proof.

## Redaction Review

- Reviewed: yes
- Sensitive inputs seen: none
- Redactions applied: none
- Notes: No secrets, tokens, cookies, private keys, customer data, or sensitive logs were read or persisted.

## Decision Inputs For Spec

- User story seed: As a WinGlowz user, I want the main pages to use the same compact structure so I can move between voice, paper, snippets, and dico without relearning the interface.
- Scope in seed:
  - Shared page skeleton for main product pages.
  - Compact top summary/status strip.
  - Consistent list toolbar.
  - Consistent empty/search states.
  - Sync status adapter or display grammar.
  - Widget tests for all affected pages.
- Scope out seed:
  - Native Android IME rendering changes.
  - Backend sync algorithm changes.
  - Full settings screen redesign.
  - New paid/account entitlement behavior.
- Invariants/constraints seed:
  - Do not remove existing create/edit/delete/search functionality.
  - Keep Android-native validation out of local VM builds.
  - Preserve accessible labels and touch targets.
  - Avoid first-screen noise and repeated page names.
  - Keep page-specific affordances where they matter.
- Validation seed:
  - `flutter analyze`
  - targeted widget tests for voice/clipboard/snippets/dictionary shell rendering
  - widget tests for compact/narrow viewport layout
  - widget tests for sync status display states
  - optional Flutter web smoke before APK/device QA

## Handoff

- Recommended next command: `/sf-spec WinGlowz product pages UX remaster`
- Why this next step: The change is cross-page and touches shared UI contracts, sync display, tests, and product structure. It should be specified before implementation to avoid another series of local visual patches.

## Exploration Run History

| Date UTC | Prompt/Focus | Action | Result | Next step |
|----------|--------------|--------|--------|-----------|
| 2026-06-10 15:02:56 UTC | Explore UX/UI improvements for product pages, compactness, repetition, sync, and consistency | Read common widgets, shell, main product screens, and sync models | Identified shared page-frame opportunity and sync-display split | `/sf-spec WinGlowz product pages UX remaster` |
