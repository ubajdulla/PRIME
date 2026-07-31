import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { addMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday, format } from "date-fns";
import { DropdownPanel } from "./DropdownMenu";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function DatePickerField({
  value,
  onChange,
  triggerClassName,
  placeholder = "Select date",
}: {
  value: string; // "yyyy-MM-dd" or ""
  onChange: (v: string) => void;
  triggerClassName: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = value ? new Date(value + "T00:00:00") : null;
  const [viewMonth, setViewMonth] = useState(startOfMonth(selected ?? new Date()));

  useEffect(() => {
    if (!open) return;
    function close(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  function pick(d: Date) {
    onChange(format(d, "yyyy-MM-dd"));
    setOpen(false);
  }

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const leadingBlanks = (getDay(monthStart) + 6) % 7;
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)} className={triggerClassName}>
        <span className={selected ? "" : "text-[#79828b]"}>
          {selected ? format(selected, "EEE, MMM d yyyy") : placeholder}
        </span>
        <CalendarIcon size={14} className="shrink-0 text-[#79828b]" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-30 w-72">
          <DropdownPanel className="p-4">
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setViewMonth(m => addMonths(m, -1))}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#79828b] hover:text-white hover:bg-[var(--surface-active)] transition-colors focus:outline-none"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-white font-bold text-sm">{format(viewMonth, "MMMM yyyy")}</span>
              <button
                type="button"
                onClick={() => setViewMonth(m => addMonths(m, 1))}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#79828b] hover:text-white hover:bg-[var(--surface-active)] transition-colors focus:outline-none"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(w => (
                <div key={w} className="text-center text-[10px] font-black text-[#79828b] tracking-wider py-1">{w}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
              {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`b${i}`} />)}
              {days.map(d => {
                const isSel = !!selected && isSameDay(d, selected);
                return (
                  <div key={d.toISOString()} className="flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => pick(d)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors focus:outline-none ${
                        isSel ? "bg-[#462ed1] text-white" : isToday(d) ? "border border-[#462ed1]/50 text-white" : "text-white hover:bg-[var(--surface-active)]"
                      }`}
                    >
                      {d.getDate()}
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => pick(new Date())}
              className="w-full mt-3 py-2 text-[#462ed1] text-xs font-bold uppercase tracking-wider hover:bg-[var(--surface-active)] rounded-lg transition-colors focus:outline-none"
            >
              Today
            </button>
          </DropdownPanel>
        </div>
      )}
    </div>
  );
}
