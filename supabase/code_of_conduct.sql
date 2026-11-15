-- Emerald Summit — Code of Conduct agreement
-- Run AFTER profiles_setup.sql. Additive; safe to re-run.
--
-- Every account agrees once, by ticking a box, before using the app or the
-- website: experts to the Speaker Policy, everyone else (participant,
-- spectator, volunteer, admin) to the Code of Conduct. Both are stored here;
-- the version string says which ("speaker-…" or "conduct-…"). New accounts see it right after the sign-up questions; accounts
-- that already exist see it the next time they open the app or the website.
-- The text lives in the clients (the app's lib/models/code_of_conduct.dart and
-- the website's src/models/codeOfConduct.ts) with a version string; when the
-- text changes, bump the version in both and everyone agrees again.
--
-- 1. profiles.code_of_conduct_version: the version they agreed to (null: not
--    yet).
-- 2. profiles.code_of_conduct_agreed_at: when.
-- 3. agree_to_code_of_conduct(p_version) records it for the caller, with the
--    server's clock, and returns the time.

alter table public.profiles
  add column if not exists code_of_conduct_version text,
  add column if not exists code_of_conduct_agreed_at timestamptz;

create or replace function public.agree_to_code_of_conduct(p_version text)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  v_at timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  if length(btrim(coalesce(p_version, ''))) = 0 then
    raise exception 'missing_version';
  end if;
  update public.profiles
     set code_of_conduct_version = btrim(p_version),
         code_of_conduct_agreed_at = v_at
   where id = auth.uid();
  return v_at;
end;
$$;

revoke all on function public.agree_to_code_of_conduct(text) from public, anon;
grant execute on function public.agree_to_code_of_conduct(text) to authenticated;
