import { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router";
import { useLang } from "../i18n";
import {
  Phone, Mail, Instagram, Send, MapPin, Calendar, Clock,
  Pencil, Camera, LogOut, User, Eye, EyeOff,
} from "lucide-react";

type SkillLevel = "Beginner" | "Intermediate" | "Advanced" | "Pro" | "Elite";

const SKILL_COLOR: Record<SkillLevel, string> = {
  Beginner:     "text-[#3390ec]",
  Intermediate: "text-[#4dcd5e]",
  Advanced:     "text-[#f5c542]",
  Pro:          "text-[#f97316]",
  Elite:        "text-[#e04040]",
};

const POSITIONS = ["Outside Hitter", "Opposite Hitter", "Setter", "Middle Blocker", "Libero"];

const DEFAULT_USER = {
  firstName:     "Alex",
  lastName:      "Novak",
  avatar:        "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=300&h=300&fit=crop&crop=face",
  skillLevel:    "Intermediate" as SkillLevel,
  position:      "Outside Hitter",
  phone:         "+420 777 888 999",
  email:         "alex.novak@email.com",
  telegram:      "alex_vb",
  instagram:     "alex.volleyball",
  showTelegram:  true,
  showInstagram: true,
};

const UPCOMING_EVENTS = [
  { id: "e1", title: "FRIDAY PICKUP",       date: "FRI, MAY 2",  time: "19:00 – 21:00", location: "SportCenter Praha 7",     pending: false },
  { id: "e2", title: "ELITE SCRIMMAGE #48", date: "SAT, MAY 10", time: "14:00 – 17:00", location: "Volleyball Arena Dejvice", pending: true  },
];

const PAST_EVENTS = [
  { id: "h1", title: "PRO-AM INVITATIONAL",  date: "APR 19" },
  { id: "h2", title: "FRIDAY PICKUP",         date: "APR 11" },
  { id: "h3", title: "ELITE SCRIMMAGE #45",   date: "APR 6"  },
  { id: "h4", title: "PRIME OPEN #12",        date: "MAR 29" },
  { id: "h5", title: "FRIDAY PICKUP",         date: "MAR 22" },
];

type ContactDraft = {
  fullName: string;
  phone: string;
  email: string;
  telegram: string;
  instagram: string;
};

export function Profile() {
  const navigate = useNavigate();
  const { t } = useLang();

  if (localStorage.getItem("prime_logged_in") === "false") {
    return <Navigate to="/signin" replace />;
  }
  const [user, setUser] = useState(DEFAULT_USER);
  const [editingContact, setEditingContact] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [draft, setDraft] = useState<ContactDraft>({
    fullName: `${DEFAULT_USER.firstName} ${DEFAULT_USER.lastName}`,
    phone:    DEFAULT_USER.phone,
    email:    DEFAULT_USER.email,
    telegram: DEFAULT_USER.telegram,
    instagram: DEFAULT_USER.instagram,
  });

  const openContactEdit = () => {
    setDraft({
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      phone:    user.phone,
      email:    user.email,
      telegram: user.telegram,
      instagram: user.instagram,
    });
    setEditingContact(true);
  };

  const cancelContactEdit = () => setEditingContact(false);

  const saveContact = () => {
    const parts = draft.fullName.trim().split(/\s+/);
    setUser(p => ({
      ...p,
      firstName: parts[0] ?? "",
      lastName:  parts.slice(1).join(" "),
      phone:     draft.phone,
      email:     draft.email,
      telegram:  draft.telegram,
      instagram: draft.instagram,
    }));
    setEditingContact(false);
  };

  const setDraftField = (k: keyof ContactDraft, v: string) =>
    setDraft(p => ({ ...p, [k]: v }));

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setUser(p => ({ ...p, avatar: URL.createObjectURL(f) }));
  };

  const displayName = `${user.firstName} ${user.lastName}`.trim();

  return (
    <div className="min-h-full bg-[#0e1621] pb-4 font-sans">

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)}>
          <div className="w-full max-w-sm bg-[#17212b] border border-white/10 rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-black italic uppercase tracking-widest text-white text-lg mb-1">{t.profile.logOutTitle}</h3>
            <p className="text-[#79828b] text-sm mb-6">{t.profile.logOutDesc}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#79828b] font-bold text-sm hover:text-white transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={() => { localStorage.setItem("prime_logged_in", "false"); navigate("/signin"); }}
                className="flex-1 py-2.5 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] font-bold text-sm active:scale-[0.98] transition-transform"
              >
                {t.profile.logOut}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Profile identity ── */}
      <div className="flex flex-col items-center pt-8 pb-6 px-4">

        {/* Avatar — always tappable */}
        <label className="relative cursor-pointer mb-4">
          <img
            src={user.avatar}
            alt=""
            className="w-28 h-28 rounded-full object-cover bg-[#17212b]"
          />
          <span className="absolute bottom-0.5 right-0.5 w-7 h-7 rounded-full bg-[#3390ec] border-2 border-[#0e1621] flex items-center justify-center pointer-events-none">
            <Camera size={13} className="text-white" />
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
        </label>

        {/* Name — display only, updates when contact is saved */}
        <h1 className="text-xl font-semibold text-white mb-1">{displayName}</h1>
        <span className={`text-sm font-medium ${SKILL_COLOR[user.skillLevel]}`}>
          {user.skillLevel}
        </span>
      </div>

      <div className="max-w-[600px] mx-auto px-4 flex flex-col gap-6">

        {/* Position — always-editable dropdown, no edit button needed */}
        <div className="bg-[#17212b] rounded-xl">
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-[#aaa]">{t.profile.position}</span>
            <select
              value={user.position}
              onChange={e => setUser(p => ({ ...p, position: e.target.value }))}
              className="bg-transparent text-white text-sm focus:outline-none text-right"
              style={{ colorScheme: "dark" }}
            >
              {POSITIONS.map(p => (
                <option key={p} value={p} style={{ background: "#17212b" }}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Contact — edit button lives here */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <SectionLabel>{t.profile.contact}</SectionLabel>
            {editingContact ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={cancelContactEdit}
                  className="text-sm text-[#aaa] font-medium active:opacity-60 transition-opacity"
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={saveContact}
                  className="text-sm text-[#3390ec] font-medium active:opacity-70 transition-opacity"
                >
                  {t.common.save}
                </button>
              </div>
            ) : (
              <button
                onClick={openContactEdit}
                className="flex items-center gap-1 text-sm text-[#3390ec] font-medium active:opacity-70 transition-opacity"
              >
                <Pencil size={13} />
                {t.common.edit}
              </button>
            )}
          </div>

          <div className="bg-[#17212b] rounded-xl overflow-hidden">

            {/* Name row */}
            <ContactRow
              editing={editingContact}
              icon={<User size={15} className="text-[#3390ec]" />}
              iconBg="bg-[#3390ec]/15"
              label={t.profile.name}
              displayValue={displayName}
              editValue={draft.fullName}
              onChange={v => setDraftField("fullName", v)}
            />

            <ContactRow
              editing={editingContact}
              href={`tel:${user.phone.replace(/\s/g, "")}`}
              icon={<Phone size={15} className="text-[#3390ec]" />}
              iconBg="bg-[#3390ec]/15"
              label={t.profile.phone}
              displayValue={user.phone}
              editValue={draft.phone}
              onChange={v => setDraftField("phone", v)}
            />
            <ContactRow
              editing={editingContact}
              href={`mailto:${user.email}`}
              icon={<Mail size={15} className="text-[#3390ec]" />}
              iconBg="bg-[#3390ec]/15"
              label={t.profile.email}
              displayValue={user.email}
              editValue={draft.email}
              onChange={v => setDraftField("email", v)}
            />
            <ContactRow
              editing={editingContact}
              href={`https://t.me/${user.telegram}`}
              external
              icon={<Send size={14} className="text-white -ml-0.5" />}
              iconBg="bg-[#3390ec]"
              label={t.profile.telegram}
              displayValue={`@${user.telegram}`}
              editValue={draft.telegram}
              prefix="@"
              onChange={v => setDraftField("telegram", v.replace(/^@/, ""))}
              showToOthers={user.showTelegram}
              onToggleShowToOthers={() => setUser(p => ({ ...p, showTelegram: !p.showTelegram }))}
            />
            <ContactRow
              editing={editingContact}
              href={`https://instagram.com/${user.instagram}`}
              external
              icon={<Instagram size={15} className="text-white" />}
              iconBg="bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]"
              label={t.profile.instagram}
              displayValue={`@${user.instagram}`}
              editValue={draft.instagram}
              prefix="@"
              onChange={v => setDraftField("instagram", v.replace(/^@/, ""))}
              showToOthers={user.showInstagram}
              onToggleShowToOthers={() => setUser(p => ({ ...p, showInstagram: !p.showInstagram }))}
            />
          </div>
        </section>

        {/* Upcoming Events */}
        <section>
          <SectionLabel>{t.profile.upcomingEvents}</SectionLabel>
          {UPCOMING_EVENTS.length === 0 ? (
            <Empty />
          ) : (
            <div className="flex flex-col gap-2">
              {UPCOMING_EVENTS.map(e => (
                <Link key={e.id} to={`/events/${e.id}`} className="block bg-[#17212b] rounded-xl px-4 py-3.5 hover:bg-[#1c2a36] transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-bold text-white uppercase tracking-wide">{e.title}</span>
                    {e.pending && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#f5c542]/10 text-[#f5c542] shrink-0">
                        {t.profile.pending}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-[#aaa]">
                    <span className="flex items-center gap-1"><Calendar size={11} className="text-[#3390ec]" />{e.date}</span>
                    <span className="flex items-center gap-1"><Clock    size={11} className="text-[#3390ec]" />{e.time}</span>
                    <span className="flex items-center gap-1"><MapPin   size={11} className="text-[#3390ec]" />{e.location}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Past Events */}
        <section>
          <SectionLabel>{t.profile.pastEvents}</SectionLabel>
          {PAST_EVENTS.length === 0 ? (
            <Empty />
          ) : (
            <div className="bg-[#17212b] rounded-xl overflow-hidden">
              {PAST_EVENTS.map((e, i) => (
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

        {/* Log Out */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-[#ef4444]/20 bg-[#ef4444]/5 text-[#ef4444] text-sm font-bold hover:bg-[#ef4444]/10 active:scale-[0.98] transition-all mt-2"
        >
          <LogOut size={15} />
          {t.profile.logOut}
        </button>

      </div>
    </div>
  );
}

// ─── Contact row ──────────────────────────────────────────────────────────────

function ContactRow({
  editing, href, external, icon, iconBg, label, displayValue, editValue, prefix, onChange,
  showToOthers, onToggleShowToOthers,
}: {
  editing: boolean;
  href?: string;
  external?: boolean;
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  displayValue: string;
  editValue: string;
  prefix?: string;
  onChange: (v: string) => void;
  showToOthers?: boolean;
  onToggleShowToOthers?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-t border-white/[0.06] first:border-t-0">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-[#aaa] mb-0.5">{label}</div>
        {editing ? (
          <div className="flex items-center gap-0.5">
            {prefix && <span className="text-[#aaa] text-sm">{prefix}</span>}
            <input
              value={editValue}
              onChange={e => onChange(e.target.value)}
              onClick={e => e.preventDefault()}
              className="flex-1 bg-transparent text-white text-sm focus:outline-none border-b border-white/15 focus:border-[#3390ec] transition-colors pb-px min-w-0"
            />
          </div>
        ) : href ? (
          <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="text-sm text-white truncate block">
            {displayValue}
          </a>
        ) : (
          <div className="text-sm text-white truncate">{displayValue}</div>
        )}
      </div>
      {!editing && showToOthers !== undefined && onToggleShowToOthers && (
        <button onClick={onToggleShowToOthers} className="text-[#79828b] hover:text-white transition-colors shrink-0">
          {showToOthers ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#aaa]">
      {children}
    </h2>
  );
}

function Empty() {
  const { t } = useLang();
  return (
    <div className="bg-[#17212b] rounded-xl py-6 flex items-center justify-center">
      <span className="text-sm text-[#aaa]">{t.common.nothingHere}</span>
    </div>
  );
}
