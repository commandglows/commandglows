---
artifact: test_checklist
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-06-11"
updated: "2026-06-11"
status: draft
source_skill: "103-sf-verify"
scope: "design-system-hardening"
owner: "Diane"
confidence: "medium"
risk_level: "high"
security_impact: "none"
docs_impact: "yes"
linked_systems:
  - "winglowz_app/lib"
  - "winglowz_site/src"
  - "shipglows_data/technical/design-system-authority.md"
  - "shipglows_data/technical/design-system-authority.md"
depends_on:
  - "shipglows_data/workflow/specs/winglowz-token-hardening-and-visual-standardization.md"
supersedes: []
evidence: []
next_step: "103-sf-verify shipglows_data/workflow/specs/winglowz-token-hardening-and-visual-standardization.md"
---

# WinGlows Token Hardening and Visual Standardization Checklist

## Scenario Status

| Scenario ID | Surface | Scenario | Required | Expected | Status | Observed | Evidence pointer | Notes | Bug Link |
|-------------|---------|----------|----------|----------|--------|----------|------------------|-------|
| DS-APP-TOKENS-001 | Flutter app | Token source drift elimination | yes | No production-UI hardcoded visual literals remain outside canonical token files. | NOT_RUN | Pending implementation | pending | Run `design_system_drift_check.py --changed --format markdown` after each commit block. | |
| DS-SITE-TOKENS-001 | Astro site | Tailwind arbitrary utility elimination | yes | No arbitrary visual utilities in production site components and styles are added outside canonical aliases. | NOT_RUN | Pending implementation | pending | Validate through targeted diff scan + build. | |
| DS-MOBILE-TARGET-001 | Flutter + web mobile | Mobile-safe spacing consistency | yes | Common interactive targets and safe-area-sensitive spacing remain coherent after token migration. | NOT_RUN | Pending implementation | pending | Manual responsive spot check on key screens. | |

## Manual Verification Notes

- Run in this order: code scan → lint/build → visual spot-check mobile.
- If any scenario remains `NOT_RUN`, do not close the chantier.
