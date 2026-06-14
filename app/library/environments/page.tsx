"use client";
import { useState } from "react";
import Page from "@/components/Page";
import { Modal, Field, Toggle, useMounted, copy } from "@/components/ui";
import LibraryGroups from "@/components/LibraryGroups";
import { useLibrary, newId } from "@/lib/store/library";
import { downloadJSON } from "@/lib/utils";
import type { EnvironmentItem } from "@/lib/types";
import { Plus, Search, Copy, Pencil, Trash2, Download } from "lucide-react";

const blank = (): EnvironmentItem => ({ id: newId(), name: "", category: "Outdoor", description: "", lighting: "", mood: "", timeOfDay: "", tags: [], nsfw: false, createdAt: Date.now(), updatedAt: Date.now() });

export default function EnvironmentsPage() {
  const mounted = useMounted();
  const environments = useLibrary((s) => s.environments);
  const setKey = useLibrary((s) => s.set);
  const [q, setQ] = useState(""); const [cat, setCat] = useState("All"); const [edit, setEdit] = useState<EnvironmentItem | null>(null);
  const cats = ["All", ...Array.from(new Set(environments.map((e) => e.category)))];
  const filtered = environments.filter((e) => (cat === "All" || e.category === cat) && (e.name + e.description).toLowerCase().includes(q.toLowerCase()));
  function save(e: EnvironmentItem) { e.updatedAt = Date.now(); const ex = environments.some((x) => x.id === e.id); setKey("environments", ex ? environments.map((x) => x.id === e.id ? e : x) : [e, ...environments]); setEdit(null); }
  function del(id: string) { setKey("environments", environments.filter((e) => e.id !== id)); }
  function full(e: EnvironmentItem) { return [e.description, e.lighting, e.mood].filter(Boolean).join(", "); }
  if (!mounted) return null;
  return (
    <Page title="Environment Library" subtitle={`${environments.length} scenes & settings to drop into any prompt or recipe`} actions={<><button className="btn-outline" onClick={() => downloadJSON("environments.json", { environments })}><Download size={15} /> Export</button><button className="btn-primary" onClick={() => setEdit(blank())}><Plus size={15} /> New environment</button></>}>
      <div className="flex flex-wrap items-center gap-3 mb-4"><div className="relative flex-1 min-w-[220px]"><Search size={15} className="absolute left-3 top-2.5 text-muted" /><input className="input pl-9" placeholder="Search environments…" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
      <div className="flex flex-wrap gap-2 mb-5">{cats.map((c) => <button key={c} className={`tab ${cat === c ? "tab-active" : "tab-idle"}`} onClick={() => setCat(c)}>{c}</button>)}</div>
      <LibraryGroups
        items={filtered}
        groupOf={(e) => e.category}
        titleOf={(e) => e.name}
        renderCard={(e) => (
          <div className="card p-4 flex flex-col">
            <div className="flex items-center justify-between mb-1.5"><span className="chip">{e.category}</span>{e.nsfw && <span className="chip text-rose-400 border-rose-400/40">18+</span>}</div>
            <div className="font-medium mb-1">{e.name}</div><p className="text-xs text-muted line-clamp-3 flex-1">{e.description}</p>
            <div className="text-[11px] text-muted mt-2">{[e.lighting, e.mood].filter(Boolean).join(" · ")}</div>
            <div className="flex items-center gap-1.5 mt-3"><button className="btn-ghost px-2 py-1 text-xs" onClick={() => copy(full(e))}><Copy size={13} /> Copy</button><button className="btn-ghost px-2 py-1 text-xs" onClick={() => setEdit(e)}><Pencil size={13} /></button><button className="btn-ghost px-2 py-1 text-xs text-rose-400" onClick={() => del(e.id)}><Trash2 size={13} /></button></div>
          </div>
        )}
      />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && environments.some((x) => x.id === edit.id) ? "Edit environment" : "New environment"} wide>{edit && <Form item={edit} onSave={save} />}</Modal>
    </Page>
  );
}

function Form({ item, onSave }: { item: EnvironmentItem; onSave: (e: EnvironmentItem) => void }) {
  const [e, setE] = useState(item);
  return (
    <div>
      <div className="grid md:grid-cols-2 gap-3"><Field label="Name"><input className="input" value={e.name} onChange={(x) => setE({ ...e, name: x.target.value })} /></Field><Field label="Category"><input className="input" value={e.category} onChange={(x) => setE({ ...e, category: x.target.value })} /></Field></div>
      <Field label="Description"><textarea className="input min-h-[90px]" value={e.description} onChange={(x) => setE({ ...e, description: x.target.value })} /></Field>
      <div className="grid md:grid-cols-3 gap-3"><Field label="Lighting"><input className="input" value={e.lighting} onChange={(x) => setE({ ...e, lighting: x.target.value })} /></Field><Field label="Mood"><input className="input" value={e.mood} onChange={(x) => setE({ ...e, mood: x.target.value })} /></Field><Field label="Time of day"><input className="input" value={e.timeOfDay} onChange={(x) => setE({ ...e, timeOfDay: x.target.value })} /></Field></div>
      <Toggle checked={e.nsfw} onChange={(b) => setE({ ...e, nsfw: b })} label="Mark 18+" />
      <div className="flex justify-end mt-3"><button className="btn-primary" onClick={() => onSave(e)}>Save</button></div>
    </div>
  );
}
