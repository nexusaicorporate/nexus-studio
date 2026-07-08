"use client";
import React from "react";
import { Upload, Image as ImageIcon, Video } from "lucide-react";
import { useLibrary } from "@/lib/store/library";
import { Modal } from "@/components/ui";

export function AssetPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  const library = useLibrary();

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const isVideo = f.type.startsWith("video/");
    const r = new FileReader();
    r.onload = () => {
      const url = r.result as string;
      const newAsset = {
        id: Math.random().toString(36).substring(7),
        kind: (isVideo ? "video" : "image") as "video" | "image",
        url,
        prompt: "Uploaded via Asset Picker",
        meta: { filename: f.name },
        createdAt: Date.now()
      };
      library.set("assets", [...library.assets, newAsset]);
      onSelect(url);
    };
    r.readAsDataURL(f);
  }

  return (
    <Modal open={open} onClose={onClose} title="Select Asset">
      <div className="flex flex-col max-h-[60vh]">
        <div className="flex gap-4 mb-4">
          <label className="w-full rounded-xl border border-dashed border-border/50 flex flex-col items-center justify-center py-6 cursor-pointer hover:bg-surface2 transition-colors">
            <Upload size={20} className="mb-2 text-muted" />
            <span className="text-sm font-medium">Upload New Asset</span>
            <span className="text-xs text-muted mt-1">Images or Videos</span>
            <input type="file" accept="image/*,video/*" hidden onChange={handleUpload} />
          </label>
        </div>

        <div className="overflow-y-auto pr-1 grid grid-cols-3 sm:grid-cols-4 gap-3 pb-2">
          {library.assets.length === 0 ? (
            <div className="col-span-full py-8 text-center text-muted text-sm">No assets saved yet.</div>
          ) : (
            [...library.assets].sort((a,b) => b.createdAt - a.createdAt).map(asset => (
              <button 
                key={asset.id}
                onClick={() => {
                  onSelect(asset.url);
                  onClose();
                }}
                className="relative aspect-square rounded-lg border border-border/50 overflow-hidden hover:border-primary transition-all group"
              >
                {asset.kind === "video" ? (
                  <video src={asset.url} className="w-full h-full object-cover" />
                ) : (
                  <img src={asset.url} className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold px-2 py-1 bg-primary rounded-full">Select</span>
                </div>
                <div className="absolute top-1.5 left-1.5 bg-black/60 p-1 rounded">
                  {asset.kind === "video" ? <Video size={10} className="text-white" /> : <ImageIcon size={10} className="text-white" />}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
