---
artifact: technical_guidelines
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: CommandGlows
created: "2026-09-07"
updated: "2026-09-07"
status: reviewed
source_skill: sg-development
scope: central-email-api-contract
owner: Diane
confidence: high
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems: [Convex, Astro, ContentGlows, ShipGlows, newsletter_studio_flutter]
depends_on: [shipglows_data/workflow/specs/central-email-completion-plan.md]
supersedes: []
evidence: [commandglows_site/convex/emailOperations.ts, commandglows_site/src/lib/email/central/operations.ts, commandglows_site/tests/email/centralOperations.test.ts]
next_step: Verify hosted contracts and configure scoped authenticated product relays before UI integration.
next_review: "2026-10-07"
---

# Central email API contract

Machine-readable request contracts for the three additive v1 resources are published at `/contracts/central-email-v1.openapi.json` (source: `commandglows_site/public/contracts/central-email-v1.openapi.json`). Backend validators remain authoritative for state, consent, configuration and tenant checks; an OpenAPI-valid body alone grants no authority.

## Authority and clients

CommandGlows/Convex owns delivery and canonical consent. ContentGlows and ShipGlows compose and operate through their authenticated server relays. `newsletter_studio_flutter` is a presentation contract, not a transport. Its older ContentGlows-owned delivery proposal is superseded for this central integration; the other repositories have not been modified.

`/api/v1/email/*` machine commands require a server-only bearer credential whose `EMAIL_CONTROL_CONFIG.clients` entry permits the exact business and operation. Never embed this credential in Flutter, JavaScript, app assets or browser storage. Product relays must verify their own user identity, role and business before forwarding; possession of a mobile access token alone does not authorize a central machine command. UI integration is not yet implemented.

For the existing CommandGlows site, `/api/admin/email` is the operations relay: existing site session, canonical Convex admin role, configured business and operation, then server-only `EMAIL_OPERATOR_CREDENTIAL`. Non-GET requests require the same Origin. The business is a scoped selector, not a permission grant. `EMAIL_CONVEX_URL` must select the same declared identity/operations backend; it never falls back to `PUBLIC_CONVEX_URL`. Both ordinary and region-qualified Convex cloud origins are accepted; paths, credentials and lookalike hosts are rejected.

No new console or newsletter editor is included. Operations audits record the authenticated machine client; the site relay authenticates the person, but per-person audit attribution across product relays remains a later contract extension.

## Operations

`GET /api/v1/email/operations` (permission `operations_read`):

| Query | Result |
| --- | --- |
| `business_id`, `view=list` (default), `state=queued` (default), `limit=20`, optional `cursor` | `items`, opaque next `cursor` or null, `done`. State must be one of draft/queued/sending/submitted/delivered/unknown/permanent_failure/cancelled. Page size 1–100. |
| `business_id`, `view=detail`, `message_id`, optional `limit,cursor` | Redacted message, attempt statuses, paginated operator evidence, case `version`, owner client and allowed actions. Search is exact internal message ID; there is no global address search. |
| `business_id`, `view=events`, `message_id`, optional `limit,cursor` | Paginated normalized provider events, newest first; type, opaque event ID and occurrence/recording times only. A late delivery does not clear a recorded suppression. |
| `business_id`, `view=status` | Application environment, activation/configuration-presence indicators, pause controls and per-state queue presence. No invented totals, worker health, provider verification or inbox proof. |

Message summaries expose only `message_id,business_id,class,status,created_at,next_at,provider_message_id`. Timestamps are Unix milliseconds. No address, body, rendered payload, secret, private recipient profile or serialized transport route is returned. `oldest_created_at` describes the first item in due-order, not a complete aggregate over the entire queue.

`POST /api/v1/email/operations` (permission `operations_write`) requires a stable `Idempotency-Key` of 16–128 ASCII letters/digits/underscore/hyphen and JSON:

```json
{"business_id":"example","action":"pause","class":"all","expected_version":0,"reason_code":"investigation"}
```

Actions:

- `pause`/`resume`: `class` is all/operator/transactional/confirmation/broadcast; expected version applies to that control. All-class pause dominates individual resume. Paused rows are rotated for up to one minute so they cannot starve other classes.
- `acknowledge`: `message_id`, expected case version; assigns the authenticated machine client.
- `record_evidence`: message and case version plus opaque `evidence_reference`; appends evidence without claiming the provider accepted/delivered or changing `unknown`.
- `cancel`: draft/queued messages only. Submitted, sending and unknown cannot be recalled or reset.

Reason codes are 3–64 lowercase alphanumeric/underscore characters beginning with a letter. Evidence references are 3–128 ASCII alphanumeric/colon/underscore/hyphen characters. Do not put customer data or secrets in either. New case/control version is zero. Each successful action increments it. Same key/same semantic body returns the original receipt even after subsequent changes; same key/different body returns 409. Stale version returns 409 and requires refresh. Business mismatch and unauthorized operations fail server-side. No generic retry/clear-suppression/mark-delivered command exists.

