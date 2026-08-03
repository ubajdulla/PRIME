import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Search, X, OctagonX, CheckCircle2, Clock, BadgeCheck, ChevronDown, Flag, MessageSquare, Brush } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FilterPill } from "../../components/ui/FilterPill";
import { TrustDot } from "../../components/ui/TrustDot";
import { VerifiedBadge } from "../../components/ui/VerifiedBadge";
import { LABEL_META, SENTIMENT_COLOR, effectiveLabel } from "../../lib/trustLabel";
import { navDir } from "../../lib/navDir";
import { useHorizontalSwipe } from "../../lib/useHorizontalSwipe";
import { supabase } from "../../lib/supabaseClient";

const LEVELS = ["PRIME", "Pro", "Advanced", "Intermediate", "Beginner", "Rookie"] as const;
const CATEGORIES = ["Admin", ...LEVELS] as const;
type Category = typeof CATEGORIES[number];

// Admin reuses the existing Verified-badge blue (not a new color); the six
// skill tiers are shades of the app's own accent (#462ed1) running from
// almost-white at Rookie to maximally saturated at PRIME.
const CATEGORY_COLOR: Record<string, string> = {
  Admin: "#3897f0", Rookie: "#d9d4f7", Beginner: "#b3a3ef", Intermediate: "#8b78e8",
  Advanced: "#6b52e2", Pro: "#5136da", PRIME: "#4b1eff",
};
const CATEGORY_TEXT_CLASS: Record<string, string> = {
  Admin: "text-[#3897f0]", Rookie: "text-[#d9d4f7]", Beginner: "text-[#b3a3ef]", Intermediate: "text-[#8b78e8]",
  Advanced: "text-[#6b52e2]", Pro: "text-[#5136da]", PRIME: "text-[#4b1eff]",
};
// Rank 1 (Rookie) through 6 (PRIME) — used to compute how full the cup icon is.
const CATEGORY_RANK: Record<string, number> = {
  Rookie: 1, Beginner: 2, Intermediate: 3, Advanced: 4, Pro: 5, PRIME: 6,
};

function CategoryIcon({ category, size = 20 }: { category: Category; size?: number }) {
  if (category === "Admin") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1}>
        <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      </svg>
    );
  }
  // "Fill Level" cup: a rank-proportional fill rises inside the bowl, empty
  // at Rookie (1/6) to overflowing at PRIME (6/6) — the ordering is read from
  // how full the cup is, not from a detail that has to be spotted.
  const rank = CATEGORY_RANK[category] ?? 1;
  const frac = rank / 6;
  const bowlTop = 4.5, bowlBottom = 12.3;
  const fillY = bowlBottom - frac * (bowlBottom - bowlTop);
  const clipId = `cup-clip-${category}`;
  return (
    <svg width={size} height={size * (26 / 24)} viewBox="0 0 24 26" fill="none">
      <defs>
        <clipPath id={clipId}><path d="M7.3 4.3h9.4v4a4.7 4.7 0 0 1-9.4 0Z" /></clipPath>
      </defs>
      <rect x="6" y={fillY} width="12" height="10" fill="currentColor" opacity={0.85} clipPath={`url(#${clipId})`} />
      <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z" stroke="currentColor" strokeWidth={1.9} />
      <path d="M7 6H4a2 2 0 0 0 2 4M17 6h3a2 2 0 0 1-2 4" stroke="currentColor" strokeWidth={1.9} />
    </svg>
  );
}

const STATUSES = ["All", "Payment Pending", "Warnings", "No-show", "Disrespect", "Trust", "No Label"] as const;
type Status = typeof STATUSES[number];

// "Recently searched" is a per-admin browsing convenience, not roster data -
// kept in localStorage instead of a table so looking someone up doesn't
// need a write to the database every time.
const RECENT_KEY = "admin_players_recent";
type RecentEntry = { id: string; name: string };
function getRecentIds(): string[] {
  try { return (JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as RecentEntry[]).map(r => r.id); } catch { return []; }
}
function pushRecent(p: RecentEntry) {
  try {
    const list: RecentEntry[] = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    const next = [p, ...list.filter(r => r.id !== p.id)].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* localStorage unavailable — recently-searched just stays empty */ }
}
function clearRecent() {
  try { localStorage.removeItem(RECENT_KEY); } catch { /* localStorage unavailable */ }
}

