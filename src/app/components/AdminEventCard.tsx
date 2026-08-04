import { Calendar, Clock, MapPin, ChevronRight, User, Volleyball, Trophy, Dumbbell, Palmtree, PartyPopper, Users, PenLine } from "lucide-react";
import { getCategoryIconName, type EventStatus } from "../data/adminData";
import { useWaterRipple, RippleLayer } from "./ui/useWaterRipple";
import { useLang } from "../i18n";

type DisplayStatus = EventStatus | "scheduled";

const CATEGORY_ICON = {
  volleyball: Volleyball,
  trophy: Trophy,
  dumbbell: Dumbbell,
  palmtree: Palmtree,
  party: PartyPopper,
  users: Users,
};

// The card's own styling (border, opacity, title treatment) carries most of the
// status signal now — a colored word is only shown for the two states an admin
// actually needs to notice (draft, canceled). Published/past/scheduled speak
// for themselves through the card treatment below, no label needed.
const STATUS_TREATMENT: Record<DisplayStatus, {
  label: string | null;
  labelColor: string;
  icon?: typeof PenLine;
  border: string;
  opacity: string;
  strikethrough?: boolean;
}> = {
  upcoming:  { label: null,          labelColor: "",              border: "",                opacity: "opacity-100" },
  scheduled: { label: "Scheduled",   labelColor: "text-[#a855f7]", border: "border border-dashed border-[#a855f7]/25", opacity: "opacity-100" },
  draft:     { label: null,          labelColor: "text-[var(--ink)]",     icon: PenLine, border: "border border-dashed border-[var(--ink)]/15", opacity: "opacity-90" },
  past:      { label: null,          labelColor: "",              border: "",                opacity: "opacity-60" },
  canceled:  { label: "Canceled",    labelColor: "text-[#ef4444]", border: "",                opacity: "opacity-55", strikethrough: true },
};

const czk = (n: number) => n.toLocaleString("cs-CZ") + " CZK";

export type AdminEventCardData = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  price: number;
  priceLabel: string;
  capacity: number;
  category: string;
  status: EventStatus;
  isPast: boolean;
  publishedAt: string | null;
  moderatorName: string;
  moderatorAvatar: string | null;
  rosterCount: number;
  paidCount: number;
  unpaidCount: number;
};

export function AdminEventCard({
  event,
  onNavigate,
}: {
  event: AdminEventCardData;
  onNavigate: (path: string) => void;
}) {
  const { t } = useLang();
  const isFull      = event.rosterCount >= event.capacity;
  const fillPct     = event.capacity > 0 ? Math.min((event.rosterCount / event.capacity) * 100, 100) : 0;
  const isScheduled = !!event.publishedAt && new Date(event.publishedAt) > new Date();
  const displayStatus: DisplayStatus = event.status === "draft" || event.status === "canceled"
    ? event.status
    : event.isPast ? "past" : isScheduled ? "scheduled" : "upcoming";
  const treatment    = STATUS_TREATMENT[displayStatus];
  const CategoryIcon = CATEGORY_ICON[getCategoryIconName(event.category)];
  const collected    = event.paidCount * event.price;
  const unpaidAmount = event.unpaidCount * event.price;
  const expected     = event.capacity * event.price;
  const cardRipple   = useWaterRipple();

  return (
    <div
      className={`group relative bg-[var(--surface-1)] rounded-xl transition-colors overflow-hidden cursor-pointer hover:border-[var(--ink)]/10 ${treatment.border} ${treatment.opacity}`}
      onClick={() => onNavigate(`/admin/events/${event.id}`)}
      onPointerDown={cardRipple.onPointerDown}
    >
      <RippleLayer ripples={cardRipple.ripples} />

      {/* Content: info left, revenue right */}
      <div className="flex items-stretch gap-0 px-4 pt-4 pb-3">

        {/* Left: main info */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`font-black text-[var(--ink)] text-base tracking-wide leading-tight truncate ${treatment.strikethrough ? "line-through decoration-2 decoration-[var(--ink)]/40" : ""}`}>
                {event.title}
              </span>
              <CategoryIcon size={15} className="text-[#79828b] shrink-0 -translate-y-px" />
            </div>
            {treatment.icon ? (
              <treatment.icon size={15} className={`shrink-0 -translate-y-px ${treatment.labelColor}`} />
            ) : treatment.label && (
              <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 ${treatment.labelColor}`}>
                {displayStatus === "scheduled" ? t.admin.scheduled : displayStatus === "canceled" ? t.event.canceled : treatment.label}
              </span>
            )}
          </div>

          {/* Date + Time */}
          <div className="flex items-center gap-2 text-xs mb-1.5 flex-wrap">
            <span className="flex items-center gap-1.5 shrink-0">
              <Calendar size={12} className="text-[var(--brand)]" />
              <span className="text-[var(--ink)]/90 font-medium">{event.date}</span>
            </span>
            <span className="text-[#79828b]">·</span>
            <span className="flex items-center gap-1.5 shrink-0">
              <Clock size={12} className="text-[var(--brand)]" />
              <span className="text-[var(--ink)]/90 font-medium">{event.time}</span>
            </span>
          </div>

          {/* Location + Price */}
          <div className="flex items-center gap-x-2 gap-y-1 text-xs mb-3 flex-wrap">
            <span className="flex items-center gap-1.5">
              <MapPin size={12} className="text-[var(--brand)] shrink-0" />
              <span className="text-[#79828b]">{event.location}</span>
            </span>
            <span className="text-[var(--brand)] font-black shrink-0">{event.priceLabel}</span>
          </div>

          {/* Capacity — pinned to bottom of left column */}
          <div className="mt-auto">
            <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
              <span className="text-[#79828b]">{t.admin.roster}</span>
              <span className={isFull ? "text-[#4dcd5e]" : "text-[var(--ink)]"}>
                {event.rosterCount} / {event.capacity}
              </span>
            </div>
            <div className="h-1.5 bg-[var(--ink)]/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${isFull ? "bg-[#4dcd5e]" : "bg-[var(--brand)]"}`}
                style={{ width: `${fillPct}%` }}
              />
            </div>

            {/* Money — one quiet line; red only shows up when there's something to chase */}
            {event.price > 0 && (
              <div className="flex items-center justify-between text-[11px] font-bold mt-2">
                <span className="text-[#79828b]">
                  {czk(collected)} <span className="text-[#79828b]/60">/ {czk(expected)}</span> collected
                </span>
                {unpaidAmount > 0 && (
                  <span className="text-[#ef4444]">{czk(unpaidAmount)} unpaid</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer: moderator + arrow */}
      <div className="relative flex items-center gap-3 px-4 py-3 before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-[var(--ink)]/[0.06]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {event.moderatorAvatar ? (
            <img
              src={event.moderatorAvatar}
              alt={event.moderatorName}
              className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-[var(--ink)]/10"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[var(--ink)]/5 shrink-0 ring-1 ring-[var(--ink)]/10 flex items-center justify-center">
              <User size={14} className="text-[var(--ink)]/30" />
            </div>
          )}
          <span className="text-[#79828b] text-[11px] font-bold truncate">{event.moderatorName}</span>
        </div>

        <div className="w-8 h-8 rounded-full bg-[var(--surface-hover)] flex items-center justify-center text-[var(--ink)]/50 group-hover:text-white group-hover:bg-[var(--brand)] transition-colors shrink-0">
          <ChevronRight size={18} />
        </div>
      </div>
    </div>
  );
}
