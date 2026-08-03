---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "0.1.0"
project: "WinGlows"
created: "2026-06-11"
created_at: "2026-06-11 07:13:45 UTC"
updated: "2026-06-11"
updated_at: "2026-06-11 07:13:45 UTC"
status: draft
source_skill: 100-sf-spec
source_model: "GPT-5 Codex"
scope: "keyboard-material-key-gradients"
owner: "Diane"
confidence: "high"
user_story: "En tant qu'utilisatrice du clavier Android WinGlows, je veux que les touches puissent utiliser des gradients de matière qui suivent aussi l'effet d'appui choisi, afin que le clavier 2D ou 3D paraisse plus physique, plus premium et plus cohérent."
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Android native IME Canvas renderer"
  - "Android KeyboardThemeConfig"
  - "Android material press effects"
  - "Flutter Keyboard Theme Studio"
  - "Flutter keyboard preview"
  - "Keyboard physical relief"
  - "Keyboard theme validation"
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
  - artifact: "shipglows_data/workflow/specs/keyboard-material-press-effects.md"
    artifact_version: "1.0.0"
    required_status: "active"
  - artifact: "shipglows_data/technical/architecture.md"
    artifact_version: "1.0.1"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/guidelines.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
supersedes: []
evidence:
  - "User request 2026-06-11: gradients on the key material would be too cool and should also apply to the chosen press effect."
  - "User intent 2026-06-11: the keyboard should feel physical, with a coherent 2D/3D material rather than a flat fill plus detached overlays."
  - "shipglows_data/workflow/specs/keyboard-material-press-effects.md already requires effect rendering through the key geometry, which now exposes a stable foundation for material gradients."
  - "shipglows_data/workflow/specs/keyboard-physical-key-relief.md already establishes the need for per-face material treatment in relief mode."
  - "lib/features/keyboard/presentation/keyboard_theme_studio_screen.dart already renders gradients in the preview background and can be extended to key-surface gradients."
  - "android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt already uses Canvas gradients and keyed geometry for relief/material rendering."
next_step: "/101-sf-ready shipglows_data/workflow/specs/keyboard-material-key-gradients.md"
---

## Title

Keyboard Material Key Gradients

## Status

Draft spec created on 2026-06-11 from Diane's request to add material gradients to key surfaces and make those gradients react coherently to the selected press effect. The next lifecycle step is `/101-sf-ready shipglows_data/workflow/specs/keyboard-material-key-gradients.md`.

## User Story

En tant qu'utilisatrice du clavier Android WinGlows, je veux que les touches puissent utiliser des gradients de matière qui suivent aussi l'effet d'appui choisi, afin que le clavier 2D ou 3D paraisse plus physique, plus premium et plus cohérent.

## Minimal Behavior Contract

When a keyboard theme enables key gradients, each key uses a material gradient derived either automatically from its current base color or from a bounded user-selected gradient mode. In 2D mode, the gradient lives inside the key surface and border only; in relief mode, the top surface and visible faces each receive coherent gradient treatment according to the viewing angle. When the user presses a key, the chosen press effect modifies that same material gradient instead of painting a separate decoration on top. If a gradient would reduce readability, break physical coherence, or cost too much on device, the system falls back to a safer derived fill while preserving the key press feedback. The easiest edge case to miss is that a gradient which looks beautiful on an idle key can become incoherent or unreadable once `glow`, `electricArc`, `inkPress`, `specularSweep`, or relief compression is applied, so the press state must transform the gradient itself rather than stack another unrelated layer.

## Success Behavior

- Given key gradients are enabled in the theme, when the user previews or opens the keyboard, each key shows a material gradient that feels part of the key surface instead of a decorative wallpaper.
- Given relief is disabled, when gradients are enabled, the 2D key surface uses a clipped gradient that respects rounded corners, border readability, and label contrast.
- Given relief is enabled, when gradients are enabled, the top surface and visible faces use distinct but coherent gradient treatment so the key reads as one physical object.
- Given the user selects a gradient mode such as vertical, diagonal, or soft radial, when the key is rendered, the direction stays consistent with the keyboard viewpoint and material lighting model.
- Given the user keeps the default automatic mode, when the base key color changes, the system derives a safe gradient automatically without requiring multiple manual colors.
- Given a key uses `glow`, `electricArc`, `specularSweep`, `inkPress`, `scale`, `pulse`, `keycapTilt`, or `edgeCompression`, when the key is pressed, the gradient itself reacts as part of the material response instead of being covered by an unrelated overlay.
- Given a key uses emitted effects such as `ripple`, `confettiLite`, or `fireworksLite`, when the key is pressed, the gradient remains the base material reaction while the secondary emission stays edge-anchored.
- Given special keys, active keys, pressed keys, and disabled keys have different base colors, when gradients are enabled, each role resolves its own safe material gradient from its own base color rather than sharing a single global recipe.
- Given a saved theme is reopened in Flutter Studio or loaded in the Android IME, when gradients are present, the same gradient settings are round-tripped and rendered consistently enough that the user is not surprised.
- Given a theme becomes unreadable because of a gradient direction, intensity, or contrast issue, when the user tries to save it, validation blocks or auto-reduces the gradient to a safe mode.

