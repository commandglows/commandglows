---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlowz"
created: "2026-08-03"
created_at: "2026-08-03 21:28:30 UTC"
updated: "2026-08-03"
updated_at: "2026-08-03 21:58:00 UTC"
status: ready
source_skill: 100-sg-spec
source_model: "GPT-5 Codex"
scope: migration
owner: "Diane"
confidence: high
user_story: "En tant qu'opératrice, je veux republier l'identité canonique WinGlows sur winglows.com et dans une nouvelle application store, tout en conservant des chemins explicites de migration depuis WinGlowz, afin d'éliminer l'ancien nom sans perdre les accès, les données récupérables ni la continuité opérationnelle."
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - "GitHub repository"
  - "Vercel site and Flutter web app"
  - "DNS and email"
  - "Astro public site"
  - "Flutter Android, iOS, macOS, web, Linux and Windows"
  - "Google Play and Apple App Store"
  - "Firebase and Google OAuth"
  - "Clerk"
  - "Convex suite bridge"
  - "Polar and Lemon Squeezy"
  - "Resend"
  - "Bunny CDN"
  - "Sentry"
depends_on:
  - artifact: "shipglows_data/technical/architecture.md"
    artifact_version: "1.0.1"
    required_status: reviewed
  - artifact: "shipglows_data/technical/guidelines.md"
    artifact_version: "1.0.0"
    required_status: reviewed
supersedes: []
evidence:
  - "2026-08-03 tracked inventory: 3,305 matching lines across 574 files and 1,112 tracked paths for winglowz/winflowz identity surfaces."
  - "Exact tracked inventory: WinGlowz 1,003 occurrences in 203 files; WinGlows 1,429 in 242; lowercase winglowz 3,129 in 392; lowercase winglows 0; uppercase WINGLOWZ 145 in 23; uppercase WINGLOWS 0."
  - "Domain inventory: winglowz.com 104 occurrences in 37 files, winglows.com 0, and winflowz.com 86 in 30."
  - "2026-08-03 network proof: winglowz.com did not resolve; winglows.com and www.winglows.com resolved to Vercel but returned 404 DEPLOYMENT_NOT_FOUND."
  - "2026-08-03 Git proof: diane-defores/winglowz exists at HEAD f77118351feafa3eec53aff4a9011ecdcc2ab809; diane-defores/winglows did not yet exist."
  - "Operator decision 2026-08-03: winglows.com replaces www.winflowz.com with a permanent redirect from the previous canonical domain."
  - "Operator decision 2026-08-03: publish a new store application with new platform IDs; do not represent the change as an in-place update."
next_step: "/102-sg-start winglows-canonical-identity-and-store-republication"
---

# Title

WinGlows Canonical Identity and Store Republication

## Status

Ready staged migration contract. The product decisions are fixed; provider availability, migration feasibility and external ownership are explicit preflight gates that block only their dependent batch before any irreversible cutover.

## User Story

En tant qu'opératrice, je veux republier l'identité canonique WinGlows sur `winglows.com` et dans une nouvelle application store, tout en conservant des chemins explicites de migration depuis WinGlowz, afin d'éliminer l'ancien nom sans perdre les accès, les données récupérables ni la continuité opérationnelle.

Trigger: Diane approves the coordinated identity cutover and the external consoles are ready. Observable result: all active surfaces present WinGlows, new installs use the new application identity, old inbound links reach the canonical domain, and legacy users receive a truthful migration path.

## Minimal Behavior Contract

The migration accepts active WinGlowz installations, accounts, purchases, URLs and operational configuration as legacy inputs and produces one canonical WinGlows identity: `winglows.com`, repository `diane-defores/winglows`, monorepo roots `winglows_site/` and `winglows_app/`, Dart package `winglows_app`, and new mobile/desktop bundle identity `com.winglows.app` where the target platform accepts it. Existing store applications are not overwritten: the old app remains a migration source, while a separately published WinGlows app imports user-exported or account-cloud data when feasible. If a provider cutover fails, traffic and writes remain on the last proved configuration, aliases stay available, and the operator receives an explicit recoverable status. The easily missed edge case is that an old entitlement, offer, preference, channel, callback or JWT issuer must be normalized or migrated exactly once rather than becoming a duplicate grant, a lost setting or an unauthorized session.

## Success Behavior

