---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.3.1"
project: "CommandGlows"
created: "2026-08-03"
created_at: "2026-08-03 23:09:59 UTC"
updated: "2026-08-03"
updated_at: "2026-08-04 21:12:25 UTC"
status: ready
source_skill: 100-sg-spec
source_model: "GPT-5.6 Codex"
scope: migration
owner: "Diane"
confidence: high
user_story: "En tant qu'opératrice, je veux republier mes premiers logiciels Android et Windows sous l'identité CommandGlows afin de concentrer les premières ventes sur une marque unique et le domaine que je contrôle, sans maintenir de compatibilité avec des identités qui n'ont encore aucun utilisateur."
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - "Astro site and Vercel"
  - "Flutter Android and Windows applications"
  - "Firebase and OAuth"
  - "Clerk and Convex"
  - "GitHub and CI"
  - "Google Play and Microsoft distribution"
depends_on:
  - artifact: "shipglows_data/technical/architecture.md"
    artifact_version: "1.0.1"
    required_status: reviewed
  - artifact: "shipglows_data/technical/guidelines.md"
    artifact_version: "1.0.0"
    required_status: reviewed
supersedes:
  - "shipglows_data/workflow/specs/winglows-canonical-identity-and-store-republication.md"
evidence:
  - "Operator purchased commandglows.com on 2026-08-03 after the documented free collision screen."
  - "Operator confirmed there are no users and explicitly waived update, review, install, and local-data continuity."
  - "Clean worktree observed before planning."
  - "Active-source scan found 2,276 legacy-name references outside workflow history and generated folders."
  - "Read-only inventory found 552 affected text files: 227 app, 171 site, and 146 governance surfaces."
  - "Android currently uses com.winglowz_app.winglowz_app; Dart has 223 package:winglowz_app imports; Windows has display/executable metadata but no committed MSIX Store Package Identity."
  - "2026-08-04 re-audit: the current executable surfaces are mostly CommandGlows, while root paths, CI, governance, provider configuration, historical classification, and external publication remain incomplete."
  - "2026-08-04 scoped scans found 109 legacy references in 19 site files, 365 references in 54 app files, 3,366 references in 147 governance files, and 156 root-level references in 9 selected files after generated/dependency exclusions."
  - "The repository remote, Vercel project metadata, root package, source-root names, CI, Dependabot, Firebase project reference, Clerk/CDN hosts, and release signing still expose legacy or provisional identity contracts."
next_step: "/103-sg-verify commandglows-clean-identity-reset"
---

# CommandGlows Clean Identity Reset

## Title

CommandGlows Clean Identity Reset

## Status

Ready v1.2 replacement contract, materially expanded after the operator reconfirmed that everything active must move to CommandGlows. Previously completed app/site batches remain recorded; structural, governance, provider, store, signing, entitlement, asset, and canonical-domain work is now specified through concrete targets and required proof scenarios.

## User Story

En tant qu'opératrice, je veux republier mes premiers logiciels Android et Windows sous l'identité CommandGlows afin de concentrer les premières ventes sur une marque unique et le domaine que je contrôle, sans maintenir de compatibilité avec les identités WinGlowz ou WinGlows qui n'ont encore aucun utilisateur.

Trigger: ownership of `commandglows.com` and operator approval of a clean reset. Observable result: every active public, product, source, repository, deployment, provider, store, support, and governance surface uses CommandGlows consistently, while immutable identifiers and truthful history remain only in a mechanically enforced exception registry.

## Minimal Behavior Contract

The current unpublished product identity is reset to `CommandGlows`, canonical public origin `https://www.commandglows.com` with `https://commandglows.com` permanently redirecting to it, source/repository slug `commandglows`, Dart package `commandglows_app`, and native identity `com.commandglows.app`. Active names, paths, provider configuration, assets, metadata, and documentation must converge on that contract. Failed external registration or an unavailable asset blocks only the dependent publication batch and leaves the last verified surface live; immutable provider IDs and truthful dated history remain private, classified, and allowlisted instead of being falsified by global replacement.

## Success Behavior

- Android and Windows user-facing names display CommandGlows.
- New Android builds use `com.commandglows.app`; native Kotlin packages and paths agree.
- Windows executable/product metadata use CommandGlows without stale WinGlowz/WinGlows display strings.
- Active Astro content and configuration use `commandglows.com` and CommandGlows.
- Active Dart imports/package metadata, CI paths, repository guidance, product docs, and environment-variable names use the canonical identity.
- GitHub repository identity, monorepo package name, source-root paths, CI filters/artifacts, Dependabot directories, Vercel project/root configuration, local process names, and active absolute paths agree on `commandglows`.
- Brand assets, screenshots, icons, social cards, CDN objects, alt text, filenames, store media, legal entity/contact text, email sender identity, analytics, and observability labels contain no unintended legacy identity.
- Firebase/OAuth/store applications are treated as fresh registrations. Existing empty registrations may be replaced instead of migrated.
- Historical specs, bugs, transcripts, and changelogs may retain old names only as dated evidence or explicit provider identifiers.

