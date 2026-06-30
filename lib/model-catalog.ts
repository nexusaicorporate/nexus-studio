// ---------------------------------------------------------------------------
// Nexus model catalog — single source of truth for generative models.
//
// Derived from the Open-Generative-AI model set, but **MUAPI has been removed**.
// There are NO muapi.ai endpoints here. Every model declares how *Nexus* serves
// it via `backend`:
//   - "pollinations" : free hosted image (lib/providers.generateImage fallback)
//   - "byo:openai"   : the user's OpenAI key (images API / gpt-image-1)
//   - "modal"        : a Nexus-deployed Modal GPU backend (image_diffusers / video_ltx)
//   - "comfy"        : the managed ComfyUI runtime (LTX / lipsync graphs)
//   - "unmapped"     : known model, no Nexus transport yet (listed for tiering;
//                      hidden in UIs unless a matching backend is configured)
//
// `tier` drives entitlement gating (see lib/entitlements.ts, which derives its
// PRO/STUDIO lists from this catalog). Params are advisory hints for the studios'
// dynamic controls.
//
// To expand to the full ~200-model breadth later, machine-extract from
// https://raw.githubusercontent.com/Anil-matcha/Open-Generative-AI/main/packages/studio/src/models.js
// (strip the MUAPI `endpoint`, keep id/name/category/params, assign backend+tier).
// ---------------------------------------------------------------------------

export type ModelCategory = "t2i" | "i2i" | "t2v" | "i2v" | "lipsync";
export type ModelBackend = "pollinations" | "byo:openai" | "modal" | "comfy" | "unmapped";
export type ModelTier = "free" | "pro" | "studio";

export interface CatalogModel {
  id: string;                 // stable id used by providers/entitlements
  label: string;              // display name
  category: ModelCategory;
  backend: ModelBackend;
  tier: ModelTier;
  aspectRatios?: string[];
  resolutions?: string[];
  durations?: number[];       // seconds (video)
  maxRefImages?: number;      // i2i / i2v reference image cap
  note?: string;
}