- New public visits resolve canonically to `https://winglows.com`; `www.winglows.com`, `https://www.winflowz.com` and any controlled legacy WinGlowz host permanently redirect while preserving path and safe query parameters.
- Git operations use `diane-defores/winglows`; GitHub's repository redirect remains a compatibility aid, while local remotes, CI links and badges use the new URL.
- New store binaries are distinct applications with `com.winglows.app`, canonical display name WinGlows and canonical package/runtime names. Store listings state clearly that migration may require export/import or sign-in/cloud restore.
- Existing purchases and account access remain valid because legacy product and offer IDs are normalized to canonical identities before entitlement evaluation; no duplicate grant is emitted.
- Existing user-owned settings/data are imported from an explicit export or account-cloud source when technically available. Unsupported state is listed before publication and never silently discarded.
- New configuration uses `WINGLOWS_*`; compatibility readers accept bounded legacy `WINGLOWZ_*` values only where this spec names them, emit no secret values, and prefer canonical values.
- Automated, preview, external-contract and manual/store proof all identify the exact commit/build and cutover environment.

## Error Behavior

- A missing domain, certificate, OAuth callback, webhook, provider secret or app registration blocks that cutover batch before DNS, traffic or writes move.
- A conflicting canonical and legacy environment value fails closed with the key names and scope, never their values.
- Entitlement normalization that maps one source record to multiple canonical grants is rejected and logged as a redacted migration conflict.
- Importing an unknown, corrupt or newer export changes no user data and returns a recoverable validation message.
- Failed external-console steps use the documented provider rollback: restore the last proven domain/alias/env/webhook configuration and keep compatibility readers active.
- The system must never claim an in-place store upgrade, overwrite legacy app data, expose secrets, broaden CORS/auth origins, duplicate a payment side effect or remove the old app before the migration path is proved.

## Problem

The monorepo already mixes `WinGlowz` and `WinGlows`, while its persistent and external contracts still use `winglowz`, `WINGLOWZ` and `winflowz.com`. This affects 574 tracked files and reaches application identities, local data keys, native channels, commerce records, JWT trust, auth callbacks, domains and provider consoles. A global search-and-replace would produce a cosmetically coherent repository but break updates, access, data continuity and inbound traffic.

Material decision change:

- Before: public site `www.winflowz.com`, repository `diane-defores/winglowz`, existing app IDs derived from `winglowz`, mixed WinGlowz/WinGlows display copy.
- After: public site `winglows.com`, repository `diane-defores/winglows`, new separately published app ID `com.winglows.app`, canonical `winglows` identifiers, and explicit legacy migration/redirect contracts.
- Preserved invariants: paid access remains attributable, auth remains issuer/audience constrained, user-owned data is not silently discarded, old evidence remains truthful, and provider changes are reversible until verified.

## Solution

Execute a staged republication rather than a replacement-in-place. First establish a canonical identity registry and compatibility normalizers, then prepare the new domain/repository/provider registrations, publish a new WinGlows application, migrate recoverable account/data/access state, and only then move traffic and retire bounded aliases. Separate display branding from persistent IDs and keep historical legacy mentions through an explicit allowlist.

## Scope In

- Rename active brand copy, code symbols, tracked source filenames and monorepo roots from WinGlowz/winglowz/WINGLOWZ to WinGlows/winglows/WINGLOWS.
- Rename repository to `diane-defores/winglows` and update origin references.
- Make `https://winglows.com` canonical; redirect `www.winglows.com` and `www.winflowz.com` permanently with path/query preservation.
- Publish new Android/iOS/macOS identities using `com.winglows.app` when validation confirms the identifier is accepted for each new app record; use `winglows_app` for Dart/package/runtime source names.
- Preserve the old application as a migration source and define export/import and account-cloud recovery where existing architecture permits.
- Normalize legacy commerce, entitlement, JWT, preference, theme, method-channel, route and environment identifiers.
- Update GitHub Actions, Dependabot, Vercel root directories, Firebase registration/config, auth/CORS/CSP, provider webhooks, emails, CDN links, observability identity, tests and active governance.
- Preserve historical evidence with a documented allowlist.

## Scope Out

- No claim that existing store installs update in place to `com.winglows.app`.
- No deletion or forced unpublishing of the legacy app during initial republication.
- No automatic access to GitHub, DNS, Vercel, Apple, Google, Firebase, Clerk, Convex, payment, email, CDN or Sentry consoles without authorized credentials and explicit execution ownership.
- No bulk rewriting of historical specs, bug records, changelogs or transcripts where the old spelling describes an actual past state.
- No edits to generated/vendor output: `node_modules/`, `.vercel/output/`, `dist/`, `.astro/`, `.dart_tool/`, Flutter `build/`, platform `ephemeral/`, caches or dependency lockfile internals.
- No unrelated feature, visual redesign, pricing change or entitlement-policy change.

## Constraints

