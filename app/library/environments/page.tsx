"use client";
import { useState, ReactNode } from "react";
import Page from "@/components/Page";
import { Modal, Field, Toggle, useMounted, copy } from "@/components/ui";
import LibraryGroups from "@/components/LibraryGroups";
import { useLibrary, newId } from "@/lib/store/library";
import { downloadJSON } from "@/lib/utils";
import type { EnvironmentItem } from "@/lib/types";
import { Plus, Search, Copy, Pencil, Trash2, Download, ImagePlus } from "lucide-react";

const blank = (): EnvironmentItem => ({
  id: newId(),
  name: "",
  category: "Outdoor",
  description: "",
  lighting: "Golden Hour",
  mood: "Cinematic",
  timeOfDay: "Dusk",
  weather: "Clear Sky",
  architecture: "",
  cameraAngle: "Wide shot",
  negativeModifier: "",
  tags: [],
  nsfw: false,
  mediaUrl: "",
  mediaType: "none",
  createdAt: Date.now(),
  updatedAt: Date.now()
});

const DEFAULT_CATEGORIES = ["Outdoor", "Indoor", "Studio", "Urban", "Nature", "Fantasy", "Sci-Fi"];
const DEFAULT_LIGHTINGS = ["Golden Hour", "Soft Rim Light", "Studio Softbox", "Neon Glow", "Window Light", "Dappled Sunlight", "Hard Flash", "Overcast Light"];
const DEFAULT_MOODS = ["Dreamy", "Bold", "Intimate", "Cinematic", "Ethereal", "Moody", "Dark & Gritty", "Cozy"];
const DEFAULT_TIMES = ["Dawn", "Sunrise", "Morning", "Midday", "Sunset", "Golden Hour", "Dusk", "Night"];
const DEFAULT_WEATHERS = ["Clear Sky", "Rainy", "Foggy / Misty", "Snowing", "Overcast", "Sunny", "Stormy"];
const DEFAULT_ANGLES = ["Wide shot", "Extreme wide shot", "Eye level", "Low angle", "High angle", "Bird's eye view", "Macro details"];

