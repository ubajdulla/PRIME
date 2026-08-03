-- Run this in the Supabase SQL editor.
-- 24h-before-game reminder, in-app only for now (no Telegram bot yet - see
-- project notes). No pg_cron/edge function: this app already computes
-- publish-visibility at read time instead of via a background job
-- (018_publish_at.sql), so reminders follow the same pattern - each
-- logged-in player's own client checks its own upcoming roster spots on
-- app load and inserts its own reminder notification if missing
-- (src/app/lib/eventReminders.ts, called once from MainLayout).
--
-- That means a regular (non-admin) player now needs to insert into their
-- own inbox, which the original admin-only insert policy blocked.
drop policy if exists "notifications insert by admins" on public.notifications;
create policy "notifications insert by admins or self" on public.notifications
  for insert with check (public.is_admin() or auth.uid() = recipient_id);

-- Defense-in-depth against duplicate reminders (e.g. two tabs racing) -
-- the client also checks for an existing row first, this is the backstop.
create unique index notifications_reminder_dedupe
  on public.notifications (recipient_id, event_id)
  where type = 'event_reminder';
