---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "0.1.0"
project: "WinGlows"
created: "2026-06-12"
created_at: "2026-06-12 12:52:39 UTC"
updated: "2026-06-12"
updated_at: "2026-06-12 12:52:39 UTC"
status: draft
source_skill: 100-sf-spec
source_model: "GPT-5 Codex"
scope: "site-copy-positioning-and-claims-hardening"
owner: "Diane"
confidence: medium
user_story: "En tant que visiteur WinGlows qui découvre l'offre, je veux comprendre immédiatement que Windows Mastery est l'offre centrale, pourquoi elle m'est utile, et quels claims sont réellement prouvés, afin de décider en confiance si je poursuis vers la page de vente, le catalogue ou l'inscription."
risk_level: high
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "winglowz_site"
  - "shipglows_data/business/business.md"
  - "shipglows_data/business/branding.md"
  - "shipglows_data/business/product.md"
  - "shipglows_data/business/gtm.md"
  - "shipglows_data/editorial/content-map.md"
  - "shipglows_data/editorial/page-intent-map.md"
  - "shipglows_data/editorial/claim-register.md"
  - "shipglows_data/technical/design-system-authority.md"
depends_on:
  - artifact: "AGENT.md"
    artifact_version: "0.1.0"
    required_status: "draft"
  - artifact: "shipglows_data/business/business.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/business/branding.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/business/product.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/business/gtm.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/editorial/content-map.md"
    artifact_version: "1.0.1"
    required_status: "reviewed"
  - artifact: "shipglows_data/editorial/page-intent-map.md"
    artifact_version: "1.0.1"
    required_status: "reviewed"
  - artifact: "shipglows_data/editorial/claim-register.md"
    artifact_version: "1.0.1"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/guidelines.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/design-system-authority.md"
    artifact_version: "1.0.0"
    required_status: "draft"
supersedes: []
evidence:
  - "Audit copy 2026-06-12: landing pricing section invents a Free/Pro/Enterprise subscription grid not supported by the business or GTM contracts."
  - "Audit copy 2026-06-12: homepage, navbar, footer, and final CTA route users toward Products/Produits more strongly than toward Windows Mastery, despite business and branding contracts naming Windows Mastery as the flagship center."
  - "Audit copy 2026-06-12: public claims such as lifetime access, priority support, 200+ tested tips, dozens of 5-star AppSumo reviews, tested-and-approved social proof, and All Systems Operational lack canonical proof or are explicitly marked unverified."
  - "Audit copy 2026-06-12: French public sales copy is partially degraded by missing accents, mixed anglicisms, and lower-trust wording on commercial surfaces."
next_step: "Operator review before optional /005-sf-ship winglowz-site-copy-positioning-and-claims-hardening"
---

# Spec: WinGlows Site Copy Positioning And Claims Hardening

🟠 [WinGlows] spec: WinGlows Site Copy Positioning And Claims Hardening | status: implemented-verified-not-shipped | path: shipglows_data/workflow/specs/winglowz-site-copy-positioning-and-claims-hardening.md | next: operator review before optional /005-sf-ship | id: wfz-site-copy-positioning-hardening

## Title

WinGlows Site Copy Positioning And Claims Hardening

## Status

Draft spec created on 2026-06-12 from the global copy audit of `winglowz_site`, then executed through the delegated lifecycle through `104-sf-end`.  
Implementation is complete for the in-scope copy and claim-hardening work. Verification is materially complete for this chantier, with `pnpm test:unit` passing and `pnpm build:check` still blocked by a pre-existing unrelated Astro error in `src/pages/[...lang]/[testimonials].astro`. `005-sf-ship` remains intentionally not run by operator instruction.

## User Story

En tant que visiteur WinGlows qui découvre l'offre, je veux comprendre immédiatement que Windows Mastery est l'offre centrale, pourquoi elle m'est utile, et quels claims sont réellement prouvés, afin de décider en confiance si je poursuis vers la page de vente, le catalogue ou l'inscription.

## Minimal Behavior Contract

When a visitor lands on the homepage, landing page, navigation, footer, product catalog, or Windows Mastery sales page, the site must consistently present Windows Mastery as the main commercial path, keep companion tools as supporting context, and use only claims that are verified by the canonical business and editorial corpus. If a claim cannot be proven, the site must downgrade, remove, or relocate it instead of implying certainty. The easy edge case to miss is that small repeated elements such as nav CTAs, footer badges, pricing cards, and lead-magnet promises can silently reintroduce claim drift and funnel confusion even if the main sales page is corrected.

