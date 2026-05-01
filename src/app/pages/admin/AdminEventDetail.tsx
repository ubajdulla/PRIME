import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ChevronLeft, ChevronUp, ChevronDown, MoreVertical,
  CheckCircle2, CreditCard, Banknote, User, ArrowDownToLine,
  Trash2, Send, CheckCheck, X, Pencil,
} from "lucide-react";
import {
  ADMIN_EVENTS, getCategoryStyle,
  type PaymentStatus, type Player,
} from "../../data/adminData";
import { PlayerProfileModal } from "../../components/PlayerProfileModal";


export function AdminEventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const event = ADMIN_EVENTS.find(e => e.id === id);

  const [roster,   setRoster]   = useState<RosterPlayer[]>(event?.roster   ?? []);
  const [waitlist, setWaitlist] = useState<Player[]>      (event?.waitlist  ?? []);
  const [requests, setRequests] = useState<Player[]>      (event?.requests  ?? []);

  // UI state
  const [openMenu,         setOpenMenu]         = useState<string | null>(null);
  const [confirmRemoveId,  setConfirmRemoveId]  = useState<string | null>(null);
  const [profilePlayer,    setProfilePlayer]    = useState<Player | null>(null);
  const [isPublished,      setIsPublished]      = useState(event?.status !== "draft");

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-[#79828b]">
        <p className="font-bold">Event not found</p>
        <button onClick={() => navigate("/admin/events")} className="text-[#3390ec] text-sm font-bold">
          ← Back to events
        </button>
      </div>
    );
  }

  // ── Actions ────────────────────────────────────────────────
  function togglePayment(playerId: string) {
    setRoster(prev => prev.map(p => {
      if (p.id !== playerId || p.paymentStatus === "online") return p;
      return { ...p, paymentStatus: p.paymentStatus === "unpaid" ? "cash" : "unpaid" };
    }));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setRoster(prev => { const a = [...prev]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; return a; });
  }
  function moveDown(idx: number) {
    if (idx === roster.length - 1) return;
    setRoster(prev => { const a = [...prev]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; return a; });
  }

  function moveToWaitlist(playerId: string) {
    const player = roster.find(p => p.id === playerId);
    if (!player) return;
    setRoster(prev => prev.filter(p => p.id !== playerId));
    setWaitlist(prev => [...prev, player]);
    setOpenMenu(null);
  }

  function removeFromEvent(playerId: string) {
    setRoster(prev => prev.filter(p => p.id !== playerId));
    setConfirmRemoveId(null);
    setOpenMenu(null);
  }

  function addToRoster(playerId: string) {
    if (roster.length >= event.capacity) return;
    const player = waitlist.find(p => p.id === playerId);
    if (!player) return;
    setRoster(prev => [...prev, { ...player, paymentStatus: "unpaid" }]);
    setWaitlist(prev => prev.filter(p => p.id !== playerId));
  }

  function moveBackToWaitlist(playerId: string) {
    const player = waitlist.find(p => p.id === playerId);
    if (!player) return;
    setWaitlist(prev => prev.filter(p => p.id !== playerId));
    // put back at end of waitlist (nothing in roster, just remove from waitlist)
    // actually this is "remove from waitlist" — different from roster removal
    setWaitlist(prev => prev.filter(p => p.id !== playerId));
  }

  function approveRequest(playerId: string) {
    const player = requests.find(p => p.id === playerId);
    if (!player) return;
    if (roster.length < event.capacity) {
      setRoster(prev => [...prev, { ...player, paymentStatus: "unpaid" }]);
    } else {
      setWaitlist(prev => [...prev, player]);
    }
    setRequests(prev => prev.filter(p => p.id !== playerId));
  }

  function denyRequest(playerId: string) {
    setRequests(prev => prev.filter(p => p.id !== playerId));
  }

  function openProfile(player: Player) {
    setProfilePlayer(player);
    setOpenMenu(null);
  }

  function toggleMenu(playerId: string) {
    setOpenMenu(prev => prev === playerId ? null : playerId);
    setConfirmRemoveId(null);
  }

  // ── Payment stats ──────────────────────────────────────────
  const cashPaid   = roster.filter(p => p.paymentStatus === "cash").length;
  const onlinePaid = roster.filter(p => p.paymentStatus === "online").length;
  const unpaid     = roster.filter(p => p.paymentStatus === "unpaid").length;
  const collectedCZK = (cashPaid + onlinePaid) * event.price;

  return (
    <div className="max-w-[700px] mx-auto px-4 py-6 pb-16">

      {profilePlayer && (
        <PlayerProfileModal player={profilePlayer} onClose={() => setProfilePlayer(null)} />
      )}

      {/* Back + edit + publish */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate("/admin/events")}
          className="flex items-center gap-1.5 text-[#79828b] hover:text-white transition-colors text-sm font-bold"
        >
          <ChevronLeft size={18} /> Events
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/admin/events/create?edit=${event.id}`)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-[#79828b] hover:text-white hover:bg-white/10 transition-colors"
            title="Edit event"
          >
            <Pencil size={14} />
          </button>
          {!isPublished && (
            <button
              onClick={() => setIsPublished(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#ccff00] text-black text-[11px] font-black uppercase tracking-widest rounded-xl active:scale-95 transition-transform"
            >
              <Send size={13} /> Publish Event
            </button>
          )}
          {isPublished && event.status === "draft" && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4dcd5e]/10 text-[#4dcd5e] text-[11px] font-black uppercase tracking-widest rounded-xl border border-[#4dcd5e]/20">
              <CheckCircle2 size={13} /> Published
            </span>
          )}
        </div>
      </div>

      {/* Event header */}
      <div className="mb-2">
        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded inline-block mb-2 ${getCategoryStyle(event.category)}`}>
          {event.category}
        </span>
        <h1 className="font-black italic text-xl text-white uppercase tracking-wide leading-tight">{event.title}</h1>
        <p className="text-[#79828b] text-xs mt-1">
          {event.date} • {event.time} • {event.location}
          <span className="text-white font-bold"> • {event.priceLabel}</span>
        </p>
      </div>

      {/* Payment summary */}
      {event.price > 0 && (
        <div className="bg-[#17212b] rounded-xl p-4 border border-white/5 mt-5 mb-7">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#79828b] text-[11px] font-black uppercase tracking-widest">Payments</span>
            <span className="text-white font-black text-sm">
              {collectedCZK.toLocaleString()} / {(roster.length * event.price).toLocaleString()} CZK
            </span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3 flex">
            <div className="h-full bg-[#4dcd5e] transition-all" style={{ width: roster.length > 0 ? `${(cashPaid / roster.length) * 100}%` : "0%" }} />
            <div className="h-full bg-[#3390ec] transition-all" style={{ width: roster.length > 0 ? `${(onlinePaid / roster.length) * 100}%` : "0%" }} />
          </div>
          <div className="flex gap-4 flex-wrap">
            <LegendDot color="#4dcd5e" label={`${cashPaid} cash`} />
            <LegendDot color="#3390ec" label={`${onlinePaid} online`} />
            <LegendDot color="#ffffff30" label={`${unpaid} unpaid`} textColor="text-[#79828b]" />
          </div>
        </div>
      )}

      {/* ── ROSTER ──────────────────────────────────────────── */}
      <SectionHeader
        label="Roster"
        count={`${roster.length}/${event.capacity}`}
        full={roster.length >= event.capacity}
      />

      <div className="flex flex-col gap-2 mb-8">
        {roster.length === 0 && (
          <p className="text-[#79828b] text-sm text-center py-6">No players on roster yet</p>
        )}
        {roster.map((player, idx) => (
          <div key={player.id} className="flex flex-col">
            {/* Main row */}
            <div className={`flex items-center gap-2 p-3 bg-[#17212b] border transition-colors ${
              openMenu === player.id ? "rounded-t-xl border-b-0 border-white/10" : "rounded-xl border-white/5"
            }`}>
              <span className="text-[#79828b] text-[11px] font-black w-5 text-right shrink-0">{idx + 1}</span>
              <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full border-2 border-[#0e1621] object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-sm truncate">{player.name}</div>
                <div className="text-[#79828b] text-[11px] uppercase tracking-wider">{player.position}</div>
              </div>
              {/* Payment toggle */}
              {event.price > 0 && (
                <PaymentToggle status={player.paymentStatus} onToggle={() => togglePayment(player.id)} />
              )}
              {/* Up/Down */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className={`w-6 h-5 flex items-center justify-center rounded transition-colors ${idx === 0 ? "text-white/10 cursor-not-allowed" : "text-[#79828b] hover:text-white hover:bg-white/5"}`}
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  onClick={() => moveDown(idx)}
                  disabled={idx === roster.length - 1}
                  className={`w-6 h-5 flex items-center justify-center rounded transition-colors ${idx === roster.length - 1 ? "text-white/10 cursor-not-allowed" : "text-[#79828b] hover:text-white hover:bg-white/5"}`}
                >
                  <ChevronDown size={13} />
                </button>
              </div>
              {/* Menu toggle */}
              <button
                onClick={() => toggleMenu(player.id)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg shrink-0 transition-colors ${openMenu === player.id ? "bg-white/10 text-white" : "text-[#79828b] hover:bg-white/5 hover:text-white"}`}
              >
                <MoreVertical size={15} />
              </button>
            </div>

            {/* Inline action menu */}
            {openMenu === player.id && (
              <div className="bg-[#222f3e] rounded-b-xl border border-t-0 border-white/10 overflow-hidden">
                {confirmRemoveId === player.id ? (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="text-white text-xs font-bold flex-1">Remove {player.name}?</span>
                    <button
                      onClick={() => removeFromEvent(player.id)}
                      className="px-3 py-1.5 bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] text-[11px] font-black uppercase tracking-wider rounded-lg active:scale-95 transition-transform"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmRemoveId(null)}
                      className="px-3 py-1.5 bg-white/5 text-[#79828b] text-[11px] font-black uppercase tracking-wider rounded-lg hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <MenuAction icon={<User size={14} />} label="View Profile" onClick={() => openProfile(player)} />
                    <MenuAction icon={<ArrowDownToLine size={14} />} label="Move to Waitlist" onClick={() => moveToWaitlist(player.id)} />
                    <MenuAction icon={<Trash2 size={14} />} label="Remove from Event" danger onClick={() => setConfirmRemoveId(player.id)} />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── WAITLIST ─────────────────────────────────────────── */}
      <SectionHeader label="Waitlist" count={String(waitlist.length)} />

      <div className="flex flex-col gap-2 mb-8">
        {waitlist.length === 0 && (
          <p className="text-[#79828b] text-sm text-center py-6">No players on waitlist</p>
        )}
        {waitlist.map((player, idx) => (
          <div key={player.id} className="flex items-center gap-3 p-3 bg-[#17212b] rounded-xl border border-white/5">
            <span className="text-[#eab308] text-[11px] font-black w-5 text-right shrink-0">#{idx + 1}</span>
            <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full border-2 border-[#0e1621] object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white text-sm truncate">{player.name}</div>
              <div className="text-[#79828b] text-[11px] uppercase tracking-wider">{player.position}</div>
            </div>
            <button
              onClick={() => openProfile(player)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#79828b] hover:text-white hover:bg-white/5 transition-colors shrink-0"
              title="View Profile"
            >
              <User size={15} />
            </button>
            <button
              onClick={() => addToRoster(player.id)}
              disabled={roster.length >= event.capacity}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors shrink-0 ${
                roster.length >= event.capacity
                  ? "bg-white/5 text-[#79828b] cursor-not-allowed"
                  : "bg-[#3390ec]/10 text-[#3390ec] border border-[#3390ec]/30 hover:bg-[#3390ec]/20 active:scale-95"
              }`}
            >
              <CheckCheck size={13} />
              {roster.length >= event.capacity ? "Full" : "Add"}
            </button>
          </div>
        ))}
      </div>

      {/* ── REQUESTS (request-only events) ────────────────────── */}
      {event.joinType === "request" && (
        <>
          <SectionHeader
            label="Pending Requests"
            count={String(requests.length)}
            accent={requests.length > 0 ? "yellow" : undefined}
          />
          <div className="flex flex-col gap-2">
            {requests.length === 0 && (
              <p className="text-[#79828b] text-sm text-center py-6">No pending requests</p>
            )}
            {requests.map(player => (
              <div key={player.id} className="flex items-center gap-3 p-3 bg-[#17212b] rounded-xl border border-[#eab308]/15">
                <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full border-2 border-[#0e1621] object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white text-sm truncate">{player.name}</div>
                  <div className="text-[#79828b] text-[11px] uppercase tracking-wider">{player.position} · {player.skillLevel}</div>
                </div>
                <button onClick={() => openProfile(player)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#79828b] hover:text-white hover:bg-white/5 transition-colors shrink-0">
                  <User size={15} />
                </button>
                <button onClick={() => approveRequest(player.id)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#4dcd5e]/10 border border-[#4dcd5e]/30 text-[#4dcd5e] hover:bg-[#4dcd5e]/20 active:scale-95 transition-all shrink-0">
                  <CheckCircle2 size={17} />
                </button>
                <button onClick={() => denyRequest(player.id)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/20 active:scale-95 transition-all shrink-0">
                  <X size={17} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function SectionHeader({ label, count, full, accent }: { label: string; count: string; full?: boolean; accent?: "yellow" }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-black italic text-base text-white uppercase tracking-widest">{label}</h2>
      <span className={`text-[11px] font-black px-2 py-0.5 rounded ${
        full ? "bg-[#ef4444]/10 text-[#ef4444]" :
        accent === "yellow" ? "bg-[#eab308]/10 text-[#eab308]" :
        "bg-white/5 text-[#79828b]"
      }`}>
        {count}
      </span>
    </div>
  );
}

function MenuAction({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-bold text-left border-b border-white/5 last:border-0 transition-colors ${
        danger ? "text-[#ef4444] hover:bg-[#ef4444]/5" : "text-white hover:bg-white/5"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function PaymentToggle({ status, onToggle }: { status: PaymentStatus; onToggle: () => void }) {
  if (status === "online") {
    return (
      <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#3390ec]/10 border border-[#3390ec]/20 shrink-0">
        <CreditCard size={12} className="text-[#3390ec]" />
        <span className="text-[#3390ec] text-[10px] font-black uppercase tracking-wider">Online</span>
      </div>
    );
  }
  if (status === "cash") {
    return (
      <button onClick={onToggle} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#4dcd5e]/10 border border-[#4dcd5e]/30 active:scale-95 transition-transform shrink-0" title="Tap to unmark">
        <CheckCircle2 size={12} className="text-[#4dcd5e]" />
        <span className="text-[#4dcd5e] text-[10px] font-black uppercase tracking-wider">Cash</span>
      </button>
    );
  }
  return (
    <button onClick={onToggle} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-[#4dcd5e]/40 hover:bg-[#4dcd5e]/5 active:scale-95 transition-all shrink-0" title="Tap to mark cash paid">
      <Banknote size={12} className="text-[#79828b]" />
      <span className="text-[#79828b] text-[10px] font-black uppercase tracking-wider">Unpaid</span>
    </button>
  );
}

function LegendDot({ color, label, textColor }: { color: string; label: string; textColor?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
      <span className={`text-[11px] font-bold ${textColor ?? "text-white"}`}>{label}</span>
    </div>
  );
}

