const DOW_UPPER = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DOW_TITLE = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON_UPPER = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MON_TITLE = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function relativeDay(dateStr: string): "TODAY" | "TOMORROW" | null {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 0) return "TODAY";
  if (diffDays === 1) return "TOMORROW";
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

export function shortDate(dateStr: string, titleCase = false): string {
  const d = new Date(dateStr + "T00:00:00");
  const dow = titleCase ? DOW_TITLE[d.getDay()] : DOW_UPPER[d.getDay()];
  const mon = titleCase ? MON_TITLE[d.getMonth()] : MON_UPPER[d.getMonth()];
  return `${dow}, ${mon} ${d.getDate()}`;
}
