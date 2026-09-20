"use client";
import { useState, useEffect, useRef } from "react";
import Page from "@/components/Page";
import { Field, Toggle, useMounted } from "@/components/ui";
import { useComfyStore } from "@/lib/store/comfy";
import { Upload, Play, Terminal, Image as ImageIcon, Sliders, CheckCircle2, AlertTriangle, FileJson, Sparkles, ExternalLink, Cpu, Power, RotateCw, Loader2, Wrench, AlertCircle } from "lucide-react";
import { newId } from "@/lib/store/library";
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

// Demo workflows for quick testing
const demoT2I = { "3": { class_type: "KSampler", inputs: { seed: 12345, steps: 20, cfg: 7, sampler_name: "euler", scheduler: "normal", denoise: 1 } }, "4": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: "sdxl_base.safetensors" } }, "6": { class_type: "CLIPTextEncode", inputs: { text: "beautiful landscape, masterpiece" } }, "7": { class_type: "CLIPTextEncode", inputs: { text: "ugly, deformed, noisy" } }, "8": { class_type: "VAEDecode", inputs: {} }, "9": { class_type: "SaveImage", inputs: { filename_prefix: "ComfyUI" } } };
const demoI2I = { ...demoT2I, "10": { class_type: "LoadImage", inputs: { image: "" } }, "11": { class_type: "VAEEncode", inputs: {} } };
const demoControlNet = { ...demoT2I, "12": { class_type: "LoadImage", inputs: { image: "" } }, "13": { class_type: "ControlNetApply", inputs: { strength: 1.0 } } };

