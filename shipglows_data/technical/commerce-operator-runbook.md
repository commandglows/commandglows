---
artifact: technical_guidelines
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: commandglows
created: "2026-09-06"
updated: "2026-09-06"
status: reviewed
source_skill: sg-development
scope: commerce-operations
owner: Diane
confidence: high
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems: [Stripe, Convex, Clerk]
depends_on: [shipglows_data/workflow/specs/commerce-launch-readiness.md, shipglows_data/technical/payment-activation-entitlements.md]
supersedes: []
evidence: [commandglows_site/convex/commerceOperations.ts, commandglows_site/convex/commerceAlerts.ts, commandglows_site/src/pages/api/admin/commerce.ts]
next_step: "Validate the hosted test-mode operator channel, authentication, scheduled surveillance and recovery before commercial opening."
next_review: "2026-10-06"
---

# Commerce operator recovery

## Responsibility and evidence

The commerce on-call operator owns unassigned cases. Before opening sales, name the person covering that duty and the backup in the operational rota. During coverage, keep the administration queue available and acknowledge incoming alerts. Claiming a case records the authenticated administrator, a four-hour deadline and an audit action. Administrators may supply a shorter or longer deadline through the API, bounded to seven days. A deadline is an internal triage target, not a customer-facing refund or delivery promise.

Open `/dashboard/licences` with an existing Clerk account whose canonical Convex user role is `admin`. The commerce panel and API require both the trusted server identity and the canonical admin check. Customer identity is not required to list an incident. Do not share bridge credentials or copy a buyer's raw payment data into notes.

Queue state and access state are independent. An externally resolved support case does not rewrite the receipt, reset attempts, grant a license or revoke access. Resolve only after the buyer's outcome has actually been handled; retain the non-secret ticket or provider evidence reference so the backup operator can verify it.

## Alert and watchdog configuration

`COMMERCE_ALERT_WEBHOOK_URL` is a server-side Convex environment value pointing to an operator-controlled HTTPS notification receiver. No default recipient or newsletter service is inferred. The receiver must deliver to the named on-call operator and deduplicate `deduplicationKey` / `Idempotency-Key`. Configure its destination and credentials through the deployment's authorized secret workflow; never place the URL or credentials in client code, a document or a test fixture.

The payload contains only the incident ID, environment, phase, queue state, attempt count, whether someone owns the case, deadline and the console path. It excludes buyer email, customer/payment objects, freeform notes and secrets. HTTP redirects are refused. Each call times out after eight seconds. A delivery cycle has at most five attempts with bounded backoff. A successful HTTP response means **transport accepted**, not that a human read the alert.

Every opening, escalation and closure creates a durable outbox entry. A mutation schedules delivery atomically. The five-minute Convex watchdog recovers interrupted delivery leases, escalates overdue cases and scans older checkout handoffs. An unconfigured channel, rejected HTTP response, transport failure or exhausted delivery remains visible in the case. After fixing the channel, use **Relancer la notification** with a reason. This creates a fresh audited delivery cycle and retains the earlier failed cycle.

If alerts fail or the watchdog's last scan is more than fifteen minutes old, the on-call operator must monitor the queue and Stripe manually, notify the backup through the established operational channel, and repair the deployment or delivery receiver. Do not open commerce while neither automatic delivery nor the documented human fallback is functioning.

## Missing webhooks and incomplete checkout finalization

The watchdog inspects fifty handoffs per tick and stores a pagination checkpoint with stable query bounds. It eventually covers all pages, rather than silently truncating at the first page. It considers handoffs whose token expired more than thirty minutes ago. This is a detection threshold, not proof of payment. Monitor backlog size and scan progress at hosted acceptance; a sustained intake beyond six hundred handoffs per hour needs a separately reviewed scan capacity change.

A handoff without a paid receipt or a verified failed/expired checkout receipt becomes a deduplicated **Paiement non vérifié** case, with ownership, deadline and alert. Its `checkout:` reference is an internal case key, never a Stripe `evt_` identifier. Expected checkout failures/expirations are excluded. A pending asynchronous checkout can become an aged verification case; do not charge the buyer again or grant access merely because time has elapsed.

1. Find the exact Checkout Session in Stripe using its `cs_` reference or the existing handoff `source_ref`. Check the provider's payment/session state and metadata against the server-owned purchase and intended environment. Do not bind accounts by email.
2. If the handoff remained `claimed` after a completed Stripe session, enter the exact session ID in **Vérifier et réparer le rattachement** with the verification reason. The server retrieves it from Stripe and validates mode, completion, offer, product, global user, purchase reference and existing session uniqueness. A real checkout URL is checked when present; a completed session with no URL does not cause a fabricated URL. This repair does not bind a PaymentIntent or grant rights.
3. Find the original Stripe event ID and use **Vérifier et récupérer l’événement**. The server retrieves it through authenticated Stripe API access, normalizes it using the shared adapter and applies the same receipt processor. Browser-supplied identity, product, amount, environment or granting envelope is not accepted.
4. A new paid receipt replaces the checkout uncertainty case. If fulfillment is still pending, the separate receipt incident remains active. A verified failed/expired checkout closes the uncertainty case without granting rights.
5. If payment was not made or an external refund/support resolution handled the buyer, document and close the support case with a verifiable reference. If the evidence is unavailable, escalate and retain ownership. Event retention limits or missing historical evidence never authorize fabricated events or a bulk migration.

