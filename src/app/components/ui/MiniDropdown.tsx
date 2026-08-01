import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

const PORTAL_DROPDOWN_ATTR = "data-portal-dropdown";

// Any component with its own "click outside closes me" listener (calendar
// popups, etc.) must let clicks inside a portaled MiniDropdown pass through -
// otherwise selecting a month/year (rendered into document.body, so it's not
// a DOM descendant of the popup it visually belongs to) reads as "clicked
// outside" and closes the whole popup along with it.
export function isInsidePortalDropdown(target: EventTarget | null) {
  return target instanceof Element && !!target.closest(`[${PORTAL_DROPDOWN_ATTR}]`);
}

// Own themed dropdown for compact inline pickers (month/year, etc.) - a
// native <select> can't be restyled (its open list always renders in OS
// chrome). Rendered through a portal with position:fixed so it can never be
// clipped by an ancestor's overflow-hidden, never grows its parent's box,
// and always sits above everything else.
export function MiniDropdown({
  value, options, onChange, className = "",
}: {
  value: number;
  options: { value: number; label: string }[];
  onChange: (v: number) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(null);
  const current = options.find(o => o.value === value);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const PANEL_H = 208;
    const openUp = window.innerHeight - rect.bottom < PANEL_H && rect.top > PANEL_H;
    setCoords({
      top: openUp ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      openUp,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function close(e: PointerEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  // Manual scroll-to-selected instead of scrollIntoView - scrollIntoView can
  // walk up and scroll the whole page if it decides that helps centering.
  useLayoutEffect(() => {
    if (!open || !listRef.current) return;
    const selectedEl = listRef.current.querySelector<HTMLButtonElement>('[data-selected="true"]');
    if (selectedEl) {
      listRef.current.scrollTop = selectedEl.offsetTop - listRef.current.clientHeight / 2 + selectedEl.clientHeight / 2;
    }
  }, [open]);

  return (
    <div className={className}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-1.5 pl-3 pr-2 py-1.5 bg-white/5 rounded-lg text-sm text-white hover:bg-white/10 transition-colors focus:outline-none"
      >
        <span className="truncate">{current?.label}</span>
        <ChevronDown size={13} className={`text-[#79828b] shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && coords && createPortal(
        <div
          ref={panelRef}
          {...{ [PORTAL_DROPDOWN_ATTR]: "" }}
          style={{
            position: "fixed",
            ...(coords.openUp
              ? { bottom: window.innerHeight - coords.top, top: "auto" }
              : { top: coords.top, bottom: "auto" }),
            left: coords.left,
            width: coords.width,
          }}
          className="z-[9999]"
        >
          <div
            ref={listRef}
            className="bg-[var(--surface-hover)] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] overflow-y-auto max-h-48 p-1.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {options.map(o => (
              <button
                key={o.value}
                data-selected={o.value === value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`block w-full px-3 py-2 rounded-lg text-sm text-left transition-colors focus:outline-none ${
                  o.value === value ? "bg-[#462ed1]/20 text-white font-semibold" : "text-white hover:bg-[var(--surface-active)]"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
