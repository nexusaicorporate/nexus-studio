"use client";
/* ------------------------------------------------------------------ *
 * ComfyUI runtime bridge.
 *
 * The local ComfyUI is app-managed: it lives in a FIXED subfolder of the
 * app install (resolved on the Rust side) — there is no user-facing path
 * setting. These helpers call the Tauri commands when running in the
 * desktop build, and degrade to clear guidance in the plain web build.
 *
 * The Modal cloud-GPU config (token, GPU, deploy) is NOT handled here —
 * it lives in the comfyui-modal node's own "Modal GPU" sidebar, inside the
 * embedded ComfyUI canvas.
 * ------------------------------------------------------------------ */

export interface ComfyLaunchResult { ok: boolean; pid?: number; message?: string; }
export interface ComfyInstallResult { ok: boolean; message: string; }

// True only inside the Tauri desktop shell.
export function isDesktop(): boolean {
  return typeof window !== "undefined" && typeof (window as any).__TAURI__ !== "undefined";
}

// Lazily grab Tauri's invoke without bundling it into the web build.
async function invoke<T = any>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const tauri = (window as any).__TAURI__;
  if (!tauri?.core?.invoke) throw new Error("Tauri bridge unavailable (web build).");
  return tauri.core.invoke(cmd, args) as Promise<T>;
}

// Is a ComfyUI server answering at `url`? Works in web and desktop.
// Uses /system_stats (cheap, always present) with a short timeout.
export async function checkComfyReachable(url: string, timeoutMs = 2500): Promise<boolean> {
  const base = url.replace(/\/$/, "");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${base}/system_stats`, { signal: ctrl.signal, mode: "cors" });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

// Absolute path of the managed ComfyUI folder (desktop only) — for display.
export async function comfyManagedDir(): Promise<string | null> {
  if (!isDesktop()) return null;
  try { return await invoke<string>("comfy_managed_dir"); } catch { return null; }
}

export interface ComfyStatus {
  provisioned: boolean; // a runnable ComfyUI exists in the managed folder
  bundled: boolean;     // a ComfyUI is shipped in the installer to set up from
  managedDir: string;
}

// Whether the app-managed ComfyUI is set up yet, and whether a bundled copy exists.
export async function comfyStatus(): Promise<ComfyStatus | null> {
  if (!isDesktop()) return null;
  try {
    const r = await invoke<any>("comfy_status");
    return { provisioned: !!r.provisioned, bundled: !!r.bundled, managedDir: r.managed_dir };
  } catch { return null; }
}

export interface WorkflowModelScan {
  ok: boolean;
  models: Array<{ filename: string; folder?: string; exists: boolean; source?: string; url?: string }>;
  summary: { total: number; existing: number; missing: number };
  error?: string;
}

// Ask the bundled ComfyUI-Workflow-Models-Downloader node to scan a workflow for
// the models it needs and report which are missing + their source. Runs against
// the live ComfyUI server (works for local and the Modal-mounted models dir).
export async function scanWorkflowModels(url: string, workflow: any): Promise<WorkflowModelScan> {
  const base = url.replace(/\/$/, "");
  try {
    const r = await fetch(`${base}/workflow-models/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflow }),
    });
    if (!r.ok) return { ok: false, models: [], summary: { total: 0, existing: 0, missing: 0 }, error: `scan HTTP ${r.status}` };
    const j = await r.json();
    return { ok: true, models: j.models || [], summary: j.summary || { total: 0, existing: 0, missing: 0 } };
  } catch (e: any) {
    return { ok: false, models: [], summary: { total: 0, existing: 0, missing: 0 }, error: e?.message || String(e) };
  }
}

// Roll the managed ComfyUI back to the known-good package snapshot (recovers
// from a custom-node install that broke dependencies).
export async function restoreComfyEnv(): Promise<ComfyInstallResult> {
  if (!isDesktop()) return { ok: false, message: "Desktop build only." };
  try { return await invoke<ComfyInstallResult>("restore_comfy_env"); }
  catch (e: any) { return { ok: false, message: e?.message || String(e) }; }
}

// First-run setup: copy the bundled ComfyUI into the writable managed folder.
export async function provisionComfy(gpuType?: string): Promise<ComfyInstallResult> {
  if (!isDesktop()) return { ok: false, message: "Desktop build only." };
  try { return await invoke<ComfyInstallResult>("provision_comfyui", { gpuType }); }
  catch (e: any) { return { ok: false, message: e?.message || String(e) }; }
}

