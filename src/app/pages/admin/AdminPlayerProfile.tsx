import { useState } from "react";
import { useParams } from "react-router";
import {
  Send, Instagram, Calendar, MapPin, ChevronRight,
  CheckCircle2, BadgeCheck, Ban, Clock, ShieldOff,
  OctagonX, Lock, Globe, MessageSquare, ChevronDown,
  Phone, Mail,
} from "lucide-react";
import { ALL_PLAYERS, ADMIN_EVENTS, SKILL_ORDER, type SkillLevel } from "../../data/adminData";
import { BackBar } from "../../components/ui/BackBar";
import { Toast } from "../../components/ui/Toast";

const POSITIONS = ["Outside Hitter", "Opposite Hitter", "Setter", "Middle Blocker", "Libero", "Right Side"];

const SKILL_COLOR: Record<string, string> = {
  PRIME:        "text-[#ccff00]",
  Pro:          "text-[#3390ec]",
  Advanced:     "text-[#a855f7]",
  Intermediate: "text-[#eab308]",
  Beginner:     "text-[#f97316]",
  Rookie:       "text-[#79828b]",
};

export function AdminPlayerProfile() {
  const { playerId } = useParams<{ playerId: string }>();
  const player = ALL_PLAYERS.find(p => p.id === playerId);

  // ── Admin state ───────────────────────────────────────────
  const [isVerified,        setIsVerified]        = useState(false);
  const [showVerifyConfirm, setShowVerifyConfirm] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  const [isSuspended,       setIsSuspended]       = useState(false);
  const [suspendedUntil,    setSuspendedUntil]    = useState("");
  const [showSuspendModal,  setShowSuspendModal]  = useState(false);
  const [showLiftConfirm,   setShowLiftConfirm]   = useState(false);
  const [suspendDate,       setSuspendDate]       = useState("");
  const [suspendReason,     setSuspendReason]     = useState("");

  const [isBanned,          setIsBanned]          = useState(false);
  const [showBanConfirm,    setShowBanConfirm]    = useState(false);
  const [showUnbanConfirm,  setShowUnbanConfirm]  = useState(false);
  const [banReason,         setBanReason]         = useState("");

  const [skillLevel,        setSkillLevel]        = useState<SkillLevel | "">((player?.skillLevel as SkillLevel) ?? "");
  const [showSkillConfirm,  setShowSkillConfirm]  = useState(false);
  const [pendingSkill,      setPendingSkill]      = useState<SkillLevel | "">("");

  const [position,          setPosition]          = useState(player?.position ?? "");
  const [showPosConfirm,    setShowPosConfirm]    = useState(false);
  const [pendingPos,        setPendingPos]        = useState("");

  const [comment,           setComment]           = useState("");
  const [commentDraft,      setCommentDraft]      = useState("");
  const [commentVisibility, setCommentVisibility] = useState<"admin" | "all">("admin");
  const [editingComment,    setEditingComment]    = useState(false);

  const [toast, setToast] = useState<{ message: string; variant: "success" | "copied" | "publish"; visible: boolean }>
    ({ message: "", variant: "success", visible: false });

  function fireToast(msg: string, variant: "success" | "copied" | "publish" = "success") {
    setToast({ message: msg, variant, visible: true });
  }

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

  const displaySkill = skillLevel || player.skillLevel;
  const displayPos   = position   || player.position;
  const ringColor    = dotColor(displaySkill);
  const today        = new Date().toISOString().split("T")[0];

  const upcomingEvents = ADMIN_EVENTS.filter(e => e.status === "upcoming" && e.roster.some(r => r.id === player.id));
  const pastEvents     = ADMIN_EVENTS.filter(e => e.status === "past"     && e.roster.some(r => r.id === player.id));

  function formatDate(d: string) {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  function confirmSuspend() {
    if (!suspendDate) return;
    setIsSuspended(true); setSuspendedUntil(suspendDate);
    setShowSuspendModal(false); setSuspendDate(""); setSuspendReason("");
    fireToast(`Suspended until ${formatDate(suspendDate)}`);
  }

  function confirmBan() {
    setIsBanned(true); setIsSuspended(false); setSuspendedUntil("");
    setShowBanConfirm(false); setBanReason("");
    fireToast("Player banned");
  }

  function confirmSkillChange() {
    if (!pendingSkill) return;
    setSkillLevel(pendingSkill); setShowSkillConfirm(false); setPendingSkill("");
    fireToast(`Skill level changed to ${pendingSkill}`);
  }

  function confirmPosChange() {
    if (!pendingPos) return;
    setPosition(pendingPos); setShowPosConfirm(false); setPendingPos("");
    fireToast(`Position changed to ${pendingPos}`);
  }

  function openSkillPicker(val: string) {
    if (!val || val === displaySkill) return;
    setPendingSkill(val as SkillLevel); setShowSkillConfirm(true);
  }

  function openPosPicker(val: string) {
    if (!val || val === displayPos) return;
    setPendingPos(val); setShowPosConfirm(true);
  }

  const hasContact = player.phone || player.email || player.telegram || player.instagram;

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
          onConfirm={() => { setIsVerified(true); setShowVerifyConfirm(false); fireToast("Player verified"); }} />
      )}
      {showRevokeConfirm && (
        <Modal icon={<ShieldOff size={18} className="text-[#ef4444]" />} iconBg="bg-[#ef4444]/10 border-[#ef4444]/20"
          title="Revoke Verification?" sub="The badge will be removed."
          body={<><span className="text-white font-bold">{player.name}</span> will lose their verified status.</>}
          cancelLabel="Cancel" onCancel={() => setShowRevokeConfirm(false)}
          confirmLabel="Revoke" confirmCls="bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444]"
          onConfirm={() => { setIsVerified(false); setShowRevokeConfirm(false); fireToast("Verification revoked"); }} />
      )}
      {showLiftConfirm && (
        <Modal icon={<CheckCircle2 size={18} className="text-[#4dcd5e]" />} iconBg="bg-[#4dcd5e]/10 border-[#4dcd5e]/20"
          title="Lift Suspension?" sub="Player can join events again." body={null}
          cancelLabel="Cancel" onCancel={() => setShowLiftConfirm(false)}
          confirmLabel="Lift" confirmCls="bg-[#4dcd5e]/10 border border-[#4dcd5e]/30 text-[#4dcd5e]"
          onConfirm={() => { setIsSuspended(false); setSuspendedUntil(""); setShowLiftConfirm(false); fireToast("Suspension lifted"); }} />
      )}
      {showUnbanConfirm && (
        <Modal icon={<CheckCircle2 size={18} className="text-[#4dcd5e]" />} iconBg="bg-[#4dcd5e]/10 border-[#4dcd5e]/20"
          title="Unban Player?" sub="Player will be able to join events again." body={null}
          cancelLabel="Cancel" onCancel={() => setShowUnbanConfirm(false)}
          confirmLabel="Unban" confirmCls="bg-[#4dcd5e]/10 border border-[#4dcd5e]/30 text-[#4dcd5e]"
          onConfirm={() => { setIsBanned(false); setShowUnbanConfirm(false); fireToast("Player unbanned"); }} />
      )}
      {showSkillConfirm && (
        <Modal icon={<ChevronDown size={18} className="text-[#a855f7]" />} iconBg="bg-[#a855f7]/10 border-[#a855f7]/20"
          title="Change Skill Level?" sub={`${displaySkill} → ${pendingSkill}`}
          body={<>This will move <span className="text-white font-bold">{player.name}</span> to the <span className="text-white font-bold">{pendingSkill}</span> group.</>}
          cancelLabel="Cancel" onCancel={() => { setShowSkillConfirm(false); setPendingSkill(""); }}
          confirmLabel="Confirm" confirmCls="bg-[#a855f7]/10 border border-[#a855f7]/30 text-[#a855f7]"
          onConfirm={confirmSkillChange} />
      )}
      {showPosConfirm && (
        <Modal icon={<ChevronDown size={18} className="text-[#3390ec]" />} iconBg="bg-[#3390ec]/10 border-[#3390ec]/20"
          title="Change Position?" sub={`${displayPos} → ${pendingPos}`}
          body={<><span className="text-white font-bold">{player.name}</span>'s position will be updated to <span className="text-white font-bold">{pendingPos}</span>.</>}
          cancelLabel="Cancel" onCancel={() => { setShowPosConfirm(false); setPendingPos(""); }}
          confirmLabel="Confirm" confirmCls="bg-[#3390ec] text-white"
          onConfirm={confirmPosChange} />
      )}

      {/* Suspend modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#17212b] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#eab308]/10 border border-[#eab308]/20 flex items-center justify-center shrink-0">
                <Clock size={18} className="text-[#eab308]" />
              </div>
              <div>
                <h3 className="font-black italic uppercase tracking-widest text-white text-base">Suspend Player</h3>
                <p className="text-[#79828b] text-xs">Can't join events until the date.</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 mb-5">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#79828b] block mb-1.5">Suspended until</label>
                <input type="date" min={today} value={suspendDate} onChange={e => setSuspendDate(e.target.value)}
                  className="w-full bg-[#222f3e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-[#eab308]/50 transition-colors [color-scheme:dark]" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#79828b] block mb-1.5">
                  Reason <span className="normal-case font-normal tracking-normal">(optional)</span>
                </label>
                <input type="text" value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="e.g. repeated no-show"
                  className="w-full bg-[#222f3e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-[#79828b]/50 focus:outline-none focus:border-[#eab308]/50 transition-colors" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowSuspendModal(false); setSuspendDate(""); setSuspendReason(""); }}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#79828b] font-bold text-sm hover:text-white transition-colors">Cancel</button>
              <button onClick={confirmSuspend} disabled={!suspendDate}
                className="flex-1 py-2.5 rounded-xl bg-[#eab308]/10 border border-[#eab308]/30 text-[#eab308] font-bold text-sm active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed">
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
                className="flex-1 py-2.5 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] font-bold text-sm active:scale-[0.98] transition-transform">
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
          <img src={player.avatar} alt={player.name}
            className="w-28 h-28 rounded-full object-cover bg-[#17212b]"
            style={{ boxShadow: `0 0 0 3px ${ringColor}` }} />
          {isVerified && (
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#3390ec] rounded-full flex items-center justify-center border-[3px] border-[#0e1621]">
              <CheckCircle2 size={14} className="text-white" strokeWidth={2.5} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-semibold text-white">{player.name}</h1>
          {isVerified && <BadgeCheck size={18} className="text-[#3390ec] shrink-0" />}
        </div>
        <span className={`text-sm font-medium mb-2 ${SKILL_COLOR[displaySkill] ?? "text-white"}`}>{displaySkill}</span>
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {isBanned && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ef4444]/10 border border-[#ef4444]/25 text-[#ef4444] text-xs font-bold">
              <OctagonX size={11} /> Banned
            </span>
          )}
          {isSuspended && !isBanned && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eab308]/10 border border-[#eab308]/25 text-[#eab308] text-xs font-bold">
              <Clock size={11} /> Suspended until {formatDate(suspendedUntil)}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-[600px] mx-auto px-4 flex flex-col gap-6">

        {/* ── Contact ───────────────────────────────────────── */}
        {hasContact && (
          <section>
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa] mb-2 px-1">Contact</h2>
            <div className="bg-[#17212b] rounded-xl overflow-hidden divide-y divide-white/[0.06]">

              {player.phone && (
                <a href={`tel:${player.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] active:bg-white/5 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#3390ec]/15 flex items-center justify-center shrink-0">
                    <Phone size={15} className="text-[#3390ec]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-[#aaa] mb-0.5">Phone</div>
                    <div className="text-sm text-white">{player.phone}</div>
                  </div>
                  <ChevronRight size={15} className="text-white/20 shrink-0" />
                </a>
              )}

              {player.email && (
                <a href={`mailto:${player.email}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] active:bg-white/5 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#3390ec]/15 flex items-center justify-center shrink-0">
                    <Mail size={15} className="text-[#3390ec]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-[#aaa] mb-0.5">Email</div>
                    <div className="text-sm text-white">{player.email}</div>
                  </div>
                  <ChevronRight size={15} className="text-white/20 shrink-0" />
                </a>
              )}

              {player.telegram && (
                <a href={`https://t.me/${player.telegram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] active:bg-white/5 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#3390ec] flex items-center justify-center shrink-0">
                    <Send size={14} className="text-white -ml-0.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-[#aaa] mb-0.5">Telegram</div>
                    <div className="text-sm text-white">{player.telegram}</div>
                  </div>
                  <ChevronRight size={15} className="text-white/20 shrink-0" />
                </a>
              )}

              {player.instagram && (
                <a href={`https://instagram.com/${player.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] active:bg-white/5 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center shrink-0">
                    <Instagram size={14} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-[#aaa] mb-0.5">Instagram</div>
                    <div className="text-sm text-white">@{player.instagram.replace("@", "")}</div>
                  </div>
                  <ChevronRight size={15} className="text-white/20 shrink-0" />
                </a>
              )}

            </div>
          </section>
        )}

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
                <select value={displaySkill} onChange={e => openSkillPicker(e.target.value)}
                  className="appearance-none bg-[#222f3e] border border-white/10 rounded-lg pl-3 pr-7 py-1.5 text-white text-[11px] font-black uppercase tracking-wider focus:outline-none focus:border-[#a855f7]/50 transition-colors [color-scheme:dark] cursor-pointer">
                  {[...SKILL_ORDER].reverse().map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#79828b] pointer-events-none" />
              </div>
            </div>

            {/* Position */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-black text-[#79828b]">POS</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">Position</div>
                <div className="text-[11px] text-[#79828b] truncate">{displayPos}</div>
              </div>
              <div className="relative shrink-0">
                <select value={displayPos} onChange={e => openPosPicker(e.target.value)}
                  className="appearance-none bg-[#222f3e] border border-white/10 rounded-lg pl-3 pr-7 py-1.5 text-white text-[11px] font-bold focus:outline-none focus:border-[#3390ec]/50 transition-colors [color-scheme:dark] cursor-pointer">
                  {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#79828b] pointer-events-none" />
              </div>
            </div>

            {/* Verification */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isVerified ? "bg-[#3390ec]" : "bg-white/5"}`}>
                <BadgeCheck size={16} className={isVerified ? "text-white" : "text-[#79828b]"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">Identity Verified</div>
                <div className="text-[11px] text-[#79828b]">{isVerified ? "Badge visible to all users" : "Not verified"}</div>
              </div>
              {isVerified ? (
                <button onClick={() => setShowRevokeConfirm(true)}
                  className="px-3 py-1.5 rounded-lg border border-[#ef4444]/30 text-[#ef4444] text-[11px] font-black uppercase tracking-wider hover:bg-[#ef4444]/5 transition-colors shrink-0">
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
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSuspended ? "bg-[#eab308]/15" : "bg-white/5"}`}>
                <Clock size={16} className={isSuspended ? "text-[#eab308]" : "text-[#79828b]"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">Suspension</div>
                <div className="text-[11px] text-[#79828b]">{isSuspended ? `Until ${formatDate(suspendedUntil)}` : "Not suspended"}</div>
              </div>
              {isSuspended ? (
                <button onClick={() => setShowLiftConfirm(true)}
                  className="px-3 py-1.5 rounded-lg border border-[#4dcd5e]/30 text-[#4dcd5e] text-[11px] font-black uppercase tracking-wider hover:bg-[#4dcd5e]/5 transition-colors shrink-0">
                  Lift
                </button>
              ) : (
                <button onClick={() => setShowSuspendModal(true)} disabled={isBanned}
                  className="px-3 py-1.5 rounded-lg border border-[#eab308]/30 text-[#eab308] text-[11px] font-black uppercase tracking-wider hover:bg-[#eab308]/5 transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed">
                  Suspend
                </button>
              )}
            </div>

            {/* Ban */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isBanned ? "bg-[#ef4444]/15" : "bg-white/5"}`}>
                <OctagonX size={16} className={isBanned ? "text-[#ef4444]" : "text-[#79828b]"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">Ban</div>
                <div className="text-[11px] text-[#79828b]">{isBanned ? "Permanently banned" : "Not banned"}</div>
              </div>
              {isBanned ? (
                <button onClick={() => setShowUnbanConfirm(true)}
                  className="px-3 py-1.5 rounded-lg border border-[#4dcd5e]/30 text-[#4dcd5e] text-[11px] font-black uppercase tracking-wider hover:bg-[#4dcd5e]/5 transition-colors shrink-0">
                  Unban
                </button>
              ) : (
                <button onClick={() => setShowBanConfirm(true)}
                  className="px-3 py-1.5 rounded-lg border border-[#ef4444]/30 text-[#ef4444] text-[11px] font-black uppercase tracking-wider hover:bg-[#ef4444]/5 transition-colors shrink-0">
                  Ban
                </button>
              )}
            </div>

          </div>
        </section>

        {/* ── Admin Note ────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa]">Admin Note</h2>
            {!editingComment && (
              <button onClick={() => { setCommentDraft(comment); setEditingComment(true); }}
                className="text-[11px] font-bold text-[#3390ec] hover:text-white transition-colors">
                {comment ? "Edit" : "Add"}
              </button>
            )}
          </div>
          <div className="bg-[#17212b] rounded-xl overflow-hidden">
            {editingComment ? (
              <div className="p-4 flex flex-col gap-3">
                <textarea value={commentDraft} onChange={e => setCommentDraft(e.target.value)}
                  placeholder="Add a note about this player…" rows={3}
                  className="w-full bg-[#222f3e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-[#79828b]/50 focus:outline-none focus:border-[#3390ec]/50 transition-colors resize-none" />
                <div className="flex gap-2">
                  <button onClick={() => setCommentVisibility("admin")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-wider transition-colors ${commentVisibility === "admin" ? "bg-white/10 border-white/20 text-white" : "border-white/5 text-[#79828b] hover:text-white/70"}`}>
                    <Lock size={11} /> Admins only
                  </button>
                  <button onClick={() => setCommentVisibility("all")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-wider transition-colors ${commentVisibility === "all" ? "bg-white/10 border-white/20 text-white" : "border-white/5 text-[#79828b] hover:text-white/70"}`}>
                    <Globe size={11} /> Everyone
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingComment(false)}
                    className="flex-1 py-2 rounded-xl border border-white/10 text-[#79828b] font-bold text-sm hover:text-white transition-colors">Cancel</button>
                  <button onClick={() => { setComment(commentDraft); setEditingComment(false); fireToast("Comment saved"); }}
                    className="flex-1 py-2 rounded-xl bg-[#3390ec] text-white font-bold text-sm active:scale-[0.98] transition-transform">Save</button>
                </div>
              </div>
            ) : comment ? (
              <div className="px-4 py-3.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <MessageSquare size={12} className="text-[#79828b]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#79828b]">
                    {commentVisibility === "admin" ? "Admin only" : "Visible to everyone"}
                  </span>
                  {commentVisibility === "admin" ? <Lock size={10} className="text-[#79828b]" /> : <Globe size={10} className="text-[#79828b]" />}
                </div>
                <p className="text-sm text-white/80 leading-relaxed">{comment}</p>
              </div>
            ) : (
              <div className="py-6 flex items-center justify-center">
                <span className="text-sm text-[#aaa]">No note yet</span>
              </div>
            )}
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
                <div key={e.id} className="bg-[#17212b] rounded-xl px-4 py-3.5">
                  <span className="text-sm font-bold text-white uppercase tracking-wide block mb-1.5">{e.title}</span>
                  <div className="flex flex-wrap gap-3 text-xs text-[#aaa]">
                    <span className="flex items-center gap-1"><Calendar size={11} className="text-[#3390ec]" />{e.date.replace("TODAY • ", "").replace("TOMORROW • ", "")}</span>
                    <span className="flex items-center gap-1"><MapPin size={11} className="text-[#3390ec]" />{e.location}</span>
                  </div>
                </div>
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
                <div key={e.id} className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? "border-t border-white/[0.06]" : ""}`}>
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
          <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-transform ${confirmCls}`}>{confirmLabel}</button>
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
