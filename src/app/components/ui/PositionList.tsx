import { Check } from "lucide-react";
import { useWaterRipple, RippleLayer } from "./useWaterRipple";

// Shared radio-row position picker — single column, so five items never
// wrap into a lopsided 3+2 grid the way pill chips did. Used as the
// always-visible list in the join-request modal. Selection reads via a
// left accent bar + trailing checkmark instead of a radio circle, matching
// how selected filters/tabs look elsewhere in the app.
const ACCENT = {
  violet: { bar: "bg-[var(--brand)]", bg: "bg-[var(--brand)]/10", text: "text-[var(--brand)]" },
  gold: { bar: "bg-[#eab308]", bg: "bg-[#eab308]/10", text: "text-[#eab308]" },
};

function PositionRow({
  label,
  selected,
  onSelect,
  colors,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  colors: (typeof ACCENT)["violet"];
}) {
  const ripple = useWaterRipple();
  return (
    <button
      type="button"
      onClick={onSelect}
      onPointerDown={ripple.onPointerDown}
      className={`relative overflow-hidden group flex items-center gap-2.5 w-full pl-4 pr-3 py-2.5 text-left transition-colors ${
        selected ? colors.bg : "hover:bg-[var(--surface-hover)]"
      }`}
    >
      <span aria-hidden className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full transition-colors ${selected ? colors.bar : "bg-transparent"}`} />
      <span className={`flex-1 text-xs font-bold transition-colors ${selected ? colors.text : "text-[#79828b] group-hover:text-[var(--ink)]"}`}>
        {label}
      </span>
      <Check size={14} className={`shrink-0 transition-opacity ${selected ? `${colors.text} opacity-100` : "opacity-0"}`} />
      <RippleLayer ripples={ripple.ripples} />
    </button>
  );
}

export function PositionList({
  positions,
  value,
  onChange,
  accent = "violet",
}: {
  positions: readonly { value: string; label: string }[];
  value: string | null;
  onChange: (v: string) => void;
  accent?: "violet" | "gold";
}) {
  const colors = ACCENT[accent];
  return (
    <div className="bg-[var(--ink)]/5 rounded-2xl overflow-hidden">
      {positions.map(pos => (
        <PositionRow key={pos.value} label={pos.label} selected={value === pos.value} onSelect={() => onChange(pos.value)} colors={colors} />
      ))}
    </div>
  );
}
