---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.1.0"
project: "CommandGlows"
created: "2026-08-18"
created_at: "2026-08-18 10:58:47 UTC"
updated: "2026-08-18"
updated_at: "2026-08-18 11:00:43 UTC"
status: ready
source_skill: 100-sg-spec
source_model: "GPT-5.6 Codex"
scope: "authenticated-global-navigation-and-private-shell"
owner: "Diane"
user_story: "As a signed-in CommandGlows customer, I want a recognizable account menu everywhere and persistent navigation inside the private workspace so I can move confidently between public and protected pages."
confidence: high
risk_level: medium
security_impact: "yes"
docs_impact: "yes"
content_surfaces:
  - "commandglows_site public navbar"
  - "commandglows_site private dashboard"
linked_systems:
  - "Clerk Astro"
  - "commandglows_site/src/components/shared/site/Navbar.astro"
  - "commandglows_site/src/components/shared/site/AuthNavAction.tsx"
  - "commandglows_site/src/pages/dashboard"
  - "commandglows_site/src/assets/styles/global.css"
depends_on:
  - artifact: "shipglows_data/technical/design-system-authority.md"
    artifact_version: "2.2.0"
    required_status: active
  - artifact: "shipglows_data/technical/architecture.md"
    artifact_version: "1.5.0"
    required_status: reviewed
supersedes: []
evidence:
  - "Operator request 2026-08-18: authenticated visitors should see a profile picture menu on every site page instead of a standalone sign-out button."
  - "Operator request 2026-08-18: the private area needs visible navigation."
  - "Current shared Navbar renders AuthNavAction on desktop and mobile, so one authenticated component can cover all MainLayout pages."
  - "Current dashboard Header and Sidebar contain disconnected placeholder behavior and are not mounted by dashboard pages."
next_step: "Implement the approved global account menu and private shell, then collect automated and authenticated browser proof."
---

# Title

Authenticated Global Navigation and Private Shell

# Status

Ready for implementation. The contract resolves account-menu behavior, private destinations, security boundaries, design-system ownership, and authenticated proof without requiring provider or permission changes.

# User Story

As a signed-in CommandGlows customer, when I visit any public or private page, I want my account state and private destinations to remain recognizable and reachable, so I can move confidently between the site and my workspace without hunting for account controls.

# Minimal Behavior Contract

When Clerk resolves a visitor as signed out, the global navigation shows the localized sign-in action. When Clerk resolves a visitor as signed in, the same location shows the user's profile image or a safe initials fallback; activating it opens an accessible menu containing the private overview, tasks, settings/profile, and sign-out action. Every existing dashboard route renders within a responsive private shell exposing the same primary destinations. If Clerk is loading or unavailable, private content is never inferred from client state and the control must fail without exposing user data or duplicating actions. The easiest missed edge case is a route transition or responsive change leaving two visible account controls or an open menu with lost focus.

# Success Behavior

- Signed-out visitors see exactly one visible localized sign-in action in the active desktop or mobile navigation.
- Signed-in visitors see exactly one visible account trigger with their Clerk image or initials fallback on every MainLayout page.
- Mouse, touch, Enter, and Space open the menu; Escape and outside activation close it and restore focus to the trigger.
- The menu exposes Overview, Tasks, Settings/Profile, and Sign out with localized labels and current-route indication where meaningful.
- Dashboard overview, tasks, settings, and private docs use one responsive private navigation shell without dead controls or placeholder avatars.
- Proof includes authenticated Chrome rendering, desktop/mobile and light/dark states, keyboard behavior, focus visibility, target sizing, automated tests, build, and design-system drift checks.

# Error Behavior

- Clerk loading or temporary failure does not flash private identity data, duplicate controls, or grant route access.
- Missing image data uses initials derived by Clerk/user display data without a remote placeholder service.
- Missing optional name/email omits that field without rendering `undefined`, an empty interactive row, or private details outside the opened menu.
- Route transitions close stale overlays and retain one interactive account control.
- Sign-out remains owned by Clerk and redirects to the localized home; no custom session endpoint or client-provided identity is introduced.
- Failure of visual hydration leaves a usable sign-in link for signed-out users and never fabricates a signed-in state.

# Problem

The shared account action currently replaces Sign In with a prominent Sign Out button, which communicates an action rather than identity and gives no route into the private space. Separately, dashboard navigation components exist but contain placeholder imagery, hover-only menu behavior, a non-functional notification control, and are not mounted by dashboard pages. The resulting experience hides the private information architecture and makes authenticated state feel inconsistent across public and protected pages.

# Solution

