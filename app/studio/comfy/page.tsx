"use client";
import { useState } from "react";
import Page from "@/components/Page";
import { BookOpen, Sparkles, Import, AlertCircle, Cpu, ExternalLink, Globe, Code, Layers, FileCode, CheckCircle2, Upload, Trash2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMounted } from "@/components/ui";
import { useComfyStore } from "@/lib/store/comfy";
import { extractRequiredModels } from "@/lib/comfy-models";
import ComfyEnvSelector, { ComfyEnvDropdown } from "@/components/ComfyEnvSelector";
import { HUB_WORKFLOWS } from "@/lib/data/comfyworkflows";

export default function ComfyHubPage() {
  const mounted = useMounted();
  const router = useRouter();
  const comfy = useComfyStore();
  const [tab, setTab] = useState<"hub" | "docs">("hub");
  const [filterCat, setFilterCat] = useState<string>("All");

  function importWorkflow(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        JSON.parse(text); // validate
        comfy.addWorkflow({
          id: "wf-" + Date.now(),
          name: f.name.replace(/\.json$/i, ""),
          description: "Imported workflow",
          json: text,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      } catch { alert("That file isn't valid workflow JSON."); }
    };
    reader.readAsText(f);
    e.target.value = "";
  }
  function useWorkflow(id: string) { router.push(`/studio/workflow?workflow=${id}`); }

  if (!mounted) return null;

  const categories = ["All", "Image", "Video", "ControlNet", "Flux", "Utilities"];
  const filteredWorkflows = filterCat === "All"
    ? HUB_WORKFLOWS
    : HUB_WORKFLOWS.filter((w) => w.category === filterCat);

  return (
    <Page
      title="Comfy Hub Gear"
      subtitle="Provision execution environments, browse built-in workflow JSON configurations, and read API integrations."
      actions={
        <div className="flex items-center gap-3">
          <ComfyEnvDropdown />
          <label className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer">
            <Upload size={13} /> Import Workflow
            <input type="file" accept="application/json" hidden onChange={importWorkflow} />
          </label>
          <button
            type="button"
            className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
            onClick={() => comfy.set("runModeLocked", false)}
          >
            <Layers size={13} /> Change Env
          </button>
        </div>
      }
    >
      {/* ComfyUI Startup Select Modal */}
      <ComfyEnvSelector />

      {/* Tabs Menu */}
      <div className="flex gap-2 mb-5">
        <button
          className={`tab ${tab === "hub" ? "tab-active" : "tab-idle"}`}
          onClick={() => setTab("hub")}
        >
          <Sparkles size={14} /> Workflow Hub
        </button>
        <button
          className={`tab ${tab === "docs" ? "tab-active" : "tab-idle"}`}
          onClick={() => setTab("docs")}
        >
          <BookOpen size={14} /> ComfyUI API Documentation
        </button>
      </div>

      {tab === "hub" ? (
        <div className="space-y-6">
          {/* Active Mode Notice */}
          <div className="card p-4 bg-primary/5 border border-primary/20 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-3 items-start">
              <AlertCircle className="text-primary-light flex-shrink-0 mt-0.5" size={18} />
              <div>
                <div className="font-semibold text-primary-light text-sm">
                  Active Resource Mode: <span className="capitalize">{comfy.runMode}</span> Mode
                </div>
                <p className="text-xs text-muted leading-relaxed mt-0.5">
                  Canvas running on {comfy.hybridConfig.remoteGpuUrl || "studio:8188"}.
                  {comfy.runMode === "hybrid" && ` Generations on local server GPU.`}
                  {comfy.runMode === "cloud" && ` Generations via ${comfy.cloudPlan || "cloud API"} (${comfy.cloudEnvironment}).`}
                </p>
              </div>
            </div>
            {comfy.runMode === "cloud" && !comfy.cloudPlan && (
              <button
                type="button"
                className="btn-primary py-1.5 px-3 text-xs font-bold"
                onClick={() => comfy.set("runModeLocked", false)}
              >
                Select Pricing Plan
              </button>
            )}
          </div>

          {/* Your imported workflows */}
          {comfy.workflows.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileCode size={15} className="text-primary-light" />
                <h3 className="font-bold text-sm">Your Imported Workflows</h3>
                <span className="text-[11px] text-muted">({comfy.workflows.length})</span>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {comfy.workflows.map((wf) => {
                  let modelCount = 0;
                  try { modelCount = extractRequiredModels(JSON.parse(wf.json)).length; } catch {}
                  return (
                    <div key={wf.id} className="card p-4 flex flex-col justify-between border border-border bg-surface/80">
                      <div>
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <h4 className="font-bold text-sm text-text truncate">{wf.name}</h4>
                          <button type="button" className="btn-ghost px-1.5 py-1 text-rose-400 shrink-0" title="Delete" onClick={() => comfy.deleteWorkflow(wf.id)}><Trash2 size={13} /></button>
                        </div>
                        <p className="text-xs text-muted leading-relaxed mb-3 line-clamp-2">{wf.description || "Imported workflow"}</p>
                        <div className="text-[10px] text-muted-more bg-surface2/40 px-2.5 py-1.5 rounded-lg border border-border/20 mb-3">
                          Requires <strong>{modelCount}</strong> model{modelCount === 1 ? "" : "s"}
                        </div>
                      </div>
                      <button type="button" className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-1.5 font-bold" onClick={() => useWorkflow(wf.id)}>
                        <Send size={13} /> Use in ComfyUI
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Categories Filter */}
          <div className="flex flex-wrap gap-1.5 border-b border-border/40 pb-3">
            {categories.map((catName) => (
              <button
                key={catName}
                type="button"
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterCat === catName
                    ? "bg-primary text-primary-fg shadow"
                    : "text-muted hover:text-text bg-surface2/40 hover:bg-surface2/80"
                }`}
                onClick={() => setFilterCat(catName)}
              >
                {catName}
              </button>
            ))}
          </div>

          {/* Workflows Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWorkflows.map((tpl) => (
              <div
                key={tpl.id}
                className="card p-5 flex flex-col justify-between border border-border hover:border-primary/40 transition-colors bg-surface/80"
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="chip text-[9px] uppercase tracking-wider font-bold bg-primary/10 text-primary-light border-primary/20">
                      {tpl.category}
                    </span>
                    <span
                      className={`chip text-[9px] uppercase tracking-wider font-semibold ${
                        tpl.difficulty === "Beginner"
                          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                          : tpl.difficulty === "Intermediate"
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                          : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                      }`}
                    >
                      {tpl.difficulty}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-text mb-1.5">{tpl.name}</h4>
                  <p className="text-xs text-muted leading-relaxed mb-4 min-h-[50px]">{tpl.desc}</p>

                  <div className="flex items-center justify-between text-[10px] text-muted-more bg-surface2/40 px-2.5 py-1.5 rounded-lg border border-border/20 mb-4">
                    <span>Nodes: <strong>{tpl.nodes}</strong></span>
                    <span>Author: <strong>{tpl.author}</strong></span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-primary w-full text-xs py-2 mt-2 flex items-center justify-center gap-1.5 font-bold shadow-sm"
                  onClick={() => {
                    // Save workflow into ComfyStore and load it
                    comfy.addWorkflow({
                      id: tpl.id,
                      name: tpl.name,
                      description: tpl.desc,
                      json: JSON.stringify(tpl.json, null, 2),
                      createdAt: Date.now(),
                      updatedAt: Date.now()
                    });
                    router.push(`/studio/workflow?template=${tpl.id}`);
                  }}
                >
                  <Send size={13} /> Use in ComfyUI
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Docs Table of Contents (3 cols) */}
          <div className="lg:col-span-3 card p-4 space-y-2 border border-border bg-surface2/25">
            <h4 className="font-bold text-xs uppercase tracking-wider text-primary border-b border-border/40 pb-2 mb-2">
              API Topics
            </h4>
            <nav className="flex flex-col gap-1.5 text-xs">
              <a href="#introduction" className="text-muted hover:text-primary transition-colors py-1 pl-1 border-l border-transparent hover:border-primary">
                1. API Reference Introduction
              </a>
              <a href="#enabling-dev" className="text-muted hover:text-primary transition-colors py-1 pl-1 border-l border-transparent hover:border-primary">
                2. Enabling Developer API Mode
              </a>
              <a href="#prompt-endpoint" className="text-muted hover:text-primary transition-colors py-1 pl-1 border-l border-transparent hover:border-primary">
                3. POST /prompt (Queueing)
              </a>
              <a href="#ws-monitoring" className="text-muted hover:text-primary transition-colors py-1 pl-1 border-l border-transparent hover:border-primary">
                4. WebSocket Event Stream
              </a>
              <a href="#history-retrieval" className="text-muted hover:text-primary transition-colors py-1 pl-1 border-l border-transparent hover:border-primary">
                5. GET /history (Retrieving)
              </a>
              <a href="#hybrid-setup" className="text-muted hover:text-primary transition-colors py-1 pl-1 border-l border-transparent hover:border-primary">
                6. Hybrid Remote GPU Node
              </a>
            </nav>
          </div>

          {/* Docs Content (9 cols) */}
          <div className="lg:col-span-9 card p-6 space-y-8 prose prose-invert max-w-none text-xs leading-relaxed text-zinc-300 border border-border bg-surface/50">
            
            {/* Section 1 */}
            <section id="introduction" className="space-y-3">
              <h3 className="text-base font-bold text-text border-b border-border/40 pb-2 flex items-center gap-2">
                <Code className="text-primary-light" size={18} /> 1. API Reference Introduction
              </h3>
              <p>
                The ComfyUI backend server acts as a powerful headless JSON execution engine. By sending workflow node specifications in API prompt formats, you can run complex Stable Diffusion and FLUX model chains programmatically.
              </p>
              <p>
                Our **Nexusaigear** platform supports standard local endpoints, hybrid offloading, and remote serverless clouds using places with ComfyUI API backend servers. We route execution triggers based on your active resource configuration switch.
              </p>
            </section>

            {/* Section 2 */}
            <section id="enabling-dev" className="space-y-3">
              <h3 className="text-base font-bold text-text border-b border-border/40 pb-2 flex items-center gap-2">
                <FileCode className="text-primary-light" size={18} /> 2. Enabling Developer API Mode
              </h3>
              <p>
                By default, saving a workflow in the ComfyUI web UI outputs a user interface layout JSON file containing visual placements. To retrieve the execution-compatible minimized JSON:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 pl-1.5 mt-1.5">
                <li>Open your local ComfyUI interface (usually at <code>http://localhost:8188</code>).</li>
                <li>Click the **Settings** gear icon on the floating menu.</li>
                <li>Check the box labeled **"Enable Dev mode"**.</li>
                <li>A new button labeled **"Save (API Format)"** will appear on your side panel.</li>
                <li>Click this button to save the api-compatible JSON. You can load this file into our **ComfyUI Gear** API panel.</li>
              </ol>
            </section>

            {/* Section 3 */}
            <section id="prompt-endpoint" className="space-y-3">
              <h3 className="text-base font-bold text-text border-b border-border/40 pb-2 flex items-center gap-2">
                <Code className="text-primary-light" size={18} /> 3. POST /prompt (Queueing Prompts)
              </h3>
              <p>
                To trigger a workflow execution, send a POST request with the API JSON structure placed under the <code>prompt</code> field.
              </p>
              <div className="bg-black/90 p-4 rounded-xl border border-border/60 font-mono text-[10px] space-y-2">
                <div className="text-primary-light">POST http://localhost:8188/prompt</div>
                <pre className="text-zinc-400">{`{
  "client_id": "nexus_studio_client",
  "prompt": {
    "3": {
      "class_type": "KSampler",
      "inputs": {
        "seed": 12345678,
        "steps": 20,
        "cfg": 8,
        "sampler_name": "euler",
        "scheduler": "normal",
        "model": ["4", 0],
        "positive": ["6", 0],
        "negative": ["7", 0],
        "latent_image": ["5", 0]
      }
    },
    "4": {
      "class_type": "CheckpointLoaderSimple",
      "inputs": { "ckpt_name": "dreamshaper_8.safetensors" }
    },
    ...
  }
}`}</pre>
              </div>
            </section>

            {/* Section 4 */}
            <section id="ws-monitoring" className="space-y-3">
              <h3 className="text-base font-bold text-text border-b border-border/40 pb-2 flex items-center gap-2">
                <Globe className="text-primary-light" size={18} /> 4. WebSocket Monitoring (/ws)
              </h3>
              <p>
                To listen to execution updates in real-time, connect to the WebSocket stream using the client ID passed during queueing.
              </p>
              <div className="bg-black/90 p-4 rounded-xl border border-border/60 font-mono text-[10px] space-y-2">
                <div className="text-primary-light">WebSocket URL: ws://localhost:8188/ws?clientId=nexus_studio_client</div>
                <div className="text-muted-more mt-2">Key Event Messages:</div>
                <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-1">
                  <li><code>{"{\"type\": \"status\", \"data\": {\"status\": {\"exec_info\": {\"queue_remaining\": 1}}}}"}</code></li>
                  <li><code>{"{\"type\": \"execution_start\", \"data\": {\"prompt_id\": \"uuid\"}}"}</code></li>
                  <li><code>{"{\"type\": \"executing\", \"data\": {\"node\": \"3\", \"prompt_id\": \"uuid\"}}"}</code></li>
                  <li><code>{"{\"type\": \"progress\", \"data\": {\"value\": 10, \"max\": 20}}"}</code></li>
                  <li><code>{"{\"type\": \"executed\", \"data\": {\"node\": \"9\", \"output\": {\"images\": [...]}}}"}</code></li>
                </ul>
              </div>
            </section>

            {/* Section 5 */}
            <section id="history-retrieval" className="space-y-3">
              <h3 className="text-base font-bold text-text border-b border-border/40 pb-2 flex items-center gap-2">
                <Code className="text-primary-light" size={18} /> 5. GET /history/{"{prompt_id}"} (History & Outputs)
              </h3>
              <p>
                For serverless architectures where long-running persistent WebSockets are not feasible, you can fetch completion details and media output URLs directly from the history cache.
              </p>
              <div className="bg-black/90 p-4 rounded-xl border border-border/60 font-mono text-[10px] space-y-2">
                <div className="text-primary-light">GET http://localhost:8188/history/prompt-uuid-here</div>
                <pre className="text-zinc-400">{`{
  "prompt-uuid-here": {
    "status": {
      "status_str": "success",
      "completed": true
    },
    "outputs": {
      "9": {
        "images": [
          {
            "filename": "ComfyUI_00001_.png",
            "subfolder": "",
            "type": "output"
          }
        ]
      }
    }
  }
}`}</pre>
              </div>
            </section>

            {/* Section 6 */}
            <section id="hybrid-setup" className="space-y-3">
              <h3 className="text-base font-bold text-text border-b border-border/40 pb-2 flex items-center gap-2">
                <Layers className="text-primary-light" size={18} /> 6. Hybrid Remote GPU Node Configuration
              </h3>
              <p>
                To execute local workflow graphs using remote cloud GPUs, configure the **nathannlu/comfyui-cloud** custom node.
              </p>
              <div className="bg-surface2/50 border border-border/40 p-4 rounded-xl space-y-2.5">
                <div className="flex items-center gap-2 text-primary-light font-semibold">
                  <CheckCircle2 size={15} /> Setup Steps
                </div>
                <ol className="list-decimal list-inside space-y-1 text-muted">
                  <li>Install the custom node repository: <code>https://github.com/nathannlu/comfyui-cloud</code>.</li>
                  <li>In your local ComfyUI settings or config file, input your remote cloud worker URL and secret GPU authentication key.</li>
                  <li>When you queue a prompt, the custom node will serialize your tensors and offload processing tasks seamlessly to the remote backend, returning completed outputs directly to your local UI.</li>
                </ol>
              </div>
            </section>

          </div>
        </div>
      )}
    </Page>
  );
}
