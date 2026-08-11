---
artifact: technical_module_context
metadata_schema_version: "1.0"
artifact_version: "0.5.0"
project: commandglows
created: "2026-05-30"
updated: "2026-08-11"
status: draft
source_skill: sg-docs
scope: platform-usage-lemonsqueezy
owner: Diane
confidence: high
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - shipglows_data/technical/code-docs-map.md
  - /home/claude/shipglows/shipglows_data/technical/external-platforms/lemonsqueezy.md
  - commandglows_site/src/lib/commerce/
  - commandglows_site/src/pages/api/commerce/
  - commandglows_site/convex/bridge.ts
  - shipglows_data/technical/payment-activation-entitlements.md
depends_on:
  - artifact: "/home/claude/shipglows/shipglows_data/technical/external-platforms/lemonsqueezy.md"
    artifact_version: "0.2.0"
    required_status: "draft"
supersedes: []
evidence:
  - "CommandGlows suite owns the processor-agnostic commerce API and CommunityGlows entitlement ledger fulfillment."
  - "Fresh Lemon Squeezy docs checked on 2026-05-30; no official CLI or MCP was identified."
  - "The active Lemon Squeezy offer is `communityglows/lifetime_deal`; CommandGlows offers are excluded from this adapter."
  - "Operator decision on 2026-08-11: Stripe Managed Payments replaces Lemon Squeezy as the CommandGlows launch target."
next_review: "2026-09-11"
next_step: "Retain the adapter for CommunityGlows; use Stripe Managed Payments for every CommandGlows offer and complete hosted Stripe proof."
---

# Lemon Squeezy Usage

## Purpose

Document the Lemon Squeezy adapter retained for CommunityGlows. It is also
migration evidence and a regression baseline, but it is no longer an allowed
provider for CommandGlows offers, which use Stripe Managed Payments.

Use the global provider note for source links and tool availability:

- `/home/claude/shipglows/shipglows_data/technical/external-platforms/lemonsqueezy.md`

Use the payment activation contract for product access, entitlement ownership, and future device activation rules:

- `shipglows_data/technical/payment-activation-entitlements.md`

This file is the local usage contract for architecture, validation, and automation decisions.

## Owned Files

- `commandglows_site/src/lib/commerce/providers/lemonsqueezy.ts`
- `commandglows_site/src/lib/commerce/offers.ts`
- `commandglows_site/src/pages/api/commerce/checkout.ts`
- `commandglows_site/src/pages/api/commerce/webhooks/lemon-squeezy.ts`
- `commandglows_site/convex/bridge.ts`

## Entrypoints

- CommunityGlows checkout: `POST /api/commerce/checkout`
- Signed provider events: `POST /api/commerce/webhooks/lemon-squeezy`

## Usage Summary

- Provider role: retained CommunityGlows adapter; legacy evidence only for CommandGlows.
- Product access owner: CommandGlows suite entitlement ledger, not Lemon Squeezy.
- Canonical product sales pages stay product-specific even when the checkout route is shared.
- Applies to paths:
  - `commandglows_site/src/lib/commerce/**`
  - `commandglows_site/src/pages/api/commerce/**`
  - `commandglows_site/src/pages/[...lang]/communityglows-founder.astro`
  - `commandglows_site/convex/bridge.ts`
  - `commandglows_site/.env.example`
  - `commandglows_site/README.md`
- Environments used: local mocked tests, future Lemon Squeezy test mode, future production for CommunityGlows only.
- Validation surface: local adapter/route tests, Astro typecheck, hosted Convex fulfillment smoke, Lemon Squeezy test-mode checkout/webhook/refund smoke.
- Owner: Diane.
- Last verified: 2026-08-11 by local tests and local provider-contract review; hosted provider smoke not yet executed.

## Sales Surface Rule

- The localized CommunityGlows founder page is the only active Lemon Squeezy sales surface in this repository.
- The CommandGlows founder page uses Stripe Managed Payments, even though both products share `/api/commerce/checkout`.
- Shared checkout infrastructure must not blur product ownership or provider eligibility.
- Product source attribution stays explicit through `offerId`, `productId`, `source`, and `source_ref`.

## Local Configuration

| Item | Value or rule | Secret? | Notes |
| --- | --- | --- | --- |
| API base URL | `LEMONSQUEEZY_API_URL` defaulting to `https://api.lemonsqueezy.com` | no | Override only for controlled tests or documented provider change. |
| API key | `LEMONSQUEEZY_API_KEY` | yes | Server-only. Use test-mode key for pre-production proof. |
| Store id | `LEMONSQUEEZY_STORE_ID` | sensitive-ish | Record key name only in docs; do not record real value. |
| CommunityGlows product id | `LEMONSQUEEZY_COMMUNITYGLOWS_PRODUCT_ID` | sensitive-ish | Provider reference only; never replaces internal `productId=communityglows`. |
| CommunityGlows LTD variant id | `LEMONSQUEEZY_COMMUNITYGLOWS_LIFETIME_DEAL_VARIANT_ID` | sensitive-ish | Provider reference only; mapped from `communityglows/lifetime_deal`. |
| Webhook secret | `LEMONSQUEEZY_WEBHOOK_SECRET` | yes | Server-only; used to verify `X-Signature`. |
| Provider order preference | `COMMERCE_PROVIDER_ORDER` | no | Current default starts with `stripe`, then `lemonsqueezy`, then `polar`; offer eligibility still controls selection. |
| Checkout route | `/api/commerce/checkout` | no | Creates hosted checkout server-side. |
| Webhook route | `/api/commerce/webhooks/lemon-squeezy` | no | Reads exact raw body, verifies signature, forwards normalized event to Convex. |
| Convex bridge secret | `SUITE_BRIDGE_CONVEX_SECRET` | yes | Required for suite ledger mutations. |

