# comfyui-nexus-cloud

Nexus AI Studio's **own** cloud-GPU node for ComfyUI. One node, a **provider
dropdown** in the sidebar — pick a provider, enter its credentials, choose a GPU
profile, **Connect & Deploy**, and your workflows run on that provider's GPU with
models on a **persistent volume** (download once, reuse). Toggle it OFF to run
locally again.

This is ours (not a fork). It ships bundled in the Nexus desktop installer via
`scripts/prepare-comfyui.ps1` (copied from `comfyui-nodes/comfyui-nexus-cloud`).

## Why one node for every provider
Each provider is a small **adapter** behind a single interface (`adapters/base.py`).
The sidebar UI and the `/prompt` router never know which provider is active — they
only talk to `ProviderAdapter`. **Add a provider = add one file** in `adapters/`
and register it in `adapters/__init__.py`.

Two internal families, same interface:
- **SDK-deploy** (Modal, Beam, Cerebrium): deploy an app + persistent Volume + a
  served ComfyUI via the provider's Python SDK.
- **API-provision** (RunPod, Vast): launch a prebuilt ComfyUI worker image +
  attach a Network Volume via the provider's REST/GraphQL.

## Status
| Provider  | Family         | State | Persistent storage |
|-----------|----------------|-------|--------------------|
| Modal     | sdk-deploy     | **working reference** | Volume (1 TiB free) |
| Beam      | sdk-deploy     | stub (declared)       | Volumes |
| Cerebrium | sdk-deploy     | stub (declared)       | Volumes |
| RunPod    | api-provision  | stub (declared)       | Network Volume ($0.07/GB/mo) |
| Vast.ai   | api-provision  | stub (declared)       | ⚠ ephemeral — re-download risk |

Stubs appear in the dropdown so the UX is complete, but `connect/deploy/run`
return a clear "not wired up yet" until their adapter is implemented (each mirrors
`adapters/modal.py`).

## Files
```
comfyui-nexus-cloud/
  __init__.py            # ComfyUI entry: registers routes + serves web/, installs /prompt router
  server.py              # /nexus-cloud/{providers,connect,deploy,status,toggle,models/download,stop}
  nexus_modal_app.py     # the Modal App the Modal adapter deploys (ComfyUI + Volume on a Modal GPU)
  adapters/
    base.py              # the ProviderAdapter interface (+ CredField/GpuOption/ProviderSpec/DeploySpec)
    __init__.py          # REGISTRY + list_specs()/get_adapter()
    modal.py             # working reference
    beam.py cerebrium.py runpod.py vast.py   # stubs
  web/js/nexus-cloud.js  # the sidebar panel
  requirements.txt       # provider SDKs (modal required; others optional)
```

## HTTP API (local ComfyUI server)
- `GET  /nexus-cloud/providers` → specs + active + enabled
- `POST /nexus-cloud/connect` `{provider, creds}`
- `POST /nexus-cloud/deploy`  `{gpu, gpu_count, cpu, ram_gb, volume_gb}`
- `GET  /nexus-cloud/status`
- `POST /nexus-cloud/toggle`  `{enabled}`  ← routes `/prompt` to the provider when true
- `POST /nexus-cloud/models/download` `{url, folder}`
- `POST /nexus-cloud/stop`

Credentials live only in the browser's localStorage and are sent to the **local**
ComfyUI server, which forwards them to the provider you picked. Nothing is sent
anywhere else.

## Implementing the next adapter
1. Copy `adapters/modal.py` → `adapters/<id>.py`, set `SPEC` (id/label/family/
   cred_fields/gpu_options) and `implemented=True`.
2. Implement `connect/provision/status/run/stop` against that provider's SDK/REST.
3. Mount a persistent volume at the ComfyUI `models/` path in `provision`.
4. Register the class in `adapters/__init__.py`.
That's it — the sidebar and router pick it up automatically.
