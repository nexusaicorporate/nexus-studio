"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { MessageSquare, Settings, BookOpen, Layers, Boxes, ChefHat, Mountain, User, Image as ImageIcon, Clapperboard, Sparkles, Sun, Moon, Images, LifeBuoy, Film } from "lucide-react";
import { useSettings } from "@/lib/store/settings";
import { useLibrary } from "@/lib/store/library";
const NAV = [
  { group: "Workspace Gears", items: [{ href: "/", label: "Chat Gear", icon: MessageSquare }, { href: "/bulk", label: "Bulk Gear", icon: Images }] },
  { group: "Studio Gears", items: [{ href: "/studio/character", label: "Character Gear", icon: User }, { href: "/studio/image", label: "Image Gear", icon: ImageIcon }, { href: "/studio/video", label: "Video Gear", icon: Clapperboard }, { href: "/studio/cinema", label: "Cinema Gear", icon: Film }, { href: "/studio/workflow", label: "ComfyUI Gear", icon: Layers }, { href: "/studio/comfy", label: "Comfy Hub Gear", icon: Sparkles }] },
  { group: "Library Gears", items: [{ href: "/library/prompts", label: "Prompt Gear", icon: BookOpen }, { href: "/library/ingredients", label: "Ingredient Gear", icon: Boxes }, { href: "/library/recipes", label: "Recipe Gear", icon: ChefHat }] },
  { group: "System Gears", items: [{ href: "/settings", label: "Settings Gear", icon: Settings }, { href: "/docs", label: "Docs Gear", icon: LifeBuoy }] },
];
export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { mode, setMode, palette, activeImageProviderId, activeVideoProviderId, providers } = useSettings();
  const load = useLibrary((s) => s.load); const loaded = useLibrary((s) => s.loaded);
  const activeImg = providers.find((p) => p.id === activeImageProviderId);
  const activeVid = providers.find((p) => p.id === activeVideoProviderId);
  useEffect(() => { if (!loaded) load(); }, [loaded, load]);
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-72 shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="px-5 py-5 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary grid place-items-center text-primary-fg"><Sparkles size={18} /></div>
          <div><div className="font-semibold leading-tight text-lg text-primary">Nexusaigear</div><div className="text-[10px] uppercase tracking-wider text-muted font-semibold">Nexusai App</div></div>
        </div>
        <div className="px-5 pb-2">
          <div className="text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 rounded-md py-1 px-2.5 text-center uppercase tracking-widest">
            Nexusai Gears
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-4">
          {NAV.map((g) => (
            <div key={g.group}>
              <div className="px-3 text-[10px] uppercase tracking-wider text-muted/70 mb-1.5 font-bold">{g.group}</div>
              <div className="space-y-0.5">
                {g.items.map((it) => { const Icon = it.icon; const isActive = it.href === "/" ? path === "/" : path.startsWith(it.href); return (<Link key={it.href} href={it.href} className={`nav-link ${isActive ? "nav-link-active" : ""}`}><Icon size={17} /> {it.label}</Link>); })}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted truncate">Img: <span className="text-text">{activeImg?.name || "—"}</span></span>
              <span className="text-[10px] text-muted truncate">Vid: <span className="text-text">{activeVid?.name || "—"}</span></span>
            </div>
            <button onClick={() => setMode(mode === "dark" ? "light" : "dark")} className="btn-ghost px-2 py-1" title="Toggle theme">{mode === "dark" ? <Sun size={15} /> : <Moon size={15} />}</button>
          </div>
          <Link href="/settings" className="btn-outline w-full text-xs"><Layers size={14} /> {palette} palette · configure</Link>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
