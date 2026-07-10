import { Template, BankMap } from "@/components/promptfill/types";
import { Card } from "@/components/promptfill/components/ui/card";
import { Badge } from "@/components/promptfill/components/ui/badge";
import { useLanguage } from "../contexts/LanguageContext";
import { translations } from "../utils/i18n";
import BlurFade from "@/components/promptfill/components/ui/blur-fade";
import { LocalImage } from "@/components/promptfill/components/LocalImage";

interface TemplateGalleryProps {
    templates: Template[];
    banks: BankMap;
    onSelect: (template: Template) => void;
}

export function TemplateGallery({ templates, banks, onSelect }: TemplateGalleryProps) {
    const { language } = useLanguage();
    const t = translations[language];

    // Search moved to parent (App.tsx)

    return (
        <div className="space-y-6">
            {templates.length === 0 ? (
                <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed text-muted-foreground">
                    {t.noTemplatesFound}
                </div>
            ) : (
                <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                    {templates.map((tpl, idx) => (
                        <BlurFade key={tpl.id} delay={0.05 * idx} inView>
                            <div className="break-inside-avoid">
                                <Card
                                    className="group cursor-pointer overflow-hidden border-transparent bg-transparent shadow-none hover:bg-muted/40 transition-colors duration-300 w-full text-left"
                                    onClick={() => onSelect(tpl)}
                                >
                                    <div className="relative aspect-auto overflow-hidden rounded-md border bg-muted">
                                        <LocalImage
                                            src={tpl.imageUrl}
                                            alt={tpl.name[language] || tpl.name.cn || tpl.name.en}
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    </div>
                                    <div className="p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-medium leading-none tracking-tight">
                                                {tpl.name[language] || tpl.name.cn || tpl.name.en}
                                            </h3>
                                            <Badge variant="secondary" className="text-[10px] font-normal text-muted-foreground bg-transparent border border-border/40">
                                                {tpl.author}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                            {(tpl.content[language] || tpl.content.cn || tpl.content.en)?.substring(0, 100)}
                                        </p>
                                    </div>
                                </Card>
                            </div>
                        </BlurFade>
                    ))}
                </div>
            )}
        </div>
    );
}
