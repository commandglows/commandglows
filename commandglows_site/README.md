---
artifact: documentation
metadata_schema_version: '1.0'
artifact_version: '1.0.0'
project: commandglows
created: '2026-04-25'
updated: '2026-05-17'
status: reviewed
source_skill: sf-docs
scope: readme
owner: 'Diane'
confidence: medium
risk_level: medium
security_impact: yes
docs_impact: yes
linked_systems: []
depends_on: []
supersedes: []
evidence:
  - package.json
  - ../shipglows_data/
next_step: /sf-docs update
---

# CommandGlows

CommandGlows is a Windows-first productivity project centered on `Windows Mastery`, with bilingual content, gated learning surfaces, and companion product pages.

Production: https://www.commandglows.com

## What This Subproject Contains

- Astro site with `en` and `fr` routes
- content collections for blog, docs, and products
- flagship route family around `Windows Mastery`
- account, checkout, and newsletter API surfaces under `src/pages/api/*`
- supporting Convex workspace for backend logic

## Quick Start

Requirements:

- Node.js 22.12+
- pnpm

Install and run:

```bash
pnpm install
pnpm dev
```

The local dev server runs on `http://localhost:3011`.

## Tech Stack

- Astro 6
- Astro Starlight
- Tailwind CSS 3
- React islands
- Clerk
- Polar.sh
- Convex
- Resend
- Vercel
- Vitest
- Playwright

## Project Structure

```text
commandglows_site/
├── src/
│   ├── assets/             # Global styles, scripts, and images
│   ├── components/         # Astro and React UI components
│   ├── content/            # Blog posts, docs, products, and services content
│   ├── i18n/               # Translation dictionaries and route labels
│   ├── layouts/            # Shared Astro layouts
│   ├── lib/                # Shared clients and helpers
│   ├── middleware/         # i18n, CORS, and rate limiting
│   ├── pages/              # Marketing pages, dashboard routes, and API routes
│   ├── types/              # Shared TypeScript types
│   └── utils/              # Routing, docs, UI, and course access helpers
├── convex/                 # Convex HTTP handlers, schema, and functions
├── docs/                   # Supplementary design and CSS docs
├── public/                 # Static assets
├── scripts/                # Project scripts, including Polar product setup
└── tests/                  # Vitest setup and mocks
```

## Main Routes

- `/` and `/fr` — localized homepages
- `/landing` and `/fr/landing` — landing surfaces
- `/windows-mastery` and `/fr/maitrise-windows` — flagship offer surfaces
- `/products` and `/fr/produits` — product catalog routes
- `/dashboard/*` — authenticated surfaces
- `/api/newsletter/*` — newsletter subscribe and unsubscribe
- `/api/polar/*` — checkout/webhook surfaces
- `/api/commerce/*` — provider-agnostic checkout/webhook surfaces
- `/api/commerce/webhooks/lemon-squeezy` — Lemon Squeezy webhook for normalized LTD commerce events
- `/api/bridge/firebase` — Firebase ID token bridge to suite identity snapshot
- `/api/bridge/sync` — internal entitlement mirror sync by `globalUserId` + shared secret
- `/api/bridge/socialglowz` — SocialGlowz server-to-server entitlement snapshot and activation-code redemption bridge

## Environment Variables

Copy `.env.example` to `.env` and fill the values required by your environment.

### App and public config

- `SITE`
- `PUBLIC_SITE_URL`
- `PUBLIC_CONVEX_URL`
- `SUITE_API_ALLOWED_ORIGINS` (comma-separated browser origins allowed to call API routes, including the CommandGlows app web origin)
- `PORT`

### Firebase Admin bridge

For `POST /api/bridge/firebase`, the backend verifies Firebase ID tokens with Firebase Admin SDK using revocation checks (`checkRevoked=true`) and fails closed when config is missing.

- `FIREBASE_SERVICE_ACCOUNT_JSON` (recommended single env var, no secrets in repo)
- `FIREBASE_PROJECT_ID` (fallback split config)
- `FIREBASE_CLIENT_EMAIL` (fallback split config)
- `FIREBASE_PRIVATE_KEY` (fallback split config, keep escaped newlines)
- `SUITE_BRIDGE_CONVEX_SECRET` (shared secret required by the Convex bridge mutation)
- `SUITE_BRIDGE_SYNC_SECRET` (optional override; defaults to `SUITE_BRIDGE_CONVEX_SECRET`)

`POST /api/bridge/sync` accepts only:

- header `x-suite-bridge-secret` with the shared secret;
- JSON body `{ "globalUserId": "..." }`.

It recomputes entitlements from Convex (`productEntitlements` source of truth), discovers linked Firebase identity accounts, and writes server-owned Firestore `suiteAccess/{firebaseUid}` documents.

The bridge also writes a server-owned Firestore mirror at `suiteAccess/{firebaseUid}` after Convex entitlement lookup. CommandGlows app Firestore rules use that mirror to allow or deny `commandglows_app` data under `users/{uid}`.

