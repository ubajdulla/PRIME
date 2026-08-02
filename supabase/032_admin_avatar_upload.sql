-- Run this in the Supabase SQL editor.
-- Lets an admin set/replace any player's avatar (AdminPlayerProfile photo
-- picker). The existing 004_avatar_storage.sql policies only allow a user to
-- upload/update files inside their OWN "<user id>/..." folder, which blocks
-- an admin uploading into a different player's folder - these add admin as a
-- second allowed path on top of that, they don't replace it.

drop policy if exists "admins can upload any avatar" on storage.objects;
create policy "admins can upload any avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and public.is_admin());

drop policy if exists "admins can update any avatar" on storage.objects;
create policy "admins can update any avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and public.is_admin());
