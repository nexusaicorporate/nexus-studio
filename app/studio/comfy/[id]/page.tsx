"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Page from "@/components/Page";
import { NEW_HUB_WORKFLOWS, HubWorkflow } from "@/lib/data/comfy-hub-data";
import { useComfyStore } from "@/lib/store/comfy";
import { ArrowLeft, Play, Download, Calendar, Users, Cpu, FileCode, CheckCircle2, Copy } from "lucide-react";
import Link from "next/link";

export default function ComfyWorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const comfy = useComfyStore();
  
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [workflow, setWorkflow] = useState<HubWorkflow | null>(null);

  useEffect(() => {
    if (id) {
      const found = NEW_HUB_WORKFLOWS.find(w => w.shareId === id);
      if (found) setWorkflow(found);
    }
  }, [id]);

  if (!workflow) {
    return (
      <Page title="Loading Workflow..." subtitle="">
        <div className="flex items-center justify-center h-64 text-muted">
          <div className="animate-pulse">Loading...</div>
        </div>
      </Page>
    );
  }

  const handleImport = () => {
    // For now we mock the JSON since we don't have the actual workflow JSON from comfy.org
    // The user just wanted the hub visually there for now.
    comfy.addWorkflow({
      id: workflow.shareId,
      name: workflow.title,
      description: workflow.description,
      json: JSON.stringify({ "nodes": "placeholder for " + workflow.title }),
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    router.push(`/studio/workflow?template=${workflow.shareId}`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Navbar area */}
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/studio/comfy" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
          <ArrowLeft size={16} />
          <span className="text-sm font-semibold tracking-wide">Back to Hub</span>
        </Link>
        <button
          onClick={handleImport}
          className="bg-[#2D8CFF] hover:bg-[#2575D8] text-white px-5 py-2 rounded-xl text-sm font-bold tracking-wide transition-colors flex items-center gap-2"
        >
          <Play size={14} className="fill-white" />
          Run Workflow
        </button>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-[1fr_350px] gap-8">
          
          {/* Main Content (Left) */}
          <div className="space-y-6">
            {/* Media Player */}
            <div className="relative w-full rounded-2xl overflow-hidden bg-surface2/30 border border-white/10 aspect-video flex items-center justify-center">
              {workflow.thumbnails?.[0] ? (
                workflow.thumbnailVariant === "video" || workflow.thumbnails[0].endsWith(".mp4") ? (
                  <video src={workflow.thumbnails[0]} className="w-full h-full object-cover" autoPlay controls muted loop playsInline />
                ) : (
                  <img src={workflow.thumbnails[0]} alt={workflow.title} className="w-full h-full object-contain" />
                )
              ) : (
                <div className="text-muted">No Media Provided</div>
              )}
            </div>

            {/* Title & Desc */}
            <div className="space-y-4 pt-4 border-b border-white/10 pb-8">
              <div className="flex flex-wrap gap-2 mb-2">
                {workflow.tags?.map(t => (
                  <span key={t} className="px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-white/80">
                    {t}
                  </span>
                ))}
              </div>
              <h1 className="text-3xl md:text-5xl font-normal tracking-tight text-white leading-tight">
                {workflow.title}
              </h1>
              <p className="text-white/70 text-base md:text-lg leading-relaxed whitespace-pre-wrap">
                {workflow.description}
              </p>
            </div>

            {/* Author Section */}
            <div className="flex items-center gap-4 py-4">
              {workflow.creatorAvatarUrl ? (
                <img src={workflow.creatorAvatarUrl} alt={workflow.creatorDisplayName} className="w-14 h-14 rounded-full object-cover border-2 border-white/10" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                  <Users size={24} className="text-white/50" />
                </div>
              )}
              <div>
                <div className="text-sm text-white/50 font-medium uppercase tracking-wider mb-1">Created By</div>
                <div className="text-xl font-semibold text-white">{workflow.creatorDisplayName}</div>
              </div>
            </div>
          </div>

          {/* Sidebar (Right) */}
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
              
              <div>
                <div className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-2 flex items-center gap-2">
                  <Calendar size={14} /> Date Added
                </div>
                <div className="text-sm font-medium text-white/90">
                  {new Date(workflow.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              <div>
                <div className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-2 flex items-center gap-2">
                  <Users size={14} /> Runs
                </div>
                <div className="text-sm font-medium text-white/90">
                  {workflow.usage?.toLocaleString() || "0"} times
                </div>
              </div>

              {workflow.models && workflow.models.length > 0 && (
                <div>
                  <div className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                    <Cpu size={14} /> Required Models
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {workflow.models.map(m => (
                      <div key={m} className="px-3 py-1.5 bg-white/10 border border-white/5 rounded-lg text-xs font-medium text-white/80">
                        {m}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-white/10 space-y-3">
                <button
                  onClick={handleImport}
                  className="w-full bg-white hover:bg-white/90 text-black px-4 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Play size={16} className="fill-black" /> Use in Studio
                </button>
                <button
                  className="w-full bg-white/10 hover:bg-white/15 text-white px-4 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={16} /> Download JSON
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
