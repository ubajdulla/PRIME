import type { Dict } from "../i18n/types";

export type PaymentStatus = "unpaid" | "cash" | "online";
export type JoinType = "direct" | "request";
export type EventStatus = "upcoming" | "past" | "draft" | "canceled";

// Ordered lowest → highest
export const SKILL_ORDER = ["Rookie", "Beginner", "Intermediate", "Advanced", "Pro", "PRIME"] as const;
export type SkillLevel = typeof SKILL_ORDER[number];

// Skill level values are stored/compared in English (DB values, lookup keys) -
// this only translates them for display.
const LEVEL_KEY: Record<string, keyof Dict["levels"]> = {
  Rookie: "rookie",
  Beginner: "beginner",
  Intermediate: "intermediate",
  Advanced: "advanced",
  Pro: "pro",
  PRIME: "prime",
};
export function levelLabel(level: string, t: Dict): string {
  const key = LEVEL_KEY[level];
  return key ? t.levels[key] : level;
}

// One color for every tier — the app's accent violet. Only the numeric
// range in the bookmark changes between levels, not the color. Shared
// between EventCard's ribbon and the event detail info panel bookmark.
export const LEVEL_ACCENT = "hsl(249, 64%, 50%)";
export const LEVEL_RANGE: Record<string, string> = {
  Rookie:       "1–2",
  Beginner:     "2–3",
  Intermediate: "3–4",
  Advanced:     "4–5",
  Pro:          "5–6",
  PRIME:        "6–7",
};

export const SKILL_STYLE: Record<string, {
  text: string;
  badge: string;      // inactive badge
  activeBadge: string; // active / selected badge
  dot: string;
  border: string;
}> = {
  PRIME:        { text: "text-[#ccff00]", badge: "bg-[#ccff00]/10 text-[#ccff00] border border-[#ccff00]/20",          activeBadge: "bg-[#ccff00] text-black border border-[#ccff00]",          dot: "bg-[#ccff00]",   border: "border-[#ccff00]/30" },
  Pro:          { text: "text-[#462ed1]", badge: "bg-[#462ed1]/10 text-[#462ed1] border border-[#462ed1]/20",          activeBadge: "bg-[#462ed1] text-white border border-[#462ed1]",          dot: "bg-[#462ed1]",   border: "border-[#462ed1]/30" },
  Advanced:     { text: "text-[#a855f7]", badge: "bg-[#a855f7]/10 text-[#a855f7] border border-[#a855f7]/20",          activeBadge: "bg-[#a855f7] text-white border border-[#a855f7]",          dot: "bg-[#a855f7]",   border: "border-[#a855f7]/30" },
  Intermediate: { text: "text-[#eab308]", badge: "bg-[#eab308]/10 text-[#eab308] border border-[#eab308]/20",          activeBadge: "bg-[#eab308] text-black border border-[#eab308]",          dot: "bg-[#eab308]",   border: "border-[#eab308]/30" },
  Beginner:     { text: "text-[#f97316]", badge: "bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20",          activeBadge: "bg-[#f97316] text-white border border-[#f97316]",          dot: "bg-[#f97316]",   border: "border-[#f97316]/30" },
  Rookie:       { text: "text-[#79828b]", badge: "bg-white/5 text-[#79828b] border border-white/10",                   activeBadge: "bg-[#79828b] text-white border border-[#79828b]",          dot: "bg-[#79828b]",   border: "border-white/15" },
};

// Monochrome icon per category — used inline next to the event title instead
// of a colored badge, so category reads as metadata rather than another chip
// competing for attention (see AdminEventCard).
export function getCategoryIconName(category: string): "volleyball" | "trophy" | "dumbbell" | "palmtree" | "party" {
  const names: Record<string, "volleyball" | "trophy" | "dumbbell" | "palmtree" | "party"> = {
    GAMES: "volleyball",
    TOURNAMENT: "trophy",
    TRAININGS: "dumbbell",
    BEACH: "palmtree",
    EVENTS: "party",
  };
  return names[category] ?? "volleyball";
}

export function getCategoryStyle(category: string): string {
  const styles: Record<string, string> = {
    GAMES:      "bg-[#462ed1]/10 text-[#462ed1]",
    TOURNAMENT: "bg-[#eab308]/10 text-[#eab308]",
    TRAININGS:  "bg-[#4dcd5e]/10 text-[#4dcd5e]",
    BEACH:      "bg-[#f97316]/10 text-[#f97316]",
    EVENTS:     "bg-[#a855f7]/10 text-[#a855f7]",
  };
  return styles[category] ?? "bg-white/10 text-white";
}

export function getStatusStyle(status: EventStatus): string {
  if (status === "upcoming")  return "bg-[#4dcd5e]/10 text-[#4dcd5e]";
  if (status === "past")      return "bg-white/5 text-[#79828b]";
  if (status === "draft")     return "bg-[#eab308]/10 text-[#eab308]";
  if (status === "canceled")  return "bg-[#ef4444]/10 text-[#ef4444]";
  return "bg-white/5 text-white";
}
