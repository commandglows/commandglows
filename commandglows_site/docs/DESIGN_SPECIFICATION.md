# CommandGlows Design Specification

This document describes how the CommandGlows identity is expressed on the
Astro site. It is contributor guidance, not a token authority. The canonical
cross-surface contract is
[`shipglows_data/technical/design-system-authority.md`](../../shipglows_data/technical/design-system-authority.md),
and the platform-neutral token source is [`design-system/tokens.json`](../../design-system/tokens.json).

## Shared identity

CommandGlows is a productivity ecosystem for Windows workflows. Its identity
combines a high-contrast, clarity-first interface with the multicolor logo
gradient. The logo colors are brand primitives, not the only colors permitted
in the product. Neutral surfaces, readable text, status colors, focus colors,
scrims, and platform-safe fallbacks are semantic roles with their own contrast
and interaction responsibilities.

The shared identity contract covers role meaning, hierarchy, state, and
accessibility. It does not require every platform to use the same physical font,
density, radius, or delivery mechanism.

## Site adaptation

The site currently maps its body, display, and logo roles to the bundled or
declared site fonts in `src/assets/styles/global.css`. Those role mappings may
differ from Flutter, Android IME, email, or extension fallbacks when the
adaptation registry records the reason and proof. Do not replace them with the
Tailwind or browser default font stack by convenience.

Site colors, typography, spacing, radii, shadows, motion, focus treatments, and
responsive dimensions resolve through generated semantic variables, classified
site variables, or named component variables. The Tailwind configuration is a
thin adapter; generic palette names and raw values must not become a second
authority.

The signature gradient is appropriate for the logo and selected branded
accents. It is not the default for every call to action, status, or focus state.
Choose the semantic role required by the component and verify text contrast in
light and dark modes.

## Token layers

The allowed dependency direction is:

```text
primitive -> semantic -> component -> consumer
```

- Primitives store typed raw values in the canonical manifest.
- Semantic roles express stable product meaning and form the cross-surface
  identity contract.
- Component tokens compose semantic roles without creating new raw-value
  authorities.
- Page/prototype variables remain classified local consumers or documented
  exceptions; numerical equality does not make them shared roles.

## Contributor rules

1. Start with an existing semantic or component role.
2. If no role fits, update the canonical manifest and registries before adding a
   consumer value.
3. Regenerate the owning adapter; never hand-edit a generated file.
4. Keep platform differences in `design-system/adaptations.json` and literal
   exceptions in `design-system/exceptions.json`, with owner, proof, and a
   review or removal condition.
5. Use arbitrary Tailwind utilities only for a documented, scoped exception.
   Prefer semantic aliases or named component variables for production UI.
6. A component-local CSS custom property is acceptable when it composes
   canonical roles or represents standard intrinsic geometry; it must not hide a
   new primitive palette, type scale, spacing scale, or motion system.

Examples such as `rounded-[36px]`, raw hex colors, system-font shortcuts, and
generic Tailwind palette utilities are not design guidance.

## Accessibility and responsive behavior

- Preserve visible focus, logical keyboard order, reduced-motion behavior, and
  semantic HTML.
- Meet WCAG 2.2 AA contrast and target requirements for the supported states.
- Test representative mobile, tablet, and desktop widths in light and dark
  modes. Responsive values come from named breakpoints or layout roles rather
  than one-off viewport guesses.
- Do not replace maintained interaction behavior with a styled bespoke control.

## Validation

From the repository root:

```powershell
uv run python tools/design_system/generate_tokens.py --validate-only
uv run python -m unittest discover -s tools/design_system/tests -v
uv run python tools/design_system/project_drift_guard.py --format markdown
uv run python tools/design_system/generate_tokens.py --check
```

The project guard scans Dart, Kotlin, Android XML, CSS, Astro, TypeScript,
JavaScript, HTML, email sources, and extension sources. Exact generated paths
are delegated to the generator's provenance and stale-output check. A green
source scan does not prove rendered parity; site changes still require build,
browser, accessibility, and responsive evidence proportional to the claim.
