-- Run this in the Supabase SQL editor.
-- Lets the current moderator of an event hand the role off to another admin.
-- moderator_swap_requests is the state machine for a single swap's lifecycle
-- (pending -> accepted/declined/canceled); notifications is a general-purpose
-- inbox table (not swap-specific) that the Alerts page (src/app/pages/Alerts.tsx,
-- previously 100% mock data) now reads from — future notification types can reuse
-- it without a new table. Only one pending swap per event is allowed (partial
-- unique index) so a moderator can't fire off two competing requests. Accepting
-- a swap updates events.moderator_id directly; no RLS change is needed there
-- since "events writable by admins" (schema.sql) already lets any admin update
-- any event via public.is_admin(). Swapping intentionally does not touch
-- event_participants — roster membership is a separate concern from who
-- moderates (see the Join/Leave-as-Moderator actions added alongside this).

create table public.moderator_swap_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  from_admin_id uuid not null references public.profiles (id),
  to_admin_id uuid not null references public.profiles (id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'canceled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

-- Only one pending swap per event at a time (defense-in-depth; the client also
-- hides the "initiate" UI once a pendingSwap is loaded, but this guards races).
create unique index moderator_swap_requests_one_pending_per_event
  on public.moderator_swap_requests (event_id)
  where status = 'pending';

create index moderator_swap_requests_to_admin_idx on public.moderator_swap_requests (to_admin_id);

-- ── notifications (generic inbox, reusable for future alert types) ──────────
-- `type` is intentionally free-text (no check constraint), unlike this codebase's
-- usual status-enum convention — locking it down would force a migration every
-- time a new notification type is added. `related_id` has no FK since what it
-- points at depends on `type` (today: moderator_swap_requests.id).
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  event_id uuid references public.events (id) on delete set null,
  related_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.moderator_swap_requests enable row level security;
alter table public.notifications enable row level security;

-- swap requests: visible to the two admins involved.
create policy "swap requests readable by participants" on public.moderator_swap_requests
  for select using (auth.uid() = from_admin_id or auth.uid() = to_admin_id);

-- only the CURRENT moderator of the event can create a request, and only
-- targeting another admin. This is the real enforcement of "only the current
-- moderator can initiate" — the client-side check is just UI convenience.
create policy "swap requests insert by current moderator" on public.moderator_swap_requests
  for insert with check (
    auth.uid() = from_admin_id
    and exists (select 1 from public.events e where e.id = event_id and e.moderator_id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = to_admin_id and p.is_admin)
  );

-- either side can update: the initiator to cancel, the target to accept/decline.
create policy "swap requests update by participants" on public.moderator_swap_requests
  for update using (auth.uid() = from_admin_id or auth.uid() = to_admin_id)
  with check (auth.uid() = from_admin_id or auth.uid() = to_admin_id);

-- notifications: you only ever read/mark-read your own inbox.
create policy "notifications readable by recipient" on public.notifications
  for select using (auth.uid() = recipient_id);

create policy "notifications update by recipient" on public.notifications
  for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

-- Inserting a notification FOR someone else (recipient isn't auth.uid()) has no
-- "owner" to check against, so gate it the same way admin-only writes elsewhere
-- are gated: any admin may write into anyone's inbox. Consistent with the
-- existing admin trust model (any admin can already edit any event/roster).
create policy "notifications insert by admins" on public.notifications
  for insert with check (public.is_admin());
