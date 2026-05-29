import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { Check, MapPin, Bell, ImageIcon, FolderOpen, ChevronDown } from "lucide-react";
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

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

const SEL = "block w-full h-12 bg-[#222f3e] border border-white/10 rounded-xl px-3 pr-8 text-white text-sm font-bold focus:outline-none focus:border-[#3390ec]/50 transition-colors appearance-none cursor-pointer [color-scheme:dark]";
const INP = "block w-full h-12 bg-[#222f3e] border border-white/10 rounded-xl px-4 text-white text-sm font-bold placeholder:text-[#79828b] focus:outline-none focus:border-[#3390ec]/50 transition-colors";

export function AdminCreateEvent() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const editEvent = editId ? ADMIN_EVENTS.find(e => e.id === editId) : null;
  const isEditMode = !!editEvent;

  const [done, setDone] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [customImage, setCustomImage] = useState(false);
  const [image, setImage] = useState<string>(() => CATEGORY_IMAGES["GAMES"][0]);
  const locationRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) setLocationOpen(false);
      if (imageRef.current && !imageRef.current.contains(e.target as Node)) setImageOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const parseTime = (t: string) => ({ h: t.split(":")[0] ?? "20", m: t.split(":")[1] ?? "00" });
  const startTime = editEvent ? parseTime(editEvent.time.split(" - ")[0] ?? "20:00") : { h: "20", m: "00" };
  const endTime   = editEvent ? parseTime(editEvent.time.split(" - ")[1] ?? "22:00") : { h: "22", m: "00" };

  const [f, setF] = useState({
    title:       editEvent?.title ?? "",
    description: editEvent?.description ?? "",
    category:    editEvent?.category ?? "GAMES",
    level:       "Rookie",
    location:    editEvent?.location ?? "",
    price:       editEvent && editEvent.price > 0 ? String(editEvent.price) : "",
    capacity:    editEvent ? String(editEvent.capacity) : "",
    date: "",
    startH: startTime.h, startM: startTime.m,
    endH:   endTime.h,   endM:   endTime.m,
    pubDate: "",
    pubH: "", pubM: "00",
    notify: false,
  });

  useEffect(() => {
    if (!customImage) {
      const imgs = CATEGORY_IMAGES[f.category] ?? [];
      if (imgs.length) setImage(imgs[0]);
    }
  }, [f.category]);

  const s = (k: string, v: string | boolean) => setF(p => ({ ...p, [k]: v }));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImage(URL.createObjectURL(file)); setCustomImage(true); setImageOpen(false); }
  };

  const showLevel = f.category === "GAMES" || f.category === "TRAININGS";
  const hasPublish = !!f.pubDate;

  const publishAt = hasPublish
    ? `${f.pubDate}T${f.pubH || "00"}:${f.pubM}`
    : "";
  const isScheduled = !!publishAt && new Date(publishAt) > new Date();

  function handleSave() {
    setDone(true);
    setTimeout(() => navigate(isEditMode ? `/admin/events/${editId}` : "/admin/events"), 1200);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-[#4dcd5e]/10 border border-[#4dcd5e]/30 flex items-center justify-center">
          <Check size={28} className="text-[#4dcd5e]" />
        </div>
        <p className="text-white font-black text-lg uppercase tracking-widest">
          {isScheduled ? "Event Scheduled!" : isEditMode ? "Changes Saved!" : "Event Saved!"}
        </p>
        {isScheduled && <p className="text-[#79828b] text-sm">Publishes {new Date(publishAt).toLocaleString()}</p>}
      </div>
    );
  }

  return (
    <div className="bg-[#0e1621] min-h-screen">
      <BackBar
        label={isEditMode ? "Event" : "Events"}
        to={isEditMode ? `/admin/events/${editId}` : "/admin/events"}
      />

      <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-5 flex flex-col gap-5">

        {/* Title */}
        <Row label="Event Title">
          <input type="text" value={f.title} onChange={e => s("title", e.target.value)}
            placeholder="e.g. PRO-AM INVITATIONAL #13" className={INP} />
        </Row>

        {/* Description */}
        <Row label="Description">
          <textarea value={f.description} onChange={e => s("description", e.target.value)}
            placeholder="Event details, rules, notes..." rows={3}
            className="block w-full bg-[#222f3e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-[#79828b] focus:outline-none focus:border-[#3390ec]/50 transition-colors resize-none" />
        </Row>

        {/* Image */}
        <Row label="Event Image">
          <div className="relative" ref={imageRef}>
            <div className="w-full h-28 rounded-xl overflow-hidden bg-[#222f3e] border border-white/10 mb-2">
              {image
                ? <img src={image} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={22} className="text-[#79828b]" /></div>
              }
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setImageOpen(v => !v)}
                className="flex items-center justify-center gap-1.5 flex-1 h-9 bg-[#222f3e] border border-white/10 rounded-xl text-[#79828b] hover:text-white text-[11px] font-black uppercase tracking-wider transition-colors">
                <ChevronDown size={12} className={`transition-transform ${imageOpen ? "rotate-180" : ""}`} />
                Preset
              </button>
              <label className="flex items-center justify-center gap-1.5 flex-1 h-9 bg-[#222f3e] border border-white/10 rounded-xl text-[#79828b] hover:text-white text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer">
                <FolderOpen size={12} />
                Browse
                <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </label>
            </div>
            {imageOpen && (
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] bg-[#17212b] border border-white/10 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.4)] z-20 p-2.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#79828b] mb-2">{f.category}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(CATEGORY_IMAGES[f.category] ?? []).map((img, i) => (
                    <button key={i} type="button"
                      onClick={() => { setImage(img); setCustomImage(false); setImageOpen(false); }}
                      className={`relative w-full h-20 rounded-lg overflow-hidden border-2 transition-all ${img === image && !customImage ? "border-[#3390ec]" : "border-transparent hover:border-white/30"}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      {img === image && !customImage && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#3390ec]/20">
                          <Check size={14} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Row>

        {/* Category + Level */}
        <div className={`grid gap-3 ${showLevel ? "grid-cols-2" : "grid-cols-1"}`}>
          <Row label="Category">
            <div className="relative">
              <select value={f.category} onChange={e => s("category", e.target.value)} className={SEL}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#79828b] pointer-events-none" />
            </div>
          </Row>
          {showLevel && (
            <Row label="Level">
              <div className="relative">
                <select value={f.level} onChange={e => s("level", e.target.value)} className={SEL}>
                  {SKILL_ORDER.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#79828b] pointer-events-none" />
              </div>
            </Row>
          )}
        </div>

        {/* Date */}
        <Row label="Date">
          <div className="overflow-hidden rounded-xl">
            <input type="date" value={f.date} onChange={e => s("date", e.target.value)}
              className="block w-full h-12 bg-[#222f3e] border border-white/10 rounded-xl px-3 text-white text-sm font-bold focus:outline-none focus:border-[#3390ec]/50 transition-colors [color-scheme:dark]" />
          </div>
        </Row>

        {/* Start Time + End Time — hour : minute selects */}
        <div className="grid grid-cols-2 gap-3">
          <Row label="Start Time">
            <div className="flex items-center gap-1">
              <div className="relative flex-1">
                <select value={f.startH} onChange={e => s("startH", e.target.value)} className={SEL}>
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#79828b] pointer-events-none" />
              </div>
              <span className="text-[#79828b] font-bold text-sm shrink-0">:</span>
              <div className="relative flex-1">
                <select value={f.startM} onChange={e => s("startM", e.target.value)} className={SEL}>
                  {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#79828b] pointer-events-none" />
              </div>
            </div>
          </Row>
          <Row label="End Time">
            <div className="flex items-center gap-1">
              <div className="relative flex-1">
                <select value={f.endH} onChange={e => s("endH", e.target.value)} className={SEL}>
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#79828b] pointer-events-none" />
              </div>
              <span className="text-[#79828b] font-bold text-sm shrink-0">:</span>
              <div className="relative flex-1">
                <select value={f.endM} onChange={e => s("endM", e.target.value)} className={SEL}>
                  {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#79828b] pointer-events-none" />
              </div>
            </div>
          </Row>
        </div>

        {/* Location */}
        <Row label="Location">
          <div className="flex gap-2" ref={locationRef}>
            <div className="relative flex-1 min-w-0">
              <input type="text" value={f.location}
                onChange={e => { s("location", e.target.value); setLocationOpen(true); }}
                onFocus={() => setLocationOpen(true)}
                placeholder="Type or select venue..."
                className={INP + " pr-10"} />
              <button type="button" onClick={() => setLocationOpen(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#79828b] hover:text-white transition-colors">
                <ChevronDown size={15} className={`transition-transform ${locationOpen ? "rotate-180" : ""}`} />
              </button>
              {locationOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#17212b] border border-white/10 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.4)] z-20 overflow-hidden">
                  {LOCATIONS.filter(l => !f.location || l.toLowerCase().includes(f.location.toLowerCase())).map(l => (
                    <button key={l} type="button" onClick={() => { s("location", l); setLocationOpen(false); }}
                      className="block w-full px-4 py-2.5 text-sm font-bold text-white hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left">
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <a href={`https://www.google.com/maps/search/${encodeURIComponent(f.location || "sports venue")}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 h-12 rounded-xl bg-[#222f3e] border border-white/10 text-[#79828b] hover:text-white text-xs font-black shrink-0 transition-colors">
              <MapPin size={14} />
              Maps
            </a>
          </div>
        </Row>

        {/* Entry Fee + Max Players */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Row label="Entry Fee">
            <div className="relative">
              <input type="number" min="0" value={f.price} onChange={e => s("price", e.target.value)}
                placeholder="FREE" className={INP + " pr-14"} />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#79828b]/40 text-sm font-black pointer-events-none select-none">CZK</span>
            </div>
          </Row>
          <Row label="Max Players">
            <input type="number" min="2" max="100" value={f.capacity}
              onChange={e => s("capacity", e.target.value)}
              placeholder="12" className={INP} />
          </Row>
        </div>

        {/* Publish At */}
        <Row
          label="Publish At"
          action={
            <button type="button" onClick={() => s("notify", !f.notify)}
              title="Notify 1 hour before publish"
              className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-all ${f.notify ? "bg-[#3390ec]/10 border-[#3390ec]/30 text-[#3390ec]" : "bg-[#222f3e] border-white/10 text-[#79828b] hover:border-white/20 hover:text-white"}`}>
              <Bell size={13} />
            </button>
          }
        >
          {/* Publish date */}
          <div className="overflow-hidden rounded-xl mb-2">
            <input type="date" value={f.pubDate} onChange={e => s("pubDate", e.target.value)}
              className="block w-full h-12 bg-[#222f3e] border border-white/10 rounded-xl px-3 text-white text-sm font-bold focus:outline-none focus:border-[#3390ec]/50 transition-colors [color-scheme:dark]" />
          </div>
          {/* Publish time: hour : minute */}
          <div className="flex items-center gap-1">
            <div className="relative flex-1">
              <select value={f.pubH} onChange={e => s("pubH", e.target.value)} className={SEL}>
                <option value="">Hour</option>
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#79828b] pointer-events-none" />
            </div>
            <span className="text-[#79828b] font-bold text-sm shrink-0">:</span>
            <div className="relative flex-1">
              <select value={f.pubM} onChange={e => s("pubM", e.target.value)} className={SEL}>
                {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#79828b] pointer-events-none" />
            </div>
          </div>
        </Row>

        {/* Cancel + Save */}
        <div className="flex gap-3 pt-1">
          <button type="button"
            onClick={() => navigate(isEditMode ? `/admin/events/${editId}` : "/admin/events")}
            className="flex-1 py-3.5 rounded-xl font-bold text-sm border border-white/10 text-[#79828b] hover:text-white transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSave}
            className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-[#3390ec] text-white active:scale-[0.98] transition-transform">
            {isEditMode ? "Save Changes" : "Save Event"}
          </button>
        </div>

      </div>
    </div>
  );
}

function Row({ label, children, action }: { label: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#79828b] text-[11px] font-black uppercase tracking-widest">{label}</span>
        {action}
      </div>
      {children}
    </div>
  );
}