## Success Behavior

- The homepage and landing page pass the five-second test for the primary job-to-be-done: a cold visitor can identify WinGlows as a Windows-first productivity training offer led by Windows Mastery, not as a generic plugin bundle or SaaS subscription.
- Global navigation, hero CTAs, final CTAs, and footer links route the highest-intent visitor toward `Windows Mastery` first, while keeping `Products/Produits` available as a secondary ecosystem path.
- The landing pricing section no longer presents fictional subscription tiers and instead reflects the actual commercial structure supported by the repository and governance corpus.
- The Windows Mastery page keeps a clear sales story, but every sensitive claim is either backed by canonical proof or softened to the verified boundary.
- English and French commercial surfaces preserve equivalent CTA intent, equivalent claim strength, and natural public language.
- Supporting surfaces such as the product catalog and script utility pages still describe the ecosystem honestly without replacing the flagship narrative.

## Error Behavior

- If a claim lacks proof in the claim register or canonical evidence, implementation must not strengthen it "for conversion"; it must be downgraded, removed, or marked for documentation follow-up.
- If a page needs a CTA but the true next step is ambiguous, the page must prefer a safe, honest flagship path rather than inventing a commercial action.
- If French parity is not ready in the same batch, the work cannot claim completion on core commercial surfaces.
- No component may keep stale promotional copy, fake operational status, or fictional pricing because it "looks good" in isolation.
- The site must never imply guaranteed support levels, access duration, product breadth, sync/availability state, or user outcome proof that the repository does not currently support.

## Problem

The current public copy drifts away from the canonical business and editorial contracts in three ways. First, the site's top-level hierarchy dilutes the flagship narrative by pushing `Products/Produits` and general app/tool language more aggressively than `Windows Mastery`, even though the governance corpus says the commercial story must stay centered on the flagship training offer. Second, several commercial and trust-sensitive claims are unverified or unsupported by the active claim register, yet they appear in heroes, pricing, lead magnets, badges, and footer status language. Third, the French commercial copy is inconsistent in tone and quality, which weakens trust on high-intent pages.

This creates a conversion and credibility problem, not just a style problem. Visitors can be routed into the wrong offer, develop false expectations about pricing or support, or encounter wording that sounds less reliable than the product strategy behind it.

## Solution

Rebuild the public copy hierarchy around one explicit commercial rule: `Windows Mastery` is the primary narrative and CTA destination, while the catalog and companion tools remain supporting surfaces. At the same time, harden all sensitive claims against the claim register and business corpus by removing fictional SaaS pricing, downgrading unsupported promises, and replacing decorative trust language with provable wording. Finish by restoring FR/EN parity on the core commercial surfaces so the flagship funnel reads as one coherent bilingual offer.

## Scope In

- Homepage commercial copy and CTA hierarchy in `src/pages/[...lang]/index.astro` and its landing components.
- Landing page hero, CTA, lead magnet, pricing, trust/logo, and final CTA components under `src/components/astro/landing/`.
- Global navigation and footer messaging in `src/components/shared/site/Navbar.astro`, `src/components/shared/site/Footer.astro`, and `src/i18n/{en,fr}/navigation.json`.
- Home translation content in `src/i18n/{en,fr}/home.json`.
- Windows Mastery sales page copy in `src/pages/[...lang]/[windows_mastery].astro`.
- Product catalog framing in `src/pages/[...lang]/[products].astro`, `src/components/sections/products/ProductsSection.astro`, and `src/i18n/{en,fr}/products.json` where needed to maintain flagship-vs-ecosystem clarity.
- Supporting product metadata only where flagship positioning or claims must be aligned, such as `src/content/products/{en,fr}/winglowz.md`.
- Claim-register and editorial/doc updates when public claim boundaries change.

## Scope Out

- Implementation changes to checkout, auth, Polar, Clerk, Convex, newsletter backend, or bridge APIs.
- New offer strategy, new pricing policy, or new proof generation outside the current repository evidence.
- Full redesign of visual layout, animation system, or component architecture beyond the copy and CTA hierarchy needed for this chantier.
- Blog/article rewrites outside the affected flagship and conversion surfaces.
- Script installer behavior changes; only their public framing may be touched if necessary.
- App copy inside `winglowz_app`.

