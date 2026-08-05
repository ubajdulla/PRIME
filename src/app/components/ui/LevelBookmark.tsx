import { LEVEL_ACCENT, LEVEL_RANGE } from "../../data/adminData";

const INSUFFICIENT_COLOR = "#eab308"; // same yellow as SKILL_STYLE.Intermediate

// Same shape/color as EventCard's image ribbon, reused here hanging off the
// top edge of the info panel since the detail pages have no image to pin it to.
// `insufficient` — viewer's own skill_level ranks below this event's level
// (see computeJoinStatus) — turns it the same warning yellow used elsewhere
// in the app (SKILL_STYLE.Intermediate) instead of the neutral accent.
export function LevelBookmark({ level, insufficient = false, positionClassName = "right-5" }: { level: string; insufficient?: boolean; positionClassName?: string }) {
  const range = LEVEL_RANGE[level] ?? LEVEL_RANGE.Rookie;
  return (
    <div
      className={`absolute top-0 ${positionClassName} w-9 flex flex-col items-center pt-2 shadow-[0_3px_8px_rgba(0,0,0,0.35)] z-10`}
      style={{
        height: 52,
        background: insufficient ? INSUFFICIENT_COLOR : LEVEL_ACCENT,
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)",
      }}
    >
      <span className={`text-[7px] font-black uppercase tracking-wide ${insufficient ? "text-black/70" : "text-white/85"}`}>Lvl</span>
      <span className={`text-sm font-black italic leading-tight mt-0.5 ${insufficient ? "text-black" : "text-white"}`}>{range}</span>
    </div>
  );
}
