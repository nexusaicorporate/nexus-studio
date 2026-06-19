"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ProviderConfig } from "@/lib/types";

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  { id: "pollinations", name: "Free (Pollinations)", kind: "pollinations", baseUrl: "https://text.pollinations.ai", models: ["openai", "mistral", "llama"], selectedModel: "openai", visible: true, builtIn: true },
  { id: "ollama", name: "Ollama (Local / Uncensored)", kind: "ollama", baseUrl: "http://localhost:11434", models: ["llama3", "mistral", "gemma", "phi3"], selectedModel: "llama3", visible: true, builtIn: true },
  { id: "lmstudio", name: "LM Studio (Local / Uncensored)", kind: "openai", baseUrl: "http://localhost:1234/v1", models: ["meta-llama-3", "default"], selectedModel: "meta-llama-3", visible: true, builtIn: true },
  { id: "koboldcpp", name: "KoboldCpp (Local / Uncensored)", kind: "openai", baseUrl: "http://localhost:5001/v1", models: ["default"], selectedModel: "default", visible: true, builtIn: true },
  { id: "openai", name: "OpenAI", kind: "openai", baseUrl: "https://api.openai.com/v1", models: ["gpt-4o", "gpt-4o-mini"], selectedModel: "gpt-4o-mini", visible: true, builtIn: true },
  { id: "anthropic", name: "Anthropic", kind: "anthropic", baseUrl: "https://api.anthropic.com/v1", models: ["claude-sonnet-4-6", "claude-opus-4-8", "claude-haiku-4-5-20251001"], selectedModel: "claude-sonnet-4-6", visible: true, builtIn: true },
  { id: "google", name: "Google Gemini", kind: "google", baseUrl: "https://generativelanguage.googleapis.com", models: ["gemini-2.5-flash", "gemini-2.5-pro"], selectedModel: "gemini-2.5-flash", visible: true, builtIn: true },
  { id: "openrouter", name: "OpenRouter", kind: "openai", baseUrl: "https://openrouter.ai/api/v1", models: ["meta-llama/llama-3-8b-instruct:free", "google/gemma-2-9b-it:free", "openai/gpt-4o-mini"], selectedModel: "meta-llama/llama-3-8b-instruct:free", visible: false, builtIn: true },
  { id: "groq", name: "Groq", kind: "openai", baseUrl: "https://api.groq.com/openai/v1", models: ["llama3-8b-8192", "llama3-70b-8192", "mixtral-8x7b-32768"], selectedModel: "llama3-8b-8192", visible: false, builtIn: true },
];

export interface SettingsState {
  mode: "dark" | "light"; palette: string; providers: ProviderConfig[];
  activeProviderId: string;                 // text/chat provider (Chat, Bulk, enhance, X-Ray)
  activeImageProviderId: string; activeVideoProviderId: string;
  uncensored: boolean; hydrated: boolean;
  taskPrompts: Record<string, string>; autoSystemPrompt: boolean;
  falKey: string;
  // Dev/Test: route every modality to one self-hosted Modal backend with a single switch.
  devTest: { enabled: boolean; backendId: string; prev: { text: string; image: string; video: string } };
  setMode: (m: "dark" | "light") => void; setPalette: (p: string) => void;
  setActiveProvider: (id: string) => void;
  setActiveImageProvider: (id: string) => void; setActiveVideoProvider: (id: string) => void;
  updateProvider: (id: string, patch: Partial<ProviderConfig>) => void; addCustomProvider: (p: Partial<ProviderConfig>) => void;
  addModalProvider: (p: Partial<ProviderConfig>) => string;
  setDevTest: (on: boolean, backendId?: string) => void;
  removeProvider: (id: string) => void; setUncensored: (b: boolean) => void; setTaskPrompt: (key: string, promptId: string) => void; setAutoSystemPrompt: (b: boolean) => void;
  setFalKey: (key: string) => void;
}
function applyTheme(mode: string, palette: string) { if (typeof document === "undefined") return; document.documentElement.setAttribute("data-mode", mode); document.documentElement.setAttribute("data-palette", palette); }

