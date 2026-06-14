"use client";
import { create } from "zustand";
import { get as idbGet, set as idbSet } from "idb-keyval";
import type { PromptItem, EnvironmentItem, Ingredient, Recipe, Character, GenAsset, Conversation, Bank, Template } from "@/lib/types";
import { SEED_PROMPTS, SYSTEM_PROMPTS, SEED_ENVIRONMENTS, SEED_INGREDIENTS, SEED_RECIPES, SEED_BANKS, SEED_TEMPLATES } from "@/lib/data/seed";
const KEY = "nexus-library-v1";
export interface LibraryState {
  prompts: PromptItem[]; environments: EnvironmentItem[]; ingredients: Ingredient[]; recipes: Recipe[];
  characters: Character[]; assets: GenAsset[]; conversations: Conversation[]; banks: Bank[]; templates: Template[]; loaded: boolean;
  load: () => Promise<void>; persist: () => Promise<void>;
  set: <K extends keyof LibraryState>(key: K, value: LibraryState[K]) => void; importJSON: (data: Partial<LibraryState>) => void;
  reseed: (mode: "merge" | "replace") => void;
}
function snapshot(s: LibraryState) { return { prompts: s.prompts, environments: s.environments, ingredients: s.ingredients, recipes: s.recipes, characters: s.characters, assets: s.assets, conversations: s.conversations, banks: s.banks, templates: s.templates }; }
export const useLibrary = create<LibraryState>((set, getState) => ({
  prompts: [], environments: [], ingredients: [], recipes: [], characters: [], assets: [], conversations: [], banks: [], templates: [], loaded: false,
  load: async () => {
    const saved = (await idbGet(KEY)) as any;
    if (saved) set({ ...saved, loaded: true });
    else { const seeded = { prompts: [...SEED_PROMPTS, ...SYSTEM_PROMPTS], environments: SEED_ENVIRONMENTS, ingredients: SEED_INGREDIENTS, recipes: SEED_RECIPES, banks: SEED_BANKS, templates: SEED_TEMPLATES, characters: [], assets: [], conversations: [] }; set({ ...seeded, loaded: true }); await idbSet(KEY, seeded); }
  },
  persist: async () => { await idbSet(KEY, snapshot(getState())); },
  set: (key, value) => { set({ [key]: value } as any); idbSet(KEY, snapshot({ ...getState(), [key]: value } as any)); },
  importJSON: (data) => {
    const s = getState();
    const merged = { prompts: data.prompts ? [...s.prompts, ...data.prompts] : s.prompts, environments: data.environments ? [...s.environments, ...data.environments] : s.environments, ingredients: data.ingredients ? [...s.ingredients, ...data.ingredients] : s.ingredients, recipes: data.recipes ? [...s.recipes, ...data.recipes] : s.recipes, characters: data.characters ? [...s.characters, ...data.characters] : s.characters };
    set(merged as any); idbSet(KEY, snapshot({ ...s, ...merged } as any));
  },
  reseed: (mode) => {
    const s = getState();
    const builtinsP = [...SEED_PROMPTS, ...SYSTEM_PROMPTS];
    if (mode === "replace") {
      const seeded = { prompts: builtinsP, environments: SEED_ENVIRONMENTS, ingredients: SEED_INGREDIENTS, recipes: SEED_RECIPES, banks: SEED_BANKS, templates: SEED_TEMPLATES };
      set(seeded as any); idbSet(KEY, snapshot({ ...s, ...seeded } as any));
      return;
    }
    const pk = (p: PromptItem) => p.category + "|" + (p.subcategory || "") + "|" + p.title;
    const ek = (e: EnvironmentItem) => e.category + "|" + e.name;
    const ik = (i: Ingredient) => i.category + "|" + i.name;
    const rk = (r: Recipe) => r.category + "|" + r.title;
    const merged = {
      prompts: [...s.prompts, ...builtinsP.filter((b) => !s.prompts.some((x) => pk(x) === pk(b)))],
      environments: [...s.environments, ...SEED_ENVIRONMENTS.filter((b) => !s.environments.some((x) => ek(x) === ek(b)))],
      ingredients: [...s.ingredients, ...SEED_INGREDIENTS.filter((b) => !s.ingredients.some((x) => ik(x) === ik(b)))],
      recipes: [...s.recipes, ...SEED_RECIPES.filter((b) => !s.recipes.some((x) => rk(x) === rk(b)))],
      banks: [...s.banks, ...SEED_BANKS.filter((b) => !s.banks.some((x) => x.id === b.id))],
      templates: [...s.templates, ...SEED_TEMPLATES.filter((b) => !s.templates.some((x) => x.name === b.name))],
    };
    set(merged as any); idbSet(KEY, snapshot({ ...s, ...merged } as any));
  },
}));
export const newId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
