"use client";
import { useMemo, useState } from "react";
import { Settings2, Search, Check } from "lucide-react";
import { Modal, Toggle } from "@/components/ui";
import { useSettings } from "@/lib/store/settings";
import { useLibrary } from "@/lib/store/library";
import type { PromptItem } from "@/lib/types";

function modeColor(m: string) {
  if (m.includes("V")) return "bg-sky-500/20 text-sky-300 border border-sky-500/40";
  if (m.includes("I")) return "bg-orange-500/20 text-orange-300 border border-orange-500/40";
  return "bg-surface2 text-muted border border-border";
}
function ModeTags({ modes }: { modes?: string[] }) {
  if (!modes?.length) return null;
  return <span className="flex gap-1 flex-wrap">{modes.map((m) => <span key={m} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${modeColor(m)}`}>{m}</span>)}</span>;
}

// Resolve the active system prompt body for a task.
export function useTaskSystemPrompt(taskKey: string, currentMode?: string): string {
  const prompts = useLibrary((s) => s.prompts);
  const { taskPrompts, autoSystemPrompt, systemPrompt } = useSettings();
  const sysPrompts = prompts.filter((p) => p.category === "System Prompt");
  if (autoSystemPrompt && currentMode) {
    const auto = sysPrompts.find((p) => p.modes?.includes(currentMode) && p.body.trim());
    if (auto) return auto.body;
  }
  const resolve = (key: string): string | undefined => {
    const id = taskPrompts[key];
    if (id === "none") return "";
    const p = prompts.find((x) => x.id === id);
    return p?.body;
  };
  const own = resolve(taskKey);
  if (own !== undefined) return own;
  const glob = resolve("global");
  if (glob !== undefined) return glob;
  return systemPrompt;
}

export default function PromptPicker({ taskKey, label = "System prompt", filterModes }: { taskKey: string; label?: string; filterModes?: string[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const prompts = useLibrary((s) => s.prompts);
  const { taskPrompts, autoSystemPrompt, setTaskPrompt, setAutoSystemPrompt } = useSettings();
  const selId = taskPrompts[taskKey];
  const sel = prompts.find((p) => p.id === selId);

  const groups = useMemo(() => {
    let list = prompts.filter((p) => p.category === "System Prompt");
    if (q) list = list.filter((p) => (p.title + (p.subcategory || "")).toLowerCase().includes(q.toLowerCase()));
    if (filterModes?.length) list = list.filter((p) => !p.modes?.length || p.modes.some((m) => filterModes.includes(m)));
    const g: Record<string, PromptItem[]> = {};
    for (const p of list) (g[p.subcategory || "Other"] ||= []).push(p);
    return g;
  }, [prompts, q, filterModes]);

  return (
    <>
      <button className="btn-outline px-2.5 py-1.5 text-xs" onClick={() => setOpen(true)} title="Choose system prompt for this task">
        <Settings2 size={14} /> {sel ? sel.title : selId === "none" ? "No prompt" : autoSystemPrompt ? "Auto prompt" : label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="System Prompt">
        <div className="flex items-center justify-between mb-3">
          <div><div className="text-sm font-medium">Auto System Prompt</div><div className="text-[11px] text-muted">Picks a prompt by the task's output type</div></div>
          <Toggle checked={autoSystemPrompt} onChange={setAutoSystemPrompt} />
        </div>
        <div className="relative mb-3"><Search size={15} className="absolute left-3 top-2.5 text-muted" /><input className="input pl-9" placeholder="Search prompts…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="max-h-[55vh] overflow-y-auto pr-1 space-y-3">
          <button className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left ${selId === "none" ? "bg-surface2" : "hover:bg-surface2"}`} onClick={() => { setTaskPrompt(taskKey, "none"); setOpen(false); }}>
            <span className={`w-4 h-4 rounded-full border ${selId === "none" ? "border-primary bg-primary" : "border-border"} grid place-items-center`}>{selId === "none" && <Check size={11} className="text-primary-fg" />}</span>
            <span className="text-sm">No System Prompt</span>
          </button>
          {Object.keys(groups).sort().map((sub) => (
            <div key={sub}>
              <div className="text-[11px] font-semibold text-primary px-1 mb-1">{sub}</div>
              <div className="space-y-0.5">
                {groups[sub].map((p) => {
                  const active = selId === p.id;
                  return (
                    <button key={p.id} className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left ${active ? "bg-surface2" : "hover:bg-surface2"}`} onClick={() => { setTaskPrompt(taskKey, p.id); setOpen(false); }}>
                      <span className={`w-4 h-4 rounded-full border shrink-0 ${active ? "border-primary bg-primary" : "border-border"} grid place-items-center`}>{active && <Check size={11} className="text-primary-fg" />}</span>
                      <span className="text-sm flex-1">{p.title}{p.nsfw && <span className="ml-1 text-[10px] text-rose-400">18+</span>}</span>
                      <ModeTags modes={p.modes} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {Object.keys(groups).length === 0 && <div className="text-sm text-muted text-center py-6">No system prompts. Add some in the Prompt Library, or import your original predefined_prompts.json there.</div>}
        </div>
      </Modal>
    </>
  );
}
