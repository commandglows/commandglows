create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_deleted_at_restore()
returns trigger
language plpgsql
as $$
begin
  if old.deleted_at is not null and new.deleted_at is null then
    new.deleted_at = old.deleted_at;
  end if;
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  preferred_language text,
  clipboard_sync_enabled boolean not null default false,
  overlay_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_settings_language_non_empty check (
    preferred_language is null or length(trim(preferred_language)) > 0
  ),
  constraint user_settings_user_unique unique (user_id)
);

create table if not exists public.transcriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  raw_text text not null,
  cleaned_text text not null,
  language text,
  duration_ms integer not null default 0,
  source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transcriptions_raw_non_empty check (length(trim(raw_text)) > 0),
  constraint transcriptions_clean_non_empty check (length(trim(cleaned_text)) > 0),
  constraint transcriptions_duration_non_negative check (duration_ms >= 0),
  constraint transcriptions_source_allowlist check (source in ('free', 'advanced', 'overlay')),
  constraint transcriptions_raw_max check (char_length(raw_text) <= 100000),
  constraint transcriptions_cleaned_max check (char_length(cleaned_text) <= 100000)
);

create table if not exists public.clipboard_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content text not null,
  content_type text not null default 'text',
  source text not null default 'manual',
  pinned boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clipboard_content_non_empty check (length(trim(content)) > 0),
  constraint clipboard_type_allowlist check (content_type in ('text', 'code')),
  constraint clipboard_source_allowlist check (source in ('manual', 'voice', 'overlay', 'system')),
  constraint clipboard_content_max check (char_length(content) <= 50000)
);

create table if not exists public.snippets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  trigger text not null,
  content text not null,
  label text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint snippets_trigger_non_empty check (length(trim(trigger)) > 0),
  constraint snippets_content_non_empty check (length(trim(content)) > 0),
  constraint snippets_content_max check (char_length(content) <= 50000)
);

create unique index if not exists snippets_user_trigger_unique_idx
on public.snippets (user_id, lower(trim(trigger)))
where deleted_at is null;

create table if not exists public.dictionary_terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  term text not null,
  replacement text not null,
  case_sensitive boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dictionary_term_non_empty check (length(trim(term)) > 0),
  constraint dictionary_replacement_non_empty check (length(trim(replacement)) > 0),
  constraint dictionary_no_empty_loop check (
    lower(trim(term)) <> lower(trim(replacement))
  )
);

create table if not exists public.client_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_type text not null,
  severity text not null default 'info',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_events_type_non_empty check (length(trim(event_type)) > 0),
  constraint client_events_severity_allowlist check (
    severity in ('debug', 'info', 'warning', 'error')
  ),
  constraint client_events_metadata_max check (
    pg_column_size(metadata) <= 8192
  ),
  constraint client_events_metadata_no_sensitive_top_level_keys check (
    not (
      metadata ?| array[
        'api_key',
        'secret',
        'token',
        'audio',
        'raw_text',
        'transcript',
        'provider_payload'
      ]
    )
  )
);

create index if not exists user_settings_user_id_idx
on public.user_settings (user_id);

create index if not exists transcriptions_user_created_idx
on public.transcriptions (user_id, created_at desc);

create index if not exists clipboard_items_user_created_idx
on public.clipboard_items (user_id, created_at desc)
where deleted_at is null;

create index if not exists snippets_user_created_idx
on public.snippets (user_id, created_at desc)
where deleted_at is null;

create index if not exists dictionary_terms_user_created_idx
on public.dictionary_terms (user_id, created_at desc)
where deleted_at is null;

create index if not exists client_events_user_created_idx
on public.client_events (user_id, created_at desc);

create trigger set_updated_at_profiles
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_updated_at_user_settings
before update on public.user_settings
for each row execute function public.set_updated_at();

create trigger set_updated_at_transcriptions
before update on public.transcriptions
for each row execute function public.set_updated_at();

create trigger set_updated_at_clipboard_items
before update on public.clipboard_items
for each row execute function public.set_updated_at();

