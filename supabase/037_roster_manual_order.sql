-- Run this in the Supabase SQL editor.
-- Lets an admin manually reorder the roster (e.g. move a player up for a
-- nicer-looking lineup) via the new up/down arrows in AdminEventDetail. The
-- chosen order is what everyone sees - AdminEventDetail and the player-facing
-- EventDetail (both event_participants and the public_roster view, see
-- 021_guest_roster_visibility.sql) now order by sort_order instead of
-- joined_at.

alter table public.event_participants add column sort_order integer not null default 0;

-- Backfill existing rows with their current display order (by joined_at),
-- per event, so nothing visibly reshuffles on deploy.
with ranked as (
  select id, row_number() over (partition by event_id order by joined_at asc) as rn
  from public.event_participants
)
update public.event_participants ep
set sort_order = ranked.rn
from ranked
where ep.id = ranked.id;

-- Auto-assign sort_order on insert (append to the end of that event's
-- roster) so none of the existing insert call sites need to compute it.
create or replace function public.set_event_participant_sort_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sort_order is null or new.sort_order = 0 then
    select coalesce(max(sort_order), 0) + 1 into new.sort_order
    from public.event_participants
    where event_id = new.event_id;
  end if;
  return new;
end;
$$;

create trigger event_participants_set_sort_order
before insert on public.event_participants
for each row execute function public.set_event_participant_sort_order();

-- public_roster (guest-visible view) needs the column too, so EventDetail
-- can order guests' view the same way as everyone else's. Appended at the
-- end of the select list, same reasoning as 024_event_team_name.sql -
-- create or replace view can only add columns there, not reorder them.
create or replace view public.public_roster as
select
  ep.event_id,
  coalesce(pr.id, ep.id) as id,
  coalesce(pr.name, ep.guest_name, 'Unknown') as name,
  pr.avatar,
  coalesce(ep.position, pr."position") as position,
  coalesce(pr.is_verified, false) as is_verified,
  (ep.player_id is null) as is_guest,
  ep.joined_at,
  ep.team_name,
  ep.sort_order
from public.event_participants ep
join public.events e on e.id = ep.event_id
left join public.profiles pr on pr.id = ep.player_id
where e.status <> 'draft' and (e.published_at is null or e.published_at <= now());

grant select on public.public_roster to anon, authenticated;
