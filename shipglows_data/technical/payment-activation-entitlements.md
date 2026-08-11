---
artifact: technical_module_context
metadata_schema_version: "1.0"
artifact_version: "0.5.0"
project: "CommandGlows"
created: "2026-06-18"
updated: "2026-08-11"
status: draft
source_skill: "001-sf-build"
scope: "payment-activation-entitlements"
owner: "Diane"
confidence: high
risk_level: high
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "commandglows_site/src/lib/commerce"
  - "commandglows_site/src/pages/api/commerce"
  - "commandglows_site/convex/bridge.ts"
  - "commandglows_site/convex/schema.ts"
  - "commandglows_app/lib/features/auth"
  - "shipglows_data/technical/platforms/lemonsqueezy.md"
  - "shipglows_data/technical/platforms/stripe-managed-payments.md"
depends_on:
  - artifact: "shipglows_data/technical/platforms/lemonsqueezy.md"
    required_status: "draft"
  - artifact: "shipglows_data/technical/platforms/stripe-managed-payments.md"
    required_status: "draft"
  - artifact: "shipglows_data/workflow/specs/commandglows-android-lifetime-deal-launch.md"
    required_status: "draft"
supersedes: []
evidence:
  - "CommandGlows App founder offers use internal offer ids commandglows_app/focus, commandglows_app/power, commandglows_app/control, and commandglows_app/command."
  - "Lemon Squeezy checkout creation sends checkout_data.custom with offer_id, product_id, plan, source, source_ref, and provider metadata."
  - "Lemon Squeezy signed webhooks are normalized and forwarded to Convex bridge:processCommerceEvent."
  - "Convex owns durable productEntitlements and productAccessEvents."
  - "Implementation review 2026-08-11: CommandGlows trial rows are now written by `bridge:upsertFirebaseIdentity`, carry server timestamps and attempts, and are parsed fail-closed by Flutter."
  - "Commercial provider decision of 2026-08-11: CommandGlows targets Stripe Managed Payments as Merchant of Record; the existing Lemon Squeezy adapter is migration source code, not the launch target."
next_review: "2026-07-18"
next_step: "Complete the remaining trial anti-abuse, client journey, automated proof, and hosted provider proof before a production access claim."
---

# Payment Activation And Entitlements

## Commercial Entitlement Decision (2026-08-06)

CommandGlows App uses a `trial_then_paid` access policy rather than permanent
freemium access:

- initial trial: 14 days;
- maximum reactivations: 2 additional periods of 14 days;
- maximum trial allowance: 42 days total;
- after the allowance is exhausted, the user must purchase an allowed plan;
- the 30-day commercial promise is a satisfaction/refund window, not an
  automatic entitlement expiry;
- a verified refund, revoke, or fraud decision makes access non-granting and
  does not reset the trial counter.

The policy is server-owned. A new email address must not recreate eligibility
when the global identity or recognized installation has already consumed the
allowance. IP data may contribute to abuse scoring and rate limiting, but must
not be the sole identity key because shared and changing IPs can represent
legitimate users. Device/install identifiers must be privacy-preserving,
revocable, and stored as hashes or signed installation keys rather than raw
hardware identifiers.

This policy is the reusable suite decision for products explicitly classified
as `trial_then_paid`; it is not an instruction to convert every current suite
product without a product-specific pricing and cost review.

## Merchant Of Record Decision (2026-08-11)

CommandGlows will use Stripe Managed Payments, not ordinary Stripe Payments, as
its target Merchant of Record. Convex remains the runtime entitlement source of
truth and Stripe remains a verified commerce-event source.

The current Lemon Squeezy checkout/webhook implementation is a legacy migration
source and must not be presented as the intended launch provider. Because there
are no users or paid orders to preserve, migration requires no customer or
subscription transfer. Provider identifiers, signatures and event names must
be replaced through a Stripe-specific adapter rather than mechanically reused.

## CommandGlows Implementation Status (2026-08-11)

The first server-authoritative slice is implemented locally for
`commandglows_app`:

- `commandglows_app` no longer receives an automatic permanent-free grant;
- identity synchronization starts the first 14-day trial once, records
  `trialStartedAt`, `trialExpiresAt`, and `trialAttempt`, and exposes them in
  the suite snapshot;
- an expired `trialing` row is non-granting in the Convex and Flutter access
  resolvers; an absent expiry is also non-granting;
- the bridge can create at most three total periods (the initial trial plus
  two restarts), exposes an authenticated customer restart request through the
  Firebase bridge, and retains a server-to-server support operation;
- a current paid CommandGlows entitlement prevents a new trial from being
  created.

