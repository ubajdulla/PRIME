import { useEffect, useRef, useState, type RefObject } from "react";

const SWIPE_THRESHOLD_PX = 80;
// Horizontal travel must beat vertical by this ratio before it counts as a
// swipe rather than a normal down-the-page scroll.
const DIRECTION_RATIO = 1.5;
const SPRING_MS = 220;
// A touch starting this close to the left edge is left untracked when
// onSwipeRight is wired up, so it doesn't compete with iOS/Android's own
// edge-swipe-back gesture (installed PWAs can't have that gesture disabled
// from JS, so the only fix is to not fight it for touches that start there).
const EDGE_DEAD_ZONE_PX = 24;

/**
 * Drag-to-navigate between adjacent tabs (e.g. AdminLayout's Events/Players
 * sub-navbar) - the page follows the finger 1:1, then either completes the
 * swipe (slides fully off, calls the callback) or springs back to 0 if it
 * didn't clear the threshold. `ignoreRef` opts a child element (a draggable
 * filter bar, a horizontally-scrollable row, etc.) out of gesture tracking
 * entirely, so dragging inside it never gets misread as a page swipe.
 * `enabled` (default true) lets a caller suspend tracking without unmounting
 * the gesture (e.g. while a search field is focused).
 *
 * `resetOnComplete` (default false) is for swiping between same-page tab
 * content (e.g. Alerts' All/Unread) rather than navigating to a different
 * route: once a completed swipe has carried the old content fully off-
 * screen, it snaps the transform back to 0 with no transition in the same
 * tick as the destination callback's state update. Since that update swaps
 * in the new tab's content while still off-screen, the snap is invisible -
 * it reads as the old content sliding away and the new content already
 * being in place, not as a page navigating away for good.
 *
 * Bound as real (non-passive) DOM listeners in an effect, not JSX props:
 * React's synthetic touch handlers are passive by default, so `preventDefault`
 * inside `onTouchMove` is a silent no-op there. Without it, once a drag
 * leaned horizontal the browser's own scroll/rubber-band gesture was still
 * live underneath and fought our transform for the rest of the gesture -
 * that's what showed up as the swipe stalling mid-drag and feeling choppy.
 * Once we've decided a gesture is a horizontal swipe we now call
 * `preventDefault` to fully hand the gesture to JS, and the transform during
 * the drag is written straight to the DOM (not through React state) so it
 * tracks the finger every frame instead of waiting on a re-render.
 */
export function useHorizontalSwipe(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  ignoreRef?: RefObject<HTMLElement>,
  enabled = true,
  resetOnComplete = false
) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const tracking = useRef(false);
  const committed = useRef(false); // decided this is a horizontal swipe, not a scroll
  const containerRef = useRef<HTMLDivElement>(null);
  const enabledRef = useRef(enabled);
  const [dragX, setDragX] = useState(0);
  const [springing, setSpringing] = useState(false);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (!enabledRef.current) return;
      const t = e.touches[0];
      if (!t) return;
      if (ignoreRef?.current?.contains(e.target as Node)) {
        start.current = null;
        tracking.current = false;
        return;
      }
      if (onSwipeRight && t.clientX < EDGE_DEAD_ZONE_PX) {
        start.current = null;
        tracking.current = false;
        return;
      }
      start.current = { x: t.clientX, y: t.clientY };
      tracking.current = true;
      committed.current = false;
      setSpringing(false);
    }

    function onTouchMove(e: TouchEvent) {
      if (!tracking.current || !start.current) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - start.current.x;
      const dy = t.clientY - start.current.y;

      if (!committed.current) {
        // Undecided yet - let the browser scroll normally until movement
        // clearly favors horizontal over vertical.
        if (Math.abs(dx) < Math.abs(dy) * DIRECTION_RATIO) return;
        if (dx < 0 && !onSwipeLeft) return;
        if (dx > 0 && !onSwipeRight) return;
        committed.current = true;
      }

      // Committed: take the gesture over from the browser entirely so its
      // native scroll can't keep fighting our transform underneath.
      e.preventDefault();
      el!.style.transition = "none";
      el!.style.transform = `translateX(${dx}px)`;
    }

    function onTouchEnd(e: TouchEvent) {
      const s = start.current;
      const wasCommitted = committed.current;
      start.current = null;
      tracking.current = false;
      committed.current = false;
      if (!s || !wasCommitted) return;
      const t = e.changedTouches[0];
      const dx = t ? t.clientX - s.x : 0;
      const dy = t ? t.clientY - s.y : 0;
      const cleared = Math.abs(dx) >= SWIPE_THRESHOLD_PX && Math.abs(dx) >= Math.abs(dy) * DIRECTION_RATIO;
      const dest = dx < 0 ? onSwipeLeft : onSwipeRight;
      const target = cleared && dest ? (dx < 0 ? -(el?.offsetWidth ?? window.innerWidth) : (el?.offsetWidth ?? window.innerWidth)) : 0;

      // Write the spring target straight to the DOM (not just through
      // setDragX/setSpringing) - onTouchMove wrote the drag position the
      // same way, bypassing React, so if the gesture ends back at the same
      // dragX React already had (e.g. springing back to a resting 0), the
      // setState below is a same-value no-op React skips entirely, and the
      // element would stay stuck at onTouchMove's last imperative transform
      // forever. The direct write guarantees the visual reset happens
      // regardless of whether React considers the state "changed".
      el!.style.transition = `transform ${SPRING_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`;
      el!.style.transform = `translateX(${target}px)`;
      setSpringing(true);
      setDragX(target);

      if (cleared && dest) {
        window.setTimeout(() => {
          dest();
          if (resetOnComplete) {
            el!.style.transition = "none";
            el!.style.transform = "translateX(0px)";
            setSpringing(false);
            setDragX(0);
          }
        }, SPRING_MS);
      }
    }

    // touchmove must be non-passive so preventDefault can actually cancel
    // the browser's own gesture once we've committed to a horizontal swipe.
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, ignoreRef, resetOnComplete]);

  return {
    containerRef,
    // Gesture is bound via native listeners in the effect above, not JSX
    // props - kept as an empty object so existing `{...swipeHandlers}`
    // call sites don't need to change.
    handlers: {},
    style: {
      transform: dragX ? `translateX(${dragX}px)` : undefined,
      transition: springing ? `transform ${SPRING_MS}ms cubic-bezier(0.16, 1, 0.3, 1)` : undefined,
      // Tells the browser upfront that this element only pans vertically on
      // its own - horizontal gestures are ours, so it never spins up a
      // competing native recognizer in the first place (belt-and-suspenders
      // alongside the preventDefault above).
      touchAction: "pan-y",
    } as React.CSSProperties,
  };
}
