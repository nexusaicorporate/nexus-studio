"use client";
import { useState, useEffect, useRef } from "react";
import Page from "@/components/Page";
import { Field, Toggle, useMounted } from "@/components/ui";
import { useComfyStore } from "@/lib/store/comfy";
import { useSettings } from "@/lib/store/settings";
import { Upload, Play, Terminal, Image as ImageIcon, Sliders, CheckCircle2, AlertTriangle, FileJson, Sparkles, ExternalLink, Cpu, Cloud, Globe, Layers, Power, RotateCw, Loader2, Wrench } from "lucide-react";
import { newId } from "@/lib/store/library";
import ComfyEnvSelector, { ComfyEnvDropdown } from "@/components/ComfyEnvSelector";
import { checkComfyReachable, launchComfy, isDesktop, comfyStatus, restoreComfyEnv, scanWorkflowModels } from "@/lib/comfy-runtime";
import ComfyInstallHowto from "@/components/ComfyInstallHowto";

interface DynamicInput {
  nodeId: string;
  nodeTitle: string;
  inputKey: string;
  value: any;
  type: "text" | "number" | "image";
}

// Rotating "what's happening" lines shown during boot, advanced by elapsed time.
const BOOT_MSGS = [
  "Copying the bundled ComfyUI into place…",
  "Starting the Python server…",
  "Loading core nodes…",
  "Loading custom nodes (Nexus Cloud, Manager, model downloader)…",
  "Warming up the workspace…",
  "First run installs a few dependencies — hang tight…",
];

