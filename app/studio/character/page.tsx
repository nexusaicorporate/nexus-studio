"use client";
import React, { useState, useEffect, useRef } from "react";
import Page from "@/components/Page";
import { Modal, Field, Toggle, useMounted, copy } from "@/components/ui";
import { useLibrary, newId } from "@/lib/store/library";
import type { Character, CharacterXRay } from "@/lib/types";
import { 
  Plus, Pencil, Trash2, Copy, User, Send, ImagePlus, Sparkles, 
  Palette, Scissors, Activity, Flame, Heart, EyeOff, Smile, 
  Feather, ShieldAlert, CircleDot, Brush, HelpCircle, Check, BookOpen, Calendar,
  Lock, Eye, Ruler, Dumbbell, Droplet, Download, Layers, Bone, Brain, RotateCw,
  Zap, AlertCircle, Loader2, AlertTriangle, Play, CheckCircle2, XCircle
} from "lucide-react";
import { generateImage } from "@/lib/providers";
import { characterPrompt } from "@/lib/character";
import { useAuth } from "@/components/AuthProvider";
import { canUseNsfw } from "@/lib/entitlements";
import UpgradePrompt from "@/components/UpgradePrompt";
import { useRouter } from "next/navigation";
import { useSettings } from "@/lib/store/settings";
import { chat } from "@/lib/providers";
import JSZip from "jszip";

const blank = (): Character => ({ 
  id: newId(), 
  name: "", 
  persona: "", 
  appearance: "", 
  age: "23", 
  bodyAttributes: "", 
  outfitDefaults: "", 
  styleNotes: "", 
  negative: "deformed, extra fingers, watermark, text", 
  triggerWord: "", 
  refImages: [], 
  nsfw: false, 
  hairColor: "brunette",
  hairStyle: "long straight",
  bodyShape: "hourglass",
  eyeColor: "brown",
  skinTone: "fair",
  height: "average",
  bodyBuild: "slender",
  breastSize: "C cup",
  breastShape: "round",
  breastsType: "Real",
  assAttributes: "round",
  assSize: "medium",
  assShape: "round",
  pubicHair: "no",
  pubicHairAmount: "light",
  pubicHairStyle: "shaved",
  vaginaPiercings: "none",
  bellyPiercing: "no",
  nosePiercing: "no",
  tattooType: "none",
  tattooPlacement: "arms",
  sexActivityLevel: "average",
  sexPositions: "",
  fantasy: "",
  createdAt: Date.now(), 
  updatedAt: Date.now() 
});

