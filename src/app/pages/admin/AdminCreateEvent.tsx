import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, Check } from "lucide-react";

const CATEGORIES = ["GAMES", "TOURNAMENT", "TRAININGS", "BEACH", "EVENTS"];

export function AdminCreateEvent() {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    title: "",
    category: "GAMES",
    date: "",
    timeStart: "20:00",
    timeEnd: "22:00",
    location: "",
    isFree: false,
    price: "",
    capacity: "12",
    joinType: "direct" as "direct" | "request",
    description: "",
    status: "draft" as "draft" | "published",
  });

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => {
      navigate("/admin/events");
    }, 1200);
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-[#4dcd5e]/10 border border-[#4dcd5e]/30 flex items-center justify-center">
          <Check size={28} className="text-[#4dcd5e]" />
        </div>
        <p className="text-white font-black text-lg uppercase tracking-widest">
          {form.status === "published" ? "Event Published!" : "Draft Saved!"}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[700px] mx-auto px-4 py-6">
      <button
        onClick={() => navigate("/admin/events")}
        className="flex items-center gap-2 text-[#79828b] hover:text-white transition-colors mb-5 text-sm font-bold"
      >
        <ChevronLeft size={18} /> Events
      </button>

      <h1 className="font-black italic text-2xl text-white uppercase tracking-widest mb-8">Create Event</h1>

      <div className="flex flex-col gap-5">
        {/* Title */}
        <Field label="Event Title">
          <input
            type="text"
            value={form.title}
            onChange={e => set("title", e.target.value)}
            placeholder="e.g. PRO-AM INVITATIONAL #13"
            className="w-full bg-[#222f3e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-[#79828b]/60 focus:outline-none focus:border-[#3390ec]/50 transition-colors"
          />
        </Field>

        {/* Category */}
        <Field label="Category">
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => set("category", cat)}
                className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all ${
                  form.category === cat
                    ? "bg-[#3390ec] border-[#3390ec] text-white"
                    : "bg-[#222f3e] border-white/10 text-[#79828b] hover:border-[#3390ec]/30"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </Field>

        {/* Date */}
        <Field label="Date">
          <input
            type="date"
            value={form.date}
            onChange={e => set("date", e.target.value)}
            className="w-full bg-[#222f3e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-[#3390ec]/50 transition-colors [color-scheme:dark]"
          />
        </Field>

        {/* Time */}
        <Field label="Time">
          <div className="flex items-center gap-3">
            <input
              type="time"
              value={form.timeStart}
              onChange={e => set("timeStart", e.target.value)}
              className="flex-1 bg-[#222f3e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-[#3390ec]/50 transition-colors [color-scheme:dark]"
            />
            <span className="text-[#79828b] font-bold text-sm">to</span>
            <input
              type="time"
              value={form.timeEnd}
              onChange={e => set("timeEnd", e.target.value)}
              className="flex-1 bg-[#222f3e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-[#3390ec]/50 transition-colors [color-scheme:dark]"
            />
          </div>
        </Field>

        {/* Location */}
        <Field label="Location">
          <input
            type="text"
            value={form.location}
            onChange={e => set("location", e.target.value)}
            placeholder="e.g. Cyber Arena, Sector 4"
            className="w-full bg-[#222f3e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-[#79828b]/60 focus:outline-none focus:border-[#3390ec]/50 transition-colors"
          />
        </Field>

        {/* Price */}
        <Field label="Entry Fee">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => set("isFree", !form.isFree)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-wider transition-all ${
                form.isFree
                  ? "bg-[#4dcd5e]/10 border-[#4dcd5e]/30 text-[#4dcd5e]"
                  : "bg-[#222f3e] border-white/10 text-[#79828b]"
              }`}
            >
              {form.isFree && <Check size={12} />}
              Free event
            </button>
          </div>
          {!form.isFree && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={e => set("price", e.target.value)}
                placeholder="625"
                className="flex-1 bg-[#222f3e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-[#79828b]/60 focus:outline-none focus:border-[#3390ec]/50 transition-colors"
              />
              <span className="text-[#79828b] font-black text-sm">CZK</span>
            </div>
          )}
        </Field>

        {/* Capacity */}
        <Field label="Max Players">
          <input
            type="number"
            min="2"
            max="100"
            value={form.capacity}
            onChange={e => set("capacity", e.target.value)}
            className="w-full bg-[#222f3e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-[#3390ec]/50 transition-colors"
          />
        </Field>

        {/* Join Type */}
        <Field label="Join Type">
          <div className="flex gap-3">
            <JoinTypeOption
              selected={form.joinType === "direct"}
              onClick={() => set("joinType", "direct")}
              title="Direct Join"
              desc="Players join immediately"
            />
            <JoinTypeOption
              selected={form.joinType === "request"}
              onClick={() => set("joinType", "request")}
              title="Request Only"
              desc="You approve each player"
            />
          </div>
        </Field>

        {/* Description */}
        <Field label="Description">
          <textarea
            value={form.description}
            onChange={e => set("description", e.target.value)}
            placeholder="Event details, rules, notes..."
            rows={3}
            className="w-full bg-[#222f3e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-[#79828b]/60 focus:outline-none focus:border-[#3390ec]/50 transition-colors resize-none"
          />
        </Field>

        {/* Status */}
        <Field label="Publish Status">
          <div className="flex gap-3">
            <StatusOption selected={form.status === "draft"} onClick={() => set("status", "draft")} label="Save as Draft" color="yellow" />
            <StatusOption selected={form.status === "published"} onClick={() => set("status", "published")} label="Publish Now" color="blue" />
          </div>
        </Field>

        {/* Save button */}
        <button
          onClick={handleSave}
          className={`w-full py-4 rounded-xl font-black italic text-base tracking-widest uppercase mt-2 active:scale-[0.98] transition-transform ${
            form.status === "published"
              ? "bg-[#3390ec] text-white shadow-[0_0_20px_rgba(51,144,236,0.25)]"
              : "bg-[#ccff00] text-black"
          }`}
        >
          {form.status === "published" ? "Publish Event" : "Save Draft"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[#79828b] text-[11px] font-black uppercase tracking-widest mb-2">{label}</label>
      {children}
    </div>
  );
}

function JoinTypeOption({ selected, onClick, title, desc }: { selected: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 p-3 rounded-xl border text-left transition-all ${
        selected ? "bg-[#3390ec]/10 border-[#3390ec]/40" : "bg-[#222f3e] border-white/10 hover:border-white/20"
      }`}
    >
      <div className={`text-xs font-black uppercase tracking-wider mb-0.5 ${selected ? "text-[#3390ec]" : "text-white"}`}>{title}</div>
      <div className="text-[#79828b] text-[11px]">{desc}</div>
    </button>
  );
}

function StatusOption({ selected, onClick, label, color }: { selected: boolean; onClick: () => void; label: string; color: "yellow" | "blue" }) {
  const active = color === "blue"
    ? "bg-[#3390ec]/10 border-[#3390ec]/40 text-[#3390ec]"
    : "bg-[#ccff00]/10 border-[#ccff00]/40 text-[#ccff00]";
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-4 py-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all ${
        selected ? active : "bg-[#222f3e] border-white/10 text-[#79828b] hover:border-white/20"
      }`}
    >
      {label}
    </button>
  );
}
