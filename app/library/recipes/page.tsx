"use client";
import { Suspense, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Page from "@/components/Page";
import { Modal, Field, Toggle, useMounted, copy } from "@/components/ui";
import { useLibrary, newId } from "@/lib/store/library";
import { useSettings } from "@/lib/store/settings";
import { chat } from "@/lib/providers";
import type { Template, Bank } from "@/lib/types";
import { PF_CATEGORIES, chipClasses, catColor, parseTemplate, templateTokens, tokenOptions, assembleTemplate, tokenLabel } from "@/lib/promptfill";
import { Plus, Search, Copy, Pencil, Trash2, Download, Upload, Send, Dice5, Wand2, Scissors, LayoutGrid, SquarePen, Image as ImageIcon, Clapperboard, Film } from "lucide-react";

const blankTemplate = (): Template => ({ id: newId(), name: "New Template", content: "A {{art_style}} photo of {{subject}}.", mediaType: "image", selections: {}, tags: [], nsfw: false, createdAt: Date.now(), updatedAt: Date.now() });

function PromptFillInner() {
  const mounted = useMounted();
  const router = useRouter();
  const templates = useLibrary((s) => s.templates);
  const banks = useLibrary((s) => s.banks);
  const setKey = useLibrary((s) => s.set);
  const importJSON = useLibrary((s) => s.importJSON);
  const [view, setView] = useState<"gallery" | "editor">("gallery");
  const [editId, setEditId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("All");

  const tags = useMemo(() => ["All", ...Array.from(new Set(templates.flatMap((t) => t.tags)))], [templates]);
  const filtered = templates.filter((t) => (tag === "All" || t.tags.includes(tag)) && (t.name + t.content).toLowerCase().includes(q.toLowerCase()));
  const editing = templates.find((t) => t.id === editId) || null;

  function saveTemplate(t: Template) {
    t.updatedAt = Date.now();
    const exists = templates.some((x) => x.id === t.id);
    setKey("templates", exists ? templates.map((x) => (x.id === t.id ? t : x)) : [t, ...templates]);
  }
  function del(id: string) { setKey("templates", templates.filter((t) => t.id !== id)); if (editId === id) { setEditId(null); setView("gallery"); } }
  function openNew() { const t = blankTemplate(); saveTemplate(t); setEditId(t.id); setView("editor"); }
  function openEdit(id: string) { setEditId(id); setView("editor"); }
  function use(t: Template) { const prompt = assembleTemplate(t.content, t.selections, banks); router.push(`/studio/${t.mediaType === "video" ? "video" : "image"}?prompt=${encodeURIComponent(prompt)}`); }
  function saveBanks(b: Bank[]) { setKey("banks", b); }

  function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    f.text().then((txt) => {
      try {
        const j = JSON.parse(txt);
        const newBanks: Bank[] = [];
        const rawBanks = j.banks || j.INITIAL_BANKS;
        if (rawBanks && !Array.isArray(rawBanks)) {
          for (const id of Object.keys(rawBanks)) {
            const b = rawBanks[id];
            newBanks.push({ id, name: (b.label?.en || b.label || id) as string, category: b.category || "other", options: (b.options || []).map((o: any) => (o?.en || o?.value || o)), nsfw: false, createdAt: Date.now(), updatedAt: Date.now() });
          }
        } else if (Array.isArray(j.banks)) newBanks.push(...j.banks);
        const rawTemplates = j.templates || [];
        const newTemplates: Template[] = (Array.isArray(rawTemplates) ? rawTemplates : []).map((t: any) => ({
          id: newId(), name: (t.name?.en || t.name || "Template") as string,
          content: (t.content?.en || t.content || "") as string, mediaType: t.mediaType === "video" ? "video" : "image",
          cover: t.imageUrl || t.cover, selections: t.selections || {}, tags: t.tags || [], nsfw: !!t.nsfw, bestModel: t.bestModel,
          createdAt: Date.now(), updatedAt: Date.now(),
        }));
        if (newBanks.length) setKey("banks", [...banks, ...newBanks.filter((b) => !banks.some((x) => x.id === b.id))]);
        if (newTemplates.length) setKey("templates", [...newTemplates, ...templates]);
        if (!newBanks.length && !newTemplates.length && j.templates === undefined) importJSON(j);
        alert(`Imported ${newTemplates.length} templates and ${newBanks.length} banks.`);
      } catch { alert("Invalid PromptFill JSON"); }
    });
    e.target.value = "";
  }

  if (!mounted) return null;

  return (
    <Page title="Recipe Gear" subtitle={`${templates.length} recipes · ${banks.length} variable banks · build prompts visually (PromptFill-style)`}
      actions={<>
        <label className="btn-outline cursor-pointer"><Upload size={15} /> Import<input type="file" accept="application/json" hidden onChange={onImport} /></label>
        <button className="btn-outline" onClick={() => downloadPF("promptfill.json", { templates, banks })}><Download size={15} /> Export</button>
        <button className={`btn-outline ${view === "gallery" ? "shadow-glow" : ""}`} onClick={() => setView("gallery")}><LayoutGrid size={15} /></button>
        <button className={`btn-outline ${view === "editor" ? "shadow-glow" : ""}`} onClick={() => { if (!editId && templates[0]) setEditId(templates[0].id); setView("editor"); }}><SquarePen size={15} /></button>
        <button className="btn-primary" onClick={openNew}><Plus size={15} /> New template</button>
      </>}>

      {view === "gallery" ? (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[220px]"><Search size={15} className="absolute left-3 top-2.5 text-muted" /><input className="input pl-9" placeholder="Search templates…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          </div>
          <div className="flex flex-wrap gap-2 mb-5">{tags.map((t) => <button key={t} className={`tab ${tag === t ? "tab-active" : "tab-idle"}`} onClick={() => setTag(t)}>{t}</button>)}</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t) => {
              const preview = assembleTemplate(t.content, t.selections, banks);
              return (
                <div key={t.id} className="card overflow-hidden flex flex-col">
                  <div className="aspect-video bg-surface2 grid place-items-center overflow-hidden">
                    {t.cover ? <img src={t.cover} className="w-full h-full object-cover" alt="" /> : (t.mediaType === "video" ? <Clapperboard className="text-muted" /> : <ImageIcon className="text-muted" />)}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-1"><span className="chip text-[10px]">{t.mediaType}{t.bestModel ? " · " + t.bestModel : ""}</span>{t.nsfw && <span className="chip text-rose-400 border-rose-400/40 text-[10px]">18+</span>}</div>
                    <div className="font-medium mb-1">{t.name}</div>
                    <div className="flex flex-wrap gap-1 mb-1">{t.tags.slice(0, 4).map((x) => <span key={x} className="text-[10px] px-1.5 py-0.5 rounded bg-surface2 text-muted">{x}</span>)}</div>
                    <p className="text-xs text-muted line-clamp-2 flex-1">{preview}</p>
                    <div className="flex items-center gap-1.5 mt-3">
                      <button className="btn-primary px-3 py-1.5 text-xs flex-1" onClick={() => use(t)}><Send size={13} /> Use</button>
                      <button className="btn-ghost px-2 py-1.5 text-xs" onClick={() => copy(preview)}><Copy size={13} /></button>
                      <button className="btn-ghost px-2 py-1.5 text-xs" onClick={() => openEdit(t.id)}><Pencil size={13} /></button>
                      <button className="btn-ghost px-2 py-1.5 text-xs text-rose-400" onClick={() => del(t.id)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="grid lg:grid-cols-[230px_1fr_320px] gap-4">
          <div className="card p-2 h-max max-h-[calc(100vh-150px)] overflow-y-auto">
            <button className="btn-ghost w-full text-xs mb-2" onClick={openNew}><Plus size={13} /> New</button>
            {templates.map((t) => (
              <button key={t.id} onClick={() => setEditId(t.id)} className={`w-full text-left rounded-lg px-2.5 py-2 text-sm mb-0.5 ${editId === t.id ? "bg-surface2" : "hover:bg-surface2"}`}>
                <div className="truncate">{t.name}</div>
                <div className="text-[10px] text-muted">{t.mediaType}{t.tags[0] ? " · " + t.tags[0] : ""}</div>
              </button>
            ))}
          </div>
          {editing ? <Editor key={editing.id} template={editing} banks={banks} onSave={saveTemplate} onSaveBanks={saveBanks} onUse={use} onDelete={del} /> : <div className="card p-10 text-center text-muted">Select or create a template.</div>}
        </div>
      )}
    </Page>
  );
}

function Editor({ template, banks, onSave, onSaveBanks, onUse, onDelete }: { template: Template; banks: Bank[]; onSave: (t: Template) => void; onSaveBanks: (b: Bank[]) => void; onUse: (t: Template) => void; onDelete: (id: string) => void }) {
  const settings = useSettings();
  const [t, setT] = useState<Template>({ ...template, selections: { ...template.selections } });
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<"vars" | "banks">("vars");
  const segs = parseTemplate(t.content);
  const tokens = templateTokens(t.content);
  const assembled = assembleTemplate(t.content, t.selections, banks);

  function update(patch: Partial<Template>) { const next = { ...t, ...patch }; setT(next); onSave(next); }
  function setSel(token: string, value: string) { update({ selections: { ...t.selections, [token]: value } }); }
  function randomize() {
    const sel = { ...t.selections };
    for (const { token, def } of tokens) { const opts = tokenOptions(token, def, banks); if (opts.length) sel[token] = opts[Math.floor(Math.random() * opts.length)]; }
    update({ selections: sel });
  }
  function duplicate() { const copy2 = { ...t, id: newId(), name: t.name + " copy", createdAt: Date.now(), updatedAt: Date.now() }; onSave(copy2); }
  async function smartSplit() {
    if (!t.content.trim()) return; setBusy(true);
    try {
      const out = await chat({ model: "Nexus Cloud", uncensored: settings.uncensored,
        system: "Rewrite the prompt into a reusable template by replacing each variable phrase with a {{snake_case_token: original phrase}} marker. Keep all other words. Output only the rewritten template.",
        messages: [{ id: "1", role: "user", content: t.content }] });
      if (out) update({ content: out.trim() });
    } catch (e: any) { alert("Smart Split failed: " + e.message); }
    setBusy(false);
  }
  async function polish() {
    setBusy(true);
    try {
      const out = await chat({ model: "Nexus Cloud", uncensored: settings.uncensored,
        system: "Polish this image/video generation prompt into a vivid, detailed version. Output only the prompt.",
        messages: [{ id: "1", role: "user", content: assembled }] });
      if (out) { copy(out.trim()); alert("Polished prompt copied to clipboard."); }
    } catch (e: any) { alert("Polish failed: " + e.message); }
    setBusy(false);
  }
  function addBankOption(bankId: string, value: string) {
    if (!value.trim()) return;
    onSaveBanks(banks.map((b) => (b.id === bankId ? { ...b, options: [...b.options, value.trim()] } : b)));
  }
  function insertToken(id: string) { update({ content: t.content + (t.content.endsWith(" ") || !t.content ? "" : " ") + `{{${id}}}` }); }
  function createBank(name: string, category: string) {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "bank_" + Date.now();
    if (banks.some((b) => b.id === id)) return id;
    onSaveBanks([...banks, { id, name, category, options: [], nsfw: false, createdAt: Date.now(), updatedAt: Date.now() }]);
    return id;
  }

  return (
    <>
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <input className="input flex-1 min-w-[160px] font-medium" value={t.name} onChange={(e) => update({ name: e.target.value })} />
          <div className="flex gap-1">
            <button className={`tab ${t.mediaType === "image" ? "tab-active" : "tab-idle"}`} onClick={() => update({ mediaType: "image" })}><ImageIcon size={13} /></button>
            <button className={`tab ${t.mediaType === "video" ? "tab-active" : "tab-idle"}`} onClick={() => update({ mediaType: "video" })}><Film size={13} /></button>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-3 items-start">
          <div className="space-y-1.5">
            <span className="label">Cover image</span>
            <div className="flex gap-2 items-center">
              <input
                type="file"
                id="recipe-cover-upload"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      update({ cover: reader.result as string });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <label htmlFor="recipe-cover-upload" className="btn-outline text-xs cursor-pointer py-2 px-3 flex items-center gap-1.5 shrink-0 h-9">
                <Upload size={14} /> Upload Local
              </label>
              <input
                className="input text-xs flex-1 h-9"
                placeholder="Or paste cover URL..."
                value={t.cover && !t.cover.startsWith("data:") ? t.cover : ""}
                onChange={(e) => update({ cover: e.target.value })}
              />
            </div>
            {t.cover && (
              <div className="flex items-center gap-2 mt-1.5 bg-surface2/60 border border-border/40 p-1.5 rounded-lg">
                <img src={t.cover} className="w-8 h-8 rounded object-cover border border-border" alt="Cover preview" />
                <span className="text-[10px] text-muted truncate max-w-[150px]">
                  {t.cover.startsWith("data:") ? "Local File Uploaded" : t.cover}
                </span>
                <button
                  type="button"
                  className="text-rose-400 hover:text-rose-300 text-[10px] ml-auto font-medium"
                  onClick={() => update({ cover: "" })}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
          <div>
            <span className="label">Tags (comma separated)</span>
            <input className="input text-xs h-9 mt-1.5" placeholder="e.g. landscape, cinematic" value={t.tags.join(", ")} onChange={(e) => update({ tags: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} />
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button className="btn-ghost px-2 py-1 text-xs" onClick={randomize}><Dice5 size={13} /> Randomize</button>
          <button className="btn-ghost px-2 py-1 text-xs" onClick={duplicate}><Copy size={13} /> Duplicate</button>
          <button className="btn-ghost px-2 py-1 text-xs" onClick={smartSplit} disabled={busy}><Scissors size={13} /> AI Smart Split</button>
          <button className="btn-ghost px-2 py-1 text-xs" onClick={polish} disabled={busy}><Wand2 size={13} /> AI Polish</button>
          <button className="btn-ghost px-2 py-1 text-xs text-rose-400 ml-auto" onClick={() => onDelete(t.id)}><Trash2 size={13} /></button>
        </div>

        <div>
          <span className="label">Template (click a colored chip to change it)</span>
          <div className="rounded-xl bg-surface2 border border-border p-3 leading-8 text-sm">
            {segs.map((seg, i) => {
              if (seg.kind === "text") return <span key={i}>{seg.text}</span>;
              const opts = tokenOptions(seg.token!, seg.def, banks);
              const bank = banks.find((b) => b.id === seg.token);
              const color = chipClasses(catColor(bank?.category));
              const val = t.selections[seg.token!] || seg.def || bank?.options[0] || seg.token || "";
              return (
                <span key={i} className={`inline-flex items-center rounded-md px-1.5 py-0.5 mx-0.5 ${color}`}>
                  <select className="bg-transparent outline-none text-inherit cursor-pointer max-w-[180px] truncate" value={t.selections[seg.token!] ?? ""} onChange={(e) => { if (e.target.value === "__custom") { const v = prompt2("Custom value:", val); if (v) setSel(seg.token!, v); } else setSel(seg.token!, e.target.value); }}>
                    <option value="">{val}</option>
                    {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                    <option value="__custom">Custom…</option>
                  </select>
                </span>
              );
            })}
          </div>
        </div>

        <details>
          <summary className="text-xs text-muted cursor-pointer">Edit raw template text</summary>
          <textarea className="input min-h-[100px] mt-2 text-xs" value={t.content} onChange={(e) => update({ content: e.target.value })} placeholder="Use {{token}} or {{token: default}}" />
        </details>

        <div className="card p-3 bg-surface2">
          <div className="flex items-center justify-between mb-1"><span className="label mb-0">Assembled prompt</span>
            <div className="flex gap-2"><button className="btn-ghost px-2 py-1 text-xs" onClick={() => copy(assembled)}><Copy size={13} /> Copy</button><button className="btn-primary px-2 py-1 text-xs" onClick={() => onUse(t)}><Send size={13} /> Use</button></div>
          </div>
          <p className="text-sm">{assembled}</p>
        </div>
      </div>

      <div className="card p-3 h-max max-h-[calc(100vh-150px)] overflow-y-auto">
        <div className="flex gap-1 mb-3">
          <button className={`tab flex-1 ${panel === "vars" ? "tab-active" : "tab-idle"}`} onClick={() => setPanel("vars")}>Variables</button>
          <button className={`tab flex-1 ${panel === "banks" ? "tab-active" : "tab-idle"}`} onClick={() => setPanel("banks")}>All Banks</button>
        </div>
        {panel === "vars" ? (
          <div className="space-y-3">
            {tokens.length === 0 && <div className="text-xs text-muted">No variables yet. Add {"{{token}}"} markers in the template, or insert a bank from All Banks.</div>}
            {tokens.map(({ token, def }) => {
              const bank = banks.find((b) => b.id === token);
              const opts = tokenOptions(token, def, banks);
              const color = chipClasses(catColor(bank?.category));
              return (
                <div key={token} className="rounded-xl border border-border p-2.5">
                  <div className="flex items-center justify-between mb-1.5"><span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${color}`}>{tokenLabel(token, banks)}</span><span className="text-[10px] text-muted">{bank ? bank.category : "local"}</span></div>
                  <div className="flex flex-wrap gap-1">
                    {opts.map((o) => <button key={o} onClick={() => setSel(token, o)} className={`text-[11px] px-1.5 py-0.5 rounded border ${t.selections[token] === o ? "border-primary text-primary" : "border-border text-muted hover:text-text"}`}>{o}</button>)}
                  </div>
                  {bank && <AddOption onAdd={(v) => addBankOption(bank.id, v)} />}
                </div>
              );
            })}
          </div>
        ) : (
          <AllBanks banks={banks} categories={PF_CATEGORIES} onInsert={insertToken} onCreate={createBank} />
        )}
      </div>
    </>
  );
}

function AddOption({ onAdd }: { onAdd: (v: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="flex gap-1 mt-2">
      <input className="input py-1 text-[11px]" placeholder="add option to bank…" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { onAdd(v); setV(""); } }} />
      <button className="btn-ghost px-2 py-1 text-[11px]" onClick={() => { onAdd(v); setV(""); }}><Plus size={12} /></button>
    </div>
  );
}

function AllBanks({ banks, categories, onInsert, onCreate }: { banks: Bank[]; categories: typeof PF_CATEGORIES; onInsert: (id: string) => void; onCreate: (name: string, cat: string) => void }) {
  const [open, setOpen] = useState(false);
  const [nb, setNb] = useState({ name: "", category: "character" });
  return (
    <div className="space-y-3">
      <button className="btn-outline w-full text-xs" onClick={() => setOpen(true)}><Plus size={13} /> New bank</button>
      {categories.map((cat) => {
        const inCat = banks.filter((b) => b.category === cat.id);
        if (!inCat.length) return null;
        return (
          <div key={cat.id}>
            <div className={`text-[11px] font-semibold mb-1 px-1.5 py-0.5 rounded inline-block ${chipClasses(cat.color)}`}>{cat.label} ({inCat.length})</div>
            <div className="space-y-1">
              {inCat.map((b) => (
                <button key={b.id} onClick={() => onInsert(b.id)} className="w-full text-left rounded-lg px-2.5 py-1.5 text-sm hover:bg-surface2 flex items-center justify-between">
                  <span>{b.name}</span><span className="text-[10px] text-muted">{b.options.length} · insert</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <Modal open={open} onClose={() => setOpen(false)} title="New bank">
        <Field label="Name"><input className="input" value={nb.name} onChange={(e) => setNb({ ...nb, name: e.target.value })} /></Field>
        <Field label="Category"><select className="input" value={nb.category} onChange={(e) => setNb({ ...nb, category: e.target.value })}>{categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></Field>
        <button className="btn-primary" onClick={() => { if (nb.name) { onCreate(nb.name, nb.category); setNb({ name: "", category: "character" }); setOpen(false); } }}>Create bank</button>
      </Modal>
    </div>
  );
}

function prompt2(msg: string, def: string): string | null { return typeof window !== "undefined" ? window.prompt(msg, def) : null; }
function downloadPF(name: string, data: any) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
}

export default function PromptFillPage() { return <Suspense fallback={null}><PromptFillInner /></Suspense>; }
