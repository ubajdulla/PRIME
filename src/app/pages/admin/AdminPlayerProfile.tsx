import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  Send, Instagram, Calendar, MapPin,
  CheckCircle2, BadgeCheck, Clock, ShieldOff,
  OctagonX, Lock, Globe, ChevronDown,
  Phone, Mail, User, Pencil,
} from "lucide-react";
import { SKILL_ORDER, type SkillLevel } from "../../data/adminData";
import { BackBar } from "../../components/ui/BackBar";
import { Toast } from "../../components/ui/Toast";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";

const SUPERADMIN_EMAIL = "ubajdulla@seznam.cz";

const SKILL_COLOR: Record<string, string> = {
  PRIME:        "text-[#ccff00]",
  Pro:          "text-[#3390ec]",
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
  admin_note: string | null;
  admin_note_visibility: "admin" | "all";
  is_admin: boolean;
};

type EventRow = { id: string; title: string; event_date: string; location: string; status: string };

export function AdminPlayerProfile() {
  const { playerId } = useParams<{ playerId: string }>();
  const { user: viewer, profile: viewerProfile } = useAuth();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [events,  setEvents]  = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Modal / draft state (UI-only, not backend state) ────────
  const [showVerifyConfirm, setShowVerifyConfirm] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  const [showSuspendModal,  setShowSuspendModal]  = useState(false);
  const [showLiftConfirm,   setShowLiftConfirm]   = useState(false);
  const [suspendDate,       setSuspendDate]       = useState("");
  const [suspendReason,     setSuspendReason]     = useState("");

  const [showBanConfirm,    setShowBanConfirm]    = useState(false);
  const [showUnbanConfirm,  setShowUnbanConfirm]  = useState(false);
  const [banReason,         setBanReason]         = useState("");

  const [showSkillConfirm,  setShowSkillConfirm]  = useState(false);
  const [pendingSkill,      setPendingSkill]      = useState<SkillLevel | "">("");

  const [editingInfo,       setEditingInfo]       = useState(false);
  const [infoDraft,         setInfoDraft]         = useState({ name: "", birthDate: "" });

  const [editingContact,   setEditingContact]   = useState(false);
  const [contactDraft,     setContactDraft]     = useState({ phone: "", email: "", telegram: "", instagram: "" });

  const [commentDraft,      setCommentDraft]      = useState("");
  const [commentVisibility, setCommentVisibility] = useState<"admin" | "all">("admin");
  const [editingComment,    setEditingComment]    = useState(false);

  const [toast, setToast] = useState<{ message: string; variant: "success" | "copied" | "publish" | "error"; visible: boolean }>
    ({ message: "", variant: "success", visible: false });

  function fireToast(msg: string, variant: "success" | "copied" | "publish" | "error" = "success") {
    setToast({ message: msg, variant, visible: true });
  }

  async function load(id: string) {
    const [{ data: p }, { data: partRows }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).single(),
      supabase.from("event_participants").select("events(id, title, event_date, location, status)").eq("player_id", id),
    ]);
    setProfile((p as ProfileRow) ?? null);
    setEvents(((partRows ?? []).map(r => r.events).filter(Boolean) as unknown as EventRow[]));
    setLoading(false);
  }

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    load(playerId);
  }, [playerId]);

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

  if (loading) return <div className="min-h-screen bg-[#0e1621]" />;

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
  const today        = new Date().toISOString().split("T")[0];

  const upcomingEvents = events.filter(e => e.status === "upcoming");
  const pastEvents     = events.filter(e => e.status === "past");

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

  function calcAge(birthDate: string): number | null {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  function openNoteEditor() {
    setCommentDraft(player.admin_note ?? "");
    setCommentVisibility(player.admin_note_visibility);
    setEditingComment(true);
  }

  async function saveNote() {
    const result = await patchProfile({ admin_note: commentDraft || null, admin_note_visibility: commentVisibility });
    if (result.ok) { setEditingComment(false); fireToast("Note saved"); }
    else { console.error("Failed to save admin note:", result.error); fireToast(result.error ?? "Failed to save note", "error"); }
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
    <div className="min-h-full bg-[#0e1621] pb-8 font-sans">
      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onHide={() => setToast(p => ({ ...p, visible: false }))} />

      {/* ── Modals ─────────────────────────────────────────── */}
      {showVerifyConfirm && (
        <Modal icon={<BadgeCheck size={18} className="text-[#3390ec]" />} iconBg="bg-[#3390ec]/10 border-[#3390ec]/20"
          title="Verify Player?" sub="A badge will appear on their profile."
          body={<><span className="text-white font-bold">{player.name}</span> will receive a verified badge visible to all users.</>}
          cancelLabel="Cancel" onCancel={() => setShowVerifyConfirm(false)}
          confirmLabel="Verify" confirmCls="bg-[#3390ec] text-white"
          onConfirm={async () => { await patchProfile({ is_verified: true }); setShowVerifyConfirm(false); fireToast("Player verified"); }} />
      )}
      {showRevokeConfirm && (
        <Modal icon={<ShieldOff size={18} className="text-[#ef4444]" />} iconBg="bg-[#ef4444]/10 border-[#ef4444]/20"
          title="Revoke Verification?" sub="The badge will be removed."
          body={<><span className="text-white font-bold">{player.name}</span> will lose their verified status.</>}
          cancelLabel="Cancel" onCancel={() => setShowRevokeConfirm(false)}
          confirmLabel="Revoke" confirmCls="bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444]"
          onConfirm={async () => { await patchProfile({ is_verified: false }); setShowRevokeConfirm(false); fireToast("Verification revoked"); }} />
      )}
      {showLiftConfirm && (
        <Modal icon={<CheckCircle2 size={18} className="text-[#4dcd5e]" />} iconBg="bg-[#4dcd5e]/10 border-[#4dcd5e]/20"
          title="Lift Suspension?" sub="Player can join events again." body={null}
          cancelLabel="Cancel" onCancel={() => setShowLiftConfirm(false)}
          confirmLabel="Lift" confirmCls="bg-[#4dcd5e]/10 border border-[#4dcd5e]/30 text-[#4dcd5e]"
          onConfirm={async () => { await patchProfile({ is_suspended: false, suspended_until: null, suspend_reason: null }); setShowLiftConfirm(false); fireToast("Suspension lifted"); }} />
      )}
      {showUnbanConfirm && (
        <Modal icon={<CheckCircle2 size={18} className="text-[#4dcd5e]" />} iconBg="bg-[#4dcd5e]/10 border-[#4dcd5e]/20"
          title="Unban Player?" sub="Player will be able to join events again." body={null}
          cancelLabel="Cancel" onCancel={() => setShowUnbanConfirm(false)}
          confirmLabel="Unban" confirmCls="bg-[#4dcd5e]/10 border border-[#4dcd5e]/30 text-[#4dcd5e]"
          onConfirm={async () => { await patchProfile({ is_banned: false, ban_reason: null }); setShowUnbanConfirm(false); fireToast("Player unbanned"); }} />
      )}
      {showSkillConfirm && (
        <Modal icon={<ChevronDown size={18} className="text-[#a855f7]" />} iconBg="bg-[#a855f7]/10 border-[#a855f7]/20"
          title="Change Skill Level?" sub={`${displaySkill} → ${pendingSkill}`}
          body={<>This will move <span className="text-white font-bold">{player.name}</span> to the <span className="text-white font-bold">{pendingSkill}</span> group.</>}
          cancelLabel="Cancel" onCancel={() => { setShowSkillConfirm(false); setPendingSkill(""); }}
          confirmLabel="Confirm" confirmCls="bg-[#a855f7]/10 border border-[#a855f7]/30 text-[#a855f7]"
          onConfirm={confirmSkillChange} />
      )}
      {/* Suspend modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#17212b] border border-white/10 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-[#eab308]/10 border border-[#eab308]/20 flex items-center justify-center shrink-0">
                <Clock size={15} className="text-[#eab308]" />
              </div>
              <div>
                <h3 className="font-black italic uppercase tracking-widest text-white text-sm">Suspend Player</h3>
                <p className="text-[#79828b] text-[11px]">Can't join events until the date.</p>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 mb-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#79828b] block mb-1">Suspended until</label>
                <input type="date" min={today} value={suspendDate} onChange={e => setSuspendDate(e.target.value)}
                  style={{ colorScheme: "dark" }}
                  className="w-full h-10 bg-[#222f3e] border border-white/10 rounded-xl px-3 text-white text-sm font-bold focus:outline-none focus:border-[#eab308]/50 transition-colors appearance-none" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#79828b] block mb-1">
                  Reason <span className="normal-case font-normal tracking-normal">(optional)</span>
                </label>
                <input type="text" value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="e.g. repeated no-show"
                  className="w-full bg-[#222f3e] border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-[#79828b]/50 focus:outline-none focus:border-[#eab308]/50 transition-colors" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowSuspendModal(false); setSuspendDate(""); setSuspendReason(""); }}
                className="flex-1 py-2 rounded-xl border border-white/10 text-[#79828b] font-bold text-sm hover:text-white transition-colors">Cancel</button>
              <button onClick={confirmSuspend} disabled={!suspendDate}
                className="flex-1 py-2 rounded-xl bg-[#eab308]/10 border border-[#eab308]/30 text-[#eab308] font-bold text-sm transition-transform disabled:opacity-40 disabled:cursor-not-allowed">
                Suspend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban modal */}
      {showBanConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#17212b] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center shrink-0">
                <OctagonX size={18} className="text-[#ef4444]" />
              </div>
              <div>
                <h3 className="font-black italic uppercase tracking-widest text-white text-base">Ban Player?</h3>
                <p className="text-[#79828b] text-xs">Permanent — cannot join any events.</p>
              </div>
            </div>
            <div className="mb-5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#79828b] block mb-1.5">
                Reason <span className="normal-case font-normal tracking-normal">(optional)</span>
              </label>
              <input type="text" value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="e.g. harassment"
                className="w-full bg-[#222f3e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-[#79828b]/50 focus:outline-none focus:border-[#ef4444]/50 transition-colors" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowBanConfirm(false); setBanReason(""); }}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#79828b] font-bold text-sm hover:text-white transition-colors">Cancel</button>
              <button onClick={confirmBan}
                className="flex-1 py-2.5 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] font-bold text-sm transition-transform">
                Ban
              </button>
            </div>
          </div>
        </div>
      )}

      <BackBar label="Back" />

      {/* ── Avatar + identity ─────────────────────────────── */}
      <div className="flex flex-col items-center pt-8 pb-6 px-4">
        <div className="relative mb-4">
          {player.avatar ? (
            <img src={player.avatar} alt={player.name}
              className="w-28 h-28 rounded-full object-cover bg-[#17212b]"
              style={{ boxShadow: `0 0 0 3px ${ringColor}` }} />
          ) : (
            <div className="w-28 h-28 rounded-full bg-[#17212b] flex items-center justify-center"
              style={{ boxShadow: `0 0 0 3px ${ringColor}` }}>
              <User size={36} className="text-white/20" />
            </div>
          )}
          {player.is_verified && (
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#3390ec] rounded-full flex items-center justify-center border-[3px] border-[#0e1621]">
              <CheckCircle2 size={14} className="text-white" strokeWidth={2.5} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-semibold text-white">{player.name}</h1>
          {player.is_verified && <BadgeCheck size={18} className="text-[#3390ec] shrink-0" />}
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
        </div>
      </div>

      <div className="max-w-[600px] mx-auto px-4 flex flex-col gap-6">

        {/* ── Info ─────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa]">Info</h2>
            {editingInfo ? (
              <div className="flex items-center gap-3">
                <button onClick={() => setEditingInfo(false)} className="text-[11px] font-bold text-[#79828b] hover:text-white transition-colors">Cancel</button>
                <button onClick={async () => {
                  const patch: Partial<ProfileRow> = { birth_date: infoDraft.birthDate || null };
                  if (infoDraft.name.trim()) patch.name = infoDraft.name.trim();
                  await patchProfile(patch);
                  setEditingInfo(false); fireToast("Info updated");
                }}
                  className="text-[11px] font-bold text-[#3390ec] hover:text-white transition-colors">Save</button>
              </div>
            ) : (
              <button onClick={() => { setInfoDraft({ name: player.name, birthDate: player.birth_date ?? "" }); setEditingInfo(true); }}
                className="flex items-center gap-1 text-[11px] font-bold text-[#3390ec] hover:text-white transition-colors">
                <Pencil size={11} /> Edit
              </button>
            )}
          </div>
          <div className="bg-[#17212b] rounded-xl overflow-hidden divide-y divide-white/[0.06]">
            {/* First Name row */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-[#3390ec]/15 flex items-center justify-center shrink-0">
                <User size={15} className="text-[#3390ec]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-[#aaa] mb-0.5">First Name</div>
                {editingInfo ? (
                  <input type="text" value={infoDraft.name} onChange={e => setInfoDraft(d => ({ ...d, name: e.target.value }))}
                    className="w-full bg-transparent border-0 border-b border-white/15 text-white text-sm pb-0.5 focus:outline-none focus:border-[#3390ec]/60 transition-colors" />
                ) : (
                  <div className="text-sm text-white">{player.name}</div>
                )}
              </div>
            </div>
            {/* Date of Birth row */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-[#3390ec]/15 flex items-center justify-center shrink-0">
                <Calendar size={15} className="text-[#3390ec]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-[#aaa] mb-0.5">Date of Birth</div>
                {editingInfo ? (
                  <input type="date" value={infoDraft.birthDate} onChange={e => setInfoDraft(d => ({ ...d, birthDate: e.target.value }))}
                    style={{ colorScheme: "dark" }}
                    className="w-full bg-transparent border-0 border-b border-white/15 text-white text-sm pb-0.5 focus:outline-none focus:border-[#3390ec]/60 transition-colors appearance-none" />
                ) : player.birth_date ? (
                  <div className="text-sm text-white">
                    {formatDate(player.birth_date)}
                    <span className="text-[#79828b] ml-1.5">· {calcAge(player.birth_date)}</span>
                  </div>
                ) : (
                  <div className="text-sm text-[#79828b]">—</div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Contact ───────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa]">Contact</h2>
            {editingContact ? (
              <div className="flex items-center gap-3">
                <button onClick={() => setEditingContact(false)} className="text-[11px] font-bold text-[#79828b] hover:text-white transition-colors">Cancel</button>
                <button onClick={async () => {
                  await patchProfile({
                    phone: contactDraft.phone || null,
                    email: contactDraft.email || null,
                    telegram: contactDraft.telegram || null,
                    instagram: contactDraft.instagram || null,
                  });
                  setEditingContact(false); fireToast("Contact updated");
                }}
                  className="text-[11px] font-bold text-[#3390ec] hover:text-white transition-colors">Save</button>
              </div>
            ) : (
              <button onClick={() => { setContactDraft({ phone: player.phone ?? "", email: player.email ?? "", telegram: player.telegram ?? "", instagram: player.instagram ?? "" }); setEditingContact(true); }}
                className="flex items-center gap-1 text-[11px] font-bold text-[#3390ec] hover:text-white transition-colors">
                <Pencil size={11} /> Edit
              </button>
            )}
          </div>
          <div className="bg-[#17212b] rounded-xl overflow-hidden divide-y divide-white/[0.06]">

            {/* Phone */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-[#3390ec]/15 flex items-center justify-center shrink-0">
                <Phone size={15} className="text-[#3390ec]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-[#aaa] mb-0.5">Phone</div>
                {editingContact ? (
                  <input type="tel" value={contactDraft.phone} onChange={e => setContactDraft(d => ({ ...d, phone: e.target.value }))}
                    className="w-full bg-transparent border-0 border-b border-white/15 text-white text-sm pb-0.5 focus:outline-none focus:border-[#3390ec]/60 transition-colors" />
                ) : player.phone ? (
                  <a href={`tel:${player.phone.replace(/\s/g, "")}`} className="text-sm text-white">{player.phone}</a>
                ) : <div className="text-sm text-[#79828b]">—</div>}
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-[#3390ec]/15 flex items-center justify-center shrink-0">
                <Mail size={15} className="text-[#3390ec]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-[#aaa] mb-0.5">Email</div>
                {editingContact ? (
                  <input type="email" value={contactDraft.email} onChange={e => setContactDraft(d => ({ ...d, email: e.target.value }))}
                    className="w-full bg-transparent border-0 border-b border-white/15 text-white text-sm pb-0.5 focus:outline-none focus:border-[#3390ec]/60 transition-colors" />
                ) : player.email ? (
                  <a href={`mailto:${player.email}`} className="text-sm text-white">{player.email}</a>
                ) : <div className="text-sm text-[#79828b]">—</div>}
              </div>
            </div>

            {/* Telegram */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-[#3390ec] flex items-center justify-center shrink-0">
                <Send size={14} className="text-white -ml-0.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-[#aaa] mb-0.5">Telegram</div>
                {editingContact ? (
                  <input type="text" value={contactDraft.telegram} onChange={e => setContactDraft(d => ({ ...d, telegram: e.target.value }))}
                    placeholder="@username"
                    className="w-full bg-transparent border-0 border-b border-white/15 text-white text-sm pb-0.5 placeholder:text-[#79828b]/50 focus:outline-none focus:border-[#3390ec]/60 transition-colors" />
                ) : player.telegram ? (
                  <a href={`https://t.me/${player.telegram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-sm text-white">{player.telegram}</a>
                ) : <span className="text-sm text-[#79828b]">—</span>}
              </div>
            </div>

            {/* Instagram */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center shrink-0">
                <Instagram size={14} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-[#aaa] mb-0.5">Instagram</div>
                {editingContact ? (
                  <input type="text" value={contactDraft.instagram} onChange={e => setContactDraft(d => ({ ...d, instagram: e.target.value }))}
                    placeholder="@username"
                    className="w-full bg-transparent border-0 border-b border-white/15 text-white text-sm pb-0.5 placeholder:text-[#79828b]/50 focus:outline-none focus:border-[#3390ec]/60 transition-colors" />
                ) : player.instagram ? (
                  <a href={`https://instagram.com/${player.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-sm text-white">@{player.instagram.replace("@", "")}</a>
                ) : <span className="text-sm text-[#79828b]">—</span>}
              </div>
            </div>

          </div>
        </section>

        {/* ── Admin Note ────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa]">Admin Note</h2>
            {editingComment ? (
              <div className="flex items-center gap-3">
                <button onClick={() => setEditingComment(false)} className="text-[11px] font-bold text-[#79828b] hover:text-white transition-colors">Cancel</button>
                <button onClick={saveNote} className="text-[11px] font-bold text-[#3390ec] hover:text-white transition-colors">Save</button>
              </div>
            ) : (
              <button onClick={openNoteEditor} className="flex items-center gap-1 text-[11px] font-bold text-[#3390ec] hover:text-white transition-colors">
                <Pencil size={11} /> {player.admin_note ? "Edit" : "Add Note"}
              </button>
            )}
          </div>
          <div className="bg-[#17212b] rounded-xl overflow-hidden">
            {editingComment ? (
              <div className="p-3 flex flex-col gap-2">
                <textarea value={commentDraft} onChange={e => setCommentDraft(e.target.value)} autoFocus
                  placeholder="Add a note about this player…" rows={3}
                  className="w-full bg-[#222f3e] border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-[#79828b]/50 focus:outline-none focus:border-[#3390ec]/50 transition-colors resize-none" />
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setCommentVisibility("admin")} title="Admins only"
                    className={`p-1.5 rounded-lg border transition-colors ${commentVisibility === "admin" ? "bg-white/10 border-white/20 text-white" : "border-white/5 text-[#79828b] hover:text-white/70"}`}>
                    <Lock size={12} />
                  </button>
                  <button onClick={() => setCommentVisibility("all")} title="Visible to everyone"
                    className={`p-1.5 rounded-lg border transition-colors ${commentVisibility === "all" ? "bg-white/10 border-white/20 text-white" : "border-white/5 text-[#79828b] hover:text-white/70"}`}>
                    <Globe size={12} />
                  </button>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#79828b]">
                    {commentVisibility === "admin" ? "Admins only" : "Visible to everyone"}
                  </span>
                </div>
              </div>
            ) : player.admin_note ? (
              <div className="px-3 py-3 flex items-center gap-2">
                {player.admin_note_visibility === "admin" ? <Lock size={11} className="text-[#79828b] shrink-0" /> : <Globe size={11} className="text-[#79828b] shrink-0" />}
                <p className="text-sm text-white/80 leading-relaxed">{player.admin_note}</p>
              </div>
            ) : (
              <div className="py-5 flex items-center justify-center">
                <span className="text-sm text-[#79828b]">No note yet</span>
              </div>
            )}
          </div>
        </section>

        {/* ── Admin Actions ─────────────────────────────────── */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa] mb-2 px-1">Admin</h2>
          <div className="bg-[#17212b] rounded-xl overflow-hidden divide-y divide-white/[0.06]">

            {/* Skill Level */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                <span className={`text-[10px] font-black ${SKILL_COLOR[displaySkill] ?? "text-white"}`}>
                  {displaySkill.slice(0, 3).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">Skill Level</div>
                <div className="text-[11px] text-[#79828b]">Current: {displaySkill}</div>
              </div>
              <div className="relative shrink-0">
                <select value={displaySkill} onChange={e => openSkillPicker(e.target.value)} disabled={hierarchyLocked}
                  className="appearance-none bg-[#222f3e] border border-white/10 rounded-lg pl-3 pr-7 py-1.5 text-white text-[11px] font-black uppercase tracking-wider focus:outline-none focus:border-[#a855f7]/50 transition-colors [color-scheme:dark] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                  {skillOptions.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#79828b] pointer-events-none" />
              </div>
            </div>
            {hierarchyLocked && (
              <p className="px-4 pb-3 -mt-2 text-[10px] text-[#79828b]">
                {isSelf ? "You can't change your own skill level, suspension or ban." : "Admins can't change another admin's skill level, suspension or ban."}
              </p>
            )}

            {/* Verification */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${player.is_verified ? "bg-[#3390ec]" : "bg-white/5"}`}>
                <BadgeCheck size={16} className={player.is_verified ? "text-white" : "text-[#79828b]"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">Identity Verified</div>
                <div className="text-[11px] text-[#79828b]">{player.is_verified ? "Badge visible to all users" : "Not verified"}</div>
              </div>
              {player.is_verified ? (
                <button onClick={() => setShowRevokeConfirm(true)} disabled={player.is_admin}
                  className="px-3 py-1.5 rounded-lg border border-[#ef4444]/30 text-[#ef4444] text-[11px] font-black uppercase tracking-wider hover:bg-[#ef4444]/5 transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed">
                  Revoke
                </button>
              ) : (
                <button onClick={() => setShowVerifyConfirm(true)}
                  className="px-3 py-1.5 rounded-lg border border-[#3390ec]/30 text-[#3390ec] text-[11px] font-black uppercase tracking-wider hover:bg-[#3390ec]/5 transition-colors shrink-0">
                  Verify
                </button>
              )}
            </div>

            {/* Suspension */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${player.is_suspended ? "bg-[#eab308]/15" : "bg-white/5"}`}>
                <Clock size={16} className={player.is_suspended ? "text-[#eab308]" : "text-[#79828b]"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">Suspension</div>
                <div className="text-[11px] text-[#79828b]">{player.is_suspended ? `Until ${formatDate(player.suspended_until ?? "")}` : "Not suspended"}</div>
              </div>
              {player.is_suspended ? (
                <button onClick={() => setShowLiftConfirm(true)} disabled={hierarchyLocked}
                  className="px-3 py-1.5 rounded-lg border border-[#4dcd5e]/30 text-[#4dcd5e] text-[11px] font-black uppercase tracking-wider hover:bg-[#4dcd5e]/5 transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed">
                  Lift
                </button>
              ) : (
                <button onClick={() => setShowSuspendModal(true)} disabled={player.is_banned || hierarchyLocked}
                  className="px-3 py-1.5 rounded-lg border border-[#eab308]/30 text-[#eab308] text-[11px] font-black uppercase tracking-wider hover:bg-[#eab308]/5 transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed">
                  Suspend
                </button>
              )}
            </div>

            {/* Ban */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${player.is_banned ? "bg-[#ef4444]/15" : "bg-white/5"}`}>
                <OctagonX size={16} className={player.is_banned ? "text-[#ef4444]" : "text-[#79828b]"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">Ban</div>
                <div className="text-[11px] text-[#79828b]">{player.is_banned ? "Permanently banned" : "Not banned"}</div>
              </div>
              {player.is_banned ? (
                <button onClick={() => setShowUnbanConfirm(true)} disabled={hierarchyLocked}
                  className="px-3 py-1.5 rounded-lg border border-[#4dcd5e]/30 text-[#4dcd5e] text-[11px] font-black uppercase tracking-wider hover:bg-[#4dcd5e]/5 transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed">
                  Unban
                </button>
              ) : (
                <button onClick={() => setShowBanConfirm(true)} disabled={hierarchyLocked}
                  className="px-3 py-1.5 rounded-lg border border-[#ef4444]/30 text-[#ef4444] text-[11px] font-black uppercase tracking-wider hover:bg-[#ef4444]/5 transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed">
                  Ban
                </button>
              )}
            </div>

          </div>
        </section>

        {/* ── Upcoming Events ───────────────────────────────── */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa] mb-2">Upcoming Events</h2>
          {upcomingEvents.length === 0 ? (
            <div className="bg-[#17212b] rounded-xl py-6 flex items-center justify-center">
              <span className="text-sm text-[#aaa]">Nothing here yet</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingEvents.map(e => (
                <Link key={e.id} to={`/admin/events/${e.id}`} className="block bg-[#17212b] rounded-xl px-4 py-3.5 hover:bg-[#1c2a36] transition-colors">
                  <span className="text-sm font-bold text-white uppercase tracking-wide block mb-1.5">{e.title}</span>
                  <div className="flex flex-wrap gap-3 text-xs text-[#aaa]">
                    <span className="flex items-center gap-1"><Calendar size={11} className="text-[#3390ec]" />{formatDate(e.event_date)}</span>
                    <span className="flex items-center gap-1"><MapPin size={11} className="text-[#3390ec]" />{e.location}</span>
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
            <div className="bg-[#17212b] rounded-xl py-6 flex items-center justify-center">
              <span className="text-sm text-[#aaa]">Nothing here yet</span>
            </div>
          ) : (
            <div className="bg-[#17212b] rounded-xl overflow-hidden">
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

function Modal({ icon, iconBg, title, sub, body, cancelLabel, onCancel, confirmLabel, confirmCls, onConfirm }: {
  icon: React.ReactNode; iconBg: string; title: string; sub: string; body: React.ReactNode;
  cancelLabel: string; onCancel: () => void; confirmLabel: string; confirmCls: string; onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#17212b] border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
          <div>
            <h3 className="font-black italic uppercase tracking-widest text-white text-base">{title}</h3>
            <p className="text-[#79828b] text-xs">{sub}</p>
          </div>
        </div>
        {body && <p className="text-[#79828b] text-sm mb-5">{body}</p>}
        <div className={`flex gap-3 ${!body ? "mt-4" : ""}`}>
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#79828b] font-bold text-sm hover:text-white transition-colors">{cancelLabel}</button>
          <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-transform ${confirmCls}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function dotColor(skillLevel: string): string {
  const map: Record<string, string> = {
    PRIME: "#ccff00", Pro: "#3390ec", Advanced: "#a855f7",
    Intermediate: "#eab308", Beginner: "#f97316", Rookie: "#79828b",
  };
  return map[skillLevel] ?? "#3390ec";
}
