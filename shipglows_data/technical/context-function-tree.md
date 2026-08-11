---
artifact: documentation
metadata_schema_version: "1.0"
artifact_version: "1.1.0"
project: commandglows
created: "2026-05-17"
updated: "2026-08-11"
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
  - src/pages/api/polar/checkout.ts
  - src/pages/api/newsletter/subscribe.ts
  - convex/http.ts
  - convex/polar.ts
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
- `commandglows_site/src/pages/api/polar/checkout.ts`
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

- `commandglows_app` obtains a short-lived checkout identity handoff from the authenticated Firebase bridge and opens the Founder page with that opaque token.
- `src/pages/[...lang]/commandglows-founder.astro` forwards the handoff to the shared checkout route without exposing it to Stripe metadata.
- `src/pages/api/commerce/checkout.ts`
  - verifies the handoff and derives the canonical global user id;
  - resolves one of the four allowlisted CommandGlows offers;
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

- `src/pages/api/polar/checkout.ts`
  - validates lesson and locale input
  - redirects unauthenticated users to localized sign-in
  - validates Polar and Convex environment state
  - queries Convex user state
  - creates Polar checkout and redirects to hosted checkout URL

- `src/pages/api/polar/webhook.ts`
  - proxies raw webhook payload and signature headers to Convex HTTP webhook endpoint

- `convex/http.ts`
  - exposes `POST /polar/events`
  - verifies webhook secret state and signatures
  - routes supported event types to internal mutations

## Auth Lifecycle

- `src/pages/api/clerk/webhook.ts`
  - receives Clerk lifecycle events
  - forwards or synchronizes user updates with backend state

- `convex/http.ts`
  - exposes `POST /clerk/events`

## Invariants

- Route translation logic in `src/utils/routing.ts`, `src/i18n/config.ts`, and `src/middleware/i18n.ts` must stay aligned.
- Checkout flow depends on both Astro route behavior and Convex entitlement handling.
- Webhook verification remains a security boundary and must not be bypassed.
- CommandGlows checkout identity must come from a valid bridge-signed handoff, never a raw query parameter.

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
