-- The Alerts page purges each recipient's notifications older than the
-- retention window on every load, and lets recipients bulk-delete selected
-- notifications - both need delete rights on the recipient's own inbox
-- (previously only select/update existed).
create policy "notifications delete by recipient" on public.notifications
  for delete using (auth.uid() = recipient_id);
