---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-16"
created_at: "2026-05-16 13:04:00 UTC"
updated: "2026-05-16"
updated_at: "2026-05-16 13:17:25 UTC"
status: ready
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "feature"
owner: "Diane"
confidence: medium
user_story: "En tant qu'utilisatrice du clavier Android WinGlows, je veux activer un relief physique simple et beau sur les touches, afin d'obtenir un clavier plus tactile et premium sans devoir manipuler des réglages techniques qui peuvent rendre le thème moche."
risk_level: "medium"
security_impact: "none"
docs_impact: "yes"
linked_systems:
  - "Flutter Keyboard Theme Studio"
  - "Flutter keyboard preview"
  - "Android native IME Canvas renderer"
  - "Android keyboard MethodChannel"
  - "KeyboardThemeConfig Dart/Kotlin schema"
  - "Keyboard theme validation"
depends_on:
  - artifact: "shipglowz_data/business/product.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglowz_data/business/branding.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglowz_data/technical/architecture.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglowz_data/technical/guidelines.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglowz_data/workflow/specs/keyboard-theme-studio.md"
    artifact_version: "0.1.0"
    required_status: "ready"
supersedes: []
evidence:
  - "User report 2026-05-16: blur 12px + offset 4px on Glass Mint creates a beautiful physical-key relief, but the same raw values look bad on darker themes."
  - "User decision 2026-05-16: do not expose too many raw offset/shadow controls; expose only Relief enabled plus intensity slider."
  - "lib/features/keyboard/domain/keyboard_models.dart currently exposes raw shadowBlur and shadowOffsetY on KeyboardThemeConfig."
  - "lib/features/keyboard/presentation/keyboard_theme_studio_screen.dart currently exposes Blur and Offset sliders directly."
  - "android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt currently draws a single shadow rectangle based on shadowBlur and shadowOffsetY."
next_step: "/sf-start Keyboard Physical Key Relief"
---

## Title
Keyboard Physical Key Relief

## Status
Ready for implementation. Validated by `/sf-ready` on 2026-05-16; ready for `/sf-start Keyboard Physical Key Relief`.

## User Story
En tant qu'utilisatrice du clavier Android WinGlows, je veux activer un relief physique simple et beau sur les touches, afin d'obtenir un clavier plus tactile et premium sans devoir manipuler des réglages techniques qui peuvent rendre le thème moche.

## Minimal Behavior Contract
The Keyboard Theme Studio accepts only two user-facing controls for physical key relief: an enabled toggle and an intensity slider. When enabled, the preview and the Android keyboard render each key with theme-aware depth: a darker lower shadow, a lighter top highlight, subtle edge contrast, and a pressed state that visually compresses the key. The system computes the internal blur, offset, highlight, shadow, and border colors from the theme luminance instead of exposing those raw controls directly. If a theme is too dark, too transparent, too low-contrast, private-mode sensitive, or performance constrained, the renderer degrades to a safe readable relief or disables the effect with visible validation feedback. The easiest edge case to miss is that a raw shadow that looks premium on a light Glass Mint theme can look dirty or invisible on dark themes, so the relief algorithm must adapt per key/background contrast and not reuse one static shadow recipe everywhere.

## Success Behavior
- Given a supported theme in Keyboard Theme Studio, when the user enables `Relief`, the preview shows a physical key effect without requiring manual blur or offset settings.
- Given `Relief intensity` is adjusted, when the user moves the slider, the preview updates the depth strength while keeping labels readable and the layout unchanged.
- Given the theme is light, dark, glass, neon, gradient, or high-contrast, when relief is enabled, the computed highlight/shadow colors adapt to luminance so the key looks raised rather than muddy.
- Given special/action keys such as `Maj`, `Nav`, pinned rows, and active keys use different base colors, when relief is enabled, those keys receive independent relief colors computed from their own base color, not copied from normal letter keys.
- Given the user presses a key, when relief is active, the key appears to sink/compress: shadow depth decreases, highlight changes subtly, and any press effect still works without fighting the relief.
- Given a context row or scrollable action row is visible, when relief is active, the key shadows/highlights are not clipped at row top or bottom.
- Given the user saves the theme, when the Android IME is opened or already visible, the same relief settings apply through the native `KeyboardThemeConfig` schema.
- Proof of success is a Dart model round-trip test, Kotlin parser/renderer validation, widget preview test, Kotlin compile, and Android real-device visual QA on at least one light theme and one dark theme.

