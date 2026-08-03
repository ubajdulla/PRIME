import { useEffect, useRef, useState } from "react";
import { Clock, OctagonX, Flag } from "lucide-react";

interface StatusBadgeProps {
  color: string;
  icon: "ban" | "suspend" | "flag";
  tooltip: string;
  opacity?: number;
}

const ICONS = {
  ban: OctagonX,
  suspend: Clock,
  flag: Flag,
};

// Corner badge for the avatar ring (suspended/banned/trust-label). `title`
// covers desktop hover, but there's no hover on mobile - tapping the badge
// toggles a real popover with the same text so the reason/time-left is
// reachable everywhere, not just with a mouse.
export function StatusBadge({ color, icon, tooltip, opacity = 1 }: StatusBadgeProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const Icon = ICONS[icon];

  useEffect(() => {
    if (!open) return;
    function close(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div ref={ref} className="absolute bottom-0.5 left-0.5" style={{ opacity }}>
      <button
        type="button"
        title={tooltip}
        onMouseDown={e => e.stopPropagation()}
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(v => !v); }}
        className="w-7 h-7 rounded-full border-2 border-[#181818] flex items-center justify-center"
        style={{ background: color }}
      >
        <Icon size={13} className="text-white" />
      </button>
      {open && (
        <div
          onMouseDown={e => e.stopPropagation()}
          className="absolute bottom-full left-0 mb-2 w-max max-w-[220px] bg-[#212121] border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white/90 leading-snug shadow-[0_8px_20px_rgba(0,0,0,0.4)] z-20"
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}
