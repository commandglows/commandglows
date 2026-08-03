---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "CommandGlows"
created: "2026-08-03"
created_at: "2026-08-03 23:09:59 UTC"
updated: "2026-08-03"
updated_at: "2026-08-03 23:11:14 UTC"
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
next_step: "/102-sg-start commandglows-clean-identity-reset"
---

# CommandGlows Clean Identity Reset

## Status

Ready replacement contract. It replaces the former WinGlows migration plan because there are no users or store-update obligations to preserve.

## User Story

En tant qu'opératrice, je veux republier mes premiers logiciels Android et Windows sous l'identité CommandGlows afin de concentrer les premières ventes sur une marque unique et le domaine que je contrôle, sans maintenir de compatibilité avec les identités WinGlowz ou WinGlows qui n'ont encore aucun utilisateur.

Trigger: ownership of `commandglows.com` and operator approval of a clean reset. Observable result: active site, Android app, Windows app, source packages, store metadata, and operator documentation use CommandGlows consistently, while immutable external provider IDs are either recreated or explicitly recorded as non-public infrastructure exceptions.

## Minimal Behavior Contract

The current unpublished product identity is reset to `CommandGlows`, canonical domain `https://commandglows.com`, source/package slug `commandglows`, Dart package `commandglows_app`, and new native identity `com.commandglows.app`. No compatibility reader, export/import path, legacy redirect, entitlement normalization, or old-app migration is required solely for nonexistent users. Historical evidence remains truthful and excluded from active-name enforcement.

## Success Behavior

- Android and Windows user-facing names display CommandGlows.
- New Android builds use `com.commandglows.app`; native Kotlin packages and paths agree.
- Windows executable/product metadata use CommandGlows without stale WinGlowz/WinGlows display strings.
- Active Astro content and configuration use `commandglows.com` and CommandGlows.
- Active Dart imports/package metadata, CI paths, repository guidance, product docs, and environment-variable names use the canonical identity.
- Firebase/OAuth/store applications are treated as fresh registrations. Existing empty registrations may be replaced instead of migrated.
- Historical specs, bugs, transcripts, and changelogs may retain old names only as dated evidence or explicit provider identifiers.

## Error Behavior

- If `com.commandglows.app` cannot be registered, native publication stops; implementation does not invent another identifier.
- If an external provider ID is immutable, it remains internal and is documented rather than falsely represented as renamed.
- Conflicting legacy and canonical environment variables fail without logging secret values.
- No global replacement may modify secrets, generated output, third-party dependencies, migrations that encode historical database truth, or unrelated sibling repositories.

## Scope In

- Rename active brand copy, assets, code symbols, app/store metadata, Android namespaces/packages, Windows metadata, Dart package/imports, site canonical origin, active email/contact strings, CI paths, and active governance to CommandGlows.
- Rename repository roots `winglowz_app/` and `winglowz_site/` to `commandglows_app/` and `commandglows_site/` when their consumers are updated atomically.
- Replace authorized future IDs `com.winglows.app` with `com.commandglows.app`.
- Create a narrow historical/provider allowlist and enforce zero unintended active legacy-name matches.

## Scope Out

- No migration UX, legacy app support, review/install continuity, data import, or old entitlement compatibility.
- No automatic purchase, store submission, DNS mutation, GitHub repository rename, OAuth registration, Firebase app creation, or production deployment without the corresponding operator-authorized external action.
- No visual redesign; existing design tokens and components remain authoritative.
- No rewrite of truthful historical evidence.

## Constraints And Invariants

- The worktree must remain free of unrelated edits during structural batches.
- Android builds and Gradle commands remain forbidden locally; use Flutter analysis/tests locally and Blacksmith CI for Android artifacts.
- Existing auth, commerce, webhook, tenant, secret, and data-security behavior must not broaden during the rename.
- Public identity is CommandGlows even if an immutable private provider project ID retains a legacy spelling.
- `commandglows.com` is the only canonical public origin authorized by this contract.
- Existing product functionality and design remain unchanged.

## Implementation Tasks

- [x] Task 0 — Capture the exact active/historical/provider inventory and prove a clean baseline.
- [ ] Task 1 — Add the canonical identity contract and old-name enforcement allowlist.
- [x] Task 2 — Rename Flutter/Dart and shared product-facing source to CommandGlows.
- [x] Task 3 — Reset Android application ID, Kotlin namespace/path, services, intents, channels, and resources to `com.commandglows.app`.
- [x] Task 4 — Rename Windows executable/product metadata and verify desktop source coherence.
- [x] Task 5 — Rename Astro site identity, canonical URLs, metadata, legal/contact copy, auth/CORS/CSP configuration, and environment readers.
- [ ] Task 6 — Rename monorepo roots and update CI, scripts, Vercel roots, Dependabot, docs, and imports atomically.
- [ ] Task 7 — Update active governance, product/GTM/brand contracts, operator instructions, and historical exceptions.
- [ ] Task 8 — Run full local proof and prepare redacted external-console actions for Firebase, OAuth, stores, GitHub, Vercel, DNS, email, commerce, and observability.

