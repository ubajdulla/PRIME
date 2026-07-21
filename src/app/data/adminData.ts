export type PaymentStatus = "unpaid" | "cash" | "online";
export type JoinType = "direct" | "request";
export type EventStatus = "upcoming" | "past" | "draft" | "canceled";

// Ordered lowest → highest
export const SKILL_ORDER = ["Rookie", "Beginner", "Intermediate", "Advanced", "Pro", "PRIME"] as const;
export type SkillLevel = typeof SKILL_ORDER[number];

export const SKILL_STYLE: Record<string, {
  text: string;
  badge: string;      // inactive badge
  activeBadge: string; // active / selected badge
  dot: string;
  border: string;
}> = {
  PRIME:        { text: "text-[#ccff00]", badge: "bg-[#ccff00]/10 text-[#ccff00] border border-[#ccff00]/20",          activeBadge: "bg-[#ccff00] text-black border border-[#ccff00]",          dot: "bg-[#ccff00]",   border: "border-[#ccff00]/30" },
  Pro:          { text: "text-[#3390ec]", badge: "bg-[#3390ec]/10 text-[#3390ec] border border-[#3390ec]/20",          activeBadge: "bg-[#3390ec] text-white border border-[#3390ec]",          dot: "bg-[#3390ec]",   border: "border-[#3390ec]/30" },
  Advanced:     { text: "text-[#a855f7]", badge: "bg-[#a855f7]/10 text-[#a855f7] border border-[#a855f7]/20",          activeBadge: "bg-[#a855f7] text-white border border-[#a855f7]",          dot: "bg-[#a855f7]",   border: "border-[#a855f7]/30" },
  Intermediate: { text: "text-[#eab308]", badge: "bg-[#eab308]/10 text-[#eab308] border border-[#eab308]/20",          activeBadge: "bg-[#eab308] text-black border border-[#eab308]",          dot: "bg-[#eab308]",   border: "border-[#eab308]/30" },
  Beginner:     { text: "text-[#f97316]", badge: "bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20",          activeBadge: "bg-[#f97316] text-white border border-[#f97316]",          dot: "bg-[#f97316]",   border: "border-[#f97316]/30" },
  Rookie:       { text: "text-[#79828b]", badge: "bg-white/5 text-[#79828b] border border-white/10",                   activeBadge: "bg-[#79828b] text-white border border-[#79828b]",          dot: "bg-[#79828b]",   border: "border-white/15" },
};

export function getCategoryStyle(category: string): string {
  const styles: Record<string, string> = {
    GAMES:      "bg-[#3390ec]/10 text-[#3390ec]",
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
