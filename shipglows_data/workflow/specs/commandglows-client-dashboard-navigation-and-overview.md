---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "CommandGlows"
created: "2026-09-26"
created_at: "2026-09-26 04:20:36 UTC"
updated: "2026-09-26"
updated_at: "2026-09-26 04:49:03 UTC"
status: ready
source_skill: 100-sg-spec
source_model: "GPT-6 Codex"
scope: "commandglows-client-dashboard-navigation-and-overview"
owner: "Diane"
user_story: "As an authenticated CommandGlows customer, I want a clear account home that shows my verified formation access and helps me find account and purchase-recovery actions; as an administrator, I need the support consoles to remain easy to reach without being presented as customer account features."
confidence: high
risk_level: high
security_impact: "yes"
docs_impact: "yes"
content_surfaces:
  - "CommandGlows authenticated website dashboard"
linked_systems:
  - "CommandGlows Astro dashboard routes"
  - "CommandGlows server-resolved site identity and role"
  - "CommandGlows canonical design tokens"
  - "CommandGlows existing account purchase-recovery route"
depends_on:
  - artifact: "shipglows_data/technical/design-system-authority.md"
    artifact_version: "2.2.0"
    required_status: active
  - artifact: "shipglows_data/business/product.md"
    artifact_version: "1.0.0"
    required_status: reviewed
  - artifact: "shipglows_data/business/branding.md"
    artifact_version: "1.0.0"
    required_status: reviewed
  - artifact: "shipglows_data/business/gtm.md"
    artifact_version: "1.1.0"
    required_status: reviewed
  - artifact: "shipglows_data/workflow/specs/commandglows-license-entitlement-console-and-customer-card.md"
    artifact_version: "1.1.0"
    required_status: implemented
supersedes: []
evidence:
  - "Operator-approved 2026-09-26: implement the initial customer-dashboard and navigation tranche informed by four operator-provided UPDF account screenshots."
  - "Current overview displays a hard-coded Free plan and prototype task/resource shortcuts."
  - "Current server-resolved site identity includes the verified role, name, email, and formationAccess; the licence and newsletter consoles require administrator authorization at their APIs."
  - "The existing licence page is an operator incident/recovery console; Stripe owns payment facts and Convex owns access facts."
next_step: "Verify authenticated customer/admin and responsive browser states; do not deploy."
---

# Title

CommandGlows Client Dashboard Navigation and Overview

# Status

Draft contract for the approved first customer-dashboard tranche. It borrows the account-hub information hierarchy from the operator-selected screenshots while preserving CommandGlows product language, identity, data boundaries, and design tokens.

# User Story

As an authenticated CommandGlows customer, when I open my account, I want to understand which formation access CommandGlows currently verifies, reach my profile and purchase-recovery path, and know where to go next. An administrator should retain clear entry points to support consoles without confusing those tools with customer account features.

# Minimal Behavior Contract

When an authenticated customer opens the dashboard in English or French, the site renders a localized, responsive account shell with profile information and only the formation-access state resolved by the server; absent or unavailable facts are never replaced by a fabricated plan or purchase. Customers receive only customer routes, while a server-resolved administrator role may expose the existing support consoles; direct API authorization remains authoritative. The easiest missed edge case is a stale or unavailable identity projection being treated as a free customer account or as administrator access.

# Success Behavior

- The customer overview presents the authenticated account name when available, a neutral localized welcome otherwise, and the verified formation-access state.
- Active formation access has a working path to the existing formation content; no verified access provides clear purchase-recovery and offer links without implying a completed purchase.
- Customer navigation exposes overview, localized account settings, and the existing localized purchase-recovery flow; prototype task and administrator-only newsletter/license destinations are absent for ordinary users.
- Administrators retain explicit administrative navigation to existing protected consoles based on the server-resolved `siteAuth().role`.
- Desktop uses a persistent account-navigation column with a clear content region; small viewports reflow navigation above content without horizontal page overflow or loss of focus order.
- English and French labels and links resolve to canonical routes: `/dashboard`, `/fr/dashboard/`, `/dashboard/settings`, `/fr/dashboard/parametres`, `/account/link-existing`, `/fr/account/link-existing`, `/en/formations/`, `/fr/formations/`, `/windows-mastery`, and `/fr/maitrise-windows`.
- Core content and links work without client-side JavaScript.

