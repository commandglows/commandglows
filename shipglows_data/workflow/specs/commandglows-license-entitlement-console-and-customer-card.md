---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.1.0"
project: "CommandGlows"
created: "2026-08-18"
created_at: "2026-08-18 12:51:40 UTC"
updated: "2026-08-18"
updated_at: "2026-08-18 13:21:17 UTC"
status: implemented
source_skill: 100-sg-spec
source_model: "GPT-5.6 Codex"
scope: "commandglows-license-entitlement-console-and-customer-card"
owner: "Diane"
user_story: "As the suite operator and as an authenticated customer, I want the canonical CommandGlows entitlement ledger to expose an auditable operator console and a clear customer licence summary without introducing licence keys or a second authority."
confidence: high
risk_level: high
security_impact: "yes"
docs_impact: "yes"
content_surfaces:
  - "CommandGlows protected dashboard"
  - "CommunityGlows billing settings"
linked_systems:
  - "CommandGlows Convex canonical entitlement ledger"
  - "Clerk Astro"
  - "Stripe Managed Payments"
  - "CommunityGlows Convex adapter"
  - "CommunityGlows authenticated app"
depends_on:
  - artifact: "shipglows_data/technical/design-system-authority.md"
    artifact_version: "2.2.0"
    required_status: active
  - artifact: "unified-suite-commercial-entitlement-and-stripe.md"
    artifact_version: "1.0.0"
    required_status: active
supersedes: []
evidence:
  - "Operator approval 2026-08-18: build a private licence console and a customer-facing summary while CommandGlows remains the sole authority."
  - "CommandGlows already owns globalUsers, identityAccounts, productEntitlements, productAccessEvents, Stripe ingestion, and support mutations."
  - "CommunityGlows already consumes a signed fail-closed access snapshot and exposes a tokenized BillingAccessPanel."
  - "Implementation proof 2026-08-18: 17 focused CommandGlows tests, 46 focused CommunityGlows tests, CommandGlows Astro/Convex checks, CommunityGlows core/Convex checks and Chrome build pass; both changed-file design drift scans report zero defects."
  - "Browser proof 2026-08-18: the Clerk-authenticated CommandGlows console renders and hydrates at its canonical local URL; missing local bridge configuration fails closed with 503. Chrome blocks the unpacked-extension Vite surface, so customer-card rendered proof remains deferred."
next_step: "Configure the CommandGlows local server bridge environment through the approved secret workflow, then capture one admin search/detail state and one authenticated CommunityGlows licence-card state before release."
---

# Title

CommandGlows Licence Entitlement Console and Customer Card

# Status

Implemented locally with release proof pending. CommandGlows remains the only durable authorization authority; CommunityGlows receives a redacted account-scoped snapshot.

# User Story

As the suite operator, when I support a customer, I want to find the canonical account, understand its trials, purchases, access events, and recognized installations, and perform a justified manual grant or revoke through an audited server path. As an authenticated customer, when I open billing settings, I want to understand what I own, when access began, what it unlocks, and how many installations are recognized without handling a licence key.

# Minimal Behavior Contract

An authenticated CommandGlows administrator can search a bounded, redacted licence view and inspect one account's canonical entitlements, event history, identities, and known product installations. Manual grant and revoke require an explicit reason, execute server-side, and append an auditable event. A normal authenticated customer receives only their own redacted product licence summary through the existing signed CommunityGlows bridge. Signed-out, non-admin, cross-user, malformed, stale, or unavailable states fail closed. The easiest missed edge case is treating an email match or client-visible role as authorization and silently attaching the wrong purchase to another account.

# Success Behavior

- CommandGlows exposes a protected Licences page whose data is supplied only after server-side Clerk identity and canonical admin-role verification.
- Search accepts a normalized email, public global user id, or redacted provider reference and returns bounded summaries without raw secrets, codes, hashes, or webhook payloads.
- Detail shows product, plan, status, source, grant/purchase date, update date, trial attempts, recent access events, and recognized-installation count.
- Manual grant/revoke requires a non-empty support reason, is idempotent, and creates an audit event naming the admin actor through a pseudonymous reference.
- CommunityGlows shows the authenticated user's current licence/trial, access explanation, entitlement date, restart allowance, and recognized-installation count from the central snapshot.
- No device cap is enforced in this slice; the existing anti-abuse signal is explicitly labelled as recognized installations, never as licensed-device activations.

# Error Behavior

- Signed-out dashboard/API requests return authentication-required behavior without data.
- Signed-in non-admin requests return forbidden behavior and never reveal whether a searched customer exists.
- Empty, excessively long, malformed, or broad wildcard searches are rejected or return a bounded empty result.
- Missing identity mapping, ambiguous duplicate email, or pending-review commerce state is surfaced as non-authorizing support recovery; no silent merge occurs.
- Bridge or Convex failure preserves the existing CommunityGlows fail-closed/grace contract and never fabricates purchase dates or installation counts.
- A repeated grant/revoke does not duplicate active entitlements or audit transitions.

# Problem

