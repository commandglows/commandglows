---
artifact: verification
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlowz"
created: "2026-08-03"
created_at: "2026-08-03 22:08:00 UTC"
updated: "2026-08-03"
updated_at: "2026-08-03 22:08:00 UTC"
status: reviewed
source_skill: 102-sg-start
source_model: "GPT-5 Codex"
scope: "winglows-identity-provider-baseline"
owner: "Diane"
confidence: high
risk_level: high
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "GitHub"
  - "Vercel"
  - "DNS"
  - "Firebase and Google Cloud"
  - "Google Play"
  - "Apple App Store"
  - "Clerk"
  - "Convex"
  - "Polar"
  - "Lemon Squeezy"
  - "Resend"
  - "CDN"
  - "Sentry"
depends_on:
  - artifact: "shipglows_data/workflow/specs/winglows-canonical-identity-and-store-republication.md"
    artifact_version: "1.0.0"
    required_status: ready
supersedes: []
evidence:
  - "Read-only CLI, DNS and HTTP checks completed without provider mutation or secret-value output."
next_step: "Provide authorized Firebase, Google Play, Apple, email and CDN presence proof; reserve exact com.winglows.app before dependent batches."
---

# WinGlows identity provider baseline

## Safety boundary

This is a redacted presence-and-authority baseline. It contains no token, secret, credential value, private key, service-account payload or provider object value. Every check was read-only. No traffic, DNS, domain assignment, repository, application record, environment variable or webhook was changed.

## Verdict

Batch 0 is partial. GitHub repository authority and domain ownership are evidenced, but the exact store identity and several provider authorities cannot be proved from the available authenticated tooling. `com.winglows.app` is not reserved or proven available by this run. Tasks dependent on store identity, Firebase app registration, email delivery or CDN ownership remain blocked at their preflight gate.

## Provider matrix

| Provider/surface | Read-only evidence | Result | Required before dependent batch |
| --- | --- | --- | --- |
| GitHub | Authenticated account has `ADMIN` on `diane-defores/winglowz`; `diane-defores/winglows` does not currently resolve as a repository. | pass for rename authority and target-name absence | Recheck immediately before the authorized rename; do not create or rename in Batch 0. |
| Vercel account/projects | Authenticated team access lists site project `winglowz` and app project `winglowz-app`. The app project still declares legacy root `winflowz_app`. | pass for read authority; migration required | Update roots only in the structural batch after reviewed source moves. |
| `winglows.com` | Domain is owned in the authenticated Vercel team with Vercel nameservers. Apex and `www` resolve, but both returned HTTP 404 and no healthy project assignment was proved. | partial | Attach only during the authorized cutover sequence after preview health; preserve current traffic. |
| `winflowz.com` | Domain is visible in the authenticated team and assigned to project `winglowz`; apex/`www` DNS resolve and `www` returned HTTP 200. | pass for legacy redirect ownership | Keep serving until canonical health and redirect rollback are proved. |
| `winglowz.com` | Domain is listed on project `winglowz`, but Vercel reports incorrect configuration and public DNS did not resolve. | warning/provider-history | Classify deliberately in the compatibility registry; do not rely on it for current traffic. |
| Firebase CLI | Local Firebase aliases/config exist and Firebase service-account configuration names are present in hosted env, but Firebase CLI reports no authorized account. | blocked | Authenticate an authorized Firebase operator and list the existing project/apps without exporting credentials. |
| Google Cloud | An active account and accessible project list are present, but this does not prove Firebase-app or Play Console authority. | insufficient | Use provider-specific authorized read access. |
| Google Play | No authenticated Play Console/API tooling or credential-name evidence was available. | blocked | Authorized operator must prove exact `com.winglows.app` availability/reservation and app-record ownership. |
| Apple App Store | Apple/Xcode/Fastlane/App Store Connect tooling and credential presence were absent. | blocked | Authorized Apple operator must prove exact bundle-ID availability, register it, and prove the separate app record before native publication work. |
| Clerk | Hosted environment contains publishable, secret and webhook configuration names across active environments; values were not read. | presence only | Authorized console owner must prove exact canonical and legacy domains/callbacks before cutover. |
| Convex | Hosted/local configuration names for Convex URLs and suite bridge secrets are present; values were not read. | presence only | Prove canonical deployment/env and bridge health through redacted hosted checks. |
| Polar | Access-token, product, server and webhook configuration names are present, including legacy product naming. | presence only | Inventory provider object IDs and callbacks by name/reference only; retain signed-webhook idempotency. |
| Lemon Squeezy | Store/API/webhook and legacy WinFlowz product/variant configuration names are present. | presence only | Inventory authoritative legacy objects and canonical mapping without changing IDs. |
| Resend/email | Resend API and audience/segment configuration names are present. No `@winglows.com` delivery/domain authority was proved. | partial | Prove new-domain sending and receiving plus legacy aliases before public legal/contact copy changes. |
| CDN/Bunny | Source contains CDN references, but no dedicated Bunny credential/configuration name or authenticated ownership proof was found. | blocked/unknown | Identify the actual CDN owner and prove canonical asset-host control, or document CDN as not applicable with evidence. |
| Sentry | Hosted environment contains Sentry DSN, environment and auth-token names; values were not read. | presence only | Prove release/environment naming and redacted issue correlation during hosted verification. |

## Configuration-name inventory

The presence scan found legacy commerce names such as `POLAR_WINFLOWZ_PRODUCT_ID` and `LEMONSQUEEZY_WINFLOWZ_APP_*`, plus current Clerk, Convex, Firebase, Resend and Sentry key families. These are migration inputs, not evidence that canonical aliases or provider-console objects already exist. Canonical values must win only after the compatibility registry and conflict tests are implemented.

## Stop conditions currently active

- Do not start native application-ID changes or store publication until both authorized store accounts prove the exact `com.winglows.app` identity.
- Do not change Firebase registrations until an authorized Firebase account can enumerate the current project and app baseline.
- Do not move DNS or attach the canonical domain to production until a canonical preview passes auth, access, commerce and rollback checks.
- Do not change public email/legal copy or CDN hosts until delivery and ownership are proved.
- Do not infer Play authority from Google Cloud authentication or infer provider readiness from environment-key presence.

## Worktree integrity

The concurrent `shipglows_data/workflow/TASKS.md` edit remained outside this run. Its baseline SHA-256 was `ba2d32a3b499fc6ebf4ee0c29049183ce12a26d9e0c9371d27bb30e419f66e7f` before provider checks and must match at handoff.
