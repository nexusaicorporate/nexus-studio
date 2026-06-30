# Nexus Studio — Engineering Handoff Plan

> Living document. Hand this to another developer to continue the work. Last updated 2026‑06‑27.
> **Golden rule for all feature ports below: remove the MUAPI dependency.** Every feature borrowed
> from the Anil‑matcha repos must be routed through Nexus's own stack — BYO API keys, Modal GPU
> backends, and ComfyUI/LTX — never `muapi.ai`. Strip their `x-api-key`/MUAPI client and re‑point at
> `lib/providers.ts` (+ Modal). See `docs/repo-evaluation-anil-matcha.md` for the source analysis.

## 1. Architecture (current, verified)

- **Desktop:** Next.js 14 (App Router) wrapped in **Tauri v2** (Rust, `src-tauri/`). Built with
  static export (`BUILD_STATIC=1` → `next.config.mjs` sets `output:"export"`, `distDir:"out"`).
- **Web SaaS:** the same Next app run as a normal `next build` (Node server). Web‑only UI is gated by
  `WEB_MODE` = `process.env.NEXT_PUBLIC_WEB_MODE === "1"` (`lib/webmode.ts`).
- **Auth + DB (web):** **NextAuth (credentials) + Prisma + Postgres**. NO Supabase, NO Docker (both were
  dropped). `lib/auth.ts` (bcrypt vs Prisma `User`), `app/api/auth/register/route.ts`, `lib/prisma.ts`,
  `components/AuthProvider.tsx` (NextAuth `useSession`). Same Postgres in dev/test and prod; test
  locally then promote.
- **User model** (`prisma/schema.prisma`): `User { id, email, password, plan(free|pro|studio),
  groups String[] }`. Add‑ons live in `groups` as `"<addon>-plan"` (e.g. `nsfw-plan`). Also models:
  `Prompt`, `Template`, `Bank`, `Ingredient`.
- **Admin:** `/admin` + `/api/admin/users` (gated by `admin` group) to set plan/groups. `/migrate` exists.
- **Billing:** Stripe **Payment Links** (`lib/billing.ts`, `getCheckoutUrl` appends
  `client_reference_id=userId`). Webhook `app/api/stripe/webhook/route.ts` writes to **Prisma**:
  plan → `User.plan`, nsfw add‑on → `groups += "nsfw-plan"`. Billing UI `app/billing/page.tsx`.
- **Entitlements:** `lib/entitlements.ts` — `canUseModel(plan,model)`, `canUseFeature(plan,
  "cinema"|"comfy_cloud"|"analyze")`, `canUseChat(plan,kind,baseUrl)`, `canUseNsfw(addons)`.
  **Desktop (`!WEB_MODE`) is never gated** (every fn short‑circuits to allowed). Web derives `addons`
  from `groups` in `AuthProvider` (`nsfw-plan`→`nsfw`). Consumed via `components/UpgradePrompt.tsx`.
- **Text AI is built‑in/local:** in‑browser `@mlc-ai/web-llm` (Qwen2‑1.5B) in `lib/local-ai.ts`
  (`localChat`). Text is free; vision/Analyze needs an external/multimodal model (Pro‑gated).
