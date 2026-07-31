import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { SKILL_ORDER, SKILL_STYLE } from "../../data/adminData";
import { supabase } from "../../lib/supabaseClient";

export function AdminPlayers() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<{ skill_level: string; is_admin: boolean }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("skill_level, is_admin");
      setProfiles(data ?? []);
    })();
  }, []);

  const groups = [...SKILL_ORDER].reverse().map(level => ({
    level,
    count: profiles.filter(p => p.skill_level === level).length,
  }));
  const adminCount = profiles.filter(p => p.is_admin).length;

  return (
    <div className="max-w-[640px] mx-auto px-4 py-8">
      <h1 className="font-black italic text-2xl text-white uppercase tracking-widest mb-6">Players</h1>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => navigate("/admin/players/ADMIN")}
          className="flex items-center gap-3 px-4 py-3.5 bg-[#212121] rounded-xl border border-white/5 hover:border-white/10 transition-all text-left"
        >
          <ShieldCheck size={13} className="text-[#4dcd5e] shrink-0" />
          <span className="font-black uppercase tracking-widest text-sm flex-1 text-[#4dcd5e]">Admin</span>
          <span className="text-[#79828b] text-xs font-bold">{adminCount} player{adminCount !== 1 ? "s" : ""}</span>
          <ChevronRight size={15} className="text-[#79828b] shrink-0" />
        </button>

        {groups.map(({ level, count }) => {
          const s = SKILL_STYLE[level];
          return (
            <button
              key={level}
              onClick={() => navigate(`/admin/players/${level}`)}
              className="flex items-center gap-3 px-4 py-3.5 bg-[#212121] rounded-xl border border-white/5 hover:border-white/10 transition-all text-left"
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
