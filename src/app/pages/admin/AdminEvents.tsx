import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Plus, SlidersHorizontal, Check } from "lucide-react";
import { useWaterRipple, RippleLayer } from "../../components/ui/useWaterRipple";
import { type EventStatus } from "../../data/adminData";
import { AdminEventCard, type AdminEventCardData } from "../../components/AdminEventCard";
import { DropdownPanel } from "../../components/ui/DropdownMenu";
import { supabase } from "../../lib/supabaseClient";
import { relativeDay, shortDate, isPastDate } from "../../lib/eventDate";

type FilterValue = "active" | "past";

const FILTER_OPTIONS: { label: string; value: FilterValue }[] = [
  { label: "Active", value: "active" },
  { label: "Past",   value: "past" },
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
  published_at: string | null;
  moderator: { name: string; avatar: string | null } | null;
  event_participants: { payment_status: string }[] | null;
};

export function AdminEvents() {
  const navigate = useNavigate();
  const createRipple = useWaterRipple();
  const [filter, setFilter]         = useState<FilterValue>("active");
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<(AdminEventCardData & { filterGroup: FilterValue; rawDate: string })[]>([]);
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
        .select("id, title, event_date, event_time, location, price, price_label, capacity, category, status, published_at, moderator:profiles!moderator_id(name, avatar), event_participants(payment_status)")
        .order("event_date", { ascending: false });
      if (!active) return;

      const mapped: (AdminEventCardData & { filterGroup: FilterValue; rawDate: string })[] = ((data as unknown as EventRow[]) ?? []).map(row => {
        const participants = row.event_participants ?? [];
        const unpaidCount = participants.filter(p => p.payment_status === "unpaid").length;
        const isPast = isPastDate(row.event_date);
        // Drafts and canceled events always stay under "Active" (they never move to "Past");
        // only an event that actually happened as scheduled becomes "Past".
        const filterGroup: FilterValue = row.status === "upcoming" && isPast ? "past" : "active";
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
          isPast,
          publishedAt: row.published_at,
          moderatorName: row.moderator?.name ?? "—",
          moderatorAvatar: row.moderator?.avatar ?? null,
          rosterCount: participants.length,
          paidCount: participants.length - unpaidCount,
          unpaidCount,
          filterGroup,
          rawDate: row.event_date,
        };
      });
      setEvents(mapped);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  const chronoAsc  = (a: typeof events[number], b: typeof events[number]) => a.rawDate.localeCompare(b.rawDate);
  const chronoDesc = (a: typeof events[number], b: typeof events[number]) => b.rawDate.localeCompare(a.rawDate);

  // "Active": live + canceled events sorted chronologically, drafts always trailing at the end.
  const activeItems = events.filter(e => e.filterGroup === "active");
  const activeSorted = [
    ...activeItems.filter(e => e.status !== "draft").sort(chronoAsc),
    ...activeItems.filter(e => e.status === "draft").sort(chronoAsc),
  ];
  // "Past": most recently happened first.
  const pastSorted = events.filter(e => e.filterGroup === "past").sort(chronoDesc);

  const filtered = filter === "active" ? activeSorted : pastSorted;

  const activeLabel = FILTER_OPTIONS.find(f => f.value === filter)?.label ?? "Filter";

  return (
    <div className="max-w-[640px] mx-auto px-4 py-8">

      {/* Top bar: Filter (left) + Create (right) */}
      <div className="flex items-center justify-between mb-5">

        {/* Filter dropdown */}
        <div ref={filterRef} className="relative">
          <button
            onClick={() => setShowFilter(v => !v)}
            aria-label={activeLabel}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-white/10 text-[#79828b] hover:bg-white/20 hover:text-white transition-colors"
          >
            <SlidersHorizontal size={16} />
          </button>

          {showFilter && (
            <div className="absolute left-0 top-full mt-2 z-20 min-w-[160px]">
              <DropdownPanel>
                {FILTER_OPTIONS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => { setFilter(f.value); setShowFilter(false); }}
                    className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-left hover:bg-white/5 transition-colors"
                  >
                    <span className={filter === f.value ? "text-[#462ed1]" : "text-white"}>{f.label}</span>
                    {filter === f.value && <Check size={13} className="text-[#462ed1]" />}
                  </button>
                ))}
              </DropdownPanel>
            </div>
          )}
        </div>

        {/* Create button */}
        <button
          onClick={() => navigate("/admin/events/create")}
          onPointerDown={createRipple.onPointerDown}
          className="relative overflow-hidden flex items-center gap-2 h-11 bg-[#462ed1] text-white text-xs font-black uppercase tracking-widest px-4 rounded-full"
        >
          <Plus size={15} />
          Create
          <RippleLayer ripples={createRipple.ripples} />
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
