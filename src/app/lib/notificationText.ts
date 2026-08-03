import type { Dict } from "../i18n/types";
import { shortDate } from "./eventDate";

// Notification `body` rows are stored as JSON-encoded structured params (not
// prose) so Alerts.tsx can render them in the reader's language regardless of
// what language the admin/action that triggered them was using. Legacy rows
// written before this existed aren't valid JSON, so renderNotification()
// falls back to displaying the raw stored title/body for those.
export type EventChange =
  | { type: "date"; date: string; time: string }
  | { type: "loc"; location: string };

export type NotifPayload =
  | { k: "swap_accepted"; role: "initiator" | "recipient"; eventTitle: string }
  | { k: "swap_failed"; eventTitle: string }
  | { k: "swap_declined"; eventTitle: string }
  | { k: "swap_request"; adminName: string | null; eventTitle: string }
  | { k: "event_reminder"; day: "today" | "tomorrow"; eventTitle: string; time: string; location: string }
  | { k: "event_canceled"; eventTitle: string; date: string; time: string }
  | { k: "event_updated"; eventTitle: string; changes: EventChange[] }
  | { k: "capacity_increased"; eventTitle: string; prevCapacity: number; newCapacity: number; count: number }
  | { k: "account_suspended"; date: string; reason: string | null }
  | { k: "account_banned"; reason: string | null };

export function encodeNotification(payload: NotifPayload): string {
  return JSON.stringify(payload);
}

export function renderNotification(rawBody: string, fallbackTitle: string, t: Dict): { title: string; description: string } {
  let payload: NotifPayload | null = null;
  try {
    const parsed = JSON.parse(rawBody);
    if (parsed && typeof parsed === "object" && typeof parsed.k === "string") payload = parsed as NotifPayload;
  } catch {
    // Not JSON - legacy plain-text row, fall through to raw display.
  }
  if (!payload) return { title: fallbackTitle, description: rawBody };

  const n = t.alerts.notif;
  switch (payload.k) {
    case "swap_accepted":
      return {
        title: n.swapAcceptedTitle,
        description: payload.role === "initiator" ? n.swapAcceptedInitiatorBody(payload.eventTitle) : n.swapAcceptedRecipientBody(payload.eventTitle),
      };
    case "swap_failed":
      return { title: n.swapFailedTitle, description: n.swapFailedBody(payload.eventTitle) };
    case "swap_declined":
      return { title: n.swapDeclinedTitle, description: n.swapDeclinedBody(payload.eventTitle) };
    case "swap_request":
      return { title: n.swapRequestTitle, description: n.swapRequestBody(payload.adminName ?? n.previousAdmin, payload.eventTitle) };
    case "event_reminder":
      return {
        title: n.reminderTitle(payload.day === "today" ? t.days.today : t.days.tomorrow),
        description: n.reminderBody(payload.eventTitle, payload.time, payload.location),
      };
    case "event_canceled":
      return { title: n.eventCanceledTitle, description: n.eventCanceledBody(payload.eventTitle, shortDate(payload.date, t, true), payload.time) };
    case "event_updated": {
      const changes = payload.changes
        .map(c => c.type === "date" ? n.changeDateTime(shortDate(c.date, t, true), c.time) : n.changeLocation(c.location))
        .join(", ");
      return { title: n.eventUpdatedTitle, description: n.eventUpdatedBody(payload.eventTitle, changes) };
    }
    case "capacity_increased":
      return { title: n.capacityTitle, description: n.capacityBody(payload.eventTitle, payload.prevCapacity, payload.newCapacity, payload.count) };
    case "account_suspended":
      return { title: n.suspendedTitle, description: n.suspendedBody(shortDate(payload.date, t, true), payload.reason) };
    case "account_banned":
      return { title: n.bannedTitle, description: n.bannedBody(payload.reason) };
    default:
      return { title: fallbackTitle, description: rawBody };
  }
}
