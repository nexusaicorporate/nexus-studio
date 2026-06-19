"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Page from "@/components/Page";
import { Field, useMounted, copy } from "@/components/ui";
import { useSettings } from "@/lib/store/settings";
import { useLibrary, newId } from "@/lib/store/library";
import { chat, generateVideo } from "@/lib/providers";
import { Wand2, Clapperboard, ImagePlus, Film, Copy, Plus, X, Music, Volume2, Loader2, Download } from "lucide-react";
import PromptPicker, { useTaskSystemPrompt } from "@/components/PromptPicker";
import { MultiRefPicker } from "@/components/MultiRefPicker";
import { RecipeLoader } from "@/components/RecipeLoader";
import { VisualRecipeBuilder } from "@/components/VisualRecipeBuilder";
import { assembleTemplate } from "@/lib/promptfill";
import type { Template, Recipe } from "@/lib/types";
type Mode = "t2v" | "i2v" | "r2v" | "v2v";
const MODE_LABEL: Record<Mode, string> = { t2v: "Text → Video", i2v: "Image → Video", r2v: "Reference → Video", v2v: "Video → Video" };
const RATIOS = ["16:9", "9:16", "1:1"]; const RES = ["720p", "1080p", "4K"];
function VideoInner() {
  const mounted = useMounted(); const sp = useSearchParams(); const settings = useSettings(); const library = useLibrary();
  const provider = settings.providers.find((p) => p.id === settings.activeVideoProviderId)!;
  const [mode, setMode] = useState<Mode>("t2v"); const [op, setOp] = useState<"create" | "edit" | "extend">("create");
  const [prompt, setPrompt] = useState(""); const [ratio, setRatio] = useState("16:9"); const [res, setRes] = useState("1080p"); const [engine, setEngine] = useState("Veo 3");
  const providerModels = provider?.models && provider.models.length > 0 ? provider.models : ["Veo 3", "Kling 2.0", "Seedance 2.0", "Wan 2.2", "LTX-2", "Runway Gen-4"];
  const [startImg, setStartImg] = useState<string | null>(null); const [endImg, setEndImg] = useState<string | null>(null); const [refMedia, setRefMedia] = useState<string | null>(null);
  const [refImages, setRefImages] = useState<string[]>([]);
  const [audioMode, setAudioMode] = useState<"none" | "upload" | "generate">("none");
  const [audioFile, setAudioFile] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const [jsonOut, setJsonOut] = useState<string>("");
  const [rendering, setRendering] = useState(false); const [renderPct, setRenderPct] = useState(0); const [renderStatus, setRenderStatus] = useState(""); const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<Template | Recipe | null>(null);
  const [recipeSelections, setRecipeSelections] = useState<Record<string, string>>({});
  const taskSystem = useTaskSystemPrompt("video", mode === "t2v" ? "T2V" : mode === "v2v" ? "V2V" : "I2V");
  useEffect(() => { const p = sp.get("prompt"); if (p) { setPrompt(p); setRecipe(null); } }, [sp]);
  useEffect(() => { if (providerModels.length > 0 && !providerModels.includes(engine)) setEngine(providerModels[0]); }, [providerModels, engine]);
  async function enhance() { const activeP = recipe ? assembleTemplate((recipe as any).content || (recipe as any).templateString || "", recipeSelections, library.banks) : prompt; if (!activeP.trim()) return; setBusy(true); try { const out = await chat({ provider, model: provider.selectedModel || provider.models[0] || "openai", uncensored: settings.uncensored, system: taskSystem || `You are a cinematic ${MODE_LABEL[mode]} prompt writer. Rewrite the idea into a detailed prompt covering subject, camera movement, lighting, pacing and motion in ~80-100 words. Output only the prompt.`, messages: [{ id: "1", role: "user", content: activeP }] }); if (out) { setPrompt(out.trim()); setRecipe(null); } } catch (e: any) { alert("Enhance failed: " + e.message); } setBusy(false); }
  async function jsonEnhance() { const activeP = recipe ? assembleTemplate((recipe as any).content || (recipe as any).templateString || "", recipeSelections, library.banks) : prompt; if (!activeP.trim()) return; setBusy(true); try { const out = await chat({ provider, model: provider.selectedModel || provider.models[0] || "openai", uncensored: settings.uncensored, system: "Convert the idea into a structured JSON video spec with fields: subject, setting, camera_movement, lighting, color_palette, pacing, audio, master_prompt. Output only JSON.", messages: [{ id: "1", role: "user", content: activeP }] }); setJsonOut(out.trim()); } catch (e: any) { alert("Failed: " + e.message); } setBusy(false); }
  function saveSpec() { const activeP = recipe ? assembleTemplate((recipe as any).content || (recipe as any).templateString || "", recipeSelections, library.banks) : prompt; const spec = { mode, op, engine, ratio, res, prompt: activeP, startImg: !!startImg, endImg: !!endImg, refMedia: !!refMedia, refImages: refImages.length, audioMode, hasAudio: !!audioFile, json: jsonOut, recipe: recipe ? { id: recipe.id, selections: recipeSelections } : undefined }; library.set("assets", [{ id: newId(), kind: "video" as const, url: "", prompt: activeP, meta: spec, createdAt: Date.now() }, ...library.assets]); alert("Video spec saved to your generations. Connect a video provider (Veo/Kling/Seedance/Runway) key in Settings to render."); }
  async function render() {
    const activeP = recipe ? assembleTemplate((recipe as any).content || (recipe as any).templateString || "", recipeSelections, library.banks) : prompt;
    if (!activeP.trim()) return;
    setRendering(true); setResultUrl(null); setRenderPct(0); setRenderStatus("submitting");
    try {
      const url = await generateVideo({
        provider, prompt: activeP, mode,
        model: provider.selectedModel || provider.models[0],
        image: mode === "i2v" ? (startImg || undefined) : mode === "r2v" ? (refImages[0] || undefined) : undefined,
        onProgress: (pct, status) => { setRenderPct(pct); setRenderStatus(status); },
      });
      setResultUrl(url);
      library.set("assets", [{ id: newId(), kind: "video" as const, url, prompt: activeP, meta: { mode, op, engine: provider.selectedModel || engine, ratio, res }, createdAt: Date.now() }, ...library.assets]);
    } catch (e: any) { alert("Render failed: " + e.message); }
    setRendering(false);
  }
  function upload(set: (v: string) => void) { return (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => set(r.result as string); r.readAsDataURL(f); }; }
  if (!mounted) return null;
  return (
    <Page title="Video Studio" subtitle="Text/Image/Reference/Video → Video, with create · edit · extend. Build the cinematic spec here, then render through your connected video engine.">
      <div className="grid lg:grid-cols-[420px_1fr] gap-5">
        <div className="card p-4 space-y-3 h-max">
          <Field label="Input mode"><div className="grid grid-cols-2 gap-2">{(Object.keys(MODE_LABEL) as Mode[]).map((m) => (<button key={m} className={`tab ${mode === m ? "tab-active" : "tab-idle"}`} onClick={() => setMode(m)}>{MODE_LABEL[m]}</button>))}</div></Field>
          <Field label="Operation"><div className="flex gap-2">{(["create", "edit", "extend"] as const).map((o) => <button key={o} className={`tab flex-1 capitalize ${op === o ? "tab-active" : "tab-idle"}`} onClick={() => setOp(o)}>{o}</button>)}</div></Field>
          <div className="flex items-center justify-between"><span className="label mb-0">System prompt</span><PromptPicker taskKey="video" filterModes={["T2V", "I2V", "V2V", "IT2V", "VT2T"]} /></div>
          {(mode === "i2v") && (<div className="grid grid-cols-2 gap-3"><Field label="Start frame"><Uploader img={startImg} onChange={upload(setStartImg)} /></Field><Field label="End frame (optional)"><Uploader img={endImg} onChange={upload(setEndImg)} /></Field></div>)}
          {mode === "r2v" && (
            <Field label={`Reference images (${refImages.length}/8)`}>
              <MultiRefPicker max={8} refs={refImages} onChange={setRefImages} />
            </Field>
          )}
          {(mode === "v2v" || op === "extend") && (<Field label={op === "extend" ? "Video to extend" : "Source video"}><label className="btn-outline cursor-pointer w-full"><Film size={15} /> Upload video<input type="file" accept="video/*" hidden onChange={upload(setRefMedia)} /></label>{refMedia && <video src={refMedia} className="w-full rounded-lg mt-2" controls />}</Field>)}
          <Field label={<div className="flex items-center justify-between w-full"><span>Prompt</span><div className="flex items-center gap-2">{recipe && <button className="btn-ghost px-2 py-1 text-[10px] text-rose-400" onClick={() => { setPrompt(assembleTemplate((recipe as any).content || (recipe as any).templateString || "", recipeSelections, library.banks)); setRecipe(null); }}>Detach Recipe</button>}<RecipeLoader onSelect={(r: any) => { setRecipe(r); setRecipeSelections(r.selections || {}); }} /></div></div>}>
            {recipe ? (
              <VisualRecipeBuilder content={(recipe as any).content || (recipe as any).templateString || ""} selections={recipeSelections} banks={library.banks} onChange={setRecipeSelections} />
            ) : (
              <textarea className="input min-h-[110px]" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the shot, motion and mood…" />
            )}
          </Field>
          <div className="flex gap-2"><button className="btn-ghost flex-1 text-xs" onClick={enhance} disabled={busy}><Wand2 size={14} /> Enhance</button><button className="btn-ghost flex-1 text-xs" onClick={jsonEnhance} disabled={busy}><Plus size={14} /> JSON enhance</button></div>
          
          <Field label="Audio Options">
            <div className="flex gap-2 mb-2">
              {(["none", "upload", "generate"] as const).map(a => (
                <button key={a} className={`tab flex-1 capitalize ${audioMode === a ? "tab-active" : "tab-idle"}`} onClick={() => setAudioMode(a)}>
                  {a === "none" ? "No Audio" : a === "upload" ? "Upload Audio" : "Auto-Generate"}
                </button>
              ))}
            </div>
            {audioMode === "upload" && (
              <div className="space-y-2">
                <label className="btn-outline cursor-pointer w-full"><Music size={15} /> Select Audio File<input type="file" accept="audio/*" hidden onChange={upload(setAudioFile)} /></label>
                {audioFile && <audio src={audioFile} controls className="w-full h-8" />}
              </div>
            )}
            {audioMode === "generate" && (
              <p className="text-[11px] text-muted italic">If the selected engine supports audio generation (e.g. Kling 2.0 / Veo), audio will be synthesized based on the prompt.</p>
            )}
          </Field>

          <div className="grid grid-cols-3 gap-2"><Field label="Engine"><select className="input" value={engine} onChange={(e) => setEngine(e.target.value)}>{providerModels.map((x) => <option key={x}>{x}</option>)}</select></Field><Field label="Aspect"><select className="input" value={ratio} onChange={(e) => setRatio(e.target.value)}>{RATIOS.map((x) => <option key={x}>{x}</option>)}</select></Field><Field label="Res"><select className="input" value={res} onChange={(e) => setRes(e.target.value)}>{RES.map((x) => <option key={x}>{x}</option>)}</select></Field></div>
          {provider?.kind === "modal" ? (
            <button className="btn-primary w-full" onClick={render} disabled={rendering || busy}>
              {rendering ? <><Loader2 size={15} className="animate-spin" /> Rendering… {renderPct > 0 ? `${renderPct}%` : ""} {renderStatus}</> : <><Clapperboard size={15} /> Render Video ({provider.selectedModel || engine})</>}
            </button>
          ) : (
            <button className="btn-primary w-full" onClick={saveSpec} disabled={busy}><Clapperboard size={15} /> Build / save spec</button>
          )}
          <button className="btn-ghost w-full text-xs" onClick={saveSpec} disabled={busy}>Save spec only</button>
        </div>
        <div className="space-y-4">
          {(rendering || resultUrl) && (
            <div className="card p-4">
              {rendering ? (
                <div className="py-10 grid place-items-center text-center">
                  <Loader2 size={28} className="animate-spin text-primary-light mb-3" />
                  <div className="text-sm font-medium">Rendering on {provider?.name}…</div>
                  <div className="text-xs text-muted mt-1">{renderStatus}{renderPct > 0 ? ` · ${renderPct}%` : ""} — cloud video renders can take a few minutes.</div>
                  {renderPct > 0 && <div className="mt-3 h-1.5 w-full max-w-xs rounded-full bg-surface2 overflow-hidden"><div className="h-full bg-primary-light transition-all" style={{ width: `${renderPct}%` }} /></div>}
                </div>
              ) : resultUrl ? (
                <div>
                  <video src={resultUrl} controls className="w-full rounded-xl" />
                  <div className="flex gap-2 mt-3">
                    <a className="btn-outline text-xs" href={resultUrl} download="nexus-video.mp4" target="_blank"><Download size={14} /> Download</a>
                    <button className="btn-ghost text-xs" onClick={render} disabled={rendering}><Clapperboard size={14} /> Re-render</button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
          <div className="card p-4 min-h-[260px]"><div className="text-sm font-medium mb-2">Assembled spec</div><div className="text-xs text-muted mb-3">{engine} · {MODE_LABEL[mode]} · {op} · {ratio} · {res}</div><p className="text-sm whitespace-pre-wrap">{recipe ? assembleTemplate((recipe as any).content || (recipe as any).templateString || "", recipeSelections, library.banks) : (prompt || "Your prompt will appear here.")}</p>{jsonOut && (<div className="mt-4"><div className="flex items-center justify-between mb-1"><span className="label mb-0">JSON spec</span><button className="btn-ghost px-2 py-1 text-xs" onClick={() => copy(jsonOut)}><Copy size={13} /></button></div><pre className="text-xs bg-surface2 rounded-xl p-3 overflow-x-auto max-h-72">{jsonOut}</pre></div>)}</div>
          <div className="card p-4 text-xs text-muted"><b className="text-text">Rendering:</b> Veo, Kling, Seedance, Runway and Wan require their own API keys. Add a custom provider in Settings, or use the saved spec with your renderer. Image-to-video uses the start frame; <i>extend</i> continues from the last frame of your uploaded clip.</div>
        </div>
      </div>
    </Page>
  );
}
function Uploader({ img, onChange }: { img: string | null; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) { return (<label className="block w-full aspect-video rounded-lg border border-dashed border-border grid place-items-center cursor-pointer overflow-hidden text-muted hover:text-text">{img ? <img src={img} className="w-full h-full object-cover" alt="" /> : <ImagePlus size={18} />}<input type="file" accept="image/*" hidden onChange={onChange} /></label>); }
export default function VideoStudio() { return <Suspense fallback={null}><VideoInner /></Suspense>; }
