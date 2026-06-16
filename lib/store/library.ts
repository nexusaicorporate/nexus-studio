"use client";
import { create } from "zustand";
import { get as idbGet, set as idbSet } from "idb-keyval";
import type { PromptItem, EnvironmentItem, Ingredient, Recipe, Character, GenAsset, Conversation, Bank, Template } from "@/lib/types";
import { SEED_PROMPTS, SYSTEM_PROMPTS, SEED_ENVIRONMENTS, SEED_INGREDIENTS, SEED_RECIPES, SEED_BANKS, SEED_TEMPLATES } from "@/lib/data/seed";
const KEY = "nexus-library-v1";
export interface LibraryState {
  prompts: PromptItem[]; environments: EnvironmentItem[]; ingredients: Ingredient[]; recipes: Recipe[];
  characters: Character[]; assets: GenAsset[]; conversations: Conversation[]; banks: Bank[]; templates: Template[]; loaded: boolean;
  promptsImported?: boolean;
  templatesTranslated?: boolean;
  load: () => Promise<void>; persist: () => Promise<void>;
  set: <K extends keyof LibraryState>(key: K, value: LibraryState[K]) => void; importJSON: (data: Partial<LibraryState>) => void;
  reseed: (mode: "merge" | "replace") => Promise<void>;
}
function snapshot(s: any) { return { prompts: s.prompts, environments: s.environments, ingredients: s.ingredients, recipes: s.recipes, characters: s.characters, assets: s.assets, conversations: s.conversations, banks: s.banks, templates: s.templates, promptsImported: s.promptsImported, templatesTranslated: s.templatesTranslated }; }
export const useLibrary = create<LibraryState>((set, getState) => ({
  prompts: [], environments: [], ingredients: [], recipes: [], characters: [], assets: [], conversations: [], banks: [], templates: [], loaded: false, promptsImported: false, templatesTranslated: false,
  load: async () => {
    const saved = (await idbGet(KEY)) as any;
    
    // Helper to fetch seed files
    const fetchSeeds = async () => {
      let prompts: PromptItem[] = [];
      let templates: Template[] = [];
      let banks: Bank[] = [];
      try {
        const res = await fetch("/data/prompts.json");
        if (res.ok) prompts = await res.json();
      } catch (e) { console.error("Failed to fetch prompts seed", e); }
      try {
        const res = await fetch("/data/templates.json");
        if (res.ok) templates = await res.json();
      } catch (e) { console.error("Failed to fetch templates seed", e); }
      try {
        const res = await fetch("/data/banks.json");
        if (res.ok) banks = await res.json();
      } catch (e) { console.error("Failed to fetch banks seed", e); }
      return { prompts, templates, banks };
    };

    if (saved) {
      if (!saved.promptsImported || !saved.templatesTranslated) {
        // Upgrade existing database seamlessly by merging the new items
        const seeds = await fetchSeeds();
        const pk = (p: PromptItem) => p.category + "|" + (p.subcategory || "") + "|" + p.title + "|" + p.body;
        const bk = (b: Bank) => b.id;
        const tk = (t: Template) => t.name;

        const builtinsP = [...SEED_PROMPTS, ...SYSTEM_PROMPTS, ...seeds.prompts];
        const builtinsT = [...SEED_TEMPLATES, ...seeds.templates];
        const builtinsB = [...SEED_BANKS, ...seeds.banks];

        let updatedTemplates = saved.templates || [];
        if (!saved.templatesTranslated) {
          // Replace built-in CJK templates with translated ones while preserving custom ones
          const userTemplates = (saved.templates || []).filter((x: any) => !builtinsT.some((b) => tk(b) === tk(x)));
          updatedTemplates = [...builtinsT, ...userTemplates];
        } else {
          updatedTemplates = [...(saved.templates || []), ...builtinsT.filter((b) => !(saved.templates || []).some((x: any) => tk(x) === tk(b)))];
        }

        const merged = {
          ...saved,
          prompts: [...(saved.prompts || []), ...builtinsP.filter((b) => !(saved.prompts || []).some((x: any) => pk(x) === pk(b)))],
          environments: saved.environments || SEED_ENVIRONMENTS,
          ingredients: saved.ingredients || SEED_INGREDIENTS,
          recipes: saved.recipes || SEED_RECIPES,
          banks: [...(saved.banks || []), ...builtinsB.filter((b) => !(saved.banks || []).some((x: any) => bk(x) === bk(b)))],
          templates: updatedTemplates,
          promptsImported: true,
          templatesTranslated: true,
          loaded: true
        };
        set(merged);
        await idbSet(KEY, snapshot(merged));
      } else {
        set({ ...saved, loaded: true });
      }
    } else {
      const seeds = await fetchSeeds();
      const seeded = {
        prompts: [...SEED_PROMPTS, ...SYSTEM_PROMPTS, ...seeds.prompts],
        environments: SEED_ENVIRONMENTS,
        ingredients: SEED_INGREDIENTS,
        recipes: SEED_RECIPES,
        banks: [...SEED_BANKS, ...seeds.banks],
        templates: [...SEED_TEMPLATES, ...seeds.templates],
        characters: [],
        assets: [],
        conversations: [],
        promptsImported: true,
        templatesTranslated: true,
        loaded: true
      };
      set(seeded);
      await idbSet(KEY, snapshot(seeded));
    }
  },
  persist: async () => { await idbSet(KEY, snapshot(getState())); },
  set: (key, value) => { set({ [key]: value } as any); idbSet(KEY, snapshot({ ...getState(), [key]: value } as any)); },
  importJSON: (data) => {
    const s = getState();
    const merged = { prompts: data.prompts ? [...s.prompts, ...data.prompts] : s.prompts, environments: data.environments ? [...s.environments, ...data.environments] : s.environments, ingredients: data.ingredients ? [...s.ingredients, ...data.ingredients] : s.ingredients, recipes: data.recipes ? [...s.recipes, ...data.recipes] : s.recipes, characters: data.characters ? [...s.characters, ...data.characters] : s.characters };
    set(merged as any); idbSet(KEY, snapshot({ ...s, ...merged } as any));
  },
  reseed: async (mode) => {
    const s = getState();
    
    // Fetch seed files
    let prompts: PromptItem[] = [];
    let templates: Template[] = [];
    let banks: Bank[] = [];
    try {
      const res = await fetch("/data/prompts.json");
      if (res.ok) prompts = await res.json();
    } catch (e) { console.error("Failed to fetch prompts seed in reseed", e); }
    try {
      const res = await fetch("/data/templates.json");
      if (res.ok) templates = await res.json();
    } catch (e) { console.error("Failed to fetch templates seed in reseed", e); }
    try {
      const res = await fetch("/data/banks.json");
      if (res.ok) banks = await res.json();
    } catch (e) { console.error("Failed to fetch banks seed in reseed", e); }

    const builtinsP = [...SEED_PROMPTS, ...SYSTEM_PROMPTS, ...prompts];
    const builtinsT = [...SEED_TEMPLATES, ...templates];
    const builtinsB = [...SEED_BANKS, ...banks];

    if (mode === "replace") {
      const seeded = {
        prompts: builtinsP,
        environments: SEED_ENVIRONMENTS,
        ingredients: SEED_INGREDIENTS,
        recipes: SEED_RECIPES,
        banks: builtinsB,
        templates: builtinsT,
        promptsImported: true
      };
      set(seeded as any);
      await idbSet(KEY, snapshot({ ...s, ...seeded } as any));
      return;
    }
    const pk = (p: PromptItem) => p.category + "|" + (p.subcategory || "") + "|" + p.title + "|" + p.body;
    const ek = (e: EnvironmentItem) => e.category + "|" + e.name;
    const ik = (i: Ingredient) => i.category + "|" + i.name;
    const rk = (r: Recipe) => r.category + "|" + r.title;
    const bk = (b: Bank) => b.id;
    const tk = (t: Template) => t.name;

    const merged = {
      prompts: [...s.prompts, ...builtinsP.filter((b) => !s.prompts.some((x) => pk(x) === pk(b)))],
      environments: [...s.environments, ...SEED_ENVIRONMENTS.filter((b) => !s.environments.some((x) => ek(x) === ek(b)))],
      ingredients: [...s.ingredients, ...SEED_INGREDIENTS.filter((b) => !s.ingredients.some((x) => ik(x) === ik(b)))],
      recipes: [...s.recipes, ...SEED_RECIPES.filter((b) => !s.recipes.some((x) => rk(x) === rk(b)))],
      banks: [...s.banks, ...builtinsB.filter((b) => !s.banks.some((x) => bk(x) === bk(b)))],
      templates: [...s.templates, ...builtinsT.filter((b) => !s.templates.some((x) => tk(x) === tk(b)))],
      promptsImported: true
    };
    set(merged as any);
    await idbSet(KEY, snapshot({ ...s, ...merged } as any));
  },
}));
export const newId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