## Error Behavior

- If a theme config contains an unknown key-gradient mode, Dart and Kotlin fall back to `none` or `auto` without crashing and keep the keyboard usable.
- If the selected gradient is too subtle to separate from the key background, the renderer boosts the derived contrast or falls back to a safe solid/material fill.
- If the selected gradient makes text or border contrast unreadable, save is blocked or the gradient is reduced to a safer derived mode before persistence.
- If a gradient cannot be applied coherently in private fields, reduced-motion mode, or a low-performance fallback path, the keyboard degrades to a simpler safe fill while preserving input behavior.
- If the Flutter preview cannot reproduce the exact Android Canvas nuance of a face gradient, it stays semantically truthful and must not imply a stronger parity than exists.
- If a runtime rendering error occurs while applying a key gradient, the existing keyboard recovery path keeps typing available and diagnostics expose only safe gradient/effect metadata, never typed text or private content.

## Problem

The current keyboard can render richer press effects and a more physical relief, but the key material itself is still mostly driven by flat fills plus local highlights. That leaves a quality gap: the keyboard can move like a physical object while still looking visually flat. Diane explicitly wants gradients to become part of the key matter, including when a chosen effect is triggered. Without a dedicated contract, gradients risk becoming another decorative layer that conflicts with relief, press effects, contrast, and per-key role colors.

## Solution

Introduce a material key-gradient layer as a first-class part of the keyboard theme system. The theme model gains bounded key-gradient settings with a strong automatic mode derived from the current key color. Native Android rendering and the Flutter Studio preview resolve gradients through the same key material geometry already established for relief and press effects. Press effects then operate on the gradient-bearing material itself: surface gradients shift, compress, brighten, darken, or sweep according to the effect family, while relief faces receive their own consistent treatment. Validation keeps gradients readable, physically coherent, and affordable on device.

## Scope In

- Extend the keyboard theme schema with bounded key-gradient settings for key surfaces.
- Prefer an automatic material gradient mode derived from base key color; optionally support a small set of explicit modes such as vertical, diagonal, and soft radial.
- Define how gradients apply in 2D mode and in relief mode across top surface and visible faces.
- Define how each press effect family transforms the existing key gradient instead of drawing an unrelated overlay over it.
- Update Flutter Keyboard Theme Studio preview semantics and controls for key gradients.
- Update Android native IME rendering to resolve and draw key-surface and relief-face gradients.
- Add validation and fallback rules for contrast, transparency, low-gap themes, active keys, disabled keys, and private/performance constrained contexts.
- Update tests, QA checklist, diagnostics, and native documentation to reflect gradient-aware material rendering.

## Scope Out

- No freeform per-key custom gradient editor in v1.
- No arbitrary multi-stop gradient designer, no mesh gradient, and no user-authored shader language.
- No gradient backgrounds for the entire keyboard in this chantier; this spec is only about key material gradients.
- No GPU renderer, 3D engine, shader framework, or external animation package in this chantier.
- No per-app or per-field key gradient presets in v1.
- No promise of pixel-perfect parity between Flutter preview and Android Canvas.
- No local Android Gradle builds, installs, or APK packaging on this VM.

## Constraints

