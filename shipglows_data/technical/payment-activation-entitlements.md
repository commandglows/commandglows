---
artifact: technical_module_context
metadata_schema_version: "1.0"
artifact_version: "1.6.0"
project: "CommandGlows"
created: "2026-06-18"
updated: "2026-09-06"
status: draft
source_skill: "sg-docs"
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
  - "shipglows_data/technical/platforms/stripe-managed-payments.md"
depends_on:
  - artifact: "shipglows_data/technical/platforms/stripe-managed-payments.md"
    artifact_version: "1.1.0"
    required_status: "draft"
  - artifact: "C:/Users/Diane/ShipGlows/shipglows/shipglows_data/workflow/specs/unified-suite-commercial-entitlement-and-stripe.md"
    artifact_version: "1.3.1"
    required_status: "ready"
supersedes: []
evidence:
  - "CommandGlows App founder offers use internal offer ids commandglows_app/focus, commandglows_app/power, commandglows_app/control, and commandglows_app/command."
  - "Historical state before the unified decision: Lemon Squeezy checkout and signed webhooks were active for CommunityGlows only."
  - "Convex owns durable productEntitlements and productAccessEvents."
  - "Implementation review 2026-08-11: CommandGlows trial rows are now written by `bridge:upsertFirebaseIdentity`, carry server timestamps and attempts, and are parsed fail-closed by Flutter."
  - "Historical provider decision of 2026-08-11: CommandGlows targeted Stripe Managed Payments; CommunityGlows Lemon Squeezy usage was retained as migration history and is now superseded."
  - "Local provider implementation 2026-08-11: Stripe Checkout explicitly enables Managed Payments and signed paid/refund/dispute events normalize into bridge:processCommerceEvent."
  - "Entitlement cleanup 2026-08-11: Flutter product routes require a remote session plus a current server entitlement; local fallback is non-granting."
  - "Entitlement cleanup 2026-08-11: CommunityGlows was removed from suite default-free policies and Lemon Squeezy rejects CommandGlows offers and events."
  - "Operator decision later on 2026-08-11 supersedes the product exceptions: all suite products use 30-day cycles, two maximum restarts, no permanent freemium, and Stripe Managed Payments only."
  - "Local entitlement completion on 2026-08-11: one product-scoped 30-day/three-cycle policy is reachable for all eight registered products; free writers/backfills and granting fallbacks were removed."
  - "Local commerce batch B on 2026-08-11: all active offers are Stripe-only; CommunityGlows and Formation use environment-backed Price-ID placeholders; active Lemon Squeezy/Polar runtime paths were removed; every checkout requires a signed product/environment handoff; Convex makes non-Stripe events pending-review and non-granting."
next_review: "2026-09-11"
next_step: "Complete hosted Stripe/Convex lifecycle proof, retention/telemetry, stronger integrity, and real-device anti-abuse proof before a production access claim."
---

# Payment Activation And Entitlements

## AppSumo protocol foundation (2026-09-10, local)

`commandglows_site/src/lib/commerce/providers/appsumo.ts` verifies HMAC over
timestamp plus exact body, rejects stale transport timestamps and validates
base-deal event/key lineage fields. Test payloads normalize to non-granting state;
add-ons are refused until their separate mapping is defined. The OAuth client
exchanges a code once, fetches its license and returns no access/refresh token.
Errors are redacted and automatic retry is prohibited for single-use codes.

`convex/appSumoFulfillment.ts` and `bridge:processAppSumoLicenseEvent` now add
the first durable Convex fulfillment layer. A license is scoped by environment,
recorded without raw webhook bodies or tokens, and can grant a normal
`productEntitlements` row only when the server supplies a known global user and
a supported internal `productId` / `offerId` / `plan` mapping. Test events and
inactive purchases never grant. Active licenses can be revoked, reactivated and
replaced by AppSumo upgrade/downgrade lineage without disturbing Stripe grants.
Missing owner or missing tier-to-offer mapping remains `pending_review`.

This is still not a public AppSumo launch path. The caller must consume
authenticated single-use OAuth state before exchange, then forward only a
server-owned owner/product mapping to Convex. Public webhook/OAuth routes,
webhook ACK persistence, tier configuration, durable replay conflict handling
around raw webhook hashes, API reconciliation and hosted provider proof remain
required. No production activation is available from this local tranche alone.
Fourteen synthetic AppSumo tests pass; no provider request was executed.

Protocol references verified on 2026-09-10:
- https://docs.licensing.appsumo.com/webhook/webhook__security.html
- https://docs.licensing.appsumo.com/webhook/webhook__connect.html
- https://docs.licensing.appsumo.com/licensing/licensing__connect.html

## Firebase trial expiration (2026-09-10, local)

The server-owned mirror publishes `products.commandglows_app.trialExpiresAt`
in epoch milliseconds for trial access. Firestore and Storage rules compare it
with `request.time`; an expired or missing trial deadline denies protected access
without waiting for a client refresh. Active paid access takes precedence over a
concurrent trial. Deploy the mirror writer before the rules and refresh existing
trial mirrors: old trial mirrors without the deadline will be denied.

The mirror builder has synthetic regression coverage. Firebase emulator and
hosted rule execution remain required before rollout. This change enforces trial
expiration only; bounded freshness and prompt paid-refund propagation are still
open and must not be reported as implemented.

## Active Suite Decision (2026-08-11)

This document derives from the sole active cross-product authority:
`C:/Users/Diane/ShipGlows/shipglows/shipglows_data/workflow/specs/unified-suite-commercial-entitlement-and-stripe.md`.

Every current and future suite product uses exactly three maximum 30-day trial
cycles: the initial cycle plus two user-triggered restarts. Purchase is
mandatory after exhaustion. Permanent freemium, `product_default`,
authentication-based access, and product-specific trial exceptions are not
allowed. Stripe Managed Payments is the only active direct-payment provider.

The previous CommandGlows 14-day/42-day contract, CommunityGlows single-cycle
contract, Lemon Squeezy CommunityGlows adapter decision, and Polar routes are
superseded history. Historical rows/events may remain audit evidence but are
non-granting.

## Implementation Status (2026-08-11)

The entitlement and Stripe-only runtime are locally migrated; hosted provider
proof remains incomplete:

- CommandGlows enforces 30-day server-owned attempts, two maximum restarts,
  installation continuity and fail-closed route gating.
- CommunityGlows exposes the same three-cycle server contract and authenticated
  restart operation; its product-client recovery UX remains in the later
  CommunityGlows client batch.
- All eight registered products can reach the common trial policy through the
  generic authenticated bridge mutation; product-specific adapters remain thin. All legacy
  `product_default` rows and permanent active `free` plans are non-granting,
  and identity synchronization creates no free access or backfill.
- Lemon Squeezy and Polar runtime providers, offer mappings, webhook routes,
  environment keys, active tests and the Polar SDK dependency are removed.
- Every current sellable offer has a named environment-backed Stripe Price-ID
  placeholder; real values and price amounts remain intentionally unconfigured.

The earlier no-user assumption is historical and has not been revalidated.
Existing identities, orders and ledger history must be preserved. No destructive
migration or hosted data change is authorized by local implementation.

## Central commerce foundation (2026-09-06, local)

Baseline `9016d47` was revalidated with its 20 focused trial/checkout tests before
implementation. Both `bridge:processCommerceEvent` and the retained
`bridge:processCommunityGlowsCommerceEvent` now call `commerceProcessor.ts`.
The compatibility entrypoint accepts CommunityGlows only. There is one writer,
not a second product-specific entitlement authority.

A new grant requires a server-owned `commerceCheckoutHandoffs` record matching
source reference, product, offer, identity and environment, plus the exact
completed Checkout Session. A signed paid session binds its PaymentIntent once;
refunds/disputes must carry that same PaymentIntent. Missing source metadata is
never replaced with a Session/Charge ID. The provider contract is documented by
Stripe's [Checkout Session object](https://docs.stripe.com/api/checkout/sessions/object)
and [Charge object](https://docs.stripe.com/api/charges/object).

Provider/environment/event identity and the first normalized envelope are
bound in additive `commerceEventReceipts`. New receipts also retain a canonical
hash of the verified Stripe snapshot (excluding mutable delivery counters).
Identical provider evidence reuses the first envelope despite subsequent charge
metadata changes; differing evidence under the same event ID remains a conflict.
The grant key depends on provider,
environment, product and purchase, never a marketing channel. A negative
transition affects all matching historical duplicate commerce grants for that
purchase, preserving other purchases, trials, manual grants and identities.
Sandbox aliases (test/development/preview/staging) share one normalization;
production is isolated in both directions, including response snapshots.
Unknown environments fail closed. Customer identities are checked, never moved
between environments or silently reassigned by commerce processing.

Existing rows and their original audit fields are retained. Legacy raw
CommunityGlows references and suite-prefixed references are read only with their
corresponding ledger source/key family. Ambiguous ownership and purchases
without a verified server/provider binding remain non-granting review cases;
there is no bulk migration, deletion, backfill or inferred historical linkage.
The earlier `missing_global_user_for_revoke` tombstone continues to block a
late payment. Historical assumptions about absence of customers are not authority.

### Controlled pending-review recovery

Duplicate webhook delivery returns the stored result; it cannot change the
envelope or retry fulfillment. New receipts have one initial attempt and retain
no bridge secret, raw webhook body or arbitrary metadata.

`internal.bridge.retryPendingCommerceEvent` is an internal Convex mutation with
no public/customer route. It accepts only `receiptId`, `expectedAttempts`,
`operatorId`, `reason`, and `dryRun`; it never accepts replacement event data.
An authorized operator uses a concrete receipt and a non-secret review reason:

1. Inspect the retained envelope and repair its server-owned prerequisite
   through the existing authorized checkout/identity workflow.
2. Call with `dryRun=true` to check eligibility without writes. This is an
   eligibility check, not a simulated fulfillment result.
3. Call with `dryRun=false` and the inspected attempt counter. The mutation
   revalidates the original envelope in the runtime environment atomically.
4. Read the resulting receipt and append-only `commerceEventReviewAttempts`
   audit. A stale counter is rejected; completed receipts are no-ops.

Only missing purchase/identity/completed checkout/payment binding and a pending
negative transition are recoverable. Five normal processing attempts are allowed
(initial plus four controlled retries), followed by a durable escalation. The
administrator reconciliation route can perform one sixth attempt only after
retrieving the original event from Stripe and matching its retained snapshot hash.
Counters are never reset. Unsupported providers/offers, environment mismatches,
identity conflicts, legacy partial-refund classifications and missing signed
payment evidence cannot be promoted through this endpoint. They need separately
verified evidence and a linked resolution, not a caller-supplied status override.
Historical events predating retained envelopes are not reconstructed.

If a refund arrives before its paid session, it stays pending while the signed
session establishes the payment reference. The paid event also stays pending
without granting access. Recover the negative event first, then the paid event;
the latter remains revoked. Tests cover this order without contacting Stripe.

### Launch lifecycle and operations (2026-09-06)

The approved rules and every expected outcome/error exit are in
[the launch matrix](commerce-launch-scenarios.md). The implementation stores
individual refund/dispute facts, rather than reclassifying a past refund from
the current charge.amount_refunded. Distinct successful refunds accumulate;
partial refunds retain access and full refunds remove it. Failed/pending refunds
do not contribute to the successful total; failed/requires_action states alert
the operator. A later failed refund can restore the still-paid purchase while
keeping that refund incident open.

Open disputes suspend only the affected purchase. Won, warning_closed and
prevented lift only their own block. Lost/other active disputes, full refunds,
legacy revocations and externally changed entitlement states prevent unsafe
restoration. Qualified immutable facts determine ordering; conflicting terminal
dispute outcomes remain review cases even at different timestamps. The receipt's historic result is
not the current access snapshot.

`commerceOperations` exposes an admin-only, environment-scoped queue, ownership,
deadlines, audited actions, bounded retry and authenticated provider-event
reconciliation. `commerceIncidentLedger` records incidents and an alert outbox
atomically with fulfillment. Verified normalization failures have incidents even
before a receipt exists. A complete database outage retains HTTP 500 and emits
only a redacted hosting alarm. Hosted monitoring of that fallback is mandatory.
Scheduled sweeps recover alert leases, escalate overdue cases and inspect old
handoffs using bounded pages. Age is never proof of payment. The operator must
configure the HTTPS alert receiver and prove receipt during hosted acceptance;
local fixtures send no real notifications. Resolving a support case changes
neither its immutable receipt nor the customer's rights.

The [operator runbook](commerce-operator-runbook.md) defines ownership, alert
failure fallback, provider reconciliation and the hosted acceptance checklist.

Local launch-preparation proof: 244 tests across 28 commerce, bridge, API and
interface suites passed; Convex TypeScript and Astro check passed. Independent
review regressions preserve legacy revocation audit provenance and reject
contradictory closed dispute outcomes across timestamps. This is synthetic
evidence; the hosted acceptance checklist remains pending.

The purchase return page states verification is pending and links the account
and support; browser return parameters cannot confirm payment or grant rights.

### Earlier local proof and delivery boundary

- Baseline: 20 tests passed before changing `9016d47`.
- Earlier tranche: 151 tests across 18 commerce/bridge suites, including signed
  synthetic parser-to-ledger paid/refund/dispute flows, concurrent deliveries,
  immutable replays, bounded recovery, environment aliases and historical rows.
- Convex TypeScript and Astro check pass; Astro retains one unrelated script hint.
- No deployment, real provider data, hosted database mutation or production
  purchase was used. Schema additions require a later authorized deployment.
- The broader identity/recovery, AppSumo, CommunityGlows Windows and portfolio
  adapter work remains open; these local commerce results do not prove it.

## Purpose

This document is the technical usage contract for suite payment activation and
access. Convex owns durable identity/trial/entitlement decisions; Stripe Managed
Payments supplies verified commerce events; product clients consume signed,
fail-closed decisions.

## Owned Files

- `commandglows_site/src/lib/commerce/**`
- `commandglows_site/src/pages/api/commerce/**`
- `commandglows_site/src/pages/api/checkout/start.ts`
- `commandglows_site/src/pages/api/bridge/firebase.ts`
- `commandglows_site/src/pages/api/bridge/commandglows-trial/**`
- `commandglows_site/convex/bridge.ts`
- `commandglows_site/convex/schema.ts`
- `commandglows_app/lib/features/auth/**`

## Entrypoints

- Identity, trial snapshot and signed checkout handoff: `POST /api/bridge/firebase`
- Trial restart: `POST /api/bridge/commandglows-trial/restart`
- Shared offer checkout: `POST /api/commerce/checkout`
- Clerk-backed public and Formation start: `POST /api/checkout/start`
- Provider events: `POST /api/commerce/webhooks/stripe`

Checkout handoffs include a cryptographically random, ten-minute `jti`. The
opaque token is accepted only in a POST body, never in page/query URLs. Convex
stores only a keyed `jti` hash in `commerceCheckoutHandoffs`, atomically claims
it, and returns one stable Stripe idempotency key. A safe retry resolves the
same Checkout Session; a changed product/offer/environment context is rejected.
The additive table is migration-compatible and requires no destructive data
migration or startup backfill.

## Vocabulary

- Payment provider: external system that collects money and emits signed events. CommandGlows provider: Stripe Managed Payments, represented canonically as `stripe` plus `managed_payments=true` metadata.
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
| CommunityGlows Lifetime Deal | `communityglows/lifetime_deal` | `communityglows` | `lifetime_deal` | product access |
| CommandGlows Formation | `commandglows_formation/full_course` | `commandglows_formation` | `formation` | premium formation access |

The Lifetime Deal grants access to present and future released CommandGlows platforms under the selected plan. The plan limit is the active-device count, not a per-platform SKU.

## Source Of Truth

Stripe Managed Payments is never the runtime authorization store. It is the
only allowed direct-payment event source.

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
- The user should start the purchase flow from the product page for the product they are buying, then open the eligible provider checkout for that exact offer.

Current application of this rule:

- `communityglows.com/lifetime-deal` is the canonical CommunityGlows sales page.
- `www.commandglows.com/commandglows-founder` is the canonical CommandGlows App sales page.
- Both sales pages may call the same suite checkout route as long as the route receives an explicit `offerId`, applies the offer's eligible provider, and preserves product-specific success, cancel, and entitlement metadata.

## Checkout Flow

1. The product client supplies a product-bound handoff, or a Clerk-backed sales
   surface enters through `/api/checkout/start`; both resolve an explicit `offerId`.
2. The route rejects a missing or unknown `offerId`.
3. For every suite offer, the route requires a valid signed identity handoff
   and creates a Stripe Checkout Session with Managed Payments explicitly enabled.
4. The checkout metadata includes:
   - `offer_id`
   - `offer_name`
   - `product_id`
   - `plan`
   - `source`
   - `source_ref`
   - `provider=stripe`
   - `managed_payments=true`
   - `environment`
   - required `global_user_id` derived from the signed handoff
5. When a launch coupon applies, the route may attach an allowlisted Stripe promotion code or discount.

Checkout success pages are not payment proof. They are UX only.

## Shared Endpoint Rule

One shared checkout endpoint is acceptable for multiple products when all of the following remain true:

- The request contains an explicit allowlisted `offerId`.
- The backend resolves the matching `productId`, `plan`, provider config, and redirect paths from the offer registry instead of trusting the client.
- Product analytics can distinguish the origin through `source`; `source_ref` identifies the server-owned checkout purchase.
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
8. A paid event grants once only after its completed server-owned purchase and signed PaymentIntent resolve to the same identity, product and environment.
9. A refund or revoke targets the same verified PaymentIntent and purchase without deleting identity or historical audit events.

## Identity Resolution

Automatic entitlement requires a resolvable suite identity. A provider event with only an email is not enough to merge accounts or grant access blindly.

Supported resolution path for automatic grants:

- `global_user_id` derived from the short-lived HMAC-signed handoff issued by
  the authenticated Firebase bridge. Raw client-supplied IDs are not trusted.
- Provider-account or source correlation may support negative transitions and
  manual review, but it never replaces the signed checkout identity for a new purchase.

If identity cannot be resolved, the event goes to `pending_review`; controlled recovery follows the retained-envelope procedure above.

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
- Non-Stripe Convex tests prove that legacy provider names are recorded only as
  non-granting `pending_review`; no legacy provider adapter or route remains.
- Stripe tests must reject missing/unknown offers, missing/invalid identity
  handoffs, missing Price IDs, and prove Managed Payments is explicitly enabled
  with correct metadata for every migrated product.
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

## Validation

- Site commerce, bridge and Convex-mock suite: `pnpm -C commandglows_site test`
- Site static validation: `pnpm -C commandglows_site build:check`
- App contract and gate: run `flutter analyze` and `flutter test` from `commandglows_app/`
- Hosted readiness: complete signed Stripe purchase, replay, refund/dispute, Convex persistence and app-refresh proof.

## Reader Checklist

- Trial, identity or installation logic changed -> update the active entitlement spec and rerun bridge/app tests.
- Offer, provider or webhook logic changed -> update the matching provider note and hosted-proof plan.
- Product/domain naming changed -> update the public-surface map and offer IDs without rewriting immutable historical evidence.
- Device-limit enforcement changed -> replace the future-model section with the implemented ledger and proof.

## Maintenance Rule

Update this contract whenever trial allowance, provider eligibility, offer
mapping, identity handoff, entitlement precedence, refund/dispute behavior,
device activation, anti-abuse retention, or hosted proof status changes.
