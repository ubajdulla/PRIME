-- Run this in the Supabase SQL editor.
-- player_notes (015) intentionally shipped as an append-only log with no
-- delete policy, specifically so history couldn't quietly disappear. The
-- admin UI now needs to be able to remove a wrong/duplicate note though, so
-- this adds a delete policy scoped to admins only - same permissiveness as
-- the existing insert policy, not opened up to regular players.

create policy "player_notes delete by admin" on public.player_notes
  for delete using (public.is_admin());
