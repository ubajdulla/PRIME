-- Run this in the Supabase SQL editor.
-- "Early access" links: an admin sends a direct /events/:id link to specific
-- players before an event is generally published (still draft, or scheduled
-- for later). Any LOGGED-IN user who has the link can now open and join it -
-- only logged-out visitors and the general Home feed still can't see it.
-- Home.tsx's own query already filters out draft/scheduled events app-side
-- (independent of RLS), so this does NOT make early-access events show up
-- in anyone's normal browsing - only a direct link (unguessable UUID) works.
-- Joining was never gated on event status in the first place (see
-- "participants insert self" in schema.sql / 009_player_moderation.sql), so
-- no change needed there - visibility is the only piece being relaxed here.
drop policy if exists "events readable by everyone" on public.events;
create policy "events readable by everyone" on public.events
  for select using (
    (status <> 'draft' and (published_at is null or published_at <= now()))
    or auth.role() = 'authenticated'
  );