type PlayerRow = {
  id: string; name: string; avatar: string | null; position: string | null; skill_level: string;
  telegram: string | null;
  is_admin: boolean; is_verified: boolean; visible_trust_label: string | null;
  is_suspended: boolean; is_banned: boolean; trust_label: string | null; trust_label_set_at_events: number | null;
};
type Player = PlayerRow & { eventsJoined: number };

type NoteRow = { id: string; player_id: string; author_id: string | null; author_name: string; body: string; label: string | null; created_at: string };

// Fades + slides its children in on mount - re-keying this per state (see
// `key={focused ? "focused" : "landing"}` below) remounts it on every
// landing↔focused swap, so the transition replays each time instead of only
// on first paint.
function FadeIn({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div className={`transition-all duration-200 ease-out ${shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1.5"}`}>
      {children}
    </div>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type ActivityKind = { Icon: LucideIcon; color: string; title: string; strong?: boolean };

// logAction() in AdminPlayerProfile.tsx always writes one of a known set of
// body strings for system actions (ban, suspend, verify, skill change...) -
// this recognizes those exact patterns so each renders with its own
// icon/color instead of every action reading as identical plain text.
// `strong` marks the ones serious enough to get a solid-fill badge instead
// of a tinted one (currently just Banned).
function classifyActivity(n: NoteRow): ActivityKind {
  if (n.label) {
    const meta = LABEL_META[n.label as keyof typeof LABEL_META];
    return { Icon: Flag, color: SENTIMENT_COLOR[meta.sentiment], title: meta.name };
  }
  const b = n.body;
  if (b.startsWith("Banned"))              return { Icon: OctagonX, color: "#ef4444", title: "Banned", strong: true };
  if (b === "Unbanned")                    return { Icon: CheckCircle2, color: "#4dcd5e", title: "Unbanned" };
  if (b.startsWith("Suspended until"))     return { Icon: Clock, color: "#eab308", title: "Suspended" };
  if (b === "Suspension lifted")           return { Icon: CheckCircle2, color: "#4dcd5e", title: "Suspension Lifted" };
  if (b === "Verified")                    return { Icon: BadgeCheck, color: "#3897f0", title: "Verified" };
  if (b === "Verification revoked")        return { Icon: BadgeCheck, color: "#79828b", title: "Verification Revoked" };
  if (b.startsWith("Skill level changed")) return { Icon: ChevronDown, color: "#a855f7", title: "Skill Change" };
  if (b.startsWith("Label cleared"))       return { Icon: Flag, color: "#79828b", title: "Label Cleared" };
  return { Icon: MessageSquare, color: "#462ed1", title: "Note" };
}

export function AdminPlayers() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  // Same drag-to-scroll behavior as the Home event feed filter bar, copied
  // 1:1 so both bars feel like the same component everywhere in the app.
  const filterScrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ active: boolean; startX: number; scrollLeft: number }>({ active: false, startX: 0, scrollLeft: 0 });

  useEffect(() => {
    const el = filterScrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      el.scrollBy({ left: e.deltaY + e.deltaX, behavior: "auto" });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const [players, setPlayers] = useState<Player[]>([]);
  const [activity, setActivity] = useState<NoteRow[]>([]);
  const [labelNotes, setLabelNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [focused, setFocused]     = useState(false);
  const [search, setSearch]       = useState("");
  const [status, setStatus]       = useState<Status>("All");
  const [category, setCategory]   = useState<Category | null>(null);
  const [recentTick, setRecentTick] = useState(0);
  // Players whose notes mention the current search text — kept separate from
  // the player fields since it needs its own (debounced) query instead of a
  // plain-JS filter over already-loaded data.
  const [noteMatchIds, setNoteMatchIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) { setNoteMatchIds(new Set()); return; }
    const id = setTimeout(async () => {
      const { data, error } = await supabase.from("player_notes").select("player_id").ilike("body", `%${q}%`).limit(50);
      if (error) { console.error("Failed to search notes:", error); return; }
      setNoteMatchIds(new Set((data ?? []).map(r => r.player_id)));
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data, error }, { data: noteRows, error: noteErr }, { data: labelRows, error: labelErr }] = await Promise.all([
        supabase.from("profiles").select(
          "id, name, avatar, position, skill_level, telegram, is_admin, is_verified, visible_trust_label, is_suspended, is_banned, trust_label, trust_label_set_at_events, event_participants(id)"
        ),
        supabase.from("player_notes").select("id, player_id, author_id, author_name, body, label, created_at").order("created_at", { ascending: false }).limit(8),
        // The note that set a player's currently-active trust_label is always
        // their most recent labeled note (addNote() in AdminPlayerProfile.tsx
        // overwrites trust_label every time a labeled note is added) - fetching
        // every labeled note lets each status tab show the exact note (author +
        // timestamp) behind that player's current label, same as the Recent
        // Admin Activity card, instead of a different summary.
        supabase.from("player_notes").select("id, player_id, author_id, author_name, body, label, created_at").not("label", "is", null).order("created_at", { ascending: false }).limit(500),
      ]);
      if (error) console.error("Failed to load players:", error);
      if (noteErr) console.error("Failed to load recent activity:", noteErr);
      if (labelErr) console.error("Failed to load labeled notes:", labelErr);
      setPlayers((data ?? []).map((p) => {
        const { event_participants, ...rest } = p as PlayerRow & { event_participants: { id: string }[] };
        return {
          ...rest,
          eventsJoined: event_participants?.length ?? 0,
        };
      }));
      setActivity((noteRows as NoteRow[]) ?? []);
      setLabelNotes((labelRows as NoteRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  function matchesStatus(p: Player, s: Status) {
    if (s === "All") return true;
    const eff = effectiveLabel(p.trust_label, p.trust_label_set_at_events, p.eventsJoined);
    if (s === "Payment Pending") return eff?.label === "payment";
    if (s === "Warnings")        return eff?.label === "warning";
    if (s === "No-show")         return eff?.label === "no_show";
    if (s === "Disrespect")      return eff?.label === "rude_behavior";
    if (s === "Trust")           return eff?.label === "trustworthy";
    if (s === "No Label")        return eff === null;
    return true;
  }

  function goToPlayer(p: { id: string; name: string }) {
    pushRecent({ id: p.id, name: p.name });
    navDir.forward();
    navigate(`/admin/player/${p.id}`);
  }

  function enterFocus() { setFocused(true); }
  function exitFocus() {
    setFocused(false);
    setSearch("");
    setCategory(null);
    searchRef.current?.blur();
  }

  const byName = (a: Player, b: Player) => a.name.localeCompare(b.name);

  // Matches on name, position, and Telegram handle immediately (no round
  // trip); note-body matches come from the debounced query above and are
  // unioned in by id. Empty search matches everyone.
  function matchesSearch(p: Player): boolean {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    if (p.name.toLowerCase().includes(q)) return true;
    if (p.position?.toLowerCase().includes(q)) return true;
    if (p.telegram?.toLowerCase().replace("@", "").includes(q.replace("@", ""))) return true;
    return noteMatchIds.has(p.id);
  }

  const statusFiltered = players.filter(p => matchesStatus(p, status)).sort(byName);
  // labelNotes is ordered newest-first, so the first note seen per player here
  // is their most recent labeled note - which addNote() guarantees is the one
  // that set their current trust_label.
  const latestLabelNoteByPlayer = new Map<string, NoteRow>();
  for (const n of labelNotes) if (!latestLabelNoteByPlayer.has(n.player_id)) latestLabelNoteByPlayer.set(n.player_id, n);
  const categoryFiltered = category
    ? players.filter(p => (category === "Admin" ? p.is_admin : p.skill_level === category) && matchesSearch(p)).sort(byName)
    : [];
  const searchResults = search.trim() ? players.filter(matchesSearch).sort(byName) : [];
  const recentPlayers = getRecentIds().map(id => players.find(p => p.id === id)).filter((p): p is Player => !!p);

  // Shared by "Recent Admin Activity" and every trust-label status filter
  // (Warnings, No-show, Disrespect, Trust, Payment Pending) — same card
  // either way: a name paired with the reason it's on this list, not the
  // generic player row (avatar + skill + event count) used elsewhere.
  function PlayerActivityCard({ avatar, name, color, title, subtitle, onClick }: {
    avatar: string | null; name: string; color: string; title: string; subtitle: React.ReactNode; onClick?: () => void;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className="flex items-stretch w-full text-left rounded-2xl bg-[#212121] overflow-hidden transition-colors disabled:cursor-default focus:outline-none"
      >
        {/* Severity stripe — the one colored element on the card, always there */}
        <span className="w-[3px] shrink-0" style={{ background: color }} />

        <div className="flex items-center gap-3 px-3 py-3 flex-1 min-w-0">
          <div className="shrink-0">
            {avatar
              ? <img src={avatar} alt={name} className="w-10 h-10 rounded-full object-cover border-2 border-[#181818]" />
              : <div className="w-10 h-10 rounded-full bg-white/5 border-2 border-[#181818]" />}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[13px] leading-snug truncate flex items-center gap-1.5">
              <span className="font-bold text-white">{name}</span>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
              <span className="font-bold text-white">{title}</span>
            </p>
            <p className="text-[11px] text-[#79828b] mt-0.5 truncate">{subtitle}</p>
          </div>
        </div>
      </button>
    );
  }

  function PlayerRowButton({ p }: { p: Player }) {
    const eff = effectiveLabel(p.visible_trust_label, p.trust_label_set_at_events, p.eventsJoined);
    return (
      <button
        type="button"
        onClick={() => goToPlayer(p)}
        className="relative flex items-center gap-3 px-4 py-3 w-full text-left transition-colors hover:bg-white/[0.07] focus:outline-none before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-white/[0.06] first:before:hidden"
      >
        <div className="relative shrink-0">
          {p.avatar
            ? <img src={p.avatar} alt={p.name} className="w-11 h-11 rounded-full border-2 border-[#181818] object-cover" />
            : <div className="w-11 h-11 rounded-full border-2 border-[#181818] bg-white/5" />}
          <VerifiedBadge verified={p.is_verified} size={14} ringClassName="border-[#181818]" />
          <TrustDot label={eff?.label} opacity={eff?.opacity} size={11} ringClassName="border-[#181818]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white text-sm truncate">{p.name}</div>
          <div className="flex items-center gap-1.5 text-[#79828b] text-[11px] uppercase tracking-wider">
            <span className={CATEGORY_TEXT_CLASS[p.skill_level] ?? ""}>{p.skill_level}</span>
            {p.position && <span>· {p.position}</span>}
          </div>
        </div>
        <div className="text-right shrink-0 mr-1">
          <div className="text-white text-sm font-black">{p.eventsJoined}</div>
          <div className="text-[#79828b] text-[10px]">events</div>
        </div>
      </button>
    );
  }

  function PlayerList({ list, empty }: { list: Player[]; empty: string }) {
    if (!loading && list.length === 0) {
      return <p className="text-[#79828b] text-sm text-center py-6">{empty}</p>;
    }
    return (
      <div className="bg-[#212121] rounded-2xl overflow-hidden">
        {list.map(p => <PlayerRowButton key={p.id} p={p} />)}
      </div>
    );
  }

  // Swipe right back to the Events tab - mirrors AdminEvents' swipe-left,
  // same no-slide route transition as tapping the sub-navbar tab, with the
  // page itself following the drag. Disabled while search is focused so a
  // stray horizontal drag in the results doesn't navigate away mid-search.
  // ignoreRef=filterScrollRef so dragging the status filter pills (its own
  // click-and-drag scroller, same as the Home feed's filter bar) never gets
  // misread as a page swipe back to Events.
  const { containerRef: swipeRef, handlers: swipeHandlers, style: swipeStyle } =
    useHorizontalSwipe(undefined, () => { navDir.none(); navigate("/admin/events"); }, filterScrollRef);

  return (
    <div
      ref={swipeRef}
      className="max-w-[640px] mx-auto px-4 py-8"
      style={focused ? undefined : swipeStyle}
      {...(focused ? {} : swipeHandlers)}
    >
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-black italic text-2xl text-white uppercase tracking-widest">Players</h1>
        <span className="text-[#79828b] text-xs font-bold">{players.length} total</span>
      </div>

      {/* Search — shrinks to make room for a round × once focused */}
      <div className="flex items-center mb-4">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#79828b] pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onFocus={enterFocus}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search or tap to browse everyone..."
            className="w-full bg-[#212121] border border-white/10 rounded-full pl-11 pr-4 py-2.5 text-white text-sm font-bold placeholder:text-[#79828b]/60 focus:outline-none focus:border-[#462ed1]/50 transition-colors"
          />
        </div>
        <button
          onClick={exitFocus}
          aria-label="Cancel"
          tabIndex={focused ? 0 : -1}
          className={`h-9 shrink-0 rounded-full bg-white/10 hover:bg-white/20 text-white/85 hover:text-white flex items-center justify-center overflow-hidden transition-all duration-200 ease-out ${
            focused ? "w-9 opacity-100 ml-2" : "w-0 opacity-0 ml-0 pointer-events-none"
          }`}
        >
          <X size={16} className="shrink-0" />
        </button>
      </div>

      {!focused ? (
        <FadeIn key="landing">
          {/* Status filter bar — the exact Home event-feed filter bar component (same
              container, edge-fade mask, and click-drag-to-scroll behavior) */}
          <div className="relative mb-6 w-full bg-[#212121] rounded-full p-1.5 overflow-hidden">
            <div
              ref={filterScrollRef}
              className="flex gap-1 overflow-x-auto overscroll-x-contain touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] select-none"
              style={{
                cursor: "grab",
                WebkitMaskImage: "linear-gradient(to right, transparent 0, rgba(0,0,0,0.35) 12px, black 40px, black calc(100% - 40px), rgba(0,0,0,0.35) calc(100% - 12px), transparent 100%)",
                maskImage: "linear-gradient(to right, transparent 0, rgba(0,0,0,0.35) 12px, black 40px, black calc(100% - 40px), rgba(0,0,0,0.35) calc(100% - 12px), transparent 100%)",
              }}
              onMouseDown={e => {
                const el = filterScrollRef.current;
                if (!el) return;
                dragState.current = { active: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
                el.style.cursor = "grabbing";
              }}
              onMouseMove={e => {
                const el = filterScrollRef.current;
                if (!el || !dragState.current.active) return;
                const x = e.pageX - el.offsetLeft;
                el.scrollLeft = dragState.current.scrollLeft - (x - dragState.current.startX);
              }}
              onMouseUp={() => {
                dragState.current.active = false;
                if (filterScrollRef.current) filterScrollRef.current.style.cursor = "grab";
              }}
              onMouseLeave={() => {
                dragState.current.active = false;
                if (filterScrollRef.current) filterScrollRef.current.style.cursor = "";
              }}
            >
              {STATUSES.map(s => (
                <FilterPill key={s} label={s} active={status === s} onClick={() => setStatus(s)} />
              ))}
            </div>
          </div>

          {status === "All" ? (
            <section>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-[#79828b] mb-2 px-0.5">Recent Admin Activity</h2>
              {activity.length === 0 ? (
                <p className="text-[#79828b] text-sm text-center py-6">Nothing yet</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {activity.map(n => {
                    const target = players.find(p => p.id === n.player_id);
                    const { color, title } = classifyActivity(n);
                    return (
                      <PlayerActivityCard
                        key={n.id}
                        avatar={target?.avatar ?? null}
                        name={target?.name ?? "a player"}
                        color={color}
                        title={title}
                        subtitle={`${n.author_name} · ${timeAgo(n.created_at)}`}
                        onClick={target ? () => goToPlayer(target) : undefined}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          ) : status === "No Label" ? (
            <section>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-[#79828b] mb-2 px-0.5">
                {statusFiltered.length} match{statusFiltered.length === 1 ? "" : "es"}
              </h2>
              <PlayerList list={statusFiltered} empty="No players without a label" />
            </section>
          ) : (
            <section>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-[#79828b] mb-2 px-0.5">
                {statusFiltered.length} match{statusFiltered.length === 1 ? "" : "es"}
              </h2>
              {!loading && statusFiltered.length === 0 ? (
                <p className="text-[#79828b] text-sm text-center py-6">No players match this status</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {statusFiltered.map(p => {
                    const n = latestLabelNoteByPlayer.get(p.id);
                    if (!n) return null;
                    const { color, title } = classifyActivity(n);
                    return (
                      <PlayerActivityCard
                        key={p.id}
                        avatar={p.avatar}
                        name={p.name}
                        color={color}
                        title={title}
                        subtitle={`${n.author_name} · ${timeAgo(n.created_at)}`}
                        onClick={() => goToPlayer(p)}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </FadeIn>
      ) : (
        <FadeIn key="focused">
          {/* Level categories — circular row, Admin through PRIME */}
          <div className="flex gap-3.5 overflow-x-auto [&::-webkit-scrollbar]:hidden pb-1 mb-5">
            {CATEGORIES.map(c => (
              <button
                key={c}
                // Prevents the button from stealing focus on click, so the search
                // input stays focused (cursor + keyboard both ready) and typing
                // right after tapping a category works with no extra tap needed.
                onPointerDown={e => e.preventDefault()}
                onClick={() => setCategory(prev => (prev === c ? null : c))}
                className="flex flex-col items-center gap-1.5 w-14 shrink-0 text-center"
              >
                <div
                  className="w-14 h-14 rounded-full p-[3px] transition-opacity"
                  style={{ background: CATEGORY_COLOR[c], opacity: category && category !== c ? 0.35 : 1 }}
                >
                  <div className="w-full h-full rounded-full bg-[#2a2b33] border-2 border-[#181818] flex items-center justify-center" style={{ color: CATEGORY_COLOR[c] }}>
                    <CategoryIcon category={c} size={c === "Admin" ? 22 : 18} />
                  </div>
                </div>
                <span className="text-[10px] font-bold text-white truncate w-14">{c}</span>
              </button>
            ))}
          </div>

          {category ? (
            <section>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-[#79828b] mb-2 px-0.5">
                {categoryFiltered.length} in {category}
              </h2>
              <PlayerList list={categoryFiltered} empty="No players in this category" />
            </section>
          ) : search.trim() ? (
            <section>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-[#79828b] mb-2 px-0.5">Results</h2>
              <PlayerList list={searchResults} empty="No players match" />
            </section>
          ) : (
            <section key={recentTick}>
              <div className="flex items-center justify-between mb-2 px-0.5">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-[#79828b]">Recently Searched</h2>
                {recentPlayers.length > 0 && (
                  <button
                    onClick={() => { clearRecent(); setRecentTick(t => t + 1); }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[#79828b] hover:bg-white/10 hover:text-white transition-colors"
                    aria-label="Clear recently searched"
                  >
                    <Brush size={13} />
                  </button>
                )}
              </div>
              {recentPlayers.length === 0 ? (
                <p className="text-[#79828b] text-sm text-center py-6">Nothing searched yet</p>
              ) : (
                <PlayerList list={recentPlayers} empty="Nothing searched yet" />
              )}
            </section>
          )}
        </FadeIn>
      )}
    </div>
  );
}
