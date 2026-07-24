-- Run this in the Supabase SQL editor.
-- Lets logged-out guests see the event roster + organizer (name/avatar/position/
-- verified only) in the Home feed and EventDetail, without opening
-- event_participants/profiles to anon - those tables also hold payment_status,
-- phone, email, telegram, birth_date, is_admin, which must stay hidden from
-- anyone without an account. Mirrors the existing event_join_counts() /
-- visible_trust_label() pattern: a narrow, whitelisted-column accessor instead
-- of broad RLS. Views run with the privileges of their owner (not the caller),
-- so they bypass the underlying tables' RLS just for these specific columns.
--
-- Matches the same guest-visibility rule as the "events readable by everyone"
-- policy (019_early_access_link.sql): not a draft, and not scheduled for the
-- future. Trust label is intentionally NOT included here - it's admin-only
-- moderation info (see 016_player_trust_label.sql), unrelated to what a guest
-- (or a regular logged-in player) should ever see on the public event page.

create view public.public_roster as
select
  ep.event_id,
  coalesce(pr.id, ep.id) as id,
  coalesce(pr.name, ep.guest_name, 'Unknown') as name,
  pr.avatar,
  coalesce(ep.position, pr."position") as position,
  coalesce(pr.is_verified, false) as is_verified,
  (ep.player_id is null) as is_guest,
  ep.joined_at
from public.event_participants ep
join public.events e on e.id = ep.event_id
left join public.profiles pr on pr.id = ep.player_id
where e.status <> 'draft' and (e.published_at is null or e.published_at <= now());

grant select on public.public_roster to anon, authenticated;

create view public.public_organizer as
select
  e.id as event_id,
  pr.id,
  pr.name,
  pr.avatar
from public.events e
join public.profiles pr on pr.id = e.moderator_id
where e.status <> 'draft' and (e.published_at is null or e.published_at <= now());

grant select on public.public_organizer to anon, authenticated;
