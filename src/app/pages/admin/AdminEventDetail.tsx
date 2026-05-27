import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ChevronUp, ChevronDown, MoreVertical,
  CheckCircle2, CreditCard, Banknote, User, ArrowDownToLine,
  Trash2, Send, CheckCheck, Pencil, AlertTriangle, Ban, Share2,
} from "lucide-react";
import { BackBar } from "../../components/ui/BackBar";
import {
  ADMIN_EVENTS, getCategoryStyle,
  type PaymentStatus, type Player, type RosterPlayer,
} from "../../data/adminData";
import { Toast } from "../../components/ui/Toast";
export function AdminEventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const event = ADMIN_EVENTS.find(e => e.id === id);

  const [roster,   setRoster]   = useState<RosterPlayer[]>(event?.roster   ?? []);
  const [waitlist, setWaitlist] = useState<Player[]>      (event?.waitlist  ?? []);

  // UI state
  const [openMenu,              setOpenMenu]              = useState<string | null>(null);
  const [confirmRemoveId,       setConfirmRemoveId]       = useState<string | null>(null);
  const [confirmWaitlistRemId,  setConfirmWaitlistRemId]  = useState<string | null>(null);
  const [isPublished,           setIsPublished]           = useState(event?.status !== "draft");
  const [showDeleteConfirm,     setShowDeleteConfirm]     = useState(false);
  const [showCancelConfirm,     setShowCancelConfirm]     = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "copied" | "publish"; visible: boolean }>({ message: "", variant: "success", visible: false });
  const [isCanceled,            setIsCanceled]            = useState(() => {
    const stored = JSON.parse(localStorage.getItem("prime:canceled_events") || "[]");
    return event ? stored.includes(event.id) : false;
  });

  function fireToast(message: string, variant: "success" | "copied" | "publish") {
    setToast({ message, variant, visible: true });
  }
  function hideToast() {
    setToast(prev => ({ ...prev, visible: false }));
  }

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
  }

  function addToRoster(playerId: string) {
    if (roster.length >= event.capacity) return;
    const player = waitlist.find(p => p.id === playerId);
    if (!player) return;
    setRoster(prev => [...prev, { ...player, paymentStatus: "unpaid" }]);
    setWaitlist(prev => prev.filter(p => p.id !== playerId));
  }

  function removeFromWaitlist(playerId: string) {
    setWaitlist(prev => prev.filter(p => p.id !== playerId));
    setConfirmWaitlistRemId(null);
    setOpenMenu(null);
  }

  function moveWaitlistUp(idx: number) {
    if (idx === 0) return;
    setWaitlist(prev => { const a = [...prev]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; return a; });
  }
  function moveWaitlistDown(idx: number) {
    if (idx === waitlist.length - 1) return;
    setWaitlist(prev => { const a = [...prev]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; return a; });
  }

  function openProfile(_player: Player) {
    navigate("/profile");
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
    <div>
      {/* Centered toast */}
      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onHide={hideToast} />

      {/* Delete confirmation modal */}
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
                onClick={() => navigate("/admin/events")}
                className="flex-1 py-2.5 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] font-bold text-sm active:scale-[0.98] transition-transform"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirmation modal */}
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
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#eab308]/10 border border-[#eab308]/30 text-[#eab308] font-bold text-sm active:scale-[0.98] transition-transform"
              >
                Cancel Event
              </button>
            </div>
          </div>
        </div>
      )}

      <BackBar label="Events" to="/admin/events" />

      <div className="max-w-[700px] mx-auto w-full px-4 pt-6 pb-6">

      {/* Event header */}
      <div className="mb-2">
        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded inline-block mb-2 ${getCategoryStyle(event.category)}`}>
          {event.category}
        </span>
        <div className="flex items-center justify-between gap-2 mb-1">
          <h1 className="font-black italic text-xl text-white uppercase tracking-wide leading-tight">{event.title}</h1>
          <div className="flex items-center gap-2 shrink-0">
            {/* Share */}
            <button
              onClick={() => {
                const url = `${window.location.origin}/events/${event.id}`;
                if (navigator.share) {
                  navigator.share({ title: event.title, url });
                } else {
                  navigator.clipboard.writeText(url).then(() => fireToast("Link Copied!", "copied"));
                }
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-[#79828b] hover:text-white hover:bg-white/10 transition-colors"
              title="Share event link"
            >
              <Share2 size={14} />
            </button>
            {/* Edit */}
            <button
              onClick={() => navigate(`/admin/events/${event.id}/edit`)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-[#79828b] hover:text-white hover:bg-white/10 transition-colors"
              title="Edit event"
            >
              <Pencil size={14} />
            </button>
          </div>
        </div>
        <p className="text-[#79828b] text-xs mt-1">
          {event.date} • {event.time} • {event.location}
          <span className="text-white font-bold"> • {event.priceLabel}</span>
        </p>
      </div>

      {/* ── ACTION BUTTONS — Cancel / Delete / Publish ───────── */}
      <div className="flex gap-2 mt-5 mb-1">
        {/* Cancel */}
        <button
          onClick={() => { if (!isCanceled) setShowCancelConfirm(true); }}
          disabled={isCanceled}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-colors ${
            isCanceled
              ? "bg-[#eab308]/10 border-[#eab308]/30 text-[#eab308] cursor-default"
              : "border-white/10 text-[#79828b] hover:text-[#eab308] hover:border-[#eab308]/30 hover:bg-[#eab308]/5"
          }`}
        >
          <Ban size={13} />
          {isCanceled ? "Canceled" : "Cancel"}
        </button>
        {/* Delete */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#ef4444]/30 text-[#ef4444] bg-[#ef4444]/5 text-[11px] font-black uppercase tracking-widest hover:bg-[#ef4444]/10 transition-colors"
        >
          <Trash2 size={13} />
          Delete
        </button>
        {/* Publish */}
        {!isPublished ? (
          <button
            onClick={() => { setIsPublished(true); fireToast("Event Published!", "publish"); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#3390ec] text-white text-[11px] font-black uppercase tracking-widest rounded-xl active:scale-95 transition-transform"
          >
            <Send size={13} /> Publish
          </button>
        ) : (
          <span className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#3390ec]/10 text-[#3390ec] text-[11px] font-black uppercase tracking-widest rounded-xl border border-[#3390ec]/20">
            <CheckCircle2 size={13} /> Published
          </span>
        )}
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
              <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full border-2 border-[#0e1621] object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-sm truncate">{player.name}</div>
                <div className="text-[#79828b] text-[11px] uppercase tracking-wider">{player.position}</div>
              </div>
              {/* Payment toggle */}
              {event.price > 0 && (
                <PaymentToggle status={player.paymentStatus} onConfirm={s => confirmPayment(player.id, s)} />
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
          <div key={player.id} className="flex flex-col">
            <div className={`flex items-center gap-2 p-3 bg-[#17212b] border transition-colors ${
              openMenu === `w-${player.id}` ? "rounded-t-xl border-b-0 border-white/10" : "rounded-xl border-white/5"
            }`}>
              <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full border-2 border-[#0e1621] object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-sm truncate">{player.name}</div>
                <div className="text-[#79828b] text-[11px] uppercase tracking-wider">{player.position}</div>
              </div>
              {/* Add button — same position/size as PaymentToggle */}
              <button
                onClick={() => addToRoster(player.id)}
                disabled={roster.length >= event.capacity}
                className={`w-[76px] h-8 flex items-center justify-center gap-1 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-colors shrink-0 ${
                  roster.length >= event.capacity
                    ? "bg-white/5 border-white/10 text-[#79828b] cursor-not-allowed"
                    : "bg-[#3390ec]/10 border-[#3390ec]/30 text-[#3390ec] hover:bg-[#3390ec]/20 active:scale-95"
                }`}
              >
                <CheckCheck size={12} />
                {roster.length >= event.capacity ? "Full" : "Add"}
              </button>
              {/* Up/Down */}
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
              {/* 3-dots */}
              <button
                onClick={() => { setOpenMenu(prev => prev === `w-${player.id}` ? null : `w-${player.id}`); setConfirmWaitlistRemId(null); }}
                className={`w-8 h-8 flex items-center justify-center rounded-lg shrink-0 transition-colors ${openMenu === `w-${player.id}` ? "bg-white/10 text-white" : "text-[#79828b] hover:bg-white/5 hover:text-white"}`}
              >
                <MoreVertical size={15} />
              </button>
            </div>

            {/* Inline action menu */}
            {openMenu === `w-${player.id}` && (
              <div className="bg-[#222f3e] rounded-b-xl border border-t-0 border-white/10 overflow-hidden">
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
          // undo confirmed payment
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
    // only cycle on quick tap when not yet confirmed
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
        confirmedAndSet
          ? `${confirmedBg}`
          : "bg-white/5 border-white/10"
      }`}
    >
      {/* hold-progress fill */}
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

