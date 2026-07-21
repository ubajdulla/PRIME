-- Run this in the Supabase SQL editor.
-- Venue picker list for AdminCreateEvent, previously hardcoded in the frontend.
-- Admin-only (same as events) since only admins reach the create/edit event form.
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

alter table public.locations enable row level security;

create policy "locations writable by admins" on public.locations
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.locations (name, lat, lng) values
  ('FORTUNA, Za Elektrárnou 419/1', null, null),
  ('ČVUT, Pod Juliskou 4', null, null),
  ('VŠE, Na Třebešíně 3215/1', null, null),
  ('ČZU, Sídlištní 1073', null, null),
  ('Masná, Masná 977', null, null),
  ('Dobratická', 50.130236852837804, 14.511675879895925),
  ('PRIME Sports Hall', null, null),
  ('Cyber Arena, Sector 4', null, null),
  ('Beach Court A', null, null),
  ('Indoor Arena West', null, null),
  ('East Side Courts', null, null),
  ('Central Sports Hub', null, null);
