# Complete setup — both Modal paths

There are two independent ways the app uses your Modal account. You can set up either or both.

- **Path A — Dev/Test backends:** HF models you deploy as endpoints; power the **Image / Video / Chat**
  studios directly (no ComfyUI). Auth = a secret you choose (`NEXUS_SECRET`).
- **Path B — ComfyUI-on-Modal:** the bundled ComfyUI runs your **workflows** on Modal GPUs via the
  `comfyui-modal` node. Auth = your Modal token (`ak-…`/`as-…`) pasted in the canvas.

Both use the **same Modal account**; the credentials/config are separate.

---

## 0. Shared prerequisites (do once)

1. Create a free account at **https://modal.com**.
2. Install + log in the Modal CLI (needed for Path A deploys):
   ```bash
   pip install modal
   modal setup            # opens browser, links your account
   ```
3. Get a **Hugging Face token** (for gated models): huggingface.co → Settings → Access Tokens → "Read".
4. Get your **Modal tokens** for Path B: modal.com → Settings → Tokens → New token →
   copy the **Token ID** (`ak-…`) and **Token Secret** (`as-…`).

---

## Path A — Dev/Test backends (Studios on Modal, no ComfyUI)

### A1. Create the shared secret (once)
```bash
modal secret create nexus-secret NEXUS_SECRET=pick-a-long-random-string HF_TOKEN=hf_xxx
```
`NEXUS_SECRET` is the Bearer the app sends; you'll paste the same value into the app later.

### A2. Pick your models
Edit the top constant in each file:
- `modal/llm_vllm.py` → `LLM_MODEL` (uncensored/abliterated; vision-capable also does image analysis)
- `modal/image_diffusers.py` → `IMAGE_MODEL` (SDXL/Pony; FLUX needs the swap noted in the file)
- `modal/video_ltx.py` → `VIDEO_MODEL` (LTX-Video default)

### A3. Deploy (each prints a public URL)
```bash
modal deploy modal/llm_vllm.py          # https://<you>--nexus-llm-serve.modal.run
modal deploy modal/image_diffusers.py   # https://<you>--nexus-image-web.modal.run
modal deploy modal/video_ltx.py         # https://<you>--nexus-video-web.modal.run
```

### A4. Register in the app — Settings gear → Providers & Models
- **LLM:** "Add custom OpenAI-compatible provider"
  - baseUrl: `https://<you>--nexus-llm-serve.modal.run/v1`  ← keep the `/v1`
  - API key: your `NEXUS_SECRET`
  - On its card, click **Set Chat**. (Click the refresh icon to load its model list.)
- **Image:** "Add Modal backend"
  - URL: `https://<you>--nexus-image-web.modal.run`, Secret: `NEXUS_SECRET`, Models: your image model name
  - Click **Set Image**.
- **Video:** "Add Modal backend"
  - URL: `https://<you>--nexus-video-web.modal.run`, Secret: `NEXUS_SECRET`, Models: your video model
  - Click **Set Video**.

### A5. Use it
- **Chat / Bulk / Character X-Ray** → your LLM endpoint.
- **Image Studio** (+ Character previews) → your image endpoint.
- **Video Studio** → shows **Render Video**; submits to your video endpoint and polls until the clip is ready.

> First request to each cold endpoint takes ~1–3 min to warm up, then it's fast (`min_containers=1`
> keeps it warm; set to `0` in the script to scale to zero and save cost between sessions).

---

## Path B — ComfyUI-on-Modal (workflows on Modal GPUs)

ComfyUI is app-managed and **desktop-only** (the app launches the process). Use the desktop shell.

### B1. Build ComfyUI into the app (once / when models change)
```bash
npm run prepare:comfyui     # downloads ComfyUI portable + the comfyui-modal node + Manager + downloader (~1.5 GB)
```
Then either:
```bash
npm run desktop:dev                 # quickest: dev desktop window with ComfyUI bundled
# or, for a real installer:
npm run desktop:build:bundled       # prepare + tauri build → installers in src-tauri/target/release/bundle
```
> Requires Rust + your OS web-view deps for the Tauri build. Run `npm run desktop:dev`, **not** `npm run dev`
> (the browser build can't launch ComfyUI).

### B2. Set your hardware (once, before first start)
- Settings gear → **Local Hardware Configuration** → pick GPU type. For cloud generation, **CPU-only** is
  the right choice (the local ComfyUI is just the UI; generation offloads to Modal).
- Optionally add your **HF / CivitAI keys** under Settings → ComfyUI → Model Provider API Keys (auto-filled
  into the model downloader for gated/CivitAI models).

### B3. Start ComfyUI
- Open the **ComfyUI Gear**. If it's the first run, click **Set up & Start ComfyUI** (it copies the bundled
  ComfyUI into place, ~1 min, then launches CPU-only). The embedded ComfyUI workspace appears.

### B4. Connect Modal inside the canvas
- In the embedded ComfyUI, open the **Modal GPU** sidebar tab (cloud icon).
- Paste your **Token ID** (`ak-…`) and **Token Secret** (`as-…`) → **Connect & Deploy**
  (deploys the `comfyui` Modal app in the background; watch the sidebar for progress).
- Toggle **Modal ON**, pick a GPU (**A10G** is the default sweet spot).

### B5. Run a workflow + get its models
- Import or build a workflow (Comfy Hub gear → Import / "Use in ComfyUI", or build directly in the canvas).
- If models are missing, open the **Workflow Models** panel → **Download All Missing** (uses your HF/CivitAI
  keys; on Modal these land in the Modal Volume).
- Queue the prompt → it runs on the Modal GPU and results stream back into the canvas.

---

## Which to use
- **Fast single-model generation in the Studios, no graph editing** → Path A.
- **Full node-graph workflows (LoRA stacks, ControlNet, custom nodes)** → Path B.

## Credentials cheat-sheet
| | Path A (backends) | Path B (ComfyUI) |
|---|---|---|
| Modal account | yes (via `modal` CLI deploy) | yes (token pasted in canvas) |
| App-side secret | `NEXUS_SECRET` (Bearer) in Settings → Providers | Modal `ak-/as-` in ComfyUI canvas |
| HF / CivitAI | in the secret (`HF_TOKEN`) | Settings → ComfyUI API Keys |
| Configured in | Settings → Providers | ComfyUI Gear sidebar |
