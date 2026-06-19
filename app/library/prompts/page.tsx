"use client";
import { useMemo, useState } from "react";
import Page from "@/components/Page";
import { Modal, Field, Toggle, useMounted, copy } from "@/components/ui";
import LibraryGroups from "@/components/LibraryGroups";
import { useLibrary, newId } from "@/lib/store/library";
import { downloadJSON } from "@/lib/utils";
import type { PromptItem, Template } from "@/lib/types";
import { Plus, Search, Copy, Pencil, Trash2, Download, Upload, Send, ChefHat, Link2, Boxes, Mountain, Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { PROMPT_BUILDER } from "@/lib/data/promptbuilder";
import exifr from "exifr";

const blank = (): PromptItem => ({ id: newId(), title: "", category: "General", subcategory: "", body: "", tags: [], modes: [], nsfw: false, mediaType: "image", createdAt: Date.now(), updatedAt: Date.now() });
const MODE_TOKENS = ["IT2V", "VT2T", "IT2I", "VT2I", "T2V", "I2V", "V2V", "V2T", "V2I", "T2I", "I2T", "I2I", "T2T"];
function inferModes(text: string): string[] { const up = text.toUpperCase(); return Array.from(new Set(MODE_TOKENS.filter((m) => up.includes(m)))); }
function modeColor(m: string) { return m.includes("V") ? "bg-sky-500/20 text-sky-300 border border-sky-500/40" : m.includes("I") ? "bg-orange-500/20 text-orange-300 border border-orange-500/40" : "bg-surface2 text-muted border border-border"; }
function mapGalleryItems(arr: any[]): PromptItem[] {
  return (arr || []).map((x) => ({ ...blank(), title: x.title || x.name || "Prompt", body: x.prompt || x.content || x.text || x.body || "", category: x.collection || x.category || "Imported", subcategory: x.collection && x.category ? x.category : "", cover: x.image || x.imageUrl || x.cover || x.thumbnail || x.preview, tags: Array.isArray(x.tags) ? x.tags : [], mediaType: /video/i.test(x.type || x.mediaType || "") ? "video" : "image", nsfw: /nsfw|adult|nude/i.test((x.category || "") + " " + (x.title || "")) }));
}

export default function PromptsPage() {
  const mounted = useMounted();
  const router = useRouter();
  const lib = useLibrary();
  const prompts = lib.prompts;
  const setKey = lib.set;
  const importJSON = lib.importJSON;
  const templates = lib.templates;
  const ingredients = lib.ingredients || [];
  const environments: any[] = []; // environments were migrated into ingredients; kept empty so legacy env-link UI no-ops

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [showNsfw, setShowNsfw] = useState(true);
  const [edit, setEdit] = useState<PromptItem | null>(null);
  const [showImport, setShowImport] = useState(false);

  const cats = useMemo(() => ["All", ...Array.from(new Set(prompts.map((p) => p.category)))], [prompts]);
  const filtered = prompts.filter((p) => (cat === "All" || p.category === cat) && (showNsfw || !p.nsfw) && (p.title.toLowerCase().includes(q.toLowerCase()) || p.body.toLowerCase().includes(q.toLowerCase())));

  function save(p: PromptItem) { p.updatedAt = Date.now(); const exists = prompts.some((x) => x.id === p.id); setKey("prompts", exists ? prompts.map((x) => (x.id === p.id ? p : x)) : [p, ...prompts]); setEdit(null); }
  function del(id: string) { setKey("prompts", prompts.filter((p) => p.id !== id)); }
  function use(p: PromptItem) { router.push(`/studio/${p.mediaType === "video" ? "video" : "image"}?prompt=${encodeURIComponent(p.body)}`); }
  function sendToRecipes(p: PromptItem) {
    const tpl: Template = { id: newId(), name: p.title || "Imported prompt", content: p.body, mediaType: p.mediaType === "video" ? "video" : "image", cover: p.cover, selections: {}, tags: p.tags || [], nsfw: p.nsfw, createdAt: Date.now(), updatedAt: Date.now() };
    setKey("templates", [tpl, ...templates]);
    router.push("/library/recipes");
  }

  if (!mounted) return null;
  return (
    <Page title="Prompt Gear" subtitle={`${prompts.length} prompts · manage prompt templates, variables and associated library gears`}
      actions={<>
        <button className="btn-outline" onClick={() => setShowImport(true)}><Upload size={15} /> Import</button>
        <button className="btn-outline" onClick={() => downloadJSON("prompts.json", { prompts })}><Download size={15} /> Export</button>
        <button className="btn-primary" onClick={() => setEdit(blank())}><Plus size={15} /> New prompt</button>
      </>}>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]"><Search size={15} className="absolute left-3 top-2.5 text-muted" /><input className="input pl-9" placeholder="Search prompts…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Toggle checked={showNsfw} onChange={setShowNsfw} label="Show NSFW" />
      </div>
      <div className="flex flex-wrap gap-2 mb-5">{cats.map((c) => <button key={c} className={`tab ${cat === c ? "tab-active" : "tab-idle"}`} onClick={() => setCat(c)}>{c}</button>)}</div>

      <LibraryGroups
        items={filtered}
        groupOf={(p) => p.subcategory || p.category}
        titleOf={(p) => p.title}
        renderCard={(p) => {
          const ingList = (p as any).ingredientIds?.map((id: string) => ingredients.find((i) => i.id === id)).filter(Boolean) || [];
          const env = (p as any).environmentId ? environments.find((e) => e.id === (p as any).environmentId) : null;
          const recipe = (p as any).recipeId ? templates.find((r) => r.id === (p as any).recipeId) : null;

          return (
            <div className="card p-4 flex flex-col justify-between">
              <div>
                {p.cover && p.mediaType === "image" && (
                  <img src={p.cover} className="w-full aspect-video object-cover rounded-lg mb-2 border border-border/40" alt="" loading="lazy" />
                )}
                {p.cover && p.mediaType === "video" && (
                  <video src={p.cover} controls className="w-full aspect-video rounded-lg mb-2 border border-border/40" />
                )}
                {p.cover && p.mediaType === "audio" && (
                  <div className="mb-2 bg-surface2/60 border border-border/40 p-2.5 rounded-lg flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                      <Volume2 size={14} /> Playable Audio Media
                    </div>
                    <audio src={p.cover} controls className="w-full h-8 outline-none" />
                  </div>
                )}
                <div className="flex items-center justify-between mb-1.5"><span className="chip">{p.category}{p.subcategory ? " · " + p.subcategory : ""}</span>{p.nsfw && <span className="chip text-rose-400 border-rose-400/40">18+</span>}</div>
                <div className="font-medium mb-1">{p.title || "Untitled"}</div>
                {!!p.modes?.length && <div className="flex flex-wrap gap-1 mb-1">{p.modes.map((m) => <span key={m} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${modeColor(m)}`}>{m}</span>)}</div>}
                <p className="text-xs text-muted line-clamp-4 mb-3">{p.body || "—"}</p>
                
                {/* Associated Gears Badge Row */}
                {(env || recipe || ingList.length > 0) && (
                  <div className="flex flex-wrap gap-1 mt-2 border-t border-border/30 pt-2 text-[10px]">
                    {env && (
                      <span className="flex items-center gap-1 bg-sky-500/10 text-sky-300 border border-sky-500/20 px-1.5 py-0.5 rounded">
                        <Mountain size={10} /> {env.name}
                      </span>
                    )}
                    {recipe && (
                      <span className="flex items-center gap-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded">
                        <ChefHat size={10} /> {recipe.name}
                      </span>
                    )}
                    {ingList.map((ing: any) => (
                      <span key={ing.id} className="flex items-center gap-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                        <Boxes size={10} /> {ing.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border/20">
                <button className="btn-primary px-3 py-1.5 text-xs flex-1" onClick={() => use(p)} title="Use in Studio"><Send size={13} /> Use</button>
                <button className="btn-ghost px-2 py-1.5 text-xs" onClick={() => copy(p.body)} title="Copy"><Copy size={13} /></button>
                <button className="btn-ghost px-2 py-1.5 text-xs" onClick={() => sendToRecipes(p)} title="Send to Recipes"><ChefHat size={13} /></button>
                <button className="btn-ghost px-2 py-1.5 text-xs" onClick={() => setEdit(p)} title="Edit"><Pencil size={13} /></button>
                <button className="btn-ghost px-2 py-1.5 text-xs text-rose-400" onClick={() => del(p.id)} title="Delete"><Trash2 size={13} /></button>
              </div>
            </div>
          );
        }}
      />

      <ImportModal open={showImport} onClose={() => setShowImport(false)} onImport={importJSON} />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && prompts.some((x) => x.id === edit.id) ? "Edit prompt" : "New prompt"} wide>{edit && <EditForm item={edit} onSave={save} />}</Modal>
    </Page>
  );
}

function EditForm({ item, onSave }: { item: PromptItem; onSave: (p: PromptItem) => void }) {
  const [p, setP] = useState<any>({
    ...item,
    ingredientIds: (item as any).ingredientIds || [],
    environmentId: (item as any).environmentId || "",
    recipeId: (item as any).recipeId || "",
  });

  const lib = useLibrary();
  const ingredients = lib.ingredients || [];
  const environments: any[] = []; // environments were migrated into ingredients; kept empty so legacy env-link UI no-ops
  const recipes = lib.templates || []; // templates is where recipes are stored in store
  const [b, setB] = useState({ caption: PROMPT_BUILDER.captionTypes[0], length: PROMPT_BUILDER.lengths[3], extras: [] as string[] });

  function applyBuilder() {
    const extras = b.extras.length ? " " + b.extras.join(" ") : "";
    const built = `${b.caption.prompt} Aim for a ${b.length.toLowerCase()} description.${extras}`.trim();
    setP({ ...p, body: built, category: "System Prompt" });
  }

  return (
    <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
      <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-xl mb-1">
        <div>
          <div className="font-semibold text-primary text-sm flex items-center gap-2"><ChefHat size={16} /> Is this a System Prompt?</div>
          <div className="text-[11px] text-muted mt-0.5">Enable this to reveal auto-prompt builder options and categorize this as a System Prompt.</div>
        </div>
        <Toggle checked={p.category === "System Prompt"} onChange={(checked) => setP({ ...p, category: checked ? "System Prompt" : "General" })} />
      </div>

      {p.category === "System Prompt" && (
        <div className="card p-4 border border-primary/30 bg-surface2/50 mb-2">
          <div className="font-semibold mb-3 text-primary text-sm">System Prompt Builder</div>
          <div className="grid md:grid-cols-2 gap-3 mb-3">
            <Field label="Caption type">
              <select className="input text-xs" value={b.caption.name} onChange={(e) => setB({ ...b, caption: PROMPT_BUILDER.captionTypes.find((c) => c.name === e.target.value)! })}>
                {PROMPT_BUILDER.captionTypes.map((c) => <option key={c.name}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Length">
              <select className="input text-xs" value={b.length} onChange={(e) => setB({ ...b, length: e.target.value })}>
                {PROMPT_BUILDER.lengths.map((l) => <option key={l}>{l}</option>)}
              </select>
            </Field>
          </div>
          <div className="text-xs font-semibold text-muted mb-2">Extra options</div>
          <div className="flex flex-wrap gap-2 mb-3">
            {PROMPT_BUILDER.extras.map((x) => {
              const on = b.extras.includes(x);
              return (
                <button
                  key={x}
                  type="button"
                  className={`chip cursor-pointer transition-colors ${on ? "border-primary bg-primary/10 text-primary" : "hover:border-border"}`}
                  onClick={() => setB({ ...b, extras: on ? b.extras.filter((e) => e !== x) : [...b.extras, x] })}
                >
                  {x}
                </button>
              );
            })}
          </div>
          <button type="button" className="btn-primary text-xs w-full py-2" onClick={applyBuilder}><Pencil size={13} className="mr-1.5 inline" /> Generate Prompt Body</button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Title"><input className="input" value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} /></Field>
        <Field label="Category"><input className="input" value={p.category} onChange={(e) => setP({ ...p, category: e.target.value })} /></Field>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Subcategory (e.g. Video Generation, Image Editing)"><input className="input" value={p.subcategory || ""} onChange={(e) => setP({ ...p, subcategory: e.target.value })} /></Field>
        <Field label="Modes (comma separated, e.g. T2I, I2V)"><input className="input" value={(p.modes || []).join(", ")} onChange={(e) => setP({ ...p, modes: e.target.value.split(",").map((x) => x.trim().toUpperCase()).filter(Boolean) })} /></Field>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <Field label="Media type">
          <select className="input" value={p.mediaType} onChange={(e) => setP({ ...p, mediaType: e.target.value as any })}>
            <option value="image">image</option>
            <option value="video">video</option>
            <option value="audio">audio</option>
            <option value="text">text</option>
          </select>
        </Field>
        <Field label="Adult / NSFW">
          <div className="pt-2"><Toggle checked={p.nsfw} onChange={(b) => setP({ ...p, nsfw: b })} label="Mark 18+" /></div>
        </Field>
        <Field label="Locally Upload Media">
          <input
            type="file"
            id="prompt-media-upload"
            accept={p.mediaType === "audio" ? "audio/*" : p.mediaType === "video" ? "video/*" : "image/*"}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                  setP({ ...p, cover: reader.result as string });
                };
                reader.readAsDataURL(file);
              }
            }}
          />
          <label htmlFor="prompt-media-upload" className="btn-outline text-xs cursor-pointer py-2 px-3 flex items-center justify-center gap-1.5 h-10 mt-1">
            <Upload size={14} /> Upload Local File
          </label>
        </Field>
      </div>
      
      <Field label="Cover media URL (example output, optional)">
        <input className="input text-xs" placeholder="Or paste media URL..." value={p.cover || ""} onChange={(e) => setP({ ...p, cover: e.target.value })} />
      </Field>
      
      {p.cover && (
        <div className="bg-surface2/60 border border-border/40 p-2 rounded-xl flex items-center gap-3">
          {p.mediaType === "audio" ? (
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20"><Volume2 className="text-primary" size={20} /></div>
          ) : p.mediaType === "video" ? (
            <video src={p.cover} className="w-16 h-10 rounded object-cover border border-border" muted />
          ) : (
            <img src={p.cover} className="w-12 h-12 rounded object-cover border border-border" alt="" />
          )}
          <span className="text-xs text-muted truncate flex-1">
            {p.cover.startsWith("data:") ? "Local File Uploaded" : p.cover}
          </span>
          <button type="button" className="text-rose-400 text-xs font-semibold hover:text-rose-300" onClick={() => setP({ ...p, cover: "" })}>Remove</button>
        </div>
      )}

      {/* Gears Associations */}
      <div className="border-t border-border/40 pt-4 space-y-4">
        <h4 className="font-semibold text-xs text-primary uppercase tracking-wider">Gears Associations</h4>
        
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Environment / Location Gear Reference">
            <select
              className="input text-xs"
              value={p.environmentId || ""}
              onChange={(e) => setP({ ...p, environmentId: e.target.value })}
            >
              <option value="">-- No Environment Associated --</option>
              {environments.map((env) => (
                <option key={env.id} value={env.id}>{env.name} ({env.category})</option>
              ))}
            </select>
          </Field>

          <Field label="Recipe Gear Reference">
            <select
              className="input text-xs"
              value={p.recipeId || ""}
              onChange={(e) => setP({ ...p, recipeId: e.target.value })}
            >
              <option value="">-- No Recipe Associated --</option>
              {recipes.map((rec) => (
                <option key={rec.id} value={rec.id}>{rec.name} ({rec.mediaType})</option>
              ))}
            </select>
          </Field>
        </div>

        <div>
          <span className="label mb-1.5 flex items-center gap-1.5"><Boxes size={14} /> Associated Ingredients Gears</span>
          {ingredients.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-surface2/40 border border-border/40 p-3 rounded-xl max-h-[140px] overflow-y-auto">
              {ingredients.map((ing) => {
                const checked = p.ingredientIds?.includes(ing.id);
                return (
                  <label key={ing.id} className="flex items-center gap-2 text-xs text-muted hover:text-text cursor-pointer select-none py-1">
                    <input
                      type="checkbox"
                      className="rounded border-border text-primary focus:ring-primary"
                      checked={checked}
                      onChange={() => {
                        const nextIds = checked
                          ? p.ingredientIds.filter((id: string) => id !== ing.id)
                          : [...(p.ingredientIds || []), ing.id];
                        setP({ ...p, ingredientIds: nextIds });
                      }}
                    />
                    <span className="truncate">{ing.name}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted">No ingredients found in the Ingredient Library.</p>
          )}
        </div>
      </div>

      <Field label="Prompt body">
        <textarea className="input min-h-[140px] text-xs font-mono" value={p.body} onChange={(e) => setP({ ...p, body: e.target.value })} />
      </Field>

      <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-border/40">
        <button className="btn-primary" onClick={() => onSave(p)}>Save Prompt</button>
      </div>
    </div>
  );
}

function ImportModal({ open, onClose, onImport }: { open: boolean, onClose: () => void, onImport: (data: any) => void }) {
  const [isSystem, setIsSystem] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUrlImport() {
    if (!url) return;
    setLoading(true);
    try {
      const fetchUrl = url.includes("github.com") && !url.includes("raw.githubusercontent.com") 
        ? url.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/") 
        : url;
      const r = await fetch(fetchUrl);
      const j = await r.json();
      const arr = Array.isArray(j) ? j : (j.prompts || j.data || j.items || j.results || []);
      const mapped = mapGalleryItems(arr);
      if (isSystem) mapped.forEach(p => p.category = "System Prompt");
      onImport({ prompts: mapped });
      alert(`Imported ${mapped.length} prompts.`);
      onClose();
    } catch (e: any) { alert("Fetch failed: " + e.message); }
    setLoading(false);
  }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files; if (!files || files.length === 0) return;
    setLoading(true);
    let allItems: PromptItem[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const t = await files[i].text();
        const j = JSON.parse(t);
        let arr: any[] = [];
        if (Array.isArray(j)) arr = j;
        else if (Array.isArray(j.prompts)) arr = j.prompts;
        else if (Array.isArray(j.data) || Array.isArray(j.items) || Array.isArray(j.results)) arr = j.data || j.items || j.results;
        else if (j && !Array.isArray(j) && !j.prompts) {
          for (const c of Object.keys(j)) for (const title of Object.keys(j[c])) {
            allItems.push({ ...blank(), category: isSystem ? "System Prompt" : "Imported", subcategory: c, title, body: j[c][title], modes: inferModes(title + " " + c), nsfw: /nsfw|adult|nude/i.test(c + " " + title) });
          }
          continue;
        }
        const mapped = mapGalleryItems(arr);
        if (isSystem) mapped.forEach(p => p.category = "System Prompt");
        allItems.push(...mapped);
      }
      onImport({ prompts: allItems });
      onClose();
    } catch { alert("Invalid JSON encountered in one of the files."); }
    setLoading(false);
  }

  async function handleImageImport(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files; if (!files || files.length === 0) return;
    setLoading(true);
    let allItems: PromptItem[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        let promptText = "";
        try {
          const ex = await exifr.parse(f, true); 
          if (ex && ex.parameters) promptText = ex.parameters;
          else if (ex && ex.UserComment) promptText = ex.UserComment;
          else if (ex && ex.ImageDescription) promptText = ex.ImageDescription;
          else if (ex && ex.Description) promptText = ex.Description;
          
          if (!promptText) {
             const comfy = await exifr.parse(f, { tiff: false, ifd0: false, exif: false, makerNote: false, chunkTypes: ["tEXt", "iTXt"] } as any);
             if (comfy && comfy.prompt) promptText = typeof comfy.prompt === "string" ? comfy.prompt : JSON.stringify(comfy.prompt, null, 2);
             else if (comfy && comfy.workflow) promptText = "ComfyUI Workflow detected. Open in ComfyUI for details.\n\n" + JSON.stringify(comfy.workflow, null, 2);
          }
        } catch (err) { /* ignore parse errors for individual files */ }

        if (promptText) {
          allItems.push({ ...blank(), title: f.name, body: promptText, category: isSystem ? "System Prompt" : "Imported", subcategory: "Image EXIF", modes: ["T2I"] });
        }
      }
      
      if (allItems.length > 0) {
        onImport({ prompts: allItems });
        alert(`Successfully extracted prompts from ${allItems.length} image(s).`);
        onClose();
      } else {
        alert("No prompt metadata found in the selected images. Make sure they were generated by an AI tool that embeds parameters.");
      }
    } catch (e: any) {
      alert("Metadata extraction failed: " + e.message);
    }
    setLoading(false);
  }

  return (
    <Modal open={open} onClose={onClose} title="Import Prompts">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-surface2 rounded-xl">
          <div><div className="font-semibold text-sm">Mark as System Prompts</div><div className="text-[11px] text-muted">Imported items will be categorized as System Prompts.</div></div>
          <Toggle checked={isSystem} onChange={setIsSystem} />
        </div>
        
        <div className="card p-3 border border-border/40">
          <div className="font-semibold text-xs mb-2">Import from URL (JSON / GitHub Raw)</div>
          <div className="flex gap-2">
            <input className="input text-xs flex-1" placeholder="https://raw.githubusercontent.com/..." value={url} onChange={e => setUrl(e.target.value)} disabled={loading} />
            <button className="btn-primary text-xs px-3" onClick={handleUrlImport} disabled={loading}>{loading ? "Fetching..." : "Fetch"}</button>
          </div>
        </div>

        <div className="card p-3 border border-border/40">
          <div className="font-semibold text-xs mb-2">Import from Local JSON File</div>
          <label className="btn-outline w-full text-xs py-2 cursor-pointer text-center block">
            Select JSON File
            <input type="file" accept="application/json" multiple hidden onChange={handleFileImport} disabled={loading} />
          </label>
        </div>

        <div className="card p-3 border border-border/40">
          <div className="font-semibold text-xs mb-2">Extract from Image Metadata (Civitai/ComfyUI)</div>
          <p className="text-[10px] text-muted mb-2">Upload a generated image (PNG/WebP/JPEG) to extract its embedded prompt (EXIF or tEXt chunks).</p>
          <label className="btn-outline w-full text-xs py-2 cursor-pointer text-center flex items-center justify-center gap-1.5">
            <Upload size={14} /> Select Local Image
            <input type="file" accept="image/png, image/jpeg, image/webp" multiple hidden onChange={handleImageImport} disabled={loading} />
          </label>
        </div>
      </div>
    </Modal>
  );
}
