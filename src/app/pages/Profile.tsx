import { useEffect, useState } from "react";
import { useNavigate, Link, Navigate } from "react-router";
import { useLang } from "../i18n";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { SKILL_STYLE } from "../data/adminData";
import { shortDate, isPastDate } from "../lib/eventDate";
import {
  Phone, Mail, Instagram, Send, MapPin, Calendar, Clock,
  Pencil, Camera, LogOut, User, Eye, EyeOff, MoreVertical,
} from "lucide-react";
import { SelectField } from "../components/ui/SelectField";
import { DropdownPanel, DropdownItem } from "../components/ui/DropdownMenu";

const POSITIONS = ["Outside Hitter", "Opposite Hitter", "Setter", "Middle Blocker", "Libero"];

type EventRow = { id: string; title: string; event_date: string; event_time: string; location: string; status: string };

type ContactDraft = {
  name: string;
  phone: string;
  email: string;
  telegram: string;
  instagram: string;
};

export function Profile() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { user: authUser, profile, isLoggedIn, loading, signOut, refreshProfile } = useAuth();

  const [editingContact, setEditingContact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ContactDraft>({
    name: "", phone: "", email: "", telegram: "", instagram: "",
  });

  const [upcomingEvents, setUpcomingEvents] = useState<{ event: EventRow; pending: boolean }[]>([]);
  const [pastEvents, setPastEvents] = useState<EventRow[]>([]);

  useEffect(() => {
    if (!authUser) return;
    (async () => {
      const [{ data: partRows }, { data: reqRows }] = await Promise.all([
        supabase.from("event_participants").select("events(id, title, event_date, event_time, location, status)").eq("player_id", authUser.id),
        supabase.from("event_requests").select("events(id, title, event_date, event_time, location, status)").eq("player_id", authUser.id).in("kind", ["request", "waitlist"]),
      ]);
      const joined  = (partRows ?? []).map(r => r.events).filter(Boolean) as unknown as EventRow[];
      const pending = (reqRows  ?? []).map(r => r.events).filter(Boolean) as unknown as EventRow[];

      setUpcomingEvents([
        ...joined.filter(e => e.status === "upcoming" && !isPastDate(e.event_date)).map(e => ({ event: e, pending: false })),
        ...pending.filter(e => e.status === "upcoming" && !isPastDate(e.event_date)).map(e => ({ event: e, pending: true })),
      ].sort((a, b) => a.event.event_date.localeCompare(b.event.event_date)));

      setPastEvents(
        joined.filter(e => isPastDate(e.event_date)).sort((a, b) => b.event_date.localeCompare(a.event_date))
      );
    })();
  }, [authUser]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const openContactEdit = () => {
    if (!profile) return;
    setDraft({
      name:      profile.name ?? "",
      phone:     profile.phone ?? "",
      email:     profile.email ?? "",
      telegram:  profile.telegram ?? "",
      instagram: profile.instagram ?? "",
    });
    setEditingContact(true);
  };

  const cancelContactEdit = () => setEditingContact(false);

  async function updateProfile(fields: Record<string, unknown>) {
    if (!authUser) return;
    const { error } = await supabase.from("profiles").update(fields).eq("id", authUser.id);
    if (error) { setError(error.message); return; }
    await refreshProfile();
  }

  const saveContact = async () => {
    setError(null);
    setSaving(true);
    await updateProfile({
      name:      draft.name,
      phone:     draft.phone,
      email:     draft.email,
      telegram:  draft.telegram,
      instagram: draft.instagram,
    });
    setSaving(false);
    setEditingContact(false);
  };

  const setDraftField = (k: keyof ContactDraft, v: string) =>
    setDraft(p => ({ ...p, [k]: v }));

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !authUser) return;
    setError(null);
    setUploadingAvatar(true);
    const ext = f.name.split(".").pop() || "jpg";
    const path = `${authUser.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, f, { upsert: true });
    if (uploadError) { setError(uploadError.message); setUploadingAvatar(false); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await updateProfile({ avatar: data.publicUrl });
    setUploadingAvatar(false);
  }

  if (loading) return null;
  if (!isLoggedIn) {
    return <Navigate to="/signin" replace />;
  }
  if (!profile) return null;

  const skillStyle = SKILL_STYLE[profile.skill_level] ?? SKILL_STYLE.Rookie;

  return (
    <div className="min-h-full bg-[#181818] pb-4 font-sans">

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)}>
          <div className="w-full max-w-sm bg-[#212121] border border-white/10 rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
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
                onClick={async () => { await signOut(); navigate("/signin"); }}
                className="flex-1 py-2.5 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] font-bold text-sm transition-transform"
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
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt=""
              className={`w-28 h-28 rounded-full object-cover bg-[#212121] ${uploadingAvatar ? "opacity-50" : ""}`}
            />
          ) : (
            <div className={`w-28 h-28 rounded-full bg-[#212121] flex items-center justify-center ${uploadingAvatar ? "opacity-50" : ""}`}>
              <User size={44} className="text-[#79828b]" />
            </div>
          )}
          <span className="absolute bottom-0.5 right-0.5 w-7 h-7 rounded-full bg-[#462ed1] border-2 border-[#181818] flex items-center justify-center pointer-events-none">
            <Camera size={13} className="text-white" />
          </span>
          <input type="file" accept="image/*" className="hidden" disabled={uploadingAvatar} onChange={handleAvatar} />
        </label>

        {/* Name — display only, updates when contact is saved */}
        <h1 className="text-xl font-semibold text-white mb-1">{profile.name}</h1>
        <span className={`text-sm font-medium ${skillStyle.text}`}>
          {profile.skill_level}
        </span>
      </div>

      {error && (
        <div className="max-w-[640px] mx-auto px-4 mb-4">
          <div className="px-4 py-3 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] text-sm">
            {error}
          </div>
        </div>
      )}

      <div className="max-w-[640px] mx-auto px-4 flex flex-col gap-6">

        {/* Position — always-editable dropdown, no edit button needed */}
        <div className="bg-[#212121] rounded-xl">
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-[#aaa]">{t.profile.position}</span>
            <SelectField
              value={profile.position ?? POSITIONS[0]}
              options={POSITIONS}
              onChange={v => updateProfile({ position: v })}
              triggerClassName="flex items-center gap-1.5 text-white text-sm hover:opacity-80 transition-opacity focus:outline-none"
              panelClassName="absolute right-0 top-full mt-1.5 z-30"
              panelWidthClassName="w-40"
            />
          </div>
        </div>

        {/* Contact — edit button lives here */}
        <section>
          <div className="flex items-center justify-between h-8 mb-2">
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
                  disabled={saving}
                  className="text-sm text-[#462ed1] font-medium active:opacity-70 transition-opacity disabled:opacity-50"
                >
                  {saving ? "…" : t.common.save}
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => setMenuOpen(v => !v)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${menuOpen ? "bg-white/10 text-white" : "text-[#79828b] hover:bg-white/5 hover:text-white"}`}
                >
                  <MoreVertical size={16} />
                </button>
                {menuOpen && (
                  <div onMouseDown={e => e.stopPropagation()} className="absolute right-0 top-full mt-1.5 z-20 w-56">
                    <DropdownPanel>
                      <div className="flex flex-col">
                        <DropdownItem
                          icon={<Pencil size={14} />}
                          label={t.profile.editDetails}
                          onClick={() => { openContactEdit(); setMenuOpen(false); }}
                        />
                        <DropdownItem
                          icon={<LogOut size={14} />}
                          label={t.profile.logOut}
                          onClick={() => { setShowLogoutConfirm(true); setMenuOpen(false); }}
                        />
                      </div>
                    </DropdownPanel>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-[#212121] rounded-xl overflow-hidden">

            {/* Name row */}
            <ContactRow
              editing={editingContact}
              icon={<User size={15} className="text-[#462ed1]" />}
              iconBg="bg-[#462ed1]/15"
              label={t.profile.name}
              displayValue={profile.name}
              editValue={draft.name}
              onChange={v => setDraftField("name", v)}
            />

            <ContactRow
              editing={editingContact}
              href={`tel:${(profile.phone ?? "").replace(/\s/g, "")}`}
              icon={<Phone size={15} className="text-[#462ed1]" />}
              iconBg="bg-[#462ed1]/15"
              label={t.profile.phone}
              displayValue={profile.phone ?? ""}
              editValue={draft.phone}
              onChange={v => setDraftField("phone", v)}
            />
            <ContactRow
              editing={editingContact}
              href={`mailto:${profile.email ?? ""}`}
              icon={<Mail size={15} className="text-[#462ed1]" />}
              iconBg="bg-[#462ed1]/15"
              label={t.profile.email}
              displayValue={profile.email ?? ""}
              editValue={draft.email}
              onChange={v => setDraftField("email", v)}
            />
            <ContactRow
              editing={editingContact}
              href={`https://t.me/${profile.telegram ?? ""}`}
              external
              icon={<Send size={14} className="text-white -ml-0.5" />}
              iconBg="bg-[#462ed1]"
              label={t.profile.telegram}
              displayValue={`@${profile.telegram ?? ""}`}
              editValue={draft.telegram}
              prefix="@"
              onChange={v => setDraftField("telegram", v.replace(/^@/, ""))}
              showToOthers={profile.show_telegram}
              onToggleShowToOthers={() => updateProfile({ show_telegram: !profile.show_telegram })}
            />
            <ContactRow
              editing={editingContact}
              href={`https://instagram.com/${profile.instagram ?? ""}`}
              external
              icon={<Instagram size={15} className="text-white" />}
              iconBg="bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]"
              label={t.profile.instagram}
              displayValue={`@${profile.instagram ?? ""}`}
              editValue={draft.instagram}
              prefix="@"
              onChange={v => setDraftField("instagram", v.replace(/^@/, ""))}
              showToOthers={profile.show_instagram}
              onToggleShowToOthers={() => updateProfile({ show_instagram: !profile.show_instagram })}
            />
          </div>
        </section>

        {/* Upcoming Events */}
        <section>
          <SectionLabel>{t.profile.upcomingEvents}</SectionLabel>
          {upcomingEvents.length === 0 ? (
            <Empty />
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingEvents.map(({ event: e, pending }) => (
                <Link key={e.id} to={`/events/${e.id}`} className="block bg-[#212121] rounded-xl px-4 py-3.5 hover:bg-[#1c2a36] transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-bold text-white uppercase tracking-wide">{e.title}</span>
                    {pending && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#f5c542]/10 text-[#f5c542] shrink-0">
                        {t.profile.pending}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-[#aaa]">
                    <span className="flex items-center gap-1"><Calendar size={11} className="text-[#462ed1]" />{shortDate(e.event_date, true)}</span>
                    <span className="flex items-center gap-1"><Clock    size={11} className="text-[#462ed1]" />{e.event_time}</span>
                    <span className="flex items-center gap-1"><MapPin   size={11} className="text-[#462ed1]" />{e.location}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Past Events */}
        <section>
          <SectionLabel>{t.profile.pastEvents}</SectionLabel>
          {pastEvents.length === 0 ? (
            <Empty />
          ) : (
            <div className="bg-[#212121] rounded-xl overflow-hidden">
              {pastEvents.map((e, i) => (
                <Link
                  key={e.id}
                  to={`/events/${e.id}`}
                  className={`flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors ${i > 0 ? "border-t border-white/[0.06]" : ""}`}
                >
                  <span className="text-sm text-white/75 truncate">{e.title}</span>
                  <span className="text-xs text-[#aaa] shrink-0 ml-3">{shortDate(e.event_date, true)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

// ─── Contact row ──────────────────────────────────────────────────────────────

const HIDDEN_MASK = "----------";

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
  const isHidden = showToOthers === false;
  const shownValue = isHidden ? HIDDEN_MASK : (displayValue || "—");
  return (
    <div className="flex items-center gap-3 px-4 h-[56px] shrink-0 border-t border-white/[0.06] first:border-t-0">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-[#aaa] mb-0.5 h-[13px]">{label}</div>
        <div className="flex items-center gap-0.5 h-5">
          {editing ? (
            <>
              {prefix && <span className="text-[#aaa] text-sm shrink-0">{prefix}</span>}
              <input
                value={editValue}
                onChange={e => onChange(e.target.value)}
                onClick={e => e.preventDefault()}
                className="flex-1 bg-transparent text-white text-sm leading-5 focus:outline-none shadow-[0_1px_0_0_rgba(255,255,255,0.15)] focus:shadow-[0_1px_0_0_#462ed1] transition-shadow min-w-0"
              />
            </>
          ) : href && !isHidden ? (
            <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="text-sm leading-5 truncate block text-white">
              {shownValue}
            </a>
          ) : (
            <div className={`text-sm leading-5 truncate ${isHidden ? "text-white/40" : "text-white"}`}>{shownValue}</div>
          )}
        </div>
      </div>
      {showToOthers !== undefined && onToggleShowToOthers && (
        <button
          onClick={onToggleShowToOthers}
          disabled={editing}
          className={`text-[#79828b] hover:text-white transition-colors shrink-0 ${editing ? "opacity-0 pointer-events-none" : ""}`}
        >
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
    <div className="bg-[#212121] rounded-xl py-6 flex items-center justify-center">
      <span className="text-sm text-[#aaa]">{t.common.nothingHere}</span>
    </div>
  );
}
