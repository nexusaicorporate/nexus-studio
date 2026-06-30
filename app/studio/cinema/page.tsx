"use client";

import { useState, useEffect } from "react";
import Page from "@/components/Page";
import { 
  Plus, Film, ChevronLeft, GripVertical, Trash2, Clapperboard, 
  Clock, Sparkles, Loader2, Play, Download, Settings, RefreshCw 
} from "lucide-react";
import { useCinema } from "@/lib/store/cinema";
import { useLibrary, newId } from "@/lib/store/library";
import { useSettings } from "@/lib/store/settings";
import { chat, generateVideo } from "@/lib/providers";
import { characterPrompt } from "@/lib/character";
import { modelsFor } from "@/lib/model-catalog";
import type { CinemaProject, CinemaScene } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import { canUseFeature } from "@/lib/entitlements";
import UpgradePrompt from "@/components/UpgradePrompt";
import { PromptDirector } from "@/components/prompt-director/PromptDirector";

export default function CinemaStudio() {
  const { projects, loaded, load, saveProject, deleteProject } = useCinema();
  const library = useLibrary();
  const settings = useSettings();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const { plan } = useAuth();

  // Screenwriter State
  const [movieIdea, setMovieIdea] = useState("");
  const [writingScript, setWritingScript] = useState(false);

  // Render State
  const [renderingSceneId, setRenderingSceneId] = useState<string | null>(null);
  const [renderPct, setRenderPct] = useState(0);
  const [renderStatus, setRenderStatus] = useState("");
  const [selectedModel, setSelectedModel] = useState("ltx-2.3");
  const [ltxDirector, setLtxDirector] = useState(true);

  // Concat State
  const [compilingMovie, setCompilingMovie] = useState(false);
  const [compiledMoviePath, setCompiledMoviePath] = useState<string | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  const activeProject = projects.find(p => p.id === activeProjectId);
  const videoModels = modelsFor("t2v");

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

  function saveScene(data: { prompt: string; templateId?: string; characterIds: string[]; ingredientIds: string[] }) {
    if (!activeProject) return;
    const scene: CinemaScene = {
      id: newId(),
      order: activeProject.scenes.length,
      prompt: data.prompt,
      templateId: data.templateId,
      characterIds: data.characterIds,
      ingredientIds: data.ingredientIds,
    };
    saveProject({ ...activeProject, scenes: [...activeProject.scenes, scene], updatedAt: Date.now() });
  }

  function deleteScene(sceneId: string) {
    if (!activeProject) return;
    const scenes = activeProject.scenes.filter(s => s.id !== sceneId).map((s, i) => ({ ...s, order: i }));
    saveProject({ ...activeProject, scenes, updatedAt: Date.now() });
  }

  // Screenplay generator using AI
  async function generateScreenplay() {
    if (!activeProject || !movieIdea.trim()) return;
    setWritingScript(true);
    try {
      const activeTextProvider = settings.providers.find((p) => p.id === settings.activeProviderId)!;
      const model = activeTextProvider?.selectedModel || "default";

      const out = await chat({
        provider: activeTextProvider,
        model,
        uncensored: settings.uncensored,
        system: "You are an elite AI movie screenwriter and storyboard artist. Analyze the user's movie idea and break it down into exactly 4 highly visual consecutive storyboard scenes. For each scene, output a detailed scene prompt describing characters, environment, lighting, camera actions, and motion. Your response MUST be a JSON object containing a 'scenes' array of objects with a 'prompt' string field. Do not include any markdown formatting, headers, or explanations. Only valid JSON.",
        messages: [{ id: "1", role: "user", content: movieIdea }],
      });

      if (!out) throw new Error("No response received from screenplay model.");

      let cleanText = out.trim();
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanText = cleanText.slice(firstBrace, lastBrace + 1);
      }

      const data = JSON.parse(cleanText);
      if (!data.scenes || !Array.isArray(data.scenes)) {
        throw new Error("Invalid screenplay structure returned by AI.");
      }

      const generatedScenes: CinemaScene[] = data.scenes.map((s: any, idx: number) => ({
        id: newId(),
        order: idx,
        prompt: s.prompt,
        characterIds: [],
        ingredientIds: [],
      }));

      saveProject({
        ...activeProject,
        scenes: generatedScenes,
        updatedAt: Date.now()
      });
      setMovieIdea("");
    } catch (e: any) {
      alert("Failed to write script: " + e.message);
    } finally {
      setWritingScript(false);
    }
  }

  // Render a specific scene video clip
  async function renderSceneVideo(scene: CinemaScene) {
    if (!activeProject) return;
    setRenderingSceneId(scene.id);
    setRenderPct(0);
    setRenderStatus("submitting");

    try {
      const videoProvider = settings.providers.find((p) => p.id === settings.activeVideoProviderId)!;
      if (!videoProvider) throw new Error("No active video provider configured.");

      // Compile final prompt with characters + ingredients
      let fullPrompt = scene.prompt;
      if (scene.characterIds.length > 0) {
        const resolvedChars = scene.characterIds
          .map((id) => library.characters.find((c) => c.id === id))
          .filter(Boolean);
        const charDescriptions = resolvedChars.map((c) => characterPrompt(c!)).join(", ");
        if (charDescriptions) {
          fullPrompt = `${charDescriptions}, ${fullPrompt}`;
        }
      }

      if (scene.ingredientIds.length > 0) {
        const resolvedIngs = scene.ingredientIds
          .map((id) => library.ingredients.find((i) => i.id === id))
          .filter(Boolean);
        const ingValues = resolvedIngs.map((i) => i!.value).join(", ");
        if (ingValues) {
          fullPrompt = `${fullPrompt}, ${ingValues}`;
        }
      }

      let prevFrameUrl: string | undefined = undefined;
      const idx = activeProject.scenes.findIndex(s => s.id === scene.id);
      if (ltxDirector && idx > 0) {
        const prevScene = activeProject.scenes[idx - 1];
        if (prevScene && prevScene.videoUrl) {
          setRenderStatus("capturing continuity frame");
          try {
            prevFrameUrl = await captureLastFrame(prevScene.videoUrl);
          } catch (err) {
            console.error("Failed to capture previous frame:", err);
          }
        }
      }

      const url = await generateVideo({
        provider: videoProvider,
        prompt: fullPrompt,
        mode: prevFrameUrl ? "i2v" : "t2v",
        model: selectedModel,
        image: prevFrameUrl,
        onProgress: (pct, status) => {
          setRenderPct(pct);
          setRenderStatus(status);
        },
      });

      // Update the scene object in store
      const updatedScenes = activeProject.scenes.map((s) => 
        s.id === scene.id ? { ...s, videoUrl: url } : s
      );

      saveProject({
        ...activeProject,
        scenes: updatedScenes,
        updatedAt: Date.now()
      });

      // Clear compiled path if scenes changed
      setCompiledMoviePath(null);
    } catch (e: any) {
      alert(`Render Scene failed: ${e.message}`);
    } finally {
      setRenderingSceneId(null);
    }
  }

  // Concatenate all rendered scenes using Tauri Rust bridge
  async function compileFinalMovie() {
    if (!activeProject) return;
    const videoUrls = activeProject.scenes.map(s => s.videoUrl).filter(Boolean) as string[];
    if (videoUrls.length !== activeProject.scenes.length) {
      alert("Please render all scenes before compiling the final movie.");
      return;
    }

    setCompilingMovie(true);
    setCompileError(null);
    setCompiledMoviePath(null);

    try {
      const tauri = (window as any).__TAURI__;
      if (!tauri?.core?.invoke) {
        throw new Error("Local movie compilation (FFmpeg) is only supported in the Desktop App wrapper. On the web, download the individual clips and stitch them in your editor of choice.");
      }

      const outputFilePath = await tauri.core.invoke("concat_videos", { videoUrls });
      setCompiledMoviePath(outputFilePath);
    } catch (e: any) {
      setCompileError(e.message || JSON.stringify(e));
    } finally {
      setCompilingMovie(false);
    }
  }

  if (activeProject) {
    const allRendered = activeProject.scenes.length > 0 && activeProject.scenes.every(s => s.videoUrl);

    return (
      <Page 
        title={
          <div className="flex items-center gap-2">
            <button className="btn-ghost px-2" onClick={() => { setActiveProjectId(null); setCompiledMoviePath(null); setCompileError(null); }}><ChevronLeft size={16}/></button>
            <input 
              className="bg-transparent border-none outline-none font-bold text-xl w-64 text-text focus:border-b focus:border-border" 
              value={activeProject.title} 
              onChange={e => saveProject({...activeProject, title: e.target.value})}
            />
          </div>
        }
      >
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-4">
            
            {/* AI Screenplay Assistant Card */}
            <div className="card p-4 bg-surface2/30 border border-border/40 space-y-3">
              <h4 className="font-semibold text-xs text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" /> AI Screenplay Assistant
              </h4>
              <p className="text-[11px] text-muted leading-relaxed">
                Enter your film idea below. The AI screenwriter will replace any current storyboard layout with exactly 4 visually detailed scene scripts.
              </p>
              <div className="flex gap-2">
                <input 
                  className="input text-xs flex-1" 
                  value={movieIdea}
                  onChange={(e) => setMovieIdea(e.target.value)}
                  placeholder="e.g. A cybernetic detective walks through a rainy neon marketplace, spots a glowing artifact..."
                  disabled={writingScript}
                />
                <button 
                  className="btn-primary text-xs shrink-0 flex items-center gap-1.5"
                  onClick={generateScreenplay}
                  disabled={writingScript || !movieIdea.trim()}
                >
                  {writingScript ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  Write Script
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm">Storyboard Scenes ({activeProject.scenes.length})</h3>
              
              {/* Batch / Concat Actions */}
              {activeProject.scenes.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted">Model:</span>
                  <select 
                    className="input py-1 text-[11px] bg-surface2 w-32 border border-border/40"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                  >
                    {videoModels.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1.5 bg-surface2 px-2.5 py-1 rounded-lg border border-border/40 select-none">
                    <input 
                      id="ltx-director-toggle"
                      type="checkbox"
                      className="checkbox h-3.5 w-3.5"
                      checked={ltxDirector}
                      onChange={(e) => setLtxDirector(e.target.checked)}
                    />
                    <label htmlFor="ltx-director-toggle" className="text-[11px] font-bold text-text/85 cursor-pointer">
                      LTX Director
                    </label>
                  </div>

                  {allRendered && (
                    <button 
                      className="btn-primary py-1 px-3 text-[11px] flex items-center gap-1 bg-gradient-to-r from-primary to-orange-500 border-none font-bold"
                      onClick={compileFinalMovie}
                      disabled={compilingMovie}
                    >
                      {compilingMovie ? <Loader2 size={12} className="animate-spin" /> : <Film size={12} />}
                      Compile Final Movie
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {/* Storyboard Render Progress */}
            {compilingMovie && (
              <div className="card p-4 bg-primary/5 border border-primary/20 flex items-center gap-3">
                <Loader2 size={18} className="animate-spin text-primary-light" />
                <div className="text-xs text-text">
                  <span className="font-bold">FFmpeg Concatenating Clips...</span> Downloading scene video buffers and executing copy-stitch. Please wait...
                </div>
              </div>
            )}

            {compiledMoviePath && (
              <div className="card p-4 bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <span>Movie Compiled Successfully!</span>
                </div>
                <p className="text-[10px] text-muted font-mono leading-relaxed bg-black/30 p-2 rounded border border-border/20 select-all">
                  File: {compiledMoviePath}
                </p>
                <p className="text-[11px] text-muted italic">
                  Note: The output video file is stored locally in your app cache folder. You can import it to video editing software or share it.
                </p>
              </div>
            )}

            {compileError && (
              <div className="card p-4 bg-rose-500/5 border border-rose-500/20 space-y-2">
                <div className="text-xs font-bold text-rose-400">Compilation Failed</div>
                <p className="text-[11px] text-muted leading-relaxed">
                  {compileError}
                </p>
              </div>
            )}

            {/* Scenes Storyboard List */}
            <div className="space-y-3">
              {activeProject.scenes.map((scene, i) => {
                const isRenderingThis = renderingSceneId === scene.id;
                return (
                  <div key={scene.id} className="card p-4 flex flex-col md:flex-row gap-4 group border border-border/60 hover:border-primary/40 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 cursor-grab text-muted opacity-50 group-hover:opacity-100"><GripVertical size={16}/></div>
                      
                      {/* Video Preview / Render Thumbnail */}
                      <div className="w-40 aspect-video bg-surface2 rounded-xl overflow-hidden border border-border/50 shrink-0 relative flex flex-col items-center justify-center text-muted">
                        {isRenderingThis ? (
                          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center p-2">
                            <Loader2 size={20} className="animate-spin text-primary-light mb-1.5" />
                            <span className="text-[9px] font-semibold text-text uppercase tracking-wider">{renderStatus}</span>
                            <span className="text-[10px] text-primary-light font-bold mt-0.5">{renderPct > 0 ? `${renderPct}%` : ""}</span>
                          </div>
                        ) : scene.videoUrl ? (
                          <video src={scene.videoUrl} controls className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <Clapperboard size={20} className="mb-1 text-muted-more"/>
                            <span className="text-[9px] font-bold tracking-wider uppercase">Scene {i+1}</span>
                            <span className="text-[8px] text-muted-more mt-0.5">Not Rendered</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Scene Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-sm font-medium leading-relaxed text-text">{scene.prompt}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {scene.characterIds.length > 0 && (
                            <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                              {scene.characterIds.length} Persona Locked
                            </span>
                          )}
                          {scene.ingredientIds.length > 0 && (
                            <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/25 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                              {scene.ingredientIds.length} Modifiers
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-border/20 pt-2.5 mt-4">
                        <div className="flex gap-2">
                          <button 
                            className="btn-primary py-1 px-3 text-[10px] flex items-center gap-1 bg-surface2 hover:bg-surface border border-border hover:border-primary-light text-text"
                            onClick={() => renderSceneVideo(scene)}
                            disabled={!!renderingSceneId}
                          >
                            {scene.videoUrl ? <RefreshCw size={11} /> : <Play size={11} />}
                            {scene.videoUrl ? "Re-render Clip" : "Render Video"}
                          </button>
                          {scene.videoUrl && (
                            <a 
                              className="btn-outline py-1 px-3 text-[10px] flex items-center gap-1"
                              href={scene.videoUrl}
                              download={`scene_${i+1}.mp4`}
                              target="_blank"
                            >
                              <Download size={11} /> Download
                            </a>
                          )}
                        </div>
                        <button 
                          className="btn-ghost text-rose-400 opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-rose-500/10" 
                          onClick={() => deleteScene(scene.id)}
                          disabled={!!renderingSceneId}
                        >
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {activeProject.scenes.length === 0 && (
                <div className="text-center p-12 border border-dashed border-border/50 rounded-2xl text-muted">
                  <Clapperboard size={28} className="mx-auto mb-3 opacity-40 text-muted" />
                  No scenes storyboarded yet. Type a movie concept into the AI scriptwriter above, or use the Prompt Director Pro builder on the right to design custom scenes.
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar: embedded Prompt Director Pro */}
          <div className="w-full lg:w-96 shrink-0">
            <div className="sticky top-6">
              <div className="card border-primary/20 shadow-lg shadow-primary/5">
                <div className="bg-surface2 p-3 border-b border-border/40 font-semibold text-sm flex items-center gap-2">
                  <Film size={15} className="text-primary"/> Prompt Director Pro
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted mb-4">Assemble your scene prompt by picking templates, tags, characters, and ingredients manually.</p>
                  <PromptDirector asComponent={true} onSaveScene={saveScene} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Page>
    );
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

  return (
    <Page 
      title="Cinema Studio" 
      subtitle="Create and manage full multi-scene movies and music videos. Define characters, environments, storyboards, and audio tracks in a unified project space."
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Your Projects</h2>
          <button className="btn-primary flex items-center gap-2" onClick={createProject}>
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
            <button className="btn-primary flex items-center gap-2" onClick={createProject}>
              <Plus size={16} /> Create Cinema Project
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <div key={p.id} className="card p-4 hover:border-primary/50 cursor-pointer transition-colors" onClick={() => setActiveProjectId(p.id)}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold">{p.title}</h3>
                  <button className="text-muted hover:text-rose-400" onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}><Trash2 size={14}/></button>
                </div>
                <p className="text-sm text-muted mb-4">{p.scenes.length} Scenes</p>
                <div className="text-xs text-muted flex items-center gap-1"><Clock size={12}/> Updated {new Date(p.updatedAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}

function captureLastFrame(videoUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = videoUrl.includes("?") ? `${videoUrl}&t=${Date.now()}` : `${videoUrl}?t=${Date.now()}`;
    
    const timeoutId = setTimeout(() => {
      video.remove();
      reject(new Error("Timeout capturing video frame"));
    }, 10000);

    video.addEventListener("loadedmetadata", () => {
      video.currentTime = Math.max(0, video.duration - 0.1);
    });
    
    video.addEventListener("seeked", () => {
      clearTimeout(timeoutId);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
          resolve(dataUrl);
        } else {
          reject(new Error("Failed to get 2d context"));
        }
      } catch (e) {
        reject(e);
      } finally {
        video.remove();
      }
    });
    
    video.addEventListener("error", () => {
      clearTimeout(timeoutId);
      video.remove();
      reject(new Error("Video loading error: " + (video.error?.message || "unknown")));
    });
  });
}
