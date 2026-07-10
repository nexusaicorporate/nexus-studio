import { useEffect, useState } from "react";
import * as App from "@/components/promptfill/backend";
import { HistoryRecord } from "@/components/promptfill/types";
import { toast } from "sonner";
import { Button } from "@/components/promptfill/components/ui/button";
import { Input } from "@/components/promptfill/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/promptfill/components/ui/dialog";
import { ScrollArea } from "@/components/promptfill/components/ui/scroll-area";
import { Loader2, Trash2, Download, Copy, Search, Calendar, Zap, Box } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/promptfill/components/ui/select";
import { Badge } from "@/components/promptfill/components/ui/badge";
import { Label } from "@/components/promptfill/components/ui/label";
import { Separator } from "@/components/promptfill/components/ui/separator";
import { useLanguage } from "../contexts/LanguageContext";
import { translations } from "../utils/i18n";
import BlurFade from "@/components/promptfill/components/ui/blur-fade";
import { Magnetic } from "@/components/promptfill/components/ui/magnetic";

function HistoryImage({ src, alt, className, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
    const [imageSrc, setImageSrc] = useState<string>("");
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!src) return;

        // If it starts with http/https, use it directly
        if (src.startsWith('http') || src.startsWith('https')) {
            setImageSrc(src);
            return;
        }

        // It's a local file, load via backend
        // @ts-ignore
        App.ReadImageFile(src)
            .then((data: string) => setImageSrc(data))
            .catch((err: any) => {
                console.error("Failed to load image:", src, err);
                setError(true);
            });
    }, [src]);

    if (error) {
        return <div className={`bg-muted/30 flex items-center justify-center text-muted-foreground text-xs p-4 ${className}`}>Image not found</div>;
    }

    if (!imageSrc) {
        return <div className={`animate-pulse bg-muted/30 ${className}`} />;
    }

    return <img src={imageSrc} alt={alt} className={className} {...props} />;
}


