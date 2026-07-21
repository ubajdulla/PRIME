import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Check, ChevronDown } from "lucide-react";
import { SKILL_ORDER } from "../../data/adminData";
import { BackBar } from "../../components/ui/BackBar";
import { useAuth } from "../../lib/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { categoryImage } from "../../lib/eventImages";

const CATEGORIES = ["GAMES", "TOURNAMENT", "TRAININGS", "BEACH", "EVENTS"];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

function suggestedTitle(category: string, level: string): string {
  const isAdvancedPlus = SKILL_ORDER.indexOf(level as (typeof SKILL_ORDER)[number]) >= SKILL_ORDER.indexOf("Advanced");
  if (category === "GAMES")     return isAdvancedPlus ? "GAME 5-1" : "GAME";
  if (category === "TRAININGS") return isAdvancedPlus ? "Advanced training" : "Training";
  if (category === "BEACH")     return isAdvancedPlus ? "Beach advanced" : "Beach";
  return "";
}

const SEL = "block w-full h-12 bg-[#222f3e] border border-white/10 rounded-xl px-3 pr-8 text-white text-sm font-bold focus:outline-none focus:border-[#3390ec]/50 transition-colors appearance-none cursor-pointer [color-scheme:dark]";
const INP = "block w-full h-12 bg-[#222f3e] border border-white/10 rounded-xl px-4 text-white text-sm font-bold placeholder:text-[#79828b] focus:outline-none focus:border-[#3390ec]/50 transition-colors";

