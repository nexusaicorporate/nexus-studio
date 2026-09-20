# CLAUDE.md — Nexus AI Studio (context for Claude Code)

> ⚠️ **SUPERSEDED — read `AGENTS.md` first (canonical platform memory).**
> This file is the older orientation; if anything contradicts `AGENTS.md` or
> `NexusAI-Modal/AGENTS.md`, those win. Keep this file in sync with reality when you edit it.
> Last updated: 2026-09-20 — rewired to Nexus Cloud.

Detailed docs: `docs/HANDOFF-PLAN.md` (engineering roadmap), `docs/walkthrough.md` (what's been
built), `docs/repo-evaluation-anil-matcha.md` (reuse analysis).

## What this is
Nexus AI Studio = a Next.js 14 (App Router) app shipped two ways:
- **Desktop:** wrapped in **Tauri v2** (`src-tauri/`), built as a static export (`BUILD_STATIC=1` →
  `next.config.mjs` sets `output:"export"`). Desktop is unrestricted local-first.
- **Web SaaS:** the same app as a normal `next build` (Node server, PM2). Web-only features gated
  behind `WEB_MODE` (`NEXT_PUBLIC_WEB_MODE=1`, `lib/webmode.ts`).

## The ONE compute backend: Nexus Cloud (current architecture)
**Every generative gear (chat, image, video, analyze, bulk, recipes, prompt-director, cinema,
UGC, character) routes through the Nexus Cloud plugin** (`comfyui-nexus-cloud`) via
`lib/nexus-cloud.ts`. There are NO other providers — no BYO OpenAI/Anthropic/Google keys, no
Pollinations, no Ollama, no FAL, no muapi.ai, no in-app comfy-store, no `modal/` deploy scripts.
All legacy provider infra was **stripped** (commit `74918de`) and must never be reintroduced.

- `lib/nexus-cloud.ts` — real client: `chat` (OpenAI-compat SSE via `onChunk`), `generateImage`,
  `generateVideo` (submit + 15-min job poll), `fetchModels`. Resolves the live endpoint from
  `GET /nexus-cloud/status` (local ComfyUI `:8188` / web `studio.nexusaigear.com/comfyui-api`);
  hard-fails "Connect a cloud account…" when no endpoint is live.
- `lib/providers.ts` — thin compat shim over nexus-cloud. **Keep** `modelsFor` / `canUseModel` /
  `canUseFeature` / `canUseChat` (`lib/model-catalog.ts` + `lib/entitlements.ts` + `lib/webmode.ts`).
- `lib/local-ai.ts` (web-llm Qwen2-1.5B) still exists for offline sidebar helpers
  (e.g. prompt-director `TemplateEditor`); chat gear itself uses Nexus Cloud.

## Stack (LOCKED decisions — do not reintroduce dropped tech)
- **Auth + DB (web): NextAuth (credentials) + Prisma + PostgreSQL.** `lib/auth.ts`,
  `app/api/auth/register/route.ts`, `lib/prisma.ts`, `components/AuthProvider.tsx`.
  `prisma/schema.prisma` → `User { id, email, password, plan(free|pro|studio), groups String[] }`.
  Add-ons live in `groups` as `"<addon>-plan"` (e.g. `nsfw-plan`) — there is no `addons` column.
- **NO Supabase, NO Docker.** Both were dropped. If you see them, it's stale — remove, don't build on it.
- **NO MUAPI (muapi.ai).** Golden rule: every generative feature routes through Nexus Cloud only.
  A repo scan should find MUAPI only in comments/docs saying it was removed.
- **Billing:** Stripe **sandbox/test mode ONLY** until verified — no live keys.
  `lib/billing.ts` (Payment Links + `client_reference_id`), webhook `app/api/stripe/webhook/route.ts`.
- **Entitlements:** `lib/entitlements.ts` — `canUseModel/canUseFeature/canUseChat/canUseNsfw`.
  Desktop (`!WEB_MODE`) is never gated. Tiers from `lib/model-catalog.ts` (single source of truth).

## Current status
- Full Nexus Cloud rewiring done and verified: `tsc --noEmit`, `next build`, `cargo check` all green;
  plugin bundle mirrored from `NexusAI-Modal/comfyui-nexus-cloud/`. Pushed to GitHub (2026-09-20).
- **NOT live-deployed yet.** Pending platform tasks (see `NexusAI-Modal/TASKS.md`): real
  Modal/Beam deploy + smoke, sidebar GPU/model profile editor, studio "Cloud & Compute" settings
  panel (messages reference it but it doesn't exist in `app/settings/page.tsx`), hosted web path
  verify, desktop `tauri build`.
- Character page: LoraTrainer is an intentional `not_available` stub; consistency via reference images.
- Workflow gear is local-only. `promptfill/` is a self-contained sub-app — untouched.

## Gotchas
- Fresh envs need `npx prisma generate` before `tsc`/`next build` (generated Prisma client not committed).
- `tsconfig.json` excludes `supabase`, `character-x-ray`, `Prompt-Builders`, `promptfill` so stale
  Deno files don't break the build.
- **Ignore** `Prompt-Builders`, `PromptFill`, `LTXV-PromptGen` unless explicitly told.
- `.gitignore`: ignores `*.py`, `__pycache__`, `src-tauri/resources/comfyui` (+`comfyui-mcp-server`,
  bundle-time populated), dot-dirs (`.agent(s)/.claude/.opencode/.qwen`), `.env*`.
- `src-tauri/src/main.rs`: modal block removed; keep `restore_comfy_env`/`provision_comfyui`.
  The `edit` tool fails on this file — use Python anchored edits, verify by grep.
- Pre-existing committed secrets in history (`Chrome/Brave/UC Passwords.csv`, `id_ed25519`) —
  flagged for rotation/purge; never add new secrets.
- On this dev machine there is no Node/npm or Rust toolchain — validations run containerized
  (Docker daemon up, drives not file-shared: use `docker cp` into `sleep infinity` containers).

## Key file map
- **Nexus Cloud client:** `lib/nexus-cloud.ts` (+ `lib/providers.ts` shim).
- Model catalog + gating: `lib/model-catalog.ts`, `lib/entitlements.ts`, `components/UpgradePrompt.tsx`.
- Auth: `lib/auth.ts`, `components/AuthProvider.tsx`, `app/api/auth/*`.
- Billing: `lib/billing.ts`, `app/api/stripe/webhook/route.ts`, `app/billing/page.tsx`.
- Studios/gears: `app/page.tsx` (dashboard), `app/chat`, `app/analyze`,
  `app/studio/{image,video,cinema,character,ugc,workflow,comfy}`.
- Nav: `components/Shell.tsx`. Admin: `app/admin`, `app/api/admin/*`. Dev cockpit: `app/dev`.
- Bundle/comfy: `scripts/prepare-comfyui.ps1`, `comfyui-nodes/`, `src-tauri/`.
- Deploy: `scripts/deploy_ubuntu_26.04.sh`, `scripts/provision_users.mjs`, `.env.example`.