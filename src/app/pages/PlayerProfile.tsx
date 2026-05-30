import { useParams } from "react-router";
import { Send, Instagram, Calendar, MapPin } from "lucide-react";
import { ALL_PLAYERS, ADMIN_EVENTS, SKILL_STYLE } from "../data/adminData";
import { BackBar } from "../components/ui/BackBar";

const SKILL_COLOR: Record<string, string> = {
  PRIME:        "text-[#ccff00]",
  Pro:          "text-[#3390ec]",
  Advanced:     "text-[#a855f7]",
  Intermediate: "text-[#eab308]",
  Beginner:     "text-[#f97316]",
  Rookie:       "text-[#79828b]",
};

export function PlayerProfile() {
  const { playerId } = useParams<{ playerId: string }>();
  const player = ALL_PLAYERS.find(p => p.id === playerId);

  if (!player) {
    return (
      <div>
        <BackBar label="Back" />
        <div className="flex items-center justify-center min-h-[60vh] text-[#79828b]">
          <p className="font-bold">Player not found</p>
        </div>
      </div>
    );
  }

  const style = SKILL_STYLE[player.skillLevel];
  const ringColor = dotColor(player.skillLevel);

  const upcomingEvents = ADMIN_EVENTS.filter(
    e => e.status === "upcoming" && e.roster.some(r => r.id === player.id)
  );
  const pastEvents = ADMIN_EVENTS.filter(
    e => e.status === "past" && e.roster.some(r => r.id === player.id)
  );

  return (
    <div className="min-h-full bg-[#0e1621] pb-4 font-sans">
      <BackBar label="Back" />

      {/* Avatar + identity */}
      <div className="flex flex-col items-center pt-8 pb-6 px-4">
        <div className="relative mb-4">
          <img
            src={player.avatar}
            alt={player.name}
            className="w-28 h-28 rounded-full object-cover bg-[#17212b]"
            style={{ boxShadow: `0 0 0 3px ${ringColor}` }}
          />
        </div>
        <h1 className="text-xl font-semibold text-white mb-1">{player.name}</h1>
        <span className={`text-sm font-medium ${SKILL_COLOR[player.skillLevel] ?? "text-white"}`}>
          {player.skillLevel}
        </span>
      </div>

      <div className="max-w-[600px] mx-auto px-4 flex flex-col gap-6">

        {/* Position */}
        <div className="bg-[#17212b] rounded-xl">
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-[#aaa]">Position</span>
            <span className="text-white text-sm font-bold">{player.position}</span>
          </div>
        </div>

        {/* Contact */}
        {((player.showTelegram !== false && player.telegram) || (player.showInstagram !== false && player.instagram)) && (
          <section>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa]">Contact</h2>
            </div>
            <div className="bg-[#17212b] rounded-xl overflow-hidden">
              {player.telegram && player.showTelegram !== false && (
                <a href={`https://t.me/${player.telegram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] active:bg-white/5 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#3390ec] flex items-center justify-center shrink-0">
                    <Send size={14} className="text-white -ml-0.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-[#aaa] mb-0.5">Telegram</div>
                    <div className="text-sm text-white">{player.telegram}</div>
                  </div>
                </a>
              )}
              {player.instagram && player.showInstagram !== false && (
                <a href={`https://instagram.com/${player.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] active:bg-white/5 transition-colors ${player.telegram && player.showTelegram !== false ? "border-t border-white/[0.06]" : ""}`}>
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center shrink-0">
                    <Instagram size={14} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-[#aaa] mb-0.5">Instagram</div>
                    <div className="text-sm text-white">@{player.instagram.replace("@", "")}</div>
                  </div>
                </a>
              )}
            </div>
          </section>
        )}

        {/* Upcoming Events */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa] mb-2">Upcoming Events</h2>
          {upcomingEvents.length === 0 ? (
            <div className="bg-[#17212b] rounded-xl py-6 flex items-center justify-center">
              <span className="text-sm text-[#aaa]">Nothing here yet</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingEvents.map(e => (
                <div key={e.id} className="block bg-[#17212b] rounded-xl px-4 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-bold text-white uppercase tracking-wide">{e.title}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-[#aaa]">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} className="text-[#3390ec]" />
                      {e.date.replace("TODAY • ", "").replace("TOMORROW • ", "")}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={11} className="text-[#3390ec]" />
                      {e.location}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Past Events */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa] mb-2">Past Events</h2>
          {pastEvents.length === 0 ? (
            <div className="bg-[#17212b] rounded-xl py-6 flex items-center justify-center">
              <span className="text-sm text-[#aaa]">Nothing here yet</span>
            </div>
          ) : (
            <div className="bg-[#17212b] rounded-xl overflow-hidden">
              {pastEvents.map((e, i) => (
                <div
                  key={e.id}
                  className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? "border-t border-white/[0.06]" : ""}`}
                >
                  <span className="text-sm text-white/75 truncate">{e.title}</span>
                  <span className="text-xs text-[#aaa] shrink-0 ml-3">{e.date}</span>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

function dotColor(skillLevel: string): string {
  const map: Record<string, string> = {
    PRIME:        "#ccff00",
    Pro:          "#3390ec",
    Advanced:     "#a855f7",
    Intermediate: "#eab308",
    Beginner:     "#f97316",
    Rookie:       "#79828b",
  };
  return map[skillLevel] ?? "#3390ec";
}
