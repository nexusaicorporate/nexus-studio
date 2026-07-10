
import { useState, useEffect } from "react";
import * as App from "@/components/promptfill/backend";
import { Loader2, ImageOff } from "lucide-react";

// Global cache to store loaded image data
const globalImageCache = new Map<string, string>();
const globalPendingPromises = new Map<string, Promise<string>>();

interface LocalImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    fallback?: React.ReactNode;
}

export function LocalImage({ src, className, alt, fallback, ...props }: LocalImageProps) {

    // Initialize state from cache if available to prevent flash
    const [imageSrc, setImageSrc] = useState<string>(() => {
        if (!src) return "";
        if (src.startsWith("http") || src.startsWith("data:")) return src;
        return globalImageCache.get(src) || "";
    });

    // Only show loading if we don't have the image in cache
    const [loading, setLoading] = useState(() => {
        if (!src) return false;
        if (src.startsWith("http") || src.startsWith("data:")) return false;
        return !globalImageCache.has(src);
    });

    const [error, setError] = useState(false);

    useEffect(() => {
        if (!src) {
            setImageSrc("");
            setLoading(false);
            return;
        }

        // Direct URLs
        if (src.startsWith("http") || src.startsWith("data:")) {
            setImageSrc(src);
            setLoading(false);
            setError(false);
            return;
        }

        // Check cache first
        if (globalImageCache.has(src)) {
            setImageSrc(globalImageCache.get(src)!);
            setLoading(false);
            setError(false);
            return;
        }

        // Needs fetching
        let isMounted = true;
        setLoading(true);
        setError(false);

        const loadLocalImage = async () => {
            try {
                let promise = globalPendingPromises.get(src);
                if (!promise) {
                    // Start new request
                    // @ts-ignore
                    promise = App.ReadImageFile(src) as Promise<string>;
                    globalPendingPromises.set(src, promise);
                }

                const base64Data = await promise;

                // Update cache
                if (base64Data) {
                    globalImageCache.set(src, base64Data);
                }

                // Update state if still mounted
                if (isMounted) {
                    if (base64Data) {
                        setImageSrc(base64Data);
                    } else {
                        setError(true);
                    }
                }
            } catch (e) {
                console.error("Failed to load local image:", src, e);
                if (isMounted) setError(true);
            } finally {
                // Cleanup pending promise
                // We only remove it if we are the ones who might have created it or it's done
                // Actually safer to just remove it. Future calls will hit globalImageCache.
                // However, we should only remove it if it's THE promise we waited on?
                // The logical flow: promise settles -> cache set -> promise removed.
                // Any parallel request awaits same promise.
                // Once settled, everyone gets result.

                // To be safe, we verify if the promise in map is still us? Not really needed if we just delete by key.
                // Note: If fetch failed, we also want to remove so retry checks can happen (though undefined cache will trigger retry).
                if (globalPendingPromises.get(src) !== undefined) {
                    // We check if the promise in map is settled.
                    // But we are in finally block of awaiting that promise, so it IS settled (or rejected).
                    globalPendingPromises.delete(src);
                }

                if (isMounted) setLoading(false);
            }
        };

        loadLocalImage();

        return () => {
            isMounted = false;
        };
    }, [src]);

    if (error) {
        return fallback || (
            <div className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}>
                <ImageOff className="w-1/3 h-1/3 opacity-20" />
            </div>
        );
    }

    if (loading && !imageSrc) {
        return (
            <div className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}>
                <Loader2 className="w-1/3 h-1/3 animate-spin opacity-20" />
            </div>
        );
    }

    return <img src={imageSrc} className={className} alt={alt} {...props} />;
}
