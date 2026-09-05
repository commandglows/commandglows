---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.1.0"
project: "CommandGlows"
created: "2026-09-04"
created_at: "2026-09-04 01:52:00 UTC"
updated: "2026-09-05"
updated_at: "2026-09-05 12:14:00 UTC"
status: ready
source_skill: sg-engineering
source_model: "GPT-5 Codex"
scope: "unified-identity-email-consent-and-delivery"
owner: "Diane"
confidence: high
user_story: "En tant qu'opératrice de plusieurs business, je veux que CommandGlows possède une vue centrale et auditable des identités, adresses email, consentements, audiences et droits, tout en déléguant la livraison à un transport remplaçable."
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - "CommandGlows Astro integration API"
  - "CommandGlows Convex identity and entitlement ledger"
  - "ContentGlows holding-page waitlist"
  - "Postmark Servers and Message Streams"
  - "Resend legacy newsletter and waitlist integrations"
  - "Clerk, Firebase and Auth0 identity bridges"
depends_on:
  - artifact: "shipglows_data/technical/architecture.md"
    artifact_version: "1.6.0"
    required_status: reviewed
  - artifact: "shipglows_data/technical/payment-activation-entitlements.md"
    artifact_version: "0.8.0"
    required_status: draft
supersedes: []
evidence:
  - "The current Convex schema already owns globalUsers, identityAccounts and productEntitlements."
  - "The current CommandGlows newsletter routes write contacts directly to Resend and send the welcome message through Resend."
  - "The current Convex resend action writes buyers directly to a Resend audience."
  - "The ContentGlows Auth0 bridge already reconciles a product identity into the provider-neutral global identity graph."
  - "Operator decision of 2026-09-03: CommandGlows owns contacts, consents, audiences and entitlements; ShipGlows governs without storing personal data."
  - "Operator decision of 2026-09-03: Postmark is the target delivery transport and remains replaceable."
  - "Operator correction of 2026-09-04: the architecture contract is exhaustive and starts from the existing identity, entitlement and email implementation."
next_step: "Configure an authorized isolated email pilot after controller and market decisions; retain Resend and do not migrate production."
---

# Unified Identity, Email Consent And Delivery

## Status

Approved target contract. It defines the complete CommandGlows control plane for identities, email addresses, consents, audiences, suppressions, entitlements and delivery events. Implementation is intentionally phased. Until a phase has matching code and proof, the existing Resend routes remain the runtime truth.

## Problem

CommandGlows already owns a provider-neutral identity graph and product entitlements in Convex, while email state is split across direct Resend integrations:

- `globalUsers`, `identityAccounts` and `productEntitlements` form the current identity/access spine;
- `POST /api/newsletter/subscribe` writes a contact to a Resend audience and sends a welcome email;
- `GET|POST /api/newsletter/unsubscribe` searches and updates the Resend contact directly;
- `convex/resend.ts` adds buyers directly to Resend;
- ContentGlows currently sends holding-page registrations to Resend independently;
- delivery, bounce, complaint and provider-suppression events are not owned centrally.

This makes the provider part of the business model, prevents a complete consent audit, and creates separate identities for the same person across products. Replacing Resend with Postmark route by route would preserve that fragmentation.

## Decision

CommandGlows is the central control plane and source of truth. Convex stores durable business state. Product applications submit authenticated events to versioned CommandGlows APIs. Postmark transports messages and reports delivery events; it does not own canonical contacts, consent, audiences or entitlements. ShipGlows governs the system but stores no personal email data.

Identity, email and entitlement belong to one coherent system, but remain separate domains:

- identity answers **who the person or provider account is**;
- an email address answers **where a message may be delivered**;
- consent answers **which optional purpose was accepted, when, where and under which notice**;
- audience membership answers **which communication program currently includes the contact**;
- entitlement answers **which product capability the person may access**;
- suppression answers **which delivery or compliance rule currently forbids sending**.

No domain substitutes for another. In particular, an entitlement never grants marketing consent and a marketing unsubscribe never disables required transactional messages.

## Existing Foundation To Preserve

