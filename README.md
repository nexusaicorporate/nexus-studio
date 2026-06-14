# Nexus AI Studio

A rebuild of **AI Prompt Assistant Pro** (originally Flutter desktop) in **Next.js 14 + React + TypeScript + Tailwind**, with **IndexedDB** local persistence. No backend, no account — runs in the browser, as a desktop app, or hosted on the web.

## Run as a web app (local)
```bash
cd nexus-studio
npm install
npm run dev          # http://localhost:3000  (easiest)
```
Production static build (what you'd host):
```bash
npm run build:static   # creates ./out
npm run serve:static   # serves ./out at http://localhost:3000
```
> `serve:static` only serves an already-built `./out`. Always run `build:static` first, or just use `npm run dev`.

Docker:
```bash
docker build -t nexus-ai-studio . && docker run -p 3000:3000 nexus-ai-studio
```

## Sections
- **Chat & Analyze** — multi-provider chat + image analysis using your active provider/model/system prompt.
- **Studio** — Character Creator (consistent personas), Image Studio (t2i/i2i, create·edit·animate), Video Studio (t2v/i2v/ref2v/v2v, create·edit·extend).
- **Libraries** — Prompt, Environment, Ingredient (17 categories), Recipe with a **visual builder** (assemble templates from ingredient categories). Full CRUD + JSON import/export. Prompt importer reads the original `predefined_prompts.json`.
- **Settings / Control Panel** — providers (OpenAI, Anthropic, Google, Ollama, LM Studio, KoboldCpp, OpenRouter, Groq, free Pollinations, custom OpenAI-compatible), keys/URLs, model fetch, system prompt + builder, **uncensored mode**, theme + 8 palettes.

## Packaging
- **Web**: `npm run build:static` → host `./out` anywhere; `pages.yml` auto-deploys to GitHub Pages on tag.
- **Desktop (Windows · Linux · macOS)**: Tauri v2 — `npm run desktop:build` (needs Rust + platform deps), or push a tag and let CI build all of them. Output in `src-tauri/target/release/bundle/`.
- **Auto-update**: built in — desktop apps check the GitHub `latest.json` on launch and install signed updates.

See **GITHUB_SETUP.md** for the full GitHub release pipeline.

## Notes
- Data persists in IndexedDB on your machine; use per-library Export/Import for backup.
- Web build runs in a browser sandbox (CORS may block some keyed providers); the desktop app has no such limit — best for local/uncensored models.