## Error Behavior
- If a user imports or loads an older theme config without relief fields, the app must default to relief disabled and preserve the existing theme appearance.
- If relief intensity is out of bounds, Dart and Kotlin clamp it to the valid range and do not crash or corrupt the config.
- If the computed relief would make text contrast invalid, validation should warn and either reduce relief strength or use a safe fallback highlight/shadow pair.
- If private mode, reduce-motion, or performance guardrails require simplification, relief may render with fewer layers but must remain readable and must not log typed content.
- If the preview cannot exactly reproduce native Canvas details, it must remain behaviorally faithful and avoid claiming pixel-perfect parity.
- The system must never expose raw backstage-only parameters as normal user controls after this spec: users get toggle plus intensity, while internal tokens remain implementation details.

## Problem
The current theme model exposes low-level shadow controls (`shadowBlur`, `shadowOffsetY`, `shadowColor`) directly. The user discovered a visually excellent physical relief effect on `Glass Mint` by combining high blur and offset, but the same recipe fails on darker themes because shadows and highlights depend on luminance, alpha, background contrast, and key role. Raw controls let users accidentally create ugly or unreadable themes. We need to preserve the expressive premium result while hiding the fragile technical knobs behind a small product-level control.

## Solution
Introduce a `Key Relief` appearance layer in the keyboard theme system. The user-facing UI exposes only `Relief` enabled/disabled and `Relief intensity`. Internally, a resolver computes per-key relief tokens from the current key/background colors: top highlight, bottom edge shadow, ambient drop shadow, optional inner gradient, border-light/border-dark blend, and pressed-state compression. The Flutter preview and Android Canvas renderer consume the same schema and use equivalent algorithms, while legacy raw shadow fields become advanced/backstage or preset-authoring inputs rather than primary user controls.

## Scope In
- Add relief fields to Dart and Kotlin `KeyboardThemeConfig`: `reliefEnabled`, `reliefIntensity`, and a schema version/migration path.
- Hide or demote raw `Blur` and `Offset` controls from the standard Theme Studio UI.
- Add user-facing Theme Studio controls: `Relief` toggle and `Intensity` slider, with concise explanatory copy.
- Keep raw shadow/offset/color parameters as internal/backstage tokens for presets, migration, debugging, or future advanced mode only.
- Add a `KeyboardReliefResolver` concept on Dart and Kotlin sides that computes derived render tokens from base colors and intensity.
- Render multi-layer relief in Android native Canvas: ambient shadow, bottom depth/shadow, top highlight, optional vertical fill gradient, border adaptation, and pressed compression.
- Render behaviorally equivalent relief in Flutter Theme Studio preview.
- Ensure action bars, pinned/context rows, scrollable rows, settings panel keys, special keys, active keys, disabled keys, and private-mode fallback behave consistently.
- Fix clipping margins for relief/shadows in context/action rows so depth is visible.
- Add validation for contrast, excessive depth, alpha/transparency, and private/performance fallback.
- Add tests for model migration, resolver output, preview controls, and native parser/compile.

## Scope Out
- No user-facing advanced editor for raw blur, shadow offset, highlight color, inner gradient stops, or per-key relief color in v1.
- No marketplace or shareable relief presets beyond the existing theme preset system.
- No per-app or per-field custom relief settings in v1.
- No physically accurate lighting simulation, 3D engine, shaders, or GPU particle system.
- No promise of pixel-perfect parity between Flutter preview and Android Canvas; parity is behavioral and visual-directional.
- No new external package unless the implementation proves local color math is insufficient.
- No change to keyboard layout proportions, action-bar architecture, text dispatch, clipboard behavior, voice, or snippets.

