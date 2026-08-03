---
artifact: gtm_context
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: winglowz
created: "2026-05-17"
updated: "2026-05-17"
status: reviewed
source_skill: sf-docs
scope: gtm
owner: "Diane"
confidence: medium
risk_level: medium
target_segment: "Windows-first professionals, freelancers, creators, and productivity enthusiasts looking for structured workflow improvement"
offer: "A content-led funnel into premium Windows productivity training, gated documentation, and companion workflow tools"
channels: "SEO, bilingual educational content, product pages, landing pages, newsletter capture, and community distribution"
proof_points: "Windows-only positioning, bilingual content structure, gated course/docs flow, Polar checkout integration, Clerk auth, and a visible companion product catalog"
security_impact: unknown
docs_impact: yes
evidence:
  - src/content/blog/
  - src/content/docs/
  - src/content/products/
  - src/pages/[...lang]/[windows_mastery].astro
linked_artifacts:
  - shipglows_data/business/business.md
  - shipglows_data/business/branding.md
  - shipglows_data/business/product.md
  - shipglows_data/editorial/content-map.md
depends_on:
  - shipglows_data/business/business.md
  - shipglows_data/business/branding.md
  - shipglows_data/business/product.md
supersedes:
  - GTM.md
next_review: "2026-06-17"
next_step: "/sf-docs update"
---
# GTM Context

## Target Segment

- Windows-first professionals and independents with recurring workflow friction
- learners who value operational systems over generic productivity content
- bilingual audiences on core commercial routes

## Core Offer

- `Windows Mastery` is the flagship commercial offer.
- Free educational content supports discovery and qualification.
- Gated learning surfaces support activated users.
- Companion product pages extend the ecosystem without replacing the flagship narrative.

## Positioning

- Windows-first productivity guidance with practical implementation
- structured learning path instead of disconnected app recommendations
- commercial narrative led by one flagship offer

## Acquisition Channels

- SEO via bilingual educational content in `src/content/blog/`
- offer and catalog pages under `/windows-mastery`, `/products`, and localized counterparts
- newsletter capture and lifecycle surfaces under `/api/newsletter/*`
- product-oriented pages and docs that move qualified users toward activation

## Conversion Path

1. Acquire via educational or product-intent content.
2. Qualify via Windows-specific framing and practical examples.
3. Route to the flagship offer page or product catalog.
4. Trigger account and checkout flow where relevant.
5. Activate users into gated training and docs.

## Proof Available In Repo

- bilingual routes and content structure
- explicit `Windows Mastery` route family
- authentication and purchase-related API surface references
- docs, products, and blog collections aligned to one brand

## GTM KPIs

- qualified organic traffic to flagship and high-intent pages
- visit-to-lead conversion
- visit-to-purchase conversion on flagship routes
- post-purchase activation into gated surfaces
- retention in premium learning journeys

