-- Run this in the Supabase SQL editor.
-- RLS is row-level only - it can't hide a single column. That meant
-- admin_note was readable by ANY logged-in user for ANY profile via the
-- raw API response, even when admin_note_visibility = 'admin' - the app
-- only hid it in the UI, not on the wire. This adds a computed column
-- (PostgREST calls a function(profiles) as if it were a table column) that
-- returns the note only when the viewer is an admin, or the note is
-- explicitly marked visible to everyone. Query "visible_admin_note"
-- instead of the raw "admin_note" column from non-admin-only contexts.
create or replace function public.visible_admin_note(p public.profiles)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_admin() then p.admin_note
    when p.admin_note_visibility = 'all' then p.admin_note
    else null
  end;
$$;
