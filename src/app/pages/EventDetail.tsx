import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ChevronLeft, Send, MapPin, Calendar, Clock, CheckCircle2, Phone, Mail, Instagram, MoreVertical } from "lucide-react";
import { ALL_PLAYERS } from "../data/adminData";
import { PlayerProfileModal } from "../components/PlayerProfileModal";

const WAITLIST_AVATARS = [
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1603415526960-f7e0328c63b1?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop",
];

const WAITLIST_VISIBLE = 3;

// Use the first 8 players from shared data so profile modal has full info
const ROSTER_PLAYERS = ALL_PLAYERS.slice(0, 8);

export function EventDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [profilePlayer, setProfilePlayer] = useState<typeof ALL_PLAYERS[number] | null>(null);
  const [openPlayerMenu, setOpenPlayerMenu] = useState<string | null>(null);

  const isRequestOnly = id === "e2" || id === "e4";
  const title = isRequestOnly ? "ELITE SCRIMMAGE #42" : "PRO-AM INVITATIONAL";

  const waitlistExtra = WAITLIST_AVATARS.length - WAITLIST_VISIBLE;

  return (
    <div className="relative min-h-screen pb-[120px] bg-[#0e1621] font-sans">
      {profilePlayer && (
        <PlayerProfileModal player={profilePlayer} onClose={() => setProfilePlayer(null)} />
      )}
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-[#0e1621]/90 backdrop-blur-md px-4 py-3 border-b border-white/5 flex items-center shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors active:scale-[0.98]"
        >
          <ChevronLeft size={24} className="text-white" />
        </button>
        <span className="ml-4 font-bold text-white/50 tracking-wider text-sm uppercase">Event Details</span>
      </div>

      <div className="px-5 py-6 max-w-[600px] mx-auto">
        {/* Top Section */}
        <div className="mb-8">
          <div className="mb-4 inline-block">
            <span className={`text-[11px] font-bold px-3 py-1.5 uppercase tracking-widest rounded-md flex items-center gap-2 ${
              isRequestOnly
                ? 'bg-[#eab308]/10 text-[#eab308] border border-[#eab308]/30'
                : 'bg-[#3390ec]/10 text-[#3390ec] border border-[#3390ec]/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isRequestOnly ? 'bg-[#eab308]' : 'bg-[#3390ec]'}`}></span>
              {isRequestOnly ? "REQUEST ONLY" : "JOIN DIRECTLY"}
            </span>
          </div>

          <div className="relative inline-block mb-6 w-full">
            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-widest leading-none text-white relative z-10 break-words drop-shadow-md">
              {title}
            </h1>
            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-widest leading-none text-[#ff003c] absolute top-[2px] -left-[2px] z-0 opacity-70 mix-blend-screen break-words" aria-hidden="true">
              {title}
            </h1>
            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-widest leading-none text-[#00f0ff] absolute -top-[2px] left-[2px] z-0 opacity-70 mix-blend-screen break-words" aria-hidden="true">
              {title}
            </h1>
          </div>

          <p className="text-[#79828b] text-[15px] leading-relaxed mb-8 border-l-[3px] border-[#3390ec] pl-4 py-1 bg-gradient-to-r from-[#17212b] to-transparent">
            High stakes competitive scrimmage for top-tier players. Bring your A-game. Voice comms mandatory. Late arrivals will be blacklisted. No exceptions.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#17212b] p-4 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 text-[#3390ec] mb-1.5">
                <Calendar size={18} />
                <span className="text-xs font-bold uppercase tracking-wide">Date</span>
              </div>
              <div className="font-bold text-white text-lg">FRI, OCT 25</div>
            </div>
            <div className="bg-[#17212b] p-4 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 text-[#3390ec] mb-1.5">
                <Clock size={18} />
                <span className="text-xs font-bold uppercase tracking-wide">Time</span>
              </div>
              <div className="font-bold text-white text-lg">20:00 - 22:00</div>
            </div>
            <div className="bg-[#17212b] p-4 rounded-xl col-span-2 border border-white/5">
              <div className="flex items-center gap-2 text-[#3390ec] mb-1.5">
                <MapPin size={18} />
                <span className="text-xs font-bold uppercase tracking-wide">Location</span>
              </div>
              <div className="font-bold text-white text-lg truncate">Cyber Arena, Sector 4 Server</div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between py-5 border-y border-white/5">
            <span className="text-[#79828b] font-black italic uppercase tracking-widest text-sm">Entry Fee</span>
            <span className="text-3xl font-black text-white">625 CZK</span>
          </div>
        </div>

        {/* Organizer Block */}
        <div className="mb-10">
          <div className="bg-[#17212b] rounded-2xl shadow-sm p-5 w-full border border-white/5">
            {/* Profile row with Telegram button inline */}
            <div className="flex items-center gap-4">
              <img
                src="https://images.unsplash.com/photo-1587930693964-e16abf7299f5?w=150&h=150&fit=crop"
                alt="Organizer"
                className="w-14 h-14 rounded-full border-2 border-[#ccff00] object-cover bg-[#222f3e] shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-[#ccff00] text-[10px] font-black uppercase tracking-widest mb-1 bg-[#ccff00]/10 inline-block px-2 py-0.5 rounded">Moderator</div>
                <div className="font-black text-lg text-white flex items-center gap-2 tracking-wide truncate">
                  N3ON_KING <CheckCircle2 size={16} className="text-[#3390ec] shrink-0" />
                </div>
              </div>
              {/* Telegram icon button — small, blue */}
              <button className="w-10 h-10 rounded-full bg-[#3390ec] flex items-center justify-center shrink-0 active:scale-[0.95] transition-transform shadow-[0_0_12px_rgba(51,144,236,0.3)]">
                <Send size={17} className="text-white -ml-0.5" />
              </button>
            </div>

            {/* Contact details as plain text */}
            <div className="mt-4 flex flex-col gap-2.5 pl-1">
              <div className="flex items-center gap-3">
                <Phone size={14} className="text-[#79828b] shrink-0" />
                <span className="text-white/80 text-sm">+420 123 456 789</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={14} className="text-[#79828b] shrink-0" />
                <span className="text-white/80 text-sm">n3on@prime.gg</span>
              </div>
              <div className="flex items-center gap-3">
                <Instagram size={14} className="text-[#79828b] shrink-0" />
                <span className="text-white/80 text-sm">@n3on_king</span>
              </div>
            </div>
          </div>
        </div>

        {/* Roster Block */}
        <div>
          <h3 className="font-black italic text-2xl text-white tracking-widest uppercase mb-6 drop-shadow-md">
            TRANSPARENT ROSTER
          </h3>

          <div className="bg-[#17212b] rounded-2xl shadow-sm p-5 border border-white/5">
            {/* Capacity Scale Bar */}
            <div className="flex justify-between items-end mb-3 font-bold text-sm">
              <span className="text-[#3390ec] tracking-widest">CAPACITY</span>
              <span className="text-white">8 / 10 JOINED</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full mb-8 overflow-hidden">
              <div
                className="h-full bg-[#3390ec] rounded-full shadow-[0_0_10px_rgba(51,144,236,0.5)]"
                style={{ width: '80%' }}
              ></div>
            </div>

            {/* Player List */}
            <div className="flex flex-col gap-3 mb-5">
              {ROSTER_PLAYERS.map((player, i) => (
                <div key={player.id} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                  <img
                    src={player.avatar}
                    alt={player.name}
                    className="w-12 h-12 rounded-full border-2 border-[#17212b] object-cover bg-[#222f3e] shadow-sm"
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-bold text-white text-[15px]">{player.name}</span>
                    <span className="text-[#79828b] text-[11px] uppercase tracking-wider font-bold mt-0.5">{player.position}</span>
                  </div>
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setOpenPlayerMenu(openPlayerMenu === player.id ? null : player.id)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 text-[#79828b] hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openPlayerMenu === player.id && (
                      <div
                        className="absolute right-0 top-full mt-1 bg-[#222f3e] border border-white/10 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] z-20 overflow-hidden min-w-[140px]"
                        onClick={() => setOpenPlayerMenu(null)}
                      >
                        <button
                          onClick={() => setProfilePlayer(player)}
                          className="flex items-center gap-2 w-full px-4 py-3 text-sm font-bold text-white hover:bg-white/5 transition-colors text-left"
                        >
                          View Profile
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Telegram Group Chat Button */}
            <button className="w-full mb-5 border border-[#3390ec]/30 text-[#3390ec] font-black text-sm py-3 rounded-xl flex items-center justify-center gap-2 bg-[#3390ec]/5 hover:bg-[#3390ec]/10 active:scale-[0.98] transition-colors uppercase tracking-widest">
              <Send size={15} />
              GROUP CHAT
            </button>

            {/* Waitlist Block */}
            <div className="p-4 bg-[#eab308]/10 rounded-xl border border-[#eab308]/20">
              <div className="flex items-center justify-between gap-3">
                {/* Waitlist avatars (up to 3) + overflow count */}
                <div className="flex items-center">
                  <div className="flex -space-x-3">
                    {WAITLIST_AVATARS.slice(0, WAITLIST_VISIBLE).map((av, i) => (
                      <img
                        key={i}
                        src={av}
                        alt={`Waitlist ${i + 1}`}
                        className="w-9 h-9 rounded-full border-2 border-[#17212b] object-cover bg-[#222f3e]"
                      />
                    ))}
                  </div>
                  {waitlistExtra > 0 && (
                    <span className="ml-3 text-[#eab308] font-black text-sm">+{waitlistExtra}</span>
                  )}
                </div>
                <span className="text-[#eab308] text-xs font-bold uppercase tracking-widest text-right">
                  {WAITLIST_AVATARS.length} players<br />on waitlist
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating CTA Button */}
      <div className="fixed bottom-0 left-0 w-full z-50 p-4 bg-gradient-to-t from-[#0e1621] via-[#0e1621]/95 to-transparent pt-12 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div className="max-w-[600px] mx-auto flex justify-center">
          <button className={`w-full py-5 rounded-xl font-black italic text-[17px] tracking-widest shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-3 uppercase ${
            isRequestOnly
              ? 'bg-[#ccff00] text-black shadow-[0_0_20px_rgba(204,255,0,0.15)]'
              : 'bg-[#3390ec] text-white shadow-[0_0_20px_rgba(51,144,236,0.3)]'
          }`}>
            {isRequestOnly ? "SEND A REQUEST" : "DIRECT JOIN & PAY"}
            <span className="font-mono text-xl leading-none">-{">"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
