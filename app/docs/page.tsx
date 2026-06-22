"use client";
import { useMemo, useState, ReactNode } from "react";
import { useMounted } from "@/components/ui";
import {
  BookOpen, Rocket, Compass, MessageSquare, Images, User, Image as ImageIcon,
  Clapperboard, Layers, Sparkles, Mountain, Boxes, ChefHat, Settings, Server,
  Database, Cpu, Package, FolderTree, Search, ChevronRight, Wand2, ShieldAlert,
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
          A multi-provider AI prompt assistant and generative studio. It runs as a web app, a static site,
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
          ["Workspace Gears", <>Chat &amp; Analyze (multi-provider chat + image captioning) and Bulk Analyze (batch caption many files).</>],
          ["Studio Gears", <>Character, Image, Video, Workflow and Comfy Hub — the generative production tools.</>],
          ["Library Gears", <>Prompts, Environments, Ingredients and Recipes — reusable building blocks with full CRUD + import/export.</>],
          ["System Gears", <>Settings / Control Panel — providers, system prompts, appearance and ComfyUI configuration.</>],
        ]} />
        <H3>What makes it different</H3>
        <UL items={[
          <>Works with hosted APIs <i>and</i> local/uncensored model servers (Ollama, LM Studio, KoboldCpp) interchangeably.</>,
          <>A free, no-key route (Pollinations) for text and image generation out of the box.</>,
          <>Persona consistency tooling: lock a Character into any generation, and optionally train a real LoRA via FAL.ai.</>,
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
          The desktop app has no browser CORS sandbox, so keyed providers and local model servers work without restriction —
          it's the best target for local/uncensored models.
        </P>
      </>
    ),
  },
  {
    id: "concepts", label: "Core Concepts", group: "Getting Started", icon: Compass,
    keywords: "provider model system prompt task uncensored persistence",
    body: (
      <>
        <H2>Core Concepts</H2>
        <Lede>A handful of ideas thread through every Gear. Understanding these makes the rest obvious.</Lede>
        <KV rows={[
          ["Active provider", <>The provider chosen in Settings is the one every chat/analyze/enhance action uses. The current provider &amp; model are shown in the sidebar footer.</>],
          ["Model", <>Each provider carries a list of models and a selected model. Many providers can fetch their live model list on demand.</>],
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
        <Lede>A streaming chat surface that doubles as an image analyzer/captioner using your active provider, model and system prompt.</Lede>
        <H3>How to use it</H3>
        <Steps items={[
          <>Pick your provider/model in Settings (shown in the sidebar footer).</>,
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
          <>Images are read as base64 data URLs and sent inline; vision support depends on the provider/model.</>,
          <>The system prompt is resolved by <Code>useTaskSystemPrompt("chat", …)</Code>, which passes an <Code>I2T</Code> mode when images are attached and <Code>T2T</Code> otherwise.</>,
          <>Streaming is handled per-provider in <Code>lib/providers.ts → chat()</Code> via <Code>onChunk</Code> callbacks.</>,
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
          Video files only caption on video-capable providers (e.g. Google Gemini). In the web build, the <Code>.txt</Code> files
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
    keywords: "character persona lora fal training x-ray nsfw consistency trigger word",
    body: (
      <>
        <H2>Character Gear</H2>
        <Lede>Create, store and reuse consistent personas. Lock an identity anchor so every generation stays on-model, train a real LoRA, or run a psychological X-Ray.</Lede>
        <H3>Building a character</H3>
        <P>The editor captures an identity anchor plus structured attributes (each dropdown supports adding your own custom options):</P>
        <UL items={[
          <><b>Identity</b> — Name, Age (18+), Trigger Word / Token, Persona &amp; Bio.</>,
          <><b>Physical</b> — Hair Color, Body Shape, Eye Color, Skin Tone, Height, Body Build.</>,
          <><b>Anchors</b> — Locked Appearance (face features), Body attributes, Default outfits, Style Notes, Negative prompts.</>,
          <><b>Reference images</b> — used for consistency and as the LoRA training set.</>,
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
        <H3>Train a LoRA (FAL.ai)</H3>
        <P>The chip/button on each card opens the LoRA trainer, which runs <Code>fal-ai/flux-lora-fast-training</Code>:</P>
        <Steps items={[
          <>Add your FAL.ai API key (Settings → Providers, or in the trainer dialog).</>,
          <>Provide at least 4 reference images (6–12 recommended) on the character.</>,
          <>Set a trigger word and training steps, then start — the app zips the images, uploads them, submits the job and streams logs.</>,
          <>State is tracked as <Code>none / training / completed / failed</Code>; on success you can download the <Code>.safetensors</Code> file. In-progress jobs resume polling when you reopen the dialog.</>,
        ]} />
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
    keywords: "image studio text-to-image image-to-image flux pollinations openai seed ratio enhance",
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
        <H3>Providers &amp; models</H3>
        <KV rows={[
          ["Free route", <>Pollinations <Code>image.pollinations.ai</Code> needs no key. Models: <Code>flux</Code>, <Code>flux-realism</Code>, <Code>flux-anime</Code>, <Code>turbo</Code>.</>],
          ["OpenAI route", <>When the OpenAI provider has a key set, generation uses <Code>/images/generations</Code> (e.g. <Code>gpt-image-1</Code>).</>],
        ]} />
        <H3>Engineering notes</H3>
        <UL items={[
          <>Generation lives in <Code>lib/providers.ts → generateImage()</Code>; the free path builds a deterministic Pollinations URL from prompt + size + seed + model.</>,
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
        <Lede>A cinematic spec builder for Text/Image/Reference/Video → Video, with create · edit · extend operations. Build the spec here, then render through your connected engine.</Lede>
        <H3>How to use it</H3>
        <Steps items={[
          <>Pick an input mode: <b>Text → Video</b>, <b>Image → Video</b>, <b>Reference → Video</b> or <b>Video → Video</b>.</>,
          <>Pick an operation: <b>create</b>, <b>edit</b> or <b>extend</b> (extend continues from the last frame of an uploaded clip).</>,
          <>Upload start/end frames, a reference image, or a source video depending on the mode.</>,
          <>Write a prompt and use <b>Enhance</b> (cinematic rewrite) or <b>JSON enhance</b> (structured spec).</>,
          <>Choose an engine, aspect ratio and resolution, then "Build / save spec" to store it in your generations.</>,
        ]} />
        <H3>JSON enhance</H3>
        <P>
          Produces a structured JSON video spec with fields like <Code>subject</Code>, <Code>setting</Code>, <Code>camera_movement</Code>,
          <Code>lighting</Code>, <Code>color_palette</Code>, <Code>pacing</Code>, <Code>audio</Code> and a <Code>master_prompt</Code> — ready to paste into a renderer.
        </P>
        <H3>Engines</H3>
        <Chips items={["Veo 3", "Kling 2.0", "Seedance 2.0", "Wan 2.2", "LTX-2", "Runway Gen-4"]} />
        <Note>
          The Video Gear builds and stores specs; actual rendering requires the chosen engine's own API key. Add it as a custom provider in
          Settings, or take the saved spec to your renderer.
        </Note>
      </>
    ),
  },
  {
    id: "cinema", label: "Cinema Gear", group: "Studio Gears", icon: Clapperboard,
    keywords: "cinema studio storyboard scenes prompt director recipes script",
    body: (
      <>
        <H2>Cinema Gear</H2>
        <Lede>Create comprehensive storyboards and script sequences by linking scenes together, powered by the Prompt Director.</Lede>
        <H3>How to use it</H3>
        <Steps items={[
          <>Create a new <b>Cinema Project</b>.</>,
          <>Add sequential <b>Scenes</b> to your storyboard timeline.</>,
          <>For each scene, open the embedded <b>Prompt Director</b> to dynamically load Recipes, tie in Characters, and mix Ingredients to craft the perfect shot.</>,
          <>Reorder scenes and track the flow of your visual story before sending them to the Video Gear for rendering.</>,
        ]} />
      </>
    ),
  },
  {
    id: "workflow", label: "Workflow Gear", group: "Studio Gears", icon: Layers,
    keywords: "workflow comfyui api json parse nodes canvas execute local hybrid cloud websocket",
    body: (
      <>
        <H2>Workflow Gear</H2>
        <Lede>Import a ComfyUI API-format workflow, edit its key inputs through a form or canvas, then execute it locally, via hybrid GPU, or in the cloud.</Lede>
        <H3>How to use it</H3>
        <Steps items={[
          <>Paste or upload a ComfyUI <b>API-format</b> workflow JSON (or load a built-in one from the Comfy Hub).</>,
          <>The parser walks every node and surfaces editable inputs — prompt text, seed, steps and image fields — with the node title.</>,
          <>Switch between the <b>Form</b> and <b>Canvas</b> tabs to edit values.</>,
          <>Run it. The active ComfyUI provider/run-mode (from Settings) determines where execution is sent.</>,
          <>Save the workflow to your local repository for reuse.</>,
        ]} />
        <H3>Execution paths</H3>
        <KV rows={[
          ["Local", <>Connects to a local ComfyUI instance (default <Code>http://localhost:8188</Code>) and streams progress over WebSocket. Falls back to a simulated run if offline or CORS-blocked.</>],
          ["Hybrid", <>Offloads tensors to a remote GPU via the <Code>nathannlu/comfyui-cloud</Code> custom node, configured in Settings.</>],
          ["Cloud", <>Targets a configured cloud ComfyUI API provider.</>],
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
    keywords: "comfy hub workflow library api docs run mode environment provision",
    body: (
      <>
        <H2>Comfy Hub Gear</H2>
        <Lede>Provision execution environments, browse a built-in library of ready-made workflow JSON configs, and read the ComfyUI API integration docs.</Lede>
        <H3>Tabs</H3>
        <KV rows={[
          ["Hub", <>A categorized gallery of built-in workflows (Image, Video, ControlNet, Flux, Utilities) with difficulty, node count and author. Open one to send it into the Workflow Gear.</>],
          ["Docs", <>In-context explanation of running ComfyUI as a headless JSON execution engine, the WebSocket message shapes (<Code>executing</Code>, <Code>executed</Code>), and the hybrid cloud node setup.</>],
        ]} />
        <H3>Run modes</H3>
        <P>
          A startup resource dialog lets you choose <b>local</b>, <b>hybrid</b> or <b>cloud</b> execution; the choice can be locked so it
          won't prompt again. Cloud plans and environments are configurable in Settings → ComfyUI API Settings.
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
    id: "settings", label: "Settings & Providers", group: "System Gears", icon: Settings,
    keywords: "settings providers models api key custom openai compatible fal uncensored fetch",
    body: (
      <>
        <H2>Settings &amp; Providers</H2>
        <Lede>The control panel has four tabs: Providers &amp; Models, System Prompt, Appearance, and ComfyUI API Settings.</Lede>
        <H3>Built-in providers</H3>
        <KV rows={[
          ["Free (Pollinations)", "No key needed — default provider for text & image."],
          ["Ollama / LM Studio / KoboldCpp", "Local, uncensored-capable servers (localhost). OpenAI-compatible or native."],
          ["OpenAI / Anthropic / Google Gemini", "Hosted APIs — add your key; streaming supported for each."],
          ["OpenRouter / Groq", "OpenAI-compatible aggregators (hidden by default; toggle visible)."],
          ["Custom", "Add any OpenAI-compatible endpoint with a name, base URL and optional key."],
        ]} />
        <H3>How to configure a provider</H3>
        <Steps items={[
          <>Open the provider card; set its Base URL and API Key (Pollinations/Ollama need none).</>,
          <>Click refresh to fetch its live model list, then pick a selected model.</>,
          <>Toggle visibility to show/hide it in the active-provider switcher; set it active to use it everywhere.</>,
          <>Add the <b>FAL.ai key</b> here to enable Character LoRA training.</>,
        ]} />
        <H3>Uncensored mode</H3>
        <P>
          When on, an adult-creator preamble is prepended to the system prompt for unrestricted creative/captioning output on capable
          (typically local) models. Hosted providers still enforce their own policies.
        </P>
        <H3>Engineering notes</H3>
        <UL items={[
          <>Model fetching is provider-aware in <Code>lib/providers.ts → fetchModels()</Code> (Ollama <Code>/api/tags</Code>, Google <Code>/v1beta/models</Code>, OpenAI-style <Code>/models</Code>, Pollinations model list).</>,
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
    id: "comfy-settings", label: "ComfyUI Settings", group: "System Gears", icon: Server,
    keywords: "comfyui settings providers custom nodes model mappings civitai huggingface hybrid run mode",
    body: (
      <>
        <H2>ComfyUI API Settings</H2>
        <Lede>Configure where and how ComfyUI workflows execute, plus the nodes and models they depend on.</Lede>
        <H3>Sections</H3>
        <UL items={[
          <><b>Execution &amp; Resource Mode</b> — choose local, hybrid, cloud, or the <b>Modal Serverless Backend</b> (<Code>comfyui-modal</Code>), and optionally lock the choice.</>,
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
        <H3>Provider abstraction</H3>
        <P>
          All model I/O is funneled through <Code>lib/providers.ts</Code> so the UI never special-cases a vendor. <Code>chat()</Code> normalizes
          Google, Anthropic, Pollinations and OpenAI-compatible APIs (including streaming); <Code>generateImage()</Code> covers the
          Pollinations and OpenAI image paths; <Code>fetchModels()</Code> lists models per provider kind.
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
          ["Comfy* types", "ComfyProvider, ComfyModelMapping, ComfyWorkflow for the ComfyUI features."],
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
    id: "providers-eng", label: "Provider & Generation Layer", group: "Engineering", icon: Cpu,
    keywords: "providers chat stream image generation fal lora character prompt promptfill",
    body: (
      <>
        <H2>Provider &amp; Generation Layer</H2>
        <Lede>The functional core that turns app state into model calls.</Lede>
        <KV rows={[
          [<Code>lib/providers.ts</Code>, <>Unified <Code>chat()</Code> (streaming for Google/Anthropic/Pollinations/OpenAI-style), <Code>generateImage()</Code>, and <Code>fetchModels()</Code>. Anthropic uses the browser-direct header; Google parses its streamed brace-delimited JSON.</>],
          [<Code>lib/character.ts</Code>, <>Compiles a Character into an ordered prompt string, conditionally appending the NSFW attribute set.</>],
          [<Code>lib/promptfill.ts</Code>, <>Template tokenization and assembly for the Recipe builder (<Code>{"{{token: default}}"}</Code> grammar, bank lookups, pretty labels).</>],
          [<Code>lib/recipe.ts</Code>, <>Legacy recipe-slot assembly (ingredient slots → comma-joined or templated output).</>],
          [<Code>lib/data/comfyworkflows.ts</Code>, <>The built-in Comfy Hub workflow library (API-format node graphs).</>],
          [<Code>lib/data/promptbuilder.ts</Code>, <>Caption types / lengths / extras powering the System Prompt Builder.</>],
        ]} />
        <H3>FAL.ai LoRA training</H3>
        <P>
          Implemented inline in the Character Gear: it zips reference images (<Code>jszip</Code>), submits to <Code>fal-ai/flux-lora-fast-training</Code>
          via the FAL queue API, polls the status URL, streams logs, and on completion stores the <Code>diffusers_lora_file</Code> URL for download.
          Jobs survive reloads by persisting the request/status/response URLs on the character.
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
│  ├─ providers.ts           # chat / image / model APIs
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
