---
artifact: technical_module_context
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-07-04"
updated: "2026-07-04"
status: reviewed
source_skill: 102-sf-start
scope: "ime-gestures"
owner: "Diane"
confidence: high
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - "Android InputMethodService"
  - "Flutter keyboard settings surfaces"
  - "shipglows_data/workflow/specs"
depends_on:
  - "shipglows_data/technical/winglowz_app/context.md@1.0.0"
  - "shipglows_data/technical/winglowz_app/context-function-tree.md@1.0.0"
  - "shipglows_data/technical/winglowz_app/code-docs-map.md@0.1.0"
  - "winglowz_app/docs/technical/android-native.md@0.1.0"
supersedes: []
evidence:
  - "WinGlows IME swipe investigation across WinGlowzKeyboardView.kt and KeyboardLongPressSwipePolicy.kt."
  - "Spec shipglows-code-navigation-and-function-documentation-system.md task 8 pilot."
next_review: "2026-08-04"
next_step: "/300-sf-docs technical audit"
---

# Technical Behavior Index: WinGlows IME Gestures

## Purpose

This file owns term-based recovery for WinGlows IME gesture behavior. It exists because operator terms such as `swipe` are ambiguous in the IME and otherwise force repeated search across native code, docs, tests, and workflow artifacts.

## Canonical Role

- `context.md` stays the system overview for WinGlows technical surfaces.
- `context-function-tree.md` stays the structural overview.
- `code-docs-map.md` stays the path-to-doc routing map.
- This file owns `gesture term -> named IME behavior -> code/tests/specs/docs` recovery.

## Operator Terms And Aliases

| Term | Meaning | Status | Notes |
| --- | --- | --- | --- |
| `swipe` | IME gesture family | ambiguous | Must be resolved into one named behavior before reading code. |
| `long-press swipe` | Hold on a key, exit it, then release on another key to dispatch there | canonical | This is the luminous beam / release-to-activate behavior. |
| `space slider` | Horizontal gesture starting from space for cursor movement | canonical | Protected interaction; not the same as long-press swipe dispatch. |
| `ctrl swipe` | Ctrl-row gesture dispatch mode | canonical | Shares part of the long-press swipe machinery. |
| `corner swipe` | Directional or corner assignment on a key | canonical | Target-side gesture meaning once a key is chosen. |
| `row scroll` | Horizontal row scrolling interaction | canonical | Protected interaction; should block long-press swipe launch. |

## Ambiguity Table

| Operator term | Named behavior | When to use this meaning | Primary entrypoint |
| --- | --- | --- | --- |
| `swipe` | `long-press-swipe-dispatch` | User holds a key, leaves the origin key, sees the beam, and releases on a target key. | `WinGlowzKeyboardView.tryActivateLongPressSwipeFromExit` |
| `swipe` | `space-slider-navigation` | Gesture begins on the space key and preserves cursor slider behavior. | `KeyboardLongPressSwipePolicy.shouldPreserveSpaceSliderGesture` |
| `swipe` | `ctrl-hold-swipe-dispatch` | Gesture begins from Ctrl or from the Ctrl launch row. | `WinGlowzKeyboardView.activateCtrlHoldSwipeMode` |
| `swipe` | `target-corner-selection` | A hovered target key resolves to up/right/down/left gesture meaning. | `WinGlowzKeyboardView.longPressSwipeSelectionForTarget` |
| `swipe` | `row-scroll-or-panel-scroll` | Row or panel scrolling consumes the pointer interaction and should prevent dispatch launch. | `KeyboardLongPressSwipePolicy.canLaunchCtrlSwipeFromRow` |

## Behaviors

### `long-press-swipe-dispatch`

