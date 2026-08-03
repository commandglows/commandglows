---
artifact: documentation
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-10"
updated: "2026-05-10"
status: reviewed
source_skill: sf-docs
scope: technical-function-tree
owner: "Diane"
confidence: high
risk_level: medium
security_impact: yes
docs_impact: yes
linked_systems:
  - "Flutter"
  - "Android"
depends_on:
  - "shipglows_data/technical/context.md@0.1.0"
  - "shipglows_data/technical/code-docs-map.md@0.1.0"
supersedes: []
evidence: []
next_review: "2026-06-10"
next_step: "/sf-docs technical audit"
---

# Function Tree Snapshot — WinGlows

## Entry Points

- `main.dart` initializes app bootstrap, provider scope, and router.
- Feature entry screens are under:
  - `lib/features/auth`
  - `lib/features/voice`
  - `lib/features/clipboard`
  - `lib/features/snippets`
  - `lib/features/custom_action_buttons`
  - `lib/features/dictionary`
  - `lib/features/keyboard`
  - `lib/features/settings`
  - `lib/features/shell`

## Shared Infrastructure

- `lib/core` contains bootstrap, platform, router, sync, and theme entry points.
- `modules/floating-overlay` contains Android-native entry and method channel bridge.
- `android` contains platform runtime and signing/build integration.

## Data Surfaces

- `lib/data/supabase` and Firebase-era data adapters are migration-critical references.
- `test` and `supabase` folders keep integration and migration validation artifacts.

## Validation

- Update this function tree when a new feature or shared module is added.
- Keep it aligned with `shipglows_data/technical/code-docs-map.md`.
