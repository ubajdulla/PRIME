import { useEffect, useMemo, useRef, useState, useTransition, memo } from "react";
import { useNavigate } from "react-router";
import { Search, X, OctagonX, CheckCircle2, Clock, BadgeCheck, ChevronDown, Flag, MessageSquare, Brush, Check, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FilterPill, FilterPillTrack, useEdgeFadeMask } from "../../components/ui/FilterPill";
import { TrustDot } from "../../components/ui/TrustDot";
import { VerifiedBadge } from "../../components/ui/VerifiedBadge";
import { SkillLevelIcon } from "../../components/ui/SkillLevelIcon";
import { Toast } from "../../components/ui/Toast";
import { ConfirmModal, type ModalOrigin } from "../../components/ui/Modal";
import { useWaterRipple, RippleLayer } from "../../components/ui/useWaterRipple";
import { LABEL_META, SENTIMENT_COLOR, effectiveLabel, labelName } from "../../lib/trustLabel";
import { navDir } from "../../lib/navDir";
import { useHorizontalSwipe } from "../../lib/useHorizontalSwipe";
import { supabase } from "../../lib/supabaseClient";
import { levelLabel, positionLabel, LEVEL_COLOR_VAR, LEVEL_TEXT_CLASS } from "../../data/adminData";
import { useLang, type Dict } from "../../i18n";

const LEVELS = ["PRIME", "Pro", "Advanced", "Intermediate", "Beginner", "Rookie"] as const;
const CATEGORIES = ["Admin", ...LEVELS] as const;
type Category = typeof CATEGORIES[number];

// Six skill tiers are shades of the app's own accent (var(--level-*), theme.css,
// via adminData's LEVEL_COLOR_VAR/LEVEL_TEXT_CLASS) running from almost-white
// at Rookie to maximally saturated at PRIME. Admin borrows the *other* theme's
// brand color so it stays visually distinct from the level shades in both themes.
const CATEGORY_COLOR: Record<string, string> = { Admin: "var(--level-admin)", ...LEVEL_COLOR_VAR };
const CATEGORY_TEXT_CLASS: Record<string, string> = { Admin: "text-[var(--level-admin)]", ...LEVEL_TEXT_CLASS };
function CategoryIcon({ category, size = 20 }: { category: Category; size?: number }) {
  if (category === "Admin") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1}>
        <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      </svg>
    );
  }
  return <SkillLevelIcon level={category} size={size} />;
}

const STATUSES = ["All", "Payment Pending", "Warnings", "No-show", "Disrespect", "Trust", "No Label", "Skill Change", "Banned", "Suspended"] as const;
// Action-feed statuses filter individual notes by what happened (and, unlike
// the trust-label tabs, aren't deduped to one card per player) - Banned
// includes Unbanned notes and Suspended includes Suspension Lifted notes, so
// the tab reads as a history of that action rather than only its current state.
const ACTION_STATUSES = ["Skill Change", "Banned", "Suspended"] as const;
type ActionStatus = typeof ACTION_STATUSES[number];
function matchesActionStatus(n: NoteRow, s: ActionStatus): boolean {
  const b = n.body;
  if (s === "Skill Change") return b.startsWith("Skill level changed");
  if (s === "Banned")       return b.startsWith("Banned") || b === "Unbanned";
  return b.startsWith("Suspended until") || b === "Suspension lifted";
}
type Status = typeof STATUSES[number];

// How many recent-change cards each activity feed shows — the "Recent Admin
// Activity" tab and every label-based status tab (Payment Pending, Warnings,
// No-show, Disrespect, Trust) all cap at the same count for consistency.
const ACTIVITY_LIMIT = 36;

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

function timeAgo(iso: string, t: Dict): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return t.common.justNow;
  if (h < 24) return t.common.hoursAgo(h);
  return t.common.daysAgo(Math.floor(h / 24));
}

type ActivityKind = { Icon: LucideIcon; color: string; title: string; strong?: boolean };

