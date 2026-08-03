---
artifact: technical_guidelines
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: winglowz
created: "2026-05-17"
updated: "2026-05-17"
status: reviewed
source_skill: sf-docs
scope: technical-governance-index
owner: "Diane"
confidence: high
risk_level: medium
security_impact: yes
docs_impact: yes
linked_systems:
  - shipglows_data/technical/code-docs-map.md
  - shipglows_data/technical/architecture.md
  - shipglows_data/technical/context.md
  - shipglows_data/technical/context-function-tree.md
  - shipglows_data/technical/guidelines.md
depends_on: []
supersedes: []
evidence:
  - package.json
  - src/
  - convex/
next_review: "2026-06-17"
next_step: "/sf-docs technical audit"
---
# Technical Governance

## Purpose

This directory is the canonical internal technical governance layer for WinGlows. It maps code areas to subsystem docs, records stable invariants, and defines the documentation update surface for future code changes.

## Owned Files

- `shipglows_data/technical/code-docs-map.md`
- `shipglows_data/technical/architecture.md`
- `shipglows_data/technical/context.md`
- `shipglows_data/technical/context-function-tree.md`
- `shipglows_data/technical/guidelines.md`

## Entrypoints

- `AGENT.md` for short repo onboarding
- `shipglows_data/technical/code-docs-map.md` for targeted doc loading
- `shipglows_data/technical/architecture.md` for system boundaries
- `shipglows_data/technical/guidelines.md` for engineering and docs rules

## Invariants

- Canonical technical governance lives under `shipglows_data/technical/`.
- Legacy root governance files have been retired in favor of canonical artifacts under `shipglows_data/`.
- English routes stay unprefixed and French routes stay under `/fr`.
- Content collection schemas in `src/content/config.ts` remain the source of truth for content frontmatter.

## Validation

```bash
python3 /home/claude/shipglows/tools/shipglows_metadata_lint.py shipglows_data/technical/README.md shipglows_data/technical/code-docs-map.md shipglows_data/technical/architecture.md shipglows_data/technical/context.md shipglows_data/technical/context-function-tree.md shipglows_data/technical/guidelines.md
rg -n "Purpose|Owned Files|Entrypoints|Invariants|Validation|Reader Checklist|Maintenance Rule" shipglows_data/technical/*.md
```

## Reader Checklist

- Start at `code-docs-map.md` before changing code.
- Load only the subsystem docs that match the touched paths.
- Update the impacted governance docs when route, schema, auth, billing, or editorial contracts move.

## Maintenance Rule

Update this index whenever a new canonical technical artifact is added, renamed, or retired.
