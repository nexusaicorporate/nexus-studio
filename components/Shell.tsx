"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  MessageSquare,
  Settings,
  BookOpen,
  Layers,
  Boxes,
  ChefHat,
  User,
  Image as ImageIcon,
  Clapperboard,
  Sparkles,
  Sun,
  Moon,
  Images,
  LifeBuoy,
  Film,
  CreditCard,
  ShieldAlert,
  ScanSearch,
  Megaphone,
  Terminal,
  Menu
} from "lucide-react";
import { useSettings } from "@/lib/store/settings";
import { useLibrary } from "@/lib/store/library";
import { WEB_MODE } from "@/lib/webmode";
import { useAuth } from "@/components/AuthProvider";

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { plan, groups } = useAuth();
  const [collapsed, setCollapsed] = useState(true);
  
  const NAV = [
    {
      group: "Workspace Gears",
      items: [
        { href: "/", label: "Home", icon: Home, color: "text-blue-400", image: "/images/home_gear_vertical.png" },
        { href: "/chat", label: "Chat Gear", icon: MessageSquare, color: "text-sky-400", image: "/images/chat_gear.png" },
        { href: "/bulk", label: "Bulk Gear", icon: Images, color: "text-emerald-400", image: "/images/bulk_gear.png" }
      ]
    },
    {
      group: "Pro Gears",
      items: [
        { href: "/analyze", label: "Analyze Gear", icon: ScanSearch, color: "text-cyan-400", image: "/images/analyze_gear.png" },
        { href: "/studio/image", label: "Image Gear", icon: ImageIcon, color: "text-violet-400", image: "/images/image_gear.png" },
        { href: "/studio/video", label: "Video Gear", icon: Clapperboard, color: "text-lime-400", image: "/images/video_gear.png" },
        { href: "/studio/audio", label: "Audio Gear", icon: Volume2, color: "text-emerald-400", image: "/images/docs_gear.png" },
        { href: "/studio/character", label: "Character Gear", icon: User, color: "text-orange-400", image: "/images/character_gear.jpg" }
      ]
    },
    {
      group: "Studio Gears",
      items: [
        { href: "/studio/ugc", label: "UGC Ads Gear", icon: Megaphone, color: "text-pink-500", image: "/images/ugc_ads_gear.jpg" },
        { href: "/studio/cinema", label: "Cinema Gear", icon: Film, color: "text-amber-400", image: "/images/cinema_gear.jpg" },
        { href: "/studio/workflow", label: "ComfyUI Gear", icon: Layers, color: "text-indigo-400", image: "/images/comfyui_gear_vertical.png" },
        { href: "/studio/comfy", label: "Comfy Hub Gear", icon: Sparkles, color: "text-rose-400", image: "/images/comfy_hub_gear.png" }
      ]
    },
    {
      group: "Library Gears",
      items: [
        { href: "/library/assets", label: "Assets Gear", icon: Boxes, color: "text-rose-400", image: "/images/image_gear.png" },
        { href: "/library/prompts", label: "Prompts Gear", icon: BookOpen, color: "text-blue-400", image: "/images/library_gear.png" },
        { href: "/library/promptfill", label: "Recipies Gear", icon: Layers, color: "text-teal-400", image: "/images/prompt_director_gear.jpg" },
        { href: "/library/ingredients", label: "Ingredients Gear", icon: ChefHat, color: "text-purple-400", image: "/images/ingredients_gear.png" }
      ]
    },
    {
      group: "System Gears",
      items: [
        { href: "/settings", label: "Settings Gear", icon: Settings, color: "text-slate-400", image: "/images/settings_gear.png" },
        { href: "/billing", label: "Billing Gear", icon: CreditCard, color: "text-amber-400", image: "/images/comfyui_gear.png" },
        { href: "/docs", label: "Docs Gear", icon: LifeBuoy, color: "text-yellow-400", image: "/images/docs_gear.png" }
      ]
    },
    ...(groups.includes("admin") || groups.includes("dev") ? [{
      group: "Admin Gears",
      items: [
        ...(groups.includes("admin") ? [{ href: "/admin", label: "Admin Gear", icon: ShieldAlert, color: "text-red-500", image: "/images/admin_gear.png" }] : []),
        ...(groups.includes("dev") || groups.includes("admin") ? [{ href: "/dev", label: "Dev Gear", icon: Terminal, color: "text-red-400", image: "/images/dev_gear.png" }] : [])
      ]
    }] : [])
  ];

  const { mode, setMode, palette, activeImageProviderId, activeVideoProviderId, providers, loadFromDb } = useSettings();
  const load = useLibrary((s) => s.load); const loaded = useLibrary((s) => s.loaded);
  const activeImg = providers.find((p) => p.id === activeImageProviderId);
  const activeVid = providers.find((p) => p.id === activeVideoProviderId);

  useEffect(() => { loadFromDb(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!loaded) load(); }, [loaded, load]);

  return (
    <div className="flex h-screen overflow-hidden relative">
      <aside 
        onMouseLeave={() => setCollapsed(true)}
        className={`absolute left-0 top-0 h-full z-50 shrink-0 border-r border-border bg-surface flex flex-col transition-all duration-300 ease-in-out ${collapsed ? "w-20" : "w-72"}`}
      >
        <div 
          onClick={() => setCollapsed(!collapsed)}
          className="px-5 py-4 flex items-center justify-between overflow-hidden cursor-pointer hover:bg-surface2/40 transition-colors shrink-0 min-h-[72px]"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {!collapsed ? (
            <div className="flex items-center justify-between w-full">
              <img src="/images/nexusai_logo_dark.png" className="h-9 object-contain max-w-[170px]" alt="NexusAIGear" />
              <Menu size={16} className="text-muted hover:text-text shrink-0 ml-2" />
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <img src="/images/nexusai_app_icon.jpg" className="w-9 h-9 rounded-xl object-cover border border-border" alt="" />
            </div>
          )}
        </div>
        
        {!collapsed && (
          <div className="px-5 pb-2 transition-opacity duration-200">
            <div className="text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 rounded-md py-1 px-2.5 text-center uppercase tracking-widest">
              Nexusai Gears
            </div>
          </div>
        )}

        {collapsed && (
          <div className="flex justify-center pb-2 text-muted">
            <button 
              onClick={() => setCollapsed(false)}
              className="p-1 rounded hover:bg-surface2/50 transition-colors"
              title="Expand Sidebar"
            >
              <Menu size={16} className="opacity-50 animate-pulse" />
            </button>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-4">
          {NAV.map((g) => (
            <div key={g.group} className="transition-all duration-200">
              {!collapsed && <div className="px-3 text-[10px] uppercase tracking-wider text-muted/70 mb-1.5 font-bold transition-opacity duration-200">{g.group}</div>}
              <div className="space-y-0.5">
                {g.items.map((it) => { 
                  const Icon = it.icon; 
                  const isActive = it.href === "/" ? path === "/" : path.startsWith(it.href); 
                  return (
                    <Link 
                      key={it.href} 
                      href={it.href} 
                      className={`nav-link flex items-center transition-all ${collapsed ? "justify-center px-0 py-2.5 rounded-lg" : "gap-3 rounded-xl px-3 py-2"} ${isActive ? "nav-link-active" : ""}`}
                      title={collapsed ? it.label : undefined}
                    >
                      <Icon size={19} className={`${it.color} shrink-0 transition-transform hover:scale-110`} />
                      {!collapsed && <span className="truncate text-sm">{it.label}</span>}
                    </Link>
                  ); 
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-border overflow-hidden">
          {!collapsed ? (
            <div className="transition-opacity duration-200">
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted truncate">Img: <span className="text-text">{activeImg?.name || "—"}</span></span>
                  <span className="text-[10px] text-muted truncate">Vid: <span className="text-text">{activeVid?.name || "—"}</span></span>
                </div>
                <button onClick={() => setMode(mode === "dark" ? "light" : "dark")} className="btn-ghost px-2 py-1" title="Toggle theme">{mode === "dark" ? <Sun size={15} /> : <Moon size={15} />}</button>
              </div>
              <Link href="/settings" className="btn-outline w-full text-xs"><Layers size={14} /> {palette} palette · configure</Link>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button onClick={() => setMode(mode === "dark" ? "light" : "dark")} className="btn-ghost p-2 rounded-lg" title="Toggle theme">{mode === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button>
            </div>
          )}
        </div>
      </aside>
      <main className="flex-1 w-full h-full overflow-y-auto pl-20">{children}</main>
    </div>
  );
}
