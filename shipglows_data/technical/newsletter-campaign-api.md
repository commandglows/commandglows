---
artifact: technical_guidelines
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: CommandGlows
created: "2026-09-08"
updated: "2026-09-08"
status: reviewed
source_skill: sg-development
scope: newsletter-campaign-api
owner: Diane
confidence: high
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems: [Clerk, Convex, Postmark, shipglows-email-engine]
depends_on: [shipglows_data/technical/central-email-operations.md]
supersedes: []
evidence:
  - commandglows_site/convex/emailCampaigns.ts
  - commandglows_site/src/lib/email/central/campaignApi.ts
  - commandglows_site/tests/email/campaignDomain.test.ts
  - commandglows_site/tests/email/campaignApi.test.ts
next_review: "2026-10-08"
next_step: deploy only within explicitly authorized configuration and verify hosted admin login before any authorized recipient test
---

# Newsletter campaign API

The additive campaign application reuses the central email outbox and Postmark Broadcast stream. Source implementation does not establish deployed availability or inbox delivery. Existing single-recipient v1 routes remain compatible. No provider configuration, pilot recipient policy, legal footer, tracking or production activation changed.

## Authority and hosting

The web host serves the Flutter application from the same origin as `/api/admin/email`. Its existing Clerk session authenticates each request. `emailOperatorAuthority:authorize` runs against the canonical `PUBLIC_CONVEX_URL` using the existing server bridge secret and requires the persisted user role `admin`. The server then uses `EMAIL_OPERATOR_CREDENTIAL` against the explicitly separate `EMAIL_CONVEX_URL`. The email deployment independently checks its client configuration for `campaign_read` or `campaign_write` on the requested business. Neither browser code nor an HTTP request may choose the actor or receive a service credential.

Both backend modules must exist in their respective authorized deployments. The operator credential must be explicitly configured as a least-privilege client in the email control configuration; this source change does not add it to any environment. Missing identity authority, email scope or deployment settings fails closed. All mutations require an exact same-origin `Origin`, JSON and a stable 16–128 character `Idempotency-Key`. Responses are `no-store`; errors contain safe codes only.

## Wire contract

All paths below are relative to `/api/admin/email`. JSON keys use snake case. Dates are ISO instants with a timezone; responses normalize to UTC. Lists accept `limit` from 1 to 50 (default 20), optional `cursor`, and optional `state` from `draft`, `scheduled`, `sending`, `completed`, `cancelled`.

| Method and path | Input | Result |
| --- | --- | --- |
| GET `context` | None | `{businesses:[{id,brand,from,audiences:[{id,purpose}],capabilities:{can_test,can_approve,disabled_reason},test_recipients:[]}]}` |
| GET `campaigns` | Query `business_id`, optional list parameters | `{campaigns:[],next_cursor:null|string}` |
| GET `campaigns/{id}` | Query `business_id` | `{campaign,rendered:{html,text}|null}`; frozen reviewed content |
| POST `campaigns` | `business_id,title,audience_id,locale,subject,preheader,blocks` | `{campaign}` |
| POST `campaigns/{id}/save` | `business_id,expected_version` plus all editable fields | `{campaign}` with incremented version |
| POST `campaigns/{id}/review` | `business_id,expected_version` | `{campaign,review:{id,version,eligible_count,complete,html,text}}` |
| POST `campaigns/{id}/test` | `business_id,expected_version,recipient` | `{campaign,test:{message_id,version,state:"queued"}}` |
| POST `campaigns/{id}/approve` | `business_id,expected_version,review_id`, optional `scheduled_at` | `{campaign}` |
| POST `campaigns/{id}/cancel` | `business_id,expected_version` | `{campaign}` |
| POST `campaigns/{id}/delete` | `business_id,expected_version`, draft only | `{deleted:true}` |

Campaign shape:

