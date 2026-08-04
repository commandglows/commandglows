---
artifact: editorial_governance
metadata_schema_version: "1.0"
artifact_version: "1.1.1"
project: commandglows
created: "2026-05-17"
updated: "2026-07-17"
status: reviewed
source_skill: sf-docs
scope: public-surface-map
owner: "Diane"
confidence: medium
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - src/pages/[...lang]/
  - src/content/blog/
  - src/content/docs/
  - src/content/products/
depends_on:
  - shipglows_data/editorial/content-map.md
supersedes: []
evidence:
  - src/pages/[...lang]/index.astro
  - src/pages/[...lang]/landing.astro
  - src/pages/[...lang]/[windows_mastery].astro
  - src/pages/[...lang]/[products].astro
  - src/pages/[...lang]/[blog].astro
  - src/pages/[...lang]/termux.astro
  - src/pages/[...lang]/dotfiles.astro
  - src/pages/[...lang]/shipglows.astro
  - src/pages/[...lang]/commandglows-founder.astro
  - src/pages/[...lang]/socialglowz-founder.astro
  - src/lib/commerce/offers.ts
  - src/pages/api/commerce/checkout.ts
next_review: "2026-06-17"
next_step: "/sf-docs update"
---
# Public Surface Map

## Purpose

Identify the public surfaces that carry product promises, educational claims, or conversion risk.

## Canonical Product Sales Surfaces

Use this as the minimum canonical map for product sales copy and checkout authority.

| Product | Canonical marketing site | Canonical sales page | Checkout authority | Post-purchase authority | Notes |
| --- | --- | --- | --- | --- | --- |
| SocialGlowz | `socialglowz.com` | `socialglowz.com/lifetime-deal` | shared suite commerce route in `commandglows_site` using `offerId=socialglowz/lifetime_deal` | shared suite success and cancel routes plus suite entitlements | Keep SocialGlowz sales copy on the SocialGlowz domain even if checkout infra is shared |
| CommandGlows App | `www.commandglows.com` | `www.commandglows.com/commandglows-founder` | shared suite commerce route in `commandglows_site` using `offerId=commandglows_app/*` | shared suite success and cancel routes plus suite entitlements | CommandGlows is both product site and commerce host for the current shared checkout layer |

## Canonical Sales Rules

- Each product keeps its own canonical sales page on its own public domain when that domain exists.
- Shared commerce infrastructure does not make `www.commandglows.com` the canonical marketing home for every product.
- `offerId`, `productId`, success route, cancel route, and entitlement target must stay explicit in product copy and checkout wiring.
- If a product page exists on both the product site and `www.commandglows.com`, the product site is the marketing authority and the `www.commandglows.com` page is supporting or transitional unless governance says otherwise.

## Surface Inventory

| Surface | Paths | Audience | Risk | Notes |
| --- | --- | --- | --- | --- |
| Homepage | `/`, `/fr` | broad discovery | high | first-positioning surface |
| Landing page | `/landing`, `/fr/landing` | paid and qualified traffic | high | CTA and proof framing must stay aligned |
| Flagship offer page | `/windows-mastery`, `/fr/maitrise-windows` | high-intent buyers | high | pricing, support, curriculum, and promise claims |
| Product catalog and detail pages | `/products`, `/fr/produits`, localized product routes | buyers comparing offers | high | status, CTA destination, availability |
| CommandGlows founder offer | `/commandglows-founder`, `/fr/commandglows-founder` | high-intent app buyers | high | canonical direct-sale page for CommandGlows App founder tiers |
| Shared-commerce SocialGlowz founder mirror | `/socialglowz-founder`, `/fr/socialglowz-founder` | buyers entering via suite commerce paths | high | supporting commerce surface only; do not treat as the canonical SocialGlowz marketing home when `socialglowz.com` has the live offer page |
| Script utility pages | `/termux`, `/fr/termux`, `/dotfiles`, `/fr/dotfiles`, `/shipglows`, `/fr/shipglows` | operators who want one-command installers | medium | must match real bootstrap scope and raw script endpoints |
| Blog index and articles | localized blog routes | top-of-funnel discovery | medium | claim discipline and internal linking |
| Docs and training hub | localized docs routes and dashboard docs | learners and paid users | high | access model, curriculum, and lesson framing |
| Legal pages | privacy, terms, copyright, legal, disclaimer routes | users and regulators | high | policy accuracy matters |

## Update Triggers

- route additions or removals
- CTA changes
- product-status changes
- pricing or support wording changes
- localization changes on commercial pages
- docs access or curriculum changes

## Surface Missing Policy

- If a planned editorial surface is absent, report `surface missing` with the exact surface name.
- Do not invent runtime surfaces that do not exist in `src/pages/` or `src/content/`.

## Maintenance Rule

Update this map when a public route family, content collection, or conversion surface changes materially.
