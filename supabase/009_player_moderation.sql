-- Run this in the Supabase SQL editor.
-- Adds real columns for the admin "Players" section (verify / suspend / ban / admin notes),
-- which was previously a fully mock UI with nothing behind it in the database.

alter table public.profiles
  add column is_verified boolean not null default false,
  add column is_suspended boolean not null default false,
  add column suspended_until date,
  add column suspend_reason text,
  add column is_banned boolean not null default false,
  add column ban_reason text,
  add column admin_note text,
  add column admin_note_visibility text not null default 'admin' check (admin_note_visibility in ('admin', 'all'));

-- Extend the existing self-edit lock (003_profile_lock_fields.sql) so a player can never
-- write these moderation fields on their own profile via the API - only an admin can.
create or replace function public.enforce_profile_update_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.is_admin := old.is_admin;

  if not public.is_admin() then
    new.skill_level := old.skill_level;
    new.is_verified := old.is_verified;
    new.is_suspended := old.is_suspended;
    new.suspended_until := old.suspended_until;
    new.suspend_reason := old.suspend_reason;
    new.is_banned := old.is_banned;
    new.ban_reason := old.ban_reason;
    new.admin_note := old.admin_note;
    new.admin_note_visibility := old.admin_note_visibility;
  end if;

  return new;
end;
$$;

-- Banned/suspended players can't join events, request, or join a waitlist - enforced here at
-- the database level (not just hidden in the UI), matching the "Ban - cannot join any events"
-- copy already shown in the admin player profile screen.
drop policy if exists "participants insert self" on public.event_participants;
create policy "participants insert self" on public.event_participants
  for insert with check (
    auth.uid() = player_id
    and not exists (
      select 1 from public.profiles
      where id = auth.uid() and (is_banned or is_suspended)
    )
  );

drop policy if exists "requests insert self" on public.event_requests;
create policy "requests insert self" on public.event_requests
  for insert with check (
    auth.uid() = player_id
    and not exists (
      select 1 from public.profiles
      where id = auth.uid() and (is_banned or is_suspended)
    )
  );
