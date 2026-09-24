---
artifact: documentation
metadata_schema_version: "1.0"
artifact_version: "1.1.0"
project: commandglows
created: "2026-04-25"
updated: "2026-08-11"
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
  - "Stripe Managed Payments"
  - "Central email service"
depends_on:
  - "shipglows_data/technical/guidelines.md"
  - "shipglows_data/technical/architecture.md"
supersedes: []
evidence:
  - "package.json"
  - "astro.config.mjs"
  - "src/middleware/index.ts"
  - "src/pages/api/checkout/start.ts"
  - "src/pages/api/commerce/checkout.ts"
  - "convex/http.ts"
next_step: "pnpm build:check"
---
# commandglows

## Repository Execution Contract

This repository is an Astro 6 server application with bilingual routing, Clerk auth, Convex state, Stripe Managed Payments checkout, and central newsletter consent flows with pluggable email delivery.

Use this file as the short operating contract before changing code or docs.

## Stack Snapshot

- Framework: Astro 6 (`output: "server"`)
- Deployment adapter: Vercel (`@astrojs/vercel`)
- Auth: Clerk middleware + webhook forwarding
- Backend/state: Convex (`users`, `apiKeys`, `features`)
- Billing: Stripe-only shared checkout + Convex webhook fulfillment
- Email: central consent and signed preferences routes; transport adapters for delivery
- Content: Astro content collections (`docs`, `products`, `blog`, `services`)

## First Files To Inspect

1. `shipglows_data/technical/guidelines.md`
2. `shipglows_data/technical/architecture.md`
3. `src/middleware/index.ts`
4. `src/middleware/i18n.ts`
5. `src/pages/api/checkout/start.ts` and `src/pages/api/commerce/checkout.ts`
6. `convex/http.ts`

## High-Risk Change Areas

- Locale and route normalization: `src/middleware/i18n.ts`, `src/i18n/config.ts`, `src/utils/routing.ts`
- Checkout and entitlements: `src/pages/api/checkout/start.ts`, `src/pages/api/commerce/checkout.ts`, `src/pages/api/commerce/webhooks/stripe.ts`, `convex/bridge.ts`, `src/utils/courseGating.ts`
- Auth identity sync: `src/pages/api/clerk/webhook.ts`, `convex/http.ts`, `convex/users.ts`
- Newsletter side effects: `src/pages/api/newsletter/subscribe.ts`, `src/pages/api/newsletter/unsubscribe.ts`, routed through the central email registry and Postmark transport
- Content schema contracts: `src/content/config.ts`

## Runtime Assumptions

- English routes are unprefixed and French routes are under `/fr`.
- `PUBLIC_CONVEX_URL` must not be placeholder for Convex-backed logic.
- Stripe checkout requires `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUITE_COMMERCE_CHECKOUT_SECRET`, and the offer-specific `STRIPE_*_PRICE_ID`.
- Newsletter routes require a central email profile with an explicitly mapped business, marketing audience, approved notice version, and a client authorized for `subscribe`. Missing or mismatched mapping fails closed; use mock mutations in tests and never dispatch a real message during local verification.

## Safe Change Pattern

1. Identify the boundary first (routing, auth, checkout, newsletter, content schema).
2. Keep Astro API routes as thin integration controllers.
3. Keep durable state transitions inside Convex mutations/actions.
4. Update docs when changing env contracts, route contracts, or data shape.
