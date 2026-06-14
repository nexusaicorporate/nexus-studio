"use client";
import { useState } from "react";
import Page from "@/components/Page";
import { Field, Toggle, useMounted } from "@/components/ui";
import { useSettings } from "@/lib/store/settings";
import { fetchModels } from "@/lib/providers";
import { PROMPT_BUILDER } from "@/lib/data/promptbuilder";
import { Eye, EyeOff, RefreshCw, Plus, Trash2, Check, BookmarkPlus } from "lucide-react";
import PromptPicker, { useTaskSystemPrompt } from "@/components/PromptPicker";
import { useLibrary, newId } from "@/lib/store/library";
import type { PromptItem } from "@/lib/types";
const PALETTES = ["stitch", "ocean", "forest", "sunset", "rose", "slate", "corporate", "amoled"];
export default function SettingsPage() {
  const mounted = useMounted(); const s = useSettings();
  const reseed = useLibrary((x) => x.reseed);
  const [fetching, setFetching] = useState<string | null>(null);
  const [tab, setTab] = useState<"providers" | "prompt" | "appearance">("providers");
  const [custom, setCustom] = useState({ name: "", baseUrl: "", apiKey: "" });
  if (!mounted) return null;
  async function refresh(id: string) { const p = s.providers.find((x) => x.id === id); if (!p) return; setFetching(id); const models = await fetchModels(p); s.updateProvider(id, { models, selectedModel: p.selectedModel || models[0] }); setFetching(null); }
  return (
    <Page title="Settings / Control Panel" subtitle="Configure providers, system prompt, uncensored mode, and appearance.">
      <div className="flex gap-2 mb-5">{(["providers", "prompt", "appearance"] as const).map((t) => (<button key={t} className={`tab ${tab === t ? "tab-active" : "tab-idle"}`} onClick={() => setTab(t)}>{t === "providers" ? "Providers & Models" : t === "prompt" ? "System Prompt" : "Appearance"}</button>))}</div>
      {tab === "providers" && (
        <div className="space-y-4">
          <div className="card p-4 flex items-center justify-between">
            <div><div className="font-medium flex items-center gap-2">Uncensored mode {s.uncensored && <span className="chip text-accent">on</span>}</div><p className="text-xs text-muted mt-1 max-w-2xl">Sends a permissive 18+ creative preamble to your selected model and applies no in-app content filtering. Best paired with a local/uncensored model (Ollama, LM Studio, KoboldCpp) or any custom OpenAI-compatible endpoint.</p></div>
            <Toggle checked={s.uncensored} onChange={s.setUncensored} />
          </div>
          <div className="grid gap-3">
            {s.providers.map((p) => { const isActive = s.activeProviderId === p.id; return (
              <div key={p.id} className={`card p-4 ${isActive ? "shadow-glow" : ""}`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => s.setActiveProvider(p.id)} className={`btn ${isActive ? "btn-primary" : "btn-outline"} px-3 py-1.5`}>{isActive ? <><Check size={14} /> Active</> : "Use"}</button>
                    <div><div className="font-medium">{p.name}</div><div className="text-[11px] text-muted">{p.kind}{p.builtIn ? "" : " · custom"}</div></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="btn-ghost px-2 py-1" title={p.visible ? "Visible" : "Hidden"} onClick={() => s.updateProvider(p.id, { visible: !p.visible })}>{p.visible ? <Eye size={15} /> : <EyeOff size={15} />}</button>
                    <button className="btn-ghost px-2 py-1" onClick={() => refresh(p.id)} disabled={fetching === p.id}><RefreshCw size={15} className={fetching === p.id ? "animate-spin" : ""} /> Fetch</button>
                    {!p.builtIn && <button className="btn-ghost px-2 py-1 text-rose-400" onClick={() => s.removeProvider(p.id)}><Trash2 size={15} /></button>}
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <Field label="Base URL"><input className="input" value={p.baseUrl} onChange={(e) => s.updateProvider(p.id, { baseUrl: e.target.value })} /></Field>
                  <Field label="API Key"><input className="input" type="password" placeholder={p.kind === "pollinations" || p.kind === "ollama" ? "not required" : "sk-..."} value={p.apiKey || ""} onChange={(e) => s.updateProvider(p.id, { apiKey: e.target.value })} /></Field>
                </div>
                {p.models.length > 0 && (<Field label={`Model (${p.models.length})`}><select className="input" value={p.selectedModel || ""} onChange={(e) => s.updateProvider(p.id, { selectedModel: e.target.value })}>{p.models.map((m) => <option key={m} value={m}>{m}</option>)}</select></Field>)}
              </div>
            ); })}
          </div>
          <div className="card p-4">
            <div className="font-medium mb-3 flex items-center gap-2"><Plus size={16} /> Add custom OpenAI-compatible provider</div>
            <div className="grid md:grid-cols-3 gap-3">
              <input className="input" placeholder="Name" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
              <input className="input" placeholder="https://host/v1" value={custom.baseUrl} onChange={(e) => setCustom({ ...custom, baseUrl: e.target.value })} />
              <input className="input" placeholder="API key (optional)" value={custom.apiKey} onChange={(e) => setCustom({ ...custom, apiKey: e.target.value })} />
            </div>
            <button className="btn-primary mt-3" onClick={() => { if (custom.baseUrl) { s.addCustomProvider(custom); setCustom({ name: "", baseUrl: "", apiKey: "" }); } }}>Add provider</button>
          </div>
        </div>
      )}
      {tab === "prompt" && <SystemPromptPanel />}
      {tab === "appearance" && (
        <div className="space-y-4">
          <div className="card p-4"><div className="font-medium mb-3">Theme mode</div><div className="flex gap-2"><button className={`tab ${s.mode === "dark" ? "tab-active" : "tab-idle"}`} onClick={() => s.setMode("dark")}>Dark</button><button className={`tab ${s.mode === "light" ? "tab-active" : "tab-idle"}`} onClick={() => s.setMode("light")}>Light</button></div></div>
          <div className="card p-4"><div className="font-medium mb-3">Color palette</div><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{PALETTES.map((pal) => (<button key={pal} onClick={() => s.setPalette(pal)} data-palette={pal} className={`rounded-xl border p-3 text-left ${s.palette === pal ? "border-primary shadow-glow" : "border-border"}`}><div className="flex gap-1.5 mb-2"><span className="w-6 h-6 rounded-md" style={{ background: "rgb(var(--primary))" }} /><span className="w-6 h-6 rounded-md" style={{ background: "rgb(var(--accent))" }} /></div><span className="text-sm capitalize">{pal}</span></button>))}</div></div>
          <div className="card p-4">
            <div className="font-medium mb-1">Library data</div>
            <p className="text-xs text-muted mb-3">Pull in the latest built-in prompts, environments, ingredients and recipes. "Add built-ins" keeps everything you added; "Reset" restores defaults.</p>
            <div className="flex gap-2 flex-wrap">
              <button className="btn-primary" onClick={() => { reseed("merge"); alert("Added any missing built-in content. Reload to see it everywhere."); }}>Add built-ins (safe)</button>
              <button className="btn-outline text-rose-400" onClick={() => { if (confirm("Reset all libraries to defaults? Custom prompts, environments, ingredients and recipes will be removed. Characters and generations are kept.")) { reseed("replace"); alert("Libraries reset to defaults."); } }}>Reset to defaults</button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
function SystemPromptPanel() {
  const s = useSettings();
  const prompts = useLibrary((x) => x.prompts);
  const setKey = useLibrary((x) => x.set);
  const [b, setB] = useState({ caption: PROMPT_BUILDER.captionTypes[0], length: PROMPT_BUILDER.lengths[3], extras: [] as string[] });
  const globalDefault = useTaskSystemPrompt("global");
  function built() {
    const extras = b.extras.length ? " " + b.extras.join(" ") : "";
    return `${b.caption.prompt} Aim for a ${b.length.toLowerCase()} description.${extras}`.trim();
  }
  function saveToLibrary() {
    const item: PromptItem = { id: newId(), title: `${b.caption.name} (${b.length})`, category: "System Prompt", subcategory: "Custom", body: built(), tags: [], modes: ["T2T"], nsfw: false, mediaType: "text", createdAt: Date.now(), updatedAt: Date.now() };
    setKey("prompts", [item, ...prompts]);
    alert("Saved to Prompt Library → System Prompt → Custom");
  }
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="font-medium mb-1">Default system prompt</div>
        <p className="text-xs text-muted mb-3">The fallback used by any task where you haven't picked a prompt with its gear button. Pick one from your Prompt Library:</p>
        <PromptPicker taskKey="global" label="Choose default" />
        <div className="mt-3"><span className="label">Currently active default</span><div className="text-sm bg-surface2 rounded-xl p-3 whitespace-pre-wrap min-h-[60px]">{globalDefault || <span className="text-muted">None selected - tasks fall back to the text below.</span>}</div></div>
      </div>

      <div className="card p-4">
        <div className="font-medium mb-1">System Prompt Builder</div>
        <p className="text-xs text-muted mb-3">Compose a prompt, then save it into your Prompt Library (it appears under System Prompt → Custom and in every task picker).</p>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Caption type"><select className="input" value={b.caption.name} onChange={(e) => setB({ ...b, caption: PROMPT_BUILDER.captionTypes.find((c) => c.name === e.target.value)! })}>{PROMPT_BUILDER.captionTypes.map((c) => <option key={c.name}>{c.name}</option>)}</select></Field>
          <Field label="Length"><select className="input" value={b.length} onChange={(e) => setB({ ...b, length: e.target.value })}>{PROMPT_BUILDER.lengths.map((l) => <option key={l}>{l}</option>)}</select></Field>
        </div>
        <div className="label">Extra options</div>
        <div className="flex flex-wrap gap-2 mb-3">{PROMPT_BUILDER.extras.map((x) => { const on = b.extras.includes(x); return <button key={x} className={`chip ${on ? "border-primary text-primary" : ""}`} onClick={() => setB({ ...b, extras: on ? b.extras.filter((e) => e !== x) : [...b.extras, x] })}>{x}</button>; })}</div>
        <div className="card p-3 bg-surface2 mb-3"><span className="label mb-1">Preview</span><p className="text-sm">{built()}</p></div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-primary" onClick={saveToLibrary}><BookmarkPlus size={15} /> Save to Library</button>
          <button className="btn-outline" onClick={() => s.setSystemPrompt(built())}>Set as fallback text</button>
        </div>
      </div>

      <div className="card p-4">
        <div className="font-medium mb-1">Fallback text</div>
        <p className="text-xs text-muted mb-2">Used only when no default and no per-task prompt is selected.</p>
        <textarea className="input min-h-[80px]" value={s.systemPrompt} onChange={(e) => s.setSystemPrompt(e.target.value)} />
      </div>
    </div>
  );
}
