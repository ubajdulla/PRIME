import { useState, useRef, useEffect, useMemo, useTransition } from "react";
import { Link } from "react-router";
import { UserCircle } from "lucide-react";
import { Instagram, Send } from "lucide-react";
import { EventCard, EventCardProps } from "../components/EventCard";
import { useLang, type Dict } from "../i18n";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { SKILL_STYLE, levelLabel, positionLabel } from "../data/adminData";
import { computeJoinStatus } from "../lib/joinType";
import { formatEventDate, weekdayLabel } from "../lib/eventDate";
import { categoryImage } from "../lib/eventImages";
import { FilterPill, FilterPillTrack, useEdgeFadeMask } from "../components/ui/FilterPill";

type EventRow = {
  id: string;
  title: string;
  event_date: string;
  event_time: string;
  location: string;
  price_label: string | null;
  capacity: number;
  category: string | null;
  level: string | null;
  status: string;
  image_url: string | null;
  event_participants: { id: string; profiles: { id: string; avatar: string | null } | null }[] | null;
};

const ALL_FILTERS = ["ALL", "TOURNAMENT", "GAMES", "OPENGYM", "TRAININGS", "EVENTS", "BEACH", "JOIN DIRECTLY", "REQUEST ONLY"] as const;

// Maps each filter key to its key in t.home.filters
const FILTER_KEY: Record<string, keyof Dict["home"]["filters"]> = {
  ALL: "all",
  TOURNAMENT: "tournament",
  GAMES: "games",
  OPENGYM: "openGym",
  TRAININGS: "trainings",
  EVENTS: "events",
  BEACH: "beach",
  "JOIN DIRECTLY": "joinDirectly",
  "REQUEST ONLY": "requestOnly",
};

// Gap used inside the date rail (date label + dot/line), which is
// absolutely positioned in the left gutter so it never affects the
// width of the content column above it.
const COL_GAP = "gap-2 md:gap-3";

