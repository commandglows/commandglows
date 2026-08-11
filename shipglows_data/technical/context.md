---
artifact: documentation
metadata_schema_version: "1.0"
artifact_version: "1.1.0"
project: commandglows
created: "2026-05-17"
updated: "2026-08-11"
status: reviewed
source_skill: sg-docs
scope: technical-context
owner: "Diane"
confidence: high
risk_level: medium
security_impact: unknown
docs_impact: yes
linked_systems:
  - commandglows_site
  - commandglows_app
  - commandglows_site/convex
depends_on:
  - AGENT.md
  - shipglows_data/technical/guidelines.md
supersedes:
  - CONTEXT.md
evidence:
  - commandglows_site/package.json
  - commandglows_site/src/content/config.ts
  - commandglows_site/src/pages
  - commandglows_site/src/components
  - commandglows_site/src/middleware
  - commandglows_site/convex/schema.ts
  - commandglows_site/src/pages/api/commerce/checkout.ts
  - commandglows_site/src/pages/api/commerce/webhooks/stripe.ts
  - commandglows_app/lib/features/auth/presentation/trial_access_screen.dart
next_review: "2026-09-11"
next_step: "Refresh after hosted Stripe proof or a major site/app boundary change."
---
# Repository Context

## Purpose

Provide a compact mental model of the repository layout and runtime surfaces before deeper subsystem docs are loaded.

## Owned Files

- `commandglows_site/src/**`
- `commandglows_site/convex/**`
- `commandglows_app/lib/**`

## Entrypoints

- `AGENT.md`
- `shipglows_data/technical/code-docs-map.md`
- `commandglows_site/src/pages/[...lang]/**`
- `commandglows_site/src/pages/dashboard/**`
- `commandglows_site/src/pages/api/**`

## What This Repo Is

CommandGlows is a governed monorepo containing an Astro server-rendered site
for bilingual content, commerce and identity bridges, plus a Flutter
Android-first app. Convex owns suite identity and entitlement state; Firebase
is the app authentication bridge; Stripe Managed Payments is the implemented
CommandGlows Merchant of Record adapter pending hosted proof.

## Top-Level Mental Model

- `commandglows_site/`: Astro routes, content, commerce APIs and Convex backend
- `commandglows_app/`: Flutter app, Firebase session bridge, entitlement gate and native platform hosts
- `ext/`: browser-extension surface
- `shipglows_data/`: canonical business, technical, editorial and workflow governance

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
- Termux installer landing page: `/termux` and `/fr/termux`
- exact compatibility redirects for the former ShipGlows and dotfiles pages; canonical ownership lives on `https://shipglows.com`
- legal and utility pages under the same bilingual pattern

### Installer endpoints and compatibility redirects

- `src/pages/termux-script.ts`
- `src/pages/dotfiles-script.ts` and `src/pages/shipglows-script.ts` return direct `308` redirects to the canonical ShipGlows endpoints
- `src/utils/shipglowsRedirects.ts` owns the fixed, exact, query-preserving redirect table, including historical ShipGlowz aliases

### Dashboard

- `src/pages/dashboard/index.astro`
- `src/pages/dashboard/parametres.astro`
- `src/pages/dashboard/taches.astro`
- `src/pages/dashboard/docs/*`

### APIs

- `src/pages/api/clerk/webhook.ts`
- `src/pages/api/polar/checkout.ts`
- `src/pages/api/polar/webhook.ts`
- `src/pages/api/commerce/checkout.ts`
- `src/pages/api/commerce/webhooks/stripe.ts`
- `src/pages/api/commerce/webhooks/lemon-squeezy.ts` for CommunityGlows only
- `src/pages/api/bridge/firebase.ts`
- `src/pages/api/newsletter/subscribe.ts`
- `src/pages/api/newsletter/unsubscribe.ts`

## Invariants

- `src/content/config.ts` stays the active content-schema contract.
- Locale and route labels must stay aligned between `src/pages/[...lang]`, `src/i18n/*`, and routing utilities.
- Public docs and premium docs live in the same content collection but do not share the same access behavior.

## Validation

```bash
pnpm -C commandglows_site build:check
python3 /home/claude/shipglows/tools/shipglows_metadata_lint.py shipglows_data/technical/context.md
```

## Reader Checklist

- Load this doc first for repository orientation.
- Load `architecture.md` for backend and integration boundaries.
- Load `context-function-tree.md` when changing middleware, routing, or integration flow.

## Maintenance Rule

Update this doc when major directories, route families, or repo-level mental models change.
