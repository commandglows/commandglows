---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "0.1.0"
project: "commandglows"
created: "2026-08-06"
created_at: "2026-08-06 00:31:00 UTC"
updated: "2026-08-06"
updated_at: "2026-08-06 00:31:00 UTC"
status: draft
source_skill: "sg-docs"
source_model: "GPT-5 Codex"
scope: "public-commandglows-homepage-reliability-positioning-and-conversion"
owner: "Diane"
confidence: high
user_story: "En tant que visiteur de CommandGlows, je veux comprendre immédiatement pour qui l'offre est faite, quelle première étape choisir et pourquoi elle mérite ma confiance, afin de pouvoir décider sans me perdre entre formations, applications et outils."
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - "commandglows_site public homepage"
  - "Astro landing layout and reveal behavior"
  - "Clerk authentication runtime"
  - "Windows Mastery course funnel"
  - "testimonials and recommendation surface"
depends_on:
  - artifact: "shipglows_data/branding/branding.md"
    required_status: "reviewed"
  - artifact: "shipglows_data/product/product.md"
    required_status: "reviewed"
  - artifact: "shipglows_data/gtm/gtm.md"
    required_status: "reviewed"
  - artifact: "shipglows_data/workflow/specs/commandglows-clean-identity-reset.md"
    artifact_version: "1.3.9"
    required_status: "ready"
supersedes: []
evidence:
  - "Production audit of https://www.commandglows.com/ and /fr on 2026-08-05: 3,974 px English desktop, 5,898 px English mobile, and 4,197 px French desktop with no horizontal overflow."
  - "Production console audit: Clerk scripts requested from clerk.winflowz.com are blocked by the current CommandGlows CSP."
  - "Production DOM audit: twelve below-the-fold .reveal elements default to opacity 0 and depend on client-side IntersectionObserver initialization."
  - "Production screenshot review: the landing combines a Windows course, multiple apps/tools, an early lead magnet, testimonials, carousel, product marquee and repeated course CTAs without one obvious decision path."
  - "Local source review of Hero, BentoGrid, LeadMagnet, Pricing, FinalCTA and testimonial data on 2026-08-05."
next_step: "Resolve the primary-offer decision, then run readiness before implementation."
---

# CommandGlows Homepage Reliability, Positioning, and Conversion

## Status

Draft. The audit has established reliability defects and a coherent remediation direction. Copy and section implementation must wait for the explicit primary-offer decision recorded in Open Questions.

## User Story

En tant que visiteur de CommandGlows, je veux comprendre immédiatement pour qui l'offre est faite, quelle première étape choisir et pourquoi elle mérite ma confiance, afin de pouvoir décider sans me perdre entre formations, applications et outils.

Primary actor: a Windows user whose daily work is interrupted by a fragmented, noisy, or difficult-to-maintain environment.

Trigger: the visitor opens `/` or `/fr` from a direct link, search, or an ecosystem page.

Observable result: the homepage remains visible and usable with or without JavaScript, does not break authentication loading through CSP, names one primary starting point, and moves the visitor through a clear problem → method → proof → offer → action sequence.

## Problem

The current homepage has a strong visual identity and a memorable headline, but its conversion argument is fragmented. It presents Windows Mastery, CMDglows, ObsiFlowz, ReplayGlowz, RSSFlowz, PluginFlowz, testimonials, a generic lead magnet, and multiple repeated calls to action before a visitor can understand which offer is the intended first step.

Two runtime defects are more urgent than copy refinement:

- production CSP blocks Clerk scripts requested from a legacy `clerk.winflowz.com` host;
- below-the-fold content defaults to `opacity: 0` and is revealed only after client-side JavaScript initializes an IntersectionObserver, so a JavaScript failure or unavailable motion initialization can leave the public page visually empty.

The public French route also retains English testimonial titles, quotes, and carousel navigation labels. The proof is real historical evidence, but its relationship to the current CommandGlows offer is not explained.

## Proposed Outcome

