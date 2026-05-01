import { useNavigate } from "react-router";
import { ChevronRight } from "lucide-react";
import { ALL_PLAYERS, SKILL_ORDER, SKILL_STYLE } from "../../data/adminData";

export function AdminPlayers() {
  const navigate = useNavigate();

  const groups = [...SKILL_ORDER].reverse().map(level => ({
    level,
    count: ALL_PLAYERS.filter(p => p.skillLevel === level).length,
  }));

  return (
    <div className="max-w-[900px] mx-auto px-4 py-8">
      <h1 className="font-black italic text-2xl text-white uppercase tracking-widest mb-6">Players</h1>

      <div className="flex flex-col gap-2">
        {groups.map(({ level, count }) => {
          const s = SKILL_STYLE[level];
          return (
            <button
              key={level}
              onClick={() => navigate(`/admin/players/${level}`)}
              className="flex items-center gap-3 px-4 py-3.5 bg-[#17212b] rounded-xl border border-white/5 hover:border-white/10 active:scale-[0.99] transition-all text-left"
            >
              <div className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
              <span className={`font-black uppercase tracking-widest text-sm flex-1 ${s.text}`}>{level}</span>
              <span className="text-[#79828b] text-xs font-bold">{count} player{count !== 1 ? "s" : ""}</span>
              <ChevronRight size={15} className="text-[#79828b] shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
