# LTX-2.3 video (latest) via ComfyUI

This is the **current** LTX model (22B, audio+video) — **not** the old `Lightricks/LTX-Video`
(2B) that diffusers ships. LTX-2.3 runs through ComfyUI with Lightricks' official nodes,
which is what the Nexus install now bundles.

## What's bundled (custom nodes)
Added to `scripts/comfyui-nodes.json`, installed by `npm run prepare:comfyui`:
- **ComfyUI-LTXVideo** (Lightricks, official) — the LTX-2.3 sampler/loaders. Base requirement.
- **ComfyUI-KJNodes** (Kijai) — utility nodes; a dependency of LTX Director.
- **WhatDreamsCost-ComfyUI** — **LTX Director**: a full timeline editor for LTX-2.3
  (first/middle/last keyframes, custom audio, Prompt Relay, t2v + i2v). Example workflows in
  its `example_workflows/`.

Optional control layer (a tool, not a node):
- **comfyui-mcp-server** (joenorton) — wraps a running ComfyUI and exposes
  generate/run_workflow/regenerate as MCP tools on `http://127.0.0.1:9000/mcp`.
  Start ComfyUI first, then `npm run comfyui:mcp`.

## The model bundle (download once, to the persistent volume)
LTX-2.3 is several files, downloaded from Hugging Face. Easiest path: **import an LTX Director
example workflow** (Comfy Hub -> Import / "Use in ComfyUI"), then open the **Workflow Models**
panel in the canvas and click **Auto-Resolve** — the bundled downloader pulls each file into the
correct folder using your HF token (Settings -> ComfyUI API Keys). Files:

| File | From | ComfyUI folder |
|---|---|---|
| `ltx-2.3-22b-distilled.safetensors` (fast) or `…-dev.safetensors` | `Lightricks/LTX-2.3` | `models/checkpoints/` |
| Gemma-3 text encoder (`google/gemma-3-12b-it-qat-q4_0-unquantized`, all files) | google | `models/text_encoders/` (per ComfyUI-LTXVideo) |
| `ltx-2.3-spatial-upscaler-x2-1.0.safetensors` | `Lightricks/LTX-2.3` | `models/upscale_models/` |
| `ltx-2.3-22b-distilled-lora-384.safetensors` | `Lightricks/LTX-2.3` | `models/loras/` |
| optional control LoRAs (IC-LoRA, camera, pose, detailer) | various `Lightricks/…` | `models/loras/` |

> Follow ComfyUI-LTXVideo's README for the exact loader folders if Auto-Resolve can't place one.
> On Modal these land on the **nexus-models volume**, so they download once and persist.

## ⚠ The text encoder is NOT swappable
LTX-2.3 is trained against **Gemma-3-12B's** embedding space — the diffusion model is conditioned
on that exact encoder's output. You **cannot** substitute a different LLM (e.g. a `gemma-4-E4B …
GGUF`) as the encoder: wrong architecture/tokenizer/hidden-dim => garbage conditioning, and GGUF
is a llama.cpp generation format, not a transformers encoder. The encoder also doesn't "censor" —
it only turns the prompt into vectors; there's no refusal step there.

**Where an uncensored model DOES belong:** the **prompt enhancer / chat LLM** that rewrites your
prompt before encoding (LTX's `enhance_prompt`). Run an uncensored GGUF (e.g. the DECKARD model)
via **Ollama / KoboldCpp / LM Studio** (already in the provider list) — that's llama.cpp territory,
not vLLM. Point the enhancer at that provider; keep Gemma-3 as the LTX encoder.

## GPU / memory
22B model. Use **A100 or H100** on Modal (via the comfyui-modal node) and enable **FP8**
(`fp8-cast`) to fit. The **distilled** checkpoint + DistilledPipeline is the fastest. First render
cold-starts and downloads the bundle to the volume (slow once, fast after) — keep scale-to-zero so
idle costs nothing.

## Prerequisite
ComfyUI must load cleanly first (`npm run desktop:dev` -> ComfyUI gear -> Start, or `npm run
comfyui` for the browser build). Only then add the model bundle and pick the LTX Director workflow.
