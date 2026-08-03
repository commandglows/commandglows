---
artifact: technical_guidelines
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: winglowz
created: "2026-05-17"
updated: "2026-05-17"
status: reviewed
source_skill: sf-docs
scope: guidelines
owner: "Diane"
confidence: high
risk_level: medium
security_impact: yes
docs_impact: yes
linked_systems:
  - package.json
  - src/pages/api
  - src/middleware
  - convex
depends_on:
  - CLAUDE.md
  - shipglows_data/technical/architecture.md
supersedes:
  - GUIDELINES.md
evidence:
  - package.json
  - src/pages/api/polar/checkout.ts
  - src/pages/api/newsletter/subscribe.ts
  - src/middleware/i18n.ts
  - convex/http.ts
next_review: "2026-06-17"
next_step: "pnpm build:check"
---
# WinGlows Engineering Guidelines

## Purpose

Define the active engineering and documentation rules that should stay stable across routine implementation work.

## Owned Files

- `src/pages/api/**`
- `src/middleware/**`
- `src/content/config.ts`
- `README.md`
- `shipglows_data/**`

## Entrypoints

- `package.json`
- `src/middleware/i18n.ts`
- `src/pages/api/polar/checkout.ts`
- `convex/http.ts`

## Stack Summary

- Framework: Astro 6 in server mode
- UI: Astro components, React islands, Tailwind CSS, Preline
- Content: Astro content collections and MDX content
- Auth: Clerk
- Payments: Polar
- Backend: Convex
- Email: Resend
- Deployment: Vercel

## Product Rules

- `Windows Mastery` is the primary paid conversion path.
- Product catalog pages must not expose dead-end CTAs such as `#`.
- Localized routes must stay aligned:
  - English: `/products`, `/windows-mastery`
  - French: `/fr/produits`, `/fr/maitrise-windows`
- Post-purchase flows should preserve locale when possible.

## Content And Routing Rules

- Marketing pages live under `src/pages/[...lang]/`.
- Structured content lives under `src/content/`.
- Keep `src/i18n/*` in sync with rendered pages and CTA labels.
- Keep `src/utils/routing.ts` and `src/i18n/config.ts` aligned when adding or renaming localized routes.
- If content-schema behavior changes, update `shipglows_data/editorial/astro-content-schema-policy.md`.

## API And Integration Rules

- Astro API routes live in `src/pages/api/`.
- Convex HTTP endpoints live in `convex/http.ts`.
- Polar checkout depends on an authenticated Clerk user, valid `PUBLIC_CONVEX_URL`, and configured Polar product IDs.
- Newsletter flows depend on Resend audience configuration.

## Documentation Rules

- Update `README.md` whenever scripts, environment variables, or major routes change.
- Update canonical docs in `shipglows_data/technical/` when architecture or product rules change.
- Update canonical docs in `shipglows_data/editorial/` when public claims, content surfaces, or content schemas change.
- Keep technical docs concise and grounded in the current codebase.
- Do not document routes, scripts, or directories that no longer exist.

## Invariants

- Canonical governance artifacts live under `shipglows_data/`.
- Root governance docs are legacy migration sources unless explicitly retired.
- Public claims must not outrun verified implementation truth.

## Validation

```bash
pnpm build:check
python3 /home/claude/shipglows/tools/shipglows_metadata_lint.py shipglows_data/technical/guidelines.md
```

## Reader Checklist

- Read this doc before changing product rules, routing, or content-schema behavior.
- Cross-check `README.md` and the relevant canonical docs after behavior changes.
- Treat checkout, auth, and newsletter changes as high-risk and verify affected routes directly.

## Maintenance Rule

Update this doc when stack versions, product rules, or documentation rules change materially.
