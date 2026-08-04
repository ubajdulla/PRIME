import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { formatDistanceToNowStrict } from "date-fns";
import {
  Send, Instagram, Calendar, MapPin,
  BadgeCheck, Clock,
  OctagonX, Lock, Globe, ChevronDown,
  Phone, Mail, User, Pencil, Flag,
  MoreVertical, Trash2, ThumbsUp, Camera,
} from "lucide-react";
import { SKILL_ORDER, levelLabel, type SkillLevel } from "../../data/adminData";
import { BackBar } from "../../components/ui/BackBar";
import { Toast } from "../../components/ui/Toast";
import { SelectField } from "../../components/ui/SelectField";
import { DatePickerField } from "../../components/ui/DatePickerField";
import { ContactRow } from "../../components/ui/ContactRow";
import { SkillLevelIcon } from "../../components/ui/SkillLevelIcon";
import { DateOfBirthRow } from "../../components/ui/DateOfBirthRow";
import { EditToggleButtons } from "../../components/ui/EditToggleButtons";
import { ConfirmModal, type ModalOrigin } from "../../components/ui/Modal";
import { TapConfirmButton } from "../../components/ui/TapConfirmButton";
import { DropdownPanel, DropdownItem, ConfirmDropdownItem } from "../../components/ui/DropdownMenu";
import { ModAvatarIcon } from "../../components/ui/ModAvatarIcon";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";
import { isPastDate } from "../../lib/eventDate";
import { encodeNotification } from "../../lib/notificationText";
import { LABEL_META, SENTIMENT_COLOR, effectiveLabel, labelName, type TrustLabel } from "../../lib/trustLabel";
import { useExclusiveOpen } from "../../lib/exclusiveOpen";
import { useLang } from "../../i18n";

const SUPERADMIN_EMAIL = "ubajdulla@seznam.cz";

const SKILL_COLOR: Record<string, string> = {
  PRIME:        "text-[#ccff00]",
  Pro:          "text-[var(--brand)]",
  Advanced:     "text-[#a855f7]",
  Intermediate: "text-[#eab308]",
  Beginner:     "text-[#f97316]",
  Rookie:       "text-[#79828b]",
};

type ProfileRow = {
  id: string;
  name: string;
  avatar: string | null;
  position: string | null;
  skill_level: string;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  telegram: string | null;
  instagram: string | null;
  is_verified: boolean;
  is_suspended: boolean;
  suspended_until: string | null;
  suspend_reason: string | null;
  is_banned: boolean;
  ban_reason: string | null;
  trust_label: TrustLabel | null;
  trust_label_set_at_events: number | null;
  is_admin: boolean;
};

type EventRow = { id: string; title: string; event_date: string; location: string; status: string };

type NoteRow = {
  id: string;
  author_name: string;
  body: string;
  visibility: "admin" | "all";
  is_legacy: boolean;
  created_at: string;
  label: TrustLabel | null;
};

