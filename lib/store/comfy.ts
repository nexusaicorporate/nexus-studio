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
  { id: "comfyicu", name: "ComfyICU", url: "https://api.comfy.icu", enabled: false },
  { id: "local", name: "Local ComfyUI Instance", url: "http://localhost:8188", enabled: true }
];

export interface ComfyState {
  workflows: ComfyWorkflow[];
  customNodes: string[];
  modelMappings: ComfyModelMapping[];
  providers: ComfyProvider[];
  activeProviderId: string;
  hydrated: boolean;
  set: <K extends keyof ComfyState>(key: K, value: ComfyState[K]) => void;
  addWorkflow: (w: ComfyWorkflow) => void;
  deleteWorkflow: (id: string) => void;
  addCustomNode: (url: string) => void;
  removeCustomNode: (url: string) => void;
  addModelMapping: (m: ComfyModelMapping) => void;
  removeModelMapping: (id: string) => void;
  updateProvider: (id: string, patch: Partial<ComfyProvider>) => void;
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
