import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Plus, SlidersHorizontal, Check } from "lucide-react";
import { useWaterRipple, RippleLayer } from "../../components/ui/useWaterRipple";
import { type EventStatus } from "../../data/adminData";
import { AdminEventCard, type AdminEventCardData } from "../../components/AdminEventCard";
import { DropdownPanel } from "../../components/ui/DropdownMenu";
import { supabase } from "../../lib/supabaseClient";
import { formatEventDate, isPastDate } from "../../lib/eventDate";
import { useHorizontalSwipe } from "../../lib/useHorizontalSwipe";
import { navDir } from "../../lib/navDir";
import { useLang } from "../../i18n";
import { useExclusiveOpen } from "../../lib/exclusiveOpen";

type FilterValue = "active" | "past";

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
  const { t } = useLang();
  const FILTER_OPTIONS: { label: string; value: FilterValue }[] = [
    { label: t.admin.filterActive, value: "active" },
    { label: t.admin.filterPast,   value: "past" },
  ];
  const createRipple = useWaterRipple();
  const [filter, setFilter]         = useState<FilterValue>("active");
  const [showFilter, setShowFilter] = useState(false);
  useExclusiveOpen(showFilter, () => setShowFilter(false));
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
      // Past events (status='upcoming' whose date has passed) older than 4
      // weeks aren't fetched - this table has no upper bound otherwise and
      // would keep growing forever. Drafts/canceled are exempt (any date,
      // including deliberately past-dated test events) since they never
      // move into the "Past" tab in the first place - see filterGroup below.
      const cutoff = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
      const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
      const { data } = await supabase
        .from("events")
        .select("id, title, event_date, event_time, location, price, price_label, capacity, category, status, published_at, moderator:profiles!moderator_id(name, avatar), event_participants(payment_status)")
        .or(`event_date.gte.${cutoffStr},status.neq.upcoming`)
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
          date: row.event_date,
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

  // Swipe left to the Players tab - same no-slide route transition as tapping
  // the sub-navbar tab in AdminLayout (navDir.none()), but the page itself
  // follows the drag and springs back if it doesn't clear the threshold.
  const { containerRef: swipeRef, handlers: swipeHandlers, style: swipeStyle } =
    useHorizontalSwipe(() => { navDir.none(); navigate("/admin/players"); });

  return (
    <div ref={swipeRef} className="max-w-[640px] mx-auto px-4 py-8" style={swipeStyle} {...swipeHandlers}>

      {/* Top bar: Filter (left) + Create (right) */}
      <div className="flex items-center justify-between mb-5">

        {/* Filter dropdown */}
        <div ref={filterRef} className="relative">
          <button
            onClick={() => setShowFilter(v => !v)}
            aria-label={activeLabel}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-[var(--surface-hover)] text-[#79828b] hover:bg-[var(--surface-active)] hover:text-[var(--ink)] transition-colors"
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
                    className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-left hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <span className={filter === f.value ? "text-[var(--brand)]" : "text-[var(--ink)]"}>{f.label}</span>
                    {filter === f.value && <Check size={13} className="text-[var(--brand)]" />}
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
          className="relative overflow-hidden flex items-center gap-2 h-11 bg-[var(--brand)] text-white text-xs font-black uppercase tracking-widest px-4 rounded-full"
        >
          <Plus size={15} />
          {t.admin.createBtn}
          <RippleLayer ripples={createRipple.ripples} />
        </button>
      </div>

      {/* Events list */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 && !loading && (
          <p className="text-[#79828b] text-sm text-center py-10">{t.admin.noEventsFound}</p>
        )}
        {filtered.map(event => (
          <AdminEventCard
            key={event.id}
            event={{ ...event, date: formatEventDate(event.rawDate, t) }}
            onNavigate={navigate}
          />
        ))}
      </div>
    </div>
  );
}