- Key gradients must remain subordinate to legibility. Label contrast, border readability, and key separation outrank decorative intensity.
- The same key material geometry remains the source of truth. Gradients must not be resolved from detached rectangles that drift from the rendered key.
- Relief mode is stricter: the gradient treatment across top surface and faces must reinforce the cube perspective instead of flattening it.
- 2D mode still needs material integration: gradients live inside the key shape and border only.
- The default user experience should not require manual color picking for multiple gradient stops. Automatic derivation is the professional default.
- Theme config remains local, bounded, non-sensitive, and backward compatible.
- Private/sensitive fields may simplify gradient rendering but must not alter typed output or privacy policy.
- Diagnostics may expose gradient mode, fallback mode, and related rendering state only; no typed content, clipboard content, or private file paths.
- Fresh external docs are not needed for the initial draft because the work uses existing local Flutter and Android Canvas gradient primitives already in the codebase. If implementation introduces a new rendering API or dependency, the documentation freshness gate becomes mandatory.

## Test Contract

- Surface profile: Android native IME Canvas rendering, Flutter Keyboard Theme Studio preview, local Dart/Kotlin theme models, no backend.
- Proof profile: automated local Flutter proof, targeted Kotlin/JVM proof where available, Android CI/Blacksmith compile/build proof, and Diane physical-device visual QA.
- Required proof order:
  1. Local static proof: `flutter analyze`.
  2. Local Flutter tests for preview/validation/model round trip.
  3. Kotlin/JVM parser or resolver tests if the harness supports them without forbidden Gradle tasks on this VM.
  4. Android compile/build proof through GitHub Actions/Blacksmith, not local Gradle.
  5. Physical-device QA by Diane on at least one light theme, one dark theme, one relief-enabled theme, and one relief-disabled theme.
- Manual checklist path: update or create `shipglows_data/workflow/test-checklists/keyboard-material-key-gradients.md`.
- Required scenarios:
  - `KMG-001`: 2D key gradient stays clipped to the rounded key surface and remains readable.
  - `KMG-002`: relief-enabled key uses coherent gradient treatment across top surface and visible faces.
  - `KMG-003`: automatic gradient derivation produces a usable result for light, dark, accent, and disabled keys.
  - `KMG-004`: `glow`, `inkPress`, `specularSweep`, and `electricArc` transform the existing gradient instead of covering it with a detached layer.
  - `KMG-005`: neighbor keys keep distinct borders and no muddy blending when low gaps and gradients combine.
  - `KMG-006`: save blocks or degrades an unreadable key gradient.
  - `KMG-007`: private/performance fallback simplifies gradients without changing typing behavior.
  - `KMG-008`: Flutter preview communicates the same gradient semantics as the native IME.
- Sentry/diagnostics expectation: if a crash or rendering error is observed, copied diagnostics/logs must include only safe build identity, gradient/effect mode, fallback state, and redacted runtime evidence.
- Exception with proof: local Android build/install/package proof is forbidden by repo guardrails; native proof must route through CI/Blacksmith and physical-device QA.

## Dependencies