| Existing surface | Preserved role | Required evolution |
| --- | --- | --- |
| `globalUsers` | Canonical person record after reconciliation | May reference verified primary email through the email domain; email remains non-authoritative for login |
| `identityAccounts` | Clerk, Firebase, Auth0 and future provider identities | Continue unique provider-account reconciliation; never use marketing state as identity proof |
| `productEntitlements` | Product access ledger | Remain independent from consent and delivery eligibility |
| `productAccessEvents` | Access and commerce audit | Do not overload with email delivery events |
| ContentGlows Auth0 bridge | Authenticated identity reconciliation | May link a previously anonymous email contact after verified sign-in |
| newsletter subscribe route | Current public signup entrypoint | Becomes a thin client of the central subscription intake |
| newsletter unsubscribe routes | Current opt-out entrypoints | Move to opaque-token central preference endpoints |
| `convex/resend.ts` | Legacy provider-side buyer subscription | Replace with internal domain mutation plus transport-independent orchestration |
| Resend audiences | Temporary runtime contact store | Migrate, reconcile and retire only after parity proof |

## Domain Model

The names below are target names. Implementation may refine naming without changing the invariants or collapsing domains.

### `emailAddresses`

One normalized deliverable address, optionally linked to a global person.

| Field | Contract |
| --- | --- |
| `emailNormalized` | Lowercase, trimmed, Unicode-domain-normalized address used for uniqueness and lookup |
| `emailDisplay` | Last verified display form; never used as a unique key |
| `globalUserId` | Optional link to `globalUsers`; absent for anonymous subscribers |
| `verificationStatus` | `unverified`, `pending`, `verified`, `disputed` |
| `verificationSource` | `identity_provider`, `double_opt_in`, `operator`, or approved migration source |
| `verifiedAt` | Server timestamp when proof was accepted |
| `status` | `active`, `quarantined`, `erasure_pending`, `erased` |
| `createdAt`, `updatedAt` | Server timestamps |

Required indexes:

- unique lookup by `emailNormalized`;
- lookup by `globalUserId`;
- lookup by verification/status for controlled maintenance.

### `emailConsents`

Append-oriented evidence for one address, business, purpose and legal notice. Corrections create new events or explicit supersession; historical evidence is not silently overwritten.

| Field | Contract |
| --- | --- |
| `emailAddressId` | Address receiving the communication |
| `globalUserId` | Optional denormalized link at event time |
| `businessId` | Allowlisted suite business identifier |
| `purpose` | `marketing`, `product_updates`, or another registered optional purpose |
| `state` | `granted`, `withdrawn`, `expired`, `superseded` |
| `noticeVersion` | Exact privacy/consent notice version shown |
| `source` | Registered surface such as `contentglows_holding_page` |
| `occurredAt` | Client-claimed occurrence time, bounded by server policy |
| `recordedAt` | Authoritative server receipt time |
| `proof` | Minimized structured proof: locale, form/version and approved campaign metadata |
| `idempotencyKey` | Product-scoped replay key |
| `supersedesConsentId` | Optional explicit predecessor |

Current consent is derived from the newest valid event for the tuple `(emailAddressId, businessId, purpose)`. Provider contact state is never authoritative.

### `emailAudiences`

Registered communication programs controlled by CommandGlows.

| Field | Contract |
| --- | --- |
| `businessId` | Owning business |
| `audienceKey` | Stable machine identifier, unique inside the business |
| `name` | Operator-facing label |
| `purpose` | Required consent purpose |
| `defaultLocale` | Fallback locale |
| `status` | `draft`, `active`, `paused`, `retired` |
| `transactionClass` | `broadcast` only for consent-based audiences |

Audience keys arrive from an allowlist; public clients cannot create audiences dynamically.

### `emailAudienceMemberships`

Current operational membership derived from valid consent and audience policy.

| Field | Contract |
| --- | --- |
| `emailAddressId`, `audienceId` | Unique membership tuple |
| `status` | `subscribed`, `unsubscribed`, `suppressed`, `pending_confirmation` |
| `locale` | Preferred supported locale |
| `source` | Latest qualifying source |
| `joinedAt`, `leftAt`, `updatedAt` | Server timestamps |
| `consentId` | Consent evidence supporting the current state |

Membership is a projection, not legal evidence. It can be rebuilt from consent and suppression records.

### `emailSuppressions`

Canonical prohibition or caution independent from consent.

| Field | Contract |
| --- | --- |
| `emailAddressId` | Suppressed address |
| `scope` | `global`, `business`, `stream`, or `audience` |
| `scopeRef` | Business, stream or audience identifier when required |
| `reason` | `hard_bounce`, `spam_complaint`, `manual`, `legal`, `invalid`, `provider_block` |
| `status` | `active`, `resolved` |
| `provider` | Optional reporting provider |
| `providerEventId` | Optional deduplication reference |
| `createdAt`, `resolvedAt` | Server timestamps |