Use Windows Mastery as the likely primary conversion path, subject to the explicit decision below. Present the app and companion tools as supporting parts of an ecosystem rather than competing first choices. Keep the existing visual language, but rebuild the reading flow around the visitor's lived friction and a practical, maintainable method.

The proposed narrative sequence is:

1. Acknowledge the visitor's daily Windows friction and name the intended audience.
2. Explain the practical method or transformation before naming the whole product catalogue.
3. Show what the flagship course contains and who it is or is not for.
4. Present real proof with its provenance and relationship to the current offer.
5. Introduce companion tools only after the core path is clear.
6. Show truthful purchase/availability terms or use a non-pricing section label.
7. Ask for one appropriate next commitment.

## Minimal Behavior Contract

- Every public homepage section is visible by default. Motion may enhance entry but must never gate content, navigation, or conversion.
- Production CSP allows only the authenticated CommandGlows Clerk host(s) actually required by the deployed integration; no legacy WinFlowz host remains in active runtime configuration unless it is explicitly approved and CSP-safe.
- `/` and `/fr` expose one clearly named primary path and one secondary exploration path.
- The page distinguishes the flagship course from companion applications and tools without presenting them as equal first choices.
- Real testimonials retain accurate provenance. If they refer to a predecessor product, the page states the relationship truthfully or moves them to a supporting context.
- French-visible labels, carousel controls, testimonial framing, and calls to action are localized and naturally accented.
- Cookie consent remains legally functional but does not obscure the hero's primary message or action on a 390 px viewport.
- Every call to action uses valid, keyboard-accessible HTML without nested interactive controls.

## Success Behavior

- A visitor can read the full homepage when JavaScript, Lenis, IntersectionObserver, or motion initialization fails.
- Browser console does not report CSP-blocked Clerk assets on the public homepage.
- A visitor can answer, from the first two sections: "This is for me", "this is the problem it addresses", and "this is the first thing I should do".
- The course offer, curriculum/value preview, proof, companion tools, and final CTA add new decision value rather than repeat the same course ask.
- The desktop and mobile page contain no horizontal overflow, obscured primary controls, broken sign-in affordance, or inaccessible auto-rotating testimonial behavior.
- The French and English routes preserve equivalent offer hierarchy and locale-appropriate public copy.

## Error Behavior

- If Clerk configuration or CSP hosts do not agree, sign-in affordances fail safely with a clear local diagnostic and deployment must not be described as healthy.
- If JavaScript or reveal initialization fails, all public content remains rendered and readable without manual recovery.
- If current price, entitlement, testimonial applicability, or offer terms cannot be proven, the corresponding claim is qualified, deferred, or omitted; the homepage must not create a false commercial promise.
- If the primary offer decision remains unresolved, do not implement a broad copy or visual rewrite that arbitrarily privileges one product.

## Scope In

- Homepage runtime reliability, landing layout motion behavior, CSP/Clerk host consistency, public positioning, narrative flow, testimonial framing, CTA semantics, French/English content hierarchy, consent-banner placement, and non-auth browser proof.
- Reuse of existing CommandGlows design tokens, component primitives, and authenticated/funnel route contracts.
- A bounded design/copy restructuring of `/` and `/fr` after readiness.

## Scope Out

- Changing prices, entitlement rules, checkout logic, authentication provider, or course content without separate product approval.
- Fabricating testimonials, star ratings, customer outcomes, user counts, guarantees, time savings, clinical claims, or availability claims.
- Rebranding the full ecosystem, replacing the established visual identity, or adding a new design system.
- Deploying, changing CSP production configuration, or changing provider settings without the appropriate authorization and preview proof.

## Constraints

- Public claims must remain grounded in current product, GTM, branding, course, and testimonial evidence.
- Existing historical testimonials must not be presented as current CommandGlows testimonials without an honest bridge or explicit revalidation.
- Motion respects `prefers-reduced-motion` and progressive enhancement: the absence of JavaScript must not hide public content.
- Preserve canonical English `/` and French `/fr` routing.
- Use valid semantic controls: a link styled as a button or a button action, never a button nested inside a link.
- Preserve existing checkout, auth, and course routes unless a separately approved product change is required.

