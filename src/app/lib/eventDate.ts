import type { Dict } from "../i18n/types";

export function relativeDay(dateStr: string): "today" | "tomorrow" | null {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  return null;
}

// An event is "past" once its date has gone by - not a stored status, computed live
// so history sections and filters stay correct without any admin action or cron job.
export function isPastDate(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

// Roster lock follows the same computed-at-read-time pattern as isPastDate - no
// cron needed. `override` lets an admin force either state (lock early, or unlock
// again after the automatic cutoff already passed); null falls back to the
// automatic rule: locked once the event's calendar day starts.
export function isRosterLocked(dateStr: string, override: "locked" | "unlocked" | null): boolean {
  if (override === "locked") return true;
  if (override === "unlocked") return false;
  const d = new Date(dateStr + "T00:00:00");
  return Date.now() >= d.getTime();
}

export function shortDate(dateStr: string, t: Dict, titleCase = false): string {
  const d = new Date(dateStr + "T00:00:00");
  const dow = titleCase ? t.dateFmt.dowTitle[d.getDay()] : t.dateFmt.dow[d.getDay()];
  const mon = titleCase ? t.dateFmt.monTitle[d.getMonth()] : t.dateFmt.mon[d.getMonth()];
  return `${dow}, ${mon} ${d.getDate()}`;
}

// "Today"/"Tomorrow" (uppercase, to match the badge-style short date) or the
// localized "DOW, MON D" short date - the primary label used on event cards
// and the home feed's date rail.
export function formatEventDate(dateStr: string, t: Dict): string {
  const rel = relativeDay(dateStr);
  if (rel === "today") return t.days.today.toUpperCase();
  if (rel === "tomorrow") return t.days.tomorrow.toUpperCase();
  return shortDate(dateStr, t);
}

// Google Calendar "add event" link, prefilled with the event's date/time.
// event_time is stored as "HH:MM - HH:MM" (see AdminCreateEvent.tsx), so the
// real end time is used when present; a bare "HH:MM" (no end) falls back to
// a 2h block. Times are converted through the device's local zone so the
// event lands on the calendar at the same wall-clock time shown in the app.
export function addToCalendarUrl(dateStr: string, timeStr: string, title: string, location?: string): string {
  const [startRaw, endRaw] = timeStr.split(" - ").map(s => s.trim());
  const start = new Date(`${dateStr}T${startRaw}`);
  const end = endRaw ? new Date(`${dateStr}T${endRaw}`) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    ctz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  if (location) params.set("location", location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Full weekday name (or "Today"/"Tomorrow") - the secondary label under the
// short date on the home feed's date rail.
export function weekdayLabel(dateStr: string, t: Dict): string {
  const rel = relativeDay(dateStr);
  if (rel === "today") return t.days.today;
  if (rel === "tomorrow") return t.days.tomorrow;
  const d = new Date(dateStr + "T00:00:00");
  const keys: (keyof Dict["days"])[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return t.days[keys[d.getDay()]];
}
