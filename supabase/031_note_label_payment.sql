-- Run this in the Supabase SQL editor.
-- Adds "payment" as a fifth note-label reason alongside No-show / Rude
-- Behavior (now shown as "Disrespect") / Trustworthy (now shown as "Trust")
-- / Warning (027_note_reason_labels.sql, 030_note_label_warning.sql) - same
-- mechanics, just widening the check constraints that whitelist the allowed
-- values. Stored keys are unchanged; only the app's display names changed.

alter table public.profiles
  drop constraint if exists profiles_trust_label_check;

alter table public.profiles
  add constraint profiles_trust_label_check
  check (trust_label in ('no_show', 'rude_behavior', 'trustworthy', 'warning', 'payment'));

alter table public.player_notes
  drop constraint if exists player_notes_label_check;

alter table public.player_notes
  add constraint player_notes_label_check
  check (label in ('no_show', 'rude_behavior', 'trustworthy', 'warning', 'payment'));
