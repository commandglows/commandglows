---
artifact: editorial_governance
metadata_schema_version: "1.0"
artifact_version: "1.0.1"
project: winglowz
created: "2026-05-17"
updated: "2026-05-23"
status: reviewed
source_skill: sf-docs
scope: page-intent-map
owner: "Diane"
confidence: medium
risk_level: medium
security_impact: unknown
docs_impact: yes
linked_systems:
  - src/pages/[...lang]/
  - src/content/products/
  - src/content/blog/
  - src/content/docs/
depends_on:
  - shipglows_data/editorial/public-surface-map.md
  - shipglows_data/business/product.md
  - shipglows_data/business/gtm.md
supersedes: []
evidence:
  - src/pages/[...lang]/index.astro
  - src/pages/[...lang]/landing.astro
  - src/pages/[...lang]/[windows_mastery].astro
  - src/pages/[...lang]/[products].astro
  - src/pages/[...lang]/termux.astro
  - src/pages/[...lang]/dotfiles.astro
  - src/pages/[...lang]/shipglows.astro
next_review: "2026-06-17"
next_step: "/sf-docs update"
---
# Page Intent Map

## Purpose

Define the job of major page families so copy and layout changes stay coherent across English and French surfaces.

## Intent Map

| Surface | Primary job | Secondary job | Primary CTA expectation | Shared-file risk |
| --- | --- | --- | --- | --- |
| Homepage | frame the Windows-first problem and introduce the brand | route users to flagship and supporting content | route to flagship or next high-intent page | high |
| Landing page | convert qualified traffic | address objections and reinforce the flagship frame | direct commercial CTA | high |
| `Windows Mastery` sales page | close the flagship offer | explain curriculum and fit | authenticated checkout or curriculum entry | high |
| Product catalog | help comparison across companion products | route users back to flagship context when relevant | product detail or flagship CTA | medium |
| Product detail pages | explain offer fit and availability | qualify or disqualify users | valid CTA only; no dead ends | medium |
| Script utility pages | explain one-command installers and their scope | route to raw script, GitHub, and related setup docs | copy/install command or inspect script | medium |
| Blog posts | educate and attract qualified discovery traffic | hand off to flagship or related docs | contextual internal links | low |
| Docs and training pages | teach a concrete framework or lesson | reinforce paid value and progression | next lesson or relevant conversion boundary | medium |
| Legal pages | communicate obligations and disclosures accurately | reduce support ambiguity | no marketing CTA required | high |

## Localization Rule

English and French versions of the same commercial surface must preserve:

- the same page job
- equivalent CTA intent
- equivalent claim strength

## Pending Final Copy Rule

If public wording is still under debate, mark the plan item as `pending final copy` instead of silently strengthening the claim.

## Maintenance Rule

Update this map when a page family changes job, CTA strategy, or bilingual role.
