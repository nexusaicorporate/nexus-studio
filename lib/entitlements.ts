import { WEB_MODE } from "@/lib/webmode";
import { PRO_MODEL_IDS, STUDIO_MODEL_IDS } from "@/lib/model-catalog";

// Tier lists derive from the single model catalog (lib/model-catalog.ts), so
// adding or re-tiering a model in one place updates gating everywhere. MUAPI-free.
export const PRO_MODELS: string[] = PRO_MODEL_IDS;
export const STUDIO_MODELS: string[] = STUDIO_MODEL_IDS;

export function canUseModel(plan: string, model: string): boolean {
  // Desktop app is never gated — users supply their own keys / run local AI.
  if (!WEB_MODE) return true;
  if (plan === "studio") return true;
  if (plan === "pro") {
    if (STUDIO_MODELS.includes(model)) return false;
    return true;
  }
  // Free plan
  if (PRO_MODELS.includes(model) || STUDIO_MODELS.includes(model)) return false;
  return true;
}

export function canUseFeature(plan: string, feature: "cinema" | "comfy_cloud" | "analyze" | "ugc"): boolean {
  if (!WEB_MODE) return true;
  if (plan === "studio") return true;
  // Pro gets everything except cinema (studio-only): comfy_cloud, analyze, and ugc.
  if (plan === "pro") return feature !== "cinema";
  // Free plan: none of the gated features.
  return false;
}

export function canUseNsfw(addons?: string[]): boolean {
  if (!WEB_MODE) return true;
  return !!addons && addons.includes("nsfw");
}

// Text chat now runs on built-in / local / free providers at no cost, so those
// are free for everyone. Only external **paid API** providers (OpenAI, Anthropic,
// Google, Groq, OpenRouter, remote custom) require a paid plan on the web.
const BUILT_IN_TEXT_KINDS = ["pollinations", "ollama"];
export function isBuiltInTextProvider(kind?: string, baseUrl?: string): boolean {
  if (kind && BUILT_IN_TEXT_KINDS.includes(kind)) return true;
  // Local servers (LM Studio, KoboldCpp, custom local) run on the user's machine.
  if (baseUrl && /(localhost|127\.0\.0\.1|0\.0\.0\.0|\.local)/i.test(baseUrl)) return true;
  return false;
}

export function canUseChat(plan: string, kind?: string, baseUrl?: string): boolean {
  if (!WEB_MODE) return true;                              // desktop: never gated
  if (isBuiltInTextProvider(kind, baseUrl)) return true;   // built-in/local/free text is free
  return plan === "pro" || plan === "studio";              // external paid API text needs a paid plan
}
