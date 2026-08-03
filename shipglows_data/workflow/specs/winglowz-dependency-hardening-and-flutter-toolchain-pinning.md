---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-06-12"
created_at: "2026-06-12 12:53:08 UTC"
updated: "2026-06-12"
updated_at: "2026-06-12 13:05:00 UTC"
status: ready
source_skill: 100-sf-spec
source_model: "GPT-5 Codex"
scope: "dependency-hardening-and-flutter-toolchain-pinning"
owner: "Diane"
confidence: high
user_story: "En tant que mainteneuse de WinGlows App, je veux une politique de dependances Flutter et de pinning d'outillage explicite, afin de garder des builds reproductibles, limiter la dette Supabase legacy, et reduire le risque de derive ou d'upgrade casse en local comme en CI."
risk_level: "medium"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "WinGlows Flutter app"
  - "pubspec.yaml"
  - "pubspec.lock"
  - "Flox environment"
  - "GitHub Dependabot"
  - "GitHub Actions Android checks"
  - "Firebase runtime packages"
  - "Supabase legacy compatibility layer"
  - "Sentry Flutter"
depends_on:
  - artifact: "shipglows_data/business/business.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/business/product.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/architecture.md"
    artifact_version: "1.0.1"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/guidelines.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "CLAUDE.md"
    artifact_version: "1.2.0"
    required_status: "reviewed"
  - artifact: "AGENTS.md"
    artifact_version: "0.1.0"
    required_status: "draft"
supersedes: []
evidence:
  - "402-sf-deps 2026-06-12 found no current OSV advisories for the direct Pub packages locked in winglowz_app/pubspec.lock."
  - "402-sf-deps 2026-06-12 found non-major direct package drift in `cloud_firestore`, `firebase_auth`, `firebase_core`, `firebase_storage`, `flutter_secure_storage`, `permission_handler`, `speech_to_text`, `sentry_flutter`, and `supabase_flutter` via `flutter pub outdated`."
  - "402-sf-deps 2026-06-12 found `go_router` constrained below the latest resolvable major and `record` with a newer major available."
  - "402-sf-deps 2026-06-12 found explicit Flutter pinning in `.flox/env/manifest.toml` but CI still installs `subosito/flutter-action@v2` with `channel: stable` and no exact Flutter version."
  - "402-sf-deps 2026-06-12 found no project license file and no repeatable dependency license inventory step for Flutter pub packages."
  - "402-sf-deps 2026-06-12 confirmed direct runtime usage of Firebase, Sentry, secure storage, Google Sign-In, HTTP bridge, and retained Supabase compatibility code in `lib/`."
next_step: "/102-sf-start shipglows_data/workflow/specs/winglowz-dependency-hardening-and-flutter-toolchain-pinning.md"
---

# Spec: WinGlows Dependency Hardening and Flutter Toolchain Pinning

🟢 [WinGlowsApp] spec: WinGlows Dependency Hardening and Flutter Toolchain Pinning | status: ready | path: shipglows_data/workflow/specs/winglowz-dependency-hardening-and-flutter-toolchain-pinning.md | next: /102-sf-start shipglows_data/workflow/specs/winglowz-dependency-hardening-and-flutter-toolchain-pinning.md | id: wfz-dependency-hardening

## Title

WinGlows Dependency Hardening and Flutter Toolchain Pinning

## Status

Ready. Created on 2026-06-12 from the dependency audit chantier potential after the app scored `B-` for dependency health, then tightened by `101-sf-ready` on 2026-06-12. The spec now fixes the material decisions that previously remained implicit: the app-level Flutter source of truth is an exact version declared in `pubspec.yaml`, CI must read that exact version instead of floating on `stable`, Supabase remains legacy compile-compat debt unless a later retirement spec replaces it, and license work is bounded to an explicit inventory baseline plus project-license decision without blocking the dependency refresh slice.

## User Story

En tant que mainteneuse de WinGlows App, je veux une politique de dependances Flutter et de pinning d'outillage explicite, afin de garder des builds reproductibles, limiter la dette Supabase legacy, et reduire le risque de derive ou d'upgrade casse en local comme en CI.

## Minimal Behavior Contract

