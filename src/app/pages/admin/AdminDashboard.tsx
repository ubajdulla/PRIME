import { useNavigate } from "react-router";
import { CalendarDays, Users, Banknote, Clock, ChevronRight } from "lucide-react";
import { ADMIN_EVENTS, getCategoryStyle } from "../../data/adminData";

export function AdminDashboard() {
  const navigate = useNavigate();

  const upcoming = ADMIN_EVENTS.filter(e => e.status === "upcoming");
  const pendingRequests = ADMIN_EVENTS.reduce((acc, e) => acc + e.requests.length, 0);
  const uniquePlayerIds = new Set(ADMIN_EVENTS.flatMap(e => e.roster.map(p => p.id)));
  const cashCollected = ADMIN_EVENTS
    .filter(e => e.status === "upcoming")
    .reduce((acc, e) => {
      const paidCount = e.roster.filter(p => p.paymentStatus !== "unpaid").length;
      return acc + paidCount * e.price;
    }, 0);

  return (
    <div className="max-w-[900px] mx-auto px-4 py-8">
      <h1 className="font-black italic text-2xl text-white uppercase tracking-widest mb-8">Overview</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-10">
        <StatCard
          label="Upcoming Events"
          value={String(upcoming.length)}
          icon={<CalendarDays size={18} className="text-[#3390ec]" />}
          borderColor="border-[#3390ec]/20"
        />
        <StatCard
          label="Pending Requests"
          value={String(pendingRequests)}
          icon={<Clock size={18} className="text-[#eab308]" />}
          borderColor="border-[#eab308]/20"
        />
        <StatCard
          label="Active Players"
          value={String(uniquePlayerIds.size)}
          icon={<Users size={18} className="text-[#4dcd5e]" />}
          borderColor="border-[#4dcd5e]/20"
        />
        <StatCard
          label="Collected (week)"
          value={cashCollected > 0 ? `${cashCollected.toLocaleString()} CZK` : "—"}
          icon={<Banknote size={18} className="text-[#ccff00]" />}
          borderColor="border-[#ccff00]/20"
        />
      </div>

      {/* Upcoming events */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-black italic text-lg text-white uppercase tracking-widest">Upcoming Events</h2>
        <button
          onClick={() => navigate("/admin/events")}
          className="text-[#3390ec] text-xs font-bold uppercase tracking-widest flex items-center gap-1 hover:text-white transition-colors"
        >
          All <ChevronRight size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {upcoming.map(event => {
          const paid = event.roster.filter(p => p.paymentStatus !== "unpaid").length;
          const unpaid = event.roster.length - paid;

          return (
            <button
              key={event.id}
              onClick={() => navigate(`/admin/events/${event.id}`)}
              className="w-full bg-[#17212b] rounded-xl p-4 border border-white/5 hover:border-[#3390ec]/30 transition-colors text-left active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded inline-block mb-1.5 ${getCategoryStyle(event.category)}`}>
                    {event.category}
                  </span>
                  <div className="font-black text-white text-sm tracking-wide truncate">{event.title}</div>
                  <div className="text-[#79828b] text-xs mt-0.5 truncate">{event.date} • {event.time}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-black text-white text-sm">{event.priceLabel}</div>
                  <div className="text-[#79828b] text-xs">{event.roster.length}/{event.capacity}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#4dcd5e] rounded-full transition-all"
                    style={{ width: `${event.roster.length > 0 ? (paid / event.roster.length) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-[#79828b] shrink-0">
                  {paid}/{event.roster.length} paid
                  {unpaid > 0 && <span className="text-[#ef4444] ml-1">• {unpaid} unpaid</span>}
                </span>
              </div>

              {event.requests.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#eab308]" />
                  <span className="text-[#eab308] text-[11px] font-bold">{event.requests.length} pending request{event.requests.length > 1 ? "s" : ""}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, borderColor }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  borderColor: string;
}) {
  return (
    <div className={`bg-[#17212b] rounded-xl p-4 border ${borderColor}`}>
      <div className="mb-3">{icon}</div>
      <div className="font-black text-white text-xl leading-none">{value}</div>
      <div className="text-[#79828b] text-[11px] mt-1.5 leading-tight">{label}</div>
    </div>
  );
}
