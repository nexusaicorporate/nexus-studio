"use client";

import { useState, useEffect } from "react";
import Page from "@/components/Page";
import { 
  Plus, Film, ChevronLeft, GripVertical, Trash2, Clapperboard, 
  Clock, Sparkles, Loader2, Play, Download, Settings, RefreshCw,
  Image as ImageIcon, Video, User, Volume2, Boxes, MessageSquare, Menu, LayoutGrid, SquarePlay, FileVideo2, PlaySquare, Bot, Wand2, History, Link, FileAudio, Scissors, ArrowRight, Search, Upload, Maximize, Crop, Beaker, FileBadge, Mic, FileVideo, Check
} from "lucide-react";
import { DirectorBrain } from "@/lib/services/director-brain";
import { useCinema } from "@/lib/store/cinema";
import { useLibrary, newId } from "@/lib/store/library";
import { useSettings } from "@/lib/store/settings";
import { chat, generateVideo } from "@/lib/providers";
import { characterPrompt } from "@/lib/character";
import { modelsFor } from "@/lib/model-catalog";
import type { CinemaProject, CinemaScene, PromptItem, Character, Ingredient } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import { canUseFeature, canUseModel } from "@/lib/entitlements";
import UpgradePrompt from "@/components/UpgradePrompt";
import { Toggle } from "@/components/ui";

