import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Bell,
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
  ChevronRight,
  Ban,
  Clock,
  CalendarClock,
  AlertTriangle,
  OctagonX,
  UserPlus,
} from "lucide-react";
import { useLang } from "../i18n";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { Toast } from "../components/ui/Toast";
import { FilterPill } from "../components/ui/FilterPill";

type AlertType =
  | "moderator_swap_request" | "moderator_swap_accepted" | "moderator_swap_declined"
  | "event_canceled" | "event_reminder" | "event_updated" | "capacity_increased"
  | "account_suspended" | "account_banned";

interface AlertItem {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  eventId?: string;
  relatedId?: string;
}

type NotificationRow = {
  id: string;
  type: AlertType;
  title: string;
  body: string;
  event_id: string | null;
  related_id: string | null;
  read: boolean;
  created_at: string;
};

const TYPE_CONFIG: Record<
  AlertType,
  { icon: React.ComponentType<{ size?: number; className?: string }>; bg: string; color: string; linkPrefix: "/admin/events/" | "/events/" }
> = {
  moderator_swap_request:   { icon: ArrowLeftRight, bg: "bg-[#462ed1]/15", color: "text-[#462ed1]", linkPrefix: "/admin/events/" },
  moderator_swap_accepted:  { icon: CheckCircle2,   bg: "bg-[#22c55e]/15", color: "text-[#22c55e]", linkPrefix: "/admin/events/" },
  moderator_swap_declined:  { icon: XCircle,        bg: "bg-[#ef4444]/15", color: "text-[#ef4444]", linkPrefix: "/admin/events/" },
  event_canceled:           { icon: Ban,            bg: "bg-[#ef4444]/15", color: "text-[#ef4444]", linkPrefix: "/events/" },
  event_reminder:           { icon: Clock,          bg: "bg-[#3897f0]/15", color: "text-[#3897f0]", linkPrefix: "/events/" },
  event_updated:            { icon: CalendarClock,  bg: "bg-[#eab308]/15", color: "text-[#eab308]", linkPrefix: "/events/" },
  account_suspended:        { icon: AlertTriangle,  bg: "bg-[#eab308]/15", color: "text-[#eab308]", linkPrefix: "/events/" },
  account_banned:           { icon: OctagonX,       bg: "bg-[#ef4444]/15", color: "text-[#ef4444]", linkPrefix: "/events/" },
  capacity_increased:       { icon: UserPlus,       bg: "bg-[#22c55e]/15", color: "text-[#22c55e]", linkPrefix: "/admin/events/" },
};

// Fallback for notification rows whose type has since been retired (e.g. old
// waitlist_promoted rows from before that type was removed) - render them
// generically instead of crashing.
const FALLBACK_CONFIG = { icon: Bell, bg: "bg-white/10", color: "text-white/70", linkPrefix: "/events/" } as const;

type Filter = "all" | "unread";

function bucketFor(createdAt: string): "today" | "yesterday" | "earlier" {
  const day = new Date(createdAt); day.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diff === 0) return "today";
  if (diff === 1) return "yesterday";
  return "earlier";
}

