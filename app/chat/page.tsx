"use client";
import { useRef, useState, useMemo } from "react";
import { useMounted, copy, Toggle } from "@/components/ui";
import { useSettings } from "@/lib/store/settings";
import { newId, useLibrary } from "@/lib/store/library";
import { chat } from "@/lib/providers";
import type { ChatMessage, PromptItem } from "@/lib/types";
import { Send, Trash2, RefreshCw, Copy, Bot, User, Loader2, MessageSquare, Search, Plus, Paperclip, Wand2, ChevronDown, ChevronRight, Settings, Check, Wrench } from "lucide-react";
import Link from "next/link";

function modeColor(m: string) {
  if (m.includes("V")) return "bg-sky-500/20 text-sky-300 border border-sky-500/40";
  if (m.includes("I")) return "bg-orange-500/20 text-orange-300 border border-orange-500/40";
  return "bg-surface2 text-muted border border-border";
}

function ModeTags({ modes }: { modes?: string[] }) {
  if (!modes?.length) return null;
  return <span className="flex gap-1 flex-wrap">{modes.map((m) => <span key={m} className={`text-[9px] font-semibold px-1.5 py-[1px] rounded ${modeColor(m)}`}>{m}</span>)}</span>;
}

export default function ChatPage() {
  const mounted = useMounted();
  const settings = useSettings();
  const provider = settings.providers.find((p) => p.id === settings.activeProviderId) || settings.providers[0];
  const model = provider?.selectedModel || provider?.models?.[0] || "openai";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(""); 
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Sidebar state
  const [openSection, setOpenSection] = useState<string>("Configuration");
  const [promptQuery, setPromptQuery] = useState("");

  const prompts = useLibrary((s) => s.prompts);
  const { taskPrompts, autoSystemPrompt, setTaskPrompt, setAutoSystemPrompt, setActiveProvider } = useSettings();
  const selId = taskPrompts["chat"];

  const promptGroups = useMemo(() => {
    let list = prompts.filter((p) => 
      p.category.toLowerCase() === "analyze" || 
      (p.tags && p.tags.map(t => t.toLowerCase()).includes("analyze"))
    );
    if (promptQuery) list = list.filter((p) => (p.title + (p.subcategory || "")).toLowerCase().includes(promptQuery.toLowerCase()));
    const g: Record<string, PromptItem[]> = {};
    for (const p of list) (g[p.subcategory || "Other"] ||= []).push(p);
    return g;
  }, [prompts, promptQuery]);

  const activeSystemPrompt = useMemo(() => {
    if (autoSystemPrompt) {
      const auto = prompts.find((p) => 
        (p.category.toLowerCase() === "analyze" || (p.tags && p.tags.map(t => t.toLowerCase()).includes("analyze"))) 
        && p.modes?.includes("T2T") && p.body.trim()
      );
      if (auto) return auto.body;
    }
    const id = taskPrompts["chat"];
    if (id === "none") return "";
    const p = prompts.find((x) => x.id === id);
    if (p) return p.body;
    const glob = taskPrompts["global"];
    if (glob === "none") return "";
    return prompts.find((x) => x.id === glob)?.body || "";
  }, [prompts, taskPrompts, autoSystemPrompt]);

  async function send(e?: React.FormEvent, directInput?: string) {
    e?.preventDefault();
    const textToSend = directInput || input;
    if (!textToSend.trim()) return;
    const userMsg: ChatMessage = { id: newId(), role: "user", content: textToSend };
    const next = [...messages, userMsg]; setMessages(next); setInput(""); setBusy(true);
    const placeholder: ChatMessage = { id: newId(), role: "assistant", content: "", model };
    setMessages([...next, placeholder]);

    let responseText = "";
    try {
      await chat({
        provider,
        model,
        system: activeSystemPrompt,
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

  const suggestions = [
    "Transform a neon street clip into glossy...",
    "Keep the cliffside stance but add storm ...",
    "Preserve crowd flow while shifting the ..."
  ];

  const handleSuggestionClick = (text: string) => {
    send(undefined, text);
  };

  return (
    <div className="w-full h-screen flex bg-background overflow-hidden fade-in text-sm text-text">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative h-full">
        <div className="flex-1 overflow-y-auto px-6 py-6 pb-40">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-more relative top-[-10%]">
              <MessageSquare size={52} className="opacity-40 mb-5" />
              <div className="text-lg font-medium text-text mb-2">Start a conversation</div>
              <div className="text-sm">Upload images and send a message to begin</div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((m) => (
                <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${m.role === "user" ? "bg-primary text-primary-fg" : "bg-surface"}`}>{m.role === "user" ? <User size={16} /> : <Bot size={16} />}</div>
                  <div className={`max-w-[85%] ${m.role === "user" ? "items-end" : ""}`}>
                    <div className={`rounded-2xl px-4 py-2.5 whitespace-pre-wrap leading-relaxed ${m.role === "user" ? "bg-primary text-primary-fg" : "bg-surface"}`}>{m.content || (busy ? <RefreshCw size={14} className="animate-spin text-muted" /> : "")}</div>
                    {m.role === "assistant" && m.content && (<div className="flex gap-1 mt-1 justify-end"><button className="text-muted hover:text-text transition-colors p-1" onClick={() => copy(m.content)} title="Copy"><Copy size={13} /></button></div>)}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {/* Floating Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent pt-12">
          <div className="max-w-4xl mx-auto w-full">
            {messages.length === 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
                {suggestions.map((text, i) => (
                  <button key={i} onClick={() => handleSuggestionClick(text)} className="bg-surface/50 hover:bg-surface border border-border/50 rounded-full px-4 py-1.5 text-xs text-muted-more hover:text-text whitespace-nowrap transition-colors">
                    {text}
                  </button>
                ))}
              </div>
            )}
            
            <form onSubmit={(e) => send(e)} className="flex items-center gap-2 bg-surface border border-border rounded-full p-1.5 shadow-xl">
              <div className="flex gap-1 pl-2">
                <button type="button" className="p-2 text-muted hover:text-text hover:bg-surface2 rounded-full transition-colors" title="Add File">
                  <Plus size={18} />
                </button>
                <button type="button" className="p-2 text-muted hover:text-text hover:bg-surface2 rounded-full transition-colors" title="Attach">
                  <Paperclip size={18} />
                </button>
                <button type="button" className="p-2 text-muted hover:text-text hover:bg-surface2 rounded-full transition-colors" title="Magic Tools">
                  <Wand2 size={18} />
                </button>
              </div>
              
              <input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                className="flex-1 bg-transparent border-none outline-none text-sm px-2 text-text placeholder-muted"
                placeholder="Type a message..." 
                disabled={busy}
              />
              
              <button 
                type="submit" 
                disabled={busy || !input.trim()} 
                className={`p-2.5 rounded-full mr-1 transition-all ${busy || !input.trim() ? "bg-surface2 text-muted" : "bg-primary text-primary-fg hover:bg-primary-light"}`}
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="translate-x-[1px]" />}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-[320px] shrink-0 bg-[#1e1a29] border-l border-border/40 flex flex-col h-full overflow-y-auto scrollbar-thin">
        
        {/* Accordions */}
        <div className="border-b border-border/20">
          <button 
            className="w-full flex items-center justify-between p-4 text-sm font-medium hover:bg-surface/30 transition-colors"
            onClick={() => setOpenSection(openSection === "Workspace" ? "" : "Workspace")}
          >
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-primary-light" />
              Workspace
            </div>
            {openSection === "Workspace" ? <ChevronDown size={16} className="text-muted" /> : <ChevronRight size={16} className="text-muted" />}
          </button>
          {openSection === "Workspace" && (
            <div className="p-4 text-xs text-muted bg-black/10 border-t border-border/10">
              Workspace settings coming soon.
            </div>
          )}
        </div>

        <div className="border-b border-border/20">
          <button 
            className="w-full flex items-center justify-between p-4 text-sm font-medium hover:bg-surface/30 transition-colors"
            onClick={() => setOpenSection(openSection === "Conversations" ? "" : "Conversations")}
          >
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-muted-more" />
              Conversations
            </div>
            {openSection === "Conversations" ? <ChevronDown size={16} className="text-muted" /> : <ChevronRight size={16} className="text-muted" />}
          </button>
          {openSection === "Conversations" && (
            <div className="p-4 text-xs text-muted bg-black/10 border-t border-border/10">
              Chat history coming soon.
            </div>
          )}
        </div>

        <div className="border-b border-border/20">
          <button 
            className="w-full flex items-center justify-between p-4 text-sm font-medium hover:bg-surface/30 transition-colors"
            onClick={() => setOpenSection(openSection === "Configuration" ? "" : "Configuration")}
          >
            <div className="flex items-center gap-2 text-primary-light font-semibold">
              <Settings size={16} />
              Configuration
            </div>
            {openSection === "Configuration" ? <ChevronDown size={16} className="text-primary-light" /> : <ChevronRight size={16} className="text-muted" />}
          </button>
          
          {openSection === "Configuration" && (
            <div className="p-5 flex flex-col gap-6 bg-black/20 border-t border-border/10">
              
              {/* System Prompts Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold">Auto Analyze Prompt</div>
                    <div className="text-[10px] text-muted">Picks prompt by output type</div>
                  </div>
                  <Toggle checked={autoSystemPrompt} onChange={setAutoSystemPrompt} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold">Analyze Prompt</div>
                    <Wrench size={12} className="text-primary-light" />
                  </div>
                  
                  <div className="relative mb-3">
                    <Search size={14} className="absolute left-2.5 top-2 text-muted" />
                    <input 
                      className="w-full bg-surface/50 border border-border/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-text placeholder-muted focus:outline-none focus:border-primary/50" 
                      placeholder="Search analyze prompts..." 
                      value={promptQuery} 
                      onChange={(e) => setPromptQuery(e.target.value)} 
                    />
                  </div>

                  <div className="max-h-[300px] overflow-y-auto space-y-4 pr-1 scrollbar-thin border border-border/30 rounded-lg p-3 bg-surface/20">
                    <button className="w-full flex items-center gap-2 text-left group" onClick={() => setTaskPrompt("chat", "none")}>
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${selId === "none" ? "border-primary" : "border-border/60 group-hover:border-primary/50"}`}>
                        {selId === "none" && <div className="w-1.5 h-1.5 bg-primary rounded-full" />}
                      </div>
                      <span className={`text-xs ${selId === "none" ? "text-text" : "text-muted"}`}>No Analyze Prompt</span>
                    </button>

                    {Object.keys(promptGroups).sort().map((sub) => (
                      <div key={sub}>
                        <div className="text-[10px] font-bold text-primary-light/80 mb-2">{sub}</div>
                        <div className="space-y-2.5">
                          {promptGroups[sub].map((p) => {
                            const active = selId === p.id;
                            return (
                              <button key={p.id} className="w-full flex items-center gap-2 text-left group" onClick={() => setTaskPrompt("chat", p.id)}>
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${active ? "border-primary" : "border-border/60 group-hover:border-primary/50"}`}>
                                  {active && <div className="w-1.5 h-1.5 bg-primary rounded-full" />}
                                </div>
                                <span className={`text-[11px] truncate flex-1 ${active ? "text-text" : "text-muted group-hover:text-text/80"}`}>{p.title}</span>
                                <ModeTags modes={p.modes} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {Object.keys(promptGroups).length === 0 && <div className="text-xs text-muted text-center py-4">No prompts found.</div>}
                  </div>
                </div>
              </div>

              {/* Provider & Model Section */}
              <div className="space-y-4 pt-4 border-t border-border/20">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-xs font-semibold">API Provider</div>
                    <Link href="/settings" className="text-[10px] text-primary-light flex items-center gap-1 hover:underline">
                      <Settings size={10} /> API Settings
                    </Link>
                  </div>
                  <select 
                    className="w-full bg-surface/50 border border-border/50 rounded-lg px-3 py-2 text-xs text-text appearance-none outline-none focus:border-primary/50"
                    value={settings.activeProviderId}
                    onChange={(e) => setActiveProvider(e.target.value)}
                  >
                    {settings.providers.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-xs font-semibold mb-1.5">Select Model(s)</div>
                  <button className="w-full bg-surface/80 hover:bg-surface border border-border/50 rounded-lg px-3 py-2 text-xs text-text flex items-center justify-center gap-1.5 transition-colors">
                    <RefreshCw size={12} className="text-muted" /> Fetch Models
                  </button>
                  <div className="mt-2 space-y-1 pl-1">
                     {provider?.models?.map(m => (
                       <div key={m} className="flex items-center gap-2 text-xs">
                         <div className="w-3.5 h-3.5 rounded bg-primary/20 flex items-center justify-center border border-primary/40 text-primary">
                           {provider.selectedModel === m && <Check size={10} />}
                         </div>
                         <span className={provider.selectedModel === m ? "text-text" : "text-muted"}>{m}</span>
                       </div>
                     ))}
                  </div>
                </div>
              </div>
              
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