A spam complaint or legal suppression blocks all optional messages in its scope. Resolution requires an explicit audited action; a new signup does not silently clear it.

### `emailDeliveryEvents`

Immutable normalized provider and orchestration events.

| Field | Contract |
| --- | --- |
| `provider` | Initially `postmark`; `resend` accepted during migration |
| `providerEventId` | Provider idempotency key |
| `messageId` | Internal CommandGlows message identifier |
| `emailAddressId` | Recipient reference, not raw email |
| `businessId`, `streamClass` | Ownership and transactional/broadcast classification |
| `eventType` | `queued`, `submitted`, `delivered`, `delayed`, `bounced`, `complained`, `opened`, `clicked`, `suppressed`, `failed` |
| `occurredAt`, `recordedAt` | Provider and server timestamps |
| `reasonCode` | Normalized safe reason |
| `providerMetadata` | Strictly allowlisted, size-bounded diagnostic metadata |

Raw provider payloads are verified before normalization and are not retained by default.

### `emailRequests`

Replay and orchestration ledger for every accepted subscription or send command.

| Field | Contract |
| --- | --- |
| `clientId`, `idempotencyKey` | Unique caller-scoped tuple |
| `operation` | `subscribe`, `unsubscribe`, `send_transactional`, `send_broadcast` |
| `requestDigest` | Digest of normalized semantic input |
| `status` | `accepted`, `completed`, `rejected`, `retryable_failure`, `permanent_failure` |
| `resultRef` | Stable internal result identifier |
| `createdAt`, `updatedAt`, `expiresAt` | Audit and bounded replay window |

Reusing a key with a different digest returns `409 idempotency_conflict`. Reusing it with the same digest returns the original semantic result.

### Configuration registries

The system also requires non-PII configuration for:

- `businessId` registry and active status;
- audience allowlist and consent purpose;
- permitted client-to-business relationships;
- sender identities and verified domains;
- transport routing (`businessId` to Postmark Server; stream class to Message Stream);
- consent notice versions and effective dates;
- retention policies and operational quotas.

Secrets remain environment-managed and are referenced by configuration keys, never stored in these tables.

## Identity Reconciliation

### Anonymous-first contact

1. A product submits a signup with no authenticated global identity.
2. CommandGlows normalizes/upserts `emailAddresses` with `globalUserId` absent.
3. It records consent and audience membership.
4. If double opt-in applies, membership remains `pending_confirmation` until the opaque token is redeemed.
5. A later verified Clerk, Firebase or Auth0 bridge may link the address to `globalUsers`.

### Authenticated contact

The product bridge proves the provider subject. CommandGlows resolves `identityAccounts → globalUsers`. A provider-verified email may be linked only under the provider verification policy; an arbitrary client-provided email is never sufficient.

### Collision and merge

If a verified identity claims an address already attached to another global person, the system marks the address `disputed` and does not auto-merge people. Operator-assisted reconciliation must preserve both identity histories, consent evidence, entitlement rows and an audit record.

If the address is anonymous, verified identity proof may attach it atomically. Audience and consent history remain on the same `emailAddressId`.

### Address change

Changing the primary identity email never rewrites old consent evidence. A new address record is created or linked. Marketing consent does not transfer between addresses without an explicit policy and evidence. Entitlements remain attached to `globalUserId`, not the email address.

### Erasure

Erasure removes or irreversibly anonymizes personal address data according to retention policy while preserving the minimum non-identifying audit required for legal, security and financial records. Entitlements and commerce retention follow their own policy.

## Consent And Eligibility Rules

Before any send, CommandGlows evaluates:

1. registered active business and sender configuration;
2. known active address;
3. message classification;
4. required consent and current audience membership for optional messages;
5. applicable global/business/stream/audience suppression;
6. template and locale availability;
7. per-client and per-business quotas;
8. idempotency and duplicate-send controls.

Transactional messages require a documented service relationship or operation, not marketing consent. They must contain only content necessary for the transaction or product operation. Promotional content forces `broadcast` classification.

Marketing and product-update messages require the configured positive consent. Silence, account creation, purchase or entitlement never implies consent.

## Versioned Integration API

All external product contracts live under `/api/v1/email/*`. Breaking changes require `/api/v2`; additive optional fields may extend v1.

