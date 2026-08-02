import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import {
  addMonths, addDays, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, isSameDay, isSameMonth, isToday, isBefore, format,
} from "date-fns";
import { ModalOverlay } from "./ui/Modal";
import { useWaterRipple, RippleLayer } from "./ui/useWaterRipple";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MONTHS_BEFORE = 3;
const MONTHS_AFTER = 15;

function clampInt(v: string, min: number, max: number): number {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function PublishEventModal({
  initial,
  onClose,
  onConfirm,
  origin,
}: {
  initial: string | null;
  onClose: () => void;
  onConfirm: (publishedAt: string | null) => void;
  // Screen point (e.g. the CTA button's center) the modal pops open from —
  // same "pop from the button" entrance as EventDetail's join modal, instead
  // of just fading in centered. Pass null/omit to fall back to a plain fade.
  origin?: { x: number; y: number } | null;
}) {
  const initialDate = initial ? new Date(initial) : new Date();
  const today = new Date();

  const [selectedDay, setSelectedDay] = useState(initialDate);
  const [hour, setHour] = useState(String(initialDate.getHours()).padStart(2, "0"));
  const [minute, setMinute] = useState(String(initialDate.getMinutes()).padStart(2, "0"));

  const target = new Date(selectedDay);
  target.setHours(clampInt(hour, 0, 23), clampInt(minute, 0, 59), 0, 0);

  const isNow = target.getTime() <= Date.now();
  const label = isNow ? "Publish Now" : `Schedule for ${format(target, "MMM d, HH:mm")}`;

  // Continuous, no-buttons calendar - browse months by scrolling down, never by
  // clicking prev/next. Range is generous but fixed (no infinite loading) and
  // always covers both "today" and whatever date the event is already scheduled for.
  const baseMonth = addMonths(startOfMonth(isBefore(initialDate, today) ? initialDate : today), -MONTHS_BEFORE);
  const months = Array.from({ length: MONTHS_BEFORE + MONTHS_AFTER + 1 }, (_, i) => addMonths(baseMonth, i));
  // Always open scrolled to the real current month - not wherever the event
  // happens to already be scheduled for (that date still shows selected/highlighted,
  // just reachable by scrolling instead of being where the view starts).
  const todayMonthIndex = months.findIndex(m => isSameMonth(m, today));

  const scrollRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [monthIndex, setMonthIndex] = useState(todayMonthIndex);

  useEffect(() => {
    const el = monthRefs.current[todayMonthIndex];
    if (el && scrollRef.current) {
      scrollRef.current.scrollTop = el.offsetTop;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scrollToMonth(i: number) {
    const clamped = Math.min(months.length - 1, Math.max(0, i));
    const el = monthRefs.current[clamped];
    if (el && scrollRef.current) {
      scrollRef.current.scrollTo({ top: el.offsetTop, behavior: "smooth" });
    }
    setMonthIndex(clamped);
  }

  function pickDay(d: Date) {
    const next = new Date(d);
    next.setHours(clampInt(hour, 0, 23), clampInt(minute, 0, 59), 0, 0);
    setSelectedDay(next);
  }

  const closeRipple = useWaterRipple();
  const upRipple = useWaterRipple();
  const downRipple = useWaterRipple();
  const ctaRipple = useWaterRipple();

  // Pop open from `origin` (the triggering CTA button's on-screen position) —
  // same entrance as EventDetail's join modal: measure the box's natural rect,
  // collapse it to scale(0.01) at that point with no transition, force a
  // reflow, then animate to scale(1)/opacity 1 on the next frame so the
  // browser never paints the untransformed frame first.
  const boxRef = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    if (!origin) { setEntered(true); return; }
    const rect = box.getBoundingClientRect();
    box.style.transformOrigin = `${origin.x - rect.left}px ${origin.y - rect.top}px`;
    box.style.transition = "none";
    box.style.transform = "scale(0.01)";
    box.style.opacity = "0";
    void box.offsetHeight;
    const raf = requestAnimationFrame(() => {
      box.style.transition = "transform 320ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease-out";
      box.style.transform = "scale(1)";
      box.style.opacity = "1";
      setEntered(true);
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ModalOverlay
      boxClassName=""
      rounded="rounded-[2rem]"
      boxRef={boxRef}
      overlayClassName={`transition-opacity duration-200 ${entered ? "opacity-100" : "opacity-0"}`}
    >
      {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/5">
          <button
            onClick={onClose}
            onPointerDown={closeRipple.onPointerDown}
            className="relative overflow-hidden w-8 h-8 flex items-center justify-center rounded-full text-[#79828b] hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={22} />
            <RippleLayer ripples={closeRipple.ripples} />
          </button>
          <h3 className="font-black italic uppercase tracking-widest text-white text-sm">Publish Event</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => scrollToMonth(monthIndex - 1)}
              onPointerDown={upRipple.onPointerDown}
              disabled={monthIndex <= 0}
              className="relative overflow-hidden w-8 h-8 flex items-center justify-center rounded-full text-[#462ed1] hover:bg-[#462ed1]/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronUp size={16} />
              <RippleLayer ripples={upRipple.ripples} />
            </button>
            <button
              onClick={() => scrollToMonth(monthIndex + 1)}
              onPointerDown={downRipple.onPointerDown}
              disabled={monthIndex >= months.length - 1}
              className="relative overflow-hidden w-8 h-8 flex items-center justify-center rounded-full text-[#462ed1] hover:bg-[#462ed1]/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronDown size={16} />
              <RippleLayer ripples={downRipple.ripples} />
            </button>
          </div>
        </div>

        <div className="p-5">
          {/* Weekday header - fixed, does not scroll */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className={`text-center text-[10px] font-black tracking-wider py-1 ${i >= 5 ? "text-[#ef4444]/70" : "text-[#79828b]"}`}>
                {w}
              </div>
            ))}
          </div>

          {/* Continuous month scroll - fixed to 5 rows tall, browse by scrolling down only.
              Masked top/bottom so a row mid-scroll fades out instead of being hard-clipped. */}
          <div
            ref={scrollRef}
            className="relative h-[210px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            style={{
              maskImage: "linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 12px), transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 12px), transparent 100%)",
            }}
          >
            {months.map((m, i) => {
              const monthStart = startOfMonth(m);
              const monthEnd = endOfMonth(m);
              const leadingCount = (getDay(monthStart) + 6) % 7; // Mon-first week
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
                  <div className={`text-center text-white font-bold text-sm py-2 ${i > 0 ? "mt-1" : ""}`}>
                    {format(m, "MMMM yyyy")}
                  </div>
                  <div className="grid grid-cols-7 gap-y-1">
                    {leadingDays.map(d => (
                      <DayButton
                        key={d.toISOString()}
                        day={d}
                        muted
                        selected={isSameDay(d, selectedDay)}
                        isToday={isToday(d)}
                        weekend={getDay(d) === 0 || getDay(d) === 6}
                        onPick={() => pickDay(d)}
                      />
                    ))}
                    {days.map(d => (
                      <DayButton
                        key={d.toISOString()}
                        day={d}
                        selected={isSameDay(d, selectedDay)}
                        isToday={isToday(d)}
                        weekend={getDay(d) === 0 || getDay(d) === 6}
                        onPick={() => pickDay(d)}
                      />
                    ))}
                    {trailingDays.map(d => (
                      <DayButton
                        key={d.toISOString()}
                        day={d}
                        muted
                        selected={isSameDay(d, selectedDay)}
                        isToday={isToday(d)}
                        weekend={getDay(d) === 0 || getDay(d) === 6}
                        onPick={() => pickDay(d)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time */}
          <div className="flex items-center justify-center gap-4 mt-5">
            <TimeBox value={hour} onChange={v => setHour(String(clampInt(v, 0, 23)).padStart(2, "0"))} />
            <span className="text-white font-black text-lg">:</span>
            <TimeBox value={minute} onChange={v => setMinute(String(clampInt(v, 0, 59)).padStart(2, "0"))} />
          </div>

          {/* Confirm */}
          <button
            onClick={() => onConfirm(isNow ? null : target.toISOString())}
            onPointerDown={ctaRipple.onPointerDown}
            className="relative overflow-hidden w-full mt-5 py-3.5 rounded-full bg-[#462ed1] text-white font-black text-sm uppercase tracking-wider transition-transform"
          >
            {label}
            <RippleLayer ripples={ctaRipple.ripples} />
          </button>
        </div>
    </ModalOverlay>
  );
}

function DayButton({
  day, selected, isToday: isTodayDate, weekend, muted = false, onPick,
}: {
  day: Date; selected: boolean; isToday: boolean; weekend: boolean; muted?: boolean; onPick: () => void;
}) {
  const ripple = useWaterRipple();
  return (
    <div className="flex items-center justify-center">
      <button
        onClick={onPick}
        onPointerDown={ripple.onPointerDown}
        className={`relative overflow-hidden w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
          selected
            ? "bg-[#462ed1] text-white"
            : isTodayDate
              ? `border border-[#462ed1]/50 ${muted ? "text-white/40" : "text-white"}`
              : muted
                ? weekend ? "text-[#ef4444]/30 hover:bg-white/5" : "text-white/25 hover:bg-white/5"
                : weekend
                  ? "text-[#ef4444]/80 hover:bg-white/5"
                  : "text-white hover:bg-white/5"
        }`}
      >
        {day.getDate()}
        <RippleLayer ripples={ripple.ripples} />
      </button>
    </div>
  );
}

function TimeBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      onChange={e => onChange(e.target.value.replace(/[^0-9]/g, "") || "0")}
      className="w-16 h-12 bg-[#212121] border border-white/10 rounded-xl text-white text-lg font-black text-center outline-none focus:border-[#462ed1]/50 transition-colors"
    />
  );
}