// Persistent state hook helper
function usePersistedState<T>(key: string, defVal: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : defVal;
      } catch (e) {
        return defVal;
      }
    }
    return defVal;
  });

  const setPersistedState = (val: T | ((prev: T) => T)) => {
    setState((prev) => {
      const next = typeof val === "function" ? (val as Function)(prev) : val;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  };

  return [state, setPersistedState];
}

export default function EnvironmentsPage() {
  const mounted = useMounted();
  const environments = useLibrary((s) => s.environments);
  const setKey = useLibrary((s) => s.set);
  const [q, setQ] = useState(""); const [cat, setCat] = useState("All"); const [edit, setEdit] = useState<EnvironmentItem | null>(null);

  // Dynamic dropdown choice lists persisted in localStorage
  const [customCats, setCustomCats] = usePersistedState<string[]>("nexus-env-custom-cats", []);
  const [customLightings, setCustomLightings] = usePersistedState<string[]>("nexus-env-custom-lightings", []);
  const [customMoods, setCustomMoods] = usePersistedState<string[]>("nexus-env-custom-moods", []);
  const [customTimes, setCustomTimes] = usePersistedState<string[]>("nexus-env-custom-times", []);
  const [customWeathers, setCustomWeathers] = usePersistedState<string[]>("nexus-env-custom-weathers", []);
  const [customAngles, setCustomAngles] = usePersistedState<string[]>("nexus-env-custom-angles", []);

  const allCats = Array.from(new Set([...DEFAULT_CATEGORIES, ...environments.map((e) => e.category), ...customCats]));
  const cats = ["All", ...allCats];

  const allLightings = Array.from(new Set([...DEFAULT_LIGHTINGS, ...environments.map((e) => e.lighting).filter(Boolean) as string[], ...customLightings]));
  const allMoods = Array.from(new Set([...DEFAULT_MOODS, ...environments.map((e) => e.mood).filter(Boolean) as string[], ...customMoods]));
  const allTimes = Array.from(new Set([...DEFAULT_TIMES, ...environments.map((e) => e.timeOfDay).filter(Boolean) as string[], ...customTimes]));
  const allWeathers = Array.from(new Set([...DEFAULT_WEATHERS, ...environments.map((e) => e.weather).filter(Boolean) as string[], ...customWeathers]));
  const allAngles = Array.from(new Set([...DEFAULT_ANGLES, ...environments.map((e) => e.cameraAngle).filter(Boolean) as string[], ...customAngles]));

  const filtered = environments.filter((e) => (cat === "All" || e.category === cat) && (e.name + e.description + (e.tags?.join(" ") || "")).toLowerCase().includes(q.toLowerCase()));

  function save(e: EnvironmentItem) { e.updatedAt = Date.now(); const ex = environments.some((x) => x.id === e.id); setKey("environments", ex ? environments.map((x) => x.id === e.id ? e : x) : [e, ...environments]); setEdit(null); }
  function del(id: string) { setKey("environments", environments.filter((e) => e.id !== id)); }
  function full(e: EnvironmentItem) {
    return [
      e.description,
      e.lighting && `lighting: ${e.lighting}`,
      e.mood && `mood: ${e.mood}`,
      e.timeOfDay && `time of day: ${e.timeOfDay}`,
      e.weather && `weather: ${e.weather}`,
      e.cameraAngle && `shot type: ${e.cameraAngle}`,
      e.architecture && `style: ${e.architecture}`
    ].filter(Boolean).join(", ");
  }

  if (!mounted) return null;
  return (
    <Page title="Environment Library" subtitle={`${environments.length} scenes & settings to drop into any prompt or recipe`} actions={<><button className="btn-outline" onClick={() => downloadJSON("environments.json", { environments })}><Download size={15} /> Export</button><button className="btn-primary" onClick={() => setEdit(blank())}><Plus size={15} /> New environment</button></>}>
      <div className="flex flex-wrap items-center gap-3 mb-4"><div className="relative flex-1 min-w-[220px]"><Search size={15} className="absolute left-3 top-2.5 text-muted" /><input className="input pl-9" placeholder="Search environments…" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
      <div className="flex flex-wrap gap-2 mb-5">{cats.map((c) => <button key={c} className={`tab ${cat === c ? "tab-active" : "tab-idle"}`} onClick={() => setCat(c)}>{c}</button>)}</div>
      
      <LibraryGroups
        items={filtered}
        groupOf={(e) => e.category}
        titleOf={(e) => e.name}
        gridClass="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5"
        renderCard={(e) => (
          <div className="card p-3.5 flex flex-col hover:border-primary/40 transition-all duration-200">
            {e.mediaUrl ? (
              <div className="relative w-full aspect-[16/10] rounded-lg bg-surface2 overflow-hidden mb-3 border border-border group">
                {e.mediaType === "video" ? (
                  <video src={e.mediaUrl} className="w-full h-full object-cover" muted loop playsInline onMouseEnter={(el) => el.currentTarget.play()} onMouseLeave={(el) => { el.currentTarget.pause(); el.currentTarget.currentTime = 0; }} />
                ) : (
                  <img src={e.mediaUrl} className="w-full h-full object-cover" alt="" />
                )}
              </div>
            ) : null}
            <div className="flex items-center justify-between mb-1.5">
              <span className="chip text-[10px] uppercase tracking-wider">{e.category}</span>
              {e.nsfw && <span className="chip text-rose-400 border-rose-400/40 text-[10px]">18+</span>}
            </div>
            <div className="font-semibold text-sm leading-snug mb-1">{e.name || "Untitled Scene"}</div>
            <p className="text-xs text-muted line-clamp-3 flex-1">{e.description || "—"}</p>
            
            {/* Meta badges */}
            <div className="flex flex-wrap gap-1 mt-2.5">
              {e.timeOfDay && <span className="text-[10px] bg-surface2 text-muted border border-border/40 px-1.5 py-0.5 rounded">{e.timeOfDay}</span>}
              {e.lighting && <span className="text-[10px] bg-surface2 text-muted border border-border/40 px-1.5 py-0.5 rounded">{e.lighting}</span>}
              {e.mood && <span className="text-[10px] bg-surface2 text-muted border border-border/40 px-1.5 py-0.5 rounded">{e.mood}</span>}
              {e.weather && <span className="text-[10px] bg-surface2 text-muted border border-border/40 px-1.5 py-0.5 rounded">{e.weather}</span>}
              {e.cameraAngle && <span className="text-[10px] bg-surface2 text-muted border border-border/40 px-1.5 py-0.5 rounded">{e.cameraAngle}</span>}
            </div>

            {e.tags && e.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2.5 mb-1">
                {e.tags.map((t) => (
                  <span key={t} className="text-[9px] bg-surface2 text-muted px-1.5 py-0.5 rounded border border-border/50">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1 mt-3.5 pt-2.5 border-t border-border/40">
              <button className="btn-ghost px-2 py-1 text-xs" title="Copy setting prompt" onClick={() => copy(full(e))}><Copy size={12} /> Copy</button>
              <button className="btn-ghost px-2 py-1 text-xs" title="Edit environment" onClick={() => setEdit(e)}><Pencil size={12} /></button>
              <div className="flex-1" />
              <button className="btn-ghost px-2 py-1 text-xs text-rose-400 hover:bg-rose-500/10" title="Delete environment" onClick={() => del(e.id)}><Trash2 size={12} /></button>
            </div>
          </div>
        )}
      />

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && environments.some((x) => x.id === edit.id) ? "Edit environment" : "New environment"} wide>
        {edit && (
          <Form
            item={edit}
            cats={allCats}
            lightings={allLightings}
            moods={allMoods}
            times={allTimes}
            weathers={allWeathers}
            angles={allAngles}
            onSave={save}
            onAddCat={(val) => setCustomCats(prev => [...prev, val])}
            onRemoveCat={(val) => setCustomCats(prev => prev.filter(c => c !== val))}
            onAddLighting={(val) => setCustomLightings(prev => [...prev, val])}
            onRemoveLighting={(val) => setCustomLightings(prev => prev.filter(c => c !== val))}
            onAddMood={(val) => setCustomMoods(prev => [...prev, val])}
            onRemoveMood={(val) => setCustomMoods(prev => prev.filter(c => c !== val))}
            onAddTime={(val) => setCustomTimes(prev => [...prev, val])}
            onRemoveTime={(val) => setCustomTimes(prev => prev.filter(c => c !== val))}
            onAddWeather={(val) => setCustomWeathers(prev => [...prev, val])}
            onRemoveWeather={(val) => setCustomWeathers(prev => prev.filter(c => c !== val))}
            onAddAngle={(val) => setCustomAngles(prev => [...prev, val])}
            onRemoveAngle={(val) => setCustomAngles(prev => prev.filter(c => c !== val))}
          />
        )}
      </Modal>
    </Page>
  );
}

// Reusable Select Field with Inline Dynamic Options (+/- buttons)
function DynamicSelectField({
  label,
  value,
  options,
  defaultOptions,
  error,
  onChange,
  onAdd,
  onRemove
}: {
  label: string;
  value: string;
  options: string[];
  defaultOptions: string[];
  error?: string;
  onChange: (val: string) => void;
  onAdd: (val: string) => void;
  onRemove: (val: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-1.5">
        <select className={`input flex-1 ${error ? "border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20" : ""}`} value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <button type="button" className="btn-outline px-3 h-10 flex items-center justify-center text-sm font-bold animate-hover" title={`Add custom ${label.toLowerCase()}`} onClick={() => {
          const name = prompt(`Enter custom ${label.toLowerCase()}:`);
          if (name && name.trim()) {
            const cleaned = name.trim();
            onAdd(cleaned);
            onChange(cleaned);
          }
        }}>+</button>
        <button type="button" className="btn-outline px-3 h-10 flex items-center justify-center text-sm font-bold text-rose-400 hover:bg-rose-500/10 animate-hover" title={`Delete current ${label.toLowerCase()}`} onClick={() => {
          if (defaultOptions.includes(value)) {
            alert(`"${value}" is a built-in ${label.toLowerCase()} choice and cannot be deleted.`);
            return;
          }
          if (confirm(`Remove custom option "${value}"?`)) {
            onRemove(value);
            onChange(defaultOptions[0] || "");
          }
        }}>-</button>
      </div>
      {error && <p className="text-rose-400 text-[10px] mt-1 font-semibold">{error}</p>}
    </Field>
  );
}

function Form({
  item,
  cats,
  lightings,
  moods,
  times,
  weathers,
  angles,
  onSave,
  onAddCat,
  onRemoveCat,
  onAddLighting,
  onRemoveLighting,
  onAddMood,
  onRemoveMood,
  onAddTime,
  onRemoveTime,
  onAddWeather,
  onRemoveWeather,
  onAddAngle,
  onRemoveAngle
}: {
  item: EnvironmentItem;
  cats: string[];
  lightings: string[];
  moods: string[];
  times: string[];
  weathers: string[];
  angles: string[];
  onSave: (e: EnvironmentItem) => void;
  onAddCat: (val: string) => void;
  onRemoveCat: (val: string) => void;
  onAddLighting: (val: string) => void;
  onRemoveLighting: (val: string) => void;
  onAddMood: (val: string) => void;
  onRemoveMood: (val: string) => void;
  onAddTime: (val: string) => void;
  onRemoveTime: (val: string) => void;
  onAddWeather: (val: string) => void;
  onRemoveWeather: (val: string) => void;
  onAddAngle: (val: string) => void;
  onRemoveAngle: (val: string) => void;
}) {
  const [e, setE] = useState(item);
  const [tagStr, setTagStr] = useState(item.tags?.join(", ") || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const f = event.target.files?.[0];
    if (!f) return;
    const type = f.type.startsWith("video/") ? "video" : f.type.startsWith("image/") ? "image" : "none";
    if (type === "none") return;
    const reader = new FileReader();
    reader.onload = () => {
      setE((prev) => ({
        ...prev,
        mediaUrl: reader.result as string,
        mediaType: type,
      }));
      if (errors.mediaUrl) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.mediaUrl;
          return next;
        });
      }
    };
    reader.readAsDataURL(f);
    event.target.value = "";
  }

  function handleTagsChange(val: string) {
    setTagStr(val);
    const parsed = val
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setE((prev) => ({ ...prev, tags: parsed }));
  }

  function handleSave() {
    const errs: Record<string, string> = {};
    if (!e.name || !e.name.trim()) errs.name = "Name / label is required";
    if (!e.category) errs.category = "Category is required";
    if (!e.mediaUrl || !e.mediaUrl.trim()) errs.mediaUrl = "Reference image/video is required";
    if (!e.description || !e.description.trim()) errs.description = "Visual description prompt is required";

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    onSave(e);
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Name / title *">
          <input className={`input ${errors.name ? "border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20" : ""}`} placeholder="e.g. Neon Cyberpunk Alley" value={e.name} onChange={(x) => setE({ ...e, name: x.target.value })} />
          {errors.name && <p className="text-rose-400 text-[10px] mt-1 font-semibold">{errors.name}</p>}
        </Field>
        <DynamicSelectField label="Category *" value={e.category} options={cats} defaultOptions={DEFAULT_CATEGORIES} error={errors.category} onChange={(val) => setE({ ...e, category: val })} onAdd={onAddCat} onRemove={onRemoveCat} />
      </div>

      <Field label="Location visual description / detailed prompt *">
        <textarea className={`input min-h-[80px] ${errors.description ? "border-rose-500/80 focus:border-rose-500" : ""}`} placeholder="Detailed description of the setting layout: e.g. a narrow, rain-slicked side alley in a futuristic city, tall industrial buildings rising on both sides, crowded with vertical holographic store signs and fire escapes..." value={e.description} onChange={(x) => setE({ ...e, description: x.target.value })} />
        {errors.description && <p className="text-rose-400 text-[10px] mt-1 font-semibold">{errors.description}</p>}
      </Field>

      {/* Dynamic select options list */}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 border-t border-border/40 pt-4">
        <DynamicSelectField label="Lighting" value={e.lighting || "Golden Hour"} options={lightings} defaultOptions={DEFAULT_LIGHTINGS} onChange={(val) => setE({ ...e, lighting: val })} onAdd={onAddLighting} onRemove={onRemoveLighting} />
        <DynamicSelectField label="Mood" value={e.mood || "Cinematic"} options={moods} defaultOptions={DEFAULT_MOODS} onChange={(val) => setE({ ...e, mood: val })} onAdd={onAddMood} onRemove={onRemoveMood} />
        <DynamicSelectField label="Time of day" value={e.timeOfDay || "Dusk"} options={times} defaultOptions={DEFAULT_TIMES} onChange={(val) => setE({ ...e, timeOfDay: val })} onAdd={onAddTime} onRemove={onRemoveTime} />
        <DynamicSelectField label="Weather" value={e.weather || "Clear Sky"} options={weathers} defaultOptions={DEFAULT_WEATHERS} onChange={(val) => setE({ ...e, weather: val })} onAdd={onAddWeather} onRemove={onRemoveWeather} />
        <DynamicSelectField label="Camera Angle" value={e.cameraAngle || "Wide shot"} options={angles} defaultOptions={DEFAULT_ANGLES} onChange={(val) => setE({ ...e, cameraAngle: val })} onAdd={onAddAngle} onRemove={onRemoveAngle} />
        <Field label="Architecture / Style">
          <input className="input" placeholder="e.g. Gothic, Cyberpunk, Baroque" value={e.architecture || ""} onChange={(x) => setE({ ...e, architecture: x.target.value })} />
        </Field>
      </div>

      <div className="border-t border-border/40 pt-4">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Reference Media *">
            <div className="flex gap-3">
              {e.mediaUrl ? (
                <div className={`relative w-24 h-24 rounded-lg bg-surface2 overflow-hidden border flex-shrink-0 ${errors.mediaUrl ? "border-rose-500/80" : "border-border"}`}>
                  {e.mediaType === "video" ? (
                    <video src={e.mediaUrl} className="w-full h-full object-cover" muted controls={false} loop playsInline autoPlay />
                  ) : (
                    <img src={e.mediaUrl} className="w-full h-full object-cover" alt="" />
                  )}
                  <button type="button" className="absolute top-1 right-1 bg-black/75 hover:bg-rose-600/90 text-white rounded-full p-0.5 text-xs transition-colors" onClick={() => setE({ ...e, mediaUrl: "", mediaType: "none" })}>
                    ✕
                  </button>
                </div>
              ) : (
                <label className={`w-24 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 text-muted hover:text-text transition-colors flex-shrink-0 ${errors.mediaUrl ? "border-rose-500/60 bg-rose-500/5 text-rose-300" : "border-border"}`}>
                  <ImagePlus size={20} />
                  <span className="text-[10px] font-medium mt-1">Upload File</span>
                  <span className="text-[8px] mt-0.5">Image / Video</span>
                  <input type="file" accept="image/*,video/*" hidden onChange={handleFileChange} />
                </label>
              )}
              <div className="flex-1 flex flex-col justify-center gap-2">
                <input className={`input text-xs ${errors.mediaUrl ? "border-rose-500/80 focus:border-rose-500" : ""}`} placeholder="Or paste image/video URL..." value={e.mediaUrl || ""} onChange={(x) => {
                  const url = x.target.value;
                  let type: "image" | "video" | "none" = "none";
                  if (url) {
                    type = url.match(/\.(mp4|webm|ogg|mov)($|\?)/i) ? "video" : "image";
                  }
                  setE({ ...e, mediaUrl: url, mediaType: type });
                  if (url && errors.mediaUrl) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.mediaUrl;
                      return next;
                    });
                  }
                }} />
                <span className="text-[10px] text-muted-more leading-relaxed">
                  Provide a reference image/video of this scene or setting layout for the model to copy.
                </span>
              </div>
            </div>
            {errors.mediaUrl && <p className="text-rose-400 text-[10px] mt-1.5 font-semibold">{errors.mediaUrl}</p>}
          </Field>

          <div className="space-y-4">
            <Field label="Negative Modifier">
              <input className="input" placeholder="e.g. crowd, cars, daylight, sun, trash" value={e.negativeModifier || ""} onChange={(x) => setE({ ...e, negativeModifier: x.target.value })} />
              <span className="text-[10px] text-muted-more block mt-1 leading-relaxed">
                Elements to avoid in the generated scene when this location is selected.
              </span>
            </Field>

            <Field label="Tags (comma separated)">
              <input className="input" placeholder="e.g. dark, urban, rain, futuristic" value={tagStr} onChange={(x) => handleTagsChange(x.target.value)} />
              <span className="text-[10px] text-muted-more block mt-1 leading-relaxed">
                Organize and filter locations in your library.
              </span>
            </Field>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <Toggle checked={e.nsfw} onChange={(b) => setE({ ...e, nsfw: b })} label="Mark 18+ / NSFW" />
        <div className="flex gap-2">
          <button className="btn-primary" onClick={handleSave}>Save Location</button>
        </div>
      </div>
    </div>
  );
}
