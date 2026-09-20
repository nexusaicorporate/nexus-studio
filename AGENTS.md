# AGENTS.md — Nexus AI Studio (app repo memory)

> Loaded automatically at the start of every session in this repo.
> **Canonical platform memory lives in `NexusAI-Modal/AGENTS.md`** (source of truth: goals,
> architecture, contracts, golden rules, task list). This file adds studio-app specifics.
> If `CLAUDE.md` contradicts this file, **this file wins** — CLAUDE.md is stale.
> Last updated: 2026-09-20

---

## 1. What this repo is

**Nexus AI Studio** — the main application (Next.js 14 App Router + Tauri v2), shipped as a web
SaaS (NextAuth + Prisma + PostgreSQL) and a desktop static-export app. All generative work routes
through the **Nexus Cloud plugin** (`comfyui-nexus-cloud`) — see the canonical memory for the
architecture.

GitHub: `github.com/nexusaicorporate/nexus-studio` (branch `main`). Pushed/synced 2026-09-20.

## 2. The routing reality (do not reintroduce old providers)

- **Every gear calls `lib/nexus-cloud.ts`** — `chat()`, `generateImage()`, `generateVideo()`,
  `fetchModels()`; it resolves the live endpoint via `GET {router}/nexus-cloud/status`
  (`localhost:8188` desktop / `studio.nexusaigear.com/comfyui-api` web) and hard-fails with
  "Connect a cloud account…" when none is configured.
- **`lib/providers.ts` is a compat shim** over nexus-cloud. Keep `modelsFor` / `canUseModel` /
  `canUseFeature` / `canUseChat` — they must not be stripped.
- NO OpenAI/Anthropic/Google/Pollinations/Ollama/FAL/muapi/modal-deploy paths. Gears were rewired
  (chat, analyze, bulk, recipes, AIPolishModal, prompt-director, Shell, studio/image, studio/video,
  studio/ugc, cinema, character). Workflow page is local-only. `app/api/chat/route.ts` is a
  standalone proxy.

## 3. Gears map

| Gear | Route | Notes |
|---|---|---|
| Chat + Analyze | `app/chat`, `app/analyze` | chat SSE via `onChunk`; image/video captioning |
| Bulk | `app/bulk` | batch captioning many files |
| Image Studio | `app/studio/image` | txt2img/img2img/create/edit/animate |
| Video Studio | `app/studio/video` | create · edit · extend; maps `r2v→i2v` |
| UGC Ads | `app/studio/ugc` | vertical social ads |
| Cinema | `app/studio/cinema` | story→movie, LTX engines, Rust concat_videos |
| Character | `app/studio/character` | reference-image consistency; LoraTrainer = `not_available` stub |
| Workflow | `app/studio/workflow` | ComfyUI API workflow import/run (local-only) |
| Comfy | `app/studio/comfy/[id]`, `app/studio/comfy` | managed ComfyUI + custom nodes |
| Recipes / Prompt Director | `app/library/recipes`, `app/library/prompt-director` | chat-driven editor, smartSplit/polish |
| Settings | `app/settings` | Appearance + ComfyUI tabs only (see task #3 in platform TASKS) |
| Docs | `app/docs` | rewritten for Nexus Cloud |

## 4. Validation commands (env gotchas apply — see canonical memory §8)

- `npx tsc --noEmit` — clean (needs `npx prisma generate` first in fresh envs)
- `npm run build` / `next build` — clean, all 37 pages + `/studio/comfy/[id]`
- `cargo check` on `src-tauri/` — clean (rust:1.88 container, `-j 2`)
- Plugin bundle parity: `nexus-studio/comfyui-nodes/comfyui-nexus-cloud/` is a **mirror** of
  `NexusAI-Modal/comfyui-nexus-cloud/` (source authoritative; robocopy `/MIR` sync; purge stale
  adapters). Keep byte-identical except `__pycache__`.

## 5. Key files

- `lib/nexus-cloud.ts` — the unified client (contract source for all gear calls).
- `lib/providers.ts` — compat shim. `lib/model-catalog.ts`, `lib/entitlements.ts`, `lib/webmode.ts` — unchanged.
- `src-tauri/src/main.rs` — modal block removed; keep `restore_comfy_env`/`provision_comfyui`.
- `src-tauri/tauri.conf.json` — resources glob `resources/comfyui/**/*` + `resources/comfyui-mcp-server/**/*`
  (bundle-time populated by `scripts/prepare-comfyui.ps1`).
- `scripts/prepare-comfyui.ps1` — bundles ComfyUI + plugin (`modal` pip entry KEPT — plugin adapter needs the SDK).
- `components/promptfill/` — self-contained sub-app, untouched.
- `.gitignore` — ignores `*.py`, dot-dirs, `src-tauri/resources/comfyui`, `__pycache__`, `.env*`.

## 6. Gotchas

- `NexusAI-Modal` and `nexus-studio` are separate GitHub repos both on `main`.
- Two tabs in Settings only (Appearance / ComfyUI Settings) — the "Cloud & Compute" section that
  error messages reference **does not exist yet** (platform task #3). Do not invent it without
  aligning copy.
- Secret files history (Chrome/Brave/UC Passwords.csv, id_ed25519) — pre-existing in git history,
  flagged for remediation (platform task #7); never add new secrets.
- Do not commit `public/screen-recordings` / other large media.