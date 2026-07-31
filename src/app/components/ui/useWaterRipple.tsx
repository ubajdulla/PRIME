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
export function useWaterRipple() {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; size: number }[]>([]);
  const nextId = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = nextId.current++;
    setRipples((prev) => [...prev, { id, x, y, size }]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  }, []);

  return { ripples, onPointerDown };
}

export function RippleLayer({ ripples }: { ripples: { id: number; x: number; y: number; size: number }[] }) {
  return (
    <>
      {ripples.map((r) => (
        <span
          key={r.id}
          className="pointer-events-none absolute rounded-full bg-white/30 animate-water-drop"
          style={{
            left: r.x,
            top: r.y,
            width: r.size,
            height: r.size,
            marginLeft: -r.size / 2,
            marginTop: -r.size / 2,
          }}
        />
      ))}
    </>
  );
}
