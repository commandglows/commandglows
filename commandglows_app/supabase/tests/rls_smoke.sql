begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

create or replace function public.test_statement_throws(statement text)
returns boolean
language plpgsql
as $$
begin
  execute statement;
  return false;
exception when others then
  return true;
end;
$$;

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-000000000001', 'commandglows_app-user-a@example.test'),
  ('00000000-0000-0000-0000-000000000002', 'commandglows_app-user-b@example.test');

insert into public.clipboard_items (id, user_id, content, source)
values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'user b clipboard',
  'manual'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  $$insert into public.transcriptions (raw_text, cleaned_text, source, duration_ms)
    values ('hello', 'Hello.', 'free', 1000)$$,
  'authenticated user can insert own transcription through auth.uid default'
);

select results_eq(
  $$select count(*) from public.transcriptions where user_id = '00000000-0000-0000-0000-000000000001'::uuid$$,
  $$values (1::bigint)$$,
  'own insert is scoped to auth.uid'
);

select lives_ok(
  $$insert into public.transcriptions (raw_text, cleaned_text, source, duration_ms)
    values ('keyboard hello', 'Keyboard hello.', 'keyboard', 500)$$,
  'keyboard transcription source is allowed'
);

select ok(
  public.test_statement_throws(
    $$insert into public.transcriptions (raw_text, cleaned_text, source, duration_ms)
      values ('bad', 'bad', 'global_keyboard_capture', 1)$$
  ),
  'unknown transcription source is denied'
);

select ok(
  public.test_statement_throws(
    $$insert into public.transcriptions (user_id, raw_text, cleaned_text, source, duration_ms)
      values ('00000000-0000-0000-0000-000000000002', 'forged', 'forged', 'free', 1000)$$
  ),
  'forged user_id insert is denied'
);

select ok(
  public.test_statement_throws(
    $$insert into public.transcriptions (raw_text, cleaned_text, source, duration_ms)
      values ('', '', 'free', 0)$$
  ),
  'empty transcription is denied'
);

select is_empty(
  $$select id from public.clipboard_items where user_id = '00000000-0000-0000-0000-000000000002'::uuid$$,
  'user A cannot select user B clipboard rows'
);

select results_eq(
  $$update public.clipboard_items
      set content = 'hacked'
      where id = '10000000-0000-0000-0000-000000000001'
      returning id$$,
  $$select null::uuid where false$$,
  'user A cannot update user B clipboard row'
);

select results_eq(
  $$delete from public.clipboard_items
      where id = '10000000-0000-0000-0000-000000000001'
      returning id$$,
  $$select null::uuid where false$$,
  'user A cannot delete user B clipboard row'
);

select lives_ok(
  $$insert into public.snippets (trigger, content) values ('sig', 'Best regards')$$,
  'user can insert a snippet'
);

select ok(
  public.test_statement_throws(
    $$insert into public.snippets (trigger, content) values ('SIG', 'Duplicate should fail')$$
  ),
  'duplicate snippet trigger is denied case-insensitively per user'
);

select lives_ok(
  $$insert into public.dictionary_terms (term, replacement, case_sensitive)
    values ('vm', 'voice memo', false)$$,
  'user can insert dictionary term'
);

select ok(
  public.test_statement_throws(
    $$insert into public.dictionary_terms (term, replacement, case_sensitive)
      values ('same', 'same', false)$$
  ),
  'dictionary self-replacement loop is denied'
);

select lives_ok(
  $$insert into public.clipboard_items (id, content, source)
    values ('10000000-0000-0000-0000-000000000002', 'to delete', 'manual')$$,
  'user can insert clipboard item'
);

select lives_ok(
  $$insert into public.clipboard_items (
      id,
      content,
      source,
      content_hash,
      normalized_hash,
      origin_device_id,
      origin_surface,
      capture_method,
      sync_state,
      capture_count,
      source_metadata
    )
    values (
      '10000000-0000-0000-0000-000000000003',
      'keyboard item',
      'keyboard_clipboard',
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      'android:test-device',
      'keyboard',
      'keyboard_clipboard',
      'pending',
      1,
      '{"capture_count":1}'::jsonb
    )$$,
  'keyboard clipboard metadata is allowed'
);

select lives_ok(
  $$insert into public.clipboard_items (
        content,
        source,
        content_hash,
        normalized_hash,
        origin_device_id,
        origin_surface,
        capture_method,
        sync_state,
        capture_count,
        source_metadata
      )
      values (
        'keyboard item duplicate',
        'keyboard_clipboard',
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        'android:test-device',
        'keyboard',
        'keyboard_clipboard',
        'pending',
        1,
        '{"capture_count":1}'::jsonb
      )$$,
  'keyboard clipboard duplicate hashes are allowed for app-level window dedupe'
);

update public.clipboard_items
set deleted_at = now()
where id = '10000000-0000-0000-0000-000000000002';

update public.clipboard_items
set deleted_at = null, content = 'stale edit'
where id = '10000000-0000-0000-0000-000000000002';

select is(
  exists (
    select 1
    from public.clipboard_items
    where id = '10000000-0000-0000-0000-000000000002'
      and deleted_at is not null
  ),
  true,
  'stale update cannot clear a clipboard tombstone'
);

select ok(
  public.test_statement_throws(
    $$insert into public.client_events (event_type, severity, metadata)
      values ('debug', 'info', '{"token":"secret"}'::jsonb)$$
  ),
  'client event metadata rejects sensitive top-level keys'
);

select ok(
  public.test_statement_throws(
    $$insert into public.client_events (event_type, severity, metadata)
      values ('debug', 'info', '{"raw_text":"secret"}'::jsonb)$$
  ),
  'client event metadata rejects keyboard raw text'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is_empty(
  $$select id from public.transcriptions$$,
  'unauthenticated role cannot read user rows'
);

select * from finish();

rollback;