- The root worktree must be clean except for explicitly coordinated concurrent governance edits before any rename batch.
- Android/Gradle builds are forbidden locally by `winglowz_app/AGENTS.md`; native Android proof uses GitHub Actions/Blacksmith and physical-device QA.
- External secrets are presence-checked and redacted; never print raw environment, service-account, webhook, OAuth or signing values.
- Case-only and directory renames must be performed in Git-safe two-step moves where required by filesystem behavior.
- Store publication, DNS switch, repository rename and provider webhook changes require explicit authorized execution and rollback checkpoints.
- `com.winglows.app` is the only authorized new application/bundle ID. Batch 0 must prove it is reservable in both operator-owned store accounts before native renames or listings begin. Unavailability blocks and returns the contract for an explicit operator decision; implementation must not invent a variant.
- Retain the existing Firebase project by default and register separate WinGlows platform apps within it. Creating a replacement Firebase project is out of this implementation unless a later approved spec defines auth/data migration and rollback.
- External console mutations are performed only by Diane or an explicitly authorized credential-bearing release operator. Code agents may inspect redacted presence and prepare instructions, but must not infer console authority.
- Migration UI and copy must use `shipglows_data/technical/design-system-authority.md`, existing tokens and shared components. This identity migration does not authorize a visual redesign or a new one-off style system.

## Test Contract

- `surface`: Astro 6/Vercel SSR, Convex, Clerk, Firebase, commerce webhooks, Flutter multi-platform, store republication and external-provider cutover.
- `proof_profile`: mixed automated, hosted integration, provider-console, store/manual and observation-window proof.
- `proof_order`: static/contract scans -> automated tests -> preview browser/API/auth -> provider sandbox/contracts -> domain cutover smoke -> store/manual migration -> observation window.
- `checklist_path`: `shipglows_data/workflow/test-checklists/winglows-canonical-identity-and-store-republication.md`, created by the implementation owner before the first external mutation and completed by the verification owner.
- `required_scenario_ids`: `WCI-ID-01`, `WCI-DATA-02`, `WCI-ACCESS-03`, `WCI-AUTH-04`, `WCI-DOMAIN-05`, `WCI-STORE-06`, `WCI-ROLLBACK-07`, `WCI-NAME-08`.
- `required_results`: exact store IDs are reserved before native changes; portable data imports idempotently and unsafe imports change nothing; legacy access/webhooks normalize once; auth fails closed outside exact origins/issuers; canonical and legacy domains route without loops; the new app is visibly separate; each cutover checkpoint has proved rollback evidence; only allowlisted historical/provider names remain.
- `exception_with_proof`: no local Android/Gradle build. Blacksmith CI owns the Android artifact proof and Diane owns physical-device migration QA; Apple store proof requires an authorized TestFlight install. Missing console credentials defer that provider proof and block its cutover batch without weakening local implementation proof.
- Automated proof owner: implementation owner for focused tests and static checks; verification owner reruns the complete local matrix from a reviewed diff.
- Hosted/provider proof owner: authorized release operator records redacted presence/configuration evidence; verification owner validates observable redirects, auth, commerce and health behavior without receiving secret values.
- Manual/store proof owner: Diane validates store records, side-by-side install where supported, legacy export/cloud save and new-app import; the verification owner records the checklist verdict.

## Dependencies

- Local versions: Astro `6.2.1`, Flutter `3.41.7`, Dart constraint `^3.11.3`, Vercel adapter `10.0.6`.
- GitHub repository rename behavior: <https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository>. GitHub redirects old web/Git URLs, but every local remote and automation reference must still be updated; calls to an action hosted in a renamed repository do not inherit that redirect.
- Vercel custom-domain and redirect contracts: <https://vercel.com/docs/domains/set-up-custom-domain> and <https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting>.
- Android application identity: <https://developer.android.com/build/configure-app-module>. A changed application ID is a new app; it is not an update path for the published old ID.
- Apple bundle and new-app identity: <https://developer.apple.com/help/account/identifiers/register-an-app-id/> and <https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/>. The explicit bundle ID must be registered and selected on a separate app record before upload.
- Firebase project/app identity: <https://firebase.google.com/docs/projects/learn-more> and <https://firebase.google.com/docs/android/setup>. The existing Firebase project ID is immutable; the new Android app must be registered separately or a new project explicitly chosen.
- Fresh documentation verdict: `fresh-docs checked` for the external identity constraints above. Provider dashboards and current project-specific settings remain execution-time evidence requirements.

## Invariants