## Required Decision

Before implementation, record one source-of-truth answer:

> Is Windows Mastery the flagship offer and required first step, with CMDglows and companion tools positioned as secondary ecosystem products?

Recommended answer: yes. The current hero, final CTA, and existing route structure already point to Windows Mastery, while the present catalogue-style bento is the main source of ambiguity.

## Implementation Tasks

- [ ] Task 1: Repair the public runtime gates.
  - Align deployed Clerk host configuration and CSP allowlist; remove stale legacy-host dependence.
  - Make landing content visible by default and layer reveal animation as progressive enhancement.
  - Add reduced-motion and JavaScript-failure coverage.
  - Validate with: production/preview browser console, disabled-JavaScript render, and reduced-motion browser checks.

- [ ] Task 2: Establish the flagship offer hierarchy.
  - Resolve the required decision and update the governing product/GTM/branding source when it changes confirmed product direction.
  - Make the hero state audience, problem, primary outcome, and first action in one clear hierarchy.
  - Simplify navigation labels so products, apps, tools, and courses do not compete semantically.
  - Validate with: English/French desktop and mobile heading, CTA, and nav inspection.

- [ ] Task 3: Rebuild the landing argument sequence.
  - Replace the catalogue-first bento progression with problem, method, course/value preview, proof, companion ecosystem, terms/offer, and action.
  - Ensure each section has a distinct reader question and does not repeat the hero promise cosmetically.
  - Replace or move the early generic "hacks" lead magnet if it conflicts with the durable-system positioning.
  - Validate with: section-role and repetition ledger, content review, and rendered route snapshots.

- [ ] Task 4: Make proof and conversion honest and accessible.
  - Explain predecessor-product testimonial provenance, localize visible controls, add carousel pause/reduced-motion behavior, and remove unsupported proof framing.
  - Rename the current "Pricing" block unless actual price and terms are intentionally displayed from an authoritative source.
  - Replace nested link/button pairs with one semantic interactive element.
  - Validate with: keyboard navigation, screen-reader labels, carousel control, and claim review.

- [ ] Task 5: Tune mobile conversion without hiding the page.
  - Reduce mobile header and consent-banner competition with the hero.
  - Re-evaluate the statistics row, low-contrast marquee, and section spacing for decision value and readability.
  - Validate with: 390 px and 768 px browser proof, no-overflow assertions, screenshots, and manual first-viewport review.

## Acceptance Criteria

- [ ] CA 1: Public homepage content is readable with JavaScript disabled and under reduced-motion preference.
- [ ] CA 2: Production or preview homepage console contains no CSP-blocked Clerk asset request and sign-in routing is usable.
- [ ] CA 3: English and French heroes identify the audience, flagship outcome, and primary first action without requiring a visitor to interpret the product catalogue.
- [ ] CA 4: The page presents one clear flagship offer and positions companion products as supporting paths.
- [ ] CA 5: Every retained landing section adds a unique reader or decision value, with no cosmetic duplicate promise.
- [ ] CA 6: Testimonials are accurately framed, their controls are localized, and automatic rotation can be paused or is disabled when motion is reduced.
- [ ] CA 7: The offer/terms section is either truthful pricing or explicitly named as a path-selection section.
- [ ] CA 8: Desktop and 390 px mobile route checks have no horizontal overflow; cookie consent does not obscure the hero CTA.
- [ ] CA 9: All CTA markup is semantic and keyboard accessible.
- [ ] CA 10: Relevant build, type, design-drift, browser-console, visual, and accessibility checks pass before any ship claim.

## Test Contract

