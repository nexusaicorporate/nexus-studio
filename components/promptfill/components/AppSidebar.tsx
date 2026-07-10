import { Button } from "@/components/promptfill/components/ui/button";
import { LayoutGrid, History, Database, Settings, Disc, Sun, Moon } from "lucide-react";
import { useLanguage } from "@/components/promptfill/contexts/LanguageContext";
import { useTheme } from "@/components/promptfill/contexts/ThemeContext";
import { translations } from "@/components/promptfill/utils/i18n";
import { cn } from "@/components/promptfill/lib/utils";

interface AppSidebarProps {
    currentView: string;
    onNavigate: (view: string) => void;
    className?: string;
}

export function AppSidebar({ currentView, onNavigate, className }: AppSidebarProps) {
    const { language, toggleLanguage } = useLanguage();
    const { theme, setTheme } = useTheme();
    const t = translations[language];

    const menuItems = [
        { id: 'gallery', label: t.navGallery, icon: LayoutGrid },
        { id: 'history', label: t.history, icon: History },
        { id: 'banks', label: t.vocabularyBanks, icon: Database },
        { id: 'settings', label: t.settings, icon: Settings },
    ];

    return (
        <aside className={cn(
            "w-64 h-full border-r border-border/40 bg-background/50 backdrop-blur-xl flex flex-col justify-between p-4",
            className
        )}>
            {/* Window Drag Region */}
            <div className="absolute top-0 left-0 w-full h-8 cursor-grab active:cursor-grabbing" style={{ "--wails-draggable": "drag" } as any} />

            <div className="space-y-8 relative z-10">
                <div className="flex items-center gap-2 px-2 pt-2">
                    <Disc className="w-6 h-6 animate-spin-slow" />
                    <span className="font-semibold tracking-tight">Recipies Gear</span>
                </div>

                <nav className="space-y-1">
                    {menuItems.map((item) => (
                        <Button
                            key={item.id}
                            variant="ghost"
                            className={cn(
                                "w-full justify-start gap-3 h-10 font-normal transition-all duration-200",
                                currentView === item.id
                                    ? "bg-secondary/50 text-foreground shadow-sm border border-border/50"
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/20"
                            )}
                            onClick={() => onNavigate(item.id)}
                        >
                            <item.icon className="w-4 h-4" strokeWidth={1.5} />
                            <span>{item.label}</span>
                        </Button>
                    ))}
                </nav>
            </div>


            <div className="relative z-10 mt-auto space-y-2 hidden">
                {/* 
                  TODO: Multi-country language support and theme toggling 
                  to be integrated globally for the whole system later.
                */}
            </div>
        </aside>
    );
}