- `winglows.com` is the sole new canonical origin; redirects do not create duplicate indexed content.
- The legacy store app and `com.winglows.app` are separate applications.
- Legacy product/offer IDs map many-to-one to canonical identities before access evaluation; normalization never creates a second entitlement.
- Payment webhooks remain signature-verified and idempotent through the transition.
- JWT audience remains constrained; legacy issuer acceptance is bounded, observable and removed only after producers and consumers are proved on the new issuer.
- Data export/import is versioned, integrity-checked, idempotent and user-scoped. Cross-user or cross-tenant import is rejected.
- Existing Firebase project ID may remain a legacy infrastructure identifier; documentation distinguishes immutable provider IDs from active brand surfaces.
- Canonical environment variables win over aliases; contradictory values fail closed.
- Historical references retain the old name only when an allowlist entry states file, reason and expected lifetime.
- Observability and copied diagnostics preserve commit/build identity plus Europe/Paris and UTC build timestamps without secrets or private user content.
- Redirect, token, environment and app-migration compatibility are retired independently: domain redirects remain at least 12 months and require an explicit SEO/support review; JWT issuer overlap remains through the maximum token TTL plus 24 hours after legacy minting stops; env aliases remain at least 90 days after canonical deployment; the legacy app/migration source remains available at least 90 days after public WinGlows release and until the observation gate below passes. No alias expires merely because a date elapses.

## Links & Consequences

- SEO/domain: canonical URLs, sitemap, robots, structured data, Open Graph, CSP, CORS, legal links, emails and backlinks move together. `www.winflowz.com` must redirect only after `winglows.com` passes hosted proof.
- Repository/CI: renaming both monorepo roots changes workflow paths, Dependabot directories, Vercel Root Directory settings, scripts, badges and local commands.
- Mobile stores: new IDs reset store-install continuity, ratings/listing continuity and app sandbox data. Migration UX and support communication are product requirements, not optional docs.
- Firebase/auth: a new app registration changes OAuth client/config files and authorized domains. The immutable project ID may intentionally retain `winglowz` as provider history.
- Commerce: Polar/Lemon env-key names can change without changing provider object IDs. Existing provider IDs and webhook history remain authoritative legacy inputs.
- Native local state: SharedPreferences, theme preset IDs, method channels, Android actions and notification channels require compatibility readers or import logic.
- CDN/email: new origins and mailboxes must exist before copy changes; old addresses/asset hosts remain aliases until delivery and asset proof passes.
- Sentry: new project/release naming may be adopted, but issue correlation must retain old release references and redact migration diagnostics.

## Documentation Coherence

- Update root and subproject `AGENT.md`/`AGENTS.md`, `CLAUDE.md`, READMEs, architecture/guidelines, deployment maps and operator runbooks to the new roots, domain and publication model.
- Update public legal/contact/privacy/terms copy only after `@winglows.com` mail delivery is proved; preserve old inbox aliases during the support window.
- Add an operator-facing migration guide that explains separate store installation, sign-in/export/import sequence, unsupported data and rollback/recovery.
- Update product and GTM claims so they never promise in-place upgrade or automatic state recovery beyond proved capabilities.
- Historical records remain unchanged unless their links must resolve; each deliberate legacy spelling is captured by the old-name allowlist.
- Changelog and trackers are updated only by their owner skills after implementation, not by this spec run.

## Edge Cases

- GitHub redirect works for clone/fetch but an old remote obscures the new canonical repository in tooling.
- Apex and `www` domains point to different Vercel projects or certificates during propagation.
- An OAuth redirect succeeds on preview but fails on the canonical custom domain.
- A user owns multiple legacy offer records that normalize to one canonical product.
- Webhook replay arrives after canonical IDs are active but contains legacy metadata.
- Old and new JWT issuers overlap longer than planned or a token is minted immediately before cutover.
- Canonical and legacy env variables are both present with different values.
- Existing app local data cannot be accessed by the new sandbox; cloud restore is partial or the old app cannot export a native-only preference.
- Theme preset or method-channel alias removal resets state or breaks a native host that was not rebuilt.
- Firebase project ID, OAuth client or CDN hostname intentionally retains the old spelling because the provider identity is immutable or migration cost is unjustified.
- Search scans mistake truthful historical evidence for active naming drift.

## Implementation Tasks

- [ ] Task 0: Prove external reservations and capture the migration baseline
  - Files: redacted evidence in the manual checklist and bounded operator runbook; no secret export and no provider mutation beyond reversible reservations.
  - Action: prove control of `winglows.com`, redirect ownership for `www.winflowz.com`, repository rename authority, email/domain access, and exact `com.winglows.app` availability in both store accounts; inventory current auth callbacks, webhook endpoints, product/offer IDs, maximum JWT TTL and active data stores.
  - User story link: prevents source renames or user promises from outrunning identities and recovery paths the operator actually controls.
  - Depends on: none.
  - Validate with: redacted presence matrix signed by the authorized release operator; any unavailable exact ID or uncontrolled legacy domain blocks dependent batches and returns the spec for decision.

