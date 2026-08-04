---
artifact: documentation
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "CommandGlows"
created: "2026-04-26"
updated: "2026-05-09"
status: "stale"
source_skill: "sf-docs"
scope: "api"
owner: "Diane"
confidence: "high"
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Backend-agnostic stores"
  - "Firebase first adapter"
  - "Supabase legacy reference"
depends_on:
  - "../shipglows_data/technical/architecture.md@0.1.0"
  - "../docs/DECISIONS.md@0.1.0"
supersedes: []
evidence:
  - "../docs/SPEC_FLUTTER_SUPABASE_MIGRATION.md"
  - "../convex/schema.ts"
  - "../convex/clipboard.ts"
  - "../convex/transcriptions.ts"
  - "../convex/snippets.ts"
next_step: "$sf-docs api"
---

# API — CommandGlows

> Legacy reference: this document still contains the previous Supabase contract.
> The active backend target is now backend-agnostic stores with Firebase as the
> first Android adapter. Use `shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md` for
> new work.

## Scope

This document preserves the previous backend contract for migration history:

- Active target: backend-agnostic stores + Firebase first adapter.
- Legacy contract: Supabase schema + RLS + realtime.
- Legacy note: Convex API signatures are reference only and not target implementation.

## Target Supabase contract

### Auth contract

- Supabase Auth is required for all user-scoped data operations.
- `auth.uid()` is the only trusted user identity source for authorization.
- Client must not send arbitrary user ids for authorization decisions.

### Tables (contract level)

#### `profiles`

| Column | Type | Contract |
|---|---|---|
| `id` | `uuid` | PK, references `auth.users(id)`, equals authenticated user id |
| `display_name` | `text` nullable | user-facing name |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | managed by trigger |

#### `user_settings`

| Column | Type | Contract |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK to `auth.users(id)`, unique per user |
| `preferred_language` | `text` | BCP-47 style language tag |
| `overlay_enabled` | `boolean` | android UI preference only |
| `keyboard_voice_enabled` | `boolean` | Android keyboard dictation preference |
| `keyboard_clipboard_sync_enabled` | `boolean` | opt-in keyboard clipboard sync intent |
| `keyboard_media_controls_enabled` | `boolean` | Android keyboard play/pause preference |
| `keyboard_privacy_mode` | `text` | `auto`, `strict`, or `standard` |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | managed by trigger |

#### `transcriptions`

| Column | Type | Contract |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK to `auth.users(id)` |
| `raw_text` | `text` | non-empty content |
| `cleaned_text` | `text` | non-empty final text |
| `language` | `text` | selected or detected language |
| `duration_ms` | `integer` | non-negative |
| `source` | `text` | `free`, `advanced`, `overlay`, or `keyboard` |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | managed by trigger |

Contract constraints:

- reject inserts where `trim(cleaned_text)` is empty.
- reject inserts where `trim(raw_text)` is empty.

#### `clipboard_items`

| Column | Type | Contract |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK to `auth.users(id)` |
| `content` | `text` | non-empty |
| `content_type` | `text` | `text` or `code` |
| `source` | `text` | source descriptor |
| `content_hash` | `text` nullable | normalized client hash for dedupe |
| `origin_surface` | `text` | `app`, `overlay`, `keyboard`, or `system` |
| `origin_device_id` | `text` nullable | non-secret device origin identifier |
| `capture_method` | `text` | manual, voice, overlay, keyboard, system clipboard, or snippet method |
| `sync_state` | `text` | `local`, `pending`, `synced`, `error`, or `deleted` |
| `sync_error` | `text` nullable | recoverable sync error summary |
| `device_local_id` | `text` nullable | client-side queue identifier |
| `pinned` | `boolean` | default `false` |
| `deleted_at` | `timestamptz` nullable | tombstone; delete wins over stale sync |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | managed by trigger |

#### `snippets`

| Column | Type | Contract |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK to `auth.users(id)` |
| `trigger` | `text` | non-empty, unique per user (case-insensitive) |
| `content` | `text` | non-empty |
| `label` | `text` | display label |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | managed by trigger |

#### `dictionary_terms`

| Column | Type | Contract |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK to `auth.users(id)` |
| `term` | `text` | non-empty source term |
| `replacement` | `text` nullable | preferred replacement |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | managed by trigger |

### RLS contract

RLS must be enabled on all user-scoped tables.

Policy baseline per table with `user_id`:

- `SELECT`: `auth.uid() = user_id`
- `INSERT`: `auth.uid() = user_id`
- `UPDATE`: `auth.uid() = user_id`
- `DELETE`: `auth.uid() = user_id`

Policy baseline for `profiles`:

- row `id` must equal `auth.uid()`.

No public or anonymous policy may expose user content rows.

### Realtime contract

Realtime-enabled tables:

- `transcriptions`
- `clipboard_items`
- `snippets`
- `dictionary_terms`
- `user_settings`

Client subscription behavior:

- subscribe after auth session is ready,
- scope updates to current user rows,
- handle out-of-order events idempotently with `updated_at`.

Expected behavior:

- UI converges to server truth without cross-user leakage,
- transient offline errors are recoverable and visible to user.

## Legacy Convex reference (non-target)

The following mapping exists only to preserve parity intent during migration:

| Legacy Convex function | Target Supabase operation |
|---|---|
| `clipboard.list` | `select` on `clipboard_items` (user-scoped) |
| `clipboard.add` | `insert` on `clipboard_items` |
| `clipboard.togglePin` | `update pinned` on `clipboard_items` |
| `clipboard.remove` | `delete` from `clipboard_items` |
| `transcriptions.list` | `select` on `transcriptions` |
| `transcriptions.save` | `insert` on `transcriptions` |
| `transcriptions.update` | `update` on `transcriptions` |
| `transcriptions.remove` | `delete` on `transcriptions` |
| `snippets.list/findByTrigger/upsert/remove` | corresponding CRUD on `snippets` |

Convex signatures are not implementation guidance for target runtime.
