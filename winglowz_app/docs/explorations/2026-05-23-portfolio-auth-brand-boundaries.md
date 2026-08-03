---
artifact: exploration_report
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlowz Workspace"
created: "2026-05-23"
updated: "2026-05-23"
status: draft
source_skill: sf-explore
scope: "portfolio auth brand boundaries"
owner: "Diane"
confidence: medium
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - "WinGlowz suite identity"
  - "ReplayGlowz"
  - "NoteFlowz / NoteFinderz"
  - "ContentGlowz"
  - "SocialGlowz"
  - "Nantes Gratuit"
  - "GoCharbon / quit-coke"
  - "plaisirsurprise"
  - "Clerk"
  - "Firebase Auth"
  - "Convex"
evidence:
  - "User question 2026-05-23: how to handle NoteFlowz/other products and French apps that may not naturally belong to the WinGlowz/Wispr Flow suite."
  - "docs/explorations/2026-05-17-root-apps-firebase-fit.md classifies ReplayGlowz, ContentGlowz, NoteFinderz, Nantes Gratuit, Quit Coke and related products by current auth/backend fit."
  - "/home/claude/shipglows_data/CLAUDE.md lists NoteFlowz, plaisirsurprise, French content projects, Convex and Clerk patterns."
  - "/home/claude/shipglows_data/PROJECTS.md lists French or separate-brand products including jarrettelacoke.fr and plaisirsurprise."
  - "/home/claude/shipglows_data/projects/winglowz/docs/technical/suite-authentication.md defines Clerk central identity plus per-product entitlements for the WinGlowz suite."
depends_on:
  - artifact: "docs/explorations/2026-05-16-unified-suite-auth.md"
    artifact_version: "1.0.0"
    required_status: "draft"
  - artifact: "docs/explorations/2026-05-17-root-apps-firebase-fit.md"
    artifact_version: "1.0.0"
    required_status: "draft"
  - artifact: "/home/claude/shipglows_data/projects/winglowz/docs/technical/suite-authentication.md"
    artifact_version: "1.0.8"
    required_status: "reviewed"
supersedes: []
next_step: "/sf-spec portfolio identity realms and product entitlement boundaries"
---

# Exploration Report: Portfolio Auth Brand Boundaries

## Starting Question

How should products such as NoteFlowz/NoteFinderz and French apps fit with the new shared identity model, especially when they may not feel like obvious WinGlowz suite products to users?

## Context Read

- `docs/explorations/2026-05-17-root-apps-firebase-fit.md` - existing portfolio classification across WinGlowz, ReplayGlowz, ContentGlowz, NoteFinderz, Nantes Gratuit and Quit Coke.
- `/home/claude/shipglows_data/CLAUDE.md` - workspace-level stack notes for NoteFlowz, French projects, Convex and Clerk.
- `/home/claude/shipglows_data/PROJECTS.md` - high-level list of separate products and brands.
- `/home/claude/shipglows_data/projects/winglowz/docs/technical/suite-authentication.md` - canonical WinGlowz suite auth decision.

## Internet Research

None. This exploration used local product and architecture context only.

## Problem Framing

The workspace needs one professional identity strategy without making every product visibly look like a WinGlowz product. A single technical identity provider can reduce operational complexity, but a single visible brand can reduce trust when the product is local, French-first, sensitive, or unrelated to productivity.

The key distinction is:

- Technical account infrastructure can be shared.
- User-facing account brand should be chosen by product family.
- Cross-family account linking should be explicit, not silent.

## Option Space

### Option A: One Visible WinGlowz Account For Everything

- Summary: every product uses the same visible WinGlowz/Flowz account brand.
- Pros: simplest support story, strongest cross-sell, fewer provider dashboards.
- Cons: confusing or damaging for unrelated products. A Nantes Gratuit, quit-coke, health, luxury or local-service user may not expect a WinGlowz consent screen.

### Option B: Separate Auth Per Product

