/* ------------------------------------------------------------------ *
 * Extract the models a ComfyUI workflow needs, and resolve them to a
 * download source. A workflow JSON only carries model *filenames* (e.g.
 * "dreamshaper_8.safetensors") in node inputs — never URLs — so resolving a
 * filename to a downloadable source needs a mapping table, a Civitai/HF lookup,
 * or ComfyUI-Manager's model DB. This module does the extraction + table
 * resolution; the actual fetch is performed per target (local folder vs Modal
 * Volume) by the runtime layer.
 * ------------------------------------------------------------------ */
import type { ComfyModelMapping } from "@/lib/types";

// ComfyUI node-input keys that name a model file → the models/ subfolder it belongs in.
export const MODEL_INPUT_FOLDERS: Record<string, string> = {
  ckpt_name: "checkpoints",
  vae_name: "vae",
  lora_name: "loras",
  lora_name_1: "loras",
  lora_name_2: "loras",
  lora_name_3: "loras",
  control_net_name: "controlnet",
  controlnet_name: "controlnet",
  unet_name: "unet",
  clip_name: "clip",
  clip_name1: "clip",
  clip_name2: "clip",
  clip_vision_name: "clip_vision",
  style_model_name: "style_models",
  upscale_model_name: "upscale_models",
  gligen_name: "gligen",
  ipadapter_file: "ipadapter",
  instantid_file: "instantid",
  model_name: "upscale_models", // e.g. UpscaleModelLoader uses model_name
};

export interface RequiredModel {
  filename: string;
  folder: string;       // models/ subfolder
  nodeId: string;
  classType: string;
}

const MODEL_EXT = /\.(safetensors|ckpt|pt|pth|bin|gguf|sft|onnx)$/i;

// Walk a parsed ComfyUI API/workflow object and collect every referenced model file.
export function extractRequiredModels(workflow: any): RequiredModel[] {
  const out: RequiredModel[] = [];
  const seen = new Set<string>();
  if (!workflow || typeof workflow !== "object") return out;

  // API format: { "<id>": { class_type, inputs:{...} } }
  // UI format:  { nodes: [ { type, widgets_values, ... } ] } — handled loosely below.
  const nodes: [string, any][] = Array.isArray(workflow.nodes)
    ? workflow.nodes.map((n: any, i: number) => [String(n.id ?? i), n])
    : Object.entries(workflow);

  for (const [nodeId, node] of nodes) {
    if (!node || typeof node !== "object") continue;
    const classType = node.class_type || node.type || "node";
    const inputs = node.inputs || {};
    for (const [key, val] of Object.entries(inputs)) {
      const folder = MODEL_INPUT_FOLDERS[key];
      if (!folder) continue;
      // inputs can be a literal filename (string) or a node link ([id, slot]) — only literals are models.
      if (typeof val === "string" && (MODEL_EXT.test(val) || folder !== "checkpoints")) {
        const dedupe = folder + "/" + val;
        if (val && !seen.has(dedupe)) {
          seen.add(dedupe);
          out.push({ filename: val, folder, nodeId: String(nodeId), classType });
        }
      }
    }
  }
  return out;
}

export interface ResolvedModel extends RequiredModel {
  url?: string;          // download URL when known
  source?: "civitai" | "huggingface";
  resolved: boolean;
}

// Resolve required models against the user's filename→URL mappings (Settings → ComfyUI).
// Unresolved entries need a source (paste URL once, or let ComfyUI-Manager handle it).
export function resolveModels(required: RequiredModel[], mappings: ComfyModelMapping[]): ResolvedModel[] {
  return required.map((m) => {
    const hit = mappings.find((x) => x.filename.toLowerCase() === m.filename.toLowerCase());
    return hit
      ? { ...m, url: hit.downloadUrl, source: hit.source, resolved: true }
      : { ...m, resolved: false };
  });
}

export function requiredModelsSummary(models: ResolvedModel[]): string {
  const total = models.length;
  const missing = models.filter((m) => !m.resolved).length;
  if (total === 0) return "No external models referenced.";
  if (missing === 0) return `${total} model${total > 1 ? "s" : ""} — all sources known.`;
  return `${total} model${total > 1 ? "s" : ""}, ${missing} need a source.`;
}
