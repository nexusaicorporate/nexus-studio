import { useState } from "react";
import { Button } from "@/components/promptfill/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/promptfill/components/ui/dialog";
import { Input } from "@/components/promptfill/components/ui/input";
import { Label } from "@/components/promptfill/components/ui/label";
import { Upload, Link as LinkIcon, Github, FileText, Loader2 } from "lucide-react";
import { Template } from "@/components/promptfill/types";
import { toast } from "sonner";
import * as Backend from "@/components/promptfill/backend";

interface ImportPromptDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImported: (template: Template) => void;
}

export function ImportPromptDialog({ open, onOpenChange, onImported }: ImportPromptDialogProps) {
    const [url, setUrl] = useState("");
    const [githubRepo, setGithubRepo] = useState("");
    const [loading, setLoading] = useState(false);

    const createTemplateFromContent = async (name: string, content: string) => {
        try {
            // First check if it's a JSON array of templates
            try {
                const parsed = JSON.parse(content);
                if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
                    const tpl = parsed[0] as Template;
                    tpl.id = crypto.randomUUID();
                    await Backend.EnsureTemplate(tpl);
                    onImported(tpl);
                    toast.success("Imported template from JSON");
                    onOpenChange(false);
                    return;
                }
            } catch (e) {
                // Not JSON, treat as raw text
            }

            const newTemplate: Template = {
                id: crypto.randomUUID(),
                name: { en: name, cn: name },
                content: { en: content, cn: content },
                imageUrl: "",
                author: "Imported",
                tags: []
            };
            
            await Backend.EnsureTemplate(newTemplate);
            onImported(newTemplate);
            toast.success("Imported template successfully");
            onOpenChange(false);
        } catch (e) {
            console.error(e);
            toast.error("Failed to save imported template");
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target?.result as string;
            await createTemplateFromContent(file.name.replace(/\.[^/.]+$/, ""), content);
        };
        reader.readAsText(file);
    };

    const handleUrlImport = async () => {
        if (!url) return;
        setLoading(true);
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch");
            const content = await res.text();
            
            const urlObj = new URL(url);
            const name = urlObj.pathname.split('/').pop() || "Imported URL";
            
            await createTemplateFromContent(name, content);
        } catch (e) {
            console.error(e);
            toast.error("Failed to fetch from URL");
        } finally {
            setLoading(false);
        }
    };

    const handleGithubImport = async () => {
        if (!githubRepo) return;
        setLoading(true);
        try {
            let fetchUrl = githubRepo;
            if (fetchUrl.includes("github.com") && fetchUrl.includes("/blob/")) {
                fetchUrl = fetchUrl.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
            }

            const res = await fetch(fetchUrl);
            if (!res.ok) throw new Error("Failed to fetch");
            const content = await res.text();
            
            const name = fetchUrl.split('/').pop() || "Imported GitHub File";
            await createTemplateFromContent(name, content);
        } catch (e) {
            console.error(e);
            toast.error("Failed to fetch from GitHub. Make sure you provide a direct file URL.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Import Prompts / Templates</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><FileText className="w-4 h-4" /> From File (.txt, .json)</Label>
                        <Input type="file" accept=".txt,.json" onChange={handleFileUpload} className="cursor-pointer" />
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><LinkIcon className="w-4 h-4" /> From URL</Label>
                        <div className="flex gap-2">
                            <Input placeholder="https://example.com/prompt.txt" value={url} onChange={e => setUrl(e.target.value)} />
                            <Button onClick={handleUrlImport} disabled={!url || loading}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Import"}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Github className="w-4 h-4" /> From GitHub</Label>
                        <div className="flex gap-2">
                            <Input placeholder="https://github.com/user/repo/blob/main/prompt.txt" value={githubRepo} onChange={e => setGithubRepo(e.target.value)} />
                            <Button onClick={handleGithubImport} disabled={!githubRepo || loading}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Import"}
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
