import { Plus, Clapperboard, ImageIcon, Film, Volume2 } from 'lucide-react';
import type { CinemaProject, CinemaScene } from '@/lib/types';

interface CinemaTimelineProps {
  project: CinemaProject;
  selectedSceneId: string | null;
  onSelectScene: (id: string) => void;
  onAddScene: () => void;
}

export function CinemaTimeline({ project, selectedSceneId, onSelectScene, onAddScene }: CinemaTimelineProps) {
  const videoScenes = project.scenes.filter(s => s.mediaType !== "audio");
  const audioScenes = project.scenes.filter(s => s.mediaType === "audio");

  return (
    <div className="absolute bottom-0 inset-x-0 h-64 border-t border-white/10 bg-[#0a0a0a] p-4 flex flex-col gap-2 overflow-y-auto z-10">
      <div className="text-[10px] text-white/40 mb-2 font-mono flex gap-8 select-none">
        <span>00:00:00</span>
        <span>00:00:05</span>
        <span>00:00:10</span>
        <span>00:00:15</span>
        <span>00:00:20</span>
      </div>
      
      {/* Video Track */}
      <div className="text-xs text-white/40 font-semibold mb-1">V1 (Video & Images)</div>
      <div className="h-16 bg-white/5 rounded-lg border border-white/10 relative overflow-x-auto flex gap-1 p-1 scrollbar-thin">
        {videoScenes.map((s, i) => (
          <div key={s.id} 
               onClick={() => onSelectScene(s.id)}
               className={`shrink-0 h-full w-48 rounded border ${selectedSceneId === s.id ? 'border-primary bg-primary/20 shadow-[0_0_10px_rgba(var(--color-primary),0.3)]' : 'border-white/10 bg-blue-500/20 hover:bg-blue-500/30'} flex flex-col justify-center px-2 cursor-pointer transition-all`}>
            <div className="text-[10px] font-bold text-white truncate flex items-center gap-1">
              {s.mediaType === "image" ? <ImageIcon size={10}/> : <Film size={10}/>} 
              Scene {s.order + 1}
            </div>
            <div className="text-[9px] text-white/60 truncate mt-0.5">{s.prompt.substring(0, 40)}...</div>
          </div>
        ))}
        {videoScenes.length === 0 && (
          <div className="text-[10px] text-white/30 my-auto ml-2 flex items-center gap-2">
            <Clapperboard size={12} /> Drag or generate video/image clips here...
          </div>
        )}
      </div>

      {/* Audio Track */}
      <div className="text-xs text-white/40 font-semibold mt-2 mb-1">A1 (Audio & Voices)</div>
      <div className="h-16 bg-white/5 rounded-lg border border-white/10 relative overflow-x-auto flex gap-1 p-1 scrollbar-thin">
        {audioScenes.map((s, i) => (
          <div key={s.id} 
               onClick={() => onSelectScene(s.id)}
               className={`shrink-0 h-full w-56 rounded border ${selectedSceneId === s.id ? 'border-primary bg-primary/20 shadow-[0_0_10px_rgba(var(--color-primary),0.3)]' : 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20'} flex flex-col justify-center px-2 cursor-pointer transition-all`}>
            <div className="text-[10px] font-bold text-emerald-400 truncate flex items-center gap-1">
              <Volume2 size={10}/> Audio Track {i+1}
            </div>
            <div className="text-[9px] text-white/60 truncate mt-0.5">{s.prompt.substring(0, 40)}...</div>
          </div>
        ))}
        {audioScenes.length === 0 && (
          <div className="text-[10px] text-white/30 my-auto ml-2 flex items-center gap-2">
            <Volume2 size={12} /> Drag or generate audio clips here...
          </div>
        )}
      </div>
      
      {/* Add track button */}
      <div className="mt-2 text-center">
         <button onClick={onAddScene} className="text-[10px] text-white/30 hover:text-white flex items-center justify-center w-full gap-1 p-1 transition-colors">
            <Plus size={10} /> Add Track
         </button>
      </div>
    </div>
  );
}