create trigger set_updated_at_snippets
before update on public.snippets
for each row execute function public.set_updated_at();

create trigger set_updated_at_dictionary_terms
before update on public.dictionary_terms
for each row execute function public.set_updated_at();

create trigger set_updated_at_client_events
before update on public.client_events
for each row execute function public.set_updated_at();

create trigger prevent_deleted_at_restore_clipboard_items
before update on public.clipboard_items
for each row execute function public.prevent_deleted_at_restore();

create trigger prevent_deleted_at_restore_snippets
before update on public.snippets
for each row execute function public.prevent_deleted_at_restore();

create trigger prevent_deleted_at_restore_dictionary_terms
before update on public.dictionary_terms
for each row execute function public.prevent_deleted_at_restore();

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.transcriptions enable row level security;
alter table public.clipboard_items enable row level security;
alter table public.snippets enable row level security;
alter table public.dictionary_terms enable row level security;
alter table public.client_events enable row level security;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;
grant select, insert, update, delete on public.transcriptions to authenticated;
grant select, insert, update, delete on public.clipboard_items to authenticated;
grant select, insert, update, delete on public.snippets to authenticated;
grant select, insert, update, delete on public.dictionary_terms to authenticated;
grant select, insert, update, delete on public.client_events to authenticated;

create policy profiles_select_own on public.profiles
for select to authenticated
using (auth.uid() is not null and auth.uid() = id);

create policy profiles_insert_own on public.profiles
for insert to authenticated
with check (auth.uid() is not null and auth.uid() = id);

create policy profiles_update_own on public.profiles
for update to authenticated
using (auth.uid() is not null and auth.uid() = id)
with check (auth.uid() is not null and auth.uid() = id);

create policy profiles_delete_own on public.profiles
for delete to authenticated
using (auth.uid() is not null and auth.uid() = id);

create policy user_settings_select_own on public.user_settings
for select to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

create policy user_settings_insert_own on public.user_settings
for insert to authenticated
with check (auth.uid() is not null and auth.uid() = user_id);

create policy user_settings_update_own on public.user_settings
for update to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy user_settings_delete_own on public.user_settings
for delete to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

create policy transcriptions_select_own on public.transcriptions
for select to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

create policy transcriptions_insert_own on public.transcriptions
for insert to authenticated
with check (auth.uid() is not null and auth.uid() = user_id);

create policy transcriptions_update_own on public.transcriptions
for update to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy transcriptions_delete_own on public.transcriptions
for delete to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

create policy clipboard_items_select_own on public.clipboard_items
for select to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

create policy clipboard_items_insert_own on public.clipboard_items
for insert to authenticated
with check (auth.uid() is not null and auth.uid() = user_id);

create policy clipboard_items_update_own on public.clipboard_items
for update to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy clipboard_items_delete_own on public.clipboard_items
for delete to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

create policy snippets_select_own on public.snippets
for select to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

create policy snippets_insert_own on public.snippets
for insert to authenticated
with check (auth.uid() is not null and auth.uid() = user_id);

create policy snippets_update_own on public.snippets
for update to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy snippets_delete_own on public.snippets
for delete to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

create policy dictionary_terms_select_own on public.dictionary_terms
for select to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

create policy dictionary_terms_insert_own on public.dictionary_terms
for insert to authenticated
with check (auth.uid() is not null and auth.uid() = user_id);

create policy dictionary_terms_update_own on public.dictionary_terms
for update to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy dictionary_terms_delete_own on public.dictionary_terms
for delete to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

create policy client_events_select_own on public.client_events
for select to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

create policy client_events_insert_own on public.client_events
for insert to authenticated
with check (auth.uid() is not null and auth.uid() = user_id);

create policy client_events_update_own on public.client_events
for update to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy client_events_delete_own on public.client_events
for delete to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

alter publication supabase_realtime add table public.transcriptions;
alter publication supabase_realtime add table public.clipboard_items;
alter publication supabase_realtime add table public.snippets;
alter publication supabase_realtime add table public.dictionary_terms;
alter publication supabase_realtime add table public.user_settings;
