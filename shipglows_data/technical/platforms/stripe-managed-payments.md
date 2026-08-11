---
artifact: technical_module_context
metadata_schema_version: "1.0"
artifact_version: "0.1.0"
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
  - "Current code still contains a Lemon Squeezy adapter and therefore does not yet implement this target provider decision."
next_review: "2026-09-11"
next_step: "Implement and prove the Stripe Managed Payments checkout/webhook/refund adapter before launch."
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

- Current adapter: Lemon Squeezy, implemented locally but not provider-proven.
- Target adapter: Stripe Managed Payments, not yet implemented.
- Customer migration: none; there are no users or paid orders to preserve.
- Reuse allowed: internal offer IDs, product IDs, plan IDs, source-independent entitlement transitions and idempotency principles.
- Reuse forbidden: Lemon Squeezy product/variant IDs, API fields, signatures, event names and customer/order identifiers.

## Required Configuration Contract

Use server-only environment keys for Stripe secret and webhook signing secrets,
plus allowlisted Product/Price IDs for each CommandGlows offer. Keep values out
of documentation. Explicitly enable Managed Payments when creating Checkout
Sessions and use a currently supported Stripe API version.

## Proof Before Launch

Complete a test-mode Managed Payments checkout, receive and verify the signed
completion event, grant the matching Convex entitlement once, reject replay,
process refund/revoke into a non-granting state, refresh the app snapshot, and
confirm the success redirect alone never unlocks access.

## Maintenance Rule

Update this note when offer mappings, API version, routes, webhook events,
refund behavior, provider eligibility, pricing, or hosted proof status changes.
