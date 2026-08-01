import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import {
  Send, Instagram, Calendar, MapPin,
  CheckCircle2, BadgeCheck, Clock,
  OctagonX, Lock, Globe, ChevronDown,
  Phone, Mail, User, Pencil, Plus, Flag,
} from "lucide-react";
import { SKILL_ORDER, type SkillLevel } from "../../data/adminData";
import { BackBar } from "../../components/ui/BackBar";
import { Toast } from "../../components/ui/Toast";
import { SelectField } from "../../components/ui/SelectField";
import { DatePickerField } from "../../components/ui/DatePickerField";
import { ContactRow } from "../../components/ui/ContactRow";
import { ConfirmModal } from "../../components/ui/Modal";
import { TapConfirmButton } from "../../components/ui/TapConfirmButton";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";
import { isPastDate } from "../../lib/eventDate";

const SUPERADMIN_EMAIL = "ubajdulla@seznam.cz";

const SKILL_COLOR: Record<string, string> = {
  PRIME:        "text-[#ccff00]",
  Pro:          "text-[#462ed1]",
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
  trust_label: "yellow" | "red" | null;
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
};

export function AdminPlayerProfile() {
  const { playerId } = useParams<{ playerId: string }>();
  const { user: viewer, profile: viewerProfile } = useAuth();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [events,  setEvents]  = useState<EventRow[]>([]);
  const [notes,   setNotes]   = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Modal / draft state (UI-only, not backend state) ────────
  const [showSuspendModal,  setShowSuspendModal]  = useState(false);
  const [suspendDate,       setSuspendDate]       = useState("");
  const [suspendReason,     setSuspendReason]     = useState("");

  const [showBanConfirm,    setShowBanConfirm]    = useState(false);
  const [banReason,         setBanReason]         = useState("");

  const [showSkillConfirm,  setShowSkillConfirm]  = useState(false);
  const [pendingSkill,      setPendingSkill]      = useState<SkillLevel | "">("");

  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsDraft,   setDetailsDraft]   = useState({ name: "", birthDate: "", phone: "", email: "", telegram: "", instagram: "" });

  const [addingNote,     setAddingNote]     = useState(false);
  const [noteDraft,      setNoteDraft]      = useState("");
  const [noteVisibility, setNoteVisibility] = useState<"admin" | "all">("admin");
  const [savingNote,     setSavingNote]     = useState(false);
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Keep the note composer visible above the on-screen mobile keyboard: the
  // visualViewport shrinks as the keyboard opens, so re-scroll the focused
  // textarea into view each time that happens.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    function onResize() {
      if (document.activeElement === noteTextareaRef.current) {
        noteTextareaRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

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

  if (loading) return <div className="min-h-screen bg-[#181818]" />;

  if (!profile) {
    return (
      <div>
        <BackBar label="Back" />
        <div className="flex items-center justify-center min-h-[60vh] text-[#79828b]">
          <p className="font-bold">Player not found</p>
        </div>
      </div>
    );
  }

  const player = profile;
  const displaySkill = player.skill_level;
  const ringColor    = dotColor(displaySkill);

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
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
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

  function calcAge(birthDate: string): number | null {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
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
    }).select().single();
    setSavingNote(false);
    if (error || !data) {
      console.error("Failed to save note:", error);
      fireToast(error?.message ?? "Failed to save note", "error");
      return;
    }
    setNotes(prev => [data as NoteRow, ...prev]);
    setNoteDraft("");
    setAddingNote(false);
    fireToast("Note added");
  }

  function handleNoteKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addNote();
    } else if (e.key === "Escape") {
      setAddingNote(false);
      setNoteDraft("");
    }
  }

  function formatDateTime(d: string) {
    return new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  async function confirmSuspend() {
    if (!suspendDate) return;
    await patchProfile({ is_suspended: true, suspended_until: suspendDate, suspend_reason: suspendReason || null });
    setShowSuspendModal(false); setSuspendDate(""); setSuspendReason("");
    fireToast(`Suspended until ${formatDate(suspendDate)}`);
  }

  async function confirmBan() {
    await patchProfile({ is_banned: true, ban_reason: banReason || null, is_suspended: false, suspended_until: null, suspend_reason: null });
    setShowBanConfirm(false); setBanReason("");
    fireToast("Player banned");
  }

  async function confirmSkillChange() {
    if (!pendingSkill) return;
    await patchProfile({ skill_level: pendingSkill });
    setShowSkillConfirm(false); setPendingSkill("");
    fireToast(`Skill level changed to ${pendingSkill}`);
  }

  function openSkillPicker(val: string) {
    if (!val || val === displaySkill) return;
    setPendingSkill(val as SkillLevel); setShowSkillConfirm(true);
  }

  return (
    <div className="min-h-full bg-[#181818] pb-8 font-sans">
      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onHide={() => setToast(p => ({ ...p, visible: false }))} />

      {/* ── Modals ─────────────────────────────────────────── */}
      {showSkillConfirm && (
        <ConfirmModal icon={<ChevronDown size={18} className="text-[#a855f7]" />} iconBg="bg-[#a855f7]/10 border-[#a855f7]/20"
          title="Change Skill Level?" sub={`${displaySkill} → ${pendingSkill}`}
          body={<>This will move <span className="text-white font-bold">{player.name}</span> to the <span className="text-white font-bold">{pendingSkill}</span> group.</>}
          cancelLabel="Cancel" onCancel={() => { setShowSkillConfirm(false); setPendingSkill(""); }}
          confirmLabel="Confirm" confirmCls="bg-[#a855f7] text-white"
          onConfirm={confirmSkillChange} />
      )}
      {/* Suspend modal */}
      {showSuspendModal && (
        <ConfirmModal
          icon={<Clock size={15} className="text-[#eab308]" />} iconBg="bg-[#eab308]/10 border-[#eab308]/20"
          title="Suspend Player" sub="Can't join events until the date."
          cancelLabel="Cancel" onCancel={() => { setShowSuspendModal(false); setSuspendDate(""); setSuspendReason(""); }}
          confirmLabel="Suspend" confirmCls="bg-[#b45309] text-white"
          confirmDisabled={!suspendDate} onConfirm={confirmSuspend}
        >
          <div className="flex flex-col gap-2.5">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#79828b] block mb-1">Suspended until</label>
              <DatePickerField
                value={suspendDate}
                onChange={setSuspendDate}
                triggerClassName="flex items-center justify-between gap-2 w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-white text-sm font-bold outline-none focus:border-white/25 transition-colors cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#79828b] block mb-1">
                Reason <span className="normal-case font-normal tracking-normal">(optional)</span>
              </label>
              <input type="text" value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="e.g. repeated no-show"
                className="w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-white text-sm font-bold outline-none focus:border-white/25 transition-colors placeholder:text-[#79828b] placeholder:font-normal" />
            </div>
          </div>
        </ConfirmModal>
      )}

      {/* Ban modal */}
      {showBanConfirm && (
        <ConfirmModal
          icon={<OctagonX size={18} className="text-[#ef4444]" />} iconBg="bg-[#ef4444]/10 border-[#ef4444]/20"
          title="Ban Player?" sub="Permanent — cannot join any events."
          cancelLabel="Cancel" onCancel={() => { setShowBanConfirm(false); setBanReason(""); }}
          confirmLabel="Ban" confirmCls="bg-[#dc2626] text-white"
          onConfirm={confirmBan}
        >
          <label className="text-[10px] font-black uppercase tracking-widest text-[#79828b] block mb-1.5">
            Reason <span className="normal-case font-normal tracking-normal">(optional)</span>
          </label>
          <input type="text" value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="e.g. harassment"
            className="w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-white text-sm font-bold outline-none focus:border-white/25 transition-colors placeholder:text-[#79828b] placeholder:font-normal" />
        </ConfirmModal>
      )}

      <BackBar label="Back" />

      {/* ── Avatar + identity ─────────────────────────────── */}
      <div className="flex flex-col items-center pt-8 pb-6 px-4">
        <div className="relative mb-4">
          {player.avatar ? (
            <img src={player.avatar} alt={player.name}
              className="w-28 h-28 rounded-full object-cover bg-[#212121]"
              style={{ boxShadow: `0 0 0 3px ${ringColor}` }} />
          ) : (
            <div className="w-28 h-28 rounded-full bg-[#212121] flex items-center justify-center"
              style={{ boxShadow: `0 0 0 3px ${ringColor}` }}>
              <User size={36} className="text-white/20" />
            </div>
          )}
          {player.is_verified && (
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#462ed1] rounded-full flex items-center justify-center border-[3px] border-[#181818]">
              <CheckCircle2 size={14} className="text-white" strokeWidth={2.5} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-semibold text-white">{player.name}</h1>
          {player.is_verified && <BadgeCheck size={18} className="text-[#462ed1] shrink-0" />}
        </div>
        <span className={`text-sm font-medium mb-2 ${SKILL_COLOR[displaySkill] ?? "text-white"}`}>{displaySkill}</span>
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {player.is_banned && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ef4444]/10 border border-[#ef4444]/25 text-[#ef4444] text-xs font-bold">
              <OctagonX size={11} /> Banned
            </span>
          )}
          {player.is_suspended && !player.is_banned && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eab308]/10 border border-[#eab308]/25 text-[#eab308] text-xs font-bold">
              <Clock size={11} /> Suspended until {formatDate(player.suspended_until ?? "")}
            </span>
          )}
          {player.trust_label && (
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              player.trust_label === "red" ? "bg-[#ef4444]/10 border border-[#ef4444]/25 text-[#ef4444]" : "bg-[#eab308]/10 border border-[#eab308]/25 text-[#eab308]"
            }`}>
              <Flag size={11} /> {player.trust_label === "red" ? "Red flag" : "Yellow flag"}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-[640px] mx-auto px-4 flex flex-col gap-6">

        {/* ── Info ─────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between h-8 mb-2 px-1">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa]">Info</h2>
            {editingDetails ? (
              <div className="flex items-center gap-3">
                <button onClick={() => setEditingDetails(false)} className="text-sm text-[#aaa] font-medium active:opacity-60 transition-opacity">Cancel</button>
                <button onClick={saveDetails} className="text-sm text-[#462ed1] font-medium active:opacity-70 transition-opacity">Save</button>
              </div>
            ) : (
              <button onClick={openDetailsEdit}
                className="w-8 h-8 flex items-center justify-center rounded-full text-[#79828b] hover:bg-white/5 hover:text-white transition-colors">
                <Pencil size={16} />
              </button>
            )}
          </div>
          <div className="bg-[#212121] rounded-xl overflow-hidden">
            <ContactRow
              editing={editingDetails}
              icon={<User size={15} className="text-[#462ed1]" />} iconBg="bg-[#462ed1]/15"
              label="First Name" displayValue={player.name} editValue={detailsDraft.name}
              onChange={v => setDetailsField("name", v)}
            />

            {/* Date of Birth — needs a calendar picker, not a plain-text row */}
            <div className="flex items-center gap-3 px-4 h-[56px] shrink-0 border-t border-white/[0.06]">
              <div className="w-8 h-8 rounded-full bg-[#462ed1]/15 flex items-center justify-center shrink-0">
                <Calendar size={15} className="text-[#462ed1]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-[#aaa] mb-0.5 h-[13px]">Date of Birth</div>
                <div className="flex items-center h-5">
                  {editingDetails ? (
                    <DatePickerField
                      value={detailsDraft.birthDate}
                      onChange={v => setDetailsField("birthDate", v)}
                      triggerClassName="flex items-center gap-1 text-white text-sm leading-5 focus:outline-none"
                    />
                  ) : player.birth_date ? (
                    <div className="text-sm text-white leading-5 truncate">
                      {formatDate(player.birth_date)}
                      <span className="text-[#79828b] ml-1.5">· {calcAge(player.birth_date)}</span>
                    </div>
                  ) : (
                    <div className="text-sm text-[#79828b] leading-5">—</div>
                  )}
                </div>
              </div>
            </div>

            <ContactRow
              editing={editingDetails}
              href={`tel:${(player.phone ?? "").replace(/\s/g, "")}`}
              icon={<Phone size={15} className="text-[#462ed1]" />} iconBg="bg-[#462ed1]/15"
              label="Phone" displayValue={player.phone ?? ""} editValue={detailsDraft.phone}
              onChange={v => setDetailsField("phone", v)}
            />
            <ContactRow
              editing={editingDetails}
              href={`mailto:${player.email ?? ""}`}
              icon={<Mail size={15} className="text-[#462ed1]" />} iconBg="bg-[#462ed1]/15"
              label="Email" displayValue={player.email ?? ""} editValue={detailsDraft.email}
              onChange={v => setDetailsField("email", v)}
            />
            <ContactRow
              editing={editingDetails}
              href={`https://t.me/${(player.telegram ?? "").replace("@", "")}`} external
              icon={<Send size={14} className="text-white -ml-0.5" />} iconBg="bg-[#462ed1]"
              label="Telegram" displayValue={player.telegram ?? ""} editValue={detailsDraft.telegram}
              onChange={v => setDetailsField("telegram", v)}
            />
            <ContactRow
              editing={editingDetails}
              href={`https://instagram.com/${(player.instagram ?? "").replace("@", "")}`} external
              icon={<Instagram size={14} className="text-white" />} iconBg="bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]"
              label="Instagram" displayValue={player.instagram ? `@${player.instagram.replace("@", "")}` : ""} editValue={detailsDraft.instagram}
              onChange={v => setDetailsField("instagram", v)}
            />
          </div>
        </section>

        {/* ── Notes ────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa]">Notes</h2>
            {addingNote ? (
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => { setAddingNote(false); setNoteDraft(""); }}
                  className="text-[11px] font-bold text-[#79828b] hover:text-white transition-colors">Cancel</button>
                <button type="button" onClick={addNote} disabled={!noteDraft.trim() || savingNote}
                  className="text-[11px] font-bold text-[#462ed1] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Save</button>
              </div>
            ) : (
              <button type="button" onClick={() => setAddingNote(true)}
                className="flex items-center gap-1 text-[11px] font-bold text-[#462ed1] hover:text-white transition-colors">
                <Plus size={11} /> Add Note
              </button>
            )}
          </div>
          {addingNote && (
            <div className="bg-[#212121] rounded-xl overflow-hidden p-3 flex flex-col gap-2 mb-2">
              <textarea ref={noteTextareaRef} value={noteDraft} onChange={e => setNoteDraft(e.target.value)}
                onKeyDown={handleNoteKeyDown} autoFocus
                onFocus={() => noteTextareaRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })}
                placeholder="Add a note about this player… (Enter to save, Shift+Enter for new line)" rows={2}
                enterKeyHint="send"
                className="w-full bg-[#212121] border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-[#79828b]/50 focus:outline-none focus:border-[#462ed1]/50 transition-colors resize-none" />
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => setNoteVisibility("admin")} title="Admins only"
                  className={`p-1.5 rounded-full border transition-colors ${noteVisibility === "admin" ? "bg-white/10 border-white/20 text-white" : "border-white/5 text-[#79828b] hover:text-white/70"}`}>
                  <Lock size={12} />
                </button>
                <button type="button" onClick={() => setNoteVisibility("all")} title="Visible to everyone"
                  className={`p-1.5 rounded-full border transition-colors ${noteVisibility === "all" ? "bg-white/10 border-white/20 text-white" : "border-white/5 text-[#79828b] hover:text-white/70"}`}>
                  <Globe size={12} />
                </button>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#79828b]">
                  {noteVisibility === "admin" ? "Admins only" : "Visible to everyone"}
                </span>
              </div>
            </div>
          )}

          {notes.length === 0 ? (
            <div className="mt-2 py-5 flex items-center justify-center bg-[#212121] rounded-xl">
              <span className="text-sm text-[#79828b]">No notes yet</span>
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {notes.map(n => (
                <div key={n.id} className="bg-[#212121] rounded-xl px-3 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    {n.is_legacy ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#79828b]">Legacy note</span>
                    ) : (
                      <>
                        {n.visibility === "admin" ? <Lock size={11} className="text-[#79828b] shrink-0" /> : <Globe size={11} className="text-[#79828b] shrink-0" />}
                        <span className="text-[11px] font-bold text-white/70">{n.author_name || "Admin"}</span>
                        <span className="text-[10px] text-[#79828b]">· {formatDateTime(n.created_at)}</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{n.body}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Admin Actions ─────────────────────────────────── */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa] mb-2 px-1">Admin</h2>
          <div className="bg-[#212121] rounded-xl overflow-hidden divide-y divide-white/[0.06]">

            {/* Skill Level */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                <span className={`text-[10px] font-black ${SKILL_COLOR[displaySkill] ?? "text-white"}`}>
                  {displaySkill.slice(0, 3).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">Skill Level</div>
                <div className="text-[11px] text-[#79828b]">Current: {displaySkill}</div>
              </div>
              <div className="shrink-0">
                <SelectField
                  value={displaySkill}
                  options={skillOptions}
                  onChange={openSkillPicker}
                  disabled={hierarchyLocked}
                  triggerClassName="w-24 h-8 flex items-center justify-between gap-1.5 bg-white/5 rounded-full pl-3 pr-2.5 text-white/70 text-[11px] font-black uppercase tracking-wider transition-colors hover:bg-white/10 hover:text-white focus:outline-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  panelClassName="absolute right-0 top-full mt-1.5 z-30"
                  panelWidthClassName="w-36"
                />
              </div>
            </div>
            {hierarchyLocked && (
              <p className="px-4 pb-3 -mt-2 text-[10px] text-[#79828b]">
                {isSelf ? "You can't change your own skill level, suspension or ban." : "Admins can't change another admin's skill level, suspension or ban."}
              </p>
            )}

            {/* Verification */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${player.is_verified ? "bg-[#3897f0]" : "bg-white/5"}`}>
                <BadgeCheck size={16} className={player.is_verified ? "text-white" : "text-[#79828b]"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">Identity Verified</div>
                <div className="text-[11px] text-[#79828b]">{player.is_verified ? "Badge visible to all users" : "Not verified"}</div>
              </div>
              {player.is_verified ? (
                <TapConfirmButton
                  label="Revoke" fillCls="bg-[#3897f0]" disabled={player.is_admin}
                  onConfirm={async () => { await patchProfile({ is_verified: false }); fireToast("Verification revoked"); }}
                />
              ) : (
                <TapConfirmButton
                  label="Verify" fillCls="bg-[#3897f0]"
                  onConfirm={async () => { await patchProfile({ is_verified: true }); fireToast("Player verified"); }}
                />
              )}
            </div>

            {/* Suspension */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${player.is_suspended ? "bg-[#eab308]/15" : "bg-white/5"}`}>
                <Clock size={16} className={player.is_suspended ? "text-[#eab308]" : "text-[#79828b]"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">Suspension</div>
                <div className="text-[11px] text-[#79828b]">{player.is_suspended ? `Until ${formatDate(player.suspended_until ?? "")}` : "Not suspended"}</div>
              </div>
              {player.is_suspended ? (
                <TapConfirmButton
                  label="Lift" fillCls="bg-[#4dcd5e]" armedTextCls="text-white" disabled={hierarchyLocked}
                  onConfirm={async () => { await patchProfile({ is_suspended: false, suspended_until: null, suspend_reason: null }); fireToast("Suspension lifted"); }}
                />
              ) : (
                <button onClick={() => setShowSuspendModal(true)} disabled={player.is_banned || hierarchyLocked}
                  className="w-24 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/70 text-[11px] font-black uppercase tracking-wider hover:bg-white/10 hover:text-white transition-colors focus:outline-none shrink-0 disabled:opacity-30 disabled:cursor-not-allowed">
                  Suspend
                </button>
              )}
            </div>

            {/* Ban */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${player.is_banned ? "bg-[#ef4444]/15" : "bg-white/5"}`}>
                <OctagonX size={16} className={player.is_banned ? "text-[#ef4444]" : "text-[#79828b]"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">Ban</div>
                <div className="text-[11px] text-[#79828b]">{player.is_banned ? "Permanently banned" : "Not banned"}</div>
              </div>
              {player.is_banned ? (
                <TapConfirmButton
                  label="Unban" fillCls="bg-[#4dcd5e]" armedTextCls="text-white" disabled={hierarchyLocked}
                  onConfirm={async () => { await patchProfile({ is_banned: false, ban_reason: null }); fireToast("Player unbanned"); }}
                />
              ) : (
                <button onClick={() => setShowBanConfirm(true)} disabled={hierarchyLocked}
                  className="w-24 h-8 flex items-center justify-center rounded-full bg-[#ef4444]/10 text-[#ef4444] text-[11px] font-black uppercase tracking-wider hover:bg-[#ef4444]/20 transition-colors focus:outline-none shrink-0 disabled:opacity-30 disabled:cursor-not-allowed">
                  Ban
                </button>
              )}
            </div>

            {/* Trust Label */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                player.trust_label === "red" ? "bg-[#ef4444]/15" : player.trust_label === "yellow" ? "bg-[#eab308]/15" : "bg-white/5"
              }`}>
                <Flag size={16} className={
                  player.trust_label === "red" ? "text-[#ef4444]" : player.trust_label === "yellow" ? "text-[#eab308]" : "text-[#79828b]"
                } />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">Trust Label</div>
                <div className="text-[11px] text-[#79828b]">Admin-only, shown as a dot on their avatar</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={async () => { const r = await patchProfile({ trust_label: null }); if (r.ok) fireToast("Trust label cleared"); }}
                  title="None"
                  className={`w-7 h-7 rounded-full border-2 bg-white/5 transition-colors ${!player.trust_label ? "border-white" : "border-white/10"}`} />
                <button onClick={async () => { const r = await patchProfile({ trust_label: "yellow" }); if (r.ok) fireToast("Yellow label set"); }}
                  title="Yellow — keep an eye on them"
                  className={`w-7 h-7 rounded-full border-2 bg-[#eab308] transition-colors ${player.trust_label === "yellow" ? "border-white" : "border-white/10"}`} />
                <button onClick={async () => { const r = await patchProfile({ trust_label: "red" }); if (r.ok) fireToast("Red label set"); }}
                  title="Red — excluded/problem player"
                  className={`w-7 h-7 rounded-full border-2 bg-[#ef4444] transition-colors ${player.trust_label === "red" ? "border-white" : "border-white/10"}`} />
              </div>
            </div>

          </div>
        </section>

        {/* ── Upcoming Events ───────────────────────────────── */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa] mb-2">Upcoming Events</h2>
          {upcomingEvents.length === 0 ? (
            <div className="bg-[#212121] rounded-xl py-6 flex items-center justify-center">
              <span className="text-sm text-[#aaa]">Nothing here yet</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingEvents.map(e => (
                <Link key={e.id} to={`/admin/events/${e.id}`} className="block bg-[#212121] rounded-xl px-4 py-3.5 hover:bg-[#1c2a36] transition-colors">
                  <span className="text-sm font-bold text-white uppercase tracking-wide block mb-1.5">{e.title}</span>
                  <div className="flex flex-wrap gap-3 text-xs text-[#aaa]">
                    <span className="flex items-center gap-1"><Calendar size={11} className="text-[#462ed1]" />{formatDate(e.event_date)}</span>
                    <span className="flex items-center gap-1"><MapPin size={11} className="text-[#462ed1]" />{e.location}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Past Events ───────────────────────────────────── */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa] mb-2">Past Events</h2>
          {pastEvents.length === 0 ? (
            <div className="bg-[#212121] rounded-xl py-6 flex items-center justify-center">
              <span className="text-sm text-[#aaa]">Nothing here yet</span>
            </div>
          ) : (
            <div className="bg-[#212121] rounded-xl overflow-hidden">
              {pastEvents.map((e, i) => (
                <Link key={e.id} to={`/admin/events/${e.id}`} className={`flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors ${i > 0 ? "border-t border-white/[0.06]" : ""}`}>
                  <span className="text-sm text-white/75 truncate">{e.title}</span>
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

function dotColor(skillLevel: string): string {
  const map: Record<string, string> = {
    PRIME: "#ccff00", Pro: "#462ed1", Advanced: "#a855f7",
    Intermediate: "#eab308", Beginner: "#f97316", Rookie: "#79828b",
  };
  return map[skillLevel] ?? "#462ed1";
}
