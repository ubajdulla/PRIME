-- Run this in the Supabase SQL editor.
-- Replaces the single admin_note/admin_note_visibility column pair with an
-- append-only log: many notes per player, each with its own author and
-- visibility, instead of one field that gets overwritten on every edit.

create table public.player_notes (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  author_name text not null default '',
  body text not null,
  visibility text not null default 'admin' check (visibility in ('admin', 'all')),
  is_legacy boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.player_notes enable row level security;

-- Same visibility rule the old admin_note had: admins see everything,
-- everyone else only sees notes explicitly marked visible to all.
create policy "player_notes select" on public.player_notes
  for select using (public.is_admin() or visibility = 'all');

create policy "player_notes insert by admin" on public.player_notes
  for insert with check (public.is_admin() and author_id = auth.uid());

-- Carry over whatever single note already existed per player as a read-only,
-- unattributed "legacy" entry (is_legacy = true) - the app hides the
-- admin-only/everyone icon on these since we don't know who wrote them or
-- exactly when. The old admin_note/admin_note_visibility columns and the
-- visible_admin_note() function are left in place, just no longer used.
insert into public.player_notes (player_id, body, visibility, is_legacy)
select id, admin_note, admin_note_visibility, true
from public.profiles
where admin_note is not null and admin_note <> '';
