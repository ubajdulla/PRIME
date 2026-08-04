import { memo } from "react";
import { Link, useNavigate } from "react-router";
import { MapPin, Calendar, Clock, ChevronRight, User } from "lucide-react";
import { LevelBookmark } from "./ui/LevelBookmark";
import { CategoryIcon } from "./ui/CategoryIcon";
import { useIsMobile } from "./ui/use-mobile";
import { useLang } from "../i18n";
import { useAuth } from "../lib/AuthContext";

export interface EventCardProps {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  price: string;
  capacity: { current: number; max: number };
  avatars: { id: string; url: string | null }[];
  status: "REQUEST ONLY" | "JOIN DIRECTLY";
  moderator?: { id: string; name: string; avatar: string | null } | null;
  image?: string;
  category?: string;
  level?: string;
  horizontal?: boolean;
  canceled?: boolean;
}

export const EventCard = memo(function EventCard({
  id,
  title,
  date,
  time,
  location,
  price,
  capacity,
  avatars,
  moderator,
  image,
  category,
  level,
  status,
  horizontal = false,
  canceled = false,
}: EventCardProps) {
  const { t } = useLang();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isLoggedIn, isAdmin } = useAuth();
  const fillPct = Math.min(100, (capacity.current / capacity.max) * 100);
  const initials = moderator?.name?.trim().charAt(0).toUpperCase() ?? "";

  // Avatars sit inside the card's own event Link - on mobile, tapping one
  // should open that player's profile instead of the event, without taking
  // over the rest of the card. Desktop keeps the whole-card click (no
  // separate hover affordance there), and profiles require login (same rule
  // as the event page's roster), so in both cases this falls through and
  // the tap just navigates to the event as normal.
  function goToPlayerProfile(playerId: string, e: React.MouseEvent) {
    if (!isMobile || !isLoggedIn) return;
    e.preventDefault();
    e.stopPropagation();
    navigate(isAdmin ? `/admin/player/${playerId}` : `/players/${playerId}`);
  }

  return (
    <Link
      to={`/events/${id}`}
      className={`block relative group rounded-2xl bg-[var(--surface-1)] shadow-sm hover:shadow-md transition-shadow overflow-hidden ${
        horizontal ? 'min-w-[280px] w-[280px] flex-shrink-0' : 'w-full'
      }`}
    >
      {/* Image with padding */}
      <div className="px-3 pt-3">
        <div className="relative w-full h-36 md:h-44 overflow-hidden rounded-xl bg-[var(--surface-1)]">
          {image ? (
            <img src={image} alt={title} loading="lazy" decoding="async" className={`w-full h-full object-cover${canceled ? " grayscale" : ""}`} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1e2d3d] to-[var(--surface-1)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-1)]/50 via-transparent to-transparent" />

          {/* Canceled X overlay */}
          {canceled && (
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="0" y1="0" x2="100" y2="100" stroke="#ef4444" strokeOpacity="0.7" strokeWidth="1.5" />
              <line x1="100" y1="0" x2="0" y2="100" stroke="#ef4444" strokeOpacity="0.7" strokeWidth="1.5" />
            </svg>
          )}

          {/* Level ribbon — hangs from the top edge of the image like a bookmark,
              instead of floating as an isolated corner chip. */}
          {level && (
            <LevelBookmark level={level} insufficient={status === "REQUEST ONLY"} positionClassName="right-3.5" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-3 pb-4 flex flex-col gap-2">
        {/* Title */}
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-black italic text-xl uppercase tracking-wide text-[var(--ink)] line-clamp-2 leading-tight min-w-0">
            {title}
          </h3>
          <CategoryIcon category={category} size={16} className="text-[#79828b] shrink-0 -translate-y-px" />
        </div>

        {/* Date & Time */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar size={14} className="text-[var(--brand)] shrink-0" />
          <span className="font-medium text-[var(--ink)]/90">{date}</span>
          <span className="text-[#79828b]">·</span>
          <Clock size={14} className="text-[var(--brand)] shrink-0" />
          <span className="font-medium text-[var(--ink)]/90">{time}</span>
        </div>

        {/* Location + Price */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-[#79828b] min-w-0">
            <MapPin size={14} className="shrink-0 text-[var(--brand)]" />
            <span className="truncate">{location}</span>
          </div>
          <span className="text-[var(--brand)] font-black text-sm shrink-0">{price}</span>
        </div>

        {/* Capacity bar — in description section */}
        <div className="flex items-center gap-2.5 mt-0.5">
          <div className="flex-1 h-1 bg-[var(--ink)]/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--brand)] rounded-full"
              style={{ width: `${fillPct}%` }}
            />
          </div>
          <span className="text-[#79828b] text-[11px] font-bold shrink-0 uppercase tracking-wide">
            {capacity.current}/{capacity.max} {t.event.spots}
          </span>
        </div>

        {/* Footer: host avatar + avatars + arrow */}
        <div className="flex justify-between items-center pt-2.5 border-t border-[var(--ink)]/5">
          <div className="flex items-center gap-2.5">
            {moderator && (
              <>
                <button
                  type="button"
                  onClick={e => goToPlayerProfile(moderator.id, e)}
                  className="w-9 h-9 shrink-0"
                >
                  {moderator.avatar ? (
                    <img
                      src={moderator.avatar}
                      loading="lazy"
                      decoding="async"
                      className="w-9 h-9 rounded-full border-2 border-[var(--brand)] object-cover bg-[var(--surface-1)]"
                      alt={moderator.name}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full border-2 border-[var(--brand)] bg-gradient-to-br from-[var(--brand)] to-[#7c5cff] flex items-center justify-center text-white text-xs font-black">
                      {initials || <User size={14} className="text-white/70" />}
                    </div>
                  )}
                </button>
                <div className="w-px h-9 bg-[var(--ink)]/10 shrink-0" />
              </>
            )}
            <div className="flex -space-x-2">
              {avatars.slice(0, 3).map((av, idx) => {
                // "guest-" ids are synthetic (walk-in participants with no
                // linked profile) - nothing to navigate to, so those avatars
                // just don't get a click handler and fall through to the
                // card's own event Link like the rest of the card.
                const hasProfile = !!av.id && !av.id.startsWith("guest-");
                return (
                  <button
                    key={av.id ?? idx}
                    type="button"
                    onClick={hasProfile ? e => goToPlayerProfile(av.id, e) : undefined}
                    className="relative shrink-0"
                  >
                    {av.url ? (
                      <img
                        src={av.url}
                        loading="lazy"
                        decoding="async"
                        className="w-9 h-9 rounded-full border-2 border-[var(--surface-1)] object-cover bg-[var(--surface-1)]"
                        alt="Player avatar"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full border-2 border-[var(--surface-1)] bg-[var(--surface-1)] flex items-center justify-center">
                        <User size={14} className="text-[var(--ink)]/30" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {capacity.current > 3 && (
              <span className="text-xs font-bold text-[#79828b] bg-[var(--ink)]/5 px-2 py-0.5 rounded-md">
                +{capacity.current - 3}
              </span>
            )}
          </div>

          <div className="w-8 h-8 rounded-full bg-[var(--brand)] flex items-center justify-center text-white transition-colors group-hover:bg-[var(--brand-hover)]">
            <ChevronRight size={18} />
          </div>
        </div>
      </div>
    </Link>
  );
});
