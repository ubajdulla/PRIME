import { useRef, useState, type RefObject } from "react";

const SWIPE_THRESHOLD_PX = 80;
// Horizontal travel must beat vertical by this ratio before it counts as a
// swipe rather than a normal down-the-page scroll.
const DIRECTION_RATIO = 1.5;
const SPRING_MS = 220;

/**
 * Drag-to-navigate between adjacent tabs (e.g. AdminLayout's Events/Players
 * sub-navbar) - the page follows the finger 1:1, then either completes the
 * swipe (slides fully off, calls the callback) or springs back to 0 if it
 * didn't clear the threshold. `ignoreRef` opts a child element (a draggable
 * filter bar, a horizontally-scrollable row, etc.) out of gesture tracking
 * entirely, so dragging inside it never gets misread as a page swipe.
 */
export function useHorizontalSwipe(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  ignoreRef?: RefObject<HTMLElement>
) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const tracking = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [springing, setSpringing] = useState(false);

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    if (!t) return;
    if (ignoreRef?.current?.contains(e.target as Node)) {
      start.current = null;
      tracking.current = false;
      return;
    }
    start.current = { x: t.clientX, y: t.clientY };
    tracking.current = true;
    setSpringing(false);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!tracking.current || !start.current) return;
    const t = e.touches[0];
    if (!t) return;
    const dx = t.clientX - start.current.x;
    const dy = t.clientY - start.current.y;
    if (Math.abs(dx) < Math.abs(dy) * DIRECTION_RATIO) return; // reads as a vertical scroll - ignore
    if (dx < 0 && !onSwipeLeft) return; // no destination that way - don't drag past the edge
    if (dx > 0 && !onSwipeRight) return;
    setDragX(dx);
  }

  function onTouchEnd(e: React.TouchEvent) {
    const s = start.current;
    const wasTracking = tracking.current;
    start.current = null;
    tracking.current = false;
    if (!wasTracking || !s) return;
    const t = e.changedTouches[0];
    const dx = t ? t.clientX - s.x : 0;
    const dy = t ? t.clientY - s.y : 0;
    const cleared = Math.abs(dx) >= SWIPE_THRESHOLD_PX && Math.abs(dx) >= Math.abs(dy) * DIRECTION_RATIO;
    const dest = dx < 0 ? onSwipeLeft : onSwipeRight;
    setSpringing(true);
    if (cleared && dest) {
      const width = containerRef.current?.offsetWidth ?? window.innerWidth;
      setDragX(dx < 0 ? -width : width);
      window.setTimeout(dest, SPRING_MS);
    } else {
      setDragX(0);
    }
  }

  return {
    containerRef,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
    style: {
      transform: dragX ? `translateX(${dragX}px)` : undefined,
      transition: springing ? `transform ${SPRING_MS}ms cubic-bezier(0.16, 1, 0.3, 1)` : "none",
    } as React.CSSProperties,
  };
}
