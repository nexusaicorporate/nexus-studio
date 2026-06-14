"use client";
import { useMemo, useState } from "react";
import Page from "@/components/Page";
import { Modal, Field, Toggle, useMounted, copy } from "@/components/ui";
import LibraryGroups from "@/components/LibraryGroups";
import { useLibrary, newId } from "@/lib/store/library";
import { downloadJSON } from "@/lib/utils";
import type { PromptItem, Template } from "@/lib/types";
import { Plus, Search, Copy, Pencil, Trash2, Download, Upload, Send, ChefHat, Link2 } from "lucide-react";
import { useRouter } from "next/navigation";

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
  const prompts = useLibrary((s) => s.prompts);
  const setKey = useLibrary((s) => s.set);
  const importJSON = useLibrary((s) => s.importJSON);
  const templates = useLibrary((s) => s.templates);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [showNsfw, setShowNsfw] = useState(true);
  const [edit, setEdit] = useState<PromptItem | null>(null);

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
  async function importURL() {
    const url = window.prompt("Paste a gallery JSON URL (array of prompts, or {prompts|data|items|results: [...]})");
    if (!url) return;
    try { const r = await fetch(url); const j = await r.json(); const arr = Array.isArray(j) ? j : (j.prompts || j.data || j.items || j.results || []); importJSON({ prompts: mapGalleryItems(arr) }); alert(`Imported ${arr.length} prompts.`); }
    catch (e: any) { alert("Fetch failed: " + e.message); }
  }
  function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    f.text().then((t) => { try { const j = JSON.parse(t);
      if (Array.isArray(j)) { importJSON({ prompts: mapGalleryItems(j) }); }
      else if (Array.isArray(j.prompts) && j.prompts[0] && (j.prompts[0].prompt || j.prompts[0].content || j.prompts[0].image || j.prompts[0].imageUrl)) { importJSON({ prompts: mapGalleryItems(j.prompts) }); }
      else if (Array.isArray(j.data) || Array.isArray(j.items) || Array.isArray(j.results)) { importJSON({ prompts: mapGalleryItems(j.data || j.items || j.results) }); }
      else if (j && !Array.isArray(j) && !j.prompts) { const items: PromptItem[] = []; for (const c of Object.keys(j)) for (const title of Object.keys(j[c])) { const body = j[c][title]; items.push({ ...blank(), category: "System Prompt", subcategory: c, title, body, modes: inferModes(title + " " + c), nsfw: /nsfw|adult|nude/i.test(c + " " + title) }); } importJSON({ prompts: items }); }
      else importJSON(j);
    } catch { alert("Invalid JSON"); } });
    e.target.value = "";
  }

  if (!mounted) return null;
  return (
    <Page title="Prompt Library" subtitle={`${prompts.length} prompts · import the original predefined_prompts.json or add your own`}
      actions={<>
        <label className="btn-outline cursor-pointer"><Upload size={15} /> Import<input type="file" accept="application/json" hidden onChange={onImport} /></label>
        <button className="btn-outline" onClick={importURL}><Link2 size={15} /> From URL</button>
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
        renderCard={(p) => (
          <div className="card p-4 flex flex-col">
            {p.cover && <img src={p.cover} className="w-full aspect-video object-cover rounded-lg mb-2" alt="" loading="lazy" />}
            <div className="flex items-center justify-between mb-1.5"><span className="chip">{p.category}{p.subcategory ? " · " + p.subcategory : ""}</span>{p.nsfw && <span className="chip text-rose-400 border-rose-400/40">18+</span>}</div>
            <div className="font-medium mb-1">{p.title || "Untitled"}</div>
            {!!p.modes?.length && <div className="flex flex-wrap gap-1 mb-1">{p.modes.map((m) => <span key={m} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${modeColor(m)}`}>{m}</span>)}</div>}
            <p className="text-xs text-muted line-clamp-4 flex-1">{p.body || "—"}</p>
            <div className="flex items-center gap-1.5 mt-3">
              <button className="btn-primary px-3 py-1.5 text-xs flex-1" onClick={() => use(p)} title="Use in Studio"><Send size={13} /> Use</button>
              <button className="btn-ghost px-2 py-1.5 text-xs" onClick={() => copy(p.body)} title="Copy"><Copy size={13} /></button>
              <button className="btn-ghost px-2 py-1.5 text-xs" onClick={() => sendToRecipes(p)} title="Send to Recipes"><ChefHat size={13} /></button>
              <button className="btn-ghost px-2 py-1.5 text-xs" onClick={() => setEdit(p)} title="Edit"><Pencil size={13} /></button>
              <button className="btn-ghost px-2 py-1.5 text-xs text-rose-400" onClick={() => del(p.id)} title="Delete"><Trash2 size={13} /></button>
            </div>
          </div>
        )}
      />

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && prompts.some((x) => x.id === edit.id) ? "Edit prompt" : "New prompt"} wide>{edit && <EditForm item={edit} onSave={save} />}</Modal>
    </Page>
  );
}

function EditForm({ item, onSave }: { item: PromptItem; onSave: (p: PromptItem) => void }) {
  const [p, setP] = useState(item);
  return (
    <div>
      <div className="grid md:grid-cols-2 gap-3"><Field label="Title"><input className="input" value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} /></Field><Field label="Category"><input className="input" value={p.category} onChange={(e) => setP({ ...p, category: e.target.value })} /></Field></div>
      <div className="grid md:grid-cols-2 gap-3"><Field label="Subcategory (e.g. Video Generation, Image Editing)"><input className="input" value={p.subcategory || ""} onChange={(e) => setP({ ...p, subcategory: e.target.value })} /></Field><Field label="Modes (comma separated, e.g. T2I, I2V)"><input className="input" value={(p.modes || []).join(", ")} onChange={(e) => setP({ ...p, modes: e.target.value.split(",").map((x) => x.trim().toUpperCase()).filter(Boolean) })} /></Field></div>
      <div className="grid md:grid-cols-2 gap-3"><Field label="Media type"><select className="input" value={p.mediaType} onChange={(e) => setP({ ...p, mediaType: e.target.value as any })}><option value="image">image</option><option value="video">video</option><option value="text">text</option></select></Field><Field label="Adult / NSFW"><div className="pt-1.5"><Toggle checked={p.nsfw} onChange={(b) => setP({ ...p, nsfw: b })} label="Mark 18+" /></div></Field></div>
      <Field label="Cover image URL (example output, optional)"><input className="input" value={p.cover || ""} onChange={(e) => setP({ ...p, cover: e.target.value })} /></Field>
      <Field label="Prompt body"><textarea className="input min-h-[160px]" value={p.body} onChange={(e) => setP({ ...p, body: e.target.value })} /></Field>
      <div className="flex justify-end gap-2 mt-2"><button className="btn-primary" onClick={() => onSave(p)}>Save</button></div>
    </div>
  );
}
