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
next_step: Capture complete shared backend schema/index/cron inventory and resolve activation policies before hosted mutation.
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

## Unresolved activation and dependent lots

- Legal entity, markets, retention per data class, volume/budget and independent fallback channel remain operator decisions. No automatic expiry/erasure/import policy is invented.
- Actual sender, Postmark Server/streams, private recipient profile, server credentials and environment parity must be checked before the separately authorized test alert. Nothing in this source audit proves those settings.
- No buyer purchase/access message is authorized from an unverified state or email match. Existing Stripe/provider confirmation ownership must be reconciled before adding duplicate customer messages.
- The local audience snapshot/campaign engine now pages immutable generations and recipient jobs. Hosted scale/campaign acceptance, consent export/erasure policy, producer cutover and rollback restoration remain later lots. Suppression tombstones and their hashing key must survive every import, restore and rollback.
