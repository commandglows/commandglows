---
artifact: architecture_context
metadata_schema_version: '1.0'
artifact_version: '1.6.0'
project: commandglows
created: '2026-05-17'
updated: '2026-09-04'
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
  - src/pages/api/checkout/start.ts
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
  - commandglows_app/lib/core/router/app_router.dart
linked_systems:
  - src/content
  - src/pages
  - src/middleware
  - convex
  - Clerk
  - Resend
  - Postmark target transport
  - Stripe Managed Payments
  - Firebase
external_dependencies:
  - Astro
  - Vercel
  - Clerk
  - Convex
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
  - shipglows_data/workflow/specs/unified-identity-email-consent-and-delivery.md
supersedes:
  - ARCHITECTURE.md
next_review: '2026-09-11'
next_step: 'Implement phase 1 of the approved identity/email control-plane contract, then capture hosted Stripe, Convex and app-refresh proof before production readiness.'
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
- `commandglows_site/src/pages/api/checkout/start.ts`
- `commandglows_site/src/pages/api/commerce/checkout.ts`
- `commandglows_site/src/pages/api/commerce/webhooks/stripe.ts`
- `commandglows_site/src/pages/api/bridge/firebase.ts`
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

- Clerk-authenticated purchase initiation for public and Formation surfaces
- newsletter subscribe and unsubscribe
- Clerk webhook intake
- roadmap voting and suggestion intake
- suite bridge endpoints:
  - `POST /api/bridge/firebase` maps Firebase users to suite identities, mirrors `commandglows_app` access into Firestore, and issues a short-lived HMAC-signed checkout identity handoff when configured.
  - `POST /api/bridge/sync` refreshes the Firestore access mirror by `globalUserId`.
  - `POST /api/bridge/entitlement` verifies a Clerk session token server-side and returns a fail-closed ReplayGlowz entitlement snapshot for `product_id=replayglowz`; old YouTube-product ids are no longer accepted, and a recognized installation can receive only the shared bounded trial policy.
- commerce endpoints:
  - `POST /api/checkout/start` authenticates Clerk-backed public or Formation purchases, keeps the product-bound handoff server-side, and redirects directly to Stripe.
  - `POST /api/commerce/checkout` accepts Stripe only; every offer requires a valid signed product/environment handoff in the request body and an environment-backed Price ID before creating a Stripe Managed Payments Checkout Session. Browser-visible GET handoffs are rejected.
  - `POST /api/commerce/webhooks/stripe` verifies the exact raw body and `Stripe-Signature`, then maps paid Checkout, successful full refund, and dispute events to the generic Convex commerce processor.

Flutter route authorization is fail-closed: direct product routes require a
remote authenticated session and an active CommandGlows entitlement from the
suite bridge. Local authentication fallback and local data stores do not grant
access. Trial snapshots include the server-owned attempt number, restart count
remaining, and restart eligibility used by the purchase/restart gate.

Every registered suite product is governed by the same reusable Convex policy:
one initial 30-day cycle, two user-triggered 30-day restarts, then paid access
only. Identity synchronization creates no entitlement; historical
`product_default` rows remain stored but are non-granting. CommunityGlows,
All eight registered suite products can reach the same product-scoped trial
writer through `bridge:ensureSuiteProductTrialByGlobalUserId`; dedicated
CommandGlows, CommunityGlows, ReplayGlowz and Temu adapters remain thin wrappers.
Formation access accepts only active paid or non-expired trial entitlements.

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

### Target email control plane (approved, not implemented)

The approved `unified-identity-email-consent-and-delivery` contract extends the
existing Convex identity and entitlement spine rather than creating an
independent marketing identity store. CommandGlows will own email addresses,
consent evidence, audience membership, suppressions and delivery events.
Anonymous email contacts may exist before a `globalUserId` is known and may be
linked later only through verified identity reconciliation.

Consent, audience membership, suppression and entitlement remain separate
domains. Account creation, purchase or entitlement never implies marketing
consent; a marketing unsubscribe never revokes product access. Product-facing
email APIs will be versioned and server-authenticated, with business-scoped
authorization and idempotency.

Postmark is the approved target transport: one Server per business and distinct
Transactional and Broadcast Message Streams. Provider contact state is not
canonical and the application will depend on a provider-neutral transport
adapter. Existing Resend newsletter and waitlist integrations remain the
runtime truth until their corresponding migration phases have implementation,
parity, rollback and hosted-delivery proof.

## Invariants

- English routes remain unprefixed while French routes stay under `/fr`.
- Checkout initiation and webhook entitlement updates remain coordinated between Astro routes and Convex.
- Typed content collections continue to define valid docs, blog, product, and service content.
- API routes should stay thin; durable business state belongs in Convex or provider systems.
- Checkout redirects never grant access. Only signed, idempotent provider events may change paid entitlement state.
- Raw client-supplied global user IDs are never trusted for any suite checkout identity.
- Convex classifies every non-Stripe commerce event as non-granting `pending_review`.
- Email, consent and entitlement belong to one CommandGlows control plane but
  remain distinct records and authorization decisions.
- A provider delivery state never creates marketing consent or product access.

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
