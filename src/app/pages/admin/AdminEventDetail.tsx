import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router";
import {
  ChevronDown, ChevronUp, MoreVertical,
  CreditCard, Banknote, User, ArrowDownToLine,
  Trash2, CheckCheck, Share2, Send, Ban, RotateCcw, UserPlus, UserMinus,
  MapPin, Calendar, Clock, Ticket, Pencil, X, ArrowLeftRight, Lock, Unlock,
  FileText, Download,
} from "lucide-react";
import { BackBar } from "../../components/ui/BackBar";
import { DropdownPanel, DropdownItem, ConfirmDropdownItem } from "../../components/ui/DropdownMenu";
import { ProfileRow } from "../../components/ui/ProfileRow";
import { SelectField } from "../../components/ui/SelectField";
import { VerifiedBadge } from "../../components/ui/VerifiedBadge";
import { TrustDot } from "../../components/ui/TrustDot";
import { LevelBookmark } from "../../components/ui/LevelBookmark";
import { CategoryIcon } from "../../components/ui/CategoryIcon";
import { getStatusStyle, POSITIONS, positionLabel, type PaymentStatus, type EventStatus } from "../../data/adminData";
import { navDir } from "../../lib/navDir";
import { Toast } from "../../components/ui/Toast";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";
import { shortDate, isPastDate, isRosterLocked } from "../../lib/eventDate";
import { encodeNotification } from "../../lib/notificationText";
import { PublishEventModal } from "../../components/PublishEventModal";
import { useWaterRipple, RippleLayer } from "../../components/ui/useWaterRipple";
import { useLang } from "../../i18n";
import { useExclusiveOpen } from "../../lib/exclusiveOpen";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
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

type RosterEntry = { id: string; rowId: string; name: string; avatar: string | null; position: string | null; teamName: string | null; paymentStatus: PaymentStatus; isGuest: boolean; verified: boolean; trustLabel: string | null; sortOrder: number };
type PersonEntry = { id: string; name: string; avatar: string | null; position: string | null; teamName: string | null };

