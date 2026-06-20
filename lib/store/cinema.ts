"use client";

import { create } from "zustand";
import { get as idbGet, set as idbSet } from "idb-keyval";
import type { CinemaProject, CinemaScene } from "@/lib/types";

const KEY = "nexus-cinema-v1";

export interface CinemaState {
  projects: CinemaProject[];
  loaded: boolean;
  load: () => Promise<void>;
  saveProject: (p: CinemaProject) => void;
  deleteProject: (id: string) => void;
}

export const useCinema = create<CinemaState>((set, getState) => ({
  projects: [],
  loaded: false,
  load: async () => {
    const saved = await idbGet(KEY);
    if (saved) {
      set({ projects: saved.projects || [], loaded: true });
    } else {
      set({ loaded: true });
    }
  },
  saveProject: (p) => {
    const { projects } = getState();
    const existing = projects.findIndex((x) => x.id === p.id);
    const next = existing > -1 
      ? projects.map((x) => x.id === p.id ? p : x)
      : [p, ...projects];
    
    set({ projects: next });
    idbSet(KEY, { projects: next });
  },
  deleteProject: (id) => {
    const next = getState().projects.filter((x) => x.id !== id);
    set({ projects: next });
    idbSet(KEY, { projects: next });
  }
}));