## Constraints
- User-facing simplicity is mandatory: normal users see `Relief` plus `Intensity`, not raw shadow knobs.
- Existing saved themes must continue loading. Missing relief fields default to disabled.
- Relief must be calculated from actual key role color: normal key, special/action key, active key, pressed key, disabled key.
- The renderer must adapt to luminance and contrast. A dark key on dark background needs a top highlight and controlled edge contrast, not only a black drop shadow.
- Relief must not clip in scrollable action rows, pinned/context rows, or panels.
- Relief must not trigger layout remeasurement on each press. Pressed state should be draw-only or bounded animation-only.
- Android IME remains native and offline. No backend, auth, or network dependency.
- Private fields may reduce or disable decorative layers but must not affect typed content behavior.
- Diagnostics may log relief enabled/intensity/fallback reason only, never typed text or clipboard content.
- Fresh external docs not needed: this is local Flutter/Kotlin model and Canvas drawing using existing project patterns.

## Dependencies
- Existing Theme Studio spec: `shipglowz_data/workflow/specs/keyboard-theme-studio.md`.
- Dart theme model: `lib/features/keyboard/domain/keyboard_models.dart`.
- Dart validation: `lib/features/keyboard/domain/keyboard_theme_validation.dart`.
- Flutter editor/preview: `lib/features/keyboard/presentation/keyboard_theme_studio_screen.dart`.
- Android theme model: `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardThemeModels.kt`.
- Native renderer: `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`.
- Existing tests: `test/keyboard_theme_validation_test.dart`, `test/keyboard_theme_studio_screen_test.dart`, and Android keyboard model tests.
- Fresh external docs: not needed, because the work uses local Canvas/Paint, existing Flutter widgets, and local schema migration rather than new SDK/API behavior.

## Invariants
- Keyboard input behavior must not change.
- Theme config remains local, non-sensitive, and bounded.
- Saved v1 configs without relief fields remain valid.
- `Relief intensity = 0` must be visually equivalent to relief disabled.
- `Relief enabled = false` must not silently keep old raw shadow values creating depth unless the preset explicitly uses non-relief shadow for another reason.
- User-visible Theme Studio must not encourage ugly raw tuning by default.
- Preview and native renderer must share the same conceptual relief algorithm and bounds.
- Text contrast remains more important than decoration.
- The key press state must look pressed, not brighter in a way that contradicts physical depth.
- Action surfaces and pinned/context rows must remain visually distinguishable from normal keyboard keys.

## Links & Consequences
- `KeyboardThemeConfig` schema version may need incrementing or compatible optional fields.
- Existing presets should be reviewed: Glass Mint can enable relief by default; dark presets should use lower intensity or computed highlight-heavy relief.
- `KeyboardThemeStudioScreen` UI must become simpler, not larger: move raw blur/offset away from standard controls.
- `KeyboardThemeValidation` must validate derived relief, not just raw numeric ranges.
- `WinGlowzKeyboardView.drawKey` becomes responsible for layered drawing order and clipping-safe shadows.
- Scrollable row drawing currently uses `clipRect`; relief requires expanding clip bounds or reserving vertical/horizontal shadow padding.
- Press effects such as scale/glow/ripple must compose with relief. They should not replace the base relief unless explicitly designed to do so.
- The spec affects documentation and QA checklists but does not affect backend, auth, billing, sync, SEO, or data retention.

## Documentation Coherence
- Update `shipglowz_data/workflow/specs/keyboard-theme-studio.md` or implementation notes to mention the follow-up relief layer.
- Update `docs/technical/android-native.md` if it documents keyboard theme rendering or Canvas layers.
- Update component/design documentation if `KeyboardThemeStudioScreen` is documented as exposing raw shadow controls.
- Update any internal QA checklist for keyboard theme testing to include light and dark relief validation.
- No public pricing, auth, onboarding, or backend docs need changes because this is local appearance behavior.

## Edge Cases
- Light key on light background: use subtle bottom shadow and top highlight without washing out the key.
- Dark key on dark background: use controlled top highlight and border contrast; avoid heavy black shadow that disappears or muddies the key.
- Special/action key has a dark fill while normal keys are light: compute relief per key role, not per preset globally.
- Active key uses accent color: relief must preserve active state priority and not make the active key look disabled.
- Disabled key: relief should be muted or absent to preserve disabled affordance.
- High blur/offset legacy config: migration should approximate with relief intensity if clearly intended, or keep as backstage raw values without showing raw UI by default.
- Transparent/glass keys: relief may need lower opacity and stronger border/highlight to avoid invisible depth.
- Background image or gradient behind keys: compute contrast against sampled/representative background when feasible, otherwise use fallback background luminance.
- Scrollable action rows: shadows must not be clipped by row `clipRect`.
- Very low gap themes: relief cannot rely on large shadow spread that overlaps neighbors unreadably.
- Private fields: relief should remain readable and conservative; no animated flashy relief required.
- Reduce-motion enabled: static relief remains allowed, but animated press compression should be reduced.

