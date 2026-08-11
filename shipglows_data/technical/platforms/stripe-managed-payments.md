---
artifact: technical_module_context
metadata_schema_version: "1.0"
artifact_version: "0.3.0"
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
depends_on:
  - artifact: "/home/claude/shipglows/shipglows_data/technical/external-platforms/stripe-managed-payments.md"
    artifact_version: "1.0.0"
    required_status: active
supersedes: []
evidence:
  - "Operator decision on 2026-08-11: CommandGlows uses Stripe Managed Payments as Merchant of Record."
  - "The project has no users or paid Lemon Squeezy orders requiring migration."
  - "Lemon Squeezy remains implemented only for CommunityGlows; it is not eligible for CommandGlows offers."
  - "Local implementation on 2026-08-11: all four CommandGlows offers use provider `stripe`; Checkout Sessions set `managed_payments.enabled=true`; signed paid/refund/dispute events feed `bridge:processCommerceEvent`."
  - "Local verification on 2026-08-11: 131 Vitest tests pass, Flutter analyze/tests pass, and Astro check reports zero errors; hosted Stripe and Convex proof remains outstanding."
next_review: "2026-09-11"
next_step: "Configure Stripe test-mode Product/Price and webhook values, then capture hosted checkout, replay, refund/dispute, Convex, and app-refresh proof before launch."
---

# Stripe Managed Payments Usage

## Decision

CommandGlows targets Stripe Managed Payments for direct digital-product sales.
Ordinary Stripe Payments is not an acceptable substitute because CommandGlows
requires Stripe to act as Merchant of Record.

Convex remains the canonical entitlement ledger. Stripe events are normalized
into the existing provider-agnostic commerce transition contract; checkout
returns never grant access directly.

## Migration State

- Current CommandGlows adapter: Stripe Managed Payments, implemented and locally verified but not provider-proven.
- Separate adapter: Lemon Squeezy remains active only for CommunityGlows and as historical migration-test evidence for CommandGlows.
- Customer migration: none; there are no users or paid orders to preserve.
- Reuse allowed: internal offer IDs, product IDs, plan IDs, source-independent entitlement transitions and idempotency principles.
- Reuse forbidden: Lemon Squeezy product/variant IDs, API fields, signatures, event names and customer/order identifiers.

## Required Configuration Contract

Use server-only `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, plus one
allowlisted Price ID for each CommandGlows offer. `STRIPE_API_VERSION` is an
optional override; otherwise the installed Stripe SDK default is used. Keep
values out of documentation. Every Checkout Session explicitly enables Managed
Payments.

The canonical provider id stored in the commerce ledger is `stripe`. Metadata
also carries `managed_payments=true`, which distinguishes this Merchant of
Record flow from any future ordinary Stripe integration.

CommandGlows checkout also requires a short-lived HMAC-signed identity handoff
issued by the authenticated Firebase bridge. The public page forwards that
opaque token, the server verifies it and derives `global_user_id`, and the token
itself is never copied into Stripe metadata. Missing, expired or modified
handoffs fail closed.

## Owned Files

- `commandglows_site/src/lib/commerce/providers/stripe.ts`
- `commandglows_site/src/lib/commerce/checkoutIdentity.ts`
- `commandglows_site/src/pages/api/commerce/checkout.ts`
- `commandglows_site/src/pages/api/commerce/webhooks/stripe.ts`
- `commandglows_site/src/pages/api/bridge/firebase.ts`
- `commandglows_site/convex/bridge.ts`

## Entrypoints

- Authenticated app handoff: `POST /api/bridge/firebase`
- Public hosted checkout creation: `POST /api/commerce/checkout`
- Signed provider events: `POST /api/commerce/webhooks/stripe`

## Event Contract

- `checkout.session.completed` with `payment_status=paid` becomes a normalized paid event.
- `charge.refunded` becomes a normalized refunded event.
- `charge.dispute.created` becomes a normalized disputed event.
- Unsupported or incomplete events never grant access.
- Convex owns idempotency and the final entitlement transition.

## Invariants

- Every CommandGlows Checkout Session explicitly enables Managed Payments.
- Checkout success redirects never grant access.
- The server derives user identity from a valid signed handoff; raw client-provided user IDs are rejected.
- Stripe identifiers are provider references, not canonical product or user identities.
- Refunds and disputes move access to a non-granting state.
- Secret keys, webhook secrets, and raw handoff contents remain server-side.

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