# Error Behavior

- Signed-out visitors follow the existing sign-in redirect.
- A missing or unavailable identity projection does not show a false `Free` plan, active access, personal profile, or admin navigation.
- Non-admin users never receive sensitive support data or mutation capability; hiding a navigation link is not an authorization control.
- A customer with no active formation entitlement sees a neutral non-entitlement state and a recovery path, not a failed-payment or no-purchase claim.
- Unknown future locales fall back only according to existing site localization rules.

# Problem

The current `/dashboard` overview is English-only, labels the account `Free` regardless of its actual entitlement, and links prototype tasks and generic resources. The shared navigation is a wrapping horizontal bar that mixes customer, newsletter, task, and licence destinations. The licence page is an operator incident console, not the customer's product summary; presenting it as customer navigation obscures its purpose.

# Solution

Recompose the authenticated shell using CommandGlows' existing semantic tokens and the selected reference's useful account-hub principles: persistent section navigation, clear page headings, grouped account information, and visible next actions. Add a French overview route that reuses the same overview component. Provide English and French account-settings routes through one shared component while preserving the existing French route as a compatibility path. Build customer and administration navigation groups from the existing server-resolved identity role. Keep the initial overview limited to verified profile and formation-access facts plus links to existing recovery, settings, offer, and formation destinations. Do not create a parallel entitlement or payment read model.

# Scope In

- Shared dashboard shell and navigation in `commandglows_site/src/layouts/DashboardLayout.astro` and `commandglows_site/src/utils/fr/navigation.ts`.
- English and French dashboard overviews and account-settings routes using shared project-native components; preserve `/dashboard/parametres` as a working legacy French route.
- Remove the hard-coded `Free` status and prototype-task/resource shortcuts from the dashboard home.
- Show only the server-resolved name/email and `formationAccess` fields; localize their presentation and safe empty states.
- Customer links to localized overview, account settings, and purchase recovery.
- Administrator-only navigation to the existing licence and newsletter operator routes, derived from the server-side `siteAuth().role` projection.
- Responsive desktop/mobile layout, visible keyboard focus, semantic navigation labels, and no-JavaScript availability.
- Update the site README route summary to include the new `/fr/dashboard/*` route family.

# Scope Out

- Order, invoice, refund, tax, subscription, or payment-method history and self-service actions.
- A complete product catalog, entitlement list, device list, device activation cap, or deactivation controls.
- Editing identity-provider profile fields, passwords, linked accounts, or deleting the account.
- Adding identity-editing or account-link actions to the new canonical settings views.
- New backend/Convex queries, Stripe calls, identity linking, entitlement mutations, account merges, checkout behavior, or schema changes.
- Changes to the support consoles' API authorization, data model, or operations.
- Copying UPDF's logo, colors, exact composition, labels, profile fields, icons, or assets; claiming external pattern consensus from one supplied example.
- Public deployment, production changes, commit, or push.

# Constraints

- `siteAuth()` is the server-owned identity projection; no client-controlled role, email match, or hidden navigation state grants access.
- The server `role` controls presentation only. Existing server/API checks remain the authorization boundary.
- `formationAccess` is the only entitlement fact in this tranche. Stripe payment history and Convex access state must not be conflated.
- Never infer UTM/referrer/source attribution, purchase date, order state, refund reason, or device data.
- Preserve current route behavior for settings, purchase recovery, newsletters, and licence support consoles.
- Keep the existing Auth0 linking form available only on the legacy `/dashboard/parametres` route; new English and French settings views are read-only profile summaries and must not imply profile edits or add account-link flows.
- All visual values must use the declared CommandGlows design-system authority and existing site tokens/utilities.
- The selected reference is the four operator-provided UPDF screenshots (one product/example, French desktop account screens, captured 2026-09-20). Transfer only the account-navigation hierarchy and grouped-information principle; do not claim consensus or reproduce protected expression/assets.
- Keep existing unrelated changes intact. Use Doppler for site commands. Do not commit, push, deploy, or mutate external services.

# Test Contract

