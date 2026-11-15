-- Emerald Summit: activity log
-- Run in the Supabase dashboard (or `supabase db query --linked -f ...`)
-- AFTER role_allowlist_setup.sql (is_admin), registrations_setup.sql,
-- session_volunteers_setup.sql and qr_checkin_setup.sql. Safe to re-run.
--
-- One row per thing a person did: made an account, finished sign-up, picked
-- a session, dropped one, switched how they take part, joined or left a team,
-- got checked in, and so on. Triggers on the tables write the rows, so the
-- app and the website are both covered and no client can skip it.
--
--   at               when it happened
--   actor_id         who did it (auth.uid(); null when the system did it)
--   user_id          whose record it is (same as actor_id unless an admin,
--                    expert or volunteer did it for them)
--   action           short name, see the list below
--   session_id       the session it was about, if any
--   details          snapshot of the useful bits (session title, old and new
--                    values). Titles are copied in so the row still reads
--                    right after a session is deleted.
--
-- Actions:
--   account_created, signed_up, role_changed, profile_edited,
--   agreed_to_code_of_conduct, account_deleted (row removed, see below),
--   registered, unregistered, removed_from_session, participation_changed,
--   joined_team, left_team, switched_team, project_edited, answers_edited,
--   checked_in, check_in_undone,
--   summit_checked_in, summit_check_in_undone,
--   volunteer_assigned, volunteer_unassigned
--
-- Only admins can read it. Nobody writes to it directly; the triggers run as
-- the owner. A logging error never blocks the real action: each trigger
-- catches its own errors and raises a warning instead.
--
-- When an account is deleted, that person's rows are deleted too (App Store
-- and Play require deleting a user's data with their account).

-- 1. Table -------------------------------------------------------------------
create table if not exists public.activity_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor_id    uuid,
  user_id     uuid,
  action      text not null,
  session_id  uuid,
  details     jsonb not null default '{}'::jsonb
);

create index if not exists activity_log_at_idx      on public.activity_log (at desc);
create index if not exists activity_log_user_idx    on public.activity_log (user_id, at desc);
create index if not exists activity_log_session_idx on public.activity_log (session_id, at desc);
create index if not exists activity_log_action_idx  on public.activity_log (action, at desc);

alter table public.activity_log enable row level security;

drop policy if exists "Admins read activity" on public.activity_log;
create policy "Admins read activity"
  on public.activity_log for select
  to authenticated
  using (public.is_admin());

revoke all on public.activity_log from anon;
revoke insert, update, delete, truncate on public.activity_log from authenticated;
grant select on public.activity_log to authenticated;  -- RLS above: admins only

-- 2. Helpers -----------------------------------------------------------------
create or replace function public.log_activity(
  p_action text,
  p_user_id uuid,
  p_session_id uuid default null,
  p_details jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.activity_log (actor_id, user_id, action, session_id, details)
  values (auth.uid(), p_user_id, p_action, p_session_id,
          coalesce(p_details, '{}'::jsonb));
end;
$$;

revoke all on function public.log_activity(text, uuid, uuid, jsonb) from public, anon, authenticated;

-- Session title + discipline, copied into details so the row survives the
-- session being deleted.
create or replace function public.activity_session_snapshot(p_session_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select jsonb_build_object('session_title', s.title,
                               'discipline_id', s.discipline_id,
                               'start_time', s.start_time)
       from public.sessions s where s.id = p_session_id),
    '{}'::jsonb);
$$;

revoke all on function public.activity_session_snapshot(uuid) from public, anon, authenticated;

-- True while an account is being deleted: auth.users is already gone when
-- the cascade reaches registrations, check-ins and assignments. Those rows
-- are skipped so nothing is left behind for a deleted person.
create or replace function public.activity_user_gone(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from auth.users where id = p_user_id);
$$;

revoke all on function public.activity_user_gone(uuid) from public, anon, authenticated;

-- 3. Profiles: account made, sign-up finished, role and profile changes ------
create or replace function public.activity_from_profiles()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  o jsonb;
  n jsonb;
  changed text[];
