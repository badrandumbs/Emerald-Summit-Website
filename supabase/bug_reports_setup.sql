-- Emerald Summit — bug reports and feedback
-- Run AFTER profiles_setup.sql, registrations_setup.sql, teams_setup.sql,
-- session_volunteers_setup.sql, session_participant_removal.sql,
-- attendance_setup.sql, notifications_setup.sql, volunteer_hours_setup.sql,
-- summit_followup_setup.sql and role_allowlist_setup.sql. Safe to re-run.
--
-- Anyone signed in can send a bug report or feedback from Profile. A report is
-- one row: what the person wrote (name, description, screenshots), what their
-- browser or phone sent about itself (`client`: page history, recent errors,
-- failed requests, device, build), and a snapshot of their account that this
-- file builds on the server (`snapshot`), so it can't be edited or faked by
-- the client and is the same whether the website or the app sent it.
--
-- What the snapshot holds, and why (each is something a developer would ask
-- for first when fixing a bug):
--   * auth: sign-in email, account age, last sign-in, providers (Google vs
--     code). Sign-in bugs depend on these.
--   * profile: every profiles column (role, subtype, capabilities, expert
--     status, onboarded…) and the sign-up answers, MINUS phone and student
--     id, which no bug needs.
--   * registrations: each session on their day with its time, room,
--     participation type, team and answers. Most bugs are about a schedule.
--   * managing: sessions they're assigned to run.
--   * removed_from: sessions an organizer removed them from (why "I can't
--     rejoin").
--   * checkin, allowlist rows, the last 10 notifications, the last 10
--     volunteer hour logs, and the website switches (summit_settings).
--   * earlier_reports: how many reports they've sent before.
--
-- Sending is one call: submit_bug_report(). It checks the input, keeps only
-- screenshots that are really in the caller's own folder, limits each person
-- to 10 reports an hour, and returns the ticket number. The email copy is the
-- bug-report-email Edge Function's job (supabase/functions/bug-report-email),
-- which the client calls right after; a report is saved even when email
-- isn't set up yet.
--
-- Who can read reports: the sender (their own) and admins (all). Admins mark
-- a report open or resolved with set_bug_report_status(). Nobody writes the
-- table directly.

-- 1. Table ---------------------------------------------------------------------
create table if not exists public.bug_reports (
  -- The client picks the id so it can upload screenshots into
  -- `<user_id>/<report_id>/` before the row exists.
  id            uuid primary key,
  ticket_no     bigint generated always as identity unique,
  user_id       uuid references auth.users (id) on delete set null,
  kind          text not null default 'bug' check (kind in ('bug', 'feedback')),
  reporter_name text not null check (length(btrim(reporter_name)) between 1 and 120),
  description   text not null check (length(btrim(description)) between 1 and 5000),
  -- Storage paths in the bug_report_screenshots bucket.
  screenshots   text[] not null default '{}' check (cardinality(screenshots) <= 5),
  email_copy    boolean not null default false,
  client        jsonb not null default '{}'::jsonb,
  snapshot      jsonb not null default '{}'::jsonb,
  status        text not null default 'open' check (status in ('open', 'resolved')),
  resolved_at   timestamptz,
  -- Set by the Edge Function when it has sent the emails (or tried).
  emailed_at    timestamptz,
  email_error   text,
  created_at    timestamptz not null default now()
);

create index if not exists bug_reports_user_idx on public.bug_reports (user_id, created_at desc);
create index if not exists bug_reports_status_idx on public.bug_reports (status, created_at desc);

alter table public.bug_reports enable row level security;
revoke all on public.bug_reports from anon, authenticated;
grant select on public.bug_reports to authenticated;
grant select, insert, update on public.bug_reports to service_role;

drop policy if exists "Read own reports, admins read all" on public.bug_reports;
create policy "Read own reports, admins read all"
  on public.bug_reports for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- 2. Screenshots bucket ---------------------------------------------------------
-- Private: screenshots can show anything on someone's screen. Each person
-- uploads into their own folder (`<user_id>/<report_id>/<file>`); they and
-- admins can read it, through signed links.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bug_report_screenshots', 'bug_report_screenshots', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Upload own bug screenshots" on storage.objects;
create policy "Upload own bug screenshots"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'bug_report_screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Read own bug screenshots, admins all" on storage.objects;
create policy "Read own bug screenshots, admins all"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'bug_report_screenshots'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- So someone can take back a screenshot they attached and then removed.
drop policy if exists "Delete own bug screenshots" on storage.objects;
create policy "Delete own bug screenshots"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'bug_report_screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. The account snapshot ----------------------------------------------------------
create schema if not exists private;

create or replace function private.bug_report_snapshot(p_user uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'captured_at', now(),
    'auth', (
      select jsonb_build_object(
        'email', u.email,
        'created_at', u.created_at,
        'last_sign_in_at', u.last_sign_in_at,
        'email_confirmed_at', u.email_confirmed_at,
        'providers', u.raw_app_meta_data -> 'providers')
        from auth.users u where u.id = p_user),
    'profile', (
      select (to_jsonb(p) - 'details')
             || jsonb_build_object('details', coalesce(p.details, '{}'::jsonb) - array['phone', 'student_id'])
        from public.profiles p where p.id = p_user),
    'registrations', coalesce((
      select jsonb_agg(
               (to_jsonb(r) - 'user_id')
               || jsonb_build_object(
                    'session', jsonb_build_object(
                      'title', s.title, 'discipline_id', s.discipline_id, 'track', s.track,
                      'room', s.room, 'start_time', s.start_time, 'end_time', s.end_time,
                      'capacity', s.capacity),
                    'team', (
                      select (to_jsonb(t) - 'code')
                             || jsonb_build_object('members', (
                                  select count(*) from public.registrations m where m.team_id = t.id))
                        from public.teams t where t.id = r.team_id))
               order by s.start_time, s.title)
        from public.registrations r
        join public.sessions s on s.id = r.session_id
       where r.user_id = p_user), '[]'::jsonb),
    'managing', coalesce((
      select jsonb_agg(
               (to_jsonb(v) - 'user_id')
               || jsonb_build_object('session', jsonb_build_object(
                    'title', s.title, 'room', s.room, 'start_time', s.start_time, 'end_time', s.end_time))
               order by s.start_time)
        from public.session_volunteers v
        join public.sessions s on s.id = v.session_id
       where v.user_id = p_user), '[]'::jsonb),
    'removed_from', coalesce((
      select jsonb_agg((to_jsonb(x) - 'user_id') || jsonb_build_object('session_title', s.title)
                       order by x.removed_at desc)
        from public.session_removals x
        join public.sessions s on s.id = x.session_id
       where x.user_id = p_user), '[]'::jsonb),
    'checkin', (
      select to_jsonb(c) - 'attendee_id' from public.summit_checkins c where c.attendee_id = p_user),
    'allowlist', coalesce((
      select jsonb_agg(to_jsonb(a) - 'email')
        from public.role_allowlist a
       where lower(a.email) = lower((select email from auth.users where id = p_user))), '[]'::jsonb),
    'recent_notifications', coalesce((
      select jsonb_agg(jsonb_build_object(
               'kind', n.kind, 'title', n.title, 'body', left(n.body, 300),
               'session_id', n.session_id, 'announcement_id', n.announcement_id,
               'created_at', n.created_at, 'read_at', n.read_at)
               order by n.created_at desc)
        from (select * from public.notifications
               where user_id = p_user order by created_at desc limit 10) n), '[]'::jsonb),
    'recent_volunteer_hours', coalesce((
      select jsonb_agg(to_jsonb(h) - 'user_id')
        from (select * from public.volunteer_hour_logs
               where user_id = p_user order by created_at desc limit 10) h), '[]'::jsonb),
    'summit_settings', (select to_jsonb(ss) from public.summit_settings ss limit 1),
    'earlier_reports', (select count(*) from public.bug_reports b where b.user_id = p_user)
  );
$$;

revoke all on function private.bug_report_snapshot(uuid) from public, anon, authenticated;

-- 4. Sending a report --------------------------------------------------------------
create or replace function public.submit_bug_report(
  p_id           uuid,
  p_kind         text,
  p_name         text,
  p_description  text,
  p_screenshots  text[],
  p_client       jsonb,
  p_email_copy   boolean
)
returns table (id uuid, ticket_no bigint)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_user  uuid := auth.uid();
  v_shots text[];
  v_row   public.bug_reports;
begin
  if v_user is null then
    raise exception 'not_signed_in';
  end if;
  if p_id is null then
    raise exception 'missing_id';
  end if;
  if coalesce(p_kind, '') not in ('bug', 'feedback') then
    raise exception 'bad_kind';
  end if;
  if length(btrim(coalesce(p_name, ''))) = 0 then
    raise exception 'name_required';
  end if;
  if length(btrim(coalesce(p_description, ''))) = 0 then
    raise exception 'description_required';
  end if;
  if length(btrim(p_name)) > 120 or length(btrim(p_description)) > 5000 then
    raise exception 'too_long';
  end if;
  if octet_length(coalesce(p_client, '{}'::jsonb)::text) > 200000 then
    raise exception 'client_too_large';
  end if;
  if (select count(*) from public.bug_reports b
       where b.user_id = v_user and b.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'too_many_reports';
  end if;

  -- Only screenshots that were really uploaded into this report's folder.
  select coalesce(array_agg(s order by ord), '{}')
    into v_shots
    from unnest(coalesce(p_screenshots, '{}')) with ordinality as t(s, ord)
   where ord <= 5
     and s like v_user::text || '/' || p_id::text || '/%'
     and exists (select 1 from storage.objects o
                  where o.bucket_id = 'bug_report_screenshots' and o.name = s);

  insert into public.bug_reports
    (id, user_id, kind, reporter_name, description, screenshots, email_copy, client, snapshot)
  values
    (p_id, v_user, p_kind, btrim(p_name), btrim(p_description), v_shots,
     coalesce(p_email_copy, false), coalesce(p_client, '{}'::jsonb),
     private.bug_report_snapshot(v_user))
  returning * into v_row;

  return query select v_row.id, v_row.ticket_no;
end;
$$;

revoke all on function public.submit_bug_report(uuid, text, text, text, text[], jsonb, boolean) from public, anon;
grant execute on function public.submit_bug_report(uuid, text, text, text, text[], jsonb, boolean) to authenticated;

-- 5. Admins: open / resolved --------------------------------------------------------
create or replace function public.set_bug_report_status(p_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  if p_status not in ('open', 'resolved') then
    raise exception 'bad_status';
  end if;
  update public.bug_reports
     set status = p_status,
         resolved_at = case when p_status = 'resolved' then now() else null end
   where bug_reports.id = p_id;
end;
$$;

revoke all on function public.set_bug_report_status(uuid, text) from public, anon;
grant execute on function public.set_bug_report_status(uuid, text) to authenticated;
