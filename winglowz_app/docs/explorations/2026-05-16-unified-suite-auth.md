---
artifact: exploration_report
metadata_schema_version: "1.0"
artifact_version: "1.0.1"
project: "WinGlowz"
created: "2026-05-16"
updated: "2026-05-17"
status: draft
source_skill: sf-explore
scope: "unified-suite-authentication"
owner: "Diane"
confidence: medium
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - "winflows.com / WinGlowz site"
  - "WinGlowz Flutter app"
  - "Legacy video app"
  - "VoiceFlowz historical tracker, now legacy naming for WinGlowz app"
  - "Clerk"
  - "Firebase Auth"
  - "Convex"
  - "Polar"
  - "Firestore"
evidence:
  - "docs/DECISIONS.md"
  - "shipglows_data/technical/architecture.md"
  - "shipglows_data/technical/guidelines.md"
  - "/home/claude/shipglows_data/specs/master-auth-playbook.md"
  - "/home/claude/shipglows_data/projects/VoiceFlowz/TASKS.md"
  - "/home/claude/.claude/projects/-home-claude-winglowz/751f382a-c2fc-42ea-bf75-b4e0c48dd1c5"
depends_on:
  - "docs/DECISIONS.md@1.0.0"
supersedes: []
next_step: "/sf-spec unified-suite-authentication"
---

# Exploration Report: Unified Suite Authentication

## Starting Question

Should the product suite use one shared customer identity across WinGlowz,
WinGlowz app, Legacy video app, and related products, with per-product
access controlled separately, instead of keeping isolated authentication
domains?

## Context Read

- `docs/DECISIONS.md` - Current reviewed decision is backend-agnostic data
  contracts with Firebase Auth + Firestore as first Android adapter for the
  WinGlowz app. It does not decide suite-wide identity.
- `shipglows_data/technical/architecture.md` - User ownership comes from backend
  auth context, not client-provided IDs. This remains valid under either shared
  or product-local auth.
- `shipglows_data/technical/guidelines.md` - Firebase Auth + Firestore is current
  WinGlowz app direction; Convex/Clerk/Supabase are legacy for this app, not a
  workspace-wide prohibition.
- `/home/claude/shipglows_data/specs/master-auth-playbook.md` - Cross-project
  auth playbook says one documented session owner per runtime and separate
  local/preview/staging/prod auth environments. It explicitly scopes out
  migrating every app to one provider.
- `/home/claude/shipglows_data/projects/VoiceFlowz/TASKS.md` - Historical
  tracker for the app now known as WinGlowz app. The legacy task "Configure
  Clerk for auth (shared with WinGlowz)" is a signal in favor of shared suite
  auth, not against it. Treat VoiceFlowz / VoiceFlows as old naming, not as a
  separate current product.
- `/home/claude/.claude/projects/-home-claude-winglowz/...` - Historical session
  decided to keep separate product sites while making WinGlowz an umbrella brand
  with unified pricing/bundle. This decision is about sites/pricing, not account
  identity separation.

## Internet Research

