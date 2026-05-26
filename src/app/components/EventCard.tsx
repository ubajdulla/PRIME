import { Link } from "react-router";
import { MapPin, Calendar, Clock, ChevronRight } from "lucide-react";

const LEVEL_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  PRIME:        { bg: "bg-[#ccff00]/15", text: "text-[#ccff00]",  border: "border-[#ccff00]/30" },
  Pro:          { bg: "bg-[#3390ec]/15", text: "text-[#3390ec]",  border: "border-[#3390ec]/30" },
  Advanced:     { bg: "bg-[#a855f7]/15", text: "text-[#a855f7]",  border: "border-[#a855f7]/30" },
  Intermediate: { bg: "bg-[#eab308]/15", text: "text-[#eab308]",  border: "border-[#eab308]/30" },
  Beginner:     { bg: "bg-[#f97316]/15", text: "text-[#f97316]",  border: "border-[#f97316]/30" },
  Rookie:       { bg: "bg-white/5",      text: "text-[#79828b]",  border: "border-white/10"     },
};

export interface EventCardProps {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  price: string;
  capacity: { current: number; max: number };
  avatars: string[];
  status: "REQUEST ONLY" | "JOIN DIRECTLY";
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
  status,
  image,
  level,
  horizontal = false,
  canceled = false,
}: EventCardProps) {
  const isRequestOnly = status === "REQUEST ONLY";
  const fillPct = Math.min(100, (capacity.current / capacity.max) * 100);

  return (
    <Link
      to={`/events/${id}`}
      className={`block relative group rounded-2xl bg-[#17212b] shadow-sm hover:shadow-md transition-shadow active:scale-[0.98] overflow-hidden ${
        horizontal ? 'min-w-[280px] w-[280px] flex-shrink-0' : 'w-full'
      }`}
    >
      {/* Image with padding */}
      <div className="px-3 pt-3">
        <div className="relative w-full h-36 md:h-44 overflow-hidden rounded-xl bg-[#222f3e]">
          {image ? (
            <img src={image} alt={title} className={`w-full h-full object-cover${canceled ? " grayscale" : ""}`} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1e2d3d] to-[#17212b]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#17212b]/50 via-transparent to-transparent" />

          {/* Canceled X overlay */}
          {canceled && (
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="0" y1="0" x2="100" y2="100" stroke="#ef4444" strokeOpacity="0.7" strokeWidth="1.5" />
              <line x1="100" y1="0" x2="0" y2="100" stroke="#ef4444" strokeOpacity="0.7" strokeWidth="1.5" />
            </svg>
          )}

          {/* Badge — overlaid top-left on image */}
          <div className="absolute top-2.5 left-2.5">
            {canceled ? (
              <span className="text-[10px] font-bold px-2.5 py-1 uppercase tracking-widest rounded-md flex items-center gap-1 backdrop-blur-sm bg-[#ef4444]/90 text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-white/60"></span>
                CANCELED
              </span>
            ) : (
              <span className={`text-[10px] font-bold px-2.5 py-1 uppercase tracking-widest rounded-md flex items-center gap-1 backdrop-blur-sm ${
                isRequestOnly ? 'bg-[#eab308]/90 text-black' : 'bg-[#3390ec]/90 text-white'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isRequestOnly ? 'bg-black/40' : 'bg-white/60'}`}></span>
                {status}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-3 pb-4 flex flex-col gap-2">
        {/* Title + level */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-black italic text-xl uppercase tracking-wide text-white line-clamp-2 leading-tight flex-1">
            {title}
          </h3>
          {level && (() => {
            const s = LEVEL_STYLE[level] ?? LEVEL_STYLE["Rookie"];
            return (
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border shrink-0 mt-1 ${s.bg} ${s.text} ${s.border}`}>
                {level}
              </span>
            );
          })()}
        </div>

        {/* Date & Time */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar size={14} className="text-[#3390ec] shrink-0" />
          <span className="font-medium text-white/90">{date}</span>
          <span className="text-[#79828b]">·</span>
          <Clock size={14} className="text-[#3390ec] shrink-0" />
          <span className="font-medium text-white/90">{time}</span>
        </div>

        {/* Location + Price */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-[#79828b] min-w-0">
            <MapPin size={14} className="shrink-0 text-[#3390ec]" />
            <span className="truncate">{location}</span>
          </div>
          <span className="text-[#3390ec] font-black text-sm shrink-0">{price}</span>
        </div>

        {/* Capacity bar — in description section */}
        <div className="flex items-center gap-2.5 mt-0.5">
          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#3390ec] rounded-full"
              style={{ width: `${fillPct}%` }}
            />
          </div>
          <span className="text-[#79828b] text-[11px] font-bold shrink-0 uppercase tracking-wide">
            {capacity.current}/{capacity.max} spots
          </span>
        </div>

        {/* Footer: avatars + arrow */}
        <div className="flex justify-between items-center pt-2.5 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {avatars.slice(0, 3).map((av, idx) => (
                <img
                  key={idx}
                  src={av}
                  className="w-7 h-7 rounded-full border-2 border-[#17212b] object-cover bg-[#222f3e]"
                  alt="Player avatar"
                />
              ))}
            </div>
            {capacity.current > 3 && (
              <span className="text-xs font-bold text-[#79828b] bg-white/5 px-2 py-0.5 rounded-md">
                +{capacity.current - 3}
              </span>
            )}
          </div>

          <div className="w-8 h-8 rounded-full bg-[#242f3d] flex items-center justify-center text-white/50 group-hover:text-white group-hover:bg-[#3390ec] transition-colors">
            <ChevronRight size={18} />
          </div>
        </div>
      </div>
    </Link>
  );
}