The suite already has the correct durable ledger but no safe operator-facing console. Customers can see a coarse access state but not a human-readable ownership summary. Support therefore depends on raw Convex inspection, while product users cannot easily confirm what they bought or what the entitlement covers.

# Solution

Add server-owned support queries and mutations to CommandGlows Convex, expose them through Clerk-protected Astro API endpoints that inject the server bridge secret, and build a tokenized protected dashboard page. Extend the existing CommunityGlows snapshot with redacted entitlement metadata and a count of known installations, then render that information inside the existing BillingAccessPanel. Reuse the canonical ledger and product trial installation signal; do not introduce licence keys or a parallel licence database.

# Scope In

- Canonical admin search/detail query with redacted identities, entitlements, events, and recognized-installation count.
- Audited manual grant and revoke for allowlisted products/plans.
- Server-side admin authorization through Clerk user id mapped to CommandGlows user role.
- Protected CommandGlows Licences dashboard and navigation entry.
- Customer licence summary fields in the existing CommunityGlows bridge snapshot and BillingAccessPanel.
- Informational recognized-installation count with no cap or device-licensing claim.
- Focused unit, integration, auth-denial, UI, token, and browser proof.

# Scope Out

- Device deactivation, device naming, hardware fingerprinting, remote logout, or an activation cap.
- Email-only licence claims, automatic account merges, raw licence keys, or a second entitlement ledger.
- Stripe refunds from the console, production deployment, push, provider configuration, invoices, tax, or accounting.
- Bulk exports, pagination beyond the bounded MVP result set, or destructive customer deletion.

# Constraints

- Authentication proves identity only; canonical server role and entitlement state authorize operations.
- Stripe remains an event source; Convex remains authorization truth.
- Search and support output redact secrets, raw activation codes, installation/network hashes, webhook payloads, and unnecessary PII.
- CommunityGlows receives only its own product-scoped snapshot and cannot request an arbitrary user.
- Existing dashboard and CommunityGlows design-token authorities must be consumed without new unexplained visual literals.
- Existing unrelated dirty work is preserved; no commit, push, or deployment is authorized.

# Test Contract

- Proof path: test-first for support query/action behavior, scenario-first for auth and entitlement boundaries, evidence-first for protected UI rendering.
- Automated: Convex tests for admin/non-admin, zero/one/many results, duplicate email ambiguity, grant/revoke idempotency, redaction, and customer snapshot isolation; CommunityGlows billing/component tests; site build/typecheck.
- Browser/auth: protected dashboard admin state, forbidden non-admin state where safely reproducible, customer BillingAccessPanel states, responsive/light/dark/keyboard inspection.
- Integration: representative trial, paid, replay, revoke/refund, and known-installation count against the normal snapshot path.
- Provider/production proof is excluded; existing Stripe hosted proof remains separate.

# Dependencies

- Existing Clerk webhook mapping to CommandGlows users/globalUsers.
- Existing Convex canonical tables and bridge secret.
- Existing dashboard private shell and CommunityGlows BillingAccessPanel.
- Existing design tokens and generated adapters in both projects.

# Invariants

- One durable ledger only.
- No user can select another user's global id in a customer-facing call.
- UI visibility never substitutes for server authorization.
- Manual support actions are explicit, reasoned, idempotent, allowlisted, and auditable.
- Refund/revoke/expiry remains non-granting and never recreates trial allowance.
- Known installations are informational until a separately approved device policy exists.

# Links & Consequences

- Extends the unified suite commercial entitlement contract without changing trial or Stripe policy.
- Reuses the authenticated private shell; navigation and auth proof must be revalidated.
- CommunityGlows snapshot consumers and tests must tolerate the additive metadata.
- Future device-cap work requires a distinct activation ledger and cannot reinterpret historical trial hashes as trusted hardware identity.

# Documentation Coherence

- Update the canonical Stripe/entitlement technical documentation with the operator/customer responsibility split and support workflow.
- Update the active task record with implementation/proof status only after evidence.
- No public marketing claim is added.

# Edge Cases

- No matching user, one matching user, multiple identities sharing one normalized email, and multiple products.
- Trial only, paid only, trial plus paid, revoked/refunded, expired, pending review, and malformed legacy rows.
- Repeated support action, concurrent action, wrong plan/product, missing reason, oversized search, and unavailable Convex.
- Recognized-installation count zero, one, and many; no raw installation hash is returned.
- Customer purchase email differs from the currently verified account: show recovery guidance, never auto-merge.

# Implementation Tasks

1. Add canonical support query/action contracts and focused tests in CommandGlows Convex; validate role/secret gates, redaction, bounded search, allowlists, audit, and idempotency.
2. Add Clerk-protected Astro admin API routes that resolve the caller server-side and inject trusted authority; validate signed-out and non-admin denial.
3. Build the tokenized CommandGlows Licences dashboard with search, summary/detail, state badges, event timeline, and reasoned grant/revoke controls.
4. Extend the product-scoped CommunityGlows snapshot with entitlement date and known-installation count without exposing hashes or cross-user selectors.
5. Enhance BillingAccessPanel with a customer licence card, access description, entitlement/trial dates, and recognized installations; preserve current recovery and purchase controls.
6. Run focused and aggregate checks, token drift guards, protected browser/auth evidence, documentation coherence, and diff review.