export const useSettings = create<SettingsState>()(persist((set, get) => ({
  mode: "dark", palette: "stitch", providers: DEFAULT_PROVIDERS,
  activeProviderId: "pollinations",
  activeImageProviderId: "pollinations", activeVideoProviderId: "pollinations",
  uncensored: true, hydrated: false,
  taskPrompts: {}, autoSystemPrompt: false,
  falKey: "",
  devTest: { enabled: false, backendId: "", prev: { text: "", image: "", video: "" } },
  setMode: (m) => { applyTheme(m, get().palette); set({ mode: m }); },
  setPalette: (p) => { applyTheme(get().mode, p); set({ palette: p }); },
  setActiveProvider: (id) => set({ activeProviderId: id }),
  setActiveImageProvider: (id) => set({ activeImageProviderId: id }),
  setActiveVideoProvider: (id) => set({ activeVideoProviderId: id }),
  updateProvider: (id, patch) => set({ providers: get().providers.map((p) => (p.id === id ? { ...p, ...patch } : p)) }),
  addCustomProvider: (p) => set({ providers: [...get().providers, { id: "custom-" + Date.now(), name: p.name || "Custom Provider", kind: "custom", baseUrl: p.baseUrl || "", apiKey: p.apiKey, models: [], visible: true, builtIn: false }] }),
  addModalProvider: (p) => {
    const id = "modal-" + Date.now();
    set({ providers: [...get().providers, { id, name: p.name || "Modal Backend", kind: "modal", baseUrl: p.baseUrl || "", apiKey: p.apiKey, models: p.models || [], selectedModel: (p.models || [])[0], visible: true, builtIn: false }] });
    return id;
  },
  setDevTest: (on, backendId) => {
    const s = get();
    if (on && backendId) {
      set({
        devTest: { enabled: true, backendId, prev: { text: s.activeProviderId, image: s.activeImageProviderId, video: s.activeVideoProviderId } },
        activeProviderId: backendId, activeImageProviderId: backendId, activeVideoProviderId: backendId,
      });
    } else {
      const prev = s.devTest.prev;
      set({
        devTest: { ...s.devTest, enabled: false },
        activeProviderId: prev.text || s.activeProviderId,
        activeImageProviderId: prev.image || s.activeImageProviderId,
        activeVideoProviderId: prev.video || s.activeVideoProviderId,
      });
    }
  },
  removeProvider: (id) => set({ providers: get().providers.filter((p) => p.id !== id || p.builtIn) }),
  setUncensored: (b) => set({ uncensored: b }),
  setTaskPrompt: (key, promptId) => set({ taskPrompts: { ...get().taskPrompts, [key]: promptId } }),
  setAutoSystemPrompt: (b) => set({ autoSystemPrompt: b }),
  setFalKey: (key) => set({ falKey: key }),
}), { 
  name: "nexus-settings", 
  storage: createJSONStorage(() => localStorage), 
  onRehydrateStorage: () => (state) => { 
    if (state) { 
      applyTheme(state.mode, state.palette); 
      // If client has migrated settings with empty models list, hydrate with defaults
      state.providers = state.providers.map((p) => {
        const def = DEFAULT_PROVIDERS.find((d) => d.id === p.id);
        if (def && (!p.models || p.models.length === 0)) {
          return { ...p, models: def.models, selectedModel: p.selectedModel || def.selectedModel || def.models[0] };
        }
        return p;
      });
      // Migrate old activeProviderId to the new split fields
      if ((state as any).activeProviderId && !state.activeImageProviderId) {
        state.activeImageProviderId = (state as any).activeProviderId;
        state.activeVideoProviderId = (state as any).activeProviderId;
      }
      if (!state.activeImageProviderId) state.activeImageProviderId = "pollinations";
      if (!state.activeVideoProviderId) state.activeVideoProviderId = "pollinations";
      if (!state.activeProviderId) state.activeProviderId = state.activeImageProviderId || "pollinations";
      if (!state.devTest) state.devTest = { enabled: false, backendId: "", prev: { text: "", image: "", video: "" } };
      state.hydrated = true;
    } 
  } 
}));