function formatTime(createdAt: string, group: string, locale: string): string {
  const d = new Date(createdAt);
  return group === "earlier"
    ? d.toLocaleDateString(locale, { month: "short", day: "numeric" })
    : d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export function Alerts() {
  const { t, lang } = useLang();
  const locale = lang === "ru" ? "ru-RU" : "en-GB";
  const { user: authUser } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [swapStatus, setSwapStatus] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error"; visible: boolean }>({ message: "", variant: "success", visible: false });

  function fireToast(message: string, variant: "success" | "error") {
    setToast({ message, variant, visible: true });
  }

  async function loadNotifications() {
    if (!authUser) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, body, event_id, related_id, read, created_at")
      .eq("recipient_id", authUser.id)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as NotificationRow[];
    setRows(list);

    const swapIds = [...new Set(list.filter(r => r.type === "moderator_swap_request" && r.related_id).map(r => r.related_id!))];
    if (swapIds.length) {
      const { data: swaps } = await supabase.from("moderator_swap_requests").select("id, status").in("id", swapIds);
      setSwapStatus(Object.fromEntries((swaps ?? []).map(s => [s.id, s.status])));
    }
  }

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  function toAlertItem(r: NotificationRow): AlertItem {
    const group = bucketFor(r.created_at);
    return {
      id: r.id,
      type: r.type,
      title: r.title,
      description: r.body,
      time: formatTime(r.created_at, group, locale),
      unread: !r.read,
      eventId: r.event_id ?? undefined,
      relatedId: r.related_id ?? undefined,
    };
  }

  const groupedAll = useMemo(() => {
    const buckets: Record<"today" | "yesterday" | "earlier", AlertItem[]> = { today: [], yesterday: [], earlier: [] };
    for (const r of rows) buckets[bucketFor(r.created_at)].push(toAlertItem(r));
    return (["today", "yesterday", "earlier"] as const)
      .map(group => ({ group, items: buckets[group] }))
      .filter(g => g.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const totalUnread = rows.filter(r => !r.read).length;

  async function markRead(id: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, read: true } : r));
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  }

  async function markAllRead() {
    const ids = rows.filter(r => !r.read).map(r => r.id);
    setRows(prev => prev.map(r => ({ ...r, read: true })));
    if (ids.length) await supabase.from("notifications").update({ read: true }).in("id", ids);
  }

  async function acceptSwap(alert: AlertItem) {
    const swapId = alert.relatedId;
    if (!swapId) return;
    const { data: swap } = await supabase
      .from("moderator_swap_requests")
      .select("*, events(title), from_admin:profiles!from_admin_id(is_admin)")
      .eq("id", swapId).eq("status", "pending").single();

    if (!swap) {
      fireToast(t.alerts.swapUnavailable, "error");
      await markRead(alert.id);
      setSwapStatus(prev => ({ ...prev, [swapId]: "resolved" }));
      return;
    }

    // Belt-and-suspenders: re-check the initiator is still an admin (RLS only
    // re-validates the accepting admin's is_admin() on the events update below).
    const initiatorStillAdmin = (swap.from_admin as unknown as { is_admin: boolean } | null)?.is_admin ?? false;

    if (initiatorStillAdmin) {
      const { error: eventErr } = await supabase.from("events").update({ moderator_id: swap.to_admin_id }).eq("id", swap.event_id);
      if (!eventErr) {
        await supabase.from("moderator_swap_requests").update({ status: "accepted", responded_at: new Date().toISOString() }).eq("id", swapId);
        const { error: notifyErr } = await supabase.from("notifications").insert([
          { recipient_id: swap.from_admin_id, type: "moderator_swap_accepted", title: "Swap Successful",
            body: `Your moderator swap for "${swap.events?.title}" was accepted.`, event_id: swap.event_id, related_id: swapId },
          { recipient_id: swap.to_admin_id, type: "moderator_swap_accepted", title: "Swap Successful",
            body: `You are now the moderator for "${swap.events?.title}".`, event_id: swap.event_id, related_id: swapId },
        ]);
        if (notifyErr) console.error("Failed to send swap-accepted notifications:", notifyErr);
        fireToast(t.alerts.swapAccepted, "success");
        await markRead(alert.id);
        setSwapStatus(prev => ({ ...prev, [swapId]: "resolved" }));
        return;
      }
    }

    // RLS blocked it, or the initiator is no longer an admin — auto-decline
    // instead of leaving a silently stuck pending row.
    await supabase.from("moderator_swap_requests").update({ status: "declined", responded_at: new Date().toISOString() }).eq("id", swapId);
    const { error: notifyErr1 } = await supabase.from("notifications").insert({
      recipient_id: swap.from_admin_id, type: "moderator_swap_declined",
      title: "Swap Could Not Be Completed",
      body: `The moderator swap for "${swap.events?.title}" could not be completed.`,
      event_id: swap.event_id, related_id: swapId,
    });
    if (notifyErr1) console.error("Failed to send swap-failed notification:", notifyErr1);
    fireToast(t.alerts.swapFailed, "error");
    await markRead(alert.id);
    setSwapStatus(prev => ({ ...prev, [swapId]: "resolved" }));
  }

  async function declineSwap(alert: AlertItem) {
    const swapId = alert.relatedId;
    if (!swapId) return;
    const { data: swap } = await supabase
      .from("moderator_swap_requests")
      .select("*, events(title)")
      .eq("id", swapId).eq("status", "pending").single();
    if (!swap) {
      fireToast(t.alerts.swapUnavailable, "error");
      await markRead(alert.id);
      setSwapStatus(prev => ({ ...prev, [swapId]: "resolved" }));
      return;
    }
    await supabase.from("moderator_swap_requests").update({ status: "declined", responded_at: new Date().toISOString() }).eq("id", swapId);
    const { error: notifyErr2 } = await supabase.from("notifications").insert({
      recipient_id: swap.from_admin_id, type: "moderator_swap_declined", title: "Swap Declined",
      body: `Your moderator swap request for "${swap.events?.title}" was declined.`,
      event_id: swap.event_id, related_id: swapId,
    });
    if (notifyErr2) console.error("Failed to send swap-declined notification:", notifyErr2);
    fireToast(t.alerts.swapDeclined, "success");
    await markRead(alert.id);
    setSwapStatus(prev => ({ ...prev, [swapId]: "resolved" }));
  }

  const filteredGroups = groupedAll
    .map(g => ({
      ...g,
      items: filter === "unread" ? g.items.filter(a => a.unread) : g.items,
    }))
    .filter(g => g.items.length > 0);

  const isEmpty = filteredGroups.length === 0;

  return (
    <div className="flex flex-col min-h-full bg-[#181818] w-full">
      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onHide={() => setToast(prev => ({ ...prev, visible: false }))} />
      <div className="w-full max-w-[640px] mx-auto flex flex-col pt-8 pb-10 px-4">

        {/* Header */}
        <div className="flex items-center mb-6">
          <h2 className="font-black italic text-white tracking-widest uppercase text-2xl">
            {t.alerts.title}
            {totalUnread > 0 && (
              <span className="ml-2 inline-flex items-center justify-center text-[11px] font-bold bg-[#462ed1] text-white rounded-full w-5 h-5 not-italic tracking-normal align-middle">
                {totalUnread}
              </span>
            )}
          </h2>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(["all", "unread"] as Filter[]).map(f => (
            <FilterPill
              key={f}
              active={filter === f}
              onClick={() => setFilter(f)}
              label={f === "unread" && totalUnread > 0 ? t.alerts.unreadCount(totalUnread) : f === "unread" ? t.alerts.filterUnread : t.alerts.filterAll}
            />
          ))}
        </div>

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-full bg-[#212121] flex items-center justify-center">
              <Bell size={32} className="text-[#462ed1]" />
            </div>
            <h3 className="text-xl font-bold text-white">
              {filter === "unread" ? t.alerts.allCaughtUp : t.alerts.noAlerts}
            </h3>
            <p className="text-[#79828b] text-center text-sm max-w-xs leading-relaxed">
              {filter === "unread" ? t.alerts.emptyUnreadDesc : t.alerts.emptyAllDesc}
            </p>
          </div>
        )}

        {/* Alert groups */}
        <div className="flex flex-col gap-6">
          {filteredGroups.map(({ group, items }, idx) => (
            <div key={group}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[#79828b] text-[11px] font-bold uppercase tracking-widest">
                  {t.alerts[group]}
                </p>
                {idx === 0 && totalUnread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[#462ed1] text-[11px] font-bold hover:text-white transition-colors"
                  >
                    {t.alerts.markAllRead}
                  </button>
                )}
              </div>
              <div className="flex flex-col rounded-2xl bg-[#212121] overflow-hidden">
                {items.map(alert => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    swapStatus={swapStatus}
                    onRead={markRead}
                    onAccept={acceptSwap}
                    onDecline={declineSwap}
                    markReadLabel={t.alerts.markRead}
                    acceptLabel={t.alerts.accept}
                    declineLabel={t.alerts.decline}
                    unavailableLabel={t.alerts.swapUnavailable}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

function AlertRow({
  alert, swapStatus, onRead, onAccept, onDecline, markReadLabel, acceptLabel, declineLabel, unavailableLabel,
}: {
  alert: AlertItem;
  swapStatus: Record<string, string>;
  onRead: (id: string) => void;
  onAccept: (alert: AlertItem) => void;
  onDecline: (alert: AlertItem) => void;
  markReadLabel: string;
  acceptLabel: string;
  declineLabel: string;
  unavailableLabel: string;
}) {
  const cfg = TYPE_CONFIG[alert.type] ?? FALLBACK_CONFIG;
  const Icon = cfg.icon;
  const isSwapRequest = alert.type === "moderator_swap_request";
  const swapState = alert.relatedId ? swapStatus[alert.relatedId] : undefined;

  const inner = (
    <div className={`w-full flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03] ${
      alert.unread ? "bg-[#462ed1]/5" : ""
    }`}>
      {/* Icon */}
      <div className={`mt-0.5 shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${cfg.bg}`}>
        <Icon size={18} className={cfg.color} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold leading-snug ${alert.unread ? "text-white" : "text-white/70"}`}>
          {alert.title}
        </p>
        <p className="text-[#79828b] text-xs mt-0.5 leading-relaxed line-clamp-2">
          {alert.description}
        </p>

        {isSwapRequest ? (
          swapState === "pending" ? (
            <div className="flex gap-2 mt-2">
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); onAccept(alert); }}
                className="px-3 py-1 rounded-full bg-[#22c55e]/15 text-[#22c55e] text-[11px] font-bold hover:bg-[#22c55e]/25 transition-colors"
              >
                {acceptLabel}
              </button>
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); onDecline(alert); }}
                className="px-3 py-1 rounded-full bg-[#ef4444]/15 text-[#ef4444] text-[11px] font-bold hover:bg-[#ef4444]/25 transition-colors"
              >
                {declineLabel}
              </button>
            </div>
          ) : (
            <p className="mt-2 text-[#79828b] text-[11px] italic">{unavailableLabel}</p>
          )
        ) : (
          alert.unread && (
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); onRead(alert.id); }}
              className="mt-2 text-[#462ed1] text-[11px] font-bold hover:text-white transition-colors"
            >
              {markReadLabel}
            </button>
          )
        )}
      </div>

      {/* Right: time + unread dot */}
      <div className="shrink-0 flex flex-col items-end gap-1.5 ml-1">
        <span className="text-[#79828b] text-[10px] font-medium whitespace-nowrap">{alert.time}</span>
        {alert.unread ? (
          <span className="w-2 h-2 rounded-full bg-[#462ed1]" />
        ) : (
          <ChevronRight size={14} className="text-white/20" />
        )}
      </div>
    </div>
  );

  const dividerClass = "relative before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-white/[0.06] first:before:hidden";

  return alert.eventId ? (
    <Link to={`${cfg.linkPrefix}${alert.eventId}`} state={{ hub: "alerts" }} className={`block ${dividerClass}`}>
      {inner}
    </Link>
  ) : (
    <div className={dividerClass}>{inner}</div>
  );
}
