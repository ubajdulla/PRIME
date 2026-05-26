import { useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  MoreVertical,
  User,
  Ticket,
  X,
  Share2,
} from "lucide-react";

const SKILL_ORDER = ["Rookie", "Beginner", "Intermediate", "Advanced", "Pro", "PRIME"];

const EVENT_CATS: Record<string, string> = {
  e1: "GAMES", e2: "TOURNAMENT", e3: "TRAININGS", e4: "TOURNAMENT", e5: "BEACH",
};

const ROSTER = [
  { name: "ZeroCool",    role: "Setter",        img: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop" },
  { name: "NeonSamurai", role: "Outside Hitter", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop" },
  { name: "CyberNinja",  role: "Libero",         img: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150&h=150&fit=crop" },
  { name: "GlitchKing",  role: "Middle Blocker", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop" },
  { name: "PrimeAlpha",  role: "Opposite",       img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop" },
  { name: "ViperX",      role: "Outside Hitter", img: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop" },
  { name: "Anonymous",   role: "Reserved",       img: null as string | null },
];

const WAITLIST = [
  { name: "PixelPunk",  img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop" },
  { name: "StealthV",   img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop" },
  { name: "ByteKing",   img: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=150&h=150&fit=crop" },
  { name: "XBlaze",     img: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&h=150&fit=crop" },
  { name: "NovaPulse",  img: "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=150&h=150&fit=crop" },
  { name: "GridLock",   img: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=150&h=150&fit=crop" },
];

const FLAKED = [
  { name: "GhostRider", img: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=150&h=150&fit=crop" },
  { name: "ShadowByte", img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop" },
];

const PLAYER_AVATAR = "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=150&h=150&fit=crop&crop=face";
const PLAYER_NAME = "Alex Novak";

type JoinStatus = null | "joined" | "pending";

export function EventDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const isCanceled = (() => {
    try {
      const stored: string[] = JSON.parse(localStorage.getItem("prime:canceled_events") || "[]");
      return stored.includes(id ?? "");
    } catch { return false; }
  })();
  const [joinStatus, setJoinStatus] = useState<JoinStatus>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [swipe, setSwipe] = useState<{ dir: 'left' | 'right' | null; progress: number }>({ dir: null, progress: 0 });
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchLocked = useRef<'h' | 'v' | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchLocked.current = null;
  }

  function onTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (!touchLocked.current && (absDx > 8 || absDy > 8)) {
      touchLocked.current = absDx > absDy ? 'h' : 'v';
    }
    if (touchLocked.current !== 'h') {
      if (swipe.dir !== null) setSwipe({ dir: null, progress: 0 });
      return;
    }
    setSwipe({ dir: dx > 0 ? 'right' : 'left', progress: Math.min(absDx / 100, 1) });
  }

  function onTouchEnd() {
    if (swipe.dir && swipe.progress >= 1) {
      if (swipe.dir === 'right') navigate(-1);
      else navigate(1);
    }
    setSwipe({ dir: null, progress: 0 });
    touchLocked.current = null;
  }

  const playerSkillLevel = "Intermediate";
  const isGame = (EVENT_CATS[id ?? ""] ?? "") === "GAMES";
  const eventSkillLevel = "Advanced";
  const isGameAdvancedPlus = isGame && SKILL_ORDER.indexOf(eventSkillLevel) >= SKILL_ORDER.indexOf("Advanced");
  const isRequestOnly = isGameAdvancedPlus && SKILL_ORDER.indexOf(playerSkillLevel) < SKILL_ORDER.indexOf(eventSkillLevel);
  const showPositions = isGameAdvancedPlus;

  const theme = {
    primary: isRequestOnly ? "text-[#eab308]" : "text-[#3390ec]",
    bg: isRequestOnly ? "bg-[#eab308]" : "bg-[#3390ec]",
    button: isRequestOnly ? "bg-[#eab308] text-black" : "bg-[#3390ec] text-white",
  };

  const title = isRequestOnly ? "ELITE SCRIMMAGE #42" : "PRO-AM INVITATIONAL";
  const maxCapacity = 10;
  const currentCapacity = ROSTER.length;

  function handleJoinClick() {
    if (joinStatus) {
      setShowLeaveConfirm(true);
    } else {
      setSelectedPosition(null);
      setShowJoinModal(true);
    }
  }

  function confirmJoin() {
    setJoinStatus(isRequestOnly ? "pending" : "joined");
    setShowJoinModal(false);
  }

  function confirmLeave() {
    setJoinStatus(null);
    setShowLeaveConfirm(false);
  }

  const joinButtonLabel = () => {
    if (joinStatus === "joined") return "Joined";
    if (joinStatus === "pending") return "Pending";
    return isRequestOnly ? "Send a Request" : "Join Directly";
  };

return (
    <div
      className="relative min-h-screen bg-[#0e1621] text-white font-sans overflow-x-hidden selection:bg-white/20"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Swipe indicator */}
      {swipe.dir && swipe.progress > 0.1 && (
        <div className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center">
          <div
            className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center"
            style={{
              opacity: swipe.progress,
              transform: `scale(${0.6 + swipe.progress * 0.4})`,
            }}
          >
            {swipe.dir === 'right'
              ? <ChevronLeft size={28} className="text-white" />
              : <ChevronRight size={28} className="text-white" />
            }
          </div>
        </div>
      )}

      {/* Invisible backdrop to close any open dropdown menu */}
      {openMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
      )}

      {/* Join confirmation modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowJoinModal(false)}>
          <div className="w-full max-w-sm bg-[#17212b] border border-white/10 rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-black italic uppercase tracking-widest text-white text-lg mb-1">
              {isRequestOnly ? "Send Request?" : "Join Event?"}
            </h3>
            <p className="text-[#79828b] text-sm mb-4">
              {isRequestOnly
                ? "Your request will be sent to the organizer for approval."
                : "You'll be added to the roster immediately."}
            </p>

            {isGameAdvancedPlus && (
              <div className="mb-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#79828b] mb-2">Select your position</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Outside Hitter", "Opposite Hitter", "Setter", "Middle Blocker", "Libero", "Right Side"].map(pos => (
                    <button
                      key={pos}
                      onClick={() => setSelectedPosition(pos)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all active:scale-95 ${
                        selectedPosition === pos
                          ? "bg-[#3390ec] border-[#3390ec] text-white"
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
                Cancel
              </button>
              <button
                onClick={confirmJoin}
                disabled={isGameAdvancedPlus && !selectedPosition}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${theme.button}`}
              >
                {isRequestOnly ? "Send Request" : "Join"}
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
              {joinStatus === "pending" ? "Cancel Request?" : "Leave Event?"}
            </h3>
            <p className="text-[#79828b] text-sm mb-6">
              {joinStatus === "pending"
                ? "Your request will be withdrawn."
                : "You will be removed from the roster."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#79828b] font-bold text-sm hover:text-white transition-colors"
              >
                Keep
              </button>
              <button
                onClick={confirmLeave}
                className="flex-1 py-2.5 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] font-bold text-sm active:scale-[0.98] transition-transform"
              >
                {joinStatus === "pending" ? "Cancel Request" : "Leave"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky back bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[#0e1621]/90 backdrop-blur-md border-b border-white/5">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-[#79828b] hover:text-white transition-colors text-sm font-bold"
        >
          <ChevronLeft size={18} /> Back
        </button>
        <div className="relative">
          <button
            onClick={() => {
              const url = window.location.href;
              if (navigator.share) {
                navigator.share({ title, url });
              } else {
                navigator.clipboard.writeText(url).then(() => {
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 2000);
                });
              }
            }}
            className="flex items-center gap-1.5 text-[#79828b] hover:text-white transition-colors text-sm font-bold"
          >
            <Share2 size={16} />
            {shareCopied ? <span className="text-[#4dcd5e] text-xs font-bold">Copied!</span> : <span>Share</span>}
          </button>
        </div>
      </div>

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
                <img
                  src="https://images.unsplash.com/photo-1587930693964-e16abf7299f5?w=150&h=150&fit=crop"
                  alt="Organizer"
                  className="w-11 h-11 rounded-full object-cover border border-white/10"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#3390ec] rounded-full flex items-center justify-center border-2 border-[#17212b]">
                  <CheckCircle2 size={10} className="text-white" strokeWidth={3} />
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#79828b] uppercase tracking-widest leading-tight">Organizer</div>
                <div className="text-white font-bold text-sm">N3ON_KING</div>
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setOpenMenu(openMenu === "organizer" ? null : "organizer")}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors text-[#79828b]"
              >
                <MoreVertical size={18} />
              </button>
              {openMenu === "organizer" && (
                <div
                  className="absolute right-0 top-full mt-1 bg-[#222f3e] border border-white/10 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] z-20 overflow-hidden min-w-[140px]"
                  onClick={() => setOpenMenu(null)}
                >
                  <button
                    onClick={() => navigate("/profile")}
                    className="flex items-center gap-2 w-full px-4 py-3 text-sm font-bold text-white hover:bg-white/5 transition-colors text-left"
                  >
                    <User size={14} />
                    View Profile
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Info Panel */}
          <div className="bg-[#17212b] border border-white/5 rounded-xl flex flex-col">
            <div className="flex justify-between items-center p-3 border-b border-white/5 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <Calendar size={16} className={theme.primary} />
                <span className="text-sm font-semibold text-white/90">Fri, Oct 25</span>
              </div>
              <div className="hidden sm:block w-[1px] h-4 bg-white/10" />
              <div className="flex items-center gap-2.5">
                <Clock size={16} className={theme.primary} />
                <span className="text-sm font-semibold text-white/90">20:00 - 22:00</span>
              </div>
              <div className="hidden sm:block w-[1px] h-4 bg-white/10" />
              <div className="flex items-center gap-2.5">
                <Ticket size={16} className={theme.primary} />
                <span className="text-sm font-semibold text-white/90">625 CZK</span>
              </div>
            </div>
            <a
              href="https://maps.google.com/?q=Cyber+Arena+Court+4+Sector+7"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 p-3 hover:bg-white/5 transition-colors rounded-b-xl"
            >
              <MapPin size={16} className={theme.primary} />
              <span className="text-sm font-semibold text-white/90 truncate">
                Cyber Arena • Court 4, Sector 7
              </span>
            </a>
          </div>

          <p className="text-[#79828b] text-xs leading-relaxed mt-4 px-1">
            Competitive scrimmage. Men's Standard net. Late arrivals blacklisted.
          </p>
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
                CANCELED
              </span>
            ) : (
              <button
                onClick={handleJoinClick}
                className={`w-36 py-2 justify-center rounded-lg font-bold text-sm transition-all active:scale-[0.98] shadow-sm ${
                  joinStatus
                    ? `bg-transparent border ${isRequestOnly ? "border-[#eab308] text-[#eab308]" : "border-[#3390ec] text-[#3390ec]"}`
                    : theme.button
                }`}
              >
                {joinStatus === "joined" ? "LEAVE" : joinStatus === "pending" ? "CANCEL" : joinButtonLabel()}
              </button>
            )}
          </div>

          {/* Capacity Bar */}
          <div className="w-full h-1.5 bg-white/5 rounded-full mb-4 overflow-hidden">
            <div
              className={`h-full ${theme.bg} rounded-full transition-all duration-500`}
              style={{ width: `${(currentCapacity / maxCapacity) * 100}%` }}
            />
          </div>

          {/* Player List */}
          <div className="flex flex-col gap-2">
            {ROSTER.map((player, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-[#17212b] border border-white/5 rounded-xl p-2.5"
              >
                {player.img ? (
                  <img
                    src={player.img}
                    alt={player.name}
                    className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
                    <User size={16} className="text-white/30" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className={`font-bold text-sm block ${player.img ? "text-white" : "text-white/30"}`}>{player.name}</span>
                  {showPositions && (
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${player.img ? theme.primary : "text-white/20"}`}>
                      {player.role}
                    </span>
                  )}
                </div>
                <div className="relative shrink-0">
                  <button
                    onClick={() => setOpenMenu(openMenu === `player-${i}` ? null : `player-${i}`)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors text-[#79828b]"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {openMenu === `player-${i}` && (
                    <div
                      className="absolute right-0 top-full mt-1 bg-[#222f3e] border border-white/10 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] z-20 overflow-hidden min-w-[140px]"
                      onClick={() => setOpenMenu(null)}
                    >
                      <button
                        onClick={() => navigate("/profile")}
                        className="flex items-center gap-2 w-full px-4 py-3 text-sm font-bold text-white hover:bg-white/5 transition-colors text-left"
                      >
                        <User size={14} />
                        View Profile
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Waitlist */}
          {(() => {
            const stackList = joinStatus === "pending"
              ? [{ name: PLAYER_NAME, img: PLAYER_AVATAR, isMe: true }, ...WAITLIST.map(p => ({ ...p, isMe: false }))]
              : WAITLIST.map(p => ({ ...p, isMe: false }));
            const sortedList = joinStatus === "pending"
              ? [...WAITLIST.map(p => ({ ...p, isMe: false })), { name: PLAYER_NAME, img: PLAYER_AVATAR, isMe: true }]
              : WAITLIST.map(p => ({ ...p, isMe: false }));
            const stackAvatars = stackList.slice(0, 3);
            const stackExtra = stackList.length - 3;
            return (
              <div className="mt-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#79828b] mb-2 px-1">Waitlist</p>
                <div className="bg-[#17212b] border border-white/5 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setWaitlistOpen(v => !v)}
                    className="w-full flex items-center gap-3 px-3 py-2.5"
                  >
                    <div className="flex -space-x-2.5">
                      {stackAvatars.map((p, i) => (
                        <img
                          key={i}
                          src={p.img}
                          alt={p.name}
                          className="w-8 h-8 rounded-full border-2 border-[#17212b] object-cover"
                          style={{ zIndex: stackAvatars.length - i }}
                        />
                      ))}
                      {stackExtra > 0 && (
                        <div className="w-8 h-8 rounded-full border-2 border-[#17212b] bg-white/10 flex items-center justify-center text-[9px] font-bold text-white/50" style={{ zIndex: 0 }}>
                          +{stackExtra}
                        </div>
                      )}
                    </div>
                    <span className="flex-1 text-left text-white font-bold text-sm">{stackList.length} Players</span>
                    <ChevronDown size={15} className={`text-[#79828b] transition-transform duration-300 shrink-0 ${waitlistOpen ? "rotate-180" : ""}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${waitlistOpen ? "max-h-[600px]" : "max-h-0"}`}>
                    {sortedList.map((player, i) => {
                      const menuKey = `waitlist-${i}`;
                      return (
                        <div key={i} className="flex items-center gap-3 px-3 py-2.5 border-t border-white/[0.05]">
                          <img src={player.img} alt={player.name} className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
                          <span className={`font-bold text-sm flex-1 ${player.isMe ? theme.primary : "text-white"}`}>
                            {player.name}
                            {player.isMe && <span className="text-[10px] text-[#79828b] font-bold ml-2 normal-case tracking-normal">You</span>}
                          </span>
                          <div className="relative shrink-0">
                            <button
                              onClick={() => setOpenMenu(openMenu === menuKey ? null : menuKey)}
                              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors text-[#79828b]"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {openMenu === menuKey && (
                              <div
                                className="absolute right-0 top-full mt-1 bg-[#222f3e] border border-white/10 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] z-20 overflow-hidden min-w-[140px]"
                                onClick={() => setOpenMenu(null)}
                              >
                                <button
                                  onClick={() => navigate("/profile")}
                                  className="flex items-center gap-2 w-full px-4 py-3 text-sm font-bold text-white hover:bg-white/5 transition-colors text-left"
                                >
                                  <User size={14} />
                                  View Profile
                                </button>
                              </div>
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

          {/* Flaked */}
          {FLAKED.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#79828b] mb-2 px-1">Flaked</p>
              <div className="bg-[#17212b] border border-white/5 rounded-xl overflow-hidden">
                {FLAKED.map((player, i) => {
                  const menuKey = `flaked-${i}`;
                  return (
                    <div key={i} className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? "border-t border-white/[0.05]" : ""}`}>
                      <img src={player.img} alt={player.name} className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0 grayscale opacity-40" />
                      <span className="font-bold text-sm text-white/25 line-through flex-1">{player.name}</span>
                      <div className="relative shrink-0">
                        <button
                          onClick={() => setOpenMenu(openMenu === menuKey ? null : menuKey)}
                          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors text-[#79828b]/40"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openMenu === menuKey && (
                          <div
                            className="absolute right-0 top-full mt-1 bg-[#222f3e] border border-white/10 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] z-20 overflow-hidden min-w-[140px]"
                            onClick={() => setOpenMenu(null)}
                          >
                            <button
                              onClick={() => navigate("/profile")}
                              className="flex items-center gap-2 w-full px-4 py-3 text-sm font-bold text-white hover:bg-white/5 transition-colors text-left"
                            >
                              <User size={14} />
                              View Profile
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
