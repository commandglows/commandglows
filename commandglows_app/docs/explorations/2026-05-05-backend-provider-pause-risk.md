---
artifact: exploration_report
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlowz"
created: "2026-05-05"
updated: "2026-05-05"
status: draft
source_skill: sf-explore
scope: "backend-provider-pause-risk"
owner: "Diane"
confidence: medium
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - "Flutter app runtime config"
  - "GitHub Actions / Blacksmith APK build"
  - "Supabase Auth/Postgres/RLS"
  - "Future backend provider"
evidence:
  - "https://supabase.com/docs/guides/deployment/going-into-prod"
  - "https://supabase.com/docs/guides/platform/billing-on-supabase"
  - "https://appwrite.io/changelog/entry/2026-02-20-1"
  - "https://neon.com/pricing"
  - "https://firebase.google.com/pricing"
  - "https://www.convex.dev/pricing"
  - "https://docs.railway.com/pricing"
  - "https://pocketbase.io/docs/"
depends_on:
  - "docs/SPEC_FLUTTER_SUPABASE_MIGRATION.md@0.1.0"
  - "docs/API_SUPABASE.md@1.0.0"
supersedes: []
next_step: "/sf-spec backend-provider-decision"
---

# Exploration Report: Backend Provider Pause Risk

## Starting Question

Should WinGlowz continue on Supabase if Free projects can be paused for inactivity, or should the backend provider stay undecided until the server/secrets strategy is clear?

## Context Read

- Conversation context - user does not want zero-traffic projects to be paused or lost.
- Current implementation context - WinGlowz has Supabase-specific runtime defines, schema, RLS smoke tests, and CI APK secret injection.
- Task context - Supabase real-environment validation is already deferred until the server change and secrets-provider decision.

## Internet Research

