"use client";
import { useState } from "react";
import Page from "@/components/Page";
import { Field, Toggle, useMounted } from "@/components/ui";
import { useSettings } from "@/lib/store/settings";
import { Check, Cpu, Eye, EyeOff, FolderCog, Lock, Plus, RefreshCw, Sparkles, Trash2, Zap, FolderOpen, ShieldCheck, Film } from "lucide-react";
import PromptPicker, { useTaskSystemPrompt } from "@/components/PromptPicker";
import { useLibrary, newId } from "@/lib/store/library";
import type { PromptItem } from "@/lib/types";
import { useComfyStore } from "@/lib/store/comfy";
import type { ComfyModelMapping } from "@/lib/types";

const PALETTES = ["stitch", "ocean", "forest", "sunset", "rose", "slate", "corporate", "amoled"];

export default function SettingsPage() {
  const mounted = useMounted();
  const s = useSettings();
  const comfy = useComfyStore();
  const reseed = useLibrary((x) => x.reseed);
  const [tab, setTab] = useState<"appearance" | "comfy">("appearance");

  if (!mounted || !s.hydrated || !comfy.hydrated) return null;

  return (
    <Page title="Settings / Control Panel" subtitle="Configure appearance and local ComfyUI settings.">
      <div className="flex gap-2 mb-5">
        {(["appearance", "comfy"] as const).map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? "tab-active" : "tab-idle"}`}
            onClick={() => setTab(t)}
          >
            {t === "appearance" ? "Appearance" : "ComfyUI Settings"}
          </button>
        ))}
      </div>

      {tab === "appearance" && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="font-medium mb-3">Theme mode</div>
            <div className="flex gap-2">
              <button className={`tab ${s.mode === "dark" ? "tab-active" : "tab-idle"}`} onClick={() => s.setMode("dark")}>Dark</button>
              <button className={`tab ${s.mode === "light" ? "tab-active" : "tab-idle"}`} onClick={() => s.setMode("light")}>Light</button>
            </div>
          </div>
          <div className="card p-4">
            <div className="font-medium mb-3">Color palette</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PALETTES.map((pal) => (
                <button
                  key={pal}
                  onClick={() => s.setPalette(pal)}
                  data-palette={pal}
                  className={`rounded-xl border p-3 text-left ${s.palette === pal ? "border-primary shadow-glow" : "border-border"}`}
                >
                  <div className="flex gap-1.5 mb-2">
                    <span className="w-6 h-6 rounded-md" style={{ background: "rgb(var(--primary))" }} />
                    <span className="w-6 h-6 rounded-md" style={{ background: "rgb(var(--accent))" }} />
                  </div>
                  <span className="text-sm capitalize">{pal}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="card p-4">
            <div className="font-medium mb-1">Library data</div>
            <p className="text-xs text-muted mb-3">Pull in the latest built-in prompts, environments, ingredients and recipes. "Add built-ins" keeps everything you added; "Reset" restores defaults.</p>
            <div className="flex gap-2 flex-wrap">
              <button className="btn-primary" onClick={() => { reseed("merge").then(() => alert("Added any missing built-in content. Reload to see it everywhere.")); }}>Add built-ins (safe)</button>
              <button className="btn-outline text-rose-400" onClick={() => { if (confirm("Reset all libraries to defaults? Custom prompts, environments, ingredients and recipes will be removed. Characters and generations are kept.")) { reseed("replace").then(() => alert("Libraries reset to defaults.")); } }}>Reset to defaults</button>
            </div>
          </div>
        </div>
      )}

      {tab === "comfy" && <ComfySettingsPanel />}
    </Page>
  );
}

function ComfySettingsPanel() {
  const comfy = useComfyStore();
  const [nodeUrl, setNodeUrl] = useState("");
  const [mapping, setMapping] = useState<Omit<ComfyModelMapping, "id">>({
    name: "",
    source: "huggingface",
    repoOrModelId: "",
    versionId: "",
    filename: "",
    downloadUrl: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newExtraModelPath, setNewExtraModelPath] = useState("");

  function addMapping() {
    const errs: Record<string, string> = {};
    if (!mapping.name.trim()) errs.name = "Name is required";
    if (!mapping.repoOrModelId.trim()) errs.repoOrModelId = "Model/Repo ID is required";
    if (!mapping.filename.trim()) errs.filename = "Filename is required";
    if (!mapping.downloadUrl.trim()) errs.downloadUrl = "Download URL is required";

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    comfy.addModelMapping({
      id: newId(),
      ...mapping
    });
    setMapping({
      name: "",
      source: "huggingface",
      repoOrModelId: "",
      versionId: "",
      filename: "",
      downloadUrl: ""
    });
  }

  return (
    <div className="space-y-5">
      {/* Local ComfyUI Runtime (app-managed; fixed subfolder, no path setting) */}
      <div className="card p-4">
        <div className="font-semibold mb-1 flex items-center gap-1.5"><Cpu size={15} className="text-primary-light" /> Local ComfyUI Runtime</div>
        <p className="text-xs text-muted mb-4">
          ComfyUI is installed and managed by the app inside its own subfolder — there's no path to configure.
          It boots <strong>CPU-only by default</strong> so it always starts.
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          {([
            { id: 'cpu', label: 'CPU-only', icon: Cpu, desc: 'Always boots. The local instance just hosts the UI.' },
            { id: 'gpu', label: 'Local GPU', icon: Zap, desc: 'Use your own NVIDIA GPU for local generation. Requires a compatible CUDA setup.' },
          ] as const).map((d) => {
            const Icon = d.icon;
            const active = comfy.deviceMode === d.id;
            return (
              <button
                key={d.id}
                type="button"
                className={`card p-4 text-left border transition-all ${active ? "border-primary bg-primary/5 shadow-glow" : "border-border hover:border-primary/40"}`}
                onClick={() => comfy.set("deviceMode", d.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-sm flex items-center gap-1.5"><Icon size={14} className="text-primary-light" /> {d.label}</div>
                  {active && <Check size={15} className="text-primary" />}
                </div>
                <p className="text-[11px] text-muted leading-relaxed">{d.desc}</p>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
          <div className="flex items-center gap-2"><FolderCog size={15} className="text-primary-light" /><div><div className="text-sm">Auto-start ComfyUI</div><div className="text-[11px] text-muted">Launch the managed instance when you open the ComfyUI gear (desktop)</div></div></div>
          <Toggle checked={comfy.autoStartComfy} onChange={(b) => comfy.set("autoStartComfy", b)} />
        </div>
      </div>

      {/* GPU Hardware Type & Installation Options */}
      <div className="card p-4">
        <div className="font-semibold mb-1 flex items-center gap-1.5"><Cpu size={15} className="text-primary-light" /> Local Hardware Configuration</div>
        <p className="text-xs text-muted mb-4">
          Select your GPU type. This is required before ComfyUI can be installed locally, so it uses the correct backend archive.
        </p>
        <Field label="System GPU Type">
          <select
            className="input text-xs"
            value={comfy.gpuType || ""}
            onChange={(e) => comfy.set("gpuType", e.target.value as any || null)}
          >
            <option value="" disabled>Select GPU type...</option>
            <option value="nvidia">NVIDIA (CUDA)</option>
            <option value="amd">AMD (ROCm)</option>
            <option value="intel">Intel (OpenVINO / ARC)</option>
            <option value="cpu">CPU Only</option>
          </select>
        </Field>

        <div className="border-t border-border/40 pt-4 mt-4 space-y-3">
          <div className="font-semibold text-xs uppercase tracking-wider text-primary">Extra Model Paths</div>
          <p className="text-[11px] text-muted">
            Configure external drive locations for models (saved to `extra_model_paths.yaml`).
          </p>
          <div className="flex gap-2">
            <input
              className="input text-xs flex-1"
              placeholder="e.g. D:\\AI_Models\\StableDiffusion"
              value={newExtraModelPath}
              onChange={(e) => setNewExtraModelPath(e.target.value)}
            />
            <button
              type="button"
              className="btn-primary px-3 text-xs flex items-center gap-1"
              onClick={() => {
                if (newExtraModelPath.trim()) {
                  comfy.set("extraModelPaths", [...comfy.extraModelPaths, newExtraModelPath.trim()]);
                  setNewExtraModelPath("");
                }
              }}
            >
              <Plus size={14} /> Add
            </button>
          </div>
          {comfy.extraModelPaths.length > 0 && (
            <div className="space-y-1.5 mt-2 max-h-[120px] overflow-y-auto pr-1">
              {comfy.extraModelPaths.map((path, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-surface2/60 border border-border/40 rounded-lg text-xs">
                  <span className="font-mono text-muted truncate">{path}</span>
                  <button type="button" className="btn-ghost px-2 py-1 text-rose-400" onClick={() => comfy.set("extraModelPaths", comfy.extraModelPaths.filter((_, idx) => idx !== i))}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="border-t border-border/40 pt-4 mt-4 space-y-3">
          <div className="font-semibold text-xs uppercase tracking-wider text-primary">Command Line Arguments</div>
          <p className="text-[11px] text-muted">Startup flags passed to ComfyUI.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            <Toggle label="--listen" checked={comfy.cliArgs.listen} onChange={(b) => comfy.updateCliArgs({ listen: b })} />
            <Toggle label="--highvram" checked={comfy.cliArgs.highvram} onChange={(b) => comfy.updateCliArgs({ highvram: b })} />
            <Toggle label="--normalvram" checked={comfy.cliArgs.normalvram} onChange={(b) => comfy.updateCliArgs({ normalvram: b })} />
            <Toggle label="--lowvram" checked={comfy.cliArgs.lowvram} onChange={(b) => comfy.updateCliArgs({ lowvram: b })} />
            <Toggle label="--cpu" checked={comfy.cliArgs.cpu} onChange={(b) => comfy.updateCliArgs({ cpu: b })} />
            <div className="flex items-center gap-2">
              <span className="text-xs">Port:</span>
              <input type="number" className="input text-xs w-20 py-1" value={comfy.cliArgs.port} onChange={(e) => comfy.updateCliArgs({ port: parseInt(e.target.value) || 8188 })} />
            </div>
          </div>
          <Field label="Extra Arguments">
            <input className="input text-xs" placeholder="--disable-xformers" value={comfy.cliArgs.extra} onChange={(e) => comfy.updateCliArgs({ extra: e.target.value })} />
          </Field>
        </div>
      </div>

      {/* Model Provider API Keys */}
      <div className="card p-4">
        <div className="font-semibold mb-1 flex items-center gap-1.5"><Lock size={15} className="text-primary-light" /> Model Provider API Keys</div>
        <p className="text-xs text-muted mb-4">
          Entered once here and auto-filled into ComfyUI and every node that needs them (e.g. the workflow model downloader)
          when the local instance launches — you won't re-enter them in the workspace. Needed for gated models (HF) and CivitAI downloads.
        </p>
        <div className="space-y-3">
          <Field label="CivitAI API Key">
            <input type="password" className="input text-sm" placeholder="CivitAI API key" value={comfy.apiKeys.civitai} onChange={(e) => comfy.set("apiKeys", { ...comfy.apiKeys, civitai: e.target.value })} />
          </Field>
          <Field label="Hugging Face Token">
            <input type="password" className="input text-sm" placeholder="hf_..." value={comfy.apiKeys.huggingface} onChange={(e) => comfy.set("apiKeys", { ...comfy.apiKeys, huggingface: e.target.value })} />
          </Field>
          <Field label="Tavily API Key">
            <input type="password" className="input text-sm" placeholder="tvly-..." value={comfy.apiKeys.tavily} onChange={(e) => comfy.set("apiKeys", { ...comfy.apiKeys, tavily: e.target.value })} />
          </Field>
        </div>
      </div>

      {/* Custom Nodes */}
      <div className="card p-4">
        <div className="font-semibold mb-1 flex items-center gap-1.5"><Film size={15} className="text-primary-light" /> Custom Nodes</div>
        <p className="text-xs text-muted mb-4">
          Git repo URLs of custom nodes to install into the managed ComfyUI on next launch. These are cloned into `custom_nodes/`.
        </p>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input className="input text-xs flex-1" placeholder="https://github.com/user/repo.git" value={nodeUrl} onChange={(e) => setNodeUrl(e.target.value)} />
            <button className="btn-primary" onClick={() => { if (nodeUrl.trim()) { comfy.addCustomNode(nodeUrl.trim()); setNodeUrl(""); } }}>Add node</button>
          </div>
          {comfy.customNodes.length > 0 && (
            <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
              {comfy.customNodes.map((url, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-surface2/60 border border-border/40 rounded-lg text-xs">
                  <span className="font-mono text-muted truncate">{url}</span>
                  <button type="button" className="btn-ghost px-2 py-1 text-rose-400" onClick={() => comfy.removeCustomNode(url)}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Model Mappings */}
      <div className="card p-4">
        <div className="font-semibold mb-1 flex items-center gap-1.5"><FolderOpen size={15} className="text-primary-light" /> Model Mappings</div>
        <p className="text-xs text-muted mb-4">
          Define how to fetch specific model files (HF repo + filename or CivitAI download URL) so the downloader can place them correctly.
        </p>
        <div className="grid md:grid-cols-2 gap-3 mb-3">
          <Field label="Name"><input className="input text-xs" value={mapping.name} onChange={(e) => setMapping({ ...mapping, name: e.target.value })} />{errors.name && <p className="text-rose-400 text-[10px] mt-0.5">{errors.name}</p>}</Field>
          <Field label="Source">
            <select className="input text-xs" value={mapping.source} onChange={(e) => setMapping({ ...mapping, source: e.target.value as any })}>
              <option value="huggingface">Hugging Face</option>
              <option value="civitai">CivitAI</option>
            </select>
          </Field>
          <Field label="Repo / Model ID"><input className="input text-xs" value={mapping.repoOrModelId} onChange={(e) => setMapping({ ...mapping, repoOrModelId: e.target.value })} placeholder="e.g. stabilityai/stable-diffusion-xl-base-1.0" />{errors.repoOrModelId && <p className="text-rose-400 text-[10px] mt-0.5">{errors.repoOrModelId}</p>}</Field>
          <Field label="Version / Revision (optional)"><input className="input text-xs" value={mapping.versionId} onChange={(e) => setMapping({ ...mapping, versionId: e.target.value })} placeholder="e.g. fp16 or commit hash" /></Field>
          <Field label="Filename"><input className="input text-xs" value={mapping.filename} onChange={(e) => setMapping({ ...mapping, filename: e.target.value })} placeholder="e.g. model.safetensors" />{errors.filename && <p className="text-rose-400 text-[10px] mt-0.5">{errors.filename}</p>}</Field>
          <Field label="Download URL"><input className="input text-xs" value={mapping.downloadUrl} onChange={(e) => setMapping({ ...mapping, downloadUrl: e.target.value })} placeholder="CivitAI model version download URL" />{errors.downloadUrl && <p className="text-rose-400 text-[10px] mt-0.5">{errors.downloadUrl}</p>}</Field>
        </div>
        <button className="btn-primary" onClick={addMapping}><Plus size={14} /> Add mapping</button>
        {comfy.modelMappings.length > 0 && (
          <div className="mt-4 space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
            {comfy.modelMappings.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-surface2/60 border border-border/40 rounded-lg text-xs">
                <span className="font-mono text-muted truncate">{m.name} ({m.source}) · {m.filename}</span>
                <button type="button" className="btn-ghost px-2 py-1 text-rose-400" onClick={() => comfy.removeModelMapping(m.id)}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workflows */}
      <div className="card p-4">
        <div className="font-semibold mb-1 flex items-center gap-1.5"><ShieldCheck size={15} className="text-primary-light" /> Saved Workflows</div>
        <p className="text-xs text-muted mb-4">Workflows saved in the studio appear here. Import/Export via the Comfy Hub gear.</p>
        {comfy.workflows.length === 0 ? (
          <p className="text-xs text-muted">No saved workflows yet.</p>
        ) : (
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
            {comfy.workflows.map((w) => (
              <div key={w.id} className="flex items-center justify-between p-2 bg-surface2/60 border border-border/40 rounded-lg text-xs">
                <span className="font-mono text-muted truncate">{w.name}</span>
                <button type="button" className="btn-ghost px-2 py-1 text-rose-400" onClick={() => comfy.deleteWorkflow(w.id)}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}