- [ ] Task 1: Establish the canonical identity and compatibility registry
  - Files: new shared constants/normalizer modules under `winglowz_site/src/lib/` and `winglowz_app/lib/core/`, plus adjacent tests.
  - Action: define canonical brand/domain/repo/root/package/platform/product/offer/JWT/env identities; enumerate legacy inputs and expiry/owner rules.
  - User story link: gives every later batch one unambiguous source of truth.
  - Depends on: Task 0 inventory; source-only registry work may begin before store reservations, but no native identity or cutover task may do so.
  - Validate with: targeted normalizer tests and an old-name allowlist schema test.

- [ ] Task 2: Prepare export/import and account-cloud migration before republication
  - Files: `winglowz_app/lib/core/sync/**`, relevant settings/data stores, migration UI/routes and tests.
  - Action: inventory portable versus sandbox-bound data before promising recovery; implement versioned, integrity-checked, user-scoped and idempotent export/import or account-cloud restore; expose unsupported state before confirmation. If neither export nor cloud recovery preserves a user-critical class, store publication blocks until the operator accepts a revised migration promise in this spec.
  - User story link: preserves recoverable user-owned data across separate app identities.
  - Depends on: Task 1.
  - Validate with: unit/widget tests for valid, duplicate, corrupt, cross-user and partial imports; manual legacy-export/new-import scenario.

- [ ] Task 3: Add commerce, entitlement and JWT compatibility
  - Files: `winglowz_site/src/lib/commerce/**`, `winglowz_site/src/lib/suiteBridge.ts`, `winglowz_site/convex/{bridge.ts,defaultFreeEntitlements.ts}`, API routes and related tests.
  - Action: introduce canonical `winglows_app` and offer IDs, normalize legacy IDs before evaluation, preserve idempotent webhook handling, and accept legacy JWT issuer only through a bounded overlap policy.
  - User story link: keeps existing paid/account access without duplicate grants.
  - Depends on: Task 1.
  - Validate with: bridge, entitlement, checkout and webhook tests covering legacy-only, canonical-only, mixed duplicate and replay cases.

- [ ] Task 4: Introduce canonical environment names with bounded aliases
  - Files: `.github/workflows/android-build.yml`, both `.env.example` files, build scripts, server/provider env readers and tests.
  - Action: make `WINGLOWS_*`, `POLAR_WINGLOWS_*` and `LEMONSQUEEZY_WINGLOWS_*` canonical; permit named read-only legacy fallbacks; reject conflicts without logging values.
  - User story link: lets deployments migrate without a flag-day secret outage.
  - Depends on: Task 1.
  - Validate with: config tests for canonical, legacy fallback, missing and conflicting keys.

- [ ] Task 5: Prepare the canonical site and permanent redirect contract
  - Files: `winglowz_site/astro.config.mjs`, `vercel.json`, `src/constants.ts`, middleware/routes, robots/sitemap/manifest, i18n/legal/contact content and deployment tests.
  - Action: use `https://winglows.com`; add path/query-preserving redirects from controlled legacy hosts/routes; update CSP/CORS/auth origins, metadata, email and asset references only after dependencies are provisioned.
  - User story link: makes the new identity reachable without losing inbound traffic.
  - Depends on: Tasks 0, 1 and 4; exact legacy-domain control and new domain/email/CDN readiness.
  - Validate with: `pnpm build:check`, SEO/CSP/auth-routing tests, Vercel preview and HTTP redirect matrix.

- [ ] Task 6: Rename repository roots, package and active source symbols
  - Files: Git roots `winglowz_site/`, `winglowz_app/`, `pubspec.yaml`, Dart imports, workflows, Dependabot, scripts, docs and tests.
  - Action: move to `winglows_site/` and `winglows_app/`, rename Dart package to `winglows_app`, update active WinGlowz symbols/files/assets to WinGlows, and repair all tracked references atomically.
  - User story link: removes active old naming from developer/operator surfaces.
  - Depends on: Tasks 1-5 stable and a clean worktree.
  - Validate with: tracked path scan, `flutter analyze`, `flutter test`, site build/tests and CI path lint.

