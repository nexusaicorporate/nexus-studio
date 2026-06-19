# Cloud GPU (Modal) — ComfyUI Gear setup

This is the first of three ComfyUI execution modes: **cloud GPU resources**. It lets Nexus run
ComfyUI generations on on-demand [Modal](https://modal.com) GPUs (A10G / A100 / T4) while the
local ComfyUI only acts as the orchestrator/UI — which is why the managed ComfyUI boots
**CPU-only by default**.

The cloud engine is the [`comfyui-modal`](https://github.com/JunnnnyWon/comfyui-modal) custom node
(MIT). It adds a **Modal GPU** tab to the ComfyUI sidebar where you paste your Modal token, deploy,
pick a GPU, and run — exactly the panel shown in the ComfyUI gear canvas.

> Modal gives ~$30/day of free usage — enough to demo and develop against real GPUs at no cost.

---

## How it fits together

```
Nexus app (ComfyUI Gear)
  └── embeds  ──►  Local ComfyUI  (app-managed, CPU-only, :8188)
                     └── comfyui-modal custom node
                           ├── "Modal GPU" sidebar  (token, GPU, deploy, models)
                           ├── intercepts /prompt  ──►  Modal GPU container
                           └── streams images/videos back into the canvas
```

- **ComfyUI location:** app-managed, fixed subfolder — no path setting. Desktop resolves it to a
  `comfyui/` folder next to the executable (or the per-user app-data dir if that isn't writable).
- **Device mode (Settings gear):** `CPU-only` by default so it always starts. Switch to `Local GPU`
  only if you want local (non-cloud) generation.
- **Modal config:** lives **in the canvas** (the node's sidebar), never in the app — no secrets are
  stored by Nexus.

---

## How ComfyUI ships (bundled, Windows)

ComfyUI is **bundled inside the installer** — the user never installs or copies anything.

- **Build time** — `scripts/prepare-comfyui.ps1` downloads the official ComfyUI Windows
  portable into `src-tauri/resources/comfyui/`, installs **every custom node in the manifest**
  (`scripts/comfyui-nodes.json` — ships `comfyui-modal` + `ComfyUI-Manager` by default) plus each
  node's Python requirements into the embedded Python, overlays config from
  `src-tauri/comfyui-config/`, and Tauri bundles the whole tree as an app resource.
  (`resources/comfyui/` is git-ignored — ~1.5 GB, fetched at build time / in CI.)
- **First run** — the app copies the bundled ComfyUI from its read-only resource dir into the
  writable managed folder, then launches it **CPU-only**. After that it just starts — with all
  nodes and config already in place.

```powershell
# build the desktop app WITH ComfyUI + nodes + config baked in:
npm run desktop:build:bundled     # = prepare-comfyui.ps1 + tauri build
```

### Adding custom nodes / configuration to the native install
- **A custom node:** add one entry to `scripts/comfyui-nodes.json`:
  ```json
  { "name": "ComfyUI-AnimateDiff", "repo": "https://github.com/<owner>/<repo>", "ref": "" }
  ```
  Its `requirements.txt` is installed automatically. Add global pip packages under `pip`.
- **Configuration:** drop files into `src-tauri/comfyui-config/` mirroring the ComfyUI root
  (e.g. `comfyui-config/ComfyUI/extra_model_paths.yaml`). They're overlaid into every build.
- Re-run `npm run prepare:comfyui` (or `-Force` to rebuild from scratch) to pick up changes.

### Get a Modal account + token
1. Create a free account at [modal.com](https://modal.com) (~$30/day free GPU usage).
2. Go to **Settings → Tokens**, create a token.
3. You get a **Token ID** (`ak-…`) and **Token Secret** (`as-…`) — you'll paste these into the canvas.

## Testing the real flow in dev

```powershell
npm run prepare:comfyui    # one-time: fetch ComfyUI into src-tauri/resources/comfyui (~1.5 GB)
npm run desktop:dev        # launches the desktop shell
```

Then in the app: open the **ComfyUI gear** → click **Set up & Start ComfyUI** (first run copies the
bundle into place, ~1 min) → the embedded ComfyUI Workspace appears with the **Modal GPU** tab.
Device mode (CPU default / Local GPU) and auto-start live in the **Settings gear**.

---

## Running on a Modal GPU

1. In the ComfyUI gear canvas, open the **Modal GPU** sidebar tab (cloud icon).
2. Paste your Token ID (`ak-…`) and Token Secret (`as-…`) → **Connect & Deploy**.
   - The node deploys a Modal app (`comfyui`) in the background; progress shows in the sidebar.
3. Toggle **Modal ON**, pick a GPU (**A10G** is the default sweet spot for SDXL/Flux).
4. Build/queue a workflow as normal — execution runs on the Modal GPU and results stream back.

### Models
Models live in a Modal **Volume** (`comfyui-models`), not on your disk:
- **Add:** paste a URL + filename in the sidebar's Add Model.
- **Use in nodes:** click **⬇L** to drop a zero-byte placeholder so the model appears in ComfyUI dropdowns.

### Cost control
- Containers scale to zero (`min_containers=0`); first run cold-starts in ~1–3 min, then stays warm ~60s.
- Toggle **Modal → Local** any time to bypass the cloud.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Gear shows "ComfyUI isn't running" | Click **Start ComfyUI (CPU)** (desktop) or launch it on `:8188` (web) |
| `modal CLI not found` | `pip install modal` into ComfyUI's python |
| Token not accepted | Token ID starts `ak-`, secret starts `as-` |
| 503 on Models / prompts not routing | App not deployed yet → click **↑ Deploy**; confirm **Modal ON** |
| Model missing in node dropdown | Click **⬇L** next to it to create the local placeholder |

---

## Dependency-conflict guardrail

ComfyUI loads every custom node into one shared Python process, so a node that installs an
incompatible package version can break others. We can't give each node its own venv, but we
prevent the breakage:

- **Pinned core (`constraints.txt`).** At build time the prepare script records the known-good
  versions of the critical packages (torch, numpy, transformers, …). ComfyUI launches with
  `PIP_CONSTRAINT` pointed at that file, so **any** pip install triggered at startup — by
  ComfyUI-Manager *or* a git-cloned node's `requirements.txt` — is forbidden from changing those
  versions. A conflicting node fails to install loudly instead of silently breaking everyone.
- **Known-good snapshot + repair.** The build also writes `nexus-snapshot.txt` (a full
  `pip freeze`). If something still goes wrong, the ComfyUI gear's **Repair ComfyUI environment**
  button (desktop) reinstalls that exact set via `restore_comfy_env`.

This covers both install paths (Manager and git) automatically — the user does nothing.

## GPU backends (per-vendor)

The hardware setting (Settings gear → set before first start) drives launch flags and which
portable/backend is needed:

| GPU type | Launch flag | Notes |
|---|---|---|
| NVIDIA | (none) | The bundled `ComfyUI_windows_portable_nvidia` archive. |
| CPU / none | `--cpu` | Always boots; the bundled NVIDIA archive runs fine on CPU. |
| AMD | `--directml` | Windows DirectML path (or the ROCm portable `run_amd_gpu`). |
| Intel | (XPU build) | Needs the Intel Arc XPU portable; no universal flag. |

Only one archive can be bundled per installer, so we bundle NVIDIA (also covers CPU). AMD/Intel
will fetch their matching backend on first run in a later milestone. Extra startup args
(`--listen`, `--highvram/--normalvram/--lowvram`, `--port`, free-form) and extra model folders
(written to `extra_model_paths.yaml`) are passed from Settings into the launch command.

## Models: auto-download per workflow

The Comfy Hub can **import** workflows; every workflow card has **Use in ComfyUI**, which loads it
into the canvas. A workflow JSON only names model *files* — so to fetch them we bundle the
[`ComfyUI-Workflow-Models-Downloader`](https://github.com/slahiri/ComfyUI-Workflow-Models-Downloader)
node (MIT). It scans the loaded workflow, resolves each model from workflow metadata, a curated
registry, ComfyUI-Manager's DB, HuggingFace, and CivitAI, and downloads the missing ones into the
correct `models/` subfolder.

Because the node runs **inside** ComfyUI, it targets the right storage automatically:

| Execution | Where models land |
|---|---|
| **Local** | local `models/<folder>` — or an external drive via `extra_model_paths.yaml` (the node honors those folders) |
| **Modal cloud** | the Modal **Volume** (the container's `models/` is the Volume) — *required* before a cloud generation, since the GPU container can't read your local disk |

> `extra_model_paths` is a **local** mechanism — it cannot make local files visible to a Modal
> GPU. For cloud, models must exist in the Modal Volume.

Integration points: the gear can POST the loaded workflow to `/workflow-models/scan` (live ComfyUI)
to show "N models, M missing", and surface the node's **Download All Missing**. HF/CivitAI API keys
are entered in ComfyUI's settings (gated models / CivitAI).

## Cloud-GPU provider repos (evaluated)

| Repo | Type | Use for |
|---|---|---|
| `JunnnnyWon/comfyui-modal` | Bring-your-own Modal account; ComfyUI runs in Modal containers | **Cloud GPU (current)** |
| `peremo1/ComfyUI-Modal-Client` | Also Modal, but local Flask bridge → headless Modal exec; cost estimates, HF pulls | Alt Modal recipe / borrow cost-estimate UI |
| `nathannlu/comfyui-cloud` | Managed SaaS (their account + credits), "Generate on Cloud" | A *managed* provider option, not bring-your-own |

## Roadmap (after this milestone)
- **macOS / Linux** bundling (git-clone + venv install path; the Windows portable is Windows-only).
- **Hybrid mode** — distribute across local + remote/cloud workers (see `ComfyUI-Distributed`).
- **Unified provider node** — one sidebar to pick the provider (Modal first) and hold every
  provider's config, generalizing `comfyui-modal`.
