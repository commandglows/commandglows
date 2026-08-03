---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-06-11"
created_at: "2026-06-11 02:31:09 UTC"
updated: "2026-06-11"
updated_at: "2026-06-11 12:48:08 UTC"
status: active
source_skill: 100-sf-spec
source_model: "GPT-5 Codex"
scope: "native-ime-material-press-effects"
owner: "Diane"
confidence: "high"
user_story: "En tant qu'utilisatrice du clavier Android WinGlows, je veux que les effets déclenchés par l'appui d'une touche soient fusionnés avec la matière et les surfaces de la touche, afin que le clavier 2D ou 3D paraisse physique, premium et cohérent plutôt qu'un effet décoratif posé par-dessus."
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Android native IME Canvas renderer"
  - "Android KeyboardPressEffects"
  - "Android KeyboardThemeConfig"
  - "Flutter Keyboard Theme Studio"
  - "Flutter keyboard preview"
  - "Keyboard physical relief"
  - "Keyboard motion system"
  - "Android physical-device QA"
  - "Blacksmith Android CI"
  - "Sentry Flutter/native runtime diagnostics"
depends_on:
  - artifact: "shipglows_data/workflow/specs/keyboard-theme-studio.md"
    artifact_version: "0.1.0"
    required_status: "ready"
  - artifact: "shipglows_data/workflow/specs/keyboard-physical-key-relief.md"
    artifact_version: "0.1.0"
    required_status: "ready"
  - artifact: "shipglows_data/workflow/specs/winglowz-motion-system-and-interaction-animations.md"
    artifact_version: "1.0.0"
    required_status: "ready"
  - artifact: "shipglows_data/technical/architecture.md"
    artifact_version: "1.0.1"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/guidelines.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
supersedes: []
evidence:
  - "User feedback 2026-06-11: keyboard press effects currently feel like low-quality overlays instead of effects integrated into the key surface."
  - "User feedback 2026-06-11: electric arc should use existing borders to create lightning rather than draw a separate lightning path above the key."
  - "User feedback 2026-06-11: glow should make the 2D or 3D key surface follow the glow, not add a detached glow layer."
  - "User feedback 2026-06-11: shake should move the key rectangle/body, not only a light ray or overlay above the key."
  - "android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt currently draws material effects in drawMaterialPressBackdrop and drawMaterialPressSurface, including some effects as independent fills/strokes."
  - "android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardPressEffects.kt currently emits ripple/confetti/fireworks as separate active effects over key rects."
  - "lib/features/keyboard/presentation/keyboard_theme_studio_screen.dart currently simulates some press effects with gradients, shadows and transforms in the preview."
  - "User request 2026-06-11: add hidden expressive keyboard effects including water splash, fire, and a small moving mascot trail such as a dragon or spider that follows the last pressed key."
  - "User request 2026-06-11: dragon mascot should leave sparkles and spider mascot should weave a web-like trail."
  - "User request 2026-06-11: mascot movement over 3D keys should add a light key press and a shadow so the mascot feels physically present."
  - "Official Android documentation checked 2026-06-11: custom View animation should keep drawing work lean, avoid allocations during active drawing, and invalidate only when needed."
  - "Official Flutter documentation checked 2026-06-11: CustomPainter can repaint from a Listenable without forcing build/layout, supporting lightweight preview painters."
next_step: "/103-sf-verify shipglows_data/workflow/specs/keyboard-material-press-effects.md"
---

## Title

Keyboard Material Press Effects

## Status

Implemented locally, pending native verification. `/101-sf-ready` validated the user story, scope, proof gates, security posture, documentation impact, and effect compatibility decisions on 2026-06-11. `/102-sf-start` implemented the local renderer, preview, diagnostics, documentation, and checklist changes on 2026-06-11. `001-sf-build` extended the chantier on 2026-06-11 with expressive hidden effects: `waterSplash`, `emberBurst`, `dragonTrail`, and `spiderTrail`; then refined dragon/spider trails with sparkles, web strands, mascot shadows, and light 3D key pressure. The next lifecycle step is `/103-sf-verify shipglows_data/workflow/specs/keyboard-material-press-effects.md`.

## User Story

