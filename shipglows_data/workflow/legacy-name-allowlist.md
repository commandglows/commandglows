---
artifact: documentation
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlowz"
created: "2026-08-03"
updated: "2026-08-03"
status: active
source_skill: 102-sg-start
scope: "shipglows-legacy-compatibility"
owner: "Diane"
confidence: high
risk_level: medium
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "winglowz_site"
depends_on:
  - "shipglows_data/workflow/specs/shipglows-canonical-surface-migration.md"
supersedes: []
evidence:
  - "Compatibility tests cover legacy routes, environment variables, checkout paths, and entitlement IDs."
next_step: "/103-sg-verify shipglows-canonical-surface-migration"
---

# ShipGlows legacy-name allowlist

Legacy `ShipGlowz` spellings may remain only in these bounded compatibility surfaces:

- `winglowz_site/src/pages/shipglowz.astro`, `winglowz_site/src/pages/fr/shipglowz.astro`, and `winglowz_site/src/pages/shipglowz-script.ts`: exact permanent redirects.
- `winglowz_site/src/middleware/authRouting.ts`: exact legacy raw-script bypass only.
- `winglowz_site/src/generated/shipglows-installer.sh` and `.ps1`: deprecated `SHIPGLOWZ_*`, `SHIPFLOW_*`, and `~/shipglowz` fallback reads.
- `winglowz_site/src/lib/suiteBridge.ts` and `winglowz_site/convex/defaultFreeEntitlements.ts`: legacy `shipglowz` product-ID normalization.
- Matching tests under `winglowz_site/tests/`: compatibility assertions only.
- This allowlist and the migration spec/checklist: historical contract and proof vocabulary.

No active instruction, emitted identifier, canonical route, repository link, or default path may use a legacy spelling.