- [ ] Task 7: Create the new platform identities and preserve legacy migration inputs
  - Files: Android Gradle/manifest/Kotlin packages/resources, Apple Xcode projects/plists, macOS/Linux/Windows/web manifests and native bridge tests.
  - Action: register/build new `com.winglows.app` applications, use canonical display/runtime names, retain compatibility for importable prefs/themes/channels where applicable, and keep the old application build/source available for migration support.
  - User story link: delivers a truthful separate WinGlows app with recovery from legacy state.
  - Depends on: Tasks 0, 2, 4 and 6; exact provider app registrations and signing configuration.
  - Validate with: Flutter checks, Blacksmith Android build/artifact, TestFlight/new app record proof, desktop/web builds where supported, device migration checklist.

- [ ] Task 8: Execute external-console cutover with rollback checkpoints
  - Files: external systems plus bounded config/runbook updates.
  - Action: rename GitHub repository; attach Vercel projects/domains; configure DNS, Clerk, Firebase/OAuth, Convex, commerce webhooks, Resend, CDN and Sentry in the sequence below; record redacted evidence.
  - User story link: makes the canonical identity operational end to end.
  - Depends on: all prior implementation and preview proof.
  - Validate with: provider-specific presence/health evidence, hosted auth/checkout/webhook tests, domain and repository redirect checks.

- [ ] Task 8b: Observe compatibility health and authorize retirements independently
  - Files: migration checklist, redacted support/traffic/access observations and operator runbook.
  - Action: enforce the minimum windows from Invariants; require zero unexplained legacy auth/payment failures, no unresolved migration-loss report, proved canonical producers/consumers and an explicit operator approval per alias before retirement.
  - User story link: prevents a nominally successful launch from silently cutting off late legacy users.
  - Depends on: Task 8 and the applicable minimum window.
  - Validate with: dated redacted evidence per alias plus rollback rehearsal; absence of adequate evidence keeps that alias active.

- [ ] Task 9: Align active governance and enforce the historical allowlist
  - Files: root/subproject guidance and `shipglows_data/**` active contracts; no blind rewrite of archives/history.
  - Action: update canonical names/paths, add a deliberate legacy-mention allowlist with reason/owner/lifetime, and repair live links after root moves.
  - User story link: prevents future reintroduction while keeping evidence truthful.
  - Depends on: final canonical paths from Tasks 5-8.
  - Validate with: metadata lint, Markdown link/symlink scan and old-name scan minus allowlist.

## Acceptance Criteria

- [ ] AC 1: Given the completed migration, when an operator scans active tracked source outside the documented history/provider allowlist, then no unintended `WinGlowz`, `winglowz`, `WINGLOWZ` or `winflowz.com` remains.
- [ ] AC 2: Given `winglows.com`, when requesting apex and canonical public paths, then valid content responds with canonical metadata and no redirect loop.
- [ ] AC 3: Given `www.winglows.com` or `www.winflowz.com`, when requesting an existing path with a safe query, then a permanent redirect preserves path/query and lands on `winglows.com`.
- [ ] AC 4: Given the GitHub repository rename, when using the old web/Git URL, then GitHub compatibility resolves, while local origin, CI and docs identify `diane-defores/winglows`.
- [ ] AC 5: Given an existing legacy store install, when migration is offered, then the UI states that WinGlows is a separate app and offers the proved export/cloud path without claiming automatic in-place upgrade.
- [ ] AC 6: Given a new build, when platform manifests are inspected, then the new app uses accepted `com.winglows.app` identities and WinGlows display metadata; the old app remains independently identifiable.
- [ ] AC 7: Given valid legacy user data, when imported once or repeatedly by the same account, then the canonical state is correct and no duplicate record is produced.
- [ ] AC 8: Given corrupt or cross-user export data, when import is attempted, then no state changes and a recoverable redacted error is shown.
- [ ] AC 9: Given legacy and canonical entitlement/offer records for the same purchase, when access is evaluated, then exactly one canonical active grant results.
- [ ] AC 10: Given a replayed legacy webhook, when signature and idempotency checks pass, then it updates the same canonical purchase state without a second side effect.
- [ ] AC 11: Given tokens from the bounded issuer overlap, when verification runs, then only explicitly accepted issuer/audience/key combinations pass; unknown combinations fail closed.
- [ ] AC 12: Given canonical env keys, when services start, then aliases are ignored; given only an approved alias, fallback works; given conflicting values, startup fails without value disclosure.
- [ ] AC 13: Given the new domain, when Clerk/Firebase/OAuth/CORS/CSP and bridge flows are tested, then sign-in, callback, token exchange and protected requests succeed only from approved origins.
- [ ] AC 14: Given payment provider sandbox/test traffic, when checkout returns or webhooks arrive on the new origin, then success/cancel URLs, signatures and provider metadata remain valid.
- [ ] AC 15: Given repository/root/package renames, when all required checks run, then site and Flutter builds/tests resolve no stale active paths.
- [ ] AC 16: Given historical documents with truthful legacy spelling, when the enforcement scan runs, then only allowlisted mentions remain and each has a reason and owner/lifetime.
- [ ] AC 17: Given a failed external cutover checkpoint, when rollback executes, then the last proven domain/env/webhook state is restored without data or grant duplication.