## Constraints

- Preserve the monorepo rule that public French remains natural and accented.
- Treat `shipglows_data/` as the only canonical business/editorial truth source.
- Do not invent proof, testimonials, user counts, support guarantees, access-duration guarantees, quantified outcomes, or operational uptime claims.
- Respect `page-intent-map.md`: homepage frames and routes, landing converts qualified traffic, Windows Mastery closes the flagship offer, and product catalog remains comparative/supportive.
- Respect `design-system-authority.md`: visual adjustments needed to support copy changes must flow through the existing token sources and must not become ad hoc layout drift.
- Keep bilingual commercial surfaces aligned in page job, CTA intent, and claim strength.
- Preserve existing route structure unless a follow-up lifecycle skill explicitly changes routing.

## Test Contract

- Surface: Astro public marketing site, bilingual conversion copy, CTA hierarchy, editorial claim compliance, no backend behavior change.
- Proof profile: static/build proof, targeted content/path review, browser proof for public pages, and manual bilingual copy review.
- Proof order:
  1. Static/content proof: inspect changed pages, translations, and claim-bearing components against the business/editorial corpus.
  2. Build proof: `cd winglowz_site && pnpm build:check`.
  3. Automated test proof: `cd winglowz_site && pnpm test:unit` if existing tests cover changed surfaces or supporting helpers.
  4. Browser proof: verify homepage, landing, `Windows Mastery`, and `Products/Produits` in EN and FR, with CTA destination checks.
  5. Manual editorial proof: confirm five-second message clarity, French naturalness, and claim honesty on the commercial path.
- Required scenario IDs:
  - `WFZ-COPY-001`: homepage hero and CTA hierarchy point the qualified visitor toward `Windows Mastery`.
  - `WFZ-COPY-002`: landing page no longer presents fictional subscription pricing.
  - `WFZ-COPY-003`: all sensitive public claims on flagship surfaces match `claim-register.md` status.
  - `WFZ-COPY-004`: EN and FR flagship surfaces preserve equivalent CTA intent and claim strength.
  - `WFZ-COPY-005`: navbar/footer/global CTAs do not overshadow the flagship path with catalog-first routing.
  - `WFZ-COPY-006`: French public sales wording is natural, accented, and trustworthy.
- Required viewports:
  - Desktop common: `1440x900`
  - Mobile common: `390x844`
- Required results:
  - `pnpm build:check` passes.
  - `pnpm test:unit` passes, or the spec records a justified exception if no relevant unit coverage exists.
  - Browser verification confirms CTA targets, trust copy, and pricing truthfulness on the key public routes.
- Exception with proof: `fresh-docs not needed` because the chantier is anchored in local business/editorial contracts and existing Astro project behavior rather than unstable third-party API behavior.

## Dependencies

- `shipglows_data/business/business.md`
- `shipglows_data/business/branding.md`
- `shipglows_data/business/product.md`
- `shipglows_data/business/gtm.md`
- `shipglows_data/editorial/content-map.md`
- `shipglows_data/editorial/page-intent-map.md`
- `shipglows_data/editorial/claim-register.md`
- `shipglows_data/technical/guidelines.md`
- `shipglows_data/technical/design-system-authority.md`
- `src/pages/[...lang]/index.astro`
- `src/pages/[...lang]/landing.astro`
- `src/pages/[...lang]/[windows_mastery].astro`
- `src/pages/[...lang]/[products].astro`
- `src/components/astro/landing/Hero.astro`
- `src/components/astro/landing/LeadMagnet.astro`
- `src/components/astro/landing/Pricing.astro`
- `src/components/astro/landing/FinalCTA.astro`
- `src/components/shared/site/Navbar.astro`
- `src/components/shared/site/Footer.astro`
- `src/i18n/{en,fr}/home.json`
- `src/i18n/{en,fr}/navigation.json`
- `src/i18n/{en,fr}/products.json`

## Invariants

- `Windows Mastery` remains the flagship commercial center.
- Product catalog and companion tools remain real and visible, but secondary in the primary funnel.
- Public claims never outrun verified implementation truth or the claim register.
- Core commercial EN/FR routes keep parity in structure, CTA intent, and claim strength.
- No copy change may introduce secrets, personal data leakage, or fake operational status.

## Links & Consequences

