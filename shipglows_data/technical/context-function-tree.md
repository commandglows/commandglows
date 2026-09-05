---
artifact: documentation
metadata_schema_version: "1.0"
artifact_version: "1.4.0"
project: commandglows
created: "2026-05-17"
updated: "2026-09-05"
status: reviewed
source_skill: sg-docs
scope: context-function-tree
owner: "Diane"
confidence: high
risk_level: medium
security_impact: yes
docs_impact: yes
linked_systems:
  - src/middleware
  - src/utils/routing.ts
  - src/pages/api
  - convex/http.ts
depends_on:
  - shipglows_data/technical/context.md
  - shipglows_data/technical/architecture.md
supersedes:
  - CONTEXT-FUNCTION-TREE.md
evidence:
  - src/middleware/index.ts
  - src/middleware/i18n.ts
  - src/utils/routing.ts
  - src/pages/api/checkout/start.ts
  - src/pages/api/newsletter/subscribe.ts
  - convex/http.ts
  - convex/users.ts
  - commandglows_site/src/pages/api/commerce/checkout.ts
  - commandglows_site/src/pages/api/commerce/webhooks/stripe.ts
  - commandglows_site/src/lib/commerce/providers/stripe.ts
next_review: "2026-09-11"
next_step: "Refresh after hosted commerce proof or request-pipeline changes."
---
# Context Function Tree

## Purpose

Capture the request, routing, and integration flow so behavior changes in middleware, checkout, or webhooks can be traced quickly.

## Owned Files

- `commandglows_site/src/middleware/index.ts`
- `commandglows_site/src/middleware/i18n.ts`
- `commandglows_site/src/utils/routing.ts`
- `commandglows_site/src/pages/api/**`
- `commandglows_site/convex/http.ts`

## Entrypoints

- `commandglows_site/src/middleware/index.ts`
- `commandglows_site/src/middleware/i18n.ts`
- `commandglows_site/src/utils/routing.ts`
- `commandglows_site/src/pages/api/checkout/start.ts`
- `commandglows_site/convex/http.ts`

## Request And Middleware Layer

- `src/middleware/index.ts`
  - sequences `clerkMiddleware()`
  - branches `/api/*` requests to `corsMiddleware`
  - branches non-API requests to `i18nMiddleware`

- `src/middleware/i18n.ts`
  - detects locale from pathname
  - assigns `locals.lang`
  - validates translated route usage
  - redirects between English and French route variants when needed

## Routing Utilities

- `src/utils/routing.ts`
  - `ROUTES`
  - `generateStaticPaths(routeKey)`
  - `getLocalizedPath(lang, routeKey)`

## Checkout And Billing Flow

- `commandglows_app` obtains a short-lived checkout identity handoff from the authenticated Firebase bridge and sends it only in a POST body to the shared checkout route.
- `src/pages/[...lang]/commandglows-founder.astro` contains no checkout identity token; its offer buttons POST through the authenticated server start route.
- `src/pages/api/checkout/start.ts`
  - authenticates Clerk-backed public and Formation purchase surfaces;
  - resolves the canonical suite identity and issues a product/environment-bound handoff.
- `src/pages/api/commerce/checkout.ts`
  - verifies the handoff, atomically claims its keyed `jti` hash in Convex, and derives the canonical global user id;
  - reuses the same Stripe idempotency key and Checkout Session on safe retries;
  - resolves an allowlisted suite offer and its environment-backed Stripe Price ID;
  - creates a Stripe Checkout Session with Managed Payments explicitly enabled;
  - never treats the success redirect as payment proof.
- `src/pages/api/commerce/webhooks/stripe.ts`
  - verifies the exact raw body with `Stripe-Signature`;
  - normalizes paid Checkout, successful full refunds and disputes;
  - forwards deterministic idempotency keys to `bridge:processCommerceEvent`.
- `convex/bridge.ts`
  - grants paid access only for a verified, resolvable global user;
  - rejects replay through the provider event idempotency key;
  - makes refund and revoke transitions non-granting.

## Central Email Pilot

- `src/pages/api/v1/email/**` authenticates product, preferences, operator and worker commands; controllers delegate persistent decisions to `convex/email.ts`.
- `convex/email.ts` owns consent, tokens, scoped membership, outbox eligibility, attempts, callback reconciliation and erasure tombstones; `emailSchema.ts` adds tables without modifying identity/entitlement meaning.
- `convex/crons.ts` and `emailDelivery.ts` poll activated outboxes through the configured server worker; missing configuration disables polling.
- `src/lib/email/central/**` owns bounded HTTP parsing, signed preference links, FR/EN text/HTML rendering, Postmark mode/stream verification and safe transport outcomes.
- `shipglows_data/technical/central-email-operations.md` records actual configuration, proof and production gates. Legacy `api/newsletter/*` Resend routes remain unchanged.

## Auth Lifecycle (existing)

- `src/pages/api/clerk/webhook.ts`
  - receives Clerk lifecycle events
  - forwards or synchronizes user updates with backend state

- `convex/http.ts`
  - exposes `POST /clerk/events`

## Invariants

- Route translation logic in `src/utils/routing.ts`, `src/i18n/config.ts`, and `src/middleware/i18n.ts` must stay aligned.
- Checkout flow depends on both Astro route behavior and Convex entitlement handling.
- Webhook verification remains a security boundary and must not be bypassed.
- Every suite checkout identity must come from a valid product-bound bridge-signed handoff, never a raw query parameter.
- Stripe is the only active provider; non-Stripe events never grant access.

## Validation

```bash
pnpm -C commandglows_site build:check
python3 /home/claude/shipglows/tools/shipglows_metadata_lint.py shipglows_data/technical/context-function-tree.md
```

## Reader Checklist

- Read this doc before changing middleware, redirects, checkout, or webhook behavior.
- Verify any route rename against bilingual slug definitions.
- Verify any webhook or entitlement change against `convex/http.ts` and downstream mutations.

## Maintenance Rule

Update this doc when the request pipeline or integration flow changes materially.
