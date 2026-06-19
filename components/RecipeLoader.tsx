"use client";
import { useState } from "react";
import { BookOpen, Sparkles } from "lucide-react";
import { useLibrary } from "@/lib/store/library";
import { Modal } from "@/components/ui";
import type { Template, Recipe } from "@/lib/types";

export function RecipeLoader({ onSelect }: { onSelect: (template: Template | Recipe) => void }) {
  const library = useLibrary();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"templates" | "recipes">("templates");

  const items = tab === "templates" ? library.templates : library.recipes;

  return (
    <>
      <button 
        type="button" 
        className="btn-ghost px-2 py-1 text-xs" 
        onClick={() => setOpen(true)}
      >
        <BookOpen size={14} className="mr-1" />
        Load Recipe/Template
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Load Recipe or Template" wide>
        <div className="flex gap-2 mb-4">
          <button className={`tab flex-1 ${tab === "templates" ? "tab-active" : "tab-idle"}`} onClick={() => setTab("templates")}>Templates</button>
          <button className={`tab flex-1 ${tab === "recipes" ? "tab-active" : "tab-idle"}`} onClick={() => setTab("recipes")}>Recipes</button>
        </div>

        <div className="grid md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2">
          {items.length === 0 && (
            <div className="col-span-full text-center text-muted py-8">
              No {tab} found.
            </div>
          )}
          {items.map((item: any) => (
            <button
              key={item.id}
              className="card p-3 text-left hover:border-primary/50 transition-colors flex flex-col group"
              onClick={() => {
                onSelect(item);
                setOpen(false);
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="font-medium text-sm">{item.name || item.title}</span>
                <Sparkles size={14} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-muted line-clamp-3 leading-relaxed">
                {item.content || item.templateString || item.description || "No content."}
              </p>
              <div className="mt-auto pt-3 flex gap-1 flex-wrap">
                {item.tags?.map((t: string) => (
                  <span key={t} className="chip text-[9px] bg-surface2">{t}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}