En tant qu'utilisatrice du clavier Android WinGlows, je veux que les effets déclenchés par l'appui d'une touche soient fusionnés avec la matière et les surfaces de la touche, afin que le clavier 2D ou 3D paraisse physique, premium et cohérent plutôt qu'un effet décoratif posé par-dessus.

## Minimal Behavior Contract

When a user presses a key in the Android IME or its Flutter preview, the selected press effect must be rendered through the key's own geometry. In 3D relief mode, the effect uses the physical key body: top surface, left/right faces, bottom face, border path, shadow footprint, and pressed travel all move together. In 2D mode, the effect is clipped and blended into the key surface, border, and fill instead of floating above it. If an effect cannot be made material-aware, it must be degraded to a simpler surface/border feedback or disabled for that mode with a truthful fallback. The easy edge case to miss is `electricArc`: it must energize an existing border/edge path, not draw an independent zigzag over the key.

## Success Behavior

- Given key relief is enabled, when the user presses a key, the whole key body moves as one physical object: surface, tranches, border, text, shadow and press effect stay aligned.
- Given key relief is disabled, when the user presses a key, the effect is still clipped and blended into the 2D key surface and border.
- Given `glow` is selected, when the key is pressed, the surface, border and visible side faces brighten as a material response; any ambient aura is secondary, subtle, clipped from overlapping neighbors, and never the main effect.
- Given `electricArc` is selected, when the key is pressed, the existing border/edge path becomes electrically active; no detached zigzag floats on top of the key surface.
- Given `shake` is selected, when the key is pressed, the full key geometry is transformed together. No light ray, stroke, shadow, side face, or label should shake independently from the key body.
- Given `scale`, `pulse`, `keycapTilt` or `edgeCompression` is selected, when the key is pressed, the transform applies to the same geometry model used for the base key and relief.
- Given `specularSweep` or `inkPress` is selected, when the key is pressed, the gradient is clipped to the top surface and respects the relief faces instead of painting over unrelated areas.
- Given `ripple`, `confettiLite` or `fireworksLite` is selected, when the key is pressed, the effect starts from a key edge/surface anchor after a material key reaction. If the effect cannot remain attached and professional, it is reduced or disabled in relief mode.
- Given `waterSplash` or `emberBurst` is selected, when the key is pressed, the key surface reacts first and a bounded anchored particle burst suggests water or embers without obscuring neighboring keys.
- Given `dragonTrail` is selected, when the user taps successive keys, a small persistent dragon moves toward the latest key target, changes direction immediately on the next tap, and leaves a short trail with fading ember sparkles.
- Given `spiderTrail` is selected, when the user taps successive keys, a small persistent spider moves toward the latest key target, changes direction immediately on the next tap, and leaves a fine web-like trail with subtle cross strands.
- Given a mascot crosses or arrives on a relief-enabled key, when it overlaps the key surface, the key depresses only slightly as a hover/weight cue, without changing text input state or looking like a user tap.
- Given a mascot is visible, when it moves across 2D or 3D keys, it draws a small shadow under the mascot so it reads as present on the keyboard surface.
- Given the user previews the theme in Flutter Studio, when a key is pressed, the preview follows the same material effect semantics as the native keyboard even if it is not pixel-perfect.
- Given a key is near another key, when an effect animates, it does not hide the neighbor's top border or draw through neighboring key surfaces.
- Given private/sensitive field policy is active, when a key is pressed, decorative material effects are reduced or disabled without changing input behavior.
- Given Android reduce-motion, battery/performance constraints, or low frame rate are detected, when a key is pressed, the effect degrades to finite, low-cost surface feedback.

## Error Behavior

- If the selected effect name is unknown, Dart and Kotlin fall back to `none` and keep the keyboard usable.
- If a material-aware renderer cannot resolve valid geometry for a key, it falls back to the current pressed key fill without drawing detached effects.
- If an emitted effect queue is overloaded during fast typing, old/extra emissions are dropped and the base key press state remains correct.
- If an effect would break text contrast, border readability, or key separation, the implementation reduces intensity or uses a safer surface/border token.
- If a native runtime exception occurs during effect rendering, the keyboard error recovery path must preserve input availability and report a safe diagnostic, never typed text.
- If Flutter preview cannot reproduce native Canvas detail exactly, it must remain visually directional and must not imply stronger native parity than exists.
- If Sentry captures a runtime issue or the app exposes diagnostics, logs must include safe build identity and effect metadata only, not typed content, clipboard data, private text, image bytes, tokens, or full private paths.

