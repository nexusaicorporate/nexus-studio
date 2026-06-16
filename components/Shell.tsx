"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { MessageSquare, Settings, BookOpen, Layers, Boxes, ChefHat, Mountain, User, Image as ImageIcon, Clapperboard, Sparkles, Sun, Moon, Images } from "lucide-react";
import { useSettings } from "@/lib/store/settings";
import { useLibrary } from "@/lib/store/library";
const NAV = [
  { group: "Workspace", items: [{ href: "/", label: "Chat & Analyze", icon: MessageSquare }, { href: "/bulk", label: "Bulk Analyze", icon: Images }] },
  { group: "Studio", items: [{ href: "/studio/character", label: "Character Creator", icon: User }, { href: "/studio/image", label: "Image Studio", icon: ImageIcon }, { href: "/studio/video", label: "Video Studio", icon: Clapperboard }, { href: "/studio/workflow", label: "Workflow Studio", icon: Layers }, { href: "/studio/comfy", label: "Comfy Hub", icon: Sparkles }] },
  { group: "Libraries", items: [{ href: "/library/prompts", label: "Prompt Library", icon: BookOpen }, { href: "/library/environments", label: "Environment Library", icon: Mountain }, { href: "/library/ingredients", label: "Ingredient Library", icon: Boxes }, { href: "/library/recipes", label: "Recipe Library", icon: ChefHat }] },
  { group: "System", items: [{ href: "/settings", label: "Settings / Control Panel", icon: Settings }] },
];
export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { mode, setMode, palette, activeProviderId, providers } = useSettings();
  const load = useLibrary((s) => s.load); const loaded = useLibrary((s) => s.loaded);
  const active = providers.find((p) => p.id === activeProviderId);
  useEffect(() => { if (!loaded) load(); }, [loaded, load]);
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-72 shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="px-5 py-5 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary grid place-items-center text-primary-fg"><Sparkles size={18} /></div>
          <div><div className="font-semibold leading-tight">Nexus AI Studio</div><div className="text-[11px] text-muted">Prompt · Studio · Libraries</div></div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-5">
          {NAV.map((g) => (
            <div key={g.group}>
              <div className="px-3 text-[10px] uppercase tracking-wider text-muted/70 mb-1.5">{g.group}</div>
              <div className="space-y-0.5">
                {g.items.map((it) => { const Icon = it.icon; const isActive = it.href === "/" ? path === "/" : path.startsWith(it.href); return (<Link key={it.href} href={it.href} className={`nav-link ${isActive ? "nav-link-active" : ""}`}><Icon size={17} /> {it.label}</Link>); })}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs text-muted truncate">Provider: <span className="text-text">{active?.name || "—"}</span></span>
            <button onClick={() => setMode(mode === "dark" ? "light" : "dark")} className="btn-ghost px-2 py-1" title="Toggle theme">{mode === "dark" ? <Sun size={15} /> : <Moon size={15} />}</button>
          </div>
          <Link href="/settings" className="btn-outline w-full text-xs"><Layers size={14} /> {palette} palette · configure</Link>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
