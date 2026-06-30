# Repo Evaluation — Anil‑matcha set vs. Nexus Studio

Deep dive on 10 GitHub repos for potential reuse in Nexus Studio
(Next.js + Tauri desktop, NextAuth + Prisma + Postgres, Stripe, Modal GPU, ComfyUI/LTX, BYO‑keys).
Date: 2026‑06‑27.

## TL;DR ranking for Nexus

| Repo | What it is | License | Fit | Verdict |
|---|---|---|---|---|
| **Open‑Generative‑AI** | Full image/video/cinema/lipsync/workflow studio, Next.js + Electron, 200+ models | MIT | 🟢 Near‑identical to Nexus | **Mine it now** (model catalog, studios, local‑inference patterns) |
| **Open‑AI‑UGC** | UGC video‑ad SaaS: NextAuth+Prisma+Stripe+credits, 4 video models | MIT | 🟢 Same web stack as Nexus | **Port as a "UGC Ads" marketing gear** |
| **Open‑AI‑Micro‑Drama‑Generator** | Multi‑agent idea→short‑film pipeline (FastAPI + Next client) | MIT | 🟡 Python server | **Blueprint to copy** for Cinema/story feature |
| **litellm** | Unified LLM gateway, 100+ providers, cost tracking, fallbacks | MIT (fork of BerriAI/litellm) | 🟡 Infra | **Adopt later** as provider + per‑user spend layer |
| **ai** | Vercel AI SDK — streaming chat/tools for React/Next | Apache‑2.0 (fork of vercel/ai) | 🟡 Infra | **Optional** — could simplify Chat/Analyze streaming |
| **OpenMontage** | Agent‑first video production system, Remotion/HyperFrames/FFmpeg | **AGPL‑3.0** (fork of calesthio) | 🟠 Legal risk | **Study, don't copy** — AGPL is unsafe for proprietary SaaS |
| **Director** | Video‑agent framework (reasoning engine + chat UI) | MIT (fork of video‑db/Director) | 🟠 Heavy dep | **Ideas only** — requires VideoDB commercial infra |
| **Seedance‑2‑API** | Thin Python SDK + MCP over MUAPI Seedance endpoints | MIT | 🟡 Reference | **Endpoint reference** (character sheets / omni‑ref) |
| **Veo‑4‑API** | Thin Python SDK + MCP over MUAPI Veo‑4 endpoints | MIT | 🟡 Reference | **Endpoint reference** for adding Veo |
| **pipedream** | 2000+ app integrations / workflow automation platform | mixed (fork of PipedreamHQ) | 🔴 Overkill | **Skip** unless building marketing automation |

## The one cross‑cutting caveat: MUAPI

Almost every "media" repo here (Open‑Generative‑AI, Open‑AI‑UGC, Micro‑Drama, Veo‑4, Seedance‑2, and most of the model catalog) is built around **MUAPI (muapi.ai)** — a *paid hosted* model gateway. One key, async submit/poll, `x-api-key`.

Nexus Studio's stated model is **BYO keys now, self‑hosted GPU (Modal) later**. So adopting these wholesale means taking on MUAPI as a new commercial dependency. The durable value in these repos is the **UX/flows and the model catalogs**, not the MUAPI plumbing — port those onto Nexus's own `lib/providers.ts` + Modal layer rather than hard‑wiring MUAPI.

---

## 1. Open‑Generative‑AI — the closest relative (MIT)

A Next.js monorepo with a shared `packages/studio` React library exposing **ImageStudio, VideoStudio, LipSyncStudio, CinemaStudio, WorkflowStudio**. Dual‑mode (t2i/i2i, t2v/i2v) auto‑switching, a single `models.js` defining **200+ models** with per‑model aspect ratios / resolution / duration, multi‑image input (up to 14 refs), BYOK in localStorage, Electron desktop builds, and **two local engines**: bundled `sd.cpp` (Metal/CUDA/Vulkan/ROCm) and a BYO `Wan2GP` Gradio server for video.

