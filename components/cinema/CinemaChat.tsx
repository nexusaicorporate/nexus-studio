"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Play } from "lucide-react";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

export function CinemaChat() {
    const [messages, setMessages] = useState<Message[]>([
        { 
            id: "1", 
            role: "assistant", 
            content: "Hi! I'm your Director-AI assistant. Tell me what kind of video you want to make, and I'll build the MasterJSON timeline for you. (e.g. 'Make a 15-second cinematic drone intro with a neon cyberpunk theme.')" 
        }
    ]);
    const [input, setInput] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isGenerating) return;
        
        const userMsg = input.trim();
        setInput("");
        setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: userMsg }]);
        setIsGenerating(true);

        // Simulate API call to LMRouter -> Director-AI
        setTimeout(() => {
            setMessages(prev => [...prev, { 
                id: (Date.now() + 1).toString(), 
                role: "assistant", 
                content: "I've drafted a MasterJSON payload for your request. The timeline has been updated in the workstation above! You can review the asset placements and click 'Render' when ready." 
            }]);
            setIsGenerating(false);
        }, 2000);
    };

    return (
        <div className="flex flex-col h-full bg-[#121212] border-t border-white/10 rounded-b-xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="px-4 py-2 border-b border-white/5 bg-[#181818] flex items-center gap-2">
                <Bot className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-white/60 tracking-widest uppercase">Director Assistant</span>
            </div>

            {/* Chat History */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth max-h-[300px]"
            >
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center shrink-0 border border-amber-400/30">
                                <Bot className="w-4 h-4 text-amber-400" />
                            </div>
                        )}
                        
                        <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-sm leading-relaxed ${
                            msg.role === 'user' 
                                ? 'bg-amber-400 text-black font-medium rounded-tr-sm' 
                                : 'bg-[#1e1e1e] border border-white/10 text-white/90 rounded-tl-sm'
                        }`}>
                            {msg.content}
                        </div>

                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                                <User className="w-4 h-4 text-white/60" />
                            </div>
                        )}
                    </div>
                ))}
                
                {isGenerating && (
                    <div className="flex gap-3 justify-start items-center text-white/50">
                        <div className="w-8 h-8 rounded-full bg-amber-400/10 flex items-center justify-center shrink-0 border border-amber-400/20">
                            <Bot className="w-4 h-4 text-amber-400 opacity-50" />
                        </div>
                        <div className="flex gap-1 items-center bg-[#1e1e1e] px-4 py-3 rounded-2xl rounded-tl-sm border border-white/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-[#181818]">
                <div className="relative flex items-center">
                    <input 
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Describe the video timeline you want to orchestrate..."
                        className="w-full pl-4 pr-24 bg-[#242424] border border-white/10 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30 h-12 rounded-xl text-sm text-white placeholder-white/30 transition-all"
                    />
                    <div className="absolute right-2 flex items-center gap-1">
                        <button 
                            className="p-1.5 text-white/40 hover:text-amber-400 transition-colors disabled:opacity-50"
                            disabled={isGenerating || !input.trim()}
                            onClick={handleSend}
                            title="Send Instructions"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                        <div className="w-px h-4 bg-white/10 mx-1" />
                        <button 
                            className="p-1.5 flex items-center gap-1.5 text-xs font-semibold bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 transition-colors rounded-lg px-2"
                            title="Render Timeline"
                        >
                            <Play className="w-3.5 h-3.5 fill-amber-400" /> Render
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
