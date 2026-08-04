---
artifact: editorial_governance
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: commandglows
created: "2026-05-17"
updated: "2026-05-17"
status: reviewed
source_skill: sf-docs
scope: editorial-update-gate
owner: "Diane"
confidence: medium
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - shipglows_data/editorial/public-surface-map.md
  - shipglows_data/editorial/page-intent-map.md
  - shipglows_data/editorial/claim-register.md
depends_on:
  - shipglows_data/editorial/public-surface-map.md
  - shipglows_data/editorial/page-intent-map.md
  - shipglows_data/editorial/claim-register.md
supersedes: []
evidence:
  - src/pages/[...lang]/
  - src/content/
next_review: "2026-06-17"
next_step: "/sf-docs update"
---
# Editorial Update Gate

## Purpose

Standardize how public-content changes are reviewed when routes, claims, curriculum, or conversion surfaces move.

## Editorial Update Plan

| surface | change type | impacted docs | action | priority | reason | owner role | parallel-safe | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `path or route` | `claim`, `structure`, `cta`, `localization`, `schema`, or `access` | canonical docs | `none`, `review`, `update`, or `create` | `P0`-`P3` | concrete cause | `executor` or `integrator` | `yes` or `no` | optional caveat |

## Gate Rules

- If a change touches public promises, check `claim-register.md`.
- If a change touches route families or CTA intent, check `page-intent-map.md`.
- If a change touches content collections or frontmatter shape, check `astro-content-schema-policy.md`.
- If the copy is not finalized, mark the item `pending final copy`.

## Priority Guide

- `P0`: dangerous drift on pricing, checkout, policy, auth, or access
- `P1`: commercial or localization inconsistency on flagship surfaces
- `P2`: stale supporting copy
- `P3`: missing coverage or governance polish

## Maintenance Rule

Update this gate when the editorial planning format or public-review thresholds change.