## Error Behavior

- If `com.commandglows.app` cannot be registered, native publication stops; implementation does not invent another identifier.
- If an external provider ID is immutable, it remains internal and is documented rather than falsely represented as renamed.
- Conflicting legacy and canonical environment variables fail without logging secret values.
- If a provider, CDN asset, OAuth callback, webhook, entitlement mapping, or store registration is not ready, the corresponding public cutover does not occur and the failure is recorded with a redacted recovery action.
- No global replacement may modify secrets, generated output, third-party dependencies, migrations that encode historical database truth, or unrelated sibling repositories.

## Problem

CommandGlows is now the commercial identity and owned domain, but the monorepo still mixes three states: already-renamed product code, active structural/provider/governance references to WinGlowz/WinGlows, and truthful historical or immutable identifiers. That mixture can leak the former brand publicly, break builds and callbacks during path renames, fragment auth/commerce/entitlements, or encourage an unsafe global replacement that destroys traceability.

## Solution

Establish one canonical identity matrix and mechanically enforced exception registry, then migrate in dependency-ordered, reversible batches: active app/site gaps, external prerequisites, atomic repository/root/tooling names, canonical governance, provider cutovers, and final cross-surface proof. Treat every retained old name as a classified exception rather than an accidental residue.

## Scope In

- Rename active brand copy, assets, code symbols, app/store metadata, Android namespaces/packages, Windows metadata, Dart package/imports, site canonical origin, active email/contact strings, CI paths, and active governance to CommandGlows.
- Rename repository roots `winglowz_app/` and `winglowz_site/` to `commandglows_app/` and `commandglows_site/` when their consumers are updated atomically.
- Replace authorized future IDs `com.winglows.app` with `com.commandglows.app`.
- Create a narrow historical/provider allowlist and enforce zero unintended active legacy-name matches.
- Rename the GitHub repository target to `diane-defores/commandglows`, root workspace package to `commandglows-monorepo`, active process/service names, build metadata variables, CI artifacts, project paths, and provider-facing labels where the external system supports it.
- Inventory and migrate the full identity perimeter: DNS/redirects, Clerk, Firebase and Google OAuth, Vercel, CDN, GitHub, Google Play, Microsoft distribution, Apple bundle metadata if retained, email, commerce/webhooks, Sentry/analytics, social profiles, support/legal pages, screenshots, install guides, and downloadable artifacts.
- Classify every legacy match as `active-migrate`, `immutable-provider`, `stable-internal-id`, `historical-evidence`, or `generated-disposable`; only the final four may survive, each under an explicit rule.

## Scope Out

- No migration UX, legacy app support, review/install continuity, data import, or old entitlement compatibility.
- No automatic purchase, store submission, DNS mutation, GitHub repository rename, OAuth registration, Firebase app creation, or production deployment without the corresponding operator-authorized external action.
- No broad interface redesign; the approved `CMDglows` logo evolution is the only visual redesign in scope and existing design tokens/components remain authoritative.
- No rewrite of truthful historical evidence.
- No renaming of applied migration filenames, commit hashes, dated URLs observed in evidence, stable `wfz-*` work-item IDs, or third-party identifiers whose mutation would break referential integrity.

## Constraints

- The worktree must remain free of unrelated edits during structural batches.
- Android builds and Gradle commands remain forbidden locally; use Flutter analysis/tests locally and Blacksmith CI for Android artifacts.
- Existing auth, commerce, webhook, tenant, secret, and data-security behavior must not broaden during the rename.
- Public identity is CommandGlows even if an immutable private provider project ID retains a legacy spelling.
- `commandglows.com` is the only canonical public origin authorized by this contract.
- Existing product functionality and design remain unchanged.
- The user instruction `TOUT changer` means zero unintended legacy identity on active surfaces, not destructive rewriting of evidence or immutable identifiers.
- The design-system authorities remain the Flutter theme/token layer and the Astro global CSS/Tailwind layer; brand asset changes must use those authorities and pass visual/token proof.
- External mutations are executed only with authenticated authority and redacted evidence; secret values, signing keys, OAuth secrets, and provider tokens never enter the spec, logs, or repository.

### CMDglows Visual Identity Addendum

Operator decision `BRAND-CMD-001` supersedes the transitional `CMDglows` wordmark treatment while preserving the approved name split.

- Before: a glossy, heavily outlined wordmark inherited from the former visual era.
- After: a contemporary neon wordmark that keeps the yellow → pink → violet gradient and a visible glow, with cleaner geometry, less plastic relief, tighter spacing, and reliable small-size behavior.
- Public wordmark: `CMDglows`, with `CMD` structured and `glows` more fluid.
- Preserved invariants: `CommandGlows` remains the legal, domain, provider, package, bundle and technical identity; no URL, namespace, entitlement or callback changes.
- Canonical palette and effects resolve through the existing site/app brand tokens; no second palette or ad-hoc component colors.
- Required asset family: primary full-color wordmark on transparency, simplified small-size wordmark, and compact monogram for square/icon contexts.
- Required variants: full color, monochrome light and monochrome dark. Each must remain legible without relying on glow alone.
- Desired emotion: energetic, capable, luminous and premium. Avoid toy-like, gummy, chrome-heavy, cyberpunk-aggressive or generic developer-tool styling.
- Accessibility/proof: transparent edges, light/dark contrast, 32 px and 16 px recognition checks, responsive header fit, favicon/app-icon crop safety and browser screenshots.

