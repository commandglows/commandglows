---
artifact: documentation
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: commandglows
created: "2026-04-25"
updated: "2026-05-17"
status: reviewed
source_skill: sf-docs
scope: file
owner: "Diane"
confidence: high
risk_level: medium
security_impact: yes
docs_impact: yes
linked_systems:
  - "Astro 6"
  - "Vercel"
  - "Clerk"
  - "Convex"
  - "Polar"
  - "Resend"
depends_on:
  - "shipglows_data/technical/guidelines.md"
  - "shipglows_data/technical/architecture.md"
supersedes: []
evidence:
  - "package.json"
  - "astro.config.mjs"
  - "src/middleware/index.ts"
  - "src/pages/api/polar/checkout.ts"
  - "convex/http.ts"
next_step: "pnpm build:check"
---
# commandglows

## Repository Execution Contract

This repository is an Astro 6 server application with bilingual routing, Clerk auth, Convex state, Polar checkout, and Resend newsletter flows.

Use this file as the short operating contract before changing code or docs.

## Stack Snapshot

- Framework: Astro 6 (`output: "server"`)
- Deployment adapter: Vercel (`@astrojs/vercel`)
- Auth: Clerk middleware + webhook forwarding
- Backend/state: Convex (`users`, `apiKeys`, `features`)
- Billing: Polar checkout route + Convex webhook processing
- Email: Resend subscribe/unsubscribe API routes
- Content: Astro content collections (`docs`, `products`, `blog`, `services`)

## First Files To Inspect

1. `shipglows_data/technical/guidelines.md`
2. `shipglows_data/technical/architecture.md`
3. `src/middleware/index.ts`
4. `src/middleware/i18n.ts`
5. `src/pages/api/polar/checkout.ts`
6. `convex/http.ts`

## High-Risk Change Areas

- Locale and route normalization: `src/middleware/i18n.ts`, `src/i18n/config.ts`, `src/utils/routing.ts`
- Checkout and entitlements: `src/pages/api/polar/checkout.ts`, `src/pages/api/polar/webhook.ts`, `convex/http.ts`, `convex/polar.ts`, `src/utils/courseGating.ts`
- Auth identity sync: `src/pages/api/clerk/webhook.ts`, `convex/http.ts`, `convex/users.ts`
- Newsletter side effects: `src/pages/api/newsletter/subscribe.ts`, `src/pages/api/newsletter/unsubscribe.ts`
- Content schema contracts: `src/content/config.ts`

## Runtime Assumptions

- English routes are unprefixed and French routes are under `/fr`.
- `PUBLIC_CONVEX_URL` must not be placeholder for Convex-backed logic.
- Polar flows require `POLAR_ACCESS_TOKEN` and `POLAR_COMMANDGLOWS_PRODUCT_ID` (or fallback `POLAR_PRODUCT_ID`).
- Newsletter routes require `RESEND_API_KEY` and a valid audience id.

## Safe Change Pattern

1. Identify the boundary first (routing, auth, checkout, newsletter, content schema).
2. Keep Astro API routes as thin integration controllers.
3. Keep durable state transitions inside Convex mutations/actions.
4. Update docs when changing env contracts, route contracts, or data shape.
