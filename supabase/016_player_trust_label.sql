-- Run this in the Supabase SQL editor.
-- Manual admin-only moderator flag per player: 'yellow' (keep an eye on
-- them) or 'red' (excluded/problem player), meaning left up to whoever sets
-- it. Same wire-level hiding trick as visible_admin_note (013) - RLS is
-- row-level only, so a raw trust_label column would be readable by ANY
-- authenticated user for ANY profile; this computed column returns it only
-- when the viewer is an admin.

alter table public.profiles
  add column trust_label text check (trust_label in ('yellow', 'red'));

create or replace function public.visible_trust_label(p public.profiles)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case when public.is_admin() then p.trust_label else null end;
$$;

-- Full redefinition of enforce_profile_update_rules() (Postgres has no
-- partial-alter for trigger functions) - identical to 010_admin_hierarchy.sql
-- with one addition: a regular (non-admin) actor can never write
-- trust_label on any row. Unlike ban/suspend/skill_level, trust_label is
-- NOT locked in the "target is another admin, or editing own row" branch -
-- any admin can flag any player (including another admin) with it, same
-- permissiveness as admin notes, since it's an informal warning flag rather
-- than a punitive action.
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
    new.trust_label          := old.trust_label;
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
