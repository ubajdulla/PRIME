import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronUp, ChevronDown, Calendar as CalendarIcon } from "lucide-react";
import { addMonths, addDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday, format } from "date-fns";
import { DropdownPanel } from "./DropdownMenu";
import { useWaterRipple, RippleLayer } from "./useWaterRipple";
import { MiniDropdown, isInsidePortalDropdown } from "./MiniDropdown";
import { useLang } from "../../i18n";
import { useExclusiveOpen } from "../../lib/exclusiveOpen";

export const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const CHUNK = 12; // months loaded per scroll-edge trigger
const EDGE_PX = 150; // how close to top/bottom before loading more

export function DatePickerField({
  value,
  onChange,
  triggerClassName,
  placeholder,
}: {
  value: string; // "yyyy-MM-dd" or ""
  onChange: (v: string) => void;
  triggerClassName: string;
  placeholder?: string;
}) {
  const { t } = useLang();
  const resolvedPlaceholder = placeholder ?? t.common.selectDate;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = value ? new Date(value + "T00:00:00") : null;
  useExclusiveOpen(open, () => setOpen(false), t => ref.current?.contains(t) ?? false);

  useEffect(() => {
    if (!open) return;
    function close(e: PointerEvent) {
      if (ref.current?.contains(e.target as Node)) return;
      if (isInsidePortalDropdown(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  function pick(d: Date) {
    onChange(format(d, "yyyy-MM-dd"));
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)} className={triggerClassName}>
        <span className={selected ? "" : "text-[#79828b]"}>
          {selected ? format(selected, "EEE, MMM d yyyy") : resolvedPlaceholder}
        </span>
        <CalendarIcon size={14} className="shrink-0 text-[#79828b]" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-30 w-72">
          <CalendarPanel selected={selected} onPick={pick} />
        </div>
      )}
    </div>
  );
}

export function CalendarPanel({
  selected, onPick, showToday = true, showMonthYearPicker = false, minYear, maxYear,
}: {
  selected: Date | null;
  onPick: (d: Date) => void;
  // Birth-date usage turns these on: no "Today" shortcut (irrelevant for a
  // birthday), and Month/Year dropdowns for jumping decades back instead of
  // scrolling one month at a time. Publish-at scheduling keeps the defaults.
  showToday?: boolean;
  showMonthYearPicker?: boolean;
  minYear?: number;
  maxYear?: number;
}) {
  const { t } = useLang();
  const today = new Date();
  const anchor = startOfMonth(selected ?? today);

  const [months, setMonths] = useState<Date[]>(() =>
    Array.from({ length: CHUNK * 2 + 1 }, (_, i) => addMonths(anchor, i - CHUNK))
  );
  const [monthIndex, setMonthIndex] = useState(CHUNK);

  const scrollRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prependHeightRef = useRef<number | null>(null);
  const jumpRef = useRef(false);
  const loadingRef = useRef(false);
  const todayRipple = useWaterRipple();

  useLayoutEffect(() => {
    const el = monthRefs.current[CHUNK];
    if (el && scrollRef.current) scrollRef.current.scrollTop = el.offsetTop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (jumpRef.current) {
      jumpRef.current = false;
      const target = monthRefs.current[CHUNK];
      if (target) el.scrollTop = target.offsetTop;
      return;
    }
    if (prependHeightRef.current === null) return;
    el.scrollTop += el.scrollHeight - prependHeightRef.current;
    prependHeightRef.current = null;
    loadingRef.current = false;
  }, [months]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el || loadingRef.current) return;
    if (el.scrollTop < EDGE_PX) {
      loadingRef.current = true;
      prependHeightRef.current = el.scrollHeight;
      setMonths(prev => [...Array.from({ length: CHUNK }, (_, i) => addMonths(prev[0], i - CHUNK)), ...prev]);
      setMonthIndex(i => i + CHUNK);
    } else if (el.scrollHeight - el.scrollTop - el.clientHeight < EDGE_PX) {
      loadingRef.current = true;
      setMonths(prev => [...prev, ...Array.from({ length: CHUNK }, (_, i) => addMonths(prev[prev.length - 1], i + 1))]);
      window.setTimeout(() => { loadingRef.current = false; }, 0);
    }
  }

  function scrollToMonth(i: number) {
    const clamped = Math.min(months.length - 1, Math.max(0, i));
    const el = monthRefs.current[clamped];
    if (el && scrollRef.current) scrollRef.current.scrollTo({ top: el.offsetTop, behavior: "smooth" });
    setMonthIndex(clamped);
  }

  // Jump to an arbitrary month/year picked from the dropdowns - rebuilds the
  // virtualized window centered on the target instead of scrolling through
  // everything in between (could be 50+ years away).
  function jumpToMonth(year: number, month: number) {
    const target = new Date(year, month, 1);
    jumpRef.current = true;
    setMonths(Array.from({ length: CHUNK * 2 + 1 }, (_, i) => addMonths(target, i - CHUNK)));
    setMonthIndex(CHUNK);
  }

  const currentMonthDate = months[monthIndex] ?? anchor;
  const yearFrom = minYear ?? today.getFullYear() - 100;
  const yearTo = maxYear ?? today.getFullYear() + 5;

  return (
    <DropdownPanel className="p-4">
      <div className="flex items-center gap-2 mb-3">
        {showMonthYearPicker ? (
          <>
            <MiniDropdown
              value={currentMonthDate.getMonth()}
              options={Array.from({ length: 12 }, (_, i) => ({ value: i, label: format(new Date(2000, i, 1), "MMMM") }))}
              onChange={m => jumpToMonth(currentMonthDate.getFullYear(), m)}
              className="flex-1 min-w-0"
            />
            <MiniDropdown
              value={currentMonthDate.getFullYear()}
              options={Array.from({ length: yearTo - yearFrom + 1 }, (_, i) => ({ value: yearTo - i, label: String(yearTo - i) }))}
              onChange={y => jumpToMonth(y, currentMonthDate.getMonth())}
              className="w-24 shrink-0"
            />
          </>
        ) : (
          <span className="flex-1 text-[var(--ink)] font-bold text-sm">{t.event.date}</span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => scrollToMonth(monthIndex - 1)}
            className="relative overflow-hidden w-7 h-7 flex items-center justify-center rounded-full text-[var(--brand)] hover:bg-[var(--brand)]/10 transition-colors focus:outline-none"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => scrollToMonth(monthIndex + 1)}
            className="relative overflow-hidden w-7 h-7 flex items-center justify-center rounded-full text-[var(--brand)] hover:bg-[var(--brand)]/10 transition-colors focus:outline-none"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(w => (
          <div key={w} className="text-center text-[10px] font-black text-[#79828b] tracking-wider py-1">{w}</div>
        ))}
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="relative h-[210px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 12px), transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 12px), transparent 100%)",
        }}
      >
        {months.map((m, i) => {
          const monthStart = startOfMonth(m);
          const monthEnd = endOfMonth(m);
          const leadingCount = (getDay(monthStart) + 6) % 7;
          const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
          const trailingCount = (7 - ((leadingCount + days.length) % 7)) % 7;
          const leadingDays = leadingCount > 0
            ? eachDayOfInterval({ start: addDays(monthStart, -leadingCount), end: addDays(monthStart, -1) })
            : [];
          const trailingDays = trailingCount > 0
            ? eachDayOfInterval({ start: addDays(monthEnd, 1), end: addDays(monthEnd, trailingCount) })
            : [];
          return (
            <div key={m.toISOString()} ref={el => { monthRefs.current[i] = el; }}>
              <div className={`text-center text-[var(--ink)] font-bold text-sm py-2 ${i > 0 ? "mt-1" : ""}`}>
                {format(m, "MMMM yyyy")}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {leadingDays.map(d => (
                  <DayButton
                    key={d.toISOString()}
                    day={d}
                    muted
                    selected={!!selected && isSameDay(d, selected)}
                    isToday={isToday(d)}
                    onPick={() => onPick(d)}
                  />
                ))}
                {days.map(d => (
                  <DayButton
                    key={d.toISOString()}
                    day={d}
                    selected={!!selected && isSameDay(d, selected)}
                    isToday={isToday(d)}
                    onPick={() => onPick(d)}
                  />
                ))}
                {trailingDays.map(d => (
                  <DayButton
                    key={d.toISOString()}
                    day={d}
                    muted
                    selected={!!selected && isSameDay(d, selected)}
                    isToday={isToday(d)}
                    onPick={() => onPick(d)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showToday && (
        <button
          type="button"
          onClick={() => onPick(today)}
          onPointerDown={todayRipple.onPointerDown}
          className="relative overflow-hidden w-full mt-3 py-2 text-[var(--brand)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--surface-active)] rounded-full transition-colors focus:outline-none"
        >
          {t.days.today}
          <RippleLayer ripples={todayRipple.ripples} />
        </button>
      )}
    </DropdownPanel>
  );
}

export function DayButton({
  day, selected, isToday: isTodayDate, muted = false, onPick,
}: {
  day: Date; selected: boolean; isToday: boolean; muted?: boolean; onPick: () => void;
}) {
  const ripple = useWaterRipple();
  return (
    <div className="flex items-center justify-center">
      <button
        type="button"
        onClick={onPick}
        onPointerDown={ripple.onPointerDown}
        className={`relative overflow-hidden w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors focus:outline-none ${
          selected
            ? "bg-[var(--brand)] text-white"
            : isTodayDate
              ? `border border-[var(--brand)]/50 ${muted ? "text-[var(--ink)]/40" : "text-[var(--ink)]"}`
              : muted
                ? "text-[var(--ink)]/25 hover:bg-[var(--surface-active)] hover:text-[var(--ink)]/50"
                : "text-[var(--ink)] hover:bg-[var(--surface-active)]"
        }`}
      >
        {day.getDate()}
        <RippleLayer ripples={ripple.ripples} />
      </button>
    </div>
  );
}