# Acceptance Criteria

- Admin can find and inspect a representative account without raw database tooling.
- Non-admin and signed-out requests reveal no licence data and cannot mutate entitlement state.
- Manual grant/revoke requires a reason and produces exactly one effective transition plus auditable history under replay.
- Customer sees only their own CommunityGlows licence/trial summary with plan, state, relevant date, included access, and recognized-installation count.
- Refund/revoke, missing bridge, wrong identity, and pending-review states remain non-granting.
- No licence key or duplicate ledger is introduced; no device cap is implied or enforced.
- Design-token drift, focused tests, typecheck/build, and rendered protected-state proof pass, or the result remains partial with exact gaps.
- ZOMBIES coverage: Zero results/installations; One account/entitlement/action; Many identities/products/events; Boundaries on search/reason/count; Interfaces across Clerk/API/Convex/bridge/app; Exceptions fail closed; Simple account-scoped summaries.

# Test Strategy

- Convex test harness for support/admin authorization and canonical ledger mutations.
- Astro API source/route tests for server-side auth resolution and safe response mapping.
- Component/source tests for dashboard states and CommunityGlows licence-card states.
- Existing commerce and trial suites for regression.
- Design-system changed-file drift scan plus project-native token checks.
- Authenticated browser proof using the operator's existing session without reading cookies/storage or exposing customer PII.

# Risks

- Existing dashboard routes are Clerk-aware but not all enforce role authorization; mitigation is server-side API authorization and no sensitive SSR data.
- Email collisions can cause incorrect support targeting; mitigation is ambiguity response and selection by canonical public id after admin inspection.
- Support mutation misuse could grant access; mitigation is admin role check, server secret, product/plan allowlist, required reason, audit, and idempotency.
- Installation hashes are anti-abuse signals, not strong device identity; mitigation is count-only language and no enforcement.
- Residual risk: authenticated browser proof is environment-specific and production role configuration is not changed here.

## OWASP Security Gate

- Considered: A01 Broken Access Control, A02 Security Misconfiguration, A05 Injection, A06 Insecure Design, A07 Authentication Failures, A08 Data Integrity Failures, A09 Logging, A10 Exceptional Conditions.
- Trust boundaries: Clerk session -> server admin resolution -> Convex bridge authority; Stripe event -> ledger; Community authenticated user -> product-scoped signed bridge.
- Requirements: server-side deny by default, canonical role lookup, validated bounded inputs, no client-selected authorization fields, idempotent audited writes, redacted output/logging.
- Proof: signed-out/non-admin denial, cross-user isolation, malformed input, replay, grant/revoke lifecycle, and redaction tests plus protected browser evidence.
- Residual gap: no claim of complete OWASP/ASVS compliance; production permissions and alerting remain deployment proof.

# Execution Notes

- First reads: Convex schema/bridge/users, Clerk middleware/API patterns, current DashboardLayout/navigation, CommunityGlows billing action/composable/panel, and canonical entitlement spec.
- Preserve the current authenticated-navigation work and integrate rather than replacing it.
- Execution Batches:
  - A backend authority: CommandGlows Convex support contracts and tests.
  - B operator surface: Astro API, dashboard page/navigation, and site tests; depends on A.
  - C customer surface: additive snapshot metadata plus CommunityGlows panel/tests; may proceed after A contract shape is frozen.
  - Integration owner: main agent; combined checks and browser proof remain sequential.
- No commit, push, deployment, environment, provider, or production mutation.

# Open Questions

- None for this slice. Device limits and self-service device deactivation require a later operator decision and a dedicated activation ledger.

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|---|---|---|---|---|---|
| 2026-08-18 | 100-sg-spec | GPT-5.6 Codex | Authored the approved canonical licence-console and customer-card contract. | Draft complete. | Run adversarial readiness review. |
| 2026-08-18 | 101-sg-ready | GPT-5.6 Codex | Reviewed authority, identity, data redaction, UI scope, edge cases, batches, and proof. | Ready; no material operator decision remains. | Implement backend batch A. |
| 2026-08-18 | 001-sg-build / sg-development | GPT-5.6 Codex | Implemented canonical admin queries and audited mutations, Clerk-protected API and console, additive CommunityGlows snapshot metadata, and the tokenized customer licence card. | Implemented locally; automated checks and design drift pass. | Complete configured authenticated rendered proof before release. |
| 2026-08-18 | 103-sg-verify | GPT-5.6 Codex | Verified the CommandGlows protected shell and fail-closed missing-config state in Chrome; fixed Clerk middleware coverage and React integration discovered by browser testing. | Partial browser proof; CommunityGlows Vite rendering is blocked by the Chrome extension environment. | Capture final admin/customer states in a configured release environment. |

# Current Chantier Flow

- 100-sg-spec: complete
- 101-sg-ready: ready
- 102-sg-start: complete
- 601-sg-product-entitlements: complete for this slice
- 006-sg-design: automated proof complete
- 103-sg-verify: partial; configured rendered states pending
- 104-sg-end: blocked on final rendered proof
- 005-sg-ship: not requested
