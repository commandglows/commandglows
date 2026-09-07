---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: commandglows
created: "2026-09-06"
updated: "2026-09-07"
created_at: "2026-09-06T19:15:00Z"
updated_at: "2026-09-06T21:44:34Z"
status: active
source_skill: sg-development
source_model: GPT-6
user_story: "A paid buyer receives the correct access or an identifiable, owned recovery case."
scope: commerce-launch-readiness
owner: Diane
confidence: high
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems: [Stripe, Convex, Clerk, Astro]
depends_on: [shipglows_data/technical/payment-activation-entitlements.md, shipglows_data/technical/platforms/stripe-managed-payments.md]
supersedes: []
evidence: ["Operator approved the commerce launch plan and business rules on 2026-09-06.", "244 synthetic tests across 28 suites, Convex TypeScript and Astro checks passed.", "Hosted administrator login and incident visibility verified; payment-linked access and notification receipt remain pending."]
next_step: "Complete Stripe sign-in, then verify Stripe test mode, actual commerce alert delivery and end-to-end recovery; historical email indexes were restored September 7."
---

# Title

Commerce launch readiness

## Status

Implemented and verified with local synthetic evidence. Commercial opening remains blocked on hosted test-mode proof.

The September 7 central email continuation adds an opt-in durable commerce alert channel on its isolated work branch. Queue/submission/provider delivery remain separate; unknown submissions cannot be re-alerted blindly, and a late hard bounce remains visible. See `central-email-completion-plan.md` and `central-email-operations.md`. This local implementation does not close the hosted notification, Stripe, protected-access, fallback or historical index acceptance gaps recorded here.

September 7 follow-up: `d31760a` is now deployed to shared development; all four historical email index definitions were recovered from the original deployment receipt, restored additively and verified in the live schema. The index blocker below is therefore resolved at index-definition scope; historical document validators remain unknown. One explicitly authorized synthetic operator email traversed the central outbox/hosted worker; Postmark reports Delivered, quota 1/1, and the operator supplied a Gmail screenshot confirming visible inbox receipt. It created no commerce incident and does not close the actual commerce incident→email, provider-webhook, Stripe, fallback or protected-access acceptance gaps. The global commerce email channel remains disabled and the acceptance configuration was removed after proof.

## User Story

As a buyer, a completed payment gives me the correct access or an identifiable support case. As the operator, I can find, own and resolve every blocked purchase, including cases without a known user and cases whose retries are exhausted.

## Minimal Behavior Contract

Verified payment grants exactly the bound purchase. Partial successful refunds preserve access; full cumulative successful refunds remove it. An open dispute suspends that purchase. A won or closed warning dispute removes only its own blocking reason; lost disputes and other blocking reasons remain effective. Duplicate or unordered delivery never rewrites received evidence. Unresolved events create visible, owned, auditable incidents with bounded recovery. Return URLs never prove payment or entitlement.

## Success Behavior

One purchase grant, no cross-purchase revocation, safe restoration after dispute closure, stable replay, successful controlled recovery and an auditable operator resolution. The buyer checks actual account access and has a support path while verification is pending.

## Error Behavior

Invalid signatures are rejected. Dependency failures are retryable. Unbound identity/payment/offer data never grants access and produces a durable incident when a verified event is available. Terminal retry exhaustion escalates rather than disappearing. Alert delivery failure remains visible and retryable. A missing webhook can be recovered only from authenticated Stripe evidence with environment and purchase binding rechecked; an operator cannot supply an arbitrary granting envelope.

## Problem

Before this change, disputes were irreversible revocations, refund normalization depended on mutable charge.amount_refunded, and recovery had five total attempts but no operational queue or exhaustion workflow. The success page overstated payment/access proof.

## Solution

Retain immutable provider snapshots and their payload digest. Add explicit refund/dispute facts to the existing receipt contract and derive purchase access from eligible facts. Preserve legacy terminal events conservatively. Extend the existing admin authorization pattern with a commerce incident queue, bounded actions, durable alerts and provider-event reconciliation. Use existing UI tokens and account/admin navigation.