## Existing receipt recovery

Open the case, inspect its reason, claim ownership, and record the concrete repair. Add no secret, card details or full customer email to the reason.

| Situation | Treatment and error exit |
| --- | --- |
| Missing user, handoff completion or verified payment binding | Repair only the existing authorized identity/checkout prerequisite. Use **Vérifier la reprise**; if eligible, use **Reprendre le traitement** with the fresh version and attempt counter. |
| Invalid provider, offer, environment, account conflict or unsupported evidence | Preserve the non-granting state. Investigate and escalate; a caller cannot edit the original event or promote its classification. |
| Dependency failure before normalization | The diagnostic incident has no receipt and tracks ingress attempts separately. Recover the exact original event from Stripe after repair; only successful normalization creates the receipt. |
| Five receipt processing attempts exhausted | The case is escalated automatically. **Vérifier Stripe et effectuer l’ultime reprise** retrieves the original event and verifies its payload digest. Only an eligible unchanged receipt gets one exceptional sixth attempt. It cannot be repeated or reset. |
| Sixth attempt failed, or original provider proof unavailable | Keep the escalated case owned. Resolve through a verified provider/customer outcome and link the support reference. Escalation is not an access grant; manual license controls are not a commerce recovery shortcut. |
| Refund failed or requires action | Access may remain active while payment servicing still needs intervention. Follow Stripe's provider workflow, record the action and keep the financial case visible until success or external resolution. |
| Open dispute | Purchase access stays suspended. Attend to the dispute in Stripe. A verified won/closed-warning event removes only its own blocker; full refund, another open/lost dispute or an external revocation may still prevent access. |
| Version/attempt conflict | Another operation changed the case. Refresh the detail, inspect the audit and re-evaluate before retrying. Do not blindly repeat the stale write. |
| Alert exhausted or channel missing | Establish manual coverage immediately, fix and verify the receiver, then create an audited re-alert cycle. Preserve the failed delivery history. |

Dry-run checks eligibility only; it is not simulated successful fulfillment. Duplicate delivery returns the retained result and does not retry. Successful processor recovery closes its incident automatically. Earlier financial cases superseded by later verified facts retain their original receipt audit while the operational case closes with a reference to the new event.

## Buyer communication

The return URL does not prove payment or access. The buyer page asks them to check the actual account and offers support. During a support case, state the actual verified payment status, actual access status, responsible operator and next check time separately. Request only the necessary receipt reference through the normal support channel. Verify the intended signed-in account; do not merge identities or move an entitlement based on an email match.

## Hosted launch acceptance — separately authorized

Before a backend deployment, capture its live schema/indexes, function list and cron inventory and compare the planned source. A branch-specific Vercel preview can still share its Convex dev backend with another task. Preserve all unrelated deployed contracts or select a separately approved isolated target. The 2026-09-06 commerce continuation records a shared-dev index drift incident; its historical index restoration remains unverified.

Local tests use synthetic database fixtures and mocked Stripe/HTTP calls. They do not configure a receiver, send a real alert, deploy a schema, establish operator coverage or prove login and protected access.

- Verify the declared Clerk/Convex/Stripe test environment and the canonical admin role. Prove non-admin and signed-out denial, admin queue access, and buyer protected access independently.
- Deploy the additive schema, shared receipt processor, operations API, outbox action and cron in the authorized test environment. Verify the watchdog checkpoint advances across more than one batch and detects a deliberately withheld webhook.
- Trigger a synthetic pending receipt in Stripe test mode. Confirm the notification reaches the actual on-call operator, the operator opens and claims the exact case, and the backup can find the same audit.
- Simulate a failing notification receiver and an interrupted delivery action. Verify visible failure, bounded retries, watchdog lease recovery and the manual coverage procedure. Repair it and verify an audited re-alert arrives.
- Exercise missing webhook recovery, failed checkout-finalization repair, receipt retry exhaustion, the one verified exceptional retry, and linked external resolution. Verify wrong-account/environment evidence cannot grant access.
- Prove partial and cumulative full refunds, suspension and dispute restoration in actual protected product access, including application refresh. Verify the buyer return page never claims success from URL parameters alone.
- Check queue responsiveness, keyboard/focus/error states, narrow-screen layout, loading/empty/pagination states, and absence of sensitive data in alerts/logs. Local DOM tests are not visual or authenticated browser proof.
- Record configuration checked, service running, admin login verified, buyer login verified, protected access verified, alert accepted, alert received and fallback covered as separate evidence. Keep commercial opening blocked until all required evidence is complete.
