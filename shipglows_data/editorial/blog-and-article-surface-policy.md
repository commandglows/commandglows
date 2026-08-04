---
artifact: editorial_governance
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: commandglows
created: "2026-05-17"
updated: "2026-05-17"
status: reviewed
source_skill: sf-docs
scope: blog-and-article-surface-policy
owner: "Diane"
confidence: medium
risk_level: medium
security_impact: no
docs_impact: yes
linked_systems:
  - src/content/blog/
  - src/content/docs/
  - CONTENT_GUIDELINES.md
depends_on:
  - shipglows_data/editorial/content-map.md
  - shipglows_data/editorial/page-intent-map.md
supersedes: []
evidence:
  - src/content/blog/
  - CONTENT_GUIDELINES.md
next_review: "2026-06-17"
next_step: "/sf-docs editorial audit"
---
# Blog And Article Surface Policy

## Purpose

Keep blog and article recommendations aligned with the current CommandGlows public-content model.

## Surface Rules

- `src/content/blog/{en,fr}/` is the canonical public article surface.
- `src/content/docs/{en,fr}/` is the canonical structured learning surface.
- Draft source notes remain in `CONTENU/` until promoted intentionally.

## Editorial Rules

- Use blog posts for discovery, qualification, and educational entry points.
- Use docs for structured learning, premium teaching, and curriculum depth.
- Do not publish tool dumps or unsupported promise copy.
- Keep English and French publishing aligned on commercially important topics.

## Surface Missing

- If a requested article surface does not exist, report `surface missing: blog`.

## Maintenance Rule

Update this policy when article publishing paths or roles change.
