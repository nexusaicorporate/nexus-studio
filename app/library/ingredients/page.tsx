"use client";
import { useState } from "react";
import Page from "@/components/Page";
import { Modal, Field, Toggle, useMounted, copy } from "@/components/ui";
import LibraryGroups from "@/components/LibraryGroups";
import { useLibrary, newId } from "@/lib/store/library";
import { downloadJSON } from "@/lib/utils";
import type { Ingredient } from "@/lib/types";
import { INGREDIENT_CATEGORIES } from "@/lib/data/seed";
import { Plus, Search, Copy, Pencil, Trash2, Download } from "lucide-react";

const blank = (cat = "Subject"): Ingredient => ({ id: newId(), name: "", category: cat, value: "", tags: [], nsfw: false, createdAt: Date.now(), updatedAt: Date.now() });

export default function IngredientsPage() {
  const mounted = useMounted();
  const ingredients = useLibrary((s) => s.ingredients);
  const setKey = useLibrary((s) => s.set);
  const [q, setQ] = useState(""); const [cat, setCat] = useState("All"); const [edit, setEdit] = useState<Ingredient | null>(null);
  const cats = ["All", ...Array.from(new Set([...INGREDIENT_CATEGORIES, ...ingredients.map((i) => i.category)]))];
  const filtered = ingredients.filter((i) => (cat === "All" || i.category === cat) && (i.name + i.value).toLowerCase().includes(q.toLowerCase()));
  function save(i: Ingredient) { i.updatedAt = Date.now(); const ex = ingredients.some((x) => x.id === i.id); setKey("ingredients", ex ? ingredients.map((x) => x.id === i.id ? i : x) : [i, ...ingredients]); setEdit(null); }
  function del(id: string) { setKey("ingredients", ingredients.filter((i) => i.id !== id)); }
  if (!mounted) return null;
  return (
    <Page title="Ingredient Library" subtitle={`${ingredients.length} reusable building blocks (materials) grouped by category — the parts you assemble recipes from`} actions={<><button className="btn-outline" onClick={() => downloadJSON("ingredients.json", { ingredients })}><Download size={15} /> Export</button><button className="btn-primary" onClick={() => setEdit(blank(cat === "All" ? "Subject" : cat))}><Plus size={15} /> New ingredient</button></>}>
      <div className="flex flex-wrap items-center gap-3 mb-4"><div className="relative flex-1 min-w-[220px]"><Search size={15} className="absolute left-3 top-2.5 text-muted" /><input className="input pl-9" placeholder="Search ingredients…" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
      <div className="flex flex-wrap gap-2 mb-5">{cats.map((c) => <button key={c} className={`tab ${cat === c ? "tab-active" : "tab-idle"}`} onClick={() => setCat(c)}>{c}</button>)}</div>
      <LibraryGroups
        items={filtered}
        groupOf={(i) => i.category}
        titleOf={(i) => i.name}
        gridClass="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
        renderCard={(i) => (
          <div className="card p-3.5 flex flex-col">
            <div className="flex items-center justify-between mb-1"><span className="chip text-[10px]">{i.category}</span>{i.nsfw && <span className="chip text-rose-400 border-rose-400/40 text-[10px]">18+</span>}</div>
            <div className="font-medium text-sm">{i.name || "Untitled"}</div><p className="text-xs text-muted line-clamp-2 flex-1 mt-1">{i.value || "—"}</p>
            <div className="flex items-center gap-1 mt-2"><button className="btn-ghost px-2 py-1 text-xs" onClick={() => copy(i.value)}><Copy size={12} /></button><button className="btn-ghost px-2 py-1 text-xs" onClick={() => setEdit(i)}><Pencil size={12} /></button><button className="btn-ghost px-2 py-1 text-xs text-rose-400" onClick={() => del(i.id)}><Trash2 size={12} /></button></div>
          </div>
        )}
      />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && ingredients.some((x) => x.id === edit.id) ? "Edit ingredient" : "New ingredient"}>{edit && <Form item={edit} cats={INGREDIENT_CATEGORIES} onSave={save} />}</Modal>
    </Page>
  );
}

function Form({ item, cats, onSave }: { item: Ingredient; cats: string[]; onSave: (i: Ingredient) => void }) {
  const [i, setI] = useState(item);
  return (
    <div>
      <div className="grid md:grid-cols-2 gap-3"><Field label="Name / label"><input className="input" value={i.name} onChange={(e) => setI({ ...i, name: e.target.value })} /></Field><Field label="Category"><select className="input" value={i.category} onChange={(e) => setI({ ...i, category: e.target.value })}>{cats.map((c) => <option key={c}>{c}</option>)}</select></Field></div>
      <Field label="Value (text injected into recipes)"><textarea className="input min-h-[90px]" value={i.value} onChange={(e) => setI({ ...i, value: e.target.value })} /></Field>
      <Toggle checked={i.nsfw} onChange={(b) => setI({ ...i, nsfw: b })} label="Mark 18+" />
      <div className="flex justify-end mt-3"><button className="btn-primary" onClick={() => onSave(i)}>Save</button></div>
    </div>
  );
}
