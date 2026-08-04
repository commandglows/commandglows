---
artifact: technical_guidelines
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: commandglows
created: "2026-05-17"
updated: "2026-05-17"
status: reviewed
source_skill: sf-docs
scope: code-docs-map
owner: "Diane"
confidence: high
risk_level: medium
security_impact: yes
docs_impact: yes
linked_systems:
  - src/pages/
  - src/middleware/
  - src/content/
  - src/utils/
  - convex/
depends_on:
  - shipglows_data/technical/architecture.md
  - shipglows_data/technical/context.md
  - shipglows_data/technical/context-function-tree.md
  - shipglows_data/technical/guidelines.md
supersedes: []
evidence:
  - src/middleware/index.ts
  - src/middleware/i18n.ts
  - src/content/config.ts
  - src/pages/api/polar/checkout.ts
  - convex/http.ts
next_review: "2026-06-17"
next_step: "/sf-docs update"
---
# Code Docs Map

## Purpose

Map stable code areas to their primary technical docs, expected validations, and documentation-update triggers.

## Owned Files

- `shipglows_data/technical/code-docs-map.md`

## Entrypoints

- Read this file first for any code-changing task.
- Then load the primary doc for the touched path patterns.

## Path Coverage

| Path patterns | Subsystem | Primary doc | Secondary docs | Validation | Trigger |
| --- | --- | --- | --- | --- | --- |
| `src/pages/[...lang]/**`, `src/layouts/**`, `src/components/**` | public presentation and route surface | `shipglows_data/technical/context.md` | `shipglows_data/editorial/page-intent-map.md`, `shipglows_data/technical/guidelines.md` | `pnpm build:check` | page structure, CTA flow, localization, or route additions |
| `src/middleware/**`, `src/i18n/**`, `src/utils/routing.ts` | locale and route orchestration | `shipglows_data/technical/context-function-tree.md` | `shipglows_data/technical/architecture.md`, `shipglows_data/technical/guidelines.md` | `pnpm build:check` | locale rules, redirects, slug naming, route additions |
| `src/pages/api/**`, `convex/**` | auth, billing, newsletter, backend state | `shipglows_data/technical/architecture.md` | `shipglows_data/technical/context-function-tree.md`, `shipglows_data/technical/guidelines.md` | `pnpm build:check` | auth, checkout, webhook, newsletter, schema, or entitlement changes |
| `src/pages/api/commerce/**`, `src/lib/commerce/**` | processor-agnostic commerce and provider webhooks | `shipglows_data/technical/architecture.md` | `shipglows_data/technical/context.md`, `shipglows_data/technical/context-function-tree.md`, `shipglows_data/technical/platforms/lemonsqueezy.md` | `pnpm test tests/commerce/*.test.ts` | checkout route, webhook normalization, provider abstraction, and commerce idempotency behavior |
| `src/content/config.ts`, `src/content/**` | runtime content schema and content collections | `shipglows_data/technical/guidelines.md` | `shipglows_data/editorial/astro-content-schema-policy.md`, `shipglows_data/editorial/content-map.md` | `pnpm build:check` | schema changes, new collections, frontmatter contract changes |
| `README.md`, `AGENT.md`, `shipglows_data/**` | governance and onboarding docs | `shipglows_data/technical/README.md` | all canonical governance docs | metadata lint + targeted `rg` checks | doc drift, new subsystem docs, or governance migration |

## Documentation Update Plan

Use this format when code changes affect docs:

| code changed | subsystem | primary doc | secondary docs | action | priority | reason | owner role | parallel-safe | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `path/to/file` | short label | canonical doc | optional list | `none`, `review`, `update`, or `create` | `P0`-`P3` | concrete cause | `executor` or `integrator` | `yes` or `no` | optional caveat |

## Invariants

- Every major code area above must map to at least one canonical technical doc.
- Shared governance files stay under `shipglows_data/technical/` and not under `docs/`.
- Editorial policy documents own public-claim and content-schema governance, even when engineering changes trigger them.

## Validation

```bash
python3 /home/claude/shipglows/tools/shipglows_metadata_lint.py shipglows_data/technical/code-docs-map.md
rg -n "Maintenance Rule|Validation|Owned Files|Entrypoints" shipglows_data/technical/code-docs-map.md
```

## Reader Checklist

- Match the touched paths to a row above.
- Load the primary doc and any necessary secondary docs.
- Record doc impact explicitly before finishing implementation.

## Maintenance Rule

Update this map whenever a major code area, canonical doc, or validation contract changes.
