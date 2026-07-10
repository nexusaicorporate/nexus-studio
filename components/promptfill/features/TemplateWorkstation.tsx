import { useState, useEffect, useRef } from "react";
import { Template, BankMap, ConfigResponse, ProviderConfig, GenerationParams, CategoryMap } from "@/components/promptfill/types";
import { getCategoryColor } from "@/components/promptfill/lib/utils";
import { toast } from "sonner";
import { useLanguage } from "@/components/promptfill/contexts/LanguageContext";
import { translations } from "@/components/promptfill/utils/i18n";
import * as App from "@/components/promptfill/backend";
import { Button } from "@/components/promptfill/components/ui/button";
import { Textarea } from "@/components/promptfill/components/ui/textarea";
import { Input } from "@/components/promptfill/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/promptfill/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/promptfill/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/promptfill/components/ui/select";
import { ScrollArea } from "@/components/promptfill/components/ui/scroll-area";
import { Label } from "@/components/promptfill/components/ui/label";
import { Badge } from "@/components/promptfill/components/ui/badge";
import { Separator } from "@/components/promptfill/components/ui/separator";
import { Magnetic } from "@/components/promptfill/components/ui/magnetic";

import { Edit, Eye, Save, Settings, Download, Copy, Trash2, Plus, Zap, Box, Maximize, ExternalLink, Image as ImageIcon, Search, ArrowLeft, Upload, X } from "lucide-react";
import BlurFade from "@/components/promptfill/components/ui/blur-fade";

interface TemplateWorkstationProps {
    template: Template;
    onBack: () => void;
    onUpdate?: (template: Template) => void;
    onDelete?: (id: string) => void;
    banks?: BankMap;
    config?: ConfigResponse;
    className?: string;
}

function getAspectRatio(sizeStr: string) {
    if (!sizeStr) return "";
    const parts = sizeStr.toLowerCase().split(/[x*]/).map(Number);
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return sizeStr;
    const [w, h] = parts;
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const d = gcd(w, h);
    return `${w / d}:${h / d}`;
}

