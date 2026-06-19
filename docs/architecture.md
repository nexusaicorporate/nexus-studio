# Nexus AI Studio — Architecture, API Contracts & Design System

Reference for the system as built. Three lenses: **architecture** (how it fits together),
**API contracts** (the backend interfaces), and **design system** (UI conventions).

---

## 1. Architecture

### 1.1 Shape
A front-end-only app (Next.js 14 / React / TypeScript / Tailwind) with **no backend of its own**.
All persistence is local (IndexedDB for libraries, localStorage for settings). A **Tauri v2**
shell packages the same static export into a signed, auto-updating desktop app, and adds the only
native capabilities: managing a bundled **ComfyUI** and launching processes.

```
┌─────────────────────────── Desktop app (Tauri) ───────────────────────────┐
│  Next.js static export (the Gears UI)                                      │
│     │                                                                      │
│     ├── lib/providers.ts ──► generation backends (the abstraction)         │
│     │        chat()  generateImage()  generateVideo()  fetchModels()       │
│     │                                                                      │
│     ├── lib/comfy-runtime.ts ──► Tauri commands (Rust)                     │
│     │                                                                      │
│     └── stores: settings · library(IndexedDB) · comfy                      │
│                                                                            │
│  Rust (src-tauri): launch/stop/provision ComfyUI, write configs, updater   │
└────────────────────────────────────────────────────────────────────────────┘
        │ HTTP                         │ spawns
        ▼                              ▼
  Generation backends           Local ComfyUI (bundled)
  (BYO key · Modal · ComfyUI)   :8188 + custom nodes
```

### 1.2 The central abstraction: `backend = { baseUrl, secret, modality, modelId }`
Every generation call routes through one shape, so the *source of compute* is swappable config,
not code. A backend is one of:
- **BYO-key provider** — a hosted API (OpenAI/Anthropic/Google/Pollinations/OpenAI-compatible).
- **Modal/self-hosted** — `kind: "modal"`, an endpoint you deploy (LLM/image/video).
- **ComfyUI** — the local graph engine for flexible workflows.

This keeps three product futures open as a *config swap*: bring-your-own-key, managed compute, and
user-picks-any-HF-model.

### 1.3 Per-modality routing
`settings` holds one active provider per modality: `activeProviderId` (text/chat),
`activeImageProviderId`, `activeVideoProviderId`. Each surface reads its own:
- Text: Chat, Bulk, all "Enhance/Surprise/JSON-enhance", Character X-Ray → `chat()`.
- Image: Image Studio, Character previews → `generateImage()`.
- Video: Video Studio, (Cinema) → `generateVideo()`.

The **Dev/Test switch** (`devTest`) points all three at one Modal backend in a click and restores
the previous selection when turned off.

### 1.4 Key decisions (ADR-style)
| Decision | Why | Trade-off |
|---|---|---|
| Front-end-only + local persistence | No accounts/servers; privacy; ship as web or desktop | No multi-device sync (Export/Import instead) |
| Bundle ComfyUI in the installer | Turnkey, offline first-run | ~1.5 GB installer; build-time fetch |
| `PIP_CONSTRAINT` guardrail | One node can't break the shared Python env | A node needing a different core version fails loudly |
| ComfyUI for flexibility, dedicated servers for throughput | Graphs vs. warm single-model serving are different jobs | Two engines behind one interface |
| Modal endpoints behind `kind:"modal"` | Self-host = no provider filter; uncensored = weights you choose | You run/operate the compute |

---

## 2. API contracts

These are the interfaces the app speaks. Keep them stable when editing the Modal scripts.

### 2.1 Text / LLM — OpenAI-compatible (vLLM)
- `POST {baseUrl}/v1/chat/completions` — standard OpenAI body; streaming supported.
- `GET  {baseUrl}/v1/models`
- Auth: `Authorization: Bearer <key>` (vLLM `--api-key`). Register as a **custom** provider.

### 2.2 Image — Modal backend
```
POST {baseUrl}/generate/image          Authorization: Bearer <secret>
  body: { prompt, width, height, seed?, image?(data-url for i2i), steps?, strength?, negative? }
  200 : { image: "<base64 png>" }   |  { url }  |  { images: ["..."] }
```

### 2.3 Video — Modal backend (async job)
```
POST {baseUrl}/generate/video          Authorization: Bearer <secret>
  body: { prompt, mode("t2v"|"i2v"), image?, frames?, fps?, seed? }
  200 : { job_id }                       (or { url } to skip polling)

GET  {baseUrl}/jobs/{job_id}           Authorization: Bearer <secret>
  200 : { status: "queued"|"running"|"done"|"error", progress?: number, url?, error? }

GET  {baseUrl}/video/{name}            -> the mp4 referenced by the url above
```
Client: `lib/providers.ts → generateVideo()` submits, then polls `/jobs/{id}` with backoff
(2s→8s, 15-min cap) and reports progress via `onProgress(pct, status)`.

### 2.4 ComfyUI (local) — consumed, not authored by us
- `POST /prompt`, `GET /history/{id}`, `GET /system_stats`, WebSocket `/ws`.
- Bundled model-downloader node: `POST /workflow-models/scan` → `{ models, summary{total,existing,missing} }`.

### 2.5 Tauri commands (frontend ↔ Rust)
`comfy_managed_dir` · `comfy_status` · `provision_comfyui(gpuType)` ·
`launch_comfyui(cpuOnly, port, gpuType, extraModelPaths, cliArgs, apiKeys)` · `stop_comfyui` ·
`install_modal_node(repoUrl)` · `restore_comfy_env`. All desktop-only; the web build degrades gracefully.

---

## 3. Design system

### 3.1 Tokens (CSS variables, `app/globals.css`)
Colors are CSS variables so dark/light + 8 palettes work everywhere:
`--bg --surface --surface2 --border --text --muted --primary --primary-fg --accent`.
Set on `<html>` via `data-mode` (`dark`/`light`) and `data-palette`
(`stitch ocean forest sunset rose slate corporate amoled`).

### 3.2 Component classes (use these, don't hand-roll)
- Surfaces: `card`, `glass`. Inputs: `input`, `label`, `Field`. Toggle: `Toggle`.
- Buttons: `btn-primary`, `btn-outline`, `btn-ghost`. Pills: `chip`. Tabs: `tab` + `tab-active`/`tab-idle`.
- Nav: `nav-link` + `nav-link-active`. Modal: `Modal` (`components/ui.tsx`).
- Effects: `shadow-glow`, `fade-in`, `animate-in fade-in zoom-in`.

### 3.3 Conventions
- Every screen is a **Gear** in the sidebar, rendered through `components/Page.tsx` (`title`/`subtitle`/`actions`).
- Icons: `lucide-react`, ~13–18px inline.
- NSFW/adult features gated behind an explicit 18+ flag; "uncensored mode" prepends an adult-creator
  system preamble for verified-adult use.
- Loading states: spinner + status text (see the ComfyUI gear launcher and video render card) — reuse the pattern.

### 3.4 Adding a Gear (recipe)
1. New route under `app/…/page.tsx`, wrap content in `<Page>`.
2. Add a nav entry in `components/Shell.tsx` (`NAV`).
3. Read/write state via the relevant Zustand store; use the component classes above.
4. For generation, call `chat()`/`generateImage()`/`generateVideo()` — never fetch a provider directly.