export const CATALOG: CatalogModel[] = [
  // ---- FREE: Pollinations hosted (no key) — matches providers.generateImage fallback
  { id: "flux", label: "FLUX (Free)", category: "t2i", backend: "pollinations", tier: "free", aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"] },
  { id: "turbo", label: "Turbo (Free)", category: "t2i", backend: "pollinations", tier: "free", aspectRatios: ["1:1", "16:9", "9:16"] },
  { id: "flux-realism", label: "FLUX Realism (Free)", category: "t2i", backend: "pollinations", tier: "free", aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"] },
  { id: "flux-anime", label: "FLUX Anime (Free)", category: "t2i", backend: "pollinations", tier: "free", aspectRatios: ["1:1", "16:9", "9:16"] },

  // ---- PRO: BYO OpenAI image key
  { id: "gpt-image-1", label: "GPT Image 1 (OpenAI)", category: "t2i", backend: "byo:openai", tier: "pro", aspectRatios: ["1:1", "16:9", "9:16"], resolutions: ["1024", "1536", "2048"] },
  { id: "gpt-image-1-edit", label: "GPT Image 1 Edit (OpenAI)", category: "i2i", backend: "byo:openai", tier: "pro", maxRefImages: 5 },

  // ---- PRO/STUDIO: open models deployable on a Nexus Modal backend (image_diffusers.py)
  { id: "FLUX.1-schnell", label: "FLUX.1 schnell", category: "t2i", backend: "modal", tier: "pro", aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"], resolutions: ["1024"] },
  { id: "FLUX.1-dev", label: "FLUX.1 dev", category: "t2i", backend: "modal", tier: "pro", aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"], resolutions: ["1024", "2048"] },
  { id: "sdxl", label: "SDXL 1.0", category: "t2i", backend: "modal", tier: "pro", aspectRatios: ["1:1", "16:9", "9:16"], resolutions: ["1024"] },
  { id: "z-image-turbo", label: "Z-Image Turbo", category: "t2i", backend: "modal", tier: "pro", resolutions: ["1024"] },
  { id: "qwen-image", label: "Qwen-Image", category: "t2i", backend: "modal", tier: "pro", resolutions: ["1024"] },
  { id: "flux-kontext-dev", label: "FLUX Kontext dev (edit)", category: "i2i", backend: "modal", tier: "pro", maxRefImages: 10 },

  // ---- STUDIO: video on a Nexus Modal backend (video_ltx.py) / ComfyUI LTX graphs
  { id: "ltx-2.3", label: "LTX-2.3", category: "t2v", backend: "modal", tier: "studio", aspectRatios: ["16:9", "9:16", "1:1"], resolutions: ["480p", "720p", "1080p"], durations: [5, 10] },
  { id: "ltx-2.3-i2v", label: "LTX-2.3 (image→video)", category: "i2v", backend: "modal", tier: "studio", aspectRatios: ["16:9", "9:16"], resolutions: ["480p", "720p", "1080p"], durations: [5, 10], maxRefImages: 1 },
  { id: "wan-2.2-t2v", label: "Wan 2.2 (text→video)", category: "t2v", backend: "modal", tier: "studio", aspectRatios: ["16:9", "9:16"], durations: [5] },
  { id: "wan-2.2-i2v", label: "Wan 2.2 (image→video)", category: "i2v", backend: "modal", tier: "studio", aspectRatios: ["16:9", "9:16"], durations: [5], maxRefImages: 1 },
  { id: "hunyuan-video", label: "Hunyuan Video", category: "t2v", backend: "modal", tier: "studio", aspectRatios: ["16:9"], durations: [5] },

  // ---- STUDIO: lipsync (ComfyUI / Modal graphs) — not yet wired in providers.ts
  { id: "ltx-2.3-lipsync", label: "LTX-2.3 Lipsync", category: "lipsync", backend: "comfy", tier: "studio", resolutions: ["480p", "720p", "1080p"], note: "portrait/video + audio → talking video" },
  { id: "infinite-talk", label: "Infinite Talk", category: "lipsync", backend: "comfy", tier: "studio", resolutions: ["480p", "720p"] },
  { id: "latentsync", label: "LatentSync", category: "lipsync", backend: "comfy", tier: "studio" },

  // ---- PREMIUM named models — KNOWN but UNMAPPED (no Nexus transport yet).
  // Listed so entitlement tiers + studio menus are ready; hidden until a backend
  // is configured. Wire later via Modal/ComfyUI or a BYO provider (never MUAPI).
  { id: "veo-3", label: "Google Veo 3", category: "t2v", backend: "unmapped", tier: "studio", durations: [8], resolutions: ["720p", "1080p", "4k"] },
  { id: "veo-4", label: "Google Veo 4", category: "t2v", backend: "unmapped", tier: "studio", durations: [8, 15, 30], resolutions: ["1080p", "4k"], note: "native 4k + joint audio + camera controls" },
  { id: "kling-v2.1", label: "Kling v2.1", category: "i2v", backend: "unmapped", tier: "studio", durations: [5, 10], maxRefImages: 1 },
  { id: "kling-v3", label: "Kling v3", category: "t2v", backend: "unmapped", tier: "studio", durations: [5, 10] },
  { id: "sora-2", label: "Sora 2", category: "t2v", backend: "unmapped", tier: "studio" },
  { id: "seedance-2.0", label: "Seedance 2.0", category: "t2v", backend: "unmapped", tier: "studio", aspectRatios: ["16:9", "9:16", "4:3", "3:4"], durations: [5, 10, 15] },
  { id: "seedance-2.0-i2v", label: "Seedance 2.0 (image→video)", category: "i2v", backend: "unmapped", tier: "studio", aspectRatios: ["16:9", "9:16", "4:3", "3:4"], durations: [5, 10, 15], maxRefImages: 9 },
  { id: "seedance-2-mini", label: "Seedance 2 Mini", category: "t2v", backend: "unmapped", tier: "pro", aspectRatios: ["16:9", "9:16"], durations: [5] },
  { id: "runway-gen-4", label: "Runway Gen-4", category: "t2v", backend: "unmapped", tier: "studio" },
  { id: "grok-video", label: "Grok Video", category: "i2v", backend: "unmapped", tier: "pro", aspectRatios: ["9:16", "16:9", "1:1"], durations: [6, 10, 15] },
  { id: "hailuo-2.3", label: "MiniMax Hailuo 2.3", category: "t2v", backend: "unmapped", tier: "pro" },
  { id: "midjourney-v7", label: "Midjourney v7", category: "t2i", backend: "unmapped", tier: "studio" },
  { id: "nano-banana-2", label: "Nano Banana 2 (Gemini Image)", category: "t2i", backend: "unmapped", tier: "pro", resolutions: ["1024", "2048", "4096"] },
  { id: "nano-banana-2-edit", label: "Nano Banana 2 Edit", category: "i2i", backend: "unmapped", tier: "pro", maxRefImages: 14 },
  { id: "seedream-5.0", label: "Seedream 5.0", category: "t2i", backend: "unmapped", tier: "pro", aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"], resolutions: ["1024", "2048", "4096"] },
  { id: "ideogram-v3", label: "Ideogram v3", category: "t2i", backend: "unmapped", tier: "pro" },
];

// All catalog model ids.
export const ALL_MODEL_IDS: string[] = CATALOG.map((m) => m.id);

// Lookup helpers.
export function modelById(id: string): CatalogModel | undefined {
  return CATALOG.find((m) => m.id === id);
}

export function tierOf(id: string): ModelTier {
  return modelById(id)?.tier ?? "free";
}

// Models for a studio category. By default hides "unmapped" models (no transport)
// unless includeUnmapped is set (e.g. an admin/preview surface).
export function modelsFor(
  category: ModelCategory,
  opts: { includeUnmapped?: boolean } = {},
): CatalogModel[] {
  return CATALOG.filter(
    (m) => m.category === category && (opts.includeUnmapped || m.backend !== "unmapped"),
  );
}

// Tier-derived id lists — the entitlement source of truth.
export const PRO_MODEL_IDS: string[] = CATALOG.filter((m) => m.tier === "pro").map((m) => m.id);
export const STUDIO_MODEL_IDS: string[] = CATALOG.filter((m) => m.tier === "studio").map((m) => m.id);
