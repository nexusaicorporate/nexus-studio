"use client";

import { useState } from "react";
import Page from "@/components/Page";
import { Mic, Volume2, Play, Settings, Bot, Search, Loader2, Download, Check, PlaySquare, Music, SlidersHorizontal, Share2, Upload } from "lucide-react";

export default function AudioStudio() {
    const [inputText, setInputText] = useState("Hello, this is a cinematic audio generation test. The soundscapes are rich and immersive.");
    const [activeTab, setActiveTab] = useState<"tts" | "sfx" | "music" | "cloning">("tts");
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedVoice, setSelectedVoice] = useState("Antoni (Narration)");
    const [stability, setStability] = useState(50);
    const [similarity, setSimilarity] = useState(75);

    const [aiInput, setAiInput] = useState("");
    const [isAiGenerating, setIsAiGenerating] = useState(false);
    const [chatHistory, setChatHistory] = useState([
        { role: "assistant", content: "I'm your Audio AI Assistant. Describe the type of voice, sound effect, or music track you need, and I'll configure the parameters and draft the prompt for you." }
    ]);

    const handleAiSubmit = () => {
        if (!aiInput.trim()) return;
        setChatHistory(prev => [...prev, { role: "user", content: aiInput }]);
        setIsAiGenerating(true);
        setAiInput("");

        setTimeout(() => {
            setChatHistory(prev => [...prev, { role: "assistant", content: "I've drafted the script and selected the 'Deep Cinematic' voice profile. Check the workstation above and hit Generate!" }]);
            setInputText("In a world where artificial intelligence directs the narrative... one tool stands above the rest.");
            setSelectedVoice("Marcus (Deep Cinematic)");
            setStability(80);
            setSimilarity(90);
            setIsAiGenerating(false);
        }, 1500);
    };

    return (
        <Page title="Audio Gear" subtitle="Generate high-fidelity speech, sound effects, and cinematic soundtracks.">
            <div className="max-w-[1400px] mx-auto w-full h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 py-6">
                
                {/* Mode Selector */}
                <div className="flex bg-[#1a1a1a] p-1 rounded-xl w-fit border border-white/5 shadow-lg">
                    {(["tts", "sfx", "music", "cloning"] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === tab ? "bg-[#2c2c2c] text-white shadow-sm" : "text-white/50 hover:text-white/80 hover:bg-white/5"}`}
                        >
                            {tab === "tts" && <Mic size={16} />}
                            {tab === "sfx" && <Volume2 size={16} />}
                            {tab === "music" && <Music size={16} />}
                            {tab === "cloning" && <UserVoiceIcon size={16} />}
                            {tab === "tts" ? "Speech Synthesis" : tab === "sfx" ? "Sound Effects" : tab === "music" ? "Music Gen" : "Voice Cloning"}
                        </button>
                    ))}
                </div>

                <div className="flex gap-6 h-[500px]">
                    {/* Left Panel - Workstation */}
                    <div className="flex-1 bg-[#141414] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                        {/* Toolbar */}
                        <div className="h-14 border-b border-white/5 bg-[#1a1a1a] flex items-center justify-between px-6">
                            <div className="flex items-center gap-4">
                                <button className="flex items-center gap-2 text-sm font-semibold bg-white/5 hover:bg-white/10 px-4 py-1.5 rounded-lg border border-white/10 transition-colors">
                                    <div className="w-4 h-4 rounded-full bg-emerald-400"></div> {selectedVoice}
                                </button>
                                <button className="text-white/40 hover:text-white/80 transition-colors"><Settings size={16} /></button>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-mono text-white/30">142 chars / 0.05 credits</span>
                            </div>
                        </div>

                        {/* Editor Content */}
                        <div className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto">
                            {activeTab === "tts" ? (
                                <>
                                    <textarea
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        placeholder="Enter text to synthesize..."
                                        className="w-full flex-1 bg-transparent border-none outline-none resize-none text-xl leading-relaxed text-white/90 placeholder-white/20"
                                    />
        
                                    {/* Sliders (ElevenLabs Style) */}
                                    <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5 flex gap-8">
                                        <div className="flex-1">
                                            <div className="flex justify-between text-xs text-white/50 mb-2">
                                                <span>Stability</span> <span>{stability}%</span>
                                            </div>
                                            <input type="range" min="0" max="100" value={stability} onChange={(e) => setStability(Number(e.target.value))} className="w-full accent-emerald-400" />
                                            <div className="flex justify-between text-[10px] text-white/30 mt-1"><span>Variable</span><span>Stable</span></div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between text-xs text-white/50 mb-2">
                                                <span>Similarity Enhancement</span> <span>{similarity}%</span>
                                            </div>
                                            <input type="range" min="0" max="100" value={similarity} onChange={(e) => setSimilarity(Number(e.target.value))} className="w-full accent-emerald-400" />
                                            <div className="flex justify-between text-[10px] text-white/30 mt-1"><span>Low</span><span>High</span></div>
                                        </div>
                                    </div>
                                </>
                            ) : activeTab === "music" ? (
                                /* Suno-like Music Generation Studio */
                                <div className="flex-1 flex flex-col gap-5 animate-in fade-in">
                                    <div className="flex items-center justify-between bg-[#1a1a1a] p-1 rounded-xl border border-white/5 w-fit">
                                        <button className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-[#2c2c2c] text-white">Custom Mode</button>
                                        <button className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white/50 hover:text-white">Auto Mode</button>
                                    </div>
                                    
                                    <div className="flex flex-col gap-2 flex-1">
                                        <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Lyrics</label>
                                        <textarea
                                            placeholder="Write your own lyrics here, or click 'Make Random Lyrics'..."
                                            className="w-full flex-1 bg-[#1a1a1a] border border-white/10 rounded-xl p-4 text-sm resize-none focus:outline-none focus:border-emerald-400/50"
                                        />
                                        <button className="text-xs font-semibold text-emerald-400 self-end hover:text-emerald-300">Make Random Lyrics ✨</button>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Style of Music</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. acoustic pop, electronic synthwave"
                                                className="w-full bg-[#1a1a1a] border border-white/10 h-10 rounded-xl px-4 text-sm focus:outline-none focus:border-emerald-400/50"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Title</label>
                                            <input 
                                                type="text" 
                                                placeholder="My hit song"
                                                className="w-full bg-[#1a1a1a] border border-white/10 h-10 rounded-xl px-4 text-sm focus:outline-none focus:border-emerald-400/50"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 mt-2 bg-[#1a1a1a] border border-white/5 p-4 rounded-xl">
                                        <input type="checkbox" id="instrumental" className="w-4 h-4 accent-emerald-400" />
                                        <label htmlFor="instrumental" className="text-sm font-semibold text-white/80 cursor-pointer">Instrumental (No Vocals)</label>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-white/40 italic">
                                    {activeTab === "sfx" ? "Sound Effects Generator coming soon..." : "Voice Cloning Studio coming soon..."}
                                </div>
                            )}
                        </div>

                        {/* Footer Action */}
                        <div className="p-4 bg-[#1a1a1a] border-t border-white/5 flex items-center justify-between">
                            <button className="text-white/40 hover:text-white/80 flex items-center gap-2 text-sm"><SlidersHorizontal size={16} /> Advanced Settings</button>
                            <button 
                                onClick={() => setIsGenerating(!isGenerating)}
                                className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8 py-3 rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
                            >
                                {isGenerating ? <><Loader2 size={18} className="animate-spin" /> {activeTab === "music" ? "Generating Track..." : "Synthesizing..."}</> : <><Play size={18} className="fill-black" /> Generate</>}
                            </button>
                        </div>
                    </div>

                    {/* Right Panel - History & Player */}
                    <div className="w-[380px] flex flex-col gap-4">
                        <div className="flex-1 bg-[#141414] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                            <div className="p-4 border-b border-white/5 bg-[#1a1a1a] font-semibold text-sm flex items-center justify-between">
                                History
                                <Search size={14} className="text-white/40" />
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
                                {/* Dummy History Item */}
                                {activeTab === "music" ? (
                                    <div className="bg-[#1a1a1a] p-3 rounded-xl border border-white/5 hover:border-white/20 cursor-pointer group flex flex-col gap-2">
                                        <div className="flex gap-3">
                                            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                                <Music size={20} className="text-emerald-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <div className="text-xs font-semibold text-white truncate">Neon City Nights</div>
                                                    <div className="text-[10px] text-white/40 shrink-0">Just now</div>
                                                </div>
                                                <div className="text-[10px] text-emerald-400 truncate mt-0.5">Synthwave • Female Vocals</div>
                                                <div className="text-[10px] text-white/40 mt-1">3:14</div>
                                            </div>
                                        </div>
                                        {/* Mini Player */}
                                        <div className="bg-black/40 rounded-lg p-2 flex items-center gap-3">
                                            <button className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 hover:bg-emerald-500/30 transition-colors">
                                                <Play size={14} className="fill-emerald-400 ml-0.5" />
                                            </button>
                                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-400 w-1/3"></div>
                                            </div>
                                            <button className="text-white/40 hover:text-white transition-colors opacity-0 group-hover:opacity-100"><Download size={14}/></button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-[#1a1a1a] p-3 rounded-xl border border-white/5 hover:border-white/20 cursor-pointer group">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="text-xs font-semibold text-emerald-400">Antoni (Narration)</div>
                                            <div className="text-[10px] text-white/40">2 mins ago</div>
                                        </div>
                                        <div className="text-xs text-white/60 line-clamp-2 mb-3">Hello, this is a cinematic audio generation test. The soundscapes are rich and immersive.</div>
                                        
                                        {/* Mini Player */}
                                        <div className="bg-black/40 rounded-lg p-2 flex items-center gap-3">
                                            <button className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 hover:bg-emerald-500/30 transition-colors">
                                                <Play size={14} className="fill-emerald-400 ml-0.5" />
                                            </button>
                                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-400 w-1/3"></div>
                                            </div>
                                            <button className="text-white/40 hover:text-white transition-colors opacity-0 group-hover:opacity-100"><Download size={14}/></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Assistant Chat Bar (Below Workspace) */}
                <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                     <div className="px-4 py-2 border-b border-white/5 bg-[#181818] flex items-center gap-2">
                        <Bot className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-semibold text-white/60 tracking-widest uppercase">Audio Copilot</span>
                    </div>
                    
                    <div className="p-4 flex flex-col gap-3 max-h-[200px] overflow-y-auto scrollbar-thin">
                        {chatHistory.map((msg, i) => (
                            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && (
                                    <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center shrink-0 border border-emerald-400/30">
                                        <Bot className="w-4 h-4 text-emerald-400" />
                                    </div>
                                )}
                                <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-sm ${msg.role === 'user' ? 'bg-emerald-400 text-black font-medium rounded-tr-sm' : 'bg-[#1e1e1e] border border-white/10 text-white/90 rounded-tl-sm'}`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isAiGenerating && (
                            <div className="flex gap-3 justify-start items-center">
                                <div className="w-8 h-8 rounded-full bg-emerald-400/10 flex items-center justify-center shrink-0">
                                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="p-3 border-t border-white/5 bg-[#1a1a1a]">
                        <div className="relative">
                            <input 
                                value={aiInput}
                                onChange={(e) => setAiInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAiSubmit()}
                                placeholder="E.g. 'Give me an aggressive trailer voice reading an intro script for a sci-fi movie'"
                                className="w-full bg-[#242424] border border-white/10 h-10 rounded-xl px-4 text-sm focus:outline-none focus:border-emerald-400/50"
                            />
                        </div>
                    </div>
                </div>

            </div>
        </Page>
    );
}

function UserVoiceIcon({ size }: { size: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
        </svg>
    );
}