**Why it matters:** This is effectively the upstream/sibling of Nexus Studio — same studios, same dual‑mode pattern, same BYOK + desktop + local‑inference philosophy. Highest‑value reuse:
- **`packages/studio/src/models.js`** — a 200+ model catalog with structured params. Gold for populating Nexus's Image/Video model dropdowns and for making `lib/entitlements.ts`'s `PRO_MODELS` list real instead of placeholder.
- **Local‑inference patterns** — `sd.cpp` bundling and the Wan2GP "remote GPU server" client mirror exactly what Nexus does with ComfyUI/Modal.
- **LipSync Studio + Cinema camera‑control prompt modifiers** — features Nexus doesn't fully have yet.

**Watch‑outs:** It's Electron, not Tauri; it's BYOK‑only (no auth/billing — that's where Nexus is ahead); MUAPI‑centric model layer.

## 2. Open‑AI‑UGC — best near‑term marketing feature (MIT)

A self‑hostable **AI UGC video‑ad studio** (Arcads/MakeUGC alternative). Paste a script, upload a face/product, pick a model (Veo 3.1 / Seedance 2 / Grok Video / Happy Horse 1), get a 9:16 ad. Stack: **Next.js 16, React 19, Prisma 7, NextAuth (Google), Stripe Checkout + webhook, credits system** (10 free, 1/gen), async MUAPI webhook pipeline, creations dashboard.

**Why it matters:** Its stack is *almost identical to Nexus's web tier* (NextAuth + Prisma + Stripe). This is the most directly portable marketing capability — drop it in as a **"UGC Ads" gear** gated to Pro/Studio. Specifically reusable:
- **Credits system + Stripe webhook → credit top‑up** — a cleaner pattern than the current flat‑plan webhook, and exactly what you'll need *when you sell GPU credits* (the deferred phase‑2 goal).
- **Multi‑image reference UX** (`@image1`, `@image2`, drag‑drop, order badges) — reusable in Image/Character gears.
- **Async submit → webhook → poll → live dashboard** flow.

**Watch‑outs:** MUAPI‑based; uses Google OAuth (Nexus uses credentials) — minor.

## 3. Open‑AI‑Micro‑Drama‑Generator — story→video blueprint (MIT)

A **multi‑agent pipeline**: Screenwriter → Character Extractor → Storyboard Artist → frame gen (FLUX) → video gen (Kling) → moviepy concat, all through one MUAPI key, with **SSE live progress**. FastAPI (Python) backend + Next.js client.

**Why it matters:** Clean, small, readable reference for an **"idea → multi‑scene film" feature** — i.e. what your Cinema gear could grow into. Character‑consistency approach (extract features → reference portraits → reuse across shots) is directly applicable.

**Watch‑outs:** Python/FastAPI server (Nexus is Node/Tauri) — you'd rebuild the orchestration in your stack and swap MUAPI for your providers/Modal. Take the *pipeline design*, not the code.

## 4. litellm — provider gateway + cost metering (MIT, fork of BerriAI/litellm)

Unified gateway to **100+ LLM providers** behind one OpenAI‑format API, plus a proxy server with **cost tracking, routing, fallbacks, rate limits, and virtual keys**.

**Why it matters:** Nexus hand‑rolls multi‑provider chat in `lib/providers.ts`. litellm could replace that and — critically — give you **per‑user spend tracking and budget caps**, which you'll need the moment you sell credits or meter usage on the web SaaS. The virtual‑keys feature maps well to per‑subscriber metering.

**Watch‑outs:** It's a Python service (run as a sidecar/proxy, like you already do Modal), or use it just as the proxy. Adopt *after* the current billing/entitlements work settles.

## 5. ai (Vercel AI SDK) — streaming/tooling helper (Apache‑2.0, fork of vercel/ai)

TypeScript SDK for streaming chat, tool calling, and provider abstraction in React/Next. Apache‑2.0 (permissive).

**Why it matters:** Could simplify the new Chat/Analyze streaming and add structured tool‑calling (useful for the Prompt Director / agentic features). Pure TS — fits Nexus natively, unlike the Python options.

**Watch‑outs:** Optional polish, not a gap‑filler. Only adopt if you want its streaming/tool ergonomics.

## 6. OpenMontage — best architecture, wrong license (AGPL‑3.0)

A genuinely impressive **agent‑first video production system**: 12 pipelines, 52 tools, 400+ agent skills, scored 7‑dimension provider selection, budget governance, quality gates (slideshow detection, post‑render ffprobe self‑review), Remotion + HyperFrames + FFmpeg rendering, free local + cloud providers. The "your AI coding assistant IS the orchestrator" design is excellent.

**Why it matters / why caution:** It's the gold standard for *how* to structure agentic video production — worth reading end‑to‑end for ideas (provider scoring, decision audit log, budget caps, quality gates). **But it's AGPL‑3.0**: copying its code into a hosted proprietary SaaS would obligate you to release your source to users. **Treat as inspiration only — do not lift code.**

## 7. Director — heavy framework, external dependency (MIT, fork of video‑db/Director)

"ChatGPT for video" — a reasoning engine that orchestrates 20+ video agents (search, clip, summarize, text‑to‑movie) with a chat UI. MIT‑licensed, **but built on VideoDB's commercial "video‑as‑data" infrastructure** (cloud storage/indexing/streaming). Python backend + Vue UI.

**Why it matters:** Good source of agent ideas (highlight creator, video search, text‑to‑movie). But the VideoDB dependency and Python/Vue stack make wholesale adoption costly. Ideas, not integration.

## 8–9. Seedance‑2‑API & Veo‑4‑API — thin SDKs / endpoint references (MIT)

Both are small Python wrappers (and MCP servers) over MUAPI's Seedance‑2 and Veo‑4 endpoints. Not much *code* to reuse, but they're precise **API references** for adding those models:
- **Seedance‑2** has genuinely interesting endpoints for Nexus's **Character gear**: `seedance-2-character` (multi‑panel character sheets from 1–3 photos), `@character:<id>` inline reference, and **omni‑reference** (image+video+audio conditioning). The character‑consistency workflow is the standout.
- **Veo‑4** adds native‑4K + joint audio + camera controls (pan/zoom/orbit/tracking) and video extend/edit.

If/when you wire these models (via MUAPI or your own provider), these repos are the cleanest spec.

## 10. pipedream — skip for now (mixed license, fork of PipedreamHQ)

A massive integration/workflow‑automation monorepo (2000+ app connectors). Out of scope for a creative studio unless you later build **marketing automation** (auto‑post generated ads to TikTok/Reels, CRM hooks, scheduling). Park it.

---

## Recommended actions (in order)

1. **Now — model catalog sync.** Pull `packages/studio/src/models.js` from Open‑Generative‑AI and use it to (a) flesh out Nexus's Image/Video model lists and (b) make `entitlements.PRO_MODELS`/`STUDIO_MODELS` reflect real model ids. Low effort, high payoff, MIT‑clean.
2. **Soon — "UGC Ads" marketing gear.** Port Open‑AI‑UGC's studio + multi‑image UX as a new Pro/Studio‑gated gear. Reuse its credits + Stripe‑webhook‑credit pattern as the basis for selling GPU credits later.
3. **Soon — Character consistency.** Borrow Seedance‑2's character‑sheet / omni‑reference workflow for the Character gear.
4. **Later — Cinema/story pipeline.** Rebuild Micro‑Drama's screenwriter→storyboard→frames→video pipeline in your stack (providers/Modal instead of MUAPI), with SSE progress.
5. **Later — gateway + metering.** Evaluate litellm as the provider layer + per‑user cost tracking once billing settles. Optionally adopt the Vercel `ai` SDK for streaming/tools.
6. **Reference only.** OpenMontage (AGPL — ideas, no code), Director (VideoDB dep), Veo‑4 (endpoint spec). **Skip** pipedream.

### Licensing flags
- MIT (safe to reuse/rebrand): Open‑Generative‑AI, Open‑AI‑UGC, Micro‑Drama, Director, Seedance‑2, Veo‑4, litellm.
- Apache‑2.0 (safe, permissive): `ai`.
- **AGPL‑3.0 (copyleft — do not copy into proprietary SaaS): OpenMontage.**
- pipedream: mixed/component‑specific — check per directory before using anything.