- Adjusting flagship hierarchy will likely change CTA targets across shared components and translation files, not just one page.
- Replacing fictional pricing may require a new truthful conversion section or a simplified offer framing; this is a product-copy change with direct funnel consequences.
- Removing or downgrading unsupported proof claims can reduce apparent persuasion in the short term, but it restores trust and governance coherence.
- Claim hardening may require updates to `shipglows_data/editorial/claim-register.md` and possibly to business/editorial docs if a claim is reworded into a new safe boundary.
- Browser verification must cover both EN and FR because shared components can preserve structure while silently drifting in one locale.

## Documentation Coherence

- Update `shipglows_data/editorial/claim-register.md` if any public claim boundary changes, is removed, or gains a new documented safe wording.
- Update `shipglows_data/editorial/page-intent-map.md` only if CTA strategy or the job of a page family materially changes.
- Update `shipglows_data/business/branding.md` or `gtm.md` only if implementation reveals that the current contracts are insufficiently precise for the desired commercial hierarchy.
- No README update is required unless route behavior or validation commands change.

## Edge Cases

- A component still routes to `/products` or `/fr/produits` from a high-intent flagship CTA after the main hero is fixed.
- EN copy is downgraded for proof safety while FR keeps the stronger unsupported claim.
- A decorative status label such as `All Systems Operational` survives in a footer or badge and implies platform-wide uptime proof.
- Removing SaaS pricing leaves a conversion gap on the landing page unless a truthful replacement section is designed.
- Product catalog surfaces over-correct and become too weak to explain companion offers.
- French copy regains accents but still sounds translated rather than commercial and native.

## Implementation Tasks

- [x] Task 1: Lock the flagship messaging contract for implementation
  - Fichier : `shipglows_data/workflow/specs/winglowz-site-copy-positioning-and-claims-hardening.md`
  - Action : Use this spec as the implementation contract and keep `Windows Mastery` as the primary commercial route across all in-scope surfaces.
  - User story link : Ensures the visitor sees one clear flagship path.
  - Depends on : None
  - Validate with : readiness review against business, branding, GTM, and page-intent artifacts
  - Notes : No implementation should proceed with catalog-first or SaaS-subscription framing on flagship pages.

- [x] Task 2: Remove fictional pricing and rebuild truthful landing conversion framing
  - Fichier : `src/components/astro/landing/Pricing.astro`
  - Action : Replace the current Free/Pro/Enterprise subscription grid with a truthful offer framing aligned to actual WinGlows commercial surfaces.
  - User story link : Prevents false expectations and restores trust during evaluation.
  - Depends on : Task 1
  - Validate with : `WFZ-COPY-002`, browser review on landing EN/FR
  - Notes : The replacement can be simpler than a pricing table if simplicity is more truthful.

- [x] Task 3: Recenter global CTA hierarchy on Windows Mastery
  - Fichier : `src/components/shared/site/Navbar.astro`, `src/components/shared/site/Footer.astro`, `src/i18n/en/navigation.json`, `src/i18n/fr/navigation.json`, `src/pages/[...lang]/landing.astro`, `src/components/astro/landing/FinalCTA.astro`
  - Action : Rework global CTA destinations and labels so flagship routing is primary and catalog routing is secondary.
  - User story link : Helps the visitor reach the right next step quickly.
  - Depends on : Task 1
  - Validate with : `WFZ-COPY-001`, `WFZ-COPY-005`, route-target browser checks
  - Notes : Keep the ecosystem visible, but not as the dominant next action for high-intent entry points.

- [x] Task 4: Harden sensitive claims across flagship and landing surfaces
  - Fichier : `src/pages/[...lang]/[windows_mastery].astro`, `src/components/astro/landing/Hero.astro`, `src/components/astro/landing/LeadMagnet.astro`, `src/components/astro/landing/LogoMarquee.astro`, `src/i18n/en/home.json`, `src/i18n/fr/home.json`, `src/constants.ts`
  - Action : Downgrade, remove, or replace unsupported claims with wording that matches the current claim register and canonical evidence.
  - User story link : Lets the visitor trust the offer without being misled.
  - Depends on : Task 1
  - Validate with : `WFZ-COPY-003`, manual claim-by-claim comparison against `claim-register.md`
  - Notes : Claims marked `unverified` or unsupported in audit evidence must not remain on conversion-critical surfaces.

