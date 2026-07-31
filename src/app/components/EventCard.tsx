import { Link } from "react-router";
import { MapPin, Calendar, Clock, ChevronRight, User, Volleyball, Trophy, Dumbbell, Palmtree, PartyPopper } from "lucide-react";
import { getCategoryIconName } from "../data/adminData";

// One color for every tier — the app's accent violet. Only the numeric
// range in the badge changes between levels, not the color.
const LEVEL_ACCENT = "hsl(249, 64%, 50%)";
const LEVEL_RANGE: Record<string, string> = {
  Rookie:       "1–2",
  Beginner:     "2–3",
  Intermediate: "3–4",
  Advanced:     "4–5",
  Pro:          "5–6",
  PRIME:        "6–7",
};

const CATEGORY_ICON = {
  volleyball: Volleyball,
  trophy: Trophy,
  dumbbell: Dumbbell,
  palmtree: Palmtree,
  party: PartyPopper,
};

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
  moderator?: { name: string; avatar: string | null } | null;
  image?: string;
  category?: string;
  level?: string;
  horizontal?: boolean;
  canceled?: boolean;
}

export function EventCard({
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
  horizontal = false,
  canceled = false,
}: EventCardProps) {
  const fillPct = Math.min(100, (capacity.current / capacity.max) * 100);
  const initials = moderator?.name?.trim().charAt(0).toUpperCase() ?? "";
  const CategoryIcon = category ? CATEGORY_ICON[getCategoryIconName(category)] : null;

  return (
    <Link
      to={`/events/${id}`}
      className={`block relative group rounded-2xl bg-[#212121] shadow-sm hover:shadow-md transition-shadow overflow-hidden ${
        horizontal ? 'min-w-[280px] w-[280px] flex-shrink-0' : 'w-full'
      }`}
    >
      {/* Image with padding */}
      <div className="px-3 pt-3">
        <div className="relative w-full h-36 md:h-44 overflow-hidden rounded-xl bg-[#212121]">
          {image ? (
            <img src={image} alt={title} className={`w-full h-full object-cover${canceled ? " grayscale" : ""}`} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1e2d3d] to-[#212121]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#212121]/50 via-transparent to-transparent" />

          {/* Canceled X overlay */}
          {canceled && (
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="0" y1="0" x2="100" y2="100" stroke="#ef4444" strokeOpacity="0.7" strokeWidth="1.5" />
              <line x1="100" y1="0" x2="0" y2="100" stroke="#ef4444" strokeOpacity="0.7" strokeWidth="1.5" />
            </svg>
          )}

          {/* Canceled badge — overlaid top-left on image */}
          {canceled && (
            <div className="absolute top-2.5 left-2.5">
              <span className="text-[10px] font-bold px-2.5 py-1 uppercase tracking-widest rounded-md flex items-center gap-1 backdrop-blur-sm bg-[#ef4444]/90 text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-white/60"></span>
                CANCELED
              </span>
            </div>
          )}

          {/* Level ribbon — hangs from the top edge of the image like a bookmark,
              instead of floating as an isolated corner chip. */}
          {level && (() => {
            const range = LEVEL_RANGE[level] ?? LEVEL_RANGE["Rookie"];
            return (
              <div
                className="absolute top-0 right-3.5 w-9 flex flex-col items-center pt-2 shadow-[0_3px_8px_rgba(0,0,0,0.35)]"
                style={{
                  height: 52,
                  background: LEVEL_ACCENT,
                  clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)",
                }}
              >
                <span className="text-[7px] font-black uppercase tracking-wide text-white/85">Lvl</span>
                <span className="text-sm font-black italic leading-tight text-white mt-0.5">{range}</span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-3 pb-4 flex flex-col gap-2">
        {/* Title */}
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-black italic text-xl uppercase tracking-wide text-white line-clamp-2 leading-tight min-w-0">
            {title}
          </h3>
          {CategoryIcon && <CategoryIcon size={16} className="text-[#79828b] shrink-0 -translate-y-px" />}
        </div>

        {/* Date & Time */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar size={14} className="text-[#462ed1] shrink-0" />
          <span className="font-medium text-white/90">{date}</span>
          <span className="text-[#79828b]">·</span>
          <Clock size={14} className="text-[#462ed1] shrink-0" />
          <span className="font-medium text-white/90">{time}</span>
        </div>

        {/* Location + Price */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-[#79828b] min-w-0">
            <MapPin size={14} className="shrink-0 text-[#462ed1]" />
            <span className="truncate">{location}</span>
          </div>
          <span className="text-[#462ed1] font-black text-sm shrink-0">{price}</span>
        </div>

        {/* Capacity bar — in description section */}
        <div className="flex items-center gap-2.5 mt-0.5">
          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#462ed1] rounded-full"
              style={{ width: `${fillPct}%` }}
            />
          </div>
          <span className="text-[#79828b] text-[11px] font-bold shrink-0 uppercase tracking-wide">
            {capacity.current}/{capacity.max} spots
          </span>
        </div>

        {/* Footer: host + avatars + arrow */}
        <div className="flex justify-between items-center pt-2.5 border-t border-white/5">
          <div className="flex items-center gap-2.5">
            {moderator && (
              <>
                {/* Fixed-size wrapper so the avatar itself aligns with the player
                    avatars below — the HOST caption is absolutely positioned so
                    it doesn't add height to the flex row and throw off centering. */}
                <div className="relative w-9 h-9 shrink-0">
                  {moderator.avatar ? (
                    <img
                      src={moderator.avatar}
                      className="w-9 h-9 rounded-full border-2 border-[#462ed1] object-cover bg-[#212121]"
                      alt={moderator.name}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full border-2 border-[#462ed1] bg-gradient-to-br from-[#462ed1] to-[#7c5cff] flex items-center justify-center text-white text-xs font-black">
                      {initials || <User size={14} className="text-white/70" />}
                    </div>
                  )}
                  <span className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 text-[7px] font-black tracking-widest text-[#462ed1] leading-none whitespace-nowrap">
                    HOST
                  </span>
                </div>
                <div className="w-px h-9 bg-white/10 shrink-0" />
              </>
            )}
            <div className="flex -space-x-2">
              {avatars.slice(0, 3).map((av, idx) => (
                <div key={av.id ?? idx} className="relative shrink-0">
                  {av.url ? (
                    <img
                      src={av.url}
                      className="w-9 h-9 rounded-full border-2 border-[#212121] object-cover bg-[#212121]"
                      alt="Player avatar"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full border-2 border-[#212121] bg-[#212121] flex items-center justify-center">
                      <User size={14} className="text-white/30" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {capacity.current > 3 && (
              <span className="text-xs font-bold text-[#79828b] bg-white/5 px-2 py-0.5 rounded-md">
                +{capacity.current - 3}
              </span>
            )}
          </div>

          <div className="w-8 h-8 rounded-full bg-[#462ed1] flex items-center justify-center text-white transition-colors group-hover:bg-[#5a3ff0]">
            <ChevronRight size={18} />
          </div>
        </div>
      </div>
    </Link>
  );
}
