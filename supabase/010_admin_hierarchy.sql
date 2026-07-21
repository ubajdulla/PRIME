-- Run this in the Supabase SQL editor.
--
-- Adds the admin-hierarchy rules Kuba asked for on top of the existing
-- is_admin/skill_level lock (003_profile_lock_fields.sql):
--
--   - A regular admin can NEVER ban, suspend, or change the skill_level of
--     another admin, or of themselves. They can still write admin notes.
--   - A regular admin can never promote a player to a skill_level higher
--     than their own.
--   - Every profile with is_admin = true is forced is_verified = true
--     (an admin account is always considered identity-verified).
--   - One superadmin - identified by login email ubajdulla@seznam.cz, not
--     by any editable profile field - bypasses all of the above. is_admin
--     itself is still SQL-editor-only, even for the superadmin, matching
--     the original "never via the app, by anyone" decision.
--
-- IMPORTANT BUG FIX: the previous version of this trigger locked its
-- fields unconditionally, with no exception for direct database access.
-- That meant even YOU editing is_admin/skill_level by hand in the SQL or
-- Table editor was being silently reverted by the trigger - it only
-- appeared to work the first time because that edit happened before this
-- trigger existed. This version trusts requests with no JWT context at
-- all (auth.uid() is null) - which is only possible from inside the
-- Supabase dashboard itself, never from the app - and lets those through
-- untouched.

create or replace function public.is_superadmin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((auth.jwt() ->> 'email') = 'ubajdulla@seznam.cz', false);
$$;

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
  -- Direct DB access (SQL editor / Table editor) has no JWT at all - only
  -- Kuba can reach that. Trust it completely, no restrictions below apply.
  if auth.uid() is null then
    return new;
  end if;

  -- is_admin never changes through the app, no matter who's asking.
  new.is_admin := old.is_admin;

  if public.is_superadmin() then
    if new.is_admin then new.is_verified := true; end if;
    return new;
  end if;

  select is_admin, skill_level into actor_is_admin, actor_skill
  from public.profiles where id = auth.uid();

  if not coalesce(actor_is_admin, false) then
    -- a regular player can never touch moderation/skill fields on any row
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
    -- target is another admin, or the actor is editing their own row:
    -- ban/suspend/skill-level are off-limits, notes are still allowed
    new.is_banned        := old.is_banned;
    new.ban_reason        := old.ban_reason;
    new.is_suspended      := old.is_suspended;
    new.suspended_until   := old.suspended_until;
    new.suspend_reason    := old.suspend_reason;
    new.skill_level       := old.skill_level;
  elsif new.skill_level is distinct from old.skill_level then
    -- a regular admin can move a player up/down, but never above their own level
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
