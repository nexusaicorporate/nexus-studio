import { useState, useMemo } from 'react';
import type { CinemaProject, CinemaScene, LTXParams } from '@/lib/types';
import { DEFAULT_LTX_PARAMS } from '@/lib/types';
import { Download } from 'lucide-react';

interface ExportPanelProps {
  project: CinemaProject;
  onClose: () => void;
}

interface ExportItem {
  id: string;
  label: string;
  sceneIndex: number;
  scene: CinemaScene;
  hasImage: boolean;
  hasVideo: boolean;
  hasPrompt: boolean;
}

export function ExportPanel({ project, onClose }: ExportPanelProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'with_media' | 'ready'>('all');

  const items = useMemo(() => {
    if (!project) return [];

    const result: ExportItem[] = [];
    for (let si = 0; si < project.scenes.length; si++) {
      const scene = project.scenes[si];
      result.push({
        id: scene.id,
        label: `Scene ${si + 1}: ${scene.prompt.substring(0, 30)}...`,
        sceneIndex: si,
        scene,
        hasImage: scene.mediaType === "image" && !!scene.videoUrl, // Re-using videoUrl for image preview
        hasVideo: scene.mediaType === "video" && !!scene.videoUrl,
        hasPrompt: !!scene.prompt,
      });
    }
    return result;
  }, [project]);

  const filteredItems = useMemo(() => {
    let result = items;
    switch (filter) {
      case 'with_media':
        result = result.filter((i) => i.hasImage || i.hasVideo);
        break;
      case 'ready':
        result = result.filter((i) => i.hasPrompt);
        break;
    }
    return result;
  }, [items, filter]);

  const toggleItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredItems.map((i) => i.id)));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  const handleExport = async () => {
    if (!project) return;
    setExporting(true);

    const exportScenes = filteredItems
      .filter((item) => selectedIds.has(item.id))
      .map((item) => {
        return {
          prompt: item.scene.prompt,
          mediaPath: item.scene.videoUrl || null,
          mediaType: item.scene.mediaType,
          params: {
            ...DEFAULT_LTX_PARAMS,
            ...project.defaultParams,
            ...item.scene.params,
            output_filename: `scene_${item.sceneIndex + 1}_${item.id}`,
          },
        };
      });

    // Connect the frontend Export to the Director AI backend API directly
    try {
      const payload = {
        projectId: project.id,
        projectTitle: project.title,
        globalParams: project.defaultParams || DEFAULT_LTX_PARAMS,
        scenes: exportScenes,
      };

      const response = await fetch('http://localhost:3000/api/video/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Cinema Export: ${project.title || 'Untitled'}`,
          videoScript: JSON.stringify(payload), // Send the MasterJSON payload via videoScript
          projectType: 'ANIMATED_STORY',
          skipReview: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start generation on Director backend. Is the backend running?');
      }

      const data = await response.json();
      alert(`Generation started successfully on Director AI!\nRun ID: ${data.runId}`);
      onClose();
    } catch (e: any) {
      alert('Export failed: ' + e.message);
    }
    setExporting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 fade-in">
      <div className="bg-[#141414] border border-white/10 rounded-xl w-full max-w-[700px] max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Download className="text-white/60" size={20} />
            <h2 className="text-lg font-bold text-white">Export Queue (queue.zip)</h2>
          </div>
          <button
            className="text-white/40 hover:text-white transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {/* Filter + actions */}
        <div className="px-6 py-3 border-b border-white/5 flex items-center gap-3 flex-wrap">
          <div className="flex bg-white/5 rounded-lg p-1">
            {(['all', 'with_media', 'ready'] as const).map((f) => (
              <button
                key={f}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filter === f ? 'bg-primary text-white shadow' : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'with_media' ? 'Has Media' : 'Ready'}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <button className="text-xs font-medium text-white/60 hover:text-white px-2 py-1" onClick={selectAll}>
            Select All ({filteredItems.length})
          </button>
          <button className="text-xs font-medium text-white/60 hover:text-white px-2 py-1" onClick={selectNone}>
            Select None
          </button>
        </div>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 scrollbar-thin">
          {filteredItems.map((item) => (
            <label
              key={item.id}
              className={`flex items-center gap-4 px-4 py-3 rounded-lg border cursor-pointer transition-colors
                ${selectedIds.has(item.id) ? 'bg-primary/10 border-primary/50' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(item.id)}
                onChange={() => toggleItem(item.id)}
                className="rounded border-white/20 bg-black/50 text-primary focus:ring-primary focus:ring-offset-0"
              />
              <span className="flex-1 text-sm text-white/90 truncate font-medium">{item.label}</span>
              <div className="flex gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.hasImage ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-white/30'}`}>Image</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.hasVideo ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-white/30'}`}>Video</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.hasPrompt ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-white/30'}`}>Prompt</span>
              </div>
            </label>
          ))}

          {filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-white/30">
              <p className="text-sm font-medium">No scenes match the current filter</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-black/20">
          <span className="text-sm text-white/50 font-medium">
            {selectedIds.size} of {filteredItems.length} selected
          </span>
          <button
            className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={selectedIds.size === 0 || exporting}
            onClick={handleExport}
          >
            {exporting ? 'Building Payload...' : `Export MasterJSON for ${selectedIds.size} scenes`}
          </button>
        </div>
      </div>
    </div>
  );
}
