import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Check, ChevronDown } from "lucide-react";
import { SKILL_ORDER } from "../../data/adminData";
import { BackBar } from "../../components/ui/BackBar";
import { SelectField } from "../../components/ui/SelectField";
import { DatePickerField } from "../../components/ui/DatePickerField";
import { DropdownPanel } from "../../components/ui/DropdownMenu";
import { useAuth } from "../../lib/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { categoryImage } from "../../lib/eventImages";
import { useWaterRipple, RippleLayer } from "../../components/ui/useWaterRipple";

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

// Borderless field styles — used *inside* a FieldGroup card, which already
// supplies the background/border/rounding. Individual fields stay flush
// (no nested boxes) to match the grouped-list look used across the app.
const F_INPUT = "block w-full bg-transparent text-white text-sm font-bold placeholder:text-[#79828b] focus:outline-none";
const F_SEL   = "flex items-center justify-between gap-2 w-full text-white text-sm font-bold focus:outline-none cursor-pointer";

export function AdminCreateEvent() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const { user: authUser } = useAuth();
  const isEditMode = !!editId;
  const saveRipple = useWaterRipple();

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
    const { data, error } = await supabase.from("events")
      .insert({ ...payload, moderator_id: authUser.id, status: "draft" })
      .select("id")
      .single();

    setSaving(false);
    if (error || !data) { setError(error?.message ?? "Could not save event."); return; }

    setDone(true);
    setTimeout(() => navigate(`/admin/events/${data.id}`), 1200);
  }

  if (loadingEdit) return <div className="min-h-screen bg-[var(--surface-0)]" />;

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-[#4dcd5e]/10 border border-[#4dcd5e]/30 flex items-center justify-center">
          <Check size={28} className="text-[#4dcd5e]" />
        </div>
        <p className="text-white font-black text-lg uppercase tracking-widest">
          {isEditMode ? "Changes Saved!" : "Draft Saved!"}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface-0)] min-h-screen">
      <BackBar
        label={isEditMode ? "Event" : "Events"}
        to={isEditMode ? `/admin/events/${editId}` : "/admin/events"}
      />

      <div className="max-w-[640px] mx-auto px-4 py-5 flex flex-col gap-5">

        {error && (
          <div className="px-4 py-3 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] text-sm">
            {error}
          </div>
        )}

        {/* Title + Description */}
        <FieldGroup>
          <Field label="Event Title">
            <input type="text" value={f.title} onChange={e => { setTitleTouched(true); s("title", e.target.value); }}
              placeholder="e.g. PRO-AM INVITATIONAL #13" className={F_INPUT} />
          </Field>
          <Field label="Description">
            <textarea value={f.description} onChange={e => s("description", e.target.value)}
              placeholder="Event details, rules, notes..." rows={2}
              className={`${F_INPUT} resize-none`} />
          </Field>
        </FieldGroup>

        {/* Image — auto-picked from category, no upload yet */}
        <div>
          <span className="block text-[#79828b] text-[11px] font-black uppercase tracking-widest mb-2">Event Image</span>
          <div className="w-full h-28 rounded-2xl overflow-hidden bg-[var(--surface-1)] border border-white/10">
            <img src={image} alt="" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Category + Level */}
        <FieldGroup className={`grid ${showLevel ? "grid-cols-2 divide-x divide-white/5" : "grid-cols-1"}`}>
          <Field label="Category">
            <SelectField value={f.category} options={CATEGORIES} onChange={v => s("category", v)} triggerClassName={F_SEL} />
          </Field>
          {showLevel && (
            <Field label="Level">
              <SelectField value={f.level} options={SKILL_ORDER} onChange={v => s("level", v)} triggerClassName={F_SEL} />
            </Field>
          )}
        </FieldGroup>

        {/* Scheduling — date, location, times, fee, capacity all together */}
        <FieldGroup>
          <Field label="Date">
            <DatePickerField value={f.date} onChange={v => s("date", v)} triggerClassName={F_SEL} />
          </Field>

          <Field label="Location" className="relative">
            <input type="text" value={f.location}
              onChange={e => { s("location", e.target.value); setLocationOpen(true); }}
              onFocus={() => setLocationOpen(true)}
              onBlur={() => setTimeout(() => setLocationOpen(false), 150)}
              placeholder="Type or select venue..."
              className={`${F_INPUT} pr-6`} />
            <button type="button" onClick={() => setLocationOpen(v => !v)}
              className="absolute right-4 bottom-3 text-[#79828b] hover:text-white transition-colors focus:outline-none">
              <ChevronDown size={15} className={`transition-transform ${locationOpen ? "rotate-180" : ""}`} />
            </button>
            {locationOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-30">
                <DropdownPanel scrollable>
                  {locations.filter(l => !f.location || l.toLowerCase().includes(f.location.toLowerCase())).map(l => (
                    <button key={l} type="button" onClick={() => { s("location", l); setLocationOpen(false); }}
                      className="block w-full px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--surface-active)] transition-colors text-left focus:outline-none">
                      {l}
                    </button>
                  ))}
                </DropdownPanel>
              </div>
            )}
          </Field>

          <Field label="Start Time">
            <div className="flex items-center gap-1">
              <div className="flex-1"><SelectField value={f.startH} options={HOURS} onChange={v => s("startH", v)} triggerClassName={F_SEL} /></div>
              <span className="text-[#79828b] font-bold text-sm shrink-0">:</span>
              <div className="flex-1"><SelectField value={f.startM} options={MINUTES} onChange={v => s("startM", v)} triggerClassName={F_SEL} /></div>
            </div>
          </Field>

          <Field label="End Time">
            <div className="flex items-center gap-1">
              <div className="flex-1"><SelectField value={f.endH} options={HOURS} onChange={v => s("endH", v)} triggerClassName={F_SEL} /></div>
              <span className="text-[#79828b] font-bold text-sm shrink-0">:</span>
              <div className="flex-1"><SelectField value={f.endM} options={MINUTES} onChange={v => s("endM", v)} triggerClassName={F_SEL} /></div>
            </div>
          </Field>

          <Field label="Entry Fee" className="relative">
            <input type="number" min="0" value={f.price} onChange={e => s("price", e.target.value)}
              placeholder="FREE" className={`${F_INPUT} pr-10`} />
            <span className="absolute right-4 bottom-3 text-[#79828b]/40 text-sm font-black pointer-events-none select-none">CZK</span>
          </Field>

          <Field label="Max Players *" required>
            <input type="number" min="2" max="100" required value={f.capacity}
              onChange={e => s("capacity", e.target.value)}
              placeholder="12" className={F_INPUT} />
          </Field>
        </FieldGroup>

        {/* Save — Back lives in the header (BackBar) already, no need to repeat it here */}
        <button type="button" onClick={handleSave} disabled={saving} onPointerDown={saveRipple.onPointerDown}
          className="relative overflow-hidden w-full py-4 rounded-2xl font-bold text-base bg-[#462ed1] text-white focus:outline-none disabled:opacity-50">
          {saving ? "…" : isEditMode ? "Save Changes" : "Save as Draft"}
          <RippleLayer ripples={saveRipple.ripples} />
        </button>

      </div>
    </div>
  );
}

function FieldGroup({ children, className = "divide-y divide-white/5" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[var(--surface-1)] rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

function Field({ label, children, required, className = "" }: { label: string; children: React.ReactNode; required?: boolean; className?: string }) {
  return (
    <div className={`group px-4 py-3 ${className}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[11px] font-black uppercase tracking-widest transition-colors ${
          required ? "text-[#462ed1]" : "text-[#79828b] group-focus-within:text-[#462ed1]"
        }`}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}
