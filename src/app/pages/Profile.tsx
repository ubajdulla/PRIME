import { useEffect, useState } from "react";
import { useNavigate, Link, Navigate } from "react-router";
import { formatDistanceToNowStrict } from "date-fns";
import { useLang } from "../i18n";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { SKILL_STYLE } from "../data/adminData";
import { shortDate, isPastDate } from "../lib/eventDate";
import {
  Phone, Mail, Instagram, Send, MapPin, Calendar, Clock,
  Pencil, Camera, LogOut, User, MoreVertical, OctagonX, ThumbsUp, Flag, Globe,
} from "lucide-react";
import { SelectField } from "../components/ui/SelectField";
import { DropdownPanel, DropdownItem, ConfirmDropdownItem } from "../components/ui/DropdownMenu";
import { ContactRow } from "../components/ui/ContactRow";
import { DateOfBirthRow } from "../components/ui/DateOfBirthRow";
import { EditToggleButtons } from "../components/ui/EditToggleButtons";
import { LABEL_META, SENTIMENT_COLOR, type TrustLabel } from "../lib/trustLabel";

const POSITIONS = ["Outside Hitter", "Opposite Hitter", "Setter", "Middle Blocker", "Libero"];

type EventRow = { id: string; title: string; event_date: string; event_time: string; location: string; status: string };
type NoteRow = { id: string; author_name: string; body: string; created_at: string; label: TrustLabel | null };

