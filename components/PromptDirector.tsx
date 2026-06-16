"use client";
import { useMemo, useState } from "react";
import { Modal, copy } from "@/components/ui";
import { Wand2, Dice5, Copy, CornerDownLeft } from "lucide-react";

interface ModelDef { name: string; video: boolean; }
const MODELS: ModelDef[] = [
  { name: "Nexus AI", video: false },
  { name: "Flux", video: false },
  { name: "MidJourney 7", video: false },
  { name: "SeeDream 4", video: false },
  { name: "Z-Image", video: false },
  { name: "Qwen", video: false },
  { name: "Wan 2.2 Video", video: true },
  { name: "Wan 2.1 Video", video: true },
  { name: "LTX-2 Video", video: true },
  { name: "Veo 3", video: true },
  { name: "Kling 2.0", video: true },
];

type Group = { title: string; video?: boolean; fields: { key: string; label: string; options: string[] }[] };
const GROUPS: Group[] = [
  { title: "Style & Look", fields: [
    { key: "artStyle", label: "Art Style", options: ["photorealistic", "cinematic", "anime", "oil painting", "3D render", "watercolor", "film noir", "concept art"] },
    { key: "filmLook", label: "Film Look / LUT", options: ["Kodak Portra", "teal and orange grade", "bleach bypass", "vintage film", "high-key", "low-key"] },
    { key: "palette", label: "Color Palette", options: ["warm pastel", "muted earth tones", "vibrant neon", "monochrome", "complementary blue/orange"] },
    { key: "texture", label: "Texture / Detail", options: ["ultra-detailed", "subtle film grain", "smooth and clean", "gritty texture", "8k sharp"] },
  ]},
  { title: "World & Environment", fields: [
    { key: "location", label: "Location", options: ["a sunlit beach", "a city rooftop at dusk", "a misty forest", "a studio backdrop", "a cozy bedroom", "a neon-lit alley"] },
    { key: "weather", label: "Weather / Atmosphere", options: ["golden hour", "foggy morning", "rainy night", "overcast", "harsh midday sun", "blue hour"] },
  ]},
  { title: "Camera Gear", fields: [
    { key: "body", label: "Camera Body", options: ["Sony A7 IV", "Canon EOS R5", "ARRI Alexa", "Hasselblad", "smartphone"] },
    { key: "focal", label: "Focal Length", options: ["24mm", "35mm", "50mm", "85mm", "135mm"] },
    { key: "format", label: "Film Format", options: ["full frame", "medium format", "Super 35", "anamorphic"] },
    { key: "lens", label: "Lens", options: ["prime lens", "zoom lens", "macro lens", "anamorphic lens"] },
    { key: "aperture", label: "Aperture", options: ["f/1.4", "f/1.8", "f/2.8", "f/4", "f/8"] },
  ]},
  { title: "Composition", fields: [
    { key: "shot", label: "Shot Size", options: ["extreme close-up", "close-up", "medium shot", "full body", "wide shot"] },
    { key: "angle", label: "Camera Angle", options: ["eye level", "low angle", "high angle", "Dutch angle", "overhead"] },
    { key: "framing", label: "Framing", options: ["rule of thirds", "centered", "leading lines", "symmetrical"] },
  ]},
  { title: "Lighting & Mood", fields: [
    { key: "lighting", label: "Lighting", options: ["soft rim lighting", "golden hour light", "studio softbox", "neon glow", "hard dramatic shadow", "window light"] },
    { key: "mood", label: "Mood", options: ["dreamy", "bold and powerful", "intimate", "moody and cinematic", "playful"] },
  ]},
  { title: "Video Movement", video: true, fields: [
    { key: "camMove", label: "Camera Movement", options: ["static shot", "slow pan", "dolly in", "tracking shot", "crane up", "handheld"] },
    { key: "pacing", label: "Pacing", options: ["slow and contemplative", "medium pace", "fast and energetic"] },
    { key: "motion", label: "Subject Motion", options: ["walking toward camera", "turning to look back", "subtle idle motion", "dynamic action"] },
  ]},
];

export default function PromptDirector({ onInsert }: { onInsert: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [model, setModel] = useState(MODELS[0]);
  const [sel, setSel] = useState<Record<string, string>>({});

  const groups = useMemo(() => GROUPS.filter((g) => !g.video || model.video), [model]);
  const assembled = useMemo(() => {
    const parts: string[] = [];
    if (subject.trim()) parts.push(subject.trim());
    for (const g of groups) for (const f of g.fields) if (sel[f.key]) parts.push(sel[f.key]);
    parts.push(`for ${model.name}`);
    return parts.join(", ");
  }, [subject, sel, groups, model]);

  function randomize() {
    const s: Record<string, string> = {};
    for (const g of groups) for (const f of g.fields) s[f.key] = f.options[Math.floor(Math.random() * f.options.length)];
    setSel(s);
  }

  return (
    <>
      <button type="button" className="btn-ghost h-10 px-2.5" title="Prompt Director Pro" onClick={() => setOpen(true)}><Wand2 size={17} /></button>
      <Modal open={open} onClose={() => setOpen(false)} title="Prompt Director Pro" wide>
        <div className="space-y-4">
          <div>
            <span className="label">Core Subject</span>
            <textarea className="input min-h-[70px]" placeholder="Describe your scene… (e.g. A futuristic samurai in neon rain)" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <span className="label">Select AI Model</span>
            <select className="input" value={model.name} onChange={(e) => setModel(MODELS.find((m) => m.name === e.target.value)!)}>
              {MODELS.map((m) => <option key={m.name} value={m.name}>{m.name}{m.video ? " (video)" : ""}</option>)}
            </select>
          </div>
          {groups.map((g) => (
            <div key={g.title}>
              <div className="text-sm font-medium mb-2">{g.title}</div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {g.fields.map((f) => (
                  <div key={f.key}>
                    <span className="label">{f.label}</span>
                    <select className="input" value={sel[f.key] || ""} onChange={(e) => setSel({ ...sel, [f.key]: e.target.value })}>
                      <option value="">—</option>
                      {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="card p-3 bg-surface2">
            <span className="label mb-1">Live preview</span>
            <p className="text-sm">{assembled || <span className="text-muted">Add a subject and pick options…</span>}</p>
          </div>
          <div className="flex items-center justify-between">
            <button className="btn-ghost text-xs" onClick={randomize}><Dice5 size={14} /> Randomize</button>
            <div className="flex gap-2">
              <button className="btn-outline text-xs" onClick={() => copy(assembled)}><Copy size={14} /> Copy</button>
              <button className="btn-primary text-xs" onClick={() => { onInsert(assembled); setOpen(false); }}><CornerDownLeft size={14} /> Insert into chat</button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
