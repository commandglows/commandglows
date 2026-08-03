---
artifact: editorial_governance
metadata_schema_version: "1.0"
artifact_version: "1.0.1"
project: winglowz
created: "2026-05-17"
updated: "2026-05-23"
status: reviewed
source_skill: sf-docs
scope: claim-register
owner: "Diane"
confidence: medium
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - src/pages/[...lang]/[windows_mastery].astro
  - src/content/docs/
  - src/content/products/
  - src/pages/api/polar/
  - src/pages/api/newsletter/
  - src/pages/[...lang]/termux.astro
  - src/pages/[...lang]/dotfiles.astro
  - src/pages/[...lang]/shipglows.astro
depends_on:
  - shipglows_data/business/branding.md
  - shipglows_data/business/gtm.md
supersedes: []
evidence:
  - src/pages/[...lang]/[windows_mastery].astro
  - src/content/docs/en/formations.mdx
  - src/content/docs/fr/formations.mdx
  - src/pages/api/polar/checkout.ts
  - src/pages/api/newsletter/subscribe.ts
next_review: "2026-06-17"
next_step: "/sf-docs editorial audit"
---
# Claim Register

## Purpose

Track sensitive public claims and the proof level currently available in the repository.

## Claim Inventory

| Claim area | Current claim boundary | Proof status | Evidence | Notes |
| --- | --- | --- | --- | --- |
| Bilingual publishing | WinGlows ships English and French public surfaces | verified | `src/pages/[...lang]/**`, `src/content/{blog,docs,products}/{en,fr}/` | safe public claim |
| Flagship curriculum scope | `Windows Mastery` presents an 8-module training structure | verified | `src/content/docs/{en,fr}/formations/**`, sales-page copy | do not strengthen into lesson-count claims without recounting |
| Gated training access | some training access depends on auth and checkout flows | verified | `src/pages/api/polar/checkout.ts`, `convex/http.ts` | safe if phrased as implemented flow, not entitlement guarantee under all conditions |
| Newsletter capture | signup and unsubscribe flows exist | verified | `src/pages/api/newsletter/subscribe.ts`, `src/pages/api/newsletter/unsubscribe.ts` | avoid deliverability guarantees |
| One-command installer availability | Termux, dotfiles, and ShipGlows pages can claim copyable short installer commands when raw script endpoints exist | verified | `src/pages/termux-script.ts`, `src/pages/dotfiles-script.ts`, `src/pages/shipglows-script.ts`, related repository bootstrap scripts | keep scope wording aligned with actual scripts; do not imply security audit or universal OS support |
| Priority support | referenced in public sales copy | unverified | sales-page copy only | requires external policy or operational source before stronger claims |
| Lifetime access | referenced in public sales copy | unverified | sales-page copy only | requires offer-policy proof before downstream reuse |
| Quantified social proof or user outcomes | not safe by default | blocked unless sourced | none in canonical governance | keep out unless evidence is added |

## Claim Impact Plan

Use this format when a change touches sensitive copy:

| surface | claim | current status | required proof | action | notes |
| --- | --- | --- | --- | --- | --- |
| `path or route` | short claim | `verified`, `unverified`, or `blocked` | concrete repo or external source | `keep`, `downgrade`, `remove`, or `hold` | optional caveat |

## Maintenance Rule

Update this register when commercial copy introduces new sensitive claims or when new proof is added.
