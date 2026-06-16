"use client";
import { useRef, useState } from "react";
import Page from "@/components/Page";
import { useMounted, copy } from "@/components/ui";
import { useSettings } from "@/lib/store/settings";
import { newId } from "@/lib/store/library";
import { chat } from "@/lib/providers";
import type { ChatMessage } from "@/lib/types";
import { Send, ImagePlus, Trash2, RefreshCw, Copy, Bot, User } from "lucide-react";
import PromptPicker, { useTaskSystemPrompt } from "@/components/PromptPicker";
import PromptDirector from "@/components/PromptDirector";

export default function ChatPage() {
  const mounted = useMounted();
  const settings = useSettings();
  const provider = settings.providers.find((p) => p.id === settings.activeProviderId)!;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(""); const [images, setImages] = useState<string[]>([]); const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const taskSystem = useTaskSystemPrompt("chat", images.length ? "I2T" : "T2T");
  function addImage(e: React.ChangeEvent<HTMLInputElement>) { const files = Array.from(e.target.files || []); files.forEach((f) => { const r = new FileReader(); r.onload = () => setImages((x) => [...x, r.result as string]); r.readAsDataURL(f); }); e.target.value = ""; }
  async function send() {
    if (!input.trim() && images.length === 0) return;
    const userMsg: ChatMessage = { id: newId(), role: "user", content: input || "Analyze the image(s).", images: images.length ? images : undefined };
    const next = [...messages, userMsg]; setMessages(next); setInput(""); setImages([]); setBusy(true);
    const model = provider.selectedModel || provider.models[0] || "openai";
    const placeholder: ChatMessage = { id: newId(), role: "assistant", content: "", model };
    setMessages([...next, placeholder]);
    
    let responseText = "";
    try {
      await chat({
        provider,
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
  return (
    <Page title="Chat & Analyze" subtitle={`${provider?.name} · ${provider?.selectedModel || provider?.models[0] || "no model"} · system prompt active`} actions={<><PromptPicker taskKey="chat" label="Analysis prompt" /><button className="btn-outline" onClick={() => setMessages([])}><Trash2 size={15} /> New chat</button></>}>
      <div className="card flex flex-col h-[calc(100vh-180px)]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (<div className="h-full grid place-items-center text-center text-muted"><div><Bot size={40} className="mx-auto mb-3 opacity-50" /><p className="max-w-md">Upload an image to caption or analyze it, or just chat. Uses your active provider, model and system prompt from Settings. Local/uncensored endpoints fully supported.</p></div></div>)}
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${m.role === "user" ? "bg-primary text-primary-fg" : "bg-surface2"}`}>{m.role === "user" ? <User size={16} /> : <Bot size={16} />}</div>
              <div className={`max-w-[78%] ${m.role === "user" ? "items-end" : ""}`}>
                {m.images && <div className="flex gap-2 mb-2 flex-wrap">{m.images.map((img, i) => <img key={i} src={img} className="w-24 h-24 rounded-lg object-cover border border-border" alt="" />)}</div>}
                <div className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-fg" : "bg-surface2"}`}>{m.content || (busy ? <RefreshCw size={14} className="animate-spin" /> : "")}</div>
                {m.role === "assistant" && m.content && (<div className="flex gap-1 mt-1"><button className="btn-ghost px-2 py-0.5 text-xs" onClick={() => copy(m.content)}><Copy size={12} /> Copy</button></div>)}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="border-t border-border p-3">
          {images.length > 0 && (<div className="flex gap-2 mb-2 flex-wrap">{images.map((img, i) => (<div key={i} className="relative w-14 h-14"><img src={img} className="w-full h-full rounded-lg object-cover" alt="" /><button className="absolute -top-1 -right-1 bg-black/70 rounded-full w-4 h-4 text-[10px]" onClick={() => setImages(images.filter((_, j) => j !== i))}>✕</button></div>))}</div>)}
          <div className="flex items-end gap-2">
            <label className="btn-ghost cursor-pointer h-10"><ImagePlus size={17} /><input type="file" accept="image/*" multiple hidden onChange={addImage} /></label>
            <PromptDirector onInsert={(txt) => setInput((v) => (v ? v + " " + txt : txt))} />
            <textarea className="input flex-1 min-h-[44px] max-h-40 resize-none" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Type a message or analyze an image… (Enter to send)" />
            <button className="btn-primary h-10" onClick={send} disabled={busy}>{busy ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}</button>
          </div>
        </div>
      </div>
    </Page>
  );
}
