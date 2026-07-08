"use client";
import { useMemo, useState, useEffect } from "react";
import { Modal, copy } from "@/components/ui";
import { Wand2, Dice5, Copy, CornerDownLeft, Sparkles, BookOpen, Users, Image as ImageIcon, Plus } from "lucide-react";
import { useLibrary } from "@/lib/store/library";
import { assembleTemplate, templateTokens } from "@/lib/promptfill";
import { useRouter } from "next/navigation";

export default function PromptDirector({ 
  onInsert,
  asComponent = false,
  onSaveScene
}: { 
  onInsert?: (text: string) => void;
  asComponent?: boolean;
  onSaveScene?: (data: { prompt: string; templateId?: string; characterIds: string[]; ingredientIds: string[] }) => void;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  
  // Library data
  const templates = useLibrary(s => s.templates);
  const ingredients = useLibrary(s => s.ingredients);
  const characters = useLibrary(s => s.characters);
  const banks = useLibrary(s => s.banks);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selections, setSelections] = useState<Record<string, string>>({});
  
  // Track metadata for the scene
  const [characterIds, setCharacterIds] = useState<string[]>([]);
  const [ingredientIds, setIngredientIds] = useState<string[]>([]);

  const activeTemplate = useMemo(() => templates.find(t => t.id === selectedTemplateId), [templates, selectedTemplateId]);
  
  // Extract tokens from the template content
  const tokens = useMemo(() => {
    if (!activeTemplate) return [];
    return templateTokens(activeTemplate.content);
  }, [activeTemplate]);

  // Handle Token Selection
  function handleSelect(token: string, value: string, meta?: { type: "character" | "ingredient", id: string }) {
    setSelections(prev => ({ ...prev, [token]: value }));
    
    // Update linked items
    if (meta) {
      if (meta.type === "character") {
        if (!characterIds.includes(meta.id)) setCharacterIds([...characterIds, meta.id]);
      } else if (meta.type === "ingredient") {
        if (!ingredientIds.includes(meta.id)) setIngredientIds([...ingredientIds, meta.id]);
      }
    }
  }

  // Pre-fill selections when a template is chosen
  useEffect(() => {
    if (activeTemplate) {
      const init: Record<string, string> = { ...activeTemplate.selections };
      setSelections(init);
    } else {
      setSelections({});
      setCharacterIds([]);
      setIngredientIds([]);
    }
  }, [activeTemplate]);

  const assembled = useMemo(() => {
    if (!activeTemplate) return "";
    return assembleTemplate(activeTemplate.content, selections, banks);
  }, [activeTemplate, selections, banks]);

  function randomize() {
    if (!activeTemplate) return;
    const s: Record<string, string> = {};
    for (const t of tokens) {
      const key = t.token;
      // Find options across ingredients, banks, characters
      const matches = [
        ...ingredients.filter(i => i.category.toLowerCase().includes(key.toLowerCase())).map(i => i.value),
        ...banks.filter(b => b.category.toLowerCase().includes(key.toLowerCase())).flatMap(b => b.options),
        ...(key.toLowerCase() === "subject" || key.toLowerCase() === "character" ? characters.map(c => c.triggerWord || c.name) : [])
      ];
      if (matches.length > 0) {
        s[key] = matches[Math.floor(Math.random() * matches.length)];
      }
    }
    setSelections(s);
  }

  const content = (
    <div className="space-y-4">
      <div>
        <span className="label">Select Recipe (Template)</span>
        <div className="flex gap-2">
          <select className="input flex-1 bg-surface2 text-foreground border border-border focus:ring-1 focus:ring-primary" value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}>
            <option value="" className="bg-surface2 text-foreground py-1">— Select a Recipe —</option>
            {templates.map(t => <option key={t.id} value={t.id} className="bg-surface2 text-foreground py-1">{t.name}</option>)}
          </select>
          <button 
            className="btn-outline px-3" 
            title="Create New Recipe"
            onClick={() => {
              setOpen(false);
              router.push("/studio/workflow"); // Assuming workflow or library for template creation
            }}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {activeTemplate && (
        <div className="space-y-3">
          <div className="text-sm font-medium border-b border-border/40 pb-2 mb-2">Recipe Slots</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tokens.map(tk => {
              const token = tk.token;
              // Find matching ingredients
              const matchingIngredients = ingredients.filter(i => i.category.toLowerCase().includes(token.toLowerCase()) || token.toLowerCase().includes(i.category.toLowerCase()));
              const matchingBanks = banks.filter(b => b.category.toLowerCase().includes(token.toLowerCase()) || b.name.toLowerCase().includes(token.toLowerCase()));
              const isSubject = token.toLowerCase().includes("subject") || token.toLowerCase().includes("character");

              return (
                <div key={token} className="flex flex-col gap-1">
                  <span className="label capitalize text-xs">{token.replace(/_/g, ' ')}</span>
                  
                  <div className="flex gap-1">
                    <select 
                      className="input text-xs flex-1 bg-surface2 text-foreground border border-border focus:ring-1 focus:ring-primary" 
                      value={selections[token] || ""} 
                      onChange={(e) => handleSelect(token, e.target.value)}
                    >
                      <option value="" className="bg-surface2 text-foreground py-1">— Type Custom Below —</option>
                      
                      {isSubject && characters.length > 0 && (
                        <optgroup label="Characters" className="bg-surface2 text-foreground font-semibold">
                          {characters.map(c => <option key={c.id} value={c.triggerWord || c.name} className="font-normal">{c.name}</option>)}
                        </optgroup>
                      )}

                      {matchingIngredients.length > 0 && (
                        <optgroup label="Ingredients" className="bg-surface2 text-foreground font-semibold">
                          {matchingIngredients.map(i => <option key={i.id} value={i.value} className="font-normal">{i.name}</option>)}
                        </optgroup>
                      )}

                      {matchingBanks.length > 0 && (
                        <optgroup label="Bank Options" className="bg-surface2 text-foreground font-semibold">
                          {matchingBanks.flatMap(b => b.options.map(o => <option key={o} value={o} className="font-normal">{o}</option>))}
                        </optgroup>
                      )}
                    </select>
                    
                    <button 
                      className="btn-outline px-2 border-border/50 text-muted hover:text-foreground"
                      title={`Add new ${token}`}
                      onClick={() => {
                        setOpen(false);
                        if (isSubject) router.push("/studio/character");
                        else router.push("/library/ingredients"); // Or another route
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  
                  <input 
                    className="input text-xs" 
                    placeholder="Or type custom..." 
                    value={selections[token] || ""} 
                    onChange={e => handleSelect(token, e.target.value)} 
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card p-3 bg-surface2">
        <span className="label mb-1 flex items-center gap-1"><Sparkles size={12}/> Live Preview</span>
        <p className="text-sm font-medium leading-relaxed">
          {assembled || <span className="text-muted">Select a recipe to build your prompt...</span>}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <button className="btn-ghost text-xs" onClick={randomize} disabled={!activeTemplate}><Dice5 size={14} /> Randomize Fill</button>
        <div className="flex gap-2">
          <button className="btn-outline text-xs" onClick={() => copy(assembled)} disabled={!assembled}><Copy size={14} /> Copy</button>
          {onInsert && (
            <button className="btn-primary text-xs" onClick={() => { onInsert(assembled); setOpen(false); }} disabled={!assembled}>
              <CornerDownLeft size={14} /> Insert
            </button>
          )}
          {onSaveScene && (
            <button className="btn-primary text-xs" onClick={() => { 
              onSaveScene({ prompt: assembled, templateId: selectedTemplateId, characterIds, ingredientIds });
              setOpen(false);
            }} disabled={!assembled}>
              Save Scene
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (asComponent) return content;

  return (
    <>
      <button type="button" className="btn-ghost h-10 px-2.5" title="Prompt Director Pro" onClick={() => setOpen(true)}><Wand2 size={17} /></button>
      <Modal open={open} onClose={() => setOpen(false)} title="Prompt Director Pro" wide>
        {content}
      </Modal>
    </>
  );
}
