import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ChevronLeft,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  Share,
  MoreVertical,
  User,
  Ticket,
} from "lucide-react";

const SKILL_ORDER = ["Rookie", "Beginner", "Intermediate", "Advanced", "Pro", "PRIME"];

const ROSTER = [
  { name: "ZeroCool",    role: "Setter",        img: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop" },
  { name: "NeonSamurai", role: "Outside Hitter", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop" },
  { name: "CyberNinja",  role: "Libero",         img: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150&h=150&fit=crop" },
  { name: "GlitchKing",  role: "Middle Blocker", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop" },
  { name: "PrimeAlpha",  role: "Opposite",       img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop" },
  { name: "ViperX",      role: "Outside Hitter", img: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop" },
];

export function EventDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const isRequestOnly = id === "e2" || id === "e4";

  // Event-level properties (swap for real data when backend ready)
  const isGame = true;
  const eventSkillLevel = "Advanced"; // minimum skill level required for this event

  // Show positions only when the event is a game at Advanced level or higher
  const showPositions = isGame && SKILL_ORDER.indexOf(eventSkillLevel) >= SKILL_ORDER.indexOf("Advanced");

  const theme = {
    primary: isRequestOnly ? "text-[#ccff00]" : "text-[#3390ec]",
    bg: isRequestOnly ? "bg-[#ccff00]" : "bg-[#3390ec]",
    button: isRequestOnly ? "bg-[#ccff00] text-black" : "bg-[#3390ec] text-white",
  };

  const title = isRequestOnly ? "ELITE SCRIMMAGE #42" : "PRO-AM INVITATIONAL";
  const maxCapacity = 10;
  const currentCapacity = ROSTER.length;

  return (
    <div className="relative min-h-screen bg-[#0e1621] text-white font-sans overflow-x-hidden selection:bg-white/20">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 flex justify-between items-center px-4 py-3 bg-[#0e1621]/90 backdrop-blur-md border-b border-white/5">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-[#79828b] hover:text-white transition-colors text-sm font-bold"
        >
          <ChevronLeft size={18} /> Back
        </button>
        <div className="flex-1" />
        <button className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors">
          <Share size={18} strokeWidth={2} />
        </button>
      </div>

      <div className="px-4 pb-12 max-w-[600px] mx-auto mt-4">
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
            <div className="flex items-center gap-2.5 p-3">
              <MapPin size={16} className={theme.primary} />
              <span className="text-sm font-semibold text-white/90 truncate">
                Cyber Arena • Court 4, Sector 7
              </span>
            </div>
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
            <button className={`w-36 py-2 rounded-lg font-bold text-sm transition-transform active:scale-[0.98] shadow-sm ${theme.button}`}>
              {isRequestOnly ? "Send a Request" : "Join Directly"}
            </button>
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
                <img
                  src={player.img}
                  alt={player.name}
                  className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-white text-sm block">{player.name}</span>
                  {showPositions && (
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.primary}`}>
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

            {/* Empty Slots */}
            {Array.from({ length: maxCapacity - currentCapacity }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center gap-3 bg-white/5 border border-dashed border-white/10 rounded-xl p-2.5 opacity-60"
              >
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                  <User size={16} className="text-[#79828b]" />
                </div>
                <span className="font-bold text-[#79828b] text-sm">Open Slot</span>
              </div>
            ))}
          </div>

          {/* Waitlist */}
          <div className="mt-4 flex items-center p-3 bg-[#17212b] border border-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                <img src="https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=100&h=100&fit=crop" className="w-8 h-8 rounded-full border-2 border-[#17212b] relative z-30 object-cover" />
                <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop" className="w-8 h-8 rounded-full border-2 border-[#17212b] relative z-20 object-cover blur-[1px] brightness-75" />
                <div className="w-8 h-8 rounded-full border-2 border-[#17212b] bg-white/10 relative z-10 flex items-center justify-center text-[10px] font-bold text-white/50">+1</div>
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-xs">3 Players</span>
                <span className="text-[10px] text-[#79828b] uppercase font-bold tracking-widest">On Waitlist</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
