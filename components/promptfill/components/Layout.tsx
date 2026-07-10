import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { BubbleBackground } from "@/components/promptfill/components/animate-ui/components/backgrounds/bubble";

interface LayoutProps {
    children: ReactNode;
    currentView: string;
    onNavigate: (view: string) => void;
}

export function Layout({ children, currentView, onNavigate }: LayoutProps) {
    return (
        <div className="h-full w-full text-foreground flex bg-transparent">
            {/* Sidebar (Left) */}
            <AppSidebar currentView={currentView} onNavigate={onNavigate} className="flex-shrink-0 z-20" />

            {/* Main Content (Right) */}
            <div className="flex-1 flex flex-col min-w-0 bg-transparent relative">
                {/* Drag Region */}
                <header className="h-10 flex items-center justify-end px-4 select-none z-50">
                    <div className="absolute top-0 left-0 w-full h-10" style={{ "--wails-draggable": "drag" } as any} />
                </header>

                <main className="flex-1 overflow-auto p-6 pt-2 scrollbar-hide">
                    <div className="max-w-6xl mx-auto h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