## Test Contract

- `surface`: root monorepo, Astro site, Flutter app, Android native/IME, Windows runner/distribution, active governance, and external providers.
- `proof_profile`: mixed Astro + Flutter + native mobile/desktop + auth/commerce/provider + documentation migration.
- `proof_order`: scanners → focused tests → full local checks → Android CI artifact → provider integrations → browser/device/store/manual proof.
- `checklist_path`: `shipglows_data/workflow/test-checklists/commandglows-identity-reset.md`.
- `required_scenario_ids`: `ID-ROOT-001`, `ID-SITE-001`, `ID-AUTH-001`, `ID-APP-001`, `ID-ANDROID-001`, `ID-WINDOWS-001`, `ID-PROVIDER-001`, `ID-GOV-001`, `ID-ASSET-001`, `ID-HISTORY-001`, `ID-FAIL-001`.
- `required_results`: every scenario is `pass`; unavailable external/device proof is `exception_with_proof` and keeps the related task and overall chantier partial.
- Automated proof: legacy-name/path scanner with classification allowlist; site build/type checks and unit tests; Flutter analysis and tests; metadata lint; CI configuration/path checks; diff and broken-link checks.
- Provider proof: redacted console or API evidence for GitHub, Vercel, DNS, Firebase/OAuth, stores, email, commerce, CDN, and observability before each claim is marked complete.

| Scenario | Trigger | Required observable result | Evidence |
| --- | --- | --- | --- |
| `ID-ROOT-001` | Rename repository, roots, package, CI and tooling | Clean clone/checks resolve only new active paths; Git remote is canonical | path scan, CI run, remote/config proof |
| `ID-SITE-001` | Visit apex, canonical site and representative EN/FR routes | Apex redirects once to `www`; metadata, links and copy stay canonical | browser/network, SEO tests, sitemap crawl |
| `ID-AUTH-001` | Sign in/up and return through Clerk/Google/Firebase flows | Owned HTTPS origins/callbacks succeed; invalid legacy origin is rejected | targeted tests and redacted provider/browser proof |
| `ID-APP-001` | Build and launch Flutter surfaces | Package/build metadata, user copy, entitlements and observability use CommandGlows | analyze/tests and runtime diagnostics |
| `ID-ANDROID-001` | Install CI-signed `com.commandglows.app` artifact | Non-debug signing, launch, login, IME selection, permissions and core action succeed | CI artifact plus device checklist |
| `ID-WINDOWS-001` | Install/launch Windows build | Product, executable, installer/uninstall and runtime labels are canonical | Windows checklist and artifact metadata |
| `ID-PROVIDER-001` | Exercise CDN, checkout/webhook/refund, email and observability | New identity works once; failures are recoverable and secrets remain redacted | HTTP/provider/event evidence |
| `ID-GOV-001` | Read active governance and operator commands | Current docs resolve existing new paths and identity without stale instructions | metadata/link/path lint |
| `ID-ASSET-001` | Inspect public/store/distribution media | No old wordmark, domain or filename is visible; replacement objects return 200 | visual checklist and HTTP proof |
| `ID-HISTORY-001` | Run legacy scanner across evidence and active sources | Every retained match has category, reason and removal condition; active residue fails | scanner report and reviewed allowlist |
| `ID-FAIL-001` | Make one dependent external prerequisite unavailable in staging | Cutover stops at that boundary, old verified surface remains live, no partial data/config state | rollback/retry log without secrets |

## Dependencies

- Canonical business, product, brand, editorial, architecture, guidelines, and design-system authority documents under root `shipglows_data/`.
- Existing Astro/Vercel, Flutter, Firebase/Google OAuth, Clerk, Convex, commerce, CDN, GitHub, Sentry/analytics, email, and store configurations.
- Freshness verdict: `fresh-docs checked` on 2026-08-04 for the rules that govern the planned identity changes:
  - GitHub repository rename redirects web and Git traffic, but action references do not redirect; update remotes and action consumers: `https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository`.
  - Vercel recommends `www` as primary with apex redirect and requires each monorepo project's Root Directory to point at its actual subdirectory: `https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting` and `https://vercel.com/docs/monorepos`.
  - Firebase Android package names and Firebase project IDs cannot be changed after registration; register `com.commandglows.app` as a new Firebase app and treat a legacy Firebase project ID as an immutable private exception or create a new project deliberately: `https://firebase.google.com/docs/android/setup` and `https://firebase.google.com/docs/projects/learn-more`.
  - Google Play package names are unique and permanent; `com.commandglows.app` must be registered and signed under the intended account/key rather than renamed in place: `https://support.google.com/googleplay/android-developer/answer/9859152` and `https://support.google.com/googleplay/android-developer/answer/16984799`.
  - Google OAuth production origins/redirects must use owned secure domains; Clerk redirects must resolve to the instance domain/subdomain or an allowed origin: `https://developers.google.com/identity/protocols/oauth2/policies`, `https://clerk.com/docs/guides/development/customize-redirect-urls`, and `https://clerk.com/docs/guides/dashboard/dns-domains/satellite-domains`.
