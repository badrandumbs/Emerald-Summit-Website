-- Emerald Summit — admins see photo permission answers
-- Run AFTER code_of_conduct.sql and role_allowlist_setup.sql (is_admin).
-- Safe to re-run.
--
-- The Code of Conduct asks every non-expert account to GRANT or NOT GRANT
-- photo, video and audio permission (profiles.photo_consent). Admins need to
-- know who did not grant it, so photographers can leave them out.
-- profiles is own-row-only under RLS, so this admin-only function returns
-- every onboarded non-expert account with its answer:
--   photo_consent false: did not grant;
--   photo_consent null:  has not answered yet (has not agreed to the current
--                        Code of Conduct);
--   photo_consent true:  granted.
-- Experts are left out: the Guest Expert Policy has no photo question.

create or replace function public.fetch_photo_permissions()
returns table (
  user_id       uuid,
  full_name     text,
  email         text,
  role          text,
  school        text,
  photo_consent boolean,
  agreed_at     timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  return query
    select p.id, p.full_name, p.email, p.role, p.details ->> 'school',
           p.photo_consent, p.code_of_conduct_agreed_at
      from public.profiles p
     where p.onboarded and p.role <> 'expert'
     order by lower(coalesce(nullif(btrim(p.full_name), ''), p.email));
end;
$$;

revoke all on function public.fetch_photo_permissions() from public, anon;
grant execute on function public.fetch_photo_permissions() to authenticated;
