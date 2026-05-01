import { Send, Instagram, Calendar, MapPin, X } from "lucide-react";
import { ADMIN_EVENTS, SKILL_STYLE, type Player } from "../data/adminData";

interface Props {
  player: Player;
  onClose: () => void;
}

export function PlayerProfileModal({ player, onClose }: Props) {
  const upcomingEvents = ADMIN_EVENTS.filter(
    e => e.status === "upcoming" && e.roster.some(r => r.id === player.id)
  );
  const pastEvents = ADMIN_EVENTS.filter(
    e => e.status === "past" && e.roster.some(r => r.id === player.id)
  );

  const style = SKILL_STYLE[player.skillLevel];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-[#17212b] rounded-t-2xl w-full max-w-[520px] border-t border-white/10 overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/10" />
        </div>

        {/* Close */}
        <div className="flex justify-end px-4 pt-1 pb-2">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-[#79828b] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Avatar + identity */}
        <div className="flex flex-col items-center pb-6 px-4">
          <div className="relative mb-4">
            <img
              src={player.avatar}
              alt={player.name}
              className="w-24 h-24 rounded-full object-cover bg-[#222f3e]"
              style={{ boxShadow: `0 0 0 3px ${dotColor(player.skillLevel)}` }}
            />
          </div>
          <h2 className="text-xl font-semibold text-white mb-1">{player.name}</h2>
          <div className={`text-sm font-bold mb-1 ${style?.text ?? "text-white"}`}>
            {player.skillLevel}
          </div>
          <div className="text-[#79828b] text-sm">{player.position}</div>
        </div>

        <div className="px-4 flex flex-col gap-5 pb-8">

          {/* Social links */}
          {(player.telegram || player.instagram) && (
            <div className="bg-[#222f3e] rounded-xl overflow-hidden">
              {player.telegram && (
                <a
                  href={`https://t.me/${player.telegram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 active:bg-white/10 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#3390ec] flex items-center justify-center shrink-0">
                    <Send size={14} className="text-white -ml-0.5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] text-[#aaa] mb-0.5">Telegram</div>
                    <div className="text-sm text-white">{player.telegram}</div>
                  </div>
                </a>
              )}
              {player.instagram && (
                <a
                  href={`https://instagram.com/${player.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 active:bg-white/10 transition-colors ${player.telegram ? "border-t border-white/[0.06]" : ""}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center shrink-0">
                    <Instagram size={14} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] text-[#aaa] mb-0.5">Instagram</div>
                    <div className="text-sm text-white">{player.instagram}</div>
                  </div>
                </a>
              )}
            </div>
          )}

          {/* Upcoming events */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa] mb-2">Upcoming Events</h3>
            {upcomingEvents.length === 0 ? (
              <div className="bg-[#222f3e] rounded-xl py-5 flex items-center justify-center">
                <span className="text-sm text-[#79828b]">No upcoming events</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {upcomingEvents.map(e => (
                  <div key={e.id} className="bg-[#222f3e] rounded-xl px-4 py-3.5">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-sm font-bold text-white uppercase tracking-wide truncate">{e.title}</span>
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

          {/* Past events */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa] mb-2">Past Events</h3>
            {pastEvents.length === 0 ? (
              <div className="bg-[#222f3e] rounded-xl py-5 flex items-center justify-center">
                <span className="text-sm text-[#79828b]">No past events</span>
              </div>
            ) : (
              <div className="bg-[#222f3e] rounded-xl overflow-hidden">
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