- `lib/features/keyboard/domain/keyboard_models.dart`: Dart theme schema and enum round trip.
- `lib/features/keyboard/domain/keyboard_theme_validation.dart`: validation and fallback rules.
- `lib/features/keyboard/presentation/keyboard_theme_studio_screen.dart`: Theme Studio controls and preview semantics.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardThemeModels.kt`: Kotlin schema and parsing.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`: native material geometry and gradient rendering.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`: safe diagnostics/status exposure.
- `test/keyboard_theme_validation_test.dart` and `test/keyboard_theme_studio_screen_test.dart`: local Dart coverage.
- `docs/technical/android-native.md`: native documentation target.
- Fresh external docs: not needed for the draft. Existing Flutter and Android gradient primitives are already used locally.

## Invariants

- Keyboard input behavior does not change.
- The key body remains the single source of truth for fill, border, relief, gradient, and press-effect rendering.
- Backward compatibility for saved themes is preserved through safe defaults and field-level fallbacks.
- Unknown gradient values fall back safely.
- Gradients must never outlive or override the pressed-state contract defined by the material press effect pipeline.
- Text contrast and recognizability remain higher priority than aesthetic richness.
- Private/sensitive fields may simplify the visual treatment but cannot change typed output or privacy behavior.
- CI and manual proof must respect the repository rule forbidding local Android builds and installs on this VM.

## Links & Consequences

- This spec depends on `keyboard-material-press-effects.md` because gradients must react through the same material effect contract.
- This spec depends on `keyboard-physical-key-relief.md` because relief face gradients must follow the established physical geometry.
- `KeyboardThemeStudioScreen` will likely need one more bounded appearance section or integrated controls under key material, but must not regress into an advanced color-lab UI for ordinary users.
- `KeyboardThemeValidation` may need stronger readability checks that account for gradient contrast, not only flat fills.
- `WinGlowzKeyboardView.kt` may become too dense if gradient resolution is embedded inline; extraction into a dedicated resolver/renderer helper is likely the professional path.
- Future theme presets may need review so gradients are authored deliberately rather than inherited accidentally from a flat-fill preset.

## Documentation Coherence

- Update `docs/technical/android-native.md` with the gradient material contract for key surfaces and relief faces.
- Add or update a manual QA checklist at `shipglows_data/workflow/test-checklists/keyboard-material-key-gradients.md`.
- Cross-link this spec from future updates to `keyboard-material-press-effects.md`, `keyboard-physical-key-relief.md`, or `keyboard-theme-studio.md` when those specs are touched again.
- Update any internal Theme Studio documentation only if the user-facing control model changes in a meaningful way.
- No public site, pricing, auth, onboarding, backend, or marketing docs require updates.

## Edge Cases

- Very light key on very light background: gradient needs enough local contrast to still read as a key.
- Very dark key on dark background: gradient must add a highlight strategy rather than multiplying darkness.
- Transparent or glass-like keys: gradient opacity and border treatment must avoid muddy overlap with the keyboard background.
- Low-gap themes: strong diagonal gradients must not visually merge neighboring keys.
- Accent or active key: gradient must preserve state priority and not make the active key look disabled.
- Disabled key: gradient should be muted or flattened.
- Relief pressed state: top-surface gradient and face gradients must sink and rebalance together.
- `specularSweep` plus existing gradient: sweep must reinforce the material rather than erase the base gradient identity.
- `electricArc` plus gradient: border activation must not make the top surface read as a separate floating layer.
- Imported older theme configs: missing gradient fields default safely without changing legacy appearance unexpectedly.

## Implementation Tasks

- [ ] Tâche 1 : Extend the theme schema with bounded key-gradient settings
  - Fichier : `lib/features/keyboard/domain/keyboard_models.dart`
  - Action : Add key-gradient fields and enums with safe defaults, round-trip support, and schema comments.
  - User story link : Gives the keyboard a material gradient layer that can be saved and previewed.
  - Depends on : None.
  - Validate with : `flutter test test/keyboard_theme_validation_test.dart`.

- [ ] Tâche 2 : Extend Kotlin theme parsing with the same key-gradient contract
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardThemeModels.kt`
  - Action : Parse, validate, clamp, and serialize key-gradient settings safely.
  - User story link : Ensures the native IME can render the saved gradient settings.
  - Depends on : Tâche 1.
  - Validate with : Kotlin parser tests if available and Android CI compile proof later.

- [ ] Tâche 3 : Define gradient resolution rules for 2D and relief keys
  - Fichiers : `lib/features/keyboard/domain/keyboard_theme_validation.dart`, optional shared resolver helper, and native renderer helper
  - Action : Specify automatic derivation from base key color, explicit gradient modes, readability thresholds, and relief-face treatment.
  - User story link : Makes gradients look physical rather than decorative.
  - Depends on : Tâches 1-2.
  - Validate with : model tests for light/dark/active/disabled/high-transparency cases.

- [ ] Tâche 4 : Integrate gradients into the Android material key renderer
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Render top-surface and relief-face gradients through the existing key geometry and preserve border/readability rules.
  - User story link : Applies the gradient as part of the real key body.
  - Depends on : Tâche 3.
  - Validate with : Android CI/Blacksmith proof plus device QA.

- [ ] Tâche 5 : Make press effects transform the material gradient instead of covering it
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Define effect-specific gradient reactions for glow, electric arc, specular sweep, ink press, scale/pulse/tilt/compression, and emitted effects.
  - User story link : The chosen effect feels fused with the key material.
  - Depends on : Tâche 4 and `keyboard-material-press-effects.md`.
  - Validate with : targeted manual QA scenarios `KMG-004` and `KMG-005`.

- [ ] Tâche 6 : Update Flutter Theme Studio preview and controls
  - Fichier : `lib/features/keyboard/presentation/keyboard_theme_studio_screen.dart`
  - Action : Add bounded key-gradient controls and preview semantics that match native behavior directionally.
  - User story link : The user can judge the material gradient before saving.
  - Depends on : Tâches 1 and 3.
  - Validate with : `flutter test test/keyboard_theme_studio_screen_test.dart`.

