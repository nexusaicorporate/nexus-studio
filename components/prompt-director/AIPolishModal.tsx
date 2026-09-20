"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import { chat } from "@/lib/providers";
import { useSettings } from "@/lib/store/settings";

interface AIPolishModalProps {
  open: boolean;
  onClose: () => void;
  initialPrompt: string;
  onApply: (newPrompt: string) => void;
}

const ACE_HOLOFS_SYSTEM = `
# VIDEO PROMPTGEN SYSTEM CUSTOM INSTRUCTIONS

You are an AI assistant specializing in video prompt generation, enhanced by the ACE-HOLOFS cognitive framework.

## OPERATIONAL MODE
- Generate video prompts under 250 tokens
- Follow LTXV template patterns
- Maintain ACE cognitive enhancement
- Use HOLOFS for result organization

## QUALITY STANDARDS
Ensure all prompts:
- Match template structure
- Follow token distribution rules
- Maintain high information density
- Include all required elements
- Specify technical details
`;

export function AIPolishModal({ open, onClose, initialPrompt, onApply }: AIPolishModalProps) {
  const [instructions, setInstructions] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const settings = useSettings();

  const handleGenerate = async () => {
    setBusy(true);
    setError("");
    setResult("");
    
    try {
      const out = await chat({
        uncensored: settings.uncensored,
        system: ACE_HOLOFS_SYSTEM,
        messages: [
          { id: "1", role: "user", content: `Original Prompt:\n${initialPrompt}\n\nUser Instructions for improvement:\n${instructions || "Polish this prompt to be more vivid and detailed while maintaining the original intent."}\n\nReturn ONLY the polished prompt text.` }
        ]
      });
      
      setResult(out.trim());
    } catch (e: any) {
      setError(e.message || "Failed to polish prompt");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="AI Assist (ACE-HOLOFS)">
      <div className="space-y-4">
        <div>
          <label className="label text-xs">Original Prompt</label>
          <div className="p-3 bg-surface2 rounded-lg text-sm border border-border text-muted">
            {initialPrompt}
          </div>
        </div>
        
        <div>
          <label className="label text-xs">Instructions for AI (Optional)</label>
          <textarea 
            className="input text-sm min-h-[80px]" 
            placeholder="e.g., Make it darker and more cinematic, change the lighting to neon..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>

        {error && (
          <div className="text-rose-400 text-xs p-2 bg-rose-400/10 rounded-lg">
            {error}
          </div>
        )}

        {result && (
          <div>
            <label className="label text-xs text-primary">Polished Result</label>
            <textarea 
              className="input text-sm min-h-[120px] border-primary"
              value={result}
              onChange={(e) => setResult(e.target.value)}
            />
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          {!result ? (
            <button className="btn-primary" onClick={handleGenerate} disabled={busy}>
              {busy ? "Thinking..." : "Generate"}
            </button>
          ) : (
            <button className="btn-primary" onClick={() => { onApply(result); onClose(); }}>
              Apply to Prompt
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
