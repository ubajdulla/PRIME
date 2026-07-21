-- Run this in the Supabase SQL editor.
-- Creates a public storage bucket for profile avatars.
-- Files are stored as "<user id>/<filename>" - that folder prefix is how the
-- policies below know a user may only upload/replace/delete their OWN avatar.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- (storage.objects already has RLS enabled by default in Supabase - only
-- Supabase's own internal role owns that table, so we can't and don't need
-- to touch that setting ourselves, just add policies on top of it.)

drop policy if exists "avatar images are publicly accessible" on storage.objects;
create policy "avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "users can upload their own avatar" on storage.objects;
create policy "users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users can update their own avatar" on storage.objects;
create policy "users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users can delete their own avatar" on storage.objects;
create policy "users can delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