## Runtime And Integration Notes

- Checkout creation uses the official REST API, not a CLI or MCP.
- Checkout payload sends `product_options.redirect_url` and `checkout_data.custom`.
- Webhook parsing reads Lemon Squeezy `meta.custom_data`, `X-Event-Name`, and `X-Signature`.
- `order_created` maps to a normalized paid event.
- `order_refunded` maps to a normalized refunded event.
- Unsupported or incomplete signed events must be `pending_review`, not an access grant.
- Fulfillment runs through `bridge:processCommerceEvent` and writes to suite-owned `productEntitlements` / `productAccessEvents`.
- Historical SocialGlowz and CommandGlows payload fixtures may remain in parser regression tests; they are not active offer eligibility.
- Checkout success pages are not payment proof. Access changes come from signed webhooks and idempotent suite fulfillment. Lemon Squeezy owns payment receipt emails; CommandGlows access state must come from the signed webhook and suite ledger.
- Payment activation and device activation are distinct. Lemon Squeezy can create the CommunityGlows suite entitlement after a signed paid event; CommandGlows trials and device limits are governed by the separate entitlement contract.
- Polar remains a provider adapter/legacy route and must not be deleted as part of Lemon Squeezy adoption.

## MCP / CLI Policy

Current status:

- Official Lemon Squeezy CLI: not identified.
- Official Lemon Squeezy MCP: not identified.
- Adopted automation layer: none.
- Canonical integration: REST API plus signed webhooks; optional official JavaScript SDK only if a future spec chooses it.

Third-party MCPs may be evaluated later for read-only/test-mode convenience, but are not allowed for production writes by default.

Allowed without a new spec:

- Read-only exploration in a disposable test Lemon Squeezy account after reviewing the MCP source and scopes.
- Test-mode-only store/product/order inspection if API key exposure is acceptable for the test account.

Requires a new spec or explicit approval:

- Production order/refund/subscription/license/customer mutation.
- Webhook endpoint creation/update/deletion.
- Any MCP hosted by a third party with live customer/payment data.

## Invariants

- The only active Lemon Squeezy offer is `communityglows/lifetime_deal` with `productId=communityglows` and `plan=lifetime_deal`.
- CommandGlows offers must fail provider eligibility for Lemon Squeezy.
- Provider product, variant, order, customer, invoice, and webhook ids are references only.
- Lemon Squeezy never becomes the runtime authorization store.
- No email-only auto-grant or account merge.
- Refund/revoke state must become non-granting in the suite ledger.
- API keys and webhook secrets never leave server-side environment variables.
- Test-mode events must not grant production access.

## Failure Modes

- Missing Lemon Squeezy env -> checkout route returns unavailable; do not fallback to a public marketplace route.
- Invalid signature -> webhook rejects and writes no entitlement.
- Missing `meta.custom_data` or unsupported offer -> event goes to pending review or ignored outcome, never direct access.
- Provider API timeout/rate limit -> no partial entitlement side effect.
- Convex deployment not configured -> provider smoke cannot prove fulfillment; route to `sf-deploy`/`sf-prod` for Convex target setup.
- Third-party MCP suggested -> route to `sf-docs`/`sf-spec` for tool trust review before adoption.

## Security Notes

- Do not document real store ids, variant ids, API keys, webhook secrets, raw webhook bodies, customer emails, order payloads, or checkout URLs with private query state.
- Treat Lemon Squeezy API keys as broad payment credentials.
- Prefer separate test-mode and live-mode keys.
- MCP/CLI automation must be denied for production writes until reviewed.
- Redact provider logs before attaching them to ShipGlows evidence.

## Validation

Local checks:

```bash
pnpm -C /home/claude/commandglows/commandglows_site test tests/commerce/checkoutRoute.test.ts tests/commerce/offers.test.ts tests/commerce/lemonsqueezy.test.ts
pnpm -C /home/claude/commandglows/commandglows_site test tests/commerce/lemonSqueezyWebhookRoute.test.ts
pnpm -C /home/claude/commandglows/commandglows_site build:check
python3 /home/claude/shipglows/tools/shipglows_metadata_lint.py /home/claude/commandglows/shipglows_data/technical/platforms/lemonsqueezy.md
```

Provider smoke, after test-mode setup:

```text
Create checkout from CommunityGlows -> complete test order -> receive signed order_created webhook -> verify suite ledger access -> perform or simulate refund -> verify access becomes non-granting. Confirm separately that every CommandGlows offer is rejected by the Lemon Squeezy adapter.
```

## Reader Checklist

- `commandglows_site/src/lib/commerce/**` changed -> verify checkout/webhook contract against official docs and this usage note.
- `commandglows_site/convex/bridge.ts` changed -> verify idempotency, no email-only merge, refund/revoke precedence, and environment separation.
- Env vars changed -> update `.env.example`, README, and this note with keys only.
- Someone proposes Lemon Squeezy CLI/MCP -> check global provider note and keep production writes blocked until a reviewed tool decision exists.

## Maintenance Rule

Update this note when Lemon Squeezy provider mapping, env var keys, checkout/webhook routes, provider smoke process, suite fulfillment behavior, refund/revoke policy, MCP/CLI adoption, or security assumptions change.
