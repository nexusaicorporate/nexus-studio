"use client";
import { useState } from "react";
import Page from "@/components/Page";
import { Modal, Field, Toggle, useMounted, copy } from "@/components/ui";
import { useLibrary, newId } from "@/lib/store/library";
import type { Character } from "@/lib/types";
import { Plus, Pencil, Trash2, Copy, User, Send, ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { characterPrompt } from "@/lib/character";
const blank = (): Character => ({ id: newId(), name: "", persona: "", appearance: "", age: "23", bodyAttributes: "", outfitDefaults: "", styleNotes: "", negative: "deformed, extra fingers, watermark, text", triggerWord: "", refImages: [], nsfw: false, createdAt: Date.now(), updatedAt: Date.now() });
export default function CharacterPage() {
  const mounted = useMounted(); const router = useRouter();
  const characters = useLibrary((s) => s.characters); const setKey = useLibrary((s) => s.set);
  const [edit, setEdit] = useState<Character | null>(null);
  function save(c: Character) { c.updatedAt = Date.now(); const ex = characters.some((x) => x.id === c.id); setKey("characters", ex ? characters.map((x) => x.id === c.id ? c : x) : [c, ...characters]); setEdit(null); }
  function del(id: string) { setKey("characters", characters.filter((c) => c.id !== id)); }
  if (!mounted) return null;
  return (
    <Page title="Character Creator" subtitle="Create, manage and store consistent personas. Lock an identity anchor so every generation stays on-model." actions={<button className="btn-primary" onClick={() => setEdit(blank())}><Plus size={15} /> New character</button>}>
      {characters.length === 0 ? (
        <div className="card p-10 text-center text-muted"><User className="mx-auto mb-3 opacity-50" size={36} />No characters yet. Create your first persona — name, locked appearance, body, default outfit, style notes and reference images.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((c) => (
            <div key={c.id} className="card p-4 flex flex-col">
              <div className="flex items-center gap-3 mb-2"><div className="w-14 h-14 rounded-xl bg-surface2 overflow-hidden grid place-items-center">{c.refImages[0] ? <img src={c.refImages[0]} className="w-full h-full object-cover" alt="" /> : <User size={22} className="text-muted" />}</div><div><div className="font-medium">{c.name || "Unnamed"}</div><div className="text-[11px] text-muted">age {c.age}{c.nsfw ? " · 18+" : ""}{c.triggerWord ? ` · ${c.triggerWord}` : ""}</div></div></div>
              <p className="text-xs text-muted line-clamp-3 flex-1">{c.appearance || c.persona || "—"}</p>
              <div className="flex items-center gap-1.5 mt-3"><button className="btn-ghost px-2 py-1 text-xs" onClick={() => copy(characterPrompt(c))}><Copy size={13} /></button><button className="btn-ghost px-2 py-1 text-xs" onClick={() => router.push(`/studio/image?character=${c.id}`)} title="Generate"><Send size={13} /></button><button className="btn-ghost px-2 py-1 text-xs" onClick={() => setEdit(c)}><Pencil size={13} /></button><button className="btn-ghost px-2 py-1 text-xs text-rose-400" onClick={() => del(c.id)}><Trash2 size={13} /></button></div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && characters.some((x) => x.id === edit.id) ? "Edit character" : "New character"} wide>{edit && <Form item={edit} onSave={save} />}</Modal>
    </Page>
  );
}
function Form({ item, onSave }: { item: Character; onSave: (c: Character) => void }) {
  const [c, setC] = useState(item);
  function addImage(e: React.ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (!f) return; const reader = new FileReader(); reader.onload = () => setC((x) => ({ ...x, refImages: [...x.refImages, reader.result as string] })); reader.readAsDataURL(f); e.target.value = ""; }
  return (
    <div>
      <div className="grid md:grid-cols-3 gap-3"><Field label="Name"><input className="input" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></Field><Field label="Age (18+)"><input className="input" value={c.age} onChange={(e) => setC({ ...c, age: e.target.value })} /></Field><Field label="Trigger word / token"><input className="input" value={c.triggerWord} onChange={(e) => setC({ ...c, triggerWord: e.target.value })} placeholder="e.g. miakvn" /></Field></div>
      <Field label="Persona / bio"><textarea className="input min-h-[70px]" value={c.persona} onChange={(e) => setC({ ...c, persona: e.target.value })} /></Field>
      <Field label="Locked appearance (identity anchor — face, hair, eyes, distinctive features)"><textarea className="input min-h-[90px]" value={c.appearance} onChange={(e) => setC({ ...c, appearance: e.target.value })} /></Field>
      <div className="grid md:grid-cols-2 gap-3"><Field label="Body attributes"><textarea className="input min-h-[60px]" value={c.bodyAttributes} onChange={(e) => setC({ ...c, bodyAttributes: e.target.value })} /></Field><Field label="Default outfit"><textarea className="input min-h-[60px]" value={c.outfitDefaults} onChange={(e) => setC({ ...c, outfitDefaults: e.target.value })} /></Field></div>
      <div className="grid md:grid-cols-2 gap-3"><Field label="Style notes"><textarea className="input min-h-[60px]" value={c.styleNotes} onChange={(e) => setC({ ...c, styleNotes: e.target.value })} /></Field><Field label="Negative prompt"><textarea className="input min-h-[60px]" value={c.negative} onChange={(e) => setC({ ...c, negative: e.target.value })} /></Field></div>
      <div className="label">Reference images</div>
      <div className="flex flex-wrap gap-2 mb-3">{c.refImages.map((img, i) => (<div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border"><img src={img} className="w-full h-full object-cover" alt="" /><button className="absolute top-0.5 right-0.5 bg-black/60 rounded px-1 text-xs" onClick={() => setC({ ...c, refImages: c.refImages.filter((_, j) => j !== i) })}>✕</button></div>))}<label className="w-20 h-20 rounded-lg border border-dashed border-border grid place-items-center cursor-pointer text-muted hover:text-text"><ImagePlus size={18} /><input type="file" accept="image/*" hidden onChange={addImage} /></label></div>
      <div className="flex items-center justify-between"><Toggle checked={c.nsfw} onChange={(b) => setC({ ...c, nsfw: b })} label="Adult / 18+ persona" /><button className="btn-primary" onClick={() => onSave(c)}>Save character</button></div>
    </div>
  );
}
