---
artifact: technical_guidelines
metadata_schema_version: "1.0"
artifact_version: "1.1.0"
project: CommandGlows
created: "2026-09-05"
updated: "2026-09-07"
status: reviewed
source_skill: sg-development
scope: central-email-pilot-operations
owner: Diane
confidence: high
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - CommandGlows Convex
  - CommandGlows Astro
  - CommunityGlows static site and Vercel function
  - Postmark
depends_on:
  - shipglows_data/workflow/specs/unified-identity-email-consent-and-delivery.md
supersedes: []
evidence:
  - commandglows_site/tests/email/centralDomain.test.ts
  - commandglows_site/tests/email/centralApi.test.ts
  - commandglows_site/tests/email/centralLifecycle.test.ts
  - commandglows_site/tests/email/centralTransport.test.ts
next_step: Resolve entity and markets, configure an approved isolated sandbox, then prove hosted delivery and withdrawal with an authorized recipient.
next_review: "2026-10-05"
---

# Central email pilot operations

## What exists

Local additive implementation, not a deployed migration. Convex owns normalized addresses, consent history, audience membership, opaque-token records, suppression state, idempotency, outbox, attempts and delivery events. Astro exposes authenticated v1 controllers and a Postmark adapter. Existing Resend callers and entitlements are unchanged. Commerce alerts now have an explicitly configured durable email channel; its acceptance boundaries are described below. New API contracts are in `central-email-api-contract.md`.

CommunityGlows is the first pilot. Its static Astro site uses a same-origin Vercel function under `site/api/newsletter/subscribe.js`; adding an Astro POST route to the static build would not provide a server. Its coordinated `site/NEWSLETTER.md` owns product configuration. The form remains disabled until its versioned notice and controller are configured explicitly. Hosting a static build alone does not prove the function exists.

The legacy send workflow previews and approves one immutable recipient draft at a time. The additive campaigns API now supports immutable content versions, paginated audience snapshots, approval, scheduling and pause/cancel; see `central-email-api-contract.md`. One marketing purpose per business Broadcast stream is still enforced. Other purposes must not be added to that stream implicitly. No automatic cross-business identity merge, verified identity-linking adapter, global suppression administration, automatic retention cleanup, analytics dashboard or general campaign editor is included.

## Environment and configuration

Do not paste credentials into a conversation, commit them, put them in PUBLIC variables or store them in configuration JSON. Use the selected Convex deployment settings and hosting environment settings. Do not infer a deployment name from a URL or use production credentials locally.

`EMAIL_CONTROL_CONFIG` is the same private server-side JSON configuration in the selected Convex deployment and CommandGlows server environment. It contains credential variable names, never credential values; recipient allowlists are private and must not be published. A disabled starting configuration is:

```json
{"environment":"sandbox","clients":[],"businesses":[]}
```

For each authorized business, supply actual values in `businesses`:

| Field | Meaning |
| --- | --- |
| `id`, `brand`, `legalFooter` | Registered business ID, visible brand and approved controller/contact/address footer |
| `from` | Actual verified Postmark sender; never accept this from a product request |
| `serverId`, `serverTokenEnv` | Actual Server ID and the name of its server-only credential variable |
| `transactionalStream`, `broadcastStream` | Actual distinct stream IDs; configured Broadcast uses Postmark-managed unsubscribes |
| `publicBaseUrl` | Actual HTTPS CommandGlows integration origin, used for preferences and scheduled dispatch |
| `audiences` | `{id,purpose,sources,noticeVersions}` records; pilot CommunityGlows source is `communityglows_site`, purpose `marketing`; audience and approved notice version are operator-supplied |
| `activated` | Explicit transport activation; keep false until the isolated provider setup is approved |
| `allowedRecipients` | Explicitly authorized, normalized pilot recipients; required even for the current production pilot |
| `retentionDays` | Positive approved pilot retention bound; its presence is an activation gate, **not an automatic cleanup policy** |

Configure client records `{id,credentialEnv,businessIds,operations}` with separate secrets and least privilege:

