# Nexus Cloud (ComfyUI custom node)

Runs **ComfyUI workflows on cloud GPUs** from inside ComfyUI: **Modal**
(persistent-VM style web server) and **Beam** (serverless pods). Both are
**general-purpose**: any workflow that runs locally runs on the active provider,
and outputs replay into the local ComfyUI UI exactly as if they were local.

Supports **multiple saved accounts per provider**, a **primary/backup order**,
**manual failover**, and **auto-failover** on provider error. Providers never run
simultaneously — exactly one endpoint is live at any moment.

---

## Install

Copy this folder (`comfyui-nexus-cloud`) into ComfyUI's `custom_nodes/`:

```
ComfyUI/custom_nodes/comfyui-nexus-cloud
```

Then run (once, from the system Python that ComfyUI uses):

```bash
pip install modal beam-client cryptography
```

…and restart ComfyUI. A **Nexus Cloud** tab appears in the sidebar.

## Data & security

- Credentials are stored **encrypted** at `~/.nexusai/nexus-cloud/accounts.enc`
  (Fernet, machine key at `~/.nexusai/nexus-cloud/nexus-cloud.key`, `0600`).
- If `cryptography` is missing the store **degrades to plaintext JSON** and the
  sidebar is warned — install `cryptography` to encrypt.
- The browser is only ever shown masked credential values (`ak-…`).
- No secrets are hardcoded anywhere in this node.

Set `NEXUS_CLOUD_DATA_DIR` to relocate the store (e.g. a shared project dir).

## Wiring the /prompt hook

When the sidebar toggle *Route /prompt through Nexus Cloud* is **on**:

1. any client POSTs workflow to `/prompt` (web UI, scripts, the platform),
2. the node stages local input images, sends them to the active provider,
3. cloud outputs are written to ComfyUI's local `output/` and replayed through
   standard WS events (`execution_start → executing → executed →
   execution_success`).

With the toggle **off**, `/prompt` runs locally (no cloud). The primary/backup
order and auto-failover still apply to manual runs via the sidebar.

## Sidebar

Per provider (Modal / Beam):

| Control | Endpoint | What it does |
|---|---|---|
| Save account | `POST /nexus-cloud/accounts` | stores (encrypted) creds |
| Delete account | `DELETE /nexus-cloud/accounts` | removes + drops from order |
| Reorder (primary/backup) | `POST /nexus-cloud/order` | provider order for failover |
| Connect | `POST /nexus-cloud/connect` | build+provision the live endpoint |
| Deploy | `POST /nexus-cloud/deploy` | re-provision with hardware profile |
| Toggle on/off | `POST /nexus-cloud/toggle` | enable /prompt interception |
| Auto-failover on/off | `POST /nexus-cloud/failover` | failed→next, retried once |
| Failover now | `POST /nexus-cloud/failover/now` | manual switch to next |
| Status | `GET /nexus-cloud/status` | all accounts + order + live |
| Providers catalog | `GET /nexus-cloud/providers` | rendered UI definitions |
| Download model | `POST /nexus-cloud/models/download` | pull into the provider volume |
| Stop | `POST /nexus-cloud/stop` | tear down the live endpoint |

All routes are JSON. Provider SDKs are never imported by the UI layer.

## Adding a provider

1. `adapters/<provider>.py` implementing `base.ProviderAdapter`
   (`connect / provision / run / status / download_model / stop / teardown`).
2. Register it in `adapters/__init__.py`.
3. The sidebar renders it automatically from its `ProviderSpec` (credential
   fields, GPU catalog, defaults).

## Notes

- **Modal**: `nexus_modal_app.py` is the deployed app (ComfyUI web server on
  Modal + a persistent Volume at `models/`). Uses Modal's web-server family —
  cold starts in ~1-3 min, scales to zero, volume persists.
- **Beam**: `nexus_beam_app.py` defines the Pod (comfy-cli image, volume at
  `models/`, port 8000). Deploys via `Pod.create()`; URL is returned directly.
- Deploys can take a few minutes and cost money while a GPU is warm; both
  providers bill per-second and scale to zero during idle.