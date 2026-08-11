---
artifact: documentation
metadata_schema_version: "1.0"
artifact_version: "1.1.0"
project: "commandglows"
created: "2026-04-26"
updated: "2026-08-11"
status: "reviewed"
source_skill: sf-docs
scope: "file"
owner: "Diane"
confidence: "high"
risk_level: "medium"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Astro 6"
  - "Vercel"
  - "Clerk"
  - "Convex"
  - "Stripe Managed Payments"
  - "Resend"
depends_on:
  - "CLAUDE.md"
  - "shipglows_data/technical/guidelines.md"
  - "shipglows_data/technical/architecture.md"
supersedes: []
evidence:
  - "package.json"
  - "astro.config.mjs"
  - "src/middleware/index.ts"
  - "src/pages/api/checkout/start.ts"
  - "src/pages/api/commerce/checkout.ts"
  - "convex/http.ts"
next_step: "pnpm build:check"
---
# Agent Guide

## Mission

CommandGlows is a bilingual Astro application for Windows-focused productivity content, products, docs, and training sales. The repo combines:

- marketing and editorial pages
- gated training purchase flows
- Clerk authentication
- Convex-backed user and feature data
- Stripe-only checkout and webhook handling
- Resend newsletter flows

## First Places to Read

1. `CLAUDE.md` for the local MCP/context workflow expected in this repo.
2. `shipglows_data/technical/guidelines.md` for product and routing constraints.
3. `shipglows_data/technical/architecture.md` for system boundaries and runtime flows.
4. `shipglows_data/technical/context.md` for a concise directory and feature map.

## Stack Summary

- Frontend: Astro 6, Tailwind, MDX, React islands
- Deployment: Vercel server output
- Auth: Clerk middleware and webhook sync
- Data: Convex schema, queries, mutations, HTTP actions
- Billing: signed suite handoff, Stripe Managed Payments checkout, central webhook, and Convex fulfillment
- Email: Resend subscription and unsubscribe endpoints
- Content: Astro content collections for docs, blog, products, services

## Critical Working Rules

- Keep English routes unprefixed and French routes under `/fr`.
- Preserve route translation integrity between `src/pages/[...lang]`, `src/i18n/*`, and routing helpers.
- Treat `src/pages/api/checkout/start.ts`, `src/pages/api/commerce/checkout.ts`, `src/pages/api/commerce/webhooks/stripe.ts`, and `convex/bridge.ts` as one coupled purchase flow.
- Treat Clerk webhook sync and Convex user records as a coupled identity flow.
- Do not document or introduce dead-end commerce CTAs.
- If changing content schemas, update `src/content/config.ts` and audit affected content folders.

## High-Risk Areas

- `src/middleware/i18n.ts`: route canonicalization and locale redirects
- `src/pages/api/checkout/start.ts`: Clerk auth and product-bound identity handoff
- `src/pages/api/commerce/checkout.ts`: Stripe-only offer and Price-ID validation
- `convex/http.ts`: webhook verification and entitlement updates
- `src/pages/api/newsletter/*.ts`: external email audience side effects
- `convex/schema.ts`: persistent data contract

## Environment Assumptions

The codebase expects valid values for Clerk, Convex, Stripe, and Resend. Placeholder env values are explicitly rejected in parts of the runtime, especially checkout and newsletter flows.

## Change Checklist

1. If you change routing, inspect `src/utils/routing.ts`, `src/middleware/i18n.ts`, and `src/i18n/*`.
2. If you change checkout or entitlements, inspect `src/utils/courseGating.ts`, `src/pages/api/checkout/start.ts`, `src/pages/api/commerce/*`, and `convex/bridge.ts`.
3. If you change auth lifecycle behavior, inspect `src/pages/api/clerk/webhook.ts`, `convex/http.ts`, and `convex/users.ts`.
4. If you change docs or content model behavior, inspect `src/content/config.ts` and the relevant content folders.

## Entry Surface

- Public routes: `src/pages/[...lang]/*`
- Dashboard routes: `src/pages/dashboard/*`
- API routes: `src/pages/api/*`
- Backend actions and data: `convex/*`

## Current Confidence

High for technical boundaries and runtime flow mapping because all claims above are directly grounded in current repo files and route handlers.
