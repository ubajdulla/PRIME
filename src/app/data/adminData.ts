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

// Same belt colors as LEVEL_COLOR_VAR (theme.css), not the old hardcoded
// rainbow (lime/blue/violet/gold/orange/grey) this used to be - kept as
// fully literal class strings (not built with template-literal
// interpolation) because Tailwind's build-time scanner only picks up
// arbitrary-value classes it can find as literal text in source; a
// dynamically-assembled `bg-[${v}]` never appears as that literal
// substring anywhere, so every one of these classes would get silently
// dropped from the compiled CSS. Beginner is the one pale tier (warm
// off-white belt), so its activeBadge flips to dark text same as
// LevelBookmark does for the same reason.
export const SKILL_STYLE: Record<string, {
  text: string;
  badge: string;      // inactive badge
  activeBadge: string; // active / selected badge
  dot: string;
  border: string;
}> = {
  PRIME:        { text: "text-[var(--level-prime)]", badge: "bg-[var(--level-prime)]/10 text-[var(--level-prime)] border border-[var(--level-prime)]/20", activeBadge: "bg-[var(--level-prime)] text-white border border-[var(--level-prime)]", dot: "bg-[var(--level-prime)]", border: "border-[var(--level-prime)]/30" },
  Pro:          { text: "text-[var(--level-pro)]", badge: "bg-[var(--level-pro)]/10 text-[var(--level-pro)] border border-[var(--level-pro)]/20", activeBadge: "bg-[var(--level-pro)] text-white border border-[var(--level-pro)]", dot: "bg-[var(--level-pro)]", border: "border-[var(--level-pro)]/30" },
  Advanced:     { text: "text-[var(--level-advanced)]", badge: "bg-[var(--level-advanced)]/10 text-[var(--level-advanced)] border border-[var(--level-advanced)]/20", activeBadge: "bg-[var(--level-advanced)] text-white border border-[var(--level-advanced)]", dot: "bg-[var(--level-advanced)]", border: "border-[var(--level-advanced)]/30" },
  Intermediate: { text: "text-[var(--level-intermediate)]", badge: "bg-[var(--level-intermediate)]/10 text-[var(--level-intermediate)] border border-[var(--level-intermediate)]/20", activeBadge: "bg-[var(--level-intermediate)] text-white border border-[var(--level-intermediate)]", dot: "bg-[var(--level-intermediate)]", border: "border-[var(--level-intermediate)]/30" },
  Beginner:     { text: "text-[var(--level-beginner)]", badge: "bg-[var(--level-beginner)]/10 text-[var(--level-beginner)] border border-[var(--level-beginner)]/20", activeBadge: "bg-[var(--level-beginner)] text-black border border-[var(--level-beginner)]", dot: "bg-[var(--level-beginner)]", border: "border-[var(--level-beginner)]/30" },
  Rookie:       { text: "text-[var(--level-rookie)]", badge: "bg-[var(--level-rookie)]/10 text-[var(--level-rookie)] border border-[var(--level-rookie)]/20", activeBadge: "bg-[var(--level-rookie)] text-white border border-[var(--level-rookie)]", dot: "bg-[var(--level-rookie)]", border: "border-[var(--level-rookie)]/30" },
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