- [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod) - Accessed 2026-05-05 - Confirms Free Plan low-activity applications may be paused after 7 days and Pro is the guaranteed no-pause path.
- [Supabase billing docs](https://supabase.com/docs/guides/platform/billing-on-supabase) - Accessed 2026-05-05 - Confirms paid organizations avoid project pausing and clarifies project/organization billing.
- [Appwrite Free plan update](https://appwrite.io/changelog/entry/2026-02-20-1) - Accessed 2026-05-05 - Confirms Appwrite Free also pauses inactive projects after 7 days, so it does not solve this concern.
- [Neon pricing](https://neon.com/pricing) - Accessed 2026-05-05 - Shows serverless Postgres with scale-to-zero and usage-based paid plans; useful if cold starts are acceptable.
- [Firebase pricing](https://firebase.google.com/pricing) - Accessed 2026-05-05 - Shows Spark no-cost quotas and Blaze pay-as-you-go; relevant if NoSQL/security rules are acceptable.
- [Convex pricing](https://www.convex.dev/pricing) - Accessed 2026-05-05 - Shows a backend platform with free resources and production plans; migration fit needs Flutter SDK/runtime proof.
- [Railway pricing](https://docs.railway.com/pricing) - Accessed 2026-05-05 - Shows paid small-project hosting as a predictable control path for self-hosted Postgres/PocketBase.
- [PocketBase docs](https://pocketbase.io/docs/) - Accessed 2026-05-05 - Shows a self-hosted single-binary backend with auth, SQLite, realtime, and API.

## Problem Framing

The real requirement is not "how to keep Supabase awake." It is: WinGlowz needs a backend strategy where low traffic does not silently interrupt the installed app, and where projects are not operationally fragile during the pre-traction phase.

An automated keepalive cron is not a durable product invariant. It may stop working, may not count as the right activity, and does not change the provider's stated guarantee. If continuous availability matters, the provider or plan must explicitly support it.

## Option Space

### Option A: Keep Supabase, But Only If Paid Or Explicitly Accepted

- Summary: Keep the existing Supabase Auth/Postgres/RLS work and use Pro when real availability matters.
- Pros: Minimal code churn; keeps SQL, RLS, migrations, Flutter SDK, existing docs/tests.
- Cons: Free Plan pause behavior conflicts with the user's zero-traffic project requirement.

### Option B: Switch To Neon Postgres Plus Separate Auth/API

- Summary: Keep a Postgres-centered architecture but move away from Supabase BaaS.
- Pros: Postgres remains familiar; serverless scale-to-zero is designed for idle workloads; paid usage can be low.
- Cons: More assembly work; Auth/RLS/API layer must be rebuilt or replaced.

### Option C: Switch To Firebase

- Summary: Use Firebase Auth plus Firestore/Realtime Database for mobile-first backend.
- Pros: Mature mobile ecosystem; no obvious "inactive project pause" model in Spark pricing; strong Flutter support.
- Cons: No Postgres/RLS; data model and security rules need redesign.

### Option D: Self-Host PocketBase Or Postgres On A Small Paid Host

- Summary: Run a small backend on a VPS/Railway-style host.
- Pros: Highest control; no provider-level free-plan pause; predictable low monthly cost.
- Cons: User owns backups, monitoring, updates, security, and recovery.

### Option E: Appwrite Cloud Free

- Summary: Replace Supabase with Appwrite Cloud Free.
- Pros: Similar BaaS surface.
- Cons: Rejected for this specific concern because Appwrite Free now also pauses inactive projects.

## Comparison

Supabase Pro is the shortest route if the existing implementation is kept. Firebase is the strongest managed mobile alternative if SQL is not required. Neon is attractive if the app wants Postgres without Supabase, but it is not a drop-in BaaS. Self-hosting gives control, but moves operational risk to the project.

## Emerging Recommendation

Freeze deeper Supabase-specific work until the backend decision is explicit. Keep current repository interfaces, but avoid expanding Supabase coupling. Before shipping more Android/IME work that depends on sync/auth, choose one of two lanes:

1. Accept Supabase only with a paid no-pause path.
2. Replace Supabase with a provider that supports idle projects without manual reactivation, likely Firebase for managed mobile simplicity or a small self-hosted backend for control.

Confidence is medium because the final choice depends on cost tolerance, whether SQL/RLS is essential, and how much ops work Diane wants to own.

## Non-Decisions

- No provider selected yet.
- No migration from Supabase started.
- No CI secrets strategy changed beyond the current GitHub Secrets injection.
- No keepalive workaround accepted as product architecture.

## Rejected Paths

- Appwrite Cloud Free - rejected as a solution to pause anxiety because its Free plan also pauses inactive projects.
- Keepalive cron as guarantee - rejected as an operational hack, not a provider-level availability guarantee.

## Risks And Unknowns

- Flutter SDK maturity for Convex or alternative providers may affect delivery speed.
- Firebase could simplify availability but force a document/security-rules rewrite.
- Self-hosting reduces provider pause risk but increases backup/security/maintenance risk.
- Supabase data is not necessarily "lost" when paused, but Free Plan availability and backup guarantees are not aligned with production expectations.

## Redaction Review

- Reviewed: yes
- Sensitive inputs seen: none
- Redactions applied: none
- Notes: No keys, tokens, database URLs, or customer data were included.

## Decision Inputs For Spec

- User story seed: As the builder, I want WinGlowz's backend provider to remain available even with low or zero traffic so installed builds do not break during pre-traction phases.
- Scope in seed: provider comparison, availability/pause policy, Flutter support, auth/sync fit, cost floor, backup story, migration effort.
- Scope out seed: full migration implementation, production deployment, billing setup.
- Invariants/constraints seed: no service-role keys in clients; no architecture that depends on unofficial keepalive behavior; CI must fail clearly when required secrets/config are absent.
- Validation seed: provider decision doc, minimal proof-of-concept auth + user-scoped sync, CI APK build with selected provider config, backup/recovery checklist.

## Handoff

- Recommended next command: `/sf-spec backend-provider-decision`
- Why this next step: The backend provider choice can invalidate current Supabase schema, docs, CI secrets, and Flutter repositories, so it should become an explicit decision before more provider-coupled implementation.

## Exploration Run History

| Date UTC | Prompt/Focus | Action | Result | Next step |
|----------|--------------|--------|--------|-----------|
| 2026-05-05 00:00:00 UTC | Supabase pause concern and possible alternatives | Checked current official provider docs and framed options | Supabase Free pause concern confirmed; Appwrite Free rejected for same reason; alternatives identified | `/sf-spec backend-provider-decision` |