This is not yet the complete commercial release contract. Trial creation is
keyed to the suite global identity and a random app-installation identifier.
The app stores that identifier securely; the API persists only a keyed hash.
The same recognized installation cannot start a trial for another identity.
The API also maintains a keyed, 24-hour network risk window and temporarily
denies the fourth trial grant in that window; raw IP values are not persisted.
The Flutter gate now shows an expired trial, allows an eligible restart, and
links to the official purchase page.

Scheduled cleanup/retention automation for expired risk windows, stronger
platform integrity, the Stripe Managed Payments adapter, and hosted Stripe
checkout/payment/refund/revoke proof are
still required before calling the whole access lifecycle production-ready.

The local `convex-test` matrix now covers trial creation/idempotency, the two
allowed reactivations and exhaustion, installation reuse across identities,
identity continuity across installations, paid-entitlement precedence and the
network velocity threshold. It passes as part of the 118-test site suite, but
`convex-test` is a JavaScript mock and does not replace hosted Convex or provider
proof.

## Purpose

This document is the reusable contract for paid access activation in the CommandGlows suite. It explains how a payment becomes product access, what Stripe Managed Payments owns, what Convex owns, and what still needs a separate device-activation ledger. Lemon Squeezy sections describe the currently implemented adapter until migration is complete.

## Vocabulary

- Payment provider: external system that collects money and emits signed events. Target direct-sale provider: Stripe Managed Payments. Current local adapter awaiting replacement: Lemon Squeezy.
- Offer id: internal checkout id such as `commandglows_app/focus`.
- Product id: canonical suite product id such as `commandglows_app`.
- Plan id: internal entitlement plan such as `focus`, `power`, `control`, or `command`.
- Product entitlement: durable server-owned answer to "does this global user have access to this product?"
- Payment activation: turning a verified provider event into an active product entitlement.
- Device activation: registering one physical app installation/device against the active-device limit of a plan.

Payment activation and device activation are related but not the same system.

## Current Direct-Sale Offers

| Public plan | Offer id | Product id | Plan id | Active-device promise |
| --- | --- | --- | --- | --- |
| Focus | `commandglows_app/focus` | `commandglows_app` | `focus` | 1 active device |
| Power | `commandglows_app/power` | `commandglows_app` | `power` | 2 active devices |
| Control | `commandglows_app/control` | `commandglows_app` | `control` | 5 active devices |
| Command | `commandglows_app/command` | `commandglows_app` | `command` | 10 active devices |

The Lifetime Deal grants access to present and future released CommandGlows platforms under the selected plan. The plan limit is the active-device count, not a per-platform SKU.

## Source Of Truth

Stripe Managed Payments is never the runtime authorization store. It is a
payment event source. The same boundary applies to the legacy Lemon Squeezy
adapter while it remains in the codebase.

Convex is the durable suite entitlement store:

- `globalUsers`: canonical user identity.
- `identityAccounts`: provider account mappings.
- `productEntitlements`: active/refunded/revoked/pending product access.
- `productAccessEvents`: append-only access/payment/support event log.

The app and site may cache or mirror entitlement status for UX and sync eligibility, but protected access must fail closed when the suite entitlement cannot be verified.

## Checkout Authority

Product marketing authority and checkout infrastructure are separate concerns.

- Each product should keep its own canonical sales page on its own public domain when that domain exists.
- A shared suite checkout route is allowed and preferred when it reduces duplicated provider code and keeps product metadata explicit.
- Shared checkout infrastructure does not make `www.commandglows.com` the canonical marketing home for every suite product.
- The user should start the purchase flow from the product page for the product they are buying, then open the Stripe Managed Payments Checkout Session for that exact offer.

Current application of this rule:

- `socialglowz.com/lifetime-deal` is the canonical SocialGlowz sales page.
- `www.commandglows.com/commandglows-founder` is the canonical CommandGlows App sales page.
- Both sales pages may call the same suite checkout route as long as the route receives an explicit `offerId` and preserves product-specific success, cancel, and entitlement metadata.

## Checkout Flow

1. The sales page links to `/api/commerce/checkout` with an explicit `offerId`.
2. The route rejects a missing or unknown `offerId`.
3. The route creates a Stripe Checkout Session with Managed Payments explicitly enabled.
4. The checkout metadata includes:
   - `offer_id`
   - `offer_name`
   - `product_id`
   - `plan`
   - `source`
   - `source_ref`
   - `provider=stripe_managed_payments`
   - optional `global_user_id` or identity metadata when available
5. When a launch coupon applies, the route may attach an allowlisted Stripe promotion code or discount.

