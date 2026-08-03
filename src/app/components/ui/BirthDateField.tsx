import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon } from "lucide-react";
import { isValid, format, parse } from "date-fns";
import { CalendarPanel } from "./DatePickerField";
import { isInsidePortalDropdown } from "./MiniDropdown";

const MIN_YEAR = 1920;
const PANEL_W = 288; // matches DatePickerField's w-72 dropdown

function maskDigitsToDate(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join("/");
}

// Typeable text field (DD/MM/RRRR, slash auto-inserted as you type digits)
// paired with the exact same calendar used by "Publish at" (DatePickerField)
// - fixed-height, mouse-wheel scrollable, infinite month list - instead of a
// bespoke one, so it behaves identically and doesn't resize per month. The
// calendar panel is portaled with position:fixed (like MiniDropdown) so it
// can never be clipped by an ancestor's overflow-hidden (e.g. the rounded
// info cards on Profile/AdminPlayerProfile) or sit behind other UI.
export function BirthDateField({
  value,
  onChange,
  placeholder,
  inline = false,
}: {
  value: string; // "yyyy-MM-dd" or ""
  onChange: (v: string) => void;
  placeholder?: string;
  // Compact style for use inside fixed-height list rows (DateOfBirthRow) -
  // no border/background box around the input, matching ContactRow's inline
  // fields. Typing, masking and calendar behavior are identical either way.
  inline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value ? format(new Date(value + "T00:00:00"), "dd/MM/yyyy") : "");
  const ref = useRef<HTMLDivElement>(null);
  const calendarBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const selected = value ? new Date(value + "T00:00:00") : null;

  useEffect(() => {
    setText(value ? format(new Date(value + "T00:00:00"), "dd/MM/yyyy") : "");
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function close(e: PointerEvent) {
      if (ref.current?.contains(e.target as Node)) return;
      if (panelRef.current?.contains(e.target as Node)) return;
      if (isInsidePortalDropdown(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  // Positions the portaled panel under the field - recomputed on open since
  // the field can live anywhere (compact row or boxed registration field).
  // The panel has its own sensible min width (PANEL_W) instead of matching
  // the field's width verbatim - the compact `inline` row is far narrower
  // than a calendar needs, which would otherwise squash the month dropdown
  // down to nothing.
  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = Math.max(rect.width, PANEL_W);
    const left = Math.min(rect.left, window.innerWidth - width - 16);
    setCoords({ top: rect.bottom + 6, left: Math.max(left, 16), width });
  }, [open]);

  useEffect(() => {
    if (!open) setCoords(null);
  }, [open]);

  // Pops open from the calendar-icon button, same trick as the join modal.
  useLayoutEffect(() => {
    if (!open || !coords || !panelRef.current || !calendarBtnRef.current) return;
    const box = panelRef.current;
    const btnRect = calendarBtnRef.current.getBoundingClientRect();
    const rect = box.getBoundingClientRect();
    box.style.transformOrigin = `${btnRect.left + btnRect.width / 2 - rect.left}px ${btnRect.top + btnRect.height / 2 - rect.top}px`;
    box.style.transition = "none";
    box.style.transform = "scale(0.05)";
    box.style.opacity = "0";
    void box.offsetHeight;
    const raf = requestAnimationFrame(() => {
      box.style.transition = "transform 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 160ms ease-out";
      box.style.transform = "scale(1)";
      box.style.opacity = "1";
    });
    return () => cancelAnimationFrame(raf);
  }, [open, coords]);

  function handleTextChange(raw: string) {
    const masked = maskDigitsToDate(raw);
    setText(masked);
    if (masked.replace(/\D/g, "").length !== 8) return;
    const parsed = parse(masked, "dd/MM/yyyy", new Date());
    if (isValid(parsed) && parsed <= new Date() && parsed.getFullYear() >= MIN_YEAR) {
      onChange(format(parsed, "yyyy-MM-dd"));
    }
  }

  function pick(d: Date) {
    onChange(format(d, "yyyy-MM-dd"));
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <div
        className={
          inline
            ? "flex items-center gap-1.5"
            : "flex items-center gap-3 px-4 py-3.5 bg-[#181818]/60 border border-white/10 rounded-xl focus-within:border-white/20 transition-colors"
        }
      >
        <input
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={text}
          onChange={e => handleTextChange(e.target.value)}
          className={
            inline
              ? "flex-1 min-w-0 bg-transparent text-white text-sm leading-5 placeholder:text-[#79828b]/60 focus:outline-none shadow-[0_1px_0_0_rgba(255,255,255,0.15)] focus:shadow-[0_1px_0_0_#462ed1] transition-shadow"
              : "flex-1 bg-transparent text-white text-sm placeholder:text-[#79828b]/60 focus:outline-none"
          }
        />
        <button
          ref={calendarBtnRef}
          type="button"
          onClick={() => setOpen(v => !v)}
          className="text-[#79828b] hover:text-white transition-colors shrink-0"
        >
          <CalendarIcon size={inline ? 14 : 16} />
        </button>
      </div>

      {open && coords && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width }}
          className="z-[9999]"
        >
          <CalendarPanel
            selected={selected}
            onPick={pick}
            showToday={false}
            showMonthYearPicker
            minYear={MIN_YEAR}
            maxYear={new Date().getFullYear()}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
