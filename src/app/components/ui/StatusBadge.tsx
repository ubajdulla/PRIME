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

// Small standalone badge (suspended/banned/trust-label) - sits inline next
// to the player's name, not on the avatar, so it never fights the avatar's
// own tap target (change-photo). `title` covers desktop hover, but there's
// no hover on mobile - tapping the badge toggles a real popover with the
// same text so the reason/time-left is reachable everywhere, not just with
// a mouse.
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
    <div ref={ref} className="relative inline-flex shrink-0" style={{ opacity }}>
      <button
        type="button"
        title={tooltip}
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(v => !v); }}
        className="w-6 h-6 rounded-full flex items-center justify-center"
        style={{ background: color }}
      >
        <Icon size={12} className="text-white" />
      </button>
      {open && (
        <div
          onMouseDown={e => e.stopPropagation()}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max max-w-[220px] bg-[#212121] border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white/90 leading-snug shadow-[0_8px_20px_rgba(0,0,0,0.4)] z-20"
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}
