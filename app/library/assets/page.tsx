"use client";
import React from "react";
import Page from "@/components/Page";
import { useLibrary } from "@/lib/store/library";
import { Trash2, Video, Image as ImageIcon, Upload } from "lucide-react";

export default function AssetsPage() {
  const library = useLibrary();

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach((f) => {
      const isVideo = f.type.startsWith("video/");
      const r = new FileReader();
      r.onload = () => {
        const url = r.result as string;
        const newAsset = {
          id: Math.random().toString(36).substring(7),
          kind: (isVideo ? "video" : "image") as "video" | "image",
          url,
          prompt: "Uploaded manually",
          meta: { filename: f.name },
          createdAt: Date.now()
        };
        // Need to push carefully because of async FileReader loop, but simplest way:
        useLibrary.getState().set("assets", [...useLibrary.getState().assets, newAsset]);
      };
      r.readAsDataURL(f);
    });
  }

  function deleteAsset(id: string) {
    if (!confirm("Delete this asset?")) return;
    library.set("assets", library.assets.filter(a => a.id !== id));
  }

  return (
    <Page title="Assets Library" subtitle="Manage your uploaded and generated media across all gears">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">All Assets ({library.assets.length})</h2>
        <label className="btn-primary cursor-pointer flex items-center gap-2">
          <Upload size={16} />
          Upload Files
          <input type="file" accept="image/*,video/*" multiple hidden onChange={handleUpload} />
        </label>
      </div>

      {library.assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted">
          <ImageIcon size={48} className="mb-4 opacity-50" />
          <p>No assets saved yet. Upload images or videos to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...library.assets].sort((a,b) => b.createdAt - a.createdAt).map((asset) => (
            <div key={asset.id} className="relative aspect-square rounded-xl border border-border overflow-hidden group bg-surface">
              {asset.kind === "video" ? (
                <video src={asset.url} className="w-full h-full object-cover" loop muted autoPlay playsInline />
              ) : (
                <img src={asset.url} className="w-full h-full object-cover" />
              )}
              
              {/* Overlay controls */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                <div className="flex justify-between items-start">
                  <div className="bg-black/60 p-1.5 rounded-md">
                    {asset.kind === "video" ? <Video size={14} className="text-white" /> : <ImageIcon size={14} className="text-white" />}
                  </div>
                  <button 
                    onClick={() => deleteAsset(asset.id)}
                    className="p-1.5 bg-rose-500/80 hover:bg-rose-500 text-white rounded-md transition-colors"
                    title="Delete Asset"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="text-[10px] text-white/70 truncate px-1">
                  {new Date(asset.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
