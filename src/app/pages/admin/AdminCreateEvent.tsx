import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { ChevronDown, Check, MapPin, Bell, ImageIcon, FolderOpen } from "lucide-react";
import { SKILL_ORDER, ADMIN_EVENTS } from "../../data/adminData";
import { BackBar } from "../../components/ui/BackBar";

const CATEGORIES = ["GAMES", "TOURNAMENT", "TRAININGS", "BEACH", "EVENTS"];

const LOCATIONS = [
  "PRIME Sports Hall",
  "Cyber Arena, Sector 4",
  "Beach Court A",
  "Indoor Arena West",
  "East Side Courts",
  "Central Sports Hub",
];

const CATEGORY_IMAGES: Record<string, string[]> = {
  GAMES: [
    "https://images.unsplash.com/photo-1547347298-4074fc3086f0?w=800&h=400&fit=crop",
    "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&h=400&fit=crop",
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=400&fit=crop",
    "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&h=400&fit=crop",
  ],
  TOURNAMENT: [
    "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&h=400&fit=crop",
    "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=400&fit=crop",
    "https://images.unsplash.com/photo-1607462109225-6b64ae2dd3cb?w=800&h=400&fit=crop",
    "https://images.unsplash.com/photo-1540747913346-19212a4cf528?w=800&h=400&fit=crop",
  ],
  TRAININGS: [
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=400&fit=crop",
    "https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800&h=400&fit=crop",
    "https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=800&h=400&fit=crop",
    "https://images.unsplash.com/photo-1541534401786-2077eed87a74?w=800&h=400&fit=crop",
  ],
  BEACH: [
    "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=400&fit=crop",
    "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=400&fit=crop",
    "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=400&fit=crop",
    "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&h=400&fit=crop",
  ],
  EVENTS: [
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=400&fit=crop",
    "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=800&h=400&fit=crop",
    "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=400&fit=crop",
    "https://images.unsplash.com/photo-1540747913346-19212a4cf528?w=800&h=400&fit=crop",
  ],
};

