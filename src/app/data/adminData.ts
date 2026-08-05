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

// Volleyball positions - stored/compared in English (DB values), translated for display.
export const POSITIONS = ["Outside Hitter", "Opposite Hitter", "Setter", "Middle Blocker", "Libero"] as const;
const POSITION_KEY: Record<string, keyof Dict["positions"]> = {
  "Outside Hitter": "outsideHitter",
  "Opposite Hitter": "oppositeHitter",
  "Setter": "setter",
  "Middle Blocker": "middleBlocker",
  "Libero": "libero",
};
export function positionLabel(position: string, t: Dict): string {
  const key = POSITION_KEY[position];
  return key ? t.positions[key] : position;
}

// One color for every tier — the app's accent violet. Only the numeric
// range in the bookmark changes between levels, not the color. Shared
// between EventCard's ribbon and the event detail info panel bookmark.
export const LEVEL_ACCENT = "var(--brand)";
export const LEVEL_RANGE: Record<string, string> = {
  Rookie:       "1–2",
  Beginner:     "2–3",
  Intermediate: "3–4",
  Advanced:     "4–5",
  Pro:          "5–6",
  PRIME:        "6–7",
};

// Same violet/blue level scale used by the Players search list (var(--level-*),
// theme.css) - single source for every place a skill tier gets a color: the
// search list's category dots/labels, and the avatar ring + skill-level row
// on Profile/AdminPlayerProfile. Admins get --level-admin instead of their
// skill tier so the ring still reads as "this account is staff" rather than
// just another level shade.
export const LEVEL_COLOR_VAR: Record<string, string> = {
  Rookie: "var(--level-rookie)", Beginner: "var(--level-beginner)", Intermediate: "var(--level-intermediate)",
  Advanced: "var(--level-advanced)", Pro: "var(--level-pro)", PRIME: "var(--level-prime)",
};
export const LEVEL_TEXT_CLASS: Record<string, string> = {
  Rookie: "text-[var(--level-rookie)]", Beginner: "text-[var(--level-beginner)]", Intermediate: "text-[var(--level-intermediate)]",
  Advanced: "text-[var(--level-advanced)]", Pro: "text-[var(--level-pro)]", PRIME: "text-[var(--level-prime)]",
};
export function avatarRingColor(skillLevel: string, isAdmin?: boolean): string {
  return isAdmin ? "var(--level-admin)" : LEVEL_COLOR_VAR[skillLevel] ?? LEVEL_COLOR_VAR.Rookie;
}

export const SKILL_STYLE: Record<string, {
  text: string;
  badge: string;      // inactive badge
  activeBadge: string; // active / selected badge
  dot: string;
  border: string;
}> = {
  PRIME:        { text: "text-[#ccff00]", badge: "bg-[#ccff00]/10 text-[#ccff00] border border-[#ccff00]/20",          activeBadge: "bg-[#ccff00] text-black border border-[#ccff00]",          dot: "bg-[#ccff00]",   border: "border-[#ccff00]/30" },
  Pro:          { text: "text-[var(--brand)]", badge: "bg-[var(--brand)]/10 text-[var(--brand)] border border-[var(--brand)]/20",          activeBadge: "bg-[var(--brand)] text-white border border-[var(--brand)]",          dot: "bg-[var(--brand)]",   border: "border-[var(--brand)]/30" },
  Advanced:     { text: "text-[#a855f7]", badge: "bg-[#a855f7]/10 text-[#a855f7] border border-[#a855f7]/20",          activeBadge: "bg-[#a855f7] text-white border border-[#a855f7]",          dot: "bg-[#a855f7]",   border: "border-[#a855f7]/30" },
  Intermediate: { text: "text-[#eab308]", badge: "bg-[#eab308]/10 text-[#eab308] border border-[#eab308]/20",          activeBadge: "bg-[#eab308] text-black border border-[#eab308]",          dot: "bg-[#eab308]",   border: "border-[#eab308]/30" },
  Beginner:     { text: "text-[#f97316]", badge: "bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20",          activeBadge: "bg-[#f97316] text-white border border-[#f97316]",          dot: "bg-[#f97316]",   border: "border-[#f97316]/30" },
  Rookie:       { text: "text-[#79828b]", badge: "bg-[var(--ink)]/5 text-[#79828b] border border-[var(--ink)]/10",                   activeBadge: "bg-[#79828b] text-white border border-[#79828b]",          dot: "bg-[#79828b]",   border: "border-[var(--ink)]/15" },
};

// Monochrome icon per category — used inline next to the event title instead
// of a colored badge, so category reads as metadata rather than another chip
// competing for attention (see AdminEventCard).
export function getCategoryIconName(category: string): "volleyball" | "trophy" | "dumbbell" | "palmtree" | "party" | "users" {
  const names: Record<string, "volleyball" | "trophy" | "dumbbell" | "palmtree" | "party" | "users"> = {
    GAMES: "volleyball",
    OPENGYM: "users",
    TOURNAMENT: "trophy",
    TRAININGS: "dumbbell",
    BEACH: "palmtree",
    EVENTS: "party",
  };
  return names[category] ?? "volleyball";
}

export function getCategoryStyle(category: string): string {
  const styles: Record<string, string> = {
    GAMES:      "bg-[var(--brand)]/10 text-[var(--brand)]",
    OPENGYM:    "bg-[var(--brand)]/10 text-[var(--brand)]",
    TOURNAMENT: "bg-[#eab308]/10 text-[#eab308]",
    TRAININGS:  "bg-[#4dcd5e]/10 text-[#4dcd5e]",
    BEACH:      "bg-[#f97316]/10 text-[#f97316]",
    EVENTS:     "bg-[#a855f7]/10 text-[#a855f7]",
  };
  return styles[category] ?? "bg-[var(--ink)]/10 text-[var(--ink)]";
}

export function getStatusStyle(status: EventStatus): string {
  if (status === "upcoming")  return "bg-[#4dcd5e]/10 text-[#4dcd5e]";
  if (status === "past")      return "bg-[var(--ink)]/5 text-[#79828b]";
  if (status === "draft")     return "bg-[#eab308]/10 text-[#eab308]";
  if (status === "canceled")  return "bg-[#ef4444]/10 text-[#ef4444]";
  return "bg-[var(--ink)]/5 text-[var(--ink)]";
}
