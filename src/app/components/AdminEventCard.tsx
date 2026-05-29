import { Calendar, Clock, MapPin, ChevronRight } from "lucide-react";
import { getCategoryStyle, type AdminEvent, type EventStatus } from "../data/adminData";

const STATUS_CONFIG: Record<EventStatus, { label: string; chip: string; dot: string }> = {
  upcoming: { label: "Published", chip: "bg-[#4dcd5e]/10 text-[#4dcd5e]",  dot: "bg-[#4dcd5e]"  },
  past:     { label: "Past",      chip: "bg-white/5 text-[#79828b]",        dot: "bg-[#79828b]"  },
  draft:    { label: "Draft",     chip: "bg-[#eab308]/10 text-[#eab308]",   dot: "bg-[#eab308]"  },
  canceled: { label: "Canceled",  chip: "bg-[#ef4444]/10 text-[#ef4444]",   dot: "bg-[#ef4444]"  },
};

const czk = (n: number) => n.toLocaleString("cs-CZ") + " CZK";

export function AdminEventCard({
  event,
  onNavigate,
}: {
  event: AdminEvent & { status: EventStatus };
  onNavigate: (path: string) => void;
}) {
  const unpaid    = event.roster.filter(p => p.paymentStatus === "unpaid").length;
  const isFull    = event.roster.length >= event.capacity;
  const fillPct   = Math.min((event.roster.length / event.capacity) * 100, 100);
  const status    = STATUS_CONFIG[event.status];
  const collected    = event.roster.filter(p => p.paymentStatus !== "unpaid").length * event.price;
  const unpaidAmount = unpaid * event.price;
  const expected     = event.roster.length * event.price;
  const allPaid      = event.price > 0 && unpaid === 0 && event.roster.length > 0;

  return (
    <div
      className="group bg-[#17212b] rounded-xl border border-white/5 hover:border-white/10 transition-colors overflow-hidden cursor-pointer"
      onClick={() => onNavigate(`/admin/events/${event.id}`)}
    >
      {/* Badges */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${getCategoryStyle(event.category)}`}>
          {event.category}
        </span>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md ${status.chip}`}>
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`} />
          <span className="text-[10px] font-black uppercase tracking-widest">{status.label}</span>
        </div>
      </div>

      {/* Content: info left, revenue right */}
      <div className="flex items-stretch gap-0 px-4 pb-3">

        {/* Left: main info */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="font-black text-white text-base tracking-wide leading-tight mb-2.5">
            {event.title}
          </div>

          {/* Date + Time */}
          <div className="flex items-center gap-2 text-xs mb-1.5 flex-wrap">
            <span className="flex items-center gap-1.5 shrink-0">
              <Calendar size={12} className="text-[#3390ec]" />
              <span className="text-white/90 font-medium">{event.date}</span>
            </span>
            <span className="text-[#79828b]">·</span>
            <span className="flex items-center gap-1.5 shrink-0">
              <Clock size={12} className="text-[#3390ec]" />
              <span className="text-white/90 font-medium">{event.time}</span>
            </span>
          </div>

          {/* Location + Price */}
          <div className="flex items-center gap-x-2 gap-y-1 text-xs mb-3 flex-wrap">
            <span className="flex items-center gap-1.5">
              <MapPin size={12} className="text-[#3390ec] shrink-0" />
              <span className="text-[#79828b]">{event.location}</span>
            </span>
            <span className="text-[#3390ec] font-black shrink-0">{event.priceLabel}</span>
          </div>

          {/* Capacity — pinned to bottom of left column */}
          <div className="mt-auto">
            <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
              <span className="text-[#79828b]">Roster</span>
              <span className={isFull ? "text-[#4dcd5e]" : "text-white"}>
                {event.roster.length} / {event.capacity}
              </span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${isFull ? "bg-[#4dcd5e]" : "bg-[#3390ec]"}`}
                style={{ width: `${fillPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: revenue — only for paid events */}
        {event.price > 0 && (
          <div className="shrink-0 w-28 flex flex-col items-end justify-center gap-1.5 pl-4 ml-4 border-l border-white/5 text-right">
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-[#79828b] mb-0.5">Collected</div>
              <div className={`text-sm font-black ${allPaid ? "text-[#4dcd5e]" : "text-white"}`}>
                {czk(collected)}
              </div>
            </div>
            {unpaid > 0 && (
              <>
                <div className="w-full h-px bg-white/5" />
                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-[#79828b] mb-0.5">Unpaid</div>
                  <div className="text-sm font-black text-[#ef4444]">{czk(unpaidAmount)}</div>
                </div>
              </>
            )}
            <div className="w-full h-px bg-white/5" />
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-[#79828b] mb-0.5">Expected</div>
              <div className="text-sm font-black text-[#79828b]">{czk(expected)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Footer: moderator + arrow */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-white/5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <img
            src={event.moderator.avatar}
            alt={event.moderator.name}
            className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-white/10"
          />
          <span className="text-[#79828b] text-[11px] font-bold truncate">{event.moderator.name}</span>
        </div>

        <div className="w-8 h-8 rounded-full bg-[#242f3d] flex items-center justify-center text-white/50 group-hover:text-white group-hover:bg-[#3390ec] transition-colors shrink-0">
          <ChevronRight size={18} />
        </div>
      </div>
    </div>
  );
}