```json
{"id":"opaque-id","business_id":"configured-business","title":"Draft title","audience_id":"configured-audience","locale":"fr","subject":"Subject","preheader":"Preview text","blocks":[],"version":1,"state":"draft","created_at":"2026-09-08T12:00:00.000Z","updated_at":"2026-09-08T12:00:00.000Z","scheduled_at":null,"counters":{"queued":0,"sending":0,"submitted":0,"delivered":0,"failed":0,"unknown":0,"cancelled":0},"expansion_complete":false}
```

Blocks are `{id,type,text,url?,source_id?}` with type `heading`, `text`, `button`, `divider` or `source`. Source links and IDs are preserved. Button labels are `text`. HTML is escaped, links require HTTPS without credentials, and both HTML and plain text include the same content and unsubscribe destination. Preheader is preserved. Drafts may have empty subject/blocks; review and test require complete renderable content. Limits: title 160, subject 200, preheader 300, 60 blocks, block text 4,000 characters, aggregate block JSON 48,000 characters, HTTP body 64 KiB. No arbitrary HTML or remote images.

## Review, approval and recovery

Each review command scans at most 50 audience memberships. If `complete:false`, issue another review with the same campaign version and a **new** command key to advance the persisted cursor. An HTTP retry of the same step must reuse its original key. The stable review ID, cutoff and accumulated count survive refresh. Counts are partial until complete. Approval requires a completed review. Save invalidates all review state and increments the version. Conflicts return `version_conflict` (409); callers must reload instead of silently overwriting.

Review freezes eligible membership IDs by campaign version. Approval freezes content, that audience snapshot and schedule. Expansion paginates the snapshot in transactions of at most 50 rows, writes a deduplicated campaign/membership ledger and schedules continuation atomically. Newly allowed or unsuppressed contacts cannot increase the approved audience. Newly subscribed or changed memberships after the cutoff are conservatively excluded. Eligibility and membership generation are checked again against current consent, suppressions and the pilot allowlist when the message is claimed and immediately before provider submission. Review counts are therefore an estimate at review time, never a promise of delivery. Draft edits invalidate older snapshots by version; automatic cleanup of historical snapshots follows the existing separate retention-policy work.

The scheduled recovery pass resumes due unfinished campaigns in bounded groups after interrupted expansion or temporary deactivation. Persisted per-state cursors prevent disabled campaigns from blocking later campaigns. Cancellation stops future expansion and queued claims; in-flight provider requests cannot be recalled. A separate bounded cancellation pass marks queued messages cancelled. Test messages remain Broadcast messages and require an already eligible, explicitly allowlisted member of that audience. A queued test receipt proves queueing only.

## Delivery performance and status

Each worker invocation verifies the provider server/stream configuration once, then leases and settles at most ten messages sequentially. It starts no new lease after a 25-second per-run budget, leaving time for the bounded provider request. No database transaction spans network I/O. An empty queue, uncertain outcome or provider rate limit ends the drain. A 429 retains bounded retry backoff; an ambiguous submission remains `unknown` without automatic resend. Existing minute polling remains the trigger; scaling beyond this bounded drain is a later operational choice.

Campaign counters update transactionally with message transitions; listing a campaign never scans all recipients. `completed` means expansion and active queue work ended, **not** that every email was delivered. Inspect `submitted`, `delivered`, `failed`, `unknown` and `cancelled` separately. Authenticated late delivery callbacks can reconcile unknown outcomes without duplicate counting. Suppression lookups use indexes with bounded results and fail closed if an abnormal per-address record bound is exceeded.

## Verification boundaries

Tests exercise the real Convex campaign mutations and HTTP mapping with mocked provider HTTP: immutable approval, stale revisions, duplicate commands, 121-recipient pagination, withdrawal, cancellation, unknown reconciliation, schedule boundaries, full block rendering and bounded ten-message dispatch. Authority tests exercise persisted admin/member roles and bridge denial. They send no email and establish no hosted login or inbox proof.

Before actual use, verify the authorized hosted deployments, Clerk admin login, separate email client scope, provider activation and exact authorized recipient. Existing pilot `allowedRecipients`, production runtime gate, retention configuration and Postmark-managed unsubscribe checks remain mandatory. Automatic retention cleanup, broad contact import, production activation and expanded recipient policy remain outside this change.
