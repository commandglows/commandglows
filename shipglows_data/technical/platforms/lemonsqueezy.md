---
artifact: technical_module_context
metadata_schema_version: "1.0"
artifact_version: "0.2.1"
project: winglowz
created: "2026-05-30"
updated: "2026-07-17"
status: draft
source_skill: sf-docs
scope: platform-usage-lemonsqueezy
owner: Diane
confidence: high
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - shipglows_data/technical/code-docs-map.md
  - /home/claude/shipglows/shipglows_data/technical/external-platforms/lemonsqueezy.md
  - winglowz_site/src/lib/commerce/
  - winglowz_site/src/pages/api/commerce/
  - winglowz_site/convex/bridge.ts
  - shipglows_data/technical/payment-activation-entitlements.md
depends_on:
  - artifact: "/home/claude/shipglows/shipglows_data/technical/external-platforms/lemonsqueezy.md"
    artifact_version: "0.1.0"
    required_status: "draft"
supersedes: []
evidence:
  - "WinGlows suite owns the processor-agnostic commerce API and SocialGlowz entitlement ledger fulfillment."
  - "Fresh Lemon Squeezy docs checked on 2026-05-30; no official CLI or MCP was identified."
  - "WinGlows App founder plans are represented by internal offers `winglowz_app/focus`, `winglowz_app/power`, `winglowz_app/control`, and `winglowz_app/command`."
next_review: "2026-06-30"
next_step: "/sf-verify socialglowz-processor-agnostic-ltd-commerce after Lemon Squeezy test-mode and hosted Convex refund/replay smoke"
---

# Lemon Squeezy Usage

## Purpose

Document how WinGlows uses Lemon Squeezy for suite-owned direct Lifetime Deal checkout paths, including SocialGlowz and WinGlows App founder offers.

Use the global provider note for source links and tool availability:

- `/home/claude/shipglows/shipglows_data/technical/external-platforms/lemonsqueezy.md`

Use the payment activation contract for product access, entitlement ownership, and future device activation rules:

- `shipglows_data/technical/payment-activation-entitlements.md`

This file is the local usage contract for architecture, validation, and automation decisions.

## Usage Summary

- Provider role: first payment provider adapter for direct suite Lifetime Deal sales.
- Product access owner: WinGlows suite entitlement ledger, not Lemon Squeezy.
- Canonical product sales pages stay product-specific even when the checkout route is shared.
- Applies to paths:
  - `winglowz_site/src/lib/commerce/**`
  - `winglowz_site/src/pages/api/commerce/**`
  - `winglowz_site/src/pages/api/bridge/socialglowz.ts`
  - `winglowz_site/convex/bridge.ts`
  - `winglowz_site/.env.example`
  - `winglowz_site/README.md`
- Environments used: local mocked tests, future Lemon Squeezy test mode, future production.
- Validation surface: local adapter/route tests, Astro typecheck, hosted Convex fulfillment smoke, Lemon Squeezy test-mode checkout/webhook/refund smoke.
- Owner: Diane.
- Last verified: 2026-06-18 by local tests and local provider-contract review; hosted provider smoke not yet executed.

## Sales Surface Rule

- `socialglowz.com/lifetime-deal` is the canonical SocialGlowz sales page.
- `www.winflowz.com/winglowz-founder` is the canonical WinGlows App sales page.
- Both products may call the same `/api/commerce/checkout` route.
- Shared checkout infrastructure must not imply that `www.winflowz.com` becomes the canonical marketing home for SocialGlowz.
- Product source attribution must stay explicit through `offerId`, `productId`, `source`, and `source_ref`.

## Local Configuration