// Launch the managed ComfyUI. CPU-only by default so it always boots.
export async function launchComfy(cpuOnly = true, port = 8188, gpuType?: string, extraModelPaths: string[] = [], cliArgs: any = {}, apiKeys: any = {}): Promise<ComfyLaunchResult> {
  if (!isDesktop()) {
    return { ok: false, message: "Desktop build only — start ComfyUI manually (see setup) when running in a browser." };
  }
  try {
    return await invoke<ComfyLaunchResult>("launch_comfyui", { cpuOnly, port, gpuType, extraModelPaths, cliArgs, apiKeys });
  } catch (e: any) {
    return { ok: false, message: e?.message || String(e) };
  }
}

export async function stopComfy(): Promise<ComfyLaunchResult> {
  if (!isDesktop()) return { ok: false, message: "Desktop build only." };
  try { return await invoke<ComfyLaunchResult>("stop_comfyui"); }
  catch (e: any) { return { ok: false, message: e?.message || String(e) }; }
}

// One-click deploy of a Modal backend (LLM / image / video) with chosen hardware.
// Desktop-only: it shells the `modal` CLI, which can't run in the static browser
// build. On success returns the live https://….modal.run URL to wire into a
// provider. `model` is the HF id; `secret` (NEXUS_SECRET) + `hfToken` optionally
// (re)create the shared Modal secret so this is truly one-click.
export interface ModalDeployArgs {
  modality: "llm" | "image" | "video";
  gpu: string;            // e.g. "L40S", "A10G", "T4"
  gpuCount?: number;      // >1 = tensor-parallel (LLM)
  cpu?: number;           // physical cores
  ramMb?: number;         // system RAM request in MB
  model: string;          // HF model id
  secret?: string;        // NEXUS_SECRET (Bearer)
  hfToken?: string;       // HF token for gated models
  modalTokenId?: string;  // optional; else uses ~/.modal.toml from `modal setup`
  modalTokenSecret?: string;
}
export interface ModalDeployResult { ok: boolean; url?: string; message: string; log?: string; }

export async function deployModalBackend(args: ModalDeployArgs): Promise<ModalDeployResult> {
  if (!isDesktop()) {
    return { ok: false, message: "Desktop build only — run `modal deploy modal/<script>.py` from a terminal (see setup), then paste the URL." };
  }
  try {
    return await invoke<ModalDeployResult>("deploy_modal_backend", { ...args });
  } catch (e: any) {
    return { ok: false, message: e?.message || String(e) };
  }
}

// Stop a deployed Modal app entirely (`modal app stop`) — kills containers and
// stops all billing. Restart by deploying again (deployModalBackend). Desktop-only.
export async function stopModalApp(appName: string, modalTokenId?: string, modalTokenSecret?: string): Promise<ModalDeployResult> {
  if (!isDesktop()) return { ok: false, message: "Desktop build only — run `modal app stop` from a terminal." };
  try {
    return await invoke<ModalDeployResult>("stop_modal_app", { appName, modalTokenId, modalTokenSecret });
  } catch (e: any) {
    return { ok: false, message: e?.message || String(e) };
  }
}

// Fixed Modal app names per modality (must match the scripts' modal.App(...) names).
export const MODAL_APP_NAMES: Record<string, string> = {
  llm: "nexus-llm",
  image: "nexus-image",
  video: "nexus-video",
};

// Rough Modal GPU list prices ($/hr) for cost ESTIMATES only — Modal's billing
// dashboard is the source of truth. Used to estimate active-generation spend.
export const MODAL_GPU_RATES: Record<string, number> = {
  T4: 0.59,
  L4: 0.80,
  A10G: 1.10,
  L40S: 1.95,
  A100: 2.10,
  "A100-80GB": 2.50,
  H100: 3.95,
};

// Estimate USD for a generation given the GPU and elapsed seconds.
export function estimateModalCost(gpu: string, seconds: number, gpuCount = 1): number {
  const rate = MODAL_GPU_RATES[gpu] ?? 1.5;
  return (rate * Math.max(0, gpuCount)) * (Math.max(0, seconds) / 3600);
}

// Install / update the Modal cloud-GPU custom node into the managed ComfyUI,
// and install the `modal` package into ComfyUI's Python.
export async function installModalNode(repoUrl: string): Promise<ComfyInstallResult> {
  if (!isDesktop()) {
    return { ok: false, message: "Desktop build only — clone the node into custom_nodes manually (see setup)." };
  }
  try { return await invoke<ComfyInstallResult>("install_modal_node", { repoUrl }); }
  catch (e: any) { return { ok: false, message: e?.message || String(e) }; }
}
