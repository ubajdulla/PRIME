import { useCallback, useEffect, useState } from "react";

// Simulates :hover for touch scrolling: while a finger drags down a list,
// whichever row is currently under it gets the same highlight a mouse
// hover would give (iOS Contacts/Photos-style scrub). touchmove keeps
// firing on the element that received touchstart (implicit pointer
// capture), not whatever is under the finger now, so elementFromPoint is
// used to find the row actually being crossed.
//
// The container is tracked with a callback ref (state), not useRef +
// useEffect(fn, []) - callers like EventDetail.tsx render a loading
// placeholder before the real content (with the ref'd div) mounts, so a
// plain useRef would be null when a []-deps effect runs and never retry.
// A callback ref re-fires this effect the moment the real node attaches.
export function useTouchHoverList<T extends HTMLElement>() {
  const [container, setContainer] = useState<T | null>(null);
  const containerRef = useCallback((node: T | null) => setContainer(node), []);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (!container) return;

    function rowIdAt(clientX: number, clientY: number): string | null {
      const el = document.elementFromPoint(clientX, clientY);
      const row = el instanceof Element ? el.closest<HTMLElement>("[data-touch-hover-id]") : null;
      return row?.dataset.touchHoverId ?? null;
    }

    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      setHoveredId(rowIdAt(t.clientX, t.clientY));
    }
    function onTouchMove(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      setHoveredId(rowIdAt(t.clientX, t.clientY));
    }
    function onTouchEnd() {
      setHoveredId(null);
    }

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("touchend", onTouchEnd, { passive: true });
    container.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [container]);

  return { containerRef, hoveredId };
}
