-- Run this in the Supabase SQL editor.
-- TOURNAMENT events require the joining captain to name their team.
-- Nullable text column, mirrors 012_event_position.sql: collected at join
-- time (only for category = 'TOURNAMENT', enforced in the app, not a DB
-- constraint), editable afterwards by the event's admin moderator from the
-- roster.
alter table public.event_participants add column team_name text;
alter table public.event_requests add column team_name text;

-- Surface it on the public roster view too (021_guest_roster_visibility.sql),
-- alongside position, so guests browsing a tournament's roster see team
-- names, not just player names. Appended at the end of the select list -
-- create or replace view can only add new output columns there, not
-- reorder/remove existing ones.
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
  ep.team_name
from public.event_participants ep
join public.events e on e.id = ep.event_id
left join public.profiles pr on pr.id = ep.player_id
where e.status <> 'draft' and (e.published_at is null or e.published_at <= now());

grant select on public.public_roster to anon, authenticated;
