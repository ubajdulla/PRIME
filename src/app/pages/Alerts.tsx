import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Link } from "react-router";
import {
  Bell,
  Mail,
  MailOpen,
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
  Check,
  Trash2,
} from "lucide-react";
import { useLang } from "../i18n";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { Toast } from "../components/ui/Toast";
import { FilterPill, FilterPillTrack } from "../components/ui/FilterPill";
import { ConfirmModal, type ModalOrigin } from "../components/ui/Modal";
import { useWaterRipple, RippleLayer } from "../components/ui/useWaterRipple";
import { encodeNotification, renderNotification } from "../lib/notificationText";

const RETENTION_DAYS = 14;

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
  { icon: React.ComponentType<{ size?: number; className?: string }>; bg: string; color: string; stripe: string; linkPrefix: "/admin/events/" | "/events/" }
> = {
  moderator_swap_request:   { icon: ArrowLeftRight, bg: "bg-[var(--brand)]/15", color: "text-[var(--brand)]", stripe: "var(--brand)", linkPrefix: "/admin/events/" },
  moderator_swap_accepted:  { icon: CheckCircle2,   bg: "bg-[#22c55e]/15", color: "text-[#22c55e]", stripe: "#22c55e", linkPrefix: "/admin/events/" },
  moderator_swap_declined:  { icon: XCircle,        bg: "bg-[#ef4444]/15", color: "text-[#ef4444]", stripe: "#ef4444", linkPrefix: "/admin/events/" },
  event_canceled:           { icon: Ban,            bg: "bg-[#ef4444]/15", color: "text-[#ef4444]", stripe: "#ef4444", linkPrefix: "/events/" },
  event_reminder:           { icon: Clock,          bg: "bg-[#3897f0]/15", color: "text-[#3897f0]", stripe: "#3897f0", linkPrefix: "/events/" },
  event_updated:            { icon: CalendarClock,  bg: "bg-[#eab308]/15", color: "text-[#eab308]", stripe: "#eab308", linkPrefix: "/events/" },
  account_suspended:        { icon: AlertTriangle,  bg: "bg-[#eab308]/15", color: "text-[#eab308]", stripe: "#eab308", linkPrefix: "/events/" },
  account_banned:           { icon: OctagonX,       bg: "bg-[#ef4444]/15", color: "text-[#ef4444]", stripe: "#ef4444", linkPrefix: "/events/" },
  capacity_increased:       { icon: UserPlus,       bg: "bg-[#22c55e]/15", color: "text-[#22c55e]", stripe: "#22c55e", linkPrefix: "/admin/events/" },
};

