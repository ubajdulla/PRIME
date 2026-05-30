import { useState } from "react";
import { Link } from "react-router";
import {
  Bell,
  CheckCircle2,
  XCircle,
  Users,
  CalendarClock,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { useLang } from "../i18n";

type AlertType = "reminder" | "confirmed" | "approved" | "denied" | "spots" | "cancelled" | "change";

interface AlertItem {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  eventId?: string;
}

const MOCK_ALERTS: { group: string; items: AlertItem[] }[] = [
  {
    group: "Today",
    items: [
      {
        id: "a1",
        type: "reminder",
        title: "PRO-AM INVITATIONAL #12 starts in 2 hours",
        description: "Cyber Arena, Sector 4 · 20:00 – 22:00",
        time: "18:03",
        unread: true,
        eventId: "e1",
      },
      {
        id: "a2",
        type: "spots",
        title: "Spots just opened in MIDNIGHT SCRIM",
        description: "2 spots freed up — join before it fills again.",
        time: "14:31",
        unread: true,
        eventId: "e2",
      },
      {
        id: "a3",
        type: "approved",
        title: "Your request was approved",
        description: "WEEKEND WARRIORS CLASH · Sat, Oct 26",
        time: "11:47",
        unread: false,
        eventId: "e4",
      },
    ],
  },
  {
    group: "Yesterday",
    items: [
      {
        id: "a4",
        type: "confirmed",
        title: "Registration confirmed",
        description: "MORNING GRIND SESSION · Tomorrow, 09:00 – 11:00",
        time: "22:15",
        unread: false,
        eventId: "e3",
      },
      {
        id: "a5",
        type: "change",
        title: "Event time changed",
        description: "CASUAL LOBBY MIX moved from 13:00 to 15:00.",
        time: "09:04",
        unread: false,
        eventId: "e5",
      },
    ],
  },
  {
    group: "Earlier",
    items: [
      {
        id: "a6",
        type: "denied",
        title: "Request declined",
        description: "MIDNIGHT SCRIM is full — your request was not accepted.",
        time: "Oct 22",
        unread: false,
        eventId: "e2",
      },
      {
        id: "a7",
        type: "cancelled",
        title: "Event cancelled",
        description: "FRIDAY NIGHT CLASH has been cancelled by the organiser.",
        time: "Oct 19",
        unread: false,
      },
    ],
  },
];

const TYPE_CONFIG: Record<
  AlertType,
  { icon: React.ComponentType<{ size?: number; className?: string }>; bg: string; color: string }
> = {
  reminder:  { icon: CalendarClock,  bg: "bg-[#3390ec]/15", color: "text-[#3390ec]" },
  confirmed: { icon: CheckCircle2,   bg: "bg-[#22c55e]/15", color: "text-[#22c55e]" },
  approved:  { icon: CheckCircle2,   bg: "bg-[#22c55e]/15", color: "text-[#22c55e]" },
  denied:    { icon: XCircle,        bg: "bg-[#ef4444]/15", color: "text-[#ef4444]" },
  spots:     { icon: Users,          bg: "bg-[#a78bfa]/15", color: "text-[#a78bfa]" },
  cancelled: { icon: XCircle,        bg: "bg-[#ef4444]/15", color: "text-[#ef4444]" },
  change:    { icon: AlertTriangle,  bg: "bg-[#e5a93d]/15", color: "text-[#e5a93d]" },
};

type Filter = "all" | "unread";

export function Alerts() {
  const { t } = useLang();
  const [filter, setFilter] = useState<Filter>("all");
  const [alerts, setAlerts] = useState(MOCK_ALERTS);

  const totalUnread = alerts.flatMap(g => g.items).filter(a => a.unread).length;

  function markAllRead() {
    setAlerts(prev =>
      prev.map(g => ({
        ...g,
        items: g.items.map(a => ({ ...a, unread: false })),
      }))
    );
  }

  function markRead(id: string) {
    setAlerts(prev =>
      prev.map(g => ({
        ...g,
        items: g.items.map(a => (a.id === id ? { ...a, unread: false } : a)),
      }))
    );
  }

  const filteredGroups = alerts
    .map(g => ({
      ...g,
      items: filter === "unread" ? g.items.filter(a => a.unread) : g.items,
    }))
    .filter(g => g.items.length > 0);

  const isEmpty = filteredGroups.length === 0;

  return (
    <div className="flex flex-col min-h-full bg-[#0e1621] w-full">
      <div className="w-full max-w-[640px] mx-auto flex flex-col pt-8 pb-10 px-4">

        {/* Header */}
        <div className="flex items-center mb-6">
          <h2 className="font-black italic text-white tracking-widest uppercase text-2xl">
            {t.alerts.title}
            {totalUnread > 0 && (
              <span className="ml-2 inline-flex items-center justify-center text-[11px] font-bold bg-[#3390ec] text-white rounded-full w-5 h-5 not-italic tracking-normal align-middle">
                {totalUnread}
              </span>
            )}
          </h2>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(["all", "unread"] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full font-bold text-[11px] uppercase tracking-wider transition-all border ${
                filter === f
                  ? "bg-[#3390ec] text-white border-[#3390ec]"
                  : "bg-[#222f3e] text-[#79828b] border-white/5 hover:border-[#3390ec]/30"
              }`}
            >
              {f === "unread" && totalUnread > 0 ? t.alerts.unreadCount(totalUnread) : f === "unread" ? t.alerts.filterUnread : t.alerts.filterAll}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-full bg-[#17212b] flex items-center justify-center">
              <Bell size={32} className="text-[#3390ec]" />
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
                  {group}
                </p>
                {idx === 0 && totalUnread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[#3390ec] text-[11px] font-bold hover:text-white transition-colors"
                  >
                    {t.alerts.markAllRead}
                  </button>
                )}
              </div>
              <div className="flex flex-col rounded-2xl bg-[#17212b] overflow-hidden divide-y divide-white/5">
                {items.map(alert => (
                  <AlertRow key={alert.id} alert={alert} onRead={markRead} markReadLabel={t.alerts.markRead} />
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

function AlertRow({ alert, onRead, markReadLabel }: { alert: AlertItem; onRead: (id: string) => void; markReadLabel: string }) {
  const cfg = TYPE_CONFIG[alert.type];
  const Icon = cfg.icon;

  const inner = (
    <div className={`w-full flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03] ${
      alert.unread ? "bg-[#3390ec]/5" : ""
    }`}>
      {/* Icon */}
      <div className={`mt-0.5 shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${cfg.bg}`}>
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
        {alert.unread && (
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); onRead(alert.id); }}
            className="mt-2 text-[#3390ec] text-[11px] font-bold hover:text-white transition-colors"
          >
            {markReadLabel}
          </button>
        )}
      </div>

      {/* Right: time + unread dot */}
      <div className="shrink-0 flex flex-col items-end gap-1.5 ml-1">
        <span className="text-[#79828b] text-[10px] font-medium whitespace-nowrap">{alert.time}</span>
        {alert.unread ? (
          <span className="w-2 h-2 rounded-full bg-[#3390ec]" />
        ) : (
          <ChevronRight size={14} className="text-white/20" />
        )}
      </div>
    </div>
  );

  return alert.eventId ? (
    <Link to={`/events/${alert.eventId}`} className="block">
      {inner}
    </Link>
  ) : (
    <div>{inner}</div>
  );
}
