import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { Plus, SlidersHorizontal, ChevronDown, Check } from "lucide-react";
import { ADMIN_EVENTS, type EventStatus, type AdminEvent } from "../../data/adminData";

type FilterValue = EventStatus | "all";

const FILTER_OPTIONS: { label: string; value: FilterValue }[] = [
  { label: "All",      value: "all" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Past",     value: "past" },
  { label: "Draft",    value: "draft" },
];

export function AdminEvents() {
  const navigate = useNavigate();
  const [filter, setFilter]           = useState<FilterValue>("all");
  const [showFilter, setShowFilter]   = useState(false);
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set());
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

  const allEvents = ADMIN_EVENTS.map(e =>
    publishedIds.has(e.id) ? { ...e, status: "upcoming" as EventStatus } : e
  );
  const filtered = filter === "all" ? allEvents : allEvents.filter(e => e.status === filter);

  const activeLabel = FILTER_OPTIONS.find(f => f.value === filter)?.label ?? "Filter";

  function publish(id: string, ev: React.MouseEvent) {
    ev.stopPropagation();
    setPublishedIds(prev => new Set([...prev, id]));
  }

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
          <EventCard
            key={event.id}
            event={event}
            onPublish={publish}
            onNavigate={navigate}
          />
        ))}
      </div>
    </div>
  );
}

function EventCard({
  event,
  onPublish,
  onNavigate,
}: {
  event: AdminEvent & { status: EventStatus };
  onPublish: (id: string, ev: React.MouseEvent) => void;
  onNavigate: (path: string) => void;
}) {
  const unpaid  = event.roster.filter(p => p.paymentStatus === "unpaid").length;
  const isDraft = event.status === "draft";
  const isFull  = event.roster.length >= event.capacity;
  const allPaid = event.price > 0 && unpaid === 0 && event.roster.length > 0;

  return (
    <div className="bg-[#17212b] rounded-xl border border-white/5 hover:border-white/10 transition-colors overflow-hidden">

      {/* Row 1: content left, square image right — bottom-aligned */}
      <div
        className="flex items-end gap-3 p-4 pb-2 cursor-pointer"
        onClick={() => onNavigate(`/admin/events/${event.id}`)}
      >
        <div className="flex-1 min-w-0">
          <div className="font-black text-white text-base tracking-wide leading-tight mb-1">
            {event.title}
          </div>
          <div className="text-[#79828b] text-xs mb-4 truncate">
            {event.date} • {event.time} • {event.location}
            <span className="text-white font-bold"> • {event.priceLabel}</span>
          </div>
          <div className="flex justify-between text-[11px] font-bold mb-1.5">
            <span className="text-[#79828b]">Roster</span>
            <span className={isFull ? "text-[#4dcd5e]" : "text-white"}>
              {event.roster.length}/{event.capacity}
            </span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${isFull ? "bg-[#4dcd5e]" : "bg-[#3390ec]"}`}
              style={{ width: `${(event.roster.length / event.capacity) * 100}%` }}
            />
          </div>
        </div>

        {/* Square image 30% bigger — bottom aligned with capacity bar */}
        <img
          src={event.image}
          alt={event.title}
          className="w-[6.5rem] h-[6.5rem] rounded-xl object-cover shrink-0"
        />
      </div>

      {/* Row 2: always visible — payment status left, publish state right */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Left: payment status (hidden for drafts and free events) */}
        <div className="flex-1 min-w-0">
          {!isDraft && event.price > 0 && (
            unpaid > 0 ? (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                <span className="text-[#ef4444] text-[11px] font-bold">{unpaid} unpaid</span>
              </div>
            ) : allPaid ? (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4dcd5e]" />
                <span className="text-[#4dcd5e] text-[11px] font-bold">All paid</span>
              </div>
            ) : null
          )}
        </div>

        {/* Right: publish button or published label — always same width as image */}
        {isDraft ? (
          <button
            onClick={ev => { ev.stopPropagation(); onPublish(event.id, ev); }}
            className="w-[6.5rem] flex items-center justify-center py-1.5 bg-[#3390ec] text-white text-[11px] font-black uppercase tracking-widest rounded-lg active:scale-95 transition-transform shrink-0"
          >
            Publish
          </button>
        ) : (
          <div className="w-[6.5rem] flex items-center justify-center py-1.5 text-[#79828b] text-[11px] font-black uppercase tracking-widest shrink-0">
            Published
          </div>
        )}
      </div>
    </div>
  );
}
