---
artifact: documentation
metadata_schema_version: '1.0'
artifact_version: '1.2.0'
project: commandglows
created: '2026-04-25'
updated: '2026-08-11'
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
- Stripe Managed Payments
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
├── scripts/                # Project scripts and local verification helpers
└── tests/                  # Vitest setup and mocks
```

## Main Routes

- `/` and `/fr` — localized homepages
- `/landing` and `/fr/landing` — landing surfaces
- `/windows-mastery` and `/fr/maitrise-windows` — flagship offer surfaces
- `/products` and `/fr/produits` — product catalog routes
- `/dashboard/*` — authenticated surfaces
- `/api/newsletter/*` — newsletter subscribe and unsubscribe
- `/api/checkout/start` — Clerk-authenticated purchase start for public and Formation surfaces
- `/api/commerce/checkout` — signed-handoff Stripe Managed Payments checkout
- `/api/commerce/webhooks/stripe` — central suite purchase, refund, and dispute webhook
- `/api/bridge/firebase` — Firebase ID token bridge to suite identity snapshot
- `/api/bridge/sync` — internal entitlement mirror sync by `globalUserId` + shared secret
- `/api/bridge/communityglows` — CommunityGlows server-to-server entitlement, account-retention, and activation-code bridge

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
- `SUITE_TRIAL_SIGNAL_SECRET` (server-only HMAC secret for trial installation and network-abuse signals; it must be configured before Firebase bridge trial access is available)

`POST /api/bridge/sync` accepts only:

- header `x-suite-bridge-secret` with the shared secret;
- JSON body `{ "globalUserId": "..." }`.

It recomputes entitlements from Convex (`productEntitlements` source of truth), discovers linked Firebase identity accounts, and writes server-owned Firestore `suiteAccess/{firebaseUid}` documents.

The bridge also writes a server-owned Firestore mirror at `suiteAccess/{firebaseUid}` after Convex entitlement lookup. CommandGlows app Firestore rules use that mirror to allow or deny `commandglows_app` data under `users/{uid}`.

### ContentGlows Auth0 bridge

`POST /api/bridge/contentglows` requires both a valid Auth0 access token and the
server-only `x-contentglows-bridge-secret`. It revalidates RS256 signature,
issuer, audience, expiry, and subject before linking provider `auth0` to a
provider-neutral `globalUserId`. E-mail is metadata only and never merges
identities. Configure `CONTENTGLOWS_AUTH0_DOMAIN`,
`CONTENTGLOWS_AUTH0_AUDIENCE`, `CONTENTGLOWS_AUTH0_ENTITLEMENT_BRIDGE_SECRET`, and
`SUITE_BRIDGE_CONVEX_SECRET` on the server. Set `SUITE_BRIDGE_ENVIRONMENT` to
the same environment as the entitlement ledger; ContentGlows access is filtered
to that exact environment.

`POST /api/bridge/entitlement` verifies ReplayGlowz Clerk sessions server-side and fails closed without an active paid entitlement or valid shared-policy trial. A recognized installation may receive one 30-day cycle and request at most two restarts; legacy free grants never unlock ReplayGlowz.

`POST /api/bridge/communityglows` accepts:

- header `x-communityglows-suite-secret` with a dedicated shared secret;
- JSON body with `operation` (`snapshot`, `restart_trial`, `redeem_code`, `manual_grant`, `revoke`, `refund`, `upsert_code`, `disable_code`, `prepare_account_deletion`, or `relink_account`), plus
  operation-specific fields:
  - `snapshot`, `restart_trial`, and `redeem_code` require `providerAccountId`,
  - `prepare_account_deletion` and `relink_account` require the server-verified email and `providerAccountId`; retention lookup fields are stored only as keyed email/provider digests,
  - trial operations accept product-scoped pseudonymized `installationHash` and short-lived `networkHash` signals; `restart_trial` is accepted only after expiry and before the third cycle is exhausted.

The route calls suite Convex bridge mutations for `communityglows` entitlement snapshots and activation-code redemption without merging identities by email alone. Successful snapshots may include a short-lived, product-bound checkout handoff; payment events enter only through the central Stripe webhook.

Account deletion preparation removes plaintext CommunityGlows identity fields and tombstones the former provider identifier while retaining only the commercial entitlement and trial history needed for legal proof, abuse prevention, and same-email recovery. Relinking requires the same verified-email digest, never restores deleted product data, and never changes refunded or revoked entitlement status.

- `COMMUNITYGLOWS_SUITE_BRIDGE_SECRET` (preferred dedicated secret)
- `SUITE_COMMUNITYGLOWS_BRIDGE_SECRET` (legacy/alternate key accepted as fallback)
- `COMMUNITYGLOWS_ACCOUNT_RETENTION_SECRET` (distinct server-only HMAC key for retained email and deleted-provider lookup digests)

### Clerk

- `PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`

### Stripe Managed Payments (suite-wide)

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_API_VERSION` (optional; omit to use the Stripe SDK default)
- `STRIPE_COMMANDGLOWS_APP_FOCUS_PRICE_ID`
- `STRIPE_COMMANDGLOWS_APP_POWER_PRICE_ID`
- `STRIPE_COMMANDGLOWS_APP_CONTROL_PRICE_ID`
- `STRIPE_COMMANDGLOWS_APP_COMMAND_PRICE_ID`
- `STRIPE_COMMUNITYGLOWS_LIFETIME_DEAL_PRICE_ID`
- `STRIPE_COMMANDGLOWS_FORMATION_PRICE_ID`
- `STRIPE_COMMANDGLOWS_FOUNDER_DISCOUNT_CODE` (optional; default: `FOUNDER`)
- `STRIPE_COMMANDGLOWS_FOUNDER_PROMOTION_CODE_ID` (optional Stripe promotion-code ID)
- `SUITE_COMMERCE_CHECKOUT_SECRET` (dedicated HMAC secret shared only by the Firebase bridge and checkout route)

All Checkout Sessions explicitly set `managed_payments.enabled=true`. Every offer requires a short-lived signed handoff bound to its suite product and runtime environment; the checkout route never trusts a raw client-supplied global user ID. Handoffs travel only in POST bodies, carry a random ten-minute `jti`, and are atomically claimed in Convex with a stable Stripe idempotency key so retries cannot create independent sessions. Normalized offer, product, plan, environment, source, and global-user metadata is copied to both the Checkout Session and Payment Intent, but the handoff itself is never copied or logged. Access is granted only by a verified Stripe webhook. Full successful refunds and disputes revoke paid access; partial or pending refunds go to `pending_review`. Lemon Squeezy and Polar have no active runtime route or fallback.

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
