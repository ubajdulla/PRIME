import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router";
import {
  ChevronDown, MoreVertical,
  CheckCircle2, CreditCard, Banknote, User, ArrowDownToLine,
  Trash2, CheckCheck, Share2, Send, Ban, RotateCcw, AlertTriangle, UserPlus, UserMinus,
  MapPin, Calendar, Clock, Ticket, Pencil, X, Check, ArrowLeftRight, Lock, Unlock,
} from "lucide-react";
import { BackBar } from "../../components/ui/BackBar";
import { getCategoryStyle, getStatusStyle, type PaymentStatus, type EventStatus } from "../../data/adminData";
import { navDir } from "../../lib/navDir";
import { Toast } from "../../components/ui/Toast";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";
import { shortDate, isPastDate, isRosterLocked } from "../../lib/eventDate";
import { PublishEventModal } from "../../components/PublishEventModal";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  event_date: string;
  event_time: string;
  location: string;
  price: number;
  price_label: string | null;
  capacity: number;
  status: EventStatus;
  published_at: string | null;
  roster_lock_override: "locked" | "unlocked" | null;
  moderator_id: string;
  moderator: { id: string; name: string; avatar: string | null } | null;
};

type RosterEntry = { id: string; rowId: string; name: string; avatar: string | null; position: string | null; paymentStatus: PaymentStatus; isGuest: boolean };
type PersonEntry = { id: string; name: string; avatar: string | null; position: string | null };

const POSITIONS = ["Outside Hitter", "Opposite Hitter", "Setter", "Middle Blocker", "Libero"];

