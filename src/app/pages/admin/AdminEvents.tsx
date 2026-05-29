import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { Plus, SlidersHorizontal, ChevronDown, Check } from "lucide-react";
import { ADMIN_EVENTS, type EventStatus } from "../../data/adminData";
import { AdminEventCard } from "../../components/AdminEventCard";

type FilterValue = EventStatus | "all";

const FILTER_OPTIONS: { label: string; value: FilterValue }[] = [
  { label: "All",      value: "all" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Past",     value: "past" },
  { label: "Draft",    value: "draft" },
];

export function AdminEvents() {
  const navigate = useNavigate();
  const [filter, setFilter]         = useState<FilterValue>("all");
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilter(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = filter === "all" ? ADMIN_EVENTS : ADMIN_EVENTS.filter(e => e.status === filter);

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
          className="flex items-center gap-2 bg-[#3390ec] text-white text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-xl active:scale-[0.97] transition-transform shadow-[0_0_16px_rgba(51,144,236,0.25)]"
        >
          <Plus size={15} />
          Create
        </button>
      </div>

      {/* Events list */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 && (
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