export function TemplateWorkstation({ template: initialTemplate, onBack, onUpdate, onDelete, banks: initialBanks, config: initialConfig, className }: TemplateWorkstationProps) {
    const { language } = useLanguage();
    const t = translations[language];
    const [mode, setMode] = useState<'preview' | 'edit'>('preview');
    const [template, setTemplate] = useState<Template>(JSON.parse(JSON.stringify(initialTemplate)));
    const [banks, setBanks] = useState<BankMap>(initialBanks || {});
    const [variableValues, setVariableValues] = useState<{ [key: string]: string }>({});
    const [categories, setCategories] = useState<CategoryMap>({});
    const [config, setConfig] = useState<ConfigResponse | null>(initialConfig || null);

    // State missing in previous patch
    const [genSettings, setGenSettings] = useState({
        provider: "",
        model: "",
        size: ""
    });
    // showSettings removed
    const [generating, setGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [showInsertModal, setShowInsertModal] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [insertSearch, setInsertSearch] = useState("");
    const [insertCategory, setInsertCategory] = useState<string>("all");
    const [refImages, setRefImages] = useState<string[]>([]);
    const [displayLang, setDisplayLang] = useState<'cn' | 'en'>(language === 'cn' ? 'cn' : 'en');

    // Cover setting state

    // Cover setting state
    const [isSettingCover, setIsSettingCover] = useState(false);
    const [coverSetSuccess, setCoverSetSuccess] = useState(false);

    // History saving state
    const [isSavingHistory, setIsSavingHistory] = useState(false);
    const [historySavedSuccess, setHistorySavedSuccess] = useState(false);

    // Get current model capabilities
    const currentProviderConfig = config?.providers.find(p => p.id === genSettings.provider);
    const modelCaps = currentProviderConfig?.modelCapabilities?.[genSettings.model];
    const supportsRefImages = modelCaps?.supportsReferenceImage;
    const maxRefImages = modelCaps?.maxReferenceImages || 0;

    useEffect(() => {
        const init = async () => {
            if (!initialBanks) {
                // @ts-ignore
                const loadedBanks = await App.LoadBanks() as BankMap;
                setBanks(loadedBanks || {});
            }
            // @ts-ignore
            const cats = await App.LoadCategories() as CategoryMap;
            setCategories(cats || {});

            if (!initialConfig) {
                // @ts-ignore
                const cfg = await App.GetConfig() as ConfigResponse;
                setConfig(cfg);
                if (cfg) {
                    setGenSettings({
                        provider: cfg.activeProvider,
                        model: cfg.providers.find(p => p.id === cfg.activeProvider)?.models[0] || "",
                        size: cfg.providers.find(p => p.id === cfg.activeProvider)?.sizeOptions[cfg.providers.find(p => p.id === cfg.activeProvider)?.models[0] || ""]?.[0] || ""
                    });
                }
            } else if (initialConfig) {
                setGenSettings({
                    provider: initialConfig.activeProvider,
                    model: initialConfig.providers.find(p => p.id === initialConfig.activeProvider)?.models[0] || "",
                    size: initialConfig.providers.find(p => p.id === initialConfig.activeProvider)?.sizeOptions[initialConfig.providers.find(p => p.id === initialConfig.activeProvider)?.models[0] || ""]?.[0] || ""
                });
            }
        };
        init();
    }, [initialBanks, initialConfig]);


    useEffect(() => {
        setDisplayLang(language === 'cn' ? 'cn' : 'en');
    }, [language]);

    useEffect(() => {
        if (mode === 'preview') {
            const defaults: { [key: string]: string } = {};
            const regex = /\{\{([^}]+)\}\}/g;
            let match;
            const content = template.content[displayLang] || template.content['cn'] || "";
            const counts: Record<string, number> = {};

            while ((match = regex.exec(content)) !== null) {
                const key = match[1].trim();
                const count = counts[key] || 0;
                counts[key] = count + 1;
                const uniqueKey = `${key}_${count}`;

                if (!variableValues[uniqueKey]) {
                    const bank = banks[key];
                    if (bank && bank.options.length > 0) {
                        defaults[uniqueKey] = bank.options[0][displayLang] || bank.options[0]['cn'];
                    } else {
                        defaults[uniqueKey] = "???";
                    }
                }
            }
            if (Object.keys(defaults).length > 0) {
                setVariableValues(prev => ({ ...prev, ...defaults }));
            }
        }
    }, [mode, template.content, displayLang, banks]);

    useEffect(() => {
        setCoverSetSuccess(false);
        setHistorySavedSuccess(false);
    }, [viewingImage]);

    const handleDeleteTemplate = async () => {
        try {
            // @ts-ignore
            await App.DeleteTemplate(template.id);
            if (onDelete) onDelete(template.id);
            toast.success(t.templateDeleted);
        } catch (e) {
            console.error(e);
            toast.error(t.failedToDeleteTemplate);
            setShowDeleteDialog(false);
        }
    };

    const handleSaveTemplate = async () => {
        try {
            // @ts-ignore
            await App.EnsureTemplate(template);
            if (onUpdate) onUpdate(template);
            toast.success(t.templateSaved);
        } catch (e) {
            console.error(e);
            toast.error(t.failedToSaveTemplate);
        }
    };

    const insertVariable = (key: string) => {
        const textarea = document.getElementById("template-editor") as HTMLTextAreaElement;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = template.content[displayLang] || "";
            const before = text.substring(0, start);
            const after = text.substring(end);
            const newText = before + `{{${key}}}` + after;

            setTemplate(prev => ({
                ...prev,
                content: { ...prev.content, [displayLang]: newText }
            }));
        }
    };

    const handleSelectReferenceImages = async () => {
        try {
            // Calculate how many more images can be selected
            const currentCount = refImages.length;
            if (currentCount >= maxRefImages) {
                toast.error(`Maximum ${maxRefImages} images allowed for this model.`);
                return;
            }

            // @ts-ignore
            const newImages = await App.SelectReferenceImages(true) as string[];
            if (newImages && newImages.length > 0) {
                setRefImages(prev => {
                    const updated = [...prev, ...newImages];
                    if (updated.length > maxRefImages) {
                        return updated.slice(0, maxRefImages);
                    }
                    return updated;
                });
            }
        } catch (e) {
            console.error("Failed to select images:", e);
        }
    };

    const removeRefImage = (index: number) => {
        setRefImages(prev => prev.filter((_, i) => i !== index));
    };

    const getResolvedPrompt = () => {
        let text = template.content[displayLang] || template.content['cn'];
        const counts: Record<string, number> = {};

        return text.replace(/\{\{([^}]+)\}\}/g, (match, keyContent) => {
            const key = keyContent.trim();
            const count = counts[key] || 0;
            counts[key] = count + 1;
            const uniqueKey = `${key}_${count}`;
            return variableValues[uniqueKey] || match;
        });
    };

    const handleGenerate = async () => {
        if (!genSettings.provider) {
            // Maybe focus the provider select or show a toast?
            // For now, doing nothing or simple alert if user clicks generate without provider
            toast.warning(t.selectProvider);
            return;
        }
        setGenerating(true);
        try {
            const prompt = getResolvedPrompt();
            const req: GenerationParams = {
                prompt: prompt,
                provider: genSettings.provider,
                model: genSettings.model,
                size: genSettings.size,
                images: refImages
            };
            // @ts-ignore
            const res = await App.GenerateImage(req);
            if (res.success && res.images && res.images.length > 0) {
                const newImageUrl = res.images[0].url;
                setGeneratedImages(prev => [newImageUrl, ...prev]);
                setViewingImage(newImageUrl);
            } else {
                console.error("Generation failed:", res.error);
                const errorMsg = res.error?.message || JSON.stringify(res.error) || "Unknown error";
                toast.error(t.generationFailed + ": " + errorMsg);
            }
        } catch (e) {
            console.error(e);
            toast.error(t.generationFailed);
        } finally {
            setGenerating(false);
        }
    };

    const handleSaveHistory = async (imageUrl: string) => {
        if (!imageUrl) return;
        setIsSavingHistory(true);
        try {
            const prompt = getResolvedPrompt();
            // @ts-ignore
            await App.DownloadImageAndSaveHistory(imageUrl, prompt, genSettings.provider, genSettings.model, genSettings.size, {});
            setHistorySavedSuccess(true);
            toast.success(t.savedToHistory);
        } catch (e) {
            console.error(e);
            toast.error(t.failedToSaveHistory);
        } finally {
            setIsSavingHistory(false);
        }
    };

    const handleSetAsCover = async (imageUrl: string) => {
        if (!imageUrl) return;
        setIsSettingCover(true);
        try {
            // Updated to use specific method that handles image persistence
            // @ts-ignore
            const savedPath = await App.SetTemplateCover(template.id, imageUrl);

            const updatedTemplate = { ...template, imageUrl: savedPath };
            setTemplate(updatedTemplate);
            if (onUpdate) onUpdate(updatedTemplate);

            setCoverSetSuccess(true);
            toast.success(t.setAsCoverSuccess);
        } catch (e) {
            console.error(e);
            toast.error(t.setAsCoverFailed);
        } finally {
            setIsSettingCover(false);
        }
    };



    const renderMarkdown = (content: string) => {
        if (!content) return null;
        const counts: Record<string, number> = {};

        // Split by newlines to handle block elements (headers vs paragraphs)
        const lines = content.split('\n');

        return (
            <div className="prose prose-lg dark:prose-invert max-w-none font-sans leading-loose text-foreground">
                {lines.map((line, lineIdx) => {
                    // Check for headers
                    if (line.startsWith('# ')) {
                        return <h1 key={lineIdx} className="text-2xl font-bold mt-6 mb-3 text-foreground">{line.substring(2)}</h1>;
                    }
                    if (line.startsWith('## ')) {
                        return <h2 key={lineIdx} className="text-xl font-bold mt-5 mb-2 text-foreground">{line.substring(3)}</h2>;
                    }
                    if (line.startsWith('### ')) {
                        return <h3 key={lineIdx} className="text-lg font-bold mt-4 mb-2 text-foreground">{line.substring(4)}</h3>;
                    }

                    // Process paragraph content for variables
                    // Split by {{key}} pattern, capturing the delimiter to keep it in the array
                    const parts = line.split(/(\{\{[^}]+\}\})/g);

                    return (
                        <p key={lineIdx} className="my-2">
                            {parts.map((part, partIdx) => {
                                const match = part.match(/^\{\{([^}]+)\}\}$/);
                                if (match) {
                                    const key = match[1].trim();
                                    const count = counts[key] || 0;
                                    counts[key] = count + 1;
                                    const uniqueKey = `${key}_${count}`;

                                    const val = variableValues[uniqueKey];
                                    const bank = banks[key];
                                    let categoryLabel = key;
                                    let categoryId = "other";
                                    let colorClass = getCategoryColor();

                                    if (bank) {
                                        categoryId = bank.category;
                                        const cat = categories[categoryId];
                                        if (cat) {
                                            categoryLabel = cat.label[displayLang] || cat.label['en'] || key;
                                            colorClass = getCategoryColor(cat.color);
                                        }
                                    }
                                    const displayText = val || categoryLabel;

                                    return (
                                        <Popover key={partIdx}>
                                            <PopoverTrigger
                                                type="button"
                                                onClick={(e) => {
                                                    // e.preventDefault(); // This blocks Radix from opening the popover
                                                    e.stopPropagation();
                                                }}
                                                className={`not-prose inline-flex items-center mx-1 px-1.5 py-0.5 rounded-md border text-xs font-medium cursor-pointer transition-colors ${colorClass} !no-underline !decoration-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                                            >
                                                {displayText}
                                            </PopoverTrigger>
                                            <PopoverContent className="w-56 p-0 shadow-2xl border border-border" style={{ backgroundColor: "rgb(var(--surface))", zIndex: 99999 }} align="start">
                                                <div className="p-2 border-b text-xs font-medium text-muted-foreground bg-muted/30">
                                                    {categoryLabel}
                                                </div>
                                                <ScrollArea className="h-[200px]">
                                                    <div className="p-1">
                                                        {bank ? bank.options.map((opt, idx) => {
                                                            const currentLangText = displayLang === 'cn' ? opt.cn : (opt.en || opt.cn);
                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    className="px-2 py-1.5 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm rounded-sm transition-colors"
                                                                    onClick={() => setVariableValues(prev => ({ ...prev, [uniqueKey]: currentLangText }))}
                                                                >
                                                                    {currentLangText}
                                                                </div>
                                                            );
                                                        }) : (
                                                            <div className="p-2 text-destructive text-xs">Bank '{key}' not found</div>
                                                        )}
                                                    </div>
                                                </ScrollArea>
                                            </PopoverContent>
                                        </Popover>
                                    );
                                }
                                return <span key={partIdx}>{part}</span>;
                            })}
                        </p>
                    );
                })}
            </div>
        );
    };

    const handleUploadCover = async () => {
        setIsSettingCover(true);
        try {
            // @ts-ignore
            const paths = await App.SelectReferenceImages(false) as string[];
            if (paths && paths.length > 0) {
                const imageUrl = paths[0];
                // @ts-ignore
                const savedPath = await App.SetTemplateCover(template.id, imageUrl);

                const updatedTemplate = { ...template, imageUrl: savedPath };
                setTemplate(updatedTemplate);
                if (onUpdate) onUpdate(updatedTemplate);

                setCoverSetSuccess(true);
                toast.success(t.setAsCoverSuccess);
            }
        } catch (e) {
            console.error(e);
            toast.error(t.setAsCoverFailed);
        } finally {
            setIsSettingCover(false);
        }
    };

    return (
        <div className={`h-full flex flex-col bg-background/50 backdrop-blur-sm overflow-hidden shadow-sm ${className ? className : 'rounded-xl border border-border/50'}`}>
            <header className="h-14 flex items-center justify-between px-4 border-b border-border/40 bg-background/95 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Separator orientation="vertical" className="h-4" />
                    <div>
                        {mode === 'edit' ? (
                            <Input
                                value={template.name[displayLang] || ""}
                                onChange={(e) => setTemplate(prev => ({
                                    ...prev,
                                    name: { ...prev.name, [displayLang]: e.target.value }
                                }))}
                                className="h-7 text-sm font-semibold tracking-tight w-[200px] px-2 py-1 border-border/50 bg-muted/40"
                                placeholder={displayLang === 'cn' ? "模版名称" : "Template Name"}
                            />
                        ) : (
                            <h2 className="text-sm font-semibold tracking-tight truncate max-w-[200px]">
                                {template.name[displayLang] || template.name['cn']}
                            </h2>
                        )}
                        <p className="text-[10px] text-muted-foreground font-mono opacity-50 mt-0.5">{template.id.substring(0, 8)}...</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {mode === 'preview' && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setShowDeleteDialog(true)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                            <div className="h-6 w-px bg-border/50 mx-2" />
                        </>
                    )}

                    {mode === 'edit' && (
                        <>
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowInsertModal(true)}>
                                <Plus className="w-3.5 h-3.5" /> {t.insertVariable}
                            </Button>
                            <Magnetic>
                                <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleSaveTemplate}>
                                    <Save className="w-3.5 h-3.5" /> {t.saveChanges}
                                </Button>
                            </Magnetic>
                            <div className="h-6 w-px bg-border/50 mx-2" />
                        </>
                    )}

                    <div className="flex bg-muted/50 p-0.5 rounded-lg border border-border/50 mr-2">
                        <Button
                            size="sm"
                            variant="ghost"
                            className={`h-7 px-3 text-xs ${mode === 'preview' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setMode('preview')}
                        >
                            <Eye className="w-3 h-3 mr-1.5" /> {t.preview}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className={`h-7 px-3 text-xs ${mode === 'edit' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setMode('edit')}
                        >
                            <Edit className="w-3 h-3 mr-1.5" /> {t.edit}
                        </Button>
                    </div>

                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDisplayLang(prev => prev === 'cn' ? 'en' : 'cn')}
                        className="h-7 w-12 text-xs font-mono font-medium text-muted-foreground hover:text-foreground"
                    >
                        {displayLang === 'cn' ? "CN" : "EN"}
                    </Button>

                    <div className="h-6 w-px bg-border/50 mx-2" />

                    <div className="flex items-center gap-2">
                        <Select value={genSettings.provider} onValueChange={val => {
                            const p = config?.providers.find(p => p.id === val);
                            setGenSettings({
                                provider: val,
                                model: p?.models?.[0] || "",
                                size: p?.sizeOptions?.[p?.models?.[0] || ""]?.[0] || ""
                            });
                        }}>
                            <SelectTrigger className="h-8 w-[140px] text-xs">
                                <SelectValue placeholder={t.provider} />
                            </SelectTrigger>
                            <SelectContent align="end">
                                {config?.providers.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={genSettings.model} onValueChange={val => setGenSettings({ ...genSettings, model: val })}>
                            <SelectTrigger className="h-8 w-[140px] text-xs">
                                <SelectValue placeholder={t.model} />
                            </SelectTrigger>
                            <SelectContent align="end">
                                {config?.providers.find(p => p.id === genSettings.provider)?.models.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={genSettings.size} onValueChange={val => setGenSettings({ ...genSettings, size: val })}>
                            <SelectTrigger className="h-8 w-[100px] text-xs">
                                <SelectValue placeholder={t.size}>
                                    {genSettings.size ? getAspectRatio(genSettings.size) : t.size}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent align="end">
                                {config?.providers.find(p => p.id === genSettings.provider)?.sizeOptions[genSettings.model]?.map(s => (
                                    <SelectItem key={s} value={s} className="text-xs">{getAspectRatio(s)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex flex-col overflow-hidden relative">
                <ScrollArea className="flex-1">
                    <div className="p-8 max-w-4xl mx-auto min-h-[500px]">
                        {mode === 'preview' ? (
                            renderMarkdown(template.content[displayLang] || template.content.cn)
                        ) : (
                            <Textarea
                                id="template-editor"
                                key={displayLang} // Add key to force re-render when switching languages
                                value={template.content[displayLang] || ""}
                                onChange={e => setTemplate({ ...template, content: { ...template.content, [displayLang]: e.target.value } })}
                                className="w-full h-full min-h-[500px] border-none focus-visible:ring-0 p-0 text-2xl font-mono bg-transparent resize-none leading-loose"
                                placeholder={displayLang === 'cn' ? "在此编写您的提示词模版..." : "Write your prompt template here..."}
                            />
                        )}
                    </div>
                </ScrollArea>

                <div className="flex-shrink-0 border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                className="h-9 gap-2 text-xs"
                                onClick={handleUploadCover}
                                disabled={isSettingCover}
                            >
                                <ImageIcon className="w-3.5 h-3.5" />
                                {t.uploadCover}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 gap-2 text-xs"
                                onClick={() => {
                                    const prompt = getResolvedPrompt();
                                    navigator.clipboard.writeText(prompt);
                                    toast.success(t.promptCopied);
                                }}
                            >
                                <Copy className="w-3.5 h-3.5" />
                                {t.copyPrompt}
                            </Button>
                        </div>

                        <div className="flex items-center gap-3">
                            {supportsRefImages && (
                                <div className="flex items-center gap-2">
                                    {refImages.length > 0 && (
                                        <div className="flex -space-x-2 mr-2">
                                            {refImages.map((img, idx) => (
                                                <div key={idx} className="relative group w-8 h-8 rounded border border-border bg-background overflow-hidden shadow-sm hover:z-10 transition-transform hover:scale-110">
                                                    <img src={img} className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={() => removeRefImage(idx)}
                                                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <Button variant="outline" size="sm" onClick={handleSelectReferenceImages} className="h-9 gap-2 text-xs" disabled={refImages.length >= maxRefImages}>
                                        <Upload className="w-3.5 h-3.5" />
                                        {refImages.length > 0 ? `${refImages.length}/${maxRefImages}` : t.uploadImage || "Reference Image"}
                                    </Button>
                                </div>
                            )}

                            <Magnetic>
                                <Button onClick={handleGenerate} disabled={generating} size="sm" className="h-9 px-4 gap-2 font-medium">
                                    {generating ? t.generating : <><Zap className="w-4 h-4" /> {t.generateArtwork}</>}
                                </Button>
                            </Magnetic>
                        </div>

                    </div>

                    {(generatedImages.length > 0 || generating) && (
                        <div className="px-4 pb-4 overflow-x-auto flex gap-3 items-center scrollbar-hide">
                            {generating && (
                                <div className="h-24 w-24 flex-shrink-0 flex items-center justify-center rounded-lg border border-border border-dashed bg-muted/30 animate-pulse">
                                    <div className="animate-spin text-muted-foreground">🌀</div>
                                </div>
                            )}
                            {generatedImages.map((imgUrl, index) => (
                                <div
                                    key={index}
                                    className="h-24 w-auto flex-shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border/50 hover:border-primary/50 transition-colors bg-muted"
                                    onClick={() => setViewingImage(imgUrl)}
                                >
                                    <img src={imgUrl} className="h-full w-auto object-cover" alt={`Generated ${index}`} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={!!viewingImage} onOpenChange={(open) => !open && setViewingImage(null)}>
                <DialogContent className="max-w-fit w-auto max-h-[95vh] p-0 gap-0 overflow-hidden bg-background border-none shadow-2xl">
                    <DialogHeader className="px-4 py-3 border-b bg-muted/10 flex-shrink-0 flex-row items-center justify-between space-y-0 relative">
                        <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                            <DialogTitle className="text-sm font-medium">{t.generatedArtwork}</DialogTitle>
                        </div>
                        <div className="flex gap-2 items-center">
                            <Button
                                variant="secondary"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => viewingImage && handleSetAsCover(viewingImage)}
                                disabled={isSettingCover || coverSetSuccess || template.imageUrl === viewingImage}
                            >
                                <Box className="w-3.5 h-3.5 mr-1" />
                                {isSettingCover ? "Setting..." : (coverSetSuccess || template.imageUrl === viewingImage ? (language === 'cn' ? "当前封面" : "Cover Set") : t.setAsCover)}
                            </Button>
                            <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => viewingImage && handleSaveHistory(viewingImage)}
                                disabled={isSavingHistory || historySavedSuccess}
                            >
                                <Save className="w-3.5 h-3.5 mr-1" />
                                {isSavingHistory ? "Saving..." : (historySavedSuccess ? (language === 'cn' ? "已保存" : "Saved") : t.saveHistory)}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 ml-1" onClick={() => setViewingImage(null)} />
                        </div>
                    </DialogHeader>
                    <div className="flex-1 bg-muted/20 p-8 flex items-center justify-center overflow-auto">
                        {viewingImage && (
                            <img src={viewingImage} className="w-auto h-auto max-w-[90vw] max-h-[85vh] shadow-sm rounded-sm object-contain" alt="Generated" />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showInsertModal} onOpenChange={setShowInsertModal}>
                <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle className="text-lg font-medium tracking-tight">{t.insertVariable}</DialogTitle>
                    </DialogHeader>
                    <div className="p-4 space-y-4">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t.searchBanks}
                                    value={insertSearch}
                                    onChange={(e) => setInsertSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <Select value={insertCategory} onValueChange={setInsertCategory}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder={t.category} />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    <SelectItem value="all">{t.allCategories}</SelectItem>
                                    {Object.entries(categories).map(([id, cat]) => (
                                        <SelectItem key={id} value={id}>{cat.label[language] || cat.label['en'] || id}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <ScrollArea className="h-[300px] border rounded-md">
                            <div className="grid grid-cols-2 gap-px bg-border/20">
                                {Object.entries(banks)
                                    .filter(([key, bank]) => {
                                        const searchLower = insertSearch.toLowerCase();
                                        return (key.toLowerCase().includes(searchLower) || (bank.label[displayLang] || "").toLowerCase().includes(searchLower)) &&
                                            (insertCategory === "all" || bank.category === insertCategory);
                                    })
                                    .map(([key, bank]) => (
                                        <div
                                            key={key}
                                            className="p-3 bg-background hover:bg-muted/50 cursor-pointer transition-colors"
                                            onClick={() => { insertVariable(key); setShowInsertModal(false); }}
                                        >
                                            <div className="font-medium text-sm truncate">{bank.label[displayLang] || bank.label['cn']}</div>
                                            <div className="flex justify-between items-center mt-1">
                                                <code className="text-[10px] bg-muted px-1 rounded text-muted-foreground">{key}</code>
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>{t.delete}</DialogTitle>
                        <DialogDescription className="mt-2 text-muted-foreground">
                            {t.deleteTemplateConfirm}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(false)}>{t.cancel}</Button>
                        <Button variant="destructive" size="sm" onClick={handleDeleteTemplate}>{t.delete}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div >
    );
}
