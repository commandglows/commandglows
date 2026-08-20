---
artifact: technical_runbook
metadata_schema_version: "1.0"
artifact_version: "1.0.1"
project: "WinGlows"
created: "2026-05-21"
updated: "2026-05-23"
status: reviewed
source_skill: sf-docs
scope: "suite-authentication-support-runbook"
owner: "Diane"
confidence: high
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - "Former suite domain for WinGlows Formation"
  - "WinGlows Android app"
  - "ReplayGlowz"
  - "Clerk"
  - "Firebase Auth"
  - "Firestore"
  - "Convex"
  - "Polar"
  - "YouTube OAuth"
depends_on:
  - artifact: "/home/claude/shipglows_data/projects/winglowz/docs/technical/suite-authentication.md"
    artifact_version: "1.0.9"
    required_status: "reviewed"
  - artifact: "/home/claude/winglowz_app/docs/technical/suite-authentication.md"
    artifact_version: "1.0.8"
    required_status: "reviewed"
  - artifact: "/home/claude/winglowz_app/shipglows_data/workflow/specs/unified-suite-authentication.md"
    artifact_version: "1.0.24"
    required_status: "active"
supersedes: []
evidence:
  - "The suite auth strategy requires deny-by-default access and no silent email merge."
  - "The app pointer and spec both require redacted diagnostics and server-owned entitlements."
  - "Support cases must be handled without exposing tokens, secrets or raw OAuth/payment payloads."
  - "User correction 2026-05-23: ReplayGlowz is the canonical YouTube product and `product_id=replayglowz`; the old YouTube product naming is legacy only."
next_review: "2026-06-21"
next_step: "/sf-docs technical audit"
---

# Suite Authentication Support Runbook

Audience: Diane, operator, support.

## Invariant

One identity does not equal product access. Access is denied by default. A recognized account can still have no entitlement for a specific product. Duplicate emails are never silently merged.

## What To Collect

Collect only redacted diagnostic evidence:

- provider identifiers: redacted Clerk user id, Firebase uid, Convex `global_user_id`, Polar customer/subscription/order ids, YouTube OAuth account reference if ReplayGlowz is involved
- environment: local, preview, staging or production
- product: `product_id`, plan, entitlement status, timestamps, event ids, request ids, deployment URL or build id
- state: recognized / denied / pending review / revoked / expired / stale mirror / provider outage
- short reproduction steps and the last safe action taken

Do not collect or paste:

- tokens, refresh tokens, session cookies, API keys, secrets or signing material
- raw OAuth payloads, raw payment payloads, webhook bodies or private claims dumps
- PII beyond the minimum needed to identify the account owner in the support system

## Triage Matrix

| Symptom | Likely layer | Safe diagnosis | Safe action | Escalate / rollback |
| --- | --- | --- | --- | --- |
| Account recognized, no product access | Entitlement ledger | Identity is present but `product_id` is denied or missing | Confirm `product_id`, entitlement status, timestamps and environment | Recheck ledger or sync path; do not grant by email alone |
| Duplicate email or provider accounts | Identity linking | Same email exists in more than one provider/account | Open a linking case and gather proof of control for each session | Require explicit linking review; never silent-merge |
| Linking required | Identity bridge | A trusted provider account exists but cannot be mapped yet | Collect provider ids, environment and the blocked product | Route to support review or backend bridge fix |
| Missing entitlement after purchase | Billing to entitlement sync | Purchase succeeded but the entitlement ledger did not flip | Check event id, product, source, status and last sync time | Replay the verified event or rerun sync; do not manually guess access |
| Refund, revoke or expired access | Entitlement ledger | Access was removed intentionally or on schedule | Confirm source event and effective timestamp | If the removal was wrong, reverse through the source of truth and audit it |
| Firebase bridge failure | Firebase bridge / backend | Token exchange or bridge call failed closed | Collect environment, app build, bridge URL state and redacted request id | Escalate to backend owner; keep fail-closed behavior |
| Internal sync failure or stale Firestore mirror | Formation sync path | Convex changed but `suiteAccess` mirror did not | Compare ledger state, sync event id and mirror timestamp | Rerun sync or replay the verified entitlement mutation; do not edit client-side data |
| Revoked or disabled Firebase session | Firebase Admin revocation check | Token is structurally valid but no longer active | Ask the user to sign out and sign in again | Do not bypass revocation or reuse the revoked session |
| Provider outage or misconfiguration | Clerk, Firebase, Convex, Polar or YouTube | The service is unavailable, misrouted or pointing at the wrong environment | Confirm environment, callback URLs, webhook secrets and build config | Keep access denied, notify operators and wait for recovery |
| Wrong environment | Deployment/configuration | Preview, staging and prod are mixed | Check the deployment target, secrets set and callback origin | Roll back to the correct environment and invalidate stale sessions |
| ReplayGlowz YouTube OAuth confusion | Product permission vs suite identity | YouTube grant is missing or revoked, but suite login is fine | Explain that YouTube OAuth is a product permission, not the suite identity | Reconnect or revoke the YouTube grant only; do not touch suite identity unless needed |

## Escalation And Rollback

- If the issue is entitlement-related, trust the server-owned ledger first and the mirror second. If the mirror is stale, refresh the mirror from the ledger rather than editing client-visible state.
- If a purchase, refund or revoke event was processed against the wrong product or environment, stop and audit the source event before making any corrective change.
- If a duplicate email exists, do not merge accounts automatically. Require explicit linking or operator-reviewed evidence that the same person controls both provider sessions.
- If a provider outage is active, keep the product in deny-by-default mode and communicate that access is delayed, not lost.
- If a rollback is needed, revert only the most recent auditable entitlement mutation or mirror sync. Never roll back by editing support-visible data alone.

## Customer-Safe Copy

English:

- "We recognized your account, but access to this product is not active yet."
- "We found more than one account with this email. We need to link them before access can be restored."
- "Your access changed recently. If that looks wrong, we are checking the entitlement record."

Français:

- "Votre compte est reconnu, mais l’accès à ce produit n’est pas encore activé."
- "Nous avons trouvé plus d’un compte avec cette adresse. Nous devons les lier avant de rétablir l’accès."
- "Votre accès a changé récemment. Si cela semble incorrect, nous vérifions l’enregistrement d’entitlement."

## Before Ship Checklist

- Deployed Firebase / Convex / Firestore smoke passes in the intended environment.
- `SUITE_BRIDGE_SYNC_URL` is configured for the environment that handles grant/revoke mirroring.
- Grant flow flips the `suiteAccess` mirror from deny to allow for the correct `product_id`.
- Revoke or expiry flow flips the `suiteAccess` mirror from allow to deny.
- No email-only merge path exists.
- Support cases were tested for: recognized/no access, duplicate email, linking required, missing entitlement after purchase, refund/revoke, Firebase bridge failure, internal sync failure, revoked session, provider outage, wrong environment and ReplayGlowz YouTube OAuth confusion.
- All collected evidence is redacted and contains no tokens, secrets, raw payment payloads or raw OAuth payloads.
