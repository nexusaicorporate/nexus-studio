"use client";
import { useState } from "react";
import Page from "@/components/Page";
import { BookOpen, Sparkles, Import, AlertCircle, Cpu, Download, ArrowRight, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMounted } from "@/components/ui";

export default function ComfyHubPage() {
  const mounted = useMounted();
  const router = useRouter();
  const [tab, setTab] = useState<"hub" | "docs">("hub");
  const [viewMode, setViewMode] = useState<"live" | "offline">("live");

  if (!mounted) return null;

  const templates = [
    {
      id: "t2i",
      name: "Text to Image (Standard SDXL)",
      desc: "Standard prompt execution block linking CLIPTextEncode, KSampler, EmptyLatentImage, and SaveImage. Ideal for basic checkpoints.",
      difficulty: "Beginner",
      nodes: 7
    },
    {
      id: "i2i",
      name: "Image to Image (VAE Encode)",
      desc: "Uses a reference image, encodes it to latent space, and applies a KSampler with denoise scaling (0.4 - 0.7) to modify the subject.",
      difficulty: "Beginner",
      nodes: 8
    },
    {
      id: "controlnet",
      name: "ControlNet Pose Transfer",
      desc: "Integrates ControlNet loaders and conditionings to lock in pose skeletons or structural layouts from reference images.",
      difficulty: "Intermediate",
      nodes: 10
    }
  ];

  return (
    <Page
      title="Comfy Hub & Documentation"
      subtitle="Browse standard workflow templates and read ComfyUI API integration references."
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex gap-2">
          <button
            className={`tab ${tab === "hub" ? "tab-active" : "tab-idle"}`}
            onClick={() => setTab("hub")}
          >
            <Sparkles size={14} /> Comfy Hub
          </button>
          <button
            className={`tab ${tab === "docs" ? "tab-active" : "tab-idle"}`}
            onClick={() => setTab("docs")}
          >
            <BookOpen size={14} /> Official API Docs
          </button>
        </div>

        <div className="flex items-center gap-2 bg-surface2/60 border border-border/40 rounded-xl p-1 shrink-0">
          <button
            className={`px-3 py-1 rounded-lg text-xs transition-colors font-medium ${
              viewMode === "live" ? "bg-primary text-primary-fg shadow" : "text-muted hover:text-text"
            }`}
            onClick={() => setViewMode("live")}
          >
            Live Web View
          </button>
          <button
            className={`px-3 py-1 rounded-lg text-xs transition-colors font-medium ${
              viewMode === "offline" ? "bg-primary text-primary-fg shadow" : "text-muted hover:text-text"
            }`}
            onClick={() => setViewMode("offline")}
          >
            Local Reader
          </button>
        </div>
      </div>

      {viewMode === "live" ? (
        <div className="card p-0 overflow-hidden border border-border bg-black/40 shadow-xl flex flex-col h-[calc(100vh-210px)] min-h-[500px]">
          <div className="bg-surface2/50 border-b border-border/40 px-4 py-2 flex items-center justify-between text-xs text-muted-more shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                Connected to:{" "}
                <strong>
                  {tab === "hub" ? "comfy.org/workflows" : "docs.comfy.org"}
                </strong>
              </span>
            </div>
            <a
              href={
                tab === "hub"
                  ? "https://comfy.org/workflows"
                  : "https://docs.comfy.org/api-reference/cloud/workflow/get-information-about-current-prompt-execution"
              }
              target="_blank"
              rel="noreferrer"
              className="btn-outline px-2.5 py-1 text-[11px] flex items-center gap-1 hover:text-primary-light"
            >
              Open in Browser <ExternalLink size={11} />
            </a>
          </div>
          <iframe
            src={
              tab === "hub"
                ? "https://comfy.org/workflows"
                : "https://docs.comfy.org/api-reference/cloud/workflow/get-information-about-current-prompt-execution"
            }
            className="flex-1 w-full border-0 bg-white"
            title={tab === "hub" ? "Comfy Hub" : "ComfyUI API Documentation"}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>
      ) : tab === "hub" ? (
        <div className="space-y-5">
          <div className="card p-4 bg-primary/5 border border-primary/20 flex gap-3 items-start">
            <AlertCircle className="text-primary-light flex-shrink-0 mt-0.5" size={18} />
            <div>
              <div className="font-semibold text-primary-light">What is the Comfy Hub?</div>
              <p className="text-xs text-muted leading-relaxed mt-0.5">
                The Comfy Hub offers pre-constructed, optimized ComfyUI API JSON workflows. Click <strong>Import to Studio</strong> to load them into the editor, tweak parameters, and run them remotely on your active ComfyUI host.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <div key={tpl.id} className="card p-4 flex flex-col justify-between hover:border-primary/40 transition-colors">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`chip text-[9px] uppercase tracking-wider font-semibold ${
                      tpl.difficulty === "Beginner" ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                    }`}>
                      {tpl.difficulty}
                    </span>
                    <span className="text-[10px] text-muted">{tpl.nodes} nodes</span>
                  </div>
                  <h4 className="font-semibold text-sm mb-1.5">{tpl.name}</h4>
                  <p className="text-xs text-muted leading-relaxed mb-4">{tpl.desc}</p>
                </div>
                <button
                  type="button"
                  className="btn-primary w-full text-xs py-2 mt-2 flex items-center justify-center gap-1"
                  onClick={() => router.push(`/studio/workflow?template=${tpl.id}`)}
                >
                  <Import size={13} /> Import to Studio
                </button>
              </div>
            ))}
          </div>

          {/* GitHub References */}
          <div className="card p-4">
            <div className="font-semibold mb-1 flex items-center gap-2">
              <Cpu size={18} className="text-primary-light" /> Important Repository Links
            </div>
            <p className="text-xs text-muted mb-3">Quick access to essential repositories for local hosting setup, custom nodes, and example libraries.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <a
                href="https://github.com/Comfy-Org/ComfyUI"
                target="_blank"
                rel="noopener noreferrer"
                className="card p-3 bg-surface2/30 hover:bg-surface2/50 border border-border/40 flex flex-col justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-text">ComfyUI Core</div>
                  <p className="text-[10px] text-muted mt-1 leading-relaxed">The main backend repository for node-based stable diffusion interfaces.</p>
                </div>
                <div className="text-[10px] text-primary flex items-center gap-1 mt-3">
                  GitHub Repository <ExternalLink size={10} />
                </div>
              </a>

              <a
                href="https://github.com/Comfy-Org/ComfyUI-Manager"
                target="_blank"
                rel="noopener noreferrer"
                className="card p-3 bg-surface2/30 hover:bg-surface2/50 border border-border/40 flex flex-col justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-text">ComfyUI Manager</div>
                  <p className="text-[10px] text-muted mt-1 leading-relaxed">Manager node extension to install custom nodes, models, and run updates.</p>
                </div>
                <div className="text-[10px] text-primary flex items-center gap-1 mt-3">
                  GitHub Repository <ExternalLink size={10} />
                </div>
              </a>

              <a
                href="https://github.com/comfyanonymous/ComfyUI_examples"
                target="_blank"
                rel="noopener noreferrer"
                className="card p-3 bg-surface2/30 hover:bg-surface2/50 border border-border/40 flex flex-col justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-text">ComfyUI Examples</div>
                  <p className="text-[10px] text-muted mt-1 leading-relaxed">Standard workflow layouts for image to image, inpainting, ControlNet, and SDXL.</p>
                </div>
                <div className="text-[10px] text-primary flex items-center gap-1 mt-3">
                  GitHub Repository <ExternalLink size={10} />
                </div>
              </a>

              <a
                href="https://github.com/Comfy-Org/ComfyUI/tree/desktop-release-may292025"
                target="_blank"
                rel="noopener noreferrer"
                className="card p-3 bg-surface2/30 hover:bg-surface2/50 border border-border/40 flex flex-col justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-text">ComfyUI Desktop App</div>
                  <p className="text-[10px] text-muted mt-1 leading-relaxed">Official Electron-based desktop release branches like <code>desktop-release-may292025</code>.</p>
                </div>
                <div className="text-[10px] text-primary flex items-center gap-1 mt-3">
                  Desktop Branch <ExternalLink size={10} />
                </div>
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-5 items-start">
          {/* Docs Contents Table (4 cols) */}
          <div className="lg:col-span-3 card p-4 space-y-3">
            <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-more border-b border-border/40 pb-2">
              API Topics
            </h4>
            <div className="flex flex-col gap-1 text-xs">
              <a href="#intro" className="text-primary hover:underline py-1">1. Enabling API Mode</a>
              <a href="#prompt" className="text-primary hover:underline py-1">2. POST /prompt Endpoint</a>
              <a href="#ws" className="text-primary hover:underline py-1">3. WebSocket Monitoring</a>
              <a href="#status" className="text-primary hover:underline py-1">4. GET Prompt Execution Status</a>
              <a href="#model" className="text-primary hover:underline py-1">5. Model Enabler Concept</a>
              <a href="#cloud" className="text-primary hover:underline py-1">6. ComfyUI Cloud Platform API</a>
            </div>
          </div>

          {/* Docs Viewer (9 cols) */}
          <div className="lg:col-span-9 card p-5 space-y-6 prose prose-invert max-w-none text-xs leading-relaxed text-zinc-300">
            <section id="intro" className="space-y-2.5">
              <h3 className="text-sm font-semibold text-text border-b border-border/40 pb-2 flex items-center gap-1.5">
                1. Enabling ComfyUI API Mode
              </h3>
              <p>
                By default, saving a workflow in ComfyUI outputs a UI-compatible layout. To send tasks remotely using our application, you must output an <strong>API formatted JSON</strong>.
              </p>
              <ol className="list-decimal list-inside space-y-1 mt-1 pl-1">
                <li>Open your local ComfyUI interface.</li>
                <li>Click the <strong>Settings</strong> gear icon on the floating menu.</li>
                <li>Enable the checkbox labeled <strong>"Enable Dev mode"</strong>.</li>
                <li>Now, a new button labeled <strong>"Save (API Format)"</strong> will appear on the menu.</li>
                <li>Click this button to save the minimized nodes JSON layout and paste it in our <strong>Workflow Studio</strong> tab.</li>
              </ol>
            </section>

            <section id="prompt" className="space-y-2.5">
              <h3 className="text-sm font-semibold text-text border-b border-border/40 pb-2">
                2. POST /prompt (Queueing Prompts)
              </h3>
              <p>
                To run a workflow, send a POST request containing your API JSON nodes configuration under the <code>prompt</code> field.
              </p>
              <div className="bg-black/90 p-3 rounded-lg border border-border/60 font-mono text-[10px]">
                <div className="text-primary-light mb-1">POST http://localhost:8188/prompt</div>
                <pre>{`{
  "client_id": "nexus_studio_client",
  "prompt": {
    "3": {
      "class_type": "KSampler",
      "inputs": {
        "seed": 12345678,
        "steps": 20,
        "positive": ["6", 0],
        ...
      }
    }
  }
}`}</pre>
              </div>
            </section>

            <section id="ws" className="space-y-2.5">
              <h3 className="text-sm font-semibold text-text border-b border-border/40 pb-2">
                3. WebSocket /ws (Live Progress)
              </h3>
              <p>
                Connect to the WebSocket endpoint to receive live updates about the executing nodes.
              </p>
              <ul className="list-disc list-inside space-y-1 mt-1 pl-1">
                <li>URL: <code>ws://localhost:8188/ws?clientId=nexus_studio_client</code></li>
                <li>Events:
                  <ul className="list-disc list-inside pl-4 mt-1 text-muted">
                    <li><code>status</code>: Current queue length and server status.</li>
                    <li><code>execution_start</code>: Indicates which prompt ID started running.</li>
                    <li><code>executing</code>: Tells you the currently executing node ID (e.g. <code>"node": "3"</code>).</li>
                    <li><code>progress</code>: Steps progress in KSampler (e.g. <code>"value": 15, "max": 20</code>).</li>
                    <li><code>executed</code>: Node output files generated (e.g., VAE outputs, image URLs).</li>
                  </ul>
                </li>
              </ul>
            </section>

            <section id="status" className="space-y-2.5">
              <h3 className="text-sm font-semibold text-text border-b border-border/40 pb-2">
                4. GET /history/{`{prompt_id}`} (Prompt Execution status)
              </h3>
              <p>
                To poll for execution completion on serverless cloud providers (like Replicate, RunPod, or ComfyUI Cloud) without persistent WebSockets, query prompt information from the history cache.
              </p>
              <div className="bg-black/90 p-3 rounded-lg border border-border/60 font-mono text-[10px]">
                <div className="text-primary-light mb-1">GET /history/prompt_random_uuid</div>
                <pre>{`{
  "prompt_random_uuid": {
    "status": {
      "status_str": "success",
      "completed": true,
      "messages": []
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

            <section id="model" className="space-y-2.5">
              <h3 className="text-sm font-semibold text-text border-b border-border/40 pb-2">
                5. Civitai & HuggingFace Model Enabler Mappings
              </h3>
              <p>
                Since remote servers run headless workflows, checkpoint or LoRA files (e.g. <code>dreamshaper_8.safetensors</code>) referenced in nodes must be present on the remote file system.
              </p>
              <p>
                Our <strong>Model Enabler</strong> maps local filenames to Civitai or HuggingFace API download links. When execution is requested, the application instructs the serverless worker to pull the model files from our mapped direct download links if they are not already cached.
              </p>
            </section>

            <section id="cloud" className="space-y-2.5">
              <h3 className="text-sm font-semibold text-text border-b border-border/40 pb-2">
                6. ComfyUI Cloud Platform API Spec
              </h3>
              <p>
                To run prompts remotely on the official **ComfyUI Cloud Platform** (<code>https://cloud.comfy.org</code>), you must authenticate using your personal API key passed via the <code>X-API-Key</code> request header.
              </p>
              <div className="bg-black/90 p-3 rounded-lg border border-border/60 font-mono text-[10px]">
                <div className="text-primary-light mb-1">Queue Cloud Prompt Execution</div>
                <div className="text-[10px] text-muted-more mb-1.5">POST https://cloud.comfy.org/api/prompt</div>
                <pre>{`curl -X POST https://cloud.comfy.org/api/prompt \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_comfy_cloud_api_key_here" \\
  -d '{
    "prompt": {
      "3": {
        "class_type": "KSampler",
        "inputs": {
          "seed": 8632194305,
          "steps": 20,
          "cfg": 8,
          "sampler_name": "euler",
          "scheduler": "normal",
          "model": ["4", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["5", 0]
        }
      }
    }
  }'`}</pre>
              </div>

              <div className="bg-black/90 p-3 rounded-lg border border-border/60 font-mono text-[10px] mt-3">
                <div className="text-primary-light mb-1">Get Execution Information & Status</div>
                <div className="text-[10px] text-muted-more mb-1.5">GET https://cloud.comfy.org/api/prompt?id={'{prompt_id}'}</div>
                <pre>{`curl -X GET https://cloud.comfy.org/api/prompt?id=prompt_random_uuid \\
  -H "X-API-Key: your_comfy_cloud_api_key_here"`}</pre>
                <div className="text-primary-light mt-3 mb-1">Response Payload Format</div>
                <pre>{`{
  "prompt_id": "prompt_random_uuid",
  "status": "success", // "pending" | "running" | "success" | "failed"
  "completed": true,
  "progress": 1.0,
  "output": {
    "images": [
      {
        "url": "https://api.comfy.org/files/output_image_uuid.png",
        "filename": "output_image_uuid.png"
      }
    ]
  }
}`}</pre>
              </div>
            </section>
          </div>
        </div>
      )}
    </Page>
  );
}
