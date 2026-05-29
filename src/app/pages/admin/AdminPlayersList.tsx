import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ChevronDown, Search, MoreVertical } from "lucide-react";
import { ALL_PLAYERS, ADMIN_EVENTS, SKILL_STYLE } from "../../data/adminData";
import { BackBar } from "../../components/ui/BackBar";
import { navDir } from "../../lib/navDir";

const POSITIONS = ["All", "Outside Hitter", "Opposite Hitter", "Setter", "Middle Blocker", "Libero"];

export function AdminPlayersList() {
  const { level } = useParams<{ level: string }>();
  const navigate = useNavigate();

  const [search, setSearch]                   = useState("");
  const [position, setPosition]               = useState("All");
  const [openMenu, setOpenMenu]               = useState<string | null>(null);
  const [playerPositions, setPlayerPositions] = useState<Record<string, string>>({});

  const style = SKILL_STYLE[level ?? ""] ?? SKILL_STYLE["Rookie"];

  const playerStats = ALL_PLAYERS
    .filter(p => p.skillLevel === level)
    .map(p => {
      const events = ADMIN_EVENTS.filter(e => e.roster.some(r => r.id === p.id));
      return { ...p, eventsJoined: events.length };
    });

  const filtered = playerStats.filter(p => {
    const currentPosition = playerPositions[p.id] ?? p.position;
    if (position !== "All" && currentPosition !== position) return false;
    if (search.trim() && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <BackBar label="Players" to="/admin/players" />

      <div className="max-w-[900px] mx-auto px-4 py-6">

      <div className="flex items-center gap-3 mb-6">
        <div className={`w-3 h-3 rounded-full ${style.dot}`} />
        <h1 className={`font-black italic text-2xl uppercase tracking-widest ${style.text}`}>{level}</h1>
        <span className="text-[#79828b] text-sm font-bold">{playerStats.length} players</span>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#79828b]" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name..."
          className="w-full bg-[#17212b] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm font-bold placeholder:text-[#79828b]/60 focus:outline-none focus:border-[#3390ec]/50 transition-colors"
        />
      </div>

      {/* Position filter */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto [&::-webkit-scrollbar]:hidden pb-1">
        {POSITIONS.map(pos => (
          <button
            key={pos}
            onClick={() => setPosition(pos)}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] uppercase tracking-wider whitespace-nowrap flex-shrink-0 border transition-all ${
              position === pos
                ? "bg-white/10 text-white border-white/20"
                : "bg-transparent text-[#79828b] border-white/5 hover:border-white/15 hover:text-white/70"
            }`}
          >
            {pos}
          </button>
        ))}
      </div>

      {/* Player list */}
      <div className="bg-[#17212b] rounded-2xl border border-white/5">
        {filtered.length === 0 && (
          <p className="text-[#79828b] text-sm text-center py-10">No players found</p>
        )}
        {filtered.map((player, i) => {
          const currentPosition = playerPositions[player.id] ?? player.position;
          return (
            <div
              key={player.id}
              className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-white/[0.05]" : ""} ${i === 0 ? "rounded-t-2xl" : ""} ${i === filtered.length - 1 ? "rounded-b-2xl" : ""}`}
            >
              <img
                src={player.avatar}
                alt={player.name}
                className="w-11 h-11 rounded-full border-2 border-[#0e1621] object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-sm truncate">{player.name}</div>
                <div className="text-[#79828b] text-[11px] uppercase tracking-wider">{currentPosition}</div>
              </div>
              <div className="text-right shrink-0 mr-1">
                <div className="text-white text-sm font-black">{player.eventsJoined}</div>
                <div className="text-[#79828b] text-[10px]">events</div>
              </div>
              <div className="relative shrink-0">
                <button
                  onClick={() => setOpenMenu(openMenu === player.id ? null : player.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[#79828b] hover:text-white hover:bg-white/5 transition-colors"
                >
                  <MoreVertical size={15} />
                </button>
                {openMenu === player.id && (
                  <div className="absolute right-0 top-full mt-1 bg-[#222f3e] border border-white/10 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.4)] z-20 overflow-hidden min-w-[200px]">
                    <button
                      onClick={() => { navDir.forward(); navigate(`/admin/player/${player.id}`); setOpenMenu(null); }}
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm font-bold text-white hover:bg-white/5 transition-colors text-left border-b border-white/5"
                    >
                      View Profile
                    </button>
                    <div className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="text-[#79828b] text-[10px] font-black uppercase tracking-widest mb-2">Position</div>
                      <div className="relative">
                        <select
                          value={currentPosition}
                          onChange={e => setPlayerPositions(prev => ({ ...prev, [player.id]: e.target.value }))}
                          className="w-full bg-[#17212b] border border-white/10 rounded-lg px-3 py-2 pr-8 text-white text-xs font-bold focus:outline-none focus:border-[#3390ec]/50 transition-colors [color-scheme:dark] appearance-none cursor-pointer"
                        >
                          {POSITIONS.filter(p => p !== "All").map(pos => (
                            <option key={pos} value={pos}>{pos}</option>
                          ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#79828b] pointer-events-none" />
                      </div>
                    </div>
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
}
