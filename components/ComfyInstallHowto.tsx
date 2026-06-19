"use client";
import { useEffect, useState } from "react";
import { Boxes, Cloud, Workflow, FolderOpen, Sparkles, ShieldCheck } from "lucide-react";

/* Offline, self-contained "what's happening / how it works" carousel shown while
   the bundled ComfyUI is being set up on first run. No network — the install
   phase is a local copy, so a streamed video can't be relied on here. */

const STEPS = [
  { icon: Boxes, title: "Setting up ComfyUI locally", body: "Copying the bundled engine and custom nodes into your workspace. This one-time step takes about a minute." },
  { icon: Cloud, title: "Cloud GPUs are built in", body: "Open the Modal GPU tab in the canvas to run generations on on-demand cloud GPUs — no local GPU required." },
  { icon: Workflow, title: "ComfyUI is node-based", body: "Drag from a node’s colored dot to wire an output into an input. Right-click the canvas to add nodes." },
  { icon: FolderOpen, title: "Your models, your way", body: "Models live in ComfyUI/models — or point to an external drive via Extra Model Paths in the Settings gear." },
  { icon: ShieldCheck, title: "Conflict-proofed", body: "Core packages are pinned, so installing a custom node can’t break the rest of your setup." },
  { icon: Sparkles, title: "Everything’s bundled", body: "The Modal node and ComfyUI-Manager ship inside the app — the workspace is ready the moment it opens." },
];

export default function ComfyInstallHowto() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % STEPS.length), 3800);
    return () => clearInterval(t);
  }, []);
  const S = STEPS[i].icon;
  return (
    <div className="animate-in fade-in zoom-in duration-500 max-w-lg mx-auto">
      <div className="text-primary-light font-bold flex items-center justify-center gap-2 mb-5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-light opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-light" />
        </span>
        Installing ComfyUI locally — one time only
      </div>

      <div className="card p-6 bg-surface2/40 border-border/60 text-left min-h-[150px]">
        <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-500 flex gap-4">
          <div className="w-12 h-12 shrink-0 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center">
            <S size={24} className="text-primary-light" />
          </div>
          <div>
            <div className="font-bold text-sm mb-1">{STEPS[i].title}</div>
            <p className="text-xs text-muted leading-relaxed">{STEPS[i].body}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 h-1 w-full rounded-full bg-surface2 overflow-hidden">
        <div className="h-full bg-primary-light/70 animate-pulse w-2/3" />
      </div>
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {STEPS.map((_, n) => (
          <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? "w-5 bg-primary-light" : "w-1.5 bg-surface2"}`} />
        ))}
      </div>
    </div>
  );
}
