"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Page from "@/components/Page";
import { Field, useMounted } from "@/components/ui";
import { useSettings } from "@/lib/store/settings";
import { useLibrary, newId } from "@/lib/store/library";
import { generateImage, chat } from "@/lib/providers";
import { characterPrompt } from "@/lib/character";
import { Wand2, Sparkles, ImagePlus, Download, RefreshCw, Repeat, Dice5 } from "lucide-react";
import PromptPicker, { useTaskSystemPrompt } from "@/components/PromptPicker";
import { MultiRefPicker } from "@/components/MultiRefPicker";
import { RecipeLoader } from "@/components/RecipeLoader";
import { VisualRecipeBuilder } from "@/components/VisualRecipeBuilder";
import { MentionTextarea } from "@/components/MentionTextarea";
import { assembleTemplate } from "@/lib/promptfill";
import type { Template, Recipe } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import { canUseModel } from "@/lib/entitlements";
import UpgradePrompt from "@/components/UpgradePrompt";
import { modelsFor } from "@/lib/model-catalog";
const RATIOS: Record<string, [number, number]> = { "1:1": [1024, 1024], "16:9": [1280, 720], "9:16": [720, 1280], "4:5": [896, 1120], "3:2": [1152, 768] };
function ImageStudioInner() {
  const mounted = useMounted(); const sp = useSearchParams(); const settings = useSettings(); const library = useLibrary();
  const provider = settings.providers.find((p) => p.id === settings.activeImageProviderId)!;
  const { plan } = useAuth();
  const [mode, setMode] = useState<"t2i" | "i2i" | "r2i">("t2i"); const [prompt, setPrompt] = useState(""); const [ratio, setRatio] = useState("1:1"); const [model, setModel] = useState("flux");
  const catalogModels = modelsFor(mode === "t2i" ? "t2i" : "i2i");
  const [refs, setRefs] = useState<string[]>([]); const [busy, setBusy] = useState(false); const [result, setResult] = useState<string | null>(null);
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1e9)); const [charId, setCharId] = useState<string>("");
  const [recipe, setRecipe] = useState<Template | Recipe | null>(null);
  const [recipeSelections, setRecipeSelections] = useState<Record<string, string>>({});
  const taskSystem = useTaskSystemPrompt("image", mode === "i2i" ? "IT2I" : "T2I");
  useEffect(() => { const p = sp.get("prompt"); if (p) { setPrompt(p); setRecipe(null); } const c = sp.get("character"); if (c) setCharId(c); }, [sp]);
  useEffect(() => { if (charId) { const c = library.characters.find((x) => x.id === charId); if (c) setPrompt((prev) => prev || characterPrompt(c)); } }, [charId, library.characters]);
  useEffect(() => { if (catalogModels.length > 0 && !catalogModels.some((m) => m.id === model)) setModel(catalogModels[0].id); }, [catalogModels, model]);
  async function enhance() { const activeP = recipe ? assembleTemplate((recipe as any).content || (recipe as any).templateString || "", recipeSelections, library.banks) : prompt; if (!activeP.trim()) return; setBusy(true); try { const out = await chat({ provider, model: provider.selectedModel || provider.models[0] || "openai", uncensored: settings.uncensored, system: taskSystem || "You rewrite image prompts into vivid, highly-detailed generation prompts. Output only the improved prompt.", messages: [{ id: "1", role: "user", content: activeP }] }); if (out) { setPrompt(out.trim()); setRecipe(null); } } catch (e: any) { alert("Enhance failed: " + e.message); } setBusy(false); }
  async function surprise() { setBusy(true); try { const out = await chat({ provider, model: provider.selectedModel || provider.models[0] || "openai", uncensored: settings.uncensored, system: "Output only a single creative, detailed image prompt.", messages: [{ id: "1", role: "user", content: "Surprise me with a striking image idea." }] }); if (out) { setPrompt(out.trim()); setRecipe(null); } } catch { setPrompt("a cinematic portrait, golden hour light, 85mm, photorealistic"); setRecipe(null); } setBusy(false); }
  async function run() { const activeP = recipe ? assembleTemplate((recipe as any).content || (recipe as any).templateString || "", recipeSelections, library.banks) : prompt; if (!activeP.trim()) return; setBusy(true); setResult(null); const [w, h] = RATIOS[ratio]; try { const c = charId ? library.characters.find((x) => x.id === charId) : null; const full = c ? `${characterPrompt(c)}, ${activeP}` : activeP; const url = await generateImage({ provider, prompt: full, width: w, height: h, model, seed, image: refs[0] || undefined }); setResult(url); library.set("assets", [{ id: newId(), kind: "image" as const, url, prompt: full, meta: { ratio, model, seed, refs, recipe: recipe ? { id: recipe.id, selections: recipeSelections } : undefined }, characterId: charId || undefined, createdAt: Date.now() }, ...library.assets].slice(0, 200)); } catch (e: any) { alert("Generation failed: " + e.message); } setBusy(false); }
  // onRef removed
  if (!mounted) return null;
  return (
    <Page title="Image Studio" subtitle="Text-to-image, image-to-image, create / edit / animate. Free Pollinations route works with no key; OpenAI used when a key is set.">
      <div className="grid lg:grid-cols-[400px_1fr] gap-5">
        <div className="card p-4 space-y-3 h-max">
          <div className="flex gap-2"><button className={`tab flex-1 ${mode === "t2i" ? "tab-active" : "tab-idle"}`} onClick={() => setMode("t2i")}>Text → Image</button><button className={`tab flex-1 ${mode === "i2i" ? "tab-active" : "tab-idle"}`} onClick={() => setMode("i2i")}>Image → Image</button><button className={`tab flex-1 ${mode === "r2i" ? "tab-active" : "tab-idle"}`} onClick={() => setMode("r2i")}>Ref → Image</button></div>
          <div className="flex items-center justify-between"><span className="label mb-0">System prompt</span><PromptPicker taskKey="image" filterModes={mode === "i2i" || mode === "r2i" ? ["IT2I", "I2I"] : ["T2I"]} /></div>
          {library.characters.length > 0 && (
            <Field label="Lock to character (keeps persona consistent)">
              <div className="flex gap-2">
                <select className="input flex-1" value={charId} onChange={(e) => setCharId(e.target.value)}>
                  <option value="">— none —</option>
                  {library.characters.map((c) => <option key={c.id} value={c.id}>{c.name || "Unnamed"}</option>)}
                </select>
                <a href="/studio/character" className="btn-outline text-xs px-2.5 flex items-center justify-center" title="Create a new character">+</a>
                {charId && (() => {
                  const selChar = library.characters.find(c => c.id === charId);
                  const hasRef = selChar && (selChar.characterSheetUrl || selChar.refImages.length > 0);
                  if (!hasRef) return null;
                  return (
                    <button
                      className="btn-outline text-xs px-2.5"
                      type="button"
                      onClick={() => {
                        const img = selChar.characterSheetUrl || selChar.refImages[0];
                        if (img) {
                          setRefs((prev) => prev.includes(img) ? prev : [img, ...prev].slice(0, 8));
                          setMode("i2i");
                        }
                      }}
                      title="Load character turnaround/reference into image editor"
                    >
                      Use Reference
                    </button>
                  );
                })()}
              </div>
            </Field>
          )}
          {(mode === "i2i" || mode === "r2i") && (<Field label={`Reference images (${refs.length}/8)`}><MultiRefPicker max={8} refs={refs} onChange={setRefs} /></Field>)}
          <Field label={<div className="flex items-center justify-between w-full"><span>Prompt</span><div className="flex items-center gap-2">{recipe && <button className="btn-ghost px-2 py-1 text-[10px] text-rose-400" onClick={() => { setPrompt(assembleTemplate((recipe as any).content || (recipe as any).templateString || "", recipeSelections, library.banks)); setRecipe(null); }}>Detach Recipe</button>}<RecipeLoader onSelect={(r: any) => { setRecipe(r); setRecipeSelections(r.selections || {}); }} /></div></div>}>
            {recipe ? (
              <VisualRecipeBuilder content={(recipe as any).content || (recipe as any).templateString || ""} selections={recipeSelections} banks={library.banks} onChange={setRecipeSelections} />
            ) : (
              <MentionTextarea className="input min-h-[120px]" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the image, use @ to mention elements..." />
            )}
          </Field>
          <div className="flex gap-2"><button className="btn-ghost flex-1 text-xs" onClick={enhance} disabled={busy}><Wand2 size={14} /> Improve</button><button className="btn-ghost flex-1 text-xs" onClick={surprise} disabled={busy}><Sparkles size={14} /> Surprise me</button></div>
          <div className="grid grid-cols-2 gap-3"><Field label="Aspect ratio"><select className="input" value={ratio} onChange={(e) => setRatio(e.target.value)}>{Object.keys(RATIOS).map((r) => <option key={r}>{r}</option>)}</select></Field><Field label="Model"><select className="input" value={model} onChange={(e) => setModel(e.target.value)}>{provider?.models.map((m) => <option key={m} value={m}>{m}</option>)}</select></Field></div>
          <Field label="Seed"><div className="flex gap-2"><input className="input" type="number" value={seed} onChange={(e) => setSeed(+e.target.value)} /><button className="btn-ghost px-3" onClick={() => setSeed(Math.floor(Math.random() * 1e9))}><Dice5 size={15} /></button></div></Field>
          {!canUseModel(plan, provider?.selectedModel || model) ? (
            <UpgradePrompt title="Pro Model Selected" message="This image model requires an active Pro subscription to generate." planNeeded="Pro" inline />
          ) : (
            <button className="btn-primary w-full" onClick={run} disabled={busy}>{busy ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />} Generate</button>
          )}
        </div>
        <div className="space-y-4">
          <div className="card p-4 min-h-[420px] grid place-items-center">
            {busy ? <div className="text-muted flex flex-col items-center gap-2"><RefreshCw className="animate-spin" /> Generating…</div> : result ? (
              <div className="w-full"><img src={result} className="w-full rounded-xl" alt="result" /><div className="flex gap-2 mt-3"><a className="btn-outline text-xs" href={result} download="nexus-image.png" target="_blank"><Download size={14} /> Download</a><button className="btn-ghost text-xs" onClick={() => { setRefs([...refs, result]); setMode("i2i"); }}><Repeat size={14} /> Use as reference</button><button className="btn-ghost text-xs" onClick={run}><RefreshCw size={14} /> Regenerate</button></div></div>
            ) : <div className="text-muted text-sm">Your generated image appears here.</div>}
          </div>
          {library.assets.filter((a) => a.kind === "image").length > 0 && (<div className="card p-4"><div className="text-sm font-medium mb-3">Recent generations</div><div className="grid grid-cols-3 sm:grid-cols-4 gap-2">{library.assets.filter((a) => a.kind === "image").slice(0, 12).map((a) => (<img key={a.id} src={a.url} className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-80" onClick={() => { setResult(a.url); setPrompt(a.prompt); }} alt="" />))}</div></div>)}
        </div>
      </div>
    </Page>
  );
}
export default function ImageStudio() { return <Suspense fallback={null}><ImageStudioInner /></Suspense>; }
