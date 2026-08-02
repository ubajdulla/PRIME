-- Run this in the Supabase SQL editor.
-- Adds "warning" as a fourth note-label reason alongside No-show / Rude
-- Behavior / Trustworthy (027_note_reason_labels.sql) - same mechanics,
-- just widening the check constraints that whitelist the allowed values.

alter table public.profiles
  drop constraint if exists profiles_trust_label_check;

alter table public.profiles
  add constraint profiles_trust_label_check
  check (trust_label in ('no_show', 'rude_behavior', 'trustworthy', 'warning'));

alter table public.player_notes
  drop constraint if exists player_notes_label_check;

alter table public.player_notes
  add constraint player_notes_label_check
  check (label in ('no_show', 'rude_behavior', 'trustworthy', 'warning'));
