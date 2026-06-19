"use client";

import Page from "@/components/Page";
import { FolderGit2, Plus, Film, Wand2 } from "lucide-react";
import { useState } from "react";

export default function CinemaStudio() {
  const [projects, setProjects] = useState<any[]>([]);

  return (
    <Page 
      title="Cinema Studio" 
      subtitle="Create and manage full multi-scene movies and music videos. Define characters, environments, storyboards, and audio tracks in a unified project space."
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Your Projects</h2>
          <button className="btn-primary flex items-center gap-2">
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
            <button className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Create Cinema Project
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Project cards will go here */}
          </div>
        )}

        <div className="card p-6 mt-8 border-dashed">
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 shrink-0 grid place-items-center">
              <Wand2 size={20} />
            </div>
            <div>
              <h4 className="font-bold mb-1">Coming Soon: AI Cinema Orchestrator</h4>
              <p className="text-sm text-muted">
                Soon, you'll be able to generate entire storyboards from a script, automatically assigning characters and environments to each scene, and rendering everything sequentially.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
