-- Run this in the Supabase SQL editor.
-- Adds the "required skill level" field to events, and removes join_type -
-- whether a player gets Direct Join or Request to Join is now computed live
-- by comparing the PLAYER's own skill_level against the event's level, not
-- a fixed setting the admin picks when creating the event.

alter table public.events add column if not exists level text;

alter table public.events drop column if exists join_type;