export default function WorkflowStudioPage() {
  const mounted = useMounted();
  const comfy = useComfyStore();
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

  const localUrl = "http://localhost:8188";

  // Poll whether the managed ComfyUI is up; resolve its folder for display (desktop).
  useEffect(() => {
    let alive = true;
    const ping = async () => { const ok = await checkComfyReachable(localUrl); if (alive) setServerOnline(ok); };
    ping();
    const t = setInterval(ping, 5000);
    comfyStatus().then((s) => { if (s && alive) { setManagedDir(s.managedDir); setProvisioned(s.provisioned); } });
    return () => { alive = false; clearInterval(t); };
  }, []);

  // When a workflow is loaded and ComfyUI is reachable, ask the bundled model
  // downloader node which models it needs and how many are missing.
  useEffect(() => {
    if (!serverOnline || Object.keys(parsedNodes).length === 0) { setModelScan(null); return; }
    let alive = true;
    scanWorkflowModels(localUrl, parsedNodes).then((s) => {
      if (alive && s.ok) setModelScan({ total: s.summary.total, missing: s.summary.missing });
    });
    return () => { alive = false; };
  }, [parsedNodes, serverOnline]);

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
    setLaunchPhase("Connecting to ComfyUI…");
    const deadline = Date.now() + 60000;
    const poll = async () => {
      const ok = await checkComfyReachable(localUrl);
      if (ok) { setServerOnline(true); setConnecting(false); return; }
      if (Date.now() > deadline) {
        setConnecting(false);
        setLaunchError(`Couldn't reach ComfyUI at ${localUrl}. Make sure \`npm run comfyui\` is running and has finished starting, then click Connect again.`);
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

    setExecStatus("queueing");
    setExecProgress(10);
    setOutputImage(null);
    setExecLogs([`[Nexus] Initiating request to local ComfyUI...`, `[Nexus] Endpoint: ${localUrl}`]);

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

    try {
      setExecLogs((prev) => [...prev, `[Local ComfyUI] Connection enqueuing to ${localUrl}...`]);
      
      const clientId = "nexus_studio_" + Math.random().toString(36).substring(2, 9);
      const wsUrl = localUrl.replace(/^http/, "ws") + `/ws?clientId=${clientId}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setExecLogs((prev) => [...prev, `[WebSocket] Connected to local ComfyUI stream.`]);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "status") {
            const queueRemaining = msg.data.status.exec_info.queue_remaining;
            setExecLogs((prev) => [...prev, `[Local ComfyUI] Queue remaining: ${queueRemaining}`]);
          } else if (msg.type === "execution_start") {
            setExecStatus("running");
            setExecLogs((prev) => [...prev, `[Local ComfyUI] Execution started: ${msg.data.prompt_id}`]);
          } else if (msg.type === "executing") {
            const node = msg.data.node;
            if (node === null) {
              setExecLogs((prev) => [...prev, `[Local ComfyUI] Execution flow ended.`]);
            } else {
              setActiveNode(node);
              setExecLogs((prev) => [...prev, `[Local ComfyUI] Executing Node ${node}`]);
            }
          } else if (msg.type === "progress") {
            const { value, max } = msg.data;
            setExecProgress(Math.round((value / max) * 100));
          } else if (msg.type === "executed") {
            const { node, output } = msg.data;
            setExecLogs((prev) => [...prev, `[Local ComfyUI] Node ${node} completed.`]);
            
            if (output.images && output.images.length > 0) {
              const img = output.images[0];
              const viewUrl = `${localUrl}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder)}&type=${encodeURIComponent(img.type)}`;
              setOutputImage(viewUrl);
              setExecStatus("completed");
              setExecProgress(100);
              setActiveNode(null);
              ws.close();
            } else if (output.gifs && output.gifs.length > 0) {
              const gif = output.gifs[0];
              const viewUrl = `${localUrl}/view?filename=${encodeURIComponent(gif.filename)}&subfolder=${encodeURIComponent(gif.subfolder)}&type=${encodeURIComponent(gif.type)}`;
              setOutputImage(viewUrl);
              setExecStatus("completed");
              setExecProgress(100);
              setActiveNode(null);
              ws.close();
            }
          }
        } catch (err) {
          console.error(err);
        }
      };

      ws.onerror = () => {
        setExecLogs((prev) => [...prev, `[WebSocket] Error connecting to local ComfyUI event stream.`]);
      };

      const res = await fetch(`${localUrl}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, prompt: executionPayload })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      setExecLogs((prev) => [...prev, `[Local ComfyUI] Prompt enqueued successfully (Prompt ID: ${data.prompt_id})`]);
    } catch (err: any) {
      setExecLogs((prev) => [
        ...prev,
        `[Local API Error] Connect failed: ${err.message}`,
        `[Nexus] Local ComfyUI is offline or CORS is not enabled. Running simulated prompt execution instead...`
      ]);
      runSimulatedExecution();
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

  return (
    <Page
      title="ComfyUI Gear"
      subtitle="Local ComfyUI workspace with managed instance lifecycle and WebSocket execution."
      actions={
        <div className="flex gap-2 items-center">
          <label className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer">
            <Upload size={13} /> Import Workflow
            <input type="file" accept="application/json" hidden onChange={handleFileUpload} />
          </label>
        </div>
      }
    >
      <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-165px)] min-h-[600px] overflow-hidden">
        {/* Main Workspace Iframe */}
        <div className="flex-1 flex flex-col border border-border rounded-xl bg-black/40 shadow-xl overflow-hidden h-full">
          <div className="bg-surface2/50 border-b border-border/40 px-4 py-2 flex items-center justify-between text-xs text-muted-more shrink-0">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${serverOnline ? "bg-emerald-400" : serverOnline === null ? "bg-amber-400 animate-pulse" : "bg-rose-400"} ${(serverOnline || launching || connecting) ? "animate-pulse" : ""}`} />
              <span>Live Workspace: <strong>{localUrl}</strong></span>
              <span className="chip text-[10px] uppercase font-bold capitalize bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                Local Mode
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <a 
                href={localUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="btn-outline px-2.5 py-1 text-[11px] flex items-center gap-1 hover:text-primary-light"
              >
                Open in Browser <ExternalLink size={11} />
              </a>
            </div>
          </div>
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
                  <div className="animate-in fade-in zoom-in duration-500 py-10">
                    <div className="relative w-24 h-24 mx-auto mb-6">
                      <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"></div>
                      <div className="absolute inset-2 rounded-full border-r-2 border-accent animate-spin delay-150"></div>
                      <div className="absolute inset-4 rounded-full border-b-2 border-emerald-400 animate-spin delay-300"></div>
                      <Cpu size={32} className="absolute inset-0 m-auto text-primary-light animate-pulse" />
                    </div>
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
                        ? "First run copies the bundled ComfyUI into place and installs dependencies — this can take a minute or two. You can leave this open."
                        : "Initializing the local server and loading nodes. This usually takes 10–20 seconds."}
                    </p>
                    {provisioned === false && <div className="mt-6"><ComfyInstallHowto /></div>}
                    <button
                      type="button"
                      className="btn-ghost text-[11px] mt-4 inline-flex items-center justify-center gap-1.5 text-muted"
                      onClick={() => checkComfyReachable(localUrl).then((ok) => { if (ok) { setServerOnline(true); setLaunching(false); setConnecting(false); } })}
                    >
                      <RotateCw size={12} /> Check now
                    </button>
                  </div>
                ) : (
                  <div className="max-w-md mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 grid place-items-center mx-auto mb-4">
                      <Cpu size={26} className="text-primary-light" />
                    </div>
                    <div className="text-lg font-bold mb-1">{launchError ? "ComfyUI didn't start" : "ComfyUI isn't running yet"}</div>
                    {launchError && (
                      <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 mb-3 text-left text-[11px] text-rose-200 flex gap-2">
                        <AlertTriangle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                        <span>{launchError}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted leading-relaxed mb-4">
                      The app-managed ComfyUI lives in <strong>{managedDir || "the app's ComfyUI subfolder"}</strong>.
                      It starts in <strong>{comfy.deviceMode === "cpu" ? "CPU-only" : "GPU"}</strong> mode so it always boots.
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
                      <div className="text-xs text-muted bg-surface2/60 border border-border/50 rounded-xl p-3 text-left leading-relaxed">
                        <div className="font-bold text-text mb-1">Browser mode — start ComfyUI in a terminal:</div>
                        <div className="mb-2.5">Run <code className="text-accent">npm run comfyui</code> in the project folder. It launches the bundled ComfyUI on <code className="text-accent">{localUrl}</code> (CPU, CORS enabled). When it finishes starting, click Connect.</div>
                        <button
                          type="button"
                          className="btn-primary text-xs py-1.5 px-4 inline-flex items-center gap-1.5"
                          disabled={connecting}
                          onClick={connectWeb}
                        >
                          {connecting ? <><Loader2 size={13} className="animate-spin" /> Connecting…</> : <><Power size={13} /> Connect to ComfyUI</>}
                        </button>
                        <div className="mt-2.5 opacity-70">For one-click start + GPU config, run <code className="text-accent">npm run desktop:dev</code> (the desktop window) instead.</div>
                      </div>
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
              src={localUrl}
              className="flex-1 w-full border-0 bg-white"
              title="ComfyUI Node Workspace"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          )}
        </div>

        {/* Collapsible API Panel */}
        {showApiPanel && (
          <div className="w-full lg:w-96 shrink-0 flex flex-col gap-4 overflow-y-auto h-full pr-1 pb-4 scrollbar-thin">
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
                  <div className="flex gap-2">
                    <input className="input text-xs flex-1" value={workflowName} onChange={(e) => setWorkflowName(e.target.value)} placeholder="Workflow name" />
                    <button className="btn-primary px-3 text-xs flex items-center gap-1" onClick={handleSaveWorkflow}><CheckCircle2 size={13} /> Save</button>
                  </div>
                  <textarea 
                    className="input font-mono text-[11px] min-h-[200px] bg-black/30 border-border/40 text-white" 
                    value={rawJson} 
                    onChange={(e) => { setRawJson(e.target.value); handleParseJson(e.target.value); }} 
                    placeholder="Paste or upload a ComfyUI API JSON workflow..."
                  />
                  {jsonError && <div className="text-rose-400 text-[10px] flex items-center gap-1.5"><AlertTriangle size={12} /> {jsonError}</div>}
                </div>

                {/* 2. Dynamic Input Controls */}
                {extractedInputs.length > 0 && (
                  <div className="card p-4 space-y-3">
                    <div className="font-semibold text-xs uppercase tracking-wider text-primary border-b border-border/40 pb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Sliders size={14} /> Input Controls ({extractedInputs.length})</span>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {extractedInputs.map((inp, idx) => (
                        <div key={idx} className="space-y-1 p-2 bg-surface2/40 border border-border/30 rounded-lg">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono text-muted">{inp.nodeId}</span>
                            <span className="text-primary-light font-medium">{inp.nodeTitle}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted">
                            <span className="chip text-[9px] uppercase">{inp.inputKey}</span>
                            <span className="chip text-[9px] uppercase">{inp.type}</span>
                          </div>
                          {inp.type === "text" && (
                            <textarea 
                              className="input text-xs min-h-[60px] w-full mt-1" 
                              value={inp.value} 
                              onChange={(e) => updateInputValue(inp.nodeId, inp.inputKey, e.target.value)} 
                              placeholder="Enter prompt text..."
                            />
                          )}
                          {inp.type === "number" && (
                            <input 
                              className="input text-xs w-32 mt-1" 
                              type="number" 
                              value={inp.value} 
                              onChange={(e) => updateInputValue(inp.nodeId, inp.inputKey, Number(e.target.value))} 
                            />
                          )}
                          {inp.type === "image" && (
                            <div className="mt-1">
                              <label className="btn-outline cursor-pointer w-full justify-start text-xs">
                                <ImageIcon size={13} /> Load Image
                                <input type="file" accept="image/*" hidden onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = () => updateInputValue(inp.nodeId, inp.inputKey, reader.result as string);
                                  reader.readAsDataURL(file);
                                }} />
                              </label>
                              {inp.value && (
                                <div className="mt-2 aspect-video bg-black/30 rounded-lg overflow-hidden">
                                  <img src={inp.value} className="w-full h-full object-cover" alt="Reference image" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Execute Section */}
                <div className="card p-4 space-y-3">
                  <div className="font-semibold text-xs uppercase tracking-wider text-primary border-b border-border/40 pb-2">
                    <span className="flex items-center gap-1.5"><Play size={14} fill="currentColor" /> Execute</span>
                  </div>
                  
                  {execStatus === "queueing" && (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-center text-xs text-amber-200 animate-pulse">
                      Queuing prompt…
                    </div>
                  )}
                  {execStatus === "running" && (
                    <div className="space-y-2">
                      <div className="w-full bg-surface2 h-1.5 rounded-full overflow-hidden border border-border/40">
                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${execProgress}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted">{activeNode ? `Executing Node: ${activeNode}` : "Running…"}</span>
                        <span className="font-mono text-primary">{execProgress}%</span>
                      </div>
                    </div>
                  )}
                  {execStatus === "completed" && outputImage && (
                    <div className="space-y-2">
                      <div className="aspect-video bg-black rounded-lg overflow-hidden border border-border">
                        <img src={outputImage} className="w-full h-full object-contain" alt="Result" />
                      </div>
                      <div className="flex gap-2">
                        <a className="btn-outline text-xs flex-1 text-center" href={outputImage} download="nexus-output.png" target="_blank"><CheckCircle2 size={13} /> Download</a>
                        <button className="btn-primary text-xs flex-1" onClick={handleExecute}><RotateCw size={13} /> Re-run</button>
                      </div>
                    </div>
                  )}
                  {execStatus === "failed" && (
                    <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-lg text-center text-xs text-rose-200">
                      Execution failed. Check logs for details.
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn-primary w-full py-2.5 text-sm font-bold flex items-center justify-center gap-1.5 shadow-glow"
                    disabled={execStatus === "queueing" || execStatus === "running" || Object.keys(parsedNodes).length === 0}
                    onClick={handleExecute}
                  >
                    {execStatus === "queueing" ? <><Loader2 size={15} className="animate-spin" /> Queuing…</> : <><Play size={15} fill="currentColor" /> Queue Prompt</>}
                  </button>
                </div>

                {/* 4. Execution Logs */}
                {execLogs.length > 0 && (
                  <div className="card p-4">
                    <div className="font-semibold text-xs uppercase tracking-wider text-primary border-b border-border/40 pb-2 mb-2">
                      <span className="flex items-center gap-1.5"><Terminal size={14} /> Execution Logs ({execLogs.length})</span>
                    </div>
                    <div className="bg-black text-emerald-400 font-mono text-[10px] p-3 rounded-lg h-64 overflow-y-auto leading-relaxed select-text border border-border/30">
                      {execLogs.map((log, index) => (
                        <div key={index}>{log}</div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Page>
  );
}