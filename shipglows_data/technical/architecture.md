---
artifact: architecture_context
metadata_schema_version: '1.0'
artifact_version: '1.1.0'
project: commandglows
created: '2026-05-17'
updated: '2026-08-11'
status: reviewed
source_skill: sg-docs
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
  - commandglows_site/src/lib/commerce/providers/stripe.ts
  - commandglows_site/src/lib/commerce/checkoutIdentity.ts
  - commandglows_site/src/pages/api/commerce/webhooks/stripe.ts
  - commandglows_app/lib/features/auth/domain/suite_identity.dart
linked_systems:
  - src/content
  - src/pages
  - src/middleware
  - convex
  - Clerk
  - Polar
  - Resend
  - Stripe Managed Payments
  - Firebase
external_dependencies:
  - Astro
  - Vercel
  - Clerk
  - Convex
  - Polar
  - Resend
  - Stripe
  - Firebase
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
next_review: '2026-09-11'
next_step: 'Capture hosted Stripe, Convex and app-refresh proof before production readiness.'
---

# Architecture

## Purpose

Describe the stable system boundaries for CommandGlows so technical and docs changes stay aligned with the current runtime.

## Owned Files

- `commandglows_site/src/pages/**`
- `commandglows_site/src/middleware/**`
- `commandglows_site/src/content/config.ts`
- `commandglows_site/convex/**`
- `commandglows_app/lib/features/auth/**`

## Entrypoints

- `commandglows_site/src/middleware/index.ts`
- `commandglows_site/src/pages/api/polar/checkout.ts`
- `commandglows_site/src/pages/api/commerce/checkout.ts`
- `commandglows_site/src/pages/api/commerce/webhooks/stripe.ts`
- `commandglows_site/src/pages/api/bridge/firebase.ts`
- `commandglows_site/src/pages/api/polar/webhook.ts`
- `commandglows_site/src/pages/api/newsletter/subscribe.ts`
- `commandglows_site/src/pages/api/clerk/webhook.ts`
- `commandglows_site/src/pages/api/features/[key]/vote.ts`
- `commandglows_site/src/pages/api/features/suggest.ts`
- `commandglows_site/convex/http.ts`

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
  - `POST /api/bridge/firebase` maps Firebase users to suite identities, mirrors `commandglows_app` access into Firestore, and issues a short-lived HMAC-signed checkout identity handoff when configured.
  - `POST /api/bridge/sync` refreshes the Firestore access mirror by `globalUserId`.
  - `POST /api/bridge/entitlement` verifies a Clerk session token server-side and returns a redacted ReplayGlowz entitlement snapshot for `product_id=replayglowz`; old YouTube-product ids are no longer accepted. When a recognized Clerk account has no active ReplayGlowz entitlement yet, the bridge persists a product-scoped `replayglowz/free` default grant instead of granting suite-wide access.
- commerce endpoints:
  - `GET|POST /api/commerce/checkout` resolves an allowlisted offer and provider; CommandGlows purchases require a valid signed app handoff and explicitly create a Stripe Managed Payments Checkout Session.
  - `POST /api/commerce/webhooks/stripe` verifies the exact raw body and `Stripe-Signature`, then maps paid Checkout, successful full refund, and dispute events to the generic Convex commerce processor.
  - `POST /api/commerce/webhooks/lemon-squeezy` remains active for the separate CommunityGlows offer.

### Backend state layer

Convex is the primary state store. Current tables in `convex/schema.ts` are:

- `users`
- `globalUsers`
- `identityAccounts`
- `productEntitlements`
- `productTrialInstallations`
- `productTrialRiskWindows`
- `productActivationCodes`
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
- Checkout redirects never grant access. Only signed, idempotent provider events may change paid entitlement state.
- Raw client-supplied global user IDs are never trusted for CommandGlows checkout identity.

## Validation

```bash
pnpm -C commandglows_site build:check
python3 /home/claude/shipglows/tools/shipglows_metadata_lint.py shipglows_data/technical/architecture.md
```

## Reader Checklist

- Read this doc before changing auth, billing, webhook, or backend boundaries.
- Cross-check route-flow details in `shipglows_data/technical/context-function-tree.md`.
- Cross-check product and claim boundaries before changing public promises.

## Maintenance Rule

Update this doc when architectural boundaries, primary integrations, or persistent data contracts change.
