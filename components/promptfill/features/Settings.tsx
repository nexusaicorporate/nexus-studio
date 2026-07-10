import { useEffect, useState, useRef } from "react";
import * as App from "@/components/promptfill/backend";
import { ConfigResponse, ProviderConfig, Template, BankMap } from "@/components/promptfill/types";
import { Button } from "@/components/promptfill/components/ui/button";
import { Input } from "@/components/promptfill/components/ui/input";
import { Label } from "@/components/promptfill/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/promptfill/components/ui/card";
import { Badge } from "@/components/promptfill/components/ui/badge";
import {
    Check, Save, Loader2, Sparkles, Settings as SettingsIcon,
    Moon, Sun, Laptop, Database, Upload, FileJson, Server, Info, SquarePen, FileText
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { translations } from "../utils/i18n";
import { Separator } from "@/components/promptfill/components/ui/separator";
import { toast } from "sonner";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/promptfill/components/ui/hover-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/promptfill/components/ui/popover";
import { Textarea } from "@/components/promptfill/components/ui/textarea";

interface SettingsProps {
    onDataChanged?: () => void;
}

export function Settings({ onDataChanged }: SettingsProps) {
    const { language, setLanguage } = useLanguage();
    const { theme, setTheme } = useTheme();
    const t = translations[language];
    const [config, setConfig] = useState<ConfigResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState<string | null>(null); // Provider ID being saved
    const [rawJson, setRawJson] = useState("");

    // Refs for file inputs
    const banksInputRef = useRef<HTMLInputElement>(null);
    const templatesInputRef = useRef<HTMLInputElement>(null);

    const loadConfig = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            const cfg = await App.GetConfig();
            setConfig(cfg);
        } catch (e) {
            console.error("Failed to load config", e);
            toast.error(t.failedToLoadConfig);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConfig();
    }, []);

    const handleSave = async (providerId: string, updates: Partial<ProviderConfig>) => {
        setSaving(providerId);
        try {
            // @ts-ignore
            await App.SetConfig({
                provider: providerId,
                config: updates
            });
            await loadConfig();
            toast.success(t.saveChanges);
        } catch (e) {
            console.error("Failed to save config", e);
            toast.error("Failed to save configuration");
        } finally {
            setSaving(null);
        }
    };

    const handleSetActive = async (providerId: string) => {
        setSaving(providerId);
        try {
            // @ts-ignore
            await App.SetConfig({
                provider: providerId,
                config: { setActive: true }
            });
            await loadConfig();
            toast.success("Active provider updated");
        } catch (e) {
            console.error("Failed to set active provider", e);
        } finally {
            setSaving(null);
        }
    };

    // Shared logic for processing imported data (file or text)
    const processBanksImport = async (content: string) => {
        try {
            const importedBanks = JSON.parse(content) as BankMap;
            // @ts-ignore
            const currentBanks = await App.LoadBanks();
            const newBanks = { ...currentBanks, ...importedBanks };
            // @ts-ignore
            await App.SaveBanks(newBanks);
            if (onDataChanged) onDataChanged();
            toast.success(t.importSuccess);
        } catch (error) {
            console.error("Import failed", error);
            toast.error(t.importFailed);
        }
    };

    const processTemplatesImport = async (content: string) => {
        try {
            const importedTemplates = JSON.parse(content) as Template[];
            if (!Array.isArray(importedTemplates)) {
                throw new Error("Invalid format: expected array");
            }
            // @ts-ignore
            const currentTemplates = await App.LoadTemplates();
            const templateMap = new Map<string, Template>();
            currentTemplates.forEach(t => templateMap.set(t.id, t));
            importedTemplates.forEach(t => templateMap.set(t.id, t));
            const newTemplates = Array.from(templateMap.values());
            // @ts-ignore
            await App.SaveTemplates(newTemplates);
            if (onDataChanged) onDataChanged();
            toast.success(t.importSuccess);
        } catch (error) {
            console.error("Import failed", error);
            toast.error(t.importFailed);
        }
    };

    const handleImportBanks = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            if (event.target?.result) processBanksImport(event.target.result as string);
        };
        reader.readAsText(file);
        if (banksInputRef.current) banksInputRef.current.value = '';
    };

    const handleImportTemplates = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            if (event.target?.result) processTemplatesImport(event.target.result as string);
        };
        reader.readAsText(file);
        if (templatesInputRef.current) templatesInputRef.current.value = '';
    };

    const handleRawImport = async (type: 'banks' | 'templates') => {
        if (!rawJson.trim()) return;
        if (type === 'banks') await processBanksImport(rawJson);
        else await processTemplatesImport(rawJson);
        setRawJson(""); // Clear after success (toast handles error feedback so user can retry if needed, but maybe keep it? Let's clear on success ideally, but here simplicity)
    };

    if (loading && !config) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-muted-foreground" /></div>;
    }

    if (!config) return <div>{t.failedToLoadConfig}</div>;

    const bankFormatExample = `{
  "key": {
    "label": { "cn": "中文", "en": "English" },
    "category": "category_id",
    "options": [
      { "cn": "项1", "en": "Item1" }
    ]
  }
}`;

    const templateFormatExample = `[
  {
    "id": "uuid",
    "name": { "cn": "Name", "en": "Name" },
    "content": { "cn": "...", "en": "..." },
    "imageUrl": "...",
    "author": "User"
  }
]`;

    return (
        <div className="container mx-auto p-6 max-w-6xl space-y-8">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight uppercase">{t.settings}</h1>
                <p className="text-muted-foreground text-sm mt-1">Configure your AI providers and application settings.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Data Management Card */}
                <div className="break-inside-avoid-column">
                    <Card className="border-border/50 bg-background shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Database className="w-5 h-5" />
                                {t.dataManagement}
                            </CardTitle>
                            <CardDescription>Import or export your local data.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Hidden Inputs */}
                            <input
                                type="file"
                                accept=".json"
                                ref={banksInputRef}
                                className="hidden"
                                onChange={handleImportBanks}
                            />
                            <input
                                type="file"
                                accept=".json"
                                ref={templatesInputRef}
                                className="hidden"
                                onChange={handleImportTemplates}
                            />

                            <div className="grid grid-cols-1 gap-4">
                                {/* Banks Section */}
                                <div className="p-4 border border-dashed rounded-lg flex flex-col gap-3 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <FileJson className="w-4 h-4 text-primary" />
                                            <span className="font-semibold text-sm">{t.importBanks}</span>
                                            <HoverCard>
                                                <HoverCardTrigger asChild>
                                                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help opacity-70 hover:opacity-100 transition-opacity" />
                                                </HoverCardTrigger>
                                                <HoverCardContent className="w-80">
                                                    <div className="space-y-2">
                                                        <h4 className="text-sm font-semibold">Format Example (JSON)</h4>
                                                        <pre className="text-[10px] bg-muted p-2 rounded border font-mono overflow-auto max-h-48 text-muted-foreground">
                                                            {bankFormatExample}
                                                        </pre>
                                                    </div>
                                                </HoverCardContent>
                                            </HoverCard>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline" size="sm"
                                            className="flex-1 h-9"
                                            onClick={() => banksInputRef.current?.click()}
                                        >
                                            <Upload className="w-3.5 h-3.5 mr-2" />
                                            Select File
                                        </Button>

                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="secondary" size="icon" className="h-9 w-9">
                                                    <SquarePen className="w-4 h-4" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-80 p-3" align="end">
                                                <div className="space-y-3">
                                                    <div className="space-y-1">
                                                        <h4 className="font-medium leading-none">Direct Input</h4>
                                                        <p className="text-xs text-muted-foreground">Paste JSON content here.</p>
                                                    </div>
                                                    <Textarea
                                                        className="h-48 font-mono text-xs"
                                                        placeholder="{ ... }"
                                                        value={rawJson}
                                                        onChange={(e) => setRawJson(e.target.value)}
                                                    />
                                                    <Button size="sm" className="w-full" onClick={() => handleRawImport('banks')}>
                                                        Merge Data
                                                    </Button>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                {/* Templates Section */}
                                <div className="p-4 border border-dashed rounded-lg flex flex-col gap-3 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-primary" />
                                            <span className="font-semibold text-sm">{t.importTemplates}</span>
                                            <HoverCard>
                                                <HoverCardTrigger asChild>
                                                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help opacity-70 hover:opacity-100 transition-opacity" />
                                                </HoverCardTrigger>
                                                <HoverCardContent className="w-80">
                                                    <div className="space-y-2">
                                                        <h4 className="text-sm font-semibold">Format Example (JSON Array)</h4>
                                                        <pre className="text-[10px] bg-muted p-2 rounded border font-mono overflow-auto max-h-48 text-muted-foreground">
                                                            {templateFormatExample}
                                                        </pre>
                                                    </div>
                                                </HoverCardContent>
                                            </HoverCard>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline" size="sm"
                                            className="flex-1 h-9"
                                            onClick={() => templatesInputRef.current?.click()}
                                        >
                                            <Upload className="w-3.5 h-3.5 mr-2" />
                                            Select File
                                        </Button>

                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="secondary" size="icon" className="h-9 w-9">
                                                    <SquarePen className="w-4 h-4" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-80 p-3" align="end">
                                                <div className="space-y-3">
                                                    <div className="space-y-1">
                                                        <h4 className="font-medium leading-none">Direct Input</h4>
                                                        <p className="text-xs text-muted-foreground">Paste JSON content here.</p>
                                                    </div>
                                                    <Textarea
                                                        className="h-48 font-mono text-xs"
                                                        placeholder="[ ... ]"
                                                        value={rawJson}
                                                        onChange={(e) => setRawJson(e.target.value)}
                                                    />
                                                    <Button size="sm" className="w-full" onClick={() => handleRawImport('templates')}>
                                                        Merge Data
                                                    </Button>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                            </div>
                        </CardContent>
                    </Card>
                </div>



            </div>
        </div>
    );
}