## Problem

The current keyboard effect system mixes two models. Some effects are now partly integrated into `WinGlowzKeyboardView.drawMaterialPressSurface`, but other effects still behave like overlays: glow can be an aura around the rect, electric arc can be a separate path on top, and `KeyboardPressEffects` emits ripple/confetti/fireworks independently over a stored key rect. This creates the exact product issue reported by Diane: the effect looks added after the key is drawn, not produced by the key material itself. The issue becomes more visible with 3D relief because the user expects a coherent cube, where every face and border moves together.

## Solution

Introduce a material-aware key press effect pipeline. The native renderer first resolves a `KeyboardKeyMaterialGeometry` for every key from the current visual rect, relief depth, press progress, radius, border width, and role color. Every press effect then receives this geometry and returns material layer operations: body transform, surface fill blend, face shading, border path activation, ambient shadow modulation, and optional edge-attached emissions. The Flutter Theme Studio preview mirrors the same effect families with the existing widget primitives. Detached overlay effects are either rewritten as material effects or explicitly degraded to professional surface feedback.

## Scope In

- Define native key material geometry for 2D and 3D relief rendering: footprint, top surface, left/right faces, bottom face, border path, visible radius, pressed travel, shadow bounds, and safe clip bounds.
- Refactor `WinGlowzKeyboardView.drawKey` so base key rendering and press effect rendering use the same geometry object.
- Replace detached native `glow`, `electricArc`, `shake`, `scale`, `pulse`, `specularSweep`, `inkPress`, `keycapTilt`, and `edgeCompression` behavior with material-aware implementations.
- Rework `KeyboardPressEffects.kt` so emitted effects are edge/surface anchored and secondary, or disabled/degraded where they cannot remain material-attached.
- Add bounded expressive effect modes: water splash, ember/fire burst, dragon trail, and spider trail.
- Keep mascot effects in the existing advanced/collapsed effects area rather than adding prominent onboarding or marketing UI.
- Ensure all effects compose with key relief and with relief disabled.
- Ensure text, corner glyphs, pinned badges, active state, disabled state, special/action keys, scrollable rows and private mode remain correct.
- Update Flutter `KeyboardThemeStudioScreen` preview to use the same semantics for surface, border, relief and effect families.
- Update Dart/Kotlin effect metadata only if needed to represent compatibility, fallback or effect family semantics.
- Add targeted tests for effect parsing, preview labels/behavior, material geometry invariants, and safe fallback.
- Add a manual QA checklist for real Android IME visual validation because the primary behavior is native Canvas and physical-device appearance.
- Update Android native/theme documentation to define material effects and prohibit detached overlays as the default design pattern.

## Scope Out

- No new third-party animation, shader, physics or particle engine unless `/101-sf-ready` explicitly approves it after official documentation review.
- No full redesign of keyboard layout, row geometry, hit testing, corner shortcuts, snippets, clipboard, suggestions, voice, media controls, or text dispatch.
- No new user-facing effect names unless implementation proves an existing effect cannot be remastered under its current semantics.
- No snow/holiday effect in this batch.
- No marketplace, cloud sync, theme sharing, or remote effect packs.
- No GPU renderer, 3D engine, OpenGL, Compose migration, or custom shader pipeline in this chantier.
- No Android build/install/Gradle validation on this VM; Android compile/build proof must use allowed CI/Blacksmith or operator device workflow.
- No public marketing copy changes.

## Constraints

- The IME handles sensitive typed content; effect rendering and diagnostics must never log typed text, selected text, clipboard contents, voice text, private field content, auth data, tokens, or private file paths.
- The renderer must remain fast enough for typing. Effects are finite, bounded, and tied to active keys only.
- The base key geometry is the source of truth. Effects must not maintain independent rectangles that drift from the drawn key.
- Relief mode is stricter than 2D mode: all visible physical surfaces must move and shade together.
- 2D mode still requires integration: effects are clipped to key shape, border or surface and should not float over the UI.
- Accessibility and reduced-motion expectations must be preserved. Essential state feedback remains available when motion is reduced.
- Pressed state must be deterministic enough for tests and must not create unbounded invalidation loops.
- Neighbor keys must not lose border readability because of another key's effect, shadow or emission.
- User-facing French labels in the Studio remain natural and concise.
- Fresh external docs are not needed for the initial ready gate because the work uses existing local Android Canvas/Paint and Flutter rendering patterns. If implementation adopts any new framework/package/platform API, the documentation freshness gate becomes mandatory before adoption.

