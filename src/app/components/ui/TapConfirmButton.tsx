import { useEffect, useRef, useState } from "react";
import { useWaterRipple, RippleLayer } from "./useWaterRipple";

// Fixed-size action pill that arms on first tap and fires on the second -
// no modal needed for actions that don't need extra input (verify, lift
// suspension, unban). Same sweep-fill mechanic as ConfirmDropdownItem and
// the EventDetail CTA (a solid-color layer slides in from the right) -
// not a separate design, just that effect on a fixed-size pill. Owns its
// own armed state so callers just pass onConfirm; disarms itself after 3s
// or on any tap/scroll elsewhere.
export function TapConfirmButton({
  label,
  confirmLabel = "Confirm",
  fillCls,
  armedTextCls = "text-white",
  idleCls = "bg-white/5 text-white/70 hover:bg-white/10",
  onConfirm,
  disabled,
  className = "w-24 h-8",
}: {
  label: string;
  confirmLabel?: string;
  fillCls: string;
  armedTextCls?: string;
  idleCls?: string;
  onConfirm: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const ripple = useWaterRipple();
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(timer);
  }, [armed]);

  useEffect(() => {
    if (!armed) return;
    function disarm(e: Event) {
      if (e.target instanceof Node && btnRef.current?.contains(e.target)) return;
      setArmed(false);
    }
    document.addEventListener("pointerdown", disarm);
    document.addEventListener("wheel", disarm, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", disarm);
      document.removeEventListener("wheel", disarm);
    };
  }, [armed]);

  return (
    <button
      ref={btnRef}
      type="button"
      disabled={disabled}
      onClick={() => { if (armed) { setArmed(false); onConfirm(); } else { setArmed(true); } }}
      onPointerDown={ripple.onPointerDown}
      className={`relative overflow-hidden shrink-0 flex items-center justify-center rounded-full text-[11px] font-black uppercase tracking-wider focus:outline-none transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${className} ${armed ? "" : idleCls}`}
    >
      <span
        aria-hidden
        className={`absolute inset-0 ${fillCls} transition-transform duration-300 ease-out ${armed ? "translate-x-0" : "translate-x-full"}`}
      />
      <span className={`relative z-10 transition-colors duration-200 ${armed ? armedTextCls : ""}`}>
        {armed ? confirmLabel : label}
      </span>
      <RippleLayer ripples={ripple.ripples} />
    </button>
  );
}
