---
artifact: content_map
metadata_schema_version: "1.0"
artifact_version: "1.0.2"
project: commandglows
created: "2026-05-17"
updated: "2026-08-09"
status: reviewed
source_skill: sf-docs
scope: content-map
owner: "Diane"
confidence: medium
risk_level: medium
content_surfaces:
  - source_notes
  - blog
  - docs
  - product_pages
  - landing_pages
  - changelog
  - newsletter
security_impact: unknown
docs_impact: yes
evidence:
  - CONTENT_GUIDELINES.md
  - CHANGELOG.md
  - src/content/blog/
  - src/content/docs/
  - src/content/products/
  - src/pages/[...lang]/
  - src/pages/[...lang]/termux.astro
  - src/utils/shipglowsRedirects.ts
linked_artifacts:
  - shipglows_data/editorial/public-surface-map.md
  - shipglows_data/editorial/page-intent-map.md
  - shipglows_data/editorial/claim-register.md
  - shipglows_data/business/product.md
  - shipglows_data/business/gtm.md
depends_on:
  - shipglows_data/business/product.md
  - shipglows_data/business/gtm.md
supersedes:
  - CONTENT_MAP.md
next_review: "2026-06-17"
next_step: "/sf-docs update"
---
# Content Map

## Purpose

Map public and semi-public content surfaces so publishing stays aligned with the core positioning: `Windows Mastery` as the flagship Windows-first offer.

## Content Surfaces

| Surface | Canonical path | Purpose | Format | Source of truth | Update when |
| --- | --- | --- | --- | --- | --- |
| Source notes | `CONTENU/` | raw research and draft material before editorial qualification | Markdown, images | editorial triage | a note is created or promoted |
| Blog | `src/content/blog/{en,fr}/` | discovery and SEO education | Markdown | business, product, and GTM contracts | a publishable educational angle is validated |
| Training and docs | `src/content/docs/{en,fr}/` | gated or structured learning content | MD, MDX | offer contract and curriculum | offer or lesson scope changes |
| Product pages | `src/content/products/{en,fr}/` | catalog and product narratives | Markdown | active offer reality | product positioning or status changes |
| Landing and offer pages | `src/pages/[...lang]/` including `/windows-mastery` and `/products` | conversion surfaces | Astro pages | GTM and product contract | offer, CTA, or framing changes |
| Script utility page | `/termux` and `/fr/termux` | explain the CommandGlows-owned Termux installer and route to its raw script | Astro pages | implemented Termux bootstrap and dotfiles repository | Termux installer command, scope, or installed-tool boundary changes |
| ShipGlows compatibility routes | former ShipGlows, dotfiles and ShipGlowz page/script paths | preserve old links through exact permanent redirects | Astro endpoints | canonical pages and scripts on `https://shipglows.com` | canonical destination or compatibility contract changes |
| Changelog | `CHANGELOG.md` | user-facing release and documentation updates | Markdown | release history | relevant user-visible change ships |
| Newsletter | `src/pages/api/newsletter/` plus external copy assets | capture and nurture | API plus external copy | lifecycle messaging | signup or nurture flow changes |
| AI-readable site summary | `public/llms.txt` | provide a concise, source-aligned site summary for AI retrieval | Markdown | business, branding, and public-surface contracts | flagship offer, key routes, or claim boundaries change |

## Semantic Architecture

| Cluster | Pillar page | Supporting pages | Target intent | Internal link rule | Status |
| --- | --- | --- | --- | --- | --- |
| Windows workflow mastery | `/windows-mastery`, `/fr/maitrise-windows` | docs lessons and supporting blog pages | commercial and educational | supporting assets link back to flagship conversion surface | live |
| Companion products | `/products`, `/fr/produits` | product markdown entries | commercial | product pages link to catalog and flagship context | live |
| Foundations and methods | curated from `CONTENU/` into blog and docs | topical notes promoted after editorial review | informational | promote only if aligned with the flagship narrative | planned |

## Repurposing Rules

- `CONTENU/` is upstream source material, not publish-ready content.
- Promote notes only after editorial review against `CONTENT_GUIDELINES.md`.
- Keep concept-first teaching; tools are supporting examples.
- Route top-of-funnel education to blog and premium learning to docs.
- Keep product claims aligned with business, GTM, and implemented flows.

## Cross-Surface Update Rules

| Trigger | Check these surfaces |
| --- | --- |
| New flagship offer or curriculum change | product context, landing pages, docs lessons, product pages, newsletter messaging |
| New companion product or status change | product catalog content, landing page references, changelog, related blog CTAs |
| New publishable source note in `CONTENU/` | blog, docs, and semantic cluster placement |
| Positioning change | GTM, blog intros, landing pages, product pages, newsletter copy |
| Workflow or access change | docs, premium lessons, product pages, support copy, changelog |
| Termux installer command or scope change | Termux utility pages, raw script endpoint, repository README, changelog |
| ShipGlows or dotfiles installer change | canonical `shipglows.com` surfaces; CommandGlows changes only if the compatibility destination changes |
| Bilingual content update | matching `en` and `fr` surfaces in the same release batch |