- **Providers:** `lib/providers.ts` — `chat()`, `generateImage()`, `generateVideo()` route by
  `provider.kind`: `pollinations` (free hosted), `ollama` (local), `openai`/`custom` (incl. LM Studio,
  KoboldCpp, OpenRouter, Groq via baseUrl), `anthropic`, `google`, `modal` (Nexus's own GPU backends).
  Provider defaults in `lib/store/settings.ts`.
- **GPU compute:** Modal scripts in `modal/` (`llm_vllm.py`, `image_diffusers.py`, `video_ltx.py`),
  one‑click deploy + start/stop from Settings (`app/settings/page.tsx`, Rust cmds in
  `src-tauri/src/main.rs`: `deploy_modal_backend`, `stop_modal_app`). Cost dashboard + budget in
  `lib/store/settings.ts`. ComfyUI managed runtime + "Nexus Cloud" custom node in `comfyui-nodes/`.
  LTX‑2.3 stack documented in `docs/ltx2-setup.md`.
- **Gears (nav in `components/Shell.tsx`):** Chat (`app/page.tsx`, text‑only, `canUseChat`),
  Analyze (`app/analyze/page.tsx`, vision, Pro via `canUseFeature(...,"analyze")`), Bulk,
  Character/Image/Video/Cinema/ComfyUI/Comfy‑Hub studios, Prompts/Prompt‑Director/Ingredients library,
  Settings/Docs/Billing(web)/Admin(admin group).
- **Ignore folders:** `Prompt-Builders`, `PromptFill`, `LTXV-PromptGen` (unless told otherwise).

## 2. Gotchas / environment notes

- **Flaky workspace mount:** the Linux bash mount intermittently serves stale/NUL‑padded/truncated
  copies of files, producing phantom `tsc` errors (e.g. `TS1127 Invalid character`, `TS1005`). **The
  Read tool is authoritative** (reads real disk). Verify edits with Read, not the bash mount. To
  typecheck reliably, `tr -d '\000'` files into `/tmp` first, or just run `next build` on the real disk.
- A misconfigured plugin hook spams `check-sql-files.py: No such file or directory` after Edit/Write.
  Harmless — not from our changes.
- Dual build constraint: web uses real API routes (auth/stripe/admin/chat). Desktop static export must
  not depend on those at runtime — keep web‑only code behind `WEB_MODE`.

## 3. Work completed this session

- **Entitlements (M3) fixed:** desktop never gated; web NSFW unlock fixed (addons derived from groups).
  `lib/entitlements.ts`, `components/AuthProvider.tsx`.
- **Chat/Analyze split:** `app/page.tsx` = text‑only (`canUseChat`: built‑in/local/free providers free,
  external paid APIs need a paid plan). New `app/analyze/page.tsx` = vision, Pro‑gated. Nav updated.
- **Repo analysis:** `docs/repo-evaluation-anil-matcha.md`.

## 4. The 5‑feature program (priority order)

### #1 — Model catalog sync (MUAPI‑free)   [STATUS: COMPLETED]
**Done:** 
- `lib/model-catalog.ts` created (MUAPI-free; every model mapped to a concrete local/hosted backend + tier).
- `lib/entitlements.ts` updated to derive `PRO_MODELS` and `STUDIO_MODELS` from the catalog tiers.
- Wired both the Image Studio (`app/studio/image/page.tsx`) and Video Studio (`app/studio/video/page.tsx`) dropdown menus to use `modelsFor(category)` from the catalog, including custom tier labels.
- Passed selected model parameters correctly to image and video generator functions.
- Verified compilation and build works flawlessly with zero errors.

### #2 — UGC Ads marketing gear (Pro‑gated)   [STATUS: COMPLETED]
**Done:**
- Added `"ugc"` feature type to `canUseFeature` in `lib/entitlements.ts`.
- Gated the UGC Ads Studio on the web version for Pro & Studio tier accounts; desktop remains fully ungated.
- Integrated `UGC Ads Gear` into the Studio sidebar navigation in `components/Shell.tsx`.
- Created the interactive page at `app/studio/ugc/page.tsx` with script writing input (supporting autocomplete ingredients via `MentionTextarea`), sequential reference image uploads (`@image1` through `@image8`), aspect ratio/duration controls, and direct `generateVideo()` integration.
- Configured model dropdown to fetch image-to-video models (`i2v`) dynamically from the `lib/model-catalog.ts` list.
- Verified compilation and build works flawlessly with zero errors.

### #3 — Character consistency (sheets / omni‑ref)   [STATUS: COMPLETED]
**Done:**
- Extended `Character` model definition in `lib/types.ts` to include `characterSheetUrl` fields.
- Implemented turnaround sheet generator modal `CharacterSheetGenerator` (supporting anime, photorealistic, and 3D styles) inside `app/studio/character/page.tsx`.
- Added visual indicator badges ("Sheet Ready") and card action buttons (Palette icon) to open the generator directly from the character cards.
- Integrated character consistency loading in Image Studio (`app/studio/image/page.tsx`) so that clicking "Use Reference" loads the character sheet/first photo directly into the image-to-image refs slot and switches the mode to I2I.
- Integrated character consistency loading in Video Studio (`app/studio/video/page.tsx`) so that selecting a character locks the persona prompt and allows loading the turnaround sheet directly as the video start frame reference.
- Verified compilation and build works flawlessly with zero errors.

### #4 — Cinema/story pipeline (Micro‑Drama)   [STATUS: COMPLETED]
**Done:**
- Extended `CinemaScene` model definition in `lib/types.ts` to include `videoUrl` fields.
- Implemented `concat_videos` Tauri native command in Rust (`src-tauri/src/main.rs`) that downloads scene video buffers locally via curl, escapes paths for the FFmpeg concat demuxer format, and executes copy-stitch compiling the final video clip.
- Created the AI Screenwriter interface in `app/studio/cinema/page.tsx` to automatically write visual storyboard scene scripts from a film idea using chat completions.
- Integrated individual scene video rendering directly from the storyboard cards using the active video provider and selected video models from the catalog.
- Wired the **Compile Final Movie** button to invoke the `concat_videos` Tauri Rust bridge and display the completed movie file path.
- Verified compilation and build works flawlessly with zero errors.

### #5 — Gateway + metering (litellm / Vercel ai SDK)   [STATUS: pending / later]
**Source:** `litellm` (MIT, BerriAI fork) + `ai` (Apache‑2.0, vercel/ai fork).
**Goal:** optionally run litellm as a provider gateway + **per‑user spend tracking / virtual keys**
(needed when metering web SaaS usage / selling credits). Optionally adopt the Vercel `ai` SDK for
streaming + tool calling in Chat/Analyze/Prompt‑Director. Both are infra polish — do after #1–#4.
**Done when:** (if pursued) provider calls flow through the gateway and per‑user cost is recorded.

## 5. Licensing reminders
MIT/Apache (safe to reuse/rebrand): Open‑Generative‑AI, Open‑AI‑UGC, Micro‑Drama, Seedance‑2, Veo‑4,
litellm, ai. **AGPL‑3.0 — do NOT copy code into the proprietary SaaS: OpenMontage** (ideas only).
Director needs VideoDB commercial infra (ideas only). pipedream: skip / check per‑component license.

## 6. Open product decisions (ask Christopher)
- NSFW gating on Image/Video gears (only Character checks `canUseNsfw` today) — deferred by Christopher.
- Exact tiering of each model (which are free/pro/studio) — needs his call during #1.
- Whether #2's credits system replaces flat plans or augments them (metered vs subscription).
