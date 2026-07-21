import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Plus, SlidersHorizontal, ChevronDown, Check } from "lucide-react";
import { type EventStatus } from "../../data/adminData";
import { AdminEventCard, type AdminEventCardData } from "../../components/AdminEventCard";
import { supabase } from "../../lib/supabaseClient";
import { relativeDay, shortDate } from "../../lib/eventDate";

type FilterValue = EventStatus | "all";

const FILTER_OPTIONS: { label: string; value: FilterValue }[] = [
  { label: "All",      value: "all" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Past",     value: "past" },
  { label: "Draft",    value: "draft" },
];

type EventRow = {
  id: string;
  title: string;
  event_date: string;
  event_time: string;
  location: string;
  price: number;
  price_label: string | null;
  capacity: number;
  category: string | null;
  status: EventStatus;
  moderator: { name: string; avatar: string | null } | null;
  event_participants: { payment_status: string }[] | null;
};

export function AdminEvents() {
  const navigate = useNavigate();
  const [filter, setFilter]         = useState<FilterValue>("all");
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<AdminEventCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilter(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data } = await supabase
        .from("events")
        .select("id, title, event_date, event_time, location, price, price_label, capacity, category, status, moderator:profiles!moderator_id(name, avatar), event_participants(payment_status)")
        .order("event_date", { ascending: false });
      if (!active) return;

      const mapped: AdminEventCardData[] = ((data as unknown as EventRow[]) ?? []).map(row => {
        const participants = row.event_participants ?? [];
        const unpaidCount = participants.filter(p => p.payment_status === "unpaid").length;
        return {
          id: row.id,
          title: row.title,
          date: relativeDay(row.event_date) ? `${relativeDay(row.event_date)} • ${shortDate(row.event_date)}` : shortDate(row.event_date),
          time: row.event_time,
          location: row.location,
          price: row.price,
          priceLabel: row.price_label ?? "FREE",
          capacity: row.capacity,
          category: row.category ?? "",
          status: row.status,
          moderatorName: row.moderator?.name ?? "—",
          moderatorAvatar: row.moderator?.avatar ?? null,
          rosterCount: participants.length,
          paidCount: participants.length - unpaidCount,
          unpaidCount,
        };
      });
      setEvents(mapped);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  const filtered = filter === "all" ? events : events.filter(e => e.status === filter);

  const activeLabel = FILTER_OPTIONS.find(f => f.value === filter)?.label ?? "Filter";

  return (
    <div className="max-w-[700px] mx-auto px-4 py-8">

      {/* Top bar: Filter (left) + Create (right) */}
      <div className="flex items-center justify-between mb-5">

        {/* Filter dropdown */}
        <div ref={filterRef} className="relative">
          <button
            onClick={() => setShowFilter(v => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-black text-xs uppercase tracking-widest transition-colors ${
              filter !== "all"
                ? "bg-[#3390ec]/10 border-[#3390ec]/40 text-[#3390ec]"
                : "bg-[#17212b] border-white/10 text-[#79828b] hover:text-white hover:border-white/20"
            }`}
          >
            <SlidersHorizontal size={13} />
            {activeLabel}
            <ChevronDown size={12} className={`transition-transform ${showFilter ? "rotate-180" : ""}`} />
          </button>

          {showFilter && (
            <div className="absolute left-0 top-full mt-2 bg-[#17212b] border border-white/10 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.4)] z-20 overflow-hidden min-w-[160px]">
              {FILTER_OPTIONS.map(f => (
                <button
                  key={f.value}
                  onClick={() => { setFilter(f.value); setShowFilter(false); }}
                  className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-bold text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                >
                  <span className={filter === f.value ? "text-[#3390ec]" : "text-white"}>{f.label}</span>
                  {filter === f.value && <Check size={13} className="text-[#3390ec]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Create button */}
        <button
          onClick={() => navigate("/admin/events/create")}
          className="flex items-center gap-2 bg-[#3390ec] text-white text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-transform shadow-[0_0_16px_rgba(51,144,236,0.25)]"
        >
          <Plus size={15} />
          Create
        </button>
      </div>

      {/* Events list */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 && !loading && (
          <p className="text-[#79828b] text-sm text-center py-10">No events found</p>
        )}
        {filtered.map(event => (
          <AdminEventCard
            key={event.id}
            event={event}
            onNavigate={navigate}
          />
        ))}
      </div>
    </div>
  );
}