- Summary: every product owns its own auth app, identity users, and account copy.
- Pros: maximum brand fit and user clarity.
- Cons: duplicated users, duplicated support, duplicated secrets, repeated OAuth/provider configuration, difficult cross-product entitlements.

### Option C: Shared Ledger, Multiple User-Facing Identity Realms

- Summary: central identity/entitlement architecture supports multiple visible account realms such as `flowz_productivity`, `french_local`, `wellness_recovery`, or product-specific realms. Related productivity apps can share a visible Flowz/WinGlowz account. Sensitive or unrelated French apps can keep their own account brand while the backend still uses common security patterns and optional explicit linking.
- Pros: balances professional account operations with user trust. Avoids surprising Google/Clerk consent names while preserving a future bridge.
- Cons: more design/documentation work than one visible brand; needs realm taxonomy and linking rules.

## Emerging Recommendation

Use Option C.

Default taxonomy:

- Productivity / AI workflow products: WinGlowz, ReplayGlowz, ContentGlowz, NoteFlowz/NoteFinderz and possibly SocialGlowz can share a Flowz/WinGlowz family identity if login copy clearly says the product uses the shared account.
- Local French / public-interest products: Nantes Gratuit should not show a WinGlowz account brand unless the product is explicitly repositioned under that umbrella.
- Sensitive wellness/recovery products: quit-coke / jarrettelacoke style products should keep a separate visible account realm because privacy expectations are higher.
- Luxury/booking or materially different consumer products: plaisirsurprise should likely stay separate visibly, even if it uses Clerk/Convex under the hood.

## Non-Decisions

- Exact final public umbrella name: WinGlowz, Flowz, Diane Apps, or something else remains open.
- Whether each realm is a separate Clerk application, separate OAuth consent screen, or one Clerk app with careful routing remains an implementation decision.
- No product is migrated by this exploration.

## Rejected Paths

- Silent email merge across unrelated products - rejected because it creates privacy, support and account-takeover risk.
- Presenting every Google consent screen as WinGlowz by default - rejected because it can confuse users of French/local/sensitive apps.
- Keeping every identity fully isolated forever - rejected because it preserves avoidable operational complexity and blocks professional suite benefits.

## Risks And Unknowns

- OAuth consent/app names may be controlled by provider-level settings, so visible branding needs provider-specific verification before implementation.
- French apps may require stronger privacy and consent copy than productivity tools.
- Existing Clerk/Firebase/Convex docs in some repos are stale and need reconciliation before specs.
- Cross-brand linking requires explicit user action and support policy.

## Redaction Review

- Reviewed: yes
- Sensitive inputs seen: none
- Redactions applied: none
- Notes: only local docs and file paths were summarized.

## Decision Inputs For Spec

- User story seed: As the portfolio owner, I want shared auth infrastructure with product-appropriate visible account brands so users are not surprised by mismatched Google/Clerk consent screens and support can still manage accounts professionally.
- Scope in seed: define identity realms, product-to-realm mapping, visible account copy, entitlement boundaries, explicit linking rules and provider configuration rules.
- Scope out seed: no immediate code migration, no silent email merge, no billing-provider migration.
- Invariants/constraints seed: account existence never grants product access; sensitive/local products should not expose a confusing unrelated umbrella brand; cross-realm linking is explicit.
- Validation seed: per-product login copy reviewed, OAuth consent name matches expected product family, entitlement checks remain deny-by-default, old accounts are not merged by email alone.

## Handoff

- Recommended next command: `/sf-spec portfolio identity realms and product entitlement boundaries`
- Why this next step: the decision affects multiple products, auth providers, OAuth consent names, privacy expectations and future migrations.

## Exploration Run History

| Date UTC | Prompt/Focus | Action | Result | Next step |
|----------|--------------|--------|--------|-----------|
| 2026-05-23 10:43:03 UTC | Portfolio auth branding across NoteFlowz, other apps and French products | Read local portfolio and suite-auth docs, compared one visible account, isolated auth and multi-realm shared ledger models | Recommended shared backend identity/entitlement model with multiple user-facing identity realms | `/sf-spec portfolio identity realms and product entitlement boundaries` |
