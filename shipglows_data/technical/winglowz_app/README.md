---
artifact: technical_module_context
metadata_schema_version: "1.0"
artifact_version: "0.1.0"
project: "WinGlows"
created: "2026-05-04"
updated: "2026-05-09"
status: draft
source_skill: sf-docs
scope: "technical-governance-index"
owner: "Diane"
confidence: medium
risk_level: medium
security_impact: yes
docs_impact: yes
linked_systems:
  - "Flutter"
  - "Android native"
  - "Backend-agnostic stores"
  - "Firebase first adapter"
depends_on:
  - "CLAUDE.md@1.2.0"
  - "shipglows_data/technical/guidelines.md@0.1.0"
supersedes: []
evidence:
  - "Bootstrapped for shipglows_data/workflow/specs/android-ime-winglowz_app-keyboard.md execution."
next_review: "2026-06-04"
next_step: "/sf-docs technical audit"
---

# Technical Docs — WinGlows

This internal layer maps code areas to the technical context an agent must read
before editing. It is not public product documentation.

## Current Coverage

- `docs/technical/flutter-app.md`: Flutter app shell, platform bridges, settings,
  and repository boundaries.
- `docs/technical/android-native.md`: Android native overlay and keyboard/IME
  services.
- `docs/technical/supabase-data.md`: legacy Supabase schema, RLS, repositories,
  and smoke tests from the previous target path.
- `docs/technical/firebase-cli-foundation.md`: Firebase CLI foundation, deployment
  and emulator commands, and GitHub/Blacksmith secret list.
- `docs/technical/firebase-oidc-ci-playbook.md`: step-by-step CI runbook for
  GitHub OIDC/WIF Firestore deploy, including troubleshooting from real failures.

## Maintenance Rule

Update `docs/technical/code-docs-map.md` and the relevant subsystem doc when
owned files, entrypoints, validation commands, security constraints, or docs
update triggers change.
