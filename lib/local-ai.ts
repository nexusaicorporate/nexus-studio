"use client";

import { CreateMLCEngine, type MLCEngine, type InitProgressReport } from "@mlc-ai/web-llm";

const DEFAULT_MODEL = "Qwen2-1.5B-Instruct-q4f16_1-MLC";

let enginePromise: Promise<MLCEngine> | null = null;
let currentEngine: MLCEngine | null = null;

export async function getLocalEngine(onProgress?: (progress: InitProgressReport) => void): Promise<MLCEngine> {
  if (currentEngine) return currentEngine;
  
  if (!enginePromise) {
    enginePromise = CreateMLCEngine(
      DEFAULT_MODEL,
      { initProgressCallback: onProgress },
      {
        context_window_size: 2048,
      }
    ).then((engine) => {
      currentEngine = engine;
      return engine;
    }).catch(err => {
      enginePromise = null;
      throw err;
    });
  }
  
  return enginePromise;
}

export async function localChat(
  prompt: string, 
  system: string = "", 
  onProgress?: (progress: InitProgressReport) => void
): Promise<string> {
  try {
    const engine = await getLocalEngine(onProgress);
    const messages = [];
    if (system) messages.push({ role: "system" as const, content: system });
    messages.push({ role: "user" as const, content: prompt });

    const reply = await engine.chat.completions.create({
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });
    
    return reply.choices[0]?.message.content || "";
  } catch (err: any) {
    throw new Error("Local AI failed: " + err.message);
  }
}