## Implementation Tasks
- [ ] Tâche 1 : Extend Dart theme schema for relief
  - Fichier : `lib/features/keyboard/domain/keyboard_models.dart`
  - Action : Add optional-compatible fields `reliefEnabled` and `reliefIntensity`; update defaults, `fromMap`, `toMap`, `copyWith`, preset config helpers, and schema comments.
  - User story link : Gives users a simple product-level relief control instead of raw shadow tuning.
  - Depends on : None.
  - Validate with : `flutter test test/keyboard_theme_validation_test.dart` plus new round-trip assertions.
  - Notes : Default relief disabled for compatibility; presets may opt in later.

- [ ] Tâche 2 : Extend Kotlin theme schema for relief
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardThemeModels.kt`
  - Action : Add `reliefEnabled` and `reliefIntensity`; parse missing fields safely; clamp intensity to `0.0..1.0`; include in `toMap()` and validation.
  - User story link : Ensures saved relief settings reach the native keyboard renderer safely.
  - Depends on : Tâche 1.
  - Validate with : Android/Kotlin parser tests if available; at minimum `cd android && ./gradlew :app:compileDebugKotlin -x :app:processDebugResources`.
  - Notes : Keep raw `shadowBlur` and `shadowOffsetY` for backward compatibility and internal preset authoring.

- [ ] Tâche 3 : Create shared relief resolver logic in Dart
  - Fichier : `lib/features/keyboard/domain/keyboard_relief_resolver.dart`
  - Action : Add color/luminance helpers and derive preview tokens: top highlight, bottom shadow, ambient shadow, border light/dark, fill gradient, pressed depth.
  - User story link : Makes relief beautiful across light and dark themes automatically.
  - Depends on : Tâche 1.
  - Validate with : Unit tests for light key/light background, dark key/dark background, accent key, disabled key, intensity 0 and 1.
  - Notes : Avoid exposing these derived values in the normal UI.

- [ ] Tâche 4 : Create native relief resolver logic in Kotlin
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardReliefRenderer.kt`
  - Action : Implement equivalent luminance/color blending and draw-token resolution for Android Canvas.
  - User story link : Applies the same physical-key look in the actual Android keyboard.
  - Depends on : Tâche 2.
  - Validate with : Kotlin compile and resolver unit tests if JVM color helpers are testable.
  - Notes : Keep it separate from `WinGlowzKeyboardView` to avoid making the view unmaintainable.

- [ ] Tâche 5 : Simplify Theme Studio controls
  - Fichier : `lib/features/keyboard/presentation/keyboard_theme_studio_screen.dart`
  - Action : Replace standard `Blur` and `Offset` sliders with `Relief` toggle and `Relief intensity` slider; move raw shadow controls to a hidden/debug/backstage section only if needed.
  - User story link : Prevents users from accidentally creating ugly themes with raw technical knobs.
  - Depends on : Tâches 1 and 3.
  - Validate with : `flutter test test/keyboard_theme_studio_screen_test.dart` updated to find relief controls and no standard raw offset control.
  - Notes : Copy should explain “Adds physical depth to keys; colors are adapted automatically.”

- [ ] Tâche 6 : Render relief in Flutter preview
  - Fichier : `lib/features/keyboard/presentation/keyboard_theme_studio_screen.dart`
  - Action : Update `_previewKey` to use resolver tokens: ambient shadow, lower shadow/depth, top highlight/border, optional fill gradient, pressed compression.
  - User story link : User can judge relief before saving.
  - Depends on : Tâche 3.
  - Validate with : Widget tests for relief enabled/disabled and intensity changing decoration/transform.
  - Notes : Keep preview behavioral, not pixel-perfect.

- [ ] Tâche 7 : Render relief in Android native keys
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Refactor `drawKey` so it delegates relief layers before/around the key fill; add pressed compression/depth reduction; preserve text, corner glyphs, borders, active state and disabled state.
  - User story link : Delivers the premium physical effect in the real keyboard.
  - Depends on : Tâches 2 and 4.
  - Validate with : Kotlin compile and Android device visual QA.
  - Notes : Drawing order should be ambient shadow -> bottom depth/shadow -> key fill/gradient -> top highlight/border -> label/corners.