Create one Clerk-backed account-navigation component used by the existing global Navbar on desktop and mobile. It owns the profile trigger, accessible account menu, localized private links, and Clerk sign-out control while consuming existing design tokens. Create one dashboard layout that composes a responsive private navigation from the existing route model and wraps every dashboard page. Remove or retire disconnected placeholder dashboard controls rather than maintaining competing menus.

# Scope In

- Shared authenticated account trigger and popup menu for all pages using MainLayout or LandingLayout navigation.
- Clerk profile image with initials fallback and no third-party avatar generator.
- Localized menu labels for English and French.
- Existing private destinations: `/dashboard`, `/dashboard/taches`, `/dashboard/parametres`, plus contextual return navigation for private docs.
- Responsive private navigation shell for dashboard pages.
- Active-route state, keyboard/focus behavior, click-outside dismissal, Escape dismissal, and focus restoration.
- Central design-token consumption and focused tests/documentation.

# Scope Out

- Clerk provider configuration, OAuth callbacks, identity linking, entitlements, permissions, or middleware authorization changes.
- New private business features, notification backend, account editing UI, billing, or new dashboard data models.
- New public claims, brand redesign, deployment, production mutation, or remote publication.
- Executing sign-out during automated browser proof without separate action-time consent.

# Constraints

- Clerk remains the sole web-session owner; UI visibility is not an authorization boundary.
- Middleware and server-side protected-route checks remain unchanged.
- Visual values resolve through the canonical CommandGlows design system; no unexplained component-local literals.
- Menu semantics, focus order, Escape behavior, focus restoration, minimum 44px targets, light/dark contrast, and reduced-motion behavior must remain professional.
- Public navigation must expose one account action per active breakpoint, not desktop and mobile duplicates simultaneously.
- Existing unrelated `.gitignore` edits remain untouched and unstaged.

# Test Contract

- Surface/profile: local Astro site at its ShipGlows-managed URL, signed-out Playwright profile and authenticated user Chrome profile.
- Automated: focused component/source contract tests, full Vitest suite, Astro build/type check, generated-token check, changed and broad design-system drift guards.
- Browser order: signed-out desktop/mobile; authenticated desktop light/dark; authenticated mobile; keyboard open/close/focus restoration; route navigation; visual inspection and contrast/target measurements.
- Auth proof: Clerk session is established manually by the operator; the agent reads only visible state and does not inspect cookies, storage, credentials, or tokens.
- Exception: sign-out control presence and semantics are verified without activating it unless the operator separately confirms session destruction at action time.

# Dependencies

- Clerk Astro React primitives already installed in the site.
- Existing shared Navbar, MainLayout, dashboard routes, navigation model, and canonical design tokens.
- ShipGlows DevServer and callable Chrome/browser tooling for authenticated proof.

# Invariants

- A signed-out visitor cannot see private identity details.
- A signed-in menu never substitutes for middleware authorization.
- Sign-out continues through Clerk and does not use the obsolete `/api/auth/signout` form.
- No avatar URL is sent to DiceBear or another new third party.
- Public routes and existing private route URLs remain stable.
- English/French public navigation behavior remains equivalent.

# Links & Consequences

- Upstream: Clerk user/session resolution and the global design-system adapters.
- Direct consumers: Navbar desktop/mobile variants and every dashboard page.
- Downstream: route transitions, protected docs navigation, account settings discovery, sign-out discovery, and future private destinations.
- Revalidation: any future private route addition must update the shared private navigation model and menu tests rather than adding page-local account links.

# Documentation Coherence

- Update this spec's run history and flow as the durable product contract.
- Update existing site/design-system technical guidance only if implementation reveals a new reusable component authority; otherwise no separate public documentation change is required.

# Edge Cases

- Clerk loading during first paint or Astro route transition.
- User has no profile image, name, or email.
- Long name/email and 200% zoom.
- Menu opened near the viewport edge on narrow desktop and mobile.
- Desktop/mobile breakpoint changes while the menu is open.
- Escape, outside click, repeated trigger click, route selection, and browser Back.
- Light/dark theme changes while the menu is open.
- Private docs route whose slug is deeper than the primary navigation routes.

# Implementation Tasks

1. Establish shared account-menu labels, destinations, and Clerk-derived display data in the existing authenticated navigation component; validate signed-in/signed-out rendering contracts.
2. Implement maintained semantic menu behavior with trigger state, keyboard dismissal, outside dismissal, focus restoration, profile image/initials fallback, and Clerk-owned sign-out; validate focused component tests.
3. Integrate the account component into desktop and mobile Navbar states without duplicate visible actions; validate responsive source and browser checks.
4. Create a shared responsive dashboard layout using the existing navigation model and wrap overview, tasks, settings, and docs pages; remove disconnected placeholder navigation ownership; validate route rendering.
5. Add or adjust canonical component tokens only when an existing semantic role cannot express the approved UI; regenerate/check adapters and run drift guards.
6. Run automated, authenticated browser, accessibility, visual, and documentation-coherence proof; record exact limitations without deploying or signing the operator out.

