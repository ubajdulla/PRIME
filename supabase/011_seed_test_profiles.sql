-- Run this in the Supabase SQL editor, AFTER 010_admin_hierarchy.sql.
-- Sets up the one test account you created manually via Authentication ->
-- Users -> "Add user" (admin.advanced@mailinator.com / Test1234!) as an
-- admin with skill level Advanced, so you can test the hierarchy rules
-- from 010: it can't ban/suspend/change its own skill level, and if you
-- promote a player through it, it can never go above Advanced.

update public.profiles set
  is_admin = true, skill_level = 'Advanced', position = 'Setter',
  telegram = '@admin_advanced', instagram = '@admin_advanced_vb'
  where email = 'admin.advanced@mailinator.com';
