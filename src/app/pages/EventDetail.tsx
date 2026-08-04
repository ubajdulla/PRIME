import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { useLang } from "../i18n";
import { navDir } from "../lib/navDir";
import { getHub } from "../lib/hub";
import {
  ChevronDown,
  MapPin,
  Calendar,
  Clock,
  User,
  Ticket,
  Share2,
  FileText,
  Download,
  LogOut,
} from "lucide-react";
import { Toast } from "../components/ui/Toast";
import { ModalOverlay } from "../components/ui/Modal";
import { useWaterRipple, RippleLayer } from "../components/ui/useWaterRipple";
import { BackBar } from "../components/ui/BackBar";
import { TrustDot } from "../components/ui/TrustDot";
import { VerifiedBadge } from "../components/ui/VerifiedBadge";
import { ProfileRow } from "../components/ui/ProfileRow";
import { useIsMobile } from "../components/ui/use-mobile";
import { LevelBookmark } from "../components/ui/LevelBookmark";
import { CategoryIcon } from "../components/ui/CategoryIcon";
import { PositionList } from "../components/ui/PositionList";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { computeJoinStatus } from "../lib/joinType";
import { shortDate, isRosterLocked } from "../lib/eventDate";
import { POSITIONS, positionLabel } from "../data/adminData";

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
  price_label: string | null;
  capacity: number;
  status: string;
  roster_lock_override: "locked" | "unlocked" | null;
  moderator_id: string;
  moderator: { id: string; name: string; avatar: string | null } | null;
};

type RosterPlayer = { id: string; name: string; avatar: string | null; position: string | null; teamName: string | null; trustLabel: string | null; verified: boolean; isGuest: boolean };
type WaitlistEntry = { id: string; name: string; avatar: string | null; trustLabel: string | null; verified: boolean };

type JoinStatus = null | "joined" | "pending";

const POSITION_REQUIRED_LEVELS = ["Advanced", "Pro", "PRIME"];

// Mobile scrolls inside <main> (fixed header/footer bars around it); desktop scrolls the window.
function findScrollParent(el: HTMLElement): HTMLElement | (Window & typeof globalThis) {
  let node = el.parentElement;
  while (node) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
    node = node.parentElement;
  }
  return window;
}

