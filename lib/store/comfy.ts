"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ComfyModelMapping, ComfyWorkflow } from "@/lib/types";

// Canvas server URL — ComfyUI always runs here for workflow editing and custom nodes
export const COMFY_CANVAS_URL = typeof window !== "undefined" && window.location.origin.includes("studio.nexusaigear.com") 
  ? "https://studio.nexusaigear.com/comfyui-api" 
  : "http://localhost:8188";

export interface ComfyState {
  workflows: ComfyWorkflow[];
  customNodes: string[];
  modelMappings: ComfyModelMapping[];
  hydrated: boolean;
  // ── Local ComfyUI runtime (app-managed; lives in a fixed subfolder of the
  // app install — there is intentionally NO user-facing path setting) ──
  deviceMode: 'cpu' | 'gpu';     // ComfyUI starts CPU-only by default so it always boots
  autoStartComfy: boolean;        // launch the managed ComfyUI when the gear opens
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
  updateCliArgs: (patch: Partial<ComfyState['cliArgs']>) => void;
}

export const useComfyStore = create<ComfyState>()(
  persist(
    (set, get) => ({
      workflows: [],
      customNodes: [],
      modelMappings: [],
      hydrated: false,
      deviceMode: 'cpu',
      autoStartComfy: false,
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