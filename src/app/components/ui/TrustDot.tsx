const COLOR: Record<string, string> = {
  yellow: "#eab308",
  red: "#ef4444",
};

interface TrustDotProps {
  label: string | null | undefined;
  size?: number;
  ringClassName?: string;
}

// Renders a small bottom-right status dot on a `relative`-positioned avatar
// wrapper, or nothing if there's no label. The label only ever reaches the
// client via the visible_trust_label computed column, which the database
// gates to admins - so a non-admin viewer's data simply never has this set,
// no separate isAdmin check needed here.
export function TrustDot({ label, size = 10, ringClassName = "border-[#0e1621]" }: TrustDotProps) {
  const color = label ? COLOR[label] : undefined;
  if (!color) return null;
  return (
    <span
      className={`absolute -right-0.5 -bottom-0.5 rounded-full border-2 ${ringClassName}`}
      style={{ width: size, height: size, background: color }}
    />
  );
}
