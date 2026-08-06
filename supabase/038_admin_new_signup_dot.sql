-- Run this in the Supabase SQL editor.
-- A plain dot (no count, no "which event" detail - just "something
-- happened") on the Admin nav icon whenever a real player self-joins an
-- event or sends a request/waitlist entry. It clears, per admin, once that
-- admin has opened every event that changed - matches how the Alerts dot
-- already works (unread notifications), just without an actual inbox.
--
-- "A real player self-joining" (not an admin adding a guest/player from
-- AdminEventDetail) is detected the same way the rest of this schema tells
-- self-service apart from admin action: auth.uid() = new.player_id. Admin
-- inserts use the admin's own auth.uid() as actor with a *different*
-- player_id, so they don't trip this.

alter table public.events add column last_activity_at timestamptz;

create table public.admin_event_seen (
  admin_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (admin_id, event_id)
);

alter table public.admin_event_seen enable row level security;

create policy "admin_event_seen own rows" on public.admin_event_seen
  for all using (admin_id = auth.uid()) with check (admin_id = auth.uid());

grant select, insert, update on public.admin_event_seen to authenticated;

create or replace function public.bump_event_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = new.player_id then
    update public.events set last_activity_at = now() where id = new.event_id;
  end if;
  return new;
end;
$$;

create trigger event_participants_bump_activity
after insert on public.event_participants
for each row execute function public.bump_event_activity();

create trigger event_requests_bump_activity
after insert on public.event_requests
for each row execute function public.bump_event_activity();

-- One RPC call from MainLayout (mirrors the unreadAlerts count query) instead
-- of the client trying to express "events with activity newer than this
-- admin's per-event seen_at, or never seen at all" through the query builder.
create or replace function public.admin_has_new_signups(p_admin_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.events e
    left join public.admin_event_seen s
      on s.event_id = e.id and s.admin_id = p_admin_id
    where e.last_activity_at is not null
      and (s.seen_at is null or s.seen_at < e.last_activity_at)
  );
$$;

grant execute on function public.admin_has_new_signups(uuid) to authenticated;
