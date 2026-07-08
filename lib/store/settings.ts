"use client";
import { create } from "zustand";
import type { ProviderConfig } from "@/lib/types";

// ---------------------------------------------------------------------------
// DB sync helpers
// ---------------------------------------------------------------------------
let _syncTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced — batches rapid mutations (e.g. slider drags) into one DB write. */
function scheduleSyncToDb(state: Partial<SettingsState>) {
  if (typeof window === "undefined") return;
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => {
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serializeForDb(state)),
    });
  }, 800);
}

/** Fields persisted to the DB — excludes runtime-only flags like hydrated. */
function serializeForDb(s: Partial<SettingsState>) {
  return {
    mode: s.mode,
    palette: s.palette,
    providers: s.providers,
    activeProviderId: s.activeProviderId,
    activeImageProviderId: s.activeImageProviderId,
    activeVideoProviderId: s.activeVideoProviderId,
    uncensored: s.uncensored,
    taskPrompts: s.taskPrompts,
    autoSystemPrompt: s.autoSystemPrompt,
    falKey: s.falKey,
    devTest: s.devTest,
    modalDeploys: s.modalDeploys,
    modalBudget: s.modalBudget,
    modalSpend: s.modalSpend,
  };
}

/** Merges saved providers over defaults.
 *  Ensures new built-in providers added in a release always appear,
 *  while the user's API keys and model selections are always restored. */