- [ ] Tâche 8 : Prevent relief clipping in action/context rows
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Expand scrollable row clip rects or reserve relief-safe drawing padding so shadows/highlights are visible for pinned/context action bars.
  - User story link : Fixes the user-observed issue where action-bar offset/blur is cut at the bottom.
  - Depends on : Tâche 7.
  - Validate with : Android device QA on main action row, pinned `123`, `Nav`, `Clip`, settings panel and scrollable rows.
  - Notes : Do not let expanded clipping draw into the Android navigation bar or outside keyboard bounds.

- [ ] Tâche 9 : Add validation and fallback messaging
  - Fichier : `lib/features/keyboard/domain/keyboard_theme_validation.dart`
  - Action : Validate relief intensity, contrast risk, transparent key/background combinations, and excessive raw-shadow legacy values; expose actionable messages.
  - User story link : Keeps themes beautiful and usable instead of letting users create unreadable relief.
  - Depends on : Tâches 1 and 3.
  - Validate with : Validation tests for light/dark/glass edge cases.
  - Notes : Validation should suggest lowering intensity or disabling relief, not expose internal offsets.

- [ ] Tâche 10 : Update diagnostics and status
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`
  - Action : Include relief enabled/intensity and fallback reason in keyboard status diagnostics.
  - User story link : Makes future QA/debugging possible without exposing raw user content.
  - Depends on : Tâche 2.
  - Validate with : Diagnostic copy from Settings after enabling relief.
  - Notes : Do not log full theme JSON or private file paths.

- [ ] Tâche 11 : Document the design contract
  - Fichier : `docs/technical/android-native.md`
  - Action : Document relief rendering layers, user-facing vs backstage tokens, private/reduce-motion fallback, and QA surfaces.
  - User story link : Keeps future implementations from re-exposing raw knobs or breaking theme coherence.
  - Depends on : Tâches 1-10.
  - Validate with : Documentation review and `rg` for stale “Blur/Offset” user-facing copy if docs mention it.
  - Notes : If this docs file is absent or stale, update the nearest existing Android/native technical doc instead.

## Acceptance Criteria
- [ ] CA 1 : Given Theme Studio is opened, when the Appearance/Depth section is visible, then the standard user controls are `Relief` and `Relief intensity`, not raw `Blur` and `Offset`.
- [ ] CA 2 : Given relief is disabled, when the user previews or saves the theme, then the keyboard keeps the current flat/shadow behavior without extra derived highlights.
- [ ] CA 3 : Given relief is enabled on Glass Mint or another light theme, when intensity is medium/high, then keys visibly look raised with a lighter top edge and darker lower depth.
- [ ] CA 4 : Given relief is enabled on a dark theme, when intensity is medium/high, then keys remain readable and do not become muddy black blobs.
- [ ] CA 5 : Given special/action keys have a darker color than normal keys, when relief is enabled, then those keys still show an adapted top highlight and bottom depth.
- [ ] CA 6 : Given a key is pressed, when relief is enabled, then the key visually compresses or sinks and returns after release.
- [ ] CA 7 : Given a pinned/context action row is visible, when relief is enabled, then shadows and highlights are not clipped at the row bottom/top.
- [ ] CA 8 : Given an old saved theme config without relief fields, when loaded, then it parses successfully with relief disabled.
- [ ] CA 9 : Given invalid relief intensity is imported, when parsed by Dart or Kotlin, then it is clamped safely.
- [ ] CA 10 : Given contrast validation detects unreadable relief, when saving, then the user receives a clear message or a safe automatic reduction is applied.
- [ ] CA 11 : Given private mode is active, when the keyboard opens, then relief remains conservative and no typed/private content is logged.
- [ ] CA 12 : Given Android real-device QA tests light and dark themes, when relief is enabled and action rows are used, then the visual effect is coherent and usable.

## Test Strategy
- Dart unit tests:
  - `test/keyboard_theme_validation_test.dart` for schema, clamping, contrast, relief defaults, and migration.
  - New `test/keyboard_relief_resolver_test.dart` for luminance-derived tokens.
- Flutter widget tests:
  - `test/keyboard_theme_studio_screen_test.dart` for visible controls, draft updates, save payload, and preview change.
- Kotlin/native checks:
  - Add/extend tests for `KeyboardThemeConfig.fromJson` if Android unit test environment is available.
  - Run `cd android && ./gradlew :app:compileDebugKotlin -x :app:processDebugResources` locally.
  - Full Android unit/build proof should run on Blacksmith/x86_64 because local ARM64 AAPT2 can block resource tasks.
- Manual Android QA:
  - Test `Glass Mint`, `Neon Terminal`, one dark preset, one high-contrast preset.
  - Test main action bar, pinned `123`, pinned `Nav`, settings panel, normal letters, special/action keys, active key, disabled/private field.
  - Test intensity low/medium/high and pressed key state.
- Web/preview QA:
  - Vercel web preview can validate Theme Studio UI/preview behavior, but native Canvas relief must be validated on Android device.

## Risks
- Medium visual risk: relief can look premium on light themes and ugly on dark themes if color math is naive.
- Medium usability risk: too much depth can reduce touch target clarity or make labels harder to read.
- Medium maintenance risk: duplicate Dart/Kotlin resolver logic can drift; tests must pin key scenarios.
- Low performance risk: extra Canvas layers may cost draw time if overdone; keep layers bounded and avoid per-frame layout.
- Low accessibility risk: decorative depth must not reduce contrast or conflict with reduce-motion/private mode.
- Low product risk: hiding raw knobs may frustrate power users; backstage/debug controls can preserve authoring without cluttering normal UI.

## Execution Notes
- Read first:
  - `lib/features/keyboard/domain/keyboard_models.dart`
  - `lib/features/keyboard/domain/keyboard_theme_validation.dart`
  - `lib/features/keyboard/presentation/keyboard_theme_studio_screen.dart`
  - `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardThemeModels.kt`
  - `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
