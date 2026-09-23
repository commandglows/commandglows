---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.3"
project: "CommandGlows"
created: "2026-09-23"
created_at: "2026-09-22 23:58:43 UTC"
updated: "2026-09-23"
updated_at: "2026-09-23 20:25:13 UTC"
status: ready
source_skill: 100-sg-spec
source_model: "GPT-6"
scope: "authenticated-trial-entry-and-purchase-routing"
owner: "Diane"
confidence: high
user_story: "En tant que personne connectée sans accès actif à CommandGlows, je veux démarrer mon essai gratuit depuis l'app ou consulter directement les offres, afin d'essayer le produit ou acheter sans rester bloquée sur un écran d'accès vide."
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - "commandglows_app Flutter auth gate"
  - "commandglows_site Firebase bridge"
  - "Convex product entitlement ledger"
  - "CommandGlows offers page and Stripe checkout"
depends_on:
  - artifact: "shipglows_data/technical/payment-activation-entitlements.md"
    artifact_version: "1.6.0"
    required_status: draft
  - artifact: "shipglows_data/technical/design-system-authority.md"
    artifact_version: "2.2.0"
    required_status: active
supersedes: []
evidence:
  - "Operator-provided screenshot on 2026-09-23 shows a signed-in user with no entitlement, a disabled purchase button, and no trial-start action."
  - "The existing entitlement implementation defines a server-authoritative initial trial, bounded restarts, and purchase after exhaustion."
  - "The Firebase bridge request parser currently preserves restart but drops start; the Flutter bridge client currently sends only restart or an empty request."
  - "The existing localized CommandGlows founder offers page is available at /commandglows-founder and /fr/commandglows-founder and owns the product's web checkout choices."
  - "The Windows Dart-define recipe omitted SUITE_IDENTITY_BRIDGE_URL; a fresh managed launch exposed the missing forwarding. The Dev hostname currently aliases a Vercel Production deployment, while Doppler Dev has no bridge-side Firebase Admin or Convex credentials."
  - "The trial-start client currently collapses pre-request failures, HTTP errors and a 200 inactive snapshot into one message; the bridge returns no structured trial decision or client correlation ID."
next_step: "Configure and verify an isolated Dev Firebase bridge before rendered UI smoke for commandglows-trial-entry-and-purchase-routing"
---

# Title

CommandGlows Trial Entry and Purchase Routing

## Status

Implementation is ready for final UI smoke. This scope fixes the signed-in, no-access journey without changing the trial policy or payment offers.

## User Story

En tant que personne connectée sans accès actif à CommandGlows, je veux démarrer mon essai gratuit depuis l'app ou consulter directement les offres, afin d'essayer le produit ou acheter sans rester bloquée sur un écran d'accès vide.

## Minimal Behavior Contract

When a signed-in account has no active CommandGlows entitlement and has no prior trial attempt, the app offers a free trial and an enabled route to the localized CommandGlows offers page. Selecting trial start sends an authenticated `trialAction: start` request with the existing installation identifier; only the backend decides eligibility and creates the entitlement. A successful grant opens the app after refreshing access. A denial or service failure keeps the app gated, explains the next step, and leaves the offers route available. The easiest missed edge case is an installation or identity that is not eligible despite appearing to have no local trial history.

## Success Behavior

- A first-time eligible user can explicitly request the existing server-policy trial and sees the app only after the bridge returns active access.
- The request flows through the existing Firebase ID-token validation, installation/risk checks, and Convex entitlement authority.
- Users who prefer to buy can open the correct French or English CommandGlows offers page from every inactive-access state.
- Existing expired-trial restart rules remain intact; exhausted users see purchase options without a new-trial CTA.

## Error Behavior

- Invalid or missing Firebase tokens never grant access.
- Ineligible, repeated, or denied trial requests keep the access gate visible and show a non-technical explanation with an offers route.
- Bridge/network errors retain retry/change-account recovery and never imply that a trial or purchase succeeded.
- The user can distinguish a request that was not sent, a request with no response, an HTTP/service error, a server response without an active grant, and a confirmed grant.
- Each trial-start attempt carries a random non-sensitive correlation ID. The bridge echoes and logs that ID without account, token, email, or raw installation data.
- A structured denial reason is returned for safe customer recovery. An installation linked to another identity uses the same public reason as any other ineligible installation and never reveals the other account.
- Failure to open the offers page is visible and retryable.

## Trial Request Outcome Contract

For `trialAction: start`, the bridge response adds `trialRequest` while retaining
the existing entitlement snapshot:

- `outcome`: `granted`, `already_active`, or `denied`.
- `reasonCode` on denial: `installation_not_eligible`,
  `previous_trial_exists`, `trial_cycles_exhausted`, `temporary_rate_limit`, or
  `active_paid_access`.