- Atlas: `not_applicable`; no project Atlas exists and this identity migration does not invent surface/function IDs.

## Invariants

- CommandGlows preserves the current Windows-first offer, Windows Mastery positioning, bilingual EN/FR intent parity, features, data model, pricing decisions, security boundaries, auth/commerce behavior, and design language unless a separate approved decision supersedes them.
- Public canonical origin is `https://www.commandglows.com`; apex is redirect-only. Preview/provider hosts never become canonical public URLs.
- Stable historical IDs may remain machine-visible only where changing them would destroy traceability or compatibility; they never appear as the current public brand.
- No silent data loss, entitlement loss, permission broadening, repeated webhook side effect, secret exposure, or fallback to debug signing is acceptable.

## Links & Consequences

- Before → after: WinGlowz/WinGlows and legacy winflowz/winglowz domains → CommandGlows and `www.commandglows.com`; `diane-defores/winglowz` → `diane-defores/commandglows`; `winglowz_site/` and `winglowz_app/` → `commandglows_site/` and `commandglows_app/`; `winglowz-monorepo` → `commandglows-monorepo`; old package/bundle identities → `commandglows_app` and `com.commandglows.app`.
- Root-path rename changes CI triggers, working directories, artifacts, Vercel roots, process managers, docs, scripts, worktrees, caches, and developer commands atomically.
- Provider reset changes OAuth clients/audiences, Firebase registrations, SHA fingerprints, allowed origins/callbacks, CSP, store records, signing and installation identity. These contracts must be updated together before release.
- Entitlement identity has already moved toward `commandglows_app`; server ledgers, Firestore rules, checkout products, webhooks, tests, and active accounts must agree. Because zero users is the confirmed premise, stale empty IDs may be retired; if any real account/data is discovered, stop and rescope to a compatibility migration.
- CDN legacy hosts and filenames remain until assets are copied/aliased and return 200 from the new origin; SEO redirects remain only for real previously public URLs and never make an old domain canonical.
- Historical specs, bugs, audits, changelogs, transcripts, migration filenames, commits, and observed provider URLs retain factual wording and are excluded only through reviewed, reasoned allowlist entries.

## Edge Cases

- Case variants and near-spellings: `WinGlowz`, `WinGlows`, `Winglowz`, `winglowz`, `winglows`, `winflowz`, uppercase env names, hyphenated/underscored slugs, filenames, paths, URLs, emails, package names, and binary/channel identifiers.
- Brand embedded in raster/vector assets, screenshots, app icons, social cards, downloadable archives, CDN object keys, alt text, EXIF/metadata, store media, and cached/generated bundles even when text scans pass.
- Immutable external project IDs that retain a legacy slug while display names and public URLs are canonical.
- Existing installs, accounts, entitlements, reviews, store reservations, production data, or signing material discovered despite the zero-user premise; discovery stops the destructive reset for that surface.
- Apex/www redirect loops, stale preview canonicals, OAuth callback mismatch, CSP omissions, webhook endpoints still targeting the former domain, CDN cache lag, DNS propagation, email authentication records, or Sentry releases split across names.
- Dormant modules such as `modules/floating-overlay` that are either renamed and proved or explicitly removed through a separate reviewed deletion; they cannot remain silently active with legacy channels/packages.

## Implementation Tasks

- [x] Task 0 — Capture the exact active/historical/provider inventory and prove a clean baseline.
- [x] Task 1 — Add the canonical identity contract and old-name enforcement allowlist.
- [x] Task 2 — Rename Flutter/Dart and shared product-facing source to CommandGlows.
- [x] Task 3 — Reset Android application ID, Kotlin namespace/path, services, intents, channels, and resources to `com.commandglows.app`.
- [x] Task 4 — Rename Windows executable/product metadata and verify desktop source coherence.
- [x] Task 5 — Rename Astro site identity, canonical URLs, metadata, legal/contact copy, auth/CORS/CSP configuration, and environment readers.
- [x] Task 6 — Rename monorepo roots and update CI, scripts, Vercel roots, Dependabot, docs, and imports atomically.
- [x] Task 7 — Update active governance, product/GTM/brand contracts, operator instructions, and historical exceptions.
- [ ] Task 8 — Run full local proof and prepare redacted external-console actions for Firebase, OAuth, stores, GitHub, Vercel, DNS, email, commerce, and observability.
- [x] Task 9 — Redesign and integrate the `CMDglows` visual identity asset family under `BRAND-CMD-001`, then collect token, small-size, light/dark and browser proof.

