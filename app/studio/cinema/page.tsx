"use client";

import { useState, useEffect } from "react";
import Page from "@/components/Page";
import { Plus, Film, ChevronLeft, GripVertical, Trash2, Clapperboard, Clock } from "lucide-react";
import { useCinema } from "@/lib/store/cinema";
import { newId } from "@/lib/store/library";
import PromptDirector from "@/components/PromptDirector";
import type { CinemaProject, CinemaScene } from "@/lib/types";

export default function CinemaStudio() {
  const { projects, loaded, load, saveProject, deleteProject } = useCinema();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  useEffect(() => { if (!loaded) load(); }, [loaded, load]);

  const activeProject = projects.find(p => p.id === activeProjectId);

  function createProject() {
    const p: CinemaProject = {
      id: newId(),
      title: "New Cinema Project",
      description: "",
      scenes: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    saveProject(p);
    setActiveProjectId(p.id);
  }

  function saveScene(data: { prompt: string; templateId?: string; characterIds: string[]; ingredientIds: string[] }) {
    if (!activeProject) return;
    const scene: CinemaScene = {
      id: newId(),
      order: activeProject.scenes.length,
      prompt: data.prompt,
      templateId: data.templateId,
      characterIds: data.characterIds,
      ingredientIds: data.ingredientIds,
    };
    saveProject({ ...activeProject, scenes: [...activeProject.scenes, scene], updatedAt: Date.now() });
  }

  function deleteScene(sceneId: string) {
    if (!activeProject) return;
    const scenes = activeProject.scenes.filter(s => s.id !== sceneId).map((s, i) => ({ ...s, order: i }));
    saveProject({ ...activeProject, scenes, updatedAt: Date.now() });
  }

  if (activeProject) {
    return (
      <Page 
        title={
          <div className="flex items-center gap-2">
            <button className="btn-ghost px-2" onClick={() => setActiveProjectId(null)}><ChevronLeft size={16}/></button>
            <input 
              className="bg-transparent border-none outline-none font-bold text-xl w-64" 
              value={activeProject.title} 
              onChange={e => saveProject({...activeProject, title: e.target.value})}
            />
          </div>
        }
      >
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold">Storyboard Scenes</h3>
            </div>
            
            <div className="space-y-3">
              {activeProject.scenes.map((scene, i) => (
                <div key={scene.id} className="card p-3 flex gap-3 group">
                  <div className="mt-1 cursor-grab text-muted opacity-50 group-hover:opacity-100"><GripVertical size={16}/></div>
                  <div className="w-24 h-16 bg-surface2 rounded flex flex-col items-center justify-center text-muted border border-dashed border-border/50 shrink-0">
                    <Clapperboard size={14} className="mb-1"/>
                    <span className="text-[10px]">Scene {i+1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-relaxed">{scene.prompt}</p>
                    <div className="flex gap-2 mt-2">
                      {scene.characterIds.length > 0 && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Has Characters</span>}
                      {scene.ingredientIds.length > 0 && <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded">Has Ingredients</span>}
                    </div>
                  </div>
                  <button className="btn-ghost text-rose-400 opacity-0 group-hover:opacity-100 px-2" onClick={() => deleteScene(scene.id)}>
                    <Trash2 size={15}/>
                  </button>
                </div>
              ))}

              {activeProject.scenes.length === 0 && (
                <div className="text-center p-8 border border-dashed border-border/50 rounded-xl text-muted">
                  No scenes yet. Use the Prompt Director on the right to build your first scene.
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar: embedded Prompt Director Pro */}
          <div className="w-full lg:w-96 shrink-0">
            <div className="sticky top-6">
              <div className="card border-primary/20 shadow-lg shadow-primary/5">
                <div className="bg-surface2 p-3 border-b border-border/40 font-semibold text-sm flex items-center gap-2">
                  <Film size={15} className="text-primary"/> Prompt Director Pro
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted mb-4">Build your scene prompt by selecting a template and filling slots with characters and ingredients.</p>
                  <PromptDirector asComponent={true} onSaveScene={saveScene} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page 
      title="Cinema Studio" 
      subtitle="Create and manage full multi-scene movies and music videos. Define characters, environments, storyboards, and audio tracks in a unified project space."
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Your Projects</h2>
          <button className="btn-primary flex items-center gap-2" onClick={createProject}>
            <Plus size={16} /> New Project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="card p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <Film size={32} />
            </div>
            <h3 className="text-lg font-bold mb-2">No projects yet</h3>
            <p className="text-muted text-sm max-w-sm mb-6">
              Start your first Cinema project to stitch together scenes, characters, and audio into a complete film or music video.
            </p>
            <button className="btn-primary flex items-center gap-2" onClick={createProject}>
              <Plus size={16} /> Create Cinema Project
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <div key={p.id} className="card p-4 hover:border-primary/50 cursor-pointer transition-colors" onClick={() => setActiveProjectId(p.id)}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold">{p.title}</h3>
                  <button className="text-muted hover:text-rose-400" onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}><Trash2 size={14}/></button>
                </div>
                <p className="text-sm text-muted mb-4">{p.scenes.length} Scenes</p>
                <div className="text-xs text-muted flex items-center gap-1"><Clock size={12}/> Updated {new Date(p.updatedAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}
