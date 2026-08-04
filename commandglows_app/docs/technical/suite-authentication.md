---
artifact: technical_decision_pointer
metadata_schema_version: "1.0"
artifact_version: "1.0.9"
project: "CommandGlows App"
created: "2026-05-17"
updated: "2026-05-21"
status: reviewed
source_skill: sf-docs
scope: "suite-authentication-pointer"
owner: "Diane"
confidence: high
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - "CommandGlows suite auth"
  - "Clerk"
  - "Firebase Auth"
  - "Firestore"
depends_on:
  - artifact: "/home/claude/shipglows_data/projects/commandglows/docs/technical/suite-authentication.md"
    artifact_version: "1.0.8"
    required_status: "reviewed"
supersedes: []
evidence:
  - "Canonical suite auth decision documented in the main CommandGlows project on 2026-05-17."
  - "App domain contracts for suite identity and product entitlements added on 2026-05-20 without coupling Flutter UI to Clerk."
  - "App suite identity provider and settings diagnostics added on 2026-05-21 as a conservative local bridge placeholder."
  - "Firebase bridge client added on 2026-05-21: configured builds call the suite bridge with a Firebase ID token; unconfigured or failing bridge states stay fail-closed."
  - "Firestore entitlement enforcement added on 2026-05-21: Firestore rules require a server-owned `suiteAccess/{uid}` mirror for `commandglows_app`, and product stores stay local unless the suite identity snapshot grants access."
  - "Revocation mirror sync added on 2026-05-21: Formation Polar grant/refund/revoke paths can call an internal server endpoint that recomputes `suiteAccess/{uid}` from Convex outside the app login bridge path."
  - "Revoked-token policy added on 2026-05-21: the Formation Firebase bridge verifies ID tokens with Firebase Admin revocation checks and has no env toggle to bypass disabled/revoked session rejection."
  - "Support runbook pointer added on 2026-05-21 so operator triage stays aligned with the canonical suite decision."
  - "Redacted Task 10 smoke-readiness log pointer added on 2026-05-21."
next_review: "2026-06-17"
next_step: "/sf-spec unified-suite-authentication provider decision"
---

# Suite Authentication Pointer

The canonical suite authentication decision lives in:

`/home/claude/shipglows_data/projects/commandglows/docs/technical/suite-authentication.md`

For this Android app:

- Firebase Auth remains the active app auth adapter for now.
- Clerk is the long-term suite identity provider.
- The app should bridge Firebase `uid` to the suite `global_user_id`.
- Product access must come from server-owned entitlements, not from account existence.
- Do not migrate this app directly to Clerk Flutter/native until that path is proven on Android device QA.
- The app now has domain contracts, a Riverpod suite identity provider, non-sensitive Settings diagnostics, and a bridge client behind `SUITE_IDENTITY_BRIDGE_URL`.
- If `SUITE_IDENTITY_BRIDGE_URL` is missing, invalid, unavailable, or returns an unexpected payload, the app stays fail-closed: Firebase sign-in is recognized locally but does not imply a `globalUserId` or product entitlement.
- Firestore product data under `users/{uid}` is gated by a server-owned `suiteAccess/{uid}` mirror. The app also refuses to select Firestore-backed product stores unless `suiteIdentityProvider` grants `commandglows_app`.
- The `suiteAccess/{uid}` mirror is not client-readable or client-writable. It is written by the suite bridge backend after Firebase Admin token verification and Convex entitlement lookup.
- The Formation Firebase bridge checks revoked/disabled Firebase sessions server-side. A structurally valid but revoked Firebase ID token must be rejected before Convex identity linking or Firestore mirror writes.
- Entitlement changes no longer depend only on the next app login bridge call: Formation now has an internal sync endpoint for Polar grant/refund/revoke events. Production still needs configured `SUITE_BRIDGE_SYNC_URL` proof before final ship.
- Support operators should use the canonical runbook at `/home/claude/shipglows_data/projects/commandglows/docs/technical/suite-authentication-support-runbook.md` for account-recognition, linking, entitlement and provider triage.
- Redacted smoke-readiness log: [shipglows_data/workflow/TEST_LOG.md](</home/claude/commandglows/commandglows_app/shipglows_data/workflow/TEST_LOG.md>).

Implementation details belong in the active spec:

`shipglows_data/workflow/specs/unified-suite-authentication.md`
