"use client";
import Link from "next/link";
import { useMounted } from "@/components/ui";
import { WEB_MODE } from "@/lib/webmode";
import { useAuth } from "@/components/AuthProvider";
import { ArrowUpRight, Zap } from "lucide-react";

interface GearDef {
  href: string;
  label: string;
  desc: string;
  image: string;
  colorRgb: string;
}

const GEAR_GROUPS: { group: string; gears: GearDef[] }[] = [
  {
    group: "Workspace Gears",
    gears: [
      { href: "/chat", label: "Chat Gear", desc: "Multi-model conversational assistant for prompt engineering and text generation. Source data includes text transcripts, audio streams, and video files.", image: "/images/chat_gear.png", colorRgb: "56,189,248" },
      { href: "/bulk", label: "Bulk Gear", desc: "Batch-process dozens of prompts or images simultaneously across any provider.", image: "/images/bulk_gear.png", colorRgb: "52,211,153" },
    ],
  },
  {
    group: "Pro Gears",
    gears: [
      { href: "/analyze", label: "Analyze Gear", desc: "Inspect, caption, and extract detailed attributes from media and text, ensuring content integrity.", image: "/images/analyze_gear.png", colorRgb: "34,211,238" },
      { href: "/studio/image", label: "Image Gear", desc: "Generate high-fidelity illustrations, concept art, and images via SDXL & Flux.", image: "/images/image_gear.png", colorRgb: "167,139,250" },
      { href: "/studio/video", label: "Video Gear", desc: "Produce cinematic clips and fluid motion from text descriptions or images.", image: "/images/video_gear.png", colorRgb: "163,230,53" },
      { href: "/studio/character", label: "Character Gear", desc: "Design persistent characters and reference sheets for identity consistency.", image: "/images/character_gear.jpg", colorRgb: "251,146,60" },
    ],
  },
  {
    group: "Studio Gears",
    gears: [
      { href: "/studio/ugc", label: "UGC Ads Gear", desc: "Create scroll-stopping user-generated content and ad creatives at scale.", image: "/images/ugc_ads_gear.jpg", colorRgb: "236,72,153" },
      { href: "/studio/cinema", label: "Cinema Gear", desc: "Orchestrate full cinematic sequences with scene planning and storyboarding.", image: "/images/cinema_gear.jpg", colorRgb: "251,191,36" },
      { href: "/studio/workflow", label: "ComfyUI Gear", desc: "Build and run node-based ComfyUI workflows directly inside the platform.", image: "/images/comfyui_gear_vertical.png", colorRgb: "129,140,248" },
      { href: "/studio/comfy", label: "Comfy Hub Gear", desc: "Browse, install, and manage custom ComfyUI nodes and model packs.", image: "/images/comfy_hub_gear.png", colorRgb: "251,113,133" },
    ],
  },
  {
    group: "Library Gears",
    gears: [
      { href: "/library/assets", label: "Assets Gear", desc: "Manage and reuse uploaded or generated media across all your workflows.", image: "/images/image_gear.png", colorRgb: "244,63,94" },
      { href: "/library/prompts", label: "Prompts Gear", desc: "Browse, manage, and run curated prompts across all workspace tasks.", image: "/images/library_gear.png", colorRgb: "56,189,248" },
      { href: "/library/prompt-director", label: "Prompt Director Gear", desc: "Assemble dynamic prompt recipes from modular building blocks.", image: "/images/prompt_director_gear.jpg", colorRgb: "45,212,191" },
      { href: "/library/ingredients", label: "Ingredients Gear", desc: "Manage reusable LoRAs, styles, characters, and token banks for your prompts.", image: "/images/ingredients_gear.png", colorRgb: "192,132,252" },
    ],
  },
  {
    group: "System Gears",
    gears: [
      { href: "/settings", label: "Settings Gear", desc: "Configure providers, API KEYS, and global platform preferences, including themes and security.", image: "/images/settings_gear.png", colorRgb: "148,163,184" },
      { href: "/billing", label: "Billing Gear", desc: "Manage your Nexus Studio subscription, upgrade plans, and track your usage metrics.", image: "/images/comfyui_gear.png", colorRgb: "234,179,8" },
      { href: "/docs", label: "Docs Gear", desc: "Guides, tips, and reference docs for every feature in the platform.", image: "/images/docs_gear.png", colorRgb: "250,204,21" },
    ],
  },
];

