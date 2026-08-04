---
artifact: documentation
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "CommandGlows"
created: "2026-04-27"
updated: "2026-05-09"
status: "stale"
source_skill: "sf-spec"
scope: "supabase_api"
owner: "Diane"
confidence: "medium"
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
depends_on:
  - "docs/SPEC_FLUTTER_SUPABASE_MIGRATION.md@0.1.0"
supersedes:
  - "docs/API.md as target Supabase contract"
evidence:
  - "supabase/migrations/20260427084000_init_commandglows_app.sql"
  - "supabase/migrations/20260504210000_android_keyboard_ime.sql"
  - "supabase/tests/rls_smoke.sql"
next_step: "/sf-start shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md"
---

# API Supabase — CommandGlows

> Legacy reference: Supabase is no longer the active backend target after the
> 2026-05-09 Firebase/backend-agnostic decision. Keep this document only for
> migration comparison until Firebase parity lets the Supabase adapter be
> archived or removed. The active backend chantier is
> `shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md`.
>
> Archived target contract: do not use this document to plan or implement new
> backend work.

## Purpose

This document was the target backend contract for the Flutter + Supabase migration. It is now superseded as an active target.

## Auth Contract

- Supabase Auth is required before reading or mutating user-scoped rows.
- `auth.uid()` is the only trusted ownership source.
- Flutter clients must not send a trusted `user_id`; inserts use `default auth.uid()` and RLS `with check`.
- No service role key may be present in Flutter, web, desktop, mobile bundles, logs, or public env.

## Tables

All user tables use UUID primary keys, `created_at timestamptz default now()`, and `updated_at timestamptz default now()` maintained by trigger.

| Table | Required columns | Required constraints |
|---|---|---|
| `profiles` | `id uuid primary key references auth.users(id)`, `display_name text` | `id = auth.uid()` through RLS |
| `user_settings` | `id uuid`, `user_id uuid not null default auth.uid() references auth.users(id)`, `preferred_language text`, `clipboard_sync_enabled boolean default false`, `overlay_enabled boolean default false`, `keyboard_voice_enabled boolean default true`, `keyboard_clipboard_sync_enabled boolean default false`, `keyboard_media_controls_enabled boolean default true`, `keyboard_privacy_mode text default 'auto'` | `unique(user_id)`, language non-empty, keyboard privacy mode in `auto`, `strict`, `standard` |
| `transcriptions` | `id uuid`, `user_id uuid not null default auth.uid() references auth.users(id)`, `raw_text text`, `cleaned_text text`, `language text`, `duration_ms integer`, `source text` | `trim(raw_text) <> ''`, `trim(cleaned_text) <> ''`, `duration_ms >= 0`, source allowlist: `free`, `advanced`, `overlay`, `keyboard` |
| `clipboard_items` | `id uuid`, `user_id uuid not null default auth.uid() references auth.users(id)`, `content text`, `content_type text`, `source text`, `pinned boolean default false`, `deleted_at timestamptz`, `content_hash text`, `origin_surface text`, `origin_device_id text`, `capture_method text`, `sync_state text`, `sync_error text`, `device_local_id text` | `trim(content) <> ''`, max length enforced in app and DB, content type allowlist, keyboard source/surface/capture/sync allowlists, unique `(user_id, content_hash, origin_surface)` for non-deleted hashed items |
| `snippets` | `id uuid`, `user_id uuid not null default auth.uid() references auth.users(id)`, `trigger text`, `content text`, `label text`, `deleted_at timestamptz` | `trim(trigger) <> ''`, `trim(content) <> ''`, unique lower trigger per user |
| `dictionary_terms` | `id uuid`, `user_id uuid not null default auth.uid() references auth.users(id)`, `term text`, `replacement text`, `case_sensitive boolean default false`, `deleted_at timestamptz` | `trim(term) <> ''`, term/replacement cannot create an empty-loop replacement |
| `client_events` | `id uuid`, `user_id uuid not null default auth.uid() references auth.users(id)`, `event_type text`, `severity text`, `metadata jsonb` | metadata must be redacted; no keys, audio, raw transcript, provider payloads |

## RLS Contract

Enable RLS on every table above.

For tables with `user_id`:

- `select`: `auth.uid() is not null and auth.uid() = user_id`
- `insert`: `auth.uid() is not null and auth.uid() = user_id`
- `update`: `auth.uid() is not null and auth.uid() = user_id`
- `delete`: `auth.uid() is not null and auth.uid() = user_id`

For `profiles`:

- `select/update/delete`: `auth.uid() is not null and auth.uid() = id`
- `insert`: `auth.uid() is not null and auth.uid() = id`

No anonymous policies are allowed for user content.

## Realtime Contract

Realtime subscriptions are allowed for `transcriptions`, `clipboard_items`, `snippets`, `dictionary_terms`, and `user_settings` only after auth is ready. Client filters must be scoped to the authenticated user and still rely on RLS as the enforcement layer.

Events are idempotent by `id` + `updated_at`. Out-of-order events older than the local row version are ignored unless they carry `deleted_at`, where delete wins.

## Sync Semantics

- Delete wins over stale edit.
- Duplicate clipboard inserts are de-duplicated by normalized content hash per user and origin surface when the client provides `content_hash`.
- Offline writes use client-generated UUIDs and retry with bounded attempts.
- Failed mutations remain visible with a retry/error state; text is not discarded.
- Keyboard clipboard sync is opt-in. Keyboard-origin rows must identify source/surface/capture method and must not include sensitive/private-field content.

## Required SQL Tests

- User A can CRUD own rows in every user table.
- User B cannot select/update/delete User A rows by ID.
- Unauthenticated user cannot read or write user rows.
- Insert with forged `user_id` for another user is denied.
- Empty transcription, empty clipboard item, empty snippet trigger/content, and empty dictionary term are rejected.
- Keyboard transcription source, keyboard clipboard metadata, per-user hash dedupe, and unknown source rejection are covered.
- `client_events.metadata` rejects sensitive top-level keys including `token`, `raw_text`, `audio`, `transcript`, and provider payload keys.
- Realtime subscription for User A does not deliver User B rows.