## Scope In

Stripe checkout lifecycle, receipts, refund/dispute state, purchase entitlements, admin incident handling and alerts, safe replay/reconciliation, buyer feedback, synthetic tests and operator documentation.

## Scope Out

Historical migration; unrelated identity/email architecture; real messages, provider configuration, hosted database writes, deployment and commercial opening in this local stage.

## Constraints

Work in the existing commerce worktree. Preserve unrelated work. Keep schemas additive and legacy receipts readable. Server-side bridge secret and admin identity checks remain mandatory. No raw webhook, customer email or secret in operational alerts. No manual license grant/revoke shortcut for a commerce incident.

## Test Contract

Run local Vitest commerce/bridge/admin tests, Convex TypeScript, Astro check and governance metadata lint. Fixtures and mocked provider/transport calls only. Hosted checklist must later prove signed delivery, authentication, protected access, alert receipt/failure and app refresh. Local tests do not fulfill hosted acceptance.

## Dependencies

Existing server-owned commerceCheckoutHandoffs and PaymentIntent binding; receipt ledger; admin authentication; installed Stripe SDK and convex-test. Alert transport configuration is a deployment prerequisite, never inferred from newsletter configuration.

## Invariants

- Receipt identity is provider + environment + event ID; the same verified payload reuses its original envelope.
- Only a paid Checkout Session matching the server handoff establishes the payment binding.
- Refund/dispute facts operate on that payment and purchase only.
- Failed/pending refunds do not count as successful refunds; distinct refund IDs count once.
- Closed disputes beat stale open events; contradictory terminal evidence requires review.
- Legacy/manual terminal revocations are not undone by a new dispute closure.
- Resolution cannot change a receipt envelope, overwrite identity, reset retry counters or bypass signatures.

## Links & Consequences

The Astro webhook and Convex bridge remain one purchase flow. Product entitlement snapshots and formation gating consume the same authoritative rights. Admin operations reuse Clerk/server and Convex role checks. Existing compatibility entrypoints use the same processor.

## Documentation Coherence

Update payment-activation-entitlements.md and stripe-managed-payments.md. The scenario matrix is [commerce-launch-scenarios.md](../../technical/commerce-launch-scenarios.md); the operator runbook documents alert/reconciliation steps. Correct purchase return copy.

## Edge Cases

ZOMBIES: zero/no webhook; one/multiple purchases; repeated partial refunds; boundary full refund and retry limit; malformed or foreign evidence; stale/equal-time events; concurrent delivery/recovery; missing user; failed alert; disabled browser JavaScript. No bulk migration is required.

## Implementation Tasks

1. Extend provider evidence and the receipt processor; verify signed parser-to-ledger fixtures, refund totals, disputes and replay permutations.
2. Add operator queue, durable alerts and authenticated evidence recovery; verify auth, pagination, attempt conflicts, exhaustion, alert retry and environment isolation.
3. Correct buyer feedback and add scenario/runbook evidence; run combined focused suites, type checks and metadata lint.

## Acceptance Criteria

- Every matrix row states expected rights, buyer feedback, treatment, proof and error exit.
- Partial then full refunds and old-event replay produce no binding conflict and no double counting.
- Won/closed-warning disputes restore only a previously paid, otherwise unblocked purchase; lost/multiple disputes and full refunds prevent restoration.
- Every pending incident is listable without an owner identity; operator claim/escalation/recovery are audited and stale writes rejected.
- Exhausted cases have an explicit evidence-based recovery or linked terminal resolution, never a silent reset.
- Alert configuration/delivery failures are visible; hosted launch checklist requires actual receipt by the operator.
- No webhook recovery accepts arbitrary customer-supplied event data.

## Test Strategy

Exercise receipt and entitlement state through Convex mutations, signed Stripe fixtures through the adapter and route, operator APIs with unauthorized/admin identities, and transport actions with mocked HTTP. Run regression suites for checkout and bridge consumers. Keep hosted/auth/browser claims pending unless actually proved.

## Risks