### Authentication envelope

Product-to-CommandGlows calls use a dedicated server-side credential bound to a `clientId` and allowlisted `businessId`. Browser clients never receive this credential. The route accepts:

- `Authorization: Bearer <server credential>`;
- `Idempotency-Key: <opaque 16..128 character key>`;
- `Content-Type: application/json`;
- optional `X-Request-Timestamp` and `X-Request-Signature` when signed requests are enabled.

Credentials are rotatable independently per product/environment. Production and non-production credentials, data and Postmark Servers remain separated.

### `POST /api/v1/email/subscriptions`

Creates or updates consent-backed audience membership.

```json
{
  "business_id": "contentglows",
  "email": "person@example.com",
  "audience_id": "launch_waitlist",
  "purpose": "marketing",
  "locale": "fr",
  "source": "contentglows_holding_page",
  "consent": {
    "state": "granted",
    "occurred_at": "2026-09-04T01:52:00Z",
    "notice_version": "contentglows-launch-v1",
    "form_version": "holding-page-v1"
  },
  "identity": null,
  "metadata": {
    "campaign": null
  }
}
```

Rules:

- `business_id`, `audience_id`, `purpose`, `source` and notice version must be registered and mutually compatible;
- the server validates syntax and normalizes the address;
- `occurred_at` cannot be unreasonably in the future or older than the configured intake window except through a migration endpoint;
- metadata keys and sizes are allowlisted;
- response never reveals whether an address was previously registered beyond the caller's authorized business scope.

Success response (`200` for replay/existing, `201` for first creation):

```json
{
  "subscription_id": "sub_opaque",
  "business_id": "contentglows",
  "audience_id": "launch_waitlist",
  "status": "subscribed",
  "recorded_at": "2026-09-04T01:52:01Z"
}
```

### `DELETE /api/v1/email/subscriptions/{subscription_id}`

Server-to-server withdrawal for the authorized business. Requires an idempotency key and records a `withdrawn` consent event. It does not remove unrelated audiences, other businesses, transactional eligibility or entitlements.

### `POST /api/v1/email/preferences/resolve`

Public opaque-token endpoint used by links in delivered email. The token identifies the authorized scope without exposing an email address in the URL. It can return a preference view or apply a scoped withdrawal. Tokens are signed, audience/stream-bound, expiring where appropriate and replay-safe.

### `POST /api/v1/email/messages/transactional`

Internal server-to-server command for an allowlisted transactional template.

Required semantic input: `business_id`, `template_key`, `recipient_ref` or authorized email, locale, template variables, idempotency key and documented transaction reason. Arbitrary HTML, arbitrary sender identities and arbitrary Postmark stream ids are rejected.

### `POST /api/v1/email/broadcasts`

Creates a controlled broadcast job referencing an internal audience and immutable content/template version. Initial implementation may keep this endpoint operator-only and execute synchronously for very small batches. The contract supports later queued execution without changing callers.

### `POST /api/v1/email/webhooks/postmark`

Receives Postmark events. It verifies the configured authentication boundary before parsing, enforces payload limits, deduplicates by provider event/message semantics, normalizes the event, updates suppressions where required and returns success only after durable acceptance.

Unknown event types are recorded as safe `ignored` diagnostics and never mutate consent or entitlements. Webhook retries are idempotent.

## Error Contract

Errors use a stable envelope without echoing secrets or full addresses:

```json
{
  "error": {
    "code": "invalid_consent_notice",
    "message": "The consent notice is not accepted for this audience.",
    "request_id": "req_opaque"
  }
}
```

| HTTP | Code examples | Meaning |
| --- | --- | --- |
| `400` | `invalid_request`, `invalid_email`, `invalid_consent_time` | Malformed semantic input |
| `401` | `authentication_required`, `invalid_credential` | Credential absent or invalid |
| `403` | `business_not_allowed`, `operation_not_allowed` | Authenticated caller lacks scope |
| `404` | `subscription_not_found`, `audience_not_found` | Authorized resource absent |
| `409` | `idempotency_conflict`, `identity_collision` | Safe automatic resolution impossible |
| `413` | `payload_too_large` | Payload exceeds strict limit |
| `422` | `invalid_consent_notice`, `audience_incompatible` | Well-formed but violates domain policy |
| `429` | `rate_limited`, `business_quota_exceeded` | Retry after bounded interval |
| `503` | `service_unavailable`, `transport_unavailable` | Durable service or transport unavailable |

