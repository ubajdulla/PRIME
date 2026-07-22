-- Run this in the Supabase SQL editor.
-- "Publish later" scheduling: an admin can save an event now but keep it
-- invisible to players until a chosen date/time. NULL means "publish
-- immediately" (today's default behavior, unchanged). No cron job or
-- background process needed - matches this app's existing pattern of
-- computing state at read time (e.g. join_type in joinType.ts) instead of
-- storing it, so the event just becomes visible on its own once the clock
-- passes published_at.
alter table public.events
  add column published_at timestamptz;

drop policy if exists "events readable by everyone" on public.events;
create policy "events readable by everyone" on public.events
  for select using (
    (status <> 'draft' and (published_at is null or published_at <= now()))
    or public.is_admin()
  );