- Product proxy: `subscribe`, optionally `withdraw`, and only its own business.
- Preferences service: `confirm`, `unsubscribe`, `preferences`; value is supplied in `EMAIL_PREFERENCES_CREDENTIAL` on Astro.
- Scheduler/worker: `dispatch`; value is supplied in `EMAIL_DISPATCH_CREDENTIAL` on Convex and Astro and named by the matching client record.
- Provider webhook: `webhook`, preferably a distinct client/secret per business. Configure the Postmark webhook Authorization header to `Bearer` plus that secret, without displaying it in logs.
- Operator: only the needed `broadcast_preview`, `broadcast_approve` and separately `erase` permissions. Product signup credentials must never approve broadcasts or confirm addresses.

All credential variable names referenced by clients start with `EMAIL_`; values must contain at least 32 characters. Configure `EMAIL_TOKEN_SIGNING_KEY` (at least 32 random characters) only in Astro. Configure `EMAIL_SUPPRESSION_HASH_KEY` only in Convex, preserve it across deployments, and treat rotation as a tombstone migration: losing/changing it can invalidate erased-address suppression lookup. `EMAIL_CONVEX_URL` on Astro selects the exact isolated Convex deployment; it deliberately does not fall back to the existing production public URL.

Production dispatch additionally requires `EMAIL_ALLOW_PRODUCTION_SEND=true` in an actual `VERCEL_ENV=production` runtime. These gates do not authorize a production send. The worker reads `/server` and `/message-streams` before claiming a job and checks actual Server ID, Sandbox/Live mode, stream types and Postmark-managed unsubscribe policy. A config label alone cannot turn a Live token into a sandbox.

### Explicit transport and bounded Preview Live test

Application `environment` remains sandbox/production. Optional business `transport` is postmark (default) or capture; `providerMode` is Sandbox or Live, defaulting compatibly from application environment. Capture simulates local acceptance only, does not call a provider and does not prove reception. Postmark transport capabilities explicitly report no provider idempotency or automatic evidence lookup.

Sandbox application + Live provider requires a private `liveTest` object `{id,expiresAt,maxAttempts,recipients}`. `expiresAt` is an absolute Unix timestamp in milliseconds; maxAttempts is a positive bounded integer. Both this profile and `allowedRecipients` must admit the recipient. Only an internally created `operator` message can use this profile; newsletter, confirmation and generic service calls cannot. Configuration changes do not grant authority to add a recipient, reset a profile ID or increase the authorized budget.

Each actual dispatch reserves the finite total quota in a Convex mutation before provider submission. Concurrent workers cannot overspend. A repeated final recheck cannot reserve/send twice; a stable profile ID cannot replenish its quota by editing the configured maximum. Unknown attempts retain the consumed budget. Never delete or restore an older quota record to repeat a test. Route identity is persisted and compared at claim and final recheck; configuration drift fails closed. The serialized route contains private profile information and is excluded from operator responses. Previously uncertain routes must be reconciled before provider migration; this is not automatic historical-provider credential routing.

The worker verifies actual Postmark mode/server/streams before claiming and disables HTTP redirects for provider calls. A final policy or suppression check still precedes submission. No profile has been installed and no test email has been sent by these local changes.

### Commerce operator channel

Webhook stays the default. The email choice is explicit: `COMMERCE_ALERT_CHANNEL=email` and private `COMMERCE_ALERT_EMAIL_CONFIG` containing `{businessId,recipient,locale}`. It must resolve to an authorized email business and the same application environment. Configuration failure does not fall back to a second transport.

The outbox links atomically to one immutable operator message. It retains `emailState` separately from alert delivery status; queued/submitted/unknown are not delivered. Scheduled synchronization and authenticated provider events reconcile it; late hard bounce/complaint dominates delivery. An obsolete incident version blocks its unsent alert. Each cycle pins its channel, so changing configuration cannot silently resend it elsewhere. Manual re-alert refuses unresolved linked sends; an older delivered cycle does not prevent retrying a later definitive failure. Existing buyer-message ownership still needs reconciliation; no new purchase/access email was introduced.

The authenticated operations API can pause each business/class and inspect safe queue/attempt/event evidence. Independent watchdog monitoring and a non-email fallback remain required before public operation. Local configuration-presence indicators are not provider health checks.