export function Home() {
  const { t } = useLang();
  // activeFilter drives the pill highlight/indicator and updates synchronously
  // so the slide animation starts immediately on click. contentFilter drives
  // the actual list filtering and is set inside startTransition so React can
  // paint the (cheap) indicator move before doing the (heavier) list re-render,
  // instead of both fighting for the same frame.
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [contentFilter, setContentFilter] = useState("ALL");
  const [, startTransition] = useTransition();
  const handleFilterClick = (f: string) => {
    setActiveFilter(f);
    startTransition(() => setContentFilter(f));
  };
  const filterScrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ active: boolean; startX: number; scrollLeft: number }>({ active: false, startX: 0, scrollLeft: 0 });
  useEdgeFadeMask(filterScrollRef);

  useEffect(() => {
    const el = filterScrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      el.scrollBy({ left: e.deltaY + e.deltaX, behavior: "auto" });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);
  const { isLoggedIn, profile } = useAuth();

  const [events, setEvents] = useState<(EventCardProps & { rawDate: string })[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const [{ data: rows }, { data: counts }] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, event_date, event_time, location, price_label, capacity, category, level, status, image_url, event_participants(id, profiles(id, avatar))")
          .in("status", ["upcoming", "canceled"])
          .gte("event_date", todayStr)
          .or(`published_at.is.null,published_at.lte.${now.toISOString().replace(/\.\d+Z$/, "Z")}`)
          .order("event_date", { ascending: true }),
        supabase.rpc("event_join_counts"),
      ]);
      if (!active) return;

      const countMap = new Map((counts as { event_id: string; joined_count: number }[] | null ?? []).map(c => [c.event_id, c.joined_count]));

      // Guests can't read event_participants/profiles directly (RLS), so the embedded
      // join above comes back empty for them - fall back to the public_roster view
      // (same whitelisted columns used on EventDetail) just for avatars.
      const eventIds = ((rows as EventRow[] | null) ?? []).map(r => r.id);
      const guestAvatarsByEvent = new Map<string, { id: string; url: string | null }[]>();
      if (!isLoggedIn && eventIds.length > 0) {
        const { data: publicRoster } = await supabase
          .from("public_roster")
          .select("event_id, id, avatar")
          .in("event_id", eventIds);
        for (const p of (publicRoster ?? []) as { event_id: string; id: string; avatar: string | null }[]) {
          const list = guestAvatarsByEvent.get(p.event_id) ?? [];
          list.push({ id: p.id, url: p.avatar });
          guestAvatarsByEvent.set(p.event_id, list);
        }
      }

      // public_organizer is a whitelisted (name/avatar only) view granted to both
      // anon and authenticated, so it works for the host badge regardless of login.
      const moderatorByEvent = new Map<string, { name: string; avatar: string | null }>();
      if (eventIds.length > 0) {
        const { data: organizers } = await supabase
          .from("public_organizer")
          .select("event_id, name, avatar")
          .in("event_id", eventIds);
        for (const o of (organizers ?? []) as { event_id: string; name: string; avatar: string | null }[]) {
          moderatorByEvent.set(o.event_id, { name: o.name, avatar: o.avatar });
        }
      }

      const mapped: (EventCardProps & { rawDate: string })[] = ((rows as EventRow[] | null) ?? []).map(row => {
        const current = countMap.get(row.id) ?? row.event_participants?.length ?? 0;
        const avatars = isLoggedIn
          ? (row.event_participants ?? []).map(p => ({ id: p.profiles?.id ?? `guest-${p.id}`, url: p.profiles?.avatar ?? null }))
          : guestAvatarsByEvent.get(row.id) ?? [];
        return {
          id: row.id,
          title: row.title,
          date: row.event_date,
          rawDate: row.event_date,
          time: row.event_time,
          location: row.location,
          price: row.price_label ?? "FREE",
          capacity: { current, max: row.capacity },
          avatars,
          moderator: moderatorByEvent.get(row.id) ?? null,
          status: computeJoinStatus(row.level, profile?.skill_level),
          category: row.category ?? undefined,
          level: row.level ?? undefined,
          image: row.image_url ?? categoryImage(row.category),
          canceled: row.status === "canceled",
        };
      });

      setEvents(mapped);
      setLoadingEvents(false);
    }
    load();
    return () => { active = false; };
  }, [profile?.skill_level, isLoggedIn]);

  const filtered = useMemo(() => events.filter(e => {
    if (contentFilter === "ALL") return true;
    if (contentFilter === "REQUEST ONLY" || contentFilter === "JOIN DIRECTLY") return e.status === contentFilter;
    return e.category === contentFilter;
  }), [events, contentFilter]);

  const dateGroups = useMemo(() => filtered.reduce<{ rawDate: string; events: (EventCardProps & { rawDate: string })[] }[]>((acc, e) => {
    const last = acc[acc.length - 1];
    if (last && last.rawDate === e.rawDate) { last.events.push(e); }
    else { acc.push({ rawDate: e.rawDate, events: [e] }); }
    return acc;
  }, []), [filtered]);

  return (
    <div className="flex flex-col min-h-full bg-[var(--surface-0)] w-full">
      <div className="w-full max-w-[640px] mx-auto flex flex-col pt-8 pb-4 px-4">

        {/* ── Guest greeting + how it works ────────────────────────── */}
        {!isLoggedIn && (
          <>
            <div className="flex items-center justify-between gap-6 pb-8 mb-8 border-b border-[var(--ink)]/8">
              <div>
                <h1 className="font-black italic text-[var(--ink)] tracking-widest uppercase text-2xl">
                  {t.home.greeting.hello}, {t.home.greeting.guestName} 👋
                </h1>
                <div className="text-sm text-[#79828b] mt-1.5">{t.home.greeting.guestSubtitle}</div>
              </div>
              <Link
                to="/signin"
                className="w-16 h-16 rounded-full bg-[var(--surface-1)] ring-2 ring-[var(--ink)]/15 flex items-center justify-center shrink-0 hover:bg-[var(--surface-hover)] transition-colors"
              >
                <UserCircle size={32} className="text-[#79828b]" />
              </Link>
            </div>

            <div className="pb-8 mb-8 border-b border-[var(--ink)]/8">
              <div className="flex flex-col gap-4">
                {[
                  { step: "01", title: t.home.howItWorks.step1Title, desc: t.home.howItWorks.step1Desc },
                  { step: "02", title: t.home.howItWorks.step2Title, desc: t.home.howItWorks.step2Desc },
                  { step: "03", title: t.home.howItWorks.step3Title, desc: t.home.howItWorks.step3Desc },
                ].map(({ step, title, desc }) => (
                  <div key={step} className="flex items-start gap-4">
                    <span className="font-black italic text-[var(--brand)] text-2xl leading-none w-8 shrink-0">{step}</span>
                    <div>
                      <div className="font-bold text-[var(--ink)] text-sm uppercase tracking-wide mb-0.5">{title}</div>
                      <div className="text-[#79828b] text-sm leading-relaxed">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Greeting ─────────────────────────────────────────────── */}
        {isLoggedIn && profile && (
          <div className="flex items-center justify-between gap-6 pb-8 mb-8 border-b border-[var(--ink)]/8">
            <div className="flex items-stretch gap-3">
              <span className={`w-1 rounded-full shrink-0 ${SKILL_STYLE[profile.skill_level]?.dot ?? SKILL_STYLE.Rookie.dot}`} />
              <div>
                <h1 className="font-black italic text-[var(--ink)] tracking-widest uppercase text-2xl">
                  {t.home.greeting.hello}, {profile.name.split(" ")[0]}
                </h1>
                <div className="text-sm font-semibold text-[var(--ink)] mt-1.5">
                  {profile.position ? `${levelLabel(profile.skill_level, t)} ${positionLabel(profile.position, t)}` : levelLabel(profile.skill_level, t)}
                </div>
              </div>
            </div>
            <Link to="/profile" className="shrink-0 hover:opacity-80 transition-opacity">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover bg-[var(--surface-1)] ring-2 ring-[var(--ink)]/15"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[var(--surface-1)] ring-2 ring-[var(--ink)]/15 flex items-center justify-center">
                  <UserCircle size={32} className="text-[#79828b]" />
                </div>
              )}
            </Link>
          </div>
        )}

        {/* ── Section header ───────────────────────────────────────── */}
        <h2 className="font-black italic text-[var(--ink)] tracking-widest uppercase text-2xl mb-5">
          {t.home.eventsFeed}
        </h2>

        {/* ── Filter bar ───────────────────────────────────────────── */}
        <div className="relative mb-8 w-full bg-[var(--surface-1)] rounded-full p-1.5 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
          {/* Edge fade via mask-image (not an overlay) — actually fades the pills'
              own pixels near the edges, so a colored/active pill scrolled under it
              dims out cleanly instead of getting visually blended with an opaque
              background-colored rectangle painted on top of it. */}
          <div
            ref={filterScrollRef}
            className="overflow-x-auto overscroll-x-contain touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] select-none"
            style={{ cursor: "grab" }}
            onMouseDown={e => {
              const el = filterScrollRef.current;
              if (!el) return;
              dragState.current = { active: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
              el.style.cursor = "grabbing";
            }}
            onMouseMove={e => {
              const el = filterScrollRef.current;
              if (!el || !dragState.current.active) return;
              const x = e.pageX - el.offsetLeft;
              el.scrollLeft = dragState.current.scrollLeft - (x - dragState.current.startX);
            }}
            onMouseUp={() => {
              dragState.current.active = false;
              if (filterScrollRef.current) filterScrollRef.current.style.cursor = "grab";
            }}
            onMouseLeave={() => {
              dragState.current.active = false;
              if (filterScrollRef.current) filterScrollRef.current.style.cursor = "";
            }}
          >
            <FilterPillTrack activeKey={activeFilter}>
              {ALL_FILTERS.map(f => (
                <FilterPill key={f} pillKey={f} label={t.home.filters[FILTER_KEY[f]]} active={activeFilter === f} onClick={() => handleFilterClick(f)} />
              ))}
            </FilterPillTrack>
          </div>
        </div>

        {/* ── Chronological timeline ────────────────────────────────── */}
        <div className="flex flex-col">
          {dateGroups.length === 0 && !loadingEvents && (
            <p className="text-[#79828b] text-sm py-10 text-center">{t.home.noEvents}</p>
          )}

          {dateGroups.map(({ rawDate, events }, idx) => (
            <div key={rawDate} className="relative mb-7">

              {/* Date rail — absolutely positioned in the left gutter so it never
                  eats into the card column's width (which must match every other
                  section's width). Only shown where there's room for it (md+). */}
              <div className={`hidden md:flex absolute right-full top-0 bottom-0 mr-3 items-stretch ${COL_GAP}`}>
                <div className="w-24 shrink-0 flex flex-col items-end justify-start pt-0.5">
                  <span className="text-[var(--ink)] font-black text-[11px] leading-tight text-right break-words">
                    {formatEventDate(rawDate, t)}
                  </span>
                  <span className="text-[#79828b] text-[10px] mt-0.5 text-right leading-tight">
                    {weekdayLabel(rawDate, t)}
                  </span>
                </div>
                <div className="w-4 shrink-0 flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--brand)] border-[1.5px] border-[var(--surface-0)] shrink-0 mt-1 z-10" />
                  {idx < dateGroups.length - 1 && (
                    <div className="w-px flex-1 bg-[var(--ink)]/10 mt-1" />
                  )}
                </div>
              </div>

              {/* Event cards */}
              <div className="flex flex-col gap-3">
                {events.map(e => <EventCard key={e.id} {...e} date={formatEventDate(e.rawDate, t)} />)}
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div className="border-t border-[var(--ink)]/5 pt-6 pb-8 mt-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="font-black italic text-[var(--ink)] text-xl tracking-widest">PRIME</div>
              <div className="text-[#79828b] text-xs mt-1 leading-relaxed">
                {t.home.tagline}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <a
                href="https://t.me/GoPrimeCZ/10"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-[var(--brand)]/10 flex items-center justify-center text-[var(--brand)] hover:bg-[var(--brand)]/20 transition-colors"
              >
                <Send size={14} />
              </a>
              <a
                href="https://www.instagram.com/goprime.cz/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-[var(--ink)]/5 flex items-center justify-center text-[#79828b] hover:bg-[var(--ink)]/10 transition-colors"
              >
                <Instagram size={14} />
              </a>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[#79828b] text-xs mb-4">
            <a href="#" className="hover:text-[var(--ink)] transition-colors">{t.home.footer.privacy}</a>
            <a href="#" className="hover:text-[var(--ink)] transition-colors">{t.home.footer.terms}</a>
            <a href="#" className="hover:text-[var(--ink)] transition-colors">{t.home.footer.rules}</a>
            <a href="#" className="hover:text-[var(--ink)] transition-colors">{t.home.footer.contact}</a>
          </div>
          <p className="text-[#79828b] text-[10px]">{t.home.copyright}</p>
        </div>

      </div>
    </div>
  );
}
