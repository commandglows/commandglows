---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.9"
project: "CommandGlows"
created: "2026-09-23"
created_at: "2026-09-22 23:58:43 UTC"
updated: "2026-09-25"
updated_at: "2026-09-25 00:14:09 UTC"
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
  - "The Windows Dart-define recipe now forwards the environment-paired bridge URL; an isolated Vercel Preview bridge on Firebase Dev and Convex Dev returned correlated granted and denied outcomes on 2026-09-24."
  - "A source audit on 2026-09-24 found the Firebase identity sync and generic suite bridge could invoke the initial trial writer without trialAction, and CommandGlows still hard-denied grants after three shared-network grants; all conflict with the explicit-click and shared-network fairness contracts."
  - "Operator decision on 2026-09-24: require a verified Firebase email before awarding a CommandGlows trial; a shared-network signal must not block otherwise eligible accounts."
  - "On 2026-09-25 the operator confirmed the Windows app opened after a verified-email retry; the correlated Dev bridge returned 200 already_active and a subsequent access read returned 200."
next_step: "Keep fresh-initial-grant proof and Production rollout separate from the confirmed Dev access recovery"
---

# Title

CommandGlows Trial Entry and Purchase Routing

## Status

The explicit trial-entry UI and isolated Dev bridge proof are in place. Current source requires an explicit request, keeps shared-network velocity non-blocking, and requires Firebase-confirmed email verification. Focused automated checks passed. After the Convex Dev contract repair, the operator confirmed that the verified-email retry opened the Windows app. The correlated start response was `200 already_active`, which proves active access and the rendered transition but does not by itself prove creation of a fresh initial trial on that request.

## User Story

En tant que personne connectée sans accès actif à CommandGlows, je veux démarrer mon essai gratuit depuis l'app ou consulter directement les offres, afin d'essayer le produit ou acheter sans rester bloquée sur un écran d'accès vide.

## Minimal Behavior Contract

When a signed-in account has no active CommandGlows entitlement and has no prior trial attempt, the app offers a free trial and an enabled route to the localized CommandGlows offers page. Selecting trial start sends an authenticated `trialAction: start` request with the existing installation identifier; Firebase Admin verifies the account's current email-confirmation state, then the backend decides eligibility and creates the entitlement. An unverified address cannot receive a new trial; the app explains this and can resend the verification email. A successful grant opens the app after refreshing access. A denial or service failure keeps the app gated, explains the next step, and leaves the offers route available.

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
- An explicit trial action is denied until Firebase Admin confirms that the current account email is verified; a stale ID-token claim is not sufficient. The app offers to resend a verification link, after which the user can request the trial again.
- Failure to open the offers page is visible and retryable.

## Trial Request Outcome Contract

For `trialAction: start`, the bridge response adds `trialRequest` while retaining
the existing entitlement snapshot:

- `outcome`: `granted`, `already_active`, or `denied`.
- `reasonCode` on denial: `installation_not_eligible`,
  `previous_trial_exists`, `trial_cycles_exhausted`, `active_paid_access`, or
  `email_not_verified`.
- The public Firebase bridge checks the current Firebase Admin user record before any explicit trial action. An unverified address receives `email_not_verified`; a verification-service failure receives a recoverable service error. Neither path invokes the entitlement writer.
- Firebase identity synchronization and the generic suite bridge without
  `trialAction` never create a CommandGlows trial. The initial grant requires
  explicit `trialAction: start`; a relaunch requires explicit
  `trialAction: restart`.
- The 24-hour, three-grant shared-network threshold is a server-side risk signal
  only for CommandGlows. It is not returned as a denial or shown as an access
  reason. The `shared_network_velocity` signal may appear in redacted server
  diagnostics; it contains no IP address or account identifier.
- When reading a legacy `temporary_rate_limit` denial during rollout, explain
  that the network is shared across accounts and that this does not mean the
  current account already used an essay.
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
- CommandGlows-only behavior: identity sync never creates a trial without `trialAction`; shared-network velocity does not deny a grant and remains an internal risk signal. Per-account trial cycles and consumed-installation checks remain authoritative.
- Explicit CommandGlows trial starts and restarts require server-verified email confirmation; unverified users get a clear denial and email-link recovery action.
- Access-gate docs and focused tests for success, denial, no checkout handoff, and exhausted/restart states.

## Scope Out

- Trial duration, per-account cycle limit, eligibility schema, or network-policy behavior for products other than CommandGlows.
- Pricing, offer terms, public sales copy, Stripe configuration, or checkout provider changes.
- Account creation, login-provider, identity-linking, or app-shell redesign.
- Production deployment or purchase execution.

