"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ComfyProvider, ComfyModelMapping, ComfyWorkflow } from "@/lib/types";

export const DEFAULT_COMFY_PROVIDERS: ComfyProvider[] = [
  { id: "comfycloud", name: "ComfyUI Cloud", url: "https://api.comfy.org", enabled: true },
  { id: "openart", name: "OpenArt", url: "https://api.openart.ai", enabled: false },
  { id: "viewcomfy", name: "ViewComfy", url: "https://api.viewcomfy.com", enabled: false },
  { id: "runcomfy", name: "RunComfy", url: "https://api.runcomfy.com", enabled: false },
  { id: "runpod", name: "RunPod", url: "https://api.runpod.io", enabled: false },
  { id: "replicate", name: "Replicate", url: "https://api.replicate.com/v1", enabled: false },
  { id: "rundiffusion", name: "RunDiffusion", url: "https://api.rundiffusion.com", enabled: false },
  { id: "comfyicu", name: "ComfyICU", url: "https://api.comfy.icu", enabled: false }
];

// Canvas server URL — ComfyUI always runs here for workflow editing and custom nodes
export const COMFY_CANVAS_URL = "http://studio:8188";

export interface ComfyState {
  workflows: ComfyWorkflow[];
  customNodes: string[];
  modelMappings: ComfyModelMapping[];
  providers: ComfyProvider[];
  activeProviderId: string;
  hydrated: boolean;
  runMode: 'hybrid' | 'cloud';
  runModeLocked: boolean;
  cloudPlan: 'standard' | 'creator' | 'pro' | null;
  cloudEnvironment: string;
  showPlansModal: boolean;
  hybridConfig: {
    remoteGpuUrl: string;
    remoteGpuKey: string;
    customNodeRepo: string;
  };
  // ── Local ComfyUI runtime (app-managed; lives in a fixed subfolder of the
  // app install — there is intentionally NO user-facing path setting) ──
  deviceMode: 'cpu' | 'gpu';     // ComfyUI starts CPU-only by default so it always boots
  autoStartComfy: boolean;        // launch the managed ComfyUI when the gear opens
  modalNodeRepo: string;          // the cloud-GPU custom node we install into ComfyUI
  gpuType: 'cpu' | 'nvidia' | 'amd' | 'intel' | null;
  extraModelPaths: string[];
  cliArgs: { listen: boolean, port: number, highvram: boolean, normalvram: boolean, lowvram: boolean, cpu: boolean, extra: string };
  // Model-provider API keys — entered once here, auto-filled into ComfyUI's
  // settings + env on launch so the workspace and every node that needs them
  // (e.g. the model downloader) pick them up automatically.
  apiKeys: { civitai: string; huggingface: string; tavily: string };
  set: <K extends keyof ComfyState>(key: K, value: ComfyState[K]) => void;
  addWorkflow: (w: ComfyWorkflow) => void;
  deleteWorkflow: (id: string) => void;
  addCustomNode: (url: string) => void;
  removeCustomNode: (url: string) => void;
  addModelMapping: (m: ComfyModelMapping) => void;
  removeModelMapping: (id: string) => void;
  updateProvider: (id: string, patch: Partial<ComfyProvider>) => void;
  updateHybridConfig: (patch: Partial<ComfyState['hybridConfig']>) => void;
  updateCliArgs: (patch: Partial<ComfyState['cliArgs']>) => void;
}

export const useComfyStore = create<ComfyState>()(
  persist(
    (set, get) => ({
      workflows: [],
      customNodes: [],
      modelMappings: [],
      providers: DEFAULT_COMFY_PROVIDERS,
      activeProviderId: "comfycloud",
      hydrated: false,
      runMode: 'cloud',
      runModeLocked: true,
      cloudPlan: null,
      cloudEnvironment: 'Comfy Cloud',
      showPlansModal: false,
      hybridConfig: {
        remoteGpuUrl: COMFY_CANVAS_URL,
        remoteGpuKey: '',
        customNodeRepo: 'nathannlu/comfyui-cloud'
      },
      deviceMode: 'cpu',
      autoStartComfy: false,
      modalNodeRepo: 'https://github.com/JunnnnyWon/comfyui-modal',
      gpuType: null,
      extraModelPaths: [],
      cliArgs: { listen: true, port: 8188, highvram: false, normalvram: false, lowvram: false, cpu: false, extra: "" },
      apiKeys: { civitai: "", huggingface: "", tavily: "" },
      set: (key, value) => set({ [key]: value } as any),
      addWorkflow: (w) => set({ workflows: [w, ...get().workflows.filter((x) => x.id !== w.id)] }),
      deleteWorkflow: (id) => set({ workflows: get().workflows.filter((x) => x.id !== id) }),
      addCustomNode: (url) => {
        const cleaned = url.trim();
        if (cleaned && !get().customNodes.includes(cleaned)) {
          set({ customNodes: [...get().customNodes, cleaned] });
        }
      },
      removeCustomNode: (url) => set({ customNodes: get().customNodes.filter((x) => x !== url) }),
      addModelMapping: (m) => set({ modelMappings: [m, ...get().modelMappings.filter((x) => x.id !== m.id)] }),
      removeModelMapping: (id) => set({ modelMappings: get().modelMappings.filter((x) => x.id !== id) }),
      updateProvider: (id, patch) =>
        set({
          providers: get().providers.map((p) => (p.id === id ? { ...p, ...patch } : p))
        }),
      updateHybridConfig: (patch) =>
        set({
          hybridConfig: { ...get().hybridConfig, ...patch }
        }),
      updateCliArgs: (patch) =>
        set({
          cliArgs: { ...get().cliArgs, ...patch }
        })
    }),
    {
      name: "nexus-comfy-settings",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      }
    }
  )
);
