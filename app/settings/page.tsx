"use client";
import { useState } from "react";
import Page from "@/components/Page";
import { Field, Toggle, useMounted } from "@/components/ui";
import { useSettings } from "@/lib/store/settings";
import { fetchModels } from "@/lib/providers";
import { Check, Cpu, Eye, EyeOff, FolderCog, Lock, Plus, RefreshCw, Sparkles, Trash2, Zap, FolderOpen, ShieldCheck } from "lucide-react";
import PromptPicker, { useTaskSystemPrompt } from "@/components/PromptPicker";
import { useLibrary, newId } from "@/lib/store/library";
import type { PromptItem } from "@/lib/types";
import { useComfyStore } from "@/lib/store/comfy";
import type { ComfyModelMapping } from "@/lib/types";
import { deployModalBackend, stopModalApp, MODAL_APP_NAMES, MODAL_GPU_RATES, isDesktop } from "@/lib/comfy-runtime";

const DEPLOY_GPUS = ["T4", "L4", "A10G", "L40S", "A100", "A100-80GB", "H100"];
const DEPLOY_MODALITIES = [
  { id: "llm", label: "Chat / LLM (vLLM)", ph: "e.g. TheBloke/dolphin-2.6-mistral-7B-AWQ" },
  { id: "image", label: "Image (diffusers)", ph: "e.g. stabilityai/stable-diffusion-xl-base-1.0" },
  { id: "video", label: "Video (LTX)", ph: "e.g. Lightricks/LTX-Video" },
] as const;

const PALETTES = ["stitch", "ocean", "forest", "sunset", "rose", "slate", "corporate", "amoled"];