When WinGlows App dependencies are refreshed, the project must upgrade only the safe non-major Flutter or Dart packages that support the active app contract, keep the lockfile committed, rerun the allowed Flutter validation path, and document any dependency that stays intentionally stale because it is legacy-only, major-breaking, or blocked by another spec. Contributors and CI must resolve the same intended Flutter toolchain version from an explicit source of truth instead of floating on whichever `stable` release is current. If a dependency cannot be upgraded safely, the app must remain on the previous version with the block reason documented rather than silently drifting or mixing unsupported toolchains. The easy edge case to miss is the retained Supabase compile-compat layer: it must not keep upgrading casually like active runtime code if the product intends to retire it.

## Success Behavior

- The app upgrades the direct non-major dependencies that are compatible with the current codebase and product scope, including the active Firebase, secure storage, permissions, speech, Sentry, and HTTP-related runtime surface where safe.
- `pubspec.lock` remains committed and reflects the upgraded dependency set.
- `flutter analyze` and `flutter test` pass after the dependency refresh, using only project-allowed local checks.
- The project records which direct packages remain intentionally stale and why: blocked major, legacy-only dependency, upstream incompatibility, or deferred migration.
- CI and local contributor guidance resolve to an explicit Flutter toolchain source of truth instead of a floating stable channel without a version.
- Dependabot continues to cover `pub` and GitHub Actions updates, with the repo config aligned to the project trust model.
- A repeatable license inventory path exists for Flutter pub dependencies, and the project license situation is explicit instead of implicit.

## Error Behavior

- If a candidate upgrade causes analyze/test regressions, the implementation must revert or isolate that upgrade and document the blocker rather than shipping a broken lockfile.
- If a dependency requires a major version bump or migration work, the change must stop at documentation and routing; it must not be auto-upgraded under this spec.
- If CI pinning cannot be aligned safely with local tooling in the same slice, the spec may land an explicit partial state, but it must document the remaining mismatch and the required next command.
- The app must never weaken integrity, suppress audits, commit secrets, or bypass lockfile discipline just to make dependency tooling quieter.
- If the Supabase legacy layer is kept for compile compatibility, it must not silently expand back into active runtime ownership without an explicit spec decision.

## Problem

WinGlows App is in a middling dependency-health state. The direct Flutter pub packages currently show no known OSV advisories at the audited locked versions, but the active runtime graph is stale across Firebase and several supporting packages, the CI Flutter setup floats on `stable` while Flox pins a concrete version, the repo still carries Supabase legacy code after the Firebase-first migration, and the project lacks clear license inventory discipline for pub packages. None of these issues alone blocks the app today, but together they create drift, fragile upgrades, unclear ownership of legacy dependencies, and preventable supply-chain uncertainty.

## Solution

Implement a bounded dependency-hardening pass for `winglowz_app`: refresh safe non-major direct packages, keep major upgrades out of scope, classify the Supabase layer explicitly as legacy compile-compat or active dependency debt, make Flutter toolchain pinning explicit across local and CI paths, and add a lightweight license/process baseline. The work should stay pragmatic and reviewable: no broad refactor, no Android build work locally, and no dependency churn unrelated to the active app/runtime contract.

## Scope In

- `winglowz_app/pubspec.yaml` direct dependency ranges.
- `winglowz_app/pubspec.lock` refresh after approved non-major upgrades.
- Validation of active direct runtime packages used in the current app:
  - Firebase packages
  - `flutter_secure_storage`
  - `permission_handler`
  - `speech_to_text`
  - `sentry_flutter`
  - `http`
  - `google_sign_in`
  - selected active support packages if they move as part of the resolver
- Explicit classification of legacy Supabase dependencies and whether they stay in the manifest unchanged under compile-compat rules.
- Toolchain source-of-truth alignment across `.flox`, local contributor guidance, and `.github/workflows/android-build.yml`.
- License declaration or documented license policy for the app repo surface, plus a repeatable dependency license inventory step.
- Docs updates where dependency/toolchain expectations materially change.

## Scope Out

- Major dependency migrations such as `go_router 17.x`, `record 7.x`, or any dependency that requires code migration or broad behavioral rework.
- Android builds, Gradle tasks, local APK creation, emulator installs, or physical-device validation.
- Firebase architecture redesign, auth-flow redesign, or broader backend migration work already owned elsewhere.
- Removal of the Supabase legacy layer if that removal requires product or migration decisions beyond bounded dependency hygiene.
- Cross-project `winglowz_site` dependency work.
- Full legal review of every transitive license beyond establishing the project process and a repeatable inventory path.