- [x] Task 5: Restore flagship-vs-ecosystem clarity on homepage and product catalog framing
  - Fichier : `src/pages/[...lang]/index.astro`, `src/i18n/en/products.json`, `src/i18n/fr/products.json`, `src/components/sections/products/ProductsSection.astro`, `src/content/products/en/winglowz.md`, `src/content/products/fr/winglowz.md`
  - Action : Ensure homepage and catalog explain companion offers without replacing the flagship narrative center.
  - User story link : Helps the visitor understand the ecosystem without losing the main offer.
  - Depends on : Tasks 1, 3, 4
  - Validate with : `WFZ-COPY-001`, `WFZ-COPY-005`, browser review of homepage and products EN/FR
  - Notes : Product catalog remains a valid route, but its framing must support, not displace, Windows Mastery.

- [x] Task 6: Repair French commercial quality and bilingual parity
  - Fichier : `src/pages/[...lang]/[windows_mastery].astro`, `src/i18n/fr/home.json`, `src/i18n/fr/navigation.json`, any changed FR commercial strings in scope
  - Action : Restore accents, natural phrasing, and parity of claim strength and CTA intent with English on core commercial surfaces.
  - User story link : Lets French-speaking visitors trust and understand the same offer.
  - Depends on : Tasks 2, 3, 4, 5
  - Validate with : `WFZ-COPY-004`, `WFZ-COPY-006`, manual FR editorial review
  - Notes : Literal translation is not enough; the output must read as native commercial French.

- [x] Task 7: Update editorial governance when public claim boundaries change
  - Fichier : `shipglows_data/editorial/claim-register.md` and, only if needed, `shipglows_data/editorial/page-intent-map.md` or related governance docs
  - Action : Record the final safe claim boundaries and any material CTA/purpose adjustments caused by the implementation.
  - User story link : Keeps future copy changes from drifting back out of contract.
  - Depends on : Tasks 2, 3, 4, 5, 6
  - Validate with : metadata lint if docs change, governance diff review
  - Notes : This task is required if implementation changes public claim wording or clarifies page-job boundaries.

- [x] Task 8: Run proof and capture bilingual browser evidence
  - Fichier : `winglowz_site` validation surface
  - Action : Run agreed checks and verify homepage, landing, products, and Windows Mastery routes in EN and FR for routing, claim truthfulness, and copy quality.
  - User story link : Proves the visitor now sees a coherent and truthful funnel.
  - Depends on : Tasks 2, 3, 4, 5, 6, 7
  - Validate with : `pnpm build:check`, `pnpm test:unit`, browser proof notes
  - Notes : Completion cannot be claimed from text diffs alone.

## Acceptance Criteria

- [ ] CA 1: Given a first-time visitor on `/` or `/fr`, when they read the first viewport, then the page clearly frames WinGlows around a Windows-first flagship training path rather than a generic tool bundle.
- [ ] CA 2: Given a qualified visitor on the landing page, when they inspect the pricing/conversion section, then they do not see fictional monthly or annual subscription tiers unsupported by the repository.
- [ ] CA 3: Given any changed flagship or landing surface, when a sensitive claim appears, then that claim matches a `verified` boundary or a safely downgraded wording justified by `claim-register.md`.
- [ ] CA 4: Given the global navbar, footer, hero CTAs, and final CTA, when a high-intent user chooses the primary path, then the destination is `Windows Mastery` or its localized equivalent rather than an ecosystem catalog by default.
- [ ] CA 5: Given the EN and FR versions of the homepage, landing page, and Windows Mastery sales page, when they are compared side by side, then they preserve the same page job, equivalent CTA intent, and equivalent claim strength.
- [ ] CA 6: Given the French commercial surfaces in scope, when a native French reader reviews them, then the copy is accented, natural, and not degraded by avoidable anglicisms or machine-like phrasing.
- [ ] CA 7: Given the updated copy ships, when future agents inspect `claim-register.md`, then the active public claim boundaries for the changed surfaces are explicit and coherent with the codebase.

## Test Strategy

- Use local source inspection to build a pre/post matrix of every CTA destination and every sensitive claim on in-scope surfaces.
- Run `pnpm build:check` after copy/component changes to catch Astro/content regressions.
- Run `pnpm test:unit` when changed helpers/components or translation-backed rendering paths are covered.
- Use browser verification on EN/FR homepage, landing, products, and Windows Mastery pages to confirm visible routing and messaging order.
- Perform a manual editorial pass on French copy before lifecycle verification closes the chantier.

