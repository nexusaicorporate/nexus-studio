# Modal backends for Nexus AI Studio

Three self-hosted endpoints on your Modal account that power the whole app — LLM
(text/vision), image, and video — so you can run everything (Chat, Bulk, Character,
Image, Video, Cinema) on your own compute with uncensored models.

Why self-host: there's **no provider content filter** in the loop, so "uncensored"
is purely the model weights you choose. The image script also nulls the diffusers
safety checker.

## One-time setup
```bash
pip install modal
modal setup
# one secret shared by all three (NEXUS_SECRET = the Bearer the app sends; HF_TOKEN for gated models)
modal secret create nexus-secret NEXUS_SECRET=choose-a-long-random-secret HF_TOKEN=hf_xxx
```

## Pick your models
Edit the constant at the top of each file:
- `llm_vllm.py` → `LLM_MODEL` (uncensored/abliterated; vision-capable also handles image analysis)
- `image_diffusers.py` → `IMAGE_MODEL` (NSFW SDXL/Pony; for FLUX see the note in `load()`)
- `video_ltx.py` → `VIDEO_MODEL` (LTX-Video default; swap for Wan2.1 / CogVideoX)

## Deploy
```bash
modal deploy modal/llm_vllm.py
modal deploy modal/image_diffusers.py
modal deploy modal/video_ltx.py
```
Each prints a public URL like `https://<you>--nexus-llm-serve.modal.run`.

## Wire into the app (Settings → Providers)
| Endpoint | How to register | baseUrl |
|---|---|---|
| **LLM** | Add **custom OpenAI-compatible provider** | `https://…nexus-llm-serve.modal.run/v1` (key = `NEXUS_SECRET`) |
| **Image** | Add **Managed / Modal Backend** | `https://…nexus-image-web.modal.run` (secret = `NEXUS_SECRET`) |
| **Video** | Add **Managed / Modal Backend** | `https://…nexus-video-web.modal.run` (secret = `NEXUS_SECRET`) |

Then either select each as the active provider per modality, or flip the **Dev/Test**
switch to point Chat + Image + Video at one backend at once.

## Endpoint contract (what the app expects — keep these stable if you edit)
- **LLM:** OpenAI `/v1/chat/completions` + `/v1/models` (vLLM gives these; auth via `--api-key`).
- **Image:** `POST /generate/image` → `{ image: <b64> }`. Body: `{prompt,width,height,seed?,image?,steps?,strength?}`.
- **Video:** `POST /generate/video` → `{ job_id }`; `GET /jobs/{id}` → `{status,progress?,url?}`; `GET /video/{name}` serves the mp4.
- All non-LLM routes check `Authorization: Bearer <NEXUS_SECRET>`.

## Cost notes
- `min_containers=1` keeps one warm (no per-request model reload) but you pay for idle — set to `0` to scale to zero (adds a 1–3 min cold start).
- LLM batches cheaply; image is moderate; **video is the expensive one** (A100, minutes/clip).

## Status
These are templates validated by `modal deploy` (the deploy step type-checks and
builds the image). They're written to current Modal (v1.x) + diffusers 0.31 APIs;
the per-model pipeline call in `video_ltx.py` may need a tweak for non-LTX models.