## Constraints

- Allowed local checks remain `flutter analyze`, `flutter test`, and targeted `flutter test ...`; no Android builds or Gradle commands.
- Never auto-upgrade major dependency versions under this spec.
- Keep the lockfile committed and reproducible for this application package.
- Preserve the current Firebase-first active runtime behavior and do not reintroduce Supabase as an active bootstrap path.
- Treat the monorepo root `shipglows_data/` as the only canonical governance corpus.
- Do not weaken CI/package trust controls, registry integrity, or dependency review discipline for convenience.

## Test Contract

- surface: Flutter application dependency and toolchain maintenance affecting shared runtime code, local contributor setup, and hosted Android-check CI.
- proof_profile: automation-first, with manual smoke only if a refreshed package changes runtime behavior not already covered by tests.
- proof_order:
  1. pre-change dependency evidence: `flutter pub outdated`, direct-dependency classification, current CI/toolchain state
  2. bounded manifest and lockfile change review
  3. local automated validation: `flutter analyze`, targeted `flutter test ...`, full `flutter test` when the upgraded package set is broad
  4. CI workflow/config review for exact Flutter-version resolution
  5. optional Flutter web smoke only if an upgraded runtime package changes behavior outside existing automated proof
- checklist_path: none required by default; create a dedicated checklist only if implementation reveals a real runtime smoke path that automated proof cannot cover safely.
- required_scenario_ids:
  - TC-DEP-001 non-major direct upgrades only
  - TC-DEP-002 lockfile regenerated and reviewed
  - TC-DEP-003 local validation passes on allowed commands
  - TC-DEP-004 CI Flutter version source of truth is explicit
  - TC-DEP-005 Supabase legacy policy remains explicit and bounded
  - TC-DEP-006 license/process baseline is documented or the remaining gap is stated explicitly
- required_results:
  - updated `pubspec.yaml` contains only approved non-major direct-package moves
  - `pubspec.lock` is committed and consistent with the manifest
  - `flutter analyze` passes
  - targeted tests pass for any touched runtime surface
  - full `flutter test` passes when the upgrade scope is broad enough to justify it
  - CI workflow no longer relies on floating `channel: stable` alone to choose the Flutter SDK version
  - contributor-facing documentation tells non-Flox maintainers how to match the expected Flutter toolchain
- exception_with_proof:
  - Flutter web smoke may be skipped when no upgraded dependency changes user-visible runtime behavior beyond what automated tests already prove; the implementation report must name the reason.
  - A root `LICENSE` file may remain absent in this slice if the repo owner wants a later legal/policy pass; the implementation must still leave a documented project-license position and a repeatable dependency-license inventory path or explicit documented gap.
- exception_without_proof: none

## Dependencies

- `shipglows_data/technical/architecture.md@1.0.1`: architecture baseline for active app/runtime boundaries and retained integrations.
- `shipglows_data/technical/guidelines.md@1.0.0`: project engineering/documentation rules and canonical governance expectations.
- `CLAUDE.md@1.2.0` and `AGENTS.md@0.1.0`: local command guardrails, Android build prohibition, and commit discipline.
- Dart official docs, checked 2026-06-12:
  - `dart pub outdated` docs confirm the intended flow: inspect outdated packages, update compatible versions, then retest.
  - `dart pub upgrade` docs confirm that application packages should commit `pubspec.lock` and that upgrades regenerate the lockfile from the latest allowed versions.
- GitHub official docs, checked 2026-06-12:
  - Dependabot options and supported ecosystems docs confirm `pub` and GitHub Actions are supported and that GitHub Action updates require repository syntax.
- `subosito/flutter-action` official repository README, checked 2026-06-12:
  - CI can pin a specific Flutter version directly or derive it from a file, instead of floating on `channel: stable` alone.
- Fresh external docs verdict: `fresh-docs checked`.
- Toolchain authority decision for this spec:
  - the app-level source of truth is an exact Flutter version declared in `pubspec.yaml`
  - CI must consume that exact version through `flutter-version-file` or an equivalent exact-version mechanism
  - Flox should align to the same exact app-level Flutter version in the same implementation slice when safely possible, or the implementation report must document the residual mismatch explicitly

