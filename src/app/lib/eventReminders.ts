import { supabase } from "./supabaseClient";
import { encodeNotification } from "./notificationText";

function eventStartsAt(eventDate: string, eventTime: string): Date {
  const start = eventTime.split(" - ")[0]?.trim() ?? "00:00";
  return new Date(`${eventDate}T${start}:00`);
}

type RosterRow = {
  event_id: string;
  events: { id: string; title: string; event_date: string; event_time: string; location: string; status: string } | null;
};

// Best-effort, in-app-only "game soon" reminder for events the user is
// rostered on that start within the next 24h. No bot/background job yet -
// runs client-side once per app load (see MainLayout), same "compute at
// read time" pattern as publish visibility (018_publish_at.sql).
export async function checkEventReminders(userId: string) {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const { data: rows } = await supabase
    .from("event_participants")
    .select("event_id, events(id, title, event_date, event_time, location, status)")
    .eq("player_id", userId);
  if (!rows) return;

  const upcoming = (rows as unknown as RosterRow[])
    .map(r => r.events)
    .filter((e): e is NonNullable<RosterRow["events"]> => !!e && e.status === "upcoming")
    .filter(e => {
      const starts = eventStartsAt(e.event_date, e.event_time);
      return starts > now && starts <= in24h;
    });
  if (!upcoming.length) return;

  const { data: existing } = await supabase
    .from("notifications")
    .select("event_id")
    .eq("recipient_id", userId)
    .eq("type", "event_reminder")
    .in("event_id", upcoming.map(e => e.id));
  const already = new Set((existing ?? []).map(n => n.event_id));

  const toInsert = upcoming
    .filter(e => !already.has(e.id))
    .map(e => {
      const day: "today" | "tomorrow" = e.event_date === todayStr ? "today" : "tomorrow";
      const startTime = e.event_time.split(" - ")[0]?.trim() ?? e.event_time;
      return {
        recipient_id: userId,
        type: "event_reminder",
        title: `Game ${day === "today" ? "Today" : "Tomorrow"}`,
        body: encodeNotification({ k: "event_reminder", day, eventTitle: e.title, time: startTime, location: e.location }),
        event_id: e.id,
      };
    });
  if (!toInsert.length) return;

  const { error } = await supabase.from("notifications").insert(toInsert);
  if (error && error.code !== "23505") console.error("Failed to create event reminders:", error);
}
