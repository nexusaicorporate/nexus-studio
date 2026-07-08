"use client";
import React, { useState } from "react";
import { ImagePlus, X, Search, FileImage } from "lucide-react";
import { useLibrary } from "@/lib/store/library";
import { Modal, Field } from "@/components/ui";
import { AssetPicker } from "@/components/AssetPicker";

export function MultiRefPicker({
  max = 8,
  refs,
  onChange
}: {
  max?: number;
  refs: string[];
  onChange: (refs: string[]) => void;
}) {
  const library = useLibrary();
  const [showIngModal, setShowIngModal] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  function pickIngredient(url: string) {
    if (!url) return;
    onChange([...refs, url]);
    setShowIngModal(false);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {refs.map((img, i) => (
          <div key={i} className="relative group">
            <div className="block w-full aspect-square rounded-lg border border-border overflow-hidden">
              <img src={img} className="w-full h-full object-cover" alt="" />
            </div>
            <button
              type="button"
              className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
              onClick={() => onChange(refs.filter((_, idx) => idx !== i))}
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {refs.length < max && (
          <div className="flex flex-col gap-1 w-full aspect-square">
            <button
              type="button"
              className="flex-1 rounded-lg border border-dashed border-border flex flex-col items-center justify-center cursor-pointer text-muted hover:text-text bg-surface/50 hover:bg-surface2 transition-colors"
              onClick={() => setShowAssetPicker(true)}
            >
              <ImagePlus size={16} className="mb-1" />
              <span className="text-[10px]">Upload</span>
            </button>
            <button
              type="button"
              className="flex-1 rounded-lg border border-dashed border-border flex flex-col items-center justify-center cursor-pointer text-muted hover:text-text bg-surface/50 hover:bg-surface2 transition-colors"
              onClick={() => setShowIngModal(true)}
            >
              <Search size={16} className="mb-1" />
              <span className="text-[10px]">Library</span>
            </button>
          </div>
        )}
      </div>

      <Modal open={showIngModal} onClose={() => setShowIngModal(false)} title="Select from Ingredients">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[50vh] overflow-y-auto p-1">
          {library.ingredients.filter(i => i.mediaUrl).length === 0 && (
            <div className="col-span-full text-center text-muted py-6 text-sm">
              No ingredients with images found.
            </div>
          )}
          {library.ingredients.filter(i => i.mediaUrl).map(ing => (
            <button
              key={ing.id}
              className="relative aspect-square rounded-lg border border-border overflow-hidden hover:opacity-80 group text-left"
              onClick={() => pickIngredient(ing.mediaUrl!)}
            >
              <img src={ing.mediaUrl} className="w-full h-full object-cover" alt={ing.name} />
              <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 text-[10px] text-white truncate">
                {ing.name}
              </div>
            </button>
          ))}
        </div>
      </Modal>

      <AssetPicker
        open={showAssetPicker}
        onClose={() => setShowAssetPicker(false)}
        onSelect={(url) => onChange([...refs, url])}
      />
    </div>
  );
}