export default function HomePage() {
  const mounted = useMounted();
  const { groups } = useAuth();
  if (!mounted) return null;

  const allGroups = GEAR_GROUPS;

  return (
    <>
      <style>{`
        /* ─── page shell ─── */
        .lp {
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 26px 28px 88px;
          position: relative;
          overflow: hidden;
          background-color: #0d1117;
        }

        /* circuit board background */
        .lp::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          background-image:
            linear-gradient(rgba(56,189,248,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,0.03) 1px, transparent 1px);
          background-size: 64px 64px;
          pointer-events: none;
        }

        .lp > * { position: relative; z-index: 1; }

        /* ─── hero ─── */
        .lp-hero {
          text-align: center;
          margin-bottom: 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .lp-logo {
          height: 52px;
          object-fit: contain;
          margin-bottom: 18px;
          filter: drop-shadow(0 0 18px rgba(56,189,248,0.35));
          animation: lp-bob 4s ease-in-out infinite;
        }
        @keyframes lp-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }

        .lp-title {
          font-size: clamp(34px, 5.5vw, 54px);
          font-weight: 900;
          letter-spacing: -0.03em;
          line-height: 1.05;
          margin-bottom: 12px;
          background: linear-gradient(120deg, #38bdf8 0%, #818cf8 45%, #a78bfa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .lp-sub {
          font-size: 14px;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        /* ─── section ─── */
        .lp-section {
          width: 100%;
          max-width: 1200px;
          margin-bottom: 20px;
        }

        /* ─── group headers ─── */
        .group-header {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 40px 0 20px 0;
          position: relative;
          text-align: center;
        }
        .group-line { 
          display: none; 
        }
        .group-badge {
          position: relative;
          color: #ffffff;
          font-size: 24px;
          font-weight: 900;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          background: transparent;
          border: none;
          box-shadow: none;
          padding: 0;
          margin: 0;
          text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
        }
        
        .group-badge::before { display: none; }
        
        .group-badge::after {
          content: "";
          position: absolute;
          bottom: -16px;
          left: 50%;
          transform: translateX(-50%);
          width: 80px;
          height: 4px;
          background: #00ffff;
          border-radius: 2px;
          box-shadow: 0 0 15px #00ffff, 0 0 30px rgba(0, 255, 255, 0.6);
        }

        /* ─── card grid ─── */
        .lp-grid {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 16px;
        }

        /* ─── card ─── */
        .lp-card {
          width: calc(25% - 12px);
          position: relative;
          display: flex;
          align-items: stretch;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          background: #141822; 
          text-decoration: none;
          cursor: pointer;
          min-height: 100px;
          overflow: hidden;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
        }

        @media (max-width: 1100px) { .lp-card { width: calc(33.333% - 11px); } }
        @media (max-width: 850px) { .lp-card { width: calc(50% - 8px); } }
        @media (max-width: 550px) { .lp-card { width: 100%; } }

        .lp-card:hover {
          transform: translateY(-2px);
          border-color: rgba(var(--rgb), 0.6);
          box-shadow: 0 6px 20px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(var(--rgb), 0.2);
        }

        /* ── body (left) ── */
        .lp-body {
          position: relative;
          z-index: 2;
          width: 55%;
          padding: 16px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          pointer-events: none; /* let clicks pass to card */
        }
        .lp-name {
          font-size: 13px;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .lp-desc {
          font-size: 10.5px;
          color: rgba(255,255,255,0.55);
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* ── image (right) ── */
        .lp-img-wrap {
          position: absolute;
          top: 0; right: 0; bottom: 0;
          width: 60%;
          z-index: 1;
        }
        .lp-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: right center;
          /* mask to fade the left edge seamlessly into the dark background */
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 40%);
          mask-image: linear-gradient(to right, transparent 0%, black 40%);
          transition: transform 0.4s ease, opacity 0.3s ease;
          opacity: 0.8;
        }
        .lp-card:hover .lp-img-wrap img {
          transform: scale(1.03);
          opacity: 1;
        }

        /* ── arrow (bottom right) ── */
        .lp-arrow {
          position: absolute;
          bottom: 12px;
          right: 12px;
          z-index: 3;
          color: rgba(var(--rgb), 0.8);
          transition: transform 0.2s ease, color 0.2s ease;
        }
        .lp-card:hover .lp-arrow {
          color: rgba(var(--rgb), 1);
          transform: translate(2px, -2px);
        }

      `}</style>

      <div className="lp">

        {/* ── Hero ── */}
        <div className="lp-hero">
          <img src="/images/nexusai_logo_glow.png" className="lp-logo" alt="NexusAIGear" />
          <h1 className="lp-title">NexusAIGear Studio</h1>
          <p className="lp-sub">Alternative Launchpad Concepts</p>
        </div>

        {/* ── Groups ── */}
        {allGroups.map((group) => (
          <section key={group.group} className="lp-section">

            {/* Divider */}
            <div className="group-header">
              <div className="group-line" />
              <div className="group-badge">{group.group}</div>
            </div>

            {/* Cards */}
            <div className="lp-grid">
              {group.gears.map((gear) => (
                <Link
                  key={gear.href}
                  href={gear.href}
                  className="lp-card"
                  style={{ ["--rgb" as string]: gear.colorRgb }}
                >
                  {/* Left: content */}
                  <div className="lp-body">
                    <span className="lp-name">{gear.label}</span>
                    <p className="lp-desc">{gear.desc}</p>
                  </div>
                  
                  {/* Right: image (absolutely positioned) */}
                  <div className="lp-img-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={gear.image} alt={gear.label} />
                  </div>

                  {/* Arrow Indicator */}
                  <div className="lp-arrow">
                    <ArrowUpRight size={20} strokeWidth={2.5} />
                  </div>
                </Link>
              ))}
            </div>

          </section>
        ))}

      </div>
    </>
  );
}