## API and scheduling

All JSON product commands require `Authorization: Bearer ...`, `Content-Type: application/json` and a stable 16–128 character `Idempotency-Key`. Retry the identical semantic command with the same key; changing a request under a used key returns conflict. Public proxies use generic success/error copy and send no identity information back to the browser.

| Route | Behavior |
| --- | --- |
| `POST /api/v1/email/subscriptions` | `business_id,email,audience_id,purpose,source,notice_version,locale,consent:true,occurred_at`; proxy also supplies HMAC `abuse_key`. Creates pending DOI and confirmation outbox item. |
| `DELETE /api/v1/email/subscriptions/{subscription_id}` | JSON `business_id`; records scoped withdrawal under the authorized product client. |
| `GET /api/v1/email/preferences/resolve?token=...&lang=fr` | Displays an action form only. Scanners cannot confirm or unsubscribe through GET. |
| `POST /api/v1/email/preferences/resolve` | Signed opaque token resolves business and action; server-side digest record enforces expiry, generation and single use. Repeated identical POST returns the recorded result. |
| `POST /api/v1/email/messages/transactional` | Fixed `service_notification` template, `reason:service`, locale and recipient. Enable this permission only for a trusted service that verifies the underlying account operation; it is not a free-form mail endpoint. |
| `POST /api/v1/email/broadcasts` | Creates a one-recipient draft from escaped subject/paragraphs, audience/purpose and locale; returns rendered HTML/text for review. No send. |
| `POST /api/v1/email/broadcasts/approve` | `business_id,draft_id`; operator approves immutable content. Eligibility is rechecked before actual dispatch. |
| `POST /api/v1/email/dispatch` | Worker-only, one message claim per invocation. No browser access or product signup credential. |
| `POST /api/v1/email/webhooks/postmark?business_id=...` | Authenticates before parsing, validates stream/server binding, stores semantic deduplication and normalized effects durably. |

The Convex cron polls every minute once deployed; without configuration or worker credentials it is disabled. It calls the matching Astro dispatch endpoint. Queue persistence survives request failure. Confirmations expire after 24 hours; unsubscribe tokens after 365 days and on a later membership generation. Postmark-managed opt-out remains the visible newsletter link and receives the provider's native one-click headers; canonical signed preference tokens also support scoped withdrawal.

Bounded rate controls: 100 new commands/client/minute, three signup requests/address/hour and ten/IP-HMAC/hour when supplied. They are pilot quotas, not an unlimited campaign system. Raw IPs never enter the ledger. Rate-limit records require future retention cleanup before production scale.

## Provider behavior and recovery

Postmark has no send idempotency key. A claim creates a durable attempt and lease; the worker checks membership/suppressions again immediately before its provider call. A network error, timeout, gateway error or invalid success receipt becomes `unknown`, never an automatic resend. An authenticated correlated callback can reconcile the message. A lost lease likewise becomes uncertain. Do not manually resubmit uncertain work until provider evidence shows whether the first attempt was accepted.

An explicit 429 can retry with bounded exponential backoff and the provider's bounded Retry-After; five attempts is the limit. Known rejection is permanent. Hard bounce, complaint, opt-out and provider suppression restrict dispatch. Provider reactivation never grants consent or silently clears a suppression. Disabling the business stops future claims; an already in-flight email cannot be recalled.

Configure delivery, bounce, spam complaint and subscription-change webhooks on the actual isolated Server. Unknown event types are retained only as safe diagnostics. Disable payload content inclusion where possible. No raw provider body is stored. Never enable open/click tracking for this pilot (`TrackOpens:false`, `TrackLinks:None`). Polling/worker failures are safe coded Convex execution errors; aggregate alerting and operational ownership must be configured before public activation.

## Legal and privacy activation gates

Entity, establishment country, markets and retention policy were requested but not supplied in this run. Do not publish a universal compliance claim. The controller must approve the exact notice text/version, purposes, legal basis, contact for rights, retention by data class, subcontractors and applicable transfers before public activation. Account creation, purchases and licenses never create marketing permission.

