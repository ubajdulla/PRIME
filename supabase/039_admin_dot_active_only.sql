-- Run this in the Supabase SQL editor.
-- admin_has_new_signups() (038) counted every event with activity, but
-- AdminEvents only lists events younger than 4 weeks once they've aged into
-- "Past" (status = 'upcoming' and event_date already gone, see AdminEvents'
-- own cutoff comment) - an admin could never open such an event to clear it,
-- so the dot could get stuck on forever. Per Kuba: forget "Past" entirely,
-- the dot should only ever look at "Active" events - same filterGroup rule
-- AdminEvents.tsx uses (row.status === 'upcoming' && isPast -> 'past').

create or replace function public.admin_has_new_signups(p_admin_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.events e
    left join public.admin_event_seen s
      on s.event_id = e.id and s.admin_id = p_admin_id
    where e.last_activity_at is not null
      and not (e.status = 'upcoming' and e.event_date < current_date)
      and (s.seen_at is null or s.seen_at < e.last_activity_at)
  );
$$;