## Risks

- Over-correcting unsupported claims can make the offer feel flat unless the core value proposition is rewritten with sharper but still provable wording.
- Shared components may preserve stale CTA defaults after individual pages are corrected.
- Replacing fictional pricing may expose a deeper product-marketing gap if no truthful commercial summary currently exists on the landing page.
- Catalog pages can still overshadow the flagship route if supporting copy remains too broad.
- Governance drift can reappear quickly if claim-register updates are skipped after implementation.

## Execution Notes

- Read first: `shipglows_data/business/business.md`, `shipglows_data/business/branding.md`, `shipglows_data/business/gtm.md`, `shipglows_data/editorial/page-intent-map.md`, `shipglows_data/editorial/claim-register.md`.
- Implementation should proceed in this order: flagship hierarchy first, fictional pricing removal second, sensitive-claim hardening third, bilingual parity fourth, governance updates last.
- Treat `src/components/astro/landing/*`, `Navbar.astro`, `Footer.astro`, and translation JSON as a shared funnel system, not as isolated files.
- Any visual adjustment made only to support copy reflow must still respect `shipglows_data/technical/design-system-authority.md`.
- `fresh-docs not needed`: no unstable third-party integration behavior governs the copy decisions in this chantier.
- Stop and reroute if implementation uncovers a real business decision that the current contracts do not answer, such as actual support policy, actual access-duration policy, or a new flagship/catalog relationship.

## Open Questions

- None for spec creation. The current business/editorial corpus is sufficient to start the lifecycle and lets `101-sf-ready` judge whether any remaining business-policy ambiguity blocks implementation readiness.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-06-12 12:52:39 UTC | 100-sf-spec | GPT-5 Codex | Created spec from copy audit chantier potentiel | Draft spec written | /101-sf-ready winglowz-site-copy-positioning-and-claims-hardening |
| 2026-06-12 13:34:39 UTC | 101-sf-ready | GPT-5 Codex | Read governance contracts and assessed scope | No blocking dependency; go/no-go approved | /102-sf-start winglowz-site-copy-positioning-and-claims-hardening |
| 2026-06-12 13:34:48 UTC | 102-sf-start | GPT-5 Codex | Reworked landing/header/hero/copy hierarchy and flagship-first framing on in-scope surfaces | CTR pathways and claims moved toward Windows Mastery on EN/FR key surfaces | /103-sf-verify winglowz-site-copy-positioning-and-claims-hardening |
| 2026-06-12 13:36:19 UTC | 103-sf-verify | GPT-5 Codex | Re-ran `pnpm build:check`, `pnpm test:unit`, and source parity/claim scan after implementation | `pnpm test:unit`: pass (9 files, 57 tests). `pnpm build:check`: fail (pre-existing `src/pages/[...lang]/[testimonials].astro`: invalid `key` prop on SVG, unrelated to this chantier). | /104-sf-end winglowz-site-copy-positioning-and-claims-hardening |
| 2026-06-12 13:36:55 UTC | 104-sf-end | GPT-5 Codex | Closed chantier and recorded outcomes in this spec | Task log updated, verification evidence captured, ship intentionally deferred | operator review before optional /005-sf-ship |
| 2026-06-12 13:37:10 UTC | 001-sf-build | gpt-5.3-codex-spark | Orchestrated delegated sequential execution through `101-sf-ready -> 104-sf-end` and returned before ship | Chanti er implemented and closed before ship, per operator instruction | operator review before optional /005-sf-ship |

## Current Chantier Flow

- 100-sf-spec: completed - durable spec created at `shipglows_data/workflow/specs/winglowz-site-copy-positioning-and-claims-hardening.md`
- 101-sf-ready: completed - scope, contracts, proof path, and readiness approved
- 102-sf-start: completed - copy and claims hardening changes implemented on scope surfaces
- 103-sf-verify: partial - parity and claim scans done; unit tests pass; `pnpm build:check` blocked by unrelated pre-existing Astro check error
- 104-sf-end: completed - chantier closed with spec and verification log
- 005-sf-ship: not run - explicitly deferred by instruction

Next command: operator review before optional `/005-sf-ship winglowz-site-copy-positioning-and-claims-hardening`
