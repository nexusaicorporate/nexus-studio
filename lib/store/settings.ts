"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ProviderConfig } from "@/lib/types";

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  { id: "pollinations", name: "Free (Pollinations)", kind: "pollinations", baseUrl: "https://text.pollinations.ai", models: ["openai", "mistral", "llama"], selectedModel: "openai", visible: true, builtIn: true },
  { id: "ollama", name: "Ollama (Local / Uncensored)", kind: "ollama", baseUrl: "http://localhost:11434", models: [], visible: true, builtIn: true },
  { id: "lmstudio", name: "LM Studio (Local / Uncensored)", kind: "openai", baseUrl: "http://localhost:1234/v1", models: [], visible: true, builtIn: true },
  { id: "koboldcpp", name: "KoboldCpp (Local / Uncensored)", kind: "openai", baseUrl: "http://localhost:5001/v1", models: [], visible: true, builtIn: true },
  { id: "openai", name: "OpenAI", kind: "openai", baseUrl: "https://api.openai.com/v1", models: ["gpt-4o", "gpt-4o-mini"], visible: true, builtIn: true },
  { id: "anthropic", name: "Anthropic", kind: "anthropic", baseUrl: "https://api.anthropic.com/v1", models: ["claude-sonnet-4-6", "claude-opus-4-8", "claude-haiku-4-5-20251001"], visible: true, builtIn: true },
  { id: "google", name: "Google Gemini", kind: "google", baseUrl: "https://generativelanguage.googleapis.com", models: ["gemini-2.5-flash", "gemini-2.5-pro"], visible: true, builtIn: true },
  { id: "openrouter", name: "OpenRouter", kind: "openai", baseUrl: "https://openrouter.ai/api/v1", models: [], visible: false, builtIn: true },
  { id: "groq", name: "Groq", kind: "openai", baseUrl: "https://api.groq.com/openai/v1", models: [], visible: false, builtIn: true },
];

export interface SettingsState {
  mode: "dark" | "light"; palette: string; providers: ProviderConfig[]; activeProviderId: string;
  systemPrompt: string; uncensored: boolean; hydrated: boolean;
  taskPrompts: Record<string, string>; autoSystemPrompt: boolean;
  setMode: (m: "dark" | "light") => void; setPalette: (p: string) => void; setActiveProvider: (id: string) => void;
  updateProvider: (id: string, patch: Partial<ProviderConfig>) => void; addCustomProvider: (p: Partial<ProviderConfig>) => void;
  removeProvider: (id: string) => void; setSystemPrompt: (s: string) => void; setUncensored: (b: boolean) => void; setTaskPrompt: (key: string, promptId: string) => void; setAutoSystemPrompt: (b: boolean) => void;
}
function applyTheme(mode: string, palette: string) { if (typeof document === "undefined") return; document.documentElement.setAttribute("data-mode", mode); document.documentElement.setAttribute("data-palette", palette); }

export const useSettings = create<SettingsState>()(persist((set, get) => ({
  mode: "dark", palette: "stitch", providers: DEFAULT_PROVIDERS, activeProviderId: "pollinations",
  systemPrompt: "Describe this image in detail.", uncensored: true, hydrated: false,
  taskPrompts: {}, autoSystemPrompt: false,
  setMode: (m) => { applyTheme(m, get().palette); set({ mode: m }); },
  setPalette: (p) => { applyTheme(get().mode, p); set({ palette: p }); },
  setActiveProvider: (id) => set({ activeProviderId: id }),
  updateProvider: (id, patch) => set({ providers: get().providers.map((p) => (p.id === id ? { ...p, ...patch } : p)) }),
  addCustomProvider: (p) => set({ providers: [...get().providers, { id: "custom-" + Date.now(), name: p.name || "Custom Provider", kind: "custom", baseUrl: p.baseUrl || "", apiKey: p.apiKey, models: [], visible: true, builtIn: false }] }),
  removeProvider: (id) => set({ providers: get().providers.filter((p) => p.id !== id || p.builtIn) }),
  setSystemPrompt: (s) => set({ systemPrompt: s }),
  setUncensored: (b) => set({ uncensored: b }),
  setTaskPrompt: (key, promptId) => set({ taskPrompts: { ...get().taskPrompts, [key]: promptId } }),
  setAutoSystemPrompt: (b) => set({ autoSystemPrompt: b }),
}), { name: "nexus-settings", storage: createJSONStorage(() => localStorage), onRehydrateStorage: () => (state) => { if (state) { applyTheme(state.mode, state.palette); state.hydrated = true; } } }));