# Acceptance Criteria

- Exactly one visible account action appears on every tested public and private page for the active breakpoint.
- Signed-out state is Sign In/Connexion; signed-in state is a profile image or initials trigger, never a standalone Sign Out CTA.
- The account menu contains Overview, Tasks, Settings/Profile, and Sign out, with correct localized labels and working non-destructive navigation.
- Every existing dashboard page presents persistent, responsive private navigation with a perceivable current location.
- Keyboard, focus, target, contrast, zoom, mobile, light/dark, and route-transition checks pass.
- No provider, entitlement, permission, middleware, dependency, secret, production, or deployment change occurs.
- Tests/build and both design-system drift paths pass, or the result remains partial with the exact failing proof.
- ZOMBIES coverage: Zero/empty user data uses fallback; One account action is visible; Many/long text does not overflow; Boundary breakpoints and 200% zoom remain usable; Interface failures do not expose identity; Exceptions omit unavailable optional fields; Security preserves Clerk/middleware ownership.

# Test Strategy

- Unit/source contracts for Clerk primitives, localized links, absence of obsolete sign-out endpoint, and one desktop plus one mobile component mount.
- Full site unit suite and Astro build check.
- Design-system generator/check plus official and project drift guards.
- Signed-out Playwright checks for public routes and breakpoint visibility.
- Authenticated Chrome checks using the operator's existing session for menu content, protected navigation, themes, responsive states, keyboard, focus restoration, and visual inspection.
- No sign-out activation unless separately confirmed at action time.

# Risks

- Clerk prebuilt primitives may impose styling or portal behavior that conflicts with the navbar; mitigate with supported appearance configuration or a thin project wrapper, never copied vendor internals.
- Client-only hydration may flash or duplicate controls; mitigate with mutually exclusive Clerk state rendering and route-transition tests.
- A private shell can compete with the public Navbar on small screens; mitigate with one clear hierarchy and responsive proof.
- Personal data in screenshots/logs; redact or avoid screenshots containing email/name and never report tokens or session details.
- Residual risk: authenticated browser evidence depends on the operator's live local Clerk session and remains environment-specific.

## OWASP Security Gate

- Applicable areas: A01 Broken Access Control, A02 Cryptographic Failures, A07 Identification and Authentication Failures, and privacy-sensitive logging.
- UI state never authorizes access; middleware/server checks remain the security boundary.
- No cookies, tokens, credentials, provider identifiers, or raw Clerk objects are logged, persisted, copied, or exposed in proof.
- Sign-out uses Clerk's supported control and no custom credential/session mutation is introduced.
- Proof covers unauthenticated redirect behavior and authenticated navigation without altering permissions or entitlements.

# Execution Notes

- Preserve unrelated dirty files and stage only approved paths if a local commit becomes useful.
- Prefer the installed Clerk React primitives and project-native token/component patterns.
- Keep implementation main-thread and cohesive; no parallel write batches are needed.
- Do not deploy or push.
- First-read implementation files: `AuthNavAction.tsx`, `Navbar.astro`, `MainLayout.astro`, the four dashboard page templates, `utils/fr/navigation.ts`, and the design-system site contract test.
- Canonical local proof URL: `http://127.0.0.1:3004`; the ShipGlows registry must be `running` before browser proof.
- Required commands: `pnpm test:unit`, `pnpm build:check`, `uv run python tools/design_system/generate_tokens.py --all --check`, `uv run python tools/design_system/project_drift_guard.py`, and the canonical drift scanner in changed and broad modes.
- Stop and replace the plan if implementation requires middleware/provider configuration, a new private route, a dependency change, new permissions, or remote environment mutation.

# Open Questions

- None. The approved default is a concise account menu plus the existing private destinations; new private product sections require their own product behavior before receiving navigation entries.

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|---|---|---|---|---|---|
| 2026-08-18 | 100-sg-spec | GPT-5.6 Codex | Authored the approved authenticated navigation and private-shell contract. | Draft complete; readiness required. | Run adversarial readiness review. |
| 2026-08-18 | 101-sg-ready | GPT-5.6 Codex | Reviewed behavior, auth boundaries, design authority, dependencies, tasks, and proof adversarially. | Ready; no material ambiguity remains. | Implement the approved source scope. |

# Current Chantier Flow

- 100-sg-spec: complete
- 101-sg-ready: ready
- 102-sg-start: ready to begin
- 006-sg-design: in progress
- 103-sg-verify: pending
- 104-sg-end: pending
- 005-sg-ship: not requested
