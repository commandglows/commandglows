---
artifact: technical_module_context
metadata_schema_version: "1.0"
artifact_version: "0.1.0"
project: "WinGlowz"
created: "2026-05-04"
updated: "2026-05-09"
status: stale
source_skill: sf-docs
scope: "supabase-data"
owner: "Diane"
confidence: medium
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - "Supabase Auth"
  - "Supabase Postgres"
  - "Supabase RLS"
  - "Supabase Realtime"
depends_on:
  - "docs/API_SUPABASE.md@0.1.0"
  - "shipglows_data/technical/guidelines.md@0.1.0"
supersedes: []
evidence:
  - "Mapped before Android keyboard schema extension."
next_review: "2026-06-04"
next_step: "/sf-docs technical audit"
---

# Technical Module Context: Supabase Data

> Legacy reference: Supabase data remains documented here only for current code
> compatibility and migration comparison. New backend work belongs to
> backend-agnostic stores with Firebase as first adapter, per
> `shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md`.
>
> Archived technical context for legacy adapters: do not use as a target design
> document for new work.

## Purpose

Supabase owns synchronized user data for transcriptions, clipboard items,
snippets, dictionary terms, settings, and non-sensitive client events. Database
constraints and RLS are the enforcement layer; Flutter repositories are clients,
not authorization authorities. For clipboard, Supabase is the current cloud
sync adapter behind `ClipboardHistoryStore`; the product contract lives in the
Flutter feature API/domain.

## Owned Files

| Path | Role | Edit notes |
| --- | --- | --- |
| `supabase/migrations/**` | Schema, constraints, indexes, triggers, policies, realtime | Use additive migrations; never expose service-role assumptions to clients. |
| `supabase/tests/rls_smoke.sql` | RLS and constraint smoke tests | Expand when source allowlists or sensitive metadata constraints change. |
| `lib/data/supabase/**` | Client repositories and provider adapters | Keep inserts scoped by authenticated Supabase session and omit trusted `user_id`; do not expose these classes as UI or Android contracts. |
| `docs/API_SUPABASE.md` | Data contract documentation | Update with any schema, source, RLS, realtime, or limit changes. |

## Entrypoints

- Supabase migration apply: creates or evolves database contracts.
- Flutter repositories: insert/read/update/delete user data through the publishable-key client and RLS.

## Control Flow

```text
Flutter repository
  -> Supabase publishable-key client with auth session
  -> Postgres table constraint + RLS policy
  -> realtime/user-scoped query result

ClipboardHistoryApi
  -> ClipboardHistoryStore
  -> SupabaseClipboardStore
  -> Supabase publishable-key client with auth session
```

## Invariants

- RLS must be enabled on every user-scoped table exposed to the client.
- Ownership uses `auth.uid()` in policies.
- Client inserts must not include trusted `user_id`.
- Clipboard/transcription source allowlists in Dart and SQL must stay aligned.
- `client_events.metadata` must reject sensitive keys such as tokens, raw text, audio, transcripts, and provider payloads.
- Supabase clipboard classes must only be imported by composition roots or tests, not by feature UI or Android native code.

## Failure Modes

- Missing auth session: repository calls fail recoverably; local/offline queues must not leak across users.
- Constraint violation: client should surface a recoverable error rather than partially mutating.
- Stale realtime after delete: tombstone/delete-wins rules must prevent restoration.
- Supabase not configured: clipboard uses local fallback behavior where available; no Supabase request is attempted.

## Security Notes

The service-role key is forbidden in mobile/web clients. BYO AI keys remain local
and are never synchronized to Supabase.

## Validation

```bash
supabase db push
psql "$SUPABASE_DB_URL" -f supabase/tests/rls_smoke.sql
```

## Reader Checklist

- Migration changed -> update `docs/API_SUPABASE.md` and RLS smoke tests.
- Repository insert metadata changed -> verify SQL constraints, RLS, and docs.
- Source allowlist changed -> update Dart model tests and SQL constraints.
- Clipboard adapter changed -> verify `ClipboardHistoryStore` contract tests and that Supabase remains provider-specific.

## Maintenance Rule

Update this doc when schema, policies, source allowlists, repository contracts,
limits, realtime behavior, or validation commands change.