## Constraints

- Reuse current Flutter theme, semantic spacing, `FilledButton` and `OutlinedButton`; add no one-off visual tokens.
- Preserve the backend-owned trial duration, per-account restart limit, identity eligibility, and consumed-installation guard. For CommandGlows, shared-network velocity may be recorded as a risk signal but cannot alone deny access; do not change other products' network limits.
- Never grant or infer entitlement from client state, button state, wall-clock calculations, or the return from a browser checkout.
- Keep Firebase ID tokens out of URLs and logs; preserve the existing authorization header and server redaction.
- The purchase page URL is locale-aware: `/fr/commandglows-founder` for French and `/commandglows-founder` otherwise.

## Test Contract

Surface: Flutter desktop auth gate, Astro Firebase bridge, and Convex trial decision. Proof path: test-first for explicit-action creation, shared-network fairness, bridge diagnostics, and widget states, then:

- `doppler run --project commandglows --config dev -- flutter test test/auth_gate_screen_test.dart test/trial_access_screen_test.dart test/suite_identity_bridge_client_test.dart` from `commandglows_app`.
- `doppler run --project commandglows --config dev -- dart analyze lib/features/auth` from `commandglows_app`.
- `doppler run --project commandglows --config dev -- pnpm exec vitest run tests/bridge/firebaseBridgeRequest.test.ts` from `commandglows_site`.
- `doppler run --project commandglows --config dev -- pnpm exec vitest run tests/bridge/commandGlowsTrialConvex.test.ts tests/bridge/suiteProductTrialConvex.test.ts` from `commandglows_site`.
- `doppler run --project commandglows --config dev -- pnpm build:check` from `commandglows_site`.
- ShipGlows metadata lint on `AGENT.md` and `shipglows_data`, plus `git diff --check`.

No live account, trial write, or purchase is needed for local proof. Manual rendered proof is required before claiming the exact updated screen was visually verified.

## Dependencies

- Existing Flutter/Firebase bridge client and auth-gate state.
- Existing public Firebase bridge and `bridge:upsertFirebaseIdentity` mutation.
- Existing localized CommandGlows offers page and site checkout buttons.

## Invariants

- Authentication is necessary but never sufficient for product access.
- Firebase email confirmation is required before a new CommandGlows trial grant; the server owns this check and the app's resend action is only recovery, never proof of verification.
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
2. `commandglows_site/src/pages/api/bridge/firebase.ts` and `commandglows_site/convex/bridge.ts`: preserve explicit actions, require an action before CommandGlows trial creation on both bridge paths, return structured start outcomes, and keep shared-network velocity non-blocking for CommandGlows while preserving other products' limits.
3. `commandglows_app/lib/features/auth/presentation/auth_gate_screen.dart` and `trial_access_screen.dart`: add the first-trial action, loading/denial feedback, and identity refresh; widget tests cover first use, denial, restart eligibility, and exhaustion.
4. Add an always-available localized offers-page CTA; when no checkout handoff exists, the purchase action opens offers rather than appearing disabled. Test availability and route choice without performing checkout.
5. Update `commandglows_app/docs/VERIFICATION.md` and run each command in the Test Contract; no live trial or purchase writes.

## Acceptance Criteria

- An inactive identity with no trial attempt sees “Démarrer mon essai gratuit” and a working offers action.
- Identity sync or a generic bridge call without `trialAction` creates no CommandGlows trial entitlement; selecting “Démarrer mon essai gratuit” is the only initial-trial request path exposed to the customer.
- Pressing trial start sends an authenticated `trialAction: start` request with the stable installation ID.
- An unverified Firebase account cannot receive a start or restart grant; the gate explains the requirement, can send a verification email, and permits the user to repeat the action after confirmation.
- A fourth eligible CommandGlows identity on a network after three grants in the fixed 24-hour window is not denied by that network signal; account-cycle and consumed-installation denials still apply.
- Only an active entitlement response opens the app; denial or transport failure leaves the gate visible with useful feedback.
- Existing eligible restart behavior still requests `restart`; exhausted accounts do not see first-trial or restart actions.
- The offers action resolves to the localized founder offers page even when `checkoutIdentityToken` is absent.
- The existing checkout handoff action remains available when configured and remains token-safe.
- Unavailable access verification still offers retry/change account and never offers purchase as a workaround.

## Test Strategy

