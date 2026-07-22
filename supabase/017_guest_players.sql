-- Run this in the Supabase SQL editor.
-- Restores "Add anonymous player" (was a UI-only mock before the backend
-- rewrite in commit b51960d, which replaced the roster with real
-- event_participants rows and dropped the anonymous-add card since it had
-- nothing to write to). A walk-in guest has no profile, so player_id has to
-- become nullable and a guest_name column carries the name instead. The
-- existing (event_id, player_id) unique constraint is untouched - Postgres
-- treats NULLs as distinct, so any number of guest rows can coexist per event.
alter table public.event_participants
  alter column player_id drop not null,
  add column guest_name text,
  add constraint event_participants_player_or_guest check (
    (player_id is not null and guest_name is null)
    or (player_id is null and guest_name is not null)
  );

-- "participants insert by admin" (012_event_position.sql) already allows an
-- admin to insert any row with no player_id restriction, and "participants
-- delete by admin" / "update by admin only" already allow admin writes by
-- primary key - so guest rows need no new RLS policies, just the schema
-- change above.