- [ ] Tâche 7 : Strengthen validation and safe diagnostics
  - Fichiers : `lib/features/keyboard/domain/keyboard_theme_validation.dart`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`
  - Action : Add readability/fallback rules and expose safe gradient status metadata without private content.
  - User story link : Explains why a gradient was reduced or simplified while preserving trust.
  - Depends on : Tâches 3-6.
  - Validate with : Dart tests and manual diagnostics copy check.

- [ ] Tâche 8 : Update QA checklist and native documentation
  - Fichiers : `shipglows_data/workflow/test-checklists/keyboard-material-key-gradients.md`, `docs/technical/android-native.md`
  - Action : Document the gradient-aware material contract, device QA scenarios, and fallback expectations.
  - User story link : Keeps the gradient system durable and verifiable.
  - Depends on : Tâches 1-7.
  - Validate with : metadata lint and `/103-sf-verify`.

## Acceptance Criteria

- [ ] CA 1 : Given key gradients are disabled, when an older or flat theme is loaded, then the keyboard preserves the existing non-gradient appearance safely.
- [ ] CA 2 : Given automatic key gradients are enabled, when a normal key, a special key, an active key, and a disabled key are rendered, then each key receives a coherent material gradient derived from its own role color.
- [ ] CA 3 : Given relief is enabled, when a key is idle or pressed, then the top surface and visible faces use gradient treatment that still reads as one physical key body.
- [ ] CA 4 : Given a press effect such as `glow`, `electricArc`, `specularSweep`, or `inkPress` is selected, when the key is pressed, then the effect transforms the existing gradient-bearing material rather than covering it with a detached layer.
- [ ] CA 5 : Given a gradient would make labels or borders unreadable, when the user previews or saves the theme, then validation blocks or safely degrades the gradient.
- [ ] CA 6 : Given the theme is saved and reopened in Flutter Studio or the native IME, when the config is round-tripped, then the same gradient settings are preserved with safe fallbacks for unknown values.
- [ ] CA 7 : Given private or constrained rendering context is active, when the keyboard renders, then gradients can simplify but typing behavior and privacy guarantees remain unchanged.

## Test Strategy

- Run `flutter analyze` after implementation batches.
- Run targeted Flutter tests:
  - `flutter test test/keyboard_theme_studio_screen_test.dart`
  - `flutter test test/keyboard_theme_validation_test.dart`
- Add or update Kotlin parser/resolver tests when gradient helpers can be isolated safely.
- Do not run local Android Gradle/build/install commands on this VM.
- Use GitHub Actions/Blacksmith for Android compile/build proof.
- Use Diane physical-device QA for final visual credibility, especially 2D vs relief gradient coherence and effect interaction.

## Risks

- The renderer may become visually over-designed if gradients are too strong or too configurable.
- Relief and press effects can easily conflict with gradients and create muddy or fake-looking surfaces.
- Contrast validation is harder for gradients than for flat fills and may need careful heuristics.
- Flutter preview and Android Canvas parity will remain approximate in some nuanced face/lighting cases.
- Performance can degrade if too many gradient shaders or per-frame allocations are introduced during fast typing.

## Execution Notes

- Prefer a strong automatic mode first. User-facing manual control should stay bounded.
- Reuse the existing material geometry from `keyboard-material-press-effects.md`; do not invent a second shape model for gradients.
- Extract native gradient resolution into a dedicated helper if `WinGlowzKeyboardView.kt` becomes harder to maintain.
- Keep all rendering allocation-light: reuse `Paint`, `Path`, `RectF`, and shaders where possible.
- Fresh-docs not needed for the draft because the work is grounded in existing local Canvas/Paint and Flutter gradient primitives.

## Open Questions

None.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-06-11 07:13:45 UTC | 100-sf-spec | GPT-5 Codex | Created a durable spec for material key gradients that also react to the selected press effect. | Draft spec written. | /101-sf-ready shipglows_data/workflow/specs/keyboard-material-key-gradients.md |

## Current Chantier Flow

| Step | Status | Notes |
|------|--------|-------|
| 100-sf-spec | done | Draft spec created on 2026-06-11. |
| 101-sf-ready | next | Validate scope, UX control model, readability/fallback contract, and proof gates. |
| 102-sf-start | pending | Implement schema, renderer, preview, validation, and docs/checklist. |
| 103-sf-verify | pending | Verify local proof, CI/native proof, docs, and device QA evidence. |
| 104-sf-end | pending | Close chantier after verified implementation. |
| 005-sf-ship | pending | Ship only after lifecycle verification and allowed proof. |
