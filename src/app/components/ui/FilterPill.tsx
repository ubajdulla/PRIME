import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useWaterRipple, RippleLayer } from "./useWaterRipple";

// Drives the left/right edge-fade mask on a horizontally scrollable pill row.
// A *static* mask (the naive version of this) always fades out its own first
// ~40px regardless of scroll position - which permanently dims whatever pill
// sits at the very start (e.g. "All"), since at rest there's nothing scrolled
// out of view on that side to justify fading it. Each side's fade is only
// meaningful once there's actually more content hidden past that edge.
export function useEdgeFadeMask(ref: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const track = el.firstElementChild as HTMLElement | null;
    const update = () => {
      const showLeft = el.scrollLeft > 1;
      const showRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
      // No-op case (nothing scrolled out of view on either side): drop the
      // mask entirely rather than applying a trivial opaque gradient. iOS
      // WebKit keeps a masked element on its own composited layer even when
      // the mask is a no-op, and stacking that under the pills' ripple/
      // sliding-indicator layers is what causes label text to disappear
      // after tapping (a known WebKit compositing repaint bug).
      if (!showLeft && !showRight) {
        el.style.removeProperty("mask-image");
        el.style.removeProperty("-webkit-mask-image");
        return;
      }
      const left = showLeft ? "transparent 0, rgba(0,0,0,0.35) 12px, black 40px" : "black 0";
      const right = showRight ? "black calc(100% - 40px), rgba(0,0,0,0.35) calc(100% - 12px), transparent 100%" : "black 100%";
      const mask = `linear-gradient(to right, ${left}, ${right})`;
      el.style.setProperty("mask-image", mask);
      el.style.setProperty("-webkit-mask-image", mask);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    if (track) observer.observe(track);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [ref]);
}

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
    const measure = () => {
      const activeEl = track.querySelector<HTMLElement>(`[data-pill-key="${CSS.escape(activeKey)}"]`);
      setIndicator(activeEl ? { left: activeEl.offsetLeft, width: activeEl.offsetWidth } : null);
    };
    measure();
    // Re-measures on width changes (language switch, viewport resize) without
    // depending on `children`, which gets a fresh array identity on every
    // parent render and would otherwise force a synchronous layout read then.
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [activeKey]);

  return (
    <div ref={trackRef} className={`relative ${className}`}>
      {indicator && (
        <div
          aria-hidden
          className="absolute top-0 bottom-0 left-0 bg-[var(--brand)] rounded-full transition-[transform,width] duration-300 ease-out will-change-transform"
          style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
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
      className={`relative z-10 overflow-hidden px-5 py-2 rounded-full font-bold text-xs uppercase tracking-wider whitespace-nowrap flex-shrink-0 transition-colors duration-200 [transform:translateZ(0)] ${
        active ? "text-white" : "text-[var(--ink)]/70 hover:text-[var(--ink)]"
      }`}
    >
      {label}
      <RippleLayer ripples={ripple.ripples} />
    </button>
  );
}

// The full filter bar chrome - rounded surface-1 pill, edge-fade mask, and
// click-and-drag horizontal scroll - shared by Home's event feed, Alerts,
// and AdminPlayers' status filter, so all three are the same component
// instead of three copies that can drift out of sync with each other.
// `scrollRef` is optional: pass one in when a caller also needs the scroll
// element elsewhere (e.g. AdminPlayers wires it up as the `ignoreRef` for
// its own page-swipe gesture, so dragging the pills isn't misread as a
// swipe back to Events) - otherwise the bar manages its own internally.
export function FilterBar<T extends string>({
  items,
  activeKey,
  onSelect,
  getLabel,
  scrollRef,
  className = "",
}: {
  items: readonly T[];
  activeKey: T;
  onSelect: (item: T) => void;
  getLabel: (item: T) => string;
  scrollRef?: RefObject<HTMLDivElement | null>;
  className?: string;
}) {
  const ownRef = useRef<HTMLDivElement>(null);
  const filterScrollRef = scrollRef ?? ownRef;
  const dragState = useRef<{ active: boolean; startX: number; scrollLeft: number }>({ active: false, startX: 0, scrollLeft: 0 });
  useEdgeFadeMask(filterScrollRef);

  useEffect(() => {
    const el = filterScrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      el.scrollBy({ left: e.deltaY + e.deltaX, behavior: "auto" });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`relative w-full bg-[var(--surface-1)] rounded-full p-1.5 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.12)] ${className}`}>
      {/* Edge fade via mask-image (not an overlay) - actually fades the pills'
          own pixels near the edges, so a colored/active pill scrolled under it
          dims out cleanly instead of getting visually blended with an opaque
          background-colored rectangle painted on top of it. */}
      <div
        ref={filterScrollRef}
        className="overflow-x-auto overscroll-x-contain touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] select-none"
        style={{ cursor: "grab" }}
        onMouseDown={e => {
          const el = filterScrollRef.current;
          if (!el) return;
          dragState.current = { active: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
          el.style.cursor = "grabbing";
        }}
        onMouseMove={e => {
          const el = filterScrollRef.current;
          if (!el || !dragState.current.active) return;
          const x = e.pageX - el.offsetLeft;
          el.scrollLeft = dragState.current.scrollLeft - (x - dragState.current.startX);
        }}
        onMouseUp={() => {
          dragState.current.active = false;
          if (filterScrollRef.current) filterScrollRef.current.style.cursor = "grab";
        }}
        onMouseLeave={() => {
          dragState.current.active = false;
          if (filterScrollRef.current) filterScrollRef.current.style.cursor = "";
        }}
      >
        <FilterPillTrack activeKey={activeKey}>
          {items.map(item => (
            <FilterPill key={item} pillKey={item} label={getLabel(item)} active={activeKey === item} onClick={() => onSelect(item)} />
          ))}
        </FilterPillTrack>
      </div>
    </div>
  );
}
