import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ChevronLeft, ChevronDown, Check, MapPin } from "lucide-react";
import { SKILL_ORDER, ADMIN_EVENTS } from "../../data/adminData";

const CATEGORIES = ["GAMES", "TOURNAMENT", "TRAININGS", "BEACH", "EVENTS"];

const LOCATIONS = [
  "PRIME Sports Hall",
  "Cyber Arena, Sector 4",
  "Beach Court A",
  "Indoor Arena West",
  "East Side Courts",
  "Central Sports Hub",
];

export function AdminCreateEvent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const editEvent = editId ? ADMIN_EVENTS.find(e => e.id === editId) : null;
  const isEditMode = !!editEvent;

  const [saved, setSaved] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setLocationOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const [form, setForm] = useState(() => {
    if (editEvent) {
      return {
        title: editEvent.title,
        description: editEvent.description ?? "",
        category: editEvent.category,
        date: "",
        timeStart: editEvent.time.split(" – ")[0] ?? "20:00",
        timeEnd: editEvent.time.split(" – ")[1] ?? "22:00",
        location: editEvent.location,
        price: editEvent.price > 0 ? String(editEvent.price) : "",
        capacity: String(editEvent.capacity),
        levelRequired: "Rookie",
        publishAt: "",
        notifyBefore: false,
      };
    }
    return {
      title: "",
      description: "",
      category: "GAMES",
      date: "",
      timeStart: "20:00",
      timeEnd: "22:00",
      location: "",
      price: "",
      capacity: "12",
      levelRequired: "Rookie",
      publishAt: "",
      notifyBefore: false,
    };
  });

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => navigate("/admin/events"), 1200);
  }

  const isScheduled = !!form.publishAt && new Date(form.publishAt) > new Date();
  const isFree = form.price === "" || Number(form.price) === 0;
  const showLevel = form.category === "GAMES" || form.category === "TRAININGS";

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-[#4dcd5e]/10 border border-[#4dcd5e]/30 flex items-center justify-center">
          <Check size={28} className="text-[#4dcd5e]" />
        </div>
        <p className="text-white font-black text-lg uppercase tracking-widest">
          {isScheduled ? "Event Scheduled!" : isEditMode ? "Changes Saved!" : "Event Saved!"}
        </p>
        {isScheduled && (
          <p className="text-[#79828b] text-sm">
            Publishes {new Date(form.publishAt).toLocaleString()}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center px-4 py-3 bg-[#0e1621]/90 backdrop-blur-md border-b border-white/5">
        <button
          onClick={() => navigate("/admin/events")}
          className="flex items-center gap-1.5 text-[#79828b] hover:text-white transition-colors text-sm font-bold"
        >
          <ChevronLeft size={18} /> Events
        </button>
      </div>

      <div className="max-w-[700px] mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <h1 className="font-black italic text-xl sm:text-2xl text-white uppercase tracking-widest mb-6 sm:mb-8 leading-tight">
        {isEditMode ? "Edit Event" : "Create Event"}
      </h1>

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

        {/* Category */}
        <Field label="Category">
          <div className="relative">
            <select
              value={form.category}
              onChange={e => set("category", e.target.value)}
              className="w-full bg-[#222f3e] border border-white/10 rounded-xl px-4 py-3 pr-10 text-white text-sm font-bold focus:outline-none focus:border-[#3390ec]/50 transition-colors [color-scheme:dark] appearance-none cursor-pointer"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#79828b] pointer-events-none" />
          </div>
        </Field>

        {/* Level — only for GAMES and TRAININGS */}
        {showLevel && (
          <Field label="Level">
            <div className="relative">
              <select
                value={form.levelRequired}
                onChange={e => set("levelRequired", e.target.value)}
                className="w-full bg-[#222f3e] border border-white/10 rounded-xl px-4 py-3 pr-10 text-white text-sm font-bold focus:outline-none focus:border-[#3390ec]/50 transition-colors [color-scheme:dark] appearance-none cursor-pointer"
              >
                {SKILL_ORDER.map(lvl => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#79828b] pointer-events-none" />
            </div>
          </Field>
        )}

        {/* Date & Time — stacked on mobile, single row on sm+ */}
        <Field label="Date & Time">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="date"
              value={form.date}
              onChange={e => set("date", e.target.value)}
              className="w-full sm:flex-[2] bg-[#222f3e] border border-white/10 rounded-xl px-3 py-3 text-white text-sm font-bold focus:outline-none focus:border-[#3390ec]/50 transition-colors [color-scheme:dark]"
            />
            <div className="flex items-center gap-2 sm:contents">
              <input
                type="time"
                value={form.timeStart}
                onChange={e => set("timeStart", e.target.value)}
                className="flex-1 sm:flex-1 bg-[#222f3e] border border-white/10 rounded-xl px-3 py-3 text-white text-sm font-bold focus:outline-none focus:border-[#3390ec]/50 transition-colors [color-scheme:dark]"
              />
              <span className="text-[#79828b] font-bold text-sm shrink-0">—</span>
              <input
                type="time"
                value={form.timeEnd}
                onChange={e => set("timeEnd", e.target.value)}
                className="flex-1 sm:flex-1 bg-[#222f3e] border border-white/10 rounded-xl px-3 py-3 text-white text-sm font-bold focus:outline-none focus:border-[#3390ec]/50 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>
        </Field>

        {/* Location */}
        <Field label="Location">
          <div className="flex items-center gap-2">
            <div className="relative flex-1" ref={locationRef}>
              <input
                type="text"
                value={form.location}
                onChange={e => { set("location", e.target.value); setLocationOpen(true); }}
                onFocus={() => setLocationOpen(true)}
                placeholder="Type or select venue..."
                className="w-full bg-[#222f3e] border border-white/10 rounded-xl px-4 py-3 pr-10 text-white text-sm font-bold placeholder:text-[#79828b]/60 focus:outline-none focus:border-[#3390ec]/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => setLocationOpen(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#79828b] hover:text-white transition-colors"
              >
                <ChevronDown size={16} className={`transition-transform ${locationOpen ? "rotate-180" : ""}`} />
              </button>
              {locationOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#17212b] border border-white/10 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.4)] z-20 overflow-hidden">
                  {LOCATIONS.filter(loc =>
                    !form.location || loc.toLowerCase().includes(form.location.toLowerCase())
                  ).map(loc => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => { set("location", loc); setLocationOpen(false); }}
                      className="flex items-center w-full px-4 py-2.5 text-sm font-bold text-white hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left"
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <a
              href={`https://www.google.com/maps/search/${encodeURIComponent(form.location || "sports venue")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-3 rounded-xl bg-[#222f3e] border border-white/10 text-[#79828b] hover:text-white hover:border-[#3390ec]/30 transition-all text-xs font-black shrink-0"
            >
              <MapPin size={14} />
              Maps
            </a>
          </div>
        </Field>

        {/* Entry Fee — 0 = free */}
        <Field label="Entry Fee">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={e => set("price", e.target.value)}
              placeholder="0"
              className="flex-1 bg-[#222f3e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-[#79828b]/60 focus:outline-none focus:border-[#3390ec]/50 transition-colors"
            />
            <span className="text-[#79828b] font-black text-sm">CZK</span>
          </div>
          {isFree && (
            <p className="text-[#4dcd5e] text-[11px] font-black mt-1.5 uppercase tracking-wider">Free event</p>
          )}
        </Field>

        {/* Max Players */}
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

        {/* Publish Schedule */}
        <Field label="Publish At">
          <input
            type="datetime-local"
            value={form.publishAt}
            onChange={e => set("publishAt", e.target.value)}
            className="w-full bg-[#222f3e] border border-white/10 rounded-xl px-3 py-3 text-white text-sm font-bold focus:outline-none focus:border-[#3390ec]/50 transition-colors [color-scheme:dark] min-w-0"
          />
          <button
            onClick={() => set("notifyBefore", !form.notifyBefore)}
            className={`flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-wider transition-all ${
              form.notifyBefore
                ? "bg-[#3390ec]/10 border-[#3390ec]/30 text-[#3390ec]"
                : "bg-[#222f3e] border-white/10 text-[#79828b] hover:border-white/20"
            }`}
          >
            {form.notifyBefore && <Check size={12} />}
            Notify 1 hour before publish
          </button>
        </Field>

        {/* Save */}
        <button
          onClick={handleSave}
          className="w-full py-3 rounded-xl font-bold text-sm transition-transform active:scale-[0.98] shadow-sm bg-[#3390ec] text-white"
        >
          {isEditMode ? "Save Changes" : "Save Event"}
        </button>
      </div>
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
