export const PRO_MODELS = [
  "gpt-4o",
  "claude-3-5-sonnet-20240620",
  "claude-3-opus-20240229",
  "FLUX.1-schnell",
  "FLUX.1-dev",
  "LTX-2",
  "Kling 2.0",
  "Runway Gen-4",
];

export const STUDIO_MODELS: string[] = [
  // Example of models that might be Studio only
];

export function canUseModel(plan: string, model: string): boolean {
  if (plan === "studio") return true;
  if (plan === "pro") {
    if (STUDIO_MODELS.includes(model)) return false;
    return true;
  }
  // Free plan
  if (PRO_MODELS.includes(model) || STUDIO_MODELS.includes(model)) return false;
  return true;
}

export function canUseFeature(plan: string, feature: "cinema" | "comfy_cloud"): boolean {
  if (plan === "studio") return true;
  if (plan === "pro") {
    if (feature === "cinema") return false; // Let's restrict cinema to studio as an example
    return true;
  }
  // Free plan
  if (feature === "cinema" || feature === "comfy_cloud") return false;
  return true;
}

export function canUseNsfw(addons: string[]): boolean {
  return addons.includes("nsfw");
}
