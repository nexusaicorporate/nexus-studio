"use client";
import { useState, useEffect } from "react";
import Page from "@/components/Page";
import { useAuth } from "@/components/AuthProvider";
import { checkComfyReachable } from "@/lib/comfy-runtime";
import {
  Terminal,
  Cpu,
  History,
  BookOpen,
  Code,
  CheckCircle2,
  Sparkles,
  Layers,
  Settings,
  ShieldCheck,
  AlertTriangle,
  RefreshCw
} from "lucide-react";

export default function DevGearPage() {
  const { plan, groups } = useAuth();
  const [tab, setTab] = useState<"skills" | "prompting" | "walkthrough" | "diagnostics">("skills");
  const [comfyStatus, setComfyStatus] = useState<"checking" | "online" | "offline">("checking");
  const [checking, setChecking] = useState(false);

  async function checkDiagnostics() {
    setChecking(true);
    setComfyStatus("checking");
    try {
      const reachable = await checkComfyReachable("http://127.0.0.1:8188", 2000);
      setComfyStatus(reachable ? "online" : "offline");
    } catch {
      setComfyStatus("offline");
    }
    setChecking(false);
  }

  useEffect(() => {
    checkDiagnostics();
  }, []);

  if (!groups.includes("dev") && !groups.includes("admin")) {
    return (
      <Page title="Dev Gear" subtitle="Restricted Developer Console">
        <div className="card p-8 flex flex-col items-center justify-center text-center space-y-4 max-w-lg mx-auto mt-12">
          <AlertTriangle className="text-red-500 w-12 h-12" />
          <h2 className="text-xl font-bold text-primary">Access Denied</h2>
          <p className="text-sm text-muted">
            You do not have the required permissions to view the Developer Gear. This surface is restricted to members of the <code>dev</code> and <code>admin</code> groups.
          </p>
        </div>
      </Page>
    );
  }

  return (
    <Page title="Developer Cockpit & Reference" subtitle="Monitor active integrations, research logs, prompting canons, and system diagnostics.">
      <div className="flex gap-2 mb-6 border-b border-border pb-4 overflow-x-auto">
        {(["skills", "prompting", "walkthrough", "diagnostics"] as const).map((t) => (
          <button
            key={t}
            className={`tab flex items-center gap-2 ${tab === t ? "tab-active" : "tab-idle"}`}
            onClick={() => setTab(t)}
          >
            {t === "skills" && <Code size={15} />}
            {t === "prompting" && <BookOpen size={15} />}
            {t === "walkthrough" && <History size={15} />}
            {t === "diagnostics" && <Cpu size={15} />}
            <span className="capitalize">{t}</span>
          </button>
        ))}
      </div>

      {tab === "skills" && (
        <div className="space-y-6">
          <div className="card p-5 bg-surface/50 border border-border/80 rounded-xl">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2 mb-2">
              <Sparkles size={18} className="text-accent" />
              AI Video Skills Integration Plan
            </h3>
            <p className="text-xs text-muted mb-4">
              Overview of evaluated community repositories and their scheduled integration routes inside Nexus Studio.
            </p>
            
            <div className="space-y-4">
              {/* Skill 1 */}
              <div className="border border-border/60 rounded-lg p-4 bg-background/40">
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-sm text-primary">1. patraxo/ltx2-vidgen-skill (Optimized Modal Backend)</h4>
                  <span className="chip bg-green-500/10 text-green-400 border border-green-500/20 text-[10px]">INTEGRATED</span>
                </div>
                <p className="text-xs text-muted mt-1.5">
                  Refactored stateless function to Modal Class <code>@app.cls</code> to enable resident memory warmth. Implemented PyTorch <code>torch.compile</code> caches on transformer blocks and persisted Inductor compiled kernels to the output volume to bypass cold-start compilation penalties. Added resolution-aware purges to prevent aspect ratio OOMs.
                </p>
              </div>

              {/* Skill 2 */}
              <div className="border border-border/60 rounded-lg p-4 bg-background/40">
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-sm text-primary">2. Sunwood-ai-labs/LTX23-ComfyUI-skill (Remote SSH & Bootstrapping)</h4>
                  <span className="chip bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px]">IN PROGRESS</span>
                </div>
                <p className="text-xs text-muted mt-1.5">
                  Allows direct bootstraps of ComfyUI over SSH onto cloud hosts. Integration plan targets adding a "Remote Bootstrapper" wizard inside the Comfy Hub settings to deploy ComfyUI on RunPod/Vast.ai in one click.
                </p>
              </div>

              {/* Skill 3 */}
              <div className="border border-border/60 rounded-lg p-4 bg-background/40">
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-sm text-primary">3. realaman90/ai-film-skills (Audiovisual Storyboard Stitcher)</h4>
                  <span className="chip bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px]">PROPOSED</span>
                </div>
                <p className="text-xs text-muted mt-1.5">
                  Introduces timeline mixing for dialogues, SFX, and background music. Proposed to add a "Compile Film" button inside the Cinema Gear that leverages ElevenLabs and FFmpeg to mix audio tracks into storyboard sequences.
                </p>
              </div>

              {/* Skill 4 */}
              <div className="border border-border/60 rounded-lg p-4 bg-background/40">
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-sm text-primary">4. NotMainstream/ltx-movie-studio (Talent Specs & EQ saturation filters)</h4>
                  <span className="chip bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px]">PROPOSED</span>
                </div>
                <p className="text-xs text-muted mt-1.5">
                  Applies FFmpeg desaturation filters to outputs and enforces talent bounds. Plan includes offering preset post-production grading and Talent Constraints as selectable recipes in the Prompt Director.
                </p>
              </div>

              {/* Skill 5 */}
              <div className="border border-border/60 rounded-lg p-4 bg-background/40">
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-sm text-primary">5. ruashots/ltx-msr-skill (Multiple Subject Reference)</h4>
                  <span className="chip bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px]">PROPOSED</span>
                </div>
                <p className="text-xs text-muted mt-1.5">
                  Allows multiple reference images inside an LTX sequence to lock multi-character identity consistency. Proposed to extend the Character Gear consistency slot to bind multi-character sheets.
                </p>
              </div>

              {/* Skill 6 */}
              <div className="border border-border/60 rounded-lg p-4 bg-background/40">
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-sm text-primary">6. MomoFadaly/video-gen (Smart Model Routing)</h4>
                  <span className="chip bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px]">PROPOSED</span>
                </div>
                <p className="text-xs text-muted mt-1.5">
                  Analyzes prompting keywords to auto-select optimal models (Veo, Kling, Wan, LTX) on model gateways like fal.ai. Proposed as a "Smart Router" catalog provider.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "prompting" && (
        <div className="space-y-6">
          <div className="card p-5 space-y-4">
            <h3 className="text-base font-semibold text-primary flex items-center gap-2">
              <BookOpen size={16} />
              LTX Video Screenplay prompting framework
            </h3>
            
            <div className="space-y-3 text-xs text-muted">
              <div>
                <strong className="text-primary block mb-1">Cinematic Slugline Header:</strong>
                Starts with uppercase location slug (e.g. <code>EXT. FOREST ROAD - SUNSET - DOLLY IN</code>) describing setting and initial camera state.
              </div>
              <div>
                <strong className="text-primary block mb-1">Single Paragraph Action:</strong>
                All action, scenery, and lighting states should flow in a single continuous paragraph using the <strong>present tense</strong>.
              </div>
              <div>
                <strong className="text-primary block mb-1">Physical Cue Expressions:</strong>
                Replace abstract adjectives (like "sad" or "happy") with physical triggers (e.g. <code>eyebrows tensed, a slow tear running down his cheek</code>).
              </div>
              <div>
                <strong className="text-primary block mb-1">Synchronized Speech Dialogue:</strong>
                Speech blocks must be in quotation marks, prefixed by the character and tone: <code>Reporter (enthusiastically): "Black gold has been found!"</code>.
              </div>
              <div>
                <strong className="text-primary block mb-1">LipDub Speech Replacement:</strong>
                Use template: <code>[Speaker] is speaking [Language/Accent], saying: "[Dialogue]"</code> in native alphabet script (e.g., Cyrillic for Russian). Syllable count should match source timing.
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "walkthrough" && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="card p-5 md:col-span-2">
              <h3 className="text-base font-semibold text-primary flex items-center gap-2 mb-4">
                <History size={16} />
                Nexusaigear Walkthrough & Change Logs
              </h3>
              
              <div className="relative border-l border-border/80 ml-2 pl-4 space-y-6">
                {/* Log entry 7 */}
                <div className="relative">
                  <span className="absolute -left-[21px] top-1 bg-surface border border-border w-2.5 h-2.5 rounded-full" />
                  <h4 className="font-semibold text-sm text-primary">Native LTX-Multifunctional &amp; LTX Director Port</h4>
                  <span className="text-[10px] text-muted font-mono">June 29, 2026</span>
                  <p className="text-xs text-muted mt-1">
                    Ported the low-memory FP8 quantization loading, VRAM CPU offloading, double-frame latent conditioning (start/end frame interpolation), and FFmpeg audio/dialogue track stitching from <code>LTX2.3-Multifunctional</code> and <code>WhatDreamsCost-ComfyUI</code> (LTX Director) directly into the native React/Next.js frontend (Video Gear / Cinema Gear) and the FastAPI Modal cloud GPU backend (<code>modal/video_ltx.py</code>). Implemented a client-side headless video element keyframe extractor in Cinema Gear for seamless scene-to-scene visual transitions.
                  </p>
                </div>

                {/* Log entry 6 */}
                <div className="relative">
                  <span className="absolute -left-[21px] top-1 bg-surface border border-border w-2.5 h-2.5 rounded-full" />
                  <h4 className="font-semibold text-sm text-primary">LTX Director &amp; Standard Nodes Integration on Cloud</h4>
                  <span className="text-[10px] text-muted font-mono">June 29, 2026</span>
                  <p className="text-xs text-muted mt-1">
                    Baked the <code>WhatDreamsCost-ComfyUI</code> (LTX Director timeline editor) along with its core dependencies <code>ComfyUI-LTXVideo</code> and <code>ComfyUI-KJNodes</code> into the default cloud-GPU Docker image inside <code>comfyui-nodes/comfyui-nexus-cloud/nexus_modal_app.py</code>. This standardizes the LTX timeline director stack across both local desktop and remote cloud sessions.
                  </p>
                </div>

                {/* Log entry 5 */}
                <div className="relative">
                  <span className="absolute -left-[21px] top-1 bg-surface border border-border w-2.5 h-2.5 rounded-full" />
                  <h4 className="font-semibold text-sm text-primary">Full HD Asset Integration & Custom Nav Overhaul</h4>
                  <span className="text-[10px] text-muted font-mono">June 29, 2026</span>
                  <p className="text-xs text-muted mt-1">
                    Integrated the complete set of 23 custom branding and gear icons representing each specific workspace. Configured the collapsed/expanded sidebar header with custom logos (<code>nexusai_logo_dark.png</code> and <code>nexusai_app_icon.jpg</code>) and wired custom metallic/circuit graphics directly to the navigation array. This covers 100% of all workspace gears (including previously missing Image, Video, Bulk, and Docs gears) with beautiful custom icon options.
                  </p>
                </div>

                {/* Log entry 4 */}
                <div className="relative">
                  <span className="absolute -left-[21px] top-1 bg-surface border border-border w-2.5 h-2.5 rounded-full" />
                  <h4 className="font-semibold text-sm text-primary">Modal Backend Cache Tuning & App Crash Fix</h4>
                  <span className="text-[10px] text-muted font-mono">June 28, 2026</span>
                  <p className="text-xs text-muted mt-1">
                    Fixed a fatal <code>ModuleNotFoundError</code> where remote Modal containers failed to load <code>workflow_inputs.py</code> during initial imports. Refactored the stateless function in <code>modal/video_ltx.py</code> into a warm <code>@app.cls</code> class to enforce resident model compilation and persistent Inductor kernel caching on the persistent volume.
                  </p>
                </div>

                {/* Log entry 3 */}
                <div className="relative">
                  <span className="absolute -left-[21px] top-1 bg-surface border border-border w-2.5 h-2.5 rounded-full" />
                  <h4 className="font-semibold text-sm text-primary">Multimodal Analyze Gear Expansion</h4>
                  <span className="text-[10px] text-muted font-mono">June 28, 2026</span>
                  <p className="text-xs text-muted mt-1">
                    Expanded the Analyze Gear to support both image and video attachments. Wired video player components into chat log streams, updated providers to pack <code>video_url</code> arrays, and supported multi-attachment formats.
                  </p>
                </div>

                {/* Log entry 2 */}
                <div className="relative">
                  <span className="absolute -left-[21px] top-1 bg-surface border border-border w-2.5 h-2.5 rounded-full" />
                  <h4 className="font-semibold text-sm text-primary">Cinema Storyboard Stitcher & Character Consistency</h4>
                  <span className="text-[10px] text-muted font-mono">June 27, 2026</span>
                  <p className="text-xs text-muted mt-1">
                    Added local video compilation calling a Tauri-Rust <code>concat_videos</code> bridge (FFmpeg). Created character sheet generators inside <code>app/studio/character</code> and wired references into the Image and Video studios to lock character consistency.
                  </p>
                </div>

                {/* Log entry 1 */}
                <div className="relative">
                  <span className="absolute -left-[21px] top-1 bg-surface border border-border w-2.5 h-2.5 rounded-full" />
                  <h4 className="font-semibold text-sm text-primary">Admin Billing & Settings Recovery</h4>
                  <span className="text-[10px] text-muted font-mono">June 26, 2026</span>
                  <p className="text-xs text-muted mt-1">
                    Corrected Stripe checkout link routing by passing the user's ID as <code>client_reference_id</code>. Restored settings retention bugs for custom providers and LTX-Video APIs.
                  </p>
                </div>
              </div>
            </div>

            {/* Backlog Column */}
            <div className="card p-5 space-y-4">
              <h3 className="text-base font-semibold text-primary flex items-center gap-2">
                <Terminal size={16} className="text-accent" />
                Developer Backlog
              </h3>
              <p className="text-xs text-muted">
                Tasks scheduled for upcoming sprints and currently under discussion.
              </p>
              
              <div className="space-y-3">
                <div className="border border-yellow-500/20 bg-yellow-500/5 rounded p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[10px] text-yellow-500 uppercase tracking-wider">UI & Appearance</span>
                    <span className="text-[9px] text-muted-foreground font-mono">HIGH PRIORITY</span>
                  </div>
                  <h5 className="font-medium text-xs text-primary mt-1">UI Layout & Appearance Design Task</h5>
                  <p className="text-[11px] text-muted mt-1 leading-normal">
                    Improve readability and contrast across low-visibility pages and components. Scheduled to discuss as soon as current skill reviews complete.
                  </p>
                </div>

                <div className="border border-border/80 bg-background/25 rounded p-3 opacity-80">
                  <span className="font-bold text-[10px] text-blue-400 uppercase tracking-wider">Video & Audio</span>
                  <h5 className="font-medium text-xs text-primary mt-1">Timeline Stitching & Audio Mix</h5>
                  <p className="text-[11px] text-muted mt-1 leading-normal">
                    Mix ElevenLabs narration, SFX, and background music tracks into Cinema timeline clips during compilation.
                  </p>
                </div>

                <div className="border border-red-500/20 bg-red-500/5 rounded p-3 opacity-80">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[10px] text-red-400 uppercase tracking-wider">Model Routing</span>
                    <span className="text-[9px] text-muted-foreground font-mono">DEFERRED</span>
                  </div>
                  <h5 className="font-medium text-xs text-primary mt-1">Smart Model Router</h5>
                  <p className="text-[11px] text-muted mt-1 leading-normal">
                    Keyword-based routing across Kling/Wan/LTX. Deferred to future sprints: requires detailed API documentation for all provider configurations (e.g. LTX Fast vs. Pro APIs) and a robust user credential check before execution.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "diagnostics" && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Comfy Status */}
            <div className="card p-5 flex flex-col justify-between">
              <div>
                <h4 className="font-semibold text-sm text-primary">Local ComfyUI Reachability</h4>
                <p className="text-xs text-muted mt-1">
                  Verify if the managed ComfyUI API is reachable on the local machine (port 8188).
                </p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${
                    comfyStatus === "online" ? "bg-green-500 animate-pulse" :
                    comfyStatus === "offline" ? "bg-red-500" : "bg-muted"
                  }`} />
                  <span className="text-xs capitalize font-medium text-text">{comfyStatus}</span>
                </div>
                <button
                  onClick={checkDiagnostics}
                  disabled={checking}
                  className="btn btn-outline text-xs flex items-center gap-1.5"
                >
                  <RefreshCw size={13} className={checking ? "animate-spin" : ""} />
                  Test Connection
                </button>
              </div>
            </div>

            {/* Session Info */}
            <div className="card p-5">
              <h4 className="font-semibold text-sm text-primary">Active Session Privileges</h4>
              <div className="space-y-2 mt-3 text-xs text-muted">
                <div className="flex justify-between border-b border-border/40 pb-1">
                  <span>Assigned plan:</span>
                  <span className="font-mono text-text capitalize">{plan || "Free"}</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-1">
                  <span>Session groups:</span>
                  <span className="font-mono text-text">{JSON.stringify(groups)}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span>Gated access:</span>
                  <span className="font-mono text-green-400 flex items-center gap-1">
                    <ShieldCheck size={14} /> Dev Mode Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
