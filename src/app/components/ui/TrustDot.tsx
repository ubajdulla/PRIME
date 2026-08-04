import { LABEL_META, SENTIMENT_COLOR } from "../../lib/trustLabel";

interface TrustDotProps {
  label: string | null | undefined;
  // Fades toward 0 as the label decays (see effectiveLabel in trustLabel.ts)
  // instead of just disappearing outright, so a still-fresh label reads
  // stronger than one about to expire.
  opacity?: number;
  size?: number;
  ringClassName?: string;
  // Avatars also carry a bottom-right verified checkmark (public, always
  // shown when applicable) - default to the opposite corner so the two
  // never overlap on a verified-and-flagged player.
  corner?: "bottom-right" | "top-right";
}

// Renders a small status dot on a `relative`-positioned avatar wrapper, or
// nothing if there's no label. The label only ever reaches the client via
// the visible_trust_label computed column, which the database gates to
// admins - so a non-admin viewer's data simply never has this set, no
// separate isAdmin check needed here.
export function TrustDot({ label, opacity = 1, size = 10, ringClassName = "border-[var(--surface-0)]", corner = "top-right" }: TrustDotProps) {
  const meta = label && label in LABEL_META ? LABEL_META[label as keyof typeof LABEL_META] : undefined;
  if (!meta) return null;
  const color = SENTIMENT_COLOR[meta.sentiment];
  const posClass = corner === "bottom-right" ? "-right-0.5 -bottom-0.5" : "-right-0.5 -top-0.5";
  return (
    <span
      className={`absolute ${posClass} rounded-full border-2 ${ringClassName}`}
      style={{ width: size, height: size, background: color, opacity }}
    />
  );
}