- `requestId`: a random UUID generated by the app and echoed in the response
  header/body and structured server log. It contains no identity data.

Non-200 responses retain only an allowlisted machine error code and HTTP status
in client diagnostics. An absent response is reported as an unknown outcome;
the interface must not claim the server did not receive the request. Public
copy for `installation_not_eligible` must not disclose whether another identity
used that installation. Only a confirmed active entitlement opens the app.

## Problem

The observed access screen offers no path to start a first trial. Its purchase action is disabled when a checkout handoff token is absent. The client does not send `start`, and the public Firebase bridge parser currently discards that action even though the Convex entitlement mutation supports the existing suite trial policy.

## Solution

Add a first-trial action to the shared auth gate, pass `start` through the Flutter client and Firebase bridge request parser in `commandglows_site/src/lib/firebaseBridgeRequest.ts`, and preserve backend-only eligibility/grant decisions. Keep the current immediate Stripe checkout when its signed checkout handoff exists, while adding an always-available localized offers-page path; use that page as the fallback when no handoff exists.

## Scope In

- Flutter trial gate and bridge client state/action handling.
- Firebase bridge request parsing and focused regression coverage.
- Links to the existing localized CommandGlows offers page.
- Access-gate docs and focused tests for success, denial, no checkout handoff, and exhausted/restart states.

## Scope Out

- Trial duration, attempt limit, eligibility, anti-abuse, or entitlement schema changes.
- Pricing, offer terms, public sales copy, Stripe configuration, or checkout provider changes.
- Account creation, login-provider, identity-linking, or app-shell redesign.
- Production deployment or purchase execution.

## Constraints

- Reuse current Flutter theme, semantic spacing, `FilledButton` and `OutlinedButton`; add no one-off visual tokens.
- Preserve the existing backend-owned trial duration, restart limit, eligibility, and abuse controls; this work changes entry, not policy.
- Never grant or infer entitlement from client state, button state, wall-clock calculations, or the return from a browser checkout.
- Keep Firebase ID tokens out of URLs and logs; preserve the existing authorization header and server redaction.
- The purchase page URL is locale-aware: `/fr/commandglows-founder` for French and `/commandglows-founder` otherwise.

## Test Contract

Surface: Flutter desktop auth gate plus Astro Firebase bridge parser. Proof path: test-first for bridge action serialization and widget states, then:

- `doppler run --project commandglows --config dev -- flutter test test/auth_gate_screen_test.dart test/trial_access_screen_test.dart test/suite_identity_bridge_client_test.dart` from `commandglows_app`.
- `doppler run --project commandglows --config dev -- dart analyze lib/features/auth` from `commandglows_app`.
- `doppler run --project commandglows --config dev -- pnpm exec vitest run tests/bridge/firebaseBridgeRequest.test.ts` from `commandglows_site`.
- `doppler run --project commandglows --config dev -- pnpm build:check` from `commandglows_site`.
- ShipGlows metadata lint on `AGENT.md` and `shipglows_data`, plus `git diff --check`.

No live account, trial write, or purchase is needed for local proof. Manual rendered proof is required before claiming the exact updated screen was visually verified.

## Dependencies

- Existing Flutter/Firebase bridge client and auth-gate state.
- Existing public Firebase bridge and `bridge:upsertFirebaseIdentity` mutation.
- Existing localized CommandGlows offers page and site checkout buttons.

## Invariants

- Authentication is necessary but never sufficient for product access.
- Trial grants remain server-owned and installation-aware.
- Existing restart and purchase behavior remains available.
- An unavailable access check never pressures the user to purchase.

## Links & Consequences

The change crosses Flutter UI, Firebase bridge parsing, and Convex entitlement behavior. Convex remains the policy authority; changes to trial policy, ledger schema, pricing, or Stripe offers require their own governed decision and proof. The site offers page remains the purchase source of truth.

## Documentation Coherence

Update `commandglows_app/docs/VERIFICATION.md` with the new first-trial and offers-route behavior and the local proof results. No public sales copy or entitlement-policy documentation changes are required.

## Edge Cases

- No entitlement or zero attempts: show first-trial CTA and offers link.
- Expired, restart-eligible attempt: retain restart action and offers link; do not show first-trial action.
- Exhausted attempts or ineligible device: no first-trial action after server denial; keep offers link.
- Missing checkout handoff: offers link remains enabled.
- Bridge timeout or invalid token: remain gated and keep retry/change-account recovery; never launch purchase as a substitute for verification.
- Duplicate start request: backend idempotency and ledger checks prevent duplicate grants.

## Implementation Tasks