## Test Strategy

### Automated

1. Run canonical/legacy registry and normalization tests.
2. Run `cd winglows_site && pnpm build:check`.
3. Run targeted SEO, CSP, auth-routing, bridge, entitlement, checkout and webhook tests, then `pnpm test:unit`.
4. Run `cd winglows_app && flutter analyze` and `flutter test`.
5. Run tracked content/path scans with exclusions and the explicit historical/provider allowlist.
6. Run `/home/claude/shipglows/tools/shipglows_metadata_lint.py AGENT.md shipglows_data` after the governance folder/path is final.
7. Run `git diff --check` and link/symlink integrity checks.

### Hosted and contract

1. Prove the new Vercel preview without moving DNS.
2. Prove Clerk/Firebase OAuth callbacks, CORS/CSP, Convex bridge and redacted diagnostics on preview.
3. Prove commerce checkout and signed webhook handling using provider sandbox/test events.
4. Attach domain, verify TLS/DNS, then run apex/www/legacy redirect and critical API health matrices.
5. Correlate Sentry release/environment or visible diagnostics to the exact build; no direct-dashboard claim without supplied evidence.

### Store and manual

1. Build Android only in Blacksmith CI and install the new app on a test device alongside the legacy app when platform rules permit.
2. Validate legacy export/cloud save, new app sign-in/import, settings/theme/data recovery and explicit unsupported-state messaging.
3. Validate the new Apple app record/TestFlight build through authorized Apple tooling.
4. Observe entitlement, auth, import and crash/support signals through the agreed window before retiring aliases or legacy distribution.

## External Console Sequence and Rollback

1. Reserve/verify `diane-defores/winglows`, `winglows.com`, legacy redirect ownership, email identities and exact `com.winglows.app` store identifiers without changing current traffic. Failure stops all dependent batches without selecting an alternate identifier.
2. In the existing Firebase project, register new WinGlows apps/OAuth clients; add exact Clerk domains/callbacks, provider return/webhook URLs and Sentry release identity while retaining old entries. A new Firebase project requires a separate approved migration contract.
3. Deploy canonical code to preview with canonical env plus approved fallbacks; prove auth, access, checkout and import.
4. Rename GitHub repository and update local/CI remotes. Rollback: GitHub rename back only if critical tooling cannot be repaired; otherwise use GitHub redirect while fixing consumers.
5. Attach and verify `winglows.com` on Vercel, then switch DNS. Rollback: restore previous DNS/project alias and keep canonical deployment available on its Vercel preview URL.
6. Enable canonical Clerk/OAuth/Convex/provider callbacks and webhooks. Rollback: restore the previous endpoint/env configuration and replay only idempotent signed events.
7. Redirect `www.winflowz.com` only after canonical health passes. Rollback: remove redirect and restore last healthy origin; never point both hosts into a loop.
8. Publish new store apps as separate listings, initially limited/tested. Rollback: halt rollout or unlist the new app without deleting the legacy migration source.
9. After each minimum observation window and its health gate, retire aliases individually with explicit operator approval and rollback evidence; do not combine retirement with initial cutover.

## Execution Batches

- Batch 0 — External reservations, redacted baseline and decision registry: no source renames or traffic mutation.
- Batch 1 — Data/export/cloud migration path: Flutter data layer only.
- Batch 2 — Commerce, entitlements, JWT and env compatibility: backend/runtime contracts only.
- Batch 3 — Domain/site/SEO/auth redirect preparation: site config/content only.
- Batch 4 — Repository roots, CI paths and Dart package: structural source move only.
- Batch 5 — Platform republication identity and native compatibility: mobile/desktop manifests and host code only.
- Batch 6 — External-console cutover: provider state plus bounded runbook evidence only.
- Batch 7 — Governance/docs reflection and historical allowlist: documentation only.
- Batch 8 — Full proof, minimum observation gates and individually authorized alias retirement: no new feature work.

Each batch starts from a reviewed diff and clean coordination state, has its own rollback point, and must not absorb another batch merely because a global rename tool found adjacent matches.

## Risks

