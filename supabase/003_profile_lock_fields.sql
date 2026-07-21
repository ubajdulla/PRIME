-- Run this in the Supabase SQL editor.
-- Locks fields that must never be changed through the app itself:
--   is_admin    -> can ONLY be flipped manually in the SQL/Table editor (never via the app, by anyone).
--   skill_level -> can only be changed by an admin, never by the player editing their own profile
--                  (players re-leveling themselves would defeat the point of the leveling system).

create or replace function public.enforce_profile_update_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- is_admin never changes via the app, no matter who is making the request
  new.is_admin := old.is_admin;

  -- skill_level can only change if the person making the request is an admin
  if not public.is_admin() then
    new.skill_level := old.skill_level;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_enforce_update_rules on public.profiles;

create trigger profiles_enforce_update_rules
  before update on public.profiles
  for each row execute function public.enforce_profile_update_rules();

-- Replace the old update policy (it tried to lock is_admin by itself; the trigger above
-- now handles that, so the policy can simply be "you can update your own row").
drop policy if exists "profiles update own (not is_admin)" on public.profiles;

create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Admins can update ANY profile (e.g. to change someone else's skill_level).
create policy "profiles update by admin" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());