// Fallback for notification rows whose type has since been retired (e.g. old
// waitlist_promoted rows from before that type was removed) - render them
// generically instead of crashing.
const FALLBACK_CONFIG = { icon: Bell, bg: "bg-[var(--ink)]/10", color: "text-[var(--ink)]/70", stripe: "#79828b", linkPrefix: "/events/" } as const;

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
  const [filter, setFilter] = useState<Filter>("unread");
  // filter drives the pill highlight/indicator and updates synchronously so
  // the slide animation starts immediately on click. contentFilter drives
  // which items render and is set inside startTransition so the heavier list
  // re-render never blocks the same frame as the indicator animation (same
  // split as Home's / AdminPlayers' filter bars).
  const [contentFilter, setContentFilter] = useState<Filter>("unread");
  const [, startTransition] = useTransition();
  const handleFilterClick = (f: Filter) => {
    setFilter(f);
    startTransition(() => setContentFilter(f));
  };
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [swapStatus, setSwapStatus] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error"; visible: boolean }>({ message: "", variant: "success", visible: false });
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteOrigin, setDeleteOrigin] = useState<ModalOrigin>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteBtnRef = useRef<HTMLButtonElement>(null);

  function fireToast(message: string, variant: "success" | "error") {
    setToast({ message, variant, visible: true });
  }

  async function loadNotifications() {
    if (!authUser) return;
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    // Purge anything past the retention window before reading - today/yesterday
    // are always within it, so this only ever touches the "earlier" bucket.
    await supabase.from("notifications").delete().eq("recipient_id", authUser.id).lt("created_at", cutoff);
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
    const { title, description } = renderNotification(r.body, r.title, t);
    return {
      id: r.id,
      type: r.type,
      title,
      description,
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
  }, [rows, t, locale]);

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

  function toggleSelectMode() {
    setSelectMode(prev => !prev);
    setSelectedIds(new Set());
  }
  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }
  // Tapping anywhere that isn't a row or the select toggle exits select mode
  // - it's a transient mode, not a sticky one. Skipped while the delete
  // confirm is open so canceling it doesn't also blow away the selection.
  // Deliberately NOT tied to scroll: on mobile, scrolling to reach more rows
  // is core to multi-select, and a scroll-triggered exit wiped the
  // selection before it could be used.
  function handleContainerClick(e: React.MouseEvent) {
    if (!selectMode || showDeleteConfirm) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-select-card], [data-select-toggle], [data-select-fab]")) return;
    exitSelectMode();
  }

  function toggleSelected(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function openDeleteConfirm() {
    const rect = deleteBtnRef.current?.getBoundingClientRect();
    setDeleteOrigin(rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null);
    setShowDeleteConfirm(true);
  }

  async function confirmDeleteSelected() {
    const ids = [...selectedIds];
    setRows(prev => prev.filter(r => !selectedIds.has(r.id)));
    setShowDeleteConfirm(false);
    setSelectMode(false);
    setSelectedIds(new Set());
    if (ids.length) {
      await supabase.from("notifications").delete().in("id", ids);
      fireToast(t.alerts.deletedMany(ids.length), "success");
    }
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
            body: encodeNotification({ k: "swap_accepted", role: "initiator", eventTitle: swap.events?.title ?? "" }), event_id: swap.event_id, related_id: swapId },
          { recipient_id: swap.to_admin_id, type: "moderator_swap_accepted", title: "Swap Successful",
            body: encodeNotification({ k: "swap_accepted", role: "recipient", eventTitle: swap.events?.title ?? "" }), event_id: swap.event_id, related_id: swapId },
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
      body: encodeNotification({ k: "swap_failed", eventTitle: swap.events?.title ?? "" }),
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
      body: encodeNotification({ k: "swap_declined", eventTitle: swap.events?.title ?? "" }),
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
      items: contentFilter === "unread" ? g.items.filter(a => a.unread) : g.items,
    }))
    .filter(g => g.items.length > 0);

  const isEmpty = filteredGroups.length === 0;

  return (
    <div className="flex flex-col min-h-full bg-[var(--surface-0)] w-full" onClick={handleContainerClick}>
      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onHide={() => setToast(prev => ({ ...prev, visible: false }))} />
      <div className="w-full max-w-[640px] mx-auto flex flex-col pt-8 pb-10 px-4">

        {/* Header */}
        <h2 className="font-black italic text-[var(--ink)] tracking-widest uppercase text-2xl mb-6">
          {t.alerts.title}
          {totalUnread > 0 && (
            <span className="ml-2 inline-flex items-center justify-center text-[11px] font-bold bg-[var(--brand)] text-white rounded-full w-5 h-5 not-italic tracking-normal align-middle">
              {totalUnread}
            </span>
          )}
        </h2>

        {/* Filter bar */}
        <div className="flex items-center justify-between gap-3 mb-8">
          <div className="flex gap-1 bg-[var(--surface-1)] rounded-full p-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
            <FilterPillTrack activeKey={filter}>
              {(["all", "unread"] as Filter[]).map(f => (
                <FilterPill
                  key={f}
                  pillKey={f}
                  active={filter === f}
                  onClick={() => handleFilterClick(f)}
                  label={f === "unread" && totalUnread > 0 ? t.alerts.unreadCount(totalUnread) : f === "unread" ? t.alerts.filterUnread : t.alerts.filterAll}
                />
              ))}
            </FilterPillTrack>
          </div>
          <MarkAllReadButton totalUnread={totalUnread} onMarkAll={markAllRead} label={t.alerts.markAllRead} />
        </div>

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--surface-1)] flex items-center justify-center">
              <Bell size={32} className="text-[var(--brand)]" />
            </div>
            <h3 className="text-xl font-bold text-[var(--ink)]">
              {contentFilter === "unread" ? t.alerts.allCaughtUp : t.alerts.noAlerts}
            </h3>
            <p className="text-[#79828b] text-center text-sm max-w-xs leading-relaxed">
              {contentFilter === "unread" ? t.alerts.emptyUnreadDesc : t.alerts.emptyAllDesc}
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
                {idx === 0 && (
                  <SelectModeToggle
                    active={selectMode}
                    onClick={toggleSelectMode}
                    selectLabel={t.alerts.select}
                    cancelLabel={t.alerts.cancelSelect}
                  />
                )}
              </div>
              <div className="flex flex-col rounded-2xl bg-[var(--surface-1)] overflow-hidden">
                {items.map(alert => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    swapStatus={swapStatus}
                    onRead={markRead}
                    onAccept={acceptSwap}
                    onDecline={declineSwap}
                    acceptLabel={t.alerts.accept}
                    declineLabel={t.alerts.decline}
                    unavailableLabel={t.alerts.swapUnavailable}
                    selectMode={selectMode}
                    selected={selectedIds.has(alert.id)}
                    onToggleSelect={toggleSelected}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>

      {selectMode && selectedIds.size > 0 && (
        <button
          ref={deleteBtnRef}
          type="button"
          data-select-fab=""
          aria-label={t.alerts.deleteLabel}
          onClick={openDeleteConfirm}
          className="fixed bottom-24 sm:bottom-6 right-6 z-[60] w-12 h-12 rounded-full bg-[#ef4444] flex items-center justify-center"
        >
          <Trash2 size={19} className="text-white" />
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--surface-0)] border-2 border-[var(--surface-0)] flex items-center justify-center text-[10px] font-bold text-[var(--ink)]">
            {selectedIds.size}
          </span>
        </button>
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          origin={deleteOrigin}
          icon={<Trash2 size={18} className="text-[#ef4444]" />}
          iconBg="bg-[#ef4444]/10 border-[#ef4444]/30"
          title={t.alerts.deleteConfirmTitle(selectedIds.size)}
          sub={t.alerts.deleteConfirmSub}
          cancelLabel={t.common.cancel}
          onCancel={() => setShowDeleteConfirm(false)}
          confirmLabel={t.alerts.deleteLabel}
          confirmCls="bg-[#dc2626] text-white"
          onConfirm={confirmDeleteSelected}
        />
      )}
    </div>
  );
}