- App: client request body/header tests; trial gate widget tests for first start, loading/denial, verified-email-required feedback/resend, restart eligibility, exhaustion, and offers action; targeted `flutter test`; `flutter analyze` or targeted Dart analysis.
- Site: parser unit tests for `start`, `restart`, absent, and malformed values; Convex checks for missing/verified email proof; `pnpm test:unit -- ...` and `pnpm build:check` under Doppler.
- Integration: local bridge contract only; no production trial/payment mutation in automated checks.
- Manual: inspect the updated rendered no-access screen and launch the French offers URL from the purchase action.

## Risks

- A user-visible CTA may be shown to an installation that the server later considers ineligible; server denial must be clear and remain non-granting.
- A purchase route can become stale; both localized routes must be confirmed in the site before use.
- Flutter desktop visual automation is unavailable in this run, so rendered proof may remain operator-owned.

### OWASP Security Gate

Top 10:2025 A01, A06, A07, A08 and A10 considered. Trust boundary remains Firebase ID token -> Astro bridge -> Convex; client requests intent only, and backend validates identity, installation eligibility, idempotency and entitlement rules. No new ASVS v5.0.0 mapping: token verification and authorization remain unchanged. Focused tests prove the action is passed but not a grant. Residual risk: hosted authenticated proof remains separate and requires an operator-controlled test account.

## Execution Notes

First-read files: `commandglows_app/lib/features/auth/presentation/auth_gate_screen.dart`, `commandglows_app/lib/features/auth/presentation/trial_access_screen.dart`, `commandglows_app/lib/features/auth/data/suite_identity_bridge_client.dart`, `commandglows_site/src/pages/api/bridge/firebase.ts`, and `commandglows_site/src/pages/[...lang]/commandglows-founder.astro`. Preserve unrelated worktree edits. Use Doppler for Flutter/site checks. Android build/install is not allowed on this VM. The explicitly approved deployment scope is limited to the isolated Dev Preview and `dev.commandglows.com`; Production deployment and offers/payment execution are out of scope.

### Isolated Dev runtime evidence — 2026-09-24

- Vercel Preview deployment `commandglows-19ttpj1q9` serves `dev.commandglows.com`; the branch uses Firebase Dev `commandglows-dev`, Convex Dev `trial-bridge`, and Vercel OIDC WIF. Production apex and `www` were not changed; no service-account key was created.
- Anonymous start with installation ID returned `401 missing_bearer_token`.
- A fresh synthetic Firebase Dev user received `200 granted`, `reasonCode: null`; response and Vercel log request IDs matched. Convex Dev recorded a `commandglows_app` trial entitlement with status `trialing`, environment `development`, plan `trial`, attempt 1.
- A second synthetic Dev user received `200 denied` with `temporary_rate_limit` and no entitlement. This proves the structured response preserves distinct backend outcomes.
- HTTP 200 on grant means the awaited Admin/WIF Firestore mirror write succeeded; the bridge returns 500 on mirror-write failure. Direct client access to the server-owned Firestore mirror correctly returns 403 under Firestore rules.
- Hosted API proof is complete. Interactive Windows sign-in and rendered in-app feedback remain the final UI smoke; the API test does not claim that visual proof.
- The focused Flutter AuthGate suite passes 7 tests, including CTA request, active-grant transition, denial copy with request reference, the network-limit explanation, and unknown outcome without a false support reference. Combined with the trial-access screen suite, 15 focused tests pass.
- Follow-up from the stale Windows screenshot: current Dev binary predated the fix, and its generic failure sentence is absent from current source. Failure copy now names the known cause where safe, explains the effect on app access and gives the next step. Technical HTTP/internal codes are hidden; a support reference remains available after a response.
- For uncertain outcomes and service errors, the access gate now exposes a working “Vérifier mon accès” action that refreshes the authoritative entitlement snapshot without resending the trial-start request.
- The follow-up denial-copy test verifies that `temporary_rate_limit` is explained as a shared network limit and explicitly does not imply prior use by the entered email. Earlier synthetic Dev grants exhausted this network's test allowance; no further grant request was sent during diagnosis.
- The hosted denial and focused tests above describe the pre-change network-denial behavior. They do not verify the current source, which requires an explicit trial action and treats shared-network velocity as non-blocking for CommandGlows.

### Verified-email retry repair — 2026-09-25