export function AdminEventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLang();
  const { user: authUser, profile: authProfile, refreshAdminActivity } = useAuth();
  const statusRipple = useWaterRipple();

  const [event, setEvent] = useState<EventRow | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [requests, setRequests] = useState<PersonEntry[]>([]);
  const [waitlist, setWaitlist] = useState<PersonEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Roster/waitlist rows in the middle of a leave (fading + sliding out
  // before their actual removal from state) or a just-added entrance -
  // ids only, so `roster.map`/`waitlist.map` can look them up per-row.
  const [leavingRosterIds,   setLeavingRosterIds]   = useState<Set<string>>(new Set());
  const [enteringRosterIds,  setEnteringRosterIds]  = useState<Set<string>>(new Set());
  const [leavingWaitlistIds, setLeavingWaitlistIds] = useState<Set<string>>(new Set());
  const [enteringWaitlistIds, setEnteringWaitlistIds] = useState<Set<string>>(new Set());

  function markEntering(setFn: React.Dispatch<React.SetStateAction<Set<string>>>, ids: string[]) {
    setFn(prev => { const next = new Set(prev); ids.forEach(id => next.add(id)); return next; });
    window.setTimeout(() => {
      setFn(prev => { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next; });
    }, 280);
  }

  // Plays the exit transition, then applies the real state removal after it
  // finishes - the id stays in `leaving` (and thus still renders) until then.
  function withExit(setLeaving: React.Dispatch<React.SetStateAction<Set<string>>>, id: string, remove: () => void) {
    setLeaving(prev => new Set(prev).add(id));
    window.setTimeout(() => {
      remove();
      setLeaving(prev => { const next = new Set(prev); next.delete(id); return next; });
    }, 200);
  }

  const [openMenu,             setOpenMenu]             = useState<string | null>(null);
  useExclusiveOpen(openMenu !== null, () => setOpenMenu(null));
  const [editTeamNameId,       setEditTeamNameId]       = useState<string | null>(null);
  const [editTeamNameValue,    setEditTeamNameValue]    = useState("");
  const [confirmRemoveId,      setConfirmRemoveId]      = useState<string | null>(null);
  const [confirmWaitlistRemId, setConfirmWaitlistRemId] = useState<string | null>(null);
  const [confirmRejectId,      setConfirmRejectId]      = useState<string | null>(null);
  const [showActionDropdown,   setShowActionDropdown]   = useState(false);
  useExclusiveOpen(showActionDropdown, () => setShowActionDropdown(false));
  const [showPublishModal,     setShowPublishModal]     = useState(false);
  const statusBtnRef = useRef<HTMLButtonElement>(null);
  const [publishModalOrigin, setPublishModalOrigin] = useState<{ x: number; y: number } | null>(null);

  function openPublishModal() {
    const rect = statusBtnRef.current?.getBoundingClientRect();
    setPublishModalOrigin(rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null);
    setShowPublishModal(true);
    setShowActionDropdown(false);
  }
  const [armedAction,          setArmedAction]          = useState<"cancel" | "reactivate" | "delete" | "leave" | null>(null);
  const [otherAdmins,          setOtherAdmins]          = useState<{ id: string; name: string; avatar: string | null }[]>([]);
  const [pendingSwap,          setPendingSwap]          = useState<{ id: string; to_admin_name: string } | null>(null);
  const [showSwapMenu,         setShowSwapMenu]         = useState(false);
  const swapBtnRef = useRef<HTMLButtonElement>(null);
  const swapMenuRef = useRef<HTMLDivElement>(null);
  useExclusiveOpen(
    showSwapMenu,
    () => setShowSwapMenu(false),
    t => (swapBtnRef.current?.contains(t) || swapMenuRef.current?.contains(t)) ?? false,
    swapBtnRef.current
  );
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
      supabase.from("event_participants").select("id, player_id, guest_name, payment_status, joined_at, position, team_name, sort_order, profiles(id, name, avatar, position, is_verified, visible_trust_label)").eq("event_id", eventId).order("sort_order", { ascending: true }),
      supabase.from("event_requests").select("player_id, kind, created_at, position, team_name, profiles(id, name, avatar)").eq("event_id", eventId).order("created_at", { ascending: true }),
    ]);

    if (error || !eventRow) { setNotFound(true); setLoading(false); return; }

    setEvent(eventRow as unknown as EventRow);
    const rosterMapped = (participantRows ?? []).map(p => ({
      id: p.profiles?.id ?? `guest-${p.id}`,
      rowId: p.id,
      name: p.profiles?.name ?? p.guest_name ?? "Unknown",
      avatar: p.profiles?.avatar ?? null,
      position: p.position ?? p.profiles?.position ?? null,
      teamName: p.team_name ?? null,
      paymentStatus: p.payment_status as PaymentStatus,
      isGuest: !p.player_id,
      verified: p.profiles?.is_verified ?? false,
      trustLabel: p.profiles?.visible_trust_label ?? null,
      sortOrder: p.sort_order,
    }));
    setRoster(rosterMapped);
    setRequests((requestRows ?? []).filter(r => r.kind === "request").map(r => ({
      id: r.profiles?.id ?? r.player_id, name: r.profiles?.name ?? "Unknown", avatar: r.profiles?.avatar ?? null,
      position: r.position ?? r.profiles?.position ?? null,
      teamName: r.team_name ?? null,
    })));
    setWaitlist((requestRows ?? []).filter(r => r.kind === "waitlist").map(r => ({
      id: r.profiles?.id ?? r.player_id, name: r.profiles?.name ?? "Unknown", avatar: r.profiles?.avatar ?? null,
      position: r.position ?? r.profiles?.position ?? null,
      teamName: r.team_name ?? null,
    })));
    setLoading(false);
  }

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    load(id);
  }, [id]);

  // Clears this event's contribution to the Admin nav dot (038, 039) -
  // opening it is what "I've seen this event's new signups/requests" means.
  // Explicitly re-checks afterwards so the dot disappears instantly instead
  // of waiting for the next route change to notice.
  useEffect(() => {
    if (!event || !authUser) return;
    supabase.from("admin_event_seen").upsert(
      { admin_id: authUser.id, event_id: event.id, seen_at: new Date().toISOString() },
      { onConflict: "admin_id,event_id" },
    ).then(() => refreshAdminActivity());
  }, [event?.id, authUser?.id]);

  useEffect(() => {
    if (!confirmRemoveId) return;
    const t = setTimeout(() => setConfirmRemoveId(null), 3000);
    return () => clearTimeout(t);
  }, [confirmRemoveId]);

  useEffect(() => {
    if (!confirmWaitlistRemId) return;
    const t = setTimeout(() => setConfirmWaitlistRemId(null), 3000);
    return () => clearTimeout(t);
  }, [confirmWaitlistRemId]);

  useEffect(() => {
    if (!confirmRejectId) return;
    const t = setTimeout(() => setConfirmRejectId(null), 3000);
    return () => clearTimeout(t);
  }, [confirmRejectId]);

  useEffect(() => {
    function close() {
      setShowActionDropdown(false);
      setArmedAction(null);
      setOpenMenu(null);
      setShowSwapMenu(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (!armedAction) return;
    const t = setTimeout(() => setArmedAction(null), 3000);
    return () => clearTimeout(t);
  }, [armedAction]);

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

  if (loading) return <div className="min-h-screen bg-[var(--surface-0)]" />;

  if (notFound || !event) {
    return (
      <div>
        <BackBar label={t.nav.events} to="/admin/events" />
        <div className="flex items-center justify-center min-h-[60vh] text-[#79828b]">
          <p className="font-bold">{t.admin.eventNotFound}</p>
        </div>
      </div>
    );
  }

  // ── Actions ────────────────────────────────────────────────
  async function confirmPayment(rowId: string, newStatus: PaymentStatus) {
    setRoster(prev => prev.map(p => p.rowId === rowId ? { ...p, paymentStatus: newStatus } : p));
    await supabase.from("event_participants").update({ payment_status: newStatus }).eq("id", rowId);
  }

  function moveRoster(rowId: string, direction: "up" | "down") {
    const idx = roster.findIndex(p => p.rowId === rowId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx === -1 || swapIdx < 0 || swapIdx >= roster.length) return;
    const a = roster[idx];
    const b = roster[swapIdx];
    const next = [...roster];
    next[idx] = { ...b, sortOrder: a.sortOrder };
    next[swapIdx] = { ...a, sortOrder: b.sortOrder };
    setRoster(next);
    supabase.from("event_participants").update({ sort_order: b.sortOrder }).eq("id", a.rowId).then();
    supabase.from("event_participants").update({ sort_order: a.sortOrder }).eq("id", b.rowId).then();
  }

  async function removeFromEvent(rowId: string) {
    await supabase.from("event_participants").delete().eq("id", rowId);
    setConfirmRemoveId(null);
    setOpenMenu(null);
    fireToast("Player Removed!", "success");
    const player = roster.find(p => p.rowId === rowId);
    if (!player) { setRoster(prev => prev.filter(p => p.rowId !== rowId)); return; }
    withExit(setLeavingRosterIds, player.id, () => setRoster(prev => prev.filter(p => p.rowId !== rowId)));
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
    const newRows = data.map(r => ({
      id: `guest-${r.id}`,
      rowId: r.id as string,
      name: r.guest_name ?? name,
      avatar: null,
      position: r.position ?? null,
      teamName: null,
      paymentStatus: r.payment_status as PaymentStatus,
      isGuest: true,
    }));
    setRoster(prev => [...prev, ...newRows]);
    markEntering(setEnteringRosterIds, newRows.map(r => r.id));
    setAnonymousAddCount("1");
    fireToast(`${count} Guest${count > 1 ? "s" : ""} Added!`, "success");
  }

  async function moveToWaitlist(playerId: string) {
    const player = roster.find(p => p.id === playerId);
    if (!player) return;
    await Promise.all([
      supabase.from("event_participants").delete().eq("event_id", event!.id).eq("player_id", playerId),
      supabase.from("event_requests").insert({ event_id: event!.id, player_id: playerId, kind: "waitlist", status: "pending", position: player.position, team_name: player.teamName }),
    ]);
    setOpenMenu(null);
    withExit(setLeavingRosterIds, playerId, () => {
      setRoster(prev => prev.filter(p => p.id !== playerId));
      setWaitlist(prev => [...prev, { id: player.id, name: player.name, avatar: player.avatar, position: player.position, teamName: player.teamName }]);
      markEntering(setEnteringWaitlistIds, [playerId]);
    });
  }

  async function addToRosterFromWaitlist(playerId: string) {
    const player = waitlist.find(p => p.id === playerId);
    if (!player) return;
    await Promise.all([
      supabase.from("event_requests").delete().eq("event_id", event!.id).eq("player_id", playerId).eq("kind", "waitlist"),
      supabase.from("event_participants").insert({ event_id: event!.id, player_id: playerId, payment_status: "unpaid", position: player.position, team_name: player.teamName }),
    ]);
    withExit(setLeavingWaitlistIds, playerId, () => {
      setWaitlist(prev => prev.filter(p => p.id !== playerId));
      setRoster(prev => [...prev, { id: player.id, name: player.name, avatar: player.avatar, position: player.position, teamName: player.teamName, paymentStatus: "unpaid" }]);
      markEntering(setEnteringRosterIds, [playerId]);
    });
  }

  async function updatePosition(rowId: string, position: string) {
    setRoster(prev => prev.map(p => p.rowId === rowId ? { ...p, position } : p));
    await supabase.from("event_participants").update({ position }).eq("id", rowId);
  }

  async function updateTeamName(rowId: string, teamName: string) {
    const value = teamName.trim() || null;
    setRoster(prev => prev.map(p => p.rowId === rowId ? { ...p, teamName: value } : p));
    await supabase.from("event_participants").update({ team_name: value }).eq("id", rowId);
    setEditTeamNameId(null);
  }

  async function removeFromWaitlist(playerId: string) {
    await supabase.from("event_requests").delete().eq("event_id", event!.id).eq("player_id", playerId).eq("kind", "waitlist");
    setConfirmWaitlistRemId(null);
    setOpenMenu(null);
    fireToast("Player Removed!", "success");
    withExit(setLeavingWaitlistIds, playerId, () => setWaitlist(prev => prev.filter(p => p.id !== playerId)));
  }

  async function approveRequest(playerId: string) {
    const player = requests.find(p => p.id === playerId);
    if (!player) return;
    await Promise.all([
      supabase.from("event_requests").delete().eq("event_id", event!.id).eq("player_id", playerId).eq("kind", "request"),
      supabase.from("event_participants").insert({ event_id: event!.id, player_id: playerId, payment_status: "unpaid", position: player.position, team_name: player.teamName }),
    ]);
    setRequests(prev => prev.filter(p => p.id !== playerId));
    setRoster(prev => [...prev, { id: player.id, name: player.name, avatar: player.avatar, position: player.position, teamName: player.teamName, paymentStatus: "unpaid" }]);
    fireToast("Request Approved!", "success");
  }

  async function rejectRequest(playerId: string) {
    await supabase.from("event_requests").delete().eq("event_id", event!.id).eq("player_id", playerId).eq("kind", "request");
    setRequests(prev => prev.filter(p => p.id !== playerId));
    setConfirmRejectId(null);
    setOpenMenu(null);
    fireToast("Request Rejected!", "success");
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
          body: encodeNotification({ k: "event_canceled", eventTitle: event!.title, date: event!.event_date, time: event!.event_time }),
          event_id: event!.id,
        }))
      );
      if (notifyErr) console.error("Failed to send cancellation notifications:", notifyErr);
    }
    setArmedAction(null);
    setShowActionDropdown(false);
    fireToast("Event Canceled!", "success");
  }

  async function reactivateEvent() {
    await supabase.from("events").update({ status: "upcoming" }).eq("id", event!.id);
    setEvent(prev => prev ? { ...prev, status: "upcoming" } : prev);
    setArmedAction(null);
    setShowActionDropdown(false);
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
    setArmedAction(null);
    setShowActionDropdown(false);
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
        teamName: null,
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
    setArmedAction(null);
    setShowActionDropdown(false);
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
      body: encodeNotification({ k: "swap_request", adminName: authProfile?.name ?? null, eventTitle: event.title }),
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
    setEditTeamNameId(null);
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
  const badgeLabel   = isCanceled ? t.event.canceled : isPast ? t.event.past : t.event.published;
  const canJoinEvent = authUser?.id === event.moderator_id && !roster.some(p => p.id === authUser.id);
  const canLeaveEvent = authUser?.id === event.moderator_id && roster.some(p => p.id === authUser.id);
  const rosterLocked = isRosterLocked(event.event_date, event.roster_lock_override);
  const showLockToggle = !isDraft && !isCanceled && !isScheduled;

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--ink)] font-sans">
      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onHide={hideToast} />

      {/* ── Publish / Schedule modal ─────────────────────────── */}
      {showPublishModal && (
        <PublishEventModal
          initial={event.published_at}
          onClose={() => setShowPublishModal(false)}
          onConfirm={publishEvent}
          origin={publishModalOrigin}
        />
      )}

      {/* BackBar with share button */}
      <BackBar label={t.nav.events} to="/admin/events">
        <button
          onClick={() => {
            const url = `${window.location.origin}/events/${event.id}`;
            if (navigator.share) {
              navigator.share({ title: event.title, url });
            } else {
              navigator.clipboard.writeText(url).then(() => fireToast(t.common.linkCopied, "copied"));
            }
          }}
          className="flex items-center gap-1.5 text-[#79828b] hover:text-[var(--ink)] transition-colors text-sm font-bold"
        >
          <Share2 size={16} />
          <span>{t.event.share}</span>
        </button>
      </BackBar>

      <div className="px-4 pb-12 max-w-[640px] mx-auto pt-4">

        {/* ── TOP SECTION ─────────────────────────────────────── */}
        <div className="mb-6">

          {/* Event title + Edit button */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-3xl font-black italic uppercase tracking-tight leading-none text-[var(--ink)] truncate">
                {event.title}
              </h1>
              <CategoryIcon category={event.category} size={20} className="text-[#79828b] shrink-0" />
            </div>
            <button
              onClick={() => navigate(`/admin/events/${event.id}/edit`)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--ink)]/5 text-[#79828b] hover:text-[var(--ink)] hover:bg-[var(--ink)]/10 transition-colors shrink-0"
              title={t.admin.editEvent}
            >
              <Pencil size={14} />
            </button>
          </div>

          {/* Moderator card */}
          <div className="relative mb-4">
            <ProfileRow
              avatar={event.moderator?.avatar ?? null}
              avatarAlt={event.moderator?.name ?? t.event.moderator}
              avatarSize={44}
              eyebrow={t.event.moderator}
              primary={<span className="text-[var(--ink)] font-bold text-sm">{event.moderator?.name ?? "—"}</span>}
              checkmark
              variant="card"
              className="shadow-sm"
              avatarOnly
              onClick={() => { navDir.forward(); navigate(`/admin/player/${event.moderator_id}`); }}
              trailing={
                authUser?.id !== event.moderator_id ? undefined : pendingSwap ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#eab308] px-2 py-1 bg-[#eab308]/10 rounded-full whitespace-nowrap">
                      {t.admin.swapPending}
                    </span>
                    <button
                      onClick={cancelSwap}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--surface-hover)] transition-colors text-[#79828b]"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    ref={swapBtnRef}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={openSwapMenu}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--surface-hover)] transition-colors text-[#79828b]"
                  >
                    <ArrowLeftRight size={16} />
                  </button>
                )
              }
            />

            {showSwapMenu && swapMenuPos && createPortal(
              <div
                ref={swapMenuRef}
                onMouseDown={e => e.stopPropagation()}
                style={{ position: "fixed", top: swapMenuPos.top, right: swapMenuPos.right, zIndex: 40 }}
                className="origin-top-right animate-dropdown-in bg-[var(--surface-1)] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] w-64 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                {otherAdmins.length === 0 && (
                  <p className="text-[#79828b] text-xs text-center py-6 px-4">{t.admin.noOtherAdmins}</p>
                )}
                {otherAdmins.map(a => (
                  <button
                    key={a.id}
                    onClick={() => initiateSwap(a.id, a.name)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-[var(--surface-hover)] transition-colors text-left border-b border-[var(--ink)]/5 last:border-0"
                  >
                    {a.avatar ? (
                      <img src={a.avatar} alt={a.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[var(--ink)]/5 flex items-center justify-center shrink-0">
                        <User size={14} className="text-[var(--ink)]/30" />
                      </div>
                    )}
                    <span className="flex-1 text-[var(--ink)] font-bold text-sm truncate">{a.name}</span>
                    <ArrowLeftRight size={14} className="text-[#79828b] shrink-0" />
                  </button>
                ))}
              </div>,
              document.body
            )}
          </div>

          {/* Info panel */}
          <div className="relative">
            {event.level && <LevelBookmark level={event.level} />}
            <div className="bg-[var(--surface-1)] rounded-2xl overflow-hidden">
              <div className="relative flex items-center gap-2.5 p-3 hover:bg-[var(--surface-hover)] transition-colors before:absolute before:top-0 before:left-3 before:right-3 before:h-px before:bg-[var(--ink)]/[0.06] first:before:hidden">
                <Calendar size={16} className="text-[var(--brand)]" />
                <span className="text-sm font-semibold text-[var(--ink)]/90">{shortDate(event.event_date, t, true)} · {event.event_time}</span>
              </div>
              <div className="relative flex items-center gap-2.5 p-3 hover:bg-[var(--surface-hover)] transition-colors before:absolute before:top-0 before:left-3 before:right-3 before:h-px before:bg-[var(--ink)]/[0.06] first:before:hidden">
                <Ticket size={16} className="text-[var(--brand)]" />
                <span className="text-sm font-semibold text-[var(--ink)]/90">{event.price_label ?? "FREE"}</span>
              </div>
              <div className="relative flex items-center gap-2.5 p-3 hover:bg-[var(--surface-hover)] transition-colors before:absolute before:top-0 before:left-3 before:right-3 before:h-px before:bg-[var(--ink)]/[0.06] first:before:hidden">
                <MapPin size={16} className="text-[var(--brand)]" />
                <span className="text-sm font-semibold text-[var(--ink)]/90 truncate">{event.location}</span>
              </div>
              {event.description && (
                <div className="relative p-3 hover:bg-[var(--surface-hover)] transition-colors before:absolute before:top-0 before:left-3 before:right-3 before:h-px before:bg-[var(--ink)]/[0.06] first:before:hidden">
                  <p className="text-[#79828b] text-xs leading-relaxed">{event.description}</p>
                </div>
              )}
              {event.attachment_url && (
                <a
                  href={event.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={event.attachment_name ?? undefined}
                  className="relative flex items-center gap-2.5 p-3 hover:bg-[var(--surface-hover)] transition-colors before:absolute before:top-0 before:left-3 before:right-3 before:h-px before:bg-[var(--ink)]/[0.06] first:before:hidden"
                >
                  <div className="w-7 h-7 rounded-full bg-[var(--ink)]/5 flex items-center justify-center shrink-0">
                    <FileText size={13} className="text-[var(--ink)]/60" />
                  </div>
                  <span className="text-sm font-semibold text-[var(--ink)]/90 truncate flex-1">{event.attachment_name ?? t.admin.attachment}</span>
                  <Download size={14} className="text-[#79828b] shrink-0" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── PAYMENTS (first) ─────────────────────────────────── */}
        {event.price > 0 && (
          <div className="bg-[var(--surface-1)] rounded-xl p-4 mb-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#79828b] text-[11px] font-black uppercase tracking-widest">{t.admin.payments}</span>
              <span className="text-[var(--ink)] font-black text-sm">
                {collectedCZK.toLocaleString()} / {(event.capacity * event.price).toLocaleString()} CZK
              </span>
            </div>
            <div className="h-2 bg-[var(--ink)]/5 rounded-full overflow-hidden mb-3 flex">
              <div className="h-full bg-[#4dcd5e] transition-all" style={{ width: event.capacity > 0 ? `${(cashPaid / event.capacity) * 100}%` : "0%" }} />
              <div className="h-full bg-[var(--brand)] transition-all" style={{ width: event.capacity > 0 ? `${(onlinePaid / event.capacity) * 100}%` : "0%" }} />
            </div>
            <div className="flex gap-4 flex-wrap">
              <LegendDot color="#4dcd5e" label={`${cashPaid} ${t.admin.paymentCash}`} />
              <LegendDot color="var(--brand)" label={`${onlinePaid} ${t.admin.paymentOnline}`} />
              <LegendDot color="#79828b" label={`${unpaid} ${t.admin.paymentUnpaid}`} textColor="text-[#79828b]" />
            </div>
          </div>
        )}

        {/* ── ROSTER SECTION ──────────────────────────────────── */}
        <div>
          {/* Capacity indicator + Action dropdown */}
          <div className="flex justify-between items-center mb-3 px-1">
            <h2 className="font-bold text-lg text-[var(--ink)]">
              {totalPlayers}{" "}
              <span className="text-[#79828b]">/ {event.capacity} {t.admin.players}</span>
            </h2>

            {/* Status CTA + actions dropdown */}
            <div className="relative" onMouseDown={e => e.stopPropagation()}>
              <button
                ref={statusBtnRef}
                onClick={() => setShowActionDropdown(v => !v)}
                onPointerDown={statusRipple.onPointerDown}
                className={`relative overflow-hidden w-48 py-3 px-4 flex items-center justify-between rounded-xl font-bold text-sm tracking-wide transition-colors ${
                  isDraft || isScheduled
                    ? "bg-[var(--brand)] text-white shadow-sm hover:brightness-110"
                    : `hover:bg-[currentColor]/20 ${getStatusStyle(badgeStatus)}`
                }`}
              >
                <span>{isDraft ? t.admin.publish : isScheduled ? t.admin.scheduled : badgeLabel}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 shrink-0 ${showActionDropdown ? "rotate-180" : ""}`} />
                <RippleLayer ripples={statusRipple.ripples} />
              </button>

              {showActionDropdown && (
                <div className="absolute right-0 top-full mt-1.5 z-20 w-48">
                  <DropdownPanel>
                    {isDraft && (
                      <DropdownItem icon={<Send size={14} />} label={t.admin.publishDots} onClick={openPublishModal} />
                    )}
                    {isScheduled && (
                      <>
                        <DropdownItem icon={<Send size={14} />} label={t.admin.publishNow} onClick={publishNow} />
                        <DropdownItem icon={<Calendar size={14} />} label={t.admin.reschedule} onClick={openPublishModal} />
                      </>
                    )}
                    {canJoinEvent && (
                      <DropdownItem icon={<UserPlus size={14} />} label={t.admin.joinEvent} onClick={() => { joinAsModerator(); setShowActionDropdown(false); }} />
                    )}
                    {showLockToggle && (
                      <DropdownItem
                        icon={rosterLocked ? <Unlock size={14} /> : <Lock size={14} />}
                        label={rosterLocked ? t.admin.unlockRoster : t.admin.lockRoster}
                        onClick={toggleRosterLock}
                      />
                    )}
                    {canLeaveEvent && (
                      <ConfirmDropdownItem
                        icon={<UserMinus size={14} />} label={t.admin.leaveEvent}
                        armed={armedAction === "leave"} onArm={() => setArmedAction("leave")} onConfirm={leaveAsModerator}
                        onDisarm={() => setArmedAction(null)}
                      />
                    )}
                    {!isDraft && (
                      isCanceled ? (
                        <ConfirmDropdownItem
                          variant="warning" icon={<RotateCcw size={14} />} label={t.admin.reactivateEvent}
                          armed={armedAction === "reactivate"} onArm={() => setArmedAction("reactivate")} onConfirm={reactivateEvent}
                          onDisarm={() => setArmedAction(null)}
                        />
                      ) : (
                        <ConfirmDropdownItem
                          variant="warning" icon={<Ban size={14} />} label={t.admin.cancelEvent}
                          armed={armedAction === "cancel"} onArm={() => setArmedAction("cancel")} onConfirm={cancelEvent}
                          onDisarm={() => setArmedAction(null)}
                        />
                      )
                    )}
                    <ConfirmDropdownItem
                      variant="destructive" icon={<Trash2 size={14} />} label={t.admin.deleteEvent}
                      armed={armedAction === "delete"} onArm={() => setArmedAction("delete")} onConfirm={deleteEvent}
                      onDisarm={() => setArmedAction(null)}
                    />
                  </DropdownPanel>
                </div>
              )}
            </div>
          </div>

          {/* Capacity bar */}
          <div className="w-full h-1.5 bg-[var(--ink)]/5 rounded-full mb-5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isCanceled ? "bg-[#ef4444]" : "bg-[var(--brand)]"}`}
              style={{ width: `${event.capacity > 0 ? Math.min((totalPlayers / event.capacity) * 100, 100) : 0}%` }}
            />
          </div>

          {/* Anonymous player card */}
          <div className="mx-0 mb-7">
            <div className="bg-[var(--surface-1)] border border-dashed border-[var(--ink)]/[0.12] rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-[var(--surface-0)] bg-[var(--ink)]/5 flex items-center justify-center shrink-0">
                <User size={16} className="text-[var(--ink)]/30" />
              </div>
              <div className="flex-1 min-w-0">
                {editingAnonName ? (
                  <input
                    autoFocus
                    value={anonymousName}
                    onChange={e => setAnonymousName(e.target.value)}
                    onBlur={() => setEditingAnonName(false)}
                    onKeyDown={e => e.key === "Enter" && setEditingAnonName(false)}
                    className="w-full bg-transparent border-b border-[var(--ink)]/20 text-[var(--ink)] font-bold text-sm outline-none"
                  />
                ) : (
                  <button onClick={() => setEditingAnonName(true)} className="flex items-center gap-1.5 group">
                    <span className="font-bold text-[var(--ink)]/40 text-sm group-hover:text-[var(--ink)]/60 transition-colors">
                      {anonymousName}
                    </span>
                    <Pencil size={10} className="text-[var(--ink)]/20 group-hover:text-[var(--ink)]/40 transition-colors" />
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
                className="w-10 h-8 bg-[var(--ink)]/5 border border-[var(--ink)]/10 rounded-lg text-[var(--ink)] font-black text-sm text-center outline-none focus:border-[var(--ink)]/25 shrink-0"
              />
              <button
                onClick={addAnonymousPlayers}
                disabled={addingGuests}
                className="px-3 h-8 flex items-center justify-center gap-1 rounded-full border text-[10px] font-black uppercase tracking-wider transition-colors shrink-0 bg-[var(--ink)]/5 border-[var(--ink)]/10 text-[#79828b] hover:text-[var(--ink)] hover:border-[var(--ink)]/25 disabled:opacity-50"
              >
                {t.common.add}
              </button>
            </div>
          </div>

          {/* Roster list */}
          <div className="bg-[var(--surface-1)] rounded-2xl mb-8">
            {roster.length === 0 && (
              <p className="text-[#79828b] text-sm text-center py-6">{t.admin.noRoster}</p>
            )}
            {roster.map((player, i) => (
              <div
                key={player.id}
                // No transform class in the idle case (not even translate-x-0) -
                // any transform, even a no-op one, gives the row its own
                // stacking context and breaks the z-20 dropdown menu's ability
                // to paint above the *next* row's content (it did, badly:
                // clicks on "Edit Team Name" were landing on the payment pill
                // of the row below). Only rows mid-transition get a transform.
                className={`relative transition-all duration-200 ease-in ${
                  leavingRosterIds.has(player.id) ? "opacity-0 -translate-x-3 pointer-events-none" : "opacity-100"
                } ${enteringRosterIds.has(player.id) ? "animate-row-in" : ""}`}
              >
                <div
                  className={`relative flex items-center gap-2 p-3 transition-colors hover:bg-[var(--surface-hover)] ${i > 0 ? "before:absolute before:top-0 before:left-3 before:right-3 before:h-px before:bg-[var(--ink)]/[0.06]" : ""} ${i === 0 ? "rounded-t-2xl" : ""} ${i === roster.length - 1 ? "rounded-b-2xl" : ""}`}
                >
                  {player.isGuest ? (
                    player.avatar
                      ? <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full object-cover border border-[var(--ink)]/10 shrink-0" />
                      : <div className="w-10 h-10 rounded-full bg-[var(--ink)]/5 border border-[var(--ink)]/10 flex items-center justify-center shrink-0"><User size={16} className="text-[var(--ink)]/30" /></div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openProfile(player)}
                      className="relative shrink-0 rounded-full transition-opacity hover:opacity-80"
                    >
                      {player.avatar
                        ? <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full object-cover border border-[var(--ink)]/10" />
                        : <div className="w-10 h-10 rounded-full bg-[var(--ink)]/5 border border-[var(--ink)]/10 flex items-center justify-center"><User size={16} className="text-[var(--ink)]/30" /></div>
                      }
                      <VerifiedBadge verified={player.verified} size={13} ringClassName="border-[var(--surface-1)]" />
                      <TrustDot label={player.trustLabel} size={10} ringClassName="border-[var(--surface-1)]" />
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    {event.category === "TOURNAMENT" ? (
                      editTeamNameId === player.id ? (
                        <div className="relative max-w-[220px]" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                          <label className="absolute -top-2 left-2.5 px-1 bg-[var(--surface-1)] text-[9px] font-bold uppercase tracking-widest text-[var(--brand)]">
                            {t.event.teamName}
                          </label>
                          <input
                            autoFocus
                            value={editTeamNameValue}
                            onChange={e => setEditTeamNameValue(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                            onBlur={() => updateTeamName(player.rowId, editTeamNameValue)}
                            placeholder="e.g. QAZAQ Volleyball"
                            className="w-full h-9 bg-transparent border border-[var(--brand)]/60 rounded-lg px-2.5 text-[var(--ink)] text-xs font-bold outline-none focus:border-[var(--brand)] transition-colors"
                          />
                        </div>
                      ) : (
                        <>
                          <div className={`font-bold text-sm truncate ${player.teamName ? "text-[var(--ink)]" : "text-[#79828b]/50 italic font-normal"}`}>
                            {player.teamName || t.admin.noTeamName}
                          </div>
                          <div className="text-[11px] text-[#79828b] uppercase tracking-wider truncate">
                            {t.admin.captain}: {player.name}
                          </div>
                        </>
                      )
                    ) : (
                      <>
                        <div className="font-bold text-[var(--ink)] text-sm truncate">{player.name}</div>
                        {event.category !== "BEACH" && event.category !== "EVENTS" && (
                          <div onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                            <SelectField
                              value={player.position ?? POSITIONS[0]}
                              options={POSITIONS.map(p => ({ value: p, label: positionLabel(p, t) }))}
                              onChange={v => updatePosition(player.rowId, v)}
                              triggerClassName="flex items-center gap-1 text-[#79828b] text-[11px] uppercase tracking-wider hover:text-[var(--ink)] transition-colors focus:outline-none -ml-0.5"
                              panelWidthClassName="w-52"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex flex-col shrink-0" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => moveRoster(player.rowId, "up")}
                      className="w-5 h-4 flex items-center justify-center text-[#79828b] hover:text-[var(--ink)] disabled:opacity-20 disabled:pointer-events-none transition-colors"
                    >
                      <ChevronUp size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={i === roster.length - 1}
                      onClick={() => moveRoster(player.rowId, "down")}
                      className="w-5 h-4 flex items-center justify-center text-[#79828b] hover:text-[var(--ink)] disabled:opacity-20 disabled:pointer-events-none transition-colors"
                    >
                      <ChevronDown size={13} />
                    </button>
                  </div>
                  {event.price > 0 && (
                    <div onClick={e => e.stopPropagation()}>
                      <PaymentToggle status={player.paymentStatus} onConfirm={s => confirmPayment(player.rowId, s)} />
                    </div>
                  )}
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); toggleMenu(player.id); }}
                    className={`w-8 h-8 flex items-center justify-center rounded-full shrink-0 transition-colors ${openMenu === player.id ? "bg-[var(--surface-active)] text-[var(--ink)]" : "text-[#79828b] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"}`}
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>

                {openMenu === player.id && (
                  <div onMouseDown={e => e.stopPropagation()} className="absolute right-0 top-full mt-1.5 z-20 w-64">
                  <DropdownPanel>
                      <div className="flex flex-col">
                        {event.category === "TOURNAMENT" && (
                          <MenuAction icon={<Pencil size={14} />} label={t.admin.editTeamName} onClick={() => { setEditTeamNameValue(player.teamName ?? ""); setEditTeamNameId(player.id); setOpenMenu(null); }} />
                        )}
                        {!player.isGuest && <MenuAction icon={<ArrowDownToLine size={14} />} label={t.admin.moveToWaitlist} onClick={() => moveToWaitlist(player.id)} />}
                        <button
                          onClick={() => confirmRemoveId === player.id ? removeFromEvent(player.rowId) : setConfirmRemoveId(player.id)}
                          className={`relative flex items-center justify-between gap-3 w-full h-11 px-4 text-sm font-semibold text-left overflow-hidden focus:outline-none transition-colors ${
                            confirmRemoveId === player.id ? "" : "hover:bg-[#ef4444]/10"
                          }`}
                        >
                          <span
                            aria-hidden
                            className={`absolute inset-0 bg-[#ef4444] transition-transform duration-300 ease-out ${
                              confirmRemoveId === player.id ? "translate-x-0" : "translate-x-full"
                            }`}
                          />
                          <span className={`relative z-10 transition-colors duration-200 ${
                            confirmRemoveId === player.id ? "text-white" : "text-[#ef4444]"
                          }`}>
                            {confirmRemoveId === player.id ? t.admin.tapToConfirm : t.admin.removePlayer}
                          </span>
                          <span className={`relative z-10 shrink-0 flex items-center justify-center [&>svg]:w-[18px] [&>svg]:h-[18px] transition-transform duration-300 ${
                            confirmRemoveId === player.id ? "text-white rotate-12" : "text-[#ef4444]"
                          }`}>
                            <Trash2 size={14} />
                          </span>
                        </button>
                      </div>
                  </DropdownPanel>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── WAITLIST ──────────────────────────────────────── */}
          <SectionHeader label={t.event.waitlist} count={String(waitlist.length)} />

          <div className="flex flex-col gap-2 mb-8">
            {waitlist.length === 0 && (
              <p className="text-[#79828b] text-sm text-center py-6">{t.admin.noWaitlist}</p>
            )}
            {waitlist.map(player => (
              <div
                key={player.id}
                className={`relative transition-all duration-200 ease-in ${
                  leavingWaitlistIds.has(player.id) ? "opacity-0 -translate-x-3 pointer-events-none" : "opacity-100"
                } ${enteringWaitlistIds.has(player.id) ? "animate-row-in" : ""}`}
              >
                <div className="flex items-center gap-2 p-3 bg-[var(--surface-1)] rounded-xl transition-colors">
                  <button
                    type="button"
                    onClick={() => openProfile(player)}
                    className="shrink-0 rounded-full transition-opacity hover:opacity-80"
                  >
                    {player.avatar
                      ? <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full border-2 border-[var(--surface-0)] object-cover" />
                      : <div className="w-10 h-10 rounded-full border-2 border-[var(--surface-0)] bg-[var(--ink)]/5 flex items-center justify-center"><User size={16} className="text-[var(--ink)]/30" /></div>
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[var(--ink)] text-sm truncate">{player.name}</div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); addToRosterFromWaitlist(player.id); }}
                    // Fixed width, not min-width - sized to fit "Добавить"
                    // (the longest translation of Add), so the pill is the
                    // same size in every language instead of hugging "Add".
                    className="w-28 h-8 flex items-center justify-center gap-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors shrink-0 bg-[var(--brand)] text-white hover:brightness-110"
                  >
                    <CheckCheck size={12} />
                    {t.common.add}
                  </button>
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); setOpenMenu(prev => prev === `w-${player.id}` ? null : `w-${player.id}`); setConfirmWaitlistRemId(null); }}
                    className={`w-8 h-8 flex items-center justify-center rounded-full shrink-0 transition-colors ${openMenu === `w-${player.id}` ? "bg-[var(--surface-active)] text-[var(--ink)]" : "text-[#79828b] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"}`}
                  >
                    <MoreVertical size={15} />
                  </button>
                </div>

                {openMenu === `w-${player.id}` && (
                  <div onMouseDown={e => e.stopPropagation()} className="absolute right-0 top-full mt-1.5 z-20 w-64">
                    <DropdownPanel>
                      <div className="flex flex-col">
                        <button
                          onClick={() => confirmWaitlistRemId === player.id ? removeFromWaitlist(player.id) : setConfirmWaitlistRemId(player.id)}
                          className={`relative flex items-center justify-between gap-3 w-full h-11 px-4 text-sm font-semibold text-left overflow-hidden focus:outline-none transition-colors ${
                            confirmWaitlistRemId === player.id ? "" : "hover:bg-[#ef4444]/10"
                          }`}
                        >
                          <span
                            aria-hidden
                            className={`absolute inset-0 bg-[#ef4444] transition-transform duration-300 ease-out ${
                              confirmWaitlistRemId === player.id ? "translate-x-0" : "translate-x-full"
                            }`}
                          />
                          <span className={`relative z-10 transition-colors duration-200 ${
                            confirmWaitlistRemId === player.id ? "text-white" : "text-[#ef4444]"
                          }`}>
                            {confirmWaitlistRemId === player.id ? t.admin.tapToConfirm : t.admin.removeFromWaitlist}
                          </span>
                          <span className={`relative z-10 shrink-0 flex items-center justify-center [&>svg]:w-[18px] [&>svg]:h-[18px] transition-transform duration-300 ${
                            confirmWaitlistRemId === player.id ? "text-white rotate-12" : "text-[#ef4444]"
                          }`}>
                            <Trash2 size={14} />
                          </span>
                        </button>
                      </div>
                    </DropdownPanel>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── PENDING REQUESTS ──────────────────────────────── */}
          <SectionHeader label={t.admin.requests} count={String(requests.length)} accent={requests.length > 0 ? "yellow" : undefined} />

          <div className="flex flex-col gap-2 mb-3">
            {requests.length === 0 && (
              <p className="text-[#79828b] text-sm text-center py-6">{t.admin.noPendingRequests}</p>
            )}
            {requests.map(player => (
              <div key={player.id} className="relative">
                <div className="flex items-center gap-2 p-3 bg-[var(--surface-1)] rounded-xl transition-colors hover:bg-[var(--surface-hover)]">
                  <button
                    type="button"
                    onClick={() => openProfile(player)}
                    className="shrink-0 rounded-full transition-opacity hover:opacity-80"
                  >
                    {player.avatar
                      ? <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full border-2 border-[var(--surface-0)] object-cover" />
                      : <div className="w-10 h-10 rounded-full border-2 border-[var(--surface-0)] bg-[var(--ink)]/5 flex items-center justify-center"><User size={16} className="text-[var(--ink)]/30" /></div>
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[var(--ink)] text-sm truncate">{player.name}</div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); approveRequest(player.id); }}
                    // Fixed width, not min-width - sized to fit "Добавить"
                    // (the longest translation of Add), so the pill is the
                    // same size in every language instead of hugging "Add".
                    className="w-28 h-8 flex items-center justify-center gap-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors shrink-0 bg-[var(--brand)] text-white hover:brightness-110"
                  >
                    <CheckCheck size={12} />
                    {t.common.add}
                  </button>
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); setOpenMenu(prev => prev === `r-${player.id}` ? null : `r-${player.id}`); setConfirmRejectId(null); }}
                    className={`w-8 h-8 flex items-center justify-center rounded-full shrink-0 transition-colors ${openMenu === `r-${player.id}` ? "bg-[var(--surface-active)] text-[var(--ink)]" : "text-[#79828b] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"}`}
                  >
                    <MoreVertical size={15} />
                  </button>
                </div>

                {openMenu === `r-${player.id}` && (
                  <div onMouseDown={e => e.stopPropagation()} className="absolute right-0 top-full mt-1.5 z-20 w-64">
                    <DropdownPanel>
                      <div className="flex flex-col">
                        <button
                          onClick={() => confirmRejectId === player.id ? rejectRequest(player.id) : setConfirmRejectId(player.id)}
                          className={`relative flex items-center justify-between gap-3 w-full h-11 px-4 text-sm font-semibold text-left overflow-hidden focus:outline-none transition-colors ${
                            confirmRejectId === player.id ? "" : "hover:bg-[#ef4444]/10"
                          }`}
                        >
                          <span
                            aria-hidden
                            className={`absolute inset-0 bg-[#ef4444] transition-transform duration-300 ease-out ${
                              confirmRejectId === player.id ? "translate-x-0" : "translate-x-full"
                            }`}
                          />
                          <span className={`relative z-10 transition-colors duration-200 ${
                            confirmRejectId === player.id ? "text-white" : "text-[#ef4444]"
                          }`}>
                            {confirmRejectId === player.id ? t.admin.tapToConfirm : t.admin.rejectRequest}
                          </span>
                          <span className={`relative z-10 shrink-0 flex items-center justify-center [&>svg]:w-[18px] [&>svg]:h-[18px] transition-transform duration-300 ${
                            confirmRejectId === player.id ? "text-white rotate-12" : "text-[#ef4444]"
                          }`}>
                            <X size={14} />
                          </span>
                        </button>
                      </div>
                    </DropdownPanel>
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
      <h2 className="font-black italic text-base text-[var(--ink)] uppercase tracking-widest">{label}</h2>
      <span className={`text-[11px] font-black px-2 py-0.5 rounded ${
        accent === "yellow" ? "bg-[#eab308]/10 text-[#eab308]" : "bg-[var(--ink)]/5 text-[#79828b]"
      }`}>
        {count}
      </span>
    </div>
  );
}

function MenuAction({ icon, label, onClick, danger, iconRight }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean; iconRight?: boolean }) {
  const iconEl = <span className="shrink-0 flex items-center justify-center [&>svg]:w-[18px] [&>svg]:h-[18px]">{icon}</span>;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full h-11 px-4 text-sm font-semibold text-left transition-colors focus:outline-none ${
        iconRight ? "justify-between" : ""
      } ${danger ? "text-[#ef4444] hover:bg-[#ef4444]/10" : "text-[var(--ink)] hover:bg-[var(--surface-hover)]"}`}
    >
      {iconRight ? <>{label}{iconEl}</> : <>{iconEl}{label}</>}
    </button>
  );
}

const PAYMENT_CYCLE: PaymentStatus[] = ["unpaid", "cash", "online"];

function PaymentToggle({ status, onConfirm }: { status: PaymentStatus; onConfirm: (s: PaymentStatus) => void }) {
  const { t } = useLang();
  const [pending, setPending] = useState<PaymentStatus>(status);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const startPosRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);

  useEffect(() => { setPending(status); }, [status]);

  function stopHold() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setProgress(0);
  }

  function onPointerDown(e: React.PointerEvent) {
    startRef.current = Date.now();
    startPosRef.current = { x: e.clientX, y: e.clientY };
    movedRef.current = false;
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

  // A finger that drifts while "holding" is scrolling the roster, not
  // pressing the pill - cancel the hold outright so it can't complete or
  // register as a tap once the pointer lifts.
  const MOVE_CANCEL_PX = 10;

  function onPointerMove(e: React.PointerEvent) {
    if (!intervalRef.current || movedRef.current) return;
    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;
    if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) {
      movedRef.current = true;
      stopHold();
    }
  }

  function onPointerUp() {
    const held = Date.now() - startRef.current;
    const wasMoved = movedRef.current;
    stopHold();
    if (!wasMoved && held < 300 && status === "unpaid") {
      setPending(prev => PAYMENT_CYCLE[(PAYMENT_CYCLE.indexOf(prev) + 1) % PAYMENT_CYCLE.length]);
    }
  }

  const isConfirmed = pending === status;
  const confirmedAndSet = isConfirmed && status !== "unpaid";

  const label = pending === "cash" ? t.admin.paymentCash : pending === "online" ? t.admin.paymentOnline : t.admin.paymentUnpaid;
  const fillColor = pending === "online" ? "bg-[var(--brand)]" : "bg-[#4dcd5e]";
  const confirmedBg = status === "online" ? "bg-[var(--brand)]/10" : "bg-[#4dcd5e]/10";
  const confirmedText = status === "online" ? "text-[var(--brand)]" : "text-[#4dcd5e]";
  const ConfirmedIcon = status === "online" ? CreditCard : Banknote;

  return (
    <button
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={stopHold}
      onPointerCancel={stopHold}
      // Fixed width, not min-width - the label cycles between differently
      // sized words both per payment state (Unpaid/Cash/Card) and per locale
      // (К оплате/наличкой/картой), so anything content-based would make the
      // pill visibly resize itself as it cycles. Sized to fit the longest of
      // all of them so it's identical across every state and language.
      className={`relative w-24 h-8 rounded-full overflow-hidden shrink-0 select-none touch-none ${
        confirmedAndSet ? `${confirmedBg}` : "bg-[var(--ink)]/5"
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
      <span className={`text-[11px] font-bold ${textColor ?? "text-[var(--ink)]"}`}>{label}</span>
    </div>
  );
}