export function EventDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const hub = getHub(location);
  const { id } = useParams();
  const { t } = useLang();
  const { user: authUser, profile, isLoggedIn, isAdmin } = useAuth();
  const joinRipple = useWaterRipple();
  // On mobile, only the avatar navigates to a profile (ProfileRow's
  // avatarOnly) so a mis-tap while scrolling the roster can't accidentally
  // open someone's profile. Desktop keeps the whole row clickable, same as
  // before - mispointing with a mouse isn't the same risk as a touch scroll.
  const isMobile = useIsMobile();

  function playerProfilePath(playerId: string) {
    return isAdmin ? `/admin/player/${playerId}` : `/players/${playerId}`;
  }

  const [toast, setToast] = useState({ message: "", visible: false });
  function fireToast(message: string) {
    setToast({ message, visible: true });
  }

  const [leaveArmed, setLeaveArmed] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const joinBtnRef = useRef<HTMLButtonElement>(null);
  const joinModalBoxRef = useRef<HTMLDivElement>(null);
  const [joinModalOrigin, setJoinModalOrigin] = useState<{ x: number; y: number } | null>(null);
  const [joinModalEntered, setJoinModalEntered] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const waitlistBoxRef = useRef<HTMLDivElement>(null);
  const waitlistRowsRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");

  const [event, setEvent] = useState<EventRow | null>(null);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [myStatus, setMyStatus] = useState<JoinStatus>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Rather than predicting where the box will end up (fragile - depends on its
  // exact position on screen, and any math has to be redone if that changes),
  // this tracks the box's *actual* height frame by frame while the grid-rows
  // transition runs, and scrolls by exactly the same delta every time it moves.
  // The scroll then simply mirrors whatever the CSS animation is really doing,
  // in both directions, with nothing to get out of sync.
  // Depends on waitlist.length because the box (and its ref) only exists in the
  // DOM once the data has loaded and there's more than one waitlisted player.
  useEffect(() => {
    const rows = waitlistRowsRef.current;
    const box = waitlistBoxRef.current;
    if (!rows || !box) return;
    const scrollParent = findScrollParent(box);
    // ResizeObserver always fires once immediately on observe() with the current
    // size - skip that first call so it doesn't scroll on mount, only on actual
    // subsequent changes (i.e. the accordion toggling).
    let lastHeight: number | null = null;
    const observer = new ResizeObserver(([entry]) => {
      const newHeight = entry.contentRect.height;
      if (lastHeight !== null) {
        const delta = newHeight - lastHeight;
        if (delta !== 0) scrollParent.scrollBy({ top: delta });
      }
      lastHeight = newHeight;
    });
    observer.observe(rows);
    return () => observer.disconnect();
  }, [waitlist.length]);

  async function load(eventId: string) {
    // Guests can't read event_participants/profiles directly (RLS), so they go through
    // the public_roster/public_organizer views instead - same whitelisted columns only.
    const isGuestViewer = !authUser;

    const [{ data: eventRow, error: eventErr }, { data: participantRows }, { data: requestRows }] = await Promise.all([
      supabase.from("events").select("*, moderator:profiles!moderator_id(id, name, avatar)").eq("id", eventId).single(),
      isGuestViewer
        ? supabase.from("public_roster").select("id, name, avatar, position, team_name, is_verified, is_guest").eq("event_id", eventId).order("joined_at", { ascending: true })
        : supabase.from("event_participants").select("id, player_id, guest_name, joined_at, position, team_name, profiles(id, name, avatar, position, is_verified, visible_trust_label)").eq("event_id", eventId).order("joined_at", { ascending: true }),
      isGuestViewer
        ? Promise.resolve({ data: [] as { player_id: string; kind: string; profiles: { id: string; name: string; avatar: string | null; is_verified: boolean; visible_trust_label: string | null } | null }[] })
        : supabase.from("event_requests").select("player_id, kind, profiles(id, name, avatar, is_verified, visible_trust_label)").eq("event_id", eventId),
    ]);

    if (eventErr || !eventRow) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const row = eventRow as unknown as EventRow;

    if (isGuestViewer && !row.moderator) {
      const { data: org } = await supabase.from("public_organizer").select("id, name, avatar").eq("event_id", eventId).maybeSingle();
      if (org) row.moderator = org;
    }
    setEvent(row);

    const moderatorId = row.moderator_id;
    const rosterList: RosterPlayer[] = isGuestViewer
      ? ((participantRows ?? []) as unknown as { id: string; name: string; avatar: string | null; position: string | null; team_name: string | null; is_verified: boolean; is_guest: boolean }[]).map(p => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          position: p.position,
          teamName: p.team_name,
          trustLabel: null,
          verified: p.is_verified,
          isGuest: p.is_guest,
        }))
      : ((participantRows ?? []) as unknown as { id: string; player_id: string | null; guest_name: string | null; position: string | null; team_name: string | null; profiles: { id: string; name: string; avatar: string | null; position: string | null; is_verified: boolean; visible_trust_label: string | null } | null }[]).map(p => ({
          id: p.profiles?.id ?? `guest-${p.id}`,
          name: p.profiles?.name ?? p.guest_name ?? "Unknown",
          avatar: p.profiles?.avatar ?? null,
          position: p.position ?? p.profiles?.position ?? null,
          teamName: p.team_name,
          trustLabel: p.profiles?.visible_trust_label ?? null,
          verified: p.profiles?.is_verified ?? false,
          isGuest: !p.player_id,
        }));
    rosterList.sort((a, b) => (a.id === moderatorId ? -1 : 0) - (b.id === moderatorId ? -1 : 0));
    setRoster(rosterList);

    // Requests (pending approval on REQUEST ONLY events) show up in the same
    // Waitlist panel as actual waitlist entries — from the outside both just
    // mean "not confirmed on the roster yet", so they're shown together.
    const waitlistList: WaitlistEntry[] = (requestRows ?? [])
      .filter(r => r.kind === "waitlist" || r.kind === "request")
      .map(r => ({ id: r.profiles?.id ?? r.player_id, name: r.profiles?.name ?? "Unknown", avatar: r.profiles?.avatar ?? null, trustLabel: r.profiles?.visible_trust_label ?? null, verified: r.profiles?.is_verified ?? false }));
    setWaitlist(waitlistList);

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

  useEffect(() => {
    if (!leaveArmed) return;
    const timer = setTimeout(() => setLeaveArmed(false), 3000);
    return () => clearTimeout(timer);
  }, [leaveArmed]);

  // Tap-to-confirm disarms on anything other than a second tap on the same
  // button - a click/scroll anywhere else in the app, not just a timeout.
  useEffect(() => {
    if (!leaveArmed) return;
    function disarm(e: Event) {
      if (e.target instanceof Node && joinBtnRef.current?.contains(e.target)) return;
      setLeaveArmed(false);
    }
    document.addEventListener("pointerdown", disarm);
    document.addEventListener("wheel", disarm, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", disarm);
      document.removeEventListener("wheel", disarm);
    };
  }, [leaveArmed]);

  const isCanceled = event?.status === "canceled";
  const isRequestOnly = event ? computeJoinStatus(event.level, profile?.skill_level) === "REQUEST ONLY" : false;
  const requiresPosition = (event?.category === "GAMES" || event?.category === "OPENGYM") && POSITION_REQUIRED_LEVELS.includes(event?.level ?? "");
  const requiresTeamName = event?.category === "TOURNAMENT";
  const maxCapacity = event?.capacity ?? 0;
  const currentCapacity = roster.length;
  const isFull = maxCapacity > 0 && currentCapacity >= maxCapacity;
  const rosterLocked = event ? isRosterLocked(event.event_date, event.roster_lock_override) : false;
  const title = event?.title ?? "";

  const theme = {
    primary: isRequestOnly ? "text-[#eab308]" : "text-[var(--brand)]",
    bg: isRequestOnly ? "bg-[#eab308]" : "bg-[var(--brand)]",
    button: isRequestOnly ? "bg-[#eab308] text-black" : "bg-[var(--brand)] text-white",
  };

  function handleJoinClick() {
    if (!isLoggedIn) { navigate("/signin"); return; }
    if (myStatus) {
      if (leaveArmed) { setLeaveArmed(false); confirmLeave(); } else { setLeaveArmed(true); }
      return;
    }
    const rect = joinBtnRef.current?.getBoundingClientRect();
    setJoinModalOrigin(rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null);
    setJoinModalEntered(false);
    setSelectedPosition(null);
    setTeamName("");
    setShowJoinModal(true);
  }

  // Modal pops open from the CTA button's on-screen position instead of just
  // fading in centered. Must measure the box's NATURAL (untransformed) rect
  // before any scale is applied — getBoundingClientRect() already reflects
  // CSS transforms, so reading it after scale-0 was live returned a
  // collapsed rect near the default center origin, not the button. Doing
  // this via direct style writes in a layout effect (instead of a Tailwind
  // class driven by state) means the browser never paints the untransformed
  // frame — no flash before it collapses to the origin point.
  useLayoutEffect(() => {
    if (!showJoinModal || !joinModalBoxRef.current) return;
    const box = joinModalBoxRef.current;
    const rect = box.getBoundingClientRect();
    if (joinModalOrigin) {
      box.style.transformOrigin = `${joinModalOrigin.x - rect.left}px ${joinModalOrigin.y - rect.top}px`;
    }
    box.style.transition = "none";
    box.style.transform = "scale(0.01)";
    box.style.opacity = "0";
    void box.offsetHeight; // force reflow so the collapsed state actually commits
    const raf = requestAnimationFrame(() => {
      box.style.transition = "transform 320ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease-out";
      box.style.transform = "scale(1)";
      box.style.opacity = "1";
      setJoinModalEntered(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [showJoinModal, joinModalOrigin]);

  async function confirmJoin() {
    if (!authUser || !event || busy) return;
    setBusy(true);
    const position = requiresPosition ? selectedPosition : null;
    const team_name = requiresTeamName ? teamName.trim() : null;
    if (isRequestOnly) {
      await supabase.from("event_requests").insert({ event_id: event.id, player_id: authUser.id, kind: "request", status: "pending", position, team_name });
    } else if (isFull) {
      await supabase.from("event_requests").insert({ event_id: event.id, player_id: authUser.id, kind: "waitlist", status: "pending", position, team_name });
    } else {
      await supabase.from("event_participants").insert({ event_id: event.id, player_id: authUser.id, position, team_name });
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
  }

  const joinButtonLabel = () => {
    if (myStatus === "joined") return t.event.joined;
    if (myStatus === "pending") return t.profile.pending;
    if (isFull && !isRequestOnly) return "Join Waitlist";
    return isRequestOnly ? t.event.sendRequest : t.event.joinDirectly;
  };

  if (loading) return <div className="min-h-full bg-[var(--surface-0)]" />;

  if (notFound || !event) {
    return (
      <div className="min-h-full bg-[var(--surface-0)] text-[var(--ink)]">
        <BackBar label={t.nav.events} to="/" />
        <div className="px-4 py-16 text-center text-[#79828b] text-sm">{t.common.nothingHere}</div>
      </div>
    );
  }

return (
    <div className="min-h-full bg-[var(--surface-0)] text-[var(--ink)] font-sans">
      <Toast message={toast.message} visible={toast.visible} variant="copied" onHide={() => setToast(prev => ({ ...prev, visible: false }))} />

      {/* Join confirmation modal — pops open from the CTA button's on-screen
          position, so it keeps its own overlay opacity + box scale animation
          instead of the shell's default instant show. */}
      {showJoinModal && (
        <ModalOverlay
          rounded="rounded-[2rem]"
          overlayClassName={`transition-opacity duration-200 ${joinModalEntered ? "opacity-100" : "opacity-0"}`}
          boxRef={joinModalBoxRef}
        >
          <h3 className="font-black italic uppercase tracking-widest text-[var(--ink)] text-lg mb-1">
            {isRequestOnly ? t.event.sendRequest : isFull ? "Join Waitlist" : t.event.joinTitle}
          </h3>
          <p className="text-[#79828b] text-sm mb-5">
            {isRequestOnly
              ? t.event.requestDesc
              : isFull
                ? "This event is full — you'll join the waitlist and move up automatically if a spot opens up."
                : t.event.joinDesc}
          </p>

          {requiresPosition && (
            <div className="mb-5">
              <p className="block w-full text-[10px] font-black uppercase tracking-widest text-[#79828b] mb-3">{t.event.selectPosition}</p>
              <PositionList
                positions={POSITIONS.map(p => ({ value: p, label: positionLabel(p, t) }))}
                value={selectedPosition}
                onChange={setSelectedPosition}
                accent={isRequestOnly ? "gold" : "violet"}
              />
            </div>
          )}

          {requiresTeamName && (
            <div className="mb-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#79828b] mb-2">{t.event.teamName}</p>
              <input
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder={t.event.teamNamePlaceholder}
                className="w-full h-10 bg-[var(--ink)]/5 border border-[var(--ink)]/10 rounded-lg px-3 text-[var(--ink)] text-sm font-bold outline-none focus:border-[var(--ink)]/25 transition-colors placeholder:text-[#79828b] placeholder:font-normal"
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setShowJoinModal(false)}
              className="flex-1 py-2.5 rounded-full border border-[var(--ink)]/10 text-[#79828b] font-bold text-sm hover:text-[var(--ink)] transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              onClick={confirmJoin}
              disabled={busy || (requiresPosition && !selectedPosition) || (requiresTeamName && !teamName.trim())}
              className={`flex-1 py-2.5 rounded-full font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${theme.button}`}
            >
              {isRequestOnly || isFull ? t.event.sendRequest : t.event.join}
            </button>
          </div>
        </ModalOverlay>
      )}


      <BackBar label={t.nav.events} to="/">
        <button
          onClick={() => {
            const url = window.location.href;
            if (navigator.share) {
              navigator.share({ title, url });
            } else {
              navigator.clipboard.writeText(url).then(() => fireToast(t.common.linkCopied));
            }
          }}
          className="flex items-center gap-1.5 text-[#79828b] hover:text-[var(--ink)] transition-colors text-sm font-bold"
        >
          <Share2 size={16} />
          <span>{t.event.share}</span>
        </button>
      </BackBar>

<div className="px-4 pb-12 max-w-[640px] mx-auto pt-4">

        {/* COMPACT UPPER SECTION */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <h1 className="text-3xl font-black italic uppercase tracking-tight leading-none text-[var(--ink)]">
              {title}
            </h1>
            <CategoryIcon category={event.category} size={20} className="text-[#79828b] shrink-0" />
          </div>

          {/* Organizer */}
          <ProfileRow
            avatar={event.moderator?.avatar ?? null}
            avatarAlt="Organizer"
            avatarSize={44}
            eyebrow={t.event.organizer}
            primary={<span className="text-[var(--ink)] font-bold text-sm">{event.moderator?.name ?? "—"}</span>}
            checkmark
            variant="card"
            className="mb-4 shadow-sm"
            avatarOnly={isMobile}
            onClick={isLoggedIn ? () => { navDir.forward(); navigate(playerProfilePath(event.moderator_id), { state: { hub } }); } : undefined}
          />

          {/* Info Panel */}
          <div className="relative">
            {event.level && <LevelBookmark level={event.level} insufficient={isRequestOnly} />}
            <div className="bg-[var(--surface-1)] rounded-2xl overflow-hidden">
              <div className="relative flex items-center gap-2.5 p-3 hover:bg-[var(--surface-hover)] transition-colors before:absolute before:top-0 before:left-3 before:right-3 before:h-px before:bg-[var(--ink)]/[0.06] first:before:hidden">
                <Calendar size={16} className={theme.primary} />
                <span className="text-sm font-semibold text-[var(--ink)]/90">{shortDate(event.event_date, t, true)} · {event.event_time}</span>
              </div>
              <div className="relative flex items-center gap-2.5 p-3 hover:bg-[var(--surface-hover)] transition-colors before:absolute before:top-0 before:left-3 before:right-3 before:h-px before:bg-[var(--ink)]/[0.06] first:before:hidden">
                <Ticket size={16} className={theme.primary} />
                <span className="text-sm font-semibold text-[var(--ink)]/90">{event.price_label ?? "FREE"}</span>
              </div>
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(event.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="relative flex items-center gap-2.5 p-3 hover:bg-[var(--surface-hover)] transition-colors before:absolute before:top-0 before:left-3 before:right-3 before:h-px before:bg-[var(--ink)]/[0.06] first:before:hidden"
              >
                <MapPin size={16} className={theme.primary} />
                <span className="text-sm font-semibold text-[var(--ink)]/90 truncate">
                  {event.location}
                </span>
              </a>
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
                  <span className="text-sm font-semibold text-[var(--ink)]/90 truncate flex-1">{event.attachment_name ?? "Attachment"}</span>
                  <Download size={14} className="text-[#79828b] shrink-0" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ROSTER SECTION */}
        <div>
          <div className="flex justify-between items-center mb-3 px-1">
            <h2 className="font-bold text-lg text-[var(--ink)]">
              {currentCapacity}{" "}
              <span className="text-[#79828b]">/ {maxCapacity} Players</span>
            </h2>

            {isCanceled ? (
              <span className="w-48 py-3 flex items-center justify-center rounded-xl font-bold text-sm tracking-wide bg-[#ef4444]/10 text-[#ef4444] cursor-default">
                {t.event.canceled.toUpperCase()}
              </span>
            ) : myStatus === "joined" && rosterLocked ? null : (
              <button
                ref={joinBtnRef}
                onClick={handleJoinClick}
                onPointerDown={joinRipple.onPointerDown}
                className={`relative overflow-hidden w-48 py-3 flex items-center justify-center rounded-xl font-bold text-sm tracking-wide transition-colors focus:outline-none ${
                  myStatus
                    ? leaveArmed
                      ? "text-white"
                      : isRequestOnly
                        ? "bg-[#eab308]/10 hover:bg-[#eab308]/20 text-[#eab308]"
                        : "bg-[var(--brand)]/10 hover:bg-[var(--brand)]/20 text-[var(--brand)]"
                    : `hover:brightness-110 ${theme.button}`
                }`}
              >
                {myStatus && (
                  <span
                    aria-hidden
                    className={`absolute inset-0 bg-[#dc2626] transition-transform duration-300 ease-out ${leaveArmed ? "translate-x-0" : "translate-x-full"}`}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-2 whitespace-nowrap">
                  {myStatus && (
                    <LogOut size={14} className={`shrink-0 transition-transform duration-300 ${leaveArmed ? "rotate-12" : ""}`} />
                  )}
                  {myStatus
                    ? leaveArmed
                      ? t.admin.tapToConfirm
                      : myStatus === "joined" ? t.event.leaveBtn.toUpperCase() : t.event.cancelRequestBtn.toUpperCase()
                    : joinButtonLabel()}
                </span>
                <RippleLayer ripples={joinRipple.ripples} />
              </button>
            )}
          </div>

          {/* Capacity Bar */}
          <div className="w-full h-1.5 bg-[var(--ink)]/5 rounded-full mb-4 overflow-hidden">
            <div
              className={`h-full ${theme.bg} rounded-full transition-all duration-500`}
              style={{ width: `${maxCapacity > 0 ? Math.min(100, (currentCapacity / maxCapacity) * 100) : 0}%` }}
            />
          </div>

          {/* Player List — visible to guests too; only the "View Profile" action requires login.
              One shared panel with dividers between rows (matches the Waitlist panel below),
              not separate floating cards. */}
          {roster.length === 0 ? (
            <p className="text-[#79828b] text-sm py-4 text-center">No one has joined yet — be the first!</p>
          ) : (
            <div className="bg-[var(--surface-1)] rounded-2xl overflow-hidden">
              {roster.map((player) => {
                const clickable = isLoggedIn && !player.isGuest;
                const isMe = player.id === authUser?.id;
                const isOrganizer = player.id === event.moderator_id;
                return (
                  <ProfileRow
                    key={player.id}
                    avatar={player.avatar}
                    avatarAlt={player.name}
                    verified={player.verified}
                    trustLabel={player.trustLabel}
                    divider
                    avatarOnly={isMobile}
                    onClick={clickable ? () => { navDir.forward(); navigate(playerProfilePath(player.id), { state: { hub } }); } : undefined}
                    primary={
                      requiresTeamName ? (
                        <span className={`font-bold text-sm block truncate ${player.teamName ? "text-[var(--ink)]" : "text-[#79828b]/50 italic font-normal"}`}>
                          {player.teamName || "No team name set"}
                        </span>
                      ) : (
                        <span className="font-bold text-sm block text-[var(--ink)] truncate">{player.name}</span>
                      )
                    }
                    secondary={
                      requiresTeamName ? (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#79828b] block truncate">
                          Captain: {player.name}
                        </span>
                      ) : requiresPosition && player.position ? (
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.primary}`}>
                          {positionLabel(player.position, t)}
                        </span>
                      ) : undefined
                    }
                    trailing={
                      (isOrganizer || isMe) && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#79828b] shrink-0">
                          {isOrganizer ? "Organizer" : "You"}
                        </span>
                      )
                    }
                  />
                );
              })}
            </div>
          )}

          {/* Waitlist */}
          {isLoggedIn && waitlist.length > 0 && (() => {
            const renderRow = (player: WaitlistEntry) => {
              const isMe = player.id === authUser?.id;
              return (
                <ProfileRow
                  key={player.id}
                  avatar={player.avatar}
                  avatarAlt={player.name}
                  verified={player.verified}
                  trustLabel={player.trustLabel}
                  divider
                  avatarOnly={isMobile}
                  onClick={() => { if (isMe) navigate("/profile", { state: { hub } }); else { navDir.forward(); navigate(playerProfilePath(player.id), { state: { hub } }); } }}
                  primary={
                    <span className={`font-bold text-sm block truncate ${isMe ? theme.primary : "text-[var(--ink)]"}`}>{player.name}</span>
                  }
                  trailing={
                    isMe && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#79828b] shrink-0">{t.event.you}</span>
                    )
                  }
                />
              );
            };

            if (waitlist.length === 1) {
              return (
                <div className="mt-4 mb-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#79828b] mb-2 px-1">{t.event.waitlist}</p>
                  <div className="bg-[var(--surface-1)] rounded-xl overflow-hidden">
                    {renderRow(waitlist[0])}
                  </div>
                </div>
              );
            }

            return (
              <div className="mt-4 mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#79828b] mb-2 px-1">{t.event.waitlist}</p>
                <div ref={waitlistBoxRef} className="bg-[var(--surface-1)] rounded-xl overflow-hidden">
                  {/* Avatar stack + count stays put whether collapsed or expanded - only
                      the chevron and the rows below react to waitlistOpen. */}
                  <button onClick={() => setWaitlistOpen(v => !v)} className="w-full flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-[var(--surface-hover)] transition-colors">
                    <div className="flex -space-x-2.5">
                      {waitlist.slice(0, 3).map((p, i) => (
                        <div key={p.id} className="relative" style={{ zIndex: 3 - i }}>
                          {p.avatar ? (
                            <img
                              src={p.avatar}
                              alt={p.name}
                              className="w-8 h-8 rounded-full border-2 border-[var(--surface-1)] object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full border-2 border-[var(--surface-1)] bg-[var(--ink)]/5 flex items-center justify-center">
                              <User size={12} className="text-[var(--ink)]/30" />
                            </div>
                          )}
                          <VerifiedBadge verified={p.verified} size={10} ringClassName="border-[var(--surface-1)]" />
                          <TrustDot label={p.trustLabel} size={8} ringClassName="border-[var(--surface-1)]" />
                        </div>
                      ))}
                      {waitlist.length > 3 && (
                        <div className="w-8 h-8 rounded-full border-2 border-[var(--surface-1)] bg-[var(--ink)]/10 flex items-center justify-center text-[9px] font-bold text-[var(--ink)]/50" style={{ zIndex: 0 }}>
                          +{waitlist.length - 3}
                        </div>
                      )}
                    </div>
                    <span className="flex-1 text-left text-[var(--ink)] font-bold text-sm">{t.event.players(waitlist.length)}</span>
                    <ChevronDown size={15} className={`text-[#79828b] shrink-0 transition-transform duration-200 ${waitlistOpen ? "rotate-180" : ""}`} />
                  </button>
                  <div
                    className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${waitlistOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                  >
                    <div ref={waitlistRowsRef} className="relative overflow-hidden min-h-0 before:absolute before:top-0 before:left-3 before:right-3 before:h-px before:bg-[var(--ink)]/[0.06]">
                      {waitlist.map(player => renderRow(player))}
                    </div>
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
