-- Run this in the Supabase SQL editor.
-- Replaces the manual yellow/red trust_label toggle with a reason picked
-- when an admin adds a note (No-show / Rude Behavior / Trustworthy). The
-- chosen reason becomes the profile's one active label, same single-value
-- column as before, just a richer domain. The label fades out and expires
-- once the player has joined 7 more events since it was set (a fresh note
-- with the same reason resets the counter) - computed client-side from
-- trust_label_set_at_events vs. the player's current events-joined count,
-- so no background job is needed and the note itself is never touched or
-- deleted, only the "current label" reads as expired once enough events
-- have passed.

alter table public.profiles
  drop constraint if exists profiles_trust_label_check;

alter table public.profiles
  add constraint profiles_trust_label_check
  check (trust_label in ('no_show', 'rude_behavior', 'trustworthy'));

alter table public.profiles
  add column trust_label_set_at_events integer;

alter table public.player_notes
  add column label text check (label in ('no_show', 'rude_behavior', 'trustworthy'));

-- Full redefinition of enforce_profile_update_rules() (Postgres has no
-- partial-alter for trigger functions) - identical to 016_player_trust_label.sql
-- with one addition: trust_label_set_at_events must be locked down for
-- non-admins exactly like trust_label itself, or a non-admin could leave
-- the decay snapshot pointing anywhere while trust_label reverts.
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
    new.skill_level              := old.skill_level;
    new.is_verified               := old.is_verified;
    new.is_suspended              := old.is_suspended;
    new.suspended_until           := old.suspended_until;
    new.suspend_reason            := old.suspend_reason;
    new.is_banned                 := old.is_banned;
    new.ban_reason                := old.ban_reason;
    new.admin_note                := old.admin_note;
    new.admin_note_visibility     := old.admin_note_visibility;
    new.trust_label               := old.trust_label;
    new.trust_label_set_at_events := old.trust_label_set_at_events;
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

