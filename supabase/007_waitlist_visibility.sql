-- Run this in the Supabase SQL editor.
-- The original policy only let a player see their OWN request/waitlist row
-- (or an admin see everything). But the event detail page shows a public
-- waitlist to everyone, matching the "Transparent Roster" idea from the
-- reference mockups. Pending "request to join" rows (kind = 'request') stay
-- private to the requester + admin (so an unapproved/rejected request isn't
-- visible to everyone), but waitlist rows are now visible to any logged-in
-- user.
drop policy if exists "requests readable own or admin" on public.event_requests;
create policy "requests readable" on public.event_requests
  for select using (
    (kind = 'waitlist' and auth.role() = 'authenticated')
    or auth.uid() = player_id
    or public.is_admin()
  );
