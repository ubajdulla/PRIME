import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { UserCircle } from "lucide-react";
import { Instagram, Send } from "lucide-react";
import { EventCard, EventCardProps } from "../components/EventCard";
import { useLang, type Dict } from "../i18n";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { SKILL_STYLE } from "../data/adminData";
import { computeJoinStatus } from "../lib/joinType";
import { relativeDay, shortDate } from "../lib/eventDate";

function formatEventDate(dateStr: string): string {
  return relativeDay(dateStr) ?? shortDate(dateStr);
}

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
  image: string | null;
  status: string;
  event_participants: { profiles: { avatar: string | null } | null }[] | null;
};

const ALL_FILTERS = ["ALL", "TOURNAMENT", "GAMES", "TRAININGS", "EVENTS", "BEACH", "JOIN DIRECTLY", "REQUEST ONLY"] as const;

// Maps each filter key to its key in t.home.filters
const FILTER_KEY: Record<string, keyof Dict["home"]["filters"]> = {
  ALL: "all",
  TOURNAMENT: "tournament",
  GAMES: "games",
  TRAININGS: "trainings",
  EVENTS: "events",
  BEACH: "beach",
  "JOIN DIRECTLY": "joinDirectly",
  "REQUEST ONLY": "requestOnly",
};

// Shared column sizes — identical values used in every row (header, filters, timeline, footer)
// so the cards column always starts at the exact same horizontal position.
const DATE_W  = "hidden md:block md:w-24"; // hidden on mobile, 96px on md+
const DOT_W   = "hidden md:block md:w-4";  // hidden on mobile, 16px on md+
const COL_GAP = "gap-2 md:gap-3";

function getDayLabel(date: string, t: Dict): string {
  if (date === "TODAY")    return t.days.today;
  if (date === "TOMORROW") return t.days.tomorrow;
  const m: Record<string, keyof Dict["days"]> = {
    MON: "monday", TUE: "tuesday", WED: "wednesday",
    THU: "thursday", FRI: "friday", SAT: "saturday", SUN: "sunday",
  };
  const key = m[date.split(",")[0].trim()];
  return key ? t.days[key] : "";
}

