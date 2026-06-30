"use client";

import { useState, useEffect } from "react";
import { parseTemplate, tokenOptions, assembleTemplate, chipClasses, catColor } from "@/lib/promptfill";
import { type Bank } from "@/lib/types";
import { Copy, Send, Sparkles, Loader2, Wand2 } from "lucide-react";
import { copy } from "@/components/ui";
import { localChat } from "@/lib/local-ai";
import { runSmartSplit } from "@/lib/smart-split";
import { type InitProgressReport } from "@mlc-ai/web-llm";

// Local Element type — no longer tied to Supabase
export interface Element {
  id: string;
  type: string;
  content: string;
  created_at?: string;
}

interface TemplateEditorProps {
  initialContent: string;
  elements: Element[];
  onSave?: (content: string) => Promise<void>;
  onUse?: (assembledPrompt: string) => void;
  onElementsUpdated?: (newElement: Element) => void;
  hideSave?: boolean;
}

export function TemplateEditor({ initialContent, elements, onSave, onUse, onElementsUpdated, hideSave }: TemplateEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [selections, setSelections] = useState<Record<string, string>>({});

  // AI State
  const [generatingToken, setGeneratingToken] = useState<string | null>(null);
  const [aiProgress, setAiProgress] = useState<InitProgressReport | null>(null);
  const [splitting, setSplitting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setContent(initialContent);
    setSelections({});
  }, [initialContent]);

  // Convert flat elements into Bank objects for promptfill logic
  const grouped = elements.reduce((acc, ing) => {
    if (!acc[ing.type]) acc[ing.type] = [];
    acc[ing.type].push(ing.content);
    return acc;
  }, {} as Record<string, string[]>);

  const banks: Bank[] = Object.keys(grouped).map((type) => ({
    id: type,
    name: type,
    category: "other",
    options: grouped[type],
    nsfw: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));

  const segs = parseTemplate(content);
  const assembled = assembleTemplate(content, selections, banks);

  function setSel(token: string, value: string) {
    setSelections((prev) => ({ ...prev, [token]: value }));
  }

  async function handleCustomOption(token: string, currentVal: string) {
    const v = window.prompt(`Enter custom value for ${token}:`, currentVal);
    if (!v || !v.trim()) return;

    if (!grouped[token]?.includes(v.trim())) {
      const newEl: Element = { id: Date.now().toString(), type: token, content: v.trim() };
      onElementsUpdated?.(newEl);
    }
    setSel(token, v.trim());
  }

  async function handleAIGenerateElements(token: string, currentVal: string) {
    setGeneratingToken(token);
    setAiProgress(null);
    try {
      const prompt = `You are a top-tier expert in video prompt generation.
The user is filling out a prompt template. They are currently stuck on the variable: "${token}".
Template Context:
"${content}"
Current Value (if any): "${currentVal}"
Already selected elements:
${Object.entries(selections).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

Generate 5 brand new, creative options for this variable that fit perfectly into the template context.
Return ONLY the 5 options, separated by commas. No bullets, no numbers, no explanation. Keep them concise.`;

      const out = await localChat(
        prompt,
        "You are an AI assistant specializing in video prompt generation.",
        (progress) => setAiProgress(progress)
      );

      const newTerms = out.split(",").map((t) => t.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
      if (newTerms.length === 0) throw new Error("AI returned empty results.");

      for (const term of newTerms) {
        if (!grouped[token]?.includes(term)) {
          const newEl: Element = { id: Date.now().toString() + Math.random(), type: token, content: term };
          onElementsUpdated?.(newEl);
        }
      }
      if (newTerms[0]) setSel(token, newTerms[0]);
    } catch (e: any) {
      alert("AI Generation failed: " + e.message);
    } finally {
      setGeneratingToken(null);
      setAiProgress(null);
    }
  }

  async function handleSmartSplit() {
    if (!content.trim()) return;
    setSplitting(true);
    setAiProgress(null);
    try {
      const { cleanTemplate, extractedVariables } = await runSmartSplit(content, (p) => setAiProgress(p));

      // Save new variables locally
      for (const [key, word] of extractedVariables.entries()) {
        if (!grouped[key]?.includes(word)) {
          const newEl: Element = { id: Date.now().toString() + key, type: key, content: word };
          onElementsUpdated?.(newEl);
        }
        setSel(key, word);
      }

      setContent(cleanTemplate);
    } catch (e: any) {
      alert("Smart Split failed: " + e.message);
    }
    setSplitting(false);
    setAiProgress(null);
  }

  async function handleSaveClick() {
    if (!onSave) return;
    setSaving(true);
    await onSave(content);
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      {aiProgress && aiProgress.progress < 1 && (
        <div className="text-xs text-primary bg-primary/10 p-2 rounded">
          Initializing Local AI Model: {Math.round(aiProgress.progress * 100)}% ({aiProgress.text})
        </div>
      )}

      {/* Editor Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="label mb-0">Raw Content (Use {"{{variable}}"} syntax)</label>
          <button
            onClick={handleSmartSplit}
            disabled={splitting || !content.trim()}
            className="btn-ghost py-1 px-3 text-xs text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
          >
            {splitting ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Wand2 size={14} className="mr-1.5" />}
            {splitting ? "Analyzing..." : "AI Smart Split"}
          </button>
        </div>
        <textarea
          className="input min-h-[150px] font-mono text-sm leading-relaxed"
          placeholder="e.g. A hyperrealistic close up of a {{subject}} wearing a {{color}} suit..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        {!hideSave && onSave && (
          <div className="flex justify-end mt-2">
            <button className="btn-primary py-1.5 px-6 text-sm" onClick={handleSaveClick} disabled={saving || !content.trim()}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      {/* Visualizer Section */}
      {segs.some((s) => s.kind === "var") && (
        <div className="flex flex-col gap-6">
          <div>
            <span className="label">Preview & Variables</span>
            <div className="rounded-xl bg-surface2 border border-border p-4 leading-[2.5rem] text-[15px] font-medium">
              {segs.map((seg, i) => {
                if (seg.kind === "text") return <span key={i} className="text-muted">{seg.text}</span>;
                const opts = tokenOptions(seg.token!, seg.def, banks);
                const bank = banks.find((b) => b.id === seg.token);
                const color = chipClasses(catColor(bank?.category));
                const val = selections[seg.token!] || seg.def || bank?.options[0] || seg.token || "";
                return (
                  <span key={i} className={`inline-flex items-center rounded-md px-1 py-0 mx-1 shadow-sm ${color}`}>
                    <select
                      className="bg-transparent outline-none text-inherit cursor-pointer max-w-[200px] truncate py-1 pl-1 pr-1"
                      value={selections[seg.token!] ?? ""}
                      onChange={(e) => {
                        if (e.target.value === "__custom") {
                          handleCustomOption(seg.token!, val);
                        } else {
                          setSel(seg.token!, e.target.value);
                        }
                      }}
                    >
                      <option value="">{val}</option>
                      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                      <option value="__custom">+ Custom...</option>
                    </select>
                    <button
                      onClick={() => handleAIGenerateElements(seg.token!, val)}
                      disabled={generatingToken === seg.token}
                      className="ml-1 p-1 hover:bg-black/10 rounded-full transition-colors disabled:opacity-50"
                      title="Generate new options with AI"
                    >
                      {generatingToken === seg.token ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} className="text-amber-500 drop-shadow-[0_0_2px_rgba(245,158,11,0.8)]" />}
                    </button>
                  </span>
                );
              })}
            </div>
          </div>

          {onUse && (
            <div className="card p-4 bg-surface2 border-border/50 shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <span className="label mb-0">Final Assembled Output</span>
                <div className="flex gap-2">
                  <button className="btn-ghost px-3 py-1.5 text-xs font-medium" onClick={() => copy(assembled)}>
                    <Copy size={13} className="mr-1.5" /> Copy
                  </button>
                  <button className="btn-primary px-3 py-1.5 text-xs font-medium shadow-glow" onClick={() => onUse(assembled)}>
                    <Send size={13} className="mr-1.5" /> Send to Studio
                  </button>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-text">{assembled}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
