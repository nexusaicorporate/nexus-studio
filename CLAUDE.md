# CLAUDE.md — Nexus AI Studio (context for Claude Code)

This file orients a Claude Code session. It carries over the working context from the
Cowork sessions. Detailed docs: `docs/HANDOFF-PLAN.md` (engineering roadmap),
`docs/walkthrough.md` (what's been built), `docs/repo-evaluation-anil-matcha.md` (reuse analysis).

## What this is
Nexus AI Studio = a Next.js 14 (App Router) app shipped two ways:
- **Desktop:** wrapped in **Tauri v2** (`src-tauri/`), built as a static export (`BUILD_STATIC=1` →
  `next.config.mjs` sets `output:"export"`). Desktop is BYO‑API‑keys and fully unrestricted.
- **Web SaaS:** the same app as a normal `next build` (Node server, PM2). Web‑only features are gated
  behind `WEB_MODE` (`NEXT_PUBLIC_WEB_MODE=1`, see `lib/webmode.ts`).

## Stack (LOCKED decisions — do not reintroduce dropped tech)
- **Auth + DB (web): NextAuth (credentials) + Prisma + PostgreSQL.** `lib/auth.ts`,
  `app/api/auth/register/route.ts`, `lib/prisma.ts`, `components/AuthProvider.tsx`.
  `prisma/schema.prisma` → `User { id, email, password, plan(free|pro|studio), groups String[] }`.
  Add‑ons live in `groups` as `"<addon>-plan"` (e.g. `nsfw-plan`) — there is no `addons` column.
- **NO Supabase, NO Docker.** Both were dropped (Docker/Supabase were too much trouble). If you see
  Supabase/Docker anywhere, it's stale — remove it, don't build on it.
- **NO MUAPI (muapi.ai).** Golden rule: every generative feature routes through Nexus's own stack —
  `lib/providers.ts` (BYO keys), Modal GPU backends (`modal/`), and ComfyUI/LTX. Never add a
  `muapi.ai` endpoint. A repo scan should find MUAPI only in comments/docs saying it was removed.
- **GPU compute:** Modal (`modal/video_ltx.py` etc.), deployed separately; the web box needs no GPU.
- **Billing:** Stripe **sandbox/test mode ONLY** until the system is verified complete — do NOT add
  live keys yet. `lib/billing.ts` (Payment Links + `client_reference_id`), webhook
  `app/api/stripe/webhook/route.ts` writes plan/groups to Prisma.
- **Text AI is built‑in/local:** in‑browser web‑llm (Qwen2‑1.5B) via `lib/local-ai.ts`. Text is free;
  vision (Analyze gear) needs an external/multimodal model and is Pro‑gated.
- **Entitlements:** `lib/entitlements.ts` — `canUseModel/canUseFeature(cinema|comfy_cloud|analyze|ugc)/
  canUseChat/canUseNsfw`. Desktop (`!WEB_MODE`) is never gated. Tier lists derive from
  `lib/model-catalog.ts` (the single model source of truth; every model tagged with a Nexus `backend`
  + `tier`).

## Current status
Features #1–#4 from the roadmap are DONE and verified MUAPI‑free:
1. Model catalog (`lib/model-catalog.ts`) + entitlements + Image/Video/Cinema/UGC studios wired.
2. UGC Ads gear (`app/studio/ugc/page.tsx`), Pro‑gated.
3. Character consistency / turnaround sheets (`app/studio/character/page.tsx`).
4. Cinema story→movie pipeline + Rust `concat_videos` FFmpeg stitch (`src-tauri/src/main.rs`).
Plus lots of app work per `docs/walkthrough.md` (Home dashboard, `/chat`, Dev Gear, LTX Director, etc.).
Remaining roadmap: #5 gateway + metering (litellm / Vercel `ai` SDK) — later.

## IMMEDIATE next tasks (this is what we're doing now)
1. **Deploy to the production Linux server** using `scripts/deploy_ubuntu_26.04.sh`. Decisions:
   local Postgres install, **Cloudflare Tunnel** in front (set `PUBLIC_URL`), Stripe sandbox‑only.
   Run (as root, from repo root):
   ```bash
   sudo PUBLIC_URL=https://your-tunnel-domain \
        ADMIN_PASSWORD='...' TEST_PASSWORD='...' \
        bash scripts/deploy_ubuntu_26.04.sh
   ```
   The script: apt deps → Node20+PM2 → install/init PostgreSQL → write `.env.local` →
   `prisma generate`/`migrate deploy`/`db seed` → optional `provision_users.mjs` → `npm run build` →
   PM2 start on :3000. `set -e` means a failed build aborts before PM2 (no half‑deploy).
   Then point the Cloudflare Tunnel at `http://localhost:3000`, and
   `modal setup && modal deploy modal/video_ltx.py` → paste URL into Settings → Modal backend.
   **Pre‑flight:** run `npm run build` once locally first — it was NOT fully verifiable in the Cowork
   sandbox (45s cap); confirm green before/at deploy.
2. **Fix the `video_url` bug** (only real code bug). `lib/providers.ts` (~line 266‑267) sends video to
   the LLM as a `video_url` content block — NOT a valid type in OpenAI/Gemini chat APIs, so video
   analysis fails. Fix: client‑side frame extraction in `app/analyze/page.tsx` → send frames as
   `image_url` (works with existing providers), or use Gemini Files API. Image analysis already works.
3. **Purge stale Supabase/Docker artifacts** (Cowork sandbox couldn't delete these — do it here):
   - `rm -rf supabase/functions` (dead Edge Functions; contradict the architecture)
   - `rm docs/web-saas-milestone1.md docs/web-saas-milestone2.md` (describe the abandoned Supabase plan)
   - `rm -f tsc-scope.tmp.json` (leftover temp file; already in `.gitignore`)
   `.env.example`, `scripts/deploy_ubuntu_26.04.sh`, and `scripts/provision_users.mjs` have ALREADY been
   rewritten to Postgres/Prisma (no Supabase) — verify, don't redo.

## Gotchas
- `tsconfig.json` excludes `supabase`, `character-x-ray`, `Prompt-Builders`, `promptfill` — so stale
  Deno files there don't break the build. (Note the exclude uses lowercase `promptfill` but the folder
  is `PromptFill`; harmless on case‑insensitive FS, but fix to `PromptFill` if the Linux build ever
  tries to compile it.)
- **Ignore** the folders `Prompt-Builders`, `PromptFill`, `LTXV-PromptGen` unless explicitly told.
- Old `provision_users.mjs` had a real‑looking admin password committed in git history — rotate it if
  it was a real credential.
- On this Linux box you have a real shell and direct filesystem — no Cowork mount flakiness. Use
  `npm run build` / `tsc` / `git` directly.

## Key file map
- Providers/transport: `lib/providers.ts` (chat/generateImage/generateVideo).
- Model catalog + gating: `lib/model-catalog.ts`, `lib/entitlements.ts`, `components/UpgradePrompt.tsx`.
- Auth: `lib/auth.ts`, `components/AuthProvider.tsx`, `app/api/auth/*`.
- Billing: `lib/billing.ts`, `app/api/stripe/webhook/route.ts`, `app/billing/page.tsx`.
- Studios/gears: `app/page.tsx` (dashboard), `app/chat`, `app/analyze`, `app/studio/{image,video,cinema,character,ugc,workflow,comfy}`.
- Nav: `components/Shell.tsx`. Admin: `app/admin`, `app/api/admin/*`. Dev cockpit: `app/dev`.
- Modal GPU: `modal/*.py`. ComfyUI/LTX: `comfyui-nodes/`, `src-tauri/` (Rust commands).
- Deploy: `scripts/deploy_ubuntu_26.04.sh`, `scripts/provision_users.mjs`, `.env.example`.
