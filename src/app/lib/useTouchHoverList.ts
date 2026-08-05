import { useEffect, useRef, useState } from "react";

// Simulates :hover for touch scrolling: while a finger drags down a list,
// whichever row is currently under it gets the same highlight a mouse
// hover would give. touchmove keeps firing on the element that received
// touchstart (implicit pointer capture), not whatever is under the finger
// now, so elementFromPoint is used to find the row actually being crossed.
export function useTouchHoverList<T extends HTMLElement>() {
  const containerRef = useRef<T>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function rowIdAt(clientX: number, clientY: number): string | null {
      const el = document.elementFromPoint(clientX, clientY);
      const row = el instanceof Element ? el.closest<HTMLElement>("[data-touch-hover-id]") : null;
      return row?.dataset.touchHoverId ?? null;
    }

    function onTouchMove(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      setHoveredId(rowIdAt(t.clientX, t.clientY));
    }
    function onTouchEnd() {
      setHoveredId(null);
    }

    container.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("touchend", onTouchEnd, { passive: true });
    container.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  return { containerRef, hoveredId };
}
