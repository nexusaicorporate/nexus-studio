"use client";
import { useRef, useState } from "react";
import Page from "@/components/Page";
import { useMounted, copy } from "@/components/ui";
import { useSettings } from "@/lib/store/settings";
import { newId } from "@/lib/store/library";
import { chat } from "@/lib/providers";
import type { ChatMessage } from "@/lib/types";
import { Send, Trash2, RefreshCw, Copy, Bot, User, Loader2, ScanSearch } from "lucide-react";
import Link from "next/link";
import PromptPicker, { useTaskSystemPrompt } from "@/components/PromptPicker";
import { useAuth } from "@/components/AuthProvider";
import { canUseChat } from "@/lib/entitlements";
import UpgradePrompt from "@/components/UpgradePrompt";
import { PromptDirector } from "@/components/prompt-director/PromptDirector";

export default function ChatPage() {
  const mounted = useMounted();
  const settings = useSettings();
  const provider = settings.providers.find((p) => p.id === settings.activeProviderId) || settings.providers[0];
  const { plan } = useAuth();
  const model = provider?.selectedModel || provider?.models?.[0] || "openai";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(""); const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const taskSystem = useTaskSystemPrompt("chat", "T2T");

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: newId(), role: "user", content: input };
    const next = [...messages, userMsg]; setMessages(next); setInput(""); setBusy(true);
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
  const allowed = canUseChat(plan, provider?.kind, provider?.baseUrl);
  return (
    <div className="flex h-[calc(100vh-72px)] gap-4 p-4">
      {/* Chat Section - 80% */}
      <div className="flex-1 flex flex-col gap-3">
        <div className="flex items-center justify-between px-4 py-3 bg-surface border border-border rounded-xl">
          <div className="flex flex-col">
            <div className="text-sm font-semibold">{provider?.name}</div>
            <div className="text-xs text-muted">{model}</div>
          </div>
          <div className="flex gap-2">
            <Link href="/analyze" className="btn-ghost p-2" title="Analyze image"><ScanSearch size={16} /></Link>
            <button className="btn-ghost p-2" onClick={() => setMessages([])} title="New chat"><Trash2 size={16} /></button>
          </div>
        </div>

        <div className="card flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (<div className="h-full grid place-items-center text-center text-muted"><div><Bot size={40} className="mx-auto mb-3 opacity-50" /><p className="max-w-md">Chat with your active text model and system prompt from Settings. Built-in and local/uncensored endpoints fully supported.</p></div></div>)}
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${m.role === "user" ? "bg-primary text-primary-fg" : "bg-surface2"}`}>{m.role === "user" ? <User size={16} /> : <Bot size={16} />}</div>
                <div className={`max-w-[78%] ${m.role === "user" ? "items-end" : ""}`}>
                  <div className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-fg" : "bg-surface2"}`}>{m.content || (busy ? <RefreshCw size={14} className="animate-spin" /> : "")}</div>
                  {m.role === "assistant" && m.content && (<div className="flex gap-1 mt-1"><button className="btn-ghost px-2 py-0.5 text-xs" onClick={() => copy(m.content)}><Copy size={12} /> Copy</button></div>)}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {!allowed ? (
            <div className="p-4 bg-surface2 border-t border-border">
              <UpgradePrompt title="Paid Model Selected" message={`${provider?.name} is an external paid API. Chat with the built-in or local providers is free, or upgrade to use paid API models.`} planNeeded="Pro" inline />
            </div>
          ) : (
            <form className="p-3 bg-surface2 border-t border-border" onSubmit={send}>
              <div className="flex gap-2 items-end">
                <PromptDirector onInsert={(txt) => setInput((v) => (v ? v + " " + txt : txt))} />
                <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} className="input flex-1 max-h-24 min-h-[42px] py-2.5 resize-none" placeholder="Type your message..." disabled={busy} rows={1} />
                <button type="submit" disabled={busy || !input.trim()} className="btn-primary p-3 shrink-0 h-[42px]">{busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}</button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Prompts Sidebar - 20% */}
      <div className="w-1/5 flex flex-col gap-3">
        <div className="px-4 py-3 bg-surface border border-border rounded-xl">
          <div className="text-sm font-semibold">System Prompt</div>
          <div className="text-xs text-muted mt-1">Currently active</div>
        </div>
        <PromptPicker taskKey="chat" label="System prompt" />
      </div>
    </div>
  );
}
