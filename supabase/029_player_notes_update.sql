-- Run this in the Supabase SQL editor.
-- player_notes (015) intentionally shipped as an append-only log with no
-- update policy, same reasoning as the missing delete policy fixed in 028.
-- The admin UI now needs to be able to fix a typo/wrong note body though,
-- so this adds an update policy scoped to admins only - same shape as the
-- 028 delete policy, not opened up to regular players.

create policy "player_notes update by admin" on public.player_notes
  for update using (public.is_admin()) with check (public.is_admin());
