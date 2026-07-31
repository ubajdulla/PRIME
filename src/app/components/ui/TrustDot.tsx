const COLOR: Record<string, string> = {
  yellow: "#eab308",
  red: "#ef4444",
};

interface TrustDotProps {
  label: string | null | undefined;
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
export function TrustDot({ label, size = 10, ringClassName = "border-[#181818]", corner = "top-right" }: TrustDotProps) {
  const color = label ? COLOR[label] : undefined;
  if (!color) return null;
  const posClass = corner === "bottom-right" ? "-right-0.5 -bottom-0.5" : "-right-0.5 -top-0.5";
  return (
    <span
      className={`absolute ${posClass} rounded-full border-2 ${ringClassName}`}
      style={{ width: size, height: size, background: color }}
    />
  );
}
