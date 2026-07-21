-- Run this in the Supabase SQL editor.
-- Safe to run even if this policy already exists (idempotent) - re-asserts
-- that an admin can update ANY profile row (needed for admin notes,
-- verify/suspend/ban, skill level). If admin note saves were silently doing
-- nothing (0 rows updated, no error), a missing or misconfigured version of
-- this exact policy is the most likely cause.
drop policy if exists "profiles update by admin" on public.profiles;

create policy "profiles update by admin" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());
