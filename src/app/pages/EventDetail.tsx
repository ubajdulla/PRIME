import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router";
import { useLang } from "../i18n";
import { navDir } from "../lib/navDir";
import {
  ChevronDown,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  MoreVertical,
  User,
  Ticket,
  Share2,
} from "lucide-react";
import { Toast } from "../components/ui/Toast";
import { BackBar } from "../components/ui/BackBar";
import { TrustDot } from "../components/ui/TrustDot";
import { VerifiedBadge } from "../components/ui/VerifiedBadge";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { computeJoinStatus } from "../lib/joinType";
import { shortDate } from "../lib/eventDate";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  event_date: string;
  event_time: string;
  location: string;
  price_label: string | null;
  capacity: number;
  status: string;
  moderator_id: string;
  moderator: { id: string; name: string; avatar: string | null } | null;
};

type RosterPlayer = { id: string; name: string; avatar: string | null; position: string | null; trustLabel: string | null; verified: boolean; isGuest: boolean };
type WaitlistEntry = { id: string; name: string; avatar: string | null; trustLabel: string | null; verified: boolean };

type JoinStatus = null | "joined" | "pending";

const POSITIONS = ["Outside Hitter", "Opposite Hitter", "Setter", "Middle Blocker", "Libero"];
const POSITION_REQUIRED_LEVELS = ["Advanced", "Pro", "PRIME"];