Task details and proof obligations:

- Task 1 targets the root scanner/config plus `shipglows_data/workflow/legacy-name-allowlist.md`. It defines canonical values once, detects textual and path matches, rejects unclassified active matches, and records category, reason, owner, and removal condition for every exception.
- Task 2 includes Dart package/imports, environment/build variable parity, visible strings, theme/token class names, Sentry tags/releases, assets, and tests. Resolve the current mismatch where build scripts emit `WINGLOWZ_APP_BUILD_*` but runtime reads `COMMANDGLOWS_APP_BUILD_*`.
- Task 3 includes Firebase registration/config injection, Google OAuth client and SHA fingerprints, IME identity, native channels/preferences, signing, store package, and physical-device proof. Release builds must not use the debug key.
- Task 4 includes executable/product/company metadata, installer/MSIX/store identity when introduced, icons, Start-menu/uninstall labels, data paths, Sentry identity, and Windows-machine proof.
- Task 5 includes `www.commandglows.com` canonical metadata, apex redirect, sitemap/robots/hreflang/structured data/social cards, Clerk origins/callbacks/CSP, bridge origins, commerce callbacks/webhooks, email/legal/support copy, CDN assets, analytics, and bilingual parity.
- Task 6 is one atomic source-root/tooling batch: rename repository target, root package, `winglowz_site/`, `winglowz_app/`, CI paths/artifacts, Dependabot, Vercel roots/projects, process config, scripts, worktree references, and contributor commands. Generated/cache folders are regenerated, never hand-edited.
- Task 7 updates active canonical governance first, then active specs and trackers. Dated evidence stays factual; ready/active contracts receive current paths and public identity while stable IDs remain unchanged.
- Task 8 uses a provider ledger with `surface`, `old identity`, `new identity`, `authority`, `dependency`, `rollback`, `redacted proof`, and `status`. No provider is marked complete from a source-code scan alone.

| Task | Concrete targets | Action and dependency | User-story link | Validate with |
| --- | --- | --- | --- | --- |
| 1 | root identity scanner/config; `shipglows_data/workflow/legacy-name-allowlist.md`; new manual checklist | Define canonical matrix, match categories, exception schema and failing scan before further edits | Zero unintended active legacy identity | `ID-HISTORY-001`; metadata lint |
| 2 | `commandglows_app/pubspec.yaml`, `.env.example`, `scripts/vercel_build_flutter.sh`, `lib/core/bootstrap/app_build_info.dart`, Sentry/bootstrap/theme/assets/tests | Align package, build env, runtime labels and diagnostics after Task 1 | CommandGlows app identity | `ID-APP-001`; Flutter analyze/tests |
| 3 | `commandglows_app/android/app/build.gradle.kts`, manifests, Kotlin package tree, Firebase options/injection, CI signing inputs, Firestore/Storage rules, native tests | Complete immutable Android/Firebase/OAuth/signing coupling after Tasks 1–2 and provider registration | Publishable CommandGlows Android app | `ID-AUTH-001`, `ID-ANDROID-001` |
| 4 | `commandglows_app/windows/**`, installer/MSIX/store configuration when present, desktop assets/tests | Align executable/distribution/runtime metadata after Task 2 | CommandGlows Windows distribution | `ID-WINDOWS-001` |
| 5 | `commandglows_site/astro.config.mjs`, `vercel.json`, env schema/example, constants, auth middleware, API/bridge/commerce, content/i18n, public/assets, deployment tests | Finish public domain/auth/CDN/commerce/content migration after Task 1 and provider prerequisites | Canonical CommandGlows customer journey | `ID-SITE-001`, `ID-AUTH-001`, `ID-PROVIDER-001`, `ID-ASSET-001` |
| 6 | root `package.json`, `README.md`, `AGENT.md`, `CLAUDE.md`, `.github/**`, `.vercel/project.json`; source roots; process configs; scripts | Atomically rename repo/root paths and all consumers after Tasks 2–5 are green | One coherent source and delivery identity | `ID-ROOT-001`; both subproject check suites |
| 7 | active `shipglows_data/business/**`, `editorial/**`, `technical/**`, open specs/trackers/operator guides; root/subproject guidance | Update current contracts after Task 6; preserve dated evidence and stable IDs | Operators and future agents see only current truth | `ID-GOV-001`, `ID-HISTORY-001`; metadata lint |
| 8 | provider ledger and checklist covering GitHub, Vercel/DNS, Clerk, Firebase/Google OAuth, Play/Microsoft/Apple, email, commerce, CDN, Sentry/analytics | Execute authorized cutovers in dependency order after source/config readiness; capture rollback and redacted proof | Sell and operate publicly as CommandGlows | all required scenarios; live/provider/device proof |

Task 3 is atomic: the current `com.winglowz_app.winglowz_app` Gradle namespace/application ID, `com/winglowz_app/**` main/test paths and package declarations, relative manifest services, IME classes/resources, method channels, and tests move together. Task 4 records that no committed MSIX Store Package Identity currently exists; the first Microsoft Store identity remains an external publication action.