`POST /api/bridge/entitlement` verifies ReplayGlowz Clerk sessions server-side. A recognized Clerk account without active ReplayGlowz access receives a persisted `replayglowz/free` default entitlement for that product only; this does not unlock other CommandGlows suite products.

`POST /api/bridge/socialglowz` accepts:

- header `x-socialglowz-suite-secret` with a dedicated shared secret;
- JSON body with `operation` (`snapshot`, `redeem_code`, or `commerce`), plus
  operation-specific fields:
  - `snapshot` and `redeem_code` require `providerAccountId`,
  - `commerce` requires provider/offer/product/plan/event and identity context (`provider`, `offerId`, `productId`, `plan`, `eventType`, `environment`, `providerEventId`, `providerOrderId`, `idempotencyKey`, `status`).

The route calls suite Convex bridge mutations for `socialglowz` entitlement snapshot, activation-code redemption, and commerce fulfillment without merging identities by email alone.

- `SOCIALGLOWZ_SUITE_BRIDGE_SECRET` (preferred dedicated secret)
- `SUITE_SOCIALGLOWZ_BRIDGE_SECRET` (legacy/alternate key accepted as fallback)

### Clerk

- `PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`

### Polar

- `POLAR_ACCESS_TOKEN`
- `POLAR_PRODUCT_ID`
- `POLAR_COMMANDGLOWS_PRODUCT_ID`
- `POLAR_WEBHOOK_SECRET`
- `POLAR_SERVER`
- `SUITE_BRIDGE_SYNC_URL` (used by Convex Polar webhook handling to call `/api/bridge/sync`)

### Lemon Squeezy (direct LTD checkout)

- `LEMONSQUEEZY_API_KEY`
- `LEMONSQUEEZY_API_URL` (default: `https://api.lemonsqueezy.com`)
- `LEMONSQUEEZY_STORE_ID`
- `LEMONSQUEEZY_SOCIALGLOWZ_PRODUCT_ID`
- `LEMONSQUEEZY_SOCIALGLOWZ_LIFETIME_DEAL_VARIANT_ID`
- `LEMONSQUEEZY_COMMANDGLOWS_APP_PRODUCT_ID`
- `LEMONSQUEEZY_COMMANDGLOWS_APP_STARTER_FOUNDER_VARIANT_ID`
- `LEMONSQUEEZY_COMMANDGLOWS_APP_PRO_FOUNDER_VARIANT_ID`
- `LEMONSQUEEZY_COMMANDGLOWS_APP_STUDIO_FOUNDER_VARIANT_ID`
- `LEMONSQUEEZY_WEBHOOK_SECRET`
- `COMMERCE_PROVIDER_ORDER` (optional provider preference, e.g. `lemonsqueezy,polar`)

The direct checkout adapter creates hosted Lemon Squeezy checkouts with `product_options.redirect_url` and `checkout_data.custom`. Webhook fulfillment reads the signed raw body, verifies `X-Signature`, uses `X-Event-Name`, and maps Lemon Squeezy `meta.custom_data` back to the suite entitlement ledger through `bridge:processCommerceEvent`. Lemon Squeezy owns payment receipts and checkout emails; app access is granted or marked `pending_review` only from the signed webhook path, never from the success redirect alone.

### Resend

- `RESEND_API_KEY`
- `RESEND_AUDIENCE_ID`

## Scripts

Use `pnpm run` to list all scripts in your local checkout.

Common commands:

- `pnpm dev`
- `pnpm build`
- `pnpm preview`

## Documentation

- [CLAUDE.md](./CLAUDE.md) — agent workflow and context rules
- [AGENT.md](./AGENT.md) — short repo execution contract
- [shipglows_data/business/business.md](../shipglows_data/business/business.md) — business contract centered on `Windows Mastery`
- [shipglows_data/business/branding.md](../shipglows_data/business/branding.md) — brand voice and claim policy
- [shipglows_data/business/product.md](../shipglows_data/business/product.md) — product scope and user journey
- [shipglows_data/business/gtm.md](../shipglows_data/business/gtm.md) — go-to-market structure
- [shipglows_data/editorial/content-map.md](../shipglows_data/editorial/content-map.md) — content routing map
- [shipglows_data/technical/guidelines.md](../shipglows_data/technical/guidelines.md) — project-specific engineering guidelines
- [shipglows_data/technical/architecture.md](../shipglows_data/technical/architecture.md) — system boundaries and integrations
- [shipglows_data/technical/context.md](../shipglows_data/technical/context.md) — repository context map
- [docs/DESIGN_SPECIFICATION.md](./docs/DESIGN_SPECIFICATION.md) — design system notes
- [docs/COMPONENT_CLASSES.md](./docs/COMPONENT_CLASSES.md) — reusable CSS class reference

## Deployment

The project is configured for Vercel server output through `@astrojs/vercel`. In the monorepo, configure the Vercel project Root Directory as `commandglows_site`.

Typical production flow:

```bash
pnpm build
```

## Contributing

1. Install dependencies with `pnpm install`.
2. Create `.env` from `.env.example`.
3. Keep docs and localized routes aligned when changing offer or conversion pages.
4. Keep claims in product and marketing docs aligned with observable implementation.
