-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Mirrors the TS types in src/app/data/adminData.ts.

-- ── profiles (one row per auth user, id = auth.users.id) ────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  avatar text,
  "position" text,
  skill_level text not null default 'Rookie',
  birth_date date,
  phone text,
  email text,
  telegram text,
  instagram text,
  show_telegram boolean not null default true,
  show_instagram boolean not null default true,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── events ────────────────────────────────────────────────────────────────
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  event_time text not null,
  location text not null,
  price integer not null default 0,
  price_label text,
  capacity integer not null,
  join_type text not null check (join_type in ('direct', 'request')),
  category text,
  status text not null default 'upcoming' check (status in ('upcoming', 'past', 'draft', 'canceled')),
  description text,
  image text,
  moderator_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ── roster (confirmed participants + payment tracking) ──────────────────────
create table public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  player_id uuid not null references public.profiles (id) on delete cascade,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'cash', 'online')),
  joined_at timestamptz not null default now(),
  unique (event_id, player_id)
);

-- ── requests (for join_type = 'request') and waitlist ────────────────────────
create table public.event_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  player_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('request', 'waitlist')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (event_id, player_id, kind)
);

-- ── helper: is the current user an admin? (SECURITY DEFINER avoids RLS recursion) ──
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.event_requests enable row level security;

-- profiles: everyone logged in can read (needed for roster/contact display),
-- but you can only edit your own row. Admin flag can only be changed manually in the SQL editor.
create policy "profiles readable by authenticated" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles insert own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles update own (not is_admin)" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and is_admin = (select is_admin from public.profiles where id = auth.uid()));

-- events: readable by everyone logged in; only admins can create/edit/delete.
create policy "events readable by authenticated" on public.events
  for select using (auth.role() = 'authenticated');

create policy "events writable by admins" on public.events
  for all using (public.is_admin()) with check (public.is_admin());

-- event_participants: readable by everyone logged in.
-- A player can join themselves (insert own row) and leave (delete own row).
-- Only admins can change payment_status.
create policy "participants readable by authenticated" on public.event_participants
  for select using (auth.role() = 'authenticated');

create policy "participants insert self" on public.event_participants
  for insert with check (auth.uid() = player_id);

create policy "participants delete self" on public.event_participants
  for delete using (auth.uid() = player_id);

create policy "participants update by admin only" on public.event_participants
  for update using (public.is_admin()) with check (public.is_admin());

-- event_requests: a player manages their own request/waitlist entry; admins manage all.
create policy "requests readable own or admin" on public.event_requests
  for select using (auth.uid() = player_id or public.is_admin());

create policy "requests insert self" on public.event_requests
  for insert with check (auth.uid() = player_id);

create policy "requests delete self or admin" on public.event_requests
  for delete using (auth.uid() = player_id or public.is_admin());

create policy "requests update by admin only" on public.event_requests
  for update using (public.is_admin()) with check (public.is_admin());
