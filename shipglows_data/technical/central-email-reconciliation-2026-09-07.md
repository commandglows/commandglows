---
artifact: audit
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: CommandGlows
created: "2026-09-07"
updated: "2026-09-07"
status: reviewed
source_skill: sg-development
scope: central-email-source-reconciliation
owner: Diane
confidence: medium
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems: [CommandGlows, ContentGlows, ShipGlows, Convex, Postmark]
depends_on: [shipglows_data/workflow/specs/central-email-completion-plan.md]
supersedes: []
evidence: [commandglows_site/convex/email.ts, commandglows_site/convex/resend.ts, commandglows_site/src/pages/api/newsletter/subscribe.ts]
next_step: Confirm inbox receipt, arrange seven-day test-evidence erasure, then separately validate callbacks and commerce incident delivery.
next_review: "2026-10-07"
---

# Email reconciliation, September 7

The clean task worktree started at checkpoint `34b4e68` after fetching the prepared remote branch. Existing email tests passed 48/5 before changes. Historical test totals are not current proof. The canonical main and other checkouts remain untouched.

## Source producers and client contracts

| Source | Current local behavior | Migration/contract consequence |
| --- | --- | --- |
| CommandGlows `src/pages/api/newsletter/subscribe.ts` | Resend contact create + welcome send | Retain until provenance, suppression parity and single-producer cutover are approved. |
| CommandGlows `src/pages/api/newsletter/unsubscribe.ts` | Resend contact search/update (GET and POST) | Historical opposition must survive migration/rollback; do not treat newer signup as reset. |
| CommandGlows `convex/resend.ts:addBuyerToNewsletter` | Public legacy action adds buyer to audience; no internal source call found by targeted search | Exported/deployed is not proof of invocation. Purchase-to-marketing rule needs explicit removal/migration decision; no new producer added. |
| CommandGlows `convex/email*`, v1 controllers | Canonical DOI, suppression, job/attempt/event ledger; one-recipient broadcast pilot | Reused, not rebuilt. |
| CommandGlows `convex/commerceAlerts.ts` | Existing webhook outbox, recovery and escalation | Explicit email channel must link one durable email and preserve transport evidence. |
| ContentGlows `site/api/waitlist.js` | Generic mailing-list proxy recorded by existing operations audit | Revalidate exact payload at integration; no hosted central consumption claimed. |
| ContentGlows `app/lib/presentation/screens/newsletter/newsletter_screen.dart`, `app/lib/data/services/api_service.dart`, `lab/api/routers/newsletter.py` | Authenticated generation/config/job routes, job-owner enforcement | Generation is distinct from approved distribution; retain own authenticated relay. |
| ShipGlows runtime `shipglows_data/technical/context.md` | DX/CLI repository points to sibling shipglows_app for SaaS | UI implementation belongs in that product, not runtime governance. |
| ShipGlows app newsletter screen/API service | Same generator route family: config/check, generate-async, jobs/{id} | No Studio consumption or real central delivery verified. |
| email-sidebar-app `packages/newsletter_studio_flutter/lib/src/newsletter_studio_hooks.dart` and models | Save/revision, sources, audience, validate/preview/test, schedule/send/unschedule/status/analytics hooks; synthetic no-network demo | Preserve hook boundaries, explicit unsupported capabilities; no credentials in Flutter. |

Targeted source inspection found no Resend sender in ContentGlows, ShipGlows runtime or shipglows_app. SendGrid settings/instructions remain in ContentGlows generation configuration; these are not evidence of an active transport. The ContentGlows August 27 Studio spec still assigns persistence/delivery to ContentGlows; the September central contract supersedes that ownership for this integration, without editing that checkout.

## Read-only hosted availability

Current tool catalog has no exposed Convex/Vercel connector. The installed authenticated Convex CLI did successfully read `function-spec --deployment beaming-cow-328` on September 7 and confirmed the supplied regional URL. Existing email command/claim/settle/webhook/recheck, emailDelivery poll, commerce alert and operations functions are deployed. This verifies function presence only, not new code, configuration, job health or delivery.

Calling the dashboard system schema query through ordinary `convex run` was rejected as function-not-found; this was a CLI surface mismatch. The CLI's read-only metadata surface then captured 32 declared table schemas/indexes successfully. Its process disabled data, logs, environment and mutation tools and was stopped after reading. No codegen/push was enabled. Snapshots are `central-email-live-schema-2026-09-07.json` and `central-email-live-functions-2026-09-07.json` (69 function contracts). They contain schemas and contracts, not table records or secret values. `centralSchemaParity.test.ts` verifies all captured fields/tables/indexes remain compatible; new fields in existing tables must be optional. Live cron capture remains incomplete, so shared backend deployment remains blocked. The historical index incident is still open; no index deletion or restoration was attempted.

Local schema evolution is additive: optional route/attempt reservation fields, finite test quota ledger, operator control/case/action tables and scoped evidence index. Compare all deployed tables/functions/crons, including unrelated contracts, before any shared push. Do not infer that a local additive diff is sufficient parity proof.

### Read-only readiness follow-up — 16:57 UTC

The authenticated dashboard system query `_system/frontend/listCronJobs` confirms three crons, identical to local names, functions, arguments and intervals: commerce alert recovery (300 seconds), email outbox (60 seconds), expired site sessions (900 seconds). The ordinary one-off query of `ctx.db.system` returned an empty list and is **not** used as cron evidence; private system-table visibility differs. The definitive redacted capture is `central-email-live-readiness-2026-09-07.json`. A regression test compares the exported local schedules with this capture, normalizing minutes to seconds.