- `surface`: CommandGlows public home routes `/` and `/fr`.
- `proof_profile`: static/server build + local browser + preview/prod browser after authorized deployment.
- `required_scenarios`:
  - `HOME-VISIBILITY-NO-JS`
  - `HOME-MOTION-REDUCE`
  - `HOME-CLERK-CSP`
  - `HOME-EN-DESKTOP`
  - `HOME-FR-DESKTOP`
  - `HOME-EN-MOBILE`
  - `HOME-FR-MOBILE`
  - `HOME-KEYBOARD-CTA`
  - `HOME-TESTIMONIAL-CONTROLS`
  - `HOME-CONSENT-FIRST-VIEWPORT`
- `automated_proof`: focused Astro check/build, unit tests affected by altered components, `git diff --check`, and changed-file design-system drift scan.
- `browser_proof`: screenshot and DOM proof for both locales, JavaScript-disabled visibility, reduced-motion state, scroll/reveal behavior, no-overflow, auth-host CSP console, keyboard traversal, and consent placement.
- `deployment_proof`: required before claiming the CSP/Clerk issue resolved because the deployed CSP header and Clerk host configuration are provider-backed.

## Risks

- Fixing the CSP can require a provider/configuration change outside repository authority; local source edits alone cannot prove it resolved in production.
- Repositioning a course as flagship is a commercial decision and must not be assumed if the operator intends an ecosystem-first model.
- Historical testimonial reuse can weaken trust if its predecessor relationship is not clear.
- A full visual rewrite could erase the existing recognisable CMDglows identity; this work should restructure the argument before changing the visual language.
- Consent-banner behavior may be governed by legal requirements; visual compaction must preserve the required consent path.

## Evidence-Based Audit Findings

| Priority | Finding | User consequence | Proposed treatment |
| --- | --- | --- | --- |
| P0 | Clerk assets from `clerk.winflowz.com` are blocked by production CSP. | Sign-in may fail and the public console reports security errors. | Align active provider host and CSP through preview/prod proof. |
| P0 | Below-fold `.reveal` content defaults to `opacity: 0`. | A client-side failure can turn the homepage into a visually empty page after the hero. | Use visible default markup and opt-in motion enhancement. |
| P1 | Course, apps, tools, product catalogue, lead magnet, and repeated CTAs compete. | Visitors cannot tell which first decision CommandGlows wants them to make. | Confirm one flagship offer and create an argument spine. |
| P1 | Historical English testimonials are embedded in the French hero. | Proof is difficult to connect to the current offer and disrupts locale coherence. | Add honest provenance, move proof to a dedicated section, and localize controls. |
| P1 | Current section named "Pricing" contains paths but no displayed price. | The label creates a terms expectation the page does not fulfill. | Show authoritative terms or rename the section. |
| P2 | Generic "hacks" lead magnet appears before the flagship case is established. | It weakens the durable-system positioning and diverts attention early. | Reframe as diagnostic/checklist or move later. |
| P2 | Cookie banner competes with the first mobile viewport. | The visitor sees consent before enough value to make a decision. | Preserve consent while reducing visual obstruction. |
| P2 | Nested interactive CTA markup and auto-rotating testimonial carousel reduce accessibility. | Keyboard and motion-sensitive use is weaker than the visual presentation suggests. | Use semantic CTAs, localized labels, and pause/reduced-motion behavior. |

## Open Questions

- Confirm the primary-offer decision before broad copy implementation.
- Confirm whether current historical testimonial evidence is approved for continued CommandGlows use and what bridge text is legally/commercially accurate.
- Confirm whether a current price/terms source is ready for public display; otherwise use path-selection language instead of pricing.
- Confirm the legal constraints of the consent banner before changing its first-viewport treatment.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
| --- | --- | --- | --- | --- | --- |
| 2026-08-06 | sg-docs | GPT-5 Codex | Recorded the production homepage audit as a bounded, evidence-backed remediation spec. | draft | Resolve the flagship-offer decision, then readiness review. |

## Current Chantier Flow

- sg-docs: completed specification capture
- decision: primary offer and testimonial/terms approval pending
- implementation: not started
- ship/deploy: not authorized