function mergeProviders(
  defaults: ProviderConfig[],
  saved: ProviderConfig[] | undefined,
): ProviderConfig[] {
  if (!saved || !Array.isArray(saved)) return defaults;
  const merged = defaults.map((def) => {
    const match = saved.find((s) => s.id === def.id);
    return match ? { ...def, ...match } : def;
  });
  // Append custom/modal providers that aren't in defaults
  for (const s of saved) {
    if (!defaults.find((d) => d.id === s.id)) merged.push(s);
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Default providers
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SettingsState {
  mode: "dark" | "light";
  palette: string;
  providers: ProviderConfig[];
  activeProviderId: string;       // text/chat provider (Chat, Bulk, enhance, X-Ray)
  activeImageProviderId: string;
  activeVideoProviderId: string;
  uncensored: boolean;
  hydrated: boolean;              // true once loadFromDb() has completed
  taskPrompts: Record<string, string>;
  autoSystemPrompt: boolean;
  falKey: string;
  // Dev/Test: route every modality to one self-hosted Modal backend with a single switch.
  devTest: { enabled: boolean; backendId: string; prev: { text: string; image: string; video: string } };
  // Remembered one-click deploys, keyed by modality (llm/image/video).
  modalDeploys: Record<string, { gpu: string; gpuCount: number; cpu: number; ramGb: number; model: string; secret: string; hfToken: string; url: string; stopped: boolean }>;
  // Cost tracking estimate (Modal's billing dashboard is authoritative).
  modalBudget: number;
  modalSpend: number;

  // Actions
  loadFromDb: () => Promise<void>;
  setModalDeploy: (modality: string, data: SettingsState["modalDeploys"][string]) => void;
  setModalDeployStopped: (modality: string, stopped: boolean) => void;
  removeModalDeploy: (modality: string) => void;
  setModalBudget: (n: number) => void;
  addModalSpend: (usd: number) => void;
  resetModalSpend: () => void;
  setMode: (m: "dark" | "light") => void;
  setPalette: (p: string) => void;
  setActiveProvider: (id: string) => void;
  setActiveImageProvider: (id: string) => void;
  setActiveVideoProvider: (id: string) => void;
  updateProvider: (id: string, patch: Partial<ProviderConfig>) => void;
  addCustomProvider: (p: Partial<ProviderConfig>) => void;
  addModalProvider: (p: Partial<ProviderConfig>) => string;
  addOpenAIProvider: (p: Partial<ProviderConfig>) => string;
  setDevTest: (on: boolean, backendId?: string) => void;
  removeProvider: (id: string) => void;
  setUncensored: (b: boolean) => void;
  setTaskPrompt: (key: string, promptId: string) => void;
  setAutoSystemPrompt: (b: boolean) => void;
  setFalKey: (key: string) => void;
}

function applyTheme(mode: string, palette: string) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-mode", mode);
  document.documentElement.setAttribute("data-palette", palette);
}

// ---------------------------------------------------------------------------
// Store — pure in-memory, Postgres is the only persistence layer
// ---------------------------------------------------------------------------
export const useSettings = create<SettingsState>()((set, get) => ({
  // Initial defaults shown while loadFromDb() is in flight
  mode: "dark",
  palette: "stitch",
  providers: DEFAULT_PROVIDERS,
  activeProviderId: "pollinations",
  activeImageProviderId: "pollinations",
  activeVideoProviderId: "pollinations",
  uncensored: true,
  hydrated: false,
  taskPrompts: {},
  autoSystemPrompt: false,
  falKey: "",
  devTest: { enabled: false, backendId: "", prev: { text: "", image: "", video: "" } },
  modalDeploys: {},
  modalBudget: 0,
  modalSpend: 0,

  // -------------------------------------------------------------------------
  // DB load — single hydration path, called once on mount
  // -------------------------------------------------------------------------
  loadFromDb: async () => {
    const res = await fetch("/api/settings");
    if (!res.ok) { set({ hydrated: true }); return; } // No saved settings yet (new user)
    const db = await res.json() as Partial<SettingsState>;

    const merged: Partial<SettingsState> = { ...db };

    // Merge providers: new built-ins always appear, saved API keys always restored
    merged.providers = mergeProviders(DEFAULT_PROVIDERS, db.providers);

    // Guard defaults for fields that may be absent in a new/empty row
    if (!merged.activeImageProviderId) merged.activeImageProviderId = "pollinations";
    if (!merged.activeVideoProviderId) merged.activeVideoProviderId = "pollinations";
    if (!merged.activeProviderId) merged.activeProviderId = merged.activeImageProviderId;
    if (!merged.devTest) merged.devTest = { enabled: false, backendId: "", prev: { text: "", image: "", video: "" } };
    if (!merged.modalDeploys) merged.modalDeploys = {};
    if (typeof merged.modalBudget !== "number") merged.modalBudget = 0;
    if (typeof merged.modalSpend !== "number") merged.modalSpend = 0;

    merged.hydrated = true;
    set(merged);
    applyTheme(merged.mode ?? get().mode, merged.palette ?? get().palette);
  },

  // -------------------------------------------------------------------------
  // Mutations — update state then schedule a debounced DB write
  // -------------------------------------------------------------------------
  setModalBudget: (n) => { set({ modalBudget: Math.max(0, n || 0) }); scheduleSyncToDb(get()); },
  addModalSpend: (usd) => { if (usd > 0) { set({ modalSpend: get().modalSpend + usd }); scheduleSyncToDb(get()); } },
  resetModalSpend: () => { set({ modalSpend: 0 }); scheduleSyncToDb(get()); },
  setModalDeploy: (modality, data) => { set({ modalDeploys: { ...get().modalDeploys, [modality]: data } }); scheduleSyncToDb(get()); },
  setModalDeployStopped: (modality, stopped) => {
    const cur = get().modalDeploys[modality];
    if (cur) { set({ modalDeploys: { ...get().modalDeploys, [modality]: { ...cur, stopped } } }); scheduleSyncToDb(get()); }
  },
  removeModalDeploy: (modality) => {
    const m = { ...get().modalDeploys };
    delete m[modality];
    set({ modalDeploys: m });
    scheduleSyncToDb(get());
  },
  setMode: (m) => { applyTheme(m, get().palette); set({ mode: m }); scheduleSyncToDb(get()); },
  setPalette: (p) => { applyTheme(get().mode, p); set({ palette: p }); scheduleSyncToDb(get()); },
  setActiveProvider: (id) => { set({ activeProviderId: id }); scheduleSyncToDb(get()); },
  setActiveImageProvider: (id) => { set({ activeImageProviderId: id }); scheduleSyncToDb(get()); },
  setActiveVideoProvider: (id) => { set({ activeVideoProviderId: id }); scheduleSyncToDb(get()); },
  updateProvider: (id, patch) => {
    set({ providers: get().providers.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
    scheduleSyncToDb(get());
  },
  addCustomProvider: (p) => {
    set({ providers: [...get().providers, { id: "custom-" + Date.now(), name: p.name || "Custom Provider", kind: "custom", baseUrl: p.baseUrl || "", apiKey: p.apiKey, models: [], visible: true, builtIn: false }] });
    scheduleSyncToDb(get());
  },
  addModalProvider: (p) => {
    const id = "modal-" + Date.now();
    set({ providers: [...get().providers, { id, name: p.name || "Modal Backend", kind: "modal", baseUrl: p.baseUrl || "", apiKey: p.apiKey, models: p.models || [], selectedModel: (p.models || [])[0], visible: true, builtIn: false }] });
    scheduleSyncToDb(get());
    return id;
  },
  addOpenAIProvider: (p) => {
    const id = "openai-" + Date.now();
    const models = p.models || [];
    set({ providers: [...get().providers, { id, name: p.name || "OpenAI-compatible", kind: "custom", baseUrl: p.baseUrl || "", apiKey: p.apiKey, models, selectedModel: p.selectedModel || models[0], visible: true, builtIn: false }] });
    scheduleSyncToDb(get());
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
    scheduleSyncToDb(get());
  },
  removeProvider: (id) => { set({ providers: get().providers.filter((p) => p.id !== id || p.builtIn) }); scheduleSyncToDb(get()); },
  setUncensored: (b) => { set({ uncensored: b }); scheduleSyncToDb(get()); },
  setTaskPrompt: (key, promptId) => { set({ taskPrompts: { ...get().taskPrompts, [key]: promptId } }); scheduleSyncToDb(get()); },
  setAutoSystemPrompt: (b) => { set({ autoSystemPrompt: b }); scheduleSyncToDb(get()); },
  setFalKey: (key) => { set({ falKey: key }); scheduleSyncToDb(get()); },
}));