The environment system query confirms that `EMAIL_CONTROL_CONFIG`, `EMAIL_DISPATCH_CREDENTIAL`, `COMMERCE_ALERT_CHANNEL` and `COMMERCE_ALERT_EMAIL_CONFIG` are absent/empty. Only presence booleans are retained; no configuration or credential values are persisted. This rules out the controlled email acceptance test now. Configure the explicit private business/route, sender/streams, scoped credentials and bounded operator recipient/quota/expiry only after the activation gate is cleared. Neither configuration nor a shared deployment was changed.

GitHub reports the Vercel preview of `a92de91` successfully deployed. This is a hosting receipt, not authenticated email API, provider or inbox acceptance. The historical index incident remains open. Cron inventory is now captured; compare fresh shared metadata again immediately before any later deployment because this backend is shared.

### Historical index recovery and controlled acceptance preparation

The original September 6 deployment receipt (20:27:23 UTC) identifies the exact four removed indexes: `emailConsentEvents.by_idempotencyKey(idempotencyKey)`, `emailConsentEvents.by_emailTopic(emailNormalized, topic)`, `emailSubscriptions.by_emailTopic(emailNormalized, topic)`, and `emailSubscriptions.by_syncStatus(providerSyncStatus)`. Convex appends `_creationTime` automatically. Their historical document validators were not recovered. `emailLegacySchema.ts` therefore restores only these indexes on `v.any()` tables, preserving the existing unconstrained legacy documents rather than inventing field types.

Fresh metadata still has 32 declared tables, the same 69 function contracts, and the same three crons. Additional raw schema properties are empty staged-index arrays; no semantic schema drift was found. The authenticated dry run against the exact shared development URL reports **no index deletions** and includes all four recovered additions. This is preparation evidence, not a claim of applied restoration.

Postmark read-only verification confirms `commandglows.com` DKIM and Return-Path, Live server 20723143, transactional `outbound`, and Postmark-managed `broadcast`. The operator authorized CommandGlows sender/reply address `info@commandglows.com`, one private recipient, one attempt in a 24-hour profile, and seven-day retention for test evidence (automatic erasure remains absent). No recipient or token belongs in repository artifacts.

The internal `emailAcceptance.enqueue` command requires scoped `operator_test` permission and the one-recipient/one-attempt Live-test profile. It pins the route at creation and deduplicates by profile, creates no commerce incident or consent, and uses the normal outbox/worker/quota pipeline. Preview access uses existing authenticated Vercel tooling. The scheduled dispatch credential and global commerce email channel remain disabled for this one-shot acceptance; historical alerts and campaigns are not activated. Provider callbacks and independent monitoring remain separate acceptance work.

### Applied restoration and provider acceptance — September 7, 17:35 UTC

Commit `d31760a` is deployed to the exact shared development backend and its protected Vercel branch preview. Convex reported no index deletions. A post-deploy schema query confirms all four historical indexes and their exact ordered fields; the index incident is reconciled. Historical document validators remain unknown and are not represented as recovered. The current function inventory contains 80 contracts; the only changed pre-existing argument contracts are the intended optional `expectedRoute` additions to email claim/recheck. The other 67 pre-existing contracts remain identical.

The private one-shot profile is installed with one recipient, one attempt, a 24-hour expiry and seven-day evidence retention. No default dispatch scheduler credential or commerce email channel is enabled. The preview rejects requests without the email credential and serves the catalogue with it. The acceptance command created one operator job; the normal hosted dispatch endpoint returned `submitted`. The actual Postmark message API reports a `Delivered` event at 19:35:08 Europe/Paris, correct sender `info@commandglows.com`, subject “Test d’alerte CommandGlows” and transactional stream `outbound`. The durable quota is exactly **1/1**. No second request to send was made.

The canonical message remains `submitted` because a provider delivery webhook has not been configured for this test. The direct Postmark API result is provider-delivery evidence, not webhook ingestion or inbox rendering proof. Inbox confirmation has been requested from the operator. Private recipient, provider/message identifiers and credentials are deliberately omitted from repository evidence. Seven-day cleanup is due September 14; there is no automatic erasure mechanism or scheduled deletion in this checkpoint.

Validation: 331 tests across 36 suites passed, then four targeted acceptance tests passed after the additional route-freezing regression was added. Convex TypeScript and Astro (296 files, zero errors/warnings, one pre-existing hint) passed. The shared-target dry run and post-deploy metadata checks are distinct from these local tests. This closes the bounded operator transport test at provider-delivery level, not public activation, commerce-event acceptance, callbacks, independent monitoring or the full email chantier.

## Unresolved activation and dependent lots

- Legal entity, markets, retention per data class, volume/budget and independent fallback channel remain operator decisions. No automatic expiry/erasure/import policy is invented.
- Actual sender, Postmark Server/streams, private recipient profile, server credentials and environment parity must be checked before the separately authorized test alert. Nothing in this source audit proves those settings.
- No buyer purchase/access message is authorized from an unverified state or email match. Existing Stripe/provider confirmation ownership must be reconciled before adding duplicate customer messages.
- The local audience snapshot/campaign engine now pages immutable generations and recipient jobs. Hosted scale/campaign acceptance, consent export/erasure policy, producer cutover and rollback restoration remain later lots. Suppression tombstones and their hashing key must survive every import, restore and rollback.
