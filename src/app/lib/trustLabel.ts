// Keys are stored in the DB (player_notes.label, profiles.trust_label) and
// are check-constrained there (031_note_label_payment.sql) - renaming a key
// would silently orphan every existing note with that value, so only the
// display name changes when the wording needs to change (rude_behavior is
// shown as "Disrespect", trustworthy as "Trust").
export type TrustLabel = "no_show" | "rude_behavior" | "trustworthy" | "warning" | "payment";

export const LABEL_META: Record<TrustLabel, { name: string; sentiment: "negative" | "positive" | "warning" }> = {
  warning:       { name: "Warning",     sentiment: "warning" },
  no_show:       { name: "No-show",     sentiment: "negative" },
  rude_behavior: { name: "Disrespect",  sentiment: "negative" },
  payment:       { name: "Payment",     sentiment: "negative" },
  trustworthy:   { name: "Trust",       sentiment: "positive" },
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
