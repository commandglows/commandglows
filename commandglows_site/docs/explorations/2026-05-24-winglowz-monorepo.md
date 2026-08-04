---
artifact: exploration_report
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-24"
updated: "2026-05-24"
status: draft
source_skill: sf-explore
scope: "Evaluate whether winglowz and winglowz_app should become one monorepo"
owner: "unknown"
confidence: medium
risk_level: medium
security_impact: no
docs_impact: yes
linked_systems:
  - "/home/claude/winglowz"
  - "/home/claude/winglowz_app"
  - "/home/claude/replayglowz"
  - "/home/claude/contentglowz"
evidence:
  - "winglowz and winglowz_app are separate Git repositories with separate remotes."
  - "winglowz is an Astro/Vercel site with pnpm; winglowz_app is a Flutter/Firebase/Vercel app."
  - "ReplayGlowz and ContentGlowz use one canonical root with app/site/lab subdirectories."
  - "Both WinGlows repositories currently contain separate shipglows_data governance trees."
depends_on: []
supersedes: []
next_step: "/sf-spec WinGlows monorepo migration"
---

# Exploration Report: WinGlows Monorepo

## Starting Question

Should `winglowz` and `winglowz_app` be reorganized into one monorepo, like the existing ReplayGlowz and ContentGlowz repository layouts?

## Context Read

- `/home/claude/winglowz/package.json` - confirmed the site is an Astro/pnpm project.
- `/home/claude/winglowz_app/pubspec.yaml` - confirmed the app is Flutter Android-first with Firebase and Supabase dependencies.
- `/home/claude/replayglowz/README.md` - used as the closest monorepo precedent for app/site/lab layout and deployment model.
- `/home/claude/contentglowz/README.md` - used as the second monorepo precedent for canonical single-repository ownership.
- `/home/claude/shipglows/skills/references/canonical-paths.md` - confirmed the governance rule that monorepos should keep one root `shipglows_data`.

## Internet Research

- Not used.

## Problem Framing

WinGlows is currently split across two sibling repositories:

- `/home/claude/winglowz` - public/content/site surface.
- `/home/claude/winglowz_app` - Flutter application surface.

That split keeps each deployment simple, but it fragments product context, governance documents, issue/spec history, and cross-surface work. The existing ReplayGlowz and ContentGlowz examples suggest that this workspace already has an operational preference for one canonical product root per brand.

## Option Space

### Option A: Keep Separate Repositories

- Summary: Keep `winglowz` and `winglowz_app` as independent GitHub repositories.
- Pros: Lowest migration cost, no deployment root changes, preserves current Git history and branch habits.
- Cons: Duplicated `shipglows_data`, harder cross-surface specs, more drift between site and app, less consistent with ReplayGlowz/ContentGlowz.

### Option B: Move To One Monorepo

- Summary: Make `/home/claude/winglowz` the canonical root and move the current site/app into subdirectories such as `winglowz_site` and `winglowz_app`.
- Pros: One product source of truth, one governance corpus, easier cross-surface release planning, consistent with current workspace patterns.
- Cons: Requires migration care for Git history, CI, Vercel root directories, Firebase files, app build paths, docs links, and local scripts.

### Option C: Soft Monorepo First

- Summary: Keep physical repositories for now but create a root planning layer and reduce governance duplication before moving code.
- Pros: Lower risk if active app work is in progress, gives time to reconcile docs and deployment assumptions.
- Cons: Transitional state can become permanent and still leaves source control split.

## Comparison

The strongest argument for monorepo is not dependency sharing. The site and app use different stacks, so a package workspace is not the main win. The real win is product governance and operational coherence: one root `shipglows_data`, one set of specs, one README deployment map, and one place to coordinate app/site changes.

The strongest argument against doing it immediately is active worktree risk. Both repositories currently have uncommitted changes, and `winglowz_app` has many modified files across native Android, Flutter, docs, tests, and specs. A migration should not be mixed with feature or bug-fix changes.

## Emerging Recommendation

Yes, WinGlows should probably become a monorepo, but not as an opportunistic file move while both repositories are dirty. The better path is a small migration project:

1. Finish or checkpoint the current app/site changes.
2. Choose the canonical repository and target layout.
3. Preserve or explicitly abandon the secondary repository history.
4. Move deployment configs to root-directory based deployment, matching ReplayGlowz/ContentGlowz.
5. Consolidate `shipglows_data` at the monorepo root.

The likely target layout:

```text
winglowz/
  README.md
  AGENT.md
  CLAUDE.md
  shipglows_data/
  winglowz_site/
  winglowz_app/
```

## Non-Decisions

- Whether to preserve full Git history for `winglowz_app` with `git subtree` or do a simple source move.
- Whether the current root `winglowz` site should be renamed to `winglowz_site` in one step or staged later.
- Whether additional future surfaces such as backend/lab should be added now.

## Rejected Paths

- Creating nested `shipglows_data` directories inside app/site after migration - rejected because the canonical monorepo rule expects one governance corpus at the root.
- Introducing a JS workspace as the primary migration goal - rejected because the Flutter app and Astro site do not need a shared JS package graph today.

## Risks And Unknowns

- Existing Vercel projects may need root directory updates.
- GitHub Actions and Dependabot paths from `winglowz_app` need to be rewritten after nesting.
- Docs and specs may contain absolute or repository-relative paths that will break after the move.
- The app repository is on `master` and the site repository is on `main`; branch policy should be normalized deliberately.
- Current uncommitted work must be protected before migration.

## Redaction Review

- Reviewed: yes
- Sensitive inputs seen: none
- Redactions applied: none
- Notes: No secrets, logs, or customer data were included.

## Decision Inputs For Spec

- User story seed: As the maintainer, I want WinGlows app and site surfaces in one canonical repository so product, technical, and release work happens from one source of truth.
- Scope in seed: repository layout, docs/governance consolidation, deployment path updates, CI/dependabot updates, README rules.
- Scope out seed: feature work, dependency upgrades, app refactors, site redesign.
- Invariants/constraints seed: preserve active work, keep app and site deployable independently, keep one root `shipglows_data`.
- Validation seed: app tests/analyze still run from nested app path, site build/check still run from nested site path, deployment config root directories are documented.

## Handoff

- Recommended next command: `/sf-spec WinGlows monorepo migration`
- Why this next step: The migration has enough cross-cutting risk to deserve an explicit spec before file moves.

## Exploration Run History

| Date UTC | Prompt/Focus | Action | Result | Next step |
|----------|--------------|--------|--------|-----------|
| 2026-05-24 19:32:58 UTC | Consider merging `winglowz` and `winglowz_app` into a monorepo | Compared current WinGlows layout with ReplayGlowz and ContentGlowz precedents | Monorepo looks directionally right, but should be staged after protecting current uncommitted work | `/sf-spec WinGlows monorepo migration` |
