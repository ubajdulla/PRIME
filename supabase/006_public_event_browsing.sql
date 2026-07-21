-- Run this in the Supabase SQL editor.
-- Lets logged-out visitors browse the event feed (matches the product decision
-- that seeing events must never require login - unlike the "ACE" competitor
-- flaw called out in the case study). Draft events stay admin-only.
drop policy if exists "events readable by authenticated" on public.events;
create policy "events readable by everyone" on public.events
  for select using (status <> 'draft' or public.is_admin());

-- Guests still need a joined-player COUNT for each event's capacity bar, but
-- must NOT see who joined or their payment status (event_participants/profiles
-- stay restricted to logged-in users). This function returns counts only,
-- bypassing RLS just for the count.
create or replace function public.event_join_counts()
returns table(event_id uuid, joined_count integer)
language sql
security definer
set search_path = public
stable
as $$
  select event_id, count(*)::integer as joined_count
  from public.event_participants
  group by event_id;
$$;

grant execute on function public.event_join_counts() to anon, authenticated;