Ordering and partial external failure can cause unsafe restoration: derive from immutable qualified purchase facts. Old receipts are conservative and require explicit evidence. Schema deployment and notification transport are not activated by local tests. OWASP Security Gate: server authorization (A01), configuration (A02), integrity (A08), logging/alerting (A09), exceptional conditions (A10); test identity/environment isolation, replay/concurrency and failure recovery. This is scoped evidence, not full OWASP certification.

## Execution Notes

First reads: providers/stripe.ts, convex/commerceProcessor.ts, convex/commerceEventContract.ts, convex/licenseAdministration.ts, admin/licenses API. Current branch codex/unified-commerce-entitlements was clean at start. Main thread owns integration. Stop only on material expansion or missing external authorization.

## Execution Batches

- Batch A, main thread: provider adapter/types/webhook, commerceEventContract.ts, commerceProcessor.ts, schema.ts, bridge.ts and generated API integration; commerce lifecycle tests.
- Batch B, delegated after interfaces are fixed: new commerceOperations module/API and tests, admin commerce panel, buyer return copy and operator runbook. Do not edit Batch A files; request integration changes from main.
- Dependencies: agree receipt optional fields and exported retry helper first; B may work independently after that boundary. Main integrates schema/API exports and runs all combined checks. No hosted actions or actual alert sends in either batch.

## Open Questions

Hosted test-mode acceptance and progressive commits were authorized on 2026-09-06. Resolve the declared test configuration and operator alert destination from provider evidence; never infer production authority.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
| --- | --- | --- | --- | --- | --- |
| 2026-09-06 | sg-development | GPT-6 | Formalized approved commerce rules and bounded local proof. | reviewed | Readiness review and implementation. |
| 2026-09-06 | 101-sg-ready | GPT-6 | Checked purchase isolation, provider evidence, failure exits and non-overlapping write batches against current code. | ready for local implementation | Implement both batches and run combined checks. |
| 2026-09-06 | sg-development | GPT-6 | Implemented immutable financial facts, purchase rights reduction, operator cases, alert outbox, missing-webhook surveillance, evidence recovery and buyer copy. Independent review fixes cover legacy audit provenance and contradictory dispute outcomes. | 244 synthetic tests, Convex TypeScript and Astro checks passed; metadata lint passed. | Hosted test-mode acceptance requires separate authorization. |
| 2026-09-07 | sg-development | GPT-6 | Resolved Windows Mastery to a 49 EUR tax-inclusive reference price with Stripe local-currency presentation, created and configured the Stripe test product, wired the Preview price ID, aligned buyer and legal copy, and exercised authenticated Checkout creation. | Astro check passes with zero errors. Stripe created a 49 EUR Managed Payments session with adaptive pricing, automatic tax and the eligible written-course tax code. Preview `dpl_6RJ2TzXKcftPJdmh27wn3ngTQu1i` is Ready. | Complete the prepared test payment after explicit transaction confirmation, then prove webhook receipt, entitlement grant, buyer email and refund/revocation. |

## Current Chantier Flow

### Windows Mastery offer checkpoint — 2026-09-07

The operator confirmed the 49 EUR tax-inclusive reference-price direction. Stripe account `Diane Defores`, explicit test environment, now contains product `prod_VDb2eWi1byBlBL` and one-time EUR price `price_1UD9qKKGNKOAEalik9dns8bY`. Product tax code `txcd_20060358` classifies the current static written course and is marked eligible for Managed Payments. Adaptive Pricing is enabled for Checkout and the resulting session reports adaptive pricing, automatic tax with Stripe liability, 49 EUR total, test mode and an open unpaid state.

Vercel Preview now has `STRIPE_COMMANDGLOWS_FORMATION_PRICE_ID`; no secret value was printed. The first authenticated attempt reached Stripe but returned HTTP 400 because the initial generic services tax code was not Managed Payments eligible. After applying the course tax code, Stripe returned HTTP 200 and created the hosted Checkout session. The direct Stripe page rendered the Windows Mastery offer, 49 EUR tax-inclusive total, email, card and billing fields. A Chrome extension blocks the automatic cross-origin redirect after the application POST with `ERR_BLOCKED_BY_CLIENT`; opening the unmodified Stripe Checkout URL in a clean task tab succeeds. This is browser-profile evidence, not a reproduced failure for ordinary customers.