## Invariants

- `pubspec.lock` stays committed for the app.
- Firebase remains the active app adapter; Supabase remains legacy-only unless another spec changes that ownership.
- Supabase packages are treated as retained compile-compat debt in this chantier: they may stay unchanged, be minimally isolated, or be documented as deferred, but they must not be refreshed opportunistically as if they were primary runtime dependencies without an explicit reason.
- No direct or transitive upgrade under this spec may require a local Android build to validate.
- Sentry bootstrapping, auth gating, and suite-identity bridge behavior remain fail-closed.
- Dependabot coverage for `pub` and GitHub Actions must not be removed.

## Links & Consequences

- Dependency refresh affects runtime behavior in auth, storage, Firestore-backed stores, speech/recording helpers, and diagnostics; analyze/tests must prove those surfaces did not regress.
- Toolchain pinning changes affect both local contributors and hosted CI; the source of truth must be understandable from repo files, not only from one developer workstation.
- Supabase dependency decisions link back to the Firebase migration and any future retirement of legacy adapters.
- License/process changes may require README or contributor-doc updates even if no runtime code changes.
- CI changes to Flutter version resolution can alter hosted build behavior; the chosen path must stay compatible with the Android checks workflow and Blacksmith runner constraints.

## Documentation Coherence

- Update `CLAUDE.md` only if the documented local Flutter baseline or validation command expectations materially change.
- Update `README.md` if contributor setup or dependency-maintenance expectations become more explicit.
- Update dependency/toolchain notes in app docs if a concrete Flutter version source of truth is introduced outside Flox.
- Record fresh-doc evidence and any intentional leftover stale packages in the implementation report so later audits do not rediscover the same ambiguity.

## Edge Cases

- A non-major Firebase upgrade can still change transitive behavior across web/platform interface packages; tests must cover real app surfaces, not only manifest syntax.
- `flutter pub upgrade <package>` can selectively unlock other packages; the implementation must review the lockfile diff rather than assuming only one package changed.
- A CI Flutter pin may conflict with the Flox version if both are edited independently; the repo needs one clear ownership rule.
- Legacy Supabase packages may appear "safe to upgrade" mechanically while adding no product value and increasing churn on code intended for retirement.
- A license inventory step can fail if it depends on tools not present in the default environment; the process must be repeatable within the repo’s real contributor or CI setup.
- `pubspec.yaml` currently lacks an exact Flutter-version declaration, so adding one may require small doc or workflow alignment beyond a pure dependency bump.

## Implementation Tasks

- [ ] Task 1: Freeze the dependency decision surface
  - File: `pubspec.yaml`
  - Action: Classify each direct dependency as active runtime, active support, or legacy compile-compat so the upgrade scope is explicit before any version change.
  - User story link: prevent accidental churn and clarify which packages deserve maintenance effort.
  - Depends on: none.
  - Validate with: documented package classification in the implementation report and manifest comments only if the project already uses them.
  - Notes: Keep comments minimal; do not add noisy manifest prose if a doc/update note is cleaner.

- [ ] Task 1b: Declare the app-level Flutter version source of truth
  - File: `pubspec.yaml`
  - Action: Add an exact Flutter-version declaration compatible with the chosen CI resolution path so the app, CI, and contributor docs can point to one explicit Flutter SDK version.
  - User story link: reproducible local and CI toolchains without floating SDK drift.
  - Depends on: Task 1.
  - Validate with: manifest diff review and consistency with the CI workflow change.
  - Notes: The spec chooses an app-level exact Flutter version as the authority rather than leaving Flox or GitHub Actions to decide independently.

- [ ] Task 2: Refresh safe non-major direct packages
  - File: `pubspec.yaml`
  - Action: Upgrade direct package constraints only where `flutter pub outdated` shows compatible non-major movement and the package still belongs to the active runtime/support surface.
  - User story link: reduce drift without taking on migration risk.
  - Depends on: Task 1.
  - Validate with: `flutter pub outdated` and diff review.
  - Notes: Explicitly exclude majors such as `go_router 17.x` and `record 7.x`.