- Surface/profile: authenticated Astro dashboard; English and French; desktop and mobile; light/dark themes supported by the existing site; keyboard navigation.
- Automated checks: the existing site type/build check and changed-file design-token drift scan. Do not add or execute tests unless the operator requests them.
- Browser proof order: inspect the signed-out redirect; inspect a normal authenticated customer state; inspect an administrator state using the existing operator session only if already available; inspect a French overview; inspect mobile reflow and keyboard focus. Never inspect or expose browser storage, cookies, secrets, or third-party account data.
- Required observable states: no active formation access; active formation access; normal customer; administrator; unavailable/absent identity; English; French; desktop; mobile.
- Manual comparisons use the reference's high-level hierarchy, not pixel matching. A build or source scan alone does not prove rendered fidelity.
- Provider, payment, invoice, production, and customer-data migration proof are not applicable because no provider/data behavior changes.

# Dependencies

- `siteAuth()` server identity projection with role, name, email, and formation access.
- Existing localized formation, purchase-recovery, and account settings routes.
- Existing administrator authorization for the licence and newsletter APIs/pages.
- `shipglows_data/technical/design-system-authority.md` and site token consumers.

# Invariants

- No fake `Free` plan or fabricated order/access data.
- One canonical entitlement authority; the overview remains a redacted projection.
- Customer UI never grants, changes, or revokes account access.
- Administrator UI visibility never replaces server-side authorization.
- Signed-out, absent, or unavailable identity never degrades into an authorized or falsely entitled state.
- All nav items remain keyboard reachable, visibly focused, localized, and available without JavaScript.

# Links & Consequences

- The shared `DashboardLayout` affects all current dashboard pages, including administrator consoles; preserve their content and make the role-specific navigation explicit.
- The existing customer licence-card specification is implemented for CommunityGlows but does not authorize changing its billing surface in this tranche.
- The new `/fr/dashboard` route must resolve without redirecting a French user into an English-only overview.
- No checkout, Stripe, Convex schema/query, entitlement, auth-provider, or cross-product consumer changes are allowed.

# Documentation Coherence

- Update `commandglows_site/README.md` to document the new `/fr/dashboard/*` route family alongside `/dashboard/*`.
- Canonical URLs: `/dashboard` and `/fr/dashboard/`; `/dashboard/settings` and `/fr/dashboard/parametres`; `/account/link-existing` and `/fr/account/link-existing`; `/windows-mastery` and `/fr/maitrise-windows`; `/en/formations/` and `/fr/formations/`.
- No mapped Atlas or separate durable product-decision ID was found for this bounded tranche; current authorities are the reviewed product, brand, GTM, and design-system context.
- No technical architecture or public product-claim changes; no order or billing capability is documented as available.

# Edge Cases

- Normal user has no formation entitlement; normal user has active formation entitlement.
- Identity is absent, missing optional name/email, or marked unavailable.
- Administrator may also hold formation access; both customer account links and admin tools remain available without disclosing additional account data.
- Localized links are compared to the route tree; French navigation does not lead to a missing page.
- English settings, French settings, legacy French settings, and recovery links resolve to the correct localized content.
- Long name/email and narrow viewport wrap without clipping; browser zoom and keyboard focus remain usable.
- Direct requests to admin APIs by a normal user remain denied even if a link is manually entered.

# Implementation Tasks

1. Record route/auth/token baselines and confirm every localized destination; this supports the story by preventing dead links and accidental access assumptions.
2. Implement the project-tokenized responsive `DashboardLayout` and role-separated navigation; preserve existing admin API authorization and every current dashboard page's content.
3. Extract shared account overview and settings components for `/dashboard`, `/fr/dashboard/`, `/dashboard/settings`, and `/fr/dashboard/parametres`; preserve `/dashboard/parametres`, remove the hard-coded plan and prototype quick links, render only `siteAuth()`-verified profile/formation facts, and provide existing recovery/offer/content paths.
4. Update the README route summary for `/fr/dashboard/*`; run the scoped site build check via Doppler and changed-file design drift scan.
5. Compare desktop/mobile rendered states and keyboard focus with the approved high-level reference principles; correct material issues and record exact proof/limits.

# Acceptance Criteria