- An operator verified the emailed Firebase Dev link, but the next trial-start attempt still left the app gated. Redacted Vercel logs showed earlier `403 email_not_verified` responses followed by `500 bridge_write_failed`; the matching Convex Dev log identified `ArgumentValidationError: Object contains extra field firebaseEmailVerified`. The later `500` proves the bridge passed the Admin email check and reached Convex, but no grant outcome was returned.
- The Preview bridge was ahead of the Convex Dev validator. At 2026-09-24 23:55 UTC, the trial Preview branch's Convex functions were pushed to `fabulous-raven-247` using Doppler Dev and `convex dev --once`. The deployment source also retained the current development-only guard in `trialMaintenance.ts`; Production was not deployed. The published Convex function spec now lists both `firebaseEmailVerified` and `trialAction` for `bridge:upsertFirebaseIdentity`.
- At 2026-09-25 00:12:51 UTC, the next authenticated start returned `200 already_active` with request ID `25920f8f-f905-4385-b627-3189f2edaee9`; the subsequent access read returned 200. The operator confirmed that the Windows app opened. This closes the reported verified-email access blocker in Dev, while the exact initial-grant provenance remains unproven from this response.

## Open Questions

None. The operator requested a first-trial action and a direct route to the existing app offers page; existing policy and route evidence resolve duration and destination.

## ZOMBIES Coverage

Zero/one: absent entitlement and first start; boundary: unverified versus verified email and first versus third trial cycle; interface: Flutter request -> Firebase Admin verification -> bridge -> Convex policy; exception: unverified email, denial, timeout, missing checkout handoff; many/replay: repeated start is handled by the existing idempotent server ledger. Simple path reuses existing bridge, gate, and offers page.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-09-22 23:58:43 UTC | 100-sg-spec | GPT-6 | Specified trial entry and purchase routing from the observed access gate | Draft ready for independent readiness review | /101-sg-ready commandglows-trial-entry-and-purchase-routing |
| 2026-09-23 00:03:51 UTC | 101-sg-ready | GPT-6 | Reviewed user story, server-owned trial boundary, route, edge cases, design authority, and local proof path | Ready; no product or security decision remains open | /102-sg-start commandglows-trial-entry-and-purchase-routing |
| 2026-09-23 00:11:47 UTC | 102-sg-start | GPT-6 | Implemented first-trial entry, offer-page routing, and bridge parser handling | Focused verification passed; rendered UI smoke remains | Finish focused verification and rendered UI smoke |
| 2026-09-24 15:43:38 UTC | sg-development | GPT-6 | Required explicit trial actions on both CommandGlows bridge paths and changed shared-network velocity from denial to internal risk signal; updated regression expectations and verification docs | Local changes only; automated checks and rendered UI not rerun; earlier hosted denial proof predates this change | Run focused Doppler Convex/Flutter checks, then refresh isolated Dev and Windows UI proof |
| 2026-09-24 16:16:42 UTC | sg-development | GPT-6 | Added operator-approved verified-email requirement to explicit CommandGlows trial actions, with server check and app resend recovery | Local changes only; checks and rendered UI not run | Run focused Doppler Convex/Flutter checks, then isolated Dev and Windows UI proof for unverified denial, verified grant, and resend recovery |
| 2026-09-24 16:57:05 UTC | sg-development | GPT-6 | Added regression coverage for unverified email denial, Firebase verification lookup failure, verified proof forwarding, and app recovery copy | 33 focused Flutter tests, 36 focused bridge/Convex tests, targeted Dart analysis, site build check, and targeted metadata lint pass; full metadata lint has one unrelated pre-existing invalid status | Refresh isolated Dev deployment, then verify email resend and post-verification grant with a dedicated test account |
| 2026-09-25 00:00:09 UTC | sg-bug | GPT-6 | Correlated the operator's verified-email retry with Preview and Convex Dev logs; deployed the matching Dev validator | Remote function spec confirms the new argument; authenticated post-deployment grant and rendered transition remain unverified | Observe one operator-controlled retry and correlate its safe request ID |
| 2026-09-25 00:14:09 UTC | sg-bug | GPT-6 | Correlated the operator's post-deployment retry and confirmed the rendered app result | Bridge start returned 200 already_active; follow-up access read returned 200; operator confirmed entry into the app | Keep fresh initial-grant and Production proof separate |

## Current Chantier Flow

`100-sg-spec` -> `101-sg-ready` -> `/102-sg-start commandglows-trial-entry-and-purchase-routing` -> focused verification (passed) -> isolated Dev validator refresh (deployed) -> authenticated `already_active` response and operator-confirmed Windows app entry. The reported Dev access blocker is resolved; a fresh first-grant proof and Production rollout remain separate release evidence.