- [ ] Task 3: Regenerate and review the lockfile
  - File: `pubspec.lock`
  - Action: Run the bounded pub upgrade path, regenerate the lockfile, and inspect the full dependency delta for unexpected transitive movement.
  - User story link: keep builds reproducible and reviewable.
  - Depends on: Task 2.
  - Validate with: committed lockfile diff and post-upgrade `flutter pub outdated`.
  - Notes: If a targeted upgrade unexpectedly unlocks risky transitive changes, back it out or split it.

- [ ] Task 4: Validate the upgraded graph on allowed local checks
  - File: `test/` and active runtime code touched by regressions if any appear
  - Action: Run `flutter analyze`, targeted tests for any surface exposed by package upgrades, and full `flutter test` if the package set moved broadly enough.
  - User story link: prove the refreshed graph still honors the app contract.
  - Depends on: Task 3.
  - Validate with: command results and any targeted regression tests added or updated.
  - Notes: Do not hand off to Android QA as the first line of dependency validation.

- [ ] Task 5: Decide and document the Supabase legacy policy
  - File: `pubspec.yaml`
  - Action: Keep Supabase packages explicitly in legacy compile-compat posture, or isolate them further if that can be done without changing active runtime ownership or broad migration scope.
  - User story link: reduce ambiguity around legacy dependency maintenance.
  - Depends on: Task 1.
  - Validate with: documented decision in code comments or implementation report plus unchanged or intentionally updated manifest ranges.
  - Notes: This spec does not authorize opportunistic Supabase refresh as if it were primary runtime code. If removal or deeper refactor is required, reroute to a dedicated migration spec rather than stretching this one.

- [ ] Task 6: Make Flutter toolchain pinning explicit across local and CI paths
  - File: `.github/workflows/android-build.yml`
  - Action: Replace floating Flutter setup with the exact app-level Flutter source of truth, using `flutter-version-file` or an equivalent exact-version workflow that reads the app declaration instead of plain `channel: stable`.
  - User story link: reduce local-versus-CI drift and make failures reproducible.
  - Depends on: Task 1b.
  - Validate with: workflow diff review and consistency against `.flox/env/manifest.toml` and any chosen version file.
  - Notes: Do not maintain multiple conflicting version declarations.

- [ ] Task 7: Align contributor-facing toolchain docs
  - File: `README.md`
  - Action: Document the intended Flutter or Dart version source of truth and how contributors should match it when not using Flox.
  - User story link: make the maintenance path reproducible for future agents and humans.
  - Depends on: Task 6.
  - Validate with: docs review for coherence with CI and local guardrails.
  - Notes: Update `CLAUDE.md` only if its operational guardrails materially change.

- [ ] Task 7b: Align Flox with the chosen app-level Flutter version or record the residual mismatch
  - File: `.flox/env/manifest.toml`
  - Action: Update Flox to the same exact Flutter version chosen in the app-level source of truth when safely possible, or leave it unchanged with an explicit documented mismatch and rationale.
  - User story link: prevent contributor confusion between local reproducible environments and CI.
  - Depends on: Tasks 1b and 6.
  - Validate with: manifest diff review or explicit implementation note explaining why alignment is deferred.
  - Notes: This task is bounded to version alignment only, not Flox environment redesign.

- [ ] Task 8: Establish a license inventory baseline
  - File: `README.md`
  - Action: Add a minimal documented process for project license declaration and repeatable pub dependency license inventory, choosing a tool or workflow that fits the repo’s actual environment.
  - User story link: remove compliance ambiguity without adding unmaintained process weight.
  - Depends on: Task 1.
  - Validate with: documented command or procedure that a future audit can rerun.
  - Notes: If no reliable in-repo tool is acceptable, record the explicit gap and recommended follow-up instead of pretending compliance is solved.

## Acceptance Criteria

- [ ] CA 1: Given the app manifest before refresh, when the bounded dependency pass is complete, then only approved non-major direct packages move and all blocked majors remain documented, not upgraded.
- [ ] CA 2: Given the refreshed manifest and lockfile, when local validation runs, then `flutter analyze` and the required test scope pass without needing Android builds or Gradle commands.
- [ ] CA 3: Given the retained Supabase compatibility layer, when the dependency review is complete, then its maintenance policy is explicit: unchanged legacy compile-compat, isolated follow-up, or rerouted migration.
- [ ] CA 4: Given the CI workflow after the toolchain pass, when a reviewer inspects the repo, then the intended Flutter version source of truth is explicit and not merely `channel: stable`.
- [ ] CA 5: Given contributor docs after the change, when a fresh maintainer reads them, then they can tell how to match the app’s expected Flutter toolchain outside Flox.
- [ ] CA 6: Given the project’s compliance baseline after the change, when a future dependency audit runs, then it can find an explicit project license position and a repeatable dependency license inventory procedure or an explicit documented gap.