export function AdminEventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: authUser, profile: authProfile } = useAuth();

  const [event, setEvent] = useState<EventRow | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [requests, setRequests] = useState<PersonEntry[]>([]);
  const [waitlist, setWaitlist] = useState<PersonEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [openMenu,             setOpenMenu]             = useState<string | null>(null);
  const [editPositionId,       setEditPositionId]       = useState<string | null>(null);
  const [editPositionValue,    setEditPositionValue]    = useState(POSITIONS[0]);
  const [confirmRemoveId,      setConfirmRemoveId]      = useState<string | null>(null);
  const [confirmWaitlistRemId, setConfirmWaitlistRemId] = useState<string | null>(null);
  const [showActionDropdown,   setShowActionDropdown]   = useState(false);
  const [showPublishModal,     setShowPublishModal]     = useState(false);
  const [showCancelConfirm,    setShowCancelConfirm]    = useState(false);
  const [showReactivateConfirm, setShowReactivateConfirm] = useState(false);
  const [showDeleteConfirm,    setShowDeleteConfirm]    = useState(false);
  const [showLeaveEventConfirm, setShowLeaveEventConfirm] = useState(false);
  const [otherAdmins,          setOtherAdmins]          = useState<{ id: string; name: string; avatar: string | null }[]>([]);
  const [pendingSwap,          setPendingSwap]          = useState<{ id: string; to_admin_name: string } | null>(null);
  const [showSwapMenu,         setShowSwapMenu]         = useState(false);
  const [swapMenuPos,          setSwapMenuPos]          = useState<{ top: number; right: number } | null>(null);
  const [anonymousName,        setAnonymousName]        = useState("Guest");
  const [anonymousAddCount,    setAnonymousAddCount]    = useState<string>("1");
  const [editingAnonName,      setEditingAnonName]      = useState(false);
  const [addingGuests,         setAddingGuests]         = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "copied" | "publish" | "error"; visible: boolean }>({ message: "", variant: "success", visible: false });

  function fireToast(message: string, variant: "success" | "copied" | "publish" | "error") {
    setToast({ message, variant, visible: true });
  }
  function hideToast() {
    setToast(prev => ({ ...prev, visible: false }));
  }

  async function load(eventId: string) {
    const [{ data: eventRow, error }, { data: participantRows }, { data: requestRows }] = await Promise.all([
      supabase.from("events").select("*, moderator:profiles!moderator_id(id, name, avatar)").eq("id", eventId).single(),
      supabase.from("event_participants").select("id, player_id, guest_name, payment_status, joined_at, position, profiles(id, name, avatar, position)").eq("event_id", eventId).order("joined_at", { ascending: true }),
      supabase.from("event_requests").select("player_id, kind, created_at, position, profiles(id, name, avatar)").eq("event_id", eventId).order("created_at", { ascending: true }),
    ]);

    if (error || !eventRow) { setNotFound(true); setLoading(false); return; }

    setEvent(eventRow as unknown as EventRow);
    const moderatorId = (eventRow as unknown as EventRow).moderator_id;
    const rosterMapped = (participantRows ?? []).map(p => ({
      id: p.profiles?.id ?? `guest-${p.id}`,
      rowId: p.id,
      name: p.profiles?.name ?? p.guest_name ?? "Unknown",
      avatar: p.profiles?.avatar ?? null,
      position: p.position ?? p.profiles?.position ?? null,
      paymentStatus: p.payment_status as PaymentStatus,
      isGuest: !p.player_id,
    }));
    setRoster([...rosterMapped].sort((a, b) => (a.id === moderatorId ? -1 : 0) - (b.id === moderatorId ? -1 : 0)));
    setRequests((requestRows ?? []).filter(r => r.kind === "request").map(r => ({
      id: r.profiles?.id ?? r.player_id, name: r.profiles?.name ?? "Unknown", avatar: r.profiles?.avatar ?? null,
      position: r.position ?? r.profiles?.position ?? null,
    })));
    setWaitlist((requestRows ?? []).filter(r => r.kind === "waitlist").map(r => ({
      id: r.profiles?.id ?? r.player_id, name: r.profiles?.name ?? "Unknown", avatar: r.profiles?.avatar ?? null,
      position: r.position ?? r.profiles?.position ?? null,
    })));
    setLoading(false);
  }

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    load(id);
  }, [id]);

  useEffect(() => {
    function close() {
      setShowActionDropdown(false);
      setOpenMenu(null);
      setShowSwapMenu(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (!event || !authUser || authUser.id !== event.moderator_id) return;
    (async () => {
      const [{ data: admins }, { data: swap }] = await Promise.all([
        supabase.from("profiles").select("id, name, avatar").eq("is_admin", true).neq("id", authUser.id),
        supabase.from("moderator_swap_requests")
          .select("id, to_admin:profiles!to_admin_id(name)")
          .eq("event_id", event.id).eq("from_admin_id", authUser.id).eq("status", "pending")
          .maybeSingle(),
      ]);
      setOtherAdmins(admins ?? []);
      setPendingSwap(swap ? { id: swap.id, to_admin_name: (swap.to_admin as unknown as { name: string } | null)?.name ?? "" } : null);
    })();
  }, [event?.id, event?.moderator_id, authUser?.id]);

  if (loading) return <div className="min-h-screen bg-[#0e1621]" />;

  if (notFound || !event) {
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
  async function confirmPayment(rowId: string, newStatus: PaymentStatus) {
    setRoster(prev => prev.map(p => p.rowId === rowId ? { ...p, paymentStatus: newStatus } : p));
    await supabase.from("event_participants").update({ payment_status: newStatus }).eq("id", rowId);
  }

  async function removeFromEvent(rowId: string) {
    await supabase.from("event_participants").delete().eq("id", rowId);
    setRoster(prev => prev.filter(p => p.rowId !== rowId));
    setConfirmRemoveId(null);
    setOpenMenu(null);
    fireToast("Player Removed!", "success");
  }

  async function addAnonymousPlayers() {
    if (!event) return;
    const count = Math.max(1, Number(anonymousAddCount) || 1);
    const name = anonymousName.trim() || "Guest";
    setAddingGuests(true);
    const { data, error } = await supabase
      .from("event_participants")
      .insert(Array.from({ length: count }, () => ({ event_id: event.id, guest_name: name, payment_status: "unpaid" })))
      .select("id, payment_status, position, guest_name");
    setAddingGuests(false);
    if (error || !data) return;
    setRoster(prev => [
      ...prev,
      ...data.map(r => ({
        id: `guest-${r.id}`,
        rowId: r.id as string,
        name: r.guest_name ?? name,
        avatar: null,
        position: r.position ?? null,
        paymentStatus: r.payment_status as PaymentStatus,
        isGuest: true,
      })),
    ]);
    setAnonymousAddCount("1");
    fireToast(`${count} Guest${count > 1 ? "s" : ""} Added!`, "success");
  }

  async function moveToWaitlist(playerId: string) {
    const player = roster.find(p => p.id === playerId);
    if (!player) return;
    await Promise.all([
      supabase.from("event_participants").delete().eq("event_id", event!.id).eq("player_id", playerId),
      supabase.from("event_requests").insert({ event_id: event!.id, player_id: playerId, kind: "waitlist", status: "pending", position: player.position }),
    ]);
    setRoster(prev => prev.filter(p => p.id !== playerId));
    setWaitlist(prev => [...prev, { id: player.id, name: player.name, avatar: player.avatar, position: player.position }]);
    setOpenMenu(null);
  }

  async function addToRosterFromWaitlist(playerId: string) {
    const player = waitlist.find(p => p.id === playerId);
    if (!player) return;
    await Promise.all([
      supabase.from("event_requests").delete().eq("event_id", event!.id).eq("player_id", playerId).eq("kind", "waitlist"),
      supabase.from("event_participants").insert({ event_id: event!.id, player_id: playerId, payment_status: "unpaid", position: player.position }),
    ]);
    setWaitlist(prev => prev.filter(p => p.id !== playerId));
    setRoster(prev => [...prev, { id: player.id, name: player.name, avatar: player.avatar, position: player.position, paymentStatus: "unpaid" }]);
    const { error: notifyErr } = await supabase.from("notifications").insert({
      recipient_id: playerId, type: "waitlist_promoted", title: "You're In!",
      body: `A spot opened up in "${event!.title}" — you've been moved from the waitlist to the roster.`,
      event_id: event!.id,
    });
    if (notifyErr) console.error("Failed to send waitlist-promotion notification:", notifyErr);
  }

  async function updatePosition(rowId: string, position: string) {
    setRoster(prev => prev.map(p => p.rowId === rowId ? { ...p, position } : p));
    await supabase.from("event_participants").update({ position }).eq("id", rowId);
    setEditPositionId(null);
  }

  async function removeFromWaitlist(playerId: string) {
    await supabase.from("event_requests").delete().eq("event_id", event!.id).eq("player_id", playerId).eq("kind", "waitlist");
    setWaitlist(prev => prev.filter(p => p.id !== playerId));
    setConfirmWaitlistRemId(null);
    setOpenMenu(null);
    fireToast("Player Removed!", "success");
  }

  async function approveRequest(playerId: string) {
    const player = requests.find(p => p.id === playerId);
    if (!player) return;
    await Promise.all([
      supabase.from("event_requests").delete().eq("event_id", event!.id).eq("player_id", playerId).eq("kind", "request"),
      supabase.from("event_participants").insert({ event_id: event!.id, player_id: playerId, payment_status: "unpaid", position: player.position }),
    ]);
    setRequests(prev => prev.filter(p => p.id !== playerId));
    setRoster(prev => [...prev, { id: player.id, name: player.name, avatar: player.avatar, position: player.position, paymentStatus: "unpaid" }]);
    fireToast("Request Approved!", "success");
  }

  async function rejectRequest(playerId: string) {
    await supabase.from("event_requests").delete().eq("event_id", event!.id).eq("player_id", playerId).eq("kind", "request");
    setRequests(prev => prev.filter(p => p.id !== playerId));
  }

  async function publishEvent(publishedAt: string | null) {
    const { error } = await supabase.from("events").update({ status: "upcoming", published_at: publishedAt }).eq("id", event!.id);
    if (error) return;
    setEvent(prev => prev ? { ...prev, status: "upcoming", published_at: publishedAt } : prev);
    setShowPublishModal(false);
    fireToast(publishedAt ? "Event Scheduled!" : "Event Published!", "publish");
  }

  async function publishNow() {
    await publishEvent(null);
    setShowActionDropdown(false);
  }

  async function cancelEvent() {
    await supabase.from("events").update({ status: "canceled" }).eq("id", event!.id);
    setEvent(prev => prev ? { ...prev, status: "canceled" } : prev);
    const recipientIds = roster.filter(p => !p.isGuest).map(p => p.id);
    if (recipientIds.length) {
      const { error: notifyErr } = await supabase.from("notifications").insert(
        recipientIds.map(recipientId => ({
          recipient_id: recipientId, type: "event_canceled", title: "Event Canceled",
          body: `"${event!.title}" (${shortDate(event!.event_date, true)}, ${event!.event_time}) was canceled by the organizer.`,
          event_id: event!.id,
        }))
      );
      if (notifyErr) console.error("Failed to send cancellation notifications:", notifyErr);
    }
    setShowCancelConfirm(false);
    fireToast("Event Canceled!", "success");
  }

  async function reactivateEvent() {
    await supabase.from("events").update({ status: "upcoming" }).eq("id", event!.id);
    setEvent(prev => prev ? { ...prev, status: "upcoming" } : prev);
    setShowReactivateConfirm(false);
    fireToast("Event Reactivated!", "success");
  }

  async function toggleRosterLock() {
    const nextOverride = rosterLocked ? "unlocked" : "locked";
    await supabase.from("events").update({ roster_lock_override: nextOverride }).eq("id", event!.id);
    setEvent(prev => prev ? { ...prev, roster_lock_override: nextOverride } : prev);
    setShowActionDropdown(false);
    fireToast(rosterLocked ? "Roster Unlocked!" : "Roster Locked!", "success");
  }

  async function deleteEvent() {
    await supabase.from("events").delete().eq("id", event!.id);
    setShowDeleteConfirm(false);
    fireToast("Event Deleted!", "success");
    setTimeout(() => navigate("/admin/events"), 1200);
  }

  async function joinAsModerator() {
    if (!authUser || !event) return;
    const { data, error } = await supabase
      .from("event_participants")
      .insert({ event_id: event.id, player_id: authUser.id, payment_status: "unpaid" })
      .select("id, position")
      .single();
    if (error || !data) return;
    setRoster(prev => [
      {
        id: authUser.id,
        rowId: data.id,
        name: authProfile?.name ?? "Me",
        avatar: authProfile?.avatar ?? null,
        position: data.position ?? null,
        paymentStatus: "unpaid",
        isGuest: false,
      },
      ...prev,
    ]);
    fireToast("Joined as Moderator!", "success");
  }

  async function leaveAsModerator() {
    if (!authUser || !event) return;
    await supabase.from("event_participants").delete().eq("event_id", event.id).eq("player_id", authUser.id);
    setRoster(prev => prev.filter(p => p.id !== authUser.id));
    setShowLeaveEventConfirm(false);
    fireToast("Left Event!", "success");
  }

  async function initiateSwap(toAdminId: string, toAdminName: string) {
    if (!authUser || !event) return;
    const { data, error } = await supabase
      .from("moderator_swap_requests")
      .insert({ event_id: event.id, from_admin_id: authUser.id, to_admin_id: toAdminId })
      .select("id")
      .single();
    if (error || !data) { fireToast("Could Not Send Swap Request", "error"); return; }

    const { error: notifyError } = await supabase.from("notifications").insert({
      recipient_id: toAdminId,
      type: "moderator_swap_request",
      title: "Moderator Swap Request",
      body: `${authProfile?.name ?? "The previous admin"} wants to swap moderator duties with you for "${event.title}".`,
      event_id: event.id,
      related_id: data.id,
    });

    setPendingSwap({ id: data.id, to_admin_name: toAdminName });
    setShowSwapMenu(false);

    if (notifyError) {
      console.error("Failed to notify target admin of swap request:", notifyError);
      fireToast(`Swap Request Saved, But ${toAdminName} Wasn't Notified`, "error");
    } else {
      fireToast(`Swap Request Sent To ${toAdminName}!`, "success");
    }
  }

  async function cancelSwap() {
    if (!pendingSwap) return;
    await supabase.from("moderator_swap_requests")
      .update({ status: "canceled", responded_at: new Date().toISOString() })
      .eq("id", pendingSwap.id);
    setPendingSwap(null);
    fireToast("Swap Request Canceled", "success");
  }

  function openSwapMenu(e: React.MouseEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    setSwapMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    setShowSwapMenu(v => !v);
  }

  function openProfile(player: PersonEntry) {
    navDir.forward();
    navigate(`/admin/player/${player.id}`);
    setOpenMenu(null);
  }

  function toggleMenu(key: string) {
    setOpenMenu(prev => prev === key ? null : key);
    setConfirmRemoveId(null);
    setEditPositionId(null);
  }

  // ── Derived ────────────────────────────────────────────────
  const totalPlayers  = roster.length;
  const cashPaid      = roster.filter(p => p.paymentStatus === "cash").length;
  const onlinePaid    = roster.filter(p => p.paymentStatus === "online").length;
  const unpaid        = roster.filter(p => p.paymentStatus === "unpaid").length;
  const collectedCZK  = (cashPaid + onlinePaid) * event.price;

  const isCanceled  = event.status === "canceled";
  const isDraft     = event.status === "draft";
  const isPast      = !isDraft && !isCanceled && isPastDate(event.event_date);
  const isScheduled = !isDraft && !isCanceled && !isPast && !!event.published_at && new Date(event.published_at) > new Date();
  const badgeStatus: EventStatus = isCanceled ? "canceled" : isPast ? "past" : "upcoming";
  const badgeLabel   = isCanceled ? "Canceled" : isPast ? "Past" : "Published";
  const canJoinEvent = authUser?.id === event.moderator_id && !roster.some(p => p.id === authUser.id);
  const canLeaveEvent = authUser?.id === event.moderator_id && roster.some(p => p.id === authUser.id);
  const rosterLocked = isRosterLocked(event.event_date, event.roster_lock_override);
  const showLockToggle = !isDraft && !isCanceled && !isScheduled;

  return (
    <div className="min-h-screen bg-[#0e1621] text-white font-sans">
      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onHide={hideToast} />

      {/* ── Publish / Schedule modal ─────────────────────────── */}
      {showPublishModal && (
        <PublishEventModal
          initial={event.published_at}
          onClose={() => setShowPublishModal(false)}
          onConfirm={publishEvent}
        />
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
              <button onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#79828b] font-bold text-sm hover:text-white transition-colors">
                Back
              </button>
              <button onClick={cancelEvent}
                className="flex-1 py-2.5 rounded-xl bg-[#eab308]/10 border border-[#eab308]/30 text-[#eab308] font-bold text-sm transition-transform">
                Cancel Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reactivate confirm ───────────────────────────────── */}
      {showReactivateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#17212b] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#eab308]/10 border border-[#eab308]/20 flex items-center justify-center shrink-0">
                <RotateCcw size={18} className="text-[#eab308]" />
              </div>
              <div>
                <h3 className="font-black italic uppercase tracking-widest text-white text-base">Reactivate Event?</h3>
                <p className="text-[#79828b] text-xs">Players will be able to join again.</p>
              </div>
            </div>
            <p className="text-[#79828b] text-sm mb-5">
              <span className="text-white font-bold">{event.title}</span> will go back to Published.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowReactivateConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#79828b] font-bold text-sm hover:text-white transition-colors">
                Back
              </button>
              <button onClick={reactivateEvent}
                className="flex-1 py-2.5 rounded-xl bg-[#eab308]/10 border border-[#eab308]/30 text-[#eab308] font-bold text-sm transition-transform">
                Reactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Leave event confirm ──────────────────────────────── */}
      {showLeaveEventConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#17212b] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                <UserMinus size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-black italic uppercase tracking-widest text-white text-base">Leave Event?</h3>
                <p className="text-[#79828b] text-xs">You'll be removed from the roster.</p>
              </div>
            </div>
            <p className="text-[#79828b] text-sm mb-5">
              You'll no longer be a participant in <span className="text-white font-bold">{event.title}</span>. You can rejoin later from here.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowLeaveEventConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#79828b] font-bold text-sm hover:text-white transition-colors">
                Back
              </button>
              <button onClick={leaveAsModerator}
                className="flex-1 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-sm transition-transform">
                Leave Event
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
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#79828b] font-bold text-sm hover:text-white transition-colors">
                Back
              </button>
              <button onClick={deleteEvent}
                className="flex-1 py-2.5 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] font-bold text-sm transition-transform">
                Delete
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
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded inline-block ${getCategoryStyle(event.category ?? "")}`}>
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
                {event.moderator?.avatar ? (
                  <img
                    src={event.moderator.avatar}
                    alt={event.moderator.name}
                    className="w-11 h-11 rounded-full object-cover border border-white/10"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <User size={18} className="text-white/30" />
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#3390ec] rounded-full flex items-center justify-center border-2 border-[#17212b]">
                  <CheckCircle2 size={10} className="text-white" strokeWidth={3} />
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#79828b] uppercase tracking-widest leading-tight">Moderator</div>
                <div className="text-white font-bold text-sm">{event.moderator?.name ?? "—"}</div>
              </div>
            </div>
            {authUser?.id !== event.moderator_id ? (
              <button
                onClick={() => { navDir.forward(); navigate(`/admin/player/${event.moderator_id}`); }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors text-[#79828b]"
              >
                <User size={16} />
              </button>
            ) : pendingSwap ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#eab308] px-2 py-1 bg-[#eab308]/10 rounded-full whitespace-nowrap">
                  Swap Pending
                </span>
                <button
                  onClick={cancelSwap}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors text-[#79828b]"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={openSwapMenu}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors text-[#79828b]"
              >
                <ArrowLeftRight size={16} />
              </button>
            )}

            {showSwapMenu && swapMenuPos && createPortal(
              <div
                onMouseDown={e => e.stopPropagation()}
                style={{ position: "fixed", top: swapMenuPos.top, right: swapMenuPos.right, zIndex: 40 }}
                className="bg-[#222f3e] border border-white/10 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] overflow-hidden w-64 max-h-80 overflow-y-auto"
              >
                {otherAdmins.length === 0 && (
                  <p className="text-[#79828b] text-xs text-center py-6 px-4">No other admins available</p>
                )}
                {otherAdmins.map(a => (
                  <button
                    key={a.id}
                    onClick={() => initiateSwap(a.id, a.name)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                  >
                    {a.avatar ? (
                      <img src={a.avatar} alt={a.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                        <User size={14} className="text-white/30" />
                      </div>
                    )}
                    <span className="flex-1 text-white font-bold text-sm truncate">{a.name}</span>
                    <ArrowLeftRight size={14} className="text-[#79828b] shrink-0" />
                  </button>
                ))}
              </div>,
              document.body
            )}
          </div>

          {/* Info panel */}
          <div className="bg-[#17212b] border border-white/5 rounded-xl flex flex-col">
            <div className="flex justify-between items-center p-3 border-b border-white/5 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <Calendar size={16} className="text-[#3390ec]" />
                <span className="text-sm font-semibold text-white/90">{shortDate(event.event_date, true)}</span>
              </div>
              <div className="hidden sm:block w-[1px] h-4 bg-white/10" />
              <div className="flex items-center gap-2.5">
                <Clock size={16} className="text-[#3390ec]" />
                <span className="text-sm font-semibold text-white/90">{event.event_time}</span>
              </div>
              <div className="hidden sm:block w-[1px] h-4 bg-white/10" />
              <div className="flex items-center gap-2.5">
                <Ticket size={16} className="text-[#3390ec]" />
                <span className="text-sm font-semibold text-white/90">{event.price_label ?? "FREE"}</span>
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
                {collectedCZK.toLocaleString()} / {(event.capacity * event.price).toLocaleString()} CZK
              </span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3 flex">
              <div className="h-full bg-[#4dcd5e] transition-all" style={{ width: event.capacity > 0 ? `${(cashPaid / event.capacity) * 100}%` : "0%" }} />
              <div className="h-full bg-[#3390ec] transition-all" style={{ width: event.capacity > 0 ? `${(onlinePaid / event.capacity) * 100}%` : "0%" }} />
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

            {/* Status CTA + actions dropdown */}
            <div className="relative" onMouseDown={e => e.stopPropagation()}>
              <button
                onClick={() => setShowActionDropdown(v => !v)}
                className={`w-36 py-2 px-3 flex items-center justify-between rounded-lg font-bold text-sm transition-all ${
                  isDraft || isScheduled ? "bg-[#3390ec] text-white shadow-sm" : getStatusStyle(badgeStatus)
                }`}
              >
                <span>{isDraft ? "Publish" : isScheduled ? "Scheduled" : badgeLabel}</span>
                <ChevronDown size={13} className={`transition-transform duration-200 shrink-0 ${showActionDropdown ? "rotate-180" : ""}`} />
              </button>

              {showActionDropdown && (
                <div className="absolute right-0 top-full mt-1.5 bg-[#222f3e] border border-white/10 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.6)] z-20 overflow-hidden w-44">
                  {isDraft && (
                    <button
                      onClick={() => { setShowPublishModal(true); setShowActionDropdown(false); }}
                      className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-bold text-[#3390ec] hover:bg-[#3390ec]/5 transition-colors text-left"
                    >
                      <Send size={14} />
                      Publish…
                    </button>
                  )}
                  {isScheduled && (
                    <>
                      <button
                        onClick={publishNow}
                        className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-bold text-[#3390ec] hover:bg-[#3390ec]/5 transition-colors text-left"
                      >
                        <Send size={14} />
                        Publish Now
                      </button>
                      <button
                        onClick={() => { setShowPublishModal(true); setShowActionDropdown(false); }}
                        className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-bold text-[#3390ec] hover:bg-[#3390ec]/5 transition-colors text-left border-t border-white/5"
                      >
                        <Calendar size={14} />
                        Reschedule…
                      </button>
                    </>
                  )}
                  {canJoinEvent && (
                    <button
                      onClick={() => { joinAsModerator(); setShowActionDropdown(false); }}
                      className={`flex items-center gap-2.5 w-full px-4 py-3 text-sm font-bold text-white hover:bg-white/5 transition-colors text-left ${(isDraft || isScheduled) ? "border-t border-white/5" : ""}`}
                    >
                      <UserPlus size={14} />
                      Join Event
                    </button>
                  )}
                  {showLockToggle && (
                    <button
                      onClick={toggleRosterLock}
                      className={`flex items-center gap-2.5 w-full px-4 py-3 text-sm font-bold text-white hover:bg-white/5 transition-colors text-left ${canJoinEvent ? "border-t border-white/5" : ""}`}
                    >
                      {rosterLocked ? <Unlock size={14} /> : <Lock size={14} />}
                      {rosterLocked ? "Unlock Roster" : "Lock Roster"}
                    </button>
                  )}
                  {canLeaveEvent && (
                    <button
                      onClick={() => { setShowLeaveEventConfirm(true); setShowActionDropdown(false); }}
                      className={`flex items-center gap-2.5 w-full px-4 py-3 text-sm font-bold text-white hover:bg-white/5 transition-colors text-left ${(isDraft || isScheduled || canJoinEvent || showLockToggle) ? "border-t border-white/5" : ""}`}
                    >
                      <UserMinus size={14} />
                      Leave Event
                    </button>
                  )}
                  {!isDraft && (
                    isCanceled ? (
                      <button
                        onClick={() => { setShowReactivateConfirm(true); setShowActionDropdown(false); }}
                        className={`flex items-center gap-2.5 w-full px-4 py-3 text-sm font-bold text-[#eab308] hover:bg-[#eab308]/5 transition-colors text-left ${(isScheduled || canJoinEvent || canLeaveEvent || showLockToggle) ? "border-t border-white/5" : ""}`}
                      >
                        <RotateCcw size={14} />
                        Reactivate Event
                      </button>
                    ) : (
                      <button
                        onClick={() => { setShowCancelConfirm(true); setShowActionDropdown(false); }}
                        className={`flex items-center gap-2.5 w-full px-4 py-3 text-sm font-bold text-[#eab308] hover:bg-[#eab308]/5 transition-colors text-left ${(isScheduled || canJoinEvent || canLeaveEvent || showLockToggle) ? "border-t border-white/5" : ""}`}
                      >
                        <Ban size={14} />
                        Cancel Event
                      </button>
                    )
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
              style={{ width: `${event.capacity > 0 ? Math.min((totalPlayers / event.capacity) * 100, 100) : 0}%` }}
            />
          </div>

          {/* Anonymous player card */}
          <div className="mx-0 mb-7">
            <div className="bg-[#17212b] border border-dashed border-white/[0.12] rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-[#0e1621] bg-white/5 flex items-center justify-center shrink-0">
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
                    className="w-full bg-transparent border-b border-white/20 text-white font-bold text-sm outline-none"
                  />
                ) : (
                  <button onClick={() => setEditingAnonName(true)} className="flex items-center gap-1.5 group">
                    <span className="font-bold text-white/40 text-sm group-hover:text-white/60 transition-colors">
                      {anonymousName}
                    </span>
                    <Pencil size={10} className="text-white/20 group-hover:text-white/40 transition-colors" />
                  </button>
                )}
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={anonymousAddCount}
                onChange={e => setAnonymousAddCount(e.target.value.replace(/[^0-9]/g, ""))}
                onBlur={() => setAnonymousAddCount(v => (!v || Number(v) < 1) ? "1" : v)}
                className="w-10 h-8 bg-white/5 border border-white/10 rounded-lg text-white font-black text-sm text-center outline-none focus:border-white/25 shrink-0"
              />
              <button
                onClick={addAnonymousPlayers}
                disabled={addingGuests}
                className="px-3 h-8 flex items-center justify-center gap-1 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-colors shrink-0 bg-white/5 border-white/10 text-[#79828b] hover:text-white hover:border-white/25 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          {/* Roster list */}
          <div className="flex flex-col gap-2 mb-8">
            {roster.length === 0 && (
              <p className="text-[#79828b] text-sm text-center py-6">No players on roster yet</p>
            )}
            {roster.map(player => (
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
                    {player.position && <div className="text-[#79828b] text-[11px] uppercase tracking-wider">{player.position}</div>}
                  </div>
                  {event.price > 0 && (
                    <PaymentToggle status={player.paymentStatus} onConfirm={s => confirmPayment(player.rowId, s)} />
                  )}
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
                          onClick={() => removeFromEvent(player.rowId)}
                          className="px-3 py-1.5 bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] text-[11px] font-black uppercase tracking-wider rounded-lg"
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
                    ) : editPositionId === player.id ? (
                      <div className="flex items-center gap-2 px-4 py-3">
                        <div className="relative flex-1">
                          <select value={editPositionValue} onChange={e => setEditPositionValue(e.target.value)}
                            style={{ colorScheme: "dark" }}
                            className="w-full h-9 bg-[#17212b] border border-white/10 rounded-lg pl-2 pr-7 text-white text-xs font-bold focus:outline-none focus:border-[#3390ec]/50 transition-colors appearance-none">
                            {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#79828b] pointer-events-none" />
                        </div>
                        <button
                          onClick={() => updatePosition(player.rowId, editPositionValue)}
                          className="px-3 py-1.5 bg-[#3390ec]/10 border border-[#3390ec]/30 text-[#3390ec] text-[11px] font-black uppercase tracking-wider rounded-lg"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditPositionId(null)}
                          className="px-3 py-1.5 bg-white/5 text-[#79828b] text-[11px] font-black uppercase tracking-wider rounded-lg hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {!player.isGuest && <MenuAction icon={<User size={14} />} label="View Profile" onClick={() => openProfile(player)} />}
                        <MenuAction icon={<Pencil size={14} />} label="Edit Position" onClick={() => { setEditPositionValue(player.position && POSITIONS.includes(player.position) ? player.position : POSITIONS[0]); setEditPositionId(player.id); }} />
                        {!player.isGuest && <MenuAction icon={<ArrowDownToLine size={14} />} label="Move to Waitlist" onClick={() => moveToWaitlist(player.id)} />}
                        <MenuAction icon={<Trash2 size={14} />} label="Remove from Event" danger onClick={() => setConfirmRemoveId(player.id)} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── PENDING REQUESTS ──────────────────────────────── */}
          <SectionHeader label="Requests" count={String(requests.length)} accent={requests.length > 0 ? "yellow" : undefined} />
          <div className="flex flex-col gap-2 mb-8">
            {requests.length === 0 && (
              <p className="text-[#79828b] text-sm text-center py-6">No pending requests</p>
            )}
            {requests.map(player => (
              <div key={player.id} className="flex items-center gap-2 p-3 bg-[#17212b] border border-white/5 rounded-xl">
                {player.avatar
                  ? <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full border-2 border-[#0e1621] object-cover shrink-0" />
                  : <div className="w-10 h-10 rounded-full border-2 border-[#0e1621] bg-white/5 flex items-center justify-center shrink-0"><User size={16} className="text-white/30" /></div>
                }
                <button onClick={() => openProfile(player)} className="flex-1 min-w-0 text-left">
                  <div className="font-bold text-white text-sm truncate">{player.name}</div>
                </button>
                <button
                  onClick={() => rejectRequest(player.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] shrink-0"
                >
                  <X size={14} />
                </button>
                <button
                  onClick={() => approveRequest(player.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#4dcd5e]/10 border border-[#4dcd5e]/30 text-[#4dcd5e] shrink-0"
                >
                  <Check size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* ── WAITLIST ──────────────────────────────────────── */}
          <SectionHeader label="Waitlist" count={String(waitlist.length)} />

          <div className="flex flex-col gap-2 mb-3">
            {waitlist.length === 0 && (
              <p className="text-[#79828b] text-sm text-center py-6">No players on waitlist</p>
            )}
            {waitlist.map(player => (
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
                  </div>
                  <button
                    onClick={() => addToRosterFromWaitlist(player.id)}
                    className="w-[76px] h-8 flex items-center justify-center gap-1 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-colors shrink-0 bg-[#3390ec]/10 border-[#3390ec]/30 text-[#3390ec] hover:bg-[#3390ec]/20"
                  >
                    <CheckCheck size={12} />
                    Add
                  </button>
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
                          className="px-3 py-1.5 bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] text-[11px] font-black uppercase tracking-wider rounded-lg"
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

function SectionHeader({ label, count, accent }: { label: string; count: string; accent?: "yellow" }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-black italic text-base text-white uppercase tracking-widest">{label}</h2>
      <span className={`text-[11px] font-black px-2 py-0.5 rounded ${
        accent === "yellow" ? "bg-[#eab308]/10 text-[#eab308]" : "bg-white/5 text-[#79828b]"
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