## Test Contract

- Surface profile: Android native IME Canvas rendering, Flutter Keyboard Theme Studio preview, local Dart/Kotlin theme models, no backend.
- Proof profile: automated local Flutter proof, targeted Kotlin/JVM proof where available, Android CI/Blacksmith compile/build proof, and Diane physical-device visual QA.
- Required proof order:
  1. Local static proof: `flutter analyze`.
  2. Local Flutter tests: `flutter test test/keyboard_theme_studio_screen_test.dart` and any new focused model/preview tests.
  3. Kotlin/JVM parser or geometry tests if the project harness supports them without forbidden Gradle tasks on this VM.
  4. Android compile/build proof through GitHub Actions/Blacksmith, not local Gradle.
  5. Physical-device QA by Diane on the IME with at least one light theme, one dark theme, one high-relief theme, and one relief-disabled theme.
- Manual checklist path: create `shipglows_data/workflow/test-checklists/keyboard-material-press-effects.md` before handing off device QA.
- Required scenarios:
  - `KMP-001`: relief enabled + glow, pressed key brightens through surface/side/border, not detached aura.
  - `KMP-002`: relief enabled + electric arc, border/edge path activates and no independent zigzag floats above the key.
  - `KMP-003`: relief enabled + shake, full key body including shadow, surface, faces, border and label moves together.
  - `KMP-004`: relief disabled + glow/electric still clips to 2D key surface or border.
  - `KMP-005`: key near another key does not obscure neighbor top border during press animation.
  - `KMP-006`: `specularSweep` and `inkPress` remain inside the top surface and do not paint over side faces incorrectly.
  - `KMP-007`: `ripple`, `confettiLite`, and `fireworksLite` are edge/surface anchored or gracefully degraded in relief mode.
  - `KMP-008`: private field policy reduces or disables decorative effects while preserving normal input.
  - `KMP-009`: fast typing does not create stuck animations, unbounded effect queues, or frame jank obvious to the user.
- `KMP-010`: Flutter preview communicates the same material effect semantics as the native IME.
- `KMP-011`: `waterSplash` and `emberBurst` remain anchored, bounded, finite, and readable during fast typing.
- `KMP-012`: `dragonTrail` and `spiderTrail` move toward the latest pressed key, retarget on rapid taps, and fade their trail without stuck animation.
- `KMP-013`: `dragonTrail` leaves short ember sparkles and `spiderTrail` leaves web-like cross strands without hiding labels or neighbor borders.
- `KMP-014`: mascot overlap gives relief-enabled keys a subtle partial press and draws a mascot shadow without changing input state.
- Required results:
  - The implementation can prove that non-decorative press effects use shared key material geometry rather than detached overlay rectangles.
  - The implementation can prove that decorative emitted effects are either edge/surface anchored or intentionally degraded in relief mode.
  - The implementation can prove that text input behavior, private field behavior, and saved theme compatibility are unchanged.
  - Diane can visually confirm on physical Android hardware that the effects feel attached to the 2D or 3D key body.
- Sentry/diagnostics expectation: if a crash/error is observed during manual or CI validation, use safe diagnostics, visible event IDs, or operator-supplied Sentry evidence only. Copied diagnostics/logs must start with commit/build identity plus Paris and UTC build timestamps per ShipGlows runtime observability rules.
- Exception with proof: local Android build, install, APK packaging, Gradle compile and `flutter run -d android` are forbidden by repo guardrails. Native proof must route through CI/Blacksmith and physical-device QA.

## Dependencies

- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`: primary native draw pipeline, key geometry, relief, material press effects and invalidation.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardPressEffects.kt`: emitted/queued effects that currently draw independent overlays.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardThemeModels.kt`: effect enum validation and numeric bounds.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`: diagnostics/status surface for active effect and runtime fallback.
- `lib/features/keyboard/domain/keyboard_models.dart`: Dart effect enum and theme config round trip.
- `lib/features/keyboard/domain/keyboard_theme_validation.dart`: theme/effect validation and compatibility warnings.
- `lib/features/keyboard/presentation/keyboard_theme_studio_screen.dart`: Flutter Studio preview and effect controls.
- `test/keyboard_theme_validation_test.dart`: Dart model and validation coverage.
- `test/keyboard_theme_studio_screen_test.dart`: Studio UI/preview coverage.
- `android/app/src/test/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardThemeModelsTest.kt`: Kotlin parser/model coverage.
- `docs/technical/android-native.md`: documentation target for the native material effect contract.
- Fresh external docs: not needed for the initial contract. Android Canvas/Paint and Flutter widget rendering are already used locally. If a new API/package is introduced, consult official docs before implementation.

## Invariants

- Text input behavior is unchanged.
- Key hit targets and layout geometry remain unchanged unless a geometry bug is explicitly found and scoped.
- The key visual body is the single source of truth for every press effect.
- Relief enabled and relief disabled modes both use material integration.
- A pressed key effect must never draw typed content, clipboard content, or private user data.
- Unknown or invalid effects fall back safely.
- Effects do not outlive their duration or keep invalidating forever.
- Text contrast and key recognizability have priority over decorative intensity.
- Private/sensitive fields may reduce visual effects but cannot change typed output.
- CI and manual proof must respect the repository guardrail that Android builds/installations are not run locally on this VM.

## Links & Consequences

- This spec refines and narrows the keyboard portion of `winglowz-motion-system-and-interaction-animations.md`.
- This spec depends on `keyboard-physical-key-relief.md` because relief geometry is the physical body that effects must use.
- `KeyboardPressEffects.kt` may stop being a global overlay emitter and become an edge-emission helper. Future effects should not bypass material geometry.
- `WinGlowzKeyboardView.kt` may need extraction into a dedicated native helper such as `KeyboardKeyMaterialGeometry.kt` or `KeyboardMaterialPressEffects.kt` if the view becomes too dense.
- Flutter preview parity is behavioral and semantic, not pixel-perfect.
- If implementation changes effect names, compatibility must preserve existing saved theme configs.
- Manual QA must judge physical credibility, not only pass/fail screenshots.
- Sentry/diagnostics are relevant for crashes and runtime failures but direct Sentry dashboard access is not available to agents.

## Documentation Coherence

- Update `docs/technical/android-native.md` with the material effect rendering order and the rule that effects are surface/border/geometry operations, not detached overlays.
- Add or update a QA checklist at `shipglows_data/workflow/test-checklists/keyboard-material-press-effects.md`.
- Cross-link this spec from future updates to `keyboard-physical-key-relief.md` or `winglowz-motion-system-and-interaction-animations.md` if those specs are touched again.
- Update any in-app Studio copy only if compatibility/fallback information must be exposed to the user. Do not add instructional text about the internal rendering model.
- No public website, pricing, auth, onboarding, backend, SEO, or marketing docs need changes.

## Readiness Decisions

- `confettiLite` and `fireworksLite` remain loadable from existing saved themes for compatibility.
- In relief mode, `confettiLite` and `fireworksLite` must become secondary edge/surface emissions after a material key reaction, or degrade to surface-only feedback when they cannot remain physically attached and professional.
- No new user-facing effect names are required for the first implementation batch.
- Fresh external docs verdict: `fresh-docs not needed` for the ready gate because implementation must use existing local Android Canvas/Paint and Flutter rendering patterns. If a new package, shader, animation engine, Android API, or platform integration is introduced, implementation must stop and apply the Documentation Freshness Gate against official docs.

## Edge Cases

