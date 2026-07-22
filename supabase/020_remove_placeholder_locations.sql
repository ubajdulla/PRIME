-- Run this in the Supabase SQL editor.
-- Removes the placeholder/mock venues seeded in 008_locations.sql.
delete from public.locations
where name in (
  'PRIME Sports Hall',
  'Cyber Arena, Sector 4',
  'Beach Court A',
  'Indoor Arena West',
  'East Side Courts',
  'Central Sports Hub'
);