- Security/auth: widened origins, stale callbacks or issuer overlap can permit unauthorized traffic. Mitigation: exact allowlists, bounded overlap, audience/key checks and preview proof.
- Data: a separate app sandbox cannot read old local data directly. Mitigation: build/export or account-cloud recovery in the old app before relying on the new app.
- Commerce: legacy and canonical IDs can duplicate access or payment effects. Mitigation: normalize before evaluation and preserve webhook idempotency/provider object IDs.
- Store continuity: users, reviews and install identity do not transfer automatically. Mitigation: explicit republication messaging, staged rollout and support plan.
- Firebase: project ID cannot be renamed. Mitigation: keep it as an intentional provider legacy ID or create a separately approved project with a real data/auth migration.
- Domain/SEO: current canonical is `www.winflowz.com`, not live `winglowz.com`. Mitigation: migrate the actual canonical host and preserve permanent redirects/canonical metadata.
- Email/support: changing visible addresses before provisioning loses support/legal mail. Mitigation: prove new mailboxes and old aliases first.
- Native state: changing prefs/channels/actions/themes breaks continuity. Mitigation: compatibility readers and idempotent migration tests.
- Historical integrity: zero-match replacement falsifies evidence. Mitigation: reasoned allowlist and active-versus-historical scan modes.
- Operational concurrency: broad moves collide with unrelated work. Mitigation: per-batch clean-state gate and no simultaneous structural refactors.

## Execution Notes

- Read first: root `AGENT.md`, `CLAUDE.md`, `winglowz_app/AGENTS.md`, `winglowz_site/AGENT.md`, `shipglows_data/technical/architecture.md`, and this spec.
- Before code, snapshot redacted provider configuration presence and exact externally owned decisions; do not ask Diane for evidence the agent can safely inspect.
- Treat display brand, source/package name, persistent local key, application/bundle ID, provider object ID and historical evidence as different identity classes.
- Do not use a repository-wide replacement until the registry classifies every match and the current batch owns it.
- The app/site diagnostics contract must continue to expose safe commit/build identity and Paris/UTC build times. Existing Sentry instrumentation is preserved; this migration does not add replay or sensitive telemetry.
- Stop if the worktree becomes dirty outside the active batch, a target identifier is unavailable, a provider requires an unapproved replacement project, export/import cannot preserve promised data, or a security/commerce test cannot fail closed.
- `fresh-docs checked`: official GitHub, Vercel, Android, Apple and Firebase identity documentation is linked under Dependencies. Recheck provider docs at implementation if behavior or console UI has changed.

## Open Questions

None. External availability and migration feasibility are execution gates with safe defaults and stop conditions: exact `com.winglows.app` or no publication; inventory before recovery promises; existing Firebase project plus new app registrations; and the minimum independent compatibility windows defined in Invariants.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
| --- | --- | --- | --- | --- | --- |
| 2026-08-03 21:28:30 UTC | 100-sg-spec | GPT-5 Codex | Created the full autonomous contract for canonical WinGlows identity, domain migration, separate store republication, data/access compatibility, external cutover and proof. | draft | Run readiness review against provider access, migration feasibility and rollback evidence. |
| 2026-08-03 21:58:00 UTC | 101-sg-ready | GPT-5 Codex | Ran structural, adversarial, security, product-coherence, design-authority and freshness review; added exact preflight gates, safe Firebase/data defaults, proof ownership, retirement windows and required scenarios. | ready | Implement in bounded batches starting with reversible external reservations and baseline evidence. |
| 2026-08-03 22:08:00 UTC | 102-sg-start | GPT-5 Codex | Ran read-only Batch 0 authority, DNS, hosted-environment and tooling checks; recorded a redacted provider baseline without mutation. Exact store-ID, Firebase, email and CDN gates remain unproved. | partial | Obtain authorized provider-specific evidence and reserve exact `com.winglows.app`; do not start dependent batches. |

## Current Chantier Flow

| Step | Status | Evidence | Next |
| --- | --- | --- | --- |
| 100-sg-spec | complete | Full spec created from quantified tracked inventory, operator decisions and official identity documentation. | Review readiness. |
| 101-sg-ready | complete | Required structure, operator decisions, official identity constraints, security/data/commerce gates, proof owners, rollback and stop conditions are explicit. | Start bounded implementation. |
| 102-sg-start | partial | Redacted Batch 0 baseline recorded. GitHub/Vercel authority is partly proved; Firebase CLI, Play, Apple, email and CDN evidence is incomplete, and `com.winglows.app` is not proven reserved. | Complete provider-specific authority gates before dependent batches. |
| 103-sg-verify | pending | Proof ladder and acceptance criteria are defined but not executed. | Verify after all owned batches complete. |
| 104-sg-end | pending | No closure bookkeeping performed. | Close only after verified migration and docs reflection. |
| 005-sg-ship | pending | No commit, push, deploy or provider mutation performed. | Ship through explicit release ownership. |
