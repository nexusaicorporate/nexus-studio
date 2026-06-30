"use client";
import Page from "@/components/Page";
import { useMounted } from "@/components/ui";
import {
  MessageSquare,
  Image as ImageIcon,
  Clapperboard,
  User,
  ScanSearch,
  BookOpen,
  Sparkles
} from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const mounted = useMounted();

  if (!mounted) return null;

  const cards = [
    {
      href: "/chat",
      title: "Chat Gear",
      desc: "Interactive multi-model conversational assistant for prompt engineering and text generation.",
      icon: MessageSquare,
      image: "/images/chat_gear.png",
      colorClass: "text-sky-400 bg-sky-500/10 border-sky-500/20 hover:shadow-[0_0_20px_rgba(56,189,248,0.2)]"
    },
    {
      href: "/studio/image",
      title: "Image Gear",
      desc: "Generate stunning high-fidelity illustrations, concept art, and realistic images via SDXL & Flux.",
      icon: ImageIcon,
      image: "/images/image_gear.png",
      colorClass: "text-violet-400 bg-violet-500/10 border-violet-500/20 hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]"
    },
    {
      href: "/studio/video",
      title: "Video Gear",
      desc: "Produce cinematic clips and fluid motion dynamics from textual descriptions or initial images.",
      icon: Clapperboard,
      image: "/images/video_gear.png",
      colorClass: "text-lime-400 bg-lime-500/10 border-lime-500/20 hover:shadow-[0_0_20px_rgba(132,204,22,0.2)]"
    },
    {
      href: "/studio/character",
      title: "Character Gear",
      desc: "Design persistent characters and generate turnaround reference sheets for locked-identity consistency.",
      icon: User,
      image: "/images/character_gear.jpg",
      colorClass: "text-orange-400 bg-orange-500/10 border-orange-500/20 hover:shadow-[0_0_20px_rgba(249,115,22,0.2)]"
    },
    {
      href: "/analyze",
      title: "Analyze Gear",
      desc: "Inspect, caption, and extract detailed attributes from input image and video attachments.",
      icon: ScanSearch,
      image: "/images/analyze_gear.png",
      colorClass: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]"
    },
    {
      href: "/library/prompts",
      title: "Prompts Gear",
      desc: "Browse, manage, and execute curated library prompts and prompt elements across all workspace tasks.",
      icon: BookOpen,
      image: "/images/library_gear.png",
      colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]"
    }
  ];

  return (
    <Page title="NexusAIGear Studio" subtitle="Multi-model AI · Prompt engineering · Image and video generation">
      <div className="flex flex-col items-center justify-center py-6">
        {/* Animated Brand Header */}
        <div className="text-center max-w-2xl mb-12 relative flex flex-col items-center">
          <img src="/images/nexusai_logo_glow.png" className="h-16 object-contain mb-6" alt="NexusAIGear" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-4 animate-pulse">
            <Sparkles size={13} /> Welcome to the Future of Creative AI
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-sky-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent mb-4 leading-tight">
            NexusAIGear Studio
          </h1>
          <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
            Harness local and cloud-based models to orchestrate advanced text, character sheets, images, and video workflows.
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl px-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.href}
                href={c.href}
                className={`card p-6 flex flex-col items-center text-center transition-all duration-300 transform hover:-translate-y-1 hover:border-transparent ${c.colorClass}`}
              >
                <div className="w-14 h-14 rounded-2xl bg-surface2 border border-border flex items-center justify-center mb-4 shadow-sm overflow-hidden">
                  {c.image ? (
                    <img src={c.image} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <Icon size={28} />
                  )}
                </div>
                <h3 className="font-bold text-lg text-primary mb-2">{c.title}</h3>
                <p className="text-xs text-muted leading-relaxed flex-1">{c.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </Page>
  );
}