function AlertRow({
  alert, swapStatus, onRead, onAccept, onDecline, acceptLabel, declineLabel, unavailableLabel,
  selectMode, selected, onToggleSelect,
}: {
  alert: AlertItem;
  swapStatus: Record<string, string>;
  onRead: (id: string) => void;
  onAccept: (alert: AlertItem) => void;
  onDecline: (alert: AlertItem) => void;
  acceptLabel: string;
  declineLabel: string;
  unavailableLabel: string;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const cfg = TYPE_CONFIG[alert.type] ?? FALLBACK_CONFIG;
  const Icon = cfg.icon;
  const isSwapRequest = alert.type === "moderator_swap_request";
  const swapState = alert.relatedId ? swapStatus[alert.relatedId] : undefined;

  const isPendingSwap = isSwapRequest && swapState === "pending";

  const inner = (
    <div
      className="w-full flex items-start gap-3 pl-[13px] pr-4 py-3.5 border-l-[3px] transition-colors hover:bg-[var(--surface-hover)]"
      style={{ borderLeftColor: alert.unread ? cfg.stripe : "transparent" }}
    >
      {/* Icon */}
      <div className={`mt-0.5 shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${cfg.bg}`}>
        <Icon size={18} className={cfg.color} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold leading-snug ${alert.unread ? "text-[var(--ink)]" : "text-[var(--ink)]/70"}`}>
          {alert.title}
        </p>
        <p className="text-[#79828b] text-xs mt-0.5 leading-relaxed line-clamp-2">
          {alert.description}
        </p>

        {!selectMode && isSwapRequest && !isPendingSwap && (
          <p className="mt-2 text-[#79828b] text-[11px] italic">{unavailableLabel}</p>
        )}
      </div>

      {/* Right: crossfades between the selection circle and time+actions -
          both stay mounted, stacked in the same grid cell, sliding past
          each other (not just fading) for a livelier hand-off. */}
      <div className="grid items-center ml-1 overflow-hidden">
        <div
          className={`col-start-1 row-start-1 flex items-center transition-all duration-[250ms] ease-out ${
            selectMode ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2 pointer-events-none"
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              selected ? "bg-[var(--brand)] border-[var(--brand)]" : "border-[var(--ink)]/20"
            }`}
          >
            {selected && <Check size={12} className="text-white" strokeWidth={3} />}
          </span>
        </div>
        <div
          className={`col-start-1 row-start-1 flex flex-col items-end gap-1.5 transition-all duration-[250ms] ease-out ${
            selectMode ? "opacity-0 -translate-x-2 pointer-events-none" : "opacity-100 translate-x-0"
          }`}
        >
          <span className="text-[#79828b] text-[10px] font-medium whitespace-nowrap">{alert.time}</span>
          {isPendingSwap ? (
            <div className="flex gap-2.5">
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); onAccept(alert); }}
                tabIndex={selectMode ? -1 : 0}
                className="text-[#22c55e] text-[11px] font-bold hover:text-[var(--ink)] transition-colors"
              >
                {acceptLabel}
              </button>
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); onDecline(alert); }}
                tabIndex={selectMode ? -1 : 0}
                className="text-[#79828b] text-[11px] font-bold hover:text-[var(--ink)] transition-colors"
              >
                {declineLabel}
              </button>
            </div>
          ) : (
            !alert.unread && alert.eventId && <ChevronRight size={14} className="text-[var(--ink)]/20" />
          )}
        </div>
      </div>
    </div>
  );

  const dividerClass = "relative before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-[var(--ink)]/[0.06] first:before:hidden";

  // Same wrapper element across select-mode toggles (branching only on
  // eventId, not selectMode) so the crossfades above actually animate
  // instead of getting reset by a remount.
  function handleRowClick(e: React.MouseEvent) {
    if (selectMode) {
      e.preventDefault();
      onToggleSelect(alert.id);
      return;
    }
    if (alert.unread) onRead(alert.id);
  }

  return alert.eventId ? (
    <Link to={`${cfg.linkPrefix}${alert.eventId}`} state={{ hub: "alerts" }} onClick={handleRowClick} data-select-card="" className={`block ${dividerClass}`}>
      {inner}
    </Link>
  ) : (
    <div role="button" onClick={handleRowClick} data-select-card="" className={`block w-full text-left cursor-pointer ${dividerClass}`}>
      {inner}
    </div>
  );
}

// Same sweep-fill mechanic as TapConfirmButton/ConfirmDropdownItem/the
// EventDetail CTA - a solid color layer slides in from the right - instead
// of a plain text crossfade, which read as too flat for entering select mode.
function SelectModeToggle({
  active, onClick, selectLabel, cancelLabel,
}: {
  active: boolean;
  onClick: () => void;
  selectLabel: string;
  cancelLabel: string;
}) {
  const ripple = useWaterRipple();
  return (
    <button
      type="button"
      data-select-toggle=""
      onClick={onClick}
      onPointerDown={ripple.onPointerDown}
      className={`relative overflow-hidden shrink-0 h-7 px-3.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-colors ${
        active ? "" : "bg-[var(--ink)]/5 text-[var(--ink)]/70 hover:bg-[var(--ink)]/10"
      }`}
    >
      <span
        aria-hidden
        className={`absolute inset-0 bg-[var(--brand)] transition-transform duration-300 ease-out ${active ? "translate-x-0" : "translate-x-full"}`}
      />
      <span className={`relative z-10 transition-colors duration-200 ${active ? "text-white" : ""}`}>
        {active ? cancelLabel : selectLabel}
      </span>
      <RippleLayer ripples={ripple.ripples} />
    </button>
  );
}

function MarkAllReadButton({ totalUnread, onMarkAll, label }: { totalUnread: number; onMarkAll: () => void; label: string }) {
  const [opening, setOpening] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const ripple = useWaterRipple();

  function handleClick() {
    if (totalUnread === 0 || opening) return;
    setOpening(true);
    setConfirmed(true);
    window.setTimeout(() => onMarkAll(), 220);
    window.setTimeout(() => setOpening(false), 900);
    window.setTimeout(() => setConfirmed(false), 1300);
  }

  const dotVisible = totalUnread > 0 && !confirmed;

  return (
    <button
      type="button"
      aria-label={label}
      disabled={totalUnread === 0}
      onClick={handleClick}
      onPointerDown={ripple.onPointerDown}
      className="group relative overflow-hidden shrink-0 w-9 h-9 rounded-full bg-[var(--surface-1)] flex items-center justify-center transition-opacity disabled:opacity-30"
    >
      <span className="relative w-4 h-4 block">
        <Mail
          size={16}
          className={`absolute inset-0 text-[var(--brand)] transition-all duration-300 ease-in-out group-hover:opacity-0 group-hover:-translate-y-1 ${
            opening ? "opacity-0 -translate-y-1" : "opacity-100 translate-y-0"
          }`}
        />
        <MailOpen
          size={16}
          className={`absolute inset-0 text-[var(--brand)] transition-all duration-300 ease-in-out group-hover:opacity-100 group-hover:translate-y-0 ${
            opening ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
          }`}
        />
        {confirmed && (
          <Check size={16} strokeWidth={3} className="absolute inset-0 text-[#22c55e] animate-check-flash" />
        )}
        <span
          className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--brand)] transition-all duration-300 ease-in-out ${
            dotVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
          }`}
        />
      </span>
      <RippleLayer ripples={ripple.ripples} />
    </button>
  );
}
