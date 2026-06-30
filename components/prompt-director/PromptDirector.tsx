"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Page from "@/components/Page";
import { copy } from "@/components/ui";
import { TemplateEditor, type Element } from "@/components/prompt-director/TemplateEditor";
import { AIPolishModal } from "@/components/prompt-director/AIPolishModal";
import { Search, Copy, Send, Wand2, Upload, ArrowRight, Plus, Download } from "lucide-react";
import { useLibrary, newId } from "@/lib/store/library";
import type { Template } from "@/lib/types";

function downloadJSON(filename: string, data: any) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

interface PromptDirectorProps {
  asComponent?: boolean;
  onSaveScene?: (data: { prompt: string; templateId?: string; characterIds: string[]; ingredientIds: string[] }) => void;
  onInsert?: (txt: string) => void;
}

export function PromptDirector({ asComponent, onSaveScene, onInsert }: PromptDirectorProps) {
  const router = useRouter();
  const templates = useLibrary((s) => s.templates);
  const ingredients = useLibrary((s) => s.ingredients);
  const banks = useLibrary((s) => s.banks);
  const setKey = useLibrary((s) => s.set);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [editingCategory, setEditingCategory] = useState("");
  const [polishModalOpen, setPolishModalOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState("");

  // Build a flat Element list from ingredients + banks for TemplateEditor
  const elements: Element[] = useMemo(() => {
    const list: Element[] = [];
    ingredients.forEach((ing) => {
      list.push({ id: ing.id, type: ing.category || "ingredient", content: ing.value || ing.name });
    });
    banks.forEach((bank) => {
      (bank.options || []).forEach((opt, i) => {
        list.push({ id: `${bank.id}-${i}`, type: bank.name || bank.category, content: opt });
      });
    });
    return list;
  }, [ingredients, banks]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(templates.map((t) => t.tags?.[0] || "Custom"))).sort()], [templates]);

  const filtered = templates.filter((t) => {
    const cat = t.tags?.[0] || "Custom";
    if (activeCategory !== "All" && cat !== activeCategory) return false;
    if (search && !t.content.toLowerCase().includes(search.toLowerCase()) && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function handleUsePrompt(prompt: string) {
    if (onInsert) { onInsert(prompt); return; }
    if (onSaveScene) { onSaveScene({ prompt, templateId: editingTemplate?.id, characterIds: [], ingredientIds: [] }); return; }
    router.push(`/studio/video?prompt=${encodeURIComponent(prompt)}`);
  }

  function handleNewPrompt() {
    const t: Template = { id: newId(), name: "New Template", content: "", mediaType: "image", selections: {}, tags: ["Custom"], nsfw: false, createdAt: Date.now(), updatedAt: Date.now() };
    setKey("templates", [t, ...templates]);
    setEditingTemplate(t);
    setEditingCategory("Custom");
    setIsNew(true);
  }

  function handleEditTemplate(t: Template) {
    setEditingTemplate(t);
    setEditingCategory(t.tags?.[0] || "Custom");
    setIsNew(false);
  }

  async function handleSaveTemplate(content: string) {
    if (!editingTemplate) return;
    const updated = { ...editingTemplate, content, tags: [editingCategory || "Custom"], updatedAt: Date.now() };
    setKey("templates", templates.map((t) => t.id === editingTemplate.id ? updated : t));
    setEditingTemplate(updated);
    setIsNew(false);
  }

  function handleElementsUpdated(newEl: Element) {
    // Add the new element as an ingredient to the library store
    const exists = ingredients.some((i) => (i.value || i.name) === newEl.content && i.category === newEl.type);
    if (!exists) {
      setKey("ingredients", [...ingredients, {
        id: newEl.id, name: newEl.content, category: newEl.type, value: newEl.content,
        tags: [], nsfw: false, createdAt: Date.now(), updatedAt: Date.now(),
      }]);
    }
  }

  function handleImportJson(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    f.text().then((txt) => {
      try {
        const j = JSON.parse(txt);
        const newTemplates: Template[] = (j.templates || j.recipes || []).map((t: any) => ({
          id: newId(), name: t.name || t.category || "Imported", content: t.content || t.templateString || "",
          mediaType: t.mediaType || "image", selections: {}, tags: [t.category || t.tags?.[0] || "imported"],
          nsfw: !!t.nsfw, createdAt: Date.now(), updatedAt: Date.now(),
        }));
        if (newTemplates.length) {
          setKey("templates", [...newTemplates, ...templates]);
          alert(`Imported ${newTemplates.length} templates.`);
        } else {
          alert("No templates found in file.");
        }
      } catch { alert("Invalid JSON file."); }
    });
    e.target.value = "";
  }

  const handleApplyPolished = (newPrompt: string) => {
    copy(newPrompt);
    alert("Polished prompt copied to clipboard!");
  };

  const Sidebar = () => (
    <div className="space-y-4 h-full max-h-[calc(100vh-140px)] flex flex-col">
      <button onClick={handleNewPrompt} className="btn-primary w-full text-sm py-2">
        <Plus size={15} className="mr-1.5" /> New Template
      </button>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-2.5 text-muted" />
        <input className="input pl-9 w-full bg-surface2 border-border/50" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`text-[10px] px-2 py-1 rounded-md font-medium transition-colors border ${activeCategory === cat ? "bg-primary text-primary-content border-primary" : "bg-surface2 text-muted border-transparent hover:bg-surface3"}`}>
            {cat}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filtered.length === 0 ? (
          <div className="text-muted text-xs p-3 text-center bg-surface2 rounded-lg">No templates found.</div>
        ) : filtered.map((t) => (
          <div key={t.id} onClick={() => handleEditTemplate(t)}
            className={`p-3 rounded-xl border transition-all cursor-pointer group ${editingTemplate?.id === t.id ? "bg-primary/10 border-primary/30" : "bg-surface2 border-border/50 hover:border-primary/50"}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-primary">{t.tags?.[0] || "Custom"}</span>
              <ArrowRight size={13} className={`transition-opacity ${editingTemplate?.id === t.id ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-50"}`} />
            </div>
            <p className="text-xs text-text/80 line-clamp-2 leading-relaxed">{t.name}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const content = (
    <>
      {editingTemplate ? (
        <div className={`grid gap-6 ${asComponent ? "grid-cols-1" : "lg:grid-cols-[1fr_3fr]"}`}>
          {!asComponent && <Sidebar />}
          <div className="card p-6 border-primary/20 bg-surface/50 h-full flex flex-col gap-4">
            <div className="flex items-center gap-4 border-b border-border/50 pb-4">
              <button onClick={() => setEditingTemplate(null)} className="btn-ghost px-2 py-1.5 text-xs lg:hidden">
                <ArrowRight size={14} className="rotate-180 mr-1" /> Back
              </button>
              <div className="flex-1">
                <label className="label mb-1">Category / Tag</label>
                <input className="input max-w-xs py-1.5 text-sm" value={editingCategory} onChange={(e) => setEditingCategory(e.target.value)} placeholder="e.g. Cinematic, Animation, Custom" />
              </div>
              <button onClick={() => { setEditingTemplate(null); }} className="btn-ghost text-xs hidden lg:flex">← Back</button>
            </div>
            <div className="flex-1">
              <TemplateEditor
                initialContent={editingTemplate.content}
                elements={elements}
                onSave={handleSaveTemplate}
                onUse={handleUsePrompt}
                onElementsUpdated={handleElementsUpdated}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-2.5 text-muted" />
              <input className="input pl-9 w-full bg-surface2 border-border/50" placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {!asComponent && (
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    className={`text-[10px] px-2 py-1 rounded-md font-medium transition-colors border ${activeCategory === cat ? "bg-primary text-primary-content border-primary" : "bg-surface2 text-muted border-transparent hover:bg-surface3"}`}>
                    {cat}
                  </button>
                ))}
              </div>
            )}
            <div className="flex-1" />
            <button onClick={handleNewPrompt} className="btn-primary whitespace-nowrap text-sm">
              <Plus size={16} className="mr-1" /> New Template
            </button>
          </div>
          <div className={`grid gap-4 ${asComponent ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
            {filtered.length === 0 ? (
              <div className="text-muted text-sm p-4 text-center bg-surface2 rounded-lg col-span-full">No templates found. Create one or import a promptfill.json file.</div>
            ) : filtered.map((t) => (
              <div key={t.id} onClick={() => handleEditTemplate(t)}
                className="card p-4 border border-border/50 hover:border-primary/50 cursor-pointer group transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-primary">{t.tags?.[0] || "Custom"}</span>
                  <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                </div>
                <p className="font-medium text-sm mb-1">{t.name}</p>
                <p className="text-xs text-text/60 line-clamp-3 leading-relaxed">{t.content}</p>
                <div className="flex gap-1.5 mt-3">
                  <button className="btn-primary px-3 py-1 text-xs flex-1" onClick={(e) => { e.stopPropagation(); handleUsePrompt(t.content); }}>
                    <Send size={11} className="mr-1" /> Use
                  </button>
                  <button className="btn-ghost px-2 py-1 text-xs" onClick={(e) => { e.stopPropagation(); copy(t.content); }}>
                    <Copy size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <AIPolishModal open={polishModalOpen} onClose={() => setPolishModalOpen(false)} initialPrompt={selectedPrompt} onApply={handleApplyPolished} />
    </>
  );

  if (asComponent) return <div className="h-full">{content}</div>;

  return (
    <Page title="Prompt Director" subtitle="Build & manage reusable prompt templates"
      actions={
        <div className="flex gap-2">
          <label className="btn-outline cursor-pointer text-xs">
            <Upload size={14} className="mr-1.5" /> Import
            <input type="file" accept="application/json" hidden onChange={handleImportJson} />
          </label>
          <button className="btn-outline text-xs" onClick={() => downloadJSON("templates.json", { templates })}>
            <Download size={14} className="mr-1.5" /> Export
          </button>
        </div>
      }>
      {content}
    </Page>
  );
}
