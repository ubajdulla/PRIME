import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import {
  ChevronLeft, Camera, Send, Instagram, Phone, Mail, Check, X
} from "lucide-react";

// ─── Shared mock (replace with context / store later) ────────────────────────

export const INITIAL_USER = {
  firstName: "Alex",
  lastName: "Novak",
  avatar: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=300&h=300&fit=crop&crop=face",
  banner: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&h=300&fit=crop",
  positions: ["Outside Hitter"] as string[],
  phone: "+420 777 888 999",
  email: "alex.novak@email.com",
  telegram: "alex_vb",
  instagram: "alex.volleyball",
};

const ALL_POSITIONS = [
  "Outside Hitter",
  "Opposite Hitter",
  "Setter",
  "Middle Blocker",
  "Libero",
  "Right Side",
];

// ─── Component ────────────────────────────────────────────────────────────────

export function EditProfile() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...INITIAL_USER });
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof typeof form, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const togglePosition = (pos: string) => {
    setForm((prev) => {
      if (prev.positions.includes(pos)) {
        return { ...prev, positions: prev.positions.filter((p) => p !== pos) };
      }
      if (prev.positions.length >= 2) return prev;
      return { ...prev, positions: [...prev.positions, pos] };
    });
  };

  const handleImageFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: "avatar" | "banner"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setForm((p) => ({ ...p, [key]: url }));
  };

  const handleSave = () => {
    // Wire to store / API here
    navigate("/profile");
  };

  return (
    <div className="min-h-screen bg-[#0e1621] font-sans pb-32">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-[#0e1621]/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 py-3">
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-1.5 text-[#3390ec] font-bold text-sm active:opacity-70 transition-opacity"
        >
          <ChevronLeft size={20} />
          Back
        </button>
        <span className="font-black text-white text-base tracking-tight">Edit Profile</span>
        <button
          onClick={handleSave}
          className="bg-[#3390ec] text-white text-sm font-black px-4 py-1.5 rounded-xl active:opacity-80 transition-opacity shadow-[0_0_14px_rgba(51,144,236,0.25)]"
        >
          Save
        </button>
      </div>

      {/* ── Cover photo ── */}
      <div className="relative">
        <div
          className="w-full h-44 overflow-hidden bg-[#17212b] relative cursor-pointer group"
          onClick={() => bannerInputRef.current?.click()}
        >
          <img src={form.banner} alt="Cover" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
          {/* overlay */}
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Camera size={18} className="text-white" />
            </div>
            <span className="text-white text-xs font-bold tracking-widest uppercase">Change Cover</span>
          </div>
          {/* always-visible small camera badge */}
          <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-[#3390ec] flex items-center justify-center shadow-lg">
            <Camera size={14} className="text-white" />
          </div>
        </div>
        <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageFile(e, "banner")} />

        {/* ── Avatar overlapping cover ── */}
        <div className="max-w-[600px] mx-auto px-5">
          <div className="relative -mt-[44px] inline-block">
            <img
              src={form.avatar}
              alt="Avatar"
              className="w-24 h-24 rounded-full border-4 border-[#0e1621] object-cover bg-[#222f3e] shadow-xl"
            />
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-[#3390ec] border-2 border-[#0e1621] flex items-center justify-center shadow-md active:scale-95 transition-transform"
            >
              <Camera size={13} className="text-white" />
            </button>
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageFile(e, "avatar")} />
        </div>
      </div>

      {/* ── Form ── */}
      <div className="max-w-[600px] mx-auto px-5 mt-6 flex flex-col gap-7">

        {/* Identity */}
        <Section label="Identity">
          <FieldRow
            label="First name"
            value={form.firstName}
            onChange={(v) => set("firstName", v)}
            placeholder="First name"
          />
          <FieldRow
            label="Last name"
            value={form.lastName}
            onChange={(v) => set("lastName", v)}
            placeholder="Last name"
            last
          />
        </Section>

        {/* Position */}
        <div>
          <SectionLabel>Position <span className="text-white/20 normal-case font-normal tracking-normal">— pick up to 2</span></SectionLabel>
          <div className="bg-[#17212b] rounded-2xl border border-white/5 p-4">
            <div className="flex flex-wrap gap-2">
              {ALL_POSITIONS.map((pos) => {
                const selected = form.positions.includes(pos);
                const maxed = !selected && form.positions.length >= 2;
                return (
                  <button
                    key={pos}
                    onClick={() => togglePosition(pos)}
                    disabled={maxed}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-sm font-bold transition-all active:scale-95 ${
                      selected
                        ? "bg-[#3390ec] border-[#3390ec] text-white shadow-[0_0_12px_rgba(51,144,236,0.2)]"
                        : maxed
                        ? "bg-white/[0.02] border-white/5 text-white/20 cursor-not-allowed"
                        : "bg-white/5 border-white/10 text-[#79828b] hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {selected && <Check size={12} />}
                    {pos}
                  </button>
                );
              })}
            </div>

            {/* Selected display */}
            {form.positions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#79828b]">Selected:</span>
                <div className="flex gap-1.5">
                  {form.positions.map((p) => (
                    <span key={p} className="flex items-center gap-1 bg-[#3390ec]/10 text-[#3390ec] border border-[#3390ec]/25 rounded-lg px-2 py-0.5 text-xs font-bold">
                      {p}
                      <button onClick={() => togglePosition(p)} className="ml-0.5 opacity-60 hover:opacity-100">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Social links */}
        <Section label="Social Links">
          <SocialRow
            icon={
              <div className="w-7 h-7 rounded-lg bg-[#3390ec] flex items-center justify-center shadow-[0_0_8px_rgba(51,144,236,0.3)]">
                <Send size={13} className="text-white -ml-0.5" />
              </div>
            }
            label="Telegram"
            value={form.telegram}
            onChange={(v) => set("telegram", v.replace(/^@/, ""))}
            placeholder="username"
            prefix="@"
          />
          <SocialRow
            icon={
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center">
                <Instagram size={13} className="text-white" />
              </div>
            }
            label="Instagram"
            value={form.instagram}
            onChange={(v) => set("instagram", v.replace(/^@/, ""))}
            placeholder="username"
            prefix="@"
            last
          />
        </Section>

        {/* Contact */}
        <Section label="Contact">
          <FieldRow
            label="Phone"
            value={form.phone}
            onChange={(v) => set("phone", v)}
            placeholder="+1 234 567 890"
            type="tel"
            icon={<Phone size={14} className="text-[#79828b]" />}
          />
          <FieldRow
            label="Email"
            value={form.email}
            onChange={(v) => set("email", v)}
            placeholder="you@example.com"
            type="email"
            icon={<Mail size={14} className="text-[#79828b]" />}
            last
          />
        </Section>
      </div>

      {/* ── Bottom save button ── */}
      <div className="fixed bottom-0 left-0 w-full z-10 px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 bg-gradient-to-t from-[#0e1621] via-[#0e1621]/95 to-transparent">
        <button
          onClick={handleSave}
          className="w-full max-w-[600px] mx-auto block py-4 bg-[#3390ec] hover:bg-[#2d7fd4] text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-colors active:scale-[0.98] shadow-[0_0_24px_rgba(51,144,236,0.2)]"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-black uppercase tracking-widest text-[#79828b] mb-2.5 px-1">
      {children}
    </h3>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className="bg-[#17212b] rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
        {children}
      </div>
    </div>
  );
}

function FieldRow({
  label, value, onChange, placeholder, type = "text", icon, last = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 ${!last ? "" : ""}`}>
      {icon && <div className="shrink-0">{icon}</div>}
      <label className="text-[#79828b] text-sm w-24 shrink-0">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-white text-sm font-medium placeholder:text-white/20 focus:outline-none text-right"
      />
    </div>
  );
}

function SocialRow({
  icon, label, value, onChange, placeholder, prefix, last = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3.5`}>
      <div className="shrink-0">{icon}</div>
      <label className="text-[#79828b] text-sm w-20 shrink-0">{label}</label>
      <div className="flex-1 flex items-center justify-end gap-1">
        {prefix && <span className="text-[#79828b] text-sm">{prefix}</span>}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-transparent text-white text-sm font-medium placeholder:text-white/20 focus:outline-none text-right min-w-0 flex-1"
        />
      </div>
    </div>
  );
}
