"use client";
import { useEffect, useState } from "react";
import { Layout } from "@/components/promptfill/components/Layout";
import { TemplateGallery } from "@/components/promptfill/features/TemplateGallery";
import { TemplateWorkstation } from "@/components/promptfill/features/TemplateWorkstation";
import { Settings } from "@/components/promptfill/features/Settings";
import { History } from "@/components/promptfill/features/History";
import { BankManager } from "@/components/promptfill/features/BankManager";
import { Template, BankMap } from "@/components/promptfill/types";
import * as Backend from "@/components/promptfill/backend"; // Wails binding
import { TextReveal } from "@/components/promptfill/components/ui/text-reveal";
import BlurFade from "@/components/promptfill/components/ui/blur-fade";
import { Input } from "@/components/promptfill/components/ui/input";
import { Button } from "@/components/promptfill/components/ui/button";
import { Search } from "lucide-react";
import { Plus } from "lucide-react";
import { useLanguage } from "@/components/promptfill/contexts/LanguageContext";
import { translations } from "@/components/promptfill/utils/i18n";
import { ImportPromptDialog } from "@/components/promptfill/features/ImportPromptDialog";
import { Download } from "lucide-react";

type ViewState = 'gallery' | 'workstation' | 'settings' | 'history' | 'banks';

function AppRoot() {
    const [view, setView] = useState<ViewState>('gallery');
    const [templates, setTemplates] = useState<Template[]>([]);
    const [banks, setBanks] = useState<BankMap>({});
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [importDialogOpen, setImportDialogOpen] = useState(false);

    // Access language for filtering
    const { language } = useLanguage();
    // Wait, useLanguage is not available here because AppRoot is inside LanguageProvider but we need to use hook inside AppRoot.
    // AppRoot is child of LanguageProvider in App(), so it is fine.
    // But we need to make sure imports are correct.
    const t = translations[language];

    const filteredTemplates = templates.filter(tpl => {
        const query = searchQuery.toLowerCase();
        const name = (tpl.name[language] || tpl.name.cn || tpl.name.en || "").toLowerCase();
        const content = (tpl.content[language] || tpl.content.cn || tpl.content.en || "").toLowerCase();
        const author = (tpl.author || "").toLowerCase();
        return name.includes(query) || content.includes(query) || author.includes(query);
    });

    const loadData = async () => {
        try {
            // @ts-ignore
            const tpls = await Backend.LoadTemplates();
            setTemplates(tpls || []);
            // @ts-ignore
            const bnks = await Backend.LoadBanks();
            setBanks(bnks || {});
        } catch (e) {
            console.error("Failed to load data", e);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleTemplateSelect = (template: Template) => {
        setSelectedTemplate(template);
        setView('workstation');
    };

    const handleBackToGallery = () => {
        setSelectedTemplate(null);
        setView('gallery');
        loadData(); // Reload data when returning to gallery to ensure fresh state
    };

    const handleCreateTemplate = () => {
        const newTemplate: Template = {
            id: crypto.randomUUID(),
            name: { en: "New Template", cn: "新建模版" },
            content: { en: "", cn: "" },
            imageUrl: "",
            author: "User",
            tags: []
        };
        setSelectedTemplate(newTemplate);
        setView('workstation');
    };

    const handleTemplateUpdate = (updatedTemplate: Template) => {
        setTemplates(prev => prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));
        if (selectedTemplate && selectedTemplate.id === updatedTemplate.id) {
            setSelectedTemplate(updatedTemplate);
        }
    };

    const handleTemplateDelete = (id: string) => {
        setTemplates(prev => prev.filter(t => t.id !== id));
        handleBackToGallery();
    };

    const renderContent = () => {
        switch (view) {
            case 'settings':
                return <Settings onDataChanged={loadData} />;
            case 'history':
                return <History />;
            case 'banks':
                // BankManager might also update banks, so we could pass loadData if needed, 
                // but for now let's focus on Settings.
                return <BankManager />;
            case 'workstation':
                if (!selectedTemplate) return <div>Error: No template selected</div>;
                return (
                    <TemplateWorkstation
                        template={selectedTemplate}
                        onBack={handleBackToGallery}
                        onUpdate={handleTemplateUpdate}
                        onDelete={handleTemplateDelete}
                        banks={banks}
                    />
                );
            case 'gallery':
            default:
                return (
                    <div className="space-y-8">
                        <div className="flex justify-between items-center border-b border-border/40 pb-6 gap-6">
                            <div className="shrink-0">
                                <TextReveal text="Template Gallery" className="text-3xl font-semibold tracking-tight text-foreground" />
                                <BlurFade delay={0.2} inView>
                                    <p className="text-muted-foreground mt-2 text-sm">Select a preset to start creating</p>
                                </BlurFade>
                            </div>

                            <div className="flex-1 max-w-md mx-auto relative hidden md:block">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder={t.searchPrompts || "Search templates..."}
                                    className="pl-9 bg-muted/40 border-border/50"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <BlurFade delay={0.4} inView>
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="px-3 py-1 rounded-full bg-secondary text-xs font-medium text-secondary-foreground border border-border/50">
                                            Total: {filteredTemplates.length}
                                        </div>
                                        <Button variant="outline" onClick={() => setImportDialogOpen(true)} size="sm" className="h-7 gap-2 text-xs">
                                            <Download className="w-3.5 h-3.5" /> Import
                                        </Button>
                                        <Button onClick={handleCreateTemplate} size="sm" className="h-7 gap-2 text-xs">
                                            <Plus className="w-3.5 h-3.5" /> {(t as any).createTemplate || (language === 'cn' ? "新建模版" : "Create Template")}
                                        </Button>
                                    </div>
                                    {/* Mobile Search - rendered if needed or keep hidden on small screens? Let's assume desktop for now or use the centered one */}
                                    <div className="relative md:hidden w-40">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="search"
                                            placeholder="Search..."
                                            className="pl-9 h-8 text-xs bg-muted/40 border-border/50"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </BlurFade>
                        </div>
                        <TemplateGallery 
                            templates={filteredTemplates} 
                            banks={banks} 
                            onSelect={handleTemplateSelect} 
                        />
                        <ImportPromptDialog 
                            open={importDialogOpen}
                            onOpenChange={setImportDialogOpen}
                            onImported={(tpl) => {
                                handleTemplateUpdate(tpl);
                                // Also trigger a reload from backend to be safe
                                loadData();
                            }}
                        />
                    </div>
                );
        }
    };
    return (
        <Layout currentView={view} onNavigate={(v) => setView(v as ViewState)}>
            {renderContent()}
        </Layout>
    );
}

import { LanguageProvider } from "@/components/promptfill/contexts/LanguageContext";
import { ThemeProvider } from "@/components/promptfill/contexts/ThemeContext";
import { Toaster } from "@/components/promptfill/components/ui/sonner";


function App() {
    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <LanguageProvider>
                <AppRoot />
                <Toaster />
            </LanguageProvider>
        </ThemeProvider>
    );
}

export default App;