export function Home() {
  const { t } = useLang();
  const [activeFilter, setActiveFilter] = useState("ALL");
  const filterScrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ active: boolean; startX: number; scrollLeft: number }>({ active: false, startX: 0, scrollLeft: 0 });

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

  const [events, setEvents] = useState<EventCardProps[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const [{ data: rows }, { data: counts }] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, event_date, event_time, location, price_label, capacity, category, level, image, status, event_participants(profiles(avatar))")
          .in("status", ["upcoming", "canceled"])
          .order("event_date", { ascending: true }),
        supabase.rpc("event_join_counts"),
      ]);
      if (!active) return;

      const countMap = new Map((counts as { event_id: string; joined_count: number }[] | null ?? []).map(c => [c.event_id, c.joined_count]));

      const mapped: EventCardProps[] = ((rows as EventRow[] | null) ?? []).map(row => {
        const current = countMap.get(row.id) ?? row.event_participants?.length ?? 0;
        const avatars = (row.event_participants ?? [])
          .map(p => p.profiles?.avatar)
          .filter((a): a is string => !!a);
        return {
          id: row.id,
          title: row.title,
          date: formatEventDate(row.event_date),
          time: row.event_time,
          location: row.location,
          price: row.price_label ?? "FREE",
          capacity: { current, max: row.capacity },
          avatars,
          status: computeJoinStatus(row.level, profile?.skill_level),
          category: row.category ?? undefined,
          level: row.level ?? undefined,
          image: row.image ?? undefined,
          canceled: row.status === "canceled",
        };
      });

      setEvents(mapped);
      setLoadingEvents(false);
    }
    load();
    return () => { active = false; };
  }, [profile?.skill_level]);

  const filtered = events.filter(e => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "REQUEST ONLY" || activeFilter === "JOIN DIRECTLY") return e.status === activeFilter;
    return e.category === activeFilter;
  });

  const dateGroups = filtered.reduce<{ date: string; events: EventCardProps[] }[]>((acc, e) => {
    const last = acc[acc.length - 1];
    if (last && last.date === e.date) { last.events.push(e); }
    else { acc.push({ date: e.date, events: [e] }); }
    return acc;
  }, []);

  return (
    <div className="flex flex-col min-h-full bg-[#0e1621] w-full">
      <div className="w-full max-w-[760px] mx-auto flex flex-col pt-8 pb-4 px-4">

        {/* ── Guest greeting + how it works ────────────────────────── */}
        {!isLoggedIn && (
          <>
            <div className={`flex items-center ${COL_GAP} mb-8`}>
              <div className={`${DATE_W} shrink-0`} />
              <div className={`${DOT_W} shrink-0`} />
              <div className="flex-1 min-w-0 flex items-center justify-between gap-6 pb-8 border-b border-white/8">
                <div>
                  <h1 className="font-black italic text-white tracking-widest uppercase text-2xl">
                    {t.home.greeting.hello}, {t.home.greeting.guestName} 👋
                  </h1>
                  <div className="text-sm text-[#79828b] mt-1.5">{t.home.greeting.guestSubtitle}</div>
                </div>
                <Link
                  to="/signin"
                  className="w-16 h-16 rounded-full bg-[#17212b] ring-2 ring-white/15 flex items-center justify-center shrink-0 hover:bg-[#1c2a36] transition-colors"
                >
                  <UserCircle size={32} className="text-[#79828b]" />
                </Link>
              </div>
            </div>

            <div className={`flex items-start ${COL_GAP} mb-8`}>
              <div className={`${DATE_W} shrink-0`} />
              <div className={`${DOT_W} shrink-0`} />
              <div className="flex-1 min-w-0 pb-8 border-b border-white/8">
                <div className="flex flex-col gap-4">
                  {[
                    { step: "01", title: t.home.howItWorks.step1Title, desc: t.home.howItWorks.step1Desc },
                    { step: "02", title: t.home.howItWorks.step2Title, desc: t.home.howItWorks.step2Desc },
                    { step: "03", title: t.home.howItWorks.step3Title, desc: t.home.howItWorks.step3Desc },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="flex items-start gap-4">
                      <span className="font-black italic text-[#3390ec] text-2xl leading-none w-8 shrink-0">{step}</span>
                      <div>
                        <div className="font-bold text-white text-sm uppercase tracking-wide mb-0.5">{title}</div>
                        <div className="text-[#79828b] text-sm leading-relaxed">{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Greeting ─────────────────────────────────────────────── */}
        {isLoggedIn && profile && (
          <div className={`flex items-center ${COL_GAP} mb-8`}>
            <div className={`${DATE_W} shrink-0`} />
            <div className={`${DOT_W} shrink-0`} />
            <div className="flex-1 min-w-0 flex items-center justify-between gap-6 pb-8 border-b border-white/8">
              <div>
                <h1 className="font-black italic text-white tracking-widest uppercase text-2xl">
                  {t.home.greeting.hello}, {profile.name.split(" ")[0]} 👋
                </h1>
                <div className="flex items-center gap-2 mt-1.5 text-sm text-[#79828b]">
                  {profile.position && <><span>{profile.position}</span><span className="text-white/20">•</span></>}
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SKILL_STYLE[profile.skill_level]?.dot ?? SKILL_STYLE.Rookie.dot}`} />
                    <span className={`font-semibold ${SKILL_STYLE[profile.skill_level]?.text ?? SKILL_STYLE.Rookie.text}`}>{profile.skill_level}</span>
                  </span>
                </div>
              </div>
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover bg-[#17212b] shrink-0 ring-2 ring-white/15"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#17212b] shrink-0 ring-2 ring-white/15 flex items-center justify-center">
                  <UserCircle size={32} className="text-[#79828b]" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Section header ───────────────────────────────────────── */}
        <div className={`flex items-center ${COL_GAP} mb-5`}>
          <div className={`${DATE_W} shrink-0`} />
          <div className={`${DOT_W}  shrink-0`} />
          <h2 className="font-black italic text-white tracking-widest uppercase text-2xl min-w-0">
            {t.home.eventsFeed}
          </h2>
        </div>

        {/* ── Filter bar ───────────────────────────────────────────── */}
        <div className={`flex items-center ${COL_GAP} mb-8`}>
          <div className={`${DATE_W} shrink-0`} />
          <div className={`${DOT_W} shrink-0`} />

          {/* Pills wrapper — same flex-1 column as event cards */}
          <div className="flex-1 min-w-0 relative">
            {/* Left fade hint */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0e1621] to-transparent pointer-events-none z-10" />

            <div
              ref={filterScrollRef}
              className="flex gap-2 overflow-x-auto overscroll-x-contain touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] select-none"
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
              style={{ cursor: "grab" }}
            >
              {ALL_FILTERS.map(f => (
                <PillFilter key={f} label={t.home.filters[FILTER_KEY[f]]} active={activeFilter === f} onClick={() => setActiveFilter(f)} />
              ))}
            </div>

            {/* Right fade hint */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0e1621] to-transparent pointer-events-none z-10" />
          </div>
        </div>

        {/* ── Chronological timeline ────────────────────────────────── */}
        <div className="flex flex-col">
          {dateGroups.length === 0 && !loadingEvents && (
            <div className={`flex ${COL_GAP}`}>
              <div className={`${DATE_W} shrink-0`} />
              <div className={`${DOT_W}  shrink-0`} />
              <p className="flex-1 text-[#79828b] text-sm py-10 text-center">{t.home.noEvents}</p>
            </div>
          )}

          {dateGroups.map(({ date, events }, idx) => (
            <div key={date} className={`flex items-stretch ${COL_GAP} mb-7`}>

              {/* Date label — always visible, compact on mobile */}
              <div className="hidden md:flex md:w-24 shrink-0 flex-col items-end justify-start pt-0.5">
                <span className="text-white font-black text-[9px] md:text-[11px] leading-tight text-right break-words">
                  {date}
                </span>
                <span className="text-[#79828b] text-[8px] md:text-[10px] mt-0.5 text-right leading-tight">
                  {getDayLabel(date, t)}
                </span>
              </div>

              {/* Dot + vertical line */}
              <div className="hidden md:flex md:w-4 shrink-0 flex-col items-center">
                <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#3390ec] border-[1.5px] border-[#0e1621] shrink-0 mt-1 z-10" />
                {idx < dateGroups.length - 1 && (
                  <div className="w-px flex-1 bg-white/10 mt-1" />
                )}
              </div>

              {/* Event cards */}
              <div className="flex-1 min-w-0 flex flex-col gap-3">
                {events.map(e => <EventCard key={e.id} {...e} />)}
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div className={`flex ${COL_GAP} mt-4`}>
          <div className={`${DATE_W} shrink-0`} />
          <div className={`${DOT_W}  shrink-0`} />
          <div className="flex-1 min-w-0 border-t border-white/5 pt-6 pb-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="font-black italic text-white text-xl tracking-widest">PRIME</div>
                <div className="text-[#79828b] text-xs mt-1 leading-relaxed">
                  {t.home.tagline}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <div className="w-8 h-8 rounded-full bg-[#3390ec]/10 flex items-center justify-center text-[#3390ec]">
                  <Send size={14} />
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#79828b]">
                  <Instagram size={14} />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[#79828b] text-xs mb-4">
              <a href="#" className="hover:text-white transition-colors">{t.home.footer.privacy}</a>
              <a href="#" className="hover:text-white transition-colors">{t.home.footer.terms}</a>
              <a href="#" className="hover:text-white transition-colors">{t.home.footer.rules}</a>
              <a href="#" className="hover:text-white transition-colors">{t.home.footer.contact}</a>
            </div>
            <p className="text-[#79828b] text-[10px]">{t.home.copyright}</p>
          </div>
        </div>

      </div>
    </div>
  );
}

function PillFilter({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full font-bold text-[11px] uppercase tracking-wider transition-all whitespace-nowrap flex-shrink-0 border ${
        active
          ? "bg-[#3390ec] text-white border-[#3390ec]"
          : "bg-[#222f3e] text-[#79828b] border-white/5 hover:border-[#3390ec]/30"
      }`}
    >
      {label}
    </button>
  );
}
