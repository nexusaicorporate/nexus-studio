"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Page from "@/components/Page";
import { Field, useMounted, copy } from "@/components/ui";
import { useSettings } from "@/lib/store/settings";
import { useLibrary, newId } from "@/lib/store/library";
import { chat, generateVideo } from "@/lib/providers";
import { Megaphone, Sparkles, ImagePlus, Loader2, Download, Copy, Clapperboard, Trash2 } from "lucide-react";
import { RecipeLoader } from "@/components/RecipeLoader";
import { VisualRecipeBuilder } from "@/components/VisualRecipeBuilder";
import { MentionTextarea } from "@/components/MentionTextarea";
import { MultiRefPicker } from "@/components/MultiRefPicker";
import { assembleTemplate } from "@/lib/promptfill";
import type { Template, Recipe } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import { canUseModel, canUseFeature } from "@/lib/entitlements";
import UpgradePrompt from "@/components/UpgradePrompt";
import { modelsFor } from "@/lib/model-catalog";

const RATIOS = ["9:16", "16:9", "1:1"];
const DURATIONS = [5, 10, 15];

function UGCStudioInner() {
  const mounted = useMounted();
  const sp = useSearchParams();
  const settings = useSettings();
  const library = useLibrary();
  const provider = settings.providers.find((p) => p.id === settings.activeVideoProviderId)!;
  const { plan } = useAuth();

  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState("9:16");
  const [duration, setDuration] = useState(5);
  const [engine, setEngine] = useState("ltx-2.3-i2v");
  
  // UGC utilizes image-to-video models for reference product/face animation
  const catalogModels = modelsFor("i2v");

  const [refImages, setRefImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [jsonOut, setJsonOut] = useState<string>("");

  const [rendering, setRendering] = useState(false);
  const [renderPct, setRenderPct] = useState(0);
  const [renderStatus, setRenderStatus] = useState("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const [recipe, setRecipe] = useState<Template | Recipe | null>(null);
  const [recipeSelections, setRecipeSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    const p = sp.get("prompt");
    if (p) {
      setPrompt(p);
      setRecipe(null);
    }
  }, [sp]);

  useEffect(() => {
    if (catalogModels.length > 0 && !catalogModels.some((m) => m.id === engine)) {
      setEngine(catalogModels[0].id);
    }
  }, [catalogModels, engine]);

  const hasUgcAccess = canUseFeature(plan ?? "free", "ugc");

  async function enhance() {
    const activeP = recipe
      ? assembleTemplate((recipe as any).content || (recipe as any).templateString || "", recipeSelections, library.banks)
      : prompt;
    if (!activeP.trim()) return;
    setBusy(true);
    try {
      const out = await chat({
        provider: settings.providers.find((p) => p.id === settings.activeProviderId)!,
        model: settings.providers.find((p) => p.id === settings.activeProviderId)?.selectedModel || "default",
        uncensored: settings.uncensored,
        system: "You are an elite marketing copywriter and video director. Rewrite the user's ad script into a high-impact, visual-heavy UGC video prompt (~80 words) focusing on dynamic product showcase, text overlays, and hook-based staging. Output only the prompt.",
        messages: [{ id: "1", role: "user", content: activeP }],
      });
      if (out) {
        setPrompt(out.trim());
        setRecipe(null);
      }
    } catch (e: any) {
      alert("Enhance failed: " + e.message);
    }
    setBusy(false);
  }

  async function jsonEnhance() {
    const activeP = recipe
      ? assembleTemplate((recipe as any).content || (recipe as any).templateString || "", recipeSelections, library.banks)
      : prompt;
    if (!activeP.trim()) return;
    setBusy(true);
    try {
      const out = await chat({
        provider: settings.providers.find((p) => p.id === settings.activeProviderId)!,
        model: settings.providers.find((p) => p.id === settings.activeProviderId)?.selectedModel || "default",
        uncensored: settings.uncensored,
        system: "Convert the ad concept into a structured UGC video campaign JSON. Include fields: ad_hook (first 3s), visual_pacing, product_placement, overlay_text, call_to_action, final_prompt. Output only clean JSON.",
        messages: [{ id: "1", role: "user", content: activeP }],
      });
      setJsonOut(out.trim());
    } catch (e: any) {
      alert("JSON conversion failed: " + e.message);
    }
    setBusy(false);
  }

  function saveSpec() {
    const activeP = recipe
      ? assembleTemplate((recipe as any).content || (recipe as any).templateString || "", recipeSelections, library.banks)
      : prompt;
    const spec = {
      mode: "ugc",
      engine,
      ratio,
      duration,
      prompt: activeP,
      refImagesCount: refImages.length,
      json: jsonOut,
      recipe: recipe ? { id: recipe.id, selections: recipeSelections } : undefined,
    };
    library.set("assets", [
      {
        id: newId(),
        kind: "video" as const,
        url: "",
        prompt: activeP,
        meta: spec,
        createdAt: Date.now(),
      },
      ...library.assets,
    ]);
    alert("UGC Ad spec saved. Connect a Video provider (e.g. Modal) in Settings to render this video.");
  }

  async function render() {
    const activeP = recipe
      ? assembleTemplate((recipe as any).content || (recipe as any).templateString || "", recipeSelections, library.banks)
      : prompt;
    if (!activeP.trim()) return;
    setRendering(true);
    setResultUrl(null);
    setRenderPct(0);
    setRenderStatus("submitting");
    try {
      const url = await generateVideo({
        provider,
        prompt: activeP,
        mode: "i2v",
        model: engine || provider.selectedModel || provider.models[0],
        image: refImages[0] || undefined,
        frames: duration * 24, // Estimate frames from duration
        onProgress: (pct, status) => {
          setRenderPct(pct);
          setRenderStatus(status);
        },
      });
      setResultUrl(url);
      library.set("assets", [
        {
          id: newId(),
          kind: "video" as const,
          url,
          prompt: activeP,
          meta: { mode: "ugc", engine, ratio, duration },
          createdAt: Date.now(),
        },
        ...library.assets,
      ]);
    } catch (e: any) {
      alert("Render failed: " + e.message);
    }
    setRendering(false);
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setRefImages((prev) => [...prev, reader.result as string].slice(0, 8));
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeImage = (idx: number) => {
    setRefImages((prev) => prev.filter((_, i) => i !== idx));
  };

  if (!mounted) return null;

  if (!hasUgcAccess) {
    return (
      <Page title="UGC Ads Studio" subtitle="Generate vertical UGC style marketing videos for social ads.">
        <div className="max-w-xl mx-auto mt-10">
          <UpgradePrompt
            title="Unlock UGC Ads Studio"
            message="The UGC Ads Marketing Gear is available on Pro and Studio plans. Upgrade to generate high-performing social video ads."
            planNeeded="Pro"
          />
        </div>
      </Page>
    );
  }

  return (
    <Page title="UGC Ads Studio" subtitle="Write ad scripts, lock reference images, and render vertical social media ads. Built-in workflow routes locally via Modal with no external MUAPI endpoints.">
      <div className="grid lg:grid-cols-[420px_1fr] gap-5">
        <div className="card p-4 space-y-3 h-max">
          <div className="flex items-center justify-between">
            <span className="label mb-0 flex items-center gap-1.5"><Megaphone size={16} className="text-primary-light" /> Ad Script / Prompt</span>
            <div className="flex items-center gap-2">
              {recipe && (
                <button
                  className="btn-ghost px-2 py-1 text-[10px] text-rose-400"
                  onClick={() => {
                    setPrompt(assembleTemplate((recipe as any).content || (recipe as any).templateString || "", recipeSelections, library.banks));
                    setRecipe(null);
                  }}
                >
                  Detach Recipe
                </button>
              )}
              <RecipeLoader onSelect={(r: any) => { setRecipe(r); setRecipeSelections(r.selections || {}); }} />
            </div>
          </div>

          <Field label="">
            {recipe ? (
              <VisualRecipeBuilder
                content={(recipe as any).content || (recipe as any).templateString || ""}
                selections={recipeSelections}
                banks={library.banks}
                onChange={setRecipeSelections}
              />
            ) : (
              <MentionTextarea
                className="input min-h-[120px]"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Hook: A customer holding product... Describe visual style, camera motion, hooks, and CTA overlays. Use @ to auto-complete ingredients..."
              />
            )}
          </Field>

          <Field label={`Product & Face Reference Images (${refImages.length}/8)`}>
            <MultiRefPicker max={8} refs={refImages} onChange={setRefImages} />
          </Field>

          <div className="grid grid-cols-3 gap-2">
            <Field label="Model">
              <select className="input text-xs" value={engine} onChange={(e) => setEngine(e.target.value)}>
                {provider?.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ratio">
              <select className="input text-xs" value={ratio} onChange={(e) => setRatio(e.target.value)}>
                {RATIOS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Duration">
              <select className="input text-xs" value={duration.toString()} onChange={(e) => setDuration(parseInt(e.target.value))}>
                {DURATIONS.map((d) => <option key={d} value={d}>{d}s</option>)}
              </select>
            </Field>
          </div>

          {!canUseModel(plan ?? "free", provider?.selectedModel || engine) ? (
            <UpgradePrompt title="Upgrade Tier Required" message="The selected video model is locked. Please upgrade to render." planNeeded="Pro" inline />
          ) : provider?.kind === "modal" ? (
            <button className="btn-primary w-full" onClick={render} disabled={rendering || busy}>
              {rendering ? (
                <><Loader2 size={15} className="animate-spin mr-1.5" /> Rendering... {renderPct > 0 ? `${renderPct}%` : ""}</>
              ) : (
                <><Clapperboard size={15} className="mr-1.5" /> Render Ad Video</>
              )}
            </button>
          ) : (
            <button className="btn-primary w-full" onClick={saveSpec} disabled={busy}><Clapperboard size={15} className="mr-1.5" /> Save Ad Spec</button>
          )}
        </div>

        <div className="space-y-4">
          {(rendering || resultUrl) && (
            <div className="card p-4">
              {rendering ? (
                <div className="py-12 grid place-items-center text-center">
                  <Loader2 size={32} className="animate-spin text-primary-light mb-3" />
                  <div className="text-sm font-semibold">Generating Vertical Ad Video...</div>
                  <div className="text-xs text-muted mt-1">{renderStatus}{renderPct > 0 ? ` · ${renderPct}%` : ""}</div>
                  {renderPct > 0 && (
                    <div className="mt-4 h-1.5 w-full max-w-xs rounded-full bg-surface2 overflow-hidden">
                      <div className="h-full bg-primary-light transition-all duration-300" style={{ width: `${renderPct}%` }} />
                    </div>
                  )}
                </div>
              ) : resultUrl ? (
                <div className="max-w-md mx-auto">
                  <video src={resultUrl} controls className="w-full rounded-xl border border-border aspect-[9/16] bg-black" />
                  <div className="flex gap-2 mt-3">
                    <a className="btn-outline text-xs flex-1 text-center" href={resultUrl} download="nexus-ugc-ad.mp4" target="_blank">
                      <Download size={14} className="mr-1.5" /> Download Ad Video
                    </a>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <div className="card p-4">
            <div className="text-sm font-semibold mb-2">Assembled Spec details</div>
            <div className="text-xs text-muted mb-3">{engine} · ratio: {ratio} · {duration}s</div>
            <p className="text-sm whitespace-pre-wrap text-text">
              {recipe ? assembleTemplate((recipe as any).content || (recipe as any).templateString || "", recipeSelections, library.banks) : (prompt || "Your prompt script will appear here...")}
            </p>
            {jsonOut && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="label mb-0 text-xs">UGC Campaign JSON spec</span>
                  <button className="btn-ghost px-2 py-1 text-xs" onClick={() => copy(jsonOut)}><Copy size={13} /></button>
                </div>
                <pre className="text-xs bg-surface2 rounded-xl p-3 overflow-x-auto max-h-72 border border-border font-mono">{jsonOut}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}

export default function UGCStudio() {
  return (
    <Suspense fallback={<div className="p-6 text-muted">Loading UGC Ads Studio...</div>}>
      <UGCStudioInner />
    </Suspense>
  );
}