Public signup surfaces may present a generic success response after syntactic acceptance to limit address enumeration, while internal telemetry preserves the true safe outcome.

## Transport Boundary

The application depends on an internal `EmailTransport`, not on the Postmark SDK in domain code.

```ts
interface EmailTransport {
  sendTransactional(command: TransactionalEmailCommand): Promise<DeliveryReceipt>
  sendBroadcast(command: BroadcastEmailCommand): Promise<DeliveryReceipt>
}
```

The interface exposes provider-neutral inputs and normalized receipts. Provider-specific tags may be generated only in the adapter. It deliberately excludes contact, consent and audience CRUD because those belong to CommandGlows.

### Postmark mapping

- one production Postmark `Server` per `businessId`;
- distinct non-production Sandbox Servers;
- transaction emails use the registered Transactional Message Stream;
- marketing and newsletter messages use the registered Broadcast Message Stream;
- sender addresses and domains come from the CommandGlows allowlist;
- internal `messageId`, `businessId`, template/content version and purpose are carried in safe metadata;
- Postmark suppressions are imported as signals, while CommandGlows remains canonical for send eligibility;
- Postmark tokens remain server-side and are independently rotatable per Server.

Adding another transport requires a new adapter and routing configuration, not schema or product API changes.

## Security And Privacy Contract

- Product endpoints accept server-to-server requests only; the ContentGlows browser posts to its own same-origin function first.
- Credentials are least-privilege, environment-scoped, rotatable and never shared across business clients.
- `business_id` is authorized from the credential, never trusted from the body alone.
- Public forms use honeypot, bounded request size, IP-aware short-window rate limiting and generic responses. Raw IP addresses are not stored in the contact ledger.
- Logs contain request ids, internal record ids, business, operation and normalized reason codes; they contain no raw email, authorization value, consent token or provider payload.
- Email search in operator tools requires explicit privileged access and creates an audit event.
- Unsubscribe links use opaque signed tokens and never expose the raw address in query parameters.
- Template variables are schema-validated and escaped according to output context. Arbitrary HTML submission is prohibited.
- Webhooks enforce transport authentication, payload size, content type, replay resistance and idempotency before mutation.
- Production transport credentials and data are never used in preview, test or local environments.
- Data exports, erasure and manual suppression changes require authenticated operator actions and an audit trail.

## Retention Contract

Retention is configured by data class rather than inherited from Postmark:

- consent evidence: retained for the legally approved period after withdrawal;
- active address and membership: retained while necessary for the declared relationship;
- delivery events: detailed records kept for a bounded diagnostic period, then aggregated/anonymized;
- idempotency records: retained long enough to cover client and webhook retries;
- raw webhook payloads: not retained by default;
- hard-bounce, complaint and legal suppression evidence: retained as long as necessary to prevent prohibited sending;
- erased contacts: personal address removed or irreversibly transformed while minimum non-identifying compliance evidence remains.

Exact durations must be captured with the applicable privacy/legal owner before production migration. Absence of a duration blocks production readiness, not schema/spec work.

## Operational Observability

Minimum metrics, partitioned by environment and business:

- accepted/rejected signup rate and rejection reason;
- consent grant/withdrawal count;
- transactional and broadcast submission, delivery, delay, bounce and complaint rates;
- suppression counts and reason;
- webhook verification failures and replay count;
- transport latency/failure rate;
- idempotency conflicts;
- identity collision/quarantine count;
- business quota consumption.

Alerts must detect provider outage, abnormal bounce/complaint rate, webhook failure and repeated unauthorized client requests. Dashboards use aggregate data and internal ids, not raw recipient addresses.

## Complete Lifecycle Scenarios

### Signup and re-signup

- First valid anonymous signup creates/upserts the address, records consent and creates membership.
- Identical replay returns the original result.
- A new idempotency key for an already subscribed tuple records no duplicate membership; material new proof may append consent evidence.
- Re-signup after voluntary withdrawal creates a new grant event linked to the previous state and restores membership only when no active suppression forbids it.
- Re-signup after complaint or legal suppression does not silently reactivate delivery.

### Unsubscribe

- Audience unsubscribe withdraws that audience/purpose scope only.
- Business-wide marketing unsubscribe withdraws every optional marketing membership for that business.
- Global complaint/legal suppression blocks the applicable optional scopes across businesses.
- Transactional messages remain eligible only when independently justified and unsuppressed.