begin
  if tg_op = 'DELETE' then
    delete from public.activity_log where user_id = old.id;
    return old;
  end if;

  n := to_jsonb(new);

  if tg_op = 'INSERT' then
    perform public.log_activity('account_created', new.id, null,
      jsonb_build_object('email_domain', split_part(coalesce(new.email, ''), '@', 2)));
    if coalesce(new.onboarded, false) then
      perform public.log_activity('signed_up', new.id, null,
        jsonb_build_object('role', new.role,
                           'school', new.details ->> 'school',
                           'grade', new.details ->> 'grade'));
    end if;
    return new;
  end if;

  o := to_jsonb(old);

  if not coalesce(old.onboarded, false) and coalesce(new.onboarded, false) then
    perform public.log_activity('signed_up', new.id, null,
      jsonb_build_object('role', new.role,
                         'school', new.details ->> 'school',
                         'grade', new.details ->> 'grade'));
  elsif coalesce(old.onboarded, false) then
    if new.role is distinct from old.role then
      perform public.log_activity('role_changed', new.id, null,
        jsonb_build_object('from', old.role, 'to', new.role));
    end if;

    -- Which profile fields changed (names only, not values).
    select array_agg(k order by k) into changed
      from (
        select k from jsonb_object_keys(coalesce(new.details, '{}'::jsonb)) k
        union
        select k from jsonb_object_keys(coalesce(old.details, '{}'::jsonb)) k
      ) keys
     where (new.details -> k) is distinct from (old.details -> k);
    if new.full_name is distinct from old.full_name then
      changed := array_append(coalesce(changed, '{}'), 'full_name');
    end if;
    if changed is not null and cardinality(changed) > 0 then
      perform public.log_activity('profile_edited', new.id, null,
        jsonb_build_object('fields', to_jsonb(changed)));
    end if;
  end if;

  -- code_of_conduct.sql may not be run yet, so read the column by name.
  if (n ->> 'code_of_conduct_version') is not null
     and (n ->> 'code_of_conduct_version') is distinct from (o ->> 'code_of_conduct_version') then
    perform public.log_activity('agreed_to_code_of_conduct', new.id, null,
      jsonb_build_object('version', n ->> 'code_of_conduct_version'));
  end if;

  return new;
exception when others then
  raise warning 'activity_from_profiles: %', sqlerrm;
  return coalesce(new, old);
end;
$$;

drop trigger if exists activity_log_profiles on public.profiles;
create trigger activity_log_profiles
  after insert or update or delete on public.profiles
  for each row execute function public.activity_from_profiles();

-- 4. Registrations: the schedule ---------------------------------------------
create or replace function public.activity_from_registrations()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  snap jsonb;
  ot text;
  nt text;
begin
  snap := public.activity_session_snapshot(coalesce(new.session_id, old.session_id));

  if tg_op = 'INSERT' then
    perform public.log_activity('registered', new.user_id, new.session_id,
      snap || jsonb_build_object('participation_type', new.participation_type,
                                 'team_id', new.team_id));
    return new;
  end if;

  if tg_op = 'DELETE' then
    if public.activity_user_gone(old.user_id) then
      return old;
    end if;
    perform public.log_activity(
      case when auth.uid() is distinct from old.user_id and auth.uid() is not null
           then 'removed_from_session' else 'unregistered' end,
      old.user_id, old.session_id,
      snap || jsonb_build_object('participation_type', old.participation_type,
                                 'team_id', old.team_id,
                                 'registered_at', old.created_at));
    return old;
  end if;

  -- UPDATE
  if new.participation_type is distinct from old.participation_type then
    perform public.log_activity('participation_changed', new.user_id, new.session_id,
      snap || jsonb_build_object('from', old.participation_type,
                                 'to', new.participation_type));
  end if;

  if new.team_id is distinct from old.team_id then
    select t.code into ot from public.teams t where t.id = old.team_id;
    select t.code into nt from public.teams t where t.id = new.team_id;
    perform public.log_activity(
      case when old.team_id is null then 'joined_team'
           when new.team_id is null then 'left_team'
           else 'switched_team' end,
      new.user_id, new.session_id,
      snap || jsonb_build_object('from_team', old.team_id, 'from_code', ot,
                                 'to_team', new.team_id, 'to_code', nt));
  end if;

  if new.project_name is distinct from old.project_name
     or new.project_mode is distinct from old.project_mode then
    perform public.log_activity('project_edited', new.user_id, new.session_id,
      snap || jsonb_build_object('project_name', new.project_name,
                                 'project_mode', new.project_mode));
  end if;

  if new.answers is distinct from old.answers then
    perform public.log_activity('answers_edited', new.user_id, new.session_id, snap);
  end if;

  if coalesce(new.attended, false) is distinct from coalesce(old.attended, false) then
    perform public.log_activity(
      case when coalesce(new.attended, false) then 'checked_in' else 'check_in_undone' end,
      new.user_id, new.session_id, snap);
  end if;

  return new;
