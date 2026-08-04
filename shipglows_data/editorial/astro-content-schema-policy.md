---
artifact: editorial_governance
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: commandglows
created: "2026-05-17"
updated: "2026-05-17"
status: reviewed
source_skill: sf-docs
scope: astro-content-schema-policy
owner: "Diane"
confidence: high
risk_level: high
security_impact: no
docs_impact: yes
linked_systems:
  - src/content/config.ts
  - src/content/docs/
  - src/content/blog/
  - src/content/products/
  - src/content/services/
depends_on:
  - shipglows_data/technical/guidelines.md
supersedes: []
evidence:
  - src/content/config.ts
next_review: "2026-06-17"
next_step: "/sf-docs editorial audit"
---
# Astro Content Schema Policy

## Purpose

Protect runtime content compatibility by keeping editorial changes aligned with the active collection schemas in `src/content/config.ts`.

## Astro Content Schema

`src/content/config.ts` is the source of truth. Governance docs must not invent frontmatter fields that the runtime does not accept.

## Collection Rules

### `docs`

Allowed schema includes:

- `title`
- optional `description`
- optional `editUrl`
- optional `head`
- optional `tableOfContents`
- optional `template`
- optional `hero`
- optional `lastUpdated`
- optional `prev`
- optional `next`
- optional `sidebar`
- optional `banner`
- optional `pagefind`
- optional `draft`

### `products`

Required schema includes:

- `title`
- `description`
- `main`
- `tabs`
- `longDescription`
- `descriptionList`
- `specificationsLeft`
- optional `specificationsRight`
- optional `tableData`
- `blueprints`

Optional `status` is limited to `available`, `beta`, or `coming_soon`.

### `blog`

Required schema includes:

- `title`
- `description`
- `contents`
- `author`
- `authorImage`
- `authorImageAlt`
- `pubDate`
- `cardImage`
- `cardImageAlt`
- `readTime`

Optional fields:

- `role`
- `draft`
- `tags`
- `translationKey` for an explicit cross-language article pair

### `services`

Required schema includes:

- `title`
- `description`

Optional fields:

- `icon`
- `features`
- `image`
- `imageAlt`

## Rules

- Do not add ShipGlows governance frontmatter to runtime content files unless the Astro schema is updated first.
- If a content-file update needs governance tracking, record it in canonical docs instead of mutating the runtime schema casually.
- Treat collection-schema changes as both technical and editorial-impacting.

## Maintenance Rule

Update this policy whenever `src/content/config.ts` changes.
