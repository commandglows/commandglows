---
artifact: technical_guidelines
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: commandglows
created: "2026-09-07"
updated: "2026-09-07"
status: active
source_skill: sg-development
scope: site-authentication
owner: Diane
confidence: high
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems: [Astro, Auth0, Convex, Clerk]
depends_on: [shipglows_data/workflow/specs/commerce-launch-readiness.md]
supersedes: []
evidence: [commandglows_site/src/lib/auth/siteAuth.ts, commandglows_site/convex/siteIdentity.ts, commandglows_site/convex/siteSessions.ts]
next_review: "2026-10-07"
next_step: Verify the declared Auth0 test application and hosted login before activating the provider selector.
---

# Site authentication and migration

The site consumes `locals.siteAuth()`: a canonical account ID, minimal display
attributes, server-owned role and current formation access. Provider identifiers
and SDK types stay inside authentication adapters. Authentication does not grant
commercial access. Existing purchases and ledger records are never reassigned by
email matching.

## Configuration and activation

`SITE_AUTH_PROVIDER` selects `auth0` or the transitional default `clerk`. Unknown
values fail closed. Clerk remains an explicit rollback and account-recovery
adapter, plus compatibility for ReplayGlowz bearer tokens and lifecycle webhooks;
those product integrations are not silently migrated with the site.

Auth0 configuration is server-only:

| Name | Contract |
| --- | --- |
| AUTH0_ISSUER | Exact HTTPS tenant/custom-domain issuer, including trailing slash. |
| AUTH0_CLIENT_ID | Dedicated regular web application client. |
| AUTH0_CLIENT_SECRET | Confidential web application secret in provider secret storage. |
| AUTH_SESSION_SECRET | 32 random bytes encoded as 64 hex characters, stored as a secret. |
| AUTH_SITE_ORIGIN | Exact served origin; HTTPS, or declared loopback HTTP development origin. |
| PUBLIC_CONVEX_URL | Selected deployment URL. |
| SUITE_BRIDGE_CONVEX_SECRET | Existing server-to-server authority, never sent to the browser. |
| SUITE_BRIDGE_ENVIRONMENT | Exact declared environment, normalized to sandbox/production and checked on the backend. |

Auth0 callback is exactly `<AUTH_SITE_ORIGIN>/api/auth/callback`; logout allowlist
contains exactly `<AUTH_SITE_ORIGIN>/`. The response CSP preserves the deployment
policy and adds only the configured issuer origin to `form-action`, permitting
the POST link/logout redirect. Verify this header on the actual hosted origin. No wildcard preview callbacks. Keep the
provider selector on Clerk until the dedicated Auth0 application, origin, secrets
and shared backend changes are verified. A tenant whose name starts with `dev`
may already serve production; the ContentGlows tenant is not assumed disposable.
Never copy a native or SPA client secret contract into this server application.

The adapter uses Authorization Code with PKCE, state and nonce via `openid-client`,
plus explicit signed ID-token verification via `jose`. Tokens are not retained in
cookies or exposed as API bearers. Encrypted HttpOnly SameSite=Lax session cookies
expire at the earlier of the identity token expiry or one hour. Expiry leads to
fresh sign-in; no refresh tokens are requested. Session cookies bind origin,
client and purpose. Login/logout routes are not cacheable; mutation routes require
same-origin requests.

## Existing accounts and recovery

Before switching a paid/admin account, visit `/account/link-existing`. Sign in to
the old account, then explicitly confirm the Auth0 login. Only the verified old
session identifier inside the encrypted transaction reaches the linking mutation.
Issuer + subject + environment identify the new external account. Existing
unscoped ContentGlows Auth0 identities are not silently adopted. Site identities
use the isolated `site:auth0` provider namespace so legacy subject-only bridges
cannot accidentally adopt the new account.

A new external identity can create a new internal account without entitlements.
If both external identities already belong to different internal accounts, linking
returns a visible conflict. No automatic merge, payment movement or role promotion
occurs. The buyer can contact support from the error page. Operator resolution
requires review of both account-control proofs and ledger ownership; keep the case
open and record the outcome. Email matching is not sufficient. Bulk account merging
is not implemented by this migration.

Linking is idempotent and writes one `identity_linked` audit event. Deleting a Clerk
identity after linking preserves the canonical profile/admin role when another
identity remains. The legacy Clerk mapping itself no longer resolves after deletion.

## Logout and recovery failures

Each login creates a bounded pending server attempt. Callback activation is atomic
and rejects expired, revoked or already-used attempts. Logout revokes both pending
and active attempts before clearing cookies. Every authenticated request checks
that its encrypted attempt remains active; a late callback cannot resurrect a
revoked session. A backend failure denies protected access and presents a retryable
503. Failed logout retains the cookies needed to retry revocation and does not
claim successful logout. Cleanup removes at most 100 attempts expired for over an
hour every 15 minutes, preserving existing commerce and email crons.

## Deployment and acceptance

The transitional Astro Clerk integration still injects its browser SDK globally.
Auth0 server sessions and canonical authorization do not use that SDK, but removing
the global browser dependency requires replacing the remaining legacy recovery UI
with a route-scoped client before removing the integration. Full Clerk removal is
not claimed by this checkpoint.

Implementation checkpoint: 346 focused tests pass. The additive backend is deployed
to the existing development deployment (32 tables, no further table/index removals;
commerce and email crons retained). The hosted preview renders legacy recovery;
authenticated Auth0 acceptance remains pending. Operator CLI login is now verified;
the accessible tenant already serves ContentGlows and has no CommandGlows client.
The operator approved centralized management with distinct technical application
configurations and separate test/production tenants. CommandGlows acceptance targets
a shared suite test tenant, not a new tenant per business. The existing tenant is
not reclassified or migrated by this decision. The CLI currently knows only that
existing tenant; the dashboard requires its own operator sign-in before available
test tenants can be checked. No Auth0 tenant/client configuration or production
activation was performed.

Application configurations identify each independently deployed login client for
callback allowlists, confidential-client credentials and authentication diagnostics.
They do not create separate user directories within a tenant and do not isolate
sensitive business data. Additional business boundaries require explicit review;
the current approval does not onboard unrelated businesses or change their data.

Capture live schema/indexes, functions and crons before any shared-backend deploy.
The audited dev schema contains 31 existing tables. The planned delta adds
`siteLoginAttempts`, optional `identityAccounts.issuer` and a scoped identity index;
other existing tables/indexes are preserved. Historic empty email-table index drift
from the earlier commerce deployment remains a separate unresolved incident.

Deploy additive backend functions before switching frontend calls. Verify both
legacy login and new account recovery, then Auth0 callback/login, backend accepted
identity, paid access, unlicensed denial, admin preservation, wrong account, logout,
expired session and refresh of another tab. Source tests are not hosted proof.
Rollback uses the previous frontend checkpoint and retains additive identity/session
records; never roll back by deleting shared tables. Resume Stripe and actual alert
reception checks only after authentication acceptance. Production activation and
commercial opening remain outside current authorization.

Official references: [Auth0 authorization code flow](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow),
[PKCE](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-pkce).
