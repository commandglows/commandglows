---
artifact: audit
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-06-11"
updated: "2026-06-11"
status: "draft"
source_skill: "503-sf-audit-design-tokens"
scope: "design-system-token-audit"
owner: "Diane"
confidence: "high"
risk_level: "high"
security_impact: "no"
docs_impact: "yes"
content_surfaces:
  - "winglowz_app"
  - "winglowz_site"
  - "shipglows_data"
linked_systems:
  - "winglowz_app/lib/core/theme/winglowz_theme_tokens.dart"
  - "winglowz_site/src/assets/styles/global.css"
  - "winglowz_site/tailwind.config.mjs"
depends_on:
  - artifact: "shipglows_data/technical/design-system-authority.md"
    artifact_version: "1.0.0"
    required_status: "draft"
  - artifact: "shipglows_data/technical/winglowz_app/guidelines.md"
    artifact_version: "1.0.1"
    required_status: "reviewed"
supersedes: []
evidence:
  - "python3 /home/claude/shipglows/tools/design_system_drift_check.py --format markdown --warn-only --max-findings 5000"
  - "Excluding generated .vercel/output artifacts: 422 findings"
next_step: "run remediation spec for design-token migration"
---

# WinGlows Design Tokens Audit

## Verdict

WinGlows has a usable token base on both app and site, but migration is not yet
centralized. The project still has substantial direct visual literals that
short-circuit the token layer.

## Scan Summary

- Files scanned: `591`
- Findings: `1506`
- High-impact findings after excluding generated output: `422`
- Top finding types (full scan):
  - hardcoded color: `268`
  - hardcoded dimension: `566`
  - arbitrary Tailwind visual utility: `270`
  - hardcoded motion: `391`

## Critical non-negotiables

1. **Color system split-brain**: brand gradients and site colors are not consistently
   mapped from one source. Several production files contain ad-hoc `#hex` and
   `rgb(...)` values.
2. **Spacing/motion duplication**: dozens of inline dimensions and transitions remain
   in components and styles, creating behavior drift across surfaces.
3. **Hardcoded visual branching**: direct inline style values are used in active UI
   code and bypass theme variables.

## High-priority evidence

- `winglowz_site/src/layouts/LandingLayout.astro:55` -> hardcoded `#ff00c8` for `meta theme-color`.
- `winglowz_site/src/pages/manifest.json.ts:55-56` -> hardcoded `#000000` / `#ffffff`.
- `winglowz_site/src/components/Button.astro` -> multiple spacing/typography/color literals in component CSS.
- `winglowz_site/src/pages/[...lang]/bio.astro` -> repeated hardcoded dimensions, typography, transition and color literals.
- `winglowz_app/lib/features/keyboard/presentation/keyboard_theme_studio_screen.dart` -> direct keyboard color constants and style values outside token files.
- `winglowz_app/lib/core/theme/app_theme.dart` -> only one file containing many theme-level values, while UI files still embed additional literals in the site branch.

## Top files to clean first

1. `winglowz_site/src/assets/styles/global.css` (`54` findings)
2. `winglowz_site/src/assets/styles/docs.css` (`52` findings)
3. `winglowz_site/src/components/Button.astro` (`13+` findings)
4. `winglowz_site/src/pages/[...lang]/bio.astro` (`31` findings)
5. `winglowz_app/lib/features/keyboard/presentation/keyboard_theme_studio_screen.dart` (`Color(0x...)` usages outside token files)

## Remediation order (recommended)

1. **Token authority lock**
   - Finalize and enforce `shipglows_data/technical/design-system-authority.md` as the
     mandatory source.
2. **App scan reduction**
   - Move remaining site/app hard-coded values in `keyboard_theme_studio_screen.dart` into
     dedicated token abstractions and consume through `WinGlowzThemeTokens`.
3. **Site token migration**
   - Replace arbitrary utilities and hard-coded CSS with design tokens from `global.css`
     and `tailwind.config.mjs`.
4. **Regression loop**
   - Re-run drift with generated output excluded, validate under `--max-findings` cap,
     keep only production source files in scope.

## Suggested chantier

Chantier potentiel: **oui**

Titre proposé: WinGlows token hardening and visual standardization

Reason: high volume of direct literals in production UI files blocks coherent mobile-first,
app/site coherence and future scaling.

Recommended route: `/100-sf-spec WinGlows token hardening and visual standardization`
