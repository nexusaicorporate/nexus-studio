"use client";
import { create } from "zustand";

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
    uncensored: s.uncensored,
    taskPrompts: s.taskPrompts,
    autoSystemPrompt: s.autoSystemPrompt,
    onboardingCompleted: s.onboardingCompleted,
    onboardingRole: s.onboardingRole,
    onboardingHardware: s.onboardingHardware,
    onboardingExperience: s.onboardingExperience,
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SettingsState {
  mode: "dark" | "light";
  palette: string;
  uncensored: boolean;
  hydrated: boolean; // true once loadFromDb() has completed
  taskPrompts: Record<string, string>;
  autoSystemPrompt: boolean;

  // Onboarding
  onboardingCompleted: boolean;
  onboardingRole: string;
  onboardingHardware: string;
  onboardingExperience: string;

  // Actions
  loadFromDb: () => Promise<void>;
  setMode: (m: "dark" | "light") => void;
  setPalette: (p: string) => void;
  setUncensored: (b: boolean) => void;
  setTaskPrompt: (key: string, promptId: string) => void;
  setAutoSystemPrompt: (b: boolean) => void;
  setOnboarding: (data: Partial<Pick<SettingsState, "onboardingRole" | "onboardingHardware" | "onboardingExperience" | "onboardingCompleted">>) => void;
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
  uncensored: true,
  hydrated: false,
  taskPrompts: {},
  autoSystemPrompt: false,
  onboardingCompleted: false,
  onboardingRole: "",
  onboardingHardware: "",
  onboardingExperience: "",

  // -------------------------------------------------------------------------
  // DB load — single hydration path, called once on mount
  // -------------------------------------------------------------------------
  loadFromDb: async () => {
    const res = await fetch("/api/settings");
    if (!res.ok) { set({ hydrated: true }); return; } // No saved settings yet (new user)
    const db = await res.json() as Partial<SettingsState>;

    const merged: Partial<SettingsState> = { ...db };

    // Guard defaults for fields that may be absent in a new/empty row
    if (typeof merged.uncensored !== "boolean") merged.uncensored = true;
    merged.hydrated = true;
    set(merged);
    applyTheme(merged.mode ?? get().mode, merged.palette ?? get().palette);
  },

  // -------------------------------------------------------------------------
  // Mutations — update state then schedule a debounced DB write
  // -------------------------------------------------------------------------
  setMode: (m) => { applyTheme(m, get().palette); set({ mode: m }); scheduleSyncToDb(get()); },
  setPalette: (p) => { applyTheme(get().mode, p); set({ palette: p }); scheduleSyncToDb(get()); },
  setUncensored: (b) => { set({ uncensored: b }); scheduleSyncToDb(get()); },
  setTaskPrompt: (key, promptId) => { set({ taskPrompts: { ...get().taskPrompts, [key]: promptId } }); scheduleSyncToDb(get()); },
  setAutoSystemPrompt: (b) => { set({ autoSystemPrompt: b }); scheduleSyncToDb(get()); },
  setOnboarding: (data) => {
    set(data);
    scheduleSyncToDb(get());
  },
}));