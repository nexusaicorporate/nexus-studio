"use client";
import { useState } from "react";
import Page from "@/components/Page";
import { Modal, Field, Toggle, useMounted, copy } from "@/components/ui";
import LibraryGroups from "@/components/LibraryGroups";
import { useLibrary, newId } from "@/lib/store/library";
import { downloadJSON } from "@/lib/utils";
import type { Ingredient } from "@/lib/types";
import { INGREDIENT_CATEGORIES } from "@/lib/data/seed";
import { Plus, Search, Copy, Pencil, Trash2, Download, ImagePlus } from "lucide-react";

const blank = (cat = "Subject"): Ingredient => ({
  id: newId(),
  name: "",
  category: cat,
  value: "",
  tags: [],
  nsfw: false,
  mediaUrl: "",
  mediaType: "none",
  triggerWord: "",
  description: "",
  refWeight: 0.8,
  influenceType: "outfit",
  negativeModifier: "",
  createdAt: Date.now(),
  updatedAt: Date.now()
});

const DEFAULT_INFLUENCES = ["outfit", "style", "character", "background", "object", "text"];

export default function IngredientsPage() {
  const mounted = useMounted();
  const ingredients = useLibrary((s) => s.ingredients);
  const setKey = useLibrary((s) => s.set);
  const [q, setQ] = useState(""); const [cat, setCat] = useState("All"); const [edit, setEdit] = useState<Ingredient | null>(null);

  // Local state to track custom categories added by the user, persisted in localStorage
  const [customCats, setCustomCats] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("nexus-custom-ingredient-categories");
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Local state to track custom influence types added by the user, persisted in localStorage
  const [customInfluences, setCustomInfluences] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("nexus-custom-ingredient-influences");
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const allCats = Array.from(new Set([...INGREDIENT_CATEGORIES, ...ingredients.map((i) => i.category), ...customCats]));
  const cats = ["All", ...allCats];
  const allInfluences = Array.from(new Set([...DEFAULT_INFLUENCES, ...customInfluences, ...(edit?.influenceType ? [edit.influenceType] : [])]));

  const filtered = ingredients.filter((i) => (cat === "All" || i.category === cat) && (i.name + i.value + (i.tags?.join(" ") || "")).toLowerCase().includes(q.toLowerCase()));

  function save(i: Ingredient) { i.updatedAt = Date.now(); const ex = ingredients.some((x) => x.id === i.id); setKey("ingredients", ex ? ingredients.map((x) => x.id === i.id ? i : x) : [i, ...ingredients]); setEdit(null); }
  function del(id: string) { setKey("ingredients", ingredients.filter((i) => i.id !== id)); }

  function addCustomCategory(newCat: string) {
    const cleaned = newCat.trim();
    if (!cleaned) return;
    setCustomCats((prev) => {
      const next = Array.from(new Set([...prev, cleaned]));
      localStorage.setItem("nexus-custom-ingredient-categories", JSON.stringify(next));
      return next;
    });
  }

  function removeCustomCategory(catToDelete: string) {
    setCustomCats((prev) => {
      const next = prev.filter((c) => c !== catToDelete);
      localStorage.setItem("nexus-custom-ingredient-categories", JSON.stringify(next));
      return next;
    });
  }

  function addCustomInfluence(newInf: string) {
    const cleaned = newInf.trim().toLowerCase();
    if (!cleaned) return;
    setCustomInfluences((prev) => {
      const next = Array.from(new Set([...prev, cleaned]));
      localStorage.setItem("nexus-custom-ingredient-influences", JSON.stringify(next));
      return next;
    });
  }

  function removeCustomInfluence(infToDelete: string) {
    setCustomInfluences((prev) => {
      const next = prev.filter((c) => c !== infToDelete);
      localStorage.setItem("nexus-custom-ingredient-influences", JSON.stringify(next));
      return next;
    });
  }

  if (!mounted) return null;
  return (
    <Page title="Ingredient Gear" subtitle={`${ingredients.length} reusable building blocks (materials) grouped by category — the parts you assemble recipes from`} actions={<><button className="btn-outline" onClick={() => downloadJSON("ingredients.json", { ingredients })}><Download size={15} /> Export</button><button className="btn-primary" onClick={() => setEdit(blank(cat === "All" ? "Subject" : cat))}><Plus size={15} /> New ingredient</button></>}>
      <div className="flex flex-wrap items-center gap-3 mb-4"><div className="relative flex-1 min-w-[220px]"><Search size={15} className="absolute left-3 top-2.5 text-muted" /><input className="input pl-9" placeholder="Search ingredients…" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
      <div className="flex flex-wrap gap-2 mb-5">{cats.map((c) => <button key={c} className={`tab ${cat === c ? "tab-active" : "tab-idle"}`} onClick={() => setCat(c)}>{c}</button>)}</div>
      <div className="mb-4 text-xs text-muted-more bg-surface1 border border-border/40 rounded-xl p-3 leading-relaxed">
        <span className="font-semibold text-text">Pro-tip:</span> Visual ingredients let you map physical elements (like a specific dress, style, or background) using a reference image or video. AI models will target these items using the <strong>Trigger Word</strong> and ignore background noise using the <strong>Visual Description</strong>.
      </div>
      <LibraryGroups
        items={filtered}
        groupOf={(i) => i.category}
        titleOf={(i) => i.name}
        gridClass="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5"
        renderCard={(i) => (
          <div className="card p-3.5 flex flex-col hover:border-primary/40 transition-all duration-200">
            {i.mediaUrl ? (
              <div className="relative w-full aspect-[4/3] rounded-lg bg-surface2 overflow-hidden mb-3 border border-border group">
                {i.mediaType === "video" ? (
                  <video src={i.mediaUrl} className="w-full h-full object-cover" muted loop playsInline onMouseEnter={(e) => e.currentTarget.play()} onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }} />
                ) : (
                  <img src={i.mediaUrl} className="w-full h-full object-cover" alt="" />
                )}
                {i.refWeight !== undefined && (
                  <span className="absolute bottom-1.5 right-1.5 bg-black/75 px-1.5 py-0.5 rounded text-[10px] font-mono text-primary border border-primary/20">
                    w: {i.refWeight.toFixed(2)}
                  </span>
                )}
                {i.influenceType && i.influenceType !== "text" && (
                  <span className="absolute bottom-1.5 left-1.5 bg-black/75 px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold tracking-wider text-muted border border-border/20">
                    {i.influenceType}
                  </span>
                )}
              </div>
            ) : null}
            <div className="flex items-center justify-between mb-1.5">
              <span className="chip text-[10px] uppercase tracking-wider">{i.category}</span>
              <div className="flex gap-1">
                {i.influenceType && i.influenceType !== "text" && !i.mediaUrl && (
                  <span className="chip text-[10px] border-primary/30 text-primary-light uppercase">{i.influenceType}</span>
                )}
                {i.nsfw && <span className="chip text-rose-400 border-rose-400/40 text-[10px]">18+</span>}
              </div>
            </div>
            <div className="font-semibold text-sm leading-snug">{i.name || "Untitled"}</div>
            {i.triggerWord && (
              <div className="text-[10px] text-primary-light font-mono mt-1 bg-primary/5 border border-primary/10 rounded px-1.5 py-0.5 inline-block self-start">
                Trigger: {i.triggerWord}
              </div>
            )}
            <p className="text-xs text-muted line-clamp-2 flex-1 mt-1.5">{i.value || "—"}</p>
            {i.tags && i.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 mb-1">
                {i.tags.map((t) => (
                  <span key={t} className="text-[9px] bg-surface2 text-muted px-1.5 py-0.5 rounded border border-border/50">
                    #{t}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1 mt-2.5 pt-2.5 border-t border-border/40">
              <button className="btn-ghost px-2 py-1 text-xs" title="Copy prompt value" onClick={() => copy(i.value)}><Copy size={12} /></button>
              <button className="btn-ghost px-2 py-1 text-xs" title="Edit ingredient" onClick={() => setEdit(i)}><Pencil size={12} /></button>
              <div className="flex-1" />
              <button className="btn-ghost px-2 py-1 text-xs text-rose-400 hover:bg-rose-500/10" title="Delete ingredient" onClick={() => del(i.id)}><Trash2 size={12} /></button>
            </div>
          </div>
        )}
      />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && ingredients.some((x) => x.id === edit.id) ? "Edit ingredient" : "New ingredient"} wide>
        {edit && (
          <Form
            item={edit}
            cats={allCats}
            influences={allInfluences}
            onSave={save}
            onAddCategory={addCustomCategory}
            onRemoveCategory={removeCustomCategory}
            onAddInfluence={addCustomInfluence}
            onRemoveInfluence={removeCustomInfluence}
          />
        )}
      </Modal>
    </Page>
  );
}

function Form({
  item,
  cats,
  influences,
  onSave,
  onAddCategory,
  onRemoveCategory,
  onAddInfluence,
  onRemoveInfluence
}: {
  item: Ingredient;
  cats: string[];
  influences: string[];
  onSave: (i: Ingredient) => void;
  onAddCategory: (c: string) => void;
  onRemoveCategory: (c: string) => void;
  onAddInfluence: (c: string) => void;
  onRemoveInfluence: (c: string) => void;
}) {
  const [i, setI] = useState(item);
  const [tagStr, setTagStr] = useState(item.tags?.join(", ") || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const type = f.type.startsWith("video/") ? "video" : f.type.startsWith("image/") ? "image" : "none";
    if (type === "none") return;
    const reader = new FileReader();
    reader.onload = () => {
      setI((prev) => ({
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
    e.target.value = "";
  }

  function handleTagsChange(val: string) {
    setTagStr(val);
    const parsed = val
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setI((prev) => ({ ...prev, tags: parsed }));
  }

  function handleSave() {
    const errs: Record<string, string> = {};
    if (!i.name || !i.name.trim()) errs.name = "Name / label is required";
    if (!i.category) errs.category = "Category is required";
    if (!i.mediaUrl || !i.mediaUrl.trim()) errs.mediaUrl = "Reference image or video is required";
    if (!i.triggerWord || !i.triggerWord.trim()) errs.triggerWord = "Trigger word is required";
    if (!i.influenceType) errs.influenceType = "Influence type is required";

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    onSave(i);
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Name / label *">
          <input className={`input ${errors.name ? "border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20" : ""}`} placeholder="e.g. Red High Heels" value={i.name} onChange={(e) => setI({ ...i, name: e.target.value })} />
          {errors.name && <p className="text-rose-400 text-[10px] mt-1 font-semibold">{errors.name}</p>}
        </Field>
        <Field label="Category *">
          <div className="flex items-center gap-1.5">
            <select className={`input flex-1 ${errors.category ? "border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20" : ""}`} value={i.category} onChange={(e) => setI({ ...i, category: e.target.value })}>{cats.map((c) => <option key={c}>{c}</option>)}</select>
            <button type="button" className="btn-outline px-3 h-10 flex items-center justify-center text-sm font-bold" title="Add custom category" onClick={() => {
              const name = prompt("Enter new category name:");
              if (name && name.trim()) {
                const cleaned = name.trim();
                onAddCategory(cleaned);
                setI({ ...i, category: cleaned });
              }
            }}>+</button>
            <button type="button" className="btn-outline px-3 h-10 flex items-center justify-center text-sm font-bold text-rose-400 hover:bg-rose-500/10" title="Delete current category" onClick={() => {
              if (INGREDIENT_CATEGORIES.includes(i.category)) {
                alert(`"${i.category}" is a built-in category and cannot be deleted.`);
                return;
              }
              if (confirm(`Are you sure you want to remove "${i.category}" from the category list?`)) {
                onRemoveCategory(i.category);
                setI({ ...i, category: INGREDIENT_CATEGORIES[0] || "Subject" });
              }
            }}>-</button>
          </div>
          {errors.category && <p className="text-rose-400 text-[10px] mt-1 font-semibold">{errors.category}</p>}
        </Field>
      </div>

      <Field label="Value (text injected into recipes)">
        <textarea className="input min-h-[70px]" placeholder="e.g. wearing shiny red high heel shoes" value={i.value} onChange={(e) => setI({ ...i, value: e.target.value })} />
      </Field>

      {/* Advanced Visual Prompting Fields */}
      <div className="border-t border-border/40 pt-4 mt-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Advanced Visual / Multimodal Settings</h4>
        
        {/* Media Upload & Preview */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <Field label="Reference Image or Video *">
            <div className="flex gap-3">
              {i.mediaUrl ? (
                <div className={`relative w-24 h-24 rounded-lg bg-surface2 overflow-hidden border flex-shrink-0 ${errors.mediaUrl ? "border-rose-500/80" : "border-border"}`}>
                  {i.mediaType === "video" ? (
                    <video src={i.mediaUrl} className="w-full h-full object-cover" muted controls={false} loop playsInline autoPlay />
                  ) : (
                    <img src={i.mediaUrl} className="w-full h-full object-cover" alt="" />
                  )}
                  <button type="button" className="absolute top-1 right-1 bg-black/75 hover:bg-rose-600/90 text-white rounded-full p-0.5 text-xs transition-colors" onClick={() => setI({ ...i, mediaUrl: "", mediaType: "none" })}>
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
                <input className={`input text-xs ${errors.mediaUrl ? "border-rose-500/80 focus:border-rose-500" : ""}`} placeholder="Or paste image/video URL..." value={i.mediaUrl || ""} onChange={(e) => {
                  const url = e.target.value;
                  let type: "image" | "video" | "none" = "none";
                  if (url) {
                    type = url.match(/\.(mp4|webm|ogg|mov)($|\?)/i) ? "video" : "image";
                  }
                  setI({ ...i, mediaUrl: url, mediaType: type });
                  if (url && errors.mediaUrl) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.mediaUrl;
                      return next;
                    });
                  }
                }} />
                <span className="text-[10px] text-muted-more leading-relaxed">
                  Provide a reference image/video of the ingredient (e.g. style, outfit, object, or background) for the model to copy.
                </span>
              </div>
            </div>
            {errors.mediaUrl && <p className="text-rose-400 text-[10px] mt-1.5 font-semibold">{errors.mediaUrl}</p>}
          </Field>

          <Field label="Influence Type *">
            <div className="flex items-center gap-1.5">
              <select className={`input flex-1 ${errors.influenceType ? "border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20" : ""}`} value={i.influenceType || "outfit"} onChange={(e) => setI({ ...i, influenceType: e.target.value as any })}>
                {influences.map((inf) => (
                  <option key={inf} value={inf}>{inf.charAt(0).toUpperCase() + inf.slice(1)}</option>
                ))}
              </select>
              <button type="button" className="btn-outline px-3 h-10 flex items-center justify-center text-sm font-bold" title="Add custom influence type" onClick={() => {
                const name = prompt("Enter new influence type:");
                if (name && name.trim()) {
                  const cleaned = name.trim().toLowerCase();
                  onAddInfluence(cleaned);
                  setI({ ...i, influenceType: cleaned });
                }
              }}>+</button>
              <button type="button" className="btn-outline px-3 h-10 flex items-center justify-center text-sm font-bold text-rose-400 hover:bg-rose-500/10" title="Delete current influence type" onClick={() => {
                const current = i.influenceType || "outfit";
                if (DEFAULT_INFLUENCES.includes(current)) {
                  alert(`"${current}" is a built-in influence type and cannot be deleted.`);
                  return;
                }
                if (confirm(`Are you sure you want to remove "${current}" from the list?`)) {
                  onRemoveInfluence(current);
                  setI({ ...i, influenceType: "outfit" });
                }
              }}>-</button>
            </div>
            <span className="text-[10px] text-muted-more block mt-1 leading-relaxed">
              Tells the generator how to map this media reference (e.g. as IP-Adapter outfit, style reference, or image control).
            </span>
            {errors.influenceType && <p className="text-rose-400 text-[10px] mt-1 font-semibold">{errors.influenceType}</p>}
          </Field>
        </div>

        {/* Trigger word and Description */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <Field label="Trigger Word / Token (for prompt) *">
            <input className={`input ${errors.triggerWord ? "border-rose-500/80 focus:border-rose-500" : ""}`} placeholder="e.g. red patent leather stiletto heels" value={i.triggerWord || ""} onChange={(e) => setI({ ...i, triggerWord: e.target.value })} />
            <span className="text-[10px] text-muted-more block mt-1 leading-relaxed">
              Concise text trigger mapping to the object in the image. Helps the model target this specific ingredient.
            </span>
            {errors.triggerWord && <p className="text-rose-400 text-[10px] mt-1 font-semibold">{errors.triggerWord}</p>}
          </Field>
          
          <Field label="Reference Weight (Influence Strength)">
            <div className="flex items-center gap-3 mt-1.5">
              <input type="range" min="0" max="1" step="0.05" className="flex-1 accent-primary" value={i.refWeight !== undefined ? i.refWeight : 0.8} onChange={(e) => setI({ ...i, refWeight: parseFloat(e.target.value) })} />
              <span className="font-mono text-sm font-semibold bg-surface2 px-2 py-0.5 rounded border border-border w-12 text-center">
                {(i.refWeight !== undefined ? i.refWeight : 0.8).toFixed(2)}
              </span>
            </div>
            <span className="text-[10px] text-muted-more block mt-1 leading-relaxed">
              How strongly the generation adheres to the reference media (higher values = closer replica).
            </span>
          </Field>
        </div>

        <Field label="Visual Description (Caption for model understanding)">
          <textarea className="input min-h-[60px]" placeholder="Detailed description of the item in the image/video: e.g. glossy red patent leather high heels with a 4-inch thin stiletto heel, closed pointed toe, and a delicate gold buckle closure around the ankle." value={i.description || ""} onChange={(e) => setI({ ...i, description: e.target.value })} />
          <span className="text-[10px] text-muted-more block mt-1 leading-relaxed">
            Explaining what is in the reference media helps the multimodal model isolate the outfit or object and ignore details like skin tone, floor background, etc.
          </span>
        </Field>

        <div className="grid md:grid-cols-2 gap-4 mb-2">
          <Field label="Negative Prompt Modifier">
            <input className="input" placeholder="e.g. boots, sneakers, sandals, socks" value={i.negativeModifier || ""} onChange={(e) => setI({ ...i, negativeModifier: e.target.value })} />
            <span className="text-[10px] text-muted-more block mt-1 leading-relaxed">
              Words to avoid/exclude when generating with this ingredient.
            </span>
          </Field>

          <Field label="Tags (comma separated)">
            <input className="input" placeholder="e.g. footwear, shoes, formal, classic" value={tagStr} onChange={(e) => handleTagsChange(e.target.value)} />
            <span className="text-[10px] text-muted-more block mt-1 leading-relaxed">
              Tags to categorize and easily filter ingredients in the library.
            </span>
          </Field>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <Toggle checked={i.nsfw} onChange={(b) => setI({ ...i, nsfw: b })} label="Mark 18+ / NSFW" />
        <div className="flex gap-2">
          <button className="btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
