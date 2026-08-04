---
artifact: architecture_context
metadata_schema_version: '1.0'
artifact_version: '1.0.1'
project: commandglows
created: '2026-05-17'
updated: '2026-06-12'
status: reviewed
source_skill: sf-docs
scope: architecture
owner: 'Diane'
confidence: high
risk_level: medium
docs_impact: yes
security_impact: yes
evidence:
  - package.json
  - src/content/config.ts
  - src/middleware/index.ts
  - src/middleware/i18n.ts
  - src/pages/api/polar/checkout.ts
  - src/pages/api/bridge/entitlement.ts
  - src/pages/api/newsletter/subscribe.ts
  - src/pages/api/features/[key]/vote.ts
  - src/pages/api/features/suggest.ts
  - convex/http.ts
  - convex/schema.ts
linked_systems:
  - src/content
  - src/pages
  - src/middleware
  - convex
  - Clerk
  - Polar
  - Resend
external_dependencies:
  - Astro
  - Vercel
  - Clerk
  - Convex
  - Polar
  - Resend
invariants:
  - English routes remain unprefixed while French routes stay under /fr.
  - Checkout initiation and webhook entitlement updates remain coordinated between Astro routes and Convex.
  - Typed content collections continue to define valid docs, blog, product, and service content.
depends_on:
  - shipglows_data/technical/guidelines.md
  - shipglows_data/business/business.md
  - shipglows_data/business/branding.md
supersedes:
  - ARCHITECTURE.md
next_review: '2026-06-17'
next_step: 'pnpm build:check'
---

# Architecture

## Purpose

Describe the stable system boundaries for CommandGlows so technical and docs changes stay aligned with the current runtime.

## Owned Files

- `src/pages/**`
- `src/middleware/**`
- `src/content/config.ts`
- `convex/**`

## Entrypoints

- `src/middleware/index.ts`
- `src/pages/api/polar/checkout.ts`
- `src/pages/api/polar/webhook.ts`
- `src/pages/api/newsletter/subscribe.ts`
- `src/pages/api/clerk/webhook.ts`
- `src/pages/api/features/[key]/vote.ts`
- `src/pages/api/features/suggest.ts`
- `convex/http.ts`

## System Overview

CommandGlows is a server-rendered Astro application deployed to Vercel. It combines public content, gated training routes, and backend integrations for authentication, billing, newsletter operations, and user entitlements.

## Core Architectural Layers

### Presentation layer

- Astro pages under `src/pages/`
- layouts under `src/layouts/`
- components under `src/components/`
- React islands for interactive UI where needed

### Content layer

Typed collections in `src/content/config.ts` define valid shapes for:

- docs
- products
- blog
- services

### Request orchestration layer

`src/middleware/index.ts` runs Clerk middleware only for Clerk-owned pages and APIs that need `locals.auth()`. Server-owned endpoints that authenticate themselves (`/api/bridge/*`, webhook proxies, and newsletter APIs) bypass Clerk first, then route `/api/*` through CORS handling. Other requests use i18n handling.

### Integration API layer

Astro API routes act as thin integration controllers for:

- Polar checkout
- Polar webhook proxying
- newsletter subscribe and unsubscribe
- Clerk webhook intake
- roadmap voting and suggestion intake
- suite bridge endpoints:
  - `POST /api/bridge/firebase` maps Firebase users to suite identities and mirrors `commandglows_app` access into Firestore.
  - `POST /api/bridge/sync` refreshes the Firestore access mirror by `globalUserId`.
  - `POST /api/bridge/entitlement` verifies a Clerk session token server-side and returns a redacted ReplayGlowz entitlement snapshot for `product_id=replayglowz`; old YouTube-product ids are no longer accepted. When a recognized Clerk account has no active ReplayGlowz entitlement yet, the bridge persists a product-scoped `replayglowz/free` default grant instead of granting suite-wide access.

### Backend state layer

Convex is the primary state store. Current tables in `convex/schema.ts` are:

- `users`
- `globalUsers`
- `identityAccounts`
- `productEntitlements`
- `productAccessEvents`
- `apiKeys`
- `features`
- `featureVotes`
- `featureSuggestions`

## Invariants

- English routes remain unprefixed while French routes stay under `/fr`.
- Checkout initiation and webhook entitlement updates remain coordinated between Astro routes and Convex.
- Typed content collections continue to define valid docs, blog, product, and service content.
- API routes should stay thin; durable business state belongs in Convex or provider systems.

## Validation

```bash
pnpm build:check
python3 /home/claude/shipglows/tools/shipglows_metadata_lint.py shipglows_data/technical/architecture.md
```

## Reader Checklist

- Read this doc before changing auth, billing, webhook, or backend boundaries.
- Cross-check route-flow details in `shipglows_data/technical/context-function-tree.md`.
- Cross-check product and claim boundaries before changing public promises.

## Maintenance Rule

Update this doc when architectural boundaries, primary integrations, or persistent data contracts change.
