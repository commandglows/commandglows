---
artifact: documentation
metadata_schema_version: "1.0"
artifact_version: "1.0.1"
project: commandglows
created: "2026-05-17"
updated: "2026-05-23"
status: reviewed
source_skill: sf-docs
scope: technical-context
owner: "Diane"
confidence: high
risk_level: medium
security_impact: unknown
docs_impact: yes
linked_systems:
  - src/pages
  - src/components
  - src/content
  - src/i18n
  - src/middleware
  - convex
depends_on:
  - AGENT.md
  - shipglows_data/technical/guidelines.md
supersedes:
  - CONTEXT.md
evidence:
  - package.json
  - src/content/config.ts
  - src/pages
  - src/components
  - src/middleware
  - convex/schema.ts
  - src/pages/[...lang]/termux.astro
  - src/pages/[...lang]/dotfiles.astro
  - src/pages/[...lang]/shipglows.astro
next_review: "2026-06-17"
next_step: "pnpm build:check"
---
# Repository Context

## Purpose

Provide a compact mental model of the repository layout and runtime surfaces before deeper subsystem docs are loaded.

## Owned Files

- `src/pages/**`
- `src/components/**`
- `src/content/**`
- `src/i18n/**`
- `src/middleware/**`
- `convex/**`

## Entrypoints

- `AGENT.md`
- `shipglows_data/technical/code-docs-map.md`
- `src/pages/[...lang]/**`
- `src/pages/dashboard/**`
- `src/pages/api/**`

## What This Repo Is

CommandGlows is an Astro server-rendered site with bilingual marketing pages, documentation content, product pages, a training sales path, a lightweight dashboard, and backend integrations for auth, billing, and email.

## Top-Level Mental Model

- `src/pages/`: route surface
- `src/components/`: Astro and React UI building blocks
- `src/content/`: typed markdown collections
- `src/i18n/`: locale strings and route labels
- `src/middleware/`: request shaping before route execution
- `src/utils/`: routing, docs, UI, gating, and helper logic
- `convex/`: database schema and backend business logic

## Route Surface

### Public marketing and content

- `src/pages/[...lang]/index.astro`
- `src/pages/[...lang]/landing.astro`
- `src/pages/[...lang]/[products].astro`
- `src/pages/[...lang]/[products_slug].astro`
- `src/pages/[...lang]/[blog].astro`
- `src/pages/[...lang]/[blog_slug].astro`
- `src/pages/[...lang]/[services].astro`
- `src/pages/[...lang]/[roadmap].astro`
- script utility landing pages: `/termux`, `/dotfiles`, `/shipglows` and French equivalents
- legal and utility pages under the same bilingual pattern

### Raw installer endpoints

- `src/pages/termux-script.ts`
- `src/pages/dotfiles-script.ts`
- `src/pages/shipglows-script.ts`

### Dashboard

- `src/pages/dashboard/index.astro`
- `src/pages/dashboard/parametres.astro`
- `src/pages/dashboard/taches.astro`
- `src/pages/dashboard/docs/*`

### APIs

- `src/pages/api/clerk/webhook.ts`
- `src/pages/api/polar/checkout.ts`
- `src/pages/api/polar/webhook.ts`
- `src/pages/api/newsletter/subscribe.ts`
- `src/pages/api/newsletter/unsubscribe.ts`

## Invariants

- `src/content/config.ts` stays the active content-schema contract.
- Locale and route labels must stay aligned between `src/pages/[...lang]`, `src/i18n/*`, and routing utilities.
- Public docs and premium docs live in the same content collection but do not share the same access behavior.

## Validation

```bash
pnpm build:check
python3 /home/claude/shipglows/tools/shipglows_metadata_lint.py shipglows_data/technical/context.md
```

## Reader Checklist

- Load this doc first for repository orientation.
- Load `architecture.md` for backend and integration boundaries.
- Load `context-function-tree.md` when changing middleware, routing, or integration flow.

## Maintenance Rule

Update this doc when major directories, route families, or repo-level mental models change.
