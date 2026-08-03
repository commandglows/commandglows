---
artifact: test_checklist
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlowz"
created: "2026-08-03"
updated: "2026-08-03"
status: draft
source_skill: 102-sg-start
scope: "shipglows-canonical-surface-migration"
owner: "Diane"
confidence: high
risk_level: high
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "winglowz_site"
  - "winglowz_app"
  - "convex"
depends_on:
  - "shipglows_data/workflow/specs/shipglows-canonical-surface-migration.md"
supersedes: []
evidence:
  - "Local Astro smoke on 2026-08-03: canonical EN/FR/script routes returned 200; exact legacy routes returned 301 and preserved query strings."
  - "Site validation: Astro check passed with 0 errors and 89/89 Vitest tests passed."
  - "App validation: flutter analyze passed and the changed language-pack test passed 28/28; the full inherited Flutter suite retains 22 unrelated UI/theme expectation failures."
next_step: "/103-sg-verify shipglows-canonical-surface-migration"
---

# ShipGlows canonical surface migration proof

| Scenario ID | Surface | Scenario | Required | Expected | Status | Observed | Evidence pointer | Notes | Bug Link |
|---|---|---|---|---|---|---|---|---|---|
| SGM-ROUTE-01 | Site routes | Canonical and exact legacy EN/FR routes | yes | Canonical 200; legacy 301 with query preservation | PASS | Expected statuses and locations observed | winglowz_site/tests/deployment/shipglowsRoutes.test.ts | Local HTTP smoke also passed | |
| SGM-SCRIPT-02 | Script endpoint | Canonical shell/PowerShell response and legacy redirect | yes | Canonical 200; legacy 301 with query preservation | PASS | Expected statuses and locations observed | winglowz_site/tests/deployment/shipglowsRoutes.test.ts | Shell syntax passed | |
| SGM-ENV-03 | Installers | Canonical environment precedence and bounded fallbacks | yes | SHIPGLOWS wins over deprecated aliases | PASS | Precedence and warning cases passed | winglowz_site/tests/deployment/shipglowsInstaller.test.ts | Both installer formats covered | |
| SGM-ENTITLEMENT-04 | Entitlements | Legacy, canonical, dual and missing records | yes | One canonical access result without duplicate grant | PASS | All normalization cases passed | winglowz_site/tests/bridge/defaultFreeEntitlements.test.ts | Bridge tests also passed | |
| SGM-GOVERNANCE-05 | Documentation | Canonical root and tracker reconciliation | yes | One root corpus and no lost nested task | PASS | One shipglows_data root remains | shipglows_data/workflow/TASKS.md | Six nested records reconciled | |
| SGM-NAME-SCAN-06 | Repository | Active legacy-name scan | yes | Only allowlisted compatibility names remain | PASS | Remaining matches are bounded compatibility or history | shipglows_data/workflow/legacy-name-allowlist.md | Generated and vendor outputs excluded | |