Errors use `{error:{code,message,request_id}}` for the v1 handlers: 403 forbidden; 404 not_found; 409 invalid_state/idempotency_conflict/version_conflict; 422 invalid_input; 429 rate_limited where applicable; 503 configuration/service unavailable. Authentication/parser errors may use 400/401/413/415. Responses are no-store and do not expose raw backend/provider errors. Read-only queries do not need idempotency keys. The admin relay also uses compact auth/origin/configuration errors.

## Catalogue and preview

`GET /api/v1/email/templates?business_id=...` requires `templates_read`. Returns versioned catalogue entries, locales, class, trigger and explicit capabilities. `POST` with `business_id,template_key:newsletter,template_version:1,locale,subject,paragraphs` returns rendered HTML/text, `preview_only:true`; it creates no job and grants no approval. Version is the string `"1"`; unknown versions, HTML/block payloads and unsupported templates are rejected. Preview rendering escapes text and retains the provider-managed unsubscribe placeholder for actual Postmark rendering. Link activation cannot be validated from preview.

Existing subscription, preference and one-recipient broadcast APIs retain their prior contract. This milestone supports paragraphs, versioned audience campaigns and scheduling. `analytics` and `arbitrary_html` remain false. Catalogue support does not grant a caller permission; clients still need each configured operation. Full studio block/provenance/offline-conflict integration and marketing test-send hooks remain later work. Preview and actual delivery are separate capabilities.

## Paginated campaigns

`GET /api/v1/email/campaigns` requires `campaign_read` and `business_id`. `view=list` is default; `status`, `preview` and `recipients` additionally require `campaign_id`. Page size `limit` is 1–100 (default 25), with optional opaque `cursor`. Recipient pages expose only opaque snapshot references, message IDs, states and exclusion reasons. `page_state_counts` counts only that page, not the entire campaign. Preview returns the approved-format content/HTML/text but never a private transport route or raw address.

`POST /api/v1/email/campaigns` requires `campaign_write`, a stable `Idempotency-Key`, `business_id`, `operation` and `expected_version`. Use the preceding response's `revision` as expected_version; new create uses zero. The receipt carries distinct `content_version`, `revision`, `operation_id`, state and snapshot/fanout progress.

```json
{"business_id":"example","operation":"create","expected_version":0,"audience_id":"newsletter","locale":"fr","subject":"Nouvelles du projet","paragraphs":["Contenu de démonstration."],"scheduled_at":0,"timezone":"Europe/Paris"}
```

`scheduled_at` is an absolute UTC Unix timestamp in milliseconds. The IANA timezone records the operator's calendar context; the caller must resolve an ambiguous daylight-saving local time to an instant. Zero/past means ready at the next worker tick after approval, not an immediate send by this request.

Workflow:

1. `create` or `revise` supplies the full text content, audience, schedule and timezone. Revise requires campaign_id and creates a new immutable content version, invalidating previous snapshot/approval. It is refused once any recipient message has been created.
2. Repeated `snapshot` commands each process at most 25 memberships. Use a new key and the returned revision for each next page, or the same key to retry a lost response. Approval requires `snapshot.complete=true`. Creation time, update time and consent generation freeze the selection; later subscribers are not added, and later withdrawals/re-subscriptions cannot silently enter that approved generation. Estimates include the current private allowlist and suppression rules.
3. `approve` binds the complete version/snapshot, sender/route and stored schedule. It does not accept replacement content or a new time. A changed route requires revision and renewed approval. Live-test profiles reject marketing approval.
4. A configured scheduler client with **both** `campaign_dispatch` and `dispatch` permissions pumps one page of one due campaign per tick. Cursor and snapshot→message links commit together; retries cannot create another message for that snapshot. The ordinary worker then claims by class priority: operator, service, confirmation, broadcast. A campaign pump failure does not prevent an attempt to dispatch service work.
5. `pause`/`resume` preserves unsent work. `cancel` prevents future fanout and dispatch. Neither recalls a submitted message; unknown submissions remain unknown. Final consent, suppression, membership generation, campaign state and route checks occur before dispatch reservation.

States are `draft`, `scheduled`, `running`, `paused`, `cancelled`, `fanout_complete`. **fanout_complete means all snapshot rows were processed into jobs or exclusions**, not that all messages were submitted or delivered. Poll the paginated recipient/message evidence for delivery outcomes. API writes do not expose a direct provider send. No automatic campaign creation or approval is performed by the scheduler.

This reuses existing consent policy; it does not introduce legal retention durations, import contacts, broaden activated recipient allowlists, enable a public marketing campaign, or migrate a product UI.

## Local integration evidence and remaining boundary

Tests exercise HTTP controllers against real Convex test mutations/queries, scoped pagination, stale updates, duplicate commands, unknown evidence, pause/resume, canonical non-admin rejection and escaping. Those are local fixtures; no hosted user, provider token, recipient or inbox is exercised. Hosted schema/index/function/cron parity and authenticated relay acceptance remain required before deployment. No per-person/operator SLA or independent monitoring channel is claimed.