// logAction() in AdminPlayerProfile.tsx always writes one of a known set of
// body strings for system actions (ban, suspend, verify, skill change...) -
// this recognizes those exact patterns so each renders with its own
// icon/color instead of every action reading as identical plain text.
// `strong` marks the ones serious enough to get a solid-fill badge instead
// of a tinted one (currently just Banned).
function classifyActivity(n: NoteRow, t: Dict): ActivityKind {
  if (n.label) {
    const meta = LABEL_META[n.label as keyof typeof LABEL_META];
    return { Icon: Flag, color: SENTIMENT_COLOR[meta.sentiment], title: labelName(n.label as keyof typeof LABEL_META, t) };
  }
  const b = n.body;
  if (b.startsWith("Banned"))              return { Icon: OctagonX, color: "#ef4444", title: t.admin.activityBanned, strong: true };
  if (b === "Unbanned")                    return { Icon: CheckCircle2, color: "#4dcd5e", title: t.admin.activityUnbanned };
  if (b.startsWith("Suspended until"))     return { Icon: Clock, color: "#eab308", title: t.admin.activitySuspended };
  if (b === "Suspension lifted")           return { Icon: CheckCircle2, color: "#4dcd5e", title: t.admin.activitySuspensionLifted };
  if (b === "Verified")                    return { Icon: BadgeCheck, color: "#3897f0", title: t.admin.activityVerified };
  if (b === "Verification revoked")        return { Icon: BadgeCheck, color: "#79828b", title: t.admin.activityVerificationRevoked };
  if (b.startsWith("Skill level changed")) return { Icon: ChevronDown, color: "#a855f7", title: t.admin.activitySkillChange };
  if (b.startsWith("Label cleared"))       return { Icon: Flag, color: "#79828b", title: t.admin.activityLabelCleared };
  return { Icon: MessageSquare, color: "var(--brand)", title: t.admin.activityNote };
}

// Shared by "Recent Admin Activity" and every trust-label status filter
// (Warnings, No-show, Disrespect, Trust, Payment Pending) — same card
// either way: a name paired with the reason it's on this list, not the
// generic player row (avatar + skill + event count) used elsewhere.
// Module-scope + memo'd so switching status/category filters doesn't remount
// every card (a plain nested function component gets a new identity - and
// so a full unmount/remount - on every parent render).
const PlayerActivityCard = memo(function PlayerActivityCard({
  avatar, name, color, title, subtitle, onClick,
  playerId, selectKey, selectMode = false, selected = false, onToggleSelect,
}: {
  avatar: string | null; name: string; color: string; title: string; subtitle: React.ReactNode; onClick?: () => void;
  // When selectMode is on, tapping the card toggles selection instead of
  // navigating - same behavior as AlertRow in Alerts.tsx. selectKey is the
  // per-card identity used for the checkbox (a note id when a player can
  // have more than one card on screen, e.g. Recent Activity - playerId
  // alone would check every card belonging to that player at once).
  // playerId is always the one actually deleted.
  playerId?: string; selectKey?: string; selectMode?: boolean; selected?: boolean; onToggleSelect?: (key: string, playerId: string) => void;
}) {
  const handleClick = selectMode && playerId && onToggleSelect ? () => onToggleSelect(selectKey ?? playerId, playerId) : onClick;
  return (
    <button
      type="button"
      data-select-card=""
      onClick={handleClick}
      disabled={!handleClick}
      className="flex items-stretch w-full text-left rounded-2xl bg-[var(--surface-1)] overflow-hidden transition-colors disabled:cursor-default focus:outline-none"
    >
      {/* Severity stripe — the one colored element on the card, always there */}
      <span className="w-[3px] shrink-0" style={{ background: color }} />

      <div className="flex items-center gap-3 px-3 py-3 flex-1 min-w-0">
        <div className="shrink-0">
          {avatar
            ? <img src={avatar} alt={name} loading="lazy" decoding="async" className="w-10 h-10 rounded-full object-cover border-2 border-[var(--surface-0)]" />
            : <div className="w-10 h-10 rounded-full bg-[var(--ink)]/5 border-2 border-[var(--surface-0)]" />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] leading-snug truncate flex items-center gap-1.5">
            <span className="font-bold text-[var(--ink)]">{name}</span>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
            <span className="font-bold text-[var(--ink)]">{title}</span>
          </p>
          <p className="text-[11px] text-[#79828b] mt-0.5 truncate">{subtitle}</p>
        </div>

        {selectMode && (
          <span
            className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              selected ? "bg-[var(--brand)] border-[var(--brand)]" : "border-[var(--ink)]/20"
            }`}
          >
            {selected && <Check size={12} className="text-white" strokeWidth={3} />}
          </span>
        )}
      </div>
    </button>
  );
});

const PlayerRowButton = memo(function PlayerRowButton({
  p, t, onClick, selectMode = false, selected = false, onToggleSelect,
}: {
  p: Player; t: Dict; onClick: () => void;
  selectMode?: boolean; selected?: boolean; onToggleSelect?: (key: string, playerId: string) => void;
}) {
  const eff = effectiveLabel(p.visible_trust_label, p.trust_label_set_at_events, p.eventsJoined);
  const handleClick = selectMode && onToggleSelect ? () => onToggleSelect(p.id, p.id) : onClick;
  return (
    <button
      type="button"
      data-select-card=""
      onClick={handleClick}
      className="relative flex items-center gap-3 px-4 py-3 w-full text-left transition-colors hover:bg-[var(--surface-hover)] focus:outline-none before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-[var(--ink)]/[0.06] first:before:hidden"
    >
      <div className="relative shrink-0">
        {p.avatar
          ? <img src={p.avatar} alt={p.name} loading="lazy" decoding="async" className="w-11 h-11 rounded-full border-2 border-[var(--surface-0)] object-cover" />
          : <div className="w-11 h-11 rounded-full border-2 border-[var(--surface-0)] bg-[var(--ink)]/5" />}
        <VerifiedBadge verified={p.is_verified} size={14} ringClassName="border-[var(--surface-0)]" />
        <TrustDot label={eff?.label} opacity={eff?.opacity} size={11} ringClassName="border-[var(--surface-0)]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[var(--ink)] text-sm truncate">{p.name}</div>
        <div className="flex items-center gap-1.5 text-[#79828b] text-[11px] uppercase tracking-wider">
          <span className={CATEGORY_TEXT_CLASS[p.skill_level] ?? ""}>{levelLabel(p.skill_level, t)}</span>
          {p.position && <span>· {positionLabel(p.position, t)}</span>}
        </div>
      </div>
      {selectMode ? (
        <span
          className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            selected ? "bg-[var(--brand)] border-[var(--brand)]" : "border-[var(--ink)]/20"
          }`}
        >
          {selected && <Check size={12} className="text-white" strokeWidth={3} />}
        </span>
      ) : (
        <div className="text-right shrink-0 mr-1">
          <div className="text-[var(--ink)] text-sm font-black">{p.eventsJoined}</div>
          <div className="text-[#79828b] text-[10px]">events</div>
        </div>
      )}
    </button>
  );
});

