# Nexus Cloud — unified cloud-GPU node + studio backend (design)

Goal: one **Nexus Cloud** solution we own that sits in the ComfyUI sidebar *and* backs the Studios,
with a **provider dropdown** (Modal, Beam, Cerebrium, RunPod, …). Pick a provider, enter its creds,
set a GPU profile, Connect — and ComfyUI workflows + Studio generations run there, with models on a
persistent volume so they download once and are reused.

## 1. The core abstraction: a provider adapter
Everything hangs off one interface. Each provider is an adapter implementing it; the UI and routing
never know which provider is active.

```
ProviderAdapter:
  id, label, cred_fields[]          # what the sidebar asks for (e.g. token, api_key)
  gpu_options[]                     # GPU types this provider offers + pricing hints
  connect(creds) -> ok/err          # validate credentials
  provision(spec) -> endpoint       # ensure a running endpoint for {gpu, count, cpu, ram, volume}
  status() -> {running, gpu, uptime, est_cost, volume:{models[], used_gb}}
  run(workflow|payload) -> result   # execute a ComfyUI prompt or a studio gen request
  download_model(url, folder) -> ok # into the persistent volume
  stop() / teardown()
```

Spec passed to `provision`: `{ gpu_model, gpu_count, cpu, ram_gb, volume_name, volume_size_gb }`.

## 2. Two provider families (why the adapter matters)
The adapters differ *underneath* the same interface, because providers provision compute differently:

- **SDK-deploy family — Modal, Beam, Cerebrium.** Adapter uses the provider's **Python SDK** to deploy
  an app + persistent **Volume** + a served ComfyUI/model, then routes to it. (Our existing `comfyapp.py`
  is the Modal version; the Beam/Cerebrium versions are close ports — same shape, different SDK.)
- **API-provision family — RunPod, Vast.** Adapter calls the provider's **REST/GraphQL** to launch a
  prebuilt ComfyUI **worker image** + attach a **Network Volume**, then calls that endpoint's HTTP API.

So: one UI, one interface, two internal mechanisms. New provider = one new adapter file.

## 3. The ComfyUI node (`comfyui-nexus-cloud`)
```
comfyui-nexus-cloud/
  __init__.py
  server.py                 # ComfyUI routes: /nexus-cloud/{providers,connect,deploy,status,run,models,stop}
                            # intercepts /prompt and routes to the active adapter
  adapters/
    base.py                 # the interface above
    modal.py  beam.py  cerebrium.py  runpod.py  vast.py
  web/js/nexus-cloud.js      # sidebar UI
```
Sidebar UI (generalized from the Modal node): **provider dropdown** → dynamic cred fields for that
provider → GPU profile (model/count/CPU/RAM) → **Connect & Deploy** → ON/OFF toggle → model manager →
status (GPU, uptime, est. cost, cached models). Picking a provider just swaps the adapter.

## 4. Studio integration (reuse what's built)
The Studios already call backends via `{ baseUrl, secret, modality, model }` (`generateImage`/
`generateVideo`/`chat`). The node's adapters expose endpoints; the Studios point at the active
provider's endpoint — no new studio plumbing, just a "Nexus Cloud" provider entry whose URL/secret
come from the adapter. Same generation reaches ComfyUI *or* a direct model endpoint per provider.

## 5. Storage model (the re-download fix, uniform)
Every adapter mounts a **persistent volume** at the ComfyUI `models/` path, so models download once and
persist across runs/sessions. Differences are hidden in the adapter:
- Modal/Beam/Cerebrium → SDK Volume (Modal includes 1 TiB free).
- RunPod → Network Volume ($0.07/GB/mo, survives teardown). Vast → flagged as fragile in its adapter.

## 6. Build plan (phased)
1. **Adapter interface + node shell + Modal adapter.** Prove the architecture end-to-end with the
   provider we already understand (reuse `comfyapp.py`). Sidebar shows one provider.
2. **Beam adapter.** Easiest second (Modal-like SDK) — validates the abstraction across two SDK providers.
3. **RunPod adapter.** Validates the API-provision family + Network Volume.
4. **Studio wiring.** Point `generateImage/generateVideo/chat` at the active adapter's endpoint; add the
   "Nexus Cloud" provider card in Settings with the GPU profile + status dashboard.
5. **Cerebrium / Vast** as additional adapters once the pattern is proven.

## 7. Honest notes / risks
- This is a real multi-week build; each adapter is its own integration + testing against that provider.
- Adapters can only be validated against a live account on each provider (I can't run them here).
- "Same node fits all" is true at the **interface** level; the per-provider provisioning code is genuinely
  different (SDK vs REST) — the win is a shared UI + one mental model, not identical code underneath.
- Licensing: we author this fresh (our own node); we may reference the MIT `comfyui-modal` as a structural
  guide for the Modal adapter only.
```
