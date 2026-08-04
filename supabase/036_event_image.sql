-- Run this in the Supabase SQL editor.
-- Lets moderators upload a custom cover image for an event, shown on the
-- feed EventCard in place of the category default. Mirrors
-- 025_event_attachment.sql for the bucket/policy shape.

alter table public.events add column image_url text;

insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do nothing;

drop policy if exists "event images are publicly accessible" on storage.objects;
create policy "event images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'event-images');

drop policy if exists "admins can upload event images" on storage.objects;
create policy "admins can upload event images"
  on storage.objects for insert
  with check (
    bucket_id = 'event-images'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

drop policy if exists "admins can replace event images" on storage.objects;
create policy "admins can replace event images"
  on storage.objects for update
  using (
    bucket_id = 'event-images'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

drop policy if exists "admins can delete event images" on storage.objects;
create policy "admins can delete event images"
  on storage.objects for delete
  using (
    bucket_id = 'event-images'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );
