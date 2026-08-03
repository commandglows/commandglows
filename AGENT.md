---
artifact: documentation
metadata_schema_version: "1.0"
artifact_version: "0.1.0"
project: "WinGlowz"
created: "2026-05-24"
updated: "2026-05-24"
status: "draft"
source_skill: sf-start
scope: "repository_guidance"
owner: "Diane"
confidence: "medium"
risk_level: "medium"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "winglowz_site"
  - "winglowz_app"
  - "shipglows_data"
depends_on:
  - "shipglows_data/technical/architecture.md"
  - "shipglows_data/technical/guidelines.md"
supersedes: []
evidence:
  - "README.md"
  - "winglowz_site/AGENT.md"
  - "winglowz_app/AGENTS.md"
next_step: "/sf-verify shipglows_data/workflow/specs/winglowz-monorepo-migration.md"
---

# AGENT

## Purpose

This repository is the canonical WinGlowz monorepo for the Astro site and Flutter app.

## Repository Layout

- `winglowz_site/`: Astro site with content, account, commerce, Convex, and bridge API surfaces.
- `winglowz_app/`: Flutter Android-first app with Firebase, native Android IME work, and app-level docs.
- `shipglows_data/`: monorepo-level governance, specs, bugs, audits, and workflow artifacts.

## Working Rules

- Treat `shipglows_data/` at the repository root as the only canonical governance corpus.
- Keep subproject changes inside their subproject unless root CI, docs, or governance files must change.
- Preserve public content language rules in the site and app docs; user-facing French should remain natural and accented.
- Do not add secrets to root or subproject docs, workflows, or env examples.
- Do not use the sibling `/home/claude/winglowz_app` checkout as an active source after this monorepo is verified.

## Validation

Use focused checks from the changed subproject:

```bash
(cd winglowz_site && pnpm build:check)
(cd winglowz_site && pnpm test:unit)
(cd winglowz_app && flutter analyze)
(cd winglowz_app && flutter test)
```

Run ShipGlows metadata validation for governance docs when governance files change:

```bash
/home/claude/shipglows/tools/shipglows_metadata_lint.py AGENT.md shipglows_data
```
