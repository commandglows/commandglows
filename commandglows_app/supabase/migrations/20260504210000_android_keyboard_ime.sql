alter table public.user_settings
add column if not exists keyboard_voice_enabled boolean not null default true,
add column if not exists keyboard_clipboard_sync_enabled boolean not null default false,
add column if not exists keyboard_media_controls_enabled boolean not null default true,
add column if not exists keyboard_privacy_mode text not null default 'auto';

alter table public.user_settings
drop constraint if exists user_settings_keyboard_privacy_mode_allowlist;

alter table public.user_settings
add constraint user_settings_keyboard_privacy_mode_allowlist
check (keyboard_privacy_mode in ('auto', 'strict', 'standard'));

alter table public.transcriptions
drop constraint if exists transcriptions_source_allowlist;

alter table public.transcriptions
add constraint transcriptions_source_allowlist
check (source in ('free', 'advanced', 'overlay', 'keyboard'));

alter table public.clipboard_items
add column if not exists content_hash text,
add column if not exists origin_surface text not null default 'app',
add column if not exists origin_device_id text,
add column if not exists capture_method text not null default 'manual',
add column if not exists sync_state text not null default 'synced',
add column if not exists sync_error text,
add column if not exists device_local_id text;

alter table public.clipboard_items
drop constraint if exists clipboard_source_allowlist;

alter table public.clipboard_items
add constraint clipboard_source_allowlist
check (source in ('manual', 'voice', 'overlay', 'system', 'keyboard', 'keyboard_voice', 'keyboard_clipboard'));

alter table public.clipboard_items
drop constraint if exists clipboard_origin_surface_allowlist;

alter table public.clipboard_items
add constraint clipboard_origin_surface_allowlist
check (origin_surface in ('app', 'overlay', 'keyboard', 'system'));

alter table public.clipboard_items
drop constraint if exists clipboard_capture_method_allowlist;

alter table public.clipboard_items
add constraint clipboard_capture_method_allowlist
check (capture_method in ('manual', 'voice', 'overlay_voice', 'keyboard_voice', 'keyboard_clipboard', 'system_clipboard', 'snippet'));

alter table public.clipboard_items
drop constraint if exists clipboard_sync_state_allowlist;

alter table public.clipboard_items
add constraint clipboard_sync_state_allowlist
check (sync_state in ('local', 'pending', 'synced', 'error', 'deleted'));

alter table public.clipboard_items
drop constraint if exists clipboard_hash_non_empty;

alter table public.clipboard_items
add constraint clipboard_hash_non_empty
check (content_hash is null or length(trim(content_hash)) > 0);

create unique index if not exists clipboard_items_user_hash_surface_unique_idx
on public.clipboard_items (user_id, content_hash, origin_surface)
where deleted_at is null and content_hash is not null;
