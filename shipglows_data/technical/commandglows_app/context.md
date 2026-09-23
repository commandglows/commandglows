---
artifact: technical_module_context
metadata_schema_version: "1.0"
artifact_version: "1.0.1"
project: "CommandGlows"
created: "2026-05-10"
updated: "2026-09-17"
status: reviewed
source_skill: sf-docs
scope: technical-context
owner: "Diane"
confidence: high
risk_level: medium
security_impact: yes
docs_impact: yes
linked_systems:
  - "Flutter"
  - "Android"
  - "Firebase"
  - "Supabase"
depends_on:
  - "shipglows_data/technical/README.md@0.1.0"
  - "shipglows_data/technical/code-docs-map.md@0.1.0"
supersedes: []
evidence:
  - "docs/technical/README.md"
  - "docs/technical/code-docs-map.md"
  - "shipglows_data/technical/architecture.md"
  - "commandglows_app/.firebaserc"
  - "commandglows_app/.shipglows.flutter.json"
next_review: "2026-10-17"
next_step: "Re-check authenticated Firebase and Windows interaction proof before a production claim."
---

# Technical Context — CommandGlows

## Purpose

This context file is the technical governance anchor for `shipglows_data`-based workflows and points to the current technical map in `shipglows_data/technical/code-docs-map.md`.

## Owned Surfaces

- `shipglows_data/technical/README.md` (governance index)
- `shipglows_data/technical/code-docs-map.md` (primary route map)
- `lib/**` and `android/**` (code ownership source)
- `docs/technical/*.md` (legacy technical runbooks and module notes)
- `shipglows_data/workflow/specs/*.md` (ready specs with migration and parity contracts)

## Invariants

- Flutter remains the target execution layer for this repo state.
- Android native overlays and IME behavior remain explicitly documented and are treated as platform-critical code paths.
- Firebase is the active remote adapter in the migration-ready state; Supabase/legacy paths are tracked as migration references.
- The active Firebase aliases are `dev` → `commandglows-dev` and `prod` → `commandglows`; both currently expose Email/password and a default Firestore database in `nam5`.
- Managed local Windows launch reads public Firebase client configuration from Doppler `commandglows/dev`. The `prd` configuration is synchronized and resolver-validated, but does not constitute a production release.
- Google sign-in, Cloud Storage, server/admin credentials, authenticated-user Firestore proof, and production CI wiring are not configured by this foundation.

## Validation

- `shipglows_data/technical/code-docs-map.md` must be refreshed when major module boundaries change.
- `docs/technical/*.md` should remain discoverable from the map and preserve their frontmatter requirements.
- For changed code paths, generate a documentation update plan before closing implementation.

## Maintenance Rule

Re-run `/sf-docs technical audit` after architecture or platform boundary changes.