- An authenticated normal customer sees a localized account home and no administrator or prototype-task links.
- Localized overview, settings, formation, flagship-offer, and recovery links resolve; the legacy French settings route remains functional.
- The overview never renders the hard-coded `Free` plan and accurately distinguishes active formation access from no verified formation access.
- Name/email are optional; no missing identity field produces a broken layout or fabricated substitute.
- The recovery path works from both locales and settings remains reachable.
- A server-resolved administrator sees licence/newsletter console links; a normal user does not.
- Server/API authorization continues to deny direct non-admin console access.
- Desktop and mobile layouts show the full account navigation and content without page-level horizontal overflow; keyboard focus is visible and the navigation has localized accessible names.
- Existing dashboard pages continue to render and remain reachable for their intended roles.
- No additional payment, purchase-history, refund, invoice, or device-management claim appears.
- ZOMBIES: Zero (no entitlement and missing profile fields); One (single verified account state); Many (multiple nav destinations and combined customer/admin role); Boundaries (locale, identity unavailable, role separation); Interfaces (Astro layout, server identity, existing routes); Exceptions (sign-out, unauthorized APIs, missing localized destination); Simple (direct navigation and no-JavaScript content).

# Test Strategy

- Run the site `build:check` through the configured Doppler project and the canonical changed-file design-system drift guard.
- Use the active local browser only for visual states supported by an already authenticated session; do not automate login or access browser storage.
- Inspect overview and navigation at desktop and mobile widths, French and English, focus states, and existing customer/admin destinations.
- If an authenticated role state is unavailable, report it as unverified; do not simulate a production identity or claim role proof.
- No new automated tests are added or run in this tranche unless separately requested.

# Risks

- A role-conditioned link could be mistaken for an access boundary; server/API controls remain unchanged and mandatory.
- `formationAccess` does not represent every CommandGlows companion product or payment transaction; narrow copy and explicit scope prevent false completeness.
- Existing localized route coverage is sparse; unresolved locale destinations would leave the spec not ready until mapped or bounded.
- Visual similarity must remain subordinate to CommandGlows accessibility, responsive behavior, and token source.

# OWASP Security Gate