export function AdminPlayerProfile() {
  const { playerId } = useParams<{ playerId: string }>();
  const { t, lang } = useLang();
  const { user: viewer, profile: viewerProfile } = useAuth();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [events,  setEvents]  = useState<EventRow[]>([]);
  const [notes,   setNotes]   = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Modal / draft state (UI-only, not backend state) ────────
  const [showSuspendModal,  setShowSuspendModal]  = useState(false);
  const [suspendOrigin,     setSuspendOrigin]     = useState<ModalOrigin>(null);
  const [suspendDate,       setSuspendDate]       = useState("");
  const [suspendReason,     setSuspendReason]     = useState("");
  const suspendBtnRef = useRef<HTMLButtonElement>(null);

  const [showBanConfirm,    setShowBanConfirm]    = useState(false);
  const [banOrigin,         setBanOrigin]         = useState<ModalOrigin>(null);
  const [banReason,         setBanReason]         = useState("");
  const banBtnRef = useRef<HTMLButtonElement>(null);

  const [showSkillConfirm,  setShowSkillConfirm]  = useState(false);
  const [skillOrigin,       setSkillOrigin]       = useState<ModalOrigin>(null);
  const [pendingSkill,      setPendingSkill]      = useState<SkillLevel | "">("");
  const skillFieldRef = useRef<HTMLDivElement>(null);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsDraft,   setDetailsDraft]   = useState({ name: "", birthDate: "", phone: "", email: "", telegram: "", instagram: "" });

  const [addingNote,     setAddingNote]     = useState(false);
  const [noteOrigin,     setNoteOrigin]     = useState<ModalOrigin>(null);
  const addNoteBtnRef = useRef<HTMLButtonElement>(null);
  const [noteDraft,      setNoteDraft]      = useState("");
  const [noteVisibility, setNoteVisibility] = useState<"admin" | "all">("admin");
  const [noteLabel,      setNoteLabel]      = useState<TrustLabel | "">("");
  const [savingNote,     setSavingNote]     = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [openNoteMenuId, setOpenNoteMenuId] = useState<string | null>(null);
  useExclusiveOpen(openNoteMenuId !== null, () => setOpenNoteMenuId(null));
  const [deleteArmedId,  setDeleteArmedId]  = useState<string | null>(null);
  const [editingNoteId,  setEditingNoteId]  = useState<string | null>(null);
  const [editNoteDraft,  setEditNoteDraft]  = useState("");
  const [savingEditNote, setSavingEditNote] = useState(false);
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editNoteTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [toast, setToast] = useState<{ message: string; variant: "success" | "copied" | "publish" | "error"; visible: boolean }>
    ({ message: "", variant: "success", visible: false });

  function fireToast(msg: string, variant: "success" | "copied" | "publish" | "error" = "success") {
    setToast({ message: msg, variant, visible: true });
  }

  async function load(id: string) {
    const [{ data: p }, { data: partRows }, { data: noteRows }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).single(),
      supabase.from("event_participants").select("events(id, title, event_date, location, status)").eq("player_id", id),
      supabase.from("player_notes").select("*").eq("player_id", id).order("created_at", { ascending: false }),
    ]);
    setProfile((p as ProfileRow) ?? null);
    setEvents(((partRows ?? []).map(r => r.events).filter(Boolean) as unknown as EventRow[]));
    setNotes((noteRows as NoteRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    load(playerId);
  }, [playerId]);

  // No autoFocus on the textarea - see Add/Edit Note ConfirmModal comment -
  // this only sizes it to the existing text's height on first paint, so it
  // doesn't render as a cramped 2-row box for a long note.
  useLayoutEffect(() => {
    const el = editNoteTextareaRef.current;
    if (!editingNoteId || !el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [editingNoteId]);

  useEffect(() => {
    if (!openNoteMenuId) return;
    const close = () => setOpenNoteMenuId(null);
    document.addEventListener("mousedown", close);
    // Scroll happens on the page body, not a fixed dropdown - without this,
    // the menu stays open and visually detaches from its trigger as the note
    // list scrolls underneath it. `capture: true` catches scrolling inside
    // any scrollable ancestor, not just window-level scroll.
    document.addEventListener("scroll", close, { capture: true, passive: true });
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("scroll", close, { capture: true });
    };
  }, [openNoteMenuId]);

  // Menu closing (click elsewhere, or picking another item) disarms the
  // delete confirm so it never reopens still-armed next time.
  useEffect(() => {
    if (!openNoteMenuId) setDeleteArmedId(null);
  }, [openNoteMenuId]);

  async function patchProfile(patch: Partial<ProfileRow>) {
    if (!profile) return { ok: false, error: "No profile loaded" };
    const prev = profile;
    setProfile(p => p ? { ...p, ...patch } : p);
    // .select() after update is required to detect an RLS block: if a policy
    // silently excludes the row, Postgres/PostgREST reports 0 rows affected
    // as success with no error at all, not a permission error.
    const { data, error } = await supabase.from("profiles").update(patch).eq("id", profile.id).select();
    if (error) {
      setProfile(prev);
      return { ok: false, error: error.message };
    }
    if (!data || data.length === 0) {
      setProfile(prev);
      return { ok: false, error: "Update was blocked by a database permission rule (0 rows updated)." };
    }
    return { ok: true, error: undefined as string | undefined };
  }

  // Records a moderation action as a system note so Suspend/Ban/Verify/Skill
  // changes leave a visible audit trail in the same Notes list, instead of
  // needing a separate history table — the player_notes log is append-only
  // by design (015_player_notes.sql), which is exactly what a history needs.
  async function logAction(playerId: string, body: string) {
    const { data } = await supabase.from("player_notes").insert({
      player_id: playerId,
      author_id: viewer?.id ?? null,
      author_name: "System",
      body,
      visibility: "admin",
    }).select().single();
    if (data) setNotes(prev => [data as NoteRow, ...prev]);
  }

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !profile) return;
    setUploadingAvatar(true);
    const ext = f.name.split(".").pop() || "jpg";
    const path = `${profile.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, f, { upsert: true });
    if (uploadError) { fireToast(uploadError.message, "error"); setUploadingAvatar(false); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const r = await patchProfile({ avatar: data.publicUrl });
    setUploadingAvatar(false);
    if (!r.ok) { fireToast(r.error ?? "Failed to update photo", "error"); return; }
    fireToast("Profile photo updated");
  }

  if (loading) return <div className="min-h-screen bg-[var(--surface-0)]" />;

  if (!profile) {
    return (
      <div>
        <BackBar label={t.common.back} />
        <div className="flex items-center justify-center min-h-[60vh] text-[#79828b]">
          <p className="font-bold">Player not found</p>
        </div>
      </div>
    );
  }

  const player = profile;
  const displaySkill = player.skill_level;

  const upcomingEvents = events.filter(e => e.status === "upcoming" && !isPastDate(e.event_date));
  const pastEvents     = events.filter(e => isPastDate(e.event_date));

  // Mirrors the DB trigger (010_admin_hierarchy.sql): a regular admin can't
  // ban/suspend/change the skill level of another admin or of themselves,
  // and can never promote a player above their own skill level. This is
  // UI-only guidance - the trigger is what actually enforces it - but
  // without it the buttons would show a false "success" that silently
  // reverts on reload.
  const isSuperadmin = viewer?.email === SUPERADMIN_EMAIL;
  const isSelf = viewerProfile?.id === player.id;
  const hierarchyLocked = !isSuperadmin && (player.is_admin || isSelf);
  const skillOptions = isSuperadmin
    ? [...SKILL_ORDER].reverse()
    : [...SKILL_ORDER].reverse().filter(lvl => SKILL_ORDER.indexOf(lvl) <= SKILL_ORDER.indexOf((viewerProfile?.skill_level as SkillLevel) ?? "Rookie"));

  function formatDate(d: string) {
    if (!d) return "";
    return new Date(d).toLocaleDateString(lang === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  function openDetailsEdit() {
    setDetailsDraft({
      name: player.name, birthDate: player.birth_date ?? "",
      phone: player.phone ?? "", email: player.email ?? "",
      telegram: player.telegram ?? "", instagram: player.instagram ?? "",
    });
    setEditingDetails(true);
  }

  function setDetailsField(k: keyof typeof detailsDraft, v: string) {
    setDetailsDraft(d => ({ ...d, [k]: v }));
  }

  async function saveDetails() {
    await patchProfile({
      name: detailsDraft.name.trim() || player.name,
      birth_date: detailsDraft.birthDate || null,
      phone: detailsDraft.phone || null,
      email: detailsDraft.email || null,
      telegram: detailsDraft.telegram || null,
      instagram: detailsDraft.instagram || null,
    });
    setEditingDetails(false);
    fireToast("Details updated");
  }

  async function addNote() {
    const body = noteDraft.trim();
    if (!body || savingNote) return;
    setSavingNote(true);
    const { data, error } = await supabase.from("player_notes").insert({
      player_id: player.id,
      author_id: viewer?.id ?? null,
      author_name: viewerProfile?.name ?? "Admin",
      body,
      visibility: noteVisibility,
      label: noteLabel || null,
    }).select().single();
    setSavingNote(false);
    if (error || !data) {
      console.error("Failed to save note:", error);
      fireToast(error?.message ?? "Failed to save note", "error");
      return;
    }
    setNotes(prev => [data as NoteRow, ...prev]);
    // The chosen reason becomes the profile's one active label, snapshotting
    // how many events the player has joined right now - effectiveLabel()
    // fades and expires it once 7 more events pass, without touching this note.
    if (noteLabel) {
      await patchProfile({ trust_label: noteLabel, trust_label_set_at_events: events.length });
    }
    setNoteDraft("");
    setNoteLabel("");
    setAddingNote(false);
    fireToast("Note added");
  }

  async function deleteNote(id: string) {
    const prev = notes;
    setNotes(prev.filter(n => n.id !== id));
    setOpenNoteMenuId(null);
    setDeleteArmedId(null);
    const { error } = await supabase.from("player_notes").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete note:", error);
      setNotes(prev);
      fireToast("Failed to delete note", "error");
      return;
    }
    fireToast("Note deleted");
  }

  function openNoteEdit(n: NoteRow) {
    setEditingNoteId(n.id);
    setEditNoteDraft(n.body);
    setOpenNoteMenuId(null);
    setAddingNote(false);
    setExpandedNoteId(null);
  }

  async function saveNoteEdit() {
    if (!editingNoteId || savingEditNote) return;
    const body = editNoteDraft.trim();
    if (!body) return;
    setSavingEditNote(true);
    const { data, error } = await supabase.from("player_notes").update({ body }).eq("id", editingNoteId).select().single();
    setSavingEditNote(false);
    if (error || !data) {
      console.error("Failed to update note:", error);
      fireToast(error?.message ?? "Failed to update note", "error");
      return;
    }
    setNotes(prev => prev.map(n => n.id === editingNoteId ? (data as NoteRow) : n));
    setEditingNoteId(null);
    setEditNoteDraft("");
    fireToast("Note updated");
  }

  function handleNoteKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addNote();
    } else if (e.key === "Escape") {
      setAddingNote(false);
      setNoteDraft("");
      setNoteLabel("");
    }
  }

  function formatDateTime(d: string) {
    return new Date(d).toLocaleString(lang === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  async function confirmSuspend() {
    if (!suspendDate) return;
    const r = await patchProfile({ is_suspended: true, suspended_until: suspendDate, suspend_reason: suspendReason || null });
    setShowSuspendModal(false); setSuspendDate(""); setSuspendReason("");
    if (!r.ok) { fireToast(r.error ?? "Failed to suspend", "error"); return; }
    fireToast(`Suspended until ${formatDate(suspendDate)}`);
    logAction(player.id, `Suspended until ${formatDate(suspendDate)}.${suspendReason ? ` Reason: ${suspendReason}` : ""}`);
    const { error: notifyErr } = await supabase.from("notifications").insert({
      recipient_id: player.id, type: "account_suspended", title: "You've Been Suspended",
      body: encodeNotification({ k: "account_suspended", date: suspendDate, reason: suspendReason || null }),
    });
    if (notifyErr) console.error("Failed to send suspension notification:", notifyErr);
  }

  async function confirmBan() {
    const r = await patchProfile({ is_banned: true, ban_reason: banReason || null, is_suspended: false, suspended_until: null, suspend_reason: null });
    setShowBanConfirm(false); setBanReason("");
    if (!r.ok) { fireToast(r.error ?? "Failed to ban", "error"); return; }
    fireToast("Player banned");
    logAction(player.id, `Banned.${banReason ? ` Reason: ${banReason}` : ""}`);
    const { error: notifyErr } = await supabase.from("notifications").insert({
      recipient_id: player.id, type: "account_banned", title: "Account Banned",
      body: encodeNotification({ k: "account_banned", reason: banReason || null }),
    });
    if (notifyErr) console.error("Failed to send ban notification:", notifyErr);
  }

  async function confirmSkillChange() {
    if (!pendingSkill) return;
    const from = displaySkill;
    const r = await patchProfile({ skill_level: pendingSkill });
    setShowSkillConfirm(false); setPendingSkill("");
    if (!r.ok) { fireToast(r.error ?? "Failed to change skill level", "error"); return; }
    fireToast(`Skill level changed to ${pendingSkill}`);
    logAction(player.id, `Skill level changed: ${from} → ${pendingSkill}`);
  }

  function openSuspendModal() {
    const rect = suspendBtnRef.current?.getBoundingClientRect();
    setSuspendOrigin(rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null);
    setShowSuspendModal(true);
  }

  function openBanModal() {
    const rect = banBtnRef.current?.getBoundingClientRect();
    setBanOrigin(rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null);
    setShowBanConfirm(true);
  }

  function openSkillPicker(val: string) {
    if (!val || val === displaySkill) return;
    const rect = skillFieldRef.current?.getBoundingClientRect();
    setSkillOrigin(rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null);
    setPendingSkill(val as SkillLevel); setShowSkillConfirm(true);
  }

  const currentLabel = effectiveLabel(player.trust_label, player.trust_label_set_at_events, events.length);

  // Status badge sits next to the name, not on the avatar - it used to be a
  // ring + corner badge on the avatar itself, but that fought the avatar's
  // own tap target (change photo). One priority order: a ban is more urgent
  // than a suspension, which is more urgent than a trust label (Warning
  // etc.) - only the winner ever shows, never stacked.
  const skillRingColor = dotColor(displaySkill);
  const avatarStatus: { color: string; icon: "ban" | "suspend" | "flag"; tooltip: string; opacity?: number } | null =
    player.is_banned
      ? { color: "#ef4444", icon: "ban", tooltip: `Banned${player.ban_reason ? ` — ${player.ban_reason}` : ""}` }
      : player.is_suspended
      ? {
          color: "#eab308", icon: "suspend",
          tooltip: `Suspended${player.suspended_until ? ` — ${formatDistanceToNowStrict(new Date(player.suspended_until))} left` : ""}${player.suspend_reason ? ` — ${player.suspend_reason}` : ""}`,
        }
      : currentLabel
      ? {
          color: SENTIMENT_COLOR[LABEL_META[currentLabel.label].sentiment], icon: "flag",
          tooltip: labelName(currentLabel.label, t), opacity: currentLabel.opacity,
        }
      : null;
  const ringColor = skillRingColor;

  return (
    <div className="min-h-full bg-[var(--surface-0)] pb-8 font-sans">
      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onHide={() => setToast(p => ({ ...p, visible: false }))} />

      {/* ── Modals ─────────────────────────────────────────── */}
      {showSkillConfirm && (
        <ConfirmModal
          origin={skillOrigin}
          icon={<ModAvatarIcon avatar={player.avatar} tint="bg-[var(--brand)]/45" icon={<ChevronDown size={18} className="text-white" />} />}
          iconBg="border-[var(--brand)]/25"
          title={t.admin.changeSkillTitle} sub={`${levelLabel(displaySkill, t)} → ${levelLabel(pendingSkill, t)}`}
          body={<>This will move <span className="text-[var(--ink)] font-bold">{player.name}</span> to the <span className="text-[var(--ink)] font-bold">{pendingSkill}</span> group.</>}
          cancelLabel={t.common.cancel} onCancel={() => { setShowSkillConfirm(false); setPendingSkill(""); }}
          confirmLabel={t.common.confirm} confirmCls="bg-[var(--brand)] text-white"
          onConfirm={confirmSkillChange} />
      )}
      {/* Suspend modal */}
      {showSuspendModal && (
        <ConfirmModal
          origin={suspendOrigin}
          icon={<ModAvatarIcon avatar={player.avatar} tint="bg-[#b45309]/45" icon={<Clock size={18} className="text-white" />} />}
          iconBg="border-[#eab308]/25"
          title={t.admin.suspendPlayerTitle} sub={t.admin.suspendPlayerSub}
          cancelLabel={t.common.cancel} onCancel={() => { setShowSuspendModal(false); setSuspendDate(""); setSuspendReason(""); }}
          confirmLabel={t.admin.suspend} confirmCls="bg-[#b45309] text-white"
          confirmDisabled={!suspendDate} onConfirm={confirmSuspend}
        >
          <div className="rounded-xl border border-[var(--ink)]/[0.06] bg-[var(--ink)]/[0.02]">
            <div className="flex items-center gap-3 px-3 h-[52px] shrink-0">
              <div className="w-8 h-8 rounded-full bg-[#eab308]/10 flex items-center justify-center shrink-0">
                <Calendar size={14} className="text-[#eab308]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-[#79828b] mb-0.5">{t.admin.suspendedUntil}</div>
                <DatePickerField
                  value={suspendDate}
                  onChange={setSuspendDate}
                  triggerClassName="flex items-center gap-1.5 text-[var(--ink)] text-sm font-bold outline-none focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 px-3 h-[52px] shrink-0 border-t border-[var(--ink)]/[0.06]">
              <div className="w-8 h-8 rounded-full bg-[#eab308]/10 flex items-center justify-center shrink-0">
                <Pencil size={14} className="text-[#eab308]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-[#79828b] mb-0.5">{t.admin.reasonOptional}</div>
                <input type="text" value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder={t.common.reasonPlaceholder}
                  className="w-full bg-transparent text-[var(--ink)] text-sm font-bold outline-none placeholder:text-[#79828b] placeholder:font-normal" />
              </div>
            </div>
          </div>
        </ConfirmModal>
      )}

      {/* Ban modal */}
      {showBanConfirm && (
        <ConfirmModal
          origin={banOrigin}
          icon={<ModAvatarIcon avatar={player.avatar} tint="bg-[#7f1d1d]/45" icon={<OctagonX size={18} className="text-white" />} />}
          iconBg="border-[#ef4444]/30"
          title={t.admin.banPlayerTitle} sub={t.admin.banPlayerSub}
          cancelLabel={t.common.cancel} onCancel={() => { setShowBanConfirm(false); setBanReason(""); }}
          confirmLabel={t.admin.ban} confirmCls="bg-[#dc2626] text-white"
          onConfirm={confirmBan}
        >
          <div className="rounded-xl border border-[var(--ink)]/[0.06] bg-[var(--ink)]/[0.02] overflow-hidden">
            <div className="flex items-center gap-3 px-3 h-[52px] shrink-0">
              <div className="w-8 h-8 rounded-full bg-[#ef4444]/10 flex items-center justify-center shrink-0">
                <Pencil size={14} className="text-[#ef4444]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-[#79828b] mb-0.5">{t.admin.reasonOptional}</div>
                <input type="text" value={banReason} onChange={e => setBanReason(e.target.value)} placeholder={t.common.reasonPlaceholder}
                  className="w-full bg-transparent text-[var(--ink)] text-sm font-bold outline-none placeholder:text-[#79828b] placeholder:font-normal" />
              </div>
            </div>
          </div>
        </ConfirmModal>
      )}

      {/* Add Note / Edit Note - the same ConfirmModal shell every other
          confirm in this file uses (Suspend, Ban, Skill change). No
          autoFocus on the textarea, same as Suspend/Ban's inputs - the
          keyboard only opens once the user actually taps the field, same
          as it would for any other input, instead of racing the modal's
          own entrance against the keyboard's slide-up animation. */}
      {addingNote && (
        <ConfirmModal
          origin={noteOrigin}
          icon={<ModAvatarIcon avatar={player.avatar} tint="bg-[var(--brand)]/45" icon={<Pencil size={18} className="text-white" />} />}
          iconBg="border-[var(--brand)]/25"
          title={t.admin.addNoteTitle} sub={t.admin.aboutPlayer(player.name)}
          cancelLabel={t.common.cancel} onCancel={() => { setAddingNote(false); setNoteDraft(""); setNoteLabel(""); }}
          confirmLabel={t.common.save} confirmDisabled={!noteDraft.trim() || savingNote}
          onConfirm={addNote}
        >
          <div className="flex flex-col gap-2">
            <textarea ref={noteTextareaRef} value={noteDraft}
              onChange={e => {
                setNoteDraft(e.target.value);
                const el = e.target;
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }}
              onKeyDown={handleNoteKeyDown}
              placeholder={t.admin.addNotePlaceholder} rows={2}
              enterKeyHint="send"
              className="w-full max-h-[160px] bg-[var(--ink)]/5 border border-[var(--ink)]/10 rounded-xl px-3 py-2 text-[var(--ink)] text-sm placeholder:text-[#79828b]/50 focus:outline-none focus:border-[var(--brand)]/50 transition-colors resize-none overflow-y-auto" />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setNoteVisibility(v => v === "admin" ? "all" : "admin")}
                title={noteVisibility === "admin" ? t.admin.adminsOnly : t.admin.visibleToEveryone}
                className={`relative w-[52px] h-[30px] rounded-full shrink-0 transition-colors ${noteVisibility === "all" ? "bg-[var(--brand)]" : "bg-[var(--ink)]/15"}`}
              >
                <span className={`absolute top-[3px] w-6 h-6 rounded-full bg-white transition-all ${noteVisibility === "all" ? "left-[25px]" : "left-[3px]"}`} />
              </button>
              {noteVisibility === "admin"
                ? <Lock size={20} className="text-[#79828b]" />
                : <Globe size={20} className="text-[#79828b]" />}
              <div className="ml-auto">
                <SelectField
                  value={noteLabel}
                  options={[
                    { value: "", label: t.admin.noLabelOption },
                    { value: "warning", label: labelName("warning", t), icon: noteLabelIcon("warning") },
                    { value: "no_show", label: labelName("no_show", t), icon: noteLabelIcon("no_show") },
                    { value: "rude_behavior", label: labelName("rude_behavior", t), icon: noteLabelIcon("rude_behavior") },
                    { value: "payment", label: labelName("payment", t), icon: noteLabelIcon("payment") },
                    { value: "trustworthy", label: labelName("trustworthy", t), icon: noteLabelIcon("trustworthy") },
                  ]}
                  onChange={v => setNoteLabel(v as TrustLabel | "")}
                  triggerClassName="w-48 h-11 flex items-center justify-between gap-1.5 bg-[var(--ink)]/5 rounded-lg px-3 text-[var(--ink)]/80 text-sm font-bold transition-colors hover:bg-[var(--ink)]/10 hover:text-[var(--ink)] focus:outline-none cursor-pointer"
                  panelClassName="absolute right-0 top-full mt-1.5 z-30"
                  panelWidthClassName="w-48"
                />
              </div>
            </div>
          </div>
        </ConfirmModal>
      )}

      {editingNoteId && (
        <ConfirmModal
          title={t.admin.editNoteTitle}
          cancelLabel={t.common.cancel} onCancel={() => { setEditingNoteId(null); setEditNoteDraft(""); }}
          confirmLabel={t.common.save} confirmDisabled={!editNoteDraft.trim() || savingEditNote}
          onConfirm={saveNoteEdit}
        >
          <textarea
            ref={editNoteTextareaRef}
            value={editNoteDraft}
            onChange={e => {
              setEditNoteDraft(e.target.value);
              const el = e.target;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
            onKeyDown={e => {
              if (e.key === "Escape") { setEditingNoteId(null); setEditNoteDraft(""); }
            }}
            rows={2}
            className="w-full max-h-[160px] bg-[var(--ink)]/5 border border-[var(--ink)]/10 rounded-xl px-3 py-2 text-[var(--ink)] text-sm placeholder:text-[#79828b]/50 focus:outline-none focus:border-[var(--brand)]/50 transition-colors resize-none overflow-y-auto"
          />
        </ConfirmModal>
      )}

      <BackBar label={t.common.back} />

      {/* ── Avatar + identity ─────────────────────────────── */}
      <div className="flex flex-col items-center pt-8 pb-6 px-4">
        <label className="relative mb-4 cursor-pointer">
          {player.avatar ? (
            <img src={player.avatar} alt={player.name}
              className={`w-28 h-28 rounded-full object-cover bg-[var(--surface-1)] ${uploadingAvatar ? "opacity-50" : ""}`}
              style={{ boxShadow: `0 0 0 3px ${ringColor}` }} />
          ) : (
            <div className={`w-28 h-28 rounded-full bg-[var(--surface-1)] flex items-center justify-center ${uploadingAvatar ? "opacity-50" : ""}`}
              style={{ boxShadow: `0 0 0 3px ${ringColor}` }}>
              <User size={36} className="text-[var(--ink)]/20" />
            </div>
          )}
          {/* Admin-only override: tap to replace this player's photo, same
              upload path and badge styling as their own Profile page avatar picker. */}
          <span className="absolute bottom-0.5 right-0.5 w-7 h-7 rounded-full bg-[var(--brand)] border-2 border-[var(--surface-0)] flex items-center justify-center pointer-events-none">
            <Camera size={13} className="text-white" />
          </span>
          <input type="file" accept="image/*" className="hidden" disabled={uploadingAvatar} onChange={handleAvatar} />
        </label>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-semibold text-[var(--ink)]">{player.name}</h1>
          {player.is_verified && <BadgeCheck size={18} className="text-[#3897f0] shrink-0" />}
          {/* Status badge - ban/suspension/trust-label, one priority order
              (see avatarStatus above). Lives next to the name, not on the
              avatar, so it never competes with the avatar's own tap target. */}
          {avatarStatus && (
            <StatusBadge color={avatarStatus.color} icon={avatarStatus.icon} tooltip={avatarStatus.tooltip} opacity={avatarStatus.opacity} />
          )}
        </div>
        <span className={`flex items-center gap-1 text-sm font-medium mb-2 ${SKILL_COLOR[displaySkill] ?? "text-[var(--ink)]"}`}>
          <SkillLevelIcon level={displaySkill} size={14} />
          {levelLabel(displaySkill, t)}
        </span>
      </div>

      <div className="max-w-[640px] mx-auto px-4 flex flex-col gap-6">

        {/* ── Info ─────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between h-8 mb-2 px-1">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa]">{t.admin.infoTab}</h2>
            <EditToggleButtons
              editing={editingDetails}
              onCancel={() => setEditingDetails(false)}
              onSave={saveDetails}
              idle={
                <button onClick={openDetailsEdit}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--surface-hover)] text-[#79828b] hover:bg-[var(--surface-active)] hover:text-[var(--ink)] transition-colors">
                  <Pencil size={16} />
                </button>
              }
            />
          </div>
          <div className="bg-[var(--surface-1)] rounded-xl overflow-hidden">
            <ContactRow
              editing={editingDetails}
              icon={<User size={15} className="text-[var(--brand)]" />} iconBg="bg-[var(--brand)]/15"
              label={t.admin.firstName} displayValue={player.name} editValue={detailsDraft.name}
              onChange={v => setDetailsField("name", v)}
            />

            <DateOfBirthRow
              editing={editingDetails}
              value={player.birth_date}
              draftValue={detailsDraft.birthDate}
              onChange={v => setDetailsField("birthDate", v)}
            />

            <ContactRow
              editing={editingDetails}
              href={`tel:${(player.phone ?? "").replace(/\s/g, "")}`}
              icon={<Phone size={15} className="text-[var(--brand)]" />} iconBg="bg-[var(--brand)]/15"
              label={t.profile.phone} displayValue={player.phone ?? ""} editValue={detailsDraft.phone}
              onChange={v => setDetailsField("phone", v)}
              numeric
            />
            <ContactRow
              editing={editingDetails}
              href={`mailto:${player.email ?? ""}`}
              icon={<Mail size={15} className="text-[var(--brand)]" />} iconBg="bg-[var(--brand)]/15"
              label={t.profile.email} displayValue={player.email ?? ""} editValue={detailsDraft.email}
              onChange={v => setDetailsField("email", v)}
            />
            <ContactRow
              editing={editingDetails}
              href={`https://t.me/${(player.telegram ?? "").replace("@", "")}`} external
              icon={<Send size={14} className="text-white -ml-0.5" />} iconBg="bg-[var(--brand)]"
              label={t.profile.telegram} displayValue={player.telegram ?? ""} editValue={detailsDraft.telegram}
              onChange={v => setDetailsField("telegram", v)}
            />
            <ContactRow
              editing={editingDetails}
              href={`https://instagram.com/${(player.instagram ?? "").replace("@", "")}`} external
              icon={<Instagram size={14} className="text-white" />} iconBg="bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]"
              label={t.profile.instagram} displayValue={player.instagram ? `@${player.instagram.replace("@", "")}` : ""} editValue={detailsDraft.instagram}
              onChange={v => setDetailsField("instagram", v)}
            />
          </div>
        </section>

        {/* ── Notes ────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa]">{t.admin.notesTab}</h2>
            {!addingNote && (
              <button
                ref={addNoteBtnRef}
                type="button"
                onClick={() => {
                  const rect = addNoteBtnRef.current?.getBoundingClientRect();
                  setNoteOrigin(rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null);
                  setAddingNote(true);
                  // Only one note-related thing can be open at a time - opening the
                  // composer closes any note that's mid-edit, expanded, or menu-open.
                  setEditingNoteId(null);
                  setEditNoteDraft("");
                  setExpandedNoteId(null);
                  setOpenNoteMenuId(null);
                  setDeleteArmedId(null);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--surface-hover)] text-[#79828b] hover:bg-[var(--surface-active)] hover:text-[var(--ink)] transition-colors">
                <Send size={14} />
              </button>
            )}
          </div>

          {notes.length === 0 ? (
            <p className="mt-2 py-3 text-center text-sm text-[#79828b]">{t.admin.noNotes}</p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {notes.map(n => {
                const isLong = n.body.length > 220;
                const isExpanded = expandedNoteId === n.id;
                const isEditing = editingNoteId === n.id;
                return (
                  <div key={n.id} className={`bg-[var(--surface-1)] rounded-xl px-3 py-3 transition-opacity ${isEditing ? "opacity-40" : ""}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {n.is_legacy ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#79828b]">Legacy note</span>
                      ) : (
                        <>
                          {n.visibility === "admin" ? <Lock size={11} className="text-[#79828b] shrink-0" /> : <Globe size={11} className="text-[#79828b] shrink-0" />}
                          <span className="text-[11px] font-bold text-[var(--ink)]/70">{n.author_name || "Admin"}</span>
                          <span className="text-[10px] text-[#79828b]">· {formatDateTime(n.created_at)}</span>
                        </>
                      )}
                      {n.label && (
                        <span
                          className="ml-auto w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: `${SENTIMENT_COLOR[LABEL_META[n.label].sentiment]}26` }}
                          title={labelName(n.label, t)}
                        >
                          {LABEL_META[n.label].sentiment === "positive"
                            ? <ThumbsUp size={11} style={{ color: SENTIMENT_COLOR[LABEL_META[n.label].sentiment] }} />
                            : <Flag size={11} style={{ color: SENTIMENT_COLOR[LABEL_META[n.label].sentiment] }} />}
                        </span>
                      )}
                      {/* Legacy notes (015_player_notes.sql - carried over from the old
                          single admin_note column) have no known author, so there's
                          nothing to Edit, but they can still be Removed like any other
                          note - the delete policy (028_player_notes_delete.sql) already
                          covers them, this menu was just never shown for them. */}
                      <div className={`relative shrink-0 ${n.label ? "" : "ml-auto"}`}>
                        <button
                          type="button"
                          onMouseDown={e => e.stopPropagation()}
                          onClick={() => setOpenNoteMenuId(v => v === n.id ? null : n.id)}
                          className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors ${openNoteMenuId === n.id ? "bg-[var(--surface-active)] text-[var(--ink)]" : "text-[#79828b] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"}`}
                        >
                          <MoreVertical size={14} />
                        </button>
                        {openNoteMenuId === n.id && (
                          <div onMouseDown={e => e.stopPropagation()} className="absolute right-0 top-full mt-1.5 z-30 w-44">
                            <DropdownPanel>
                              <div className="flex flex-col">
                                {!n.is_legacy && <DropdownItem icon={<Pencil size={14} />} label={t.common.edit} onClick={() => openNoteEdit(n)} />}
                                <ConfirmDropdownItem
                                  icon={<Trash2 size={14} />} label={t.common.remove} variant="destructive"
                                  armed={deleteArmedId === n.id}
                                  onArm={() => setDeleteArmedId(n.id)}
                                  onConfirm={() => deleteNote(n.id)}
                                  onDisarm={() => setDeleteArmedId(null)}
                                />
                              </div>
                            </DropdownPanel>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className={`text-sm text-[var(--ink)]/80 leading-relaxed whitespace-pre-wrap break-words ${isLong && !isExpanded ? "line-clamp-4" : ""}`}>
                      {n.body}
                    </p>
                    {isLong && (
                      <div className="flex justify-end mt-1">
                        <button
                          type="button"
                          onClick={() => setExpandedNoteId(prev => prev === n.id ? null : n.id)}
                          className="text-[11px] font-bold text-[var(--brand)] hover:text-[var(--ink)] transition-colors"
                        >
                          {isExpanded ? t.admin.showLess : t.admin.readMore}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Admin Actions ─────────────────────────────────── */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa] mb-2 px-1">{t.admin.adminTab}</h2>
          <div className="bg-[var(--surface-1)] rounded-xl overflow-hidden">

            {/* Skill Level */}
            <div className="relative flex items-center gap-3 px-4 py-3.5 before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-[var(--ink)]/[0.06] first:before:hidden">
              <div className={`w-8 h-8 rounded-full bg-[var(--ink)]/5 flex items-center justify-center shrink-0 ${SKILL_COLOR[displaySkill] ?? "text-[var(--ink)]"}`}>
                <SkillLevelIcon level={displaySkill} size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-[var(--ink)]">{t.admin.skillLevel}</div>
                <div className="text-[11px] text-[#79828b]">{t.admin.current}: {levelLabel(displaySkill, t)}</div>
              </div>
              <div className="shrink-0" ref={skillFieldRef}>
                <SelectField
                  value={displaySkill}
                  options={skillOptions.map(lvl => ({ value: lvl, label: levelLabel(lvl, t) }))}
                  onChange={openSkillPicker}
                  disabled={hierarchyLocked}
                  triggerClassName="w-24 h-8 flex items-center justify-between gap-1.5 bg-[var(--ink)]/5 rounded-full pl-3 pr-2.5 text-[var(--ink)]/70 text-[11px] font-black uppercase tracking-wider transition-colors hover:bg-[var(--ink)]/10 hover:text-[var(--ink)] focus:outline-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  panelClassName="absolute right-0 top-full mt-1.5 z-30"
                  panelWidthClassName="w-36"
                />
              </div>
            </div>
            {hierarchyLocked && (
              <p className="px-4 pb-3 -mt-2 text-[10px] text-[#79828b]">
                {isSelf ? t.admin.cantChangeSelf : t.admin.cantChangeAdmin}
              </p>
            )}

            {/* Verification */}
            <div className="relative flex items-center gap-3 px-4 py-3.5 before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-[var(--ink)]/[0.06] first:before:hidden">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${player.is_verified ? "bg-[#3897f0]" : "bg-[var(--ink)]/5"}`}>
                <BadgeCheck size={16} className={player.is_verified ? "text-white" : "text-[#79828b]"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-[var(--ink)]">{t.admin.identityVerified}</div>
                <div className="text-[11px] text-[#79828b]">{player.is_verified ? t.admin.badgeVisible : t.admin.notVerified}</div>
              </div>
              {player.is_verified ? (
                <TapConfirmButton
                  label={t.admin.revoke} fillCls="bg-[#3897f0]" disabled={player.is_admin}
                  onConfirm={async () => {
                    const r = await patchProfile({ is_verified: false });
                    if (!r.ok) { fireToast(r.error ?? "Failed to revoke", "error"); return; }
                    fireToast("Verification revoked");
                    logAction(player.id, "Verification revoked");
                  }}
                />
              ) : (
                <TapConfirmButton
                  label={t.admin.verify} fillCls="bg-[#3897f0]"
                  onConfirm={async () => {
                    // Verified players can't be suspended - verifying a
                    // currently-suspended player lifts the suspension in
                    // the same patch, same "one status overrides the other"
                    // pattern confirmBan already uses against is_suspended.
                    const wasSuspended = player.is_suspended;
                    const r = await patchProfile({ is_verified: true, is_suspended: false, suspended_until: null, suspend_reason: null });
                    if (!r.ok) { fireToast(r.error ?? "Failed to verify", "error"); return; }
                    fireToast("Player verified");
                    logAction(player.id, wasSuspended ? "Verified (suspension lifted)" : "Verified");
                  }}
                />
              )}
            </div>

            {/* Suspension */}
            <div className="relative flex items-center gap-3 px-4 py-3.5 before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-[var(--ink)]/[0.06] first:before:hidden">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${player.is_suspended ? "bg-[#eab308]/15" : "bg-[var(--ink)]/5"}`}>
                <Clock size={16} className={player.is_suspended ? "text-[#eab308]" : "text-[#79828b]"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-[var(--ink)]">{t.admin.suspension}</div>
                <div className="text-[11px] text-[#79828b]">
                  {player.is_suspended ? `${t.admin.suspendedUntil} ${formatDate(player.suspended_until ?? "")}` : player.is_verified ? t.admin.cantBeSuspended : t.admin.notSuspended}
                </div>
              </div>
              {player.is_suspended ? (
                <TapConfirmButton
                  label={t.admin.lift} fillCls="bg-[#4dcd5e]" armedTextCls="text-white" disabled={hierarchyLocked}
                  onConfirm={async () => {
                    const r = await patchProfile({ is_suspended: false, suspended_until: null, suspend_reason: null });
                    if (!r.ok) { fireToast(r.error ?? "Failed to lift suspension", "error"); return; }
                    fireToast("Suspension lifted");
                    logAction(player.id, "Suspension lifted");
                  }}
                />
              ) : (
                <button ref={suspendBtnRef} onClick={openSuspendModal} disabled={player.is_banned || player.is_verified || hierarchyLocked}
                  title={player.is_verified ? t.admin.cantBeSuspended : undefined}
                  className="w-24 h-8 flex items-center justify-center rounded-full bg-[var(--ink)]/5 text-[var(--ink)]/70 text-[11px] font-black uppercase tracking-wider hover:bg-[var(--ink)]/10 hover:text-[var(--ink)] transition-colors focus:outline-none shrink-0 disabled:opacity-30 disabled:cursor-not-allowed">
                  {t.admin.suspendBtn}
                </button>
              )}
            </div>

            {/* Ban */}
            <div className="relative flex items-center gap-3 px-4 py-3.5 before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-[var(--ink)]/[0.06] first:before:hidden">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${player.is_banned ? "bg-[#ef4444]/15" : "bg-[var(--ink)]/5"}`}>
                <OctagonX size={16} className={player.is_banned ? "text-[#ef4444]" : "text-[#79828b]"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-[var(--ink)]">{t.admin.ban}</div>
                <div className="text-[11px] text-[#79828b]">{player.is_banned ? t.admin.permanentlyBanned : t.admin.notBanned}</div>
              </div>
              {player.is_banned ? (
                <TapConfirmButton
                  label={t.admin.unban} fillCls="bg-[#4dcd5e]" armedTextCls="text-white" disabled={hierarchyLocked}
                  onConfirm={async () => {
                    const r = await patchProfile({ is_banned: false, ban_reason: null });
                    if (!r.ok) { fireToast(r.error ?? "Failed to unban", "error"); return; }
                    fireToast("Player unbanned");
                    logAction(player.id, "Unbanned");
                  }}
                />
              ) : (
                <button ref={banBtnRef} onClick={openBanModal} disabled={hierarchyLocked}
                  className="w-24 h-8 flex items-center justify-center rounded-full bg-[#ef4444]/10 text-[#ef4444] text-[11px] font-black uppercase tracking-wider hover:bg-[#ef4444]/20 transition-colors focus:outline-none shrink-0 disabled:opacity-30 disabled:cursor-not-allowed">
                  {t.admin.ban}
                </button>
              )}
            </div>

            {/* Current Label — set only by picking a reason on a new note, not from here */}
            <div className="relative flex items-center gap-3 px-4 py-3.5 before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-[var(--ink)]/[0.06] first:before:hidden">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: currentLabel ? `${SENTIMENT_COLOR[LABEL_META[currentLabel.label].sentiment]}26` : "rgba(255,255,255,.05)", opacity: currentLabel?.opacity ?? 1 }}
              >
                <Flag size={16} style={{ color: currentLabel ? SENTIMENT_COLOR[LABEL_META[currentLabel.label].sentiment] : "#79828b" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-[var(--ink)]">{t.admin.currentLabel}</div>
                <div className="text-[11px] text-[#79828b]">
                  {currentLabel ? t.admin.labelDecayNote(labelName(currentLabel.label, t)) : t.admin.noLabelSet}
                </div>
              </div>
              {currentLabel && (
                <TapConfirmButton
                  label={t.admin.clear} fillCls="bg-[#4dcd5e]" armedTextCls="text-white"
                  onConfirm={async () => {
                    const r = await patchProfile({ trust_label: null, trust_label_set_at_events: null });
                    if (!r.ok) { fireToast(r.error ?? "Failed to clear label", "error"); return; }
                    fireToast("Label cleared");
                    logAction(player.id, "Label cleared early");
                  }}
                />
              )}
            </div>

          </div>
        </section>

        {/* ── Upcoming Events ───────────────────────────────── */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa] mb-2">{t.profile.upcomingEvents}</h2>
          {upcomingEvents.length === 0 ? (
            <div className="bg-[var(--surface-1)] rounded-xl py-6 flex items-center justify-center">
              <span className="text-sm text-[#aaa]">{t.common.nothingHere}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingEvents.slice(0, 7).map(e => (
                <Link key={e.id} to={`/admin/events/${e.id}`} className="block bg-[var(--surface-1)] rounded-xl px-4 py-3.5 hover:bg-[var(--surface-hover)] transition-colors">
                  <span className="text-sm font-bold text-[var(--ink)] uppercase tracking-wide block mb-1.5">{e.title}</span>
                  <div className="flex flex-wrap gap-3 text-xs text-[#aaa]">
                    <span className="flex items-center gap-1"><Calendar size={11} className="text-[var(--brand)]" />{formatDate(e.event_date)}</span>
                    <span className="flex items-center gap-1"><MapPin size={11} className="text-[var(--brand)]" />{e.location}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Past Events ───────────────────────────────────── */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa] mb-2">{t.profile.pastEvents}</h2>
          {pastEvents.length === 0 ? (
            <div className="bg-[var(--surface-1)] rounded-xl py-6 flex items-center justify-center">
              <span className="text-sm text-[#aaa]">{t.common.nothingHere}</span>
            </div>
          ) : (
            <div className="bg-[var(--surface-1)] rounded-xl overflow-hidden">
              {pastEvents.slice(0, 7).map((e) => (
                <Link key={e.id} to={`/admin/events/${e.id}`} className="relative flex items-center justify-between px-4 py-2.5 hover:bg-[var(--surface-hover)] transition-colors before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-[var(--ink)]/[0.06] first:before:hidden">
                  <span className="text-sm text-[var(--ink)]/75 truncate">{e.title}</span>
                  <span className="text-xs text-[#aaa] shrink-0 ml-3">{formatDate(e.event_date)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

// Same small colored badge as the label shown on each note, reused inside
// the label picker's dropdown so a reason reads the same way whether it's
// being chosen or already applied.
function noteLabelIcon(l: TrustLabel) {
  const meta = LABEL_META[l];
  const color = SENTIMENT_COLOR[meta.sentiment];
  const Icon = meta.sentiment === "positive" ? ThumbsUp : Flag;
  return (
    <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: `${color}26` }}>
      <Icon size={11} style={{ color }} />
    </span>
  );
}

function dotColor(skillLevel: string): string {
  const map: Record<string, string> = {
    PRIME: "#ccff00", Pro: "var(--brand)", Advanced: "#a855f7",
    Intermediate: "#eab308", Beginner: "#f97316", Rookie: "#79828b",
  };
  return map[skillLevel] ?? "var(--brand)";
}