### Purchase and entitlement

- A verified purchase may create or update `productEntitlements` and may send a transactional receipt.
- Purchase never creates marketing consent.
- An optional checkout checkbox may record separate consent evidence when unchecked by default and backed by a versioned notice.
- Refund/revocation affects entitlement according to the commerce contract; it does not rewrite consent history.

### Identity creation after anonymous signup

- Verified identity proof links an anonymous address atomically.
- Existing consent and audience history remain attached to the address.
- Entitlements remain attached to the resolved global person.
- A collision enters quarantine instead of auto-merging two global persons.

### Bounce, complaint and provider block

- Hard bounce creates an active suppression and updates membership projections.
- Soft/transient bounce records delivery state and follows bounded retry policy without immediate permanent suppression unless threshold policy is met.
- Complaint creates immediate suppression before acknowledging durable webhook processing.
- Provider block is normalized and investigated; it does not automatically invent consent withdrawal.

## Resend Migration

Migration is staged and reversible:

1. **Inventory** — export only authorized Resend contacts, audience membership, unsubscribe state and available timestamps; record source account/audience ids without embedding secrets.
2. **Normalize** — validate and deduplicate addresses; map every source audience to a registered CommandGlows audience and consent purpose.
3. **Classify evidence** — import explicit consent only when evidence is sufficient. Unknown provenance becomes `pending_review` or suppressed from marketing, never silently granted.
4. **Backfill** — write through a dedicated migration mutation with deterministic idempotency keys and `migration_resend` source.
5. **Shadow intake** — CommandGlows becomes the write source while existing delivery remains on Resend; compare projections without double-sending.
6. **Postmark sandbox** — validate templates, metadata, webhook normalization and suppressions without real recipients.
7. **Pilot** — enable one business/stream with allowlisted recipients, then ContentGlows waitlist intake, with monitored rollback thresholds.
8. **Cutover** — route approved sends to Postmark; keep Resend read-only for a bounded rollback window.
9. **Reconcile** — compare counts and sampled consent/suppression histories using internal ids.
10. **Retire** — revoke Resend credentials and remove dependencies only after explicit approval and production proof.

Rollback changes transport routing back to the last proven adapter. Canonical consent written to CommandGlows is never rolled back or overwritten by stale provider state.

## Implementation Phases

### Phase 1 — canonical storage and subscription intake

- add email domain tables/indexes and registries;
- implement normalization, consent derivation, membership projection and idempotency;
- implement authenticated `POST /api/v1/email/subscriptions`;
- no ContentGlows change and no provider send change yet.

### Phase 2 — preferences and suppressions

- opaque preference/unsubscribe tokens;
- scoped withdrawal endpoints;
- operator-safe suppression actions and audit;
- migrate current CommandGlows unsubscribe behavior away from raw email URLs.

### Phase 3 — transport abstraction and Postmark sandbox

- implement `EmailTransport` and Postmark adapter;
- create configuration mapping without storing tokens in Convex;
- normalize webhook events and suppression effects;
- prove transactional and broadcast sandbox streams.

### Phase 4 — existing CommandGlows newsletter migration

- route CommandGlows signup through the central domain;
- preserve welcome rendering and locale behavior;
- shadow/pilot Postmark delivery;
- retain Resend rollback.

### Phase 5 — ContentGlows integration

- replace direct Resend waitlist calls with same-origin server-to-server calls to CommandGlows;
- register `contentglows`, `launch_waitlist`, notice and source;
- verify anti-abuse, idempotency, generic public response and hosted end-to-end persistence;
- keep the holding page and production-content lock unchanged.

### Phase 6 — migration and retirement

- import eligible provider state;
- reconcile suppression and consent counts;
- complete monitored production cutover;
- remove Resend only after explicit destructive-action approval.

## Test Contract