Buyer-facing French and English offer copy and sales terms now use the EUR reference price and disclose Stripe local-currency presentation. Astro check reports zero errors. Preview deployment `dpl_6RJ2TzXKcftPJdmh27wn3ngTQu1i` is Ready at `https://commandglows-1f8p8pplh-diane-ds-projects.vercel.app`. The test checkout is prepared with Stripe's standard test card and the authorized recipient address; final payment submission remains intentionally unperformed pending explicit transaction confirmation. Webhook receipt, entitlement grant, buyer email, refund and revocation therefore remain unproven.

During deployment, the worktree initially lacked the existing Vercel project link and the CLI created separate project `commandglows_site`, first deployment `dpl_J6yqsRJPP8Sr5eiNXyXpPb3EpFXo`, aliased at `https://commandglowssite.vercel.app`. The worktree was then relinked to existing project `commandglows` and the intended Preview was deployed there. The accidental project is retained for inventory-first cleanup; deletion is not implied by this checkpoint.

### Hosted continuation evidence — 2026-09-06

At 23:26 Europe/Paris, browser evidence confirmed Vercel login. CommandGlows itself redirected to sign-in but rendered no form: Clerk JS/UI failed to load from the declared test FAPI `stirred-elf-25.clerk.accounts.dev`, absent from CSP script-src. The narrow fix adds that exact existing instance host, preserving all other directives and avoiding a development-host wildcard. The focused deployment CSP test passes. [Clerk's CSP contract](https://clerk.com/docs/guides/secure/best-practices/csp-headers) requires the application's FAPI host in script-src. Commit `f6cf95d2ab3ae3bbf42a2929f2173dc54aa70e24` deployed READY as `dpl_5cjTkZS3736mi9asNa4UN2DtKFKs` at `https://commandglows-jual622ip-diane-ds-projects.vercel.app`. The sign-in form subsequently rendered in development mode and the operator completed login. The authenticated dashboard and administrator licences page both loaded successfully.

- Commerce checkpoint `4f4e4fb19feaae1a8b1b0189ea865a325ab14d8d` committed and pushed on `codex/unified-commerce-entitlements`; Vercel deployment `dpl_53NmnVtfz1GLuUZCf1oZtKsQdc6i` READY at `https://commandglows-28lz335ua-diane-ds-projects.vercel.app`.
- Provider configuration identifies the existing preview backend as `beaming-cow-328`, Convex deployment type `dev`, runtime commerce environment `preview` (normalized sandbox). Clerk publishable and server keys report test mode. Vercel keeps sensitive Stripe and bridge values out of local `env run`; their absence there does not mean absence in the hosted runtime. No secret was printed or copied into source.
- The first backend deployment exposed shared-dev drift: it removed four legacy indexes on `emailConsentEvents` and `emailSubscriptions`. Both tables were subsequently queried with a one-row bound and were empty. No data deletion command or import ran. Their previous schema is absent from available repository history; exact legacy-index restoration is **not** claimed.
- To retain current versioned Postmark functionality alongside commerce, integration branch `codex/commerce-hosted-integration` merges the existing Postmark checkpoint `3cb5d79` and commerce `4f4e4fb`. Merge `d973594e840c6e7c36ea05e15f21ccf83d4743dd` is committed/pushed. The email source files are unchanged from that checkpoint; the schema spreads and both crons coexist. Convex TypeScript and 184 tests across 16 commerce/email suites pass. This is a separate integration branch, not a production promotion.
- The integration backend is deployed. Function metadata confirms commerce operations/alerts and Postmark functions present. Vercel integration deployment `dpl_DG1vwtdxxeFBMTuCyN6A3paqL87h` is READY at `https://commandglows-r605ib4nk-diane-ds-projects.vercel.app`, matching `d973594`.
- Hosted commerce API rejects a signed-out request with HTTP 401 and `Cache-Control: no-store`; the Stripe webhook rejects an invalid signature. These checks use Vercel's authenticated CLI access to the protected preview and do not establish application login.
- The scheduled watchdog advanced its checkpoint on two observations and opened three `checkout_verification` cases from existing old development handoffs. They remain unverified payments, without receipt or grant. The authenticated administrator console subsequently showed all three cases with exhausted notifications after five attempts and `alert_channel_not_configured`. Each remains visible, unassigned, with an explicit deadline and payment-not-verified status. Opening a case displayed its watchdog audit record, claim/escalation/notification-retry actions and evidence-based recovery instructions; unsafe receipt retry and closure were disabled. No operator mutation was performed in this browser check. No actual notification was sent. The email poll is disabled because EMAIL_CONTROL_CONFIG is absent.
- Browser proof now confirms Clerk application login, administrator access and incident list/detail rendering. The operator alert destination/on-call owner is still unanswered. A separate Stripe test-dashboard tab redirects to Stripe sign-in, which requires the operator. Stripe key mode, real test payment/refund/dispute events, payment-linked protected access, alert reception and final recovery remain unverified. Administrator access does not establish a paid entitlement.
- Before another backend deployment, capture the live schema, indexes, function list and cron inventory and compare the exact planned deployment. A Vercel branch preview does not isolate a shared Convex dev backend. Historical empty-table index drift remains explicitly open for reconciliation; do not overwrite it with invented schemas or claim full restoration.

2026-09-06 continuation: the operator approved hosted test-mode acceptance and progressive commits. The previous local-only boundary below records the completed local stage; this continuation now owns scoped Git delivery, hosted target/configuration verification and the acceptance checklist. Commercial opening and production mutations remain outside scope.

Local implementation and synthetic checks are complete. Files remain local on codex/unified-commerce-entitlements; no remote delivery or deployment is claimed. Hosted notification reception, surveillance, authentication, protected access and commercial opening remain separate and unverified. Local DOM tests do not prove rendered or authenticated browser behavior.

Convex API declarations were regenerated offline with the installed official code generator template. No deployment configuration or secret was inferred. Standard deployment-backed codegen was unavailable without CONVEX_DEPLOYMENT.

The direct design drift command stops on Windows CRLF conversion of immutable baseline bytes. The scoped guard passed in an isolated temporary snapshot: current changed source bytes, unchanged policy, and each immutable baseline verified against both HEAD and its declared SHA256 before copying its canonical Git bytes. Seven changed source files were scanned with zero findings. The checkout's baseline files and guard policy were left unchanged. Astro and DOM checks are separate passing evidence; rendered and authenticated hosted validation remain pending.

## Auth0 migration continuation — approved 2026-09-07

### Superseding operator direction — Clerk retained

Clerk hosted login subsequently succeeded through the operator's existing Google
session on the j3o9panne preview. Protected dashboard and canonical administrator
licences/commerce console both rendered successfully. The sandbox queue shows
three overdue escalated missing-checkout cases, each with exhausted notification
cycles (`alert_channel_not_configured`, five attempts per cycle). Opening a case
shows its payment remains unverified and receipt processing attempt count is zero:
notification exhaustion is not payment-processing exhaustion. Its audit history
contains watchdog opening and deadline escalation. These observations prove current
admin access and visible watchdog escalation, not payment fulfillment or human
alert reception. The operator notification destination is still unconfirmed.

Hosted acceptance follow-up: preview `commandglows-j3o9panne-diane-ds-projects.vercel.app`
is Ready. The cancellation response contains the corrected uncertainty statement
and purchase-recovery link. Anonymous commerce API returns HTTP 401 `auth_required`
with `Cache-Control: no-store`; protected licences redirects to sign-in and the
Clerk development widget renders. Browser automation is available again. The
operator login tab is retained for handoff. Stripe dashboard access is verified
on the Diane Defores account in explicit test mode; this alone does not establish
that the deployed API credential belongs to that account. No test payment was
created in this follow-up. Remaining proof gates:

| Gate | Current evidence / missing proof |
| --- | --- |
| Clerk buyer/admin | Widget and anonymous denial verified; current-preview authenticated account and admin queue pending |
| Stripe binding | Test dashboard reachable; match a real checkout/session from this deployment before financial scenario actions |
| Payment/access | Paid, declined, abandoned and delayed flows still require hosted receipts and protected-access checks |
| Refund/dispute | Partial then full refund and won/lost dispute transitions require provider-backed events and access checks |
| Incident recovery | Ownership, exhaustion, verified recovery and watchdog coverage require hosted acceptance |
| Alert reception | Operator destination remains unconfirmed; no outbound message sent |

Commercial opening remains blocked by these gates. Local passing tests are not
substituted for the missing provider, authenticated or human-reception evidence.

The operator subsequently suspended the Auth0 switch and explicitly requested
completion of hosted commerce acceptance with Clerk. Auth0 code remains dormant;
its activation is not a prerequisite for this acceptance. No paid Auth0 plan or
tenant creation is authorized by this continuation.

Acceptance resumed against preview `commandglows-52ucelzrh-diane-ds-projects.vercel.app`.
Anonymous `/dashboard/licences` redirects to Clerk sign-in with its return path.
The operator's older preview has a displayed signed-in dashboard, which is not
evidence for this newer deployment. Current-preview login and the destination for
actual alert delivery have been requested and remain pending. Browser automation
then repeatedly timed out, preventing further interactive Stripe/access proof.
The resumed local regression run passes 271 tests in 32 suites. A cancellation-page
copy defect was repaired: a browser cancellation return no longer asserts that no
payment occurred, and now offers account/support recovery before another payment.

The operator explicitly approved replacing the CommandGlows site login with Auth0,
keeping the authentication provider replaceable, preserving internal accounts and
purchases, and committing verified milestones. This continuation belongs to this
launch-readiness chantier; it does not authorize production activation.

### Objective and scope

Use Auth0 for the Astro site's sign-in, callback, session, logout, dashboard,
admin and checkout surfaces behind a project-owned authentication interface.
CommandGlows global users, commerce receipts and entitlements remain authoritative.
ContentGlows is the verified implementation reference; CommunityGlows currently
uses Convex Auth. Flutter application migration is a separate surface and is not
silently included in the site migration.

### Decisions and safeguards

- Provider SDK types stay inside adapters. Product code consumes a verified
  application identity and the canonical global user ID.
- An external OIDC identity is keyed by verified issuer and subject, never email.
- Existing Clerk identities, purchases and admin assignments are preserved.
  Linking requires proof of both identities or an explicitly audited recovery;
  matching email alone never authorizes a merge or access restoration.
- The existing ContentGlows adapter keys Auth0 accounts by subject only. Do not
  reuse that lookup across issuers without verified legacy issuer provenance.
- No production tenant is inferred from a development-looking tenant name.
- Capture and reconcile shared backend schema/index/function/cron inventory before
  deployment. The historical email indexes were restored and verified September 7; refresh live parity before any further shared deployment.

### Execution batches

1. Extract the existing verified checkout identity lookup into a provider adapter;
   preserve current behavior and add regression tests. Commit this safe foundation.
2. Implement Auth0 login/callback/session/logout and issuer-aware identity mapping,
   including existing-account linking and server-owned administrator resolution.
3. Replace coupled Clerk consumers, update operational/configuration docs, and
   verify wrong-account, missing rights, expired session and logout recovery.
4. Validate the exact declared test configuration and hosted callback/login/access,
   then resume the Stripe and operational alert acceptance scenarios above.

### Proof and readiness

The first extraction is ready: its boundary and current behavior are visible in
checkout/start.ts and bridge:getCheckoutIdentityByClerkAccount. It requires no
provider or backend mutation. Later activation remains gated on exact Auth0 test
application configuration and safe account linkage. Required tests cover anonymous
and unmapped checkout, canonical ID handoff, provider errors, issuer isolation,
invalid/expired tokens, state/nonce/PKCE, redirect allowlists, logout, administrator
and paid/unlicensed authorization. Hosted login is distinct from backend acceptance
and paid access. Rollback retains the previous login until the replacement passes.

### Current migration state

2026-09-07: source audit complete; approved migration contract recorded. No Auth0
site login or provider configuration change is claimed. Commerce acceptance stays
open until the replacement authentication and remaining payment/alert proofs pass.

2026-09-07 foundation implemented: checkout resolves its canonical global user
through an AccountIdentityAdapter; the transitional Clerk adapter contains provider
identity handling and rejects malformed mappings. Backend failure returns a safe
503 with retry guidance and never creates checkout. Thirteen focused adapter and
checkout tests pass. Auth0 session/callback and account linkage are still pending;
this checkpoint does not switch authentication or deploy Convex.

2026-09-07 implementation: three bounded subagents implemented/reviewed OIDC
sessions, canonical identity/authority and UI/routes. The site now has project-owned
session consumers, explicit existing-account recovery and dual-control linking,
server-revocable login attempts, environment-scoped account/access resolution,
canonical admin/feature/checkout authority, same-origin mutation checks and safe
failure exits. Legacy Clerk remains the default selector until Auth0 configuration
and hosted proof are available; no completed Auth0 login is claimed.

329 tests across 39 suites passed; Astro checked 284 files with zero errors and
zero warnings, plus the existing ScriptInstallPage hint. Additional recovery page
and session tests passed subsequently. Standard Convex code generation and backend
TypeScript passed. See technical/site-authentication.md for activation/rollback.

Live dev predeployment inventory captured through the official Convex CLI/MCP:
31 declared existing tables; no removed table/index in the normalized schema diff;
only identityAccounts changes and new siteLoginAttempts. Existing crons verified:
commerceAlerts:sweep every 300 seconds and emailDelivery:poll every 60 seconds,
with the email poll currently disabled. Planned cleanup cron is additive. Auth0
CLI login is awaiting the operator; no tenant/application configuration inspected
or modified in this continuation. Hosted activation remains pending.

Final review added protected-page revalidation on browser restoration, focus and
other-tab logout/link signals, with stale-response cancellation. The site identity
namespace is isolated as site:auth0; a regression calls the actual ContentGlows
bridge with the same subject and proves it cannot adopt a site account. The
transitional checkout-only adapter was superseded by the complete site session
boundary and removed. Design drift scan passed: 33 source files, zero findings,
using unchanged policy and verified canonical baseline bytes in an isolated snapshot.

### Hosted Stripe test checkpoint — 2026-09-08

The operator authorized and completed one Stripe test purchase of Windows Mastery
for 49.00 EUR, including 8.17 EUR VAT, using the dedicated private test recipient.
Stripe recorded the Checkout Session as complete and paid, with Managed Payments
and Adaptive Pricing enabled. The session carried the expected preview environment,
canonical global-user, offer, product and plan metadata.

The first fulfillment attempt exposed a provider configuration gap: the Stripe test
account only had an unrelated legacy WooCommerce destination, so CommandGlows had
received no event. A dedicated active test destination now targets the stable Vercel
branch alias and listens to the ten required checkout, refund and dispute events.
Its signing secret is stored as a Vercel Preview secret. Vercel Authentication then
returned 401 before the route; the destination now uses an authorized existing
Protection Bypass for Automation query parameter while keeping the Preview protected.

Exact replay of Stripe event `evt_1UDAOoKGNKOAEali1Jb14ngQ` then returned HTTP 200.
Convex recorded one applied receipt with status `granted`, resolved the purchase,
and created one active sandbox entitlement for `commandglows_formation`, plan
`formation`. A second replay left the same single receipt and entitlement in place,
proving idempotent fulfillment for this event. This proves the hosted test path from
paid Stripe Checkout through signed webhook processing to backend entitlement.

The buyer then signed in with the canonical account attached to the Checkout handoff.
Direct navigation to the protected module rendered `LECON DEBLOQUEE` and the complete
Windows lesson rather than the public excerpt. This completes the hosted signed-in
access proof for the successful-card scenario.

Commercial opening remains blocked on production provider activation, buyer receipt
observation, and the remaining decline, abandonment, delayed-payment,
refund, dispute, alert and recovery scenarios required by this specification.