- Very small keys or compact mode: border-based electric effects must not overwhelm labels or reduce hit clarity.
- Rounded corners: border effects must follow the rounded path and avoid corner gaps.
- High radius plus high relief: face paths and border highlights must stay connected to the surface.
- Pressed relief: top face, side faces and border all travel together; no side face should remain behind as the surface moves.
- Semi-transparent keys: effects must account for background bleed and avoid showing neighbor shadows through the key.
- Active/accent keys: material effect uses active role color without making the key look disabled or unreadable.
- Disabled keys: effects should be muted or unavailable.
- Long-press swipe visual: gesture trails must remain separate from key press material effects and not imply key body movement unless the key is actually pressed/hovered.
- Scrollable rows and action panels: clips must not cut the material effect, but effects also must not draw outside the keyboard bounds.
- Fast repeated taps on the same key: animation restarts or blends cleanly, without stacking detached layers.
- System/private preset: effects may be reduced to platform-like pressed fill.
- Reduced motion: no shake or large transform; use a short fill/border response.

## Implementation Tasks

- [x] Tâche 1 : Define native material key geometry
  - Fichiers : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`, optional new `KeyboardKeyMaterialGeometry.kt`
  - Action : Resolve a geometry object per key containing footprint, surface rect/path, side face paths, bottom face path, border path, radius, clip bounds, relief depth, press travel and shadow bounds.
  - User story link : Gives every effect the same physical body instead of independent rectangles.
  - Depends on : None.
  - Validate with : targeted geometry unit tests if extracted; otherwise code review plus CI compile proof.

- [x] Tâche 2 : Refactor native key drawing to consume geometry
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Make the draw order explicit: ambient shadow, relief faces, key surface, material effect layers, border/highlights, badges/labels/corners.
  - User story link : Ensures effects, relief and borders are rendered as one coherent key.
  - Depends on : Tâche 1.
  - Validate with : CI/Blacksmith Android compile/build proof and device QA.

- [x] Tâche 3 : Convert transform effects to whole-key transforms
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Apply `scale`, `pulse`, `shake`, `keycapTilt` and `edgeCompression` to the geometry before drawing the key body, not to detached strokes or overlays.
  - User story link : Shake/scale/tilt move the physical key, not a floating effect.
  - Depends on : Tâches 1-2.
  - Validate with : `KMP-003` and fast typing QA.

- [x] Tâche 4 : Convert surface effects to clipped material blends
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Rework `glow`, `inkPress`, and `specularSweep` as surface and face blends clipped to geometry, with optional subtle shadow modulation.
  - User story link : Glow and gradients feel like the key material reacts.
  - Depends on : Tâches 1-2.
  - Validate with : `KMP-001`, `KMP-004`, `KMP-006`.

- [x] Tâche 5 : Convert electric arc to border/edge activation
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Replace detached arc paths with segmented border/edge highlights along the existing rounded border and relief edges.
  - User story link : Lightning is created from the existing key border instead of being drawn on top.
  - Depends on : Tâches 1-2.
  - Validate with : `KMP-002` on light/dark/relief themes.

- [x] Tâche 6 : Rework emitted effects as anchored secondary emissions
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardPressEffects.kt`
  - Action : Make `ripple`, `confettiLite`, and `fireworksLite` originate from surface/edge anchors and pair them with a material surface reaction; degrade or disable them in relief mode if they cannot remain attached.
  - User story link : Decorative effects no longer feel pasted above the key.
  - Depends on : Tâches 1-2.
  - Validate with : `KMP-007`, queue limit tests or inspection, and device QA.

- [x] Tâche 7 : Align Flutter Studio preview semantics
  - Fichier : `lib/features/keyboard/presentation/keyboard_theme_studio_screen.dart`
  - Action : Update preview key rendering so glow, electric, shake, surface gradients and relief transformations use the same material model as native.
  - User story link : The Studio teaches the correct visual behavior before save.
  - Depends on : Tâches 1-5 conceptually; can be implemented in parallel after contract is fixed.
  - Validate with : `flutter test test/keyboard_theme_studio_screen_test.dart`.

- [x] Tâche 8 : Tighten effect compatibility validation
  - Fichiers : `lib/features/keyboard/domain/keyboard_theme_validation.dart`, `lib/features/keyboard/domain/keyboard_models.dart`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardThemeModels.kt`
  - Action : Preserve saved config compatibility while adding validation/fallback rules for effects that are reduced in private, relief, reduced-motion, or performance-constrained modes.
  - Implementation note : No saved-theme schema or enum change was required; existing validation remains compatible and targeted validation tests pass.
  - User story link : Users get professional effects without breaking readability or privacy-sensitive fields.
  - Depends on : Tâches 3-6.
  - Validate with : `flutter test test/keyboard_theme_validation_test.dart` and Kotlin model tests.

- [x] Tâche 9 : Add diagnostics without private data
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`
  - Action : Expose active effect name, material fallback mode, relief enabled/depth and reduced/private mode reduction in safe diagnostics/status.
  - User story link : Allows QA to explain why an effect changed without exposing typed content.
  - Depends on : Tâches 3-8.
  - Validate with : Settings diagnostics/manual copy check; no typed text or clipboard data.