export default function SettingsPage() {
  const mounted = useMounted();
  const s = useSettings();
  const reseed = useLibrary((x) => x.reseed);
  const [fetching, setFetching] = useState<string | null>(null);
  const [tab, setTab] = useState<"providers" | "appearance" | "comfy">("providers");
  const [custom, setCustom] = useState({ name: "", baseUrl: "", apiKey: "" });
  const [modalForm, setModalForm] = useState({ name: "", baseUrl: "", apiKey: "", models: "" });
  const [devSel, setDevSel] = useState("");
  const [deploy, setDeploy] = useState({ modality: "image", gpu: "L40S", gpuCount: 1, cpu: 8, ramGb: 48, model: "", secret: "", hfToken: "" });
  const [deploying, setDeploying] = useState(false);
  const [deployMsg, setDeployMsg] = useState<{ ok: boolean; text: string; log?: string } | null>(null);

  if (!mounted) return null;

  async function runDeploy() {
    if (!deploy.model.trim()) { setDeployMsg({ ok: false, text: "Enter a model id first." }); return; }
    setDeploying(true); setDeployMsg(null);
    const r = await deployModalBackend({
      modality: deploy.modality as "llm" | "image" | "video",
      gpu: deploy.gpu, gpuCount: deploy.gpuCount, cpu: deploy.cpu,
      ramMb: deploy.ramGb ? deploy.ramGb * 1024 : undefined,
      model: deploy.model.trim(), secret: deploy.secret.trim(), hfToken: deploy.hfToken.trim(),
    });
    setDeploying(false);
    if (r.ok && r.url) {
      const name = `Modal ${deploy.modality} · ${deploy.gpu}`;
      if (deploy.modality === "llm") {
        const id = s.addOpenAIProvider({ name, baseUrl: r.url.replace(/\/$/, "") + "/v1", apiKey: deploy.secret.trim(), models: [deploy.model.trim()], selectedModel: deploy.model.trim() });
        s.setActiveProvider(id);
      } else {
        const id = s.addModalProvider({ name, baseUrl: r.url, apiKey: deploy.secret.trim(), models: [deploy.model.trim()] });
        if (deploy.modality === "image") s.setActiveImageProvider(id); else s.setActiveVideoProvider(id);
      }
      // Remember the config so Start/Stop can redeploy or stop this backend.
      s.setModalDeploy(deploy.modality, {
        gpu: deploy.gpu, gpuCount: deploy.gpuCount, cpu: deploy.cpu, ramGb: deploy.ramGb,
        model: deploy.model.trim(), secret: deploy.secret.trim(), hfToken: deploy.hfToken.trim(),
        url: r.url, stopped: false,
      });
      setDeployMsg({ ok: true, text: `Deployed and set active for ${deploy.modality}: ${r.url}`, log: r.log });
    } else {
      setDeployMsg({ ok: false, text: r.message, log: r.log });
    }
  }

  async function startBackend(modality: string) {
    const d = s.modalDeploys[modality];
    if (!d) return;
    setDeploying(true); setDeployMsg(null);
    const r = await deployModalBackend({
      modality: modality as "llm" | "image" | "video",
      gpu: d.gpu, gpuCount: d.gpuCount, cpu: d.cpu, ramMb: d.ramGb ? d.ramGb * 1024 : undefined,
      model: d.model, secret: d.secret, hfToken: d.hfToken,
    });
    setDeploying(false);
    if (r.ok) { s.setModalDeploy(modality, { ...d, url: r.url || d.url, stopped: false }); setDeployMsg({ ok: true, text: `Started ${modality}.`, log: r.log }); }
    else setDeployMsg({ ok: false, text: r.message, log: r.log });
  }

  async function stopBackend(modality: string) {
    const appName = MODAL_APP_NAMES[modality];
    if (!appName) return;
    setDeploying(true); setDeployMsg(null);
    const r = await stopModalApp(appName);
    setDeploying(false);
    if (r.ok) {
      // Ensure a status row exists even for backends deployed from a terminal.
      if (s.modalDeploys[modality]) s.setModalDeployStopped(modality, true);
      else s.setModalDeploy(modality, { gpu: "", gpuCount: 1, cpu: 0, ramGb: 0, model: "", secret: "", hfToken: "", url: "", stopped: true });
      setDeployMsg({ ok: true, text: `Stopped ${modality} — billing halted.`, log: r.log });
    } else setDeployMsg({ ok: false, text: r.message, log: r.log });
  }

  async function refresh(id: string) {
    const p = s.providers.find((x) => x.id === id);
    if (!p) return;
    setFetching(id);
    const models = await fetchModels(p);
    s.updateProvider(id, { models, selectedModel: p.selectedModel || models[0] });
    setFetching(null);
  }

  return (
    <Page title="Settings / Control Panel" subtitle="Configure providers, system prompt, comfyui workflow servers, and appearance.">
      <div className="flex gap-2 mb-5">
        {(["providers", "appearance", "comfy"] as const).map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? "tab-active" : "tab-idle"}`}
            onClick={() => setTab(t)}
          >
            {t === "providers" ? "Providers & Models" : t === "appearance" ? "Appearance" : "ComfyUI API Settings"}
          </button>
        ))}
      </div>

      {tab === "providers" && (
        <div className="space-y-4">
          <div className="card p-4 flex items-center justify-between">
            <div>
              <div className="font-medium flex items-center gap-2">
                Uncensored mode {s.uncensored && <span className="chip text-accent">on</span>}
              </div>
              <p className="text-xs text-muted mt-1 max-w-2xl">
                Sends a permissive 18+ creative preamble to your selected model and applies no in-app content filtering. Best paired with a local/uncensored model (Ollama, LM Studio, KoboldCpp) or any custom OpenAI-compatible endpoint.
              </p>
            </div>
            <Toggle checked={s.uncensored} onChange={s.setUncensored} />
          </div>
          <div className="grid gap-3">
            {s.providers.map((p) => {
              const isImageActive = s.activeImageProviderId === p.id;
              const isVideoActive = s.activeVideoProviderId === p.id;
              return (
                <div key={p.id} className={`card p-4 ${isImageActive || isVideoActive ? "shadow-glow" : ""}`}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <button onClick={() => s.setActiveProvider(p.id)} className={`btn text-[10px] py-1 px-2 ${s.activeProviderId === p.id ? "btn-primary" : "btn-outline"}`}>
                          {s.activeProviderId === p.id ? <><Check size={12} /> Chat</> : "Set Chat"}
                        </button>
                        <button onClick={() => s.setActiveImageProvider(p.id)} className={`btn text-[10px] py-1 px-2 ${isImageActive ? "btn-primary" : "btn-outline"}`}>
                          {isImageActive ? <><Check size={12} /> Image</> : "Set Image"}
                        </button>
                        <button onClick={() => s.setActiveVideoProvider(p.id)} className={`btn text-[10px] py-1 px-2 ${isVideoActive ? "btn-primary" : "btn-outline"}`}>
                          {isVideoActive ? <><Check size={12} /> Video</> : "Set Video"}
                        </button>
                      </div>
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-[11px] text-muted">{p.kind}{p.builtIn ? "" : " · custom"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="btn-ghost px-2 py-1" title={p.visible ? "Visible" : "Hidden"} onClick={() => s.updateProvider(p.id, { visible: !p.visible })}>
                        {p.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>
                      <button className="btn-ghost px-2 py-1" onClick={() => refresh(p.id)} disabled={fetching === p.id}>
                        <RefreshCw size={15} className={fetching === p.id ? "animate-spin" : ""} /> Fetch
                      </button>
                      {!p.builtIn && <button className="btn-ghost px-2 py-1 text-rose-400" onClick={() => s.removeProvider(p.id)}><Trash2 size={15} /></button>}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Field label="Base URL"><input className="input" value={p.baseUrl} onChange={(e) => s.updateProvider(p.id, { baseUrl: e.target.value })} /></Field>
                    <Field label="API Key"><input className="input" type="password" placeholder={p.kind === "pollinations" || p.kind === "ollama" ? "not required" : "sk-..."} value={p.apiKey || ""} onChange={(e) => s.updateProvider(p.id, { apiKey: e.target.value })} /></Field>
                  </div>
                  {p.models.length > 0 && (
                    <Field label={`Model (${p.models.length})`}>
                      <select className="input" value={p.selectedModel || ""} onChange={(e) => s.updateProvider(p.id, { selectedModel: e.target.value })}>
                        {p.models.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </Field>
                  )}
                </div>
              );
            })}
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

          <div className="card p-4 border border-primary/30 bg-primary/5">
            <div className="font-semibold text-sm mb-1 flex items-center gap-2 text-text"><Zap size={16} className="text-primary-light" /> One-click Deploy (Modal)</div>
            <p className="text-xs text-muted mb-3 max-w-2xl leading-relaxed">
              Spin up a Modal GPU backend for one modality with the hardware you choose — no terminal. On success it registers the backend and sets it active for that modality automatically. Desktop app only (it runs the <code>modal</code> CLI); requires <code>modal setup</code> done once.
            </p>
            <div className="grid md:grid-cols-3 gap-3">
              <label className="text-xs text-muted">Modality
                <select className="input mt-1" value={deploy.modality} onChange={(e) => setDeploy({ ...deploy, modality: e.target.value, model: "" })}>
                  {DEPLOY_MODALITIES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </label>
              <label className="text-xs text-muted">GPU
                <select className="input mt-1" value={deploy.gpu} onChange={(e) => setDeploy({ ...deploy, gpu: e.target.value })}>
                  {DEPLOY_GPUS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </label>
              <label className="text-xs text-muted">{deploy.modality === "llm" ? "GPU count (tensor-parallel)" : "GPU count"}
                <input className="input mt-1" type="number" min={1} max={8} value={deploy.gpuCount} onChange={(e) => setDeploy({ ...deploy, gpuCount: Math.max(1, +e.target.value || 1) })} />
              </label>
              <label className="text-xs text-muted">CPU cores
                <input className="input mt-1" type="number" min={1} value={deploy.cpu} onChange={(e) => setDeploy({ ...deploy, cpu: Math.max(1, +e.target.value || 1) })} />
              </label>
              <label className="text-xs text-muted">RAM (GB)
                <input className="input mt-1" type="number" min={0} value={deploy.ramGb} onChange={(e) => setDeploy({ ...deploy, ramGb: Math.max(0, +e.target.value || 0) })} />
              </label>
              <label className="text-xs text-muted">Model (HF id)
                <input className="input mt-1" placeholder={DEPLOY_MODALITIES.find((m) => m.id === deploy.modality)?.ph} value={deploy.model} onChange={(e) => setDeploy({ ...deploy, model: e.target.value })} />
              </label>
              <label className="text-xs text-muted">NEXUS_SECRET (Bearer)
                <input className="input mt-1" type="password" placeholder="pick a long random string" value={deploy.secret} onChange={(e) => setDeploy({ ...deploy, secret: e.target.value })} />
              </label>
              <label className="text-xs text-muted">HF token (gated models)
                <input className="input mt-1" type="password" placeholder="hf_… (optional)" value={deploy.hfToken} onChange={(e) => setDeploy({ ...deploy, hfToken: e.target.value })} />
              </label>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <button className="btn-primary" disabled={deploying || !isDesktop()} onClick={runDeploy}>
                {deploying ? "Deploying… (can take a few min)" : "Deploy & set active"}
              </button>
              {!isDesktop() && <span className="text-[11px] text-amber-400">Desktop app only — in the browser, deploy from a terminal.</span>}
            </div>
            {deployMsg && (
              <div className={`mt-3 text-xs ${deployMsg.ok ? "text-emerald-400" : "text-red-400"}`}>
                {deployMsg.text}
                {deployMsg.log && <details className="mt-1"><summary className="cursor-pointer text-muted">deploy log</summary><pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-[10px] text-muted">{deployMsg.log}</pre></details>}
              </div>
            )}

            {/* Compute dashboard: per-backend status + Start/Stop + budget tracker */}
            <div className="mt-4 border-t border-border/40 pt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium">Compute dashboard</div>
                <a href="https://modal.com/settings/usage" target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline">Modal usage &amp; billing ↗</a>
              </div>

              {/* Budget / estimated spend / remaining */}
              <div className="rounded-lg border border-border/40 p-3 mb-3">
                <div className="flex items-end justify-between gap-3 flex-wrap">
                  <label className="text-[11px] text-muted">Monthly budget (USD)
                    <input type="number" min={0} className="input mt-1 w-32" value={s.modalBudget || ""} placeholder="e.g. 50" onChange={(e) => s.setModalBudget(+e.target.value || 0)} />
                  </label>
                  <div className="text-[11px] text-right leading-relaxed">
                    <div className="text-muted">Estimated spent: <span className="font-mono text-text">${s.modalSpend.toFixed(2)}</span></div>
                    <div className="text-muted">Remaining: <span className={`font-mono ${s.modalBudget > 0 && s.modalSpend > s.modalBudget ? "text-rose-400" : "text-emerald-400"}`}>${Math.max(0, (s.modalBudget || 0) - s.modalSpend).toFixed(2)}</span>{s.modalBudget > 0 ? "" : " — set a budget"}</div>
                  </div>
                </div>
                {s.modalBudget > 0 && (
                  <div className="w-full bg-surface2 h-1.5 rounded-full overflow-hidden border border-border/40 mt-2">
                    <div className={`h-full ${s.modalSpend > s.modalBudget ? "bg-rose-500" : "bg-primary"}`} style={{ width: `${Math.min(100, (s.modalSpend / s.modalBudget) * 100)}%` }} />
                  </div>
                )}
                <div className="flex items-center justify-between mt-2 gap-2">
                  <div className="text-[10px] text-muted">Estimate only (GPU rate × generation time). Modal's billing page is the source of truth.</div>
                  <button className="btn-ghost text-[10px] px-2 py-0.5 text-muted shrink-0" onClick={() => { if (confirm("Reset the estimated spend counter to $0?")) s.resetModalSpend(); }}>Reset</button>
                </div>
              </div>

              {/* Per-modality backend status + Start / Stop */}
              <div className="space-y-2">
                {(["llm", "image", "video"] as const).map((m) => {
                  const d = s.modalDeploys[m];
                  const rate = d?.gpu ? MODAL_GPU_RATES[d.gpu] : undefined;
                  const status = !d ? "not deployed in app" : d.stopped ? "stopped" : "running · scales to zero";
                  const statusCls = !d ? "bg-surface2 text-muted" : d.stopped ? "bg-rose-500/15 text-rose-400" : "bg-emerald-500/15 text-emerald-400";
                  return (
                    <div key={m} className="flex items-center justify-between gap-2 rounded-lg border border-border/40 px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-xs font-medium capitalize flex items-center gap-2">
                          {m} <span className="text-[10px] text-muted font-normal">{MODAL_APP_NAMES[m]}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusCls}`}>{status}</span>
                        </div>
                        <div className="text-[10px] text-muted truncate">
                          {d?.gpu ? `${d.gpu}${rate ? ` · ~$${rate}/hr` : ""}` : "—"}{d?.url ? ` · ${d.url}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button className="btn-outline text-xs px-2 py-1" disabled={deploying || !isDesktop() || !d?.model} title={!d?.model ? "Deploy this modality with the card above first" : "Re-deploy at the same URL"} onClick={() => startBackend(m)}>Start</button>
                        <button className="btn-outline text-xs px-2 py-1 text-rose-400" disabled={deploying || !isDesktop()} onClick={() => stopBackend(m)}>Stop</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-[10px] text-muted mt-2">With scale-to-zero, a deployed backend costs nothing while idle — it only bills while generating. <strong>Stop</strong> tears it down entirely; <strong>Start</strong> re-deploys it. Stop works even for backends you deployed from a terminal.</div>
            </div>
          </div>

          {(() => {
            const modalBackends = s.providers.filter((p) => p.kind === "modal");
            const devBackendId = devSel || s.devTest.backendId || modalBackends[0]?.id || "";
            return (
              <div className="card p-4 border border-primary/20 bg-primary/5">
                <div className="font-semibold text-sm mb-1 flex items-center gap-2 text-text"><Sparkles size={16} className="text-primary-light" /> Managed / Modal Backend</div>
                <p className="text-xs text-muted mb-3 max-w-2xl leading-relaxed">
                  Register a self-hosted compute endpoint (e.g. a Modal app running HF models). Image calls <code>POST /generate/image</code>, video calls <code>/generate/video</code> (async). LLM endpoints are OpenAI-compatible — add those as a custom provider above. Select a backend per modality below, or flip the Dev/Test switch to route everything here.
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  <input className="input" placeholder="Name (e.g. My Modal)" value={modalForm.name} onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })} />
                  <input className="input" placeholder="https://…modal.run" value={modalForm.baseUrl} onChange={(e) => setModalForm({ ...modalForm, baseUrl: e.target.value })} />
                  <input className="input" type="password" placeholder="Secret (sent as Bearer)" value={modalForm.apiKey} onChange={(e) => setModalForm({ ...modalForm, apiKey: e.target.value })} />
                  <input className="input" placeholder="Models (comma-separated)" value={modalForm.models} onChange={(e) => setModalForm({ ...modalForm, models: e.target.value })} />
                </div>
                <button className="btn-primary mt-3" onClick={() => { if (modalForm.baseUrl) { s.addModalProvider({ name: modalForm.name, baseUrl: modalForm.baseUrl, apiKey: modalForm.apiKey, models: modalForm.models.split(",").map((m) => m.trim()).filter(Boolean) }); setModalForm({ name: "", baseUrl: "", apiKey: "", models: "" }); } }}>Add Modal backend</button>

                {modalBackends.length > 0 && (
                  <div className="mt-4 border-t border-border/40 pt-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">Dev/Test backend (route everything to Modal)</div>
                        <div className="text-[11px] text-muted">One switch points Chat, Image &amp; Video at the chosen backend; turning it off restores your previous providers.</div>
                      </div>
                      <Toggle checked={s.devTest.enabled} onChange={(on) => s.setDevTest(on, devBackendId)} />
                    </div>
                    <select className="input text-xs" value={devBackendId} disabled={s.devTest.enabled} onChange={(e) => setDevSel(e.target.value)}>
                      {modalBackends.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    {s.devTest.enabled && <div className="text-[11px] text-emerald-400">Dev/Test on — all modalities are using <strong>{modalBackends.find((b) => b.id === s.devTest.backendId)?.name || "Modal"}</strong>.</div>}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="card p-4 border border-border/60 bg-surface2/20">
            <div className="font-semibold text-sm mb-2.5 flex items-center gap-2 text-text">
              <Sparkles size={16} className="text-primary-light" /> FAL.ai LoRA Training Settings
            </div>
            <p className="text-xs text-muted mb-4 max-w-2xl leading-relaxed">
              Configure your FAL.ai API key to enable Flux LoRA training. This allows you to generate high-fidelity, download-ready custom LoRAs (.safetensors file) of your characters directly from your reference images.
            </p>
            <div className="max-w-md">
              <Field label={<span><Lock size={13} className="inline mr-1 text-primary-light" /> FAL.ai API Key (FAL_KEY)</span>}>
                <input 
                  className="input text-xs" 
                  type="password" 
                  placeholder="fal_..." 
                  value={s.falKey || ""} 
                  onChange={(e) => s.setFalKey(e.target.value)} 
                />
              </Field>
            </div>
          </div>
        </div>
      )}

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
          ComfyUI is installed and managed by the app inside its own subfolder — there’s no path to configure.
          It boots <strong>CPU-only by default</strong> so it always starts; cloud generation runs on GPUs (e.g. Modal) via the
          provider tab inside the ComfyUI canvas.
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          {([
            { id: 'cpu', label: 'CPU-only', icon: Cpu, desc: 'Always boots. The local instance just hosts the UI; generation offloads to the cloud GPU provider.' },
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
              placeholder="e.g. D:\AI_Models\StableDiffusion"
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
          when the local instance launches — you won’t re-enter them in the workspace. Needed for gated models (HF) and CivitAI downloads.
        </p>
        <div className="space-y-3">
          <Field label="CivitAI API Key">
            <input type="password" className="input text-sm" placeholder="CivitAI API key" value={comfy.apiKeys.civitai} onChange={(e) => comfy.set("apiKeys", { ...comfy.apiKeys, civitai: e.target.value })} />
          </Field>
          <Field label="Hugging Face Token">
            <input type="password" className="input text-sm" placeholder="hf_..." value={comfy.apiKeys.huggingface} onChange={(e) => comfy.set("apiKeys", { ...comfy.apiKeys, huggingface: e.target.value })} />
          </Field>
          <Field label={<span>Tavily API Key <span className="text-muted">(optional — AI model source search)</span></span>}>
            <input type="password" className="input text-sm" placeholder="tvly-..." value={comfy.apiKeys.tavily} onChange={(e) => comfy.set("apiKeys", { ...comfy.apiKeys, tavily: e.target.value })} />
          </Field>
        </div>
      </div>

      {/* ComfyUI Execution Mode Configuration */}
      <div className="card p-4">
        <div className="font-semibold mb-1">ComfyUI Execution & Resource Mode</div>
        <p className="text-xs text-muted mb-4">
          Choose how ComfyUI workflows are executed: entirely local, hybrid (local UI with remote cloud GPU offloading), or fully in the cloud.
        </p>
        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          {(['local', 'hybrid', 'cloud'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`card p-4 text-left border flex flex-col justify-between transition-all ${
                comfy.runMode === mode
                  ? "border-primary bg-primary/5 shadow-glow"
                  : "border-border hover:border-primary/40"
              }`}
              onClick={() => comfy.set("runMode", mode)}
            >
              <div>
                <div className="font-semibold capitalize text-sm mb-1">{mode} Mode</div>
                <p className="text-[11px] text-muted leading-relaxed">
                  {mode === 'local' && "Run interface and GPU node execution completely on your local computer."}
                  {mode === 'hybrid' && "Run node interface locally, but offload the intensive GPU execution to a remote cloud worker."}
                  {mode === 'cloud' && "Execute API workflows entirely in the cloud on managed serverless environments."}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className={`text-[10px] uppercase font-bold tracking-wider ${
                  comfy.runMode === mode ? "text-primary" : "text-muted"
                }`}>
                  {comfy.runMode === mode ? "✓ Selected" : "Select"}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="border-t border-border/40 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold">Lock Run Mode Choice</div>
              <p className="text-[11px] text-muted">When locked, the startup resource selection dialog will not prompt you when loading ComfyUI Gears.</p>
            </div>
            <Toggle
              checked={comfy.runModeLocked}
              onChange={(b) => comfy.set("runModeLocked", b)}
            />
          </div>
        </div>

        {comfy.runMode === 'hybrid' && (
          <div className="border-t border-border/40 pt-4 mt-3 space-y-3">
            <div className="text-xs font-semibold text-primary">Hybrid Mode Settings (nathannlu/comfyui-cloud)</div>
            <p className="text-[11px] text-muted">
              Configure details for the `nathannlu/comfyui-cloud` custom node settings to offload execution to a remote GPU server.
            </p>
            <div className="grid md:grid-cols-3 gap-3">
              <Field label="Custom Node Repo">
                <input
                  className="input text-xs"
                  value={comfy.hybridConfig.customNodeRepo}
                  onChange={(e) => comfy.updateHybridConfig({ customNodeRepo: e.target.value })}
                />
              </Field>
              <Field label="Remote GPU URL">
                <input
                  className="input text-xs"
                  placeholder="https://remote-gpu-server.com"
                  value={comfy.hybridConfig.remoteGpuUrl}
                  onChange={(e) => comfy.updateHybridConfig({ remoteGpuUrl: e.target.value })}
                />
              </Field>
              <Field label="Remote Auth Key / Secret">
                <input
                  className="input text-xs"
                  type="password"
                  placeholder="Enter remote auth key..."
                  value={comfy.hybridConfig.remoteGpuKey}
                  onChange={(e) => comfy.updateHybridConfig({ remoteGpuKey: e.target.value })}
                />
              </Field>
            </div>
          </div>
        )}
      </div>

      {/* 1. ComfyUI API Providers */}
      <div className="card p-4">
        <div className="font-semibold mb-1">ComfyUI Cloud & API Providers</div>
        <p className="text-xs text-muted mb-4">
          Select and configure connection endpoints and API keys for running workflows remotely.
        </p>
        <div className="grid gap-3">
          {comfy.providers.map((p) => {
            const isActive = comfy.activeProviderId === p.id;
            return (
              <div key={p.id} className={`card p-4 bg-surface2/40 border ${isActive ? "border-primary shadow-glow bg-surface2/60" : "border-border/60"}`}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => comfy.set("activeProviderId", p.id)}
                      className={`btn ${isActive ? "btn-primary" : "btn-outline"} px-3 py-1.5`}
                    >
                      {isActive ? <><Check size={14} /> Active</> : "Use"}
                    </button>
                    <div>
                      <div className="font-medium text-sm">{p.name}</div>
                      <div className="text-[10px] text-muted truncate max-w-[200px]">{p.url}</div>
                    </div>
                  </div>
                  <Toggle
                    checked={p.enabled}
                    onChange={(b) => comfy.updateProvider(p.id, { enabled: b })}
                    label={p.enabled ? "Enabled" : "Disabled"}
                  />
                </div>
                {p.enabled && (
                  <div className="grid md:grid-cols-2 gap-3 mt-1.5">
                    <Field label="API Endpoint URL">
                      <input
                        className="input text-xs"
                        value={p.url}
                        onChange={(e) => comfy.updateProvider(p.id, { url: e.target.value })}
                      />
                    </Field>
                    <Field label="API Key / Token">
                      <input
                        className="input text-xs"
                        type="password"
                        placeholder="Enter API key..."
                        value={p.apiKey || ""}
                        onChange={(e) => comfy.updateProvider(p.id, { apiKey: e.target.value })}
                      />
                    </Field>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Custom Nodes Manager */}
      <div className="card p-4">
        <div className="font-semibold mb-1">Custom Nodes Hub</div>
        <p className="text-xs text-muted mb-4">
          Provide GitHub URLs of ComfyUI custom nodes that your workflow requires. When running remotely, the API controller will ensure they are loaded/installed.
        </p>
        <div className="flex gap-2 mb-4">
          <input
            className="input text-sm flex-1"
            placeholder="e.g. https://github.com/cubiq/ComfyUI_IPAdapter_plus"
            value={nodeUrl}
            onChange={(e) => setNodeUrl(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary px-4 h-10 flex items-center justify-center font-bold gap-1"
            onClick={() => {
              if (nodeUrl.trim()) {
                comfy.addCustomNode(nodeUrl);
                setNodeUrl("");
              }
            }}
          >
            <Plus size={16} /> Add Node
          </button>
        </div>
        {comfy.customNodes.length > 0 ? (
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
            {comfy.customNodes.map((url) => (
              <div key={url} className="flex items-center justify-between p-2 bg-surface2/60 border border-border/40 rounded-lg text-xs">
                <span className="font-mono text-muted truncate max-w-[500px]">{url}</span>
                <button
                  type="button"
                  className="btn-ghost px-2 py-1 text-rose-400"
                  onClick={() => comfy.removeCustomNode(url)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted text-center py-2 bg-surface2/20 rounded-lg border border-dashed border-border/40">
            No custom nodes added yet. Standard workflows use built-in ComfyUI nodes.
          </p>
        )}
      </div>

      {/* 3. Civitai / Hugging Face Model Enabler */}
      <div className="card p-4">
        <div className="font-semibold mb-1">Civitai & Hugging Face Model Enablers</div>
        <p className="text-xs text-muted mb-4">
          Configure model mapping enablers. Since ComfyUI runs remotely, models will not download locally, but download urls/IDs are passed to the remote environment.
        </p>

        {/* Add mapping form */}
        <div className="bg-surface2/30 border border-border/40 p-4 rounded-xl space-y-3 mb-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Model Display Name">
              <input
                className={`input text-xs ${errors.name ? "border-rose-500/80" : ""}`}
                placeholder="e.g. DreamShaper v8"
                value={mapping.name}
                onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
              />
            </Field>
            <Field label="Model Source">
              <select
                className="input text-xs"
                value={mapping.source}
                onChange={(e) => setMapping({ ...mapping, source: e.target.value as any })}
              >
                <option value="huggingface">Hugging Face</option>
                <option value="civitai">Civitai</option>
              </select>
            </Field>
            <Field label="Checkpoint/Lora Filename *">
              <input
                className={`input text-xs ${errors.filename ? "border-rose-500/80" : ""}`}
                placeholder="e.g. dreamshaper_8.safetensors"
                value={mapping.filename}
                onChange={(e) => setMapping({ ...mapping, filename: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="HuggingFace Repo ID / Civitai Model ID *">
              <input
                className={`input text-xs ${errors.repoOrModelId ? "border-rose-500/80" : ""}`}
                placeholder="e.g. Lykon/DreamShaper or 4384"
                value={mapping.repoOrModelId}
                onChange={(e) => setMapping({ ...mapping, repoOrModelId: e.target.value })}
              />
            </Field>
            <Field label="Civitai Version ID (optional)">
              <input
                className="input text-xs"
                placeholder="e.g. 128713"
                value={mapping.versionId || ""}
                onChange={(e) => setMapping({ ...mapping, versionId: e.target.value })}
              />
            </Field>
            <Field label="Direct Download / Enabler URL *">
              <input
                className={`input text-xs ${errors.downloadUrl ? "border-rose-500/80" : ""}`}
                placeholder="e.g. https://civitai.com/api/download/models/128713"
                value={mapping.downloadUrl}
                onChange={(e) => setMapping({ ...mapping, downloadUrl: e.target.value })}
              />
            </Field>
          </div>
          <button type="button" className="btn-primary text-xs px-3 py-1.5" onClick={addMapping}>
            <Plus size={13} /> Link Model Mapping
          </button>
        </div>

        {/* Mappings List */}
        {comfy.modelMappings.length > 0 ? (
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {comfy.modelMappings.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between p-3 bg-surface2/60 border border-border/40 rounded-lg text-xs gap-2">
                <div>
                  <div className="font-semibold text-text">{m.name}</div>
                  <div className="text-[10px] text-muted mt-0.5">
                    File: <span className="font-mono">{m.filename}</span> · Source: <span className="capitalize">{m.source}</span> ({m.repoOrModelId})
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={m.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-primary hover:underline truncate max-w-[200px]"
                  >
                    Direct Link ↗
                  </a>
                  <button
                    type="button"
                    className="btn-ghost px-2 py-1 text-rose-400"
                    onClick={() => comfy.removeModelMapping(m.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted text-center py-2 bg-surface2/20 rounded-lg border border-dashed border-border/40">
            No Civitai or HuggingFace model mappings linked yet.
          </p>
        )}
      </div>

      {/* Dependency Reality Check Explanation */}
      <div className="card p-4 bg-primary/5 border border-primary/20">
        <div className="font-bold mb-2 flex items-center gap-1.5 text-primary-light">
          <ShieldCheck size={16} /> Dependency Isolation & Custom Nodes
        </div>
        <p className="text-xs text-muted leading-relaxed mb-3">
          ComfyUI operates as a single Python process where all custom nodes share the same environment. This means <strong>individual virtual environments per custom node are technically impossible</strong>—all nodes must share the same installed dependencies (like PyTorch).
        </p>
        <p className="text-xs text-muted leading-relaxed">
          Because installing a custom node through the manager can sometimes break your setup by overwriting a shared dependency, we guarantee stability by snapshotting the base environment. If a new node breaks your installation, open the ComfyUI Gear and click <strong className="text-text font-semibold">Repair ComfyUI environment</strong> to roll back to the known-good state.
        </p>
      </div>
    </div>
  );
}