- [Firebase projects](https://firebase.google.com/docs/projects/learn-more) -
  Accessed 2026-05-16 - Firebase apps in the same Firebase project share
  backends including Authentication and Firestore; this supports one Firebase
  project as a shared identity/data plane if desired.
- [Firebase custom claims](https://firebase.google.com/docs/auth/admin/custom-claims) -
  Accessed 2026-05-16 - Custom claims can support coarse roles/access in tokens,
  but payload is limited to 1000 bytes, so product entitlements should not live
  only in claims.
- [Identity Platform multi-tenancy](https://cloud.google.com/identity-platform/docs/multi-tenancy) -
  Accessed 2026-05-16 - Tenants create separate user/config silos in one project;
  useful for B2B customer isolation, not the default fit for one consumer
  identity across first-party products.
- [Auth0 SSO](https://auth0.com/docs/authenticate/single-sign-on) - Accessed
  2026-05-16 - SSO is exactly the pattern where users sign in once and can be
  authenticated across multiple apps/domains through a central auth domain.
- [Auth0 B2B authentication guidance](https://auth0.com/docs/get-started/architecture-scenarios/business-to-business/authentication) -
  Accessed 2026-05-16 - For more than one app, centralized login is recommended
  for security and user experience.
- [Auth0 multiple organization architecture](https://auth0.com/docs/get-started/architecture-scenarios/multiple-organization-architecture) -
  Accessed 2026-05-16 - Distinguishes isolated users from shared users; shared
  users can belong to multiple organizations without separate identities.
- [Clerk authenticated requests](https://clerk.com/docs/guides/development/making-requests#cross-origin-requests) -
  Accessed 2026-05-16 - Same-origin requests can include session automatically;
  cross-origin requests need bearer token forwarding. Relevant if first-party
  apps use separate domains/subdomains.

## Problem Framing

The core split is not "one account means access to all products". It is:

- authentication: who is this person?
- authorization/entitlements: what can this person use?
- product data isolation: which product data may this account read/write?

A professional suite normally centralizes identity and separates access. A user
can exist globally and have zero entitlements for most products.

## Option Space

### Option A: Separate Auth Per Product

- Summary: Each product owns its own auth provider/project/users.
- Pros: Strong product isolation; simpler per-product experiments; easier to
  delete or sell a product separately.
- Cons: Duplicate accounts, duplicate password resets, fragmented support,
  harder bundles/cross-sell, more auth configs, more migration debt.

### Option B: Shared Suite Identity, Product Entitlements Separate

- Summary: One identity provider/project for all first-party products; every
  product has product-specific authorization and data namespaces.
- Pros: Best user experience; supports bundles; one account support surface;
  easier cross-product upsell; consistent security policy and MFA later.
- Cons: Requires deliberate entitlement model, product namespaces, app IDs,
  token validation and migration plan; auth incident blast radius is wider.

### Option C: Shared IdP Plus Product-Local Backends

- Summary: One identity provider, but each product keeps its own backend. Each
  backend trusts the central token and maps global user ID to local product data.
- Pros: Good compromise for existing mixed stack: WinGlowz site can stay
  Clerk/Convex for now, WinGlowz app can stay Firebase while a central identity
  decision is designed.
- Cons: Needs token exchange/identity bridge if providers differ; more moving
  parts than a pure single-project Firebase or pure Clerk setup.

### Option D: Identity Platform Tenants Per Product

- Summary: One Google Identity Platform project with tenants such as winglowz,
  legacy_video_app, socialflow.
- Pros: Centralized admin with isolated user silos/config.
- Cons: Tenants are separate user silos, which contradicts the "one customer
  account across products" goal unless used for true B2B customer isolation.

## Emerging Recommendation

Adopt Option B as the target principle: one suite identity, product access
separate. For implementation, Option C may be the pragmatic migration bridge if
existing products are already split across Clerk/Convex and Firebase.

Do not model products as auth tenants by default. Model products as applications
and entitlements under a global identity.

## Provider Recommendation Addendum: 2026-05-17

Recommended default for the first production slice: **Clerk as the suite identity
provider for web-first products, with a bounded Firebase bridge for the
WinGlowz Android app until the native/mobile path is proven.**

Reasoning:

- WinGlowz Formation already has Clerk/Convex/Polar traces and production work.
- Legacy video app has Clerk/Convex/YouTube OAuth traces, so Clerk minimizes web-side
  migration.
- Clerk now documents OIDC/OAuth IdP behavior and a first-party Convex
  integration, which fits the current web/backend footprint.
- Clerk Flutter exists but was announced as beta, so the Android app should not
  be forced onto it before device smoke proves it. Keep the WinGlowz app's
  Firebase Auth adapter behind the backend-agnostic contract while mapping to a
  `global_user_id`.
- Auth0 remains the strongest enterprise CIAM fallback if SSO/MFA/orgs/audit
  requirements outgrow Clerk or if the team wants the most standard
  cross-platform OIDC posture despite higher cost and migration complexity.
- Firebase/Google Identity Platform remains strongest for the Flutter/Android
  app, but using it as the whole suite IdP would require more migration from the
  current web stack.

Decision shape:

```text
First slice
  Suite identity owner: Clerk
  Web products: Clerk session -> Convex/backend -> entitlement checks
  WinGlowz app: Firebase Auth remains local app auth adapter
  Bridge: Firebase uid + Clerk/global_user_id mapping, no silent email merge

Future simplification gate
  Either migrate app auth to Clerk when mobile proof is mature,
  or promote Firebase/Identity Platform only if web stack migration becomes worth it.
```

Sources checked:

- Clerk as OAuth/OIDC IdP docs, accessed 2026-05-17:
  https://clerk.com/docs/guides/configure/auth-strategies/oauth/single-sign-on
- Clerk + Convex integration docs, accessed 2026-05-17:
  https://clerk.com/docs/guides/development/integrations/databases/convex
- Clerk Flutter SDK beta changelog, accessed 2026-05-17:
  https://clerk.com/changelog/2025-03-26-flutter-sdk-beta
- Auth0 B2B authentication docs, accessed 2026-05-17:
  https://auth0.com/docs/get-started/architecture-scenarios/business-to-business/authentication
- Firebase Auth custom claims docs, accessed 2026-05-17:
  https://firebase.google.com/docs/auth/admin/custom-claims

Suggested canonical model:

```text
Global Identity
  user_id
  email / providers / MFA / profile

Entitlements
  product_id: winglowz_training | winglowz_app | legacy_video_app | socialflow
  plan: free | pro | lifetime | bundle | trial
  status: active | inactive | refunded | expired
  source: polar | app_store | manual | legacy

Product Data
  products/{product_id}/users/{user_id}/...
  or users/{user_id}/products/{product_id}/...
```

## Non-Decisions

- Exact provider is not decided: Clerk, Firebase/Identity Platform, Auth0, or
  another CIAM provider need a spec-level comparison.
- Existing users are not migrated in this exploration.
- No product access is automatically granted by shared identity.
- Product sites can remain separate; shared auth does not require one website.

## Rejected Paths

- "Separate accounts because products are separate" - rejected as default
  direction; it increases friction and operational work without improving
  authorization if entitlements are modeled correctly.
- "One account means all access" - rejected; identity and entitlements must stay
  separate.
- "Firebase/Identity Platform tenant per product" - not the default fit because
  tenants are user silos.

## Risks And Unknowns

- Existing provider split: current WinGlowz app uses Firebase direction; older
  WinGlowz site and legacy video-app references use Clerk/Convex. A provider decision or
  token-bridge plan is required.
- Account linking: existing users with same email across systems need safe merge
  rules, not silent merging.
- Privacy/cross-sell: users should not be surprised by visible cross-product
  profiling. Shared identity can be invisible until they try another product.
- Entitlement source of truth: Polar/App Store/Google Play/manual grants must be
  reconciled into one readable contract.
- Security blast radius: one IdP means one auth incident can affect all products,
  so MFA, webhook verification, token validation and audit logs matter more.

## Redaction Review

- Reviewed: yes
- Sensitive inputs seen: historical logs and local docs were searched; no
  secrets were persisted.
- Redactions applied: none needed.
- Notes: Historical session content is summarized instead of copied in full.

## Decision Inputs For Spec

- User story seed: As the builder of a product suite, I want one customer
  identity across first-party products with per-product entitlements, so users
  can reuse the same login while each product remains securely isolated.
- Scope in seed: provider comparison, global user ID, entitlement model,
  product namespaces, token validation, account linking, migration path, docs.
- Scope out seed: granting all products to all users, redesigning pricing,
  migrating every product in one step, enterprise SSO, organization/team admin.
- Invariants/constraints seed:
  - Authentication identifies the person.
  - Authorization decides product access.
  - Product data is namespaced and guarded server-side.
  - Client-provided user IDs are never trusted.
  - Existing users are not silently merged.
  - Local/preview/prod remain separate environments.
- Validation seed:
  - Sign in once and access an entitled product.
  - Try another product without entitlement and get a clean "same account, no
    access yet" state.
  - Verify backend denies unauthorized product data.
  - Verify sign-out/session restore across at least two products.
  - Verify purchase/grant updates entitlement without exposing secrets.

## Handoff

- Recommended next command: `/sf-spec unified-suite-authentication`
- Why this next step: This can invalidate current auth-provider choices,
  Firebase project layout, Clerk/Convex assumptions, payment webhooks, and
  product route guards. It should become an explicit architecture decision before
  more auth hardening is shipped per product.

## Exploration Run History

| Date UTC | Prompt/Focus | Action | Result | Next step |
|----------|--------------|--------|--------|-----------|
| 2026-05-16 00:00:00 UTC | Shared account across product suite | Searched local WinGlowz docs, ShipGlows auth playbook, project trackers, historical WinGlowz session notes, and current identity-provider docs | No binding decision found against shared suite identity; evidence favors shared identity with separate entitlements | `/sf-spec unified-suite-authentication` |