Checkout success pages are not payment proof. They are UX only.

## Shared Endpoint Rule

One shared checkout endpoint is acceptable for multiple products when all of the following remain true:

- The request contains an explicit allowlisted `offerId`.
- The backend resolves the matching `productId`, `plan`, provider config, and redirect paths from the offer registry instead of trusting the client.
- Product analytics can still distinguish the origin surface through fields such as `source` and `source_ref`.
- Webhook fulfillment writes the canonical suite entitlement for the resolved product instead of a product-local duplicate ledger.

Do not create a separate checkout endpoint per domain unless a product requires materially different provider, auth, risk, or deployment behavior. Domain count alone is not a reason to split the endpoint.

## Webhook Fulfillment Flow

1. Stripe sends signed events to the dedicated Stripe webhook route.
2. The route verifies the exact raw body with the Stripe signature header and server-only endpoint secret.
3. A completed, paid Checkout transaction normalizes to `eventType=paid` only after server verification.
4. Verified refund, dispute, revoke, cancellation, or fraud transitions normalize to the corresponding non-granting commerce state.
5. Unsupported, malformed, or incomplete signed events must become `pending_review` or `ignored`, never active access.
6. The route forwards normalized data to Convex `bridge:processCommerceEvent`.
7. Convex allowlists the product, offer, plan, environment, and idempotency key before writing.
8. A paid event creates or refreshes an active `productEntitlements` row only when it can resolve a verified global user.
9. A refund or revoke makes access non-granting without deleting identity.

## Identity Resolution

Automatic entitlement requires a resolvable suite identity. A provider event with only an email is not enough to merge accounts or grant access blindly.

Supported resolution paths:

- `global_user_id` supplied through trusted checkout metadata.
- Provider account already mapped in `identityAccounts`.
- Existing safe `sourceRef` correlation from prior access events.

If identity cannot be resolved, the event goes to `pending_review`; support must reconcile it manually.

## Device Activation Contract

The current entitlement ledger records the paid plan but does not yet enforce active-device counts. Device activation needs a separate implementation before the app can enforce 1/2/5/10 devices.

Required future model:

- A server-owned `productDeviceActivations` or equivalent table keyed by `globalUserId`, `productId`, `deviceFingerprintHash`, `platform`, `status`, `activatedAt`, `lastSeenAt`, and `deactivatedAt`.
- Plan-to-limit mapping: `focus=1`, `power=2`, `control=5`, `command=10`.
- Device identifiers must be privacy-preserving and revocable; do not store raw hardware identifiers when a stable hashed app installation id is enough.
- Same-device reactivation must be idempotent.
- New activation over plan limit must fail closed with a recoverable "deactivate another device" path.
- Refund/revoke/expired entitlement makes all related device activations non-granting for access checks.

Until this exists, the public page may describe active-device limits as the commercial plan rule, but the app must not claim that automatic device enforcement is complete.

## Support Runbook

Support must be able to:

- Find a transaction by Stripe Checkout Session, Payment Intent, Customer or redacted buyer identity reference.
- Find the matching `productAccessEvents` row by provider idempotency key or `sourceRef`.
- Verify whether a `productEntitlements` row exists for `productId=commandglows_app`.
- See `plan`, `status`, `source`, `sourceRef`, `environment`, and update time without exposing secrets.
- Manually grant, revoke, or mark pending-review cases with an append-only event.
- Reconcile wrong-account purchases without silent email-only merges.
- Document refund/revoke effects before answering support.

Never paste raw webhook payloads, API keys, signatures, cookies, raw activation codes, or full customer PII into support notes.

## Proof Checklist

Local proof:

- Commerce offer registry tests cover all founder offers.
- Existing Lemon Squeezy adapter tests are migration baseline only.
- Stripe tests must reject missing/unknown offers and prove Managed Payments is explicitly enabled with correct metadata.
- Stripe webhook tests must prove exact-body signature verification, paid/refund/revoke normalization, replay idempotency and forwarding of all four CommandGlows plans to `bridge:processCommerceEvent`.

Hosted provider proof:

- Create a Stripe Managed Payments test-mode checkout for a CommandGlows founder plan.
- Complete a test order.
- Confirm the signed webhook reaches production/preview.
- Confirm Convex writes a `productAccessEvents` entry and active `productEntitlements` row.
- Replay the same webhook and confirm idempotent behavior.
- Refund the test order or simulate a signed refund event.
- Confirm the entitlement becomes non-granting.

Launch status is not "ready to sell broadly" until hosted provider proof passes or Diane explicitly accepts manual fulfillment risk.