## Acceptance Criteria

- [ ] AC 1: Active source and configuration contain no unintended WinGlowz, WinGlows, winglowz, winglows, WINGLOWZ, WINGLOWS, winflowz.com, or winglows.com references outside the allowlist.
- [x] AC 2: Flutter metadata and imports resolve under `commandglows_app` and user-visible app copy reads CommandGlows.
- [x] AC 3: Android manifests, Gradle namespace/application ID, Kotlin packages/paths, services and tests agree on `com.commandglows.app`.
- [x] AC 4: Windows runner metadata and generated build configuration resolve the CommandGlows product name without stale active identity.
- [x] AC 5: Site canonical URLs, sitemap, robots, structured data, social metadata, auth origins, legal links, and contact strings use `www.commandglows.com` where externally provisioned, with apex redirect-only.
- [x] AC 6: Existing auth, commerce, webhook, privacy, and entitlement tests continue to pass without compatibility code added for nonexistent users.
- [ ] AC 7: `flutter analyze`, `flutter test`, site `pnpm build:check`, site unit tests, metadata lint, link/path scans, and `git diff --check` pass.
- [ ] AC 8: Android artifact proof is delegated to Blacksmith CI; no forbidden local Android/Gradle command runs.
- [ ] AC 9: Every retained legacy spelling has a dated historical or immutable-provider reason.
- [ ] AC 10: External mutations remain an explicit redacted checklist and are not claimed complete without observable proof.
- [x] AC 11: Root repository/package, source-root directories, Git remote, CI/Dependabot, Vercel roots/projects, process names, scripts, artifact names, and active documentation resolve to CommandGlows without broken paths.
- [ ] AC 12: All active assets and distribution media are visually inspected; no legacy wordmark, logo, or domain remains in icons, screenshots, social cards, CDN media, downloads, installers, or store listings.
- [ ] AC 13: Firebase/Google OAuth, Clerk, CSP/CORS, bridge audiences, authorized callbacks, commerce webhooks, email sender identity, analytics, and observability work under the CommandGlows contract with redacted proof.
- [ ] AC 14: Android release signing is non-debug, `com.commandglows.app` is registered, the CI artifact installs and launches, IME selection/permissions work, and the zero-user continuity premise is revalidated.
- [ ] AC 15: Governance active sources, open specs/tasks, operator docs, legal/support surfaces, and EN/FR content use CommandGlows; retained old names are classified facts or stable/immutable IDs.
- [ ] AC 16: `https://commandglows.com` redirects permanently without a loop to `https://www.commandglows.com`, and live pages expose only the `www` origin in canonicals, hreflang, sitemap, structured data, callbacks, and public links.
- [x] AC 17: The primary `CMDglows` wordmark preserves the approved gradient and glow while removing excessive plastic relief; transparent, monochrome, compact and small-size variants remain legible on light and dark surfaces.
- [x] AC 18: Site navigation, hero, favicon/social surfaces and app/store icon contexts consume the approved asset family without stretching, clipping, duplicate visual authorities or raw untokenized brand colors.

## Test Strategy

1. Run exact active-name and path scans before and after each batch.
2. Run targeted Flutter tests after Dart/native symbol changes, then full `flutter analyze` and `flutter test`.
3. Run `pnpm build:check` and `pnpm test:unit` after site/config changes.
4. Run static Android manifest/package/path consistency checks locally; use Blacksmith CI for the actual Android build.
5. Inspect Windows runner/product metadata and run the supported desktop check/build only if the environment is configured.
6. Run ShipGlows metadata lint, link/symlink checks, and `git diff --check`.
7. Verify hosted/domain/store/provider behavior only after explicit external execution.

## Execution Batches

- Batch A — Inventory, identity contract, allowlist, and replacement map.
- Batch B — Flutter shared code plus Android and Windows identities.
- Batch C — Site, public domain, auth/config, and active content.
- Batch D — Root/path/CI structural rename.
- Batch E — Governance coherence, complete checks, and external-action checklist.

Each batch owns disjoint surfaces and ends with focused checks. Historical workflow evidence is read-only except for lifecycle status and explicit supersession metadata.

## Risks

- A blind replacement can corrupt package paths, auth origins, provider IDs, environment variables, or historical evidence.
- New Android identity requires fresh Firebase/OAuth/store registration before publication.
- Renaming roots can break CI, Vercel root directories, scripts, and documentation links simultaneously.
- The absence of users removes continuity work but does not remove trademark, platform-account, signing, privacy, or security obligations.
- `Command` is a crowded software term; the documented preliminary clearance is not a registration guarantee.

## Documentation Coherence

- Update root and subproject guidance, architecture, product, branding, GTM, content maps, deployment guides, README, store copy, and external-action runbook.
- Preserve the existing design-system authority and do not introduce new visual tokens during the rename.
- Mark the former WinGlows migration spec superseded rather than rewriting its historical execution evidence.

## Execution Notes

