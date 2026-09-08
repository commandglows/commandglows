---
artifact: documentation
metadata_schema_version: "1.0"
artifact_version: "0.1.0"
project: "CommandGlows"
created: "2026-09-08"
updated: "2026-09-08"
status: "draft"
source_skill: "sg-development"
scope: "gmail_support_backend"
owner: "Diane"
confidence: "medium"
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems: ["shipglows-email-engine", "Gmail", "Mutant Mail"]
depends_on: ["newsletter-campaign-api.md"]
supersedes: []
evidence: ["commandglows_site/tests/email/support.test.ts"]
next_step: "Configure an authorized hosted test scope, connect an owned mailbox, verify relay routing before enabling replies."
---

# Personal Gmail support backend

The approved cockpit keeps Sources on Readwise Reader, Service client on owned Gmail mailboxes, and Diffusion on Postmark. This additive backend uses the existing Clerk administrator authority and a server-only Convex operator credential. No mailbox has been connected and no live message has been sent by this implementation.

## Configuration contract

Server-only Astro environment:

- `EMAIL_GMAIL_CLIENT_ID`, `EMAIL_GMAIL_CLIENT_SECRET`: Google OAuth web application.
- `EMAIL_GMAIL_REDIRECT_URI`: exact HTTPS callback `/api/admin/email/support/oauth/callback` on the same host as the cockpit.
- `EMAIL_SUPPORT_TOKEN_KEY`: dedicated base64-encoded 32-byte encryption key. Never a public variable. Rotate by reconnecting mailboxes after replacing this key; no automatic plaintext migration.
- `EMAIL_SUPPORT_MAILBOXES`: JSON array of `{id,email,actorId,relayDomains}`. `actorId` is the authorized Clerk administrator ID, `email` the exact owned Google account, `relayDomains` an exact lowercase allowlist established from a real Mutant Mail Reply-To. No relay domain is guessed or hardcoded.
- `EMAIL_SUPPORT_REPLY_ENABLED`: only exact `true` enables reply eligibility. Leave absent until actual relay and inbox proof passes.
- Existing `PUBLIC_CONVEX_URL`, `SUITE_BRIDGE_CONVEX_SECRET`, `EMAIL_CONVEX_URL`, `EMAIL_OPERATOR_CREDENTIAL` remain required.

Convex requires the same server-only `EMAIL_OPERATOR_CREDENTIAL` (at least32 characters) and `EMAIL_SUPPORT_MAILBOXES` actor/mailbox mapping. Gmail secrets and encryption key stay in Astro; Convex stores only authenticated ciphertext for tokens and OAuth PKCE verifier. Gmail message bodies are fetched on demand and not persisted. Support statuses and send receipts are persisted.

OAuth requests readonly + send scopes, offline access and explicit consent. The state is random, hashed in storage, actor/mailbox scoped, valid10 minutes, consumed atomically before exchanging the code. PKCE uses S256. Gmail profile must match the configured account and both scopes must be granted before storing an encrypted refresh token. No token is returned to the browser. The callback redirects to a fixed internal cockpit route with a non-sensitive outcome.

## HTTP contract

All paths below begin `/api/admin/email/support`. Responses are `no-store`, JSON, and require current Clerk admin authorization. POST requires same-origin Origin, bounded JSON and strict body keys. No browser request can supply a provider token or recipient.

- GET `context`: `{configured,disabled_reason,mailboxes:[{id,email,connected}],can_reply}`. Connected means credentials stored, not proof of present Google validity.
- POST `oauth/start` `{mailbox_id}`: `{authorization_url}`.
- GET `threads?mailbox_id=&cursor=`: inbox page of at most15 threads, five concurrent detail fetches per slice, `next_cursor`.
- GET `threads/{id}?mailbox_id=`: `{thread:{id,subject,status,snippet,from,updated_at,latest_message_id,reply_to,can_reply,reply_disabled_reason,messages:[{id,from,to,text,date}]}}`.
- POST `threads/{id}/status` `{mailbox_id,status}`: pending, waiting or resolved. This is cockpit metadata; Gmail labels are not modified. Status records bind to the latest incoming message. New client replies reopen the conversation as pending; outgoing messages and Gmail drafts do not.
- POST `threads/{id}/reply` `{mailbox_id,body,expected_message_id,confirmed:true}`, with `Idempotency-Key`: `{state:'submitted'|'unknown',message_id}`. Submitted means Gmail accepted, not recipient delivery.

## Routing and duplicate-send boundary

Only an unambiguous single Reply-To address on a configured relay domain is accepted. The exact address is preserved; From/customer fallback is forbidden. Missing or ambiguous relay, own latest SENT message, unavailable activation or invalid Message-ID disables replying. Header CR/LF/NUL is rejected, text is base64 MIME encoded, and UTF-8 subject is encoded. In-Reply-To, References and Gmail threadId preserve conversation association.

Before dispatch an atomic durable lock reserves the mailbox/thread/latest-message. Unknown acceptance remains locked even across restart, and changing the idempotency key cannot bypass it. There is no automatic resend and no browser unlock endpoint. A provider rejection also remains conservatively unknown; the operator must check Gmail/relay before any later reconciliation tooling is designed. A new incoming message produces a new reply opportunity. A crash after reservation but before send is deliberately treated as unknown.

## Verification and limits

Focused tests cover ownership, ciphertext tampering, relay/address/header handling, plain-text-only viewing, missing admin, no token exposure, OAuth one-time state, stale-message confirmation, streamed response bounds and concurrent atomic send ownership. Convex typecheck passes. Live OAuth, consent-screen settings, hosted session/callback, exact relay-domain configuration, customer-visible sender and real inbox delivery remain unverified. No provider or deployment configuration was changed.

The initial read is inbox pagination on demand, not an incremental push-sync daemon or full Gmail replacement. It omits attachments/HTML display, Gmail label editing, account revocation UI and global retention automation. OAuth starts permit at most five active states per mailbox and clean up at most50 expired states on each start; expired consumed states are deleted immediately. The generic storage API is server-credential gated and actor-allowlisted; browser access to Convex directly does not grant credentials.

Official references: [OAuth web flow](https://developers.google.com/identity/protocols/oauth2/web-server), [Gmail sending MIME messages](https://developers.google.com/workspace/gmail/api/guides/sending).
