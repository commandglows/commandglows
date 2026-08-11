---
artifact: technical_guidelines
metadata_schema_version: "1.0"
artifact_version: "1.1.0"
project: commandglows
created: "2026-05-17"
updated: "2026-08-11"
status: reviewed
source_skill: sg-docs
scope: code-docs-map
owner: "Diane"
confidence: high
risk_level: medium
security_impact: yes
docs_impact: yes
linked_systems:
  - commandglows_site/src/
  - commandglows_site/convex/
  - commandglows_app/lib/
depends_on:
  - shipglows_data/technical/architecture.md
  - shipglows_data/technical/context.md
  - shipglows_data/technical/context-function-tree.md
  - shipglows_data/technical/guidelines.md
supersedes: []
evidence:
  - commandglows_site/src/middleware/index.ts
  - commandglows_site/src/middleware/i18n.ts
  - commandglows_site/src/content/config.ts
  - commandglows_site/src/pages/api/polar/checkout.ts
  - commandglows_site/convex/http.ts
  - commandglows_site/src/lib/commerce/providers/stripe.ts
  - commandglows_site/src/pages/api/commerce/webhooks/stripe.ts
  - commandglows_app/lib/features/auth/presentation/trial_access_screen.dart
next_review: "2026-09-11"
next_step: "Review after hosted Stripe proof or any commerce/entitlement contract change."
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
| `commandglows_site/src/pages/[...lang]/**`, `commandglows_site/src/layouts/**`, `commandglows_site/src/components/**` | public presentation and route surface | `shipglows_data/technical/context.md` | `shipglows_data/editorial/page-intent-map.md`, `shipglows_data/technical/guidelines.md` | `pnpm -C commandglows_site build:check` | page structure, CTA flow, localization, or route additions |
| `commandglows_site/src/middleware/**`, `commandglows_site/src/i18n/**`, `commandglows_site/src/utils/routing.ts` | locale and route orchestration | `shipglows_data/technical/context-function-tree.md` | `shipglows_data/technical/architecture.md`, `shipglows_data/technical/guidelines.md` | `pnpm -C commandglows_site build:check` | locale rules, redirects, slug naming, route additions |
| `commandglows_site/src/pages/api/**`, `commandglows_site/convex/**` | auth, billing, newsletter, backend state | `shipglows_data/technical/architecture.md` | `shipglows_data/technical/context-function-tree.md`, `shipglows_data/technical/guidelines.md` | `pnpm -C commandglows_site test:unit && pnpm -C commandglows_site build:check` | auth, checkout, webhook, newsletter, schema, or entitlement changes |
| `commandglows_site/src/pages/api/commerce/**`, `commandglows_site/src/lib/commerce/**` | processor-agnostic commerce and provider webhooks | `shipglows_data/technical/payment-activation-entitlements.md` | `shipglows_data/technical/platforms/stripe-managed-payments.md`, `shipglows_data/technical/platforms/lemonsqueezy.md`, `shipglows_data/technical/architecture.md` | `pnpm -C commandglows_site vitest run tests/commerce tests/bridge/commandGlowsTrialConvex.test.ts` | checkout identity, provider mapping, webhook normalization, refunds/disputes, or idempotency behavior |
| `commandglows_app/lib/features/auth/**` | Firebase identity, entitlement snapshot, trial gate and purchase handoff | `shipglows_data/technical/payment-activation-entitlements.md` | `shipglows_data/technical/architecture.md`, `shipglows_data/workflow/specs/commandglows-trial-then-paid-entitlements.md` | `(cd commandglows_app && flutter analyze && flutter test)` | identity parsing, trial expiry/restart, access gating, or purchase handoff changes |
| `commandglows_site/src/content/config.ts`, `commandglows_site/src/content/**` | runtime content schema and content collections | `shipglows_data/technical/guidelines.md` | `shipglows_data/editorial/astro-content-schema-policy.md`, `shipglows_data/editorial/content-map.md` | `pnpm -C commandglows_site build:check` | schema changes, new collections, frontmatter contract changes |
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
