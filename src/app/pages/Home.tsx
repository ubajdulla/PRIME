import { useState } from "react";
import { Instagram, Send } from "lucide-react";
import { EventCard, EventCardProps } from "../components/EventCard";
import { useLang, type Dict } from "../i18n";

const AVATARS = [
  "https://images.unsplash.com/photo-1667970573560-6ecf6a143514?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1587930693964-e16abf7299f5?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1582836997529-023a5ae82b1f?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
];

const ALL_EVENTS: EventCardProps[] = [
  {
    id: "e1",
    title: "PRO-AM INVITATIONAL #12",
    date: "TODAY",
    time: "20:00 - 22:00",
    location: "Cyber Arena, Sector 4",
    price: "625 CZK",
    capacity: { current: 8, max: 10 },
    avatars: AVATARS.slice(0, 3).concat(AVATARS),
    status: "JOIN DIRECTLY",
    category: "GAMES",
    image: "https://images.unsplash.com/photo-1546519638405-a4ebb24f9e0b?w=600&h=400&fit=crop",
  },
  {
    id: "e2",
    title: "MIDNIGHT SCRIM",
    date: "TODAY",
    time: "23:00 - 02:00",
    location: "Neon Hub",
    price: "375 CZK",
    capacity: { current: 10, max: 10 },
    avatars: AVATARS.slice().reverse(),
    status: "REQUEST ONLY",
    category: "TOURNAMENT",
    image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&h=400&fit=crop",
  },
  {
    id: "e3",
    title: "MORNING GRIND SESSION",
    date: "TOMORROW",
    time: "09:00 - 11:00",
    location: "Virtual Dojo",
    price: "250 CZK",
    capacity: { current: 2, max: 12 },
    avatars: AVATARS.slice(1, 3),
    status: "JOIN DIRECTLY",
    category: "TRAININGS",
    image: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=600&h=400&fit=crop",
  },
  {
    id: "e4",
    title: "WEEKEND WARRIORS CLASH",
    date: "SAT, OCT 26",
    time: "18:00 - 21:00",
    location: "Main Stadium",
    price: "750 CZK",
    capacity: { current: 5, max: 16 },
    avatars: AVATARS.slice(0, 5),
    status: "REQUEST ONLY",
    category: "TOURNAMENT",
    image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&h=400&fit=crop",
  },
  {
    id: "e5",
    title: "CASUAL LOBBY MIX",
    date: "SUN, OCT 27",
    time: "15:00 - 17:00",
    location: "Local Server",
    price: "FREE",
    capacity: { current: 1, max: 8 },
    avatars: [AVATARS[2]],
    status: "JOIN DIRECTLY",
    category: "BEACH",
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&h=400&fit=crop",
  }
];

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

  const filtered = ALL_EVENTS.filter(e => {
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
          <div className={`${DOT_W}  shrink-0`} />
          <div className="flex-1 min-w-0 flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {ALL_FILTERS.map(f => (
              <PillFilter key={f} label={t.home.filters[FILTER_KEY[f]]} active={activeFilter === f} onClick={() => setActiveFilter(f)} />
            ))}
          </div>
        </div>

        {/* ── Chronological timeline ────────────────────────────────── */}
        <div className="flex flex-col">
          {dateGroups.length === 0 && (
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