// Category browsing, search results, and recently searched all show the
// plain roster row (avatar/verified/trust-dot, name, level+position, event
// count) - not the activity card, which is reserved for feeds that are
// actually about a specific event (Recent Activity, the label status tabs,
// No Label).
function PlayerList({
  list, empty, loading, t, onPlayerClick,
  selectMode = false, selectedIds, onToggleSelect,
}: {
  list: Player[]; empty: string; loading: boolean; t: Dict; onPlayerClick: (p: Player) => void;
  selectMode?: boolean; selectedIds?: Set<string>; onToggleSelect?: (key: string, playerId: string) => void;
}) {
  if (!loading && list.length === 0) {
    return <p className="text-[#79828b] text-sm text-center py-6">{empty}</p>;
  }
  return (
    <div className="bg-[var(--surface-1)] rounded-2xl overflow-hidden">
      {list.map(p => (
        <PlayerRowButton
          key={p.id}
          p={p}
          t={t}
          onClick={() => onPlayerClick(p)}
          selectMode={selectMode}
          selected={selectedIds?.has(p.id) ?? false}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}

// Same sweep-fill mechanic as Alerts.tsx's SelectModeToggle - kept as its
// own small copy here rather than a shared import since it's just a label
// crossfade over a colored fill, not worth abstracting for two call sites.
function SelectModeToggle({ active, onClick, selectLabel, cancelLabel }: {
  active: boolean; onClick: () => void; selectLabel: string; cancelLabel: string;
}) {
  const ripple = useWaterRipple();
  return (
    <button
      type="button"
      data-select-toggle=""
      onClick={onClick}
      onPointerDown={ripple.onPointerDown}
      className={`relative overflow-hidden shrink-0 h-7 px-3.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-colors ${
        active ? "" : "bg-[var(--ink)]/5 text-[var(--ink)]/70 hover:bg-[var(--ink)]/10"
      }`}
    >
      <span
        aria-hidden
        className={`absolute inset-0 bg-[var(--brand)] transition-transform duration-300 ease-out ${active ? "translate-x-0" : "translate-x-full"}`}
      />
      <span className={`relative z-10 transition-colors duration-200 ${active ? "text-white" : ""}`}>
        {active ? cancelLabel : selectLabel}
      </span>
      <RippleLayer ripples={ripple.ripples} />
    </button>
  );
}

export function AdminPlayers() {
  const navigate = useNavigate();
  const { t } = useLang();
  const catLabel = (c: Category): string => (c === "Admin" ? t.nav.admin : levelLabel(c, t));
  const STATUS_LABEL: Record<Status, string> = {
    "All": t.admin.statusAll,
    "Payment Pending": t.admin.statusPaymentPending,
    "Warnings": t.admin.statusWarnings,
    "No-show": t.admin.statusNoShow,
    "Disrespect": t.admin.statusDisrespect,
    "Trust": t.admin.statusTrust,
    "No Label": t.admin.statusNoLabel,
    "Skill Change": t.admin.statusSkillChange,
    "Banned": t.admin.statusBanned,
    "Suspended": t.admin.statusSuspended,
  };
  const searchRef = useRef<HTMLInputElement>(null);
  // Same drag-to-scroll behavior as the Home event feed filter bar, copied
  // 1:1 so both bars feel like the same component everywhere in the app.
  const filterScrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ active: boolean; startX: number; scrollLeft: number }>({ active: false, startX: 0, scrollLeft: 0 });
  useEdgeFadeMask(filterScrollRef);

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
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error"; visible: boolean }>({ message: "", variant: "success", visible: false });
  function fireToast(message: string, variant: "success" | "error") {
    setToast({ message, variant, visible: true });
  }
  // Select + delete - same mechanic as Alerts.tsx, except the map is keyed
  // by each card's own identity (a note id where a player can have more than
  // one card on screen, e.g. Recent Activity), not by player id - otherwise
  // tapping one of a player's several cards would mark all of that player's
  // cards as selected. The map's values are the actual player ids to delete,
  // deduped automatically since a player can only be deleted once.
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Map<string, string>>(new Map());
  const selectedPlayerIds = useMemo(() => new Set(selected.values()), [selected]);
  const selectedKeys = useMemo(() => new Set(selected.keys()), [selected]);
  const [deleteOrigin, setDeleteOrigin] = useState<ModalOrigin>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteBtnRef = useRef<HTMLButtonElement>(null);

  function toggleSelectMode() {
    setSelectMode(prev => !prev);
    setSelected(new Map());
  }
  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Map());
  }
  // Tapping anywhere that isn't a card or a select toggle, or scrolling the
  // list, exits select mode - same "select is a transient mode, not a
  // sticky one" behavior as Alerts.tsx. Skipped while the delete confirm is
  // open so canceling it doesn't also blow away the selection.
  function handleContainerClick(e: React.MouseEvent) {
    if (!selectMode || showDeleteConfirm) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-select-card], [data-select-toggle], [data-select-fab]")) return;
    exitSelectMode();
  }
  useEffect(() => {
    if (!selectMode || showDeleteConfirm) return;
    const onScroll = () => exitSelectMode();
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, true);
  }, [selectMode, showDeleteConfirm]);
  function toggleSelected(key: string, playerId: string) {
    setSelected(prev => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key); else next.set(key, playerId);
      return next;
    });
  }
  function openDeleteConfirm() {
    const rect = deleteBtnRef.current?.getBoundingClientRect();
    setDeleteOrigin(rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null);
    setShowDeleteConfirm(true);
  }
  // profiles.id has no cascade/set-null from events.moderator_id, so deleting
  // a player who ever moderated an event fails at the DB level - each id is
  // deleted individually (not one batched .in() call) so one FK failure
  // doesn't roll back the whole selection, and the toast reports exactly
  // which players went through.
  async function confirmDeleteSelected() {
    const ids = [...selectedPlayerIds];
    setShowDeleteConfirm(false);
    setSelectMode(false);
    setSelected(new Map());
    const results = await Promise.all(ids.map(async id => {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      return { id, ok: !error };
    }));
    const succeeded = results.filter(r => r.ok).map(r => r.id);
    const failed = results.length - succeeded.length;
    if (succeeded.length) setPlayers(prev => prev.filter(p => !succeeded.includes(p.id)));
    if (failed === 0) fireToast(t.admin.playersDeleted(succeeded.length), "success");
    else if (succeeded.length === 0) fireToast(t.admin.playersDeleteFailedAll, "error");
    else fireToast(t.admin.playersDeletePartial(succeeded.length, failed), "error");
  }
  // Every note (not just labeled ones), newest first - source for both the
  // label-based status tabs (filtered to label != null below) and the
  // per-player "latest activity" shown on every player row throughout this
  // page, so no row shows the generic avatar/skill/position summary anymore.
  const [recentNotes, setRecentNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [focused, setFocused]     = useState(false);
  // Scrolling while the keyboard is up should dismiss it (same as most
  // native search UIs) without resetting the search — a capture-phase
  // listener on document catches scroll from the app's scroll container
  // (`<main>` in MainLayout) even though `scroll` events don't bubble.
  useEffect(() => {
    if (!focused) return;
    const dismissKeyboard = () => searchRef.current?.blur();
    document.addEventListener("scroll", dismissKeyboard, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", dismissKeyboard, true);
  }, [focused]);
  const [search, setSearch]       = useState("");
  // status drives the pill highlight/indicator and updates synchronously so
  // the slide animation starts immediately on click. contentStatus drives
  // which section renders and how the player list is filtered, and is set
  // inside startTransition so that heavier work never blocks the same frame
  // as the indicator animation (same split as Home's event filter bar).
  const [status, setStatus]       = useState<Status>("All");
  const [contentStatus, setContentStatus] = useState<Status>("All");
  const [, startTransition] = useTransition();
  const handleStatusClick = (s: Status) => {
    setStatus(s);
    startTransition(() => setContentStatus(s));
  };
  // category drives the circle's opacity highlight and updates synchronously
  // so it dims/brightens immediately on tap. contentCategory drives which
  // section renders (category results vs. search/recent) and is set inside
  // startTransition so the heavier list swap never blocks the same frame as
  // the highlight (same split as the status filter bar above).
  const [category, setCategory]   = useState<Category | null>(null);
  const [contentCategory, setContentCategory] = useState<Category | null>(null);
  const handleCategoryClick = (c: Category) => {
    const next = category === c ? null : c;
    setCategory(next);
    startTransition(() => setContentCategory(next));
  };
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
      const [{ data, error }, { data: noteRows, error: noteErr }, { data: recentNoteRows, error: recentErr }] = await Promise.all([
        supabase.from("profiles").select(
          "id, name, avatar, position, skill_level, telegram, is_admin, is_verified, visible_trust_label, is_suspended, is_banned, trust_label, trust_label_set_at_events, event_participants(id)"
        ),
        supabase.from("player_notes").select("id, player_id, author_id, author_name, body, label, created_at").order("created_at", { ascending: false }).limit(ACTIVITY_LIMIT),
        // Every note (any type), newest first - the note that set a player's
        // currently-active trust_label is always their most recent labeled
        // note (addNote() in AdminPlayerProfile.tsx overwrites trust_label
        // every time a labeled note is added), and the most recent note of
        // any kind is what every player row on this page shows now.
        supabase.from("player_notes").select("id, player_id, author_id, author_name, body, label, created_at").order("created_at", { ascending: false }).limit(500),
      ]);
      if (error) console.error("Failed to load players:", error);
      if (noteErr) console.error("Failed to load recent activity:", noteErr);
      if (recentErr) console.error("Failed to load recent notes:", recentErr);
      setPlayers((data ?? []).map((p) => {
        const { event_participants, ...rest } = p as PlayerRow & { event_participants: { id: string }[] };
        return {
          ...rest,
          eventsJoined: event_participants?.length ?? 0,
        };
      }));
      setActivity((noteRows as NoteRow[]) ?? []);
      setRecentNotes((recentNoteRows as NoteRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  function matchesStatus(p: Player, s: Status) {
    if (s === "All") return true;
    // Skill Change/Banned/Suspended are action feeds over individual notes
    // (see matchesActionStatus), not a per-player trust-label match.
    if ((ACTION_STATUSES as readonly Status[]).includes(s)) return false;
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
    setContentCategory(null);
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

  const statusFiltered = useMemo(
    () => players.filter(p => matchesStatus(p, contentStatus)).sort(byName),
    [players, contentStatus]
  );
  // recentNotes is ordered newest-first, so the first note seen per player
  // here is their most recent note overall - shown on every player row
  // throughout this page instead of the old avatar/skill/position summary.
  const latestNoteByPlayer = useMemo(() => {
    const map = new Map<string, NoteRow>();
    for (const n of recentNotes) if (!map.has(n.player_id)) map.set(n.player_id, n);
    return map;
  }, [recentNotes]);
  // Same idea restricted to labeled notes - the first labeled note seen per
  // player is their most recent one, which addNote() guarantees is the one
  // that set their current trust_label.
  const latestLabelNoteByPlayer = useMemo(() => {
    const map = new Map<string, NoteRow>();
    for (const n of recentNotes) if (n.label && !map.has(n.player_id)) map.set(n.player_id, n);
    return map;
  }, [recentNotes]);
  // Payment Pending/Warnings/No-show/Disrespect/Trust tabs: same "most recent
  // changes first, capped at ACTIVITY_LIMIT" treatment as Recent Admin
  // Activity, instead of statusFiltered's alphabetical order.
  const statusActivity = useMemo(() => {
    const items: { player: Player; note: NoteRow }[] = [];
    for (const p of statusFiltered) {
      const n = latestLabelNoteByPlayer.get(p.id);
      if (n) items.push({ player: p, note: n });
    }
    items.sort((a, b) => new Date(b.note.created_at).getTime() - new Date(a.note.created_at).getTime());
    return items.slice(0, ACTIVITY_LIMIT);
  }, [statusFiltered, latestLabelNoteByPlayer]);
  // No Label tab: same card + same "most recent first" treatment as every
  // other status tab, sourced from latestNoteByPlayer (any note, since a
  // No Label player's note - if any - is never a labeled one) instead of
  // statusFiltered's full roster - a No Label player with no note yet isn't
  // "recent activity" and shouldn't get a card here.
  const noLabelActivity = useMemo(() => {
    const items: { player: Player; note: NoteRow }[] = [];
    for (const p of statusFiltered) {
      const n = latestNoteByPlayer.get(p.id);
      if (n) items.push({ player: p, note: n });
    }
    items.sort((a, b) => new Date(b.note.created_at).getTime() - new Date(a.note.created_at).getTime());
    return items.slice(0, ACTIVITY_LIMIT);
  }, [statusFiltered, latestNoteByPlayer]);
  // Skill Change/Banned/Suspended: every matching note, newest first - not
  // deduped per player like the trust-label tabs, so e.g. Banned shows both
  // the ban and a later unban as separate cards instead of collapsing to
  // just the player's current state.
  const actionActivity = useMemo(() => {
    if (!(ACTION_STATUSES as readonly Status[]).includes(contentStatus)) return [];
    return recentNotes.filter(n => matchesActionStatus(n, contentStatus as ActionStatus)).slice(0, ACTIVITY_LIMIT);
  }, [recentNotes, contentStatus]);
  const categoryFiltered = useMemo(
    () => contentCategory
      ? players.filter(p => (contentCategory === "Admin" ? p.is_admin : p.skill_level === contentCategory) && matchesSearch(p)).sort(byName)
      : [],
    [contentCategory, players, search, noteMatchIds]
  );
  const searchResults = useMemo(
    () => search.trim() ? players.filter(matchesSearch).sort(byName) : [],
    [search, players, noteMatchIds]
  );
  const recentPlayers = getRecentIds().map(id => players.find(p => p.id === id)).filter((p): p is Player => !!p);

  // Swipe right back to the Events tab - mirrors AdminEvents' swipe-left,
  // same no-slide route transition as tapping the sub-navbar tab, with the
  // page itself following the drag. Disabled while search is focused so a
  // stray horizontal drag in the results doesn't navigate away mid-search.
  // ignoreRef=filterScrollRef so dragging the status filter pills (its own
  // click-and-drag scroller, same as the Home feed's filter bar) never gets
  // misread as a page swipe back to Events.
  const { containerRef: swipeRef, handlers: swipeHandlers, style: swipeStyle } =
    useHorizontalSwipe(undefined, () => { navDir.none(); navigate("/admin/events"); }, filterScrollRef, !focused);

  return (
    <div
      ref={swipeRef}
      className="max-w-[640px] mx-auto px-4 py-8"
      style={swipeStyle}
      onClick={handleContainerClick}
      {...swipeHandlers}
    >
      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onHide={() => setToast(prev => ({ ...prev, visible: false }))} />

      <div className="flex items-center justify-between mb-4">
        <h1 className="font-black italic text-2xl text-[var(--ink)] uppercase tracking-widest">{t.admin.players}</h1>
        <span className="text-[#79828b] text-xs font-bold">{players.length} {t.admin.total}</span>
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
            placeholder={t.admin.searchPlaceholder}
            className="w-full bg-[var(--surface-1)] border border-[var(--ink)]/10 rounded-full pl-11 pr-4 py-2.5 text-[var(--ink)] text-sm font-bold placeholder:text-[#79828b]/60 focus:outline-none focus:border-[var(--brand)]/50 transition-colors"
          />
        </div>
        <button
          onClick={exitFocus}
          aria-label="Cancel"
          tabIndex={focused ? 0 : -1}
          className={`h-9 shrink-0 rounded-full bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] text-[var(--ink)]/85 hover:text-[var(--ink)] flex items-center justify-center overflow-hidden transition-all duration-200 ease-out ${
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
          <div className="relative mb-6 w-full bg-[var(--surface-1)] rounded-full p-1.5 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
            <div
              ref={filterScrollRef}
              className="overflow-x-auto overscroll-x-contain touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] select-none"
              style={{ cursor: "grab" }}
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
              <FilterPillTrack activeKey={status}>
                {STATUSES.map(s => (
                  <FilterPill key={s} pillKey={s} label={STATUS_LABEL[s]} active={status === s} onClick={() => handleStatusClick(s)} />
                ))}
              </FilterPillTrack>
            </div>
          </div>

          {contentStatus === "All" ? (
            <section>
              <div className="flex items-center justify-between mb-2 px-0.5">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-[#79828b]">{t.admin.recentActivity}</h2>
                <SelectModeToggle active={selectMode} onClick={toggleSelectMode} selectLabel={t.alerts.select} cancelLabel={t.alerts.cancelSelect} />
              </div>
              {activity.length === 0 ? (
                <p className="text-[#79828b] text-sm text-center py-6">{t.admin.nothingYet}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {activity.map(n => {
                    const target = players.find(p => p.id === n.player_id);
                    const { color, title } = classifyActivity(n, t);
                    return (
                      <PlayerActivityCard
                        key={n.id}
                        avatar={target?.avatar ?? null}
                        name={target?.name ?? t.admin.unknownPlayer}
                        color={color}
                        title={title}
                        subtitle={`${n.author_name} · ${timeAgo(n.created_at, t)}`}
                        onClick={target ? () => goToPlayer(target) : undefined}
                        playerId={target?.id}
                        selectKey={n.id}
                        selectMode={selectMode}
                        selected={selectedKeys.has(n.id)}
                        onToggleSelect={toggleSelected}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          ) : contentStatus === "No Label" ? (
            <section>
              <div className="flex items-center justify-between mb-2 px-0.5">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-[#79828b]">
                  {t.admin.matches(noLabelActivity.length)}
                </h2>
                <SelectModeToggle active={selectMode} onClick={toggleSelectMode} selectLabel={t.alerts.select} cancelLabel={t.alerts.cancelSelect} />
              </div>
              {!loading && noLabelActivity.length === 0 ? (
                <p className="text-[#79828b] text-sm text-center py-6">{t.admin.noLabelPlayers}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {noLabelActivity.map(({ player: p, note: n }) => {
                    const { color, title } = classifyActivity(n, t);
                    return (
                      <PlayerActivityCard
                        key={p.id}
                        avatar={p.avatar}
                        name={p.name}
                        color={color}
                        title={title}
                        subtitle={`${n.author_name} · ${timeAgo(n.created_at, t)}`}
                        onClick={() => goToPlayer(p)}
                        playerId={p.id}
                        selectMode={selectMode}
                        selected={selectedKeys.has(p.id)}
                        onToggleSelect={toggleSelected}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          ) : (ACTION_STATUSES as readonly Status[]).includes(contentStatus) ? (
            <section>
              <div className="flex items-center justify-between mb-2 px-0.5">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-[#79828b]">
                  {t.admin.matches(actionActivity.length)}
                </h2>
                <SelectModeToggle active={selectMode} onClick={toggleSelectMode} selectLabel={t.alerts.select} cancelLabel={t.alerts.cancelSelect} />
              </div>
              {!loading && actionActivity.length === 0 ? (
                <p className="text-[#79828b] text-sm text-center py-6">{t.admin.noStatusMatch}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {actionActivity.map(n => {
                    const target = players.find(p => p.id === n.player_id);
                    const { color, title } = classifyActivity(n, t);
                    return (
                      <PlayerActivityCard
                        key={n.id}
                        avatar={target?.avatar ?? null}
                        name={target?.name ?? t.admin.unknownPlayer}
                        color={color}
                        title={title}
                        subtitle={`${n.author_name} · ${timeAgo(n.created_at, t)}`}
                        onClick={target ? () => goToPlayer(target) : undefined}
                        playerId={target?.id}
                        selectKey={n.id}
                        selectMode={selectMode}
                        selected={selectedKeys.has(n.id)}
                        onToggleSelect={toggleSelected}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          ) : (
            <section>
              <div className="flex items-center justify-between mb-2 px-0.5">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-[#79828b]">
                  {t.admin.matches(statusActivity.length)}
                </h2>
                <SelectModeToggle active={selectMode} onClick={toggleSelectMode} selectLabel={t.alerts.select} cancelLabel={t.alerts.cancelSelect} />
              </div>
              {!loading && statusActivity.length === 0 ? (
                <p className="text-[#79828b] text-sm text-center py-6">{t.admin.noStatusMatch}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {statusActivity.map(({ player: p, note: n }) => {
                    const { color, title } = classifyActivity(n, t);
                    return (
                      <PlayerActivityCard
                        key={p.id}
                        avatar={p.avatar}
                        name={p.name}
                        color={color}
                        title={title}
                        subtitle={`${n.author_name} · ${timeAgo(n.created_at, t)}`}
                        onClick={() => goToPlayer(p)}
                        playerId={p.id}
                        selectMode={selectMode}
                        selected={selectedKeys.has(p.id)}
                        onToggleSelect={toggleSelected}
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
                onClick={() => handleCategoryClick(c)}
                className="flex flex-col items-center gap-1.5 w-14 shrink-0 text-center"
              >
                <div
                  className="w-14 h-14 rounded-full p-[3px] transition-opacity"
                  style={{ background: CATEGORY_COLOR[c], opacity: category && category !== c ? 0.35 : 1 }}
                >
                  <div className="w-full h-full rounded-full bg-[var(--surface-1)] border-2 border-[var(--surface-0)] flex items-center justify-center" style={{ color: CATEGORY_COLOR[c] }}>
                    <CategoryIcon category={c} size={c === "Admin" ? 22 : 18} />
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[var(--ink)] truncate w-14">{catLabel(c)}</span>
              </button>
            ))}
          </div>

          {contentCategory ? (
            <section>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-[#79828b] mb-2 px-0.5">
                {categoryFiltered.length} {t.admin.inLabel} {catLabel(contentCategory)}
              </h2>
              <PlayerList list={categoryFiltered} empty={t.admin.noCategoryMatch} loading={loading} t={t} onPlayerClick={goToPlayer} selectMode={selectMode} selectedIds={selectedKeys} onToggleSelect={toggleSelected} />
            </section>
          ) : search.trim() ? (
            <section>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-[#79828b] mb-2 px-0.5">{t.admin.results}</h2>
              <PlayerList list={searchResults} empty={t.admin.noSearchMatch} loading={loading} t={t} onPlayerClick={goToPlayer} selectMode={selectMode} selectedIds={selectedKeys} onToggleSelect={toggleSelected} />
            </section>
          ) : (
            <section key={recentTick}>
              <div className="flex items-center justify-between mb-2 px-0.5">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-[#79828b]">{t.admin.recentlySearched}</h2>
                {recentPlayers.length > 0 && (
                  <button
                    onClick={() => { clearRecent(); setRecentTick(t => t + 1); }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[#79828b] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] transition-colors"
                    aria-label="Clear recently searched"
                  >
                    <Brush size={13} />
                  </button>
                )}
              </div>
              {recentPlayers.length === 0 ? (
                <p className="text-[#79828b] text-sm text-center py-6">{t.admin.nothingSearched}</p>
              ) : (
                <PlayerList list={recentPlayers} empty={t.admin.nothingSearched} loading={loading} t={t} onPlayerClick={goToPlayer} selectMode={selectMode} selectedIds={selectedKeys} onToggleSelect={toggleSelected} />
              )}
            </section>
          )}
        </FadeIn>
      )}

      {selectMode && selectedPlayerIds.size > 0 && (
        <button
          ref={deleteBtnRef}
          type="button"
          data-select-fab=""
          aria-label={t.alerts.deleteLabel}
          onClick={openDeleteConfirm}
          className="fixed bottom-24 sm:bottom-6 right-6 z-[60] w-12 h-12 rounded-full bg-[#ef4444] flex items-center justify-center"
        >
          <Trash2 size={19} className="text-white" />
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--surface-0)] border-2 border-[var(--surface-0)] flex items-center justify-center text-[10px] font-bold text-[var(--ink)]">
            {selectedPlayerIds.size}
          </span>
        </button>
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          origin={deleteOrigin}
          icon={<Trash2 size={18} className="text-[#ef4444]" />}
          iconBg="bg-[#ef4444]/10 border-[#ef4444]/30"
          title={t.admin.deletePlayersTitle(selectedPlayerIds.size)}
          sub={t.admin.deletePlayersSub}
          cancelLabel={t.common.cancel}
          onCancel={() => setShowDeleteConfirm(false)}
          confirmLabel={t.alerts.deleteLabel}
          confirmCls="bg-[#dc2626] text-white"
          onConfirm={confirmDeleteSelected}
        />
      )}
    </div>
  );
}
