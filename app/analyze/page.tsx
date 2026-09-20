"use client";

import { useRef, useState } from "react";
import Page from "@/components/Page";
import { useMounted, copy } from "@/components/ui";
import { useSettings } from "@/lib/store/settings";
import { newId } from "@/lib/store/library";
import { chat } from "@/lib/providers";
import type { ChatMessage } from "@/lib/types";
import { Send, ImagePlus, Trash2, RefreshCw, Copy, Bot, User, X, Loader2, Video } from "lucide-react";
import PromptPicker, { useTaskSystemPrompt } from "@/components/PromptPicker";
import { useAuth } from "@/components/AuthProvider";
import { canUseFeature } from "@/lib/entitlements";
import UpgradePrompt from "@/components/UpgradePrompt";

export default function AnalyzePage() {
  const mounted = useMounted();
  const settings = useSettings();
  const { plan } = useAuth();
  const model = "Nexus Cloud";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(""); 
  const [attach, setAttach] = useState<string | null>(null); 
  const [attachType, setAttachType] = useState<"image" | "video" | null>(null);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const taskSystem = useTaskSystemPrompt("analyze", "I2T");

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!attach) return; // analyze always needs an attachment
    
    const userMsg: ChatMessage = { 
      id: newId(), 
      role: "user", 
      content: input || `Analyze this ${attachType} in detail.`, 
      images: attachType === "image" ? [attach] : undefined,
      videos: attachType === "video" ? [attach] : undefined
    };
    
    const next = [...messages, userMsg]; 
    setMessages(next); 
    setInput(""); 
    setAttach(null); 
    setAttachType(null);
    setBusy(true);
    
    const placeholder: ChatMessage = { id: newId(), role: "assistant", content: "", model };
    setMessages([...next, placeholder]);

    let responseText = "";
    try {
      await chat({
        model,
        system: taskSystem,
        uncensored: settings.uncensored,
        messages: next,
        onChunk: (chunk) => {
          responseText += chunk;
          setMessages((m) => m.map((x) => (x.id === placeholder.id ? { ...x, content: responseText } : x)));
          endRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      });
    }
    catch (e: any) {
      setMessages((m) => m.map((x) => (x.id === placeholder.id ? { ...x, content: responseText + (responseText ? "\n\n" : "") + "⚠️ " + e.message } : x)));
    }
    setBusy(false);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  if (!mounted) return null;
  const allowed = canUseFeature(plan, "analyze");

  return (
    <Page 
      title="Analyze" 
      subtitle={`Image & Video analysis · ${model}`} 
      actions={
        <>
          <PromptPicker taskKey="analyze" label="Analysis prompt" />
          <button className="btn-outline" onClick={() => setMessages([])}><Trash2 size={15} /> Clear</button>
        </>
      }
    >
      {!allowed ? (
        <div className="max-w-md mx-auto mt-10">
          <UpgradePrompt title="Analyze is a Pro feature" message="Media analysis needs a vision/multimodal-capable model, which the free built-in text model can't run. Upgrade to Pro to analyze images and videos." planNeeded="Pro" />
        </div>
      ) : (
        <div className="card flex flex-col h-[calc(100vh-180px)]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="h-full grid place-items-center text-center text-muted">
                <div>
                  <Bot size={40} className="mx-auto mb-3 opacity-50" />
                  <p className="max-w-md">
                    Upload an image or video to caption or analyze it. Connections go through the Nexus Cloud backend (Settings → Comfy gear).
                  </p>
                </div>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${m.role === "user" ? "bg-primary text-primary-fg" : "bg-surface2"}`}>{m.role === "user" ? <User size={16} /> : <Bot size={16} />}</div>
                <div className={`max-w-[78%] ${m.role === "user" ? "items-end" : ""}`}>
                  {m.images && m.images.length > 0 && (
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {m.images.map((img, i) => <img key={i} src={img} className="w-32 h-32 rounded-lg object-cover border border-border" alt="" />)}
                    </div>
                  )}
                  {m.videos && m.videos.length > 0 && (
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {m.videos.map((vid, i) => <video key={i} src={vid} className="w-64 aspect-video rounded-lg object-cover border border-border" controls />)}
                    </div>
                  )}
                  <div className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-fg" : "bg-surface2"}`}>{m.content || (busy ? <RefreshCw size={14} className="animate-spin" /> : "")}</div>
                  {m.role === "assistant" && m.content && (<div className="flex gap-1 mt-1"><button className="btn-ghost px-2 py-0.5 text-xs" onClick={() => copy(m.content)}><Copy size={12} /> Copy</button></div>)}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          
          <form className="p-3 bg-surface2 border-t border-border relative" onSubmit={send}>
            {attach && (
              <div className="absolute bottom-[calc(100%+10px)] left-3 bg-surface border border-border p-2 rounded-lg flex items-center gap-3 shadow-lg max-w-sm">
                {attachType === "image" ? (
                  <img src={attach} className="w-12 h-12 object-cover rounded-md" alt="" />
                ) : (
                  <div className="w-12 h-12 bg-surface2 rounded-md flex items-center justify-center border border-border text-primary">
                    <Video size={20} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">Attached {attachType === "image" ? "Image" : "Video"}</div>
                  <div className="text-[10px] text-muted">Ready for analysis</div>
                </div>
                <button type="button" className="btn-ghost p-1.5" onClick={() => { setAttach(null); setAttachType(null); }}><X size={14} /></button>
              </div>
            )}
            
            <div className="flex gap-2 items-end">
              <label className="btn-ghost p-3 shrink-0 cursor-pointer h-[42px]">
                <ImagePlus size={18} />
                <input 
                  type="file" 
                  accept="image/*,video/*" 
                  hidden 
                  onChange={(e) => { 
                    const f = e.target.files?.[0]; 
                    if (f) { 
                      const isVid = f.type.startsWith("video/");
                      const r = new FileReader(); 
                      r.onload = () => {
                        setAttach(r.result as string);
                        setAttachType(isVid ? "video" : "image");
                      };
                      r.readAsDataURL(f); 
                    } 
                  }} 
                />
              </label>
              <textarea 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} 
                className="input flex-1 max-h-32 min-h-[42px] py-2.5 resize-none" 
                placeholder={attach ? `Ask about this ${attachType} (optional)...` : "Attach an image or video to analyze..."} 
                disabled={busy} 
                rows={1} 
              />
              <button type="submit" disabled={busy || !attach} className="btn-primary p-3 shrink-0 h-[42px]">
                {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </form>
        </div>
      )}
    </Page>
  );
}
