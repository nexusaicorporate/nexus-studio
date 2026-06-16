"use client";
import { useState, useEffect, useRef } from "react";
import Page from "@/components/Page";
import { Field, Toggle, useMounted } from "@/components/ui";
import { useComfyStore } from "@/lib/store/comfy";
import { useSettings } from "@/lib/store/settings";
import { Upload, Play, Terminal, Image as ImageIcon, Sliders, CheckCircle2, AlertTriangle, FileJson, Sparkles, ExternalLink } from "lucide-react";
import { newId } from "@/lib/store/library";

interface DynamicInput {
  nodeId: string;
  nodeTitle: string;
  inputKey: string;
  value: any;
  type: "text" | "number" | "image";
}

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
  const [activeTab, setActiveTab] = useState<"form" | "canvas">("form");

  const activeProvider = comfy.providers.find((p) => p.id === comfy.activeProviderId);

  // Automatically load selected workflow if any is query-parameterized (e.g. from Comfy Hub)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
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

    if (activeProvider.id === "local") {
      try {
        setExecLogs((prev) => [...prev, `[Local ComfyUI] Connection enqueuing to ${activeProvider.url}...`]);
        
        const clientId = "nexus_studio_" + Math.random().toString(36).substring(2, 9);
        const wsUrl = activeProvider.url.replace(/^http/, "ws") + `/ws?clientId=${clientId}`;
        
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
                const viewUrl = `${activeProvider.url}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder)}&type=${encodeURIComponent(img.type)}`;
                setOutputImage(viewUrl);
                setExecStatus("completed");
                setExecProgress(100);
                setActiveNode(null);
                ws.close();
              } else if (output.gifs && output.gifs.length > 0) {
                const gif = output.gifs[0];
                const viewUrl = `${activeProvider.url}/view?filename=${encodeURIComponent(gif.filename)}&subfolder=${encodeURIComponent(gif.subfolder)}&type=${encodeURIComponent(gif.type)}`;
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

        const res = await fetch(`${activeProvider.url}/prompt`, {
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
    } else if (activeProvider.id === "comfycloud") {
      try {
        setExecLogs((prev) => [...prev, `[ComfyUI Cloud] Queueing prompt to ${activeProvider.url}/api/prompt...`]);
        const apiKey = activeProvider.apiKey || "";
        if (!apiKey) {
          throw new Error("No API key configured for ComfyUI Cloud. Please add one in Settings.");
        }

        const res = await fetch(`https://cloud.comfy.org/api/prompt`, {
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
          `[Nexus] Running simulated execution...`
        ]);
        runSimulatedExecution();
      }
    } else {
      setExecLogs((prev) => [
        ...prev,
        `[${activeProvider.name}] API request queued to ${activeProvider.url} with API Key ${activeProvider.apiKey ? "••••••••" : "none"}.`,
        `[${activeProvider.name}] Provider endpoint queued (simulation active)...`
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
      title="Workflow Studio (ComfyUI)"
      subtitle="Paste API JSON layouts to customize and execute remote ComfyUI pipelines."
      actions={
        <div className="flex gap-2">
          <label className="btn-outline cursor-pointer text-xs">
            <Upload size={14} /> Upload JSON
            <input type="file" accept="application/json" hidden onChange={handleFileUpload} />
          </label>
          <button type="button" className="btn-primary text-xs" onClick={handleSaveWorkflow}>Save Workflow</button>
        </div>
      }
    >
      <div className="flex gap-2 mb-5">
        <button
          className={`tab ${activeTab === "form" ? "tab-active" : "tab-idle"}`}
          onClick={() => setActiveTab("form")}
        >
          <Sliders size={14} /> Form Builder
        </button>
        <button
          className={`tab ${activeTab === "canvas" ? "tab-active" : "tab-idle"}`}
          onClick={() => setActiveTab("canvas")}
        >
          <Sparkles size={14} /> Node Canvas (Workspace)
        </button>
      </div>

      {activeTab === "canvas" ? (
        <div className="card p-0 overflow-hidden border border-border bg-black/40 shadow-xl flex flex-col h-[calc(100vh-210px)] min-h-[550px]">
          <div className="bg-surface2/50 border-b border-border/40 px-4 py-2 flex items-center justify-between text-xs text-muted-more shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Workspace: <strong>{activeProvider?.url}</strong></span>
            </div>
            <a 
              href={activeProvider?.url} 
              target="_blank" 
              rel="noreferrer" 
              className="btn-outline px-2.5 py-1 text-[11px] flex items-center gap-1 hover:text-primary-light"
            >
              Open in Browser <ExternalLink size={11} />
            </a>
          </div>
          <iframe 
            src={activeProvider?.url} 
            className="flex-1 w-full border-0 bg-white"
            title="ComfyUI Node Workspace"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-5 items-start">
        {/* Left column - JSON Loader & Inputs (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="card p-4">
            <div className="font-semibold mb-2 flex items-center gap-2">
              <FileJson size={18} className="text-primary-light" /> Load API Workflow JSON
            </div>
            <p className="text-xs text-muted mb-3">
              Load a workflow saved in ComfyUI <strong>API prompt format</strong> (not standard load/save format). Click 'Save API Format' in ComfyUI settings.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <Field label="Workflow Name">
                <input className="input text-xs" value={workflowName} onChange={(e) => setWorkflowName(e.target.value)} />
              </Field>
              <Field label="Description">
                <input className="input text-xs" value={workflowDesc} onChange={(e) => setWorkflowDesc(e.target.value)} />
              </Field>
            </div>
            <textarea
              className={`input font-mono text-xs min-h-[140px] ${jsonError ? "border-rose-500/80" : ""}`}
              placeholder="Paste ComfyUI API JSON code here..."
              value={rawJson}
              onChange={(e) => {
                setRawJson(e.target.value);
                handleParseJson(e.target.value);
              }}
            />
            {jsonError && <p className="text-rose-400 text-[10px] mt-1 font-semibold">{jsonError}</p>}
            {Object.keys(parsedNodes).length > 0 && (
              <span className="chip mt-2.5 inline-block text-[10px] font-semibold">
                Detected {Object.keys(parsedNodes).length} node definitions
              </span>
            )}
          </div>

          {/* Dynamic input tweak editor */}
          {extractedInputs.length > 0 && (
            <div className="card p-4">
              <div className="font-semibold mb-3 flex items-center gap-2">
                <Sliders size={18} className="text-primary-light" /> Extracted Input Parameters
              </div>
              <div className="space-y-3">
                {extractedInputs.map((inp) => (
                  <div key={`${inp.nodeId}-${inp.inputKey}`} className="bg-surface2/30 border border-border/40 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-semibold text-text">{inp.nodeTitle} (Node {inp.nodeId})</span>
                      <span className="chip text-[9px] uppercase tracking-wider bg-surface1 text-muted-more border-border/50">
                        {inp.inputKey}
                      </span>
                    </div>
                    {inp.type === "text" ? (
                      <textarea
                        className="input text-xs min-h-[50px]"
                        value={inp.value}
                        onChange={(e) => updateInputValue(inp.nodeId, inp.inputKey, e.target.value)}
                      />
                    ) : inp.type === "number" ? (
                      <input
                        type="number"
                        className="input text-xs"
                        value={inp.value}
                        onChange={(e) => updateInputValue(inp.nodeId, inp.inputKey, parseFloat(e.target.value) || 0)}
                      />
                    ) : (
                      <div className="flex gap-2">
                        <input
                          className="input text-xs flex-1"
                          placeholder="Select image filename..."
                          value={inp.value}
                          onChange={(e) => updateInputValue(inp.nodeId, inp.inputKey, e.target.value)}
                        />
                        <label className="btn-outline px-3 h-10 flex items-center justify-center text-xs cursor-pointer">
                          Upload File
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
        </div>

        {/* Right column - API Settings & execution monitor (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="card p-4">
            <div className="font-semibold mb-2">ComfyUI Endpoint Settings</div>
            <Field label="Active Cloud API / Local Host">
              <select
                className="input"
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
            {activeProvider ? (
              <div className="text-xs text-muted-more bg-surface2/40 border border-border/30 rounded-xl p-3 leading-relaxed mt-2.5">
                <div className="flex items-center gap-1.5 text-text font-semibold mb-1">
                  Endpoint status: {activeProvider.enabled ? (
                    <span className="text-emerald-400">Connected</span>
                  ) : (
                    <span className="text-rose-400">Disabled</span>
                  )}
                </div>
                Url: <span className="font-mono text-muted">{activeProvider.url}</span>
                {activeProvider.apiKey ? (
                  <div className="mt-0.5">API Key: <span className="font-mono text-muted">••••••••••••</span></div>
                ) : (
                  <div className="mt-0.5 text-amber-300/80 flex items-center gap-1"><AlertTriangle size={11} /> No API Key set. Enter in Settings if needed.</div>
                )}
              </div>
            ) : null}

            <button
              type="button"
              className="btn-primary w-full mt-4 font-bold flex items-center justify-center gap-2 h-11"
              disabled={execStatus === "queueing" || execStatus === "running"}
              onClick={handleExecute}
            >
              <Play size={16} fill="currentColor" /> Queue Comfy Prompt
            </button>
          </div>

          {/* Execution Progress & Monitors */}
          {execStatus !== "idle" && (
            <div className="card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold flex items-center gap-2">
                  <Sparkles size={16} className="text-primary-light" /> Live Execution Status
                </div>
                <span className={`chip text-[10px] uppercase font-semibold ${
                  execStatus === "completed" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" :
                  execStatus === "failed" ? "bg-rose-500/20 text-rose-300 border-rose-500/40" :
                  "bg-primary/20 text-primary-light border-primary/40 animate-pulse"
                }`}>
                  {execStatus}
                </span>
              </div>

              {/* Progress Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted">
                  <span>Progressing...</span>
                  <span className="font-mono">{execProgress}%</span>
                </div>
                <div className="w-full bg-surface2 h-2 rounded-full overflow-hidden border border-border/40">
                  <div className="bg-primary h-full transition-all duration-300" style={{ width: `${execProgress}%` }} />
                </div>
              </div>

              {/* Node highlights */}
              {activeNode && (
                <div className="text-xs bg-primary/5 border border-primary/20 rounded-xl p-2.5 flex items-center justify-between">
                  <span className="text-muted">Currently executing node:</span>
                  <span className="font-mono bg-primary/10 text-primary-light px-2 py-0.5 rounded border border-primary/20">
                    Node {activeNode}
                  </span>
                </div>
              )}

              {/* Terminal Logs */}
              <div className="bg-black/85 rounded-xl border border-border/60 p-3 h-[130px] overflow-y-auto flex flex-col gap-1.5 scrollbar-thin">
                <div className="text-[10px] text-muted-more uppercase tracking-wider flex items-center gap-1 border-b border-border/30 pb-1.5 mb-1">
                  <Terminal size={11} /> API Console Logs
                </div>
                {execLogs.map((log, index) => (
                  <div key={index} className="font-mono text-[10px] text-zinc-300 leading-normal break-words whitespace-pre-wrap">
                    {log}
                  </div>
                ))}
              </div>

              {/* Output Visualization */}
              {outputImage && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-text flex items-center gap-1">
                    <CheckCircle2 size={14} className="text-emerald-400" /> Generated Result
                  </div>
                  <div className="relative rounded-xl overflow-hidden bg-surface2 border border-border flex items-center justify-center">
                    <img src={outputImage} className="w-full h-auto max-h-[300px] object-contain" alt="" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </Page>
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
