import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  addMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, isSameDay, isSameMonth, isToday, isBefore, format,
} from "date-fns";

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
}: {
  initial: string | null;
  onClose: () => void;
  onConfirm: (publishedAt: string | null) => void;
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

  useEffect(() => {
    const el = monthRefs.current[todayMonthIndex];
    if (el && scrollRef.current) {
      scrollRef.current.scrollTop = el.offsetTop;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickDay(d: Date) {
    const next = new Date(d);
    next.setHours(clampInt(hour, 0, 23), clampInt(minute, 0, 59), 0, 0);
    setSelectedDay(next);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#212121] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/5">
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#79828b] hover:text-white hover:bg-white/5 transition-colors">
            <X size={16} />
          </button>
          <h3 className="font-black italic uppercase tracking-widest text-white text-sm">Publish Event</h3>
          <div className="w-8 h-8" />
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

          {/* Continuous month scroll - fixed to 5 rows tall, browse by scrolling down only */}
          <div ref={scrollRef} className="relative h-[210px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {months.map((m, i) => {
              const monthStart = startOfMonth(m);
              const monthEnd = endOfMonth(m);
              const leadingBlanks = (getDay(monthStart) + 6) % 7; // Mon-first week
              const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
              return (
                <div key={m.toISOString()} ref={el => { monthRefs.current[i] = el; }}>
                  <div className={`text-center text-white font-bold text-sm py-2 ${i > 0 ? "mt-1" : ""}`}>
                    {format(m, "MMMM yyyy")}
                  </div>
                  <div className="grid grid-cols-7 gap-y-1">
                    {Array.from({ length: leadingBlanks }).map((_, j) => <div key={`lead-${j}`} className="h-8" />)}
                    {days.map(d => {
                      const selected = isSameDay(d, selectedDay);
                      const isTodayDate = isToday(d);
                      const weekend = (getDay(d) === 0 || getDay(d) === 6);
                      return (
                        <div key={d.toISOString()} className="flex items-center justify-center">
                          <button
                            onClick={() => pickDay(d)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                              selected
                                ? "bg-[#462ed1] text-white"
                                : isTodayDate
                                  ? "border border-[#462ed1]/50 text-white"
                                  : weekend
                                    ? "text-[#ef4444]/80 hover:bg-white/5"
                                    : "text-white hover:bg-white/5"
                            }`}
                          >
                            {d.getDate()}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time */}
          <div className="flex items-center justify-center gap-2 mt-5">
            <TimeBox value={hour} onChange={v => setHour(String(clampInt(v, 0, 23)).padStart(2, "0"))} />
            <span className="text-white font-black text-lg">:</span>
            <TimeBox value={minute} onChange={v => setMinute(String(clampInt(v, 0, 59)).padStart(2, "0"))} />
          </div>

          {/* Confirm */}
          <button
            onClick={() => onConfirm(isNow ? null : target.toISOString())}
            className="w-full mt-5 py-3.5 rounded-xl bg-[#462ed1] text-white font-black text-sm uppercase tracking-wider transition-transform"
          >
            {label}
          </button>
        </div>
      </div>
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
