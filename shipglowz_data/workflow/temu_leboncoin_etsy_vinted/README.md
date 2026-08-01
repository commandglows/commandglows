---
artifact: workflow_index
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-06-21"
updated: "2026-06-21"
status: active
source_skill: 001-sf-build
owner: "Diane"
confidence: high
scope: "workflow-index"
depends_on: []
risk_level: low
security_impact: none
docs_impact: yes
linked_systems:
  - "winglowz_site"
  - "shipglowz_data/workflow/specs/temu-vinted-listing-assistant.md"
  - "shipglowz_data/workflow/research/2026-06-19-marketplaces-api-cli-automation.md"
supersedes: []
evidence:
  - "User request 2026-06-21: regrouper cette conversation et ses fichiers dans un sous-dossier accessible avec symlinks."
next_step: "Optional commit after final review"
---

# Temu Leboncoin Etsy Vinted

Hub de travail pour retrouver rapidement le chantier de revente marketplace et les fichiers code associés.

## Canonical docs

- `spec-temu-vinted-listing-assistant.md`
- `research-marketplaces-api-cli-automation.md`

## Code entry points

- `dashboard-temu.astro`
- `temu-workspace.astro`
- `api-extract.ts`
- `api-rewrite.ts`
- `api-translate-images.ts`
- `api-image.ts`
- `lib-temu.ts`
- `lib-gemini-cli.ts`
- `lib-gemini-image-edit.ts`
- `test-temu.test.ts`
- `test-gemini-cli.test.ts`
- `test-gemini-image-edit.test.ts`

## Notes

- La spec reste dans `shipglowz_data/workflow/specs/` pour préserver la convention chantier.
- Le dossier public `/temu` redirige vers `/dashboard/temu`.
- Les routes `/api/temu/*` sont maintenant protégées par Clerk.
