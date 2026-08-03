---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-06-09"
created_at: "2026-06-09 21:05:11 UTC"
updated: "2026-06-09"
updated_at: "2026-06-09 21:10:00 UTC"
status: ready
source_skill: sf-build
source_model: "GPT-5 Codex"
scope: "site-legacy-youtube-brand-removal"
owner: "Diane"
confidence: high
user_story: "En tant que propriétaire de WinGlows, je veux que l'ancien nom du produit YouTube disparaisse des surfaces publiques, docs actives et contrats runtime, afin que le monorepo expose uniquement les noms produits actuels et n'entretienne plus de confusion de marque."
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "winglowz_site"
  - "Convex bridge"
  - "Suite auth"
  - "Polar product scripts"
  - "Public content"
  - "ShipGlows governance"
depends_on:
  - artifact: "shipglows_data/business/branding.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/editorial/content-map.md"
    artifact_version: "1.0.1"
    required_status: "reviewed"
  - artifact: "shipglows_data/workflow/specs/unified-suite-authentication.md"
    artifact_version: "1.0.25"
    required_status: "active"
supersedes: []
evidence:
  - "2026-06-09 monorepo scan found old YouTube-product naming outside winglowz_app across winglowz_site public content, suite bridge allowlists/tests, Polar creation script, SVG assets, and governance docs."
  - "User correction 2026-06-09: the old name should no longer be present."
next_step: "/sf-end shipglows_data/workflow/specs/winglowz-site-legacy-youtube-brand-removal.md"
---

# WinGlows Site Legacy YouTube Brand Removal

## Status

Ready for implementation on 2026-06-09. The user decision is explicit: the old YouTube-product name should no longer appear in active surfaces.

## Minimal Behavior Contract

WinGlows public pages, active docs, scripts, tests, runtime allowlists, and governance docs must stop exposing the old YouTube-product name. The current canonical product identity is `ReplayGlowz` with `product_id=replayglowz`. If a runtime bridge previously accepted the old product id as an alias, this chantier removes that alias and updates tests/docs to make the break intentional. Historical rows may be rewritten only when they are active governance notes that would otherwise keep reintroducing old naming; do not fabricate history or introduce unsupported product claims.

## Scope In

- `winglowz_site/src/**` public copy, route data, roadmap data, landing components, SVG text labels, and content entries.
- `winglowz_site/src/lib/suiteBridge.ts`, `winglowz_site/convex/bridge.ts`, and bridge tests where the old product id is allowlisted or accepted.
- `winglowz_site/scripts/create-polar-products.mjs` product names and metadata.
- Active governance docs that currently describe the old id as an accepted alias.
- Delete obsolete product content files if they only exist to publish the old product page.

## Scope Out

- No Android build, install, or Gradle validation.
- No production deployment, DNS, or Vercel alias work in this run.
- No new product launch copy beyond replacing stale YouTube-product naming with `ReplayGlowz` or removing obsolete references.
- No commits or pushes from this skill run.

## Acceptance Criteria

- An active monorepo old-brand scan returns no matches outside intentionally ignored generated/dependency folders.
- Suite bridge runtime allowlists and tests no longer accept the old product id.
- Public content no longer advertises the old product name.
- Site checks pass with `pnpm build:check` and targeted/unit tests as appropriate.
- ShipGlows metadata lint passes for changed governance docs.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-06-09 21:10:00 UTC | sf-build | GPT-5 Codex | Removed old YouTube-product naming from active monorepo surfaces: site public copy/content/routes/assets/scripts now use ReplayGlowz, product content files and market-study filename were renamed, suite bridge allowlists no longer accept the old product id, ReplayGlowz alias reason code was removed, bridge tests were updated, and active governance docs now state that old ids must be normalized before runtime checks. Local proof: old-brand `rg` scan returned no matches; `pnpm build:check`, `pnpm test:unit`, ShipGlows metadata lint, and alias-contract scans passed. | implemented | Review diff; ship only on explicit commit/push request. |
| 2026-06-09 21:05:11 UTC | sf-build | GPT-5 Codex | Created the dedicated cleanup chantier and started the implementation pass for site public content, suite bridge aliases, tests, product scripts, SVG labels, and governance docs. | partial | Continue implementation and validation in this run. |

## Current Chantier Flow

| Step | Status | Evidence | Next |
|------|--------|----------|------|
| sf-spec | complete | Dedicated spec created from user decision and monorepo occurrence scan on 2026-06-09. | Continue implementation. |
| sf-ready | ready | Scope, risk, behavior contract, and validation commands are explicit; old alias removal is an intentional behavior change from the user decision. | Continue implementation. |
| sf-start | complete | Site public content, scripts, assets, bridge code/tests, and governance docs cleaned on 2026-06-09. | Review diff. |
| sf-verify | complete | Old-brand scan returned no matches; alias-contract scan returned no stale accepted-alias contract; `pnpm build:check`, `pnpm test:unit`, and ShipGlows metadata lint passed. | Review diff. |
| sf-end | pending | Local implementation and verification are complete; no closure artifact beyond this spec was written. | Close after user review if desired. |
| sf-ship | pending | No commit or push was created in this run per repo guardrails. | Commit/push only on explicit request. |