Read first: this spec; root `AGENT.md`; `shipglows_data/business/branding.md`; `shipglows_data/technical/architecture.md`; `shipglows_data/technical/design-system-authority.md`; then the relevant site/app provider configuration for the active batch.

Implementation order is identity contract and scanner → active app/site gaps → external identity prerequisites → atomic root/repository/tooling rename → active governance → provider cutover → full proof. Keep each batch reviewable and never mix blind repository-wide replacement with provider or historical migration decisions.

Commands and evidence anchors:

- `rg` and `find` scans covering spellings, case, domains, emails, paths, package/bundle IDs, env prefixes, binary/channel names, and asset metadata, with explicit dependency/generated exclusions.
- `(cd commandglows_site && pnpm build:check && pnpm test:unit)` after the structural rename; use `winglowz_site` before that atomic batch.
- `(cd commandglows_app && flutter analyze && flutter test)` after the structural rename; use `winglowz_app` before it. Android artifact builds remain delegated to approved CI, followed by physical-device proof.
- `/home/claude/shipglows/tools/shipglows_metadata_lint.py AGENT.md shipglows_data`, design-system drift scan for brand asset/token changes, link/path validation, and `git diff --check`.

Stop and reroute when an exact external identity is unavailable; a real user/install/review/entitlement/data record is found; signing ownership is unclear; a provider mutation would lose data or broaden permissions; the canonical domain cannot be proved; an old asset has no verified replacement; or a retained legacy match lacks a precise exception reason.

Security execution contract: only the authenticated operator or an already-authorized automation identity may mutate provider configuration. All incoming OAuth callbacks and commerce webhooks remain server-validated, signed where supported, idempotent, replay-safe, tenant/user scoped, and least-privileged. New domains, package IDs, redirect URIs, product IDs, and asset origins are untrusted configuration until exact-format and ownership checks pass. Logs record provider, action, redacted identifier suffix, result, correlation ID, and rollback state; they never record secrets, tokens, signing material, full user payloads, or payment data. Rate limits, retries, timeouts, duplicate events, partial provider failure, and stale DNS/cache are covered by `ID-FAIL-001` and the existing auth/commerce tests. A rename must not weaken Firestore/Storage rules, Clerk/Firebase token validation, CSP/CORS, webhook signature checks, or cross-user/tenant boundaries.

## Open Questions

