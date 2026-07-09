"use client";
import { useEffect, useRef } from "react";

export default function PromptFillPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;

      const { type, payload, messageId } = event.data;

      if (type === "PROMPTFILL_GET") {
        try {
          const res = await fetch("/api/promptfill");
          const data = await res.json();
          iframeRef.current?.contentWindow?.postMessage(
            { type: "PROMPTFILL_GET_REPLY", messageId, payload: data[payload.key] ?? null },
            "*"
          );
        } catch (e) {
          iframeRef.current?.contentWindow?.postMessage(
            { type: "PROMPTFILL_GET_REPLY", messageId, payload: null },
            "*"
          );
        }
      }

      if (type === "PROMPTFILL_SET") {
        try {
          const res = await fetch("/api/promptfill");
          const data = await res.json();
          data[payload.key] = payload.value;
          await fetch("/api/promptfill", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          iframeRef.current?.contentWindow?.postMessage(
            { type: "PROMPTFILL_SET_REPLY", messageId, success: true },
            "*"
          );
        } catch (e) {
          iframeRef.current?.contentWindow?.postMessage(
            { type: "PROMPTFILL_SET_REPLY", messageId, success: false },
            "*"
          );
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div className="w-full h-[calc(100vh-2rem)] rounded-2xl overflow-hidden border border-border bg-surface shadow-sm">
      <iframe
        ref={iframeRef}
        src="/promptfill/index.html"
        className="w-full h-full border-none"
        title="Prompt Fill"
        allow="clipboard-write; clipboard-read"
      />
    </div>
  );
}
