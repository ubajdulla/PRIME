export type TrustLabel = "no_show" | "rude_behavior" | "trustworthy" | "warning";

export const LABEL_META: Record<TrustLabel, { name: string; sentiment: "negative" | "positive" | "warning" }> = {
  no_show:       { name: "No-show",        sentiment: "negative" },
  rude_behavior: { name: "Rude Behavior",  sentiment: "negative" },
  trustworthy:   { name: "Trustworthy",    sentiment: "positive" },
  warning:       { name: "Warning",        sentiment: "warning" },
};

export const SENTIMENT_COLOR: Record<"negative" | "positive" | "warning", string> = {
  negative: "#ef4444",
  positive: "#4dcd5e",
  warning:  "#eab308",
};

// A label fades over the 7 events following whichever note set it, then
// reads as expired - the note that set it is never touched, only the
// "current label" shown on the avatar/profile stops counting once enough
// events have passed. Purely a function of the stored snapshot vs. the
// player's current events-joined count, so there's nothing to clean up
// in the background and every reader (list, profile, filters) agrees.
const DECAY_EVENTS = 7;

export function effectiveLabel(
  label: string | null | undefined,
  setAtEvents: number | null | undefined,
  currentEvents: number
): { label: TrustLabel; opacity: number } | null {
  if (!label || setAtEvents == null || !(label in LABEL_META)) return null;
  const elapsed = currentEvents - setAtEvents;
  if (elapsed >= DECAY_EVENTS) return null;
  const opacity = 1 - Math.max(0, elapsed) / DECAY_EVENTS;
  return { label: label as TrustLabel, opacity };
}