| Item | Value or rule | Secret? | Notes |
| --- | --- | --- | --- |
| API base URL | `LEMONSQUEEZY_API_URL` defaulting to `https://api.lemonsqueezy.com` | no | Override only for controlled tests or documented provider change. |
| API key | `LEMONSQUEEZY_API_KEY` | yes | Server-only. Use test-mode key for pre-production proof. |
| Store id | `LEMONSQUEEZY_STORE_ID` | sensitive-ish | Record key name only in docs; do not record real value. |
| SocialGlowz product id | `LEMONSQUEEZY_SOCIALGLOWZ_PRODUCT_ID` | sensitive-ish | Provider reference only; never replaces internal `productId=socialglowz`. |
| SocialGlowz LTD variant id | `LEMONSQUEEZY_SOCIALGLOWZ_LIFETIME_DEAL_VARIANT_ID` | sensitive-ish | Provider reference only; mapped from internal offer `socialglowz/lifetime_deal`. |
| WinGlows App product id | `LEMONSQUEEZY_WINGLOWZ_APP_PRODUCT_ID` | sensitive-ish | Provider reference only; internal product remains `winglowz_app`. |
| WinGlows Focus variant id | `LEMONSQUEEZY_WINGLOWZ_APP_FOCUS_VARIANT_ID` | sensitive-ish | Provider reference only; mapped from internal offer `winglowz_app/focus`. |
| WinGlows Power variant id | `LEMONSQUEEZY_WINGLOWZ_APP_POWER_VARIANT_ID` | sensitive-ish | Provider reference only; mapped from internal offer `winglowz_app/power`. |
| WinGlows Control variant id | `LEMONSQUEEZY_WINGLOWZ_APP_CONTROL_VARIANT_ID` | sensitive-ish | Provider reference only; mapped from internal offer `winglowz_app/control`. |
| WinGlows Command variant id | `LEMONSQUEEZY_WINGLOWZ_APP_COMMAND_VARIANT_ID` | sensitive-ish | Provider reference only; mapped from internal offer `winglowz_app/command`. |
| Webhook secret | `LEMONSQUEEZY_WEBHOOK_SECRET` | yes | Server-only; used to verify `X-Signature`. |
| Provider order preference | `COMMERCE_PROVIDER_ORDER` | no | Current default: `lemonsqueezy,polar`. |
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
- Fulfillment runs through `bridge:processCommerceEvent` and writes to suite-owned `productEntitlements` / `productAccessEvents`. The legacy SocialGlowz bridge mutation remains for compatibility.
- Checkout success pages are not payment proof. Access changes come from signed webhooks and idempotent suite fulfillment. Lemon Squeezy owns payment receipt emails; WinGlows access state must come from the signed webhook and suite ledger.
- Payment activation and device activation are distinct. The current Lemon Squeezy integration can create a suite product entitlement after a signed paid event, but Focus/Power/Control/Command active-device limits need a separate server-owned activation ledger before they are enforceable.
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

- Internal offer ids remain product-owned, for example `socialglowz/lifetime_deal`, `winglowz_app/focus`, `winglowz_app/power`, `winglowz_app/control`, and `winglowz_app/command`.
- Internal product and plan values remain canonical suite values, for example `productId=socialglowz`, `productId=winglowz_app`, `plan=lifetime_deal`, `plan=focus`, `plan=power`, `plan=control`, or `plan=command`.
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
pnpm -C /home/claude/winglowz/winglowz_site test tests/commerce/checkoutRoute.test.ts tests/commerce/offers.test.ts tests/commerce/lemonsqueezy.test.ts tests/api/bridge/socialGlowzCommerceBridge.test.ts
pnpm -C /home/claude/winglowz/winglowz_site test tests/commerce/lemonSqueezyWebhookRoute.test.ts
pnpm -C /home/claude/winglowz/winglowz_site build:check
python3 /home/claude/shipglows/tools/shipglows_metadata_lint.py /home/claude/winglowz/shipglows_data/technical/platforms/lemonsqueezy.md
```

Provider smoke, after test-mode setup:

```text
Create checkout from SocialGlowz or each WinGlows founder plan -> complete test order -> receive signed order_created webhook -> verify suite ledger access/code path -> perform/simulate refund -> verify access becomes non-granting. For WinGlows founder plans, repeat the smoke for Focus, Power, Control, and Command or document why a provider-level variant is intentionally not public yet.
```

## Reader Checklist

- `winglowz_site/src/lib/commerce/**` changed -> verify checkout/webhook contract against official docs and this usage note.
- `winglowz_site/convex/bridge.ts` changed -> verify idempotency, no email-only merge, refund/revoke precedence, and environment separation.
- Env vars changed -> update `.env.example`, README, and this note with keys only.
- Someone proposes Lemon Squeezy CLI/MCP -> check global provider note and keep production writes blocked until a reviewed tool decision exists.

## Maintenance Rule

Update this note when Lemon Squeezy provider mapping, env var keys, checkout/webhook routes, provider smoke process, suite fulfillment behavior, refund/revoke policy, MCP/CLI adoption, or security assumptions change.
