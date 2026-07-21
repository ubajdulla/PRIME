-- Run this in the Supabase SQL editor.
-- Position becomes something chosen per event, not just the fixed profile
-- field. profiles.position stays as-is (just how a player identifies
-- themselves); event_participants/event_requests.position is what actually
-- shows on that event's roster once set. Required at join time for GAMES
-- events with level Advanced/Pro/PRIME (enforced in the app); the event's
-- admin moderator can also change it afterwards from the roster.
alter table public.event_participants add column position text;
alter table public.event_requests add column position text;

-- Separate bug found while touching this code: there was never a policy
-- letting an ADMIN insert/delete a row on someone else's behalf - only
-- "insert self" / "delete self" existed for event_participants. That
-- silently broke Approve Request, Move to Waitlist, Add from Waitlist,
-- and Remove from Event in the admin panel: the buttons looked like they
-- worked (the UI updates optimistically) but the write was rejected by
-- the database every time. event_requests already had admin-delete
-- covered, just not admin-insert.
create policy "participants insert by admin" on public.event_participants
  for insert with check (public.is_admin());

create policy "participants delete by admin" on public.event_participants
  for delete using (public.is_admin());

create policy "requests insert by admin" on public.event_requests
  for insert with check (public.is_admin());