type ContactDraft = {
  name: string;
  birthDate: string;
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
  const [logoutArmed, setLogoutArmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ContactDraft>({
    name: "", birthDate: "", phone: "", email: "", telegram: "", instagram: "",
  });

  const [upcomingEvents, setUpcomingEvents] = useState<{ event: EventRow; pending: boolean }[]>([]);
  const [pastEvents, setPastEvents] = useState<EventRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  // Ticks once a minute purely to force the suspension countdown to
  // re-render - formatDistanceToNowStrict itself doesn't update on its own.
  const [, setCountdownTick] = useState(0);

  useEffect(() => {
    if (!authUser) return;
    (async () => {
      const [{ data: partRows }, { data: reqRows }, { data: noteRows }] = await Promise.all([
        supabase.from("event_participants").select("events(id, title, event_date, event_time, location, status)").eq("player_id", authUser.id),
        supabase.from("event_requests").select("events(id, title, event_date, event_time, location, status)").eq("player_id", authUser.id).in("kind", ["request", "waitlist"]),
        // RLS (015_player_notes.sql) already restricts a non-admin to only their
        // own visibility='all' notes, but filtering here too keeps the intent
        // explicit and avoids depending on that being the *only* thing enforcing it.
        supabase.from("player_notes").select("id, author_name, body, created_at, label").eq("player_id", authUser.id).eq("visibility", "all").order("created_at", { ascending: false }),
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
      setNotes((noteRows as NoteRow[]) ?? []);
    })();
  }, [authUser]);

  useEffect(() => {
    if (!profile?.is_suspended) return;
    const id = setInterval(() => setCountdownTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, [profile?.is_suspended]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  // Menu closing (click elsewhere, or picking another item) disarms the
  // logout confirm so it never reopens still-armed next time.
  useEffect(() => {
    if (!menuOpen) setLogoutArmed(false);
  }, [menuOpen]);

  useEffect(() => {
    if (!logoutArmed) return;
    const timer = setTimeout(() => setLogoutArmed(false), 3000);
    return () => clearTimeout(timer);
  }, [logoutArmed]);

  const openContactEdit = () => {
    if (!profile) return;
    setDraft({
      name:      profile.name ?? "",
      birthDate: profile.birth_date ?? "",
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
      name:       draft.name,
      birth_date: draft.birthDate || null,
      phone:      draft.phone,
      email:      draft.email,
      telegram:   draft.telegram,
      instagram:  draft.instagram,
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
  // Status ring + corner icon instead of a separate label row - matches
  // AdminPlayerProfile.tsx, and means the avatar itself carries the state
  // instead of something that appears/disappears and shifts the page.
  const statusRingColor = profile.is_banned ? "#ef4444" : profile.is_suspended ? "#eab308" : null;
  const statusTooltip = profile.is_banned
    ? `Banned${profile.ban_reason ? ` — ${profile.ban_reason}` : ""}`
    : profile.is_suspended && profile.suspended_until
    ? `Suspended — ${formatDistanceToNowStrict(new Date(profile.suspended_until))} left${profile.suspend_reason ? ` — ${profile.suspend_reason}` : ""}`
    : "";

  return (
    <div className="min-h-full bg-[#181818] pb-4 font-sans">

      {/* ── Profile identity ── */}
      <div className="flex flex-col items-center pt-8 pb-6 px-4">

        {/* Avatar — always tappable. Suspended/banned shows as a ring +
            corner badge instead of swapping the whole avatar, so status
            reads consistently with AdminPlayerProfile.tsx. */}
        <label className="relative cursor-pointer mb-4 w-28 h-28">
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt=""
              className={`w-28 h-28 rounded-full object-cover bg-[#212121] ${uploadingAvatar ? "opacity-50" : ""}`}
              style={statusRingColor ? { boxShadow: `0 0 0 3px ${statusRingColor}` } : undefined}
            />
          ) : (
            <div
              className={`w-28 h-28 rounded-full bg-[#212121] flex items-center justify-center ${uploadingAvatar ? "opacity-50" : ""}`}
              style={statusRingColor ? { boxShadow: `0 0 0 3px ${statusRingColor}` } : undefined}
            >
              <User size={44} className="text-[#79828b]" />
            </div>
          )}
          {statusRingColor && (
            <span
              title={statusTooltip}
              className="absolute bottom-0.5 left-0.5 w-7 h-7 rounded-full border-2 border-[#181818] flex items-center justify-center"
              style={{ background: statusRingColor }}
            >
              {profile.is_banned ? <OctagonX size={13} className="text-white" /> : <Clock size={13} className="text-white" />}
            </span>
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
            <EditToggleButtons
              editing={editingContact}
              onCancel={cancelContactEdit}
              onSave={saveContact}
              saving={saving}
              cancelLabel={t.common.cancel}
              saveLabel={t.common.save}
              idle={
                <div className="relative">
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => setMenuOpen(v => !v)}
                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${menuOpen ? "bg-white/10 text-white" : "text-[#79828b] hover:bg-white/5 hover:text-white"}`}
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
                          <ConfirmDropdownItem
                            icon={<LogOut size={14} />}
                            label={t.profile.logOut}
                            variant="destructive"
                            armed={logoutArmed}
                            onArm={() => setLogoutArmed(true)}
                            onConfirm={async () => { await signOut(); navigate("/signin"); }}
                            onDisarm={() => setLogoutArmed(false)}
                          />
                        </div>
                      </DropdownPanel>
                    </div>
                  )}
                </div>
              }
            />
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

            <DateOfBirthRow
              editing={editingContact}
              value={profile.birth_date}
              draftValue={draft.birthDate}
              onChange={v => setDraftField("birthDate", v)}
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

        {/* Notes — visible only when there's something to show: an active
            suspension/ban status, or a note an admin marked visible to
            everyone (player_notes.visibility = 'all'). Admin-only notes never
            reach this query (see RLS in 015_player_notes.sql). */}
        {(profile.is_suspended || profile.is_banned || notes.length > 0) && (
          <section>
            <SectionLabel>{t.profile.notes}</SectionLabel>
            <div className="mt-2 flex flex-col gap-2">
              {profile.is_banned ? (
                <div className="bg-[#ef4444]/10 border border-[#ef4444]/25 rounded-xl px-3 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <OctagonX size={13} className="text-[#ef4444] shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#ef4444]">Banned</span>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed">
                    {profile.ban_reason || "You've been permanently banned and can't join any events."}
                  </p>
                </div>
              ) : profile.is_suspended && (
                <div className="bg-[#eab308]/10 border border-[#eab308]/25 rounded-xl px-3 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={13} className="text-[#eab308] shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#eab308]">
                      Suspended — {profile.suspended_until ? formatDistanceToNowStrict(new Date(profile.suspended_until)) : ""} left
                    </span>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed">
                    {profile.suspend_reason || "You can't join events until the suspension ends."}
                  </p>
                </div>
              )}

              {notes.map(n => (
                <div key={n.id} className="bg-[#212121] rounded-xl px-3 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe size={11} className="text-[#79828b] shrink-0" />
                    <span className="text-[11px] font-bold text-white/70">{n.author_name || "Admin"}</span>
                    <span className="text-[10px] text-[#79828b]">· {new Date(n.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    {n.label && (
                      <span
                        className="ml-auto w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: `${SENTIMENT_COLOR[LABEL_META[n.label].sentiment]}26` }}
                        title={LABEL_META[n.label].name}
                      >
                        {LABEL_META[n.label].sentiment === "positive"
                          ? <ThumbsUp size={11} style={{ color: SENTIMENT_COLOR[LABEL_META[n.label].sentiment] }} />
                          : <Flag size={11} style={{ color: SENTIMENT_COLOR[LABEL_META[n.label].sentiment] }} />}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap break-words">{n.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Events */}
        <section>
          <SectionLabel>{t.profile.upcomingEvents}</SectionLabel>
          {upcomingEvents.length === 0 ? (
            <Empty />
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingEvents.slice(0, 7).map(({ event: e, pending }) => (
                <Link key={e.id} to={`/events/${e.id}`} state={{ hub: "profile" }} className="block bg-[#212121] rounded-xl px-4 py-3.5 hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-bold text-white uppercase tracking-wide">{e.title}</span>
                    {pending && <Clock size={14} className="text-[#f5c542] shrink-0" />}
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
              {pastEvents.slice(0, 7).map((e) => (
                <Link
                  key={e.id}
                  to={`/events/${e.id}`}
                  state={{ hub: "profile" }}
                  className={`relative flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-white/[0.06] first:before:hidden`}
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