- Implementation order:
  - Schema fields first, then resolver tests, then UI simplification, then preview, then native renderer/clipping.
- Avoid:
  - Adding a UI full of expert knobs.
  - Hardcoding one shadow recipe for all themes.
  - Rewriting keyboard layout while working on relief.
  - Logging full theme JSON or private image paths.
- Preferred approach:
  - Keep raw `shadowBlur`/`shadowOffsetY` backward-compatible but move them out of normal UI.
  - Compute derived relief tokens at render time from base colors and intensity.
  - Use deterministic color math that is easy to test in Dart and Kotlin.
- Validation commands:
  - `flutter test test/keyboard_theme_validation_test.dart test/keyboard_theme_studio_screen_test.dart`
  - `cd android && ./gradlew :app:compileDebugKotlin -x :app:processDebugResources`
  - Blacksmith/GitHub Actions for full Android resource/unit proof.
- Stop/reroute conditions:
  - If relief requires broad shader/graphics dependencies, pause and create a separate architecture decision.
  - If Theme Studio schema migration would break existing saved themes, stop and fix migration before rendering work.
  - If visual QA on dark themes fails, do not ship by merely lowering defaults; refine resolver rules.

## Open Questions
- Aucun point bloquant ouvert. Décision utilisateur déjà prise: exposition minimale avec toggle `Relief` + slider `Intensity`; paramètres internes/backstage non exposés par défaut.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-16 13:04:00 UTC | sf-spec | GPT-5 Codex | Created focused spec for physical key relief in Keyboard Theme Studio and native Android Canvas rendering, preserving user-facing simplicity. | draft saved | /sf-ready Keyboard Physical Key Relief |
| 2026-05-16 13:17:25 UTC | sf-ready | GPT-5 Codex | Validated readiness gate: structure, metadata, user-story alignment, adversarial review, security, documentation coherence, language doctrine and fresh-docs decision. | ready | /sf-start Keyboard Physical Key Relief |

## Current Chantier Flow

- sf-spec: draft saved on 2026-05-16 for `Keyboard Physical Key Relief`.
- sf-ready: ready on 2026-05-16.
- sf-start: not launched.
- sf-verify: not launched.
- sf-end: not launched.
- sf-ship: not launched.

Next command: `/sf-start Keyboard Physical Key Relief`
