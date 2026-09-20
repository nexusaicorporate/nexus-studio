"use client";
import { useMemo, useState, ReactNode } from "react";
import { useMounted } from "@/components/ui";
import {
  BookOpen, Rocket, Compass, MessageSquare, Images, User, Image as ImageIcon,
  Clapperboard, Layers, Sparkles, Mountain, Boxes, ChefHat, Settings, Server,
  Database, Cpu, Package, FolderTree, Search, ChevronRight, Wand2, ShieldAlert, Mic
} from "lucide-react";

/* ------------------------------------------------------------------ *
 * Nexus AI Studio — built-in documentation hub.
 * A self-contained, multi-section reference covering how to use every
 * Gear plus the engineering behind it (data model, providers, packaging).
 * Pure client component so it works in the static export & Tauri build.
 * ------------------------------------------------------------------ */

// ---- tiny presentational helpers (kept literal so Tailwind keeps classes) ----
function H2({ children }: { children: ReactNode }) {
  return <h2 className="text-2xl font-bold tracking-tight mb-1">{children}</h2>;
}
function Lede({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted mb-5 max-w-3xl leading-relaxed">{children}</p>;
}
function H3({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mt-7 mb-2.5">{children}</h3>;
}
function P({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-text/90 mb-3 max-w-3xl">{children}</p>;
}
function UL({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-1.5 mb-3 max-w-3xl">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed text-text/90">
          <span className="text-primary mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0" /> <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-2 mb-3 max-w-3xl">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 text-sm leading-relaxed text-text/90">
          <span className="shrink-0 w-6 h-6 rounded-lg bg-primary/15 text-primary grid place-items-center text-xs font-bold">{i + 1}</span>
          <span className="pt-0.5">{it}</span>
        </li>
      ))}
    </ol>
  );
}
function KV({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <div className="card divide-y divide-border mb-4 max-w-3xl overflow-hidden">
      {rows.map(([k, v], i) => (
        <div key={i} className="flex flex-col sm:flex-row gap-1 sm:gap-4 px-4 py-2.5">
          <div className="sm:w-56 shrink-0 text-xs font-semibold text-primary-light">{k}</div>
          <div className="text-sm text-text/90 leading-relaxed">{v}</div>
        </div>
      ))}
    </div>
  );
}
function Code({ children }: { children: ReactNode }) {
  return <code className="px-1.5 py-0.5 rounded-md bg-surface2 border border-border text-[12px] font-mono text-accent">{children}</code>;
}
function Block({ children }: { children: ReactNode }) {
  return <pre className="text-xs bg-surface2 border border-border rounded-xl p-3.5 overflow-x-auto mb-4 max-w-3xl whitespace-pre leading-relaxed">{children}</pre>;
}
function Note({ kind = "info", children }: { kind?: "info" | "warn"; children: ReactNode }) {
  const cls = kind === "warn"
    ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
    : "border-primary/30 bg-primary/10 text-text/90";
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm leading-relaxed mb-4 max-w-3xl ${cls}`}>
      {kind === "warn" && <ShieldAlert size={15} className="inline mr-1.5 -mt-0.5 text-rose-300" />}
      {children}
    </div>
  );
}
function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-4 max-w-3xl">
      {items.map((c) => <span key={c} className="chip text-xs">{c}</span>)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section content
// ---------------------------------------------------------------------------
interface Section { id: string; label: string; group: string; icon: any; keywords?: string; body: ReactNode; }

const SECTIONS: Section[] = [
  // ===================== GETTING STARTED =====================
  {
    id: "overview", label: "Overview", group: "Getting Started", icon: BookOpen,
    keywords: "intro what is nexus studio gears",
    body: (
      <>
        <H2>Nexus AI Studio</H2>
        <Lede>
          An AI prompt assistant and generative studio. It runs as a web app, a static site,
          or a native desktop app, and stores everything locally on your machine — no account, no backend.
        </Lede>
        <P>
          The whole app is a <b>Next.js 14 + React + TypeScript + Tailwind</b> front-end with local persistence
          (<Code>IndexedDB</Code> for libraries, <Code>localStorage</Code> for settings). A <b>Tauri v2</b> wrapper turns the
          exact same code into a signed, auto-updating Windows / macOS / Linux desktop app.
        </P>
        <H3>The Gears</H3>
        <P>Every screen in the sidebar is a "Gear", grouped into four families:</P>
        <KV rows={[
          ["Workspace Gears", <>Chat &amp; Analyze (chat + image captioning via your Nexus Cloud backend) and Bulk Analyze (batch caption many files).</>],
          ["Studio Gears", <>Character, Image, Video, Workflow and Comfy Hub — the generative production tools.</>],
          ["Library Gears", <>Prompts, Environments, Ingredients and Recipes — reusable building blocks with full CRUD + import/export.</>],
          ["System Gears", <>Settings / Control Panel — appearance, system prompts and ComfyUI configuration.</>],
        ]} />
        <H3>What makes it different</H3>
        <UL items={[
          <>A single unified compute layer: every Gear routes through the <b>Nexus Cloud</b> backend — your local ComfyUI or a connected cloud account (one deployed app per provider serving prompt, chat, image and video endpoints).</>,
          <>No per-vendor API keys. The studio talks to one endpoint, secured with your own <Code>NEXUS_SECRET</Code>.</>,
          <>Persona consistency tooling: lock a Character into any generation using reference images through the Nexus Cloud backend.</>,
          <>A visual, PromptFill-style recipe builder that turns <Code>{"{{variables}}"}</Code> into clickable option chips.</>,
          <>Everything stays on your device; per-library Export/Import gives you portable backups.</>,
        ]} />
      </>
    ),
  },
  {
    id: "install", label: "Install & Run", group: "Getting Started", icon: Rocket,
    keywords: "install build docker desktop tauri npm run dev static",
    body: (
      <>
        <H2>Install &amp; Run</H2>
        <Lede>Three ways to run the same codebase: a dev server, a static site, or a native desktop build.</Lede>
        <H3>Web app (local dev)</H3>
        <Block>{`cd nexus-studio
npm install
npm run dev          # http://localhost:3000`}</Block>
        <H3>Production static build</H3>
        <P>This is what you host. <Code>build:static</Code> emits a fully static <Code>./out</Code> folder.</P>
        <Block>{`npm run build:static   # creates ./out
npm run serve:static   # serves ./out at http://localhost:3000`}</Block>
        <Note>
          <Code>serve:static</Code> only serves an already-built <Code>./out</Code>. Always run <Code>build:static</Code> first,
          or just use <Code>npm run dev</Code>.
        </Note>
        <H3>Docker</H3>
        <Block>{`docker build -t nexus-ai-studio .
docker run -p 3000:3000 nexus-ai-studio`}</Block>
        <H3>Desktop (Windows · macOS · Linux)</H3>
        <P>The Tauri build needs Rust and the platform's native web-view dependencies installed.</P>
        <Block>{`npm run desktop:dev     # hot-reload desktop window
npm run desktop:build   # bundles installers into src-tauri/target/release/bundle/`}</Block>
        <P>
          The desktop app has no browser CORS sandbox, so the bundled local ComfyUI and your Nexus Cloud connection work without restriction —
          it's the best target for local and uncensored models.
        </P>
      </>
    ),
  },
  {
    id: "concepts", label: "Core Concepts", group: "Getting Started", icon: Compass,
    keywords: "nexus cloud model system prompt task uncensored persistence",
    body: (
      <>
        <H2>Core Concepts</H2>
        <Lede>A handful of ideas thread through every Gear. Understanding these makes the rest obvious.</Lede>
        <KV rows={[
          ["Nexus Cloud", <>The single backend every chat/analyze/enhance/generate action uses. It defaults to your local ComfyUI; connecting a cloud account (Settings → Comfy → Nexus Cloud) switches all Gears to it. Status shows in the sidebar footer.</>],
          ["Model", <>The active model comes from the Nexus Cloud backend's catalog. The backend exposes its available models per modality, and the studio picks from that list on demand.</>],
          ["System prompt", <>Steers how the model responds. It can be set globally, picked per task, or chosen automatically based on the task's output type.</>],
          ["Task", <>Each surface (chat, image, video, bulk) is a named task. Tasks can each remember their own preferred system prompt via the gear button.</>],
          ["Uncensored mode", <>A toggle that prepends an adult-creator preamble to the system prompt for unrestricted creative/captioning work on capable models.</>],
          ["Local persistence", <>Libraries live in IndexedDB; settings live in localStorage. Nothing is uploaded. Use Export/Import per library for backups.</>],
        ]} />
        <H3>Mode tags</H3>
        <P>System prompts are tagged with the I/O shape they suit, so the right prompts surface for the right task:</P>
        <Chips items={["T2T text→text", "T2I text→image", "I2I image→image", "IT2I image+text→image", "I2T image→text", "T2V text→video", "I2V image→video", "V2V video→video", "V2T video→text"]} />
      </>
    ),
  },

  // ===================== WORKSPACE =====================
  {
    id: "chat", label: "Chat & Analyze", group: "Workspace Gears", icon: MessageSquare,
    keywords: "chat analyze image caption streaming prompt director",
    body: (
      <>
        <H2>Chat &amp; Analyze Gear</H2>
        <Lede>A streaming chat surface that doubles as an image analyzer/captioner using your Nexus Cloud backend, its active model, and your system prompt.</Lede>
        <H3>How to use it</H3>
        <Steps items={[
          <>Make sure a Nexus Cloud backend is connected — locally the app manages its own ComfyUI; cloud accounts are added in Settings → Comfy → Nexus Cloud (status shows in the sidebar footer).</>,
          <>Optionally choose an analysis system prompt with the gear button in the header.</>,
          <>Type a message, or attach one or more images with the image button to caption/analyze them.</>,
          <>Press Enter to send (Shift+Enter for a newline). Responses stream in token-by-token.</>,
          <>Use Copy on any assistant reply, or "New chat" to clear the thread.</>,
        ]} />
        <H3>Prompt Director Pro</H3>
        <P>
          The wand button opens <b>Prompt Director Pro</b> — a guided builder that completely overhauls prompt creation. Enter a core subject and choose a target model, then use the dynamic <b>Ingredients</b> and <b>Recipes</b> engine. Ingredients are typed, weighted building blocks (Style, World, Lighting), while Recipes are pre-configured structures. A live preview assembles the full prompt, allowing you to seamlessly link Characters and environments together. Insert drops the result into the chat box or the Cinema Gear.
        </P>
        <H3>Engineering notes</H3>
        <UL items={[
          <>Images are read as base64 data URLs and sent inline; vision support depends on the active backend model.</>,
          <>The system prompt is resolved by <Code>useTaskSystemPrompt("chat", …)</Code>, which passes an <Code>I2T</Code> mode when images are attached and <Code>T2T</Code> otherwise.</>,
          <>Streaming is handled in <Code>lib/nexus-cloud.ts → chat()</Code> (OpenAI-compatible SSE) via <Code>onChunk</Code> callbacks.</>,
        ]} />
      </>
    ),
  },
  {
    id: "bulk", label: "Bulk Analyze", group: "Workspace Gears", icon: Images,
    keywords: "bulk batch caption images videos txt export",
    body: (
      <>
        <H2>Bulk Analyze Gear</H2>
        <Lede>Caption or analyze many images/videos in one run, writing a matching <Code>.txt</Code> for each — ideal for building training-caption datasets.</Lede>
        <H3>How to use it</H3>
        <Steps items={[
          <>Click Browse and select multiple images and/or videos.</>,
          <>Choose the analysis prompt to apply to every file (gear button in the header).</>,
          <>Leave "Save prompts to text file" on to auto-download a <Code>.txt</Code> named after each source file.</>,
          <>Click "Analyze All" — a progress bar tracks completion and each row shows its caption and status.</>,
          <>Use "Download all" to get one combined <Code>bulk-prompts.txt</Code>, or copy/save individual rows.</>,
        ]} />
        <Note>
          Video captioning requires a video-capable model on the connected Nexus Cloud backend. In the web build, the <Code>.txt</Code> files
          download; a future desktop update can write them straight into the source folder.
        </Note>
        <H3>Engineering notes</H3>
        <UL items={[
          <>Files are processed sequentially; each is read to a data URL and sent as an <Code>I2T</Code> task.</>,
          <>Per-row status (<Code>queued / analyzing / done / error</Code>) and errors are surfaced inline.</>,
        ]} />
      </>
    ),
  },

  // ===================== STUDIO =====================
  {
    id: "character", label: "Character Gear", group: "Studio Gears", icon: User,
    keywords: "character persona x-ray nsfw consistency trigger word reference images",
    body: (
      <>
        <H2>Character Gear</H2>
        <Lede>Create, store and reuse consistent personas. Lock an identity anchor so every generation stays on-model — reference images keep generations consistent through the Nexus Cloud backend — or run a psychological X-Ray.</Lede>
        <H3>Building a character</H3>
        <P>The editor captures an identity anchor plus structured attributes (each dropdown supports adding your own custom options):</P>
        <UL items={[
          <><b>Identity</b> — Name, Age (18+), Trigger Word / Token, Persona &amp; Bio.</>,
          <><b>Physical</b> — Hair Color, Body Shape, Eye Color, Skin Tone, Height, Body Build.</>,
          <><b>Anchors</b> — Locked Appearance (face features), Body attributes, Default outfits, Style Notes, Negative prompts.</>,
          <><b>Reference images</b> — used for character consistency across generations.</>,
          <><b>NSFW attributes</b> (only when 18+ is enabled) — an extended adult attribute set that is appended to the generated prompt.</>,
        ]} />
        <P>
          The compiled prompt is produced by <Code>lib/character.ts → characterPrompt()</Code>, which orders the trigger word,
          persona, physical traits, appearance anchors, and (when enabled) NSFW details into a single comma-joined prompt.
        </P>
        <H3>Using a character</H3>
        <UL items={[
          <>"Generate in Studio" sends the character to the Image Gear with its prompt pre-filled and persona locked.</>,
          <>In the Image Gear you can also pick "Lock to character" to keep the persona consistent across prompts.</>,
        ]} />
        <H3>LoRA training &amp; consistency</H3>
        <P>Standalone LoRA training is not available in this build. Character consistency is handled by the Nexus Cloud backend: the
        reference images on a character are used directly by the Image and Video Gears to keep generations on-model — no training step or
        extra API key required.</P>
        <H3>Character X-Ray</H3>
        <P>
          A creative profiling tool that asks the active model to return a structured psychological reading of the persona as
          five "anatomical" layers — <i>The Skin, The Muscle, The Bone, The Heart, The Nervous System</i> — plus numeric metrics
          (mask density, ego stability, vulnerability quotient, empathic resonance) and a set of writing prompts. Output is parsed
          from JSON and saved onto the character for reuse in story/script writing.
        </P>
        <Note kind="warn">Adult features and NSFW attributes are gated behind an 18+ toggle and are intended for verified adult content creators only.</Note>
      </>
    ),
  },
  {
    id: "image", label: "Image Gear", group: "Studio Gears", icon: ImageIcon,
    keywords: "image studio text-to-image image-to-image seed ratio enhance nexus cloud",
    body: (
      <>
        <H2>Image Gear</H2>
        <Lede>Text-to-image and image-to-image generation with prompt enhancement, character locking, aspect ratios, models and seeds.</Lede>
        <H3>How to use it</H3>
        <Steps items={[
          <>Choose <b>Text → Image</b> or <b>Image → Image</b> (uploading a reference auto-switches to i2i).</>,
          <>Optionally lock to a saved character to keep the persona consistent.</>,
          <>Write a prompt, or use <b>Improve</b> (rewrites via your model) / <b>Surprise me</b> (invents one).</>,
          <>Pick an aspect ratio (1:1, 16:9, 9:16, 4:5, 3:2), a model, and a seed (dice = randomize).</>,
          <>Generate. Download the result, "Use as reference" to feed it back into i2i, or Regenerate.</>,
        ]} />
        <H3>Backend &amp; models</H3>
        <KV rows={[
          ["Nexus Cloud route", <>Every generation is sent to your connected Nexus Cloud backend (<Code>POST /generate/image</Code>) behind the <Code>NEXUS_SECRET</Code>. The model list comes from the backend's catalog.</>],
          ["Local ComfyUI", <>When no cloud account is connected, the same endpoint is served by the app's locally managed ComfyUI installation.</>],
        ]} />
        <H3>Engineering notes</H3>
        <UL items={[
          <>Generation routes through <Code>lib/nexus-cloud.ts → generateImage()</Code> to the Nexus Cloud endpoint (<Code>{"{prompt, negative_prompt, width, height, seed, image, steps, strength}"}</Code>).</>,
          <>Every result is stored in the local <Code>assets</Code> library (capped at 200) with its prompt and metadata, and shown under "Recent generations".</>,
          <>The page reads <Code>?prompt=</Code> and <Code>?character=</Code> query params, so Prompts, Recipes and Characters can deep-link into it.</>,
        ]} />
      </>
    ),
  },
  {
    id: "video", label: "Video Gear", group: "Studio Gears", icon: Clapperboard,
    keywords: "video studio t2v i2v reference video json enhance veo kling seedance wan ltx runway extend",
    body: (
      <>
        <H2>Video Gear</H2>
        <Lede>A cinematic spec builder and renderer for Text/Image/Reference/Video → Video, with create · edit · extend operations. Rendering runs on your Nexus Cloud backend (local ComfyUI or a connected cloud account) with optimized LTX engines.</Lede>
        <H3>How to use it</H3>
        <Steps items={[
          <>Pick an input mode: <b>Text → Video</b>, <b>Image → Video</b>, <b>Reference → Video</b> or <b>Video → Video</b>.</>,
          <>Pick an operation: <b>create</b>, <b>edit</b> or <b>extend</b> (extend continues from the last frame of an uploaded clip).</>,
          <>Upload start/end frames, a reference image, or a source video depending on the mode.</>,
          <>Write a prompt and use <b>Enhance</b> (cinematic rewrite) or <b>JSON enhance</b> (structured spec).</>,
          <>Choose an engine (e.g. LTX-2.3 distilled), aspect ratio and resolution, then click <b>Render</b> to process.</>,
        ]} />
        <H3>Optimized LTX-2.3 Engine</H3>
        <P>
          The Video Gear integrates the optimized backend pipeline from <Code>LTX2.3-Multifunctional</Code> directly. 
          When rendering via the Nexus Cloud backend, it runs an FP8 quantized transformer which drops VRAM requirements 
          down to 24GB, accelerating launch times and allowing runs on cheaper hardware tiers.
        </P>
        <H3>JSON enhance</H3>
        <P>
          Produces a structured JSON video spec with fields like <Code>subject</Code>, <Code>setting</Code>, <Code>camera_movement</Code>,
          <Code>lighting</Code>, <Code>color_palette</Code>, <Code>pacing</Code>, <Code>audio</Code> and a <Code>master_prompt</Code> — ready to paste into a renderer.
        </P>
        <H3>Engines</H3>
        <Chips items={["LTX-2.3 (Distilled)", "Veo 3", "Kling 2.0", "Seedance 2.0", "Wan 2.2", "Runway Gen-4"]} />
      </>
    ),
  },
  {
    id: "cinema", label: "Cinema Gear", group: "Studio Gears", icon: Clapperboard,
    keywords: "cinema studio storyboard scenes prompt director recipes script transitions timeline continuity ltx director",
    body: (
      <>
        <H2>Cinema Gear</H2>
        <Lede>Create comprehensive storyboards and script sequences by linking scenes together, powered by the Prompt Director and native LTX Director frame continuity.</Lede>
        <H3>How to use it</H3>
        <Steps items={[
          <>Create a new <b>Cinema Project</b>.</>,
          <>Add sequential <b>Scenes</b> to your storyboard timeline.</>,
          <>For each scene, open the embedded <b>Prompt Director</b> to dynamically load Recipes, tie in Characters, and mix Ingredients to craft the perfect shot.</>,
          <>Enable <b>LTX Director Mode</b> for seamless frame-to-frame continuity across scenes.</>,
          <>Stitch dialogue or background audio directly in the timeline, then click <b>Compile Movie</b> to compile the shots into a single video file.</>,
        ]} />
        <H3>Native LTX Director Continuity</H3>
        <P>
          Instead of rendering scenes in isolation (which creates visual cuts and character mismatches), the Cinema Gear ports the continuity logic from the ComfyUI <Code>WhatDreamsCost-ComfyUI</Code> (LTX Director) custom node:
        </P>
        <UL items={[
          <><b>Chained Frame Conditioning:</b> The renderer automatically extracts the last frame of the previous scene and injects it as the starting frame (I2V) of the next scene, preserving character faces, outfits, lighting, and backgrounds.</>,
          <><b>Prompt Embedding Interpolation:</b> Gradually transitions the text guidance vectors between scenes to morph environments smoothly.</>,
          <><b>FFmpeg Audio Stitching:</b> Compiles multiple generated clips and stitches voice/audio tracks onto precise frame offsets dynamically.</>,
        ]} />
        <H3>Orchestration & Timeline (Bytecut / Director-AI)</H3>
        <P>The Cinema Gear is powered by two major open-source orchestration projects:</P>
        <KV rows={[
          ["Backend (director-ai)", <>Sourced from <a href="https://github.com/cscannellnexus/director-ai" className="text-primary hover:underline" target="_blank">cscannellnexus/director-ai</a>. Runs as a standalone microservice alongside the Next.js app, wired up via <Code>ecosystem.config.js</Code> and <Code>lmrouter.yaml</Code> to handle the heavy lifting of payload compilation.</>],
          ["Frontend (bytecut-director)", <>Sourced from <a href="https://github.com/heheok/bytecut-director" className="text-primary hover:underline" target="_blank">heheok/bytecut-director</a>. Powers the cascading parameter management (Global vs Per-Shot parameters) and the <Code>queue.zip</Code> export functionality within the UI timeline.</>],
        ]} />
      </>
    ),
  },
  {
    id: "audio", label: "Audio Gear", group: "Studio Gears", icon: Mic,
    keywords: "audio music voice clone tts lip sync rapida heartmula rhubarb avatar",
    body: (
      <>
        <H2>Audio Gear</H2>
        <Lede>Generate music, clone voices, and sync speech to digital avatars using state-of-the-art audio models.</Lede>
        <H3>How to use it</H3>
        <Steps items={[
          <>Open the <b>Music</b> tab to generate full songs. Provide lyrics or have the AI generate them, select a genre style, and toggle Instrumental mode.</>,
          <>Open the <b>Voice Cloning</b> tab to upload a voice sample, train a quick clone, and generate TTS (Text-to-Speech).</>,
          <>Use the <b>Talking Avatar</b> feature to sync your generated speech to a visual character.</>,
        ]} />
        <H3>Source Integrations</H3>
        <P>The Audio Gear is composed of several specialized open-source integrations:</P>
        <KV rows={[
          ["Music UI (HeartMuLa)", <>Sourced from <a href="https://github.com/fspecii/HeartMuLa-Studio" className="text-primary hover:underline" target="_blank">fspecii/HeartMuLa-Studio</a>. Provides the React UI patterns for the lyrics input, genre styles, and history player.</>],
          ["Voice Backend (Rapida)", <>Sourced from <a href="https://github.com/rapidaai/voice-ai" className="text-primary hover:underline" target="_blank">rapidaai/voice-ai</a>. Used for the underlying gRPC streaming backend to allow low-latency agentic voice synthesis.</>],
          ["Talking Avatar", <>Sourced from <a href="https://github.com/asanchezyali/talking-avatar-with-ai" className="text-primary hover:underline" target="_blank">asanchezyali/talking-avatar-with-ai</a>. Provides the <Code>Rhubarb Lip Sync</Code> integration to visually sync TTS audio to characters.</>],
        ]} />
      </>
    ),
  },
  {
    id: "workflow", label: "Workflow Gear", group: "Studio Gears", icon: Layers,
    keywords: "workflow comfyui api json parse nodes canvas execute local nexus cloud websocket",
    body: (
      <>
        <H2>Workflow Gear</H2>
        <Lede>Import a ComfyUI API-format workflow, edit its key inputs through a form or canvas, then execute it against your local ComfyUI (or the connected Nexus Cloud backend).</Lede>
        <H3>How to use it</H3>
        <Steps items={[
          <>Paste or upload a ComfyUI <b>API-format</b> workflow JSON (or load a built-in one from the Comfy Hub).</>,
          <>The parser walks every node and surfaces editable inputs — prompt text, seed, steps and image fields — with the node title.</>,
          <>Switch between the <b>Form</b> and <b>Canvas</b> tabs to edit values.</>,
          <>Run it. Execution goes to your local ComfyUI over WebSocket; when a Nexus Cloud account is connected (Settings → Comfy → Nexus Cloud), it is used instead.</>,
          <>Save the workflow to your local repository for reuse.</>,
        ]} />
        <H3>Execution paths</H3>
        <KV rows={[
          ["Local", <>Connects to the app-managed local ComfyUI instance (default <Code>http://localhost:8188</Code>) and streams progress over WebSocket. Falls back to a simulated run if offline or CORS-blocked.</>],
          ["Nexus Cloud", <>When a cloud account is connected, execution targets the deployed backend (<Code>/prompt</Code>) behind the <Code>NEXUS_SECRET</Code> — one app per provider, with a persistent model volume.</>],
        ]} />
        <H3>Model mapping</H3>
        <P>
          When a workflow references a checkpoint/LoRA filename, the Gear resolves it against your <b>Civitai / Hugging Face model mappings</b>
          (defined in Settings) so the right download URL is associated at run time.
        </P>
      </>
    ),
  },
  {
    id: "comfy-hub", label: "Comfy Hub Gear", group: "Studio Gears", icon: Sparkles,
    keywords: "comfy hub workflow library api docs runtime environment provision",
    body: (
      <>
        <H2>Comfy Hub Gear</H2>
        <Lede>Manage your ComfyUI runtime (launch, provision, repair), browse a built-in library of ready-made workflow JSON configs, and read the ComfyUI API integration docs.</Lede>
        <H3>Tabs</H3>
        <KV rows={[
          ["Hub", <>A categorized gallery of built-in workflows (Image, Video, ControlNet, Flux, Utilities) with difficulty, node count and author. Open one to send it into the Workflow Gear.</>],
          ["Docs", <>In-context explanation of running ComfyUI as a headless JSON execution engine, the WebSocket message shapes (<Code>executing</Code>, <Code>executed</Code>), and the Nexus Cloud plugin.</>],
        ]} />
        <H3>Runtime</H3>
        <P>
          On first run the Comfy gear provisions the managed local ComfyUI (GPU-type gate, then launch). Adding a Nexus Cloud account in
          Settings → Comfy → Nexus Cloud connects cloud compute — the studio then routes through that backend.
        </P>
      </>
    ),
  },

  // ===================== LIBRARY =====================
  {
    id: "prompts", label: "Prompt Gear", group: "Library Gears", icon: BookOpen,
    keywords: "prompt library crud import export url system prompt categories modes",
    body: (
      <>
        <H2>Prompt Gear</H2>
        <Lede>Your prompt template library — categorized, searchable, taggable, and fully import/export-able. Also the home of System Prompts.</Lede>
        <H3>How to use it</H3>
        <Steps items={[
          <>Filter by category tabs, search by text, or toggle 18+ visibility.</>,
          <>Create a prompt with title, category, subcategory, modes (e.g. <Code>T2I, I2V</Code>), body, tags, cover and an NSFW flag.</>,
          <>On any card: <b>Use</b> (send to Studio), <b>Copy</b>, send to <b>Recipes</b>, <b>Edit</b> or <b>Delete</b>.</>,
          <>Import a JSON file, import <b>From URL</b> (gallery feeds), or Export the whole library.</>,
        ]} />
        <H3>Import formats</H3>
        <P>
          The importer is tolerant: arrays of objects map common fields (<Code>title/name</Code>, <Code>prompt/content/body</Code>, <Code>category</Code>,
          <Code>image/cover</Code>, <Code>tags</Code>). A nested object of <Code>{"{ collection: { title: body } }"}</Code> is read as System Prompts, and modes are
          inferred from the title/category text. This is how the original <Code>predefined_prompts.json</Code> loads.
        </P>
        <H3>System Prompts</H3>
        <P>
          Prompts in the <Code>System Prompt</Code> category appear in every task's prompt picker, grouped by subcategory (General, Captioning,
          Image Editing, Video Generation, Analysis, and more). Built-ins are seeded on first run and can be merged or reset from Settings.
        </P>
      </>
    ),
  },
  {
    id: "environments", label: "Environment Gear", group: "Library Gears", icon: Mountain,
    keywords: "environment scenes settings lighting mood weather camera angle",
    body: (
      <>
        <H2>Environment Gear</H2>
        <Lede>Reusable scenes and settings you can drop into any prompt or recipe.</Lede>
        <H3>Fields</H3>
        <UL items={[
          <>Name, Category, and a detailed location/visual description.</>,
          <>Dropdowns (each extendable with custom options): Lighting, Mood, Time of day, Weather, Camera Angle.</>,
          <>Architecture / Style, a negative modifier, tags, reference media, and an 18+ flag.</>,
        ]} />
        <P>Built-in scenes include Sunlit Beach, City Rooftop Dusk, Minimal Studio, Forest Clearing, Neon Alley, Poolside and more. Export/Import is supported.</P>
      </>
    ),
  },
  {
    id: "ingredients", label: "Ingredient Gear", group: "Library Gears", icon: Boxes,
    keywords: "ingredient building blocks categories trigger word reference weight influence",
    body: (
      <>
        <H2>Ingredient Gear</H2>
        <Lede>The reusable building blocks ("materials") you assemble recipes from, grouped into categories.</Lede>
        <H3>17 built-in categories</H3>
        <Chips items={["Subject", "Pose", "Expression", "Outfit", "Hair", "Body", "Lighting", "Camera", "Lens", "Composition", "Style", "Color", "Mood", "Setting", "Action", "Quality", "NSFW"]} />
        <H3>Fields</H3>
        <UL items={[
          <>Name/label, Category (extendable), and the <b>Value</b> — the text actually injected into recipes.</>,
          <>Optional reference image/video, a Trigger Word/token, an Influence Type and Reference Weight (strength), a visual description and a negative modifier.</>,
          <>Tags and an 18+ flag.</>,
        ]} />
        <P>Add your own category on the fly; export/import the full set as JSON.</P>
      </>
    ),
  },
  {
    id: "recipes", label: "Recipe Gear", group: "Library Gears", icon: ChefHat,
    keywords: "recipe promptfill template variables banks visual builder smart split chips",
    body: (
      <>
        <H2>Recipe Gear</H2>
        <Lede>A PromptFill-style visual builder: templates contain <Code>{"{{variables}}"}</Code> that become clickable option chips backed by reusable "banks".</Lede>
        <H3>How it works</H3>
        <UL items={[
          <><b>Templates</b> — text with tokens like <Code>{"{{art_style}}"}</Code> or an inline default <Code>{"{{camera_angle: high angle}}"}</Code>.</>,
          <><b>Banks</b> — named option lists (Role, Subject, Hair Style, Art Style, Lens Parameter, …) that fill a token's choices.</>,
          <><b>Assembly</b> — selections resolve into a final prompt; if a token has no selection it falls back to its inline default, the first bank option, or the prettified token name.</>,
        ]} />
        <H3>How to use it</H3>
        <Steps items={[
          <>Switch between the gallery and the editor. In the gallery, filter by tag or search.</>,
          <>In the editor, write template content; tokens auto-appear as labeled chips with dropdowns.</>,
          <>Pick options for each variable (or Randomize) and watch the assembled prompt update live.</>,
          <>Use <b>AI Smart Split</b> to turn a plain prompt into a reusable template — the model replaces variable phrases with <Code>{"{{snake_case: original}}"}</Code> tokens.</>,
          <><b>Use</b> sends the assembled prompt straight to the Image or Video Gear; Export saves templates + banks as one JSON.</>,
        ]} />
        <H3>Engineering notes</H3>
        <UL items={[
          <>Parsing/assembly logic lives in <Code>lib/promptfill.ts</Code> (<Code>parseTemplate</Code>, <Code>templateTokens</Code>, <Code>assembleTemplate</Code>).</>,
          <>Categories carry colors so chips are visually grouped (Character, Item, Action, Location, Visuals, Other).</>,
        ]} />
      </>
    ),
  },

  // ===================== SYSTEM =====================
  {
    id: "settings", label: "Settings", group: "System Gears", icon: Settings,
    keywords: "settings appearance comfy nexus cloud model system prompt uncensored",
    body: (
      <>
        <H2>Settings</H2>
        <Lede>The control panel has two tabs: <b>Appearance</b> (theme, palettes, library data) and <b>Comfy</b> (ComfyUI runtime, GPU type, extra model paths, CLI args, API keys for Civitai/Hugging Face/Tavily, custom nodes, model mappings and workflows).</Lede>
        <H3>Nexus Cloud compute</H3>
        <P>
          There are no per-vendor provider configs or API keys to manage. All chat, image and video generation routes through one backend:
          the <b>Nexus Cloud</b> plugin (<Code>comfyui-nexus-cloud</Code>). Locally the app manages its own ComfyUI; to use cloud GPUs you
          deploy the plugin to your provider (Modal / Beam / Cerebrium / RunPod / Vast) and connect it in Settings → Comfy → Nexus Cloud.
          The connection is secured with your <Code>NEXUS_SECRET</Code>.
        </P>
        <H3>Uncensored mode</H3>
        <P>
          When on, an adult-creator preamble is prepended to the system prompt for unrestricted creative/captioning output on capable
          models — typically local ones running in the managed ComfyUI.
        </P>
        <H3>Engineering notes</H3>
        <UL items={[
          <>Model lists come from the backend's <Code>GET /v1/models</Code> via <Code>lib/nexus-cloud.ts → fetchModels()</Code>; the local catalog in <Code>lib/model-catalog.ts</Code> powers the UI.</>,
          <>Settings persist via a Zustand store with <Code>localStorage</Code> (<Code>nexus-settings</Code>).</>,
        ]} />
      </>
    ),
  },
  {
    id: "system-prompts", label: "System Prompts & Builder", group: "System Gears", icon: Wand2,
    keywords: "system prompt builder caption length extras auto prompt default fallback picker",
    body: (
      <>
        <H2>System Prompts &amp; Builder</H2>
        <Lede>Control how the model behaves globally, per task, or automatically — and compose new prompts with the builder.</Lede>
        <H3>Resolution order</H3>
        <P>For any task, the active system prompt is resolved by <Code>useTaskSystemPrompt()</Code> in this order:</P>
        <Steps items={[
          <><b>Auto prompt</b> (if enabled): the first System Prompt whose mode tags match the current task's I/O type.</>,
          <>The task's own picked prompt (set with its gear button).</>,
          <>The <b>global default</b> prompt.</>,
          <>The plain fallback text from Settings.</>,
        ]} />
        <H3>System Prompt Builder</H3>
        <P>Compose a prompt from three controls, then save it into the Prompt Library (under System Prompt → Custom):</P>
        <UL items={[
          <><b>Caption type</b> — 16 presets (Descriptive, Flux Prompt Pro, Veo Cinematic Video Spec, Stable Diffusion, MidJourney, Danbooru tags, Art Critic, Training Caption, …).</>,
          <><b>Length</b> — 13 options from "Ultra-concise (10–15 words)" to "Detailed (300 words)".</>,
          <><b>Extras</b> — 17 toggles (Include lighting, Include camera angle, No watermark mentions, Single line output, Add negative prompts, …).</>,
        ]} />
        <P>A live preview shows the assembled instruction. You can save it to the library or set it as the fallback text.</P>
      </>
    ),
  },
  {
    id: "appearance", label: "Appearance & Data", group: "System Gears", icon: Sparkles,
    keywords: "appearance theme dark light palette reseed library data reset",
    body: (
      <>
        <H2>Appearance &amp; Library Data</H2>
        <Lede>Theme the app and manage built-in library content.</Lede>
        <H3>Theme</H3>
        <P>Toggle <b>Dark</b> / <b>Light</b> mode and choose one of 8 color palettes. The choice is applied instantly via CSS variables and remembered across sessions (and pre-applied on load to avoid a flash).</P>
        <Chips items={["stitch", "ocean", "forest", "sunset", "rose", "slate", "corporate", "amoled"]} />
        <H3>Library data</H3>
        <KV rows={[
          ["Add built-ins (safe)", "Merges any missing built-in prompts/environments/ingredients/recipes without touching your own content."],
          ["Reset to defaults", "Restores the default libraries — removes custom prompts/environments/ingredients/recipes, but keeps your characters and generations."],
        ]} />
      </>
    ),
  },
  {
    id: "comfy-settings", label: "Comfy Settings", group: "System Gears", icon: Server,
    keywords: "comfyui settings runtime custom nodes model mappings civitai huggingface nexus cloud",
    body: (
      <>
        <H2>Comfy Settings</H2>
        <Lede>Configure the local ComfyUI runtime, the Nexus Cloud connection, and the nodes and models the Gears depend on.</Lede>
        <H3>Sections</H3>
        <UL items={[
          <><b>Device &amp; Compute</b> — choose your local GPU type and toggle CLI startup arguments. The <b>Nexus Cloud</b> connect area deploys/connects the <Code>comfyui-nexus-cloud</Code> plugin backend for cloud GPU execution.</>,
          <><b>Hardware &amp; CLI Options</b> — configure GPU type and toggle <b>CLI Startup Arguments</b> like <Code>--highvram</Code>, <Code>--lowvram</Code>, and custom flags.</>,
          <><b>Extra Model Locations</b> — add absolute paths to external drives containing your models (e.g., <Code>D:\AI\Models</Code>) to be scanned on startup.</>,
          <><b>Dependency Reality Check</b> — snapshot and rollback your ComfyUI environment because individual venvs for custom nodes are technically impossible.</>,
          <><b>Civitai &amp; Hugging Face Model Enablers</b> — map a checkpoint/LoRA filename to a source, repo/model ID, version and download URL.</>,
        ]} />
        <P>These settings persist in their own Zustand store (<Code>nexus-comfy-settings</Code>) and are consumed by both the Workflow Gear and Comfy Hub.</P>
      </>
    ),
  },

  // ===================== ENGINEERING =====================
  {
    id: "architecture", label: "Architecture", group: "Engineering", icon: Cpu,
    keywords: "architecture nextjs react tailwind zustand stores client static export",
    body: (
      <>
        <H2>Architecture</H2>
        <Lede>A front-end-only application: all logic runs in the browser/web-view; there is no server component to the product.</Lede>
        <H3>Stack</H3>
        <KV rows={[
          ["Framework", <>Next.js 14 (App Router), React 18, TypeScript 5.</>],
          ["Styling", <>Tailwind CSS with CSS-variable themes (<Code>data-mode</Code> / <Code>data-palette</Code> on <Code>{"<html>"}</Code>).</>],
          ["State", <>Zustand stores: <Code>settings</Code> &amp; <Code>comfy</Code> (localStorage-persisted), <Code>library</Code> (IndexedDB-backed).</>],
          ["Icons", <>lucide-react.</>],
          ["Desktop", <>Tauri v2 (Rust) wrapping the static export.</>],
        ]} />
        <H3>Layout shell</H3>
        <P>
          <Code>app/layout.tsx</Code> sets fonts and pre-applies the saved theme, then renders <Code>components/Shell.tsx</Code> — the
          persistent sidebar (the Gears) + scrollable main area. The library store is hydrated once on first mount.
        </P>
        <H3>Compute layer (Nexus Cloud)</H3>
        <P>
          All model I/O is funneled through <Code>lib/nexus-cloud.ts</Code> to a single backend — <Code>chat()</Code> (OpenAI-compatible SSE),
          <Code>generateImage()</Code>, and the video job API (<Code>generateVideo()</Code>, submit + poll), plus <Code>fetchModels()</Code> for the
          backend's model catalog. <Code>lib/providers.ts</Code> remains as a thin compatibility shim so call sites keep working unchanged.
        </P>
      </>
    ),
  },
  {
    id: "data-model", label: "Data Model & Persistence", group: "Engineering", icon: Database,
    keywords: "data model types indexeddb localstorage seed schema entities import export",
    body: (
      <>
        <H2>Data Model &amp; Persistence</H2>
        <Lede>Entities are defined in <Code>lib/types.ts</Code> and stored locally — IndexedDB for libraries, localStorage for settings.</Lede>
        <H3>Core entities</H3>
        <KV rows={[
          ["PromptItem", "Title, category, subcategory, modes[], body, tags, mediaType, nsfw, cover."],
          ["EnvironmentItem", "Scene with lighting/mood/time/weather/architecture/camera-angle + negative modifier."],
          ["Ingredient", "Building block: category, value, trigger word, influence type, reference weight."],
          ["Recipe / Template + Bank", "Recipe slots; PromptFill Templates with {{tokens}} resolved against Banks (option lists)."],
          ["Character + CharacterXRay", "Persona, attributes, NSFW set, LoRA fields, and the 5-layer X-Ray profile + metrics."],
          ["GenAsset", "A generated image/video: url, prompt, meta, optional characterId."],
          ["Conversation / ChatMessage", "Chat history with roles, content and inline images."],
          ["Comfy* types", "ComfyModelMapping, ComfyWorkflow for the ComfyUI features."],
        ]} />
        <H3>Persistence layers</H3>
        <UL items={[
          <><b>Library store</b> (<Code>lib/store/library.ts</Code>) — a single IndexedDB key (<Code>nexus-library-v1</Code> via <Code>idb-keyval</Code>) holds prompts, environments, ingredients, recipes, characters, assets, conversations, banks and templates. Writes snapshot the whole library.</>,
          <><b>Settings store</b> (<Code>lib/store/settings.ts</Code>) — Zustand + <Code>localStorage</Code> (<Code>nexus-settings</Code>).</>,
          <><b>Comfy store</b> (<Code>lib/store/comfy.ts</Code>) — Zustand + <Code>localStorage</Code> (<Code>nexus-comfy-settings</Code>).</>,
        ]} />
        <H3>Seeding &amp; migrations</H3>
        <P>
          On first load the store seeds built-ins from <Code>lib/data/seed.ts</Code> plus large JSON feeds fetched from <Code>/public/data</Code>
          (<Code>prompts.json</Code>, <Code>templates.json</Code>, <Code>banks.json</Code>). Existing databases are upgraded in place by merging any
          missing built-ins (keyed by content) and translating older template sets — your custom items are always preserved. Settings →
          Library data exposes safe-merge and reset.
        </P>
      </>
    ),
  },
  {
    id: "providers-eng", label: "Generation Layer", group: "Engineering", icon: Cpu,
    keywords: "nexus cloud chat stream image video generation character prompt promptfill",
    body: (
      <>
        <H2>Generation Layer (Nexus Cloud)</H2>
        <Lede>The functional core that turns app state into model calls, routed through the Nexus Cloud backend.</Lede>
        <KV rows={[
          [<Code>lib/nexus-cloud.ts</Code>, <>The real client: <Code>chat()</Code> (OpenAI-compatible SSE via <Code>onChunk</Code>), <Code>generateImage()</Code>, <Code>generateVideo()</Code> (submit + poll the job API), and <Code>fetchModels()</Code>. Resolves the connected endpoint from <Code>GET /nexus-cloud/status</Code> and hard-fails with a clear "Connect a cloud account" message when none is configured.</>],
          [<Code>lib/providers.ts</Code>, <>Thin compatibility shim — same call signatures, delegating to <Code>lib/nexus-cloud.ts</Code> so existing call sites keep working.</>],
          [<Code>lib/character.ts</Code>, <>Compiles a Character into an ordered prompt string, conditionally appending the NSFW attribute set.</>],
          [<Code>lib/promptfill.ts</Code>, <>Template tokenization and assembly for the Recipe builder (<Code>{"{{token: default}}"}</Code> grammar, bank lookups, pretty labels).</>],
          [<Code>lib/recipe.ts</Code>, <>Legacy recipe-slot assembly (ingredient slots → comma-joined or templated output).</>],
          [<Code>lib/data/comfyworkflows.ts</Code>, <>The built-in Comfy Hub workflow library (API-format node graphs).</>],
          [<Code>lib/data/promptbuilder.ts</Code>, <>Caption types / lengths / extras powering the System Prompt Builder.</>],
        ]} />
        <H3>Nexus Cloud backend (comfyui-nexus-cloud)</H3>
        <P>
          The backend is a single deployed app per provider serving <Code>/prompt</Code> (ComfyUI), <Code>/v1/chat/completions</Code> (chat),
          <Code>/generate/image</Code> and <Code>/generate/video</Code>, all behind the Bearer <Code>NEXUS_SECRET</Code>. The studio discovers it via
          <Code>GET /nexus-cloud/status</Code> (local: <Code>http://localhost:8188</Code>; hosted: the deployed backend URL). The plugin's
          deployables and adapters ship under <Code>comfyui-nexus-cloud/</Code>.
        </P>
      </>
    ),
  },
  {
    id: "packaging", label: "Desktop, CI & Packaging", group: "Engineering", icon: Package,
    keywords: "tauri desktop updater github actions release pages ci signing latest.json",
    body: (
      <>
        <H2>Desktop, CI &amp; Packaging</H2>
        <Lede>How the same code ships as a website and as signed, auto-updating desktop apps.</Lede>
        <H3>Tauri desktop</H3>
        <UL items={[
          <><Code>src-tauri/</Code> holds the Rust shell. <Code>main.rs</Code> wires the shell, process and updater plugins and checks for updates on launch.</>,
          <><Code>tauri.conf.json</Code> builds from the static <Code>../out</Code> export, sets the window, bundle targets ("all") and the updater endpoint + public key.</>,
          <><b>ComfyUI Auto-Provisioning</b>: The desktop bundle extracts a portable ComfyUI ZIP to <Code>AppData\Roaming\comfy-studio</Code> on first run, managed as a child process via Rust.</>,
          <>Auto-update: desktop apps fetch the GitHub <Code>latest.json</Code> on launch and install signed updates silently.</>,
        ]} />
        <H3>GitHub Actions</H3>
        <KV rows={[
          [<Code>ci.yml</Code>, "Builds/lints the web app on push."],
          [<Code>pages.yml</Code>, "Deploys the static ./out to GitHub Pages on tag."],
          [<Code>release.yml</Code>, "On a v* tag: generates a changelog and builds desktop installers for Windows, macOS and Linux."],
        ]} />
        <P>See <Code>GITHUB_SETUP.md</Code> in the repo root for the full release-pipeline walkthrough (signing keys, secrets, endpoints).</P>
      </>
    ),
  },
  {
    id: "structure", label: "Project Structure", group: "Engineering", icon: FolderTree,
    keywords: "files folders directory layout app components lib src-tauri public",
    body: (
      <>
        <H2>Project Structure</H2>
        <Lede>Where everything lives.</Lede>
        <Block>{`nexus-studio/
├─ app/                      # Next.js routes (the Gears)
│  ├─ page.tsx               # Chat & Analyze
│  ├─ bulk/                  # Bulk Analyze
│  ├─ docs/                  # ← this documentation hub
│  ├─ studio/
│  │  ├─ character/  image/  video/  workflow/  comfy/
│  ├─ library/
│  │  ├─ prompts/  environments/  ingredients/  recipes/
│  └─ settings/              # Control Panel
├─ components/               # Shell, Page, ui, PromptPicker, PromptDirector, …
├─ lib/
│  ├─ types.ts               # data model
│  ├─ nexus-cloud.ts         # unified Nexus Cloud client (chat / image / video / models)
│  ├─ providers.ts           # compat shim delegating to nexus-cloud
│  ├─ character.ts  recipe.ts  promptfill.ts  utils.ts
│  ├─ data/                  # seed.ts, promptbuilder.ts, comfyworkflows.ts
│  └─ store/                 # settings, library, comfy (Zustand)
├─ public/data/              # prompts.json, templates.json, banks.json (seed feeds)
├─ src-tauri/                # Rust desktop shell + config + icons
└─ .github/workflows/        # ci.yml, pages.yml, release.yml`}</Block>
        <Note>
          The repo also contains <Code>character-forge/</Code> and <Code>character-x-ray/</Code> — earlier standalone prototypes
          (Vite + Firebase + Gemini) whose Character Forge and X-Ray concepts were ported into the main app's Character Gear.
        </Note>
      </>
    ),
  },
];

const GROUP_ORDER = ["Getting Started", "Workspace Gears", "Studio Gears", "Library Gears", "System Gears", "Engineering"];

export default function DocsPage() {
  const mounted = useMounted();
  const [activeId, setActiveId] = useState("overview");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return SECTIONS;
    const t = q.toLowerCase();
    return SECTIONS.filter((s) => (s.label + " " + s.group + " " + (s.keywords || "")).toLowerCase().includes(t));
  }, [q]);

  const grouped = useMemo(() => {
    const g: Record<string, Section[]> = {};
    for (const s of filtered) (g[s.group] ||= []).push(s);
    return g;
  }, [filtered]);

  const active = SECTIONS.find((s) => s.id === activeId) || SECTIONS[0];
  if (!mounted) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* sub-nav */}
      <aside className="w-64 shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary grid place-items-center text-primary-fg"><BookOpen size={16} /></div>
            <div>
              <div className="font-semibold leading-tight">Documentation</div>
              <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">Capabilities &amp; How-to</div>
            </div>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-muted" />
            <input className="input pl-9 text-sm" placeholder="Filter sections…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-6 space-y-4">
          {GROUP_ORDER.filter((g) => grouped[g]?.length).map((group) => (
            <div key={group}>
              <div className="px-3 text-[10px] uppercase tracking-wider text-muted/70 mb-1.5 font-bold">{group}</div>
              <div className="space-y-0.5">
                {grouped[group].map((s) => {
                  const Icon = s.icon;
                  const isActive = s.id === activeId;
                  return (
                    <button key={s.id} onClick={() => setActiveId(s.id)} className={`nav-link w-full text-left ${isActive ? "nav-link-active" : ""}`}>
                      <Icon size={16} /> <span className="flex-1">{s.label}</span>
                      {isActive && <ChevronRight size={14} className="text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-xs text-muted text-center py-6">No sections match "{q}".</div>}
        </nav>
      </aside>

      {/* content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-8 fade-in">
          {active.body}
          <div className="mt-12 pt-5 border-t border-border flex items-center justify-between text-xs text-muted">
            <span>Nexus AI Studio · built-in documentation</span>
            <span>{active.group} → {active.label}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
