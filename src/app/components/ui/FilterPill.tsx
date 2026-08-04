import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useWaterRipple, RippleLayer } from "./useWaterRipple";

// Wraps a row of FilterPills with one shared blue backing that slides/resizes
// to the active pill instead of each pill owning its own solid fill - the
// "all -> tap tournaments -> the blue surface glides over" effect. Measures
// via a data attribute rather than refs so callers can keep mapping pills
// however they already do (Home's draggable scroll row, Alerts' padded
// pill-container, AdminPlayers' plain row) without restructuring.
export function FilterPillTrack({
  activeKey,
  children,
  className = "flex gap-1",
}: {
  activeKey: string;
  children: ReactNode;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const activeEl = track.querySelector<HTMLElement>(`[data-pill-key="${CSS.escape(activeKey)}"]`);
    setIndicator(activeEl ? { left: activeEl.offsetLeft, width: activeEl.offsetWidth } : null);
  }, [activeKey, children]);

  return (
    <div ref={trackRef} className={`relative ${className}`}>
      {indicator && (
        <div
          aria-hidden
          className="absolute top-0 bottom-0 bg-[var(--brand)] rounded-full transition-[left,width] duration-300 ease-out"
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}
      {children}
    </div>
  );
}

export function FilterPill({
  pillKey,
  label,
  active,
  onClick,
}: {
  // Matched against FilterPillTrack's activeKey to position the shared
  // sliding indicator - defaults to `label` since most callers already use
  // the label text as their filter's identity.
  pillKey?: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const ripple = useWaterRipple();
  return (
    <button
      data-pill-key={pillKey ?? label}
      onClick={onClick}
      onPointerDown={ripple.onPointerDown}
      className={`relative z-10 overflow-hidden px-5 py-2 rounded-full font-bold text-xs uppercase tracking-wider whitespace-nowrap flex-shrink-0 transition-colors duration-200 ${
        active ? "text-white" : "text-[var(--ink)]/70 hover:text-[var(--ink)]"
      }`}
    >
      {label}
      <RippleLayer ripples={ripple.ripples} />
    </button>
  );
}
