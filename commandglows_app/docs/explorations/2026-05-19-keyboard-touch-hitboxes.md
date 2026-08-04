---
artifact: exploration_report
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "winglowz_app"
created: "2026-05-19"
updated: "2026-05-19"
status: draft
source_skill: sf-explore
scope: "Android IME keyboard visual layout versus tactile hitboxes"
owner: "Diane"
confidence: high
risk_level: medium
security_impact: none
docs_impact: yes
linked_systems:
  - "android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt"
  - "android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardLayoutModels.kt"
  - "android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardThemeModels.kt"
evidence:
  - "WinGlowzKeyboardView.KeyFrame currently stores one RectF used for both drawing and hit testing."
  - "WinGlowzKeyboardView.hitTest returns the first key frame whose rect contains the touch point."
  - "drawRow and drawPanelScrollRow apply visual key gaps and keyWidthScale before adding KeyFrame hit areas."
  - "KeyboardLayoutModels defines mode-specific rows with varying weights and leading/trailing spacers, so ABC, numbers, symbols, accents, and navigation do not share a stable grid."
depends_on: []
supersedes: []
next_step: "shipglows_data/workflow/specs/keyboard-stable-grid-touch-geometry.md"
---

# Exploration Report: Keyboard Touch Hitboxes

## Starting Question

Diane asked whether WinGlowz can keep its current keyboard design, spacing, theme, and customization while making the tactile layer behave more like a gapless grid, because fast typing sometimes misses keys.

## Context Read

- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt` - source of touch handling, hit testing, row drawing, key drawing, scroll rows, and debug overlay.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardLayoutModels.kt` - source of key and row layout data.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardThemeModels.kt` - source of theme spacing settings such as key gaps and width scale.
- `AGENTS.md` - confirmed Android build and Gradle commands are forbidden locally.

## Internet Research

- None.

## Problem Framing

The current code couples the visual rectangle and tactile rectangle of a key. If a theme creates a visible gap between keys, that gap is also a dead touch zone. This explains why a fast typist can miss keys even when the intended touch lands visually near the correct key.

The goal is to keep the visual design intact while making the interaction layer denser and more forgiving. A second goal emerged during exploration: the main keyboard modes should feel like they share the same physical grid, instead of changing key widths between ABC, numbers, symbols, accents, and navigation.

## Option Space

### Option A: Reduce Visual Gaps

- Summary: Make the keyboard look more like a dense grid by lowering `keyHorizontalGap`, `rowVerticalGap`, or `keyWidthScale`.
- Pros: Simple and low implementation risk.
- Cons: Weak fit for the brand direction because it changes the visible design.

### Option B: Separate Visual Rect And Touch Rect

- Summary: Store one rectangle for drawing and another rectangle for hit testing. The visual key keeps gaps, radius, shadows, and theme styling; the touch rect fills the surrounding slot.
- Pros: Preserves the visual system while improving fast typing accuracy.
- Cons: Requires careful non-overlapping geometry and QA on edge cases.

### Option C: Shared Grid Presets

- Summary: Define reusable keyboard grid presets for common rows, then map ABC, numbers, symbols, accents, and navigation onto those presets instead of hand-tuning weights per mode.
- Pros: Improves harmony, makes touch behavior predictable, reduces layout drift across modes.
- Cons: Requires deciding which rows should truly be uniform and which commands deserve wider cells, especially space, enter, and destructive/navigation keys.

## Comparison

Option A solves missed taps by sacrificing visual spacing. Option B solves the real interaction problem while preserving the design. Option C addresses a broader consistency problem: even with better hitboxes, inconsistent row weights can make the keyboard feel less predictable.

Option B and Option C should be combined. The layout engine should produce stable cells, then split them into `touchRect` and `visualRect`.

## Emerging Recommendation

Implement Option B and Option C together. Extend `KeyFrame` from a single `rect` to explicit `visualRect` and `touchRect`. Use `visualRect` for `drawKey`, press visuals, and normal rendering. Use `touchRect` for `hitTest`.

The tactile layer should be built from non-overlapping slots, not by expanding every key rectangle freely. Horizontal gaps should be split at the midpoint between neighboring keys. Vertical row gaps should also be assigned to adjacent rows without capturing the status area or outside-keyboard area.

Extract a reusable grid layout layer, for example `KeyboardGridLayoutEngine`, that accepts a `KeyboardRowSpec`, row bounds, gap, scale, and clipping constraints, then returns cells with:

- `slotRect`: the stable grid cell.
- `visualRect`: the branded key shape inside the slot.
- `touchRect`: the gapless tactile area, usually the full slot clipped to the active viewport.

Then normalize the row specs so the main modes reuse a small set of row patterns instead of scattering `weight`, `leadingWeight`, and `trailingWeight`.

Update after spec creation: the chosen product rule is stricter than generic presets. Main-mode standard keys use one logical cell, and allowed exceptions use whole-cell multiples such as `2x`, `3x`, or `4x`. Fractional layout weights should not be used for main-mode geometry.

## Layout Findings

- ABC/Letters: top rows are mostly uniform, but the third row has `Shift` and `Del` at `1.2f`, so it is not the same grid as the symbol third row.
- Numbers: rows use `0.9f` for signs and `1.1f` for central digits, which intentionally changes widths and breaks grid alignment with ABC.
- Symbols: first two rows are uniform, but the third row uses `leadingWeight = 0.5f` and `Del = 1.2f`.
- Accents: rows use leading spacers, and the third row is short with five wider keys, creating a very different grid.
- Navigation: several keys use `1.1f` or `1.15f`, and rows often contain six action keys, so navigation feels wider and less dense than standard keyboard rows.
- `drawRow()` and `drawPanelScrollRow()` duplicate the same weight-based math, so a single grid engine would also reduce implementation drift.

## Non-Decisions

- Exact touch expansion values are not final.
- Whether edge rows should capture all outer padding is not final.
- Whether the debug overlay should show only touch rects or both visual and touch rects is not final.
- Whether navigation should preserve any wider command cells is not final.
- Whether accents should remain centered-short visually while keeping a standard tactile grid is not final.

## Rejected Paths

- Blindly enlarging every `RectF` - rejected because neighboring hitboxes can overlap and `hitTest` currently picks the first match, which would make some misses turn into wrong-key taps.
- Removing the visual gaps - rejected because it weakens the product and brand direction.
- Continuing to tune per-row weights manually - rejected as the long-term model because it keeps producing mode-to-mode drift.

## Risks And Unknowns

- Scrollable rows must not allow off-screen keys to capture touches. Their touch rects need to be clipped to the visible row viewport.
- Vertical panels must not let clipped rows capture hidden touches.
- Corner gestures may feel more permissive if started from gap zones; this needs physical-device QA.
- The current debug overlay draws the same rect as the hitbox. After separation, it should expose the real tactile zones.
- If every action key is forced to identical width, long labels such as `Word←`, `DelW←`, and `Début` may need shorter labels or icon-first rendering.
- The product decision is not only technical: consistency should win by default, but space/enter/delete may still need deliberate exceptions.

## Redaction Review

- Reviewed: yes
- Sensitive inputs seen: none
- Redactions applied: none
- Notes: No secrets, tokens, cookies, private keys, customer data, or sensitive logs were read.

## Decision Inputs For Spec

- User story seed: As a fast typist, I want the visual keyboard to keep its designed spacing while the tactile layer has no dead gaps, so my taps remain reliable without making the keyboard visually plain.
- Scope in seed: Android IME key hit testing, normal rows, panel rows, scrollable rows, debug touch overlay, shared grid presets for main modes.
- Scope out seed: Visual theme redesign, changing labels/actions, Android APK validation on this VM.
- Invariants/constraints seed: Preserve visible key gaps and theme styling; tactile rectangles must not overlap ambiguously; main mode rows should reuse stable grid presets unless a deliberate exception is specified; Android build validation must go through CI and Diane physical QA.
- Validation seed: `flutter analyze`, targeted tests if available, debug overlay inspection, Blacksmith Android build, Diane fast-typing QA on physical device.

## Handoff

- Created spec: `shipglows_data/workflow/specs/keyboard-stable-grid-touch-geometry.md`
- Why this next step: The implementation is feasible but interaction-sensitive, so the exact tactile geometry and clipping behavior are tracked in the chantier spec before code changes.

## Exploration Run History

| Date UTC | Prompt/Focus | Action | Result | Next step |
|----------|--------------|--------|--------|-----------|
| 2026-05-19 18:17:24 UTC | Keyboard tactile gaps | Inspected IME touch handling locally and with one explorer subagent | Found visual and tactile rectangles are coupled; recommended separate visual/touch geometry | `/sf-spec keyboard-touch-hitboxes` |
| 2026-05-19 18:21:31 UTC | Cross-mode grid consistency | Inspected ABC, numbers, symbols, accents, navigation layouts locally and with one explorer subagent | Found row weights/spacers vary by mode; recommended shared grid presets plus visual/touch geometry separation | `/sf-spec keyboard-touch-hitboxes` |
| 2026-05-19 18:50:58 UTC | Spec follow-up | Linked the exploration to the stable grid chantier | Product rule captured: exceptions must be whole-cell multiples, not fractional weights | `sf-build` implementation/validation |