export default function CinemaStudio() {
  const { projects, loaded, load, saveProject, deleteProject } = useCinema();
  const library = useLibrary();
  const settings = useSettings();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const { plan } = useAuth();

  useEffect(() => {
    if (!loaded) load();
    if (!library.loaded) library.load();
  }, [loaded, load, library]);

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

  if (!canUseFeature(plan ?? "free", "cinema")) {
    return (
      <Page title="Cinema Studio" subtitle="Storyboard, assemble, and render multi-scene movies.">
        <div className="py-20 flex flex-col items-center justify-center">
          <UpgradePrompt title="Studio Feature" message="The Cinema Studio is for professional multi-scene movie creation and requires the Studio subscription." planNeeded="Studio" />
        </div>
      </Page>
    );
  }

  if (activeProject) {
    return (
      <CinemaWorkspace 
        project={activeProject} 
        onBack={() => setActiveProjectId(null)} 
        saveProject={saveProject}
        library={library}
        settings={settings}
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#0f0f0f] text-white overflow-y-auto fade-in">
      <div className="flex-1 max-w-[1400px] mx-auto w-full px-8 py-16 flex flex-col justify-center min-h-[60vh]">
        <h1 className="text-6xl md:text-8xl font-black mb-4 tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/70">
          Your face, your voice,<br />your story.
        </h1>
        <p className="text-xl text-white/60 max-w-2xl mb-12 font-medium">
          Create an avatar (experimental feature) to star in any videos and take your storytelling to a whole new level.
        </p>
        
        <div>
          <button 
            onClick={createProject}
            className="bg-white text-black hover:bg-white/90 px-8 py-4 rounded-full font-bold text-lg inline-flex items-center gap-2 transition-transform hover:scale-105"
          >
            <Plus size={20} /> New project
          </button>
        </div>
      </div>

      <div className="w-full max-w-[1400px] mx-auto px-8 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <History className="text-white/40" size={20} />
          <h2 className="text-lg font-bold text-white/80">Recent Projects</h2>
        </div>
        
        {projects.length === 0 ? (
          <div className="flex items-center justify-center h-48 border border-white/10 rounded-3xl bg-white/5 border-dashed">
            <span className="text-white/30 font-medium">No projects yet. Create one to begin.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {projects.sort((a,b) => b.updatedAt - a.updatedAt).map(p => (
              <div 
                key={p.id} 
                onClick={() => setActiveProjectId(p.id)}
                className="group relative aspect-video bg-white/5 border border-white/10 hover:border-white/30 rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:shadow-black/50"
              >
                {p.scenes.length > 0 && p.scenes[0].videoUrl ? (
                  <video src={p.scenes[0].videoUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" muted loop playsInline />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-500/10">
                    <Film size={32} className="text-white/20 group-hover:text-white/40 transition-colors" />
                  </div>
                )}
                
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                  <h3 className="font-bold text-white truncate drop-shadow-md">{p.title}</h3>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-white/60 font-medium">{new Date(p.updatedAt).toLocaleDateString()}</p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}
                      className="p-1.5 rounded-full hover:bg-rose-500/20 text-white/40 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// WORKSPACE COMPONENT
// ----------------------------------------------------------------------
function CinemaWorkspace({ project, onBack, saveProject, library, settings }: { project: CinemaProject, onBack: () => void, saveProject: (p: CinemaProject) => void, library: any, settings: any }) {
  const [activeTab, setActiveTab] = useState<"editor" | "images" | "videos" | "characters" | "voices" | "assets" | "scenes">("editor");
  const { plan } = useAuth();

  // AI Director State
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Media Settings State (Right Drop-up)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [generateMode, setGenerateMode] = useState<"video" | "image" | "audio">("video");
  const [modifierMode, setModifierMode] = useState<"frames" | "assets">("assets");
  const [ltxDirector, setLtxDirector] = useState(true);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [multiplier, setMultiplier] = useState("x2");
  const [duration, setDuration] = useState("8s");
  const [selectedModelId, setSelectedModelId] = useState("ltx-2.3");
  const [agentActive, setAgentActive] = useState(true);

  // Asset Picker State (Left Drop-up)
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [assetPickerTab, setAssetPickerTab] = useState<"all" | "images" | "videos" | "voices" | "characters" | "avatar" | "uploads" | "ingredients" | "recipes">("all");
  const [previewAsset, setPreviewAsset] = useState<any>(null);

  // Added Assets & Mention State
  const [addedAssets, setAddedAssets] = useState<any[]>([]);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  
  // Timeline State
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(project.scenes[0]?.id || null);

  const TABS = [
    { id: "editor", label: "Cinema", icon: Clapperboard },
    { id: "images", label: "Images", icon: ImageIcon },
    { id: "videos", label: "Videos", icon: FileVideo2 },
    { id: "characters", label: "Characters", icon: User },
    { id: "voices", label: "Voices", icon: Volume2 },
    { id: "scenes", label: "Scenes", icon: Film },
  ] as const;

  function addMediaToTimeline(media: PromptItem) {
    const scene: CinemaScene = {
      id: newId(),
      order: project.scenes.length,
      prompt: media.title || "Library Media",
      characterIds: [],
      ingredientIds: [],
      videoUrl: media.mediaType === "video" || media.mediaType === "audio" ? media.cover : undefined,
    };
    saveProject({ ...project, scenes: [...project.scenes, scene], updatedAt: Date.now() });
    setSelectedSceneId(scene.id);
  }

  async function generateSceneFromPrompt() {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    
    // 1. Send input to the Director Brain
    const expandedPrompt = DirectorBrain.expandPrompt({
      prompt: aiPrompt,
      addedAssets: addedAssets,
      generateMode: generateMode,
      targetModel: selectedModelId,
    });

    const sceneId = newId();
    const scene: CinemaScene = {
      id: sceneId,
      order: project.scenes.length,
      prompt: expandedPrompt,
      characterIds: addedAssets.filter(a => a.category === "Characters").map(a => a.id),
      ingredientIds: addedAssets.filter(a => a.category === "Environment" || a.value).map(a => a.id),
      mediaType: generateMode,
    };
    
    saveProject({ ...project, scenes: [...project.scenes, scene], updatedAt: Date.now() });
    setSelectedSceneId(sceneId);
    setAiPrompt("");
    setAddedAssets([]);
    
    // Switch to Editor to see the timeline right away
    setActiveTab("editor");
    
    // Simulate generation for now
    setTimeout(() => {
      setIsGenerating(false);
    }, 1500);
  }

  function handlePromptChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setAiPrompt(val);

    const lastWord = val.split(" ").pop();
    if (lastWord && lastWord.startsWith("@")) {
      setShowMentionMenu(true);
      setMentionQuery(lastWord.substring(1).toLowerCase());
    } else {
      setShowMentionMenu(false);
    }
  }

  function insertMention(asset: any) {
    const words = aiPrompt.split(" ");
    words.pop(); // remove the @query
    const newPrompt = [...words, `@${asset.name || asset.title || "Asset"}`].join(" ") + " ";
    setAiPrompt(newPrompt);
    setShowMentionMenu(false);
    document.getElementById("director-chat")?.focus();
  }

  const activeScene = project.scenes.find(s => s.id === selectedSceneId);

  const filteredLibraryAssets = (() => {
    let items: any[] = [];
    if (["all", "images", "videos", "voices"].includes(assetPickerTab)) {
      items = [...items, ...library.prompts, ...library.assets];
    }
    if (["all", "characters"].includes(assetPickerTab)) {
      items = [...items, ...library.characters];
    }
    if (["all", "ingredients"].includes(assetPickerTab)) {
      items = [...items, ...library.ingredients];
    }
    if (["all", "recipes"].includes(assetPickerTab)) {
      items = [...items, ...library.recipes];
    }
    
    if (assetPickerTab === "images") items = items.filter(i => i.mediaType === "image" || i.kind === "image");
    if (assetPickerTab === "videos") items = items.filter(i => i.mediaType === "video" || i.kind === "video");
    if (assetPickerTab === "voices") items = items.filter(i => i.mediaType === "audio" || i.kind === "audio");
    
    return items;
  })();

  return (
    <div className="w-full h-full flex flex-col bg-[#141414] text-white overflow-hidden font-sans fade-in relative">
      
      {/* Top Header */}
      <div className="h-14 border-b border-white/10 shrink-0 flex items-center justify-between px-4 bg-[#0a0a0a]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
            <ChevronLeft size={18} />
          </button>
          <input 
            className="bg-transparent border-none outline-none font-bold text-lg w-64 focus:ring-0 placeholder-white/30" 
            value={project.title} 
            onChange={e => saveProject({...project, title: e.target.value})}
            placeholder="Untitled Project"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-1.5 rounded bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors flex items-center gap-2">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar - Menu */}
        <div className="w-48 border-r border-white/10 shrink-0 flex flex-col bg-[#0a0a0a] py-4">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 px-6 py-3 w-full text-left transition-colors ${activeTab === tab.id ? "bg-white/10 text-white font-medium border-l-2 border-white" : "text-white/60 hover:text-white hover:bg-white/5 border-l-2 border-transparent"}`}
            >
              <tab.icon size={18} className={activeTab === tab.id ? "text-white" : "opacity-70"} />
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Dynamic Center/Right Area */}
        {activeTab === "editor" ? (
          // Editor View
          <div className="flex-1 flex flex-col overflow-hidden bg-[#141414] relative items-center justify-center">
             <div className="text-center mb-48">
                <Clapperboard size={48} className="mx-auto mb-4 text-white/20" />
                <h2 className="text-2xl font-bold mb-2">Cinema</h2>
                <p className="text-white/40 max-w-sm">Stitch your scenes, audio tracks, and assets together onto a multi-track timeline.</p>
             </div>
             
             {/* Timeline UI */}
             <div className="absolute bottom-0 inset-x-0 h-64 border-t border-white/10 bg-[#0a0a0a] p-4 flex flex-col gap-2 overflow-y-auto">
                <div className="text-[10px] text-white/40 mb-2 font-mono flex gap-8">
                  <span>00:00:00</span>
                  <span>00:00:05</span>
                  <span>00:00:10</span>
                  <span>00:00:15</span>
                  <span>00:00:20</span>
                </div>
                
                {/* Video Track */}
                <div className="text-xs text-white/40 font-semibold mb-1">V1 (Video & Images)</div>
                <div className="h-14 bg-white/5 rounded-lg border border-white/10 relative overflow-hidden flex gap-1 p-1">
                   {project.scenes.filter(s => s.mediaType !== "audio").map((s,i) => (
                     <div key={s.id} 
                          onClick={() => setSelectedSceneId(s.id)}
                          className={`h-full w-40 rounded border ${selectedSceneId === s.id ? 'border-primary bg-primary/20' : 'border-white/10 bg-blue-500/20'} flex flex-col justify-center px-2 cursor-pointer hover:bg-blue-500/30 transition-colors`}>
                       <div className="text-[10px] font-bold truncate flex items-center gap-1">
                         {s.mediaType === "image" ? <ImageIcon size={10}/> : <Film size={10}/>} 
                         Scene {i+1}
                       </div>
                       <div className="text-[9px] text-white/60 truncate">{s.prompt.substring(0, 30)}...</div>
                     </div>
                   ))}
                   {project.scenes.filter(s => s.mediaType !== "audio").length === 0 && (
                     <div className="text-[10px] text-white/20 my-auto ml-2">Drag or generate video/image clips here...</div>
                   )}
                </div>

                {/* Audio Track */}
                <div className="text-xs text-white/40 font-semibold mt-2 mb-1">A1 (Audio & Voices)</div>
                <div className="h-14 bg-white/5 rounded-lg border border-white/10 relative overflow-hidden flex gap-1 p-1">
                   {project.scenes.filter(s => s.mediaType === "audio").map((s,i) => (
                     <div key={s.id} 
                          onClick={() => setSelectedSceneId(s.id)}
                          className={`h-full w-48 rounded border ${selectedSceneId === s.id ? 'border-primary bg-primary/20' : 'border-emerald-500/30 bg-emerald-500/10'} flex flex-col justify-center px-2 cursor-pointer hover:bg-emerald-500/20 transition-colors`}>
                       <div className="text-[10px] font-bold text-emerald-400 truncate flex items-center gap-1">
                         <Volume2 size={10}/> Audio Track {i+1}
                       </div>
                       <div className="text-[9px] text-white/60 truncate">{s.prompt.substring(0, 30)}...</div>
                     </div>
                   ))}
                   {project.scenes.filter(s => s.mediaType === "audio").length === 0 && (
                     <div className="text-[10px] text-white/20 my-auto ml-2">Drag or generate audio clips here...</div>
                   )}
                </div>
             </div>
          </div>
        ) : (
          <>
            {/* Center Panel - Asset Grid */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#141414]">
              <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
                <h3 className="font-semibold text-lg capitalize">{activeTab}</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  
                  {activeTab === "images" && library.prompts.filter((p: any) => p.mediaType === "image" && p.cover).map((p: any) => (
                    <AssetCard key={p.id} item={p} onAdd={() => addMediaToTimeline(p)} />
                  ))}
                  
                  {activeTab === "videos" && library.prompts.filter((p: any) => p.mediaType === "video" && p.cover).map((p: any) => (
                    <AssetCard key={p.id} item={p} onAdd={() => addMediaToTimeline(p)} />
                  ))}
                  
                  {activeTab === "characters" && library.characters.map((c: any) => (
                    <div key={c.id} className="group relative aspect-[3/4] bg-surface2 rounded-xl overflow-hidden border border-white/10">
                       <img src={c.refImages[0] || "/images/placeholder_avatar.jpg"} className="w-full h-full object-cover" />
                       <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                         <div className="font-bold text-sm truncate">{c.name}</div>
                       </div>
                       <button className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-white text-white hover:text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm">
                         <Plus size={16} />
                       </button>
                    </div>
                  ))}

                  {activeTab === "voices" && library.prompts.filter((p: any) => p.mediaType === "audio" && p.cover).map((p: any) => (
                    <div key={p.id} className="group relative bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col items-center justify-center gap-3">
                       <FileAudio size={24} className="text-emerald-400" />
                       <div className="text-xs text-center font-medium truncate w-full">{p.title}</div>
                       <button 
                         onClick={() => addMediaToTimeline(p)}
                         className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-white text-white hover:text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                       >
                         <Plus size={12} />
                       </button>
                    </div>
                  ))}

                  {activeTab === "assets" && library.ingredients.map((i: any) => (
                    <div key={i.id} className="group relative bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col items-center justify-center gap-2">
                       <Boxes size={24} className="text-purple-400" />
                       <div className="text-xs text-center font-medium truncate w-full">{i.name}</div>
                       <button className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-white text-white hover:text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm">
                         <Plus size={12} />
                       </button>
                    </div>
                  ))}

                  {activeTab === "scenes" && project.scenes.map((s, idx) => (
                    <div key={s.id} onClick={() => setSelectedSceneId(s.id)} className={`group relative aspect-video rounded-xl overflow-hidden border cursor-pointer ${selectedSceneId === s.id ? "border-primary" : "border-white/10"}`}>
                       {s.videoUrl ? <video src={s.videoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-black flex items-center justify-center"><Clapperboard size={20} className="text-white/20"/></div>}
                       <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] text-white/80">Scene {idx+1}</div>
                    </div>
                  ))}
                  
                </div>
              </div>
            </div>

            {/* Right Panel - Video Player */}
            <div className="w-[45%] border-l border-white/10 flex flex-col bg-[#0a0a0a] shrink-0">
              <div className="flex-1 p-6 flex flex-col items-center justify-center relative">
                <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 relative flex items-center justify-center">
                  {activeScene && activeScene.videoUrl ? (
                    <video src={activeScene.videoUrl} className="w-full h-full object-contain" controls autoPlay loop />
                  ) : activeScene ? (
                    <div className="text-center">
                      <PlaySquare size={48} className="mx-auto mb-4 text-white/20" />
                      <p className="text-white/40 font-medium">Ready to Render</p>
                      <p className="text-white/20 text-sm mt-1 max-w-xs px-4 truncate">{activeScene.prompt}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Clapperboard size={48} className="mx-auto mb-4 text-white/20" />
                      <p className="text-white/40 font-medium">No Scene Selected</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="h-16 border-t border-white/5 flex items-center justify-between px-6 bg-[#0a0a0a]">
                 <div className="flex gap-4">
                    <button className="text-white/60 hover:text-white"><Play size={20}/></button>
                 </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Panel - Timeline & Director Chat */}
      <div className="h-64 border-t border-white/10 flex flex-col bg-[#0f0f0f] shrink-0">
        
        {/* Timeline Strip */}
        <div className="flex-1 p-4 overflow-x-auto flex items-center gap-2 scrollbar-thin">
          {project.scenes.map((scene, i) => (
            <div 
              key={scene.id}
              onClick={() => setSelectedSceneId(scene.id)}
              className={`shrink-0 w-40 h-24 rounded-lg overflow-hidden relative cursor-pointer border-2 transition-colors ${selectedSceneId === scene.id ? "border-primary shadow-[0_0_15px_rgba(var(--color-primary),0.3)]" : "border-white/10 hover:border-white/30"}`}
            >
              {scene.videoUrl ? (
                 <video src={scene.videoUrl} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/5 flex items-center justify-center p-2 text-center">
                  <p className="text-[10px] text-white/50 line-clamp-3 leading-tight">{scene.prompt}</p>
                </div>
              )}
              <div className="absolute top-1 left-1 bg-black/60 backdrop-blur px-1.5 py-0.5 rounded text-[9px] font-bold text-white/80">
                Scene {i + 1}
              </div>
            </div>
          ))}
          
          <div 
            onClick={() => document.getElementById("director-chat")?.focus()}
            className="shrink-0 w-24 h-24 rounded-lg border-2 border-dashed border-white/10 hover:border-white/30 hover:bg-white/5 cursor-pointer flex flex-col items-center justify-center text-white/40 transition-colors"
          >
            <Plus size={20} className="mb-1" />
            <span className="text-xs font-medium">Add</span>
          </div>
        </div>

        {/* AI Director Chatbar */}
        <div className="h-20 border-t border-white/5 flex items-center px-4 md:px-8 bg-[#0a0a0a] relative">
          
          {/* LEFT DROP-UP: Asset Picker */}
          {showAssetPicker && (
            <div className="absolute bottom-[88px] left-8 w-[800px] h-[400px] bg-gradient-to-b from-[#2c2c2c] to-[#161616] border border-black shadow-[inset_0_2px_3px_rgba(255,255,255,0.2),inset_0_-4px_10px_rgba(0,0,0,0.8),0_20px_50px_rgba(0,0,0,0.9)] rounded-2xl flex overflow-hidden animate-in slide-in-from-bottom-2 fade-in z-50">
               <div className="w-40 border-r border-black/80 shadow-[1px_0_0_rgba(255,255,255,0.05)] flex flex-col bg-[#111]/50">
                 <div className="p-3 border-b border-black/80 shadow-[0_1px_0_rgba(255,255,255,0.05)] text-xs font-semibold text-white/50 flex items-center justify-between">
                    <span>Jun 1...</span> <ChevronLeft size={14} className="-rotate-90"/>
                 </div>
                 <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-1 px-2">
                   {[
                     { id: "all", label: "All", icon: LayoutGrid },
                     { id: "images", label: "Images", icon: ImageIcon },
                     { id: "videos", label: "Videos", icon: FileVideo2 },
                     { id: "voices", label: "Voices", icon: Volume2 },
                     { id: "characters", label: "Characters", icon: User },
                     { id: "ingredients", label: "Ingredients", icon: Beaker },
                     { id: "recipes", label: "Recipes", icon: FileBadge },
                     { id: "uploads", label: "Uploads", icon: Upload },
                   ].map(tab => (
                     <button 
                       key={tab.id}
                       onClick={() => setAssetPickerTab(tab.id as any)}
                       className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${assetPickerTab === tab.id ? "bg-white/10 text-white font-semibold" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
                     >
                        <tab.icon size={14} className={assetPickerTab === tab.id ? "text-white" : "opacity-60"} /> {tab.label}
                     </button>
                   ))}
                 </div>
                 <div className="p-3 border-t border-white/10">
                    <button className="flex items-center gap-2 text-xs font-semibold text-white hover:text-primary transition-colors">
                      <Upload size={14} /> Upload media
                    </button>
                 </div>
               </div>
               
               <div className="flex-1 flex flex-col bg-[#1a1a1a]">
                 <div className="h-12 border-b border-white/10 flex items-center px-4 gap-2">
                   <div className="flex-1 bg-white/5 rounded-full px-3 py-1.5 flex items-center gap-2 border border-white/5 focus-within:border-white/20">
                     <Search size={14} className="text-white/40" />
                     <input className="bg-transparent border-none outline-none text-xs w-full" placeholder="Search assets" />
                   </div>
                   <button className="bg-white/5 hover:bg-white/10 rounded-full px-3 py-1.5 text-xs font-medium flex items-center gap-1">
                     Recent <ChevronLeft size={12} className="-rotate-90"/>
                   </button>
                 </div>
                 
                 <div className="flex-1 flex overflow-hidden">
                    <div className="w-1/2 border-r border-white/10 overflow-y-auto p-2 space-y-1">
                       {filteredLibraryAssets.map((item: any, idx: number) => {
                         const isSelected = previewAsset && ((previewAsset.id && previewAsset.id === item.id) || (previewAsset.title || previewAsset.name) === (item.title || item.name));
                         return (
                         <div 
                           key={item.id || item.title || item.name || idx} 
                           onClick={() => setPreviewAsset(item)}
                           className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer ${isSelected ? "bg-white/10" : "hover:bg-white/5"}`}
                         >
                           <img src={item.cover || item.url || item.refImages?.[0] || "/images/placeholder_avatar.jpg"} className="w-10 h-10 rounded-full object-cover shrink-0 bg-black" />
                           <div className="overflow-hidden">
                             <div className="text-xs font-medium text-white truncate">{item.title || item.name || item.prompt || "Asset"}</div>
                             <div className="text-[10px] text-white/40">{item.mediaType || item.kind || "Asset"}</div>
                           </div>
                         </div>
                       )})}
                       {filteredLibraryAssets.length === 0 && (
                         <div className="text-center text-xs text-white/40 mt-10">No assets found</div>
                       )}
                    </div>
                    <div className="w-1/2 p-4 flex flex-col justify-center gap-4">
                       <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-lg border border-white/10">
                          {previewAsset ? (
                            <img src={previewAsset.cover || previewAsset.url || previewAsset.refImages?.[0] || "/images/placeholder_avatar.jpg"} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-white/20">
                              <Boxes size={32} className="mb-2" />
                              <span className="text-xs font-medium">Select an asset</span>
                            </div>
                          )}
                       </div>
                       <button 
                         onClick={() => {
                           if (previewAsset) {
                             if (!addedAssets.includes(previewAsset)) {
                               setAddedAssets([...addedAssets, previewAsset]);
                             }
                           }
                           setShowAssetPicker(false);
                         }}
                         disabled={!previewAsset}
                         className="w-full bg-white text-black font-bold text-sm py-2 rounded-full hover:bg-white/90 disabled:opacity-50 transition-opacity"
                       >
                         Add to Prompt
                       </button>
                    </div>
                 </div>
               </div>
            </div>
          )}

          {/* RIGHT DROP-UP: Media Settings */}
          {showSettingsMenu && (
            <div className="absolute bottom-[88px] right-8 w-[340px] bg-gradient-to-b from-[#2c2c2c] to-[#161616] border border-black shadow-[inset_0_2px_3px_rgba(255,255,255,0.2),inset_0_-4px_10px_rgba(0,0,0,0.8),0_20px_50px_rgba(0,0,0,0.9)] rounded-2xl p-4 animate-in slide-in-from-bottom-2 fade-in z-50">
              
              {/* Image / Video / Audio toggle */}
              <div className="flex bg-black/40 rounded-xl p-1 mb-3">
                <button 
                  onClick={() => setGenerateMode("image")} 
                  className={`flex-1 text-sm py-2 rounded-lg flex items-center justify-center gap-1.5 ${generateMode === "image" ? "bg-[#2a2a2a] text-white font-medium" : "text-white/60 hover:text-white"}`}
                >
                  <ImageIcon size={14} /> Image
                </button>
                <button 
                  onClick={() => setGenerateMode("video")} 
                  className={`flex-1 text-sm py-2 rounded-lg flex items-center justify-center gap-1.5 ${generateMode === "video" ? "bg-[#f2f2f2] text-black font-bold" : "text-white/60 hover:text-white"}`}
                >
                  <PlaySquare size={14} /> Video
                </button>
                <button 
                  onClick={() => setGenerateMode("audio")} 
                  className={`flex-1 text-sm py-2 rounded-lg flex items-center justify-center gap-1.5 ${generateMode === "audio" ? "bg-[#2a2a2a] text-emerald-400 font-medium" : "text-emerald-400/60 hover:text-emerald-400"}`}
                >
                  <FileAudio size={14} /> Audio
                </button>
              </div>

              {/* Frames / Assets toggle */}
              <div className="flex bg-black/40 rounded-xl p-1 mb-3">
                <button 
                  onClick={() => setModifierMode("frames")} 
                  className={`flex-1 text-sm py-2 rounded-lg flex items-center justify-center gap-2 ${modifierMode === "frames" ? "bg-[#2a2a2a] text-white font-medium" : "text-white/60 hover:text-white"}`}
                >
                  <Maximize size={16} /> Frames
                </button>
                <button 
                  onClick={() => setModifierMode("assets")} 
                  className={`flex-1 text-sm py-2 rounded-lg flex items-center justify-center gap-2 ${modifierMode === "assets" ? "bg-[#f2f2f2] text-black font-bold" : "text-white/60 hover:text-white"}`}
                >
                  <Boxes size={16} /> Assets
                </button>
              </div>

              {/* Aspect Ratio Picker */}
              <div className="flex justify-between items-end bg-black/40 rounded-xl px-4 py-3 mb-3">
                 {[
                   { id: "16:9", icon: <div className="w-6 h-3 border-2 border-current rounded-sm"></div> },
                   { id: "4:3", icon: <div className="w-5 h-4 border-2 border-current rounded-sm"></div> },
                   { id: "1:1", icon: <div className="w-4 h-4 border-2 border-current rounded-sm"></div> },
                   { id: "3:4", icon: <div className="w-4 h-5 border-2 border-current rounded-sm"></div> },
                   { id: "9:16", icon: <div className="w-3 h-6 border-2 border-current rounded-sm"></div> },
                 ].map(ar => (
                   <button 
                     key={ar.id}
                     onClick={() => setAspectRatio(ar.id)}
                     className={`flex flex-col items-center gap-1.5 transition-colors ${aspectRatio === ar.id ? "text-white" : "text-white/40 hover:text-white/70"}`}
                   >
                     {ar.icon}
                     <span className={`text-[11px] ${aspectRatio === ar.id ? "font-bold" : "font-medium"}`}>{ar.id}</span>
                   </button>
                 ))}
              </div>

              {/* Multipliers */}
              <div className="flex bg-black/40 rounded-xl p-1 mb-3">
                {["1x", "x2", "x3", "x4"].map(m => (
                  <button 
                    key={m}
                    onClick={() => setMultiplier(m)} 
                    className={`flex-1 text-sm py-2 rounded-lg font-medium transition-colors ${multiplier === m ? "bg-[#3a3a3a] text-white" : "text-white/60 hover:text-white"}`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Model Dropdown */}
              {(() => {
                const activeId = generateMode === "video" ? settings.activeVideoProviderId : settings.activeImageProviderId;
                const activeProvider = settings.providers.find((p: any) => p.id === activeId);
                const providerModels = activeProvider?.models || [];
                return (
                  <select 
                    className="w-full bg-gradient-to-b from-[#2c2c2c] to-[#161616] border border-black shadow-[inset_0_2px_3px_rgba(255,255,255,0.2),inset_0_-4px_10px_rgba(0,0,0,0.8),0_20px_50px_rgba(0,0,0,0.9)] rounded-xl py-3 px-4 text-sm font-medium mb-3 outline-none"
                    value={selectedModelId}
                    onChange={(e) => setSelectedModelId(e.target.value)}
                  >
                    {generateMode === "audio" ? (
                      <option value="suno-v3.5">🎵 Suno v3.5</option>
                    ) : (
                      providerModels.map((m: string) => (
                        <option key={m} value={m}>{m}</option>
                      ))
                    )}
                  </select>
                );
              })()}

              {/* Duration (Video only) */}
              {generateMode === "video" && (
                <div className="flex bg-black/40 rounded-xl p-1 mb-4">
                  {["4s", "6s", "8s", "10s"].map(d => (
                    <button 
                      key={d}
                      onClick={() => setDuration(d)} 
                      className={`flex-1 text-sm py-2 rounded-lg font-medium transition-colors ${duration === d ? "bg-[#3a3a3a] text-white" : "text-white/60 hover:text-white"}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}

              {/* LTX Director Toggle */}
              {generateMode === "video" && (
                <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-2">
                  <div className="flex items-center gap-2">
                    <Link size={14} className={ltxDirector ? "text-primary" : "text-white/30"} />
                    <div>
                      <div className="text-xs font-semibold">Director Mode</div>
                      <div className="text-[9px] text-white/40">Starts clip using previous frame</div>
                    </div>
                  </div>
                  <Toggle checked={ltxDirector} onChange={setLtxDirector} />
                </div>
              )}
            </div>
          )}

          {/* The Main Chat Pill */}
          <div className="w-full max-w-4xl mx-auto flex flex-col gap-2 relative">
            
            {/* Added Assets Chips */}
            {addedAssets.length > 0 && (
              <div className="flex items-center gap-2 px-2 overflow-x-auto scrollbar-none">
                {addedAssets.map((a, i) => (
                   <div key={i} className="flex items-center gap-1.5 bg-white/10 border border-white/10 rounded-full pl-1 pr-3 py-1 shrink-0 text-xs text-white/80 animate-in slide-in-from-bottom-1 fade-in">
                      <img src={a.cover || a.url || a.refImages?.[0] || "/images/placeholder_avatar.jpg"} className="w-5 h-5 rounded-full object-cover bg-black" />
                      <span className="font-medium truncate max-w-[150px]">{a.title || a.name || a.prompt || "Asset"}</span>
                      <button onClick={() => setAddedAssets(addedAssets.filter(asset => asset !== a))} className="ml-1 text-white/40 hover:text-white">✕</button>
                   </div>
                ))}
              </div>
            )}

            {/* Mention Menu */}
            {showMentionMenu && addedAssets.length > 0 && (
              <div className="absolute bottom-[60px] left-12 w-64 bg-gradient-to-b from-[#2c2c2c] to-[#161616] border border-black shadow-[inset_0_2px_3px_rgba(255,255,255,0.2),inset_0_-4px_10px_rgba(0,0,0,0.8),0_20px_50px_rgba(0,0,0,0.9)] rounded-xl overflow-hidden animate-in slide-in-from-bottom-1 fade-in z-50">
                <div className="px-3 py-2 text-xs font-semibold text-white/50 border-b border-black/60 shadow-[0_1px_0_rgba(255,255,255,0.05)] bg-black/40">Insert Asset</div>
                <div className="max-h-48 overflow-y-auto p-1">
                  {addedAssets.filter(a => (a.title || a.name || a.prompt || "").toLowerCase().includes(mentionQuery)).map((a, i) => (
                    <button 
                      key={i}
                      onClick={() => insertMention(a)}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                    >
                      <img src={a.cover || a.url || a.refImages?.[0] || "/images/placeholder_avatar.jpg"} className="w-6 h-6 rounded-md object-cover bg-black shrink-0 shadow-sm" />
                      <span className="text-xs font-medium truncate text-white">{a.title || a.name || a.prompt || "Asset"}</span>
                    </button>
                  ))}
                  {addedAssets.filter(a => (a.title || a.name || a.prompt || "").toLowerCase().includes(mentionQuery)).length === 0 && (
                     <div className="p-3 text-xs text-white/40 text-center">No matching assets added</div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center bg-gradient-to-b from-[#333333] to-[#161616] rounded-[24px] border border-black shadow-[inset_0_2px_4px_rgba(255,255,255,0.25),inset_0_-3px_6px_rgba(0,0,0,0.6),0_15px_40px_rgba(0,0,0,0.9)] pl-2 pr-2 py-2">
              
              {/* Left Action Buttons */}
              <button 
                onClick={() => { setShowAssetPicker(!showAssetPicker); setShowSettingsMenu(false); }}
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${showAssetPicker ? "bg-white/20 text-white" : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"}`}
                title="Add Media / Ingredients"
              >
                 <Plus size={20} />
              </button>

              {/* Text Input */}
              <input 
                id="director-chat"
                className="flex-1 bg-transparent border-none outline-none px-4 h-12 text-[15px] placeholder-white/30"
                placeholder="What do you want to create?"
                value={aiPrompt}
                onChange={handlePromptChange}
                onKeyDown={e => e.key === "Enter" && generateSceneFromPrompt()}
              />
              
              {/* Right Settings Pill & Submit */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { setShowSettingsMenu(!showSettingsMenu); setShowAssetPicker(false); }}
                  className={`px-4 h-10 rounded-full text-xs font-medium flex items-center gap-2 transition-colors border ${showSettingsMenu ? "bg-white/15 border-white/30 text-white" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"}`}
                >
                  {generateMode === "audio" ? "Audio" : generateMode === "video" ? "Video" : "Image"} 
                  {generateMode === "video" && <> • {duration} <div className="w-3 h-2 border border-current rounded-sm ml-0.5"></div> {multiplier}</>}
                </button>
                
                <button 
                  onClick={generateSceneFromPrompt}
                  disabled={!aiPrompt.trim() && !isGenerating}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white text-white/60 hover:text-black flex items-center justify-center shrink-0 disabled:opacity-30 transition-all"
                >
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}

function AssetCard({ item, onAdd }: { item: PromptItem, onAdd: () => void }) {
  return (
    <div className="group relative aspect-video bg-surface2 rounded-xl overflow-hidden border border-white/10">
      {item.mediaType === "video" ? (
        <video src={item.cover} className="w-full h-full object-cover" loop muted playsInline onMouseEnter={e => e.currentTarget.play()} onMouseLeave={e => e.currentTarget.pause()} />
      ) : (
        <img src={item.cover} className="w-full h-full object-cover" />
      )}
      
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <button 
          onClick={onAdd}
          className="w-10 h-10 rounded-full bg-white text-black hover:scale-110 flex items-center justify-center transition-transform shadow-xl"
        >
          <Plus size={20} />
        </button>
      </div>
      
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] text-white/80 max-w-[80%] truncate">
        {item.title}
      </div>
    </div>
  );
}
