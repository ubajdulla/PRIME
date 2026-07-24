-- Run this in the Supabase SQL editor.
-- Roster lock: once locked, a player already in the roster (event_participants)
-- can no longer leave. Everyone else (not yet joined, waitlist, pending request)
-- is unaffected, and admins keep full manual control regardless of lock state -
-- this is a player-facing self-service restriction only, enforced client-side
-- in EventDetail.tsx, same trust model as the rest of this app (RLS here still
-- only gates row ownership, not this kind of business-hour rule).
--
-- No cron/background job needed: follows the same compute-at-read-time pattern
-- as published_at/isPastDate (see 018_publish_at.sql) - the roster auto-locks
-- once the event's calendar day starts, just by comparing dates at render time.
-- roster_lock_override exists only so an admin can override that automatic
-- default in either direction: 'locked' locks early, 'unlocked' forces it back
-- open even after the automatic midnight cutoff already kicked in. NULL (the
-- default) means "follow the automatic midnight rule."
alter table public.events
  add column roster_lock_override text check (roster_lock_override in ('locked', 'unlocked'));