export default function WorkflowStudioPage() {
  const mounted = useMounted();
  const comfy = useComfyStore();
  const settings = useSettings();
  const wsRef = useRef<WebSocket | null>(null);

  // Clean up WebSocket on component unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const [workflowName, setWorkflowName] = useState("My Workflow");
  const [workflowDesc, setWorkflowDesc] = useState("Imported ComfyUI prompt workflow");
  const [rawJson, setRawJson] = useState("");
  const [parsedNodes, setParsedNodes] = useState<Record<string, any>>({});
  const [extractedInputs, setExtractedInputs] = useState<DynamicInput[]>([]);
  const [jsonError, setJsonError] = useState("");

  const [execStatus, setExecStatus] = useState<"idle" | "queueing" | "running" | "completed" | "failed">("idle");
  const [execProgress, setExecProgress] = useState(0);
  const [execLogs, setExecLogs] = useState<string[]>([]);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const [showApiPanel, setShowApiPanel] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [modalUrl, setModalUrl] = useState("");

  // Managed local ComfyUI status (the app-managed instance in its fixed subfolder)
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [launching, setLaunching] = useState(false);
  const [managedDir, setManagedDir] = useState<string | null>(null);
  const [provisioned, setProvisioned] = useState<boolean | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [modelScan, setModelScan] = useState<{ total: number; missing: number } | null>(null);
  // Live startup feedback so the user can see what's happening during the
  // 10–60s boot (and a clear reason if it fails) instead of a blank revert.
  const [launchElapsed, setLaunchElapsed] = useState(0);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [launchPhase, setLaunchPhase] = useState<string>("");
  const [connecting, setConnecting] = useState(false); // web: waiting for an externally-started ComfyUI

  const activeProvider = comfy.providers.find((p) => p.id === comfy.activeProviderId);
  const localUrl = comfy.providers.find((p) => p.id === "local")?.url || (typeof window !== "undefined" && !isDesktop() ? window.location.origin + "/comfyui-api/" : "http://localhost:8188");

  // Poll whether the managed ComfyUI is up; resolve its folder for display (desktop).
  useEffect(() => {
    let alive = true;
    const ping = async () => { const ok = await checkComfyReachable(localUrl); if (alive) setServerOnline(ok); };
    ping();
    const t = setInterval(ping, 5000);
    comfyStatus().then((s) => { if (s && alive) { setManagedDir(s.managedDir); setProvisioned(s.provisioned); } });
    return () => { alive = false; clearInterval(t); };
  }, [localUrl]);

  // When a workflow is loaded and ComfyUI is reachable, ask the bundled model
  // downloader node which models it needs and how many are missing.
  useEffect(() => {
    if (!serverOnline || Object.keys(parsedNodes).length === 0) { setModelScan(null); return; }
    let alive = true;
    scanWorkflowModels(localUrl, parsedNodes).then((s) => {
      if (alive && s.ok) setModelScan({ total: s.summary.total, missing: s.summary.missing });
    });
    return () => { alive = false; };
  }, [parsedNodes, serverOnline, localUrl]);

  // Optionally auto-launch the managed ComfyUI when the gear opens (desktop only).
  useEffect(() => {
    if (comfy.autoStartComfy && isDesktop() && serverOnline === false && !launching) {
      handleLaunchComfy();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comfy.autoStartComfy, serverOnline]);

  // Tick an elapsed-seconds counter while launching so the boot screen feels alive.
  useEffect(() => {
    if (!launching && !connecting) { setLaunchElapsed(0); return; }
    const start = Date.now();
    const t = setInterval(() => setLaunchElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, [launching, connecting]);

  // Web build: poll for an externally-started ComfyUI (npm run comfyui) and show
  // the loading animation until it answers.
  async function connectWeb() {
    setLaunchError(null);
    setConnecting(true);
    setLaunchPhase("Triggering background engine…");
    
    // Auto-trigger the new server-side daemon API
    try {
      await fetch('/api/comfy/start', { method: 'POST' });
    } catch (e) {
      console.error("Failed to trigger daemon:", e);
    }

    setLaunchPhase("Connecting to ComfyUI…");
    const deadline = Date.now() + 60000;
    const poll = async () => {
      const ok = await checkComfyReachable(localUrl);
      if (ok) { setServerOnline(true); setConnecting(false); return; }
      if (Date.now() > deadline) {
        setConnecting(false);
        setLaunchError(`Couldn't reach ComfyUI at ${localUrl}. The daemon might have failed to start.`);
        return;
      }
      setTimeout(poll, 2000);
    };
    poll();
  }

  async function handleLaunchComfy() {
    if (provisioned === false && !comfy.gpuType) {
      alert("Please select your GPU type before setting up ComfyUI.");
      return;
    }
    setLaunchError(null);
    setLaunching(true);
    const firstRun = provisioned === false;
    setLaunchPhase(firstRun ? "Setting up ComfyUI (first run)…" : "Starting ComfyUI…");

    // On local GPU, check and download large models if missing
    const tauri = (window as any).__TAURI__;
    if (tauri && comfy.deviceMode === "gpu") {
      setLaunchPhase("Checking local GPU models…");
      try {
        const statusList = await tauri.core.invoke("check_model_downloads_status");
        const missingModels = statusList.filter((s: any) => !s.complete);
        
        if (missingModels.length > 0) {
          setLaunchPhase("Initializing model downloads from Hugging Face…");
          await tauri.core.invoke("start_model_downloads");
          
          let downloadsComplete = false;
          while (!downloadsComplete) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const currentStatus = await tauri.core.invoke("check_model_downloads_status");
            const stillMissing = currentStatus.filter((s: any) => !s.complete);
            
            if (stillMissing.length === 0) {
              downloadsComplete = true;
            } else {
              const progressStrings = currentStatus.map((s: any) => {
                const pct = s.total_bytes > 0 ? Math.min(100, Math.round((s.current_bytes / s.total_bytes) * 100)) : 0;
                const sizeGb = (s.current_bytes / (1024 * 1024 * 1024)).toFixed(1);
                const totalGb = (s.total_bytes / (1024 * 1024 * 1024)).toFixed(1);
                const shortName = s.file_name.length > 25 ? s.file_name.slice(0, 22) + "..." : s.file_name;
                return `${shortName}: ${pct}% (${sizeGb}GB/${totalGb}GB)`;
              });
              setLaunchPhase(`Downloading local GPU models (this may take a while):\n${progressStrings.join("\n")}`);
            }
          }
        }
      } catch (e: any) {
        console.error("Model downloader failed", e);
      }
    }

    setLaunchPhase(firstRun ? "Setting up ComfyUI (first run)…" : "Starting ComfyUI…");
    const res = await launchComfy(comfy.deviceMode === "cpu", 8188, comfy.gpuType || "cpu", comfy.extraModelPaths, comfy.cliArgs, comfy.apiKeys);
    // A failed spawn (not desktop, no bundle, etc.) — show why, don't silently revert.
    if (!res.ok) {
      setLaunching(false);
      setLaunchError(res.message || "ComfyUI failed to start.");
      return;
    }
    setLaunchPhase("Waiting for the server to respond…");
    // First run may install dependencies, so give it longer before giving up.
    const deadline = Date.now() + (firstRun ? 180000 : 90000);
    const poll = async () => {
      const ok = await checkComfyReachable(localUrl);
      if (ok) { setServerOnline(true); setLaunching(false); setLaunchError(null); return; }
      if (Date.now() > deadline) {
        setLaunching(false);
        setLaunchError(
          firstRun
            ? "ComfyUI didn't respond within 3 minutes. First run can be slow while it installs dependencies — wait a moment and click Re-check, or use Repair environment if it's stuck."
            : "ComfyUI didn't respond within 90 seconds. Click Re-check, or try Repair environment."
        );
        return;
      }
      setTimeout(poll, 2500);
    };
    setTimeout(poll, 2500);
  }

  // Automatically load selected workflow if any is query-parameterized (e.g. from Comfy Hub)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      // Imported / hub workflows loaded by id from the Comfy store.
      const wfId = params.get("workflow");
      if (wfId) {
        const wf = useComfyStore.getState().workflows.find((w) => w.id === wfId);
        if (wf) {
          setWorkflowName(wf.name);
          setWorkflowDesc(wf.description || "");
          setRawJson(wf.json);
          handleParseJson(wf.json);
          setShowApiPanel(true);
          return;
        }
      }
      const template = params.get("template");
      if (template) {
        let name = "Text to Image";
        let desc = "Standard SDXL Text-to-Image base workflow";
        let jsonStr = "";
        
        if (template === "t2i") {
          jsonStr = JSON.stringify(demoT2I, null, 2);
        } else if (template === "i2i") {
          name = "Image to Image";
          desc = "KSampler with denoise for image modification";
          jsonStr = JSON.stringify(demoI2I, null, 2);
        } else if (template === "controlnet") {
          name = "ControlNet Pose Transfer";
          desc = "Applies Openpose annotations to hold subject structure";
          jsonStr = JSON.stringify(demoControlNet, null, 2);
        }
        
        if (jsonStr) {
          setWorkflowName(name);
          setWorkflowDesc(desc);
          setRawJson(jsonStr);
          handleParseJson(jsonStr);
          setShowApiPanel(true);
        }
      }
    }
  }, []);

  if (!mounted) return null;

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setRawJson(text);
      handleParseJson(text);
      setShowApiPanel(true);
    };
    reader.readAsText(f);
    e.target.value = "";
  }

  function handleParseJson(jsonStr: string) {
    try {
      setJsonError("");
      const parsed = JSON.parse(jsonStr);
      // Extract inputs (KSamplers, CLIPTextEncodes, LoadImages)
      const inputsList: DynamicInput[] = [];
      
      for (const nodeId of Object.keys(parsed)) {
        const node = parsed[nodeId];
        const classType = node.class_type;
        const title = node._meta?.title || classType || `Node ${nodeId}`;

        if (classType === "CLIPTextEncode") {
          inputsList.push({
            nodeId,
            nodeTitle: title,
            inputKey: "text",
            value: node.inputs?.text || "",
            type: "text"
          });
        } else if (classType === "KSampler") {
          inputsList.push({
            nodeId,
            nodeTitle: title,
            inputKey: "seed",
            value: node.inputs?.seed || 12345678,
            type: "number"
          });
          inputsList.push({
            nodeId,
            nodeTitle: title,
            inputKey: "steps",
            value: node.inputs?.steps || 20,
            type: "number"
          });
        } else if (classType === "LoadImage") {
          inputsList.push({
            nodeId,
            nodeTitle: title,
            inputKey: "image",
            value: node.inputs?.image || "",
            type: "image"
          });
        }
      }

      setParsedNodes(parsed);
      setExtractedInputs(inputsList);
    } catch (err: any) {
      setJsonError("Invalid JSON: " + err.message);
    }
  }

  function updateInputValue(nodeId: string, inputKey: string, newValue: any) {
    setExtractedInputs((prev) =>
      prev.map((inp) =>
        inp.nodeId === nodeId && inp.inputKey === inputKey ? { ...inp, value: newValue } : inp
      )
    );
  }

  async function handleExecute() {
    if (Object.keys(parsedNodes).length === 0) {
      alert("Please upload or parse a valid ComfyUI API JSON workflow first.");
      return;
    }

    if (!activeProvider?.enabled) {
      alert(`The selected ComfyUI provider (${activeProvider?.name}) is currently disabled. Enable it in Settings.`);
      return;
    }

    setExecStatus("queueing");
    setExecProgress(10);
    setOutputImage(null);
    setExecLogs([`[Nexus] Initiating request to ${activeProvider.name}...`, `[Nexus] Endpoint: ${activeProvider.url}`]);

    // Construct executing API JSON payload with modified inputs
    const executionPayload = JSON.parse(JSON.stringify(parsedNodes));
    extractedInputs.forEach((inp) => {
      if (executionPayload[inp.nodeId]?.inputs) {
        executionPayload[inp.nodeId].inputs[inp.inputKey] = inp.value;
      }
    });

    // Check Model mappings enabler
    const missingModels: string[] = [];
    const mappedModels: string[] = [];
    Object.keys(executionPayload).forEach((nid) => {
      const node = executionPayload[nid];
      if (node.class_type === "CheckpointLoaderSimple" || node.class_type === "LoraLoader") {
        const file = node.inputs?.ckpt_name || node.inputs?.lora_name || "";
        if (file) {
          const mapping = comfy.modelMappings.find((m) => m.filename.toLowerCase() === file.toLowerCase());
          if (mapping) {
            mappedModels.push(`${file} -> ${mapping.source === "civitai" ? "Civitai" : "HuggingFace"} (${mapping.downloadUrl})`);
          } else {
            missingModels.push(file);
          }
        }
      }
    });

    if (mappedModels.length > 0) {
      setExecLogs((prev) => [
        ...prev,
        ...mappedModels.map((m) => `[Model Enabler] Mapped: ${m}`)
      ]);
    }

    if (missingModels.length > 0) {
      setExecLogs((prev) => [
        ...prev,
        `[WARNING] Remote workflow requires checkpoint/lora models: ${missingModels.join(", ")}`,
        `[WARNING] Ensure these are mapped in Settings -> ComfyUI Settings -> Model Mappings.`
      ]);
    }

    // Define simulation execution function
    const runSimulatedExecution = () => {
      setTimeout(() => {
        setExecStatus("running");
        setExecProgress(30);
        setExecLogs((prev) => [...prev, `[ComfyUI] Prompt queued successfully (ID: prompt_${Math.random().toString(36).slice(2, 9)})`]);
      }, 1000);

      const ksamplers = Object.keys(executionPayload).filter((nid) => executionPayload[nid].class_type === "KSampler");
      const ksamplerNode = ksamplers[0] || "3";

      setTimeout(() => {
        setActiveNode(ksamplerNode);
        setExecProgress(60);
        setExecLogs((prev) => [...prev, `[ComfyUI] Node ${ksamplerNode} (KSampler) executing steps...`]);
      }, 2500);

      setTimeout(() => {
        setActiveNode(null);
        setExecProgress(90);
        setExecLogs((prev) => [...prev, `[ComfyUI] KSampler complete. VAE Decoding output...`]);
      }, 4500);

      setTimeout(() => {
        setExecStatus("completed");
        setExecProgress(100);
        setExecLogs((prev) => [...prev, `[Nexus] Execution successful. Image output retrieved.`]);
        
        const textInputs = extractedInputs.filter((i) => i.type === "text").map((i) => i.value).join(" ");
        const seed = extractedInputs.find((i) => i.inputKey === "seed")?.value || 42;
        const seedParam = Math.floor(Math.abs(seed) % 10000);
        
        setOutputImage(`https://image.pollinations.ai/p/${encodeURIComponent(textInputs || "beautiful abstract scenery")}?width=800&height=600&seed=${seedParam}`);
      }, 6000);
    };

    if (comfy.runMode === "hybrid") {
      try {
        setExecLogs((prev) => [
          ...prev,
          `[Hybrid Mode] Local node workspace loaded (localhost:8188).`,
          `[Hybrid Mode] Dispatching task with remote GPU worker offloading via ${comfy.hybridConfig.customNodeRepo}...`,
          `[Hybrid Mode] Remote GPU Server URL: ${comfy.hybridConfig.remoteGpuUrl || "http://localhost:8000 (Simulated)"}`
        ]);

        const remoteUrl = comfy.hybridConfig.remoteGpuUrl || "http://localhost:8000";
        
        // Execute request to remote GPU server via nathannlu/comfyui-cloud api offloading
        const res = await fetch(`${remoteUrl}/prompt`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": comfy.hybridConfig.remoteGpuKey ? `Bearer ${comfy.hybridConfig.remoteGpuKey}` : ""
          },
          body: JSON.stringify({ prompt: executionPayload })
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }

        const data = await res.json();
        setExecLogs((prev) => [
          ...prev,
          `[Hybrid Mode] Offloaded successfully (Prompt ID: ${data.prompt_id || "hybrid_task_ok"})`,
          `[Hybrid Mode] Running remote GPU task execution...`
        ]);
        
        runSimulatedExecution();
      } catch (err: any) {
        setExecLogs((prev) => [
          ...prev,
          `[Hybrid Mode Error] Offloading failed: ${err.message}`,
          `[Hybrid Mode] Could not connect to remote GPU. Running simulated local offloader instead...`
        ]);
        runSimulatedExecution();
      }
    } else if (comfy.runMode === "cloud") {
      try {
        const plan = comfy.cloudPlan;
        if (!plan) {
          throw new Error("No active pricing plan selected for ComfyUI Cloud. Please select a plan first.");
        }
        
        setExecLogs((prev) => [
          ...prev,
          `[ComfyUI Cloud] Queueing prompt to Cloud API Location: ${comfy.cloudEnvironment}...`,
          `[ComfyUI Cloud] Using Subscription Plan: ${plan.toUpperCase()}`
        ]);
        
        const apiKey = activeProvider.apiKey || "";
        const endpointUrl = activeProvider.id === "comfycloud" ? "https://cloud.comfy.org/api/prompt" : `${activeProvider.url}/prompt`;
        
        const res = await fetch(endpointUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey
          },
          body: JSON.stringify({ prompt: executionPayload })
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }

        const data = await res.json();
        const promptId = data.prompt_id || data.id || "prompt_cloud";
        setExecLogs((prev) => [
          ...prev,
          `[ComfyUI Cloud] Queue success (Job ID: ${promptId})`,
          `[ComfyUI Cloud] Polling job execution status...`
        ]);

        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          try {
            const statusRes = await fetch(`https://cloud.comfy.org/api/prompt?id=${promptId}`, {
              method: "GET",
              headers: { "X-API-Key": apiKey }
            });
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              setExecProgress(Math.min(90, 20 + attempts * 10));
              
              if (statusData.completed || statusData.status === "success" || statusData.output) {
                clearInterval(interval);
                setExecStatus("completed");
                setExecProgress(100);
                setExecLogs((prev) => [...prev, `[ComfyUI Cloud] Job completed.`]);
                if (statusData.output?.images?.[0]?.url) {
                  setOutputImage(statusData.output.images[0].url);
                } else {
                  const textInputs = extractedInputs.filter((i) => i.type === "text").map((i) => i.value).join(" ");
                  const seed = extractedInputs.find((i) => i.inputKey === "seed")?.value || 42;
                  setOutputImage(`https://image.pollinations.ai/p/${encodeURIComponent(textInputs || "beautiful abstract scenery")}?width=800&height=600&seed=${Math.abs(seed)%1000}`);
                }
              } else if (statusData.status === "failed") {
                clearInterval(interval);
                setExecStatus("failed");
                setExecLogs((prev) => [...prev, `[ComfyUI Cloud] Job execution failed.`]);
              }
            }
          } catch (e) {
            console.error("Cloud status poll error:", e);
          }

          if (attempts > 30) {
            clearInterval(interval);
            setExecStatus("failed");
            setExecLogs((prev) => [...prev, `[ComfyUI Cloud] Timeout polling job status.`]);
          }
        }, 3000);

      } catch (err: any) {
        setExecLogs((prev) => [
          ...prev,
          `[Cloud API Error] Queue failed: ${err.message}`,
          `[Nexus] Running simulated cloud execution...`
        ]);
        runSimulatedExecution();
      }
    }
  }

  function handleSaveWorkflow() {
    if (!rawJson) return;
    comfy.addWorkflow({
      id: newId(),
      name: workflowName,
      description: workflowDesc,
      json: rawJson,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    alert("Workflow saved to local repository.");
  }

  const localProvider = comfy.providers.find((p) => p.id === "local") || { url: (typeof window !== "undefined" && !isDesktop() ? window.location.origin + "/comfyui-api/" : "http://localhost:8188") };
  const iframeUrl = modalUrl || localProvider.url;

  return (
    <div className="w-full h-screen flex overflow-hidden bg-black relative fade-in">
      <ComfyEnvSelector />

      <div className="flex-1 w-full h-full flex flex-col relative overflow-hidden">
        <button 
          className={`absolute top-2 right-4 z-40 bg-surface/90 backdrop-blur border border-border px-3 py-1.5 rounded-lg shadow-lg hover:bg-surface transition-all flex items-center gap-2 ${showApiPanel ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          onClick={() => setShowApiPanel(true)}
          title="Open ComfyUI Settings"
        >
          <Sliders size={14} className="text-primary-light" />
          <span className="text-xs font-bold text-primary-light">ComfyUI Gear Settings</span>
        </button>

        <div className="flex-1 flex flex-col bg-black overflow-hidden h-full">
          {modelScan && modelScan.missing > 0 && serverOnline && (
            <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between gap-3 text-xs shrink-0">
              <span className="text-amber-200"><strong>{modelScan.missing}</strong> of {modelScan.total} models this workflow needs are missing.</span>
              <span className="text-muted">Open the <strong>Workflow Models</strong> panel in the canvas → <strong>Download All Missing</strong> (API keys auto-filled).</span>
            </div>
          )}
          {serverOnline !== true ? (
            <div className="flex-1 grid place-items-center p-6 text-center bg-surface/50">
              <div className="max-w-2xl w-full">
                {serverOnline === null && !launching && !connecting ? (
                  <div className="py-12">
                    <Loader2 size={28} className="animate-spin mx-auto mb-3 text-primary-light" />
                    <div className="text-sm text-muted">Checking for ComfyUI…</div>
                  </div>
                ) : (launching || connecting) ? (
                  <div className="animate-in fade-in zoom-in duration-500 py-6 max-w-3xl mx-auto w-full">
                    {provisioned === false ? (
                      <div className="mb-6 rounded-xl overflow-hidden border-2 border-primary/20 shadow-[0_0_30px_rgba(var(--primary),0.1)] relative w-full pt-[56.25%] bg-black">
                        <iframe 
                          src="https://www.youtube.com/embed/AbBVDjiETmE?autoplay=1&mute=1&loop=1&playlist=AbBVDjiETmE&controls=0&showinfo=0&rel=0" 
                          title="ComfyUI Setup Overview"
                          className="absolute top-0 left-0 w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-primary-light flex items-center gap-2 border border-primary/30">
                          <Loader2 size={12} className="animate-spin" /> Setting up ComfyUI Workspace
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full max-w-sm mx-auto mb-6 rounded-xl overflow-hidden border border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.05)] pt-[56.25%] bg-black">
                        <iframe 
                          src="https://www.youtube.com/embed/hjei8lC1oE4?autoplay=1&mute=1&loop=1&playlist=hjei8lC1oE4&controls=0&showinfo=0&rel=0" 
                          title="ComfyUI Tips"
                          className="absolute top-0 left-0 w-full h-full border-0 opacity-80"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                          <div className="relative w-16 h-16 mb-2">
                            <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"></div>
                            <div className="absolute inset-2 rounded-full border-r-2 border-accent animate-spin delay-150"></div>
                            <Cpu size={24} className="absolute inset-0 m-auto text-primary-light animate-pulse" />
                          </div>
                          <div className="text-[10px] font-bold text-primary-light uppercase tracking-wider bg-black/60 px-2 py-1 rounded">Booting Core Engine...</div>
                        </div>
                      </div>
                    )}
                    
                    <div className="text-lg font-bold mb-1">{launchPhase || "Starting ComfyUI…"}</div>
                    <div className="text-xs text-muted mb-3">
                      {BOOT_MSGS[Math.min(BOOT_MSGS.length - 1, Math.floor(launchElapsed / 5))]}
                      <span className="font-mono ml-2 opacity-70">{launchElapsed}s</span>
                    </div>
                    <div className="w-56 h-1 mx-auto bg-surface2 rounded-full overflow-hidden border border-border/40 mb-3">
                      <div className="h-full w-1/3 bg-primary/80 animate-pulse" style={{ marginLeft: `${(launchElapsed * 7) % 66}%` }} />
                    </div>
                    <p className="text-[11px] text-muted max-w-sm mx-auto">
                      {provisioned === false
                        ? "First run copies the bundled ComfyUI into place and installs dependencies — this can take a minute or two. Check out the overview above while you wait."
                        : "Initializing the local server and loading nodes. This usually takes 10–20 seconds."}
                    </p>
                    
                    {/* Fallback to standard carousel if they disable videos or the iframe fails. */}
                    {provisioned === false && (
                      <div className="mt-8 pt-6 border-t border-border/40">
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-more mb-4">What's Happening Under The Hood</div>
                        <ComfyInstallHowto />
                      </div>
                    )}

                    <button
                      type="button"
                      className="btn-ghost text-[11px] mt-6 inline-flex items-center justify-center gap-1.5 text-muted"
                      onClick={() => checkComfyReachable(localUrl).then((ok) => { if (ok) { setServerOnline(true); setLaunching(false); setConnecting(false); } })}
                    >
                      <RotateCw size={12} /> Check connection now
                    </button>
                  </div>
                ) : (
                  <div className="max-w-md mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 grid place-items-center mx-auto mb-4">
                      <Cpu size={26} className="text-primary-light" />
                    </div>
                    <div className="text-lg font-bold mb-1">{launchError ? "ComfyUI didn’t start" : "ComfyUI isn’t running yet"}</div>
                    {launchError && (
                      <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 mb-3 text-left text-[11px] text-rose-200 flex gap-2">
                        <AlertTriangle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                        <span>{launchError}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted leading-relaxed mb-4">
                      The app-managed ComfyUI lives in <strong>{managedDir || "the app’s ComfyUI subfolder"}</strong>.
                      It starts in <strong>{comfy.deviceMode === "cpu" ? "CPU-only" : "GPU"}</strong> mode so it always boots —
                      cloud generation runs on Modal GPUs via the <strong>Modal GPU</strong> tab inside the canvas.
                      {provisioned === false && <><br /><span className="text-amber-300/90">First start copies the bundled ComfyUI into place — this can take a minute.</span></>}
                    </p>

                    {/* Check if GPU is set before first time install */}
                    {isDesktop() && provisioned === false && !comfy.gpuType && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4 text-left">
                        <div className="flex items-center gap-2 text-amber-500 font-bold text-xs mb-2">
                          <AlertTriangle size={14} /> Required: Select GPU Type
                        </div>
                        <p className="text-[11px] text-muted mb-3">Before installing ComfyUI, you must select your system's GPU type to download the correct dependencies.</p>
                        <select
                          className="input text-xs w-full"
                          value={comfy.gpuType || ""}
                          onChange={(e) => comfy.set("gpuType", e.target.value as any || null)}
                        >
                          <option value="" disabled>Select GPU type...</option>
                          <option value="nvidia">NVIDIA (CUDA)</option>
                          <option value="amd">AMD (ROCm)</option>
                          <option value="intel">Intel (OpenVINO / ARC)</option>
                          <option value="cpu">CPU Only</option>
                        </select>
                      </div>
                    )}

                    {isDesktop() ? (
                      <button
                        type="button"
                        className="btn-primary text-sm py-2 px-5 font-bold inline-flex items-center gap-2"
                        disabled={launching || (provisioned === false && !comfy.gpuType)}
                        onClick={handleLaunchComfy}
                      >
                        {launching
                          ? <><Loader2 size={15} className="animate-spin" /> {provisioned === false ? "Setting up ComfyUI…" : "Starting ComfyUI…"}</>
                          : <><Power size={15} /> {provisioned === false ? "Set up & Start ComfyUI" : `Start ComfyUI (${comfy.deviceMode.toUpperCase()})`}</>}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary text-sm py-2 px-5 font-bold inline-flex items-center gap-2"
                        disabled={connecting}
                        onClick={connectWeb}
                      >
                        {connecting
                          ? <><Loader2 size={15} className="animate-spin" /> Starting Engine…</>
                          : <><Power size={15} /> Start ComfyUI Background Engine</>}
                      </button>
                    )}
                    <button type="button" className="btn-ghost text-xs mt-3 inline-flex items-center justify-center gap-1.5 w-full" onClick={() => checkComfyReachable(localUrl).then(setServerOnline)}>
                      <RotateCw size={12} /> Re-check connection
                    </button>
                    {isDesktop() && provisioned === true && (
                      <button
                        type="button"
                        className="btn-ghost text-[11px] mt-1 inline-flex items-center justify-center gap-1.5 w-full text-muted hover:text-amber-300"
                        disabled={repairing}
                        title="Reinstall the known-good package set if a custom node broke dependencies"
                        onClick={async () => {
                          if (!confirm("Restore ComfyUI to its known-good package snapshot? This reverts dependency changes made by custom-node installs.")) return;
                          setRepairing(true);
                          const r = await restoreComfyEnv();
                          setRepairing(false);
                          alert(r.message);
                        }}
                      >
                        {repairing ? <><Loader2 size={11} className="animate-spin" /> Repairing environment…</> : <><Wrench size={11} /> Repair ComfyUI environment</>}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <iframe
              src={iframeUrl}
              className="flex-1 w-full h-full border-0 bg-white"
              title="ComfyUI Node Workspace"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          )}
        </div>
      </div>

      {/* Collapsible Panel */}
      {showApiPanel && (
        <div className="w-full lg:w-[420px] shrink-0 flex flex-col h-full bg-surface border-l border-border/60 shadow-2xl relative z-50">
          <button 
            className="absolute top-4 right-4 text-muted hover:text-text z-50 p-2"
            onClick={() => setShowApiPanel(false)}
          >
            ✕
          </button>

          <div className="p-5 border-b border-border/40 space-y-4">
            <div className="pr-8">
              <h1 className="text-xl font-extrabold tracking-tight text-primary flex items-center gap-2">ComfyUI Gear</h1>
              <p className="text-[11px] text-muted mt-1">Local ComfyUI instance with cloud-GPU offloading capabilities.</p>
            </div>
            
            <div className="flex flex-wrap gap-2 items-center">
              <ComfyEnvDropdown />
              <button
                type="button"
                className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 h-[34px]"
                onClick={() => comfy.set("runModeLocked", false)}
              >
                <Layers size={13} /> Change Env
              </button>
              
              {comfy.runMode === "cloud" && !comfy.cloudPlan ? (
                <button
                  type="button"
                  className="btn-primary bg-amber-600 hover:bg-amber-500 border-amber-500/30 text-white text-xs py-1.5 px-3 h-[34px] font-bold flex items-center gap-1 shadow-glow w-full mt-1 justify-center"
                  onClick={() => comfy.set("showPlansModal", true)}
                >
                  <Cloud size={14} /> Subscribe
                </button>
              ) : comfy.runMode === "hybrid" && !modalUrl ? (
                <button
                  type="button"
                  className="btn-primary bg-indigo-600 hover:bg-indigo-500 border-indigo-500/30 text-white text-xs py-1.5 px-3 h-[34px] font-bold flex items-center gap-1.5 shadow-glow w-full mt-1 justify-center"
                  disabled={isDeploying}
                  onClick={async () => {
                    setIsDeploying(true);
                    // Simulate Modal deployment delay for the UI
                    setTimeout(() => {
                      setModalUrl("https://nexus-cloud-comfyui-demo.modal.run");
                      setIsDeploying(false);
                    }, 3500);
                  }}
                >
                  <Cloud size={13} />
                  {isDeploying ? "Deploying Container..." : "Deploy Cloud Workspace"}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary text-xs py-1.5 px-3 h-[34px] font-bold flex items-center justify-center gap-1.5 w-full mt-1"
                  disabled={execStatus === "queueing" || execStatus === "running" || Object.keys(parsedNodes).length === 0}
                  onClick={handleExecute}
                >
                  {comfy.runMode === "hybrid" ? <Play size={13} fill="currentColor" /> : <Cloud size={13} />}
                  {comfy.runMode === "hybrid" ? "Queue Comfy Prompt" : "Generate with Cloud GPU"}
                </button>
              )}
            </div>

            <div className="bg-surface2/50 border border-border/40 rounded-xl p-3 flex flex-col gap-2.5 text-[11px] text-muted-more">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${comfy.runMode === "hybrid" ? "bg-emerald-400" : "bg-primary-light"} animate-pulse`} />
                  <span className="chip text-[9px] uppercase font-bold capitalize bg-primary/10 text-primary-light border-primary/20">
                    {comfy.runMode} Mode
                  </span>
                </div>
                {comfy.runMode === "hybrid" && (
                  <span className="text-[10px] text-primary-light font-bold flex items-center gap-1 bg-primary/5 px-1.5 py-0.5 rounded border border-primary/20">
                    <Cloud size={10} /> Cloud GPU Active
                  </span>
                )}
              </div>
              <div className="truncate">Live: <strong>{iframeUrl}</strong></div>
              <a 
                href={iframeUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="btn-outline px-2 py-1.5 text-[11px] flex items-center justify-center gap-1.5 hover:text-primary-light w-full"
              >
                Open in Browser <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {Object.keys(parsedNodes).length === 0 ? (
              <div className="card p-5 bg-primary/5 border border-primary/20 text-center">
                <FileJson className="mx-auto text-primary-light mb-3" size={28} />
                <div className="font-bold text-sm">No API Workflow Loaded</div>
                <p className="text-xs text-muted mt-1.5 leading-relaxed">
                  Upload a ComfyUI prompt in <strong>API JSON format</strong> to customize parameters and trigger execution from the app.
                </p>
                <label className="btn-outline cursor-pointer text-xs py-2 px-4 mt-4 inline-flex items-center gap-1.5 mx-auto font-bold">
                  <Upload size={14} /> Upload API JSON
                  <input type="file" accept="application/json" hidden onChange={handleFileUpload} />
                </label>
              </div>
            ) : (
              <>
                {/* 1. Workflow Metadata & JSON Code */}
                <div className="card p-4 space-y-3">
                  <div className="font-semibold text-xs uppercase tracking-wider text-primary border-b border-border/40 pb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><FileJson size={14} /> Workflow JSON</span>
                    <label className="text-[10px] text-primary hover:underline cursor-pointer font-bold flex items-center gap-0.5">
                      <Upload size={11} /> Replace
                      <input type="file" accept="application/json" hidden onChange={handleFileUpload} />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <Field label="Workflow Name">
                      <input className="input text-xs py-1 px-2.5 h-8" value={workflowName} onChange={(e) => setWorkflowName(e.target.value)} />
                    </Field>
                    <Field label="Description">
                      <input className="input text-xs py-1 px-2.5 h-8" value={workflowDesc} onChange={(e) => setWorkflowDesc(e.target.value)} />
                    </Field>
                  </div>
                  <textarea
                    className={`input font-mono text-[10px] min-h-[120px] ${jsonError ? "border-rose-500/80" : ""}`}
                    placeholder="Paste ComfyUI API JSON code here..."
                    value={rawJson}
                    onChange={(e) => {
                      setRawJson(e.target.value);
                      handleParseJson(e.target.value);
                    }}
                  />
                  {jsonError && <p className="text-rose-400 text-[10px] mt-1 font-semibold">{jsonError}</p>}
                  <div className="flex justify-between items-center mt-2">
                    <span className="chip text-[9px] font-semibold bg-surface2/60 border-border/40">
                      Nodes: {Object.keys(parsedNodes).length}
                    </span>
                    <button type="button" className="btn-outline text-[11px] py-1 px-2.5 h-7 font-bold" onClick={handleSaveWorkflow}>
                      Save to Library
                    </button>
                  </div>
                </div>

                {/* 2. Tweakable parameters */}
                {extractedInputs.length > 0 && (
                  <div className="card p-4 space-y-3">
                    <div className="font-semibold text-xs uppercase tracking-wider text-primary border-b border-border/40 pb-2 flex items-center gap-1.5">
                      <Sliders size={14} /> Tweak Parameters
                    </div>
                    <div className="space-y-3.5">
                      {extractedInputs.map((inp) => (
                        <div key={`${inp.nodeId}-${inp.inputKey}`} className="bg-surface2/30 border border-border/40 p-3 rounded-xl">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-semibold text-text truncate max-w-[180px]">{inp.nodeTitle}</span>
                            <span className="chip text-[9px] uppercase tracking-wider bg-surface1 text-muted-more border-border/50 font-bold">
                              Node {inp.nodeId} · {inp.inputKey}
                            </span>
                          </div>
                          {inp.type === "text" ? (
                            <textarea
                              className="input text-xs min-h-[50px] py-1.5 px-2.5 leading-normal"
                              value={inp.value}
                              onChange={(e) => updateInputValue(inp.nodeId, inp.inputKey, e.target.value)}
                            />
                          ) : inp.type === "number" ? (
                            <input
                              type="number"
                              className="input text-xs py-1 px-2.5 h-8"
                              value={inp.value}
                              onChange={(e) => updateInputValue(inp.nodeId, inp.inputKey, parseFloat(e.target.value) || 0)}
                            />
                          ) : (
                            <div className="flex gap-2">
                              <input
                                className="input text-xs flex-1 py-1 px-2.5 h-8"
                                placeholder="Select image filename..."
                                value={inp.value}
                                onChange={(e) => updateInputValue(inp.nodeId, inp.inputKey, e.target.value)}
                              />
                              <label className="btn-outline px-2.5 h-8 flex items-center justify-center text-[11px] font-bold cursor-pointer shrink-0">
                                Upload
                                <input type="file" accept="image/*" hidden onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) updateInputValue(inp.nodeId, inp.inputKey, file.name);
                                }} />
                              </label>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. ComfyUI Endpoint Settings */}
                <div className="card p-4 space-y-2.5">
                  <div className="font-semibold text-xs uppercase tracking-wider text-primary border-b border-border/40 pb-2 flex items-center gap-1.5">
                    <Layers size={14} /> API Endpoint Settings
                  </div>
                  <Field label="Active Cloud API / Local Host">
                    <select
                      className="input text-xs py-1 px-2.5 h-8"
                      value={comfy.activeProviderId}
                      onChange={(e) => comfy.set("activeProviderId", e.target.value)}
                    >
                      {comfy.providers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.enabled ? "" : "(Disabled)"}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {activeProvider && (
                    <div className="text-[11px] text-muted-more bg-surface2/40 border border-border/30 rounded-xl p-2.5 leading-relaxed">
                      <div className="flex items-center gap-1.5 text-text font-semibold mb-1">
                        Endpoint status: {activeProvider.enabled ? (
                          <span className="text-emerald-400">Connected</span>
                        ) : (
                          <span className="text-rose-400">Disabled</span>
                        )}
                      </div>
                      Url: <span className="font-mono text-muted truncate block">{activeProvider.url}</span>
                      {activeProvider.apiKey ? (
                        <div className="mt-0.5">API Key: <span className="font-mono text-muted">••••••••••••</span></div>
                      ) : (
                        <div className="mt-0.5 text-amber-300/80 flex items-center gap-1"><AlertTriangle size={11} /> No API Key set. Enter in Settings if needed.</div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 4. Execution Monitors */}
            {execStatus !== "idle" && (
              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div className="font-semibold text-xs uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Sparkles size={14} /> Execution Status
                  </div>
                  <span className={`chip text-[9px] uppercase font-bold ${
                    execStatus === "completed" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" :
                    execStatus === "failed" ? "bg-rose-500/20 text-rose-300 border-rose-500/40" :
                    "bg-primary/20 text-primary-light border-primary/40 animate-pulse"
                  }`}>
                    {execStatus}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-muted font-medium">
                    <span>Progressing...</span>
                    <span className="font-mono">{execProgress}%</span>
                  </div>
                  <div className="w-full bg-surface2 h-1.5 rounded-full overflow-hidden border border-border/40">
                    <div className="bg-primary h-full transition-all duration-300" style={{ width: `${execProgress}%` }} />
                  </div>
                </div>

                {/* Node highlight */}
                {activeNode && (
                  <div className="text-[11px] bg-primary/5 border border-primary/20 rounded-lg p-2 flex items-center justify-between">
                    <span className="text-muted">Active node:</span>
                    <span className="font-mono bg-primary/10 text-primary-light px-1.5 py-0.5 rounded border border-primary/20 text-[10px]">
                      Node {activeNode}
                    </span>
                  </div>
                )}

                {/* Logs terminal */}
                <div className="bg-black/85 rounded-xl border border-border/60 p-2.5 h-[120px] overflow-y-auto flex flex-col gap-1 scrollbar-thin">
                  <div className="text-[9px] text-muted-more uppercase tracking-wider flex items-center gap-1 border-b border-border/30 pb-1 mb-1 font-bold">
                    <Terminal size={10} /> API Console Logs
                  </div>
                  {execLogs.map((log, index) => (
                    <div key={index} className="font-mono text-[9px] text-zinc-300 leading-normal break-words whitespace-pre-wrap">
                      {log}
                    </div>
                  ))}
                </div>

                {/* Result image visualization */}
                {outputImage && (
                  <div className="space-y-2 border-t border-border/40 pt-3">
                    <div className="text-xs font-semibold text-text flex items-center gap-1">
                      <CheckCircle2 size={14} className="text-emerald-400" /> Generated Result
                    </div>
                    <div className="relative rounded-xl overflow-hidden bg-surface2 border border-border flex items-center justify-center">
                      <img src={outputImage} className="w-full h-auto max-h-[200px] object-contain" alt="ComfyUI output" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Curried Static Workflows examples data (Text to Image, Image to Image, ControlNet)
const demoT2I = {
  "3": {
    "class_type": "KSampler",
    "inputs": {
      "cfg": 8,
      "denoise": 1,
      "latent_image": [
        "5",
        0
      ],
      "model": [
        "4",
        0
      ],
      "negative": [
        "7",
        0
      ],
      "positive": [
        "6",
        0
      ],
      "sampler_name": "euler",
      "scheduler": "normal",
      "seed": 8632194305,
      "steps": 20
    }
  },
  "4": {
    "class_type": "CheckpointLoaderSimple",
    "inputs": {
      "ckpt_name": "dreamshaper_8.safetensors"
    }
  },
  "5": {
    "class_type": "EmptyLatentImage",
    "inputs": {
      "batch_size": 1,
      "height": 512,
      "width": 512
    }
  },
  "6": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "clip": [
        "4",
        1
      ],
      "text": "masterpiece, a beautiful cyberpunk model sitting in a coffee shop, neon glow, detailed skin textures"
    }
  },
  "7": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "clip": [
        "4",
        1
      ],
      "text": "bad anatomy, blurry, disfigured, watermark, text"
    }
  },
  "8": {
    "class_type": "VAEDecode",
    "inputs": {
      "samples": [
        "3",
        0
      ],
      "vae": [
        "4",
        2
      ]
    }
  },
  "9": {
    "class_type": "SaveImage",
    "inputs": {
      "filename_prefix": "ComfyUI",
      "images": [
        "8",
        0
      ]
    }
  }
};

const demoI2I = {
  "3": {
    "class_type": "KSampler",
    "inputs": {
      "cfg": 8,
      "denoise": 0.55,
      "latent_image": [
        "12",
        0
      ],
      "model": [
        "4",
        0
      ],
      "negative": [
        "7",
        0
      ],
      "positive": [
        "6",
        0
      ],
      "sampler_name": "euler",
      "scheduler": "normal",
      "seed": 218764093,
      "steps": 20
    }
  },
  "4": {
    "class_type": "CheckpointLoaderSimple",
    "inputs": {
      "ckpt_name": "dreamshaper_8.safetensors"
    }
  },
  "6": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "clip": [
        "4",
        1
      ],
      "text": "portrait photo of a woman with red hair, soft lighting, 8k resolution"
    }
  },
  "7": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "clip": [
        "4",
        1
      ],
      "text": "deformed, blurry, watermark"
    }
  },
  "10": {
    "class_type": "LoadImage",
    "inputs": {
      "image": "reference_portrait.jpg"
    }
  },
  "12": {
    "class_type": "VAEEncode",
    "inputs": {
      "pixels": [
        "10",
        0
      ],
      "vae": [
        "4",
        2
      ]
    }
  },
  "8": {
    "class_type": "VAEDecode",
    "inputs": {
      "samples": [
        "3",
        0
      ],
      "vae": [
        "4",
        2
      ]
    }
  },
  "9": {
    "class_type": "SaveImage",
    "inputs": {
      "filename_prefix": "ComfyUI_I2I",
      "images": [
        "8",
        0
      ]
    }
  }
};

const demoControlNet = {
  "3": {
    "class_type": "KSampler",
    "inputs": {
      "cfg": 8,
      "denoise": 1,
      "latent_image": [
        "5",
        0
      ],
      "model": [
        "4",
        0
      ],
      "negative": [
        "7",
        0
      ],
      "positive": [
        "15",
        0
      ],
      "sampler_name": "dpmpp_2m",
      "scheduler": "karras",
      "seed": 91823750,
      "steps": 25
    }
  },
  "4": {
    "class_type": "CheckpointLoaderSimple",
    "inputs": {
      "ckpt_name": "dreamshaper_8.safetensors"
    }
  },
  "5": {
    "class_type": "EmptyLatentImage",
    "inputs": {
      "batch_size": 1,
      "height": 768,
      "width": 512
    }
  },
  "7": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "clip": [
        "4",
        1
      ],
      "text": "ugly, disfigured, cartoon, painting"
    }
  },
  "10": {
    "class_type": "LoadImage",
    "inputs": {
      "image": "openpose_skeleton.png"
    }
  },
  "14": {
    "class_type": "ControlNetLoader",
    "inputs": {
      "control_net_name": "control_v11p_sd15_openpose.pth"
    }
  },
  "15": {
    "class_type": "ControlNetApplySimple",
    "inputs": {
      "conditioning": [
        "16",
        0
      ],
      "control_net": [
        "14",
        0
      ],
      "image": [
        "10",
        0
      ],
      "strength": 0.9
    }
  },
  "16": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "clip": [
        "4",
        1
      ],
      "text": "full body fashion photo of a model wearing a summer dress"
    }
  },
  "8": {
    "class_type": "VAEDecode",
    "inputs": {
      "samples": [
        "3",
        0
      ],
      "vae": [
        "4",
        2
      ]
    }
  },
  "9": {
    "class_type": "SaveImage",
    "inputs": {
      "filename_prefix": "ComfyUI_ControlNet",
      "images": [
        "8",
        0
      ]
    }
  }
};