FR/EU official references: [CNIL consent](https://cnil.fr/fr/les-bases-legales/consentement), [electronic prospecting](https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique-sms-mms-et-automate-dappel), [message classification](https://www.cnil.fr/fr/communication-electronique-quelles-regles), [suppression lists](https://www.cnil.fr/fr/comment-utiliser-une-liste-repoussoir-pour-respecter-lopposition-la-prospection-commerciale), [commercial retention guidance](https://www.cnil.fr/fr/questions-reponses-sur-les-referentiels-relatifs-la-gestion-des-activites-commerciales-et-des), [email pixels](https://www.cnil.fr/fr/faq-recommandation-pixels-courriers-electroniques), [GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj/fra). CNIL's three-year prospect/list guidance is contextual guidance, not a universal hard-coded legal period. Assess additional market rules once territories are known.

Operator `erase` removes scoped raw contact data and token/request payloads, redacts message bodies, and retains a keyed suppression tombstone. A shared address required by another business remains there. Commerce/entitlements are untouched. This bounded command is not a complete automatic retention or subject-access/export workflow. Approve separate retention periods for evidence, active prospects, attempts/events, retry records and opposition lists; implement and prove cleanup from that policy before production migration.

Review [Postmark DPA](https://postmarkapp.com/dpa) and [EU privacy information](https://postmarkapp.com/eu-privacy), plus the actual Convex and hosting contracts, subprocessors and transfers. Account approval alone proves neither those contracts nor sender DNS, receipt or compliance.

## Proof and remaining setup sequence

1. Review this local change and supply controller/market facts and policy decisions. Preserve the current disabled forms/transport.
2. With targeted approval, select/configure an isolated Convex deployment and Postmark Sandbox Server, actual sender and streams, signed preference origin, separate credentials and authenticated callbacks through secure settings. No invented server ID or domain appears in code.
3. Deploy only the approved non-production targets, verify the static-site server function and the central endpoints, then exercise sandbox receipt, callback/replay, suppression and outage scenarios. A sandbox message can consume provider volume and does not arrive in an inbox.
4. Obtain authorization for a specific recipient and live test scope before any real email. Verify received HTML/text, FR/EN, link/keyboard behavior, images-off, representative Gmail/Outlook/WebKit clients, authentication headers and withdrawal-before-next-dispatch. Check sender/domain DNS separately under its own approval.
5. Keep Resend unchanged until explicit migration, provenance, suppression parity, rollback and monitored cutover are approved and proven.

Local checks: `pnpm exec vitest run tests/email tests/bridge`, `pnpm build:check`, `pnpm exec tsc --noEmit -p convex/tsconfig.json`. The cross-layer lifecycle test uses actual Convex test mutations and mocked Postmark HTTP; it is not inbox or hosted proof. Convex CLI codegen requires a configured deployment; this run regenerated the API declaration using the installed Convex generator locally, with no deployment selection or push.

Official Postmark references checked September 5, 2026: [streams](https://postmarkapp.com/developer/api/message-streams-api), [server mode](https://postmarkapp.com/developer/api/server-api), [send idempotency limitation](https://postmarkapp.com/support/article/what-is-an-idempotency-key), [unsubscribe headers/custom approval](https://postmarkapp.com/support/article/1299-how-to-include-a-list-unsubscribe-header), [webhooks](https://postmarkapp.com/developer/webhooks/webhooks-overview), [SubscriptionChange](https://postmarkapp.com/developer/webhooks/subscription-change-webhook), [sandbox](https://postmarkapp.com/developer/user-guide/sandbox-mode).

## Other-product inventory

Current local evidence replaces old provider assumptions. ContentGlows's holding-page `site/api/waitlist.js` is already a generic mailing-list proxy, but its payload still lacks the full v1 notice/audience/locale/idempotency contract; no hosted connection was proved. Its lab newsletter route generates content/jobs, while `email-sidebar-app/packages/newsletter_studio_flutter` already owns composition, preview and send callbacks without recipients or transport. Reuse that boundary in a later approved integration. DreamGlows has no current newsletter surface in the inspected website. No other product was migrated or edited.