## Test Strategy

- Start with `flutter pub outdated` and package classification notes.
- Apply bounded non-major upgrades only.
- Regenerate the lockfile and inspect the full diff.
- Run `flutter analyze`.
- Run targeted `flutter test ...` for any surface touched by dependency-related regressions.
- Run full `flutter test` if Firebase/auth/storage/speech/runtime packages moved broadly.
- Review CI workflow and docs changes without running forbidden Android build paths locally.

## Risks

- Non-major Firebase upgrades can still change subtle runtime behavior across auth, Firestore, or web/platform interfaces.
- A strict CI pin can drift from Flox if ownership is not centralized.
- Over-updating legacy Supabase packages can waste effort or destabilize compile-compat code that is meant for retirement.
- License-process work can become fake ceremony if it introduces a tool nobody can run reliably in this environment.

## Execution Notes

- First files to read before coding:
  - `pubspec.yaml`
  - `pubspec.lock`
  - `.flox/env/manifest.toml`
  - `.github/workflows/android-build.yml`
  - `lib/core/bootstrap/firebase_bootstrap.dart`
  - `lib/core/bootstrap/supabase_bootstrap.dart`
- Implementation order:
  1. classify direct dependencies and exclude majors/legacy-only churn
  2. refresh safe non-major active packages
  3. regenerate lockfile and validate locally
  4. align CI Flutter pinning with the chosen source of truth
  5. update docs/license process only if the technical path is settled
- Fresh external docs checked on 2026-06-12:
  - Dart `pub outdated` and `pub upgrade`
  - GitHub Dependabot options and supported ecosystems
  - `subosito/flutter-action` README for exact-version pinning behavior
- Stop conditions:
  - if a desired package move requires a major upgrade or migration work, stop and route to `/404-sf-migrate` or a new focused spec
  - if CI pinning cannot be made coherent without conflicting repo policies, stop and ask for the preferred source of truth
  - if license inventory requires a toolchain that cannot run reliably in repo or CI, document the gap instead of faking completion

## Open Questions

None. The readiness gate resolves the previously material ambiguities as follows: use an exact app-level Flutter version as the source of truth, keep Supabase in explicit legacy compile-compat posture unless another spec changes that, and treat the license baseline in this chantier as documented inventory plus explicit project-license position, with a formal root `LICENSE` file optional unless the implementation slice or Diane explicitly requires it.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-06-12 12:53:08 UTC | 100-sf-spec | GPT-5 Codex | Created the dependency hardening and Flutter toolchain pinning chantier from the 402-sf-deps audit intake. | Spec drafted | /101-sf-ready shipglows_data/workflow/specs/winglowz-dependency-hardening-and-flutter-toolchain-pinning.md |
| 2026-06-12 13:05:00 UTC | 101-sf-ready | GPT-5 Codex | Tightened the spec, resolved the material toolchain and legacy-policy ambiguities, formalized the test contract, and validated readiness for implementation. | ready | /102-sf-start shipglows_data/workflow/specs/winglowz-dependency-hardening-and-flutter-toolchain-pinning.md |

## Current Chantier Flow

| Step | Status | Notes |
|------|--------|-------|
| 100-sf-spec | complete | Dependency-hardening chantier created from the 2026-06-12 audit findings. |
| 101-sf-ready | ready | Scope, proof gates, toolchain authority, Supabase legacy posture, and license baseline are explicit enough for a fresh implementer. |
| 102-sf-start | pending | Implement bounded dependency refresh, lockfile review, toolchain pinning, and license/process baseline. |
| 103-sf-verify | pending | Re-run dependency proof and verify no regression or drift remains. |
| 104-sf-end | pending | Close the chantier with updated docs and tracker references after verification. |
| 005-sf-ship | pending | Ship only after dependency proof and any accepted documentation changes are complete. |

Next command: `/102-sf-start shipglows_data/workflow/specs/winglowz-dependency-hardening-and-flutter-toolchain-pinning.md`