Task 3 is atomic: the current `com.winglowz_app.winglowz_app` Gradle namespace/application ID, `com/winglowz_app/**` main/test paths and package declarations, relative manifest services, IME classes/resources, method channels, and tests move together. Task 4 records that no committed MSIX Store Package Identity currently exists; the first Microsoft Store identity remains an external publication action.

## Acceptance Criteria

- [ ] AC 1: Active source and configuration contain no unintended WinGlowz, WinGlows, winglowz, winglows, WINGLOWZ, WINGLOWS, winflowz.com, or winglows.com references outside the allowlist.
- [x] AC 2: Flutter metadata and imports resolve under `commandglows_app` and user-visible app copy reads CommandGlows.
- [x] AC 3: Android manifests, Gradle namespace/application ID, Kotlin packages/paths, services and tests agree on `com.commandglows.app`.
- [x] AC 4: Windows runner metadata and generated build configuration resolve the CommandGlows product name without stale active identity.
- [x] AC 5: Site canonical URLs, sitemap, robots, structured data, social metadata, auth origins, legal links, and contact strings use `commandglows.com` where externally provisioned.
- [x] AC 6: Existing auth, commerce, webhook, privacy, and entitlement tests continue to pass without compatibility code added for nonexistent users.
- [ ] AC 7: `flutter analyze`, `flutter test`, site `pnpm build:check`, site unit tests, metadata lint, link/path scans, and `git diff --check` pass.
- [ ] AC 8: Android artifact proof is delegated to Blacksmith CI; no forbidden local Android/Gradle command runs.
- [ ] AC 9: Every retained legacy spelling has a dated historical or immutable-provider reason.
- [ ] AC 10: External mutations remain an explicit redacted checklist and are not claimed complete without observable proof.

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

## Open Questions

None for local implementation. External provider availability is an execution gate with one authorized outcome: exact CommandGlows identities or a return to the operator for a new decision.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
| --- | --- | --- | --- | --- | --- |
| 2026-08-03 23:09:59 UTC | 100-sg-spec | GPT-5.6 Codex | Replaced the legacy-user migration premise with a clean CommandGlows identity reset after the operator confirmed zero users and waived update continuity. | draft | Run readiness review, then execute bounded rename batches. |
| 2026-08-03 23:11:14 UTC | 101-sg-ready | GPT-5.6 Codex | Reviewed the clean-reset contract against the active app/site inventory, native identifier coupling, provider boundaries, proof plan, and zero-user decision. | ready | Execute the app identity batch first; external provider mutations remain gated. |
| 2026-08-03 23:31:13 UTC | 706-continue | GPT-5.6 Codex | Continued the resolved chantier through the site/domain batch: renamed active Astro content, canonical origins, commerce and entitlement contracts, campaign URLs, public assets and tests while retaining unprovisioned Clerk and CDN provider hosts. | complete | Execute the root/tooling identity batch and formalize the provider exception allowlist. |
| 2026-08-03 23:36:44 UTC | 706-continue | GPT-5.6 Codex | Attached verified `commandglows.com` and `www.commandglows.com` domains to the existing Vercel project and configured a permanent apex-to-www redirect. Live HTTPS proof returned 308 for the apex and 200 for `www`. | complete | Deploy the already validated CommandGlows site before redirecting the former public domain. |

## Current Chantier Flow

| Step | Status | Evidence | Next |
| --- | --- | --- | --- |
| 100-sg-spec | complete | Clean-reset contract created from the operator's domain purchase and zero-user decision. | Review readiness. |
| 101-sg-ready | complete | Active/historical/provider boundaries, atomic Android/Dart coupling, external gates, checks, and stop conditions are explicit. | Start bounded implementation. |
| 102-sg-start | partial | App and site identity batches completed. Astro checks report 0 errors and 90/90 unit tests pass; Flutter analysis and 43 targeted identity tests pass, while the full Flutter suite still has 24 unrelated existing UI/behavior failures. Vercel now serves both CommandGlows domains with verified DNS and apex-to-www canonical redirect, but the attached production deployment still contains the former brand. | Deploy the validated site, verify the live identity, then redirect the former public domain. |
| 103-sg-verify | pending | Acceptance proof not yet run. | Verify after implementation. |
| 104-sg-end | pending | No closure bookkeeping performed. | Close after verification. |
| 005-sg-ship | pending | No commit, push, or deploy performed. | Ship only after explicit verified scope. |
