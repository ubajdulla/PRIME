import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ChevronUp, ChevronDown, MoreVertical,
  CheckCircle2, CreditCard, Banknote, User, ArrowDownToLine,
  Trash2, Send, CheckCheck, AlertTriangle, Ban, Share2,
  MapPin, Calendar, Clock, Ticket, Pencil, RotateCcw, ArrowLeftRight,
} from "lucide-react";
import { BackBar } from "../../components/ui/BackBar";
import {
  ADMIN_EVENTS, getCategoryStyle,
  type PaymentStatus, type Player, type RosterPlayer,
} from "../../data/adminData";
import { navDir } from "../../lib/navDir";
import { Toast } from "../../components/ui/Toast";

export function AdminEventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const event = ADMIN_EVENTS.find(e => e.id === id);

  const [roster,   setRoster]   = useState<RosterPlayer[]>(event?.roster   ?? []);
  const [waitlist, setWaitlist] = useState<Player[]>      (event?.waitlist  ?? []);

  const [openMenu,             setOpenMenu]             = useState<string | null>(null);
  const [confirmRemoveId,      setConfirmRemoveId]      = useState<string | null>(null);
  const [confirmWaitlistRemId, setConfirmWaitlistRemId] = useState<string | null>(null);
  const [isPublished,          setIsPublished]          = useState(event?.status !== "draft");
  const [showDeleteConfirm,    setShowDeleteConfirm]    = useState(false);
  const [showCancelConfirm,    setShowCancelConfirm]    = useState(false);
  const [showPublishConfirm,   setShowPublishConfirm]   = useState(false);
  const [showActionDropdown,   setShowActionDropdown]   = useState(false);
  const [anonymousName,        setAnonymousName]        = useState("Anonymous");
  const [anonymousAddCount,    setAnonymousAddCount]    = useState(1);
  const [editingAnonName,      setEditingAnonName]      = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "copied" | "publish"; visible: boolean }>({ message: "", variant: "success", visible: false });
  const [isCanceled, setIsCanceled] = useState(() => {
    const stored = JSON.parse(localStorage.getItem("prime:canceled_events") || "[]");
    return event ? stored.includes(event.id) : false;
  });

  function fireToast(message: string, variant: "success" | "copied" | "publish") {
    setToast({ message, variant, visible: true });
  }
  function hideToast() {
    setToast(prev => ({ ...prev, visible: false }));
  }

  useEffect(() => {
    function close() {
      setShowActionDropdown(false);
      setOpenMenu(null);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (!event) {
    return (
      <div>
        <BackBar label="Events" to="/admin/events" />
        <div className="flex items-center justify-center min-h-[60vh] text-[#79828b]">
          <p className="font-bold">Event not found</p>
        </div>
      </div>
    );
  }

  // ── Actions ────────────────────────────────────────────────
  function confirmPayment(playerId: string, newStatus: PaymentStatus) {
    setRoster(prev => prev.map(p =>
      p.id === playerId ? { ...p, paymentStatus: newStatus } : p
    ));
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
    fireToast("Player Removed!", "success");
  }

  function addToRoster(playerId: string) {
    const player = waitlist.find(p => p.id === playerId);
    if (!player) return;
    setRoster(prev => [...prev, { ...player, paymentStatus: "unpaid" }]);
    setWaitlist(prev => prev.filter(p => p.id !== playerId));
  }

  function removeFromWaitlist(playerId: string) {
    setWaitlist(prev => prev.filter(p => p.id !== playerId));
    setConfirmWaitlistRemId(null);
    setOpenMenu(null);
    fireToast("Player Removed!", "success");
  }

  function moveWaitlistUp(idx: number) {
    if (idx === 0) return;
    setWaitlist(prev => { const a = [...prev]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; return a; });
  }
  function moveWaitlistDown(idx: number) {
    if (idx === waitlist.length - 1) return;
    setWaitlist(prev => { const a = [...prev]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; return a; });
  }

  function openProfile(player: Player) {
    navDir.forward();
    navigate(`/admin/player/${player.id}`);
    setOpenMenu(null);
  }

  function toggleMenu(key: string) {
    setOpenMenu(prev => prev === key ? null : key);
    setConfirmRemoveId(null);
  }

  // ── Derived ────────────────────────────────────────────────
  const totalPlayers  = roster.length;
  const isFull        = totalPlayers >= event.capacity;
  const cashPaid      = roster.filter(p => p.paymentStatus === "cash").length;
  const onlinePaid    = roster.filter(p => p.paymentStatus === "online").length;
  const unpaid        = roster.filter(p => p.paymentStatus === "unpaid").length;
  const collectedCZK  = (cashPaid + onlinePaid) * event.price;

  const dropdownLabel = isCanceled ? "Canceled" : isPublished ? "Published" : "Draft";
  const dropdownCls   = isCanceled
    ? "shadow-[inset_0_0_0_1.5px_#eab308] text-[#eab308]"
    : isPublished
      ? "shadow-[inset_0_0_0_1.5px_#3390ec] text-[#3390ec]"
      : "bg-[#3390ec] text-white shadow-sm";

  function reactivateEvent() {
    const stored: string[] = JSON.parse(localStorage.getItem("prime:canceled_events") || "[]");
    localStorage.setItem("prime:canceled_events", JSON.stringify(stored.filter(eid => eid !== event.id)));
    setIsCanceled(false);
    setShowActionDropdown(false);
    fireToast("Event Reactivated!", "success");
  }

  return (
    <div className="min-h-screen bg-[#0e1621] text-white font-sans">
      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onHide={hideToast} />

      {/* ── Publish confirm ─────────────────────────────────── */}
      {showPublishConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#17212b] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#3390ec]/10 border border-[#3390ec]/20 flex items-center justify-center shrink-0">
                <Send size={18} className="text-[#3390ec]" />
              </div>
              <div>
                <h3 className="font-black italic uppercase tracking-widest text-white text-base">Publish Event?</h3>
                <p className="text-[#79828b] text-xs">Players will be able to join.</p>
              </div>
            </div>
            <p className="text-[#79828b] text-sm mb-5">
              <span className="text-white font-bold">{event.title}</span> will be visible and open for sign-ups.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPublishConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#79828b] font-bold text-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsPublished(true);
                  setShowPublishConfirm(false);
                  fireToast("Event Published!", "publish");
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#3390ec] text-white font-bold text-sm active:scale-[0.98] transition-transform"
              >
                Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ───────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#17212b] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-[#ef4444]" />
              </div>
              <div>
                <h3 className="font-black italic uppercase tracking-widest text-white text-base">Delete Event?</h3>
                <p className="text-[#79828b] text-xs">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-[#79828b] text-sm mb-5">
              All roster, waitlist, and request data for <span className="text-white font-bold">{event.title}</span> will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#79828b] font-bold text-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); fireToast("Event Deleted!", "success"); setTimeout(() => navigate("/admin/events"), 1500); }}
                className="flex-1 py-2.5 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] font-bold text-sm active:scale-[0.98] transition-transform"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel confirm ───────────────────────────────────── */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#17212b] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#eab308]/10 border border-[#eab308]/20 flex items-center justify-center shrink-0">
                <Ban size={18} className="text-[#eab308]" />
              </div>
              <div>
                <h3 className="font-black italic uppercase tracking-widest text-white text-base">Cancel Event?</h3>
                <p className="text-[#79828b] text-xs">Players will see the event as canceled.</p>
              </div>
            </div>
            <p className="text-[#79828b] text-sm mb-5">
              <span className="text-white font-bold">{event.title}</span> will be marked as canceled and remain visible to players.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#79828b] font-bold text-sm hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => {
                  const stored = JSON.parse(localStorage.getItem("prime:canceled_events") || "[]");
                  if (!stored.includes(event.id)) stored.push(event.id);
                  localStorage.setItem("prime:canceled_events", JSON.stringify(stored));
                  setIsCanceled(true);
                  setShowCancelConfirm(false);
                  fireToast("Event Canceled!", "success");
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#eab308]/10 border border-[#eab308]/30 text-[#eab308] font-bold text-sm active:scale-[0.98] transition-transform"
              >
                Cancel Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BackBar with share button */}
      <BackBar label="Events" to="/admin/events">
        <button
          onClick={() => {
            const url = `${window.location.origin}/events/${event.id}`;
            if (navigator.share) {
              navigator.share({ title: event.title, url });
            } else {
              navigator.clipboard.writeText(url).then(() => fireToast("Link Copied!", "copied"));
            }
          }}
          className="flex items-center gap-1.5 text-[#79828b] hover:text-white transition-colors text-sm font-bold"
        >
          <Share2 size={16} />
          <span>Share</span>
        </button>
      </BackBar>

      <div className="px-4 pb-12 max-w-[600px] mx-auto pt-4">

        {/* ── TOP SECTION ─────────────────────────────────────── */}
        <div className="mb-6">

          {/* Category badge + Edit button */}
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded inline-block ${getCategoryStyle(event.category)}`}>
              {event.category}
            </span>
            <button
              onClick={() => navigate(`/admin/events/${event.id}/edit`)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-[#79828b] hover:text-white hover:bg-white/10 transition-colors"
              title="Edit event"
            >
              <Pencil size={14} />
            </button>
          </div>

          {/* Event title */}
          <h1 className="text-3xl font-black italic uppercase tracking-tight leading-none text-white mb-4">
            {event.title}
          </h1>

          {/* Moderator card */}
          <div className="flex items-center justify-between bg-[#17212b] border border-white/5 rounded-xl p-2.5 mb-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={event.moderator.avatar}
                  alt={event.moderator.name}
                  className="w-11 h-11 rounded-full object-cover border border-white/10"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#3390ec] rounded-full flex items-center justify-center border-2 border-[#17212b]">
                  <CheckCircle2 size={10} className="text-white" strokeWidth={3} />
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#79828b] uppercase tracking-widest leading-tight">Moderator</div>
                <div className="text-white font-bold text-sm">{event.moderator.name}</div>
              </div>
            </div>
            <div className="relative" onMouseDown={e => e.stopPropagation()}>
              <button
                onClick={() => toggleMenu("moderator")}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors text-[#79828b]"
              >
                <MoreVertical size={18} />
              </button>
              {openMenu === "moderator" && (
                <div className="absolute right-0 top-full mt-1 bg-[#222f3e] border border-white/10 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] z-20 overflow-hidden min-w-[160px]">
                  <button
                    onClick={() => { navDir.forward(); navigate(`/admin/player/${event.moderator.id}`); setOpenMenu(null); }}
                    className="flex items-center gap-2 w-full px-4 py-3 text-sm font-bold text-white hover:bg-white/5 transition-colors text-left"
                  >
                    <User size={14} />
                    View Profile
                  </button>
                  <button
                    onClick={() => setOpenMenu(null)}
                    className="flex items-center gap-2 w-full px-4 py-3 text-sm font-bold text-white hover:bg-white/5 transition-colors text-left border-t border-white/5"
                  >
                    <ArrowLeftRight size={14} />
                    Switch Moderator
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Info panel */}
          <div className="bg-[#17212b] border border-white/5 rounded-xl flex flex-col">
            <div className="flex justify-between items-center p-3 border-b border-white/5 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <Calendar size={16} className="text-[#3390ec]" />
                <span className="text-sm font-semibold text-white/90">{event.date}</span>
              </div>
              <div className="hidden sm:block w-[1px] h-4 bg-white/10" />
              <div className="flex items-center gap-2.5">
                <Clock size={16} className="text-[#3390ec]" />
                <span className="text-sm font-semibold text-white/90">{event.time}</span>
              </div>
              <div className="hidden sm:block w-[1px] h-4 bg-white/10" />
              <div className="flex items-center gap-2.5">
                <Ticket size={16} className="text-[#3390ec]" />
                <span className="text-sm font-semibold text-white/90">{event.priceLabel}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-b-xl">
              <MapPin size={16} className="text-[#3390ec]" />
              <span className="text-sm font-semibold text-white/90 truncate">{event.location}</span>
            </div>
          </div>

          {event.description && (
            <p className="text-[#79828b] text-xs leading-relaxed mt-4 px-1">
              {event.description}
            </p>
          )}
        </div>

        {/* ── PAYMENTS (first) ─────────────────────────────────── */}
        {event.price > 0 && (
          <div className="bg-[#17212b] rounded-xl p-4 border border-white/5 mb-5">
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

        {/* ── ROSTER SECTION ──────────────────────────────────── */}
        <div>
          {/* Capacity indicator + Action dropdown */}
          <div className="flex justify-between items-center mb-3 px-1">
            <h2 className="font-bold text-lg text-white">
              {totalPlayers}{" "}
              <span className="text-[#79828b]">/ {event.capacity} Players</span>
            </h2>

            {/* Action dropdown (replaces CTA button) */}
            <div className="relative" onMouseDown={e => e.stopPropagation()}>
              <button
                onClick={() => setShowActionDropdown(v => !v)}
                className={`w-36 py-2 px-3 flex items-center justify-between rounded-lg font-bold text-sm transition-all active:scale-[0.98] ${dropdownCls}`}
              >
                <span>{dropdownLabel}</span>
                <ChevronDown size={13} className={`transition-transform duration-200 shrink-0 ${showActionDropdown ? "rotate-180" : ""}`} />
              </button>

              {showActionDropdown && (
                <div className="absolute right-0 top-full mt-1.5 bg-[#222f3e] border border-white/10 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.6)] z-20 overflow-hidden w-full">
                  {!isPublished && !isCanceled && (
                    <button
                      onClick={() => { setShowPublishConfirm(true); setShowActionDropdown(false); }}
                      className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-bold text-[#3390ec] hover:bg-[#3390ec]/5 transition-colors text-left"
                    >
                      <Send size={14} />
                      Publish
                    </button>
                  )}
                  {isCanceled ? (
                    <button
                      onClick={reactivateEvent}
                      className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-bold text-[#eab308] hover:bg-[#eab308]/5 transition-colors text-left"
                    >
                      <RotateCcw size={14} />
                      Reactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => { setShowCancelConfirm(true); setShowActionDropdown(false); }}
                      className={`flex items-center gap-2.5 w-full px-4 py-3 text-sm font-bold text-[#eab308] hover:bg-[#eab308]/5 transition-colors text-left ${!isPublished ? "border-t border-white/5" : ""}`}
                    >
                      <Ban size={14} />
                      Cancel Event
                    </button>
                  )}
                  <button
                    onClick={() => { setShowDeleteConfirm(true); setShowActionDropdown(false); }}
                    className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-bold text-[#ef4444] hover:bg-[#ef4444]/5 transition-colors text-left border-t border-white/5"
                  >
                    <Trash2 size={14} />
                    Delete Event
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Capacity bar */}
          <div className="w-full h-1.5 bg-white/5 rounded-full mb-5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isCanceled ? "bg-[#ef4444]" : "bg-[#3390ec]"}`}
              style={{ width: `${Math.min((totalPlayers / event.capacity) * 100, 100)}%` }}
            />
          </div>

          {/* Anonymous player card */}
          <div className="mx-0 mb-4">
            <div className="bg-[#17212b] border border-dashed border-white/[0.12] rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <User size={16} className="text-white/30" />
              </div>
              <div className="flex-1 min-w-0">
                {editingAnonName ? (
                  <input
                    autoFocus
                    value={anonymousName}
                    onChange={e => setAnonymousName(e.target.value)}
                    onBlur={() => setEditingAnonName(false)}
                    onKeyDown={e => e.key === "Enter" && setEditingAnonName(false)}
                    className="bg-transparent text-white/60 font-bold text-sm outline-none border-b border-white/20 w-full pb-0.5"
                  />
                ) : (
                  <button
                    onClick={() => setEditingAnonName(true)}
                    className="flex items-center gap-1.5 group"
                  >
                    <span className="font-bold text-white/40 text-sm group-hover:text-white/60 transition-colors">
                      {anonymousName}
                    </span>
                    <Pencil size={10} className="text-white/20 group-hover:text-white/40 transition-colors" />
                  </button>
                )}
                <div className="text-[#79828b] text-[11px] uppercase tracking-wider mt-0.5">Reserved</div>
              </div>
              <input
                type="number"
                min={1}
                value={anonymousAddCount}
                onChange={e => setAnonymousAddCount(Math.max(1, Number(e.target.value) || 1))}
                className="w-10 h-8 bg-white/5 border border-white/10 rounded-lg text-white font-black text-sm text-center outline-none focus:border-white/25 shrink-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={() => {
                  const newPlayers: RosterPlayer[] = Array.from({ length: anonymousAddCount }, (_, i) => ({
                    id: `anon-${Date.now()}-${i}`,
                    name: anonymousName,
                    avatar: "",
                    position: "—",
                    skillLevel: "",
                    paymentStatus: "unpaid",
                  }));
                  setRoster(prev => [...prev, ...newPlayers]);
                }}
                className="w-[76px] h-8 flex items-center justify-center gap-1 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-colors shrink-0 bg-[#3390ec]/10 border-[#3390ec]/30 text-[#3390ec] hover:bg-[#3390ec]/20 active:scale-95"
              >
                <CheckCheck size={12} />
                Add
              </button>
            </div>
          </div>

          {/* Roster list */}
          <div className="flex flex-col gap-2 mb-8">
            {roster.length === 0 && (
              <p className="text-[#79828b] text-sm text-center py-6">No players on roster yet</p>
            )}
            {roster.map((player, idx) => (
              <div key={player.id} className="flex flex-col">
                <div className={`flex items-center gap-2 p-3 bg-[#17212b] border transition-colors ${
                  openMenu === player.id ? "rounded-t-xl border-b-0 border-white/10" : "rounded-xl border-white/5"
                }`}>
                  {player.avatar
                    ? <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full border-2 border-[#0e1621] object-cover shrink-0" />
                    : <div className="w-10 h-10 rounded-full border-2 border-[#0e1621] bg-white/5 flex items-center justify-center shrink-0"><User size={16} className="text-white/30" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-sm truncate">{player.name}</div>
                    <div className="text-[#79828b] text-[11px] uppercase tracking-wider">{player.position}</div>
                  </div>
                  {event.price > 0 && (
                    <PaymentToggle status={player.paymentStatus} onConfirm={s => confirmPayment(player.id, s)} />
                  )}
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
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => toggleMenu(player.id)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg shrink-0 transition-colors ${openMenu === player.id ? "bg-white/10 text-white" : "text-[#79828b] hover:bg-white/5 hover:text-white"}`}
                  >
                    <MoreVertical size={15} />
                  </button>
                </div>

                {openMenu === player.id && (
                  <div onMouseDown={e => e.stopPropagation()} className="bg-[#222f3e] rounded-b-xl border border-t-0 border-white/10 overflow-hidden relative z-20">
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
                        {!player.id.startsWith("anon-") && (
                          <>
                            <MenuAction icon={<User size={14} />} label="View Profile" onClick={() => openProfile(player)} />
                            <MenuAction icon={<ArrowDownToLine size={14} />} label="Move to Waitlist" onClick={() => moveToWaitlist(player.id)} />
                          </>
                        )}
                        <MenuAction icon={<Trash2 size={14} />} label="Remove from Event" danger onClick={() => player.id.startsWith("anon-") ? removeFromEvent(player.id) : setConfirmRemoveId(player.id)} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── WAITLIST ──────────────────────────────────────── */}
          <SectionHeader label="Waitlist" count={String(waitlist.length)} />

          <div className="flex flex-col gap-2 mb-3">
            {waitlist.length === 0 && (
              <p className="text-[#79828b] text-sm text-center py-6">No players on waitlist</p>
            )}
            {waitlist.map((player, idx) => (
              <div key={player.id} className="flex flex-col">
                <div className={`flex items-center gap-2 p-3 bg-[#17212b] border transition-colors ${
                  openMenu === `w-${player.id}` ? "rounded-t-xl border-b-0 border-white/10" : "rounded-xl border-white/5"
                }`}>
                  {player.avatar
                    ? <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full border-2 border-[#0e1621] object-cover shrink-0" />
                    : <div className="w-10 h-10 rounded-full border-2 border-[#0e1621] bg-white/5 flex items-center justify-center shrink-0"><User size={16} className="text-white/30" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-sm truncate">{player.name}</div>
                    <div className="text-[#79828b] text-[11px] uppercase tracking-wider">{player.position}</div>
                  </div>
                  <button
                    onClick={() => addToRoster(player.id)}
                    className="w-[76px] h-8 flex items-center justify-center gap-1 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-colors shrink-0 bg-[#3390ec]/10 border-[#3390ec]/30 text-[#3390ec] hover:bg-[#3390ec]/20 active:scale-95"
                  >
                    <CheckCheck size={12} />
                    Add
                  </button>
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => moveWaitlistUp(idx)}
                      disabled={idx === 0}
                      className={`w-6 h-5 flex items-center justify-center rounded transition-colors ${idx === 0 ? "text-white/10 cursor-not-allowed" : "text-[#79828b] hover:text-white hover:bg-white/5"}`}
                    >
                      <ChevronUp size={13} />
                    </button>
                    <button
                      onClick={() => moveWaitlistDown(idx)}
                      disabled={idx === waitlist.length - 1}
                      className={`w-6 h-5 flex items-center justify-center rounded transition-colors ${idx === waitlist.length - 1 ? "text-white/10 cursor-not-allowed" : "text-[#79828b] hover:text-white hover:bg-white/5"}`}
                    >
                      <ChevronDown size={13} />
                    </button>
                  </div>
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => { setOpenMenu(prev => prev === `w-${player.id}` ? null : `w-${player.id}`); setConfirmWaitlistRemId(null); }}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg shrink-0 transition-colors ${openMenu === `w-${player.id}` ? "bg-white/10 text-white" : "text-[#79828b] hover:bg-white/5 hover:text-white"}`}
                  >
                    <MoreVertical size={15} />
                  </button>
                </div>

                {openMenu === `w-${player.id}` && (
                  <div onMouseDown={e => e.stopPropagation()} className="bg-[#222f3e] rounded-b-xl border border-t-0 border-white/10 overflow-hidden relative z-20">
                    {confirmWaitlistRemId === player.id ? (
                      <div className="flex items-center gap-3 px-4 py-3">
                        <span className="text-white text-xs font-bold flex-1">Remove {player.name}?</span>
                        <button
                          onClick={() => removeFromWaitlist(player.id)}
                          className="px-3 py-1.5 bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] text-[11px] font-black uppercase tracking-wider rounded-lg active:scale-95 transition-transform"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmWaitlistRemId(null)}
                          className="px-3 py-1.5 bg-white/5 text-[#79828b] text-[11px] font-black uppercase tracking-wider rounded-lg hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <MenuAction icon={<User size={14} />} label="View Profile" onClick={() => openProfile(player)} />
                        <MenuAction icon={<Trash2 size={14} />} label="Remove from Waitlist" danger onClick={() => setConfirmWaitlistRemId(player.id)} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
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

const PAYMENT_CYCLE: PaymentStatus[] = ["unpaid", "cash", "online"];

function PaymentToggle({ status, onConfirm }: { status: PaymentStatus; onConfirm: (s: PaymentStatus) => void }) {
  const [pending, setPending] = useState<PaymentStatus>(status);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);

  useEffect(() => { setPending(status); }, [status]);

  function stopHold() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setProgress(0);
  }

  function onPointerDown() {
    startRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const pct = Math.min(((Date.now() - startRef.current) / 1500) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setProgress(0);
        if (status !== "unpaid") {
          setPending("unpaid");
          onConfirm("unpaid");
        } else {
          onConfirm(pending);
        }
      }
    }, 16);
  }

  function onPointerUp() {
    const held = Date.now() - startRef.current;
    stopHold();
    if (held < 300 && status === "unpaid") {
      setPending(prev => PAYMENT_CYCLE[(PAYMENT_CYCLE.indexOf(prev) + 1) % PAYMENT_CYCLE.length]);
    }
  }

  const isConfirmed = pending === status;
  const confirmedAndSet = isConfirmed && status !== "unpaid";

  const label = pending === "cash" ? "Cash" : pending === "online" ? "Online" : "Unpaid";
  const fillColor = pending === "online" ? "bg-[#3390ec]" : "bg-[#4dcd5e]";
  const confirmedBg = status === "online" ? "bg-[#3390ec]/10 border-[#3390ec]/25" : "bg-[#4dcd5e]/10 border-[#4dcd5e]/25";
  const confirmedText = status === "online" ? "text-[#3390ec]" : "text-[#4dcd5e]";
  const ConfirmedIcon = status === "online" ? CreditCard : Banknote;

  return (
    <button
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={stopHold}
      className={`relative w-[76px] h-8 rounded-lg border overflow-hidden shrink-0 select-none touch-none ${
        confirmedAndSet ? `${confirmedBg}` : "bg-white/5 border-white/10"
      }`}
    >
      {progress > 0 && (
        <div
          className={`absolute inset-y-0 left-0 ${fillColor} opacity-25 transition-none`}
          style={{ width: `${progress}%` }}
        />
      )}
      <div className="relative flex items-center justify-center gap-1 h-full">
        {confirmedAndSet && <ConfirmedIcon size={11} className={confirmedText} />}
        <span className={`text-[10px] font-black uppercase tracking-wider ${confirmedAndSet ? confirmedText : "text-[#79828b]"}`}>
          {label}
        </span>
      </div>
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
