"use client";
// ─────────────────────────────────────────────────────────────────────────────
// Compatibility shim — every gear now routes through the Nexus Cloud plugin
// (see lib/nexus-cloud.ts). These wrappers keep the original call signatures
// (`provider` is inert and ignored) so existing import sites keep compiling
// while pages are reworked to the new unified client.
// ─────────────────────────────────────────────────────────────────────────────
import {
  chat as nexusChat,
  generateImage as nexusGenerateImage,
  generateVideo as nexusGenerateVideo,
  fetchModels as nexusFetchModels,
} from "@/lib/nexus-cloud";
import type { ChatMessage } from "@/lib/types";

// `provider` is inert — nothing below reads it. It exists only so legacy call
// sites that still pass a provider object don't break the build.
type InertProvider = unknown;

export interface ChatOpts {
  provider?: InertProvider;
  model?: string;
  system?: string;
  messages: ChatMessage[];
  uncensored?: boolean;
  onChunk?: (text: string) => void;
}

export async function chat(o: ChatOpts): Promise<string> {
  return nexusChat({
    model: o.model,
    system: o.system,
    messages: o.messages,
    uncensored: o.uncensored,
    onChunk: o.onChunk,
  });
}

export interface ImageOpts {
  provider?: InertProvider;
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  model?: string;
  seed?: number;
  image?: string;
  steps?: number;
  strength?: number;
}

export async function generateImage(o: ImageOpts): Promise<string> {
  return nexusGenerateImage({
    prompt: o.prompt,
    negativePrompt: o.negativePrompt,
    width: o.width,
    height: o.height,
    model: o.model,
    seed: o.seed,
    image: o.image,
    steps: o.steps,
    strength: o.strength,
  });
}

export interface VideoOpts {
  provider?: InertProvider;
  prompt: string;
  mode?: "t2v" | "i2v" | "v2v";
  model?: string;
  image?: string;
  endImage?: string;
  quantize?: boolean;
  audioFile?: string;
  frames?: number;
  fps?: number;
  seed?: number;
  onProgress?: (pct: number, status: string) => void;
}

export async function generateVideo(o: VideoOpts): Promise<string> {
  return nexusGenerateVideo({
    prompt: o.prompt,
    mode: o.mode,
    model: o.model,
    image: o.image,
    endImage: o.endImage,
    quantize: o.quantize,
    audio: o.audioFile,
    frames: o.frames,
    fps: o.fps,
    seed: o.seed,
    onProgress: o.onProgress,
  });
}

export async function fetchModels(
  _provider?: InertProvider,
  modality?: "chat" | "image" | "video",
): Promise<string[]> {
  return nexusFetchModels(modality);
}

export { getNexusCloud } from "@/lib/nexus-cloud";
export type { NexusEndpoint } from "@/lib/nexus-cloud";