-- Run this in the Supabase SQL editor.
-- Lets moderators attach one PDF (rules, schedule, ...) to an event, shown
-- in the info panel next to the description. Mirrors 004_avatar_storage.sql
-- for the bucket, but write access is admin-only instead of self-only.

alter table public.events add column attachment_url text;
alter table public.events add column attachment_name text;

insert into storage.buckets (id, name, public)
values ('event-attachments', 'event-attachments', true)
on conflict (id) do nothing;

drop policy if exists "event attachments are publicly accessible" on storage.objects;
create policy "event attachments are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'event-attachments');

drop policy if exists "admins can upload event attachments" on storage.objects;
create policy "admins can upload event attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'event-attachments'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

drop policy if exists "admins can replace event attachments" on storage.objects;
create policy "admins can replace event attachments"
  on storage.objects for update
  using (
    bucket_id = 'event-attachments'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

drop policy if exists "admins can delete event attachments" on storage.objects;
create policy "admins can delete event attachments"
  on storage.objects for delete
  using (
    bucket_id = 'event-attachments'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );
