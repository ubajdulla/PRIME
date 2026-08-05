import { useCallback, useRef, useState } from "react";

/**
 * Water-drop press feedback: a translucent circle that blooms from the
 * press point and fades out, instead of active:scale / zoom press effects
 * (product decision — those read as cheap, this reads as tactile).
 * Usage: const { ripples, onPointerDown } = useWaterRipple();
 * <button className="relative overflow-hidden" onPointerDown={onPointerDown}>
 *   {children}
 *   <RippleLayer ripples={ripples} />
 * </button>
 */
// maxSize caps the ripple's diameter - without it, a very wide/short element
// (e.g. a full-width row) sizes the circle off its own width, which is huge
// relative to its height. Mid-animation the growing circle already exceeds
// the row's height and gets clipped top/bottom by overflow-hidden, so it
// reads as a widening rectangular block instead of a circular bloom. Most
// callers are roughly button-shaped and never hit the cap.
export function useWaterRipple(maxSize?: number) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; size: number }[]>([]);
  const nextId = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const size = Math.min(Math.max(rect.width, rect.height) * 2, maxSize ?? Infinity);
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = nextId.current++;
    setRipples((prev) => [...prev, { id, x, y, size }]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  }, [maxSize]);

  return { ripples, onPointerDown };
}

export function RippleLayer({ ripples }: { ripples: { id: number; x: number; y: number; size: number }[] }) {
  return (
    <>
      {ripples.map((r) => (
        <span
          key={r.id}
          className="pointer-events-none absolute rounded-full bg-[var(--ink)]/30 animate-water-drop"
          style={{
            left: r.x,
            top: r.y,
            width: r.size,
            height: r.size,
            marginLeft: -r.size / 2,
            marginTop: -r.size / 2,
            // iOS Safari can fail to repaint the button's other content (e.g. a
            // label) after this animated layer unmounts, leaving it stuck
            // invisible until something else forces a reflow. will-change makes
            // Safari keep a stable compositing layer for the ripple instead of
            // tearing one down on removal, which avoids the glitch.
            willChange: "transform, opacity",
          }}
        />
      ))}
    </>
  );
}
