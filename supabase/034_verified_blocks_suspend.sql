-- Run this in the Supabase SQL editor.
-- A verified player can never end up suspended. The app's Suspend button
-- already disables itself for a verified player, but that's client-side
-- only - the superadmin (or anyone bypassing the UI) still went through
-- enforce_profile_update_rules() (010_admin_hierarchy.sql), which returns
-- early for the superadmin before any of these checks run. That early
-- return is correct for hierarchy permissions (can the actor ban another
-- admin, etc.) but "verified implies not suspended" isn't a permission -
-- it's a data-integrity invariant that should hold no matter who's asking,
-- superadmin included. So this check is placed before the superadmin
-- early-return, not after.
create or replace function public.enforce_profile_update_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_is_admin  boolean;
  actor_skill     text;
  actor_rank      int;
  target_rank     int;
  levels          text[] := array['Rookie', 'Beginner', 'Intermediate', 'Advanced', 'Pro', 'PRIME'];
begin
  if auth.uid() is null then
    return new;
  end if;

  new.is_admin := old.is_admin;

  -- Verified + suspended can never coexist, regardless of actor.
  if coalesce(new.is_verified, old.is_verified) and new.is_suspended then
    new.is_suspended    := false;
    new.suspended_until := null;
    new.suspend_reason  := null;
  end if;

  if public.is_superadmin() then
    if new.is_admin then new.is_verified := true; end if;
    return new;
  end if;

  select is_admin, skill_level into actor_is_admin, actor_skill
  from public.profiles where id = auth.uid();

  if not coalesce(actor_is_admin, false) then
    new.skill_level         := old.skill_level;
    new.is_verified          := old.is_verified;
    new.is_suspended         := old.is_suspended;
    new.suspended_until      := old.suspended_until;
    new.suspend_reason       := old.suspend_reason;
    new.is_banned            := old.is_banned;
    new.ban_reason           := old.ban_reason;
    new.admin_note           := old.admin_note;
    new.admin_note_visibility := old.admin_note_visibility;
  elsif old.is_admin or auth.uid() = old.id then
    new.is_banned        := old.is_banned;
    new.ban_reason        := old.ban_reason;
    new.is_suspended      := old.is_suspended;
    new.suspended_until   := old.suspended_until;
    new.suspend_reason    := old.suspend_reason;
    new.skill_level       := old.skill_level;
  elsif new.skill_level is distinct from old.skill_level then
    actor_rank  := array_position(levels, actor_skill);
    target_rank := array_position(levels, new.skill_level);
    if target_rank is null or actor_rank is null or target_rank > actor_rank then
      new.skill_level := old.skill_level;
    end if;
  end if;

  if new.is_admin then
    new.is_verified := true;
  end if;

  return new;
end;
$$;