| ID | Scenario | Required result |
| --- | --- | --- |
| `EMAIL-001` | First anonymous valid signup | Address, consent and one membership created atomically |
| `EMAIL-002` | Same key and same request replayed | Same semantic result; no duplicate records |
| `EMAIL-003` | Same key with changed request | `409 idempotency_conflict`; no mutation |
| `EMAIL-004` | Caller submits another business id | `403`; no cross-business existence leak |
| `EMAIL-005` | Unregistered audience or notice | `422`; no consent recorded |
| `EMAIL-006` | Previously withdrawn contact re-subscribes | New consent evidence and restored membership when unsuppressed |
| `EMAIL-007` | Complained address re-subscribes | Consent may be recorded, delivery remains suppressed pending explicit resolution |
| `EMAIL-008` | Verified Auth0 identity matches anonymous address | Address links to existing/new global person without losing history |
| `EMAIL-009` | Verified address collides across global people | Quarantine/dispute; no automatic identity merge |
| `EMAIL-010` | Entitled user lacks marketing consent | Transactional allowed by reason; broadcast denied |
| `EMAIL-011` | Marketing subscriber lacks entitlement | Broadcast allowed by consent; no entitlement created |
| `EMAIL-012` | Audience unsubscribe | Only the requested scope is withdrawn |
| `EMAIL-013` | Postmark hard bounce webhook replay | One suppression/effect, replay acknowledged idempotently |
| `EMAIL-014` | Invalid Postmark webhook authentication | Rejected before parsing/mutation; safe log only |
| `EMAIL-015` | Arbitrary HTML/sender/stream requested | Rejected by template and routing allowlist |
| `EMAIL-016` | Postmark unavailable after durable send acceptance | Retryable state; no duplicate logical message |
| `EMAIL-017` | Resend import contains unknown consent provenance | No marketing grant; row quarantined/pending review |
| `EMAIL-018` | Erasure request | Address removed/anonymized per policy without deleting independent financial entitlement evidence |
| `EMAIL-019` | Logs and metrics inspected | No raw email, credential, token or webhook payload |
| `EMAIL-020` | ContentGlows hosted waitlist pilot | One canonical subscription, correct business/audience, no direct provider ownership |

Proof order:

1. pure normalization, consent, eligibility and idempotency unit tests;
2. Convex schema/mutation integration tests;
3. Astro route authentication and response-contract tests;
4. Postmark Sandbox send and webhook tests;
5. migration dry-run and reconciliation report;
6. hosted allowlisted pilot;
7. monitored production cutover proof.

No production-ready claim is permitted while legal retention durations, hosted webhook verification, suppression parity or rollback proof remain unresolved.

## Invariants

- CommandGlows is the only canonical owner of contact, consent, audience and entitlement business state.
- `globalUsers` and `identityAccounts` remain the identity spine; email is a linkable attribute, not the sole identity key.
- Anonymous contacts are valid and can later attach to a verified identity.
- Consent, audience membership, entitlement and suppression are never collapsed into one field or table.
- Purchase, account creation and entitlement never imply marketing consent.
- Marketing unsubscribe never revokes product access.
- Optional communication requires current positive consent and no applicable suppression.
- Provider state can restrict sending but cannot silently create consent or entitlement.
- Every product write is business-authorized, idempotent and auditable.
- Raw emails, credentials and consent tokens never appear in routine logs.
- Postmark is replaceable without changing product-facing API contracts or canonical data.
- ShipGlows governs configuration and architecture without storing recipient personal data.

## Scope Out

- building a general CRM, visual campaign editor or segmentation UI in the first implementation;
- behavioral tracking, lead scoring or arbitrary cross-business profiling;
- automatic identity merge on email equality alone;
- storing Postmark or Resend secrets in Convex;
- dedicated queues or microservices before measured throughput requires them;
- dedicated IPs before provider evidence and stable volume justify them;
- production migration, provider billing changes, credential revocation or real campaign sends under this specification-only chantier;
- changing the ContentGlows holding-page publication lock.

## Documentation Consequences

- `shipglows_data/technical/architecture.md` records this approved target separately from current Resend runtime truth.
- `shipglows_data/technical/context-function-tree.md` updates when v1 routes are implemented.
- `shipglows_data/technical/code-docs-map.md` updates with the actual email-domain paths during phase 1.
- privacy/legal documentation must define purposes, notice versions, retention and operator procedures before production migration.
- ContentGlows launch-protection documentation updates only when its direct Resend integration is actually replaced.

## Current Chantier Flow

- `2026-09-04 — architecture`: exhaustive contract approved and documented from the existing Convex identity/entitlement spine, direct Resend routes and ContentGlows Auth0 bridge. No runtime behavior or provider configuration changed.

## Implementation continuation — 2026-09-05

Diane authorized the central implementation and CommunityGlows as first pilot through the originating CommunityGlows task. This supersedes phase order only: other products remain inventory-only; Resend stays intact. Production migration, real sends (including tests without an authorized recipient), DNS, purchases and provider configuration mutations remain excluded.