export default function CharacterPage() {
  const mounted = useMounted(); 
  const router = useRouter();
  const { addons } = useAuth();
  const characters = useLibrary((s) => s.characters); 
  const setKey = useLibrary((s) => s.set);
  const [edit, setEdit] = useState<Character | null>(null);
  const [trainLoRA, setTrainLoRA] = useState<Character | null>(null);
  const [xrayChar, setXrayChar] = useState<Character | null>(null);
  const [sheetChar, setSheetChar] = useState<Character | null>(null);

  function save(c: Character) { 
    c.updatedAt = Date.now(); 
    const ex = characters.some((x) => x.id === c.id); 
    setKey("characters", ex ? characters.map((x) => x.id === c.id ? c : x) : [c, ...characters]); 
    setEdit(null); 
  }
  
  function del(id: string) { 
    setKey("characters", characters.filter((c) => c.id !== id)); 
  }

  if (!mounted) return null;
  
  return (
    <Page 
      title="Character Gear" 
      subtitle="Create, manage and store consistent personas. Lock an identity anchor so every generation stays on-model." 
      actions={<button className="btn-primary" onClick={() => setEdit(blank())}><Plus size={15} /> New Character</button>}
    >
      {characters.length === 0 ? (
        <div className="card p-10 text-center text-muted">
          <User className="mx-auto mb-3 opacity-50" size={36} />
          No characters yet. Create your first persona — name, locked appearance, body shape, default outfit, style notes, and reference images.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((c) => (
            <div key={c.id} className="card p-4 flex flex-col justify-between border border-border">
              <div>
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-14 h-14 rounded-xl bg-surface2 overflow-hidden grid place-items-center border border-border/40 shrink-0">
                    {c.refImages[0] ? (
                      <img src={c.refImages[0]} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <User size={22} className="text-muted" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-text">{c.name || "Unnamed"}</div>
                    <div className="text-[10px] text-muted-more font-medium uppercase tracking-wider flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span>Age {c.age}</span>
                      {c.nsfw && <span className="text-rose-400 bg-rose-400/10 px-1 rounded border border-rose-400/20">18+</span>}
                      {c.triggerWord && <span className="text-primary-light font-mono font-bold bg-primary/10 px-1 rounded">{c.triggerWord}</span>}
                      {c.loraStatus === "completed" && <span className="text-emerald-400 bg-emerald-400/5 px-1 py-0.5 rounded border border-emerald-400/20 font-bold font-mono">LoRA Loaded</span>}
                      {c.loraStatus === "training" && <span className="text-amber-400 bg-amber-400/5 px-1 py-0.5 rounded border border-amber-400/20 animate-pulse font-bold">LoRA Training</span>}
                      {c.characterSheetUrl && <span className="text-blue-400 bg-blue-400/5 px-1 py-0.5 rounded border border-blue-400/20 font-bold font-mono">Sheet Ready</span>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {c.hairStyle && (
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-surface2 text-muted border border-border/40">
                      Hair: {c.hairStyle} ({c.hairColor})
                    </span>
                  )}
                  {c.bodyShape && (
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-surface2 text-muted border border-border/40">
                      Shape: {c.bodyShape}
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted leading-relaxed line-clamp-3 mb-3 bg-surface2/30 p-2 rounded-lg border border-border/20">
                  {c.appearance || c.persona || "No description set. Edit this character to add details."}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-border/40 pt-2.5 mt-2">
                <span className="text-[10px] text-muted-more">Updated: {new Date(c.updatedAt).toLocaleDateString()}</span>
                <div className="flex items-center gap-1">
                  <button 
                    className="btn-ghost p-1.5 text-xs text-primary-light"
                    onClick={() => setXrayChar(c)}
                    title="Character X-Ray (Psychological Analysis)"
                  >
                    <Layers size={13} />
                  </button>
                  <button 
                    className={`btn-ghost p-1.5 text-xs ${c.loraStatus === "completed" ? "text-emerald-400" : c.loraStatus === "training" ? "text-amber-400 animate-pulse" : "text-primary-light"}`} 
                    onClick={() => setTrainLoRA(c)} 
                    title="Train LoRA Model (FAL.ai)"
                  >
                    <Dumbbell size={13} />
                  </button>
                  <button 
                    className={`btn-ghost p-1.5 text-xs ${c.characterSheetUrl ? "text-blue-400" : "text-primary-light"}`}
                    onClick={() => setSheetChar(c)}
                    title="Generate Character Sheet (Consistency Anchor)"
                  >
                    <Palette size={13} />
                  </button>
                  {c.loraStatus === "completed" && c.loraUrl && (
                    <a 
                      href={c.loraUrl} 
                      download={`${c.name || "character"}_lora.safetensors`}
                      className="btn-ghost p-1.5 text-xs text-emerald-400 hover:text-emerald-300"
                      title="Download LoRA (.safetensors)"
                    >
                      <Download size={13} />
                    </a>
                  )}
                  <button className="btn-ghost p-1.5 text-xs" onClick={() => copy(characterPrompt(c))} title="Copy prompt payload"><Copy size={13} /></button>
                  <button className="btn-ghost p-1.5 text-xs" onClick={() => router.push(`/studio/image?character=${c.id}`)} title="Generate in Studio"><Send size={13} /></button>
                  <button className="btn-ghost p-1.5 text-xs text-primary-light" onClick={() => setEdit(c)} title="Edit"><Pencil size={13} /></button>
                  <button className="btn-ghost p-1.5 text-xs text-rose-400" onClick={() => del(c.id)} title="Delete"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && characters.some((x) => x.id === edit.id) ? "Edit Character" : "New Character"} wide>{edit && <Form item={edit} onSave={save} />}</Modal>
      <Modal open={!!trainLoRA} onClose={() => setTrainLoRA(null)} title="Train Custom Character LoRA (FAL.ai)">{trainLoRA && <LoraTrainer item={trainLoRA} onClose={() => setTrainLoRA(null)} />}</Modal>
      <Modal open={!!xrayChar} onClose={() => setXrayChar(null)} title="Character Psychological X-Ray (AI Analysis)" wide>{xrayChar && <CharacterXRayTool character={xrayChar} onClose={() => setXrayChar(null)} />}</Modal>
      <Modal open={!!sheetChar} onClose={() => setSheetChar(null)} title="Character Consistency Sheet Generator" wide>{sheetChar && <CharacterSheetGenerator character={sheetChar} onClose={() => setSheetChar(null)} />}</Modal>
    </Page>
  );
}

function renderHairStyleSVG(id: string) {
  switch (id) {
    case "long straight":
      return (
        <svg className="w-12 h-12 text-primary-light/80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="45" r="18" fill="currentColor" opacity="0.15" />
          <path d="M30 40 C30 20, 70 20, 70 40 L72 80 L68 80 L66 45 L34 45 L32 80 L28 80 Z" fill="currentColor" />
          <circle cx="50" cy="42" r="14" fill="currentColor" opacity="0.25" />
        </svg>
      );
    case "wavy bob":
      return (
        <svg className="w-12 h-12 text-primary-light/80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="45" r="18" fill="currentColor" opacity="0.15" />
          <path d="M32 35 C32 15, 68 15, 68 35 C74 45, 70 60, 66 65 C62 55, 64 45, 60 45 C56 45, 54 50, 50 45 C46 50, 44 45, 40 45 C36 45, 38 55, 34 65 C30 60, 26 45, 32 35 Z" fill="currentColor" />
          <circle cx="50" cy="42" r="14" fill="currentColor" opacity="0.25" />
        </svg>
      );
    case "pixie cut":
      return (
        <svg className="w-12 h-12 text-primary-light/80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="45" r="18" fill="currentColor" opacity="0.15" />
          <path d="M33 38 C33 22, 67 22, 67 38 C68 42, 64 35, 60 35 C58 35, 54 38, 50 35 C46 38, 42 35, 40 35 C36 35, 32 42, 33 38 Z" fill="currentColor" />
          <circle cx="50" cy="42" r="14" fill="currentColor" opacity="0.25" />
        </svg>
      );
    case "ponytail":
      return (
        <svg className="w-12 h-12 text-primary-light/80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="42" r="14" fill="currentColor" opacity="0.25" />
          <path d="M34 35 C34 18, 66 18, 66 35 C66 45, 62 48, 58 45 C54 48, 46 48, 42 45 C38 48, 34 45, 34 35 Z" fill="currentColor" />
          <rect x="47" y="24" width="6" height="4" rx="1" fill="#EF4444" />
          <path d="M50 25 C58 20, 68 35, 65 60 C60 55, 54 45, 50 25 Z" fill="currentColor" />
        </svg>
      );
    case "double braids":
      return (
        <svg className="w-12 h-12 text-primary-light/80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="42" r="14" fill="currentColor" opacity="0.25" />
          <path d="M34 35 C34 18, 66 18, 66 35 C66 45, 62 48, 58 45 C54 48, 46 48, 42 45 C38 48, 34 45, 34 35 Z" fill="currentColor" />
          <path d="M32 42 C30 50, 26 55, 28 75 C30 75, 32 60, 34 45 Z" fill="currentColor" fillRule="evenodd" />
          <path d="M68 42 C70 50, 74 55, 72 75 C70 75, 68 60, 66 45 Z" fill="currentColor" fillRule="evenodd" />
        </svg>
      );
    case "curly shaggy":
      return (
        <svg className="w-12 h-12 text-primary-light/80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="42" r="14" fill="currentColor" opacity="0.25" />
          <circle cx="36" cy="30" r="8" fill="currentColor" />
          <circle cx="50" cy="24" r="8" fill="currentColor" />
          <circle cx="64" cy="30" r="8" fill="currentColor" />
          <circle cx="32" cy="42" r="8" fill="currentColor" />
          <circle cx="68" cy="42" r="8" fill="currentColor" />
          <circle cx="35" cy="54" r="8" fill="currentColor" />
          <circle cx="65" cy="54" r="8" fill="currentColor" />
          <circle cx="50" cy="32" r="8" fill="currentColor" />
        </svg>
      );
    case "curtain bangs":
      return (
        <svg className="w-12 h-12 text-primary-light/80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="42" r="14" fill="currentColor" opacity="0.25" />
          <path d="M32 35 C32 15, 68 15, 68 35 C70 45, 68 70, 66 75 C60 55, 62 42, 55 42 C50 42, 45 35, 45 35 C45 35, 40 42, 35 42 C30 42, 32 55, 26 75 C24 70, 22 45, 32 35 Z" fill="currentColor" />
        </svg>
      );
    default: {
      const isShort = /(short|buzz|crew|fade|slick|undercut|crop|pompadour|quiff|spikes|caesar|bald|taper|high and tight)/i.test(id);
      if (isShort) {
        return (
          <svg className="w-12 h-12 text-primary-light/80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="45" r="18" fill="currentColor" opacity="0.15" />
            <path d="M36 38 C36 22, 64 22, 64 38 C64 42, 60 33, 56 33 C52 33, 48 35, 44 33 Z" fill="currentColor" />
            <circle cx="50" cy="42" r="14" fill="currentColor" opacity="0.25" />
          </svg>
        );
      } else {
        return (
          <svg className="w-12 h-12 text-primary-light/80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="45" r="18" fill="currentColor" opacity="0.15" />
            <path d="M30 40 C30 20, 70 20, 70 40 L71 65 L67 65 L65 43 L35 43 L33 65 L29 65 Z" fill="currentColor" />
            <circle cx="50" cy="42" r="14" fill="currentColor" opacity="0.25" />
          </svg>
        );
      }
    }
  }
}

function renderTattooSVG(id: string) {
  switch (id) {
    case "none":
      return (
        <svg className="w-12 h-12 text-rose-400/60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="25" y="25" width="50" height="50" rx="6" stroke="currentColor" strokeWidth="2" />
          <line x1="30" y1="30" x2="70" y2="70" stroke="#EF4444" strokeWidth="3" />
        </svg>
      );
    case "rose":
      return (
        <svg className="w-12 h-12" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 50 Q48 70, 52 85" stroke="#10B981" strokeWidth="3" fill="none" />
          <path d="M42 65 Q48 62, 50 68" fill="#10B981" />
          <circle cx="50" cy="40" r="15" fill="#EF4444" />
          <circle cx="46" cy="36" r="10" fill="#DC2626" />
          <circle cx="54" cy="36" r="8" fill="#F87171" />
          <circle cx="50" cy="42" r="6" fill="#B91C1C" />
        </svg>
      );
    case "dragon":
      return (
        <svg className="w-12 h-12 text-rose-400" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M35 75 Q45 80, 50 70 Q55 60, 45 50 Q35 40, 55 35 Q70 30, 65 50 Q60 70, 75 75 Q85 80, 75 90" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M65 35 L72 32 L70 38 Z" fill="#EF4444" />
          <circle cx="67" cy="34" r="2" fill="#FBBF24" />
        </svg>
      );
    case "tribal band":
      return (
        <svg className="w-12 h-12 text-rose-400" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 50 Q30 35, 50 50 T90 50 L90 55 Q70 40, 50 55 T10 55 Z" fill="currentColor" />
          <path d="M10 40 Q30 25, 50 40 T90 40 L90 42 Q70 27, 50 42 T10 42 Z" fill="currentColor" opacity="0.6" />
        </svg>
      );
    case "butterfly":
      return (
        <svg className="w-12 h-12" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 50 C35 30, 20 40, 30 60 C40 80, 48 60, 50 50 Z" fill="#3B82F6" opacity="0.8" />
          <path d="M50 50 C65 30, 80 40, 70 60 C60 80, 52 60, 50 50 Z" fill="#3B82F6" opacity="0.8" />
          <path d="M50 50 C40 35, 25 45, 35 55 Z" fill="#60A5FA" />
          <path d="M50 50 C60 35, 75 45, 65 55 Z" fill="#60A5FA" />
          <rect x="48" y="35" width="4" height="30" rx="2" fill="#1E3A8A" />
          <line x1="50" y1="35" x2="42" y2="25" stroke="#1E3A8A" strokeWidth="2" />
          <line x1="50" y1="35" x2="58" y2="25" stroke="#1E3A8A" strokeWidth="2" />
        </svg>
      );
    case "wings":
      return (
        <svg className="w-12 h-12" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M45 50 C30 40, 15 50, 20 70 C25 65, 30 62, 45 60 Z" fill="#F59E0B" opacity="0.8" />
          <path d="M55 50 C70 40, 85 50, 80 70 C75 65, 70 62, 55 60 Z" fill="#F59E0B" opacity="0.8" />
          <path d="M45 50 C35 45, 25 52, 28 65 C32 60, 35 58, 45 56 Z" fill="#FBBF24" />
          <path d="M55 50 C65 45, 75 52, 72 65 C68 60, 65 58, 55 56 Z" fill="#FBBF24" />
        </svg>
      );
    case "snake":
      return (
        <svg className="w-12 h-12" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 85 Q35 70, 50 55 T50 25" stroke="#059669" strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="50" cy="23" r="4" fill="#047857" />
          <path d="M48 20 Q50 15, 52 20" stroke="#EF4444" strokeWidth="1.5" fill="none" />
        </svg>
      );
    default:
      return null;
  }
}

const femaleHairStyles = [
  { id: "long flowing hair", label: "Long Flowing Hair" },
  { id: "waist-length straight hair", label: "Waist-Length Straight" },
  { id: "hip-length silky hair", label: "Hip-Length Silky" },
  { id: "long layered hair", label: "Long Layered Hair" },
  { id: "long tousled hair", label: "Long Tousled Hair" },
  { id: "long loose waves", label: "Long Loose Waves" },
  { id: "mermaid waves", label: "Mermaid Waves" },
  { id: "long soft curls", label: "Long Soft Curls" },
  { id: "long tight curls", label: "Long Tight Curls" },
  { id: "long voluminous hair", label: "Long Voluminous Hair" },
  { id: "shoulder-length wavy hair", label: "Shoulder-Length Wavy" },
  { id: "shoulder-length straight hair", label: "Shoulder-Length Straight" },
  { id: "collarbone-length bob", label: "Collarbone-Length Bob" },
  { id: "sleek blunt bob", label: "Sleek Blunt Bob" },
  { id: "textured lob", label: "Textured Lob" },
  { id: "sleek chin-length bob", label: "Sleek Chin-Length Bob" },
  { id: "short pixie cut", label: "Short Pixie Cut" },
  { id: "textured pixie with undercut", label: "Textured Pixie with Undercut" },
  { id: "asymmetrical bob", label: "Asymmetrical Bob" },
  { id: "side-swept long hair", label: "Side-Swept Long Hair" },
  { id: "center-parted long hair", label: "Center-Parted Long Hair" },
  { id: "deep side part", label: "Deep Side Part" },
  { id: "curtain bangs", label: "Curtain Bangs" },
  { id: "face-framing layers", label: "Face-Framing Layers" },
  { id: "wispy bangs", label: "Wispy Bangs" },
  { id: "long feathered hair", label: "Long Feathered Hair" },
  { id: "70s feathered haircut", label: "70s Feathered" },
  { id: "90s supermodel blowout", label: "90s Supermodel Blowout" },
  { id: "vintage hollywood waves", label: "Vintage Hollywood Waves" },
  { id: "soft romantic curls", label: "Soft Romantic Curls" },
  { id: "victory rolls", label: "Victory Rolls" },
  { id: "high ponytail", label: "High Ponytail" },
  { id: "low ponytail", label: "Low Ponytail" },
  { id: "messy top knot", label: "Messy Top Knot" },
  { id: "sleek high bun", label: "Sleek High Bun" },
  { id: "low messy bun", label: "Low Messy Bun" },
  { id: "half-up half-down", label: "Half-Up Half-Down" },
  { id: "french braid", label: "French Braid" },
  { id: "dutch braids", label: "Dutch Braids" },
  { id: "fishtail braid", label: "Fishtail Braid" },
  { id: "side braid", label: "Side Braid" },
  { id: "crown braid", label: "Crown Braid" },
  { id: "long dreadlocks", label: "Long Dreadlocks" },
  { id: "medium-length dreadlocks", label: "Medium Dreadlocks" },
  { id: "curly afro", label: "Curly Afro" },
  { id: "voluminous afro", label: "Voluminous Afro" },
  { id: "short natural curls", label: "Short Natural Curls" },
  { id: "wolf cut", label: "Wolf Cut" },
  { id: "long shag cut", label: "Long Shag Cut" },
  { id: "medium shag with bangs", label: "Medium Shag with Bangs" },
  { id: "wet look hair", label: "Wet Look Hair" },
  { id: "freshly washed wet hair", label: "Freshly Washed Wet" },
  { id: "dripping wet hair", label: "Dripping Wet Hair" },
  { id: "windblown hair", label: "Windblown Hair" },
  { id: "tousled bed hair", label: "Tousled Bed Hair" },
  { id: "freshly blown-out hair", label: "Freshly Blown-Out" },
  { id: "silky smooth hair", label: "Silky Smooth" },
  { id: "frizz-controlled hair", label: "Frizz-Controlled" },
  { id: "slightly messy hair", label: "Slightly Messy" },
  { id: "hair tucked behind ears", label: "Hair Tucked Behind Ears" },
  { id: "hair swept over one shoulder", label: "Swept Over One Shoulder" },
];

const maleHairStyles = [
  { id: "slick back hair", label: "Slick Back" },
  { id: "undercut fade", label: "Undercut Fade" },
  { id: "classic pompadour", label: "Classic Pompadour" },
  { id: "textured crop top", label: "Textured Crop" },
  { id: "buzz cut", label: "Buzz Cut" },
  { id: "crew cut", label: "Crew Cut" },
  { id: "messy fringe", label: "Messy Fringe" },
  { id: "side part quiff", label: "Side Part Quiff" },
  { id: "taper fade short hair", label: "Taper Fade" },
  { id: "man bun", label: "Man Bun" },
  { id: "short messy spikes", label: "Short Messy Spikes" },
  { id: "caesar cut", label: "Caesar Cut" },
  { id: "short natural curls", label: "Short Natural Curls" },
  { id: "medium-length dreadlocks", label: "Medium Dreadlocks" },
  { id: "long dreadlocks", label: "Long Dreadlocks" },
  { id: "bald head", label: "Bald Head" },
  { id: "high and tight", label: "High and Tight" },
  { id: "wet look short hair", label: "Wet Look Short Hair" },
  { id: "windblown tousled short hair", label: "Windblown Tousled" },
  { id: "surfer waves", label: "Surfer Waves" },
  { id: "fringe undercut", label: "Fringe Undercut" },
];

function Form({ item, onSave }: { item: Character; onSave: (c: Character) => void }) {
  const { addons } = useAuth();
  const [c, setC] = useState<any>({
    ...item,
    hairColor: item.hairColor || "brunette",
    hairStyle: item.hairStyle || "long straight",
    facialHair: item.facialHair || "none",
    bodyShape: item.bodyShape || "hourglass",
    gender: item.gender || "female",
    chestHair: item.chestHair || "none",
    eyeColor: item.eyeColor || "brown",
    skinTone: item.skinTone || "fair",
    height: item.height || "average",
    bodyBuild: item.bodyBuild || "slender",
    breastSize: item.breastSize || "C cup",
    breastShape: item.breastShape || "round",
    breastsType: item.breastsType || "Real",
    assSize: item.assSize || "medium",
    assShape: item.assShape || "round",
    pubicHair: item.pubicHair || "no",
    pubicHairAmount: item.pubicHairAmount || "light",
    pubicHairStyle: item.pubicHairStyle || "shaved",
    penisSize: item.penisSize || "average",
    penisState: item.penisState || "flaccid",
    penisCircumcised: item.penisCircumcised || "no",
    vaginaPiercings: item.vaginaPiercings || "none",
    bellyPiercing: item.bellyPiercing || "no",
    nosePiercing: item.nosePiercing || "no",
    tattooType: item.tattooType || "none",
    tattooPlacement: item.tattooPlacement || "arms",
    sexActivityLevel: item.sexActivityLevel || "average",
    sexPositions: item.sexPositions || "",
    fantasy: item.fantasy || "",
  });

  const [analyzeStatus, setAnalyzeStatus] = useState<string>("");

  const [hairColors, setHairColors] = useState<string[]>(["blonde", "brunette", "black", "red", "pink", "blue", "purple", "platinum white", "auburn", "ginger"]);
  const [hairStyles, setHairStyles] = useState<string[]>(["long straight", "short bob", "curly", "pixie", "wavy", "messy bun", "bald", "fade", "crew cut", "buzz cut"]);
  const [facialHairs, setFacialHairs] = useState<string[]>(["none", "clean shaven", "stubble", "goatee", "mustache", "full beard", "short beard", "heavy stubble", "lumberjack beard", "chinstrap", "handlebar mustache"]);
  const [chestHairs, setChestHairs] = useState<string[]>(["none", "clean shaven chest", "defined muscular pecs", "broad powerful chest", "toned chest with light hair", "hairy chest", "bear chest"]);
  const [bodyShapes, setBodyShapes] = useState<string[]>(["hourglass", "pear", "athletic", "slim", "curvy", "chubby", "muscular", "lean", "broad shoulders", "dad bod", "chiseled v-taper", "shredded bodybuilder", "tall broad-shouldered", "petite slender"]);
  const [eyeColors, setEyeColors] = useState<string[]>(["brown", "blue", "green", "hazel", "grey", "piercing ice-blue", "deep sapphire blue", "emerald green", "warm amber", "steel gray"]);
  const [skinTones, setSkinTones] = useState<string[]>(["fair", "pale", "light", "medium", "olive", "tan", "brown", "dark", "ebony"]);
  const [heights, setHeights] = useState<string[]>(["petite", "short", "average", "tall", "towering"]);
  const [bodyBuilds, setBodyBuilds] = useState<string[]>(["slender", "toned", "muscular", "soft", "thick", "athletic", "bodybuilder", "shredded", "stocky"]);
  const [breastSizes, setBreastSizes] = useState<string[]>(["A cup", "B cup", "C cup", "D cup", "DD cup", "E cup", "F cup", "G cup"]);
  const [breastShapes, setBreastShapes] = useState<string[]>(["round", "tear-drop", "side-set", "athletic", "perky", "slender"]);
  const [assSizes, setAssSizes] = useState<string[]>(["small", "medium", "large", "huge"]);
  const [assShapes, setAssShapes] = useState<string[]>(["round", "bubble", "heart-shaped", "flat"]);
  const [penisSizes, setPenisSizes] = useState<string[]>(["small", "average", "thick", "large", "huge", "monster-sized"]);

  const [customVal, setCustomVal] = useState<Record<string, string>>({
    hairColor: "",
    hairStyle: "",
    facialHair: "",
    bodyShape: "",
    chestHair: "",
    eyeColor: "",
    skinTone: "",
    height: "",
    bodyBuild: "",
    breastSize: "",
    breastShape: "",
    assSize: "",
    assShape: "",
    penisSize: "",
  });

  // Predefined lists with labels
  const hairStylesList = [
    { id: "long straight", label: "Long Straight" },
    { id: "wavy bob", label: "Wavy Bob" },
    { id: "pixie cut", label: "Pixie Cut" },
    { id: "ponytail", label: "Ponytail" },
    { id: "double braids", label: "Double Braids" },
    { id: "curly shaggy", label: "Curly Shaggy" },
    { id: "curtain bangs", label: "Curtain Bangs" },
  ];

  const tattoosList = [
    { id: "none", label: "None" },
    { id: "rose", label: "Rose Flower" },
    { id: "dragon", label: "Chinese Dragon" },
    { id: "tribal band", label: "Tribal Band" },
    { id: "butterfly", label: "Butterfly Wings" },
    { id: "wings", label: "Angel Wings" },
    { id: "snake", label: "Coiled Snake" },
  ];

  function handleAddCustomOption(fieldKey: string, list: string[], setList: any) {
    const val = customVal[fieldKey]?.trim();
    if (val && !list.includes(val)) {
      setList([...list, val]);
      setC((prev: any) => ({ ...prev, [fieldKey]: val }));
      setCustomVal(prev => ({ ...prev, [fieldKey]: "" }));
    }
  }

  function addImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; 
    if (!f) return; 
    
    const reader = new FileReader(); 
    reader.onload = () => {
      setC((x: any) => ({ ...x, refImages: [...x.refImages, reader.result as string] }));
      
      // Trigger auto-analysis simulation
      setAnalyzeStatus("Analyzing reference image details...");
      setTimeout(() => {
        setAnalyzeStatus("Extracting hair structure, age, body outline, and outfit defaults...");
      }, 1500);

      setTimeout(() => {
        setC((prev: any) => ({
          ...prev,
          name: prev.name || "Elena",
          age: prev.age || "22",
          triggerWord: prev.triggerWord || "elena_model",
          persona: prev.persona || "A glamorous fashion model and travel influencer who loves photography, nature, and modern style.",
          hairColor: "blonde",
          hairStyle: "long straight",
          bodyShape: "hourglass",
          eyeColor: "blue",
          skinTone: "fair",
          height: "average",
          bodyBuild: "slender",
          appearance: prev.appearance || "Stunning symmetrical face, deep sapphire blue eyes, long blonde hair, soft natural lighting.",
          bodyAttributes: prev.bodyAttributes || "Slender athletic body shape, tall stature, 172cm height, toned shoulders.",
          outfitDefaults: prev.outfitDefaults || "Trendy casual: denim jacket, low-cut white tank top, dark blue skinny jeans.",
          styleNotes: prev.styleNotes || "Captured in warm golden hour sunlight, detailed skin texture, raw photo.",
          negative: prev.negative || "deformed, extra fingers, watermark, text",
          nsfw: true,
          breastSize: "D cup",
          breastShape: "round",
          breastsType: "Real",
          assAttributes: "round",
          assSize: "large",
          assShape: "round",
          pubicHair: "yes",
          pubicHairAmount: "light",
          pubicHairStyle: "shaved border",
          vaginaPiercings: "hood piercing",
          bellyPiercing: "yes",
          nosePiercing: "yes",
          tattooType: "rose",
          tattooPlacement: "above tailbone",
          sexActivityLevel: "nympho",
          sexPositions: prev.sexPositions || "missionary, cowgirl, doggystyle",
          fantasy: prev.fantasy || "exhibitionism, public intimacy, roleplay",
        }));
        setAnalyzeStatus("Analysis complete! Manually make changes to personalize your character below.");
      }, 3500);
    }; 
    reader.readAsDataURL(f); 
    e.target.value = ""; 
  }

  return (
    <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
      {/* 1. Core Profile Details */}
      <div className="bg-surface2/30 border border-border/40 p-4 rounded-xl space-y-3">
        <h4 className="font-semibold text-xs text-primary uppercase tracking-wider flex items-center gap-1.5">
          <User size={14} /> Core Profile Details
        </h4>
        <div className="grid md:grid-cols-3 gap-3">
          <Field label={<span><User size={13} className="inline mr-1 text-primary-light" /> Name</span>}>
            <input className="input text-xs" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
          </Field>
          <Field label={<span><Calendar size={13} className="inline mr-1 text-primary-light" /> Age (18+)</span>}>
            <input className="input text-xs" value={c.age} onChange={(e) => setC({ ...c, age: e.target.value })} />
          </Field>
          <Field label={<span><Sparkles size={13} className="inline mr-1 text-primary-light" /> Trigger Word / Token</span>}>
            <input className="input text-xs" value={c.triggerWord} onChange={(e) => setC({ ...c, triggerWord: e.target.value })} placeholder="e.g. miakvn" />
          </Field>
        </div>
        <Field label={<span><BookOpen size={13} className="inline mr-1 text-primary-light" /> Persona & Bio</span>}>
          <textarea className="input min-h-[60px] text-xs" value={c.persona} onChange={(e) => setC({ ...c, persona: e.target.value })} />
        </Field>
      </div>

      {/* 2. Reference Images & Auto Analysis */}
      <div className="bg-surface2/30 border border-border/40 p-4 rounded-xl space-y-3">
        <h4 className="font-semibold text-xs text-primary uppercase tracking-wider flex items-center gap-1.5">
          <ImagePlus size={14} /> Reference Images & AI Analyzer
        </h4>
        
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex flex-wrap gap-2">
            {c.refImages.map((img: string, i: number) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                <img src={img} className="w-full h-full object-cover" alt="" />
                <button 
                  type="button" 
                  className="absolute top-0.5 right-0.5 bg-black/60 rounded px-1 text-xs text-rose-400 font-bold" 
                  onClick={() => setC({ ...c, refImages: c.refImages.filter((_: any, j: number) => j !== i) })}
                >
                  ✕
                </button>
              </div>
            ))}
            <label className="w-20 h-20 rounded-lg border border-dashed border-border grid place-items-center cursor-pointer text-muted hover:text-text hover:border-primary/60 transition-colors">
              <ImagePlus size={18} />
              <input type="file" accept="image/*" hidden onChange={addImage} />
            </label>
          </div>

          {/* Analysis Status Bar */}
          {analyzeStatus && (
            <div className="flex-1 min-w-[200px] p-3 rounded-lg border bg-surface border-border/60">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  analyzeStatus.includes("complete") ? "bg-emerald-400 animate-none" : "bg-amber-400 animate-pulse"
                }`} />
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted">AI Analyzer Status</span>
              </div>
              <p className="text-xs text-text leading-tight">{analyzeStatus}</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Physical Attributes (Normal) */}
      <div className="bg-surface2/30 border border-border/40 p-4 rounded-xl space-y-4">
        <h4 className="font-semibold text-xs text-primary uppercase tracking-wider flex items-center gap-1.5">
          <Activity size={14} /> Normal Physical Attributes
        </h4>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Gender */}
          <div className="space-y-1.5">
            <Field label={<span><Activity size={13} className="inline mr-1 text-primary-light" /> Gender</span>}>
              <select className="input text-xs" value={c.gender} onChange={(e) => setC({ ...c, gender: e.target.value })}>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="futa">Futa / Trans</option>
              </select>
            </Field>
          </div>

          {/* Facial Hair (Only if Male) */}
          {c.gender === "male" && (
            <div className="space-y-1.5">
              <Field label={<span><Activity size={13} className="inline mr-1 text-primary-light" /> Facial Hair</span>}>
                <select className="input text-xs" value={c.facialHair} onChange={(e) => setC({ ...c, facialHair: e.target.value })}>
                  {facialHairs.map((hair) => (
                    <option key={hair} value={hair}>{hair}</option>
                  ))}
                </select>
              </Field>
              <div className="flex gap-1">
                <input 
                  className="input py-1 px-2 text-[10px] flex-1" 
                  placeholder="Add custom..." 
                  value={customVal.facialHair} 
                  onChange={(e) => setCustomVal({ ...customVal, facialHair: e.target.value })} 
                />
                <button 
                  type="button" 
                  className="btn-outline px-2 text-xs" 
                  onClick={() => handleAddCustomOption("facialHair", facialHairs, setFacialHairs)}
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Hair Color */}
          <div className="space-y-1.5">
            <Field label={<span><Palette size={13} className="inline mr-1 text-primary-light" /> Hair Color</span>}>
              <select className="input text-xs" value={c.hairColor} onChange={(e) => setC({ ...c, hairColor: e.target.value })}>
                {hairColors.map((color) => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>
            </Field>
            <div className="flex gap-1">
              <input 
                className="input py-1 px-2 text-[10px] flex-1" 
                placeholder="Add custom color..." 
                value={customVal.hairColor} 
                onChange={(e) => setCustomVal({ ...customVal, hairColor: e.target.value })} 
              />
              <button 
                type="button" 
                className="btn-outline px-2 text-xs" 
                onClick={() => handleAddCustomOption("hairColor", hairColors, setHairColors)}
              >
                +
              </button>
            </div>
          </div>

          {/* Body Shape */}
          <div className="space-y-1.5">
            <Field label={<span><Activity size={13} className="inline mr-1 text-primary-light" /> Body Shape</span>}>
              <select className="input text-xs" value={c.bodyShape} onChange={(e) => setC({ ...c, bodyShape: e.target.value })}>
                {bodyShapes.map((shape) => (
                  <option key={shape} value={shape}>{shape}</option>
                ))}
              </select>
            </Field>
            <div className="flex gap-1">
              <input 
                className="input py-1 px-2 text-[10px] flex-1" 
                placeholder="Add custom shape..." 
                value={customVal.bodyShape} 
                onChange={(e) => setCustomVal({ ...customVal, bodyShape: e.target.value })} 
              />
              <button 
                type="button" 
                className="btn-outline px-2 text-xs" 
                onClick={() => handleAddCustomOption("bodyShape", bodyShapes, setBodyShapes)}
              >
                +
              </button>
            </div>
          </div>

          {/* Eye Color */}
          <div className="space-y-1.5">
            <Field label={<span><Eye size={13} className="inline mr-1 text-primary-light" /> Eye Color</span>}>
              <select className="input text-xs" value={c.eyeColor} onChange={(e) => setC({ ...c, eyeColor: e.target.value })}>
                {eyeColors.map((color) => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>
            </Field>
            <div className="flex gap-1">
              <input 
                className="input py-1 px-2 text-[10px] flex-1" 
                placeholder="Add custom eye color..." 
                value={customVal.eyeColor} 
                onChange={(e) => setCustomVal({ ...customVal, eyeColor: e.target.value })} 
              />
              <button 
                type="button" 
                className="btn-outline px-2 text-xs" 
                onClick={() => handleAddCustomOption("eyeColor", eyeColors, setEyeColors)}
              >
                +
              </button>
            </div>
          </div>

          {/* Skin Tone */}
          <div className="space-y-1.5">
            <Field label={<span><Droplet size={13} className="inline mr-1 text-primary-light" /> Skin Tone</span>}>
              <select className="input text-xs" value={c.skinTone} onChange={(e) => setC({ ...c, skinTone: e.target.value })}>
                {skinTones.map((tone) => (
                  <option key={tone} value={tone}>{tone}</option>
                ))}
              </select>
            </Field>
            <div className="flex gap-1">
              <input 
                className="input py-1 px-2 text-[10px] flex-1" 
                placeholder="Add custom skin tone..." 
                value={customVal.skinTone} 
                onChange={(e) => setCustomVal({ ...customVal, skinTone: e.target.value })} 
              />
              <button 
                type="button" 
                className="btn-outline px-2 text-xs" 
                onClick={() => handleAddCustomOption("skinTone", skinTones, setSkinTones)}
              >
                +
              </button>
            </div>
          </div>

          {/* Height */}
          <div className="space-y-1.5">
            <Field label={<span><Ruler size={13} className="inline mr-1 text-primary-light" /> Height</span>}>
              <select className="input text-xs" value={c.height} onChange={(e) => setC({ ...c, height: e.target.value })}>
                {heights.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </Field>
            <div className="flex gap-1">
              <input 
                className="input py-1 px-2 text-[10px] flex-1" 
                placeholder="Add custom height..." 
                value={customVal.height} 
                onChange={(e) => setCustomVal({ ...customVal, height: e.target.value })} 
              />
              <button 
                type="button" 
                className="btn-outline px-2 text-xs" 
                onClick={() => handleAddCustomOption("height", heights, setHeights)}
              >
                +
              </button>
            </div>
          </div>

          {/* Body Build */}
          <div className="space-y-1.5">
            <Field label={<span><Dumbbell size={13} className="inline mr-1 text-primary-light" /> Body Build</span>}>
              <select className="input text-xs" value={c.bodyBuild} onChange={(e) => setC({ ...c, bodyBuild: e.target.value })}>
                {bodyBuilds.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </Field>
            <div className="flex gap-1">
              <input 
                className="input py-1 px-2 text-[10px] flex-1" 
                placeholder="Add custom build..." 
                value={customVal.bodyBuild} 
                onChange={(e) => setCustomVal({ ...customVal, bodyBuild: e.target.value })} 
              />
              <button 
                type="button" 
                className="btn-outline px-2 text-xs" 
                onClick={() => handleAddCustomOption("bodyBuild", bodyBuilds, setBodyBuilds)}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Hair Style Card Selector with SVG drawings */}
        <div>
          <span className="label flex items-center gap-1.5"><Scissors size={13} className="text-primary-light" /> Choose Hair Style</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-1.5">
            {hairStylesList.map((style) => {
              const active = c.hairStyle === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-[10px] text-center transition-all ${
                    active ? "border-primary bg-primary/10 text-primary-light" : "border-border/60 hover:border-border text-muted"
                  }`}
                  onClick={() => setC({ ...c, hairStyle: style.id })}
                >
                  <div className="mb-1.5">{renderHairStyleSVG(style.id)}</div>
                  <span className="font-semibold truncate w-full">{style.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex gap-2 items-center">
            <span className="text-[11px] text-muted shrink-0">More presets:</span>
            <select
              className="input py-1 px-2 text-xs flex-1 border border-border/40"
              value={c.hairStyle || ""}
              onChange={(e) => setC({ ...c, hairStyle: e.target.value })}
            >
              <option value="" disabled>Choose a detailed preset...</option>
              <optgroup label="Female Hairstyles">
                {femaleHairStyles.map((style) => (
                  <option key={style.id} value={style.id}>{style.label}</option>
                ))}
              </optgroup>
              <optgroup label="Male Hairstyles">
                {maleHairStyles.map((style) => (
                  <option key={style.id} value={style.id}>{style.label}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Locked Identity Prompts */}
      <div className="bg-surface2/30 border border-border/40 p-4 rounded-xl space-y-3">
        <h4 className="font-semibold text-xs text-primary uppercase tracking-wider flex items-center gap-1.5">
          <Lock size={14} /> Locked Identity Prompts (Anchor)
        </h4>
        <Field label={<span><Eye size={13} className="inline mr-1 text-primary-light" /> Locked Appearance (Face features, eye color, unique accents)</span>}>
          <textarea className="input min-h-[70px] text-xs" value={c.appearance} onChange={(e) => setC({ ...c, appearance: e.target.value })} />
        </Field>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label={<span><Activity size={13} className="inline mr-1 text-primary-light" /> Body attributes (height, waist details, proportions)</span>}>
            <textarea className="input min-h-[60px] text-xs" value={c.bodyAttributes} onChange={(e) => setC({ ...c, bodyAttributes: e.target.value })} />
          </Field>
          <Field label={<span><User size={13} className="inline mr-1 text-primary-light" /> Default outfits (Default wardrobe settings)</span>}>
            <textarea className="input min-h-[60px] text-xs" value={c.outfitDefaults} onChange={(e) => setC({ ...c, outfitDefaults: e.target.value })} />
          </Field>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label={<span><Sparkles size={13} className="inline mr-1 text-primary-light" /> Style Notes (Vibe, lighting tags)</span>}>
            <textarea className="input min-h-[60px] text-xs" value={c.styleNotes} onChange={(e) => setC({ ...c, styleNotes: e.target.value })} />
          </Field>
          <Field label={<span><Lock size={13} className="inline mr-1 text-primary-light" /> Negative prompts (Locked artifacts prevention)</span>}>
            <textarea className="input min-h-[60px] text-xs" value={c.negative} onChange={(e) => setC({ ...c, negative: e.target.value })} />
          </Field>
        </div>
      </div>

      {/* 5. NSFW / Toggle & Sub-fields */}
      <div className="border-t border-border/40 pt-4 space-y-4">
        {!canUseNsfw(addons) ? (
          <UpgradePrompt 
            title="NSFW Unlock Required" 
            message="Explicit and 18+ persona details require the NSFW Unlock add-on." 
            planNeeded="NSFW Addon" 
          />
        ) : (
          <div className="flex items-center justify-between bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl">
            <div className="flex gap-2.5 items-center">
              <ShieldAlert className="text-rose-400" size={18} />
              <div>
                <div className="text-xs font-semibold text-rose-400">Adult / 18+ Persona</div>
                <p className="text-[10px] text-muted leading-tight mt-0.5">Unlock explicit physical details and erotic demeanor generation tags.</p>
              </div>
            </div>
            <Toggle checked={c.nsfw} onChange={(b) => setC({ ...c, nsfw: b })} />
          </div>
        )}

        {c.nsfw && canUseNsfw(addons) && (
          <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-xl space-y-4">
            <h4 className="font-bold text-xs text-rose-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-rose-500/20 pb-2">
              <Flame size={14} /> Explicit Body Details (18+ NSFW)
            </h4>

            {/* Breast attributes */}
            {c.gender !== "male" && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Breast Size */}
              <div className="space-y-1.5">
                <Field label={<span><Flame size={13} className="inline mr-1 text-rose-400" /> Breast Size</span>}>
                  <select className="input text-xs" value={c.breastSize} onChange={(e) => setC({ ...c, breastSize: e.target.value })}>
                    {breastSizes.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </Field>
                <div className="flex gap-1">
                  <input 
                    className="input py-1 px-2 text-[10px] flex-1" 
                    placeholder="Add custom cup..." 
                    value={customVal.breastSize} 
                    onChange={(e) => setCustomVal({ ...customVal, breastSize: e.target.value })} 
                  />
                  <button 
                    type="button" 
                    className="btn-outline px-2 text-xs text-rose-400 hover:bg-rose-400/10" 
                    onClick={() => handleAddCustomOption("breastSize", breastSizes, setBreastSizes)}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Breast Shape */}
              <div className="space-y-1.5">
                <Field label={<span><Flame size={13} className="inline mr-1 text-rose-400" /> Breast Shape</span>}>
                  <select className="input text-xs" value={c.breastShape} onChange={(e) => setC({ ...c, breastShape: e.target.value })}>
                    {breastShapes.map((shape) => (
                      <option key={shape} value={shape}>{shape}</option>
                    ))}
                  </select>
                </Field>
                <div className="flex gap-1">
                  <input 
                    className="input py-1 px-2 text-[10px] flex-1" 
                    placeholder="Add custom shape..." 
                    value={customVal.breastShape} 
                    onChange={(e) => setCustomVal({ ...customVal, breastShape: e.target.value })} 
                  />
                  <button 
                    type="button" 
                    className="btn-outline px-2 text-xs text-rose-400 hover:bg-rose-400/10" 
                    onClick={() => handleAddCustomOption("breastShape", breastShapes, setBreastShapes)}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Real / Implants */}
              <Field label={<span><Flame size={13} className="inline mr-1 text-rose-400" /> Breasts Style</span>}>
                <select className="input text-xs" value={c.breastsType} onChange={(e) => setC({ ...c, breastsType: e.target.value })}>
                  <option value="Real">Real / Natural</option>
                  <option value="Implants">Implants / Fake</option>
                </select>
              </Field>
            </div>
            )}

            {/* Male attributes */}
            {(c.gender === "male" || c.gender === "futa") && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 border-t border-rose-500/10 pt-3">
                <div className="space-y-1.5 flex-1">
                  <Field label={<span><Flame size={13} className="inline mr-1 text-rose-400" /> Penis Size</span>}>
                    <select className="input text-xs" value={c.penisSize} onChange={(e) => setC({ ...c, penisSize: e.target.value })}>
                      {penisSizes.map((size) => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="flex gap-1">
                    <input className="input py-1 px-2 text-[10px] flex-1" placeholder="Add custom..." value={customVal.penisSize} onChange={(e) => setCustomVal({ ...customVal, penisSize: e.target.value })} />
                    <button type="button" className="btn-outline px-2 text-xs text-rose-400 hover:bg-rose-400/10" onClick={() => handleAddCustomOption("penisSize", penisSizes, setPenisSizes)}>+</button>
                  </div>
                </div>

                <Field label={<span><Flame size={13} className="inline mr-1 text-rose-400" /> Penis State</span>}>
                  <select className="input text-xs" value={c.penisState} onChange={(e) => setC({ ...c, penisState: e.target.value })}>
                    <option value="flaccid">Flaccid</option>
                    <option value="semi-erect">Semi-Erect</option>
                    <option value="erect">Erect</option>
                    <option value="hard">Hard / Throbbing</option>
                  </select>
                </Field>

                <Field label={<span><Flame size={13} className="inline mr-1 text-rose-400" /> Circumcised?</span>}>
                  <select className="input text-xs" value={c.penisCircumcised} onChange={(e) => setC({ ...c, penisCircumcised: e.target.value })}>
                    <option value="no">No (Uncut)</option>
                    <option value="yes">Yes (Cut)</option>
                  </select>
                </Field>

                <div className="space-y-1.5 flex-1">
                  <Field label={<span><Flame size={13} className="inline mr-1 text-rose-400" /> Chest Hair</span>}>
                    <select className="input text-xs" value={c.chestHair} onChange={(e) => setC({ ...c, chestHair: e.target.value })}>
                      {chestHairs.map((hair) => (
                        <option key={hair} value={hair}>{hair}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
            )}

            {/* Ass Size & Shape */}
            <div className="grid sm:grid-cols-2 gap-3 items-start border-t border-rose-500/10 pt-3">
              {/* Ass Size */}
              <div className="space-y-1.5 flex-1">
                <Field label={<span><Smile size={13} className="inline mr-1 text-rose-400" /> Ass Size</span>}>
                  <select className="input text-xs" value={c.assSize} onChange={(e) => setC({ ...c, assSize: e.target.value })}>
                    {assSizes.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </Field>
                <div className="flex gap-1">
                  <input 
                    className="input py-1 px-2 text-[10px] flex-1" 
                    placeholder="Add custom size..." 
                    value={customVal.assSize} 
                    onChange={(e) => setCustomVal({ ...customVal, assSize: e.target.value })} 
                  />
                  <button 
                    type="button" 
                    className="btn-outline px-2 text-xs text-rose-400 hover:bg-rose-400/10" 
                    onClick={() => handleAddCustomOption("assSize", assSizes, setAssSizes)}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Ass Shape */}
              <div className="space-y-1.5 flex-1">
                <Field label={<span><Smile size={13} className="inline mr-1 text-rose-400" /> Ass Shape</span>}>
                  <select className="input text-xs" value={c.assShape} onChange={(e) => setC({ ...c, assShape: e.target.value })}>
                    {assShapes.map((shape) => (
                      <option key={shape} value={shape}>{shape}</option>
                    ))}
                  </select>
                </Field>
                <div className="flex gap-1">
                  <input 
                    className="input py-1 px-2 text-[10px] flex-1" 
                    placeholder="Add custom shape..." 
                    value={customVal.assShape} 
                    onChange={(e) => setCustomVal({ ...customVal, assShape: e.target.value })} 
                  />
                  <button 
                    type="button" 
                    className="btn-outline px-2 text-xs text-rose-400 hover:bg-rose-400/10" 
                    onClick={() => handleAddCustomOption("assShape", assShapes, setAssShapes)}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Pubic Hair Setup */}
            <div className="grid sm:grid-cols-3 gap-3 border-t border-rose-500/10 pt-3">
              <Field label={<span><Feather size={13} className="inline mr-1 text-rose-400" /> Pubic Hair?</span>}>
                <select className="input text-xs" value={c.pubicHair} onChange={(e) => setC({ ...c, pubicHair: e.target.value })}>
                  <option value="no">No (Fully Shaved)</option>
                  <option value="yes">Yes</option>
                </select>
              </Field>

              {c.pubicHair === "yes" && (
                <>
                  <Field label={<span><Feather size={13} className="inline mr-1 text-rose-400" /> How much pubic hair?</span>}>
                    <select className="input text-xs" value={c.pubicHairAmount} onChange={(e) => setC({ ...c, pubicHairAmount: e.target.value })}>
                      <option value="light">Light stubble</option>
                      <option value="medium">Medium density</option>
                      <option value="thick/bushy">Thick / Bushy</option>
                    </select>
                  </Field>
                  <Field label={<span><Feather size={13} className="inline mr-1 text-rose-400" /> Pubic Hair Style</span>}>
                    <select className="input text-xs" value={c.pubicHairStyle} onChange={(e) => setC({ ...c, pubicHairStyle: e.target.value })}>
                      <option value="air strip">Air strip</option>
                      <option value="shaved border">Triangle patch / Shaved border</option>
                      <option value="natural">Natural/Full</option>
                    </select>
                  </Field>
                </>
              )}
            </div>

            {/* Piercings */}
            <div className="grid sm:grid-cols-3 gap-3 border-t border-rose-500/10 pt-3">
              <Field label={<span><CircleDot size={13} className="inline mr-1 text-rose-400" /> Genital Piercings</span>}>
                <select className="input text-xs" value={c.vaginaPiercings} onChange={(e) => setC({ ...c, vaginaPiercings: e.target.value })}>
                  <option value="none">None</option>
                  <option value="hood piercing">Vertical Hood (VCH)</option>
                  <option value="labia piercing">Labia rings</option>
                  <option value="Prince Albert">Prince Albert (Male)</option>
                  <option value="frenum piercing">Frenum (Male)</option>
                  <option value="custom">Custom details</option>
                </select>
              </Field>
              <Field label={<span><CircleDot size={13} className="inline mr-1 text-rose-400" /> Belly Button Piercing</span>}>
                <select className="input text-xs" value={c.bellyPiercing} onChange={(e) => setC({ ...c, bellyPiercing: e.target.value })}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </Field>
              <Field label={<span><CircleDot size={13} className="inline mr-1 text-rose-400" /> Nose Piercing</span>}>
                <select className="input text-xs" value={c.nosePiercing} onChange={(e) => setC({ ...c, nosePiercing: e.target.value })}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </Field>
            </div>

            {/* Tattoos Selector */}
            <div className="border-t border-rose-500/10 pt-3">
              <span className="label flex items-center gap-1.5"><Brush size={13} className="text-rose-400" /> Tattoo Design Chooser</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-1.5">
                {tattoosList.map((tattoo) => {
                  const active = c.tattooType === tattoo.id;
                  return (
                    <button
                      key={tattoo.id}
                      type="button"
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border text-[10px] text-center transition-all ${
                        active ? "border-rose-400 bg-rose-400/10 text-rose-300" : "border-border/60 hover:border-border text-muted"
                      }`}
                      onClick={() => setC({ ...c, tattooType: tattoo.id })}
                    >
                      <div className="mb-1.5">{renderTattooSVG(tattoo.id)}</div>
                      <span className="font-semibold truncate w-full">{tattoo.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {c.tattooType !== "none" && (
              <Field label={<span><Brush size={13} className="inline mr-1 text-rose-400" /> Tattoo Placement</span>}>
                <select className="input text-xs" value={c.tattooPlacement} onChange={(e) => setC({ ...c, tattooPlacement: e.target.value })}>
                  <option value="above tailbone">Above tailbone (Tramp stamp)</option>
                  <option value="arms">Arms / Sleeves</option>
                  <option value="legs">Legs / Thigh</option>
                  <option value="back">Full Back</option>
                  <option value="chest">Chest / Underboob</option>
                  <option value="shoulder">Shoulder blade</option>
                  <option value="neck">Neck / Behind ear</option>
                </select>
              </Field>
            )}

            {/* Sexual demeanors */}
            <div className="grid sm:grid-cols-2 gap-3 border-t border-rose-500/10 pt-3">
              <Field label={<span><Heart size={13} className="inline mr-1 text-rose-400" /> Sexual Activity Level</span>}>
                <select className="input text-xs" value={c.sexActivityLevel} onChange={(e) => setC({ ...c, sexActivityLevel: e.target.value })}>
                  <option value="none">None</option>
                  <option value="nun">Nun</option>
                  <option value="virgin">Virgin</option>
                  <option value="average">Average</option>
                  <option value="slut">Slut</option>
                  <option value="nympho">Nympho</option>
                </select>
              </Field>
              <Field label={<span><Heart size={13} className="inline mr-1 text-rose-400" /> Favorite Sexual Positions</span>}>
                <input 
                  className="input text-xs" 
                  value={c.sexPositions} 
                  onChange={(e) => setC({ ...c, sexPositions: e.target.value })} 
                  placeholder="e.g. missionary, doggy, cowgirl" 
                />
              </Field>
            </div>
            
            <Field label={<span><Flame size={13} className="inline mr-1 text-rose-400" /> Fantasy / Erotic Desires Wished For</span>}>
              <textarea 
                className="input min-h-[60px] text-xs font-mono" 
                value={c.fantasy} 
                onChange={(e) => setC({ ...c, fantasy: e.target.value })} 
                placeholder="e.g. exhibitionism, public intimacy..." 
              />
            </Field>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border/40">
        <button type="button" className="btn-primary px-6 h-10 font-bold" onClick={() => onSave(c)}>
          Save Character
        </button>
      </div>
    </div>
  );
}

async function createImagesZip(images: string[]): Promise<Blob> {
  const zip = new JSZip();
  for (let i = 0; i < images.length; i++) {
    const dataUrl = images[i];
    const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches) continue;
    const ext = matches[1];
    const base64Data = matches[2];
    zip.file(`image_${i + 1}.${ext}`, base64Data, { base64: true });
  }
  return await zip.generateAsync({ type: "blob" });
}

async function uploadZipToFal(blob: Blob, falKey: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", blob, "dataset.zip");

  const res = await fetch("https://queue.fal.run/files/upload", {
    method: "POST",
    headers: {
      "Authorization": `Key ${falKey}`
    },
    body: formData
  });

  if (!res.ok) {
    const fallbackData = new FormData();
    fallbackData.append("file_upload", blob, "dataset.zip");
    const fallbackRes = await fetch("https://queue.fal.run/files/upload", {
      method: "POST",
      headers: {
        "Authorization": `Key ${falKey}`
      },
      body: fallbackData
    });
    if (!fallbackRes.ok) {
      throw new Error(`Upload to fal CDN failed: ${await fallbackRes.text()}`);
    }
    const data = await fallbackRes.json();
    return data.url;
  }

  const data = await res.json();
  return data.url;
}

async function startFalTraining(zipUrl: string, triggerWord: string, steps: number, isStyle: boolean, falKey: string) {
  const res = await fetch("https://queue.fal.run/fal-ai/flux-lora-fast-training", {
    method: "POST",
    headers: {
      "Authorization": `Key ${falKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      images_data_url: zipUrl,
      trigger_word: triggerWord,
      steps: steps,
      is_style: isStyle
    })
  });

  if (!res.ok) {
    throw new Error(`Failed to initiate training: ${await res.text()}`);
  }

  return await res.json();
}

async function pollFalTraining(statusUrl: string, falKey: string) {
  const res = await fetch(statusUrl, {
    headers: {
      "Authorization": `Key ${falKey}`
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to poll status: ${await res.text()}`);
  }

  return await res.json();
}

function LoraTrainer({ item, onClose }: { item: Character; onClose: () => void }) {
  const settings = useSettings();
  const setKey = useLibrary((s) => s.set);
  const characters = useLibrary((s) => s.characters);
  
  const [triggerWord, setTriggerWord] = useState(item.triggerWord || item.name.toLowerCase().replace(/\s+/g, "_"));
  const [steps, setSteps] = useState(1000);
  const [isStyle, setIsStyle] = useState(false);
  
  const [localFalKey, setLocalFalKey] = useState(settings.falKey || "");
  const [status, setStatus] = useState<'idle' | 'zip' | 'upload' | 'init' | 'training' | 'completed' | 'failed'>(
    item.loraStatus === "training" ? "training" : "idle"
  );
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [downloadUrl, setDownloadUrl] = useState(item.loraUrl || "");
  const [requestId, setRequestId] = useState(item.loraRequestId || "");

  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll logs console
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // If already training, resume polling on mount
  useEffect(() => {
    let active = true;
    let pollInterval: NodeJS.Timeout;

    async function resumePolling() {
      if (item.loraStatus === "training" && item.loraStatusUrl) {
        setStatus("training");
        setLogs(["Resuming connection to fal.ai training job...", "Streaming logs..."]);
        try {
          const checkStatus = async () => {
            const currentKey = localFalKey.trim() || settings.falKey.trim();
            if (!currentKey) return;
            
            const data = await pollFalTraining(item.loraStatusUrl!, currentKey);
            if (!active) return;
            
            if (data.logs && data.logs.length > 0) {
              setLogs(["Resuming connection to fal.ai training job...", "Streaming logs...", ...data.logs.map((l: any) => l.message)]);
            }
            
            if (data.status === "COMPLETED") {
              const responseData = await fetch(item.loraResponseUrl!, {
                headers: { "Authorization": `Key ${currentKey}` }
              }).then(r => r.json());
              
              const loraUrl = responseData.diffusers_lora_file?.url || "";
              const configUrl = responseData.config_file?.url || "";
              
              const updated = {
                ...item,
                loraStatus: "completed" as const,
                loraUrl,
                loraConfigUrl: configUrl
              };
              setKey("characters", characters.map(x => x.id === item.id ? updated : x));
              setDownloadUrl(loraUrl);
              setStatus("completed");
              clearInterval(pollInterval);
            } else if (data.status === "FAILED") {
              const updated = {
                ...item,
                loraStatus: "failed" as const
              };
              setKey("characters", characters.map(x => x.id === item.id ? updated : x));
              setStatus("failed");
              setError("LoRA training failed on fal.ai runner.");
              clearInterval(pollInterval);
            }
          };

          await checkStatus();
          pollInterval = setInterval(checkStatus, 5000);
        } catch (e: any) {
          console.error("Polling failed", e);
        }
      }
    }

    resumePolling();
    return () => {
      active = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [item.id]);

  async function handleTrain() {
    const keyToUse = localFalKey.trim() || settings.falKey.trim();
    if (!keyToUse) {
      setError("Please provide a FAL.ai API Key to start training.");
      return;
    }
    
    if (localFalKey && localFalKey !== settings.falKey) {
      settings.setFalKey(localFalKey);
    }

    if (item.refImages.length < 4) {
      setError("At least 4 reference images are required to train a character model (recommended: 6 to 12).");
      return;
    }

    setError("");
    setLogs([]);
    setStatus("zip");

    try {
      setLogs(["Constructing training dataset zip from character reference images..."]);
      const zipBlob = await createImagesZip(item.refImages);
      setLogs(prev => [...prev, "Dataset zip file constructed successfully! Size: " + (zipBlob.size / 1024 / 1024).toFixed(2) + " MB"]);
      
      setStatus("upload");
      setLogs(prev => [...prev, "Uploading ZIP dataset to fal.ai CDN storage..."]);
      const cdnUrl = await uploadZipToFal(zipBlob, keyToUse);
      setLogs(prev => [...prev, "ZIP dataset uploaded successfully! CDN URL: " + cdnUrl]);
      
      setStatus("init");
      setLogs(prev => [...prev, "Submitting LoRA training job to fal-ai/flux-lora-fast-training..."]);
      const job = await startFalTraining(cdnUrl, triggerWord, steps, isStyle, keyToUse);
      setRequestId(job.request_id);
      
      const updated = {
        ...item,
        loraStatus: "training" as const,
        loraRequestId: job.request_id,
        loraStatusUrl: job.status_url,
        loraResponseUrl: job.response_url
      };
      setKey("characters", characters.map(x => x.id === item.id ? updated : x));
      
      setStatus("training");
      setLogs(prev => [
        "Dataset zip file constructed successfully! Size: " + (zipBlob.size / 1024 / 1024).toFixed(2) + " MB",
        "ZIP dataset uploaded successfully! CDN URL: " + cdnUrl,
        "Training job accepted! Request ID: " + job.request_id,
        "Streaming logs from trainer..."
      ]);
      
      const checkStatus = async () => {
        try {
          const data = await pollFalTraining(job.status_url, keyToUse);
          if (data.logs) {
            setLogs([
              "Dataset zip file constructed successfully! Size: " + (zipBlob.size / 1024 / 1024).toFixed(2) + " MB",
              "ZIP dataset uploaded successfully! CDN URL: " + cdnUrl,
              "Training job accepted! Request ID: " + job.request_id,
              "Streaming logs from trainer...",
              ...data.logs.map((l: any) => l.message)
            ]);
          }
          
          if (data.status === "COMPLETED") {
            const responseData = await fetch(job.response_url, {
              headers: { "Authorization": `Key ${keyToUse}` }
            }).then(r => r.json());
            
            const loraUrl = responseData.diffusers_lora_file?.url || "";
            const configUrl = responseData.config_file?.url || "";
            
            const completedChar = {
              ...item,
              loraStatus: "completed" as const,
              loraUrl,
              loraConfigUrl: configUrl
            };
            setKey("characters", characters.map(x => x.id === item.id ? completedChar : x));
            setDownloadUrl(loraUrl);
            setStatus("completed");
            clearInterval(pollInterval);
          } else if (data.status === "FAILED") {
            const failedChar = {
              ...item,
              loraStatus: "failed" as const
            };
            setKey("characters", characters.map(x => x.id === item.id ? failedChar : x));
            setStatus("failed");
            setError("LoRA training failed on fal.ai runner.");
            clearInterval(pollInterval);
          }
        } catch (err: any) {
          console.error("Polling error:", err);
        }
      };

      const pollInterval = setInterval(checkStatus, 5000);
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred during training setup.");
      setStatus("failed");
    }
  }

  function handleReset() {
    const updated = {
      ...item,
      loraStatus: "none" as const,
      loraUrl: undefined,
      loraConfigUrl: undefined,
      loraRequestId: undefined,
      loraStatusUrl: undefined,
      loraResponseUrl: undefined
    };
    setKey("characters", characters.map(x => x.id === item.id ? updated : x));
    setDownloadUrl("");
    setRequestId("");
    setLogs([]);
    setStatus("idle");
    setError("");
  }

  const isBusy = ['zip', 'upload', 'init', 'training'].includes(status);

  return (
    <div className="space-y-4 max-w-lg">
      <div className="bg-surface2/30 border border-border/40 p-4 rounded-xl space-y-2.5">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-sm text-text">Training Dataset Summary</h3>
            <p className="text-[10px] text-muted mt-0.5">Character: {item.name || "Unnamed"}</p>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
            item.refImages.length >= 6 ? 'bg-emerald-400/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400'
          }`}>
            {item.refImages.length} reference images
          </span>
        </div>
        
        {item.refImages.length < 4 && (
          <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-lg flex gap-2 text-rose-400 text-xs">
            <AlertTriangle size={16} className="shrink-0" />
            <span>FAL.ai requires at least 4 reference images to train a custom character LoRA. Please edit your character and add more images.</span>
          </div>
        )}
      </div>

      {!settings.falKey && !localFalKey && (
        <div className="bg-amber-500/5 border border-amber-500/10 p-3.5 rounded-xl space-y-2">
          <div className="flex gap-2 text-amber-400 text-xs font-semibold">
            <AlertTriangle size={15} />
            <span>FAL.ai API Key Required</span>
          </div>
          <p className="text-[10px] text-muted leading-relaxed">
            You must enter a FAL.ai API key to launch LoRA training runs. The key will be stored securely in your settings.
          </p>
          <input 
            className="input text-xs w-full py-1.5"
            type="password"
            placeholder="Enter fal_..."
            value={localFalKey}
            onChange={(e) => setLocalFalKey(e.target.value)}
          />
        </div>
      )}

      {status === "idle" && item.refImages.length >= 4 && (
        <div className="bg-surface2/30 border border-border/40 p-4 rounded-xl space-y-3">
          <h3 className="font-bold text-sm text-text">Configure Training Parameters</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <Field label="Trigger Word">
              <input 
                className="input text-xs" 
                value={triggerWord} 
                onChange={(e) => setTriggerWord(e.target.value)} 
                placeholder="e.g. miakvn"
              />
            </Field>
            <Field label="Training Steps">
              <select className="input text-xs" value={steps} onChange={(e) => setSteps(Number(e.target.value))}>
                <option value={500}>500 (Fastest)</option>
                <option value={1000}>1000 (Recommended)</option>
                <option value={1500}>1500 (High Quality)</option>
                <option value={2000}>2000 (Max Detail)</option>
              </select>
            </Field>
          </div>

          <div className="flex items-center justify-between border-t border-border/30 pt-3">
            <div>
              <div className="text-xs font-medium text-text">Train as Style</div>
              <p className="text-[9px] text-muted-more mt-0.5">Disables auto-captioning (use for aesthetic styles instead of faces).</p>
            </div>
            <Toggle checked={isStyle} onChange={setIsStyle} />
          </div>
        </div>
      )}

      {/* Loading States */}
      {isBusy && (
        <div className="bg-surface2/30 border border-border/40 p-4 rounded-xl space-y-3 text-center py-6">
          <Loader2 className="animate-spin text-primary-light mx-auto" size={30} />
          <div>
            <h4 className="font-semibold text-xs capitalize text-text">
              {status === 'zip' && "Packaging reference dataset..."}
              {status === 'upload' && "Uploading dataset to fal storage CDN..."}
              {status === 'init' && "Submitting job to GPU cluster..."}
              {status === 'training' && "Training LoRA Model..."}
            </h4>
            <p className="text-[10px] text-muted mt-1 leading-relaxed max-w-xs mx-auto">
              {status === 'training' 
                ? "Fast training is actively running on fal.ai. This takes ~3-7 minutes. You can safely close this modal; progress continues in the background."
                : "Setting up training environment..."
              }
            </p>
          </div>
        </div>
      )}

      {/* Completed State */}
      {status === "completed" && (
        <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-xl text-center space-y-3">
          <CheckCircle2 className="text-emerald-400 mx-auto" size={36} />
          <div>
            <h3 className="font-bold text-sm text-text">LoRA Training Completed!</h3>
            <p className="text-[10px] text-muted mt-0.5">Your FLUX LoRA weights are ready to download and use.</p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <a 
              href={downloadUrl} 
              download={`${item.name || 'character'}_lora.safetensors`}
              className="btn-primary flex items-center gap-1.5 text-xs font-bold px-4"
            >
              <Download size={14} /> Download Safetensors
            </a>
            <button className="btn-outline text-xs px-3" onClick={handleReset}>
              Train New Version
            </button>
          </div>
        </div>
      )}

      {/* Failed / Error State */}
      {(status === "failed" || error) && (
        <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-xl text-center space-y-3">
          <XCircle className="text-rose-400 mx-auto" size={30} />
          <div>
            <h3 className="font-bold text-sm text-text">LoRA Training Failed</h3>
            <p className="text-[10px] text-rose-400/80 mt-1 max-w-sm mx-auto leading-relaxed">{error || "An error occurred during training."}</p>
          </div>
          <button className="btn-outline text-xs" onClick={handleReset}>
            Retry Configuration
          </button>
        </div>
      )}

      {/* Live Console Logs */}
      {logs.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase font-bold tracking-wider text-muted-more flex items-center justify-between">
            <span>Training Console Output</span>
            {status === "training" && <span className="text-amber-400 animate-pulse">● Live streaming</span>}
          </div>
          <div className="bg-black text-emerald-400 font-mono text-[10px] p-3 rounded-lg h-44 overflow-y-auto leading-relaxed select-text border border-border/30">
            {logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-border/40 pt-3 mt-4">
        <button className="btn-outline text-xs px-4" onClick={onClose}>
          {status === "training" ? "Close & Run in Background" : "Close"}
        </button>
        {status === "idle" && item.refImages.length >= 4 && (
          <button className="btn-primary flex items-center gap-1 text-xs font-bold px-5" onClick={handleTrain}>
            <Play size={12} /> Start LoRA Training
          </button>
        )}
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

interface CharacterXRayToolProps {
  character: Character;
  onClose: () => void;
}

type ActiveLayer = 'skin' | 'muscles' | 'bones' | 'heart' | 'nervousSystem';

function CharacterXRayTool({ character, onClose }: CharacterXRayToolProps) {
  const settings = useSettings();
  const characters = useLibrary((s) => s.characters);
  const setKey = useLibrary((s) => s.set);

  const [generating, setGenerating] = useState(false);
  const [activeLayer, setActiveLayer] = useState<ActiveLayer>('skin');
  const [copiedPromptIndex, setCopiedPromptIndex] = useState<number | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadingSteps = [
    "Establishing neural link with character files...",
    "Scanning external behavioral mask (The Skin)...",
    "Measuring social drives and vocal skillsets (The Muscles)...",
    "Probing foundational historical traumas and childhood wounds (The Bones)...",
    "Decoding unconscious emotional desires and hidden values (The Heart)...",
    "Evaluating neural stress capacity and crisis breaking points (The Nervous System)...",
    "Assembling unified psychological X-Ray dossier..."
  ];

  useEffect(() => {
    if (generating) {
      const interval = setInterval(() => {
        setLoadingStep(prev => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [generating]);

  const currentCharacter = characters.find(c => c.id === character.id) || character;
  const xray = currentCharacter.xray || null;

  const handleGenerate = async () => {
    setGenerating(true);
    setLoadingStep(0);
    setError(null);
    try {
      const provider = settings.providers.find((p) => p.id === settings.activeProviderId);
      if (!provider) throw new Error("No active AI provider configured in settings.");
      const model = provider.selectedModel || provider.models[0] || "default";

      const prompt = `Conduct a deep, artistic psychological X-Ray analysis on the character "${currentCharacter.name}".
Here is their background and profile details:
Age: ${currentCharacter.age}
Persona & Bio: ${currentCharacter.persona}
Physical Attributes: ${characterPrompt(currentCharacter)}

Analyze other aspects of this character according to these specific structural psychological concepts:
1. The Skin (Facade, appearance, social presentation, initial impression)
2. The Muscles (Drives, conscious objectives, habits, skillset)
3. The Bones (Shattered pillars, unresolved grief/ghosts, childhood wounds, foundational traumas)
4. The Heart (Core emotional engine, unconscious needs vs conscious wants, core values)
5. The Nervous System (Overwhelm triggers, breaking points, fight/flight responses, extreme shadow states)

Determine dynamic rating indices for: Mask Density (how thick their facade is), Ego Stability (conscious control), Vulnerability Quotient (emotional sensitivity/shatter rate), Empathic Resonance (ability to connect under fire). All scores 1 to 100.
Provide 3 dramatic writing/plot/scene prompts that specifically attack their psychological weak spots or pressure points.

Your output MUST be a valid JSON object matching this schema. Do not write any conversational text, explanations, or markdown code fences:
{
  "skin": "deep narrative explanation...",
  "muscles": "deep narrative explanation...",
  "bones": "deep narrative explanation...",
  "heart": "deep narrative explanation...",
  "nervousSystem": "deep narrative explanation...",
  "metrics": {
    "maskDensity": number (1-100),
    "egoStability": number (1-100),
    "vulnerabilityQuotient": number (1-100),
    "empathicResonance": number (1-100)
  },
  "writingPrompts": [
    "prompt 1",
    "prompt 2",
    "prompt 3"
  ]
}`;

      const out = await chat({
        provider,
        model,
        uncensored: settings.uncensored,
        system: "You are an elite, highly insightful character development coach and critique analyst. You dissect writing characters down to their core structural levels of external veneer and psychological raw nerves.",
        messages: [{ id: newId(), role: "user", content: prompt }]
      });

      if (!out) throw new Error("Received empty response from AI model.");

      let cleanText = out.trim();
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanText = cleanText.slice(firstBrace, lastBrace + 1);
      }

      const xrayData: CharacterXRay = JSON.parse(cleanText);

      if (!xrayData.skin || !xrayData.muscles || !xrayData.bones || !xrayData.heart || !xrayData.nervousSystem || !xrayData.metrics || !xrayData.writingPrompts) {
        throw new Error("Invalid psychological dossier structure returned by AI.");
      }

      // Save to library store
      const updated = characters.map(c => 
        c.id === currentCharacter.id 
          ? { ...c, xray: xrayData, updatedAt: Date.now() } 
          : c
      );
      setKey("characters", updated);
    } catch (e: any) {
      console.error("X-Ray generation failed:", e);
      setError(e.message || "An unexpected error occurred during scanning.");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedPromptIndex(index);
    setTimeout(() => setCopiedPromptIndex(null), 2000);
  };

  const layerInfo = [
    { id: 'skin', label: 'The Skin', icon: User, color: 'text-purple-400 border-purple-500/20' },
    { id: 'muscles', label: 'The Muscle', icon: Zap, color: 'text-blue-400 border-blue-500/20' },
    { id: 'bones', label: 'The Bone', icon: Bone, color: 'text-orange-400 border-orange-500/20' },
    { id: 'heart', label: 'The Heart', icon: Heart, color: 'text-red-400 border-red-500/20' },
    { id: 'nervousSystem', label: 'Nervous System', icon: Brain, color: 'text-emerald-400 border-emerald-500/20' }
  ] as const;

  const provider = settings.providers.find((p) => p.id === settings.activeProviderId);
  const activeModelName = provider ? (provider.selectedModel || provider.models[0] || "default") : "";
  const activeProviderName = provider ? provider.name : "";

  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 min-h-[400px]">
        <style>{`
          @keyframes scan-sweep {
            0% { top: 0%; }
            50% { top: 100%; }
            100% { top: 0%; }
          }
          .animate-scan-sweep {
            position: absolute;
            animation: scan-sweep 4s ease-in-out infinite;
          }
        `}</style>
        <div className="relative mb-10">
          <div className="w-24 h-24 rounded-full border border-dashed border-red-500/30 animate-spin flex items-center justify-center" style={{ animationDuration: '20s' }} />
          <div className="absolute inset-0 m-auto w-16 h-16 rounded-full border border-dashed border-[#F27D26]/40 animate-spin flex items-center justify-center" style={{ animationDuration: '10s' }} />
          <div className="absolute inset-0 m-auto w-10 h-10 bg-gradient-to-tr from-[#F27D26]/10 to-red-500/20 rounded-full flex items-center justify-center">
            <Layers className="w-5 h-5 text-[#F27D26] animate-pulse" />
          </div>
        </div>

        <h3 className="text-xl font-serif italic text-white text-center mb-2">Reconstructing Spirit Matrix</h3>
        
        <div className="h-6 overflow-hidden max-w-md w-full relative flex items-center justify-center">
          <p className="text-xs text-gray-400 text-center tracking-wide font-mono animate-pulse">
            {loadingSteps[loadingStep]}
          </p>
        </div>

        <div className="w-48 bg-white/5 h-1 rounded-full overflow-hidden mt-6">
          <div 
            className="h-full bg-gradient-to-r from-[#F27D26] to-red-500 transition-all duration-500" 
            style={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 select-text">
      <style>{`
        @keyframes scan-sweep {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        .animate-scan-sweep {
          position: absolute;
          animation: scan-sweep 3s ease-in-out infinite;
        }
        .forge-card {
          background-color: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 1rem;
          overflow: hidden;
        }
      `}</style>
      
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-center gap-3 text-xs text-rose-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">Scan Error:</span> {error}
          </div>
          <button className="btn-outline px-3 py-1 text-[10px]" onClick={handleGenerate}>
            Retry Scan
          </button>
        </div>
      )}

      {!xray ? (
        <div className="border border-white/5 bg-white/[0.01] rounded-3xl p-10 text-center flex flex-col items-center justify-center">
          <div className="p-4 bg-[#F27D26]/10 rounded-2xl mb-6">
            <Layers className="w-8 h-8 text-[#F27D26]" />
          </div>
          <h3 className="text-2xl font-serif italic text-white mb-2">Psychological X-Ray</h3>
          <p className="text-xs text-gray-500 max-w-sm uppercase tracking-wider mb-6 leading-relaxed">
            Expose the internal architecture of "{currentCharacter.name}"'s mind. Peer past their social mask into deep trauma layers, unconscious needs, and psychological breaking points.
          </p>
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 px-8 py-3 bg-white text-black font-semibold rounded-xl text-xs uppercase tracking-widest hover:bg-[#F27D26] hover:text-white transition-all transform hover:scale-[1.03] shadow-md shadow-orange-500/5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" /> Scan Vessel (Generate X-Ray)
          </button>
          {activeProviderName && (
            <span className="text-[9px] text-muted-more font-mono mt-4 block">
              Active Scanner: {activeProviderName} ({activeModelName})
            </span>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Visual Scanner and Layers */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="forge-card p-6 flex flex-col items-center relative overflow-hidden">
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="text-[9px] font-mono uppercase text-gray-400 tracking-widest">Active Scan</span>
              </div>
              
              <button 
                onClick={handleGenerate}
                className="absolute top-3 right-3 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all text-gray-400 hover:text-[#F27D26]"
                title="Rescan / Regen X-Ray"
              >
                <RotateCw className="w-3.5 h-3.5 hover:rotate-180 transition-all duration-300" />
              </button>

              {/* Anatomy Scanning Mockup */}
              <div className="relative w-44 h-48 my-6 flex items-center justify-center border border-white/5 rounded-2xl bg-black/20 p-2 overflow-hidden">
                <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-[#F27D26] to-transparent animate-scan-sweep left-0 z-20 pointer-events-none" />
                
                {/* SVG mannequin layered with glows depending on active segment */}
                <svg viewBox="0 0 100 100" className="w-full h-full opacity-65 select-none">
                  {/* Outer aura glow depending on active category */}
                  <g className="transition-all duration-500" style={{ transformOrigin: 'center' }}>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className={cn(
                      "transition-all duration-500",
                      activeLayer === 'skin' && "text-purple-500/35",
                      activeLayer === 'muscles' && "text-blue-500/35",
                      activeLayer === 'bones' && "text-orange-500/35",
                      activeLayer === 'heart' && "text-red-500/40",
                      activeLayer === 'nervousSystem' && "text-emerald-500/35"
                    )} />
                  </g>

                  {/* Aesthetic grid */}
                  <path d="M 50 10 L 50 90 M 10 50 L 90 50" stroke="white" strokeWidth="0.1" strokeOpacity="0.15" />

                  {/* Figure skin */}
                  <path d="M50 20 C55 20 58 24 58 30 C58 36 54 40 50 40 C46 40 42 36 42 30 C42 24 45 20 50 20 Z" fill="none" stroke="white" strokeWidth={activeLayer === 'skin' ? "1.8" : "0.5"} strokeOpacity={activeLayer === 'skin' ? "1" : "0.3"} className="transition-all" />
                  <path d="M35 50 Q45 42 50 42 Q55 42 65 50 L68 75 C68 80 62 85 50 85 C38 85 32 80 32 75 Z" fill="none" stroke="white" strokeWidth={activeLayer === 'skin' ? "1.8" : "0.5"} strokeOpacity={activeLayer === 'skin' ? "1" : "0.3"} className="transition-all" strokeLinecap="round" />

                  {/* Muscle system lines */}
                  <path d="M38 52 C45 46 50 46 62 52 M40 65 L 60 65 M 50 42 L 50 82" fill="none" stroke="#2563EB" strokeWidth={activeLayer === 'muscles' ? "1.8" : "0.5"} strokeOpacity={activeLayer === 'muscles' ? "1" : "0.1"} className="transition-all" />

                  {/* Skeletal ribs/bones */}
                  <path d="M50 45 L50 78 M42 48 L48 50 M58 48 L52 50 M41 54 L48 55 M59 54 L52 55 M42 60 L48 61 M58 60 L52 61" fill="none" stroke="#EA580C" strokeWidth={activeLayer === 'bones' ? "1.8" : "0.5"} strokeOpacity={activeLayer === 'bones' ? "1" : "0.15"} className="transition-all" />

                  {/* Neon pulsing Heart */}
                  <path d="M50 51 C49 49 46 49 46 51 C46 53 50 56 50 56 C50 56 54 53 54 51 C54 49 51 49 50 51 Z" fill={activeLayer === 'heart' ? "#EF4444" : "none"} stroke="#EF4444" strokeWidth={activeLayer === 'heart' ? "2" : "0.5"} strokeOpacity={activeLayer === 'heart' ? "1" : "0.2"} className="transition-all origin-center scale-[1.3]" style={{ transform: activeLayer === 'heart' ? 'scale(1.2)' : 'scale(1)', transformOrigin: '50px 52px' }} />

                  {/* Nervous system branching lines */}
                  <path d="M50 25 C44 26 43 32 46 38 M50 25 C56 26 57 32 54 38 M45 43 Q 30 44 28 55 M55 43 Q 70 44 72 55 M40 70 C 25 72 20 82 18 90 M60 70 C 75 72 80 82 82 90" fill="none" stroke="#10B981" strokeWidth={activeLayer === 'nervousSystem' ? "1.5" : "0.4"} strokeOpacity={activeLayer === 'nervousSystem' ? "1" : "0.1"} className="transition-all" />
                </svg>
              </div>

              {/* Layer Toggles */}
              <div className="w-full space-y-2 mt-4">
                {layerInfo.map(layer => {
                  const Icon = layer.icon;
                  const isCur = activeLayer === layer.id;
                  return (
                    <button
                      key={layer.id}
                      onClick={() => setActiveLayer(layer.id)}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border text-left flex items-center justify-between text-xs transition-all",
                        isCur 
                          ? "bg-white/10 text-white font-bold tracking-wide border-[#F27D26]/40 shadow-lg"
                          : "bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={cn("w-4 h-4", layer.color)} />
                        <span>{layer.label}</span>
                      </div>
                      <div className={cn("w-1.5 h-1.5 rounded-full", isCur ? "bg-[#F27D26]" : "bg-white/10")} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Layer Narration & Metrics */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* active layer narrative panel */}
            <div className="forge-card p-8 bg-white/[0.01]/70 min-h-[280px] flex flex-col">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
                {React.createElement(layerInfo.find(l => l.id === activeLayer)!.icon, {
                  className: cn("w-5 h-5", layerInfo.find(l => l.id === activeLayer)!.color)
                })}
                <h3 className="text-lg font-serif italic text-white font-medium">
                  {layerInfo.find(l => l.id === activeLayer)!.label} Segment
                </h3>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap italic">
                "{xray[activeLayer]}"
              </p>
            </div>

            {/* Diagnostic Metrics Display */}
            <div className="forge-card p-8">
              <h4 className="text-[10px] uppercase tracking-widest text-[#F27D26] font-bold mb-6">Diagnostic Psychological Metrics</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Mask Density */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-medium">Mask Density</span>
                    <span className="font-mono text-purple-400 font-bold">{xray.metrics.maskDensity}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-purple-500 h-full rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${xray.metrics.maskDensity}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-gray-500">Thickness of external facade and defense layers.</p>
                </div>

                {/* Ego Stability */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-medium">Ego Stability</span>
                    <span className="font-mono text-[#F27D26] font-bold">{xray.metrics.egoStability}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#F27D26] h-full rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${xray.metrics.egoStability}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-gray-500">Conscious resolve and logical mental defense threshold.</p>
                </div>

                {/* Vulnerability Quotient */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-medium">Vulnerability Quotient</span>
                    <span className="font-mono text-red-400 font-bold">{xray.metrics.vulnerabilityQuotient}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-red-500 h-full rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${xray.metrics.vulnerabilityQuotient}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-gray-500">Risk frequency of emotional shatter under duress.</p>
                </div>

                {/* Empathic Resonance */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-medium">Empathic Resonance</span>
                    <span className="font-mono text-emerald-400 font-bold">{xray.metrics.empathicResonance}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${xray.metrics.empathicResonance}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-gray-500">Inherent capabilities to bond or experience true connection.</p>
                </div>
              </div>
            </div>

            {/* Drama Catalysts / Writing Prompts */}
            <div className="forge-card p-8 bg-[#EF4444]/[0.01] border-[#EF4444]/10 rounded-3xl">
              <div className="flex items-center gap-2 mb-6">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <h4 className="text-[10px] uppercase tracking-widest text-red-400 font-bold">Psychological Drama Catalysts</h4>
              </div>

              <div className="space-y-4">
                {xray.writingPrompts.map((prompt, index) => (
                  <div 
                    key={index}
                    className="p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:border-red-500/20 transition-all group/prompt flex items-start gap-3 justify-between"
                  >
                    <div className="flex items-start gap-3 max-w-[90%]">
                      <span className="text-xs font-mono text-gray-500 mt-0.5">{index + 1}.</span>
                      <p className="text-xs text-gray-300 leading-relaxed italic select-all">
                        "{prompt}"
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(prompt, index)}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                      title="Copy Prompt"
                    >
                      {copiedPromptIndex === index ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

interface CharacterSheetGeneratorProps {
  character: Character;
  onClose: () => void;
}

function CharacterSheetGenerator({ character, onClose }: CharacterSheetGeneratorProps) {
  const settings = useSettings();
  const characters = useLibrary((s) => s.characters);
  const setKey = useLibrary((s) => s.set);
  
  const [style, setStyle] = useState<"photorealistic" | "anime" | "3d-render" | "comic-book">("photorealistic");
  const [customPrompt, setCustomPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(character.characterSheetUrl || null);

  const provider = settings.providers.find((p) => p.id === settings.activeImageProviderId)!;

  async function generate() {
    setBusy(true);
    setResult(null);
    try {
      const appearance = characterPrompt(character);
      const styleDesc = 
        style === "photorealistic" ? "highly detailed photorealistic portrait photo" :
        style === "anime" ? "detailed anime digital painting style, clean linework" :
        style === "3d-render" ? "3D Pixar Disney style digital render, octane render" :
        "vibrant comic book concept art style";

      const prompt = `A detailed character sheet of a consistent character: ${character.name}, ${appearance}. ${styleDesc}. Showing the character in multiple panel layout views: front view, side profile view, and back view. Clean solid white background, model sheet, turnaround, visual concept art keyframe. ${customPrompt}`;

      // Use the active provider with the fallback mechanism
      const url = await generateImage({
        provider,
        prompt,
        width: 1280,
        height: 720,
        model: provider.selectedModel || provider.models[0] || "flux",
        image: character.refImages[0] || undefined // Use first ref image if available as reference anchor
      });
      
      setResult(url);
    } catch (e: any) {
      alert("Failed to generate character sheet: " + e.message);
    }
    setBusy(false);
  }

  function handleSave() {
    if (!result) return;
    const updated = characters.map(c => 
      c.id === character.id 
        ? { ...c, characterSheetUrl: result, updatedAt: Date.now() } 
        : c
    );
    setKey("characters", updated);
    alert("Character sheet successfully linked and saved!");
    onClose();
  }

  function handleClear() {
    const updated = characters.map(c => 
      c.id === character.id 
        ? { ...c, characterSheetUrl: undefined, updatedAt: Date.now() } 
        : c
    );
    setKey("characters", updated);
    setResult(null);
    alert("Character sheet unlinked.");
  }

  return (
    <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
      <div className="bg-surface2/30 border border-border/40 p-4 rounded-xl space-y-3">
        <h3 className="font-bold text-sm text-text">Generate Consistency Anchor Sheet</h3>
        <p className="text-[11px] text-muted leading-relaxed">
          Generates a multi-panel reference sheet (front, side, back view) based on the character's physical details. You can import this sheet in Image/Video gear to anchor consistency.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Sheet Style">
            <select className="input text-xs" value={style} onChange={(e: any) => setStyle(e.target.value)}>
              <option value="photorealistic">Photorealistic Cinematic</option>
              <option value="anime">Anime / Manga Digital Art</option>
              <option value="3d-render">3D Pixar/Disney Render</option>
              <option value="comic-book">Comic Book Art</option>
            </select>
          </Field>
          <Field label="Custom Modifiers (Optional)">
            <input 
              className="input text-xs" 
              value={customPrompt} 
              onChange={(e) => setCustomPrompt(e.target.value)} 
              placeholder="e.g. wearing blue jacket, simple background..."
            />
          </Field>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          {result && (
            <button className="btn-ghost text-xs text-rose-400" onClick={handleClear} disabled={busy}>
              Remove Sheet
            </button>
          )}
          <button className="btn-ghost text-xs" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn-primary text-xs" onClick={generate} disabled={busy}>
            {busy ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <Sparkles size={13} className="mr-1.5" />}
            Generate Turnaround Sheet
          </button>
        </div>
      </div>

      {result && (
        <div className="card p-4 space-y-3 border border-border">
          <h4 className="font-semibold text-xs text-text">Generated Model Sheet Turnaround</h4>
          <div className="aspect-[16/9] bg-black rounded-lg overflow-hidden border border-border">
            <img src={result} className="w-full h-full object-contain" alt="Character Sheet" />
          </div>
          <div className="flex gap-2 justify-between">
            <a className="btn-outline text-xs" href={result} download={`${character.name || "character"}_sheet.png`} target="_blank">
              <Download size={13} className="mr-1.5" /> Download Image
            </a>
            {result !== character.characterSheetUrl && (
              <button className="btn-primary text-xs" onClick={handleSave}>
                Save as Identity Anchor
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