None for local implementation. The public display wordmark is now `CMDglows`; `CommandGlows` remains the canonical legal, domain, package, provider, and technical identity. External provider availability is an execution gate with one authorized outcome: exact CommandGlows identities or a return to the operator for a new decision.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
| --- | --- | --- | --- | --- | --- |
| 2026-08-03 23:09:59 UTC | 100-sg-spec | GPT-5.6 Codex | Replaced the legacy-user migration premise with a clean CommandGlows identity reset after the operator confirmed zero users and waived update continuity. | draft | Run readiness review, then execute bounded rename batches. |
| 2026-08-03 23:11:14 UTC | 101-sg-ready | GPT-5.6 Codex | Reviewed the clean-reset contract against the active app/site inventory, native identifier coupling, provider boundaries, proof plan, and zero-user decision. | ready | Execute the app identity batch first; external provider mutations remain gated. |
| 2026-08-03 23:31:13 UTC | 706-continue | GPT-5.6 Codex | Continued the resolved chantier through the site/domain batch: renamed active Astro content, canonical origins, commerce and entitlement contracts, campaign URLs, public assets and tests while retaining unprovisioned Clerk and CDN provider hosts. | complete | Execute the root/tooling identity batch and formalize the provider exception allowlist. |
| 2026-08-03 23:36:44 UTC | 706-continue | GPT-5.6 Codex | Attached verified `commandglows.com` and `www.commandglows.com` domains to the existing Vercel project and configured a permanent apex-to-www redirect. Live HTTPS proof returned 308 for the apex and 200 for `www`. | complete | Deploy the already validated CommandGlows site before redirecting the former public domain. |
| 2026-08-04 14:26:54 UTC | 100-sg-spec | GPT-5.6 Codex | Re-audited root, site, app, governance, provider, store, asset, path, and historical surfaces after the operator reconfirmed the complete CommandGlows rename; repaired the spec into an exhaustive zero-active-residue contract. | draft | Rerun readiness against v1.1 before resuming implementation. |
| 2026-08-04 14:42:46 UTC | 101-sg-ready | GPT-5.6 Codex | Ran structural, adversarial, security, product-coherence, task-actionability, proof-contract, and external-freshness review of v1.1. | not ready | Add exact scenario IDs/results, concrete task targets and validation links, and current official provider rules before repeating readiness. |
| 2026-08-04 14:42:46 UTC | 100-sg-spec | GPT-5.6 Codex | Repaired the readiness gaps with a concrete target matrix, scenario-based proof contract, explicit security execution rules, and current official provider constraints. | draft | Repeat readiness against v1.2. |
| 2026-08-04 14:44:00 UTC | 101-sg-ready | GPT-5.6 Codex | Repeated structural, adversarial, security, product-coherence, freshness, task-actionability, and proof-contract review after the v1.2 repair. | ready | Begin the identity-contract and enforcement batch, then continue in dependency order. |
| 2026-08-04 15:02:40 UTC | 102-sg-start | GPT-5.6 Codex | Implemented local identity contract, app/site active residuals, root workspace/CI/Dependabot/config names, source-root renames, active canonical governance paths/docs, and runtime module labels. Local site checks passed; Flutter analyze passed; full Flutter suite remains red on 22 existing UI/behavior assertions. | partial | Finish active governance residue and provider ledger, then route hosted/device/store proof to verification. |
| 2026-08-04 15:05:18 UTC | 102-sg-start | GPT-5.6 Codex | Re-ran post-rename focused proof: site CSP/SEO 4/4, app identity/entitlement 13/13, Node/Bash config syntax, metadata lint 145/145, and diff checks passed. Full Flutter remains 285 passed / 22 pre-existing failures; hosted, device, store, signing, CDN replacement, and external provider proof remain open. | partial | Continue with verification and authorized external cutovers. |
| 2026-08-04 15:10:12 UTC | 102-sg-start | GPT-5.6 Codex | Renamed the authenticated GitHub repository to `diane-defores/commandglows`, updated the local `origin`, renamed the Vercel project to `commandglows`, and changed its hosted root directory to `commandglows_site`; provider inspection confirmed the new values. | partial | Run final local proof and retain Firebase/store/signing/CDN/email/commerce/device gates as explicit external checklist items. |
| 2026-08-04 15:27:00 UTC | 006-sg-design | GPT-5.6 Codex | Applied the operator-approved public wordmark `CMDglows` to visible site/app branding and regenerated the raster wordmark asset with verified RGBA transparency; legal, domain, package, provider, and technical identity remain `CommandGlows`. | partial | Run design drift and focused site/app checks; visual browser proof remains required for hosted surfaces. |
| 2026-08-04 20:51:10 UTC | 006-sg-design | GPT-5.6 Codex | Formalized and implemented `BRAND-CMD-001`: modern neon wordmark, compact `CMD` monogram, tokenized yellow-red-magenta-violet gradient and controlled glow, plus refreshed web/Android/iOS/macOS/Windows icon assets. | complete | Preserve the approved asset family during provider/store publication. |
| 2026-08-04 20:51:10 UTC | 108-sg-browser | GPT-5.6 Codex | Collected local Chromium proof at desktop light, desktop dark and 390 px mobile; the wordmark remains readable, unclipped and balanced in the responsive navigation. A 16/32/64/128 px icon sheet confirmed the monogram remains recognizable on light and dark backgrounds. The dev server emitted a pre-existing React invalid-hook warning unrelated to the logo. | partial | Visual objective passes locally; investigate the separate runtime warning before claiming whole-page browser health, and collect hosted proof only after an authorized deployment. |
| 2026-08-04 21:12:25 UTC | 006-sg-design | GPT-5.6 Codex | Corrected the raster wordmark after operator feedback that the former thin neon treatment could read as a transparent graphic with only a pink border. The new asset uses broad fully opaque gradient-filled letter faces with a secondary external glow, propagated to every site compatibility path and checked on light, dark, and reduced-size proof canvases. | complete | Preserve solid face opacity and keep glow subordinate in future brand exports. |

## Current Chantier Flow

| Step | Status | Evidence | Next |
| --- | --- | --- | --- |
| 100-sg-spec | complete | v1.2 defines complete active-surface coverage, canonical `www` identity, exception taxonomy, provider/store/signing/asset gates, and exhaustive proof. | Review readiness. |
| 101-sg-ready | ready | v1.2 has complete mandatory sections, concrete task targets, scenario IDs/results, security rules, current official provider constraints, stop conditions, and no unresolved material question. | Begin bounded implementation. |
| 102-sg-start | partial | Local app/site/root/governance batches are implemented. Site `astro check` reports no issues and 90/90 unit tests pass; focused identity tests pass 13/13; Flutter analyze passes, while the full Flutter suite reports 285 passed and 22 existing UI/behavior failures. External provider, Android artifact/device, store/signing, CDN replacement, and final legacy-proof gates remain. | Verify hosted/device/provider surfaces. |
| 006-sg-design | complete | `BRAND-CMD-001` is implemented across tokenized site wordmarks and web/native icon assets. The corrected raster wordmark now has alpha-transparent surroundings but fully opaque gradient-filled letter faces; light, dark, and reduced-size canvases prove that the graphic remains visible independently of its controlled external glow. Prior local Chromium desktop/mobile proof and 16/32/64/128 px icon proof remain valid; the `/bio` development route returned 200 after the replacement. | Keep the approved visual family intact during hosted/store publication. |
| 103-sg-verify | pending | Acceptance proof not yet run. | Verify after implementation. |
| 104-sg-end | pending | No closure bookkeeping performed. | Close after verification. |
| 005-sg-ship | pending | No commit, push, or deploy performed. | Ship only after explicit verified scope. |
