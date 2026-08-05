import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { Navigate } from "react-router";
import { Send, Instagram, Calendar, MapPin, User } from "lucide-react";
import { LEVEL_TEXT_CLASS, levelLabel, positionLabel } from "../data/adminData";
import { BackBar } from "../components/ui/BackBar";
import { TrustDot } from "../components/ui/TrustDot";
import { VerifiedBadge } from "../components/ui/VerifiedBadge";
import { SkillLevelIcon } from "../components/ui/SkillLevelIcon";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { shortDate, isPastDate } from "../lib/eventDate";
import { stripHandle, displayHandle } from "../lib/handle";
import { getHub } from "../lib/hub";
import { useLang } from "../i18n";

type ProfileRow = {
  id: string; name: string; avatar: string | null; position: string | null; skill_level: string;
  telegram: string | null; instagram: string | null; show_telegram: boolean; show_instagram: boolean;
  is_verified: boolean;
  visible_trust_label: "no_show" | "rude_behavior" | "trustworthy" | "warning" | null;
};
type EventRow = { id: string; title: string; event_date: string; location: string; status: string };
type NoteRow = { id: string; body: string };

export function PlayerProfile() {
  const { playerId } = useParams<{ playerId: string }>();
  const { isLoggedIn, loading: authLoading } = useAuth();
  const location = useLocation();
  const hub = getHub(location);
  const { t } = useLang();

  const [player, setPlayer] = useState<ProfileRow | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId) return;
    (async () => {
      const [{ data: p }, { data: partRows }, { data: noteRows }] = await Promise.all([
        supabase.from("profiles").select("id, name, avatar, position, skill_level, telegram, instagram, show_telegram, show_instagram, is_verified, visible_trust_label").eq("id", playerId).single(),
        supabase.from("event_participants").select("events(id, title, event_date, location, status)").eq("player_id", playerId),
        supabase.from("player_notes").select("id, body").eq("player_id", playerId).order("created_at", { ascending: false }),
      ]);
      setPlayer((p as ProfileRow) ?? null);
      setEvents(((partRows ?? []).map(r => r.events).filter(Boolean) as unknown as EventRow[]));
      setNotes((noteRows as NoteRow[]) ?? []);
      setLoading(false);
    })();
  }, [playerId]);

  if (authLoading || loading) return null;
  if (!isLoggedIn) {
    return <Navigate to="/signin" replace />;
  }

  if (!player) {
    return (
      <div>
        <BackBar label={t.common.back} />
        <div className="flex items-center justify-center min-h-[60vh] text-[#79828b]">
          <p className="font-bold">Player not found</p>
        </div>
      </div>
    );
  }

  const upcomingEvents = events.filter(e => e.status === "upcoming" && !isPastDate(e.event_date));
  const pastEvents = events.filter(e => isPastDate(e.event_date));

  return (
    <div className="min-h-full bg-[var(--surface-0)] pb-4 font-sans">
      <BackBar label={t.common.back} />

      {/* Avatar + identity */}
      <div className="flex flex-col items-center pt-8 pb-6 px-4">
        <div className="relative mb-4">
          {player.avatar ? (
            <img
              src={player.avatar}
              alt={player.name}
              className="w-28 h-28 rounded-full object-cover bg-[var(--surface-1)]"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-[var(--surface-1)] flex items-center justify-center">
              <User size={36} className="text-[var(--ink)]/20" />
            </div>
          )}
          <VerifiedBadge verified={player.is_verified} size={28} ringClassName="border-[var(--surface-0)]" />
          <TrustDot label={player.visible_trust_label} size={20} ringClassName="border-[var(--surface-0)]" />
        </div>
        <h1 className="text-xl font-semibold text-[var(--ink)] mb-1">{player.name}</h1>
        <span className={`flex items-center gap-1 text-sm font-medium ${LEVEL_TEXT_CLASS[player.skill_level] ?? "text-[var(--ink)]"}`}>
          <SkillLevelIcon level={player.skill_level} size={14} />
          {levelLabel(player.skill_level, t)}
        </span>
      </div>

      <div className="max-w-[640px] mx-auto px-4 flex flex-col gap-6">

        {/* Position */}
        <div className="bg-[var(--surface-1)] rounded-xl">
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-[#aaa]">{t.profile.position}</span>
            <span className="text-[var(--ink)] text-sm font-bold">{player.position ? positionLabel(player.position, t) : "—"}</span>
          </div>
        </div>

        {/* Notes - server RLS only sends notes actually visible to us */}
        {notes.length > 0 && (
          <div className="flex flex-col gap-2">
            {notes.map(n => (
              <div key={n.id} className="bg-[var(--surface-1)] rounded-xl px-4 py-3.5">
                <p className="text-sm text-[var(--ink)]/80 leading-relaxed whitespace-pre-wrap">{n.body}</p>
              </div>
            ))}
          </div>
        )}

        {/* Contact */}
        {((player.show_telegram !== false && player.telegram) || (player.show_instagram !== false && player.instagram)) && (
          <section>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa]">{t.profile.contact}</h2>
            </div>
            <div className="bg-[var(--surface-1)] rounded-xl overflow-hidden">
              {player.telegram && player.show_telegram !== false && (
                <a href={`https://t.me/${stripHandle(player.telegram)}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-hover)] active:bg-[var(--surface-active)] transition-colors">
                  <div className="w-8 h-8 rounded-full bg-[var(--brand)] flex items-center justify-center shrink-0">
                    <Send size={14} className="text-white -ml-0.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-[#aaa] mb-0.5">{t.profile.telegram}</div>
                    <div className="text-sm text-[var(--ink)]">{displayHandle(player.telegram)}</div>
                  </div>
                </a>
              )}
              {player.instagram && player.show_instagram !== false && (
                <a href={`https://instagram.com/${stripHandle(player.instagram)}`} target="_blank" rel="noopener noreferrer"
                  className={`relative flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-hover)] active:bg-[var(--surface-active)] transition-colors ${player.telegram && player.show_telegram !== false ? "before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-[var(--ink)]/[0.06]" : ""}`}>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center shrink-0">
                    <Instagram size={14} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-[#aaa] mb-0.5">{t.profile.instagram}</div>
                    <div className="text-sm text-[var(--ink)]">{displayHandle(player.instagram)}</div>
                  </div>
                </a>
              )}
            </div>
          </section>
        )}

        {/* Upcoming Events */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa] mb-2">{t.profile.upcomingEvents}</h2>
          {upcomingEvents.length === 0 ? (
            <div className="bg-[var(--surface-1)] rounded-xl py-6 flex items-center justify-center">
              <span className="text-sm text-[#aaa]">{t.common.nothingHere}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingEvents.map(e => (
                <Link key={e.id} to={`/events/${e.id}`} state={{ hub }} className="block bg-[var(--surface-1)] rounded-xl px-4 py-3.5 hover:bg-[var(--surface-hover)] transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-bold text-[var(--ink)] uppercase tracking-wide">{e.title}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-[#aaa]">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} className="text-[var(--brand)]" />
                      {shortDate(e.event_date, t, true)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={11} className="text-[var(--brand)]" />
                      {e.location}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Past Events */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa] mb-2">{t.profile.pastEvents}</h2>
          {pastEvents.length === 0 ? (
            <div className="bg-[var(--surface-1)] rounded-xl py-6 flex items-center justify-center">
              <span className="text-sm text-[#aaa]">{t.common.nothingHere}</span>
            </div>
          ) : (
            <div className="bg-[var(--surface-1)] rounded-xl overflow-hidden">
              {pastEvents.map((e) => (
                <Link
                  key={e.id}
                  to={`/events/${e.id}`}
                  state={{ hub }}
                  className="relative flex items-center justify-between px-4 py-2.5 hover:bg-[var(--surface-hover)] transition-colors before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-[var(--ink)]/[0.06] first:before:hidden"
                >
                  <span className="text-sm text-[var(--ink)]/75 truncate">{e.title}</span>
                  <span className="text-xs text-[#aaa] shrink-0 ml-3">{shortDate(e.event_date, t, true)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
