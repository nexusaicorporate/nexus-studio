"use client";
import { useRef, useState } from "react";
import Page from "@/components/Page";
import { useMounted, copy } from "@/components/ui";
import { useSettings } from "@/lib/store/settings";
import { newId } from "@/lib/store/library";
import { chat } from "@/lib/providers";
import type { ChatMessage } from "@/lib/types";
import { Send, ImagePlus, Trash2, RefreshCw, Copy, Bot, User, X, Loader2 } from "lucide-react";
import PromptPicker, { useTaskSystemPrompt } from "@/components/PromptPicker";
import { useAuth } from "@/components/AuthProvider";
import { canUseModel } from "@/lib/entitlements";
import UpgradePrompt from "@/components/UpgradePrompt";
import PromptDirector from "@/components/PromptDirector";

export default function ChatPage() {
  const mounted = useMounted();
  const settings = useSettings();
  const provider = settings.providers.find((p) => p.id === settings.activeProviderId)!;
  const { plan } = useAuth();
  const model = provider.selectedModel || provider.models[0] || "openai";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(""); const [attach, setAttach] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const taskSystem = useTaskSystemPrompt("chat", attach ? "I2T" : "T2T");
  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() && !attach) return;
    const userMsg: ChatMessage = { id: newId(), role: "user", content: input || "Analyze the image.", images: attach ? [attach] : undefined };
    const next = [...messages, userMsg]; setMessages(next); setInput(""); setAttach(null); setBusy(true);
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
    <Page title="Chat & Analyze" subtitle={`${provider?.name} · ${model} · system prompt active`} actions={<><PromptPicker taskKey="chat" label="Analysis prompt" /><button className="btn-outline" onClick={() => setMessages([])}><Trash2 size={15} /> New chat</button></>}>
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
        {!canUseModel(plan, model) ? (
          <div className="p-4 bg-surface2 border-t border-border">
            <UpgradePrompt title="Pro LLM Selected" message={`The ${model} model requires an active Pro subscription to chat.`} planNeeded="Pro" inline />
          </div>
        ) : (
          <form className="p-3 bg-surface2 border-t border-border relative" onSubmit={send}>
            {attach && (<div className="absolute bottom-[calc(100%+10px)] left-3 bg-surface border border-border p-2 rounded-lg flex items-center gap-3 shadow-lg max-w-sm"><img src={attach} className="w-12 h-12 object-cover rounded-md" alt="" /><div className="flex-1 min-w-0"><div className="text-xs font-semibold truncate">Attached Image</div><div className="text-[10px] text-muted">Ready for Vision analysis</div></div><button type="button" className="btn-ghost p-1.5" onClick={() => setAttach(null)}><X size={14} /></button></div>)}
            <div className="flex gap-2 items-end">
              <label className="btn-ghost p-3 shrink-0 cursor-pointer h-[42px]"><ImagePlus size={18} /><input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setAttach(r.result as string); r.readAsDataURL(f); } }} /></label>
              <PromptDirector onInsert={(txt) => setInput((v) => (v ? v + " " + txt : txt))} />
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} className="input flex-1 max-h-32 min-h-[42px] py-2.5 resize-none" placeholder={attach ? "Ask about this image..." : "Type your message..."} disabled={busy} rows={1} />
              <button type="submit" disabled={busy || (!input.trim() && !attach)} className="btn-primary p-3 shrink-0 h-[42px]">{busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}</button>
            </div>
          </form>
        )}
      </div>
    </Page>
  );
}