- Applicable: OWASP Top 10:2025 A01 Broken Access Control and A07 Authentication Failures; the change only consumes the existing server-resolved role and preserves existing API authorization and sign-in behavior.
- Selected versioned references: [OWASP ASVS v5.0.0-8.1.1](https://cornucopia.owasp.org/taxonomy/asvs-5.0/08-authorization/01-authorization-documentation) for documented role boundaries and [OWASP ASVS v5.0.0-15.3.1](https://cornucopia.owasp.org/taxonomy/asvs-5.0/15-secure-coding-and-architecture/03-defensive-coding) for rendering only the required server-projected profile/access fields. These references scope the design; they do not claim full ASVS compliance.
- Not changed/applicable: cryptography, storage, logging, payment, and authorization endpoints; no secrets, stored browser data, privileged operations, or security logs are added.
- Trust boundary: verified Clerk/Auth0 session -> server `siteAuth()` -> Astro-rendered role navigation. APIs continue to resolve/authorize privileged requests independently.
- Proof: normal user/admin visible navigation when existing sessions are available; direct non-admin API denial remains the existing server control and must not be inferred from a hidden link.
- No new identity fields, secrets, payment facts, or cross-user identifiers are rendered.
- No comprehensive OWASP/ASVS compliance claim is made.

# Execution Notes

- First-read files: `commandglows_site/src/layouts/DashboardLayout.astro`, `commandglows_site/src/utils/fr/navigation.ts`, `commandglows_site/src/pages/dashboard/index.astro`, `commandglows_site/src/lib/auth/siteAuth.ts`, and `shipglows_data/technical/design-system-authority.md`.
- Canonical customer URLs: `/dashboard`, `/fr/dashboard/`, `/dashboard/settings`, `/fr/dashboard/parametres`, `/account/link-existing`, `/fr/account/link-existing`, `/windows-mastery`, `/fr/maitrise-windows`, `/en/formations/`, and `/fr/formations/`.
- Source of truth: server-resolved identity and role, `formationAccess` for the one displayed entitlement fact, and CommandGlows semantic design tokens.
- Work stays within the CommandGlows Astro site and root governance spec.
- Commands: site `pnpm build:check` through `doppler run`; canonical `design_system_drift_check.py --changed --format markdown`; browser visual and keyboard proof.
- Stop if an accepted locale destination is missing, `siteAuth()` no longer supplies the specified verified fields, auth/API boundaries would need modification, or required rendered proof cannot be collected.
- No commit, push, deployment, production change, or external provider mutation.

# Open Questions

None for this bounded tranche. Order history and device management require separate data-source and product decisions.

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|---|---|---|---|---|---|
| 2026-09-26 | 100-sg-spec | GPT-6 Codex | Authored the approved first-tranche customer-dashboard contract using the operator-provided account screenshots and current CommandGlows identity, route, and token evidence. | Draft complete; readiness review pending. | Run 101 readiness review. |
| 2026-09-26 | 101-sg-ready | GPT-5 Codex | Reviewed behavior, localized route inventory, server-owned identity/role, entitlement boundaries, design-token authority, OWASP gate, documentation impact, and proof path; clarified unavailable identity handling and legacy settings boundary. | Ready; bounded implementation has no remaining material product, security, route, or proof ambiguity. | Implement the approved site tranche. |
| 2026-09-26 | 102-sg-start | GPT-5 Codex | Implemented the bilingual account overview/settings and server-role-separated responsive navigation; preserved legacy settings actions and updated route documentation. Astro check passed with 0 errors, token drift scan found 0 issues, metadata lint passed, and local signed-out redirects were observed; no tests were run. | Implemented; authenticated customer/admin rendering and mobile visual proof remain unverified. | Run authenticated browser verification without deployment. |

# Current Chantier Flow

- 100-sg-spec: draft complete
- 101-sg-ready: ready
- 102-sg-start: implemented; local checks pass
- 006-sg-design: reference-driven hierarchy applied; authenticated visual proof pending
- 103-sg-verify: pending authenticated customer/admin, mobile, keyboard, and theme proof
- 104-sg-end: not started
- 005-sg-ship: not requested

## Visual refinement contract — 2026-09-27

Ready: the operator explicitly requests visual design, tokens, animations, reload continuity and interaction performance. Preserve the existing brand, destinations, server-derived identity, permissions and commerce behavior. Scope: the shared dashboard shell and existing overview/settings surfaces; administrative content inherits the shell without rewriting its business controls.

Use a compact workspace header, a persistent desktop navigation rail, a compact mobile navigation row, neutral layered surfaces and restrained brand-magenta accents. Canonical workspace roles live in tokens.json and generated adapters. Controls share focus, hover and press treatments; content remains available without motion. Native scrolling owns dashboard input. A short opacity transition owns route continuity; reduced motion disables it. Clean up scroll animation resources on swaps. Preserve the selected theme before each swap. Session verification must preserve geometry without displaying unverified personal content.

Proof: responsive light/dark browser comparison, keyboard/focus, route and reload checks, lifecycle tests, Astro check, token generation and drift guards. No deployment or authentication/entitlement mutation. Existing staged commerce work belongs to another agent.

| Date UTC | Skill | Model | Action | Result | Next step |
|---|---|---|---|---|---|
| 2026-09-27 | 006-sg-design | GPT-6 | Implement canonical workspace tokens, responsive shell, overview/settings surfaces, theme continuity, native dashboard scrolling and bounded route motion. | Implemented and locally verified; authenticated client/admin proof pending. | Review with an authenticated session; no deployment. |

### Visual refinement evidence

- Browser: real components rendered through a DEV-only fixture at `/design/dashboard` with explicitly fictitious identity data; the fixture returns 404 outside development. Light/dark desktop and 390px mobile renders inspected. No horizontal overflow; mobile navigation remains three readable targets. English settings and French overview/settings checked. Keyboard focus has a visible 2px accent outline. Theme persists across route changes and reloads; reduced motion disables transitions; dashboard scrolling is native.
- Verification: Doppler production build completed; Astro check returned 0 errors and 0 warnings (one existing hint); all 727 site tests passed, including lifecycle, session geometry and theme continuity checks. All 22 token-generator/drift tests passed. Six generated adapters are current; project/shared changed-file drift scans reported 0 findings; `git diff --check` passed.
- Performance scope: no new dependency; marketing scroll scripts omitted on direct dashboard loads; Lenis RAF/instances disposed on route swaps. These are implementation and lifecycle proofs, not measured production Core Web Vitals.
- Remaining proof boundary: the available real browser session is signed out. Authenticated customer/admin rendering, actual account actions and production behavior are unverified. Administrative business controls were not redesigned; they inherit the shared shell and semantic colors. No commit, push or deployment.