export function EventDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useLang();
  const { user: authUser, profile, isLoggedIn, isAdmin } = useAuth();

  function playerProfilePath(playerId: string) {
    return isAdmin ? `/admin/player/${playerId}` : `/players/${playerId}`;
  }

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [toast, setToast] = useState({ message: "", visible: false });
  function fireToast(message: string) {
    setToast({ message, visible: true });
  }

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

  const [event, setEvent] = useState<EventRow | null>(null);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [guestCount, setGuestCount] = useState(0);
  const [myStatus, setMyStatus] = useState<JoinStatus>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  async function load(eventId: string) {
    const [{ data: eventRow, error: eventErr }, { data: participantRows }, { data: requestRows }, { data: counts }] = await Promise.all([
      supabase.from("events").select("*, moderator:profiles!moderator_id(id, name, avatar)").eq("id", eventId).single(),
      supabase.from("event_participants").select("id, player_id, guest_name, joined_at, position, profiles(id, name, avatar, position, is_verified, visible_trust_label)").eq("event_id", eventId).order("joined_at", { ascending: true }),
      supabase.from("event_requests").select("player_id, kind, profiles(id, name, avatar, is_verified, visible_trust_label)").eq("event_id", eventId),
      supabase.rpc("event_join_counts"),
    ]);

    if (eventErr || !eventRow) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setEvent(eventRow as unknown as EventRow);

    const moderatorId = (eventRow as unknown as EventRow).moderator_id;
    const rosterList: RosterPlayer[] = (participantRows ?? []).map(p => ({
      id: p.profiles?.id ?? `guest-${p.id}`,
      name: p.profiles?.name ?? p.guest_name ?? "Unknown",
      avatar: p.profiles?.avatar ?? null,
      position: p.position ?? p.profiles?.position ?? null,
      trustLabel: p.profiles?.visible_trust_label ?? null,
      verified: p.profiles?.is_verified ?? false,
      isGuest: !p.player_id,
    })).sort((a, b) => (a.id === moderatorId ? -1 : 0) - (b.id === moderatorId ? -1 : 0));
    setRoster(rosterList);

    const waitlistList: WaitlistEntry[] = (requestRows ?? [])
      .filter(r => r.kind === "waitlist")
      .map(r => ({ id: r.profiles?.id ?? r.player_id, name: r.profiles?.name ?? "Unknown", avatar: r.profiles?.avatar ?? null, trustLabel: r.profiles?.visible_trust_label ?? null, verified: r.profiles?.is_verified ?? false }));
    setWaitlist(waitlistList);

    const countRow = (counts as { event_id: string; joined_count: number }[] | null ?? []).find(c => c.event_id === eventId);
    setGuestCount(countRow?.joined_count ?? 0);

    if (authUser) {
      const joined = rosterList.some(p => p.id === authUser.id);
      const myRequest = (requestRows ?? []).some(r => r.player_id === authUser.id);
      setMyStatus(joined ? "joined" : myRequest ? "pending" : null);
    } else {
      setMyStatus(null);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    load(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, authUser?.id]);

  const isCanceled = event?.status === "canceled";
  const isRequestOnly = event ? computeJoinStatus(event.level, profile?.skill_level) === "REQUEST ONLY" : false;
  const requiresPosition = event?.category === "GAMES" && POSITION_REQUIRED_LEVELS.includes(event?.level ?? "");
  const maxCapacity = event?.capacity ?? 0;
  const currentCapacity = isLoggedIn ? roster.length : guestCount;
  const isFull = maxCapacity > 0 && currentCapacity >= maxCapacity;
  const title = event?.title ?? "";

  const theme = {
    primary: isRequestOnly ? "text-[#eab308]" : "text-[#3390ec]",
    bg: isRequestOnly ? "bg-[#eab308]" : "bg-[#3390ec]",
    button: isRequestOnly ? "bg-[#eab308] text-black" : "bg-[#3390ec] text-white",
  };

  function handleJoinClick() {
    if (!isLoggedIn) { navigate("/signin"); return; }
    if (myStatus) { setShowLeaveConfirm(true); }
    else { setSelectedPosition(null); setShowJoinModal(true); }
  }

  async function confirmJoin() {
    if (!authUser || !event || busy) return;
    setBusy(true);
    const position = requiresPosition ? selectedPosition : null;
    if (isRequestOnly) {
      await supabase.from("event_requests").insert({ event_id: event.id, player_id: authUser.id, kind: "request", status: "pending", position });
    } else if (isFull) {
      await supabase.from("event_requests").insert({ event_id: event.id, player_id: authUser.id, kind: "waitlist", status: "pending", position });
    } else {
      await supabase.from("event_participants").insert({ event_id: event.id, player_id: authUser.id, position });
    }
    await load(event.id);
    setBusy(false);
    setShowJoinModal(false);
  }

  async function confirmLeave() {
    if (!authUser || !event || busy) return;
    setBusy(true);
    if (myStatus === "joined") {
      await supabase.from("event_participants").delete().eq("event_id", event.id).eq("player_id", authUser.id);
    } else {
      await supabase.from("event_requests").delete().eq("event_id", event.id).eq("player_id", authUser.id);
    }
    await load(event.id);
    setBusy(false);
    setShowLeaveConfirm(false);
  }

  function openMenuAt(key: string, e: React.MouseEvent<HTMLButtonElement>) {
    if (openMenu === key) { setOpenMenu(null); setMenuPos(null); return; }
    const r = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    setOpenMenu(key);
  }

  function closeMenu() { setOpenMenu(null); setMenuPos(null); }

  const joinButtonLabel = () => {
    if (myStatus === "joined") return t.event.joined;
    if (myStatus === "pending") return t.profile.pending;
    if (isFull && !isRequestOnly) return "Join Waitlist";
    return isRequestOnly ? t.event.sendRequest : t.event.joinDirectly;
  };

  if (loading) return <div className="min-h-screen bg-[#0e1621]" />;

  if (notFound || !event) {
    return (
      <div className="min-h-screen bg-[#0e1621] text-white">
        <BackBar label="Events" to="/" />
        <div className="px-4 py-16 text-center text-[#79828b] text-sm">{t.common.nothingHere}</div>
      </div>
    );
  }

return (
    <div className="min-h-screen bg-[#0e1621] text-white font-sans">
      <Toast message={toast.message} visible={toast.visible} variant="copied" onHide={() => setToast(prev => ({ ...prev, visible: false }))} />

      {/* Invisible backdrop to close any open dropdown menu */}
      {openMenu && createPortal(
        <div className="fixed inset-0 z-[39]" onClick={closeMenu} />,
        document.body
      )}

      {/* Join confirmation modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowJoinModal(false)}>
          <div className="w-full max-w-sm bg-[#17212b] border border-white/10 rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-black italic uppercase tracking-widest text-white text-lg mb-1">
              {isRequestOnly ? t.event.sendRequest : isFull ? "Join Waitlist" : t.event.joinTitle}
            </h3>
            <p className="text-[#79828b] text-sm mb-5">
              {isRequestOnly
                ? t.event.requestDesc
                : isFull
                  ? "This event is full — you'll join the waitlist and get notified if a spot opens up."
                  : t.event.joinDesc}
            </p>

            {requiresPosition && (
              <div className="mb-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#79828b] mb-2">{t.event.selectPosition}</p>
                <div className="flex flex-wrap gap-1.5">
                  {POSITIONS.map(pos => (
                    <button
                      key={pos}
                      onClick={() => setSelectedPosition(pos)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                        selectedPosition === pos
                          ? isRequestOnly
                            ? "bg-[#eab308] border-[#eab308] text-black"
                            : "bg-[#3390ec] border-[#3390ec] text-white"
                          : "bg-white/5 border-white/10 text-[#79828b] hover:text-white hover:border-white/25"
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowJoinModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#79828b] font-bold text-sm hover:text-white transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={confirmJoin}
                disabled={busy || (requiresPosition && !selectedPosition)}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${theme.button}`}
              >
                {isRequestOnly || isFull ? t.event.sendRequest : t.event.join}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave confirmation modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowLeaveConfirm(false)}>
          <div className="w-full max-w-sm bg-[#17212b] border border-white/10 rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-black italic uppercase tracking-widest text-white text-lg mb-1">
              {myStatus === "pending" ? t.event.cancelRequestTitle : t.event.leaveTitle}
            </h3>
            <p className="text-[#79828b] text-sm mb-6">
              {myStatus === "pending" ? t.event.cancelRequestDesc : t.event.leaveDesc}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#79828b] font-bold text-sm hover:text-white transition-colors"
              >
                {t.event.keep}
              </button>
              <button
                onClick={confirmLeave}
                disabled={busy}
                className="flex-1 py-2.5 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] font-bold text-sm transition-transform disabled:opacity-40"
              >
                {myStatus === "pending" ? t.event.cancelRequestBtn : t.event.leaveBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      <BackBar label="Events" to="/">
        <button
          onClick={() => {
            const url = window.location.href;
            if (navigator.share) {
              navigator.share({ title, url });
            } else {
              navigator.clipboard.writeText(url).then(() => fireToast(t.common.linkCopied));
            }
          }}
          className="flex items-center gap-1.5 text-[#79828b] hover:text-white transition-colors text-sm font-bold"
        >
          <Share2 size={16} />
          <span>{t.event.share}</span>
        </button>
      </BackBar>

<div className="px-4 pb-12 max-w-[600px] mx-auto pt-4">

        {/* COMPACT UPPER SECTION */}
        <div className="mb-6">
          <h1 className="text-3xl font-black italic uppercase tracking-tight leading-none text-white mb-4">
            {title}
          </h1>

          {/* Organizer */}
          <div className="flex items-center justify-between bg-[#17212b] border border-white/5 rounded-xl p-2.5 mb-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative">
                {event.moderator?.avatar ? (
                  <img
                    src={event.moderator.avatar}
                    alt="Organizer"
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
                <div className="text-[10px] font-bold text-[#79828b] uppercase tracking-widest leading-tight">{t.event.organizer}</div>
                <div className="text-white font-bold text-sm">{event.moderator?.name ?? (isLoggedIn ? "—" : "Sign in to view")}</div>
              </div>
            </div>
            <div className="relative">
              <button
                onClick={e => openMenuAt("organizer", e)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors text-[#79828b]"
              >
                <MoreVertical size={18} />
              </button>
              {openMenu === "organizer" && menuPos && createPortal(
                <div
                  style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 40 }}
                  className="bg-[#222f3e] border border-white/10 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] overflow-hidden min-w-[140px]"
                  onClick={closeMenu}
                >
                  <button
                    onClick={() => { navDir.forward(); navigate(playerProfilePath(event.moderator_id)); closeMenu(); }}
                    className="flex items-center gap-2 w-full px-4 py-3 text-sm font-bold text-white hover:bg-white/5 transition-colors text-left"
                  >
                    <User size={14} />
                    {t.event.viewProfile}
                  </button>
                </div>,
                document.body
              )}
            </div>
          </div>

          {/* Info Panel */}
          <div className="bg-[#17212b] border border-white/5 rounded-xl flex flex-col">
            <div className="flex justify-between items-center p-3 border-b border-white/5 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <Calendar size={16} className={theme.primary} />
                <span className="text-sm font-semibold text-white/90">{shortDate(event.event_date, true)}</span>
              </div>
              <div className="hidden sm:block w-[1px] h-4 bg-white/10" />
              <div className="flex items-center gap-2.5">
                <Clock size={16} className={theme.primary} />
                <span className="text-sm font-semibold text-white/90">{event.event_time}</span>
              </div>
              <div className="hidden sm:block w-[1px] h-4 bg-white/10" />
              <div className="flex items-center gap-2.5">
                <Ticket size={16} className={theme.primary} />
                <span className="text-sm font-semibold text-white/90">{event.price_label ?? "FREE"}</span>
              </div>
            </div>
            <a
              href={`https://www.google.com/maps/search/${encodeURIComponent(event.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 p-3 hover:bg-white/5 transition-colors rounded-b-xl"
            >
              <MapPin size={16} className={theme.primary} />
              <span className="text-sm font-semibold text-white/90 truncate">
                {event.location}
              </span>
            </a>
          </div>

          {event.description && (
            <p className="text-[#79828b] text-xs leading-relaxed mt-4 px-1">
              {event.description}
            </p>
          )}
        </div>

        {/* ROSTER SECTION */}
        <div>
          <div className="flex justify-between items-center mb-3 px-1">
            <h2 className="font-bold text-lg text-white">
              {currentCapacity}{" "}
              <span className="text-[#79828b]">/ {maxCapacity} Players</span>
            </h2>

            {isCanceled ? (
              <span className="w-36 py-2 flex items-center justify-center rounded-lg font-bold text-sm bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] cursor-default">
                {t.event.canceled.toUpperCase()}
              </span>
            ) : (
              <button
                onClick={handleJoinClick}
                className={`w-36 py-2 justify-center rounded-lg font-bold text-sm transition-all ${
                  myStatus
                    ? `bg-transparent ${isRequestOnly ? "shadow-[inset_0_0_0_1.5px_#eab308] text-[#eab308]" : "shadow-[inset_0_0_0_1.5px_#3390ec] text-[#3390ec]"}`
                    : `shadow-sm ${theme.button}`
                }`}
              >
                {myStatus === "joined" ? t.event.leaveBtn.toUpperCase() : myStatus === "pending" ? t.event.cancelRequestBtn.toUpperCase() : joinButtonLabel()}
              </button>
            )}
          </div>

          {/* Capacity Bar */}
          <div className="w-full h-1.5 bg-white/5 rounded-full mb-4 overflow-hidden">
            <div
              className={`h-full ${theme.bg} rounded-full transition-all duration-500`}
              style={{ width: `${maxCapacity > 0 ? Math.min(100, (currentCapacity / maxCapacity) * 100) : 0}%` }}
            />
          </div>

          {/* Player List */}
          {isLoggedIn ? (
            <div className="flex flex-col gap-2">
              {roster.length === 0 && (
                <p className="text-[#79828b] text-sm py-4 text-center">No one has joined yet — be the first!</p>
              )}
              {roster.map((player, i) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 bg-[#17212b] border border-white/5 rounded-xl p-2.5"
                >
                  <div className="relative shrink-0">
                    {player.avatar ? (
                      <img
                        src={player.avatar}
                        alt={player.name}
                        className="w-10 h-10 rounded-full object-cover border border-white/10"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <User size={16} className="text-white/30" />
                      </div>
                    )}
                    <VerifiedBadge verified={player.verified} size={13} ringClassName="border-[#17212b]" />
                    <TrustDot label={player.trustLabel} size={10} ringClassName="border-[#17212b]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-sm block text-white">{player.name}</span>
                    {player.position && (
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.primary}`}>
                        {player.position}
                      </span>
                    )}
                  </div>
                  {!player.isGuest && (
                    <div className="relative shrink-0">
                      <button
                        onClick={e => openMenuAt(`player-${i}`, e)}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors text-[#79828b]"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openMenu === `player-${i}` && menuPos && createPortal(
                        <div
                          style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 40 }}
                          className="bg-[#222f3e] border border-white/10 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] overflow-hidden min-w-[140px]"
                          onClick={closeMenu}
                        >
                          <button
                            onClick={() => { navDir.forward(); navigate(playerProfilePath(player.id)); closeMenu(); }}
                            className="flex items-center gap-2 w-full px-4 py-3 text-sm font-bold text-white hover:bg-white/5 transition-colors text-left"
                          >
                            <User size={14} />
                            {t.event.viewProfile}
                          </button>
                        </div>,
                        document.body
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <button
              onClick={() => navigate("/signin")}
              className="w-full text-center bg-[#17212b] border border-white/5 rounded-xl py-4 text-sm text-[#79828b] hover:text-white transition-colors"
            >
              Sign in to see who's playing
            </button>
          )}

          {/* Waitlist */}
          {isLoggedIn && waitlist.length > 0 && (() => {
            const stackAvatars = waitlist.slice(0, 3);
            const stackExtra = waitlist.length - 3;
            return (
              <div className="mt-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#79828b] mb-2 px-1">{t.event.waitlist}</p>
                <div className="bg-[#17212b] border border-white/5 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setWaitlistOpen(v => !v)}
                    className="w-full flex items-center gap-3 px-3 py-2.5"
                  >
                    <div className="flex -space-x-2.5">
                      {stackAvatars.map((p, i) => (
                        <div key={p.id} className="relative" style={{ zIndex: stackAvatars.length - i }}>
                          {p.avatar ? (
                            <img
                              src={p.avatar}
                              alt={p.name}
                              className="w-8 h-8 rounded-full border-2 border-[#17212b] object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full border-2 border-[#17212b] bg-white/5 flex items-center justify-center">
                              <User size={12} className="text-white/30" />
                            </div>
                          )}
                          <VerifiedBadge verified={p.verified} size={10} ringClassName="border-[#17212b]" />
                          <TrustDot label={p.trustLabel} size={8} ringClassName="border-[#17212b]" />
                        </div>
                      ))}
                      {stackExtra > 0 && (
                        <div className="w-8 h-8 rounded-full border-2 border-[#17212b] bg-white/10 flex items-center justify-center text-[9px] font-bold text-white/50" style={{ zIndex: 0 }}>
                          +{stackExtra}
                        </div>
                      )}
                    </div>
                    <span className="flex-1 text-left text-white font-bold text-sm">{t.event.players(waitlist.length)}</span>
                    <ChevronDown size={15} className={`text-[#79828b] transition-transform duration-300 shrink-0 ${waitlistOpen ? "rotate-180" : ""}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${waitlistOpen ? "max-h-[600px]" : "max-h-0"}`}>
                    {waitlist.map((player, i) => {
                      const menuKey = `waitlist-${i}`;
                      const isMe = player.id === authUser?.id;
                      return (
                        <div key={player.id} className="flex items-center gap-3 px-3 py-2.5 border-t border-white/[0.05]">
                          <div className="relative shrink-0">
                            {player.avatar ? (
                              <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                <User size={12} className="text-white/30" />
                              </div>
                            )}
                            <VerifiedBadge verified={player.verified} size={10} ringClassName="border-[#17212b]" />
                            <TrustDot label={player.trustLabel} size={8} ringClassName="border-[#17212b]" />
                          </div>
                          <span className={`font-bold text-sm flex-1 ${isMe ? theme.primary : "text-white"}`}>
                            {player.name}
                            {isMe && <span className="text-[10px] text-[#79828b] font-bold ml-2 normal-case tracking-normal">{t.event.you}</span>}
                          </span>
                          <div className="relative shrink-0">
                            <button
                              onClick={e => openMenuAt(menuKey, e)}
                              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors text-[#79828b]"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {openMenu === menuKey && menuPos && createPortal(
                              <div
                                style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 40 }}
                                className="bg-[#222f3e] border border-white/10 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] overflow-hidden min-w-[140px]"
                                onClick={closeMenu}
                              >
                                <button
                                  onClick={() => { if (isMe) navigate("/profile"); else { navDir.forward(); navigate(playerProfilePath(player.id)); } closeMenu(); }}
                                  className="flex items-center gap-2 w-full px-4 py-3 text-sm font-bold text-white hover:bg-white/5 transition-colors text-left"
                                >
                                  <User size={14} />
                                  {t.event.viewProfile}
                                </button>
                              </div>,
                              document.body
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
