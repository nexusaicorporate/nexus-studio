"use client";
import { useState } from "react";
import Page from "@/components/Page";
import { BookOpen, Sparkles, Import, AlertCircle, Cpu, ExternalLink, Globe, Code, Layers, FileCode, CheckCircle2, Upload, Trash2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMounted } from "@/components/ui";
import { useComfyStore } from "@/lib/store/comfy";
import { useSettings } from "@/lib/store/settings";
import { extractRequiredModels } from "@/lib/comfy-models";
import { HUB_WORKFLOWS } from "@/lib/data/comfyworkflows";
import { NEW_HUB_WORKFLOWS } from "@/lib/data/comfy-hub-data";
import Link from "next/link";

export default function ComfyHubPage() {
  const mounted = useMounted();
  const router = useRouter();
  const comfy = useComfyStore();
  const [filterCat, setFilterCat] = useState<string>("All");
  const settings = useSettings();

  function importWorkflow(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        JSON.parse(text); // validate
        comfy.addWorkflow({
          id: "wf-" + Date.now(),
          name: f.name.replace(/\.json$/i, ""),
          description: "Imported workflow",
          json: text,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      } catch { alert("That file isn't valid workflow JSON."); }
    };
    reader.readAsText(f);
    e.target.value = "";
  }
  function useWorkflow(id: string) { router.push(`/studio/workflow?workflow=${id}`); }

  if (!mounted) return null;

  const categories = ["All", "Featured", "Apps", "Image", "Video", "ControlNet", "Utilities"];
  if (settings.uncensored) {
    categories.push("NSFW");
  }
  
  // Use the new scraped data
  const filteredWorkflows = filterCat === "All"
    ? NEW_HUB_WORKFLOWS
    : filterCat === "Featured"
    ? NEW_HUB_WORKFLOWS.slice(0, 20)
    : filterCat === "Apps"
    ? NEW_HUB_WORKFLOWS.filter((w) => w.isApp)
    : filterCat === "NSFW"
    ? NEW_HUB_WORKFLOWS.filter((w) => w.tags && w.tags.some(t => ["nsfw", "adult", "18+"].includes(t.toLowerCase())))
    : NEW_HUB_WORKFLOWS.filter((w) => w.tags && w.tags.some(t => t.toLowerCase().includes(filterCat.toLowerCase())));
    
  const featuredWorkflows = NEW_HUB_WORKFLOWS.slice(0, 5); // Just grab first 5 as featured

  return (
    <Page
      title="Comfy Hub Gear"
      subtitle="Browse built-in workflow JSON configurations and launch the managed ComfyUI canvas."
      actions={
        <div className="flex items-center gap-3">
          <label className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer">
            <Upload size={13} /> Import Workflow
            <input type="file" accept="application/json" hidden onChange={importWorkflow} />
          </label>
        </div>
      }
    >
      <div className="space-y-6">

          {/* Your imported workflows */}
          {comfy.workflows.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileCode size={15} className="text-primary-light" />
                <h3 className="font-bold text-sm">Your Imported Workflows</h3>
                <span className="text-[11px] text-muted">({comfy.workflows.length})</span>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {comfy.workflows.map((wf) => {
                  let modelCount = 0;
                  try { modelCount = extractRequiredModels(JSON.parse(wf.json)).length; } catch {}
                  return (
                    <div key={wf.id} className="card p-4 flex flex-col justify-between border border-border bg-surface/80">
                      <div>
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <h4 className="font-bold text-sm text-text truncate">{wf.name}</h4>
                          <button type="button" className="btn-ghost px-1.5 py-1 text-rose-400 shrink-0" title="Delete" onClick={() => comfy.deleteWorkflow(wf.id)}><Trash2 size={13} /></button>
                        </div>
                        <p className="text-xs text-muted leading-relaxed mb-3 line-clamp-2">{wf.description || "Imported workflow"}</p>
                        <div className="text-[10px] text-muted-more bg-surface2/40 px-2.5 py-1.5 rounded-lg border border-border/20 mb-3">
                          Requires <strong>{modelCount}</strong> model{modelCount === 1 ? "" : "s"}
                        </div>
                      </div>
                      <button type="button" className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-1.5 font-bold" onClick={() => useWorkflow(wf.id)}>
                        <Send size={13} /> Use in ComfyUI
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Featured Carousel (CSS Snap) */}
          <div className="w-full overflow-x-auto snap-x snap-mandatory flex gap-4 pb-4 hidden-scrollbar mt-4">
            {featuredWorkflows.map((wf) => (
              <Link
                href={`/studio/comfy/${wf.shareId}`}
                key={`feat-${wf.shareId}`}
                className="relative snap-center shrink-0 w-full lg:w-[80%] xl:w-[70%] h-[300px] md:h-[400px] lg:h-[450px] rounded-[2rem] overflow-hidden group border border-border/40 hover:border-primary/50 transition-colors bg-surface/50"
              >
                {wf.thumbnails?.[0] ? (
                  wf.thumbnailVariant === "video" ? (
                    <video src={wf.thumbnails[0]} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                  ) : (
                    <img src={wf.thumbnails[0]} alt={wf.title} className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="w-full h-full bg-surface2/50 flex items-center justify-center">No Cover</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-bold text-white uppercase tracking-wider">
                  Featured · Staff Pick
                </div>
                <div className="absolute bottom-6 left-6 right-6">
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-normal tracking-tight text-white mb-3 line-clamp-1 group-hover:text-primary-light transition-colors">{wf.title}</h2>
                  <div className="flex items-center gap-3">
                    {wf.creatorAvatarUrl && (
                      <img src={wf.creatorAvatarUrl} alt={wf.creatorDisplayName} className="w-6 h-6 rounded-full object-cover" />
                    )}
                    <span className="text-sm text-white/90 font-medium">{wf.creatorDisplayName}</span>
                    <div className="flex gap-2">
                      {wf.tags?.slice(0, 3).map(t => (
                        <span key={t} className="px-3 py-1 rounded-full bg-black/40 backdrop-blur text-xs text-white/80">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center py-8">
            <h1 className="text-3xl md:text-4xl font-normal text-text mb-2">558+ workflows across every model and category</h1>
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary">Browse Workflows</p>
          </div>

          {/* Categories Filter */}
          <div className="flex flex-wrap gap-2 justify-center border-b border-border/40 pb-6 mb-6">
            {categories.map((catName) => (
              <button
                key={catName}
                type="button"
                className={`px-4 py-2 rounded-2xl text-xs font-extrabold tracking-wider uppercase transition-all ${
                  filterCat === catName
                    ? "bg-primary text-primary-fg shadow-lg shadow-primary/20"
                    : "text-muted hover:text-text bg-surface2/40 hover:bg-surface2/80 border border-transparent hover:border-border"
                }`}
                onClick={() => setFilterCat(catName)}
              >
                {catName}
              </button>
            ))}
          </div>

          {/* Masonry-style Grid */}
          <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            {filteredWorkflows.map((tpl) => (
              <Link
                href={`/studio/comfy/${tpl.shareId}`}
                key={tpl.shareId}
                className="card flex flex-col overflow-hidden border border-border hover:border-primary/40 transition-colors bg-surface/80 group break-inside-avoid"
              >
                <div className="relative w-full aspect-video bg-surface2/30">
                  {tpl.thumbnails?.[0] ? (
                    tpl.thumbnailVariant === "video" ? (
                      <video src={tpl.thumbnails[0]} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                    ) : (
                      <img src={tpl.thumbnails[0]} alt={tpl.title} className="w-full h-full object-cover" loading="lazy" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted">No Cover</div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                </div>
                
                <div className="p-4 flex flex-col gap-3">
                  <h4 className="font-bold text-sm text-text leading-snug group-hover:text-primary transition-colors">{tpl.title}</h4>
                  
                  <div className="flex items-center gap-2">
                    {tpl.creatorAvatarUrl && (
                      <img src={tpl.creatorAvatarUrl} alt={tpl.creatorDisplayName} className="w-5 h-5 rounded-full object-cover" />
                    )}
                    <span className="text-xs text-muted-more font-medium truncate">{tpl.creatorDisplayName}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {tpl.tags?.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase bg-surface2 text-muted">
                        {tag}
                      </span>
                    ))}
                    {tpl.tags?.length > 3 && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase bg-surface2 text-muted">
                        +{tpl.tags.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
    </Page>
  );
}