export function AdminCreateEvent() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const { user: authUser } = useAuth();
  const isEditMode = !!editId;

  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEditMode);
  const [titleTouched, setTitleTouched] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("locations").select("name").order("created_at");
      if (data) setLocations(data.map(l => l.name));
    })();
  }, []);

  const [f, setF] = useState({
    title: suggestedTitle("GAMES", "Rookie"), description: "", category: "GAMES", level: "Rookie", location: "",
    price: "150", capacity: "12", date: "",
    startH: "00", startM: "00", endH: "00", endM: "00",
  });

  useEffect(() => {
    if (isEditMode || titleTouched) return;
    setF(p => ({ ...p, title: suggestedTitle(p.category, p.level) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.category, f.level, isEditMode, titleTouched]);

  useEffect(() => {
    if (!editId) return;
    let active = true;
    (async () => {
      const { data } = await supabase.from("events").select("*").eq("id", editId).single();
      if (!active || !data) { setLoadingEdit(false); return; }
      const parseTime = (t: string) => ({ h: t.split(":")[0] ?? "20", m: t.split(":")[1] ?? "00" });
      const [startPart, endPart] = (data.event_time as string).split(" - ");
      const startTime = parseTime(startPart ?? "20:00");
      const endTime = parseTime(endPart ?? "22:00");
      setF({
        title: data.title ?? "",
        description: data.description ?? "",
        category: data.category ?? "GAMES",
        level: data.level ?? "Rookie",
        location: data.location ?? "",
        price: data.price > 0 ? String(data.price) : "",
        capacity: data.capacity ? String(data.capacity) : "",
        date: data.event_date ?? "",
        startH: startTime.h, startM: startTime.m,
        endH: endTime.h, endM: endTime.m,
      });
      setLoadingEdit(false);
    })();
    return () => { active = false; };
  }, [editId]);

  const s = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const showLevel = f.category === "GAMES" || f.category === "TRAININGS" || f.category === "BEACH";
  const image = categoryImage(f.category);

  async function handleSave() {
    const capacityNum = f.capacity ? parseInt(f.capacity, 10) : 0;
    if (!capacityNum || capacityNum < 2) {
      setError("Max Players is required (minimum 2).");
      return;
    }

    const priceNum = f.price ? parseInt(f.price, 10) : 0;
    const payload = {
      title: f.title,
      description: f.description,
      category: f.category,
      level: showLevel ? f.level : null,
      event_date: f.date,
      event_time: `${f.startH}:${f.startM} - ${f.endH}:${f.endM}`,
      location: f.location,
      price: priceNum,
      price_label: priceNum > 0 ? `${priceNum} CZK` : "FREE",
      capacity: capacityNum,
    };

    setError(null);
    setSaving(true);

    if (isEditMode) {
      const { error } = await supabase.from("events").update(payload).eq("id", editId);
      setSaving(false);
      if (error) { setError(error.message); return; }
      setDone(true);
      setTimeout(() => navigate(`/admin/events/${editId}`), 1200);
      return;
    }

    if (!authUser) return;
    const { error } = await supabase.from("events").insert({ ...payload, moderator_id: authUser.id, status: "upcoming" });

    setSaving(false);
    if (error) { setError(error.message); return; }

    setDone(true);
    setTimeout(() => navigate("/admin/events"), 1200);
  }

  if (loadingEdit) return <div className="min-h-screen bg-[#0e1621]" />;

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-[#4dcd5e]/10 border border-[#4dcd5e]/30 flex items-center justify-center">
          <Check size={28} className="text-[#4dcd5e]" />
        </div>
        <p className="text-white font-black text-lg uppercase tracking-widest">
          {isEditMode ? "Changes Saved!" : "Event Saved!"}
        </p>
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

        {error && (
          <div className="px-4 py-3 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] text-sm">
            {error}
          </div>
        )}

        {/* Title */}
        <Row label="Event Title">
          <input type="text" value={f.title} onChange={e => { setTitleTouched(true); s("title", e.target.value); }}
            placeholder="e.g. PRO-AM INVITATIONAL #13" className={INP} />
        </Row>

        {/* Description */}
        <Row label="Description">
          <textarea value={f.description} onChange={e => s("description", e.target.value)}
            placeholder="Event details, rules, notes..." rows={3}
            className="block w-full bg-[#222f3e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-[#79828b] focus:outline-none focus:border-[#3390ec]/50 transition-colors resize-none" />
        </Row>

        {/* Image — auto-picked from category, no upload yet */}
        <Row label="Event Image">
          <div className="w-full h-28 rounded-xl overflow-hidden bg-[#222f3e] border border-white/10">
            <img src={image} alt="" className="w-full h-full object-cover" />
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
          <div className="relative">
            <input type="text" value={f.location}
              onChange={e => { s("location", e.target.value); setLocationOpen(true); }}
              onFocus={() => setLocationOpen(true)}
              onBlur={() => setTimeout(() => setLocationOpen(false), 150)}
              placeholder="Type or select venue..."
              className={INP + " pr-10"} />
            <button type="button" onClick={() => setLocationOpen(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#79828b] hover:text-white transition-colors">
              <ChevronDown size={15} className={`transition-transform ${locationOpen ? "rotate-180" : ""}`} />
            </button>
            {locationOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-[#17212b] border border-white/10 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.4)] z-30 overflow-y-auto max-h-64">
                {locations.filter(l => !f.location || l.toLowerCase().includes(f.location.toLowerCase())).map(l => (
                  <button key={l} type="button" onClick={() => { s("location", l); setLocationOpen(false); }}
                    className="block w-full px-4 py-2.5 text-sm font-bold text-white hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left">
                    {l}
                  </button>
                ))}
              </div>
            )}
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
          <Row label="Max Players *">
            <input type="number" min="2" max="100" required value={f.capacity}
              onChange={e => s("capacity", e.target.value)}
              placeholder="12" className={INP} />
          </Row>
        </div>

        {/* Cancel + Save */}
        <div className="flex gap-3 pt-1">
          <button type="button"
            onClick={() => navigate(isEditMode ? `/admin/events/${editId}` : "/admin/events")}
            className="flex-1 py-3.5 rounded-xl font-bold text-sm border border-white/10 text-[#79828b] hover:text-white transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-[#3390ec] text-white transition-transform disabled:opacity-50">
            {saving ? "…" : isEditMode ? "Save Changes" : "Save Event"}
          </button>
        </div>

      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#79828b] text-[11px] font-black uppercase tracking-widest">{label}</span>
      </div>
      {children}
    </div>
  );
}