export function AdminCreateEvent() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const editEvent = editId ? ADMIN_EVENTS.find(e => e.id === editId) : null;
  const isEditMode = !!editEvent;

  const [saved, setSaved] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [imageDropdownOpen, setImageDropdownOpen] = useState(false);
  const [eventImage, setEventImage] = useState<string>(() => CATEGORY_IMAGES["GAMES"][0]);
  const [isCustomImage, setIsCustomImage] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);
  const imageDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setLocationOpen(false);
      }
      if (imageDropdownRef.current && !imageDropdownRef.current.contains(e.target as Node)) {
        setImageDropdownOpen(false);
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
        publishDate: "",
        publishTime: "",
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
      publishDate: "",
      publishTime: "",
      notifyBefore: false,
    };
  });

  // Auto-select first preset when category changes (unless user picked a custom image)
  useEffect(() => {
    if (!isCustomImage) {
      const presets = CATEGORY_IMAGES[form.category] ?? [];
      if (presets.length > 0) setEventImage(presets[0]);
    }
  }, [form.category]);

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleCustomImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setEventImage(URL.createObjectURL(file));
      setIsCustomImage(true);
      setImageDropdownOpen(false);
    }
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => navigate(isEditMode ? `/admin/events/${editId}` : "/admin/events"), 1200);
  }

  const publishAt = form.publishDate
    ? form.publishTime ? `${form.publishDate}T${form.publishTime}` : form.publishDate
    : "";
  const isScheduled = !!publishAt && new Date(publishAt) > new Date();
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
            Publishes {new Date(publishAt).toLocaleString()}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-hidden">
      <BackBar
        label={isEditMode ? "Event" : "Events"}
        to={isEditMode ? `/admin/events/${editId}` : "/admin/events"}
      />

      <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col gap-5">

          {/* Title */}
          <Field label="Event Title">
            <input
              type="text"
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="e.g. PRO-AM INVITATIONAL #13"
              className="w-full h-12 bg-[#222f3e] border border-white/10 rounded-md px-4 text-white text-sm font-bold placeholder:text-[#79828b]/60 focus:outline-none focus:border-[#3390ec]/50 transition-colors"
            />
          </Field>

          {/* Description */}
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Event details, rules, notes..."
              rows={3}
              className="w-full bg-[#222f3e] border border-white/10 rounded-md px-4 py-3 text-white text-sm font-bold placeholder:text-[#79828b]/60 focus:outline-none focus:border-[#3390ec]/50 transition-colors resize-none"
            />
          </Field>

          {/* Event Image */}
          <Field label="Event Image">
            <div className="relative" ref={imageDropdownRef}>
              {/* Banner preview */}
              <div className="w-full h-32 rounded-md overflow-hidden bg-[#222f3e] border border-white/10 mb-2">
                {eventImage ? (
                  <img src={eventImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={24} className="text-[#79828b]" />
                  </div>
                )}
              </div>
              {/* Controls */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImageDropdownOpen(v => !v)}
                  className="flex items-center justify-center gap-1.5 flex-1 bg-[#222f3e] border border-white/10 rounded-md px-3 py-2 text-[#79828b] hover:text-white text-[11px] font-black uppercase tracking-wider transition-colors"
                >
                  <ChevronDown size={13} className={`transition-transform ${imageDropdownOpen ? "rotate-180" : ""}`} />
                  Preset
                </button>
                <label className="flex items-center justify-center gap-1.5 flex-1 bg-[#222f3e] border border-white/10 rounded-md px-3 py-2 text-[#79828b] hover:text-white text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer">
                  <FolderOpen size={13} />
                  Browse
                  <input type="file" accept="image/*" className="hidden" onChange={handleCustomImage} />
                </label>
              </div>
              {/* Preset grid dropdown */}
              {imageDropdownOpen && (
                <div className="absolute left-0 right-0 top-[calc(100%+4px)] bg-[#17212b] border border-white/10 rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.4)] z-20 p-2.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#79828b] mb-2 px-0.5">{form.category}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(CATEGORY_IMAGES[form.category] ?? []).map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setEventImage(img); setIsCustomImage(false); setImageDropdownOpen(false); }}
                        className={`relative w-full h-20 rounded overflow-hidden border-2 transition-all ${
                          eventImage === img && !isCustomImage
                            ? "border-[#3390ec]"
                            : "border-transparent hover:border-white/30"
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        {eventImage === img && !isCustomImage && (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#3390ec]/20">
                            <Check size={14} className="text-white drop-shadow" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Field>

          {/* Category + Level — same row, level only for GAMES/TRAININGS */}
          <div className={`grid gap-3 ${showLevel ? "grid-cols-2" : "grid-cols-1"}`}>
            <Field label="Category">
              <div className="relative">
                <select
                  value={form.category}
                  onChange={e => set("category", e.target.value)}
                  className="w-full h-12 bg-[#222f3e] border border-white/10 rounded-md px-4 pr-10 text-white text-sm font-bold focus:outline-none focus:border-[#3390ec]/50 transition-colors [color-scheme:dark] appearance-none cursor-pointer"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#79828b] pointer-events-none" />
              </div>
            </Field>
            {showLevel && (
              <Field label="Level">
                <div className="relative">
                  <select
                    value={form.levelRequired}
                    onChange={e => set("levelRequired", e.target.value)}
                    className="w-full h-12 bg-[#222f3e] border border-white/10 rounded-md px-4 pr-10 text-white text-sm font-bold focus:outline-none focus:border-[#3390ec]/50 transition-colors [color-scheme:dark] appearance-none cursor-pointer"
                  >
                    {SKILL_ORDER.map(lvl => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#79828b] pointer-events-none" />
                </div>
              </Field>
            )}
          </div>

          {/* Date & Time */}
          <Field label="Date & Time">
            <div className="flex flex-col gap-2 w-full overflow-hidden">
              <input
                type="date"
                value={form.date}
                onChange={e => set("date", e.target.value)}
                className="w-full min-w-0 h-12 bg-[#222f3e] border border-white/10 rounded-md px-3 text-white text-sm font-bold focus:outline-none focus:border-[#3390ec]/50 transition-colors [color-scheme:dark]"
              />
              <div className="grid items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)" }}>
                <input
                  type="time"
                  step="900"
                  value={form.timeStart}
                  onChange={e => set("timeStart", e.target.value)}
                  className="w-full min-w-0 h-12 bg-[#222f3e] border border-white/10 rounded-md px-3 text-white text-sm font-bold focus:outline-none focus:border-[#3390ec]/50 transition-colors [color-scheme:dark]"
                />
                <span className="text-[#79828b] font-bold text-sm">—</span>
                <input
                  type="time"
                  step="900"
                  value={form.timeEnd}
                  onChange={e => set("timeEnd", e.target.value)}
                  className="w-full min-w-0 h-12 bg-[#222f3e] border border-white/10 rounded-md px-3 text-white text-sm font-bold focus:outline-none focus:border-[#3390ec]/50 transition-colors [color-scheme:dark]"
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
                  className="w-full h-12 bg-[#222f3e] border border-white/10 rounded-md px-4 pr-10 text-white text-sm font-bold placeholder:text-[#79828b]/60 focus:outline-none focus:border-[#3390ec]/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setLocationOpen(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#79828b] hover:text-white transition-colors"
                >
                  <ChevronDown size={16} className={`transition-transform ${locationOpen ? "rotate-180" : ""}`} />
                </button>
                {locationOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#17212b] border border-white/10 rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.4)] z-20 overflow-hidden">
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
                className="flex items-center gap-1.5 px-3 h-12 rounded-md bg-[#222f3e] border border-white/10 text-[#79828b] hover:text-white hover:border-[#3390ec]/30 transition-all text-xs font-black shrink-0"
              >
                <MapPin size={14} />
                Maps
              </a>
            </div>
          </Field>

          {/* Entry Fee + Max Players */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Field label="Entry Fee">
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={e => set("price", e.target.value)}
                    placeholder="0"
                    className="w-full h-12 bg-[#222f3e] border border-white/10 rounded-md px-4 pr-14 text-white text-sm font-bold placeholder:text-[#79828b]/60 focus:outline-none focus:border-[#3390ec]/50 transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#79828b]/40 text-sm font-black pointer-events-none select-none">CZK</span>
                </div>
                {isFree && (
                  <p className="text-[#4dcd5e] text-[11px] font-black mt-1.5 uppercase tracking-wider">Free event</p>
                )}
              </Field>
            </div>
            <div>
              <Field label="Max Players">
                <input
                  type="number"
                  min="2"
                  max="100"
                  value={form.capacity}
                  onChange={e => set("capacity", e.target.value)}
                  className="w-full h-12 bg-[#222f3e] border border-white/10 rounded-md px-4 text-white text-sm font-bold focus:outline-none focus:border-[#3390ec]/50 transition-colors"
                />
              </Field>
            </div>
          </div>

          {/* Publish Schedule — date + time on one row, bell in label row */}
          <Field
            label="Publish At"
            action={
              <button
                onClick={() => set("notifyBefore", !form.notifyBefore)}
                title="Notify 1 hour before publish"
                className={`flex items-center justify-center w-7 h-7 rounded-md border transition-all shrink-0 ${
                  form.notifyBefore
                    ? "bg-[#3390ec]/10 border-[#3390ec]/30 text-[#3390ec]"
                    : "bg-[#222f3e] border-white/10 text-[#79828b] hover:border-white/20 hover:text-white"
                }`}
              >
                <Bell size={13} />
              </button>
            }
          >
            <div className="flex gap-2 w-full overflow-hidden">
              <input
                type="date"
                value={form.publishDate}
                onChange={e => set("publishDate", e.target.value)}
                className="flex-1 min-w-0 h-12 bg-[#222f3e] border border-white/10 rounded-md px-3 text-white text-sm font-bold focus:outline-none focus:border-[#3390ec]/50 transition-colors [color-scheme:dark]"
              />
              <input
                type="time"
                step="900"
                value={form.publishTime}
                onChange={e => set("publishTime", e.target.value)}
                className="flex-1 min-w-0 h-12 bg-[#222f3e] border border-white/10 rounded-md px-3 text-white text-sm font-bold focus:outline-none focus:border-[#3390ec]/50 transition-colors [color-scheme:dark]"
              />
            </div>
          </Field>

          {/* Save / Cancel */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/admin/events")}
              className="flex-1 py-3 rounded-md font-bold text-sm border border-white/10 text-[#79828b] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 rounded-md font-bold text-sm transition-transform active:scale-[0.98] bg-[#3390ec] text-white"
            >
              {isEditMode ? "Save Changes" : "Save Event"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

function Field({ label, children, action }: { label: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[#79828b] text-[11px] font-black uppercase tracking-widest">{label}</label>
        {action}
      </div>
      {children}
    </div>
  );
}