- Summary: after the pointer exits the pressed origin key, WinGlows can switch into dispatch mode, render the visual beam, track a hovered target key, and dispatch on release instead of forcing the user to toggle a separate mode.
- Entrypoints:
  - `winglowz_app/android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - `tryActivateLongPressSwipeFromExit`
  - `updateLongPressSwipeHoveredTarget`
  - `tryDispatchAfterLongPressSwipe`
- Key symbols:
  - `KeyboardLongPressSwipePolicy.canActivateFromKeyExit` - launch guard for exit-based activation
  - `KeyboardLongPressSwipePolicy.chooseTargetSelection` - target-side directional arbitration
  - `registerLongPressSwipeVisual` - starts the beam visual state
  - `longPressSwipeHoveredKeyByPointerId` / related maps - active target hover bookkeeping
- Tests:
  - `No dedicated automated test located in this pilot artifact yet; current proof is documentation + source contract coverage.`
- Specs / bugs:
  - `/home/claude/shipglows/shipglows_data/workflow/specs/shipglows-code-navigation-and-function-documentation-system.md`
- Decisions:
  - `no durable decision record needed - this pilot documents a local navigation/recovery contract rather than a separate product architecture decision`
- Failure / drift signals:
  - renamed target-selection helpers
  - stale key symbol links
  - dispatch launch rules diverge from source comments

### `space-slider-navigation`

- Summary: a space-origin horizontal gesture keeps cursor-slider semantics and must not be converted into Ctrl-swipe launch.
- Entrypoints:
  - `KeyboardLongPressSwipePolicy.shouldPreserveSpaceSliderGesture`
  - `WinGlowzKeyboardView.canLaunchCtrlSwipeFromFrame`
- Key symbols:
  - `spaceSlideStartPx`
- Tests:
  - `See Android native validation guidance in winglowz_app/docs/technical/android-native.md`
- Specs / bugs:
  - `none linked in this pilot`
- Decisions:
  - `no durable decision record needed - local gesture arbitration rule`

### `ctrl-hold-swipe-dispatch`

- Summary: Ctrl can enter a swipe dispatch mode directly from the modifier key or from the Ctrl launch row when scroll interactions are not consuming the pointer.
- Entrypoints:
  - `activateCtrlHoldSwipeMode`
  - `activateCtrlHoldSwipeDispatchMode`
  - `KeyboardLongPressSwipePolicy.canLaunchCtrlSwipeFromRow`
- Key symbols:
  - `ctrlHoldPointerIds`
  - `ctrlSwipeLaunchRowIndex`

### `target-corner-selection`

- Summary: once a target key is hovered, the target key decides whether the dispatch means up/right/down/left based on available corner assignments.
- Entrypoints:
  - `updateLongPressSwipeHoveredTarget`
  - `longPressSwipeSelectionForTarget`
  - `KeyboardLongPressSwipePolicy.chooseTargetSelection`
- Key symbols:
  - `longPressSwipeTargetSelections`
  - `setLongPressSwipeHoveredKey`

### `row-scroll-or-panel-scroll`

- Summary: row scroll and panel scroll are protected interactions. They should prevent Ctrl-swipe launch so scrolling does not accidentally become dispatch mode.
- Entrypoints:
  - `KeyboardLongPressSwipePolicy.canLaunchCtrlSwipeFromRow`
  - `canLaunchCtrlSwipeFromFrame`

## Recovery Path

```text
swipe
  -> long-press-swipe-dispatch | space-slider-navigation | ctrl-hold-swipe-dispatch | target-corner-selection | row-scroll-or-panel-scroll
  -> WinGlowzKeyboardView.kt / KeyboardLongPressSwipePolicy.kt
  -> android-native.md + code-docs-map.md
  -> linked spec and future audit/checklist artifacts
```

## Reader Checklist

- Gesture launch rules changed -> recheck `tryActivateLongPressSwipeFromExit`, `canLaunchCtrlSwipeFromFrame`, and `KeyboardLongPressSwipePolicy`.
- Hover/target logic changed -> recheck `updateLongPressSwipeHoveredTarget`, `longPressSwipeSelectionForTarget`, and target selection comments.
- Release dispatch changed -> recheck `tryDispatchAfterLongPressSwipe`.
- New gesture meaning added to the IME -> extend aliases and ambiguity table before closing the workstream.

## Maintenance Rule

Update this index when IME gesture aliases, long-press swipe launch rules, hovered target resolution, dispatch-on-release behavior, or linked artifacts change.