1. `commandglows_app/lib/features/auth/data/suite_identity_bridge_client.dart`: add explicit trial-start serialization and test its POST body/header; preserves the authenticated bridge contract.
2. `commandglows_site/src/pages/api/bridge/firebase.ts`: preserve `start` in request parsing and add parser tests for start/restart/absent/invalid values; do not change Convex trial rules.
3. `commandglows_app/lib/features/auth/presentation/auth_gate_screen.dart` and `trial_access_screen.dart`: add the first-trial action, loading/denial feedback, and identity refresh; widget tests cover first use, denial, restart eligibility, and exhaustion.
4. Add an always-available localized offers-page CTA; when no checkout handoff exists, the purchase action opens offers rather than appearing disabled. Test availability and route choice without performing checkout.
5. Update `commandglows_app/docs/VERIFICATION.md` and run each command in the Test Contract; no live trial or purchase writes.

## Acceptance Criteria

- An inactive identity with no trial attempt sees “Démarrer mon essai gratuit” and a working offers action.
- Pressing trial start sends an authenticated `trialAction: start` request with the stable installation ID.
- Only an active entitlement response opens the app; denial or transport failure leaves the gate visible with useful feedback.
- Existing eligible restart behavior still requests `restart`; exhausted accounts do not see first-trial or restart actions.
- The offers action resolves to the localized founder offers page even when `checkoutIdentityToken` is absent.
- The existing checkout handoff action remains available when configured and remains token-safe.
- Unavailable access verification still offers retry/change account and never offers purchase as a workaround.

## Test Strategy

- App: client request body/header tests; trial gate widget tests for first start, loading/denial, restart eligibility, exhaustion, and offers action; targeted `flutter test`; `flutter analyze` or targeted Dart analysis.
- Site: parser unit tests for `start`, `restart`, absent, and malformed values; `pnpm test:unit -- ...` and `pnpm build:check` under Doppler.
- Integration: local bridge contract only; no production trial/payment mutation in automated checks.
- Manual: inspect the updated rendered no-access screen and launch the French offers URL from the purchase action.

## Risks

- A user-visible CTA may be shown to an installation that the server later considers ineligible; server denial must be clear and remain non-granting.
- A purchase route can become stale; both localized routes must be confirmed in the site before use.
- Flutter desktop visual automation is unavailable in this run, so rendered proof may remain operator-owned.

### OWASP Security Gate

Top 10:2025 A01, A06, A07, A08 and A10 considered. Trust boundary remains Firebase ID token -> Astro bridge -> Convex; client requests intent only, and backend validates identity, installation eligibility, idempotency and entitlement rules. No new ASVS v5.0.0 mapping: token verification and authorization remain unchanged. Focused tests prove the action is passed but not a grant. Residual risk: hosted authenticated proof remains separate and requires an operator-controlled test account.

## Execution Notes

First-read files: `commandglows_app/lib/features/auth/presentation/auth_gate_screen.dart`, `commandglows_app/lib/features/auth/presentation/trial_access_screen.dart`, `commandglows_app/lib/features/auth/data/suite_identity_bridge_client.dart`, `commandglows_site/src/pages/api/bridge/firebase.ts`, and `commandglows_site/src/pages/[...lang]/commandglows-founder.astro`. Preserve unrelated worktree edits. Use Doppler for Flutter/site checks. Android build/install is not allowed on this VM. No deploy or commit is in this scope.

## Open Questions

None. The operator requested a first-trial action and a direct route to the existing app offers page; existing policy and route evidence resolve duration and destination.

## ZOMBIES Coverage

Zero/one: absent entitlement and first start; boundary: first versus third trial cycle; interface: Flutter request -> Firebase parser -> Convex policy; exception: denial, timeout, missing checkout handoff; many/replay: repeated start is handled by the existing idempotent server ledger. Simple path reuses existing bridge, gate, and offers page.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-09-22 23:58:43 UTC | 100-sg-spec | GPT-6 | Specified trial entry and purchase routing from the observed access gate | Draft ready for independent readiness review | /101-sg-ready commandglows-trial-entry-and-purchase-routing |
| 2026-09-23 00:03:51 UTC | 101-sg-ready | GPT-6 | Reviewed user story, server-owned trial boundary, route, edge cases, design authority, and local proof path | Ready; no product or security decision remains open | /102-sg-start commandglows-trial-entry-and-purchase-routing |
| 2026-09-23 00:11:47 UTC | 102-sg-start | GPT-6 | Implemented first-trial entry, offer-page routing, and bridge parser handling | Focused verification passed; rendered UI smoke remains | Finish focused verification and rendered UI smoke |

## Current Chantier Flow

`100-sg-spec` -> `101-sg-ready` -> `/102-sg-start commandglows-trial-entry-and-purchase-routing` -> focused verification -> operator visual smoke.