- [x] Tâche 10 : Add manual QA checklist
  - Fichier : `shipglows_data/workflow/test-checklists/keyboard-material-press-effects.md`
  - Action : Create device QA checklist covering `KMP-001` through `KMP-010`, themes, relief modes, private field, and fast typing.
  - User story link : Visual physical credibility requires real-device confirmation.
  - Depends on : Tâches 1-9.
  - Validate with : `/103-sf-verify` reads checklist before final handoff.

- [x] Tâche 11 : Update native rendering documentation
  - Fichier : `docs/technical/android-native.md`
  - Action : Document material geometry, rendering order, effect families, fallback rules, Sentry/diagnostics expectations and the no-detached-overlay rule.
  - User story link : Prevents future effects from regressing into pasted decorative layers.
  - Depends on : Tâches 1-10.
  - Validate with : Documentation review and metadata check if governance docs are touched.

- [x] Tâche 12 : Add expressive splash/fire and mascot trail effects
  - Fichiers : `lib/features/keyboard/domain/keyboard_models.dart`, `lib/features/keyboard/domain/keyboard_theme_validation.dart`, `lib/features/keyboard/presentation/keyboard_theme_studio_screen.dart`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardThemeModels.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardPressEffects.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`
  - Action : Add `waterSplash`, `emberBurst`, `dragonTrail`, and `spiderTrail` as saved-theme-compatible effects, with bounded native rendering, preview rendering, diagnostics classification, private-mode fallback, and validation warnings.
  - User story link : Gives Diane hidden expressive keyboard effects without adding heavy renderer dependencies or risking typed-content privacy.
  - Depends on : Tâches 1-11.
  - Validate with : `flutter analyze`, focused Flutter tests, native parser tests through allowed CI/Blacksmith, and physical Android IME QA.

## Acceptance Criteria

- Native key press effects use shared material geometry instead of independent overlay rectangles for all non-decorative effects.
- `glow` visibly changes the key surface/border/faces and does not rely on a detached aura as the primary feedback.
- `electricArc` animates existing borders/edges and does not draw a separate floating zigzag path.
- `shake` transforms the whole key body including text, border, relief faces and shadow.
- 2D mode effects are clipped/blended into the key surface or border.
- Relief mode effects keep all physical faces connected during press travel.
- Neighbor keys keep readable top borders during adjacent effects.
- Emitted effects are anchored to the key or safely degraded.
- Private/reduced-motion contexts reduce effects without changing input behavior.
- Flutter preview and native IME share the same effect semantics.
- Automated Flutter checks pass, Android native compile/build proof is obtained through allowed CI/Blacksmith, and Diane validates visual credibility on device.

## Test Strategy

- Run `flutter analyze` after each implementation batch.
- Run targeted Flutter tests after preview/model changes:
  - `flutter test test/keyboard_theme_studio_screen_test.dart`
  - `flutter test test/keyboard_theme_validation_test.dart`
- Add or update Kotlin tests for effect parsing/fallback and geometry helpers if extracted into JVM-testable classes.
- Do not run local Android Gradle/build/install commands on this VM.
- Use GitHub Actions/Blacksmith for Android build/compile evidence.
- Use physical-device QA for native IME visual behavior, with screenshots or notes for each required scenario when possible.
- Use Sentry/support diagnostics only when a runtime crash/error occurs or when manual QA reports an unexplained failure; never treat dashboard access as available to agents.

## Risks

- Native renderer complexity may grow if material geometry remains embedded in `WinGlowzKeyboardView`; extraction is recommended if readability degrades.
- Visual parity between Flutter preview and Android Canvas may be approximate. The contract requires semantic parity, not pixel-perfect parity.
- Border-following electric effects may be subtle on low-contrast themes; validation must tune intensity and fallback colors.
- Emitted effects such as confetti/fireworks may conflict with the no-detached-overlay principle. They should be downgraded to secondary edge emissions or disabled in relief mode if they cannot stay professional.
- Performance risk is real during fast typing; effect queues, invalidation and Paint allocations must remain bounded.
- Manual perception matters; automated tests cannot prove physical credibility.
- Local proof is limited by repo guardrails forbidding Android builds and installs on this VM.

## Execution Notes

- Recommended implementation order: native geometry contract first, then transform effects, then surface/border effects, then emitted effects, then Flutter preview, then diagnostics/docs/checklist.
- Avoid one-off hardcoded offsets or visual constants unless they are named as scoped renderer constants and justified by geometry.
- Keep effect drawing allocation-light: reuse `Path`, `RectF`, `Paint` where possible.
- Preserve `KeyboardPressEffectPolicy.resolve` compatibility for existing saved themes.
- Do not introduce a new package or Android rendering API without running the documentation freshness gate against official docs.
- Runtime observability: WinGlows is a Flutter runtime app. Preserve Sentry initialization and safe diagnostics expectations. If copied logs are used as proof, they must begin with commit/build identity plus Paris and UTC build timestamps, and they must be redacted.
- Current local branch already contains unrelated in-progress changes. Implementation agents must not revert user or prior-agent changes.

## Open Questions

None.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-06-11 02:31:09 UTC | 100-sf-spec | GPT-5 Codex | Created spec from Diane's request to remaster keyboard press effects as material/geometry-aware interactions. | Draft spec written. | /101-sf-ready shipglows_data/workflow/specs/keyboard-material-press-effects.md |
| 2026-06-11 02:53:38 UTC | 101-sf-ready | GPT-5 Codex | Validated readiness, tightened proof results, and resolved emitted-effect compatibility decision. | Ready. | /102-sf-start shipglows_data/workflow/specs/keyboard-material-press-effects.md |
| 2026-06-11 03:08:12 UTC | 102-sf-start | GPT-5 Codex | Implemented material key geometry, relief-aware native effects, anchored emitted effects, Flutter Studio preview parity, safe diagnostics, Android-native docs, and QA checklist. | Local Flutter proof passed; native Android compile/device proof still required by guardrails. | /103-sf-verify shipglows_data/workflow/specs/keyboard-material-press-effects.md |
| 2026-06-11 12:12:25 UTC | 001-sf-build | GPT-5 Codex | Extended the material effects chantier with water splash, ember burst, dragon trail, and spider trail after official Android/Flutter rendering docs review. | Implemented locally; local checks pending in this run. | /103-sf-verify shipglows_data/workflow/specs/keyboard-material-press-effects.md |
| 2026-06-11 12:20:29 UTC | 001-sf-build | GPT-5 Codex | Refined mascot trails so dragon leaves ember sparkles and spider leaves web-like cross strands in native rendering and Flutter preview. | Implemented locally; Flutter targeted tests, analyze, full Flutter test, and spec metadata lint passed. | /103-sf-verify shipglows_data/workflow/specs/keyboard-material-press-effects.md |
| 2026-06-11 12:48:08 UTC | 001-sf-build | GPT-5 Codex | Added mascot shadow and subtle relief-key pressure when a mascot overlaps a 3D key surface. | Implemented locally; Flutter targeted tests, analyze, full Flutter test, and spec metadata lint passed. | /103-sf-verify shipglows_data/workflow/specs/keyboard-material-press-effects.md |

## Current Chantier Flow

| Step | Status | Notes |
|------|--------|-------|
| 100-sf-spec | done | Draft spec created on 2026-06-11. |
| 101-sf-ready | done | Ready gate passed on 2026-06-11; proof results and emitted-effect compatibility decisions are explicit. |
| 102-sf-start | done | Local implementation completed on 2026-06-11; `flutter analyze`, Studio test, and theme validation test passed. |
| 103-sf-verify | next | Verify docs/metadata, local Flutter proof, Android CI/Blacksmith native proof, and Diane physical-device QA evidence including expressive effects. |
| 104-sf-end | pending | Close chantier after verified implementation. |
| 005-sf-ship | pending | Ship only after bug/risk gates and allowed deploy/build proof. |