Readiness: ready for additive local implementation and mocked proof; not production-ready. Entity, markets, exact retention policy, approved notices and configured non-production provider resources remain activation gates. Missing values fail closed rather than using invented legal or provider identifiers.

Execution contract: Astro v1 routes remain thin, Convex owns atomic domain transitions and a durable outbox. Product credentials are environment/business scoped and checked at the authoritative Convex boundary. Confirmation uses scoped expiring single-use opaque tokens; GET links never mutate. Broadcast drafts require immutable rendered-content preview and explicit approval before enqueue. Dispatch rechecks consent and suppressions. Postmark-managed opt-out remains enabled until separate custom-unsubscribe approval exists. Tracking is disabled. Ambiguous provider submissions are held for reconciliation, never automatically retried, because Postmark has no idempotency-key support.

Execution batches (integration owner: main agent):

| Batch | Write ownership | Dependency / proof |
| --- | --- | --- |
| A — domain and outbox | `commandglows_site/convex/email*.ts`, additive schema import, `tests/email/centralDomain.test.ts` | Existing identity tables preserved; Convex integration tests for isolation, replay, consent, token, suppression and dispatch races |
| B — transport and presentation | `commandglows_site/src/lib/email/central/**`, `src/pages/api/v1/email/**`, `tests/email/centralApi.test.ts`, `tests/email/centralTransport.test.ts` | Agreed A interface; route, template and mocked provider proof |
| C — pilot and integration | CommunityGlows email-only files after coordination, docs, generated Convex API | A+B; no concurrent shared-file writes; combined local proof then operator-owned hosted gates |

ZOMBIES: zero/one/repeated subscriptions, many brands, payload/time boundaries, API and provider errors, expired/replayed tokens, withdraw-before-dispatch and crash-after-submission are required. OWASP scope: server authorization, tenant isolation, input/HTML injection, cryptographic tokens, abuse limits, bounded payloads, safe errors and retry uncertainty. Existing lowercase contract vocabulary is retained as the project-defined identifier exception.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
| --- | --- | --- | --- | --- | --- |
| 2026-09-05 | sg-development / 101-sg-ready | inherited Codex | Reconcile approved contract, clean worktree and current Postmark constraints | Ready for additive local implementation; external activation gated | Implement A/B then coordinated pilot |
| 2026-09-05 | sg-development / 102-sg-start | inherited Codex | Add Convex consent/outbox, v1 API, Postmark, templates and coordinated CommunityGlows proxy/form | Local implementation and mocked lifecycle passing; legacy Resend preserved | Complete combined checks and preserve checkpoint |
| 2026-09-05 | sg-development / 103-sg-verify | inherited Codex | Combined domain, API, identity regression and scheduled-worker checks | 117 tests pass; Astro 0 errors; Convex tsc pass; 5 metadata files pass. CommunityGlows 10 tests and 49-page builds pass. Hosted/legal/provider verification remains partial. | Preserve isolated checkpoint; resolve activation facts |

### Current implementation evidence

- Local proof includes actual Convex test mutations, HTTP authentication, client/business isolation, replay/conflict, expiring/replayed/generation-bound tokens, recipient/IP quotas, immutable preview, final consent recheck, ambiguous submission reconciliation, keyed erasure tombstones and provider outage tests.
- The public pilot stays disabled by default. No Convex deployment selected, no Postmark resource configured, no real or sandbox send, no contact import and no DNS mutation occurred.
- `central-email-operations.md` is the configuration and legal/operations handoff. The implementation is a one-recipient reviewed broadcast pilot with one marketing purpose per business stream. Full audience execution, verified identity linking, global suppression administration, automatic retention cleanup and hosted/client-matrix proof remain outside the delivered local slice.
- `Implementation Excellence Gate`: local backend/domain and route proof pass; hosted/provider/manual/legal readiness partial. `OWASP Security Gate`: authentication, tenant checks, token integrity, bounded input, escaped output and safe failure tests pass locally; no full ASVS or universal compliance claim. `Clean Code Gate`: coherent domain/adapter separation and behavior tests; persisted configuration and cleanup require the documented activation work.
- Topology receipt: three directly dispatched agents, partitioned domain/pilot writes and read-only provider review; main owns shared integration. CommunityGlows owner explicitly released the dirty newsletter component and targeted launch check; billing/app/guides remained untouched.
