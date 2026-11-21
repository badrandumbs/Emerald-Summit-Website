-- Emerald Summit — posters can edit their own announcements
-- Run AFTER announcements_insert_lockdown.sql and notifications_setup.sql.
-- Safe to re-run. Additive only: one new nullable column.
--
-- An admin, or a volunteer who may post to a discipline (a track organizer),
-- can fix the title, text and attachments of a post they wrote. Readers see
-- the new text and a small "edited" label, and nothing else changes for them:
--   * no new banner, notification or unread dot (those fire on INSERT only,
--     and announcement_reads is keyed by the post's id);
--   * the post keeps its place in the feed (ordered by created_at);
--   * the bell's "X posted to Y" note picks up a new title without being
--     marked unread again.
--
--  1. announcements.edited_at: set by the database when an edit from the API
--     changes the title, body or attachments. Pinning does not count, and the
--     client can't set it itself.
--  2. An UPDATE policy for the post's own author. Admins already had
--     "Admins update announcements" (any post); this adds the author, while
--     they can still post to that discipline.
--  3. A guard trigger: a non-admin's update can only change title, body and
--     attachments; every other column keeps its old value.
--  4. notify_from_announcement_update also refreshes the bell's copy of an
--     edited post's title, quietly (read_at stays as it was).

-- 1. Column ---------------------------------------------------------------------
alter table public.announcements
  add column if not exists edited_at timestamptz;

-- 2. Authors update their own posts ----------------------------------------------
drop policy if exists "Authors update own announcements" on public.announcements;
create policy "Authors update own announcements"
  on public.announcements for update
  to authenticated
  using (
    created_by = auth.uid()
    and discipline_id is not null
    and target_user_id is null
    and session_id is null
    and public.can_post_to_discipline(discipline_id)
  )
  with check (
    created_by = auth.uid()
    and discipline_id is not null
    and target_user_id is null
    and session_id is null
    and public.can_post_to_discipline(discipline_id)
  );

-- 3. Guard + edited_at -------------------------------------------------------------
-- Not SECURITY DEFINER on purpose: current_user has to be the caller's role.
-- Updates from SECURITY DEFINER functions (the system's own notices, which
-- are rewritten in place) run as the owner and pass through untouched.
create or replace function public.announcement_edit_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if not public.is_admin() then
    new.id             := old.id;
    new.created_by     := old.created_by;
    new.created_at     := old.created_at;
    new.author         := old.author;
    new.audience       := old.audience;
    new.discipline_id  := old.discipline_id;
    new.target_user_id := old.target_user_id;
    new.session_id     := old.session_id;
    new.pinned         := old.pinned;
  end if;

  if new.title is distinct from old.title
     or new.body is distinct from old.body
     or new.attachments is distinct from old.attachments then
    new.edited_at := now();
  else
    new.edited_at := old.edited_at;
  end if;
  return new;
end;
$$;

drop trigger if exists announcement_edit_guard on public.announcements;
create trigger announcement_edit_guard
  before update on public.announcements
  for each row execute function public.announcement_edit_guard();

-- 4. Bell notes follow an edited title, quietly -------------------------------------
create or replace function public.notify_from_announcement_update()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.target_user_id is not null then
    -- A personal notice rewritten in place (the admins' "experts waiting" and
    -- "problem with the Google Sheet" notices) shows as unread again.
    if new.title is distinct from old.title or new.body is distinct from old.body then
      update public.notifications
         set title = new.title, body = new.body, read_at = null
       where announcement_id = new.id;
    end if;
  elsif new.title is distinct from old.title then
    -- An edited post: the note's body is the post's title. read_at is left
    -- alone so readers aren't told anything changed.
    update public.notifications
       set body = new.title
     where announcement_id = new.id
       and kind = 'announcement';
  end if;
  return new;
end;
$$;

drop trigger if exists notify_from_announcement_update on public.announcements;
create trigger notify_from_announcement_update
  after update of title, body on public.announcements
  for each row execute function public.notify_from_announcement_update();
