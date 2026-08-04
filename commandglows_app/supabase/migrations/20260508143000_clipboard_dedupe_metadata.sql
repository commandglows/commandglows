alter table public.clipboard_items
add column if not exists normalized_hash text,
add column if not exists captured_at timestamptz not null default now(),
add column if not exists last_seen_at timestamptz not null default now(),
add column if not exists modified_at timestamptz not null default now(),
add column if not exists source_metadata jsonb not null default '{}'::jsonb,
add column if not exists capture_count integer not null default 1;

update public.clipboard_items
set captured_at = coalesce(captured_at, created_at, now())
where captured_at is null;

update public.clipboard_items
set last_seen_at = coalesce(last_seen_at, captured_at, created_at, now())
where last_seen_at is null;

update public.clipboard_items
set modified_at = coalesce(modified_at, updated_at, created_at, now())
where modified_at is null;

update public.clipboard_items
set source_metadata = '{}'::jsonb
where source_metadata is null;

update public.clipboard_items
set capture_count = 1
where capture_count is null or capture_count < 1;

drop index if exists public.clipboard_items_user_hash_surface_unique_idx;

alter table public.clipboard_items
drop constraint if exists clipboard_content_hash_sha256;

alter table public.clipboard_items
add constraint clipboard_content_hash_sha256
check (content_hash is null or content_hash ~ '^[0-9a-f]{64}$') not valid;

alter table public.clipboard_items
drop constraint if exists clipboard_normalized_hash_sha256;

alter table public.clipboard_items
add constraint clipboard_normalized_hash_sha256
check (normalized_hash is null or normalized_hash ~ '^[0-9a-f]{64}$') not valid;

alter table public.clipboard_items
drop constraint if exists clipboard_capture_count_positive;

alter table public.clipboard_items
add constraint clipboard_capture_count_positive
check (capture_count >= 1) not valid;

alter table public.clipboard_items
drop constraint if exists clipboard_source_metadata_object;

alter table public.clipboard_items
add constraint clipboard_source_metadata_object
check (jsonb_typeof(source_metadata) = 'object') not valid;

create index if not exists clipboard_items_sync_state_idx
on public.clipboard_items (user_id, sync_state, last_seen_at desc)
where deleted_at is null;

create index if not exists clipboard_items_dedupe_lookup_idx
on public.clipboard_items (
  user_id,
  origin_device_id,
  source,
  normalized_hash,
  captured_at desc
)
where deleted_at is null
  and origin_device_id is not null
  and normalized_hash is not null;