exception when others then
  raise warning 'activity_from_registrations: %', sqlerrm;
  return coalesce(new, old);
end;
$$;

drop trigger if exists activity_log_registrations on public.registrations;
create trigger activity_log_registrations
  after insert or update or delete on public.registrations
  for each row execute function public.activity_from_registrations();

-- 5. Front-desk summit check-in ----------------------------------------------
create or replace function public.activity_from_summit_checkins()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if coalesce(old.present, false) and not public.activity_user_gone(old.attendee_id) then
      perform public.log_activity('summit_check_in_undone', old.attendee_id);
    end if;
    return old;
  end if;

  if coalesce(new.present, false) is distinct from
     coalesce(case when tg_op = 'UPDATE' then old.present end, false) then
    perform public.log_activity(
      case when coalesce(new.present, false) then 'summit_checked_in'
           else 'summit_check_in_undone' end,
      new.attendee_id);
  end if;
  return new;
exception when others then
  raise warning 'activity_from_summit_checkins: %', sqlerrm;
  return coalesce(new, old);
end;
$$;

drop trigger if exists activity_log_summit_checkins on public.summit_checkins;
create trigger activity_log_summit_checkins
  after insert or update or delete on public.summit_checkins
  for each row execute function public.activity_from_summit_checkins();

-- 6. Volunteer assignments ---------------------------------------------------
create or replace function public.activity_from_session_volunteers()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity('volunteer_assigned', new.user_id, new.session_id,
      public.activity_session_snapshot(new.session_id)
        || jsonb_build_object('conflict_override', new.conflict_override));
    return new;
  end if;
  if public.activity_user_gone(old.user_id) then
    return old;
  end if;
  perform public.log_activity('volunteer_unassigned', old.user_id, old.session_id,
    public.activity_session_snapshot(old.session_id));
  return old;
exception when others then
  raise warning 'activity_from_session_volunteers: %', sqlerrm;
  return coalesce(new, old);
end;
$$;

drop trigger if exists activity_log_session_volunteers on public.session_volunteers;
create trigger activity_log_session_volunteers
  after insert or delete on public.session_volunteers
  for each row execute function public.activity_from_session_volunteers();

-- 7. Readable feed for admins ------------------------------------------------
-- Names and emails joined in. profiles RLS is own-row, so the view runs as
-- its owner to see every name, and the where clause limits it to admins.
drop view if exists public.activity_feed;
create view public.activity_feed as
select a.id,
       a.at,
       a.action,
       u.full_name  as user_name,
       u.email      as user_email,
       u.role       as user_role,
       case when a.actor_id is distinct from a.user_id then actor.full_name end as done_by,
       a.details ->> 'session_title' as session_title,
       a.session_id,
       a.user_id,
       a.actor_id,
       a.details
  from public.activity_log a
  left join public.profiles u     on u.id = a.user_id
  left join public.profiles actor on actor.id = a.actor_id
 where public.is_admin();

revoke all on public.activity_feed from public, anon;
grant select on public.activity_feed to authenticated;
