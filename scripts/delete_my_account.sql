-- delete_my_account(): lets a signed-in person delete their own account.
-- Used by the website's Profile > Delete account (src/services/auth.ts).
--
-- This repo owns no schema: copy this file into the app repo's supabase/
-- and run it on the shared project (dgrskmykbkvphnaasfzl) there.
--
-- It deletes the caller's auth.users row, nothing else, and only ever the
-- caller's (auth.uid()); there is no parameter to point it at someone else.
-- What happens to their data is up to the foreign keys: tables that
-- reference auth.users / profiles with ON DELETE CASCADE lose their rows,
-- SET NULL ones keep the row without the person. If any reference has no
-- ON DELETE rule, the whole delete fails and nothing changes (the website
-- shows "Couldn't delete your account"). Before running, check the
-- references, especially team ownership (a team owner leaving), volunteer
-- hours, bug reports and announcements, and pick cascade or set null for each.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_signed_in';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
