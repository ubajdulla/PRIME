import { useTheme } from "../../theme";
import { LEVEL_COLOR_VAR, LEVEL_RANGE } from "../../data/adminData";

const INSUFFICIENT_COLOR = "#eab308"; // same yellow as SKILL_STYLE.Intermediate

// Every dark-theme belt color except PRIME was re-lifted in lightness to
// clear contrast against the dark #212121 surface (see theme.css) - as a
// side effect those five read better with dark text than white (checked
// per-tier: black text wins 5.0-7.7:1 vs white's 2.3-3.5:1). PRIME stays a
// dark wine in both themes by design, so it keeps needing white text same
// as light mode (12.0:1 white vs 1.5:1 black). Light theme's only other
// pale tier is Beginner's warm off-white.
function needsDarkText(level: string, resolvedTheme: "light" | "dark"): boolean {
  if (resolvedTheme === "dark") return level !== "PRIME";
  return level === "Beginner";
}

// Same shape/color as EventCard's image ribbon, reused here hanging off the
// top edge of the info panel since the detail pages have no image to pin it to.
// `insufficient` — viewer's own skill_level ranks below this event's level
// (see computeJoinStatus) — turns it the same warning yellow used elsewhere
// in the app (SKILL_STYLE.Intermediate) instead of the level's own color.
export function LevelBookmark({ level, insufficient = false, positionClassName = "right-5" }: { level: string; insufficient?: boolean; positionClassName?: string }) {
  const { resolvedTheme } = useTheme();
  const range = LEVEL_RANGE[level] ?? LEVEL_RANGE.Rookie;
  const dark = insufficient || needsDarkText(level, resolvedTheme);
  return (
    <div
      className={`absolute top-0 ${positionClassName} w-9 flex flex-col items-center pt-2 shadow-[0_3px_8px_rgba(0,0,0,0.35)] z-10`}
      style={{
        height: 52,
        background: insufficient ? INSUFFICIENT_COLOR : (LEVEL_COLOR_VAR[level] ?? LEVEL_COLOR_VAR.Rookie),
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)",
      }}
    >
      <span className={`text-[7px] font-black uppercase tracking-wide ${dark ? "text-black/70" : "text-white/85"}`}>Lvl</span>
      <span className={`text-sm font-black italic leading-tight mt-0.5 ${dark ? "text-black" : "text-white"}`}>{range}</span>
    </div>
  );
}
