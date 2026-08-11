---
artifact: technical_module_context
metadata_schema_version: "1.0"
artifact_version: "1.2.0"
project: CommandGlows
created: "2026-08-11"
updated: "2026-08-11"
status: draft
source_skill: sg-docs
scope: stripe-managed-payments-usage
owner: Diane
confidence: high
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - commandglows_site/src/lib/commerce
  - commandglows_site/src/pages/api/commerce
  - commandglows_site/convex/bridge.ts
  - shipglows_data/technical/payment-activation-entitlements.md
  - /home/claude/communityglows
depends_on:
  - artifact: "/home/claude/shipglows/shipglows_data/technical/external-platforms/stripe-managed-payments.md"
    artifact_version: "1.0.0"
    required_status: active
supersedes: []
evidence:
  - "Operator decision on 2026-08-11: CommandGlows uses Stripe Managed Payments as Merchant of Record."
  - "The project has no users or paid Lemon Squeezy orders requiring migration."
  - "Historical interim state: Lemon Squeezy was implemented only for CommunityGlows; that exception is superseded."
  - "Local implementation on 2026-08-11: all four CommandGlows offers use provider `stripe`; Checkout Sessions set `managed_payments.enabled=true`; signed paid/refund/dispute events feed `bridge:processCommerceEvent`."
  - "Local verification on 2026-08-11: 131 Vitest tests pass, Flutter analyze/tests pass, and Astro check reports zero errors; hosted Stripe and Convex proof remains outstanding."
  - "Operator decision later on 2026-08-11: Stripe Managed Payments becomes the only provider for every current and future suite product, including CommunityGlows; Lemon Squeezy and Polar are superseded."
  - "Local batch B on 2026-08-11: CommunityGlows and Formation offers use Stripe Price-ID placeholders; active Lemon Squeezy and Polar adapters/routes/webhooks/tests/dependency were removed; all checkout offers require product/environment-bound signed identity handoff; Convex rejects non-Stripe providers."
next_review: "2026-09-11"
next_step: "Configure Stripe test-mode Product/Price and webhook values, then capture hosted checkout, replay, refund/dispute, Convex, and app-refresh proof before launch."
---

# Stripe Managed Payments Usage

## Decision

The suite targets Stripe Managed Payments for all direct digital-product sales.
Ordinary Stripe Payments is not an acceptable substitute because CommandGlows
requires Stripe to act as Merchant of Record.

Convex remains the canonical entitlement ledger. Stripe events are normalized
into the existing provider-agnostic commerce transition contract; checkout
returns never grant access directly.

## Migration State

- Current CommandGlows adapter: Stripe Managed Payments, implemented and locally verified but not provider-proven.
- CommunityGlows, CommandGlows App and CommandGlows Formation use the same
  central Stripe adapter; no product-local Stripe secret or webhook exists.
- Lemon Squeezy and Polar: superseded historical migration-test evidence only,
  never granting providers.
- Customer migration: none; there are no users or paid orders to preserve.
- Reuse allowed: internal offer IDs, product IDs, plan IDs, source-independent entitlement transitions and idempotency principles.
- Reuse forbidden: Lemon Squeezy product/variant IDs, API fields, signatures, event names and customer/order identifiers.

## Required Configuration Contract

Use server-only `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, plus one
allowlisted Price ID for each suite offer. `STRIPE_API_VERSION` is an
optional override; otherwise the installed Stripe SDK default is used. Keep
values out of documentation. Every Checkout Session explicitly enables Managed
Payments.

The canonical provider id stored in the commerce ledger is `stripe`. Metadata
also carries `managed_payments=true`, which distinguishes this Merchant of
Record flow from any future ordinary Stripe integration.

Every suite checkout also requires a short-lived HMAC-signed identity handoff
bound to the product and runtime environment. Firebase and CommunityGlows
bridges issue product-client handoffs; Clerk-backed public and Formation flows
use `/api/checkout/start`. The checkout server derives `global_user_id`, and
the token itself is never copied into Stripe metadata. Missing, expired,
modified, cross-product or cross-environment handoffs fail closed.

## Owned Files

- `commandglows_site/src/lib/commerce/providers/stripe.ts`
- `commandglows_site/src/lib/commerce/checkoutIdentity.ts`
- `commandglows_site/src/pages/api/commerce/checkout.ts`
- `commandglows_site/src/pages/api/checkout/start.ts`
- `commandglows_site/src/pages/api/commerce/webhooks/stripe.ts`
- `commandglows_site/src/pages/api/bridge/firebase.ts`
- `commandglows_site/convex/bridge.ts`

## Entrypoints

- Authenticated app handoff: `POST /api/bridge/firebase`
- Authenticated CommunityGlows handoff: `POST /api/bridge/communityglows`
- Clerk-backed public/Formation start: `POST /api/checkout/start`
- Public hosted checkout creation: `POST /api/commerce/checkout`
- Signed provider events: `POST /api/commerce/webhooks/stripe`

## Event Contract

- `checkout.session.completed` with `payment_status=paid` becomes a normalized paid event.
- `charge.refunded` becomes a normalized refunded event.
- `charge.dispute.created` becomes a normalized disputed event.
- Unsupported or incomplete events never grant access.
- Convex owns idempotency and the final entitlement transition.

## Invariants

- Every suite Checkout Session explicitly enables Managed Payments.
- Checkout success redirects never grant access.
- The server derives user identity from a valid signed handoff; raw client-provided user IDs are rejected.
- Stripe identifiers are provider references, not canonical product or user identities.
- Refunds and disputes move access to a non-granting state.
- Secret keys, webhook secrets, and raw handoff contents remain server-side or
  in encrypted POST transport; handoffs never appear in browser query URLs,
  page markup, Stripe metadata, or logs.
- Every signed handoff has a cryptographically random ten-minute `jti`. Convex
  claims only its keyed hash once and supplies the stable Stripe idempotency key,
  so retries resolve one Checkout Session instead of creating independent ones.
- The active provider allowlist is exactly `stripe`; non-Stripe events are
  rejected or non-granting `pending_review`.
- Every offer Price ID comes from server environment configuration; no runtime
  or documentation layer invents a price amount.

## Proof Before Launch

Complete a test-mode Managed Payments checkout, receive and verify the signed
completion event, grant the matching Convex entitlement once, reject replay,
process refund/revoke into a non-granting state, refresh the app snapshot, and
confirm the success redirect alone never unlocks access.

## Validation

Local proof completed on 2026-08-11:

- 131 CommandGlows site tests passed.
- Flutter analysis and 309 app tests passed.
- Astro validation completed with zero errors.

Hosted test-mode checkout, webhook replay, refund/dispute, Convex persistence,
and app-refresh proof remain required before launch.

## Reader Checklist

- Offer or Price mapping changed -> update `.env.example`, tests, and this note.
- Checkout or webhook code changed -> rerun commerce tests and verify the event contract.
- Identity bridge changed -> verify expiration, signature, audience, and replay boundaries.
- Hosted proof completed -> attach redacted evidence and update this note plus the entitlement spec.

## Maintenance Rule

Update this note when offer mappings, API version, routes, webhook events,
refund behavior, provider eligibility, pricing, or hosted proof status changes.