export function History() {
    const { language } = useLanguage();
    const t = translations[language];
    const [history, setHistory] = useState<HistoryRecord[]>([]);
    const [filteredHistory, setFilteredHistory] = useState<HistoryRecord[]>([]);
    const [loading, setLoading] = useState(false);

    // Search & Sort state
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOrder, setSortOrder] = useState("newest");

    // Detail Modal state
    const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);

    const loadHistory = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            const hist = await App.LoadAIHistory();
            setHistory(hist || []);
        } catch (e) {
            console.error("Failed to load history", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();
    }, []);

    // Filter and Sort effect
    useEffect(() => {
        let result = [...history];

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(r =>
                r.params.prompt.toLowerCase().includes(q) ||
                r.params.model.toLowerCase().includes(q) ||
                r.params.provider.toLowerCase().includes(q)
            );
        }

        if (sortOrder === "newest") {
            result.sort((a, b) => b.timestamp - a.timestamp);
        } else {
            result.sort((a, b) => a.timestamp - b.timestamp);
        }

        setFilteredHistory(result);
    }, [history, searchQuery, sortOrder]);

    const handleDelete = async (id: string) => {
        if (!confirm(t.deleteThisImage)) return;
        try {
            // @ts-ignore
            await App.DeleteAIHistoryRecord(id);
            setSelectedRecord(null); // Close modal if open
            await loadHistory();
        } catch (e) {
            console.error("Failed to delete", e);
        }
    };

    const handleCopyPrompt = async () => {
        if (selectedRecord) {
            navigator.clipboard.writeText(selectedRecord.params.prompt);
            toast.success(t.promptCopied);
        }
    };

    const handleCopyImage = async (url: string) => {
        try {
            // @ts-ignore
            const base64Data = await App.ReadImageFile(url);
            const data = base64Data.split(",")[1];
            const blob = await (await fetch(`data:image/png;base64,${data}`)).blob();
            await navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob,
                }),
            ]);
            toast.success("Image copied to clipboard!");
        } catch (e) {
            console.error("Failed to copy image", e);
            toast.error("Failed to copy image");
        }
    };

    const handleDownload = async (url: string) => {
        try {
            // @ts-ignore
            const base64Data = await App.ReadImageFile(url);
            const data = base64Data.split(",")[1];
            // @ts-ignore
            await App.SaveImageFile(Array.from(atob(data), c => c.charCodeAt(0)), "image.png");
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="container mx-auto max-w-7xl h-full flex flex-col p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight uppercase">{t.history}</h1>
                    <p className="text-muted-foreground text-sm mt-1">Review your generated artwork and prompts.</p>
                </div>

                <div className="flex gap-4">
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t.searchPrompts}
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <Select value={sortOrder} onValueChange={setSortOrder}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder={t.sortBy} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">{t.newestFirst}</SelectItem>
                            <SelectItem value="oldest">{t.oldestFirst}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-muted-foreground w-8 h-8" /></div>
            ) : filteredHistory.length === 0 ? (
                <div className="text-center p-12 border border-dashed rounded-lg opacity-50">
                    <h3 className="text-xl font-semibold">{t.noHistoryFound}</h3>
                    <p className="text-muted-foreground mt-2">{t.generateSomeImages}</p>
                </div>
            ) : (
                <ScrollArea className="flex-1 -mr-4 pr-4">
                    <div className="columns-2 md:columns-4 lg:columns-5 gap-4 space-y-4 pb-8">
                        {filteredHistory.map((record, idx) => (
                            <BlurFade key={record.id} delay={0.05 * idx} inView>
                                <div
                                    className="break-inside-avoid mb-4 overflow-hidden cursor-pointer rounded-lg border border-border/50 bg-muted/30 shadow-sm hover:shadow-md hover:border-foreground/20 transition-all duration-300 relative group"
                                    onClick={() => setSelectedRecord(record)}
                                >
                                    <HistoryImage
                                        src={record.images[0]?.url}
                                        alt="Generated"
                                        className="w-full h-auto block"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                </div>
                            </BlurFade>
                        ))}
                    </div>
                </ScrollArea>
            )}

            {/* Detail Modal */}
            <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
                <DialogContent className="max-w-5xl h-[85vh] flex flex-col md:flex-row p-0 gap-0 overflow-hidden bg-background border-border/50 shadow-2xl">
                    {selectedRecord && (
                        <>
                            {/* Left: Image Container */}
                            <div className="flex-1 bg-muted/20 flex items-center justify-center relative overflow-hidden p-8">
                                <HistoryImage
                                    src={selectedRecord.images[0]?.url}
                                    alt="Detail"
                                    className="max-w-full max-h-full object-contain shadow-sm rounded-sm"
                                />
                            </div>

                            {/* Right: details */}
                            <div className="w-full md:w-[400px] border-l border-border/50 flex flex-col bg-background">
                                <DialogHeader className="p-6 border-b border-border/50">
                                    <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        <span>{new Date(selectedRecord.timestamp * 1000).toLocaleDateString()}</span>
                                    </DialogTitle>
                                </DialogHeader>

                                <ScrollArea className="flex-1 p-6">
                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <Label className="uppercase text-[10px] font-bold text-muted-foreground tracking-wider">PROMPT</Label>
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={handleCopyPrompt} title={t.copyPrompt}>
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <p className="text-sm font-mono bg-muted/30 p-3 rounded-md border border-border/50 leading-relaxed text-foreground/90">
                                                {selectedRecord.params.prompt}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <Label className="uppercase text-[10px] font-bold text-muted-foreground mb-1.5 block tracking-wider">{t.provider}</Label>
                                                <div className="flex items-center gap-2 font-medium text-sm">
                                                    <Zap className="w-3.5 h-3.5 text-muted-foreground" /> {selectedRecord.params.provider}
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="uppercase text-[10px] font-bold text-muted-foreground mb-1.5 block tracking-wider">{t.model}</Label>
                                                <div className="flex items-center gap-2 font-medium text-sm">
                                                    <Box className="w-3.5 h-3.5 text-muted-foreground" /> {selectedRecord.params.model}
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="uppercase text-[10px] font-bold text-muted-foreground mb-1.5 block tracking-wider">{t.size}</Label>
                                                <Badge variant="outline" className="font-normal text-xs">{selectedRecord.params.size}</Badge>
                                            </div>
                                        </div>
                                    </div>
                                </ScrollArea>

                                <DialogFooter className="p-6 border-t border-border/50 bg-background flex flex-col sm:flex-row gap-2 justify-end">
                                    <Button variant="outline" onClick={() => handleCopyImage(selectedRecord.images[0]?.url)} className="gap-2">
                                        <Copy className="h-4 w-4" /> {t.copy || "Copy"}
                                    </Button>
                                    <Button variant="outline" onClick={() => handleDownload(selectedRecord.images[0]?.url)} className="gap-2">
                                        <Download className="h-4 w-4" /> {t.download || "Download"}
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => handleDelete(selectedRecord.id)}
                                        className="gap-2"
                                    >
                                        <Trash2 className="h-4 w-4" /> {t.delete}
                                    </Button>
                                </DialogFooter>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